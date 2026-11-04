#!/usr/bin/env node
/**
 * Strict new-PNG transport/decode + targeted Q003/Q004 deep-link evidence.
 * Real gameplay session mismatches are reported, never disguised as a PASS.
 * No production URLs or writes: uses local Pages server only.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root='qa/fast-bilingual-immutable-candidate/';
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const registry=JSON.parse(readFileSync(root+'content/english/media/media-registry.json'));
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
const doc=JSON.parse(readFileSync(root+'content/english/year-1/module-01/questions.json'));
const ids=[
 'IMG-Y1M01-Q003-Q004-MORNING-OFFICIAL-20261104',
 'IMG-Y1M01-Q003-Q004-AFTERNOON-OFFICIAL-20261104',
 'IMG-Y1M01-Q003-Q004-NIGHT-OFFICIAL-20261104'
];
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const id of ids){
 const e=byId.get(id);assert(e,'OFFICIAL_DAYPART_ENTRY_MISSING:'+id);
 assert.equal(e.status,'APPROVED','RUNTIME_STATUS_INVALID:'+id);
 assert.equal(e.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
 assert.equal(sha(readFileSync(root+e.urlOrPath)),e.sha256);
}
const expected={
 'Y1M01-Q003':{answer:'morning',letter:'D',correct:'morning'},
 'Y1M01-Q004':{answer:'afternoon',letter:'B',correct:'afternoon'}
};
for(const [qid,x] of Object.entries(expected)){
 const item=doc.items.find(q=>q.item_id===qid);
 assert(item,'QUESTION_MISSING:'+qid);
 assert.equal(item.answerKey,x.answer);
 assert.equal(item.resposta,x.letter);
 assert.equal(item.optionContract?.correctOptionId,x.correct);
 const data=JSON.stringify(item);
 assert(ids.every(id=>data.includes(id)),'ONE_DAYPART_SOURCE_MISSING:'+qid);
 assert.equal(item.options.filter(o=>o.correct).length,1,'INVALID_CORRECT_OPTION:'+qid);
}
const q1=doc.items.find(q=>q.item_id==='Y1M01-Q001');
assert.deepEqual(q1.options.map(o=>o.optionId),['reading','sleep','hello','snack']);
assert.equal(q1.answerKey,'hello');assert.equal(q1.resposta,'C');
const browser=await chromium.launch({headless:true});
const transport=[],pages=[];
try{
 for(const viewport of [{label:'desktop',width:1440,height:900},{label:'mobile',width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
   reducedMotion:'reduce'});
  const page=await ctx.newPage();
  for(const id of ids){
   const e=byId.get(id),url=base+'/'+e.urlOrPath.replace(/^\/+/,'');
   const response=await ctx.request.get(url,{timeout:30000});
   const bytes=Buffer.from(await response.body());
   const verified={viewport:viewport.label,id,status:response.status(),
    shaVerified:sha(bytes)===e.sha256,browserDecoded:false};
   if(response.ok()&&verified.shaVerified){
    verified.browserDecoded=await page.evaluate(u=>new Promise(resolve=>{
      const img=new Image();let finished=false;
      const end=ok=>{if(finished)return;finished=true;clearTimeout(timer);resolve(ok);};
      const timer=setTimeout(()=>end(false),8000);
      img.onload=()=>end(img.naturalWidth>0&&img.naturalHeight>0);
      img.onerror=()=>end(false);img.src=u;
    }),url);
   }
   transport.push(verified);
  }
  for(const qid of Object.keys(expected)){
   const url=base+'/play/target-shooter/?duduqModule=Y1M01&duduqItem='+qid+
    '&duduqStart=Y1M01';
   const outcome={viewport:viewport.label,questionId:qid,url,htmlStatus:null,
    visibleDaypartImages:0,errors:[],sessionMismatch:false};
   pages.push(outcome);
   const tab=await ctx.newPage();
   tab.on('pageerror',err=>outcome.errors.push(String(err.message||err).slice(0,220)));
   try{
    const resp=await tab.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
    outcome.htmlStatus=resp?.status()??null;
    const paths=ids.map(id=>byId.get(id).urlOrPath.replace(/^\/+/,''));
    const expires=Date.now()+6000;
    while(Date.now()<expires){
     let images=[];
     for(const frame of tab.frames()){
      const values=await frame.evaluate(paths=>{
       const result=[];
       for(const img of document.querySelectorAll('img')){
        try{
         const current=decodeURIComponent(new URL(img.currentSrc||img.src,document.baseURI).pathname).replace(/^\/+/,'');
         if(!paths.includes(current))continue;
         const r=img.getBoundingClientRect(),css=getComputedStyle(img);
         if(img.complete&&img.naturalWidth>0&&r.width>12&&r.height>12&&
          css.display!=='none'&&css.visibility!=='hidden'&&
          r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight)
          result.push(current);
        }catch {}
       }
       return result;
      },paths).catch(()=>[]);
      images.push(...values);
     }
     outcome.visibleDaypartImages=Math.max(outcome.visibleDaypartImages,new Set(images).size);
     if(outcome.visibleDaypartImages>=2)break;
     await tab.waitForTimeout(500);
    }
    const body=(await tab.locator('body').innerText({timeout:3000}).catch(()=>''))||'';
    outcome.sessionMismatch=/Y1M01_SESSION_ITEM_MISMATCH|SESSION_ITEM_MISMATCH/.test(body);
   }catch(e){outcome.navigationError=String(e.message||e).slice(0,300)}
   finally{await tab.close()}
  }
  await page.close();
  await ctx.close();
 }
}finally{await browser.close()}
mkdirSync('qa/results',{recursive:true});
const problems=transport.filter(x=>x.status!==200||!x.shaVerified||!x.browserDecoded);
const gaps=pages.filter(x=>x.visibleDaypartImages<2||x.sessionMismatch||x.errors.length);
const report={schemaVersion:'DUDUQ_DAYPART_Q003_Q004_REAL_BROWSER_V1',
 status:problems.length?'OFFICIAL_PNG_TRANSPORT_FAILED':'PNG_TRANSPORT_AND_DECODE_PASS',
 productionDeployed:false,qaOnly:true,pedagogicalReview:'PENDING',
 contractsPreserved:true,technicalTransportTests:transport.length,
 technicalTransportFailures:problems.length,realSessionVisualGaps:gaps,
 transport,pages};
writeFileSync('qa/results/y1m01-daypart-q003-q004-browser.json',
 JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_DAYPART_BROWSER='+JSON.stringify({status:report.status,
 transportTests:transport.length,transportFailures:problems.length,
 realSessionCases:pages.length,visibleCases:pages.filter(x=>x.visibleDaypartImages>=2).length,
 realSessionVisualGaps:gaps.map(x=>({questionId:x.questionId,viewport:x.viewport,
  sessionMismatch:x.sessionMismatch,visible:x.visibleDaypartImages}))}));
assert.equal(problems.length,0,'DAYPART_ORIGINAL_PNG_TRANSPORT_FAILED');

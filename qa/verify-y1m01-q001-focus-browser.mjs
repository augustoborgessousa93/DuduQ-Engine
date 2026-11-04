#!/usr/bin/env node
// Real Chromium targeted visual check: ONLY Y1M01-Q001 visual media delta.
// This does not certify all gameplay or constitute human pedagogical approval.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root='qa/fast-bilingual-immutable-candidate';
const data=JSON.parse(await readFile(root+'/content/english/year-1/module-01/questions.json','utf8'));
const q=data.items.find(x=>x.item_id==='Y1M01-Q001');
const audit=JSON.parse(await readFile('qa/results/y1m01-q001-focused-preview.json','utf8'));
const reg=JSON.parse(await readFile(root+'/content/english/media/media-registry.json','utf8'));
const media=new Map(reg.entries.map(x=>[x.mediaId,x]));
assert.equal(data.items.length,20);
assert.equal(q.answerKey,'hello');
assert.equal(q.resposta,'C');
assert.equal(q.options.length,4);
assert.equal(q.options.filter(x=>x.correct).length,1);
assert.deepEqual(q.options.map(x=>x.optionId),['reading','sleep','hello','snack']);
assert(!q.options.some(x=>x.optionId==='farewell'),'FAREWELL_STILL_Q001_DISTRACTOR');
assert.equal(q.options.find(x=>x.correct).mediaId,audit.newHelloMediaId);
assert.equal(q.optionContract.correctOptionId,'hello');
assert.equal(q.options[0].mediaId,audit.newDistractorMediaId);
assert.equal(q.distractorOptionIds.includes('farewell'),false);
const expect=[
 {concept:'hello',id:audit.newHelloMediaId},
 {concept:'reading',id:audit.newDistractorMediaId}
].map(x=>({...x,source:media.get(x.id)?.urlOrPath}));
for(const asset of expect){
 assert(asset.source?.endsWith('.png'),'OFFICIAL_PNG_REGISTRY_MISSING:'+asset.concept);
 assert.equal(media.get(asset.id).humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
}
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'LOCAL_PAGES_ONLY');
const outdir='qa/results/y1m01-q001-browser';
await mkdir(outdir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const screen of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},
   deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[],badHttp=[];
  page.on('pageerror',err=>errors.push(String(err?.message||err).slice(0,200)));
  page.on('response',r=>{
   try{
    if(new URL(r.url()).origin===new URL(base).origin&&r.status()>=400&&!r.url().includes('/favicon.ico'))
      badHttp.push({status:r.status(),url:r.url()});
   }catch {}
  });
  const url=base+'/play/target-shooter/?duduqModule=Y1M01&duduqItem=Y1M01-Q001&duduqStart=Y1M01';
  const row={screen:screen.name,url,htmlStatus:null,found:{},frameCount:0,badHttp,errors};
  results.push(row);
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   row.htmlStatus=response?.status();
   const stop=Date.now()+28000;
   while(Date.now()<stop){
    row.frameCount=Math.max(row.frameCount,page.frames().length);
    for(const frame of page.frames()){
     const found=await frame.evaluate(sources=>{
      const all={};
      for(const s of sources){
       const expected=s.source.replace(/^\/+/,'');
       all[s.concept]=[];
       for(const img of document.querySelectorAll('img')){
        try{
         const u=new URL(img.currentSrc||img.src,document.baseURI);
         const actual=decodeURIComponent(u.pathname).replace(/^\/+/,'');
         if(actual!==expected)continue;
         const rect=img.getBoundingClientRect(),style=getComputedStyle(img);
         all[s.concept].push({loaded:img.complete&&img.naturalWidth>0,
          visible:rect.width>20&&rect.height>20&&rect.right>0&&rect.bottom>0&&
          rect.left<innerWidth&&rect.top<innerHeight&&style.visibility!=='hidden'&&
          style.display!=='none'&&Number(style.opacity)>0,
          width:Math.round(rect.width),height:Math.round(rect.height),
          naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight});
        }catch{}
       }
      }
      return all;
     },expect).catch(()=>null);
     if(!found)continue;
     for(const item of expect){
      const values=found[item.concept]||[];
      if(values.length)row.found[item.concept]=values;
     }
    }
    if(expect.every(e=>row.found[e.concept]?.some(x=>x.loaded&&x.visible)))break;
    await page.waitForTimeout(400);
   }
   try{
    const shot=outdir+'/'+screen.name+'.png';
    await page.screenshot({path:shot,fullPage:false,timeout:16000});
    row.screenshot=shot;
   }catch(e){row.screenshotError=String(e?.message||e).slice(0,200);}
  }catch(e){row.navigationError=String(e?.message||e).slice(0,220);}
  finally{await page.close();await context.close();}
 }
}finally{await browser.close();}
const failures=results.filter(r=>r.htmlStatus!==200||r.errors.length||
 r.badHttp.length||r.navigationError||
 expect.some(e=>!r.found[e.concept]?.some(x=>x.loaded&&x.visible)));
const report={schema:'Q001_VISUAL_QA_V1',status:failures.length?'BLOCKED':'ASSET_LOAD_AND_VIEWPORT_PASS',
 questionId:'Y1M01-Q001',qaOnly:true,productionDeployed:false,
 answerKey:'hello',distractorRemoved:'farewell',
 humanPedagogicalReview:'PENDING',results,
 failures:failures.map(x=>({screen:x.screen,found:x.found,errors:x.errors,badHttp:x.badHttp,
  navigationError:x.navigationError}))};
await writeFile('qa/results/y1m01-q001-browser.json',JSON.stringify(report,null,2)+'\n');
console.log('Y1M01_Q001_CHROMIUM_QA='+JSON.stringify({status:report.status,screens:results.length,
 failed:failures.length,found:results.map(x=>({screen:x.screen,media:Object.keys(x.found)}))}));
if(failures.length)console.error('Y1M01_Q001_CHROMIUM_FAILURES='+JSON.stringify(report.failures));
assert.equal(failures.length,0,'FOCUSED_Q001_BROWSER_FAILED');

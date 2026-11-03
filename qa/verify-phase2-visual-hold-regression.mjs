#!/usr/bin/env node
/**
 * Strict browser regression for ONLY questions affected by reversion of five
 * unverified QA source images. Uses original immutable compiled contracts and
 * the archived provisional media. Never changes gameplay, media or production.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const report=JSON.parse(await readFile('qa/results/phase2-visual-quarantine.json','utf8'));
assert.equal(report.verifiedContracts,600,'NOT_ALL_CONTRACTS');
assert.equal(report.releaseApproved,false,'RELEASE_IN_THIS_GATE_FORBIDDEN');
const ids=report.changedQuestionsNeedingDirectedRegression;
assert(ids.length===21,'UNEXPECTED_TARGETED_QUESTION_COUNT');
const paths=[...new Set(report.heldBindings.map(x=>x.previousPath))];
for(const p of paths){
 const resp=await fetch(base+'/'+p);
 assert.equal(resp.status,200,'RESTORED_PROVISIONAL_MEDIA_NOT_SERVABLE:'+p);
 assert((resp.headers.get('content-type')||'').match(/image|svg|octet-stream/),
  'RESTORED_MEDIA_CONTENT_TYPE:'+p);
}
const output='qa/results/phase2-visual-hold-regression';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[];
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:viewport.width===390});
  const shotModules=new Set();
  for(const id of ids){
   const mm=id.slice(3,5),year=id[1],moduleId=id.slice(0,5);
   const file='content/english/year-'+year+'/module-'+mm+'/questions.json';
   const data=JSON.parse(await readFile(path.join(root,file),'utf8'));
   const q=data.items.find(q=>q.item_id===id);
   assert(q?.mechanicId,'INVALID_COMPILED_QUESTION:'+id);
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const page=await ctx.newPage(),jsErrors=[],httpErrors=[];
   page.on('pageerror',e=>jsErrors.push(String(e.message||e)));
   page.on('response',r=>{
    if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
     httpErrors.push(r.status()+' '+r.url());
   });
   const url=base+'/play/'+slug+'/?duduqModule='+moduleId+'&duduqItem='+id+'&qaSeed=phase2-safe-hold';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   let ready=false;
   try{
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
      null,{timeout:28000,polling:250});
    ready=true;
   }catch{}
   const stage=await page.evaluate(()=>{
    const game=document.querySelector('#game'),rect=game?.getBoundingClientRect();
    return {gameExists:!!game,gameWidth:Math.round(rect?.width||0),
     gameHeight:Math.round(rect?.height||0),
     bodyText:(document.body?.innerText||'').trim().length,
     cards:document.querySelectorAll('.duduq-mq-card').length,
     visibleButtons:[...document.querySelectorAll('button')].filter(x=>{
      const b=x.getBoundingClientRect(),s=getComputedStyle(x);
      return b.width>10&&b.height>10&&s.display!=='none'&&s.visibility!=='hidden';
     }).length};
   });
   // Memory Quest images are intentionally behind face-down cards. A valid
   // interaction must flip a real card before evaluating its visual contents.
   let memoryCardFlipped=null;
   if(q.mechanicId==='memory-quest'&&ready){
    const card=page.locator('[data-memory-card-id]').first();
    try{
     await card.waitFor({state:'visible',timeout:5000});
     const before=await card.getAttribute('data-face-up');
     await card.click({timeout:7000});
     await page.waitForTimeout(700);
     const after=await card.getAttribute('data-face-up');
     memoryCardFlipped=before==='false'&&after==='true';
    }catch{memoryCardFlipped=false;}
   }
   const valid=response?.status()===200&&ready&&jsErrors.length===0&&httpErrors.length===0&&
    stage.gameExists&&stage.gameWidth>250&&stage.gameHeight>250&&stage.bodyText>15&&
    (memoryCardFlipped===null||memoryCardFlipped===true);
   const c={questionId:id,mechanic:q.mechanicId,viewport:viewport.width,
    httpStatus:response?.status(),ready,stage,jsErrors,httpErrors,memoryCardFlipped,pass:!!valid};
   checks.push(c);
   const snap=moduleId+'-'+viewport.width;
   if(!shotModules.has(snap)){
    await page.screenshot({path:output+'/'+snap+'.png',fullPage:false});
    shotModules.add(snap);
   }
   await page.close();
  }
  await ctx.close();
 }
}finally{await browser.close()}
const failed=checks.filter(c=>!c.pass);
const summary={schemaVersion:'DUDUQ_PHASE2_FIVE_VISUAL_HOLDS_DIRECTED_BROWSER_REGRESSION_V1',
 status:failed.length?'FAIL_DIRECTED_REGRESSION':'PASS_DIRECTED_REGRESSION_QA_ONLY',
 verifiedContracts:600,restoredProvisionalPaths:paths.length,affectedQuestionCount:ids.length,
 checks:checks.length,failed:failed.map(c=>({questionId:c.questionId,viewport:c.viewport,
  mechanic:c.mechanic,errors:c.jsErrors,httpErrors:c.httpErrors,memoryCardFlipped:c.memoryCardFlipped,
  ready:c.ready,stage:c.stage})),cases:checks,
 productionDeployed:false,pedagogicalQAApproved:false,fullInteractionQaApproved:false,releaseApproved:false};
await writeFile('qa/results/phase2-visual-hold-regression.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:summary.status,checks:summary.checks,failures:failed.length,
 verifiedContracts:600,restoredProvisionalPaths:paths.length}));
assert.equal(failed.length,0,'RESTORED_QA_ROUTES_FAIL');

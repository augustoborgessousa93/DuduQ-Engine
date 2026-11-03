#!/usr/bin/env node
/**
 * Only two previously failed Y1M06-Q005 mobile/desktop cases.
 * Correct DOM selectors from deployed Memory Quest Gold Master:
 *   button.memory-quest-card-slot[data-memory-card-component],
 *   data-flipped / aria-pressed.
 * This tests genuine pointer input on the restored provisional candidate.
 * It does not claim the held bird PNG is approved or used by the mechanic.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const meta=JSON.parse(await readFile('qa/results/phase2-visual-quarantine.json','utf8'));
assert.equal(meta.remainingChangedMediaIds,127);
assert.equal(meta.verifiedContracts,600);
assert(meta.changedQuestionsNeedingDirectedRegression.includes('Y1M06-Q005'));
assert(meta.heldPaths.includes('content/english/assets/images/assets-duduq/auto-passaro-046b76b9215c.png'));
await mkdir('qa/results/phase2-memory-true-qa',{recursive:true});
const rows=[],browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:800},hasTouch:width===390});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  const url=base+'/play/memory-quest/?duduqModule=Y1M06&duduqItem=Y1M06-Q005&qaSeed=phase2-restored-real-card-flip';
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  let status='FAIL',reason=null,cards=0,before=null,after=null,pressed=null,ready=false;
  try{
   assert.equal(response?.status(),200);
   await page.waitForFunction(()=>
    document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
    null,{timeout:30000,polling:200});
   ready=true;
   const locator=page.locator('button.memory-quest-card-slot[data-memory-card-component]');
   await locator.first().waitFor({state:'visible',timeout:10000});
   cards=await locator.count();
   assert(cards>=4,'COMPONENT_CARD_GRID_NOT_MOUNTED');
   const first=locator.first();
   before=await first.getAttribute('data-flipped');
   assert(before===null||before==='false','CARD_ALREADY_FACE_UP');
   await first.click({timeout:7000});
   await page.waitForFunction(()=>{
    const el=document.querySelector('button.memory-quest-card-slot[data-memory-card-component]');
    return el?.dataset.flipped==='true'&&el.getAttribute('aria-pressed')==='true';
   },null,{timeout:3500,polling:100});
   after=await first.getAttribute('data-flipped');
   pressed=await first.getAttribute('aria-pressed');
   assert.equal(errors.length,0,'JS_RUNTIME_ERROR');
   status='PASS_REAL_MEMORY_CARD_FLIP';
  }catch(e){reason=String(e.message||e).slice(0,450);}
  const row={questionId:'Y1M06-Q005',viewport:width,status,ready,cardCount:cards,
   before,after,pressed,errors,reason,productionDeployed:false,
   birdPNGCertified:false};
  rows.push(row);
  await page.screenshot({path:'qa/results/phase2-memory-true-qa/Y1M06-Q005-'+width+'.png',fullPage:false}).catch(()=>{});
  await context.close();
 }
}finally{await browser.close()}
const failures=rows.filter(x=>x.status!=='PASS_REAL_MEMORY_CARD_FLIP');
const report={schemaVersion:'DUDUQ_PHASE2_RESTORED_MEMORY_REAL_POINTER_QA_V1',
 status:failures.length?'FAIL_RESTORED_MEMORY_CARD_INTERACTION':'PASS_RESTORED_MEMORY_CARD_INTERACTION',
 testedQuestions:1,viewports:2,verifiedContracts:600,restoredProvisionalMediaIdCount:meta.newlyHeldBindings,
 rows,visualBirdPNGApproved:false,fullPedagogicalQAApproved:false,
 releaseApproved:false,productionDeployed:false};
await writeFile('qa/results/phase2-memory-true-qa.json',JSON.stringify(report,null,2)+'\n');
console.log('MEMORY_REAL_CARD_QA='+JSON.stringify({status:report.status,failures,rows}));
assert.equal(failures.length,0,'RESTORED_MEMORY_INTERACTION_STILL_FAILS');

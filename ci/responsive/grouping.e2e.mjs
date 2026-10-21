import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';
const origin = process.env.DUDUQ_QA_ORIGIN || 'http://127.0.0.1:4177';
const expectedRoot = process.env.DUDUQ_EXPECTED_ROOT || '';
const buildManifestSha256 = process.env.DUDUQ_CANDIDATE_BUILD_HASH || null;
const out = process.env.DUDUQ_EVIDENCE_DIR || 'artifacts/responsive-gameplay-v6_7/grouping';
const reportPath = process.env.DUDUQ_REPORT_PATH || 'docs/qa/DUDUQ_GROUPING_PROTECTED_PATCH_QA_V6_7.json';
const sizes = [{ id:'1366x768',width:1366,height:768 },{ id:'900x600',width:900,height:600 },{ id:'600x600',width:600,height:600 }];
await mkdir(out,{recursive:true});
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const rows=[];

async function measure(frame){return frame.evaluate(()=>{
  const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,fontSize:s.fontSize,lineHeight:s.lineHeight,whiteSpace:s.whiteSpace}};
  const groups=[...document.querySelectorAll('.dnd-options-cards-group__category')].map(g=>{const label=g.querySelector('.dnd-options-cards-group__category-label'),drop=g.querySelector('[data-drop-zone-content]'),gr=g.getBoundingClientRect(),lr=label.getBoundingClientRect(),dr=drop.getBoundingClientRect();return{text:label.textContent.trim(),group:box(g),label:box(label),drop:box(drop),withinGroup:lr.left>=gr.left&&lr.right<=gr.right,clearOfDrop:lr.bottom<=dr.top+1,cardCount:g.querySelectorAll('[data-drop-zone-content] > .dnd-option-image-card').length}});
  const feedback=document.querySelector('.feedback-ribbon:not([hidden])');return{viewport:[innerWidth,innerHeight],item:new URLSearchParams(location.search).get('duduqItem'),state:document.querySelector('#game')?.dataset.duduqInteractionState,groups,sourceCards:document.querySelectorAll('.dnd-image-card-row > .dnd-option-image-card').length,docScroll:[document.documentElement.scrollWidth-document.documentElement.clientWidth,document.documentElement.scrollHeight-document.documentElement.clientHeight],feedback:feedback?{title:feedback.querySelector('h2')?.textContent.trim(),subtitle:feedback.querySelector('p')?.textContent.trim(),action:feedback.querySelector('.feedback-action')?.textContent.trim(),enabled:!feedback.querySelector('.feedback-action')?.disabled}:null};
});}
async function pointerDrag(page,frame,card,targetId){const source=await card.boundingBox(),target=await frame.locator(`.dnd-options-cards-group__category [data-drop-zone-content="${targetId}"]`).boundingBox();assert.ok(source&&target,'drag source/target geometry');await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.waitForTimeout(100);await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:18});await page.waitForTimeout(100);await page.mouse.up();}
try{
 if(expectedRoot){const status=await(await fetch(`${origin}/__duduq/status`)).json();if(path.resolve(status.root).toLowerCase()!==path.resolve(expectedRoot).toLowerCase())throw Error(`GROUPING_WRONG_CANDIDATE_ROOT:${status.root}`)}
 for(const size of sizes){
  const page=await browser.newPage({viewport:{width:1500,height:950},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const row={container:size.id,route:'/play/drag-drop/?duduqModule=Y1M03&duduqItem=Y1M03-Q002',steps:[],screenshots:[]};
  try{
   await page.goto(`${origin}/`,{waitUntil:'domcontentloaded'});
   await page.evaluate(({width,height,route})=>{document.documentElement.style.cssText='margin:0;width:100%;height:100%;overflow:hidden';document.body.style.cssText='margin:0;width:100%;height:100%;overflow:hidden';document.body.innerHTML=`<main id="qa-container" style="width:${width}px;height:${height}px"><iframe title="curricular-grouping" style="display:block;width:100%;height:100%;border:0" src="${route}"></iframe></main>`},{width:size.width,height:size.height,route:row.route});
   const frame=await(await page.locator('iframe').elementHandle()).contentFrame();assert.ok(frame);await frame.waitForFunction(()=>Boolean(window.DuduQProductionQuestionBootstrap?.ready),null,{timeout:30000});
   const contract=await frame.evaluate(async()=>{const x=await window.DuduQProductionQuestionBootstrap.ready;return{itemId:x.item.item_id,title:x.item.instruction?.titleEn,groups:x.grouping.groups,items:x.grouping.items}});assert.equal(contract.itemId,'Y1M03-Q002');assert.equal(contract.items.length,8);assert.equal(contract.groups.length,2);
   await frame.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:30000});
   const initial=await measure(frame);assert.deepEqual(initial.docScroll,[0,0]);
   for(const g of initial.groups){assert.ok(g.withinGroup,`label exceeds group horizontally: ${g.text}`);assert.ok(g.clearOfDrop,`label overlaps dropzone: ${g.text}`);assert.ok(g.label.scrollHeight<=g.label.clientHeight,`label content clips: ${g.text}`);}
   await page.screenshot({path:`${out}/after-${size.id}-ready.png`});row.screenshots.push(`after-${size.id}-ready.png`);row.initial=initial;row.steps.push('official curricular route boot, identity and heading geometry');
   const sourceCards=frame.locator('.dnd-image-card-row > .dnd-option-image-card');const cardById=new Map();for(let index=0;index<contract.items.length;index++)cardById.set(contract.items[index].id,await sourceCards.nth(index).elementHandle());const first=contract.items[0],wrongGroup=contract.groups.find(g=>g.id!==first.groupId).id;
   await pointerDrag(page,frame,cardById.get(first.id),wrongGroup);await frame.waitForFunction(()=>document.querySelectorAll('[data-drop-zone-content] > .dnd-option-image-card').length===1,null,{timeout:10000});
   for(const item of contract.items.slice(1))await pointerDrag(page,frame,cardById.get(item.id),item.groupId);
   await frame.waitForFunction(()=>{const b=document.querySelector('.dnd-confirm-action');return b&&!b.disabled&&!b.hidden},null,{timeout:12000});await frame.locator('.dnd-confirm-action').click();await frame.locator('.feedback-ribbon:not([hidden])').waitFor({state:'visible',timeout:20000});
   row.incorrect=await measure(frame);assert.match(row.incorrect.feedback.action,/TENTAR/i);assert.ok(row.incorrect.feedback.title&&row.incorrect.feedback.subtitle);row.steps.push('seven real correct drags plus one wrong placement and incorrect feedback');
   await page.screenshot({path:`${out}/after-${size.id}-incorrect.png`});row.screenshots.push(`after-${size.id}-incorrect.png`);
   if(size.width===900){const stateBeforeResize=(await measure(frame)).state;await page.evaluate(()=>{const m=document.querySelector('#qa-container');m.style.width='600px';m.style.height='600px'});await page.waitForTimeout(350);row.resizeFeedback=await measure(frame);row.resizeFeedback.stateBeforeResize=stateBeforeResize;assert.equal(row.resizeFeedback.state,stateBeforeResize,'feedback/audio state must be preserved during live resize');row.steps.push(`live resize from 900x600 to 600x600 with feedback open (${stateBeforeResize}); state preserved`);}
   await frame.locator('.feedback-ribbon:not([hidden]) .feedback-action').click();await frame.waitForFunction(()=>document.querySelector('.feedback-ribbon')?.hidden===true,null,{timeout:15000});await frame.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:15000});
   await page.waitForTimeout(400);const wrongCard=contract.items[0];await pointerDrag(page,frame,cardById.get(wrongCard.id),wrongCard.groupId);row.steps.push('Retry and corrected final real drag');
   await frame.waitForFunction(()=>{const b=document.querySelector('.dnd-confirm-action');return b&&!b.disabled&&!b.hidden},null,{timeout:12000});await frame.locator('.dnd-confirm-action').click();await frame.locator('.feedback-ribbon:not([hidden])').waitFor({state:'visible',timeout:20000});row.correct=await measure(frame);assert.equal(row.correct.feedback.action,'CONTINUAR');assert.ok(row.correct.feedback.title&&row.correct.feedback.subtitle);row.steps.push('correct validation, canonical feedback and enabled Continue');
   await page.screenshot({path:`${out}/after-${size.id}-correct.png`});row.screenshots.push(`after-${size.id}-correct.png`);
   if(size.width===900){await page.evaluate(()=>{const m=document.querySelector('#qa-container');m.style.width='900px';m.style.height='600px'});}
   await frame.locator('.feedback-ribbon:not([hidden]) .feedback-action').click();await frame.waitForFunction(()=>new URLSearchParams(location.search).get('duduqItem')!=='Y1M03-Q002'||document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:15000});row.continue='PASS';row.errors=errors;row.result='PASS';
  }catch(error){row.result='ISSUE';row.error=String(error?.stack||error);row.errors=errors;try{row.diagnostic=await measure(await(await page.locator('iframe').elementHandle()).contentFrame())}catch{}}
  rows.push(row);console.log(`${size.id} ${row.result}`);await page.close();
 }
}finally{await browser.close();}
const report={schema:'DUDUQ_GROUPING_PROTECTED_PATCH_QA_V6_7',testedAt:new Date().toISOString(),candidateBuildManifestSha256:buildManifestSha256,candidateRoot:expectedRoot||null,patchSha256:'ce0ab9cd4bbe1a96bafd4f27042118e2de47ef6e0cda39854ee30256f425130d',beforeSha256:'f7b09289cbae2784346f1a2628b5d7e9afde4d49828f0c98d5bd1a3507a11c5c',results:rows,status:rows.length===3&&rows.every(x=>x.result==='PASS')?'PASS':'ISSUE'};
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,containers:rows.map(x=>({container:x.container,result:x.result})),report:reportPath}));if(report.status!=='PASS')process.exitCode=1;


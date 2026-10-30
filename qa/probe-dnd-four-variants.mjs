#!/usr/bin/env node
// Browser-only diagnosis for four Drag & Drop cases flagged for variant review.
// Uses the actual audio button. No mutation of source, rules, answers or Gold Masters.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const pairs=[
 {id:'Y1M03-Q020',module:'Y1M03',mechanic:'drag-drop',variant:'color grouping'},
 {id:'Y1M04-Q007',module:'Y1M04',mechanic:'drag-drop',variant:'number grouping'},
 {id:'Y1M04-Q019',module:'Y1M04',mechanic:'drag-drop',variant:'number grouping'},
 {id:'Y1M06-Q015',module:'Y1M06',mechanic:'drag-drop-multimedia',variant:'audio to scene'}
];
const folder=path.resolve('qa/results/drag-drop-variant-review');await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
const findings=[];
const records=[];
const snapshot=()=>({
 state:document.querySelector('#game')?.dataset?.duduqInteractionState||'UNSET',
 text:String(document.body?.innerText||'').slice(0,600),
 imageNodes:[...document.images].map(img=>{
   const b=img.getBoundingClientRect(),style=getComputedStyle(img);
   return {src:img.currentSrc||img.getAttribute('src')||'',
     className:String(img.className||'').slice(0,110),
     alt:img.alt||'',complete:img.complete,naturalWidth:img.naturalWidth,
     visible:b.width>0&&b.height>0&&style.display!=='none'&&style.visibility!=='hidden',
     width:Math.round(b.width),height:Math.round(b.height)};
 }),
 dragNodes:document.querySelectorAll('[draggable="true"],[class*="dnd-card"],[class*="dnd-option"],[class*="drag-drop-item"]').length,
 dropNodes:document.querySelectorAll('[class*="drop-zone"],[class*="drop-target"],[class*="dnd-target"]').length,
 visibleAudioButtons:[...document.querySelectorAll('.audio-button')].filter(el=>
    el.getClientRects().length>0).map(el=>({
    label:el.getAttribute('aria-label')||el.textContent?.trim()||'',
    disabled:el.disabled||false})),
 relevantClasses:[...new Set([...document.querySelectorAll('#game *')].map(el=>
   typeof el.className==='string'?el.className:'').filter(s=>/dnd-(group|option|target)|drop-zone|drag-drop-(option|target)/.test(s)))].slice(0,28)
});
try{
 for(const row of pairs){
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'no-preference'});
  const errs=[],bad=[];
  page.on('pageerror',err=>errs.push(String(err?.message||err)));
  page.on('response',res=>{
   if(res.status()>=400&&res.url().startsWith(base))bad.push({url:res.url(),status:res.status()});
  });
  const route='/play/'+row.mechanic+'/?duduqModule='+row.module+'&duduqItem='+row.id;
  const record={...row,route,gestureAttempted:false,gestureSucceeded:false};
  // Include only this question's exact compiled payload as forensic evidence:
  // the visible eight-color cards might not be represented in mediaBindings.
  const qDoc=JSON.parse(await readFile(path.resolve('dist-pages/content/english/year-'+row.module[1]+'/module-'+row.module.slice(3)+'/questions.json'),'utf8'));
  record.questionDefinition=qDoc.items.find(q=>q.item_id===row.id)||null;
  if(!record.questionDefinition)throw Error('QUESTION_NOT_FOUND_IN_COMPILED_BUILD:'+row.id);
  try{
   const res=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
   record.http=res?.status()||0;
   await page.waitForTimeout(1000);
   record.before=await page.evaluate(snapshot);
   const audio=page.locator('.audio-button').first();
   if(await audio.isVisible().catch(()=>false)){
     record.gestureAttempted=true;
     try{await audio.click({timeout:3500});record.gestureSucceeded=true;}catch(e){record.gestureError=String(e.message||e).slice(0,240);}
   }
   await page.waitForFunction(()=>['READY','ACTIVE'].includes(
    document.querySelector('#game')?.dataset?.duduqInteractionState||''
   ),null,{timeout:10500}).catch(()=>{});
   await page.waitForTimeout(700);
   record.after=await page.evaluate(snapshot);
   const name=row.id+'.png';
   await page.screenshot({path:path.join(folder,name),fullPage:true});
   record.screenshot=name;
  }catch(e){record.exception=String(e?.message||e).slice(0,500);}
  record.pageErrors=errs.slice(0,8);
  record.httpFailures=bad.slice(0,8);
  // Fail only on actual crash/http/JS, never on a variant lacking PNG by design.
  if(record.exception||record.http!==200||errs.length||bad.length)
    findings.push({id:row.id,kind:'BROWSER_OR_TRANSPORT_FAILURE',
      exception:record.exception,errors:record.pageErrors,http:record.http,requests:record.httpFailures});
  records.push(record);
  console.log('DUDUQ_DND_FOUR_VARIANT='+JSON.stringify({
   id:record.id,http:record.http,gateBefore:record.before?.state,gateAfter:record.after?.state,
   gesture:record.gestureSucceeded,imagesBefore:record.before?.imageNodes?.length,
   imagesAfter:record.after?.imageNodes?.length,
   draggablesAfter:record.after?.dragNodes,dropTargetsAfter:record.after?.dropNodes,
   pageErrors:errs.length,findings:findings.filter(x=>x.id===row.id)}));
  await page.close();
 }
}finally{await browser.close();}
await writeFile(path.join(folder,'report.json'),JSON.stringify({
 schemaVersion:'DUDUQ_DND_FOUR_VARIANTS_REAL_AUDIO_BROWSER_V1',readOnly:true,
 pedagogicalApproval:false,productionUntouched:true,records,findings},null,2)+'\n');
if(findings.length)process.exitCode=1;

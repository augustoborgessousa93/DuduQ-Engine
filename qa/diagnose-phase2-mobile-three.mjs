#!/usr/bin/env node
/**
 * Three mobile visual failures from immutable run 41542079899.
 * Read-only visual diagnosis; never changes a release, answer keys or runtime.
 * Deliberately tests reachability with ordinary browser scrolling, not injected CSS.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const dist=path.resolve('qa/dist-pages-food-candidate');
const targets=['Y2M03-Q006','Y2M03-Q013','Y5M02-Q002'];
const prior=JSON.parse(await readFile('qa/results/phase2-new-source-browser.json','utf8'));
assert.equal(prior.status,'FAIL_NEW_SOURCE_REAL_BROWSER','OLD_RUN_NOT_FAILURE');
const expected=prior.failed.filter(x=>x.viewport===390).map(x=>x.questionId).sort();
assert.deepEqual(expected,[...targets].sort(),'DIAGNOSTIC_SCOPE_DRIFT');
const cases=[];
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 for(const questionId of targets){
  const caseReport={questionId,framesSeen:[],frameAttached:[],timeline:[],scrollTrials:[],errors:[]};
  cases.push(caseReport);
  const page=await context.newPage();
  const target=prior.cases.find(c=>c.questionId===questionId&&c.viewport===390);
  assert(target,'MISSING_ORIGINAL_CASE:'+questionId);
  const required=target.required;
  page.on('frameattached',f=>caseReport.frameAttached.push({event:'attach',url:f.url()}));
  page.on('framedetached',f=>caseReport.frameAttached.push({event:'detach',url:f.url()}));
  page.on('pageerror',e=>caseReport.errors.push(String(e.message||e)));
  const response=await page.goto(base+'/play/bubble-pop/?duduqModule='+questionId.slice(0,5)+
   '&duduqItem='+questionId+'&qaSeed=phase2-mobile-three',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response?.status(),200,'ROUTE_NOT_200:'+questionId);
  async function sample(step){
   const snapshots=[];
   for(const f of page.frames()){
    try{
     const d=await f.evaluate(paths=>{
      const imgs=[...document.images].flatMap(img=>{
       try{
        const source=decodeURI(new URL(img.currentSrc||img.src,document.baseURI).pathname).replace(/^\/+/,'');
        if(!paths.includes(source))return [];
        const r=img.getBoundingClientRect(),css=getComputedStyle(img);
        return [{source,loaded:img.complete&&img.naturalWidth>0,
          x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),
          visible:img.complete&&img.naturalWidth>0&&r.width>12&&r.height>12&&
           r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&
           css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity)>0,
          parentScroll:img.parentElement?.scrollHeight>img.parentElement?.clientHeight+3,
          opacity:css.opacity,position:css.position}];
       }catch{return []}
      });
      return {href:location.href,innerHeight,scrollY,bodyScrollHeight:document.body?.scrollHeight,
       docScrollHeight:document.documentElement.scrollHeight,frameCount:document.querySelectorAll('iframe').length,
       bubbleCount:document.querySelectorAll('.duduq-bp-media').length,
       bubbleArena:document.querySelectorAll('.duduq-bp-arena').length,
       gameState:document.querySelector('#game')?.dataset.duduqInteractionState||null,images:imgs};
     },required);
     snapshots.push(d);
    }catch(e){snapshots.push({href:f.url(),error:String(e.message||e).slice(0,180)});}
   }
   if(step===0||step===3||step===9||step===17||snapshots.some(x=>x.images?.some(i=>i.loaded)))
    caseReport.timeline.push({second:step,frames:snapshots});
   for(const item of snapshots){
    if(item.href&&!caseReport.framesSeen.includes(item.href))caseReport.framesSeen.push(item.href);
   }
  }
  for(let second=0;second<18;second++){
   await sample(second);
   if(second===7||second===13){
    for(const f of page.frames()){
     try{
      const trial=await f.evaluate(paths=>{
       const img=[...document.images].find(i=>{
        try{return paths.includes(decodeURI(new URL(i.currentSrc||i.src).pathname).replace(/^\/+/,''));}
        catch{return false;}
       });
       if(!img)return {found:false,frameUrl:location.href};
       const before=img.getBoundingClientRect();
       const oldScrollY=window.scrollY;
       img.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
       const after=img.getBoundingClientRect();
       return {found:true,frameUrl:location.href,loaded:img.complete&&img.naturalWidth>0,
        beforeY:Math.round(before.y),afterY:Math.round(after.y),
        scrollDelta:window.scrollY-oldScrollY,scrollHeight:document.documentElement.scrollHeight,
        viewportHeight:innerHeight,intersectsViewport:after.bottom>0&&after.top<innerHeight};
      },required);
      caseReport.scrollTrials.push({second,...trial});
     }catch(e){caseReport.scrollTrials.push({second,error:String(e.message||e).slice(0,180)})}
    }
   }
   await page.waitForTimeout(1000);
  }
  await page.screenshot({path:'qa/results/phase2-mobile-three-'+questionId+'.png',fullPage:false});
  await page.close();
 }
 await context.close();
}finally{await browser.close()}
const report={status:'READ_ONLY_THREE_MOBILE_BROWSER_DIAGNOSTIC',sourceRun:41542079899,
 cases,productionDeployed:false,releaseApproved:false};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-mobile-three.json',JSON.stringify(report,null,2)+'\n');
for(const c of cases){
 const snapshots=c.timeline.flatMap(x=>x.frames||[]),imgs=snapshots.flatMap(x=>x.images||[]);
 console.log('MOBILE_CASE='+JSON.stringify({questionId:c.questionId,
  frameAttached:c.frameAttached,framesSeen:c.framesSeen,loadedEver:imgs.some(x=>x.loaded),
  visibleEver:imgs.some(x=>x.visible),lastImages:imgs.slice(-3),
  scrollTrials:c.scrollTrials,errors:c.errors}));
}

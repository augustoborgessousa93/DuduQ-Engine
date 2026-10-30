#!/usr/bin/env node
/**
 * Linux-browser QA for published-shape module routes of the V26 QA artifact.
 * This is a narrow REAL-browser boot/image diagnostic, NOT a gameplay/
 * pedagogical certification and NOT a substitute for tests of candidates
 * that are still stored only on the Codex user's Windows machine.
 *
 * Env:
 *   BASE_URL=http://127.0.0.1:4175
 *   DUDUQ_MEDIA_QA_MODULES=Y1M04,Y1M05
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = (process.env.BASE_URL || 'http://127.0.0.1:4175').replace(/\/+$/, '');
const raw = String(process.env.DUDUQ_MEDIA_QA_MODULES || 'Y1M04,Y1M05');
const modules = [...new Set(raw.split(',').map(x=>x.trim()).filter(Boolean))];
const allValid = Array.from({length:5},(_,i)=>i+1).flatMap(y=>Array.from({length:6},(_,j)=>'Y'+y+'M'+String(j+1).padStart(2,'0')));
if(!modules.length || modules.length>30 || modules.some(m=>!allValid.includes(m)))throw Error('BAD_MODULE_SELECTION:'+raw);
const views = [
 {name:'desktop-1366x768',width:1366,height:768},
 {name:'tablet-768x1024',width:768,height:1024},
 {name:'mobile-390x844',width:390,height:844}
];
const dir=path.resolve('qa/results/media-browser-qa');
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const moduleId of modules){
  const match=/^Y([1-5])M(0[1-6])$/.exec(moduleId);
  const route='/play/english/year-'+match[1]+'/module-'+match[2]+'/';
  for(const view of views){
   const page=await browser.newPage({viewport:{width:view.width,height:view.height},reducedMotion:'reduce'});
   const errors=[],badHttp=[],networkFailures=[],canceledDuringNavigation=[];
   let navigationInitiated=false;
   const baseOrigin=new URL(base).origin;
   page.on('pageerror',e=>errors.push(String(e?.message||e)));
   page.on('response',r=>{
    if(r.status()>=400 && new URL(r.url()).origin===baseOrigin &&
       !/favicon\.ico(?:\?|$)/.test(r.url()))badHttp.push({url:r.url(),status:r.status()});
   });
   page.on('requestfailed',r=>{
    if(new URL(r.url()).origin!==baseOrigin)return;
    const failure=r.failure()?.errorText||'';
    // Browsers legitimately abort preloaded audio requests when the page
    // switches between intro/game states. Do not hide actual HTTP errors.
    if(failure.includes('ERR_ABORTED') && /\/core\/assets\/audio\//.test(new URL(r.url()).pathname))return;
    // A user click starts a real page navigation. Chromium cancels any
    // outstanding requests belonging to the old intro document. Keep
    // their details in evidence but distinguish from a failed new-game
    // request; real 4xx/5xx and post-load failures remain hard failures.
    if(failure.includes('ERR_ABORTED') && navigationInitiated) {
     canceledDuringNavigation.push({url:r.url(),failure});
     return;
    }
    networkFailures.push({url:r.url(),failure});
   });
   const record={moduleId,viewport:view.name,route,url:base+route,
     testScope:'REAL_BROWSER_ENTRYPOINT_AND_IMAGE_TRANSPORT_ONLY',
     contentQuestionCountNotTested:true,
     candidatesFromLocalOnlyNotTested:true,
     browserGameplayQA:'NOT_CERTIFIED',
     pedagogicalQA:'NOT_CERTIFIED',boot:'FAILED'};
   try {
    const response=await page.goto(record.url,{waitUntil:'domcontentloaded',timeout:40000});
    record.httpStatus=response?.status()??null;
    await page.waitForTimeout(450);
    // Intro content can hydrate after DOMContentLoaded on the first Chromium page.
    // Wait a bounded time for the actual start control, not a fixed delay;
    // absence still fails the existing boot gate and is recorded for diagnosis.
    const start=page.getByRole('button',{name:/iniciar jogo/i}).first();
    const introWaitStarted=Date.now();
    try {await start.waitFor({state:'visible',timeout:10000});}
    catch(e){record.introWaitFailure=String(e.message).slice(0,250);}
    record.introWaitMs=Date.now()-introWaitStarted;
    record.before=await page.evaluate(()=>{
     const app=document.querySelector('#root') || document.body;
     const images=[...document.images].map(img=>({
      src:img.currentSrc || img.src,
      complete:img.complete,
      naturalWidth:img.naturalWidth,
      naturalHeight:img.naturalHeight
     }));
     return {
      title:document.title,
      htmlBodyTextLength:(document.body?.innerText||'').trim().length,
      rootTextLength:(app?.textContent||'').trim().length,
      documentWidth:document.documentElement?.scrollWidth||0,
      viewportWidth:innerWidth,
      images
     };
    });
    // Do not assume a generic route exposes the canary page start control.
    // If present and visible, attempt real pointer interaction. Always keep
    // screenshots and report the exact UI state reached.
    const selector='.duduq-intro-start-button';
    record.introStartVisible=await start.isVisible().catch(()=>false);
    const introTarget=record.introStartVisible?start:page.getByText(/INICIAR JOGO/i).first();
    if(!record.introStartVisible)record.introStartVisible=await introTarget.isVisible().catch(()=>false);
    if(!record.introStartVisible)errors.push('INTRO_START_NOT_VISIBLE_IN_PRODUCT_ROUTE');
    if(record.introStartVisible){
     try {
      navigationInitiated=true;
      await introTarget.click({timeout:6000});
      await page.waitForFunction(()=>{
       const frames=[...document.querySelectorAll('iframe')];
       const framePlayable=frames.some(f=>f.contentDocument?.body?.children.length>0);
       return window.DUDUQ_ENGINE_READY===true || framePlayable ||
        Boolean(document.querySelector('#game.game-screen,.duduq-game-screen,.duduq-mechanic-frame'));
      },null,{timeout:20000});
      await page.waitForTimeout(300);
      record.introStartClicked=true;
     }catch(e){record.introStartClicked=false;errors.push('INTRO_CLICK_FAILED:'+String(e.message).slice(0,250));}
    }
    record.navigatedUrl=page.url();
    record.after=await page.evaluate(()=>{
     const img=[...document.images];
     const emptySourceImages=img.filter(x=>!(x.currentSrc||x.getAttribute('src')));
     return {
      bodyTextLength:(document.body?.innerText||'').trim().length,
      imageCount:img.length,
      brokenVisibleImages:img.filter(x=>(x.currentSrc||x.getAttribute('src')) && x.complete && x.naturalWidth===0).map(x=>x.currentSrc||x.src),
      imagesWithEmptySource:emptySourceImages.length,
      emptySourceImageDetails:emptySourceImages.map(x=>{
       const rect=x.getBoundingClientRect();
       const parent=x.parentElement;
       const style=getComputedStyle(x);
       return {
        alt:x.getAttribute('alt')||'',
        className:typeof x.className==='string'?x.className:'',
        srcAttribute:x.getAttribute('src'),
        dataMediaId:x.closest('[data-media-id]')?.getAttribute('data-media-id')||null,
        dataTestId:x.closest('[data-testid]')?.getAttribute('data-testid')||null,
        parentTag:parent?.tagName||null,
        parentClass:typeof parent?.className==='string'?parent.className:'',
        outerHTML:x.outerHTML.slice(0,500),
        visible:rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none',
        rect:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)}
       };
      }),
      documentOverflowX:Math.max(0,document.documentElement.scrollWidth-innerWidth),
      engineReady:window.DUDUQ_ENGINE_READY===true,
      gameRootPresent:!!document.querySelector('#game,#root'),
      iframeGamePresent:[...document.querySelectorAll('iframe')].some(f=>f.contentDocument?.body?.children.length>0)
     };
    });
    record.boot=response?.ok() && record.before.htmlBodyTextLength>0 &&
      record.introStartClicked===true && record.after.gameRootPresent &&
      (/\/play\/(drag-drop-multimedia|drag-drop|target-shooter|matching|memory-quest|bubble-pop|smart-sentence)\//.test(new URL(record.navigatedUrl).pathname) ||
       record.after.iframeGamePresent || record.after.engineReady) &&
      errors.length===0 && badHttp.length===0 &&
      networkFailures.length===0 && record.after.brokenVisibleImages.length===0
      ?'PASS':'FAIL';
   }catch(e){errors.push('SMOKE_EXCEPTION:'+String(e.message).slice(0,800));}
   record.imageQaStatus=(record.after?.imagesWithEmptySource??0)>0?'PENDING_EMPTY_IMAGE_SOURCE':
      record.after?.brokenVisibleImages?.length?'FAILED_BROKEN_LOADED_ASSET':'NOT_CERTIFIED';
   record.pageErrors=errors;
   record.httpFailures=badHttp;
   record.networkFailures=networkFailures;
   record.canceledDuringNavigation=canceledDuringNavigation;
   record.screenshot=moduleId+'-'+view.name+'.png';
   await page.screenshot({path:path.join(dir,record.screenshot),fullPage:true,timeout:20000}).catch(e=>{
    errors.push('SCREENSHOT_FAILED:'+String(e.message).slice(0,200));
    record.boot='FAIL';
   });
   results.push(record);
   console.log(JSON.stringify({moduleId,viewport:view.name,boot:record.boot,httpStatus:record.httpStatus,
    pageErrors:errors.length,httpFailures:badHttp.length,networkFailures:networkFailures.length,canceledDuringNavigation:canceledDuringNavigation.length,
    brokenVisibleImages:record.after?.brokenVisibleImages?.length||0,
    imagesWithEmptySource:record.after?.imagesWithEmptySource||0,
    emptySourceImageDetails:record.after?.emptySourceImageDetails?.slice(0,2)||[],
    diagnosticErrors:errors.slice(0,2),route}));
   await page.close();
  }
 }
}finally{await browser.close()}
const failures=results.filter(r=>r.boot!=='PASS');
const imagePending=results.filter(r=>r.imageQaStatus!=='NOT_CERTIFIED');
const report={schemaVersion:'DUDUQ_MEDIA_BROWSER_CANDIDATE_SMOKE_V1',
 mode:'QA_ONLY_NON_PRODUCTION',actualBrowser:'PLAYWRIGHT_CHROMIUM',
 source:'Compiled V26 artifact served by local HTTP, unless candidate changes explicitly applied before this test',
 integratedImageQA:false,pedagogicalQAApproved:false,gameplayCertified:false,
 modules,viewports:views.map(x=>x.name),checks:results.length,passes:results.length-failures.length,
 failures:failures.length,mediaPendingChecks:imagePending.length,
 status:failures.length?'FAIL':imagePending.length?'ENTRYPOINT_PASS_MEDIA_SOURCE_INCOMPLETE':'ENTRYPOINT_PASS_MEDIA_QA_NOT_CERTIFIED',
 results};
await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:'qa/results/media-browser-qa/report.json',
 status:report.status,checks:report.checks,failures:report.failures,mediaPendingChecks:report.mediaPendingChecks}));
if(failures.length)process.exitCode=1;

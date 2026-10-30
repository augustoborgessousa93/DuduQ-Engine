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
  const route='/content/english/year-'+match[1]+'/module-'+match[2]+'/';
  for(const view of views){
   const page=await browser.newPage({viewport:{width:view.width,height:view.height},reducedMotion:'reduce'});
   const errors=[],badHttp=[],networkFailures=[];
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
    await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
    await page.waitForTimeout(300);
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
    const start=page.locator(selector).first();
    record.introStartVisible=await start.isVisible().catch(()=>false);
    if(!record.introStartVisible)errors.push('OFFICIAL_INTRO_START_NOT_VISIBLE');
    if(record.introStartVisible){
     try {
      await start.click({timeout:6000});
      await page.waitForFunction(()=>{
       const frames=[...document.querySelectorAll('iframe')];
       return frames.some(f=>f.contentDocument && (f.contentDocument.querySelector('.duduq-engine-root,.duduq-ts-root,.duduq-dd2-root,.duduq-matching-root,.duduq-mq-root,.duduq-bp-root')||f.contentDocument.body?.children.length>0));
      },null,{timeout:25000});
      await page.waitForTimeout(300);
      record.introStartClicked=true;
     }catch(e){record.introStartClicked=false;errors.push('INTRO_CLICK_FAILED:'+String(e.message).slice(0,250));}
    }
    record.after=await page.evaluate(()=>{
     const img=[...document.images];
     return {
      bodyTextLength:(document.body?.innerText||'').trim().length,
      imageCount:img.length,
      brokenVisibleImages:img.filter(x=>x.complete && x.naturalWidth===0).map(x=>x.currentSrc||x.src),
      documentOverflowX:Math.max(0,document.documentElement.scrollWidth-innerWidth),
      engineReady:window.DUDUQ_ENGINE_READY===true,
      gameRootPresent:!!document.querySelector('#game,#root'),
      iframeGamePresent:[...document.querySelectorAll('iframe')].some(f=>f.contentDocument?.body?.children.length>0)
     };
    });
    record.boot=response?.ok() && record.before.htmlBodyTextLength>0 &&
      record.after.gameRootPresent && record.after.iframeGamePresent && errors.length===0 && badHttp.length===0 &&
      networkFailures.length===0 && record.after.brokenVisibleImages.length===0
      ?'PASS':'FAIL';
   }catch(e){errors.push('SMOKE_EXCEPTION:'+String(e.message).slice(0,800));}
   record.pageErrors=errors;
   record.httpFailures=badHttp;
   record.networkFailures=networkFailures;
   record.screenshot=moduleId+'-'+view.name+'.png';
   await page.screenshot({path:path.join(dir,record.screenshot),fullPage:true,timeout:20000}).catch(e=>{
    errors.push('SCREENSHOT_FAILED:'+String(e.message).slice(0,200));
    record.boot='FAIL';
   });
   results.push(record);
   console.log(JSON.stringify({moduleId,viewport:view.name,boot:record.boot,httpStatus:record.httpStatus,
    pageErrors:errors.length,httpFailures:badHttp.length,networkFailures:networkFailures.length,
    brokenVisibleImages:record.after?.brokenVisibleImages?.length||0,route}));
   await page.close();
  }
 }
}finally{await browser.close()}
const failures=results.filter(r=>r.boot!=='PASS');
const report={schemaVersion:'DUDUQ_MEDIA_BROWSER_CANDIDATE_SMOKE_V1',
 mode:'QA_ONLY_NON_PRODUCTION',actualBrowser:'PLAYWRIGHT_CHROMIUM',
 source:'Compiled V26 artifact served by local HTTP, unless candidate changes explicitly applied before this test',
 integratedImageQA:false,pedagogicalQAApproved:false,gameplayCertified:false,
 modules,viewports:views.map(x=>x.name),checks:results.length,passes:results.length-failures.length,
 failures:failures.length,status:failures.length?'FAIL':'ENTRYPOINT_SMOKE_PASS_NOT_PEDAGOGICAL_QA',results};
await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:'qa/results/media-browser-qa/report.json',
 status:report.status,checks:report.checks,failures:report.failures}));
if(failures.length)process.exitCode=1;

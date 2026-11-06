#!/usr/bin/env node
/**
 * Browser evidence of FAST BILINGUAL candidate media, QA only.
 * Real Chromium; requires an isolated local Pages server at BASE_URL.
 * Never certifies pedagogical meaning, answer keys, audio, or full gameplay.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','DUDUQ_QA_ONLY_REQUIRED');
const dist=path.resolve('qa/fast-bilingual-immutable-candidate');
const report=JSON.parse(await readFile('qa/results/phase2-fast-bilingual-bulk-applied.json','utf8'));
assert.equal(report.realContracts,600,'CONTRACT_COUNT_CHANGED');
assert.equal(report.productionDeployed,false,'PRODUCTION_MUST_REMAIN_UNCHANGED');
assert.equal(report.releaseApproved,false,'RELEASE_MUST_REMAIN_UNAPPROVED');
assert(report.appliedMediaIds>0&&report.applied.length===report.appliedMediaIds,'NO_APPLIED_MEDIA');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const parsedBase=new URL(base);
assert(['127.0.0.1','localhost'].includes(parsedBase.hostname),'LOCAL_PAGES_ONLY');
const registry=JSON.parse(await readFile(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const byId=new Map(registry.entries.map(x=>[x.mediaId,x]));
const docs=new Map();
function getDoc(id){
 const module=id.slice(0,5);
 return docs.get(module);
}
for(const id of report.appliedQuestionIds){
 assert(/^Y[1-5]M0[1-6]-Q\d{3}$/.test(id),'UNEXPECTED_QUESTION_ID:'+id);
 const module=id.slice(0,5);
 if(!docs.has(module)){
  const rel='content/english/year-'+id[1]+'/module-'+id.slice(3,5)+'/questions.json';
  docs.set(module,JSON.parse(await readFile(path.join(dist,rel),'utf8')));
 }
}
// One true question per distinct original blob x mechanic; this prevents
// inflating "tested" by repeating duplicate mediaId aliases.
const sampleCandidates=new Map(),sample=new Map(),mediaPaths=new Map();
for(const item of report.applied){
 const reg=byId.get(item.mediaId);
 assert(reg?.provenance?.sourceGitBlob===item.sourceGitBlob,'REGISTRY_PROVENANCE:'+item.mediaId);
 assert.equal(reg.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
 assert(reg.urlOrPath.endsWith('.png'),'PNG_EXPECTED:'+item.mediaId);
 mediaPaths.set(item.mediaId,reg.urlOrPath);
 for(const questionId of item.questionIds){
  const q=getDoc(questionId)?.items?.find(x=>x.item_id===questionId);
  assert(q?.mechanicId,'COMPILED_MECHANIC_MISSING:'+questionId);
  const key=item.sourceGitBlob+'::'+q.mechanicId;
  if(!sampleCandidates.has(key))sampleCandidates.set(key,[]);
  sampleCandidates.get(key).push({questionId,mechanic:q.mechanicId,
   mediaId:item.mediaId,sourceGitBlob:item.sourceGitBlob,assetPath:reg.urlOrPath});
 }
}
// Retest the actual official Q001 URL including duduqStart; earlier QA
// selected Q004 as a substitute, which is not necessarily a valid session
// deep link. This is an experiment: a mismatch still FAILS the gate.
const sessionFixtureGaps=[];
// Verify EVERY distinct original PNG x mechanic pairing, not a subset.
// A pair can appear in multiple questions; explicit shared-ID semantic checks
// in the engine cover every use while this gate checks actual visibility.
const candidates=[...sampleCandidates.entries()].map(([key,items])=>({
 key,item:items.find(x=>x.questionId==='Y1M01-Q001')||items[0]
})).sort((a,b)=>a.key.localeCompare(b.key));
for(const x of candidates)sample.set(x.key,x.item);
const blobs=new Set(report.applied.map(x=>x.sourceGitBlob));
const mechanics=new Set(candidates.map(x=>x.item.mechanic));
const notBrowserSampled=candidates.filter(x=>!sample.has(x.key)).map(x=>x.key);
assert.equal(notBrowserSampled.length,0,'SOURCE_MECHANIC_COVERAGE_NOT_COMPLETE');
assert.equal(new Set([...sample.values()].map(x=>x.sourceGitBlob)).size,blobs.size,
 'NOT_ALL_DISTINCT_SOURCE_BLOBS_REPRESENTED');
assert.equal(new Set([...sample.values()].map(x=>x.mechanic)).size,mechanics.size,
 'NOT_ALL_MECHANICS_REPRESENTED');
assert(sample.size<=220,'BROWSER_SAMPLE_EXCESSIVE');
console.log('REAL_BROWSER_SAMPLING='+JSON.stringify({
 sourceBlobs:blobs.size,distinctMechanics:mechanics.size,
 sampledPairs:sample.size,unverifiedPairs:0,
 note:'All unique source PNG x mechanic pairs; not all interactive gameplay'
}));
const outDir='qa/results/phase2-fast-bulk-browser';
await mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const cases=[],moduleChecks=[];
try{
 // Independent real HTTP and entrypoint checks for all 30 modules and 600
 // compiled question contracts; not a claim of 600 interactive gameplays.
 const moduleContext=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0');
  const route='/play/english/year-'+year+'/module-'+mm+'/';
  const qroute='/content/english/year-'+year+'/module-'+mm+'/questions.json';
  const check={moduleId:'Y'+year+'M'+mm,route,httpStatus:null,questionHttpStatus:null,
   questions:null,bodyLength:0,errors:[]};
  moduleChecks.push(check);
  const page=await moduleContext.newPage();
  page.on('pageerror',e=>check.errors.push(String(e?.message||e).slice(0,200)));
  try{
   // Local Pages startup/requests can transiently fail between runs. Retry
   // the same immutable route only; never substitute another question.
   for(let attempt=0;attempt<3;attempt++){
    try{
     const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
     check.httpStatus=response?.status()??null;
     check.bodyLength=await page.evaluate(()=>document.body?.textContent?.trim().length||0);
     if(check.httpStatus===200&&check.bodyLength>=20)break;
    }catch(e){check.lastNavigationError=String(e.message||e).slice(0,190)}
    if(attempt<2)await page.waitForTimeout(400*(attempt+1));
   }
   for(let attempt=0;attempt<3;attempt++){
    try{
     const questionResponse=await page.request.get(base+qroute,{timeout:30000});
     check.questionHttpStatus=questionResponse.status();
     if(questionResponse.ok()){
      const data=await questionResponse.json();
      check.questions=data.items?.length??null;
      if(data.moduleId!==check.moduleId)check.errors.push('MODULE_ID_MISMATCH');
      if(check.questions===20&&data.moduleId===check.moduleId)break;
     }
    }catch(e){check.lastQuestionsError=String(e.message||e).slice(0,190)}
    if(attempt<2)await page.waitForTimeout(400*(attempt+1));
   }
  }catch(e){check.errors.push('MODULE_BOOT:'+String(e?.message||e).slice(0,220))}
  finally{await page.close()}
 }
 await moduleContext.close();
 const totalQuestions=moduleChecks.reduce((n,x)=>n+(x.questions||0),0);
 const preliminaryFailures=moduleChecks.filter(x=>x.httpStatus!==200||
  x.questionHttpStatus!==200||x.questions!==20||x.bodyLength<20||x.errors.length);
 if(preliminaryFailures.length)console.error('FAST_BULK_MODULE_PRECHECK_FAILURE_DETAILS='+JSON.stringify(preliminaryFailures));
 assert.equal(moduleChecks.length,30,'NOT_30_MODULES');
 assert.equal(totalQuestions,600,'NOT_600_REAL_HTTP_QUESTIONS');

 for(const view of [{name:'mobile',width:390,height:844},{name:'desktop',width:1280,height:800}]){
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},
   deviceScaleFactor:1,reducedMotion:'reduce'});
  for(const item of sample.values()){
   const page=await context.newPage();
   const error=[],httpErrors=[];
   page.on('pageerror',e=>error.push(String(e?.message||e).slice(0,240)));
   page.on('response',r=>{
    try{if(new URL(r.url()).origin===parsedBase.origin&&r.status()>=400&&!r.url().includes('favicon.ico'))
     httpErrors.push({url:r.url(),status:r.status()})}catch{}
   });
   const slug=item.mechanic.startsWith('smart-sentence')?'smart-sentence':item.mechanic;
   // The official Y1M01 entrypoint explicitly carries duduqStart=Y1M01.
   // Match the live navigation contract instead of triggering the session
   // identity guard with an incomplete deep link (observed on Q001 and Q004).
   const moduleId=item.questionId.slice(0,5);
   const startParam=moduleId==='Y1M01'?'&duduqStart=Y1M01':'';
   const url=base+'/play/'+slug+'/?duduqModule='+moduleId+
    '&duduqItem='+item.questionId+startParam+'&qaSeed=fast-bulk-real-browser';
   const record={...item,viewport:view.name,url,httpStatus:null,loaded:false,visible:false,
    observedFrames:0,errors:error,httpErrors,limitations:[]};
   cases.push(record);
   try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    record.httpStatus=response?.status()??null;
    const deadline=Date.now()+(item.mechanic==='bubble-pop'?12000:9000);
    do{
     const frames=page.frames();
     record.observedFrames=Math.max(record.observedFrames,frames.length);
     for(const frame of frames){
      try{
       const observed=await frame.evaluate(assetPath=>{
        const target=assetPath.replace(/^\/+/,''),matches=[];
        for(const img of document.images){
         try{
          const imagePath=decodeURIComponent(new URL(img.currentSrc||img.src,document.baseURI).pathname).replace(/^\/+/,'');
          if(imagePath!==target)continue;
          const box=img.getBoundingClientRect(),style=getComputedStyle(img);
          const loaded=img.complete&&img.naturalWidth>0&&img.naturalHeight>0;
          const visible=loaded&&box.width>=12&&box.height>=12&&
           box.right>0&&box.bottom>0&&box.left<innerWidth&&box.top<innerHeight&&
           style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0;
          matches.push({loaded,visible,width:Math.round(box.width),height:Math.round(box.height)});
         }catch{}
        }
        return matches;
       },item.assetPath);
       if(observed.some(x=>x.loaded))record.loaded=true;
       if(observed.some(x=>x.visible))record.visible=true;
      }catch(e){record.limitations.push('FRAME_PROBE:'+String(e.message||e).slice(0,130))}
     }
     if(record.visible)break;
     if(Date.now()>=deadline)break;
     await page.waitForTimeout(300);
    }while(true);
    record.pageUrl=page.url();
    record.screenshot=outDir+'/'+item.questionId+'-'+item.sourceGitBlob.slice(0,8)+
     '-'+item.mechanic.replace(/[^a-z0-9-]/gi,'_')+'-'+view.name+'.png';
    // Screenshot capture waits on fonts even when image visibility was
    // already confirmed. Preserve the gap without falsely failing loaded PNG.
    try{await page.screenshot({path:record.screenshot,fullPage:false,timeout:20000});}
    catch(e){
     record.screenshotCaptureError=String(e.message||e).slice(0,320);
     record.screenshot=null;
    }
   }catch(e){record.limitations.push('BROWSER_EXCEPTION:'+String(e.message||e).slice(0,350))}
   finally{await page.close()}
  }
  await context.close();
 }
}finally{await browser.close()}
const failures=cases.filter(x=>x.httpStatus!==200||!x.loaded||!x.visible||
 x.errors.length>0||x.httpErrors.length>0||x.limitations.some(x=>x.startsWith('BROWSER_EXCEPTION')));
const moduleFailures=moduleChecks.filter(x=>x.httpStatus!==200||x.questionHttpStatus!==200||
 x.questions!==20||x.bodyLength<20||x.errors.length>0);
const summary={schemaVersion:'DUDUQ_FAST_BULK_BROWSER_V1',status:(failures.length||moduleFailures.length)?
 'BROWSER_EVIDENCE_BLOCKED':'BROWSER_LOAD_AND_VISIBILITY_PASS_QA_ONLY',
 sourceCommit:report.sourceCommit,sourceBlobs:blobs.size,
 sampledSourceMechanicPairs:sample.size,sourceMechanicPairsAvailable:candidates.length,
 notBrowserSampledSourceMechanicPairs:notBrowserSampled,
 browserSamplingPolicy:'EVERY_SOURCE_BLOB_AND_MECHANIC_AT_LEAST_ONCE',
 mediaIds:report.appliedMediaIds,uniqueSourceMechanicSamples:sample.size,
 browserCases:cases.length,failedCases:failures.length,
 moduleRoutesChecked:moduleChecks.length,moduleRouteFailures:moduleFailures.length,
 moduleChecks,missingScreenshotCases:cases.filter(x=>x.screenshotCaptureError)
  .map(x=>({questionId:x.questionId,mechanic:x.mechanic,viewport:x.viewport,
   imageLoaded:x.loaded,imageVisible:x.visible,error:x.screenshotCaptureError})),
 knownUnverifiedSessionFixtures:sessionFixtureGaps,
 certifiedGameplay:false,pedagogicalQAApproved:false,productionDeployed:false,
 releaseApproved:false,cases};
await writeFile('qa/results/phase2-fast-bulk-browser.json',JSON.stringify(summary,null,2)+'\n');
if(failures.length)console.error('FAST_BULK_BROWSER_FAILURE_DETAILS='+JSON.stringify(failures.map(x=>({questionId:x.questionId,mediaId:x.mediaId,sourceGitBlob:x.sourceGitBlob,sourcePath:x.assetPath,mechanic:x.mechanic,viewport:x.viewport,httpStatus:x.httpStatus,loaded:x.loaded,visible:x.visible,observedFrames:x.observedFrames,errors:x.errors,httpErrors:x.httpErrors,limitations:x.limitations,screenshot:x.screenshot}))));
if(sessionFixtureGaps.length)console.warn('FAST_BULK_BROWSER_SESSION_GAPS='+JSON.stringify(sessionFixtureGaps));
console.log('FAST_BULK_MODULE_BOOT_QA='+JSON.stringify({routes:moduleChecks.length,
 questions:moduleChecks.reduce((n,x)=>n+(x.questions||0),0),failures:moduleFailures.length}));
if(moduleFailures.length)console.error('FAST_BULK_MODULE_BOOT_FAILURES='+JSON.stringify(moduleFailures));
console.log('FAST_BULK_BROWSER_QA='+JSON.stringify({status:summary.status,
 sourceBlobs:summary.sourceBlobs,samples:summary.uniqueSourceMechanicSamples,
 cases:summary.browserCases,failures:summary.failedCases}));
assert.equal(failures.length+moduleFailures.length,0,'DIRECTED_VISIBILITY_OR_30_MODULE_BOOT_FAILURES');

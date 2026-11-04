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
const sample=new Map(),mediaPaths=new Map();
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
  if(!sample.has(key))sample.set(key,{questionId,mechanic:q.mechanicId,
   mediaId:item.mediaId,sourceGitBlob:item.sourceGitBlob,assetPath:reg.urlOrPath});
 }
}
const blobs=new Set(report.applied.map(x=>x.sourceGitBlob));
assert(sample.size>=blobs.size,'SOURCE_BLOB_WITHOUT_BROWSER_SAMPLE');
assert(sample.size<=150,'EXCESSIVE_BROWSER_SAMPLE_REQUIRES_EXPLICIT_REVIEW');
const outDir='qa/results/phase2-fast-bulk-browser';
await mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const cases=[];
try{
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
   const url=base+'/play/'+slug+'/?duduqModule='+item.questionId.slice(0,5)+
    '&duduqItem='+item.questionId+'&qaSeed=fast-bulk-real-browser';
   const record={...item,viewport:view.name,url,httpStatus:null,loaded:false,visible:false,
    observedFrames:0,errors:error,httpErrors,limitations:[]};
   cases.push(record);
   try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    record.httpStatus=response?.status()??null;
    const deadline=Date.now()+(item.mechanic==='bubble-pop'?25000:15000);
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
    await page.screenshot({path:record.screenshot,fullPage:false,timeout:15000});
   }catch(e){record.limitations.push('BROWSER_EXCEPTION:'+String(e.message||e).slice(0,350))}
   finally{await page.close()}
  }
  await context.close();
 }
}finally{await browser.close()}
const failures=cases.filter(x=>x.httpStatus!==200||!x.loaded||!x.visible||
 x.errors.length>0||x.httpErrors.length>0||x.limitations.some(x=>x.startsWith('BROWSER_EXCEPTION')));
const summary={schemaVersion:'DUDUQ_FAST_BULK_BROWSER_V1',status:failures.length?
 'BROWSER_EVIDENCE_BLOCKED':'BROWSER_LOAD_AND_VISIBILITY_PASS_QA_ONLY',
 sourceCommit:report.sourceCommit,sourceBlobs:blobs.size,
 mediaIds:report.appliedMediaIds,uniqueSourceMechanicSamples:sample.size,
 browserCases:cases.length,failedCases:failures.length,
 certifiedGameplay:false,pedagogicalQAApproved:false,productionDeployed:false,
 releaseApproved:false,cases};
await writeFile('qa/results/phase2-fast-bulk-browser.json',JSON.stringify(summary,null,2)+'\n');
if(failures.length)console.error('FAST_BULK_BROWSER_FAILURE_DETAILS='+JSON.stringify(failures.map(x=>({questionId:x.questionId,mediaId:x.mediaId,sourceGitBlob:x.sourceGitBlob,sourcePath:x.assetPath,mechanic:x.mechanic,viewport:x.viewport,httpStatus:x.httpStatus,loaded:x.loaded,visible:x.visible,observedFrames:x.observedFrames,errors:x.errors,httpErrors:x.httpErrors,limitations:x.limitations,screenshot:x.screenshot}))));
console.log('FAST_BULK_BROWSER_QA='+JSON.stringify({status:summary.status,
 sourceBlobs:summary.sourceBlobs,samples:summary.uniqueSourceMechanicSamples,
 cases:summary.browserCases,failures:summary.failedCases}));
assert.equal(failures.length,0,'DIRECTED_BROWSER_VISIBILITY_FAILURES_REVIEW_EVIDENCE');

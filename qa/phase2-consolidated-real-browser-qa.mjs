#!/usr/bin/env node
/**
 * Browser test of the COMBINED 5-PNG/10-media-ID release candidate.
 * Audit the 5 affected question contracts at mobile and desktop, including
 * source-byte hashes, visibility, effective image resolution, and errors.
 * No game changes, no auto approval, and no deploy.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='http://127.0.0.1:4175',dist=path.resolve('dist-pages');
const evidence=JSON.parse(await readFile('qa/results/consolidated/evidence.json','utf8'));
assert.equal(evidence.status,'ISOLATED_QA_CONSOLIDATED_NO_DEPLOY');
assert.equal(evidence.mediaIdsModified,10);
assert.equal(evidence.sourceImagesAdded,5);
assert.equal(evidence.questionContractsChecked,600);
assert.equal(evidence.questionsChanged,0);
assert.equal(sha(await readFile(path.join(dist,'.duduq-pages-manifest'))),evidence.candidateManifestSha256);
const registry=JSON.parse(await readFile(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const entries=new Map(registry.entries.map(x=>[x.mediaId,x]));
const source=new Map(evidence.mediaBindings.map(x=>[x.mediaId,x.next]));
assert.equal(source.size,10);
for(const a of evidence.sourceImageHashes){
 assert.equal(sha(await readFile(path.join(dist,a.file))),a.sha256,'CANDIDATE_IMAGE_BYTES_INVALID');
}
const questionIDs=['Y1M06-Q004','Y4M03-Q006','Y4M03-Q011','Y4M03-Q014','Y4M03-Q016'];
const expected=new Map(),mechanics=new Map(),testedIDs=new Set();
for(const qid of questionIDs){
 const [_,y,m]=qid.match(/^Y([1-5])M(\d{2})-Q\d{3}$/)||[];
 assert(y&&m,'BAD_QID');
 const f='content/english/year-'+y+'/module-'+m+'/questions.json';
 const data=JSON.parse(await readFile(path.join(dist,f),'utf8'));
 const q=data.items.find(x=>x.item_id===qid);
 assert(q,'TARGET_CONTRACT_NOT_FOUND');
 const ids=[...source.keys()].filter(id=>JSON.stringify(q).includes('"'+id+'"'));
 assert(ids.length>=1,'NO_DELTA_IN_TARGET_QUESTION:'+qid);
 for(const id of ids){
  const entry=entries.get(id);
  assert(entry?.urlOrPath===source.get(id),'DELTA_NOT_ACTIVE_IN_REGISTRY:'+id);
  assert.equal(entry.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
  testedIDs.add(id);
 }
 expected.set(qid,[...new Set(ids.map(id=>source.get(id)))]);
 mechanics.set(qid,q.mechanicId);
}
assert.equal(testedIDs.size,10,'SOME_REPLACED_MEDIA_IDS_NOT_INCLUDED_IN_5_TESTED_QUESTIONS');
await mkdir('qa/results/consolidated/browser',{recursive:true});
const report={schemaVersion:'DUDUQ_PHASE2_COMBINED_QA_BROWSER_V1',
 manifestSha256:evidence.candidateManifestSha256,questions:questionIDs,
 sourceImages:5,mediaIds:10,views:[],productionDeployed:false,
 fullGameplayInteractionCertified:false,pedagogicalApproval:'PENDING',
 status:'RUNNING'};
const browser=await chromium.launch({headless:true});
let failures=[];
const probe=async(page,paths)=>{
 const result=[];
 for(const frame of page.frames()){
  try{
   const imgs=await frame.evaluate(paths=>[...document.images].map(img=>{
    let url;try{url=new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'');}
    catch{return null;}
    if(!paths.includes(url))return null;
    const r=img.getBoundingClientRect(),style=getComputedStyle(img);
    const seen=img.complete&&img.naturalWidth>0&&r.width>7&&r.height>7&&
       r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&
       style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0;
    return{url,visible:seen,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
      width:r.width,height:r.height,density:Math.min(img.naturalWidth/Math.max(1,r.width),img.naturalHeight/Math.max(1,r.height))};
   }).filter(Boolean),paths);
   for(const x of imgs)result.push({...x,frame:frame.url()});
  }catch(e){result.push({frame:frame.url(),inspectionError:String(e).slice(0,140)});}
 }
 return result;
};
try{
 for(const viewport of [{name:'desktop',width:1366,height:768},{name:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.name==='mobile',isMobile:viewport.name==='mobile'});
  for(const qid of questionIDs){
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const mechanic=mechanics.get(qid);
   const mc=mechanic?.startsWith('smart-sentence')?'smart-sentence':mechanic;
   const mod=qid.split('-Q')[0];
   const route='/play/'+mc+'/?duduqModule='+mod+'&duduqItem='+qid+'&qaSeed=phase2-5png-10ids';
   let response=null,error=null;
   try{response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});}
   catch(e){error=String(e);}
   const images=expected.get(qid),seen=new Map();
   const maxMs=qid==='Y4M03-Q006'?29000:11000;
   const beginning=Date.now();
   do{
    const sample=await probe(page,images);
    for(const item of sample){
     if(item.visible&&(!seen.has(item.url)||seen.get(item.url).density<item.density))seen.set(item.url,item);
    }
    if(images.every(x=>seen.has(x)))break;
    await page.waitForTimeout(300);
   }while(Date.now()-beginning<maxMs);
   const missing=images.filter(x=>!seen.has(x));
   const lowDensity=[...seen.values()].filter(x=>x.density<2).map(x=>({url:x.url,density:x.density}));
   await page.screenshot({path:'qa/results/consolidated/browser/'+viewport.name+'-'+qid+'.png',fullPage:true}).catch(()=>{});
   const pass=response?.status()===200&&missing.length===0&&lowDensity.length===0&&errors.length===0;
   const info={viewport:viewport.name,questionId:qid,mechanic,route,http:response?.status()||null,
     expectedPaths:images,observed:[...seen.values()],missing,lowDensity,errors,error,pass};
   report.views.push(info);
   if(!pass)failures.push(info);
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close();}
report.status=failures.length?'TARGETED_BROWSER_QA_INCOMPLETE_DO_NOT_DEPLOY':
 'TARGETED_BROWSER_10_OF_10_PASS_PEDAGOGICAL_AND_FULL_GAMEPLAY_QA_PENDING';
await writeFile('qa/results/consolidated/browser/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,passed:report.views.filter(x=>x.pass).length,
 tested:report.views.length,failed:failures.map(x=>({questionId:x.questionId,viewport:x.viewport,missing:x.missing,errors:x.errors})),productionDeployed:false}));
if(failures.length)process.exitCode=1;

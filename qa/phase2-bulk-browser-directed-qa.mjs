#!/usr/bin/env node
// Directed smoke of bulk original-image candidate, 30 routes plus up to 18
// representative active questions (desktop/mobile). No deployment or approval.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root='http://127.0.0.1:4175',dist=path.resolve('dist-pages');
const evidence=JSON.parse(await readFile('qa/results/bulk/integration-evidence.json','utf8'));
assert.equal(evidence.status,'BULK_QUALIFIED_ORIGINAL_IMAGES_APPLIED_QA_ONLY');
assert.equal(evidence.newMediaIds,150);
assert.equal(evidence.newOriginalPNGs,49);
assert.equal(evidence.fullContractHashesChecked,600);
assert.equal(sha(await readFile(path.join(dist,'.duduq-pages-manifest'))),evidence.candidateManifestSha256);
const expectedGroups=new Map(),byId=new Map();
for(const bind of evidence.acceptedBindings)byId.set(bind.mediaId,bind);
const seenQuestions=new Set();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mid='Y'+y+'M'+String(m).padStart(2,'0');
 const f='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const mod=JSON.parse(await readFile(path.join(dist,f),'utf8'));
 assert.equal(mod.moduleId,mid);assert.equal(mod.items.length,20);
 for(const q of mod.items){
  seenQuestions.add(q.item_id);
  const used=evidence.acceptedBindings.filter(b=>b.questionIds.includes(q.item_id));
  if(used.length)expectedGroups.set(q.item_id,{id:q.item_id,mechanic:q.mechanicId,
   assets:[...new Set(used.map(x=>x.assetPath))]});
 }
}
assert.equal(seenQuestions.size,600);
assert.equal(expectedGroups.size,evidence.affectedQuestionCount);
for(const b of evidence.acceptedBindings){
 const buf=await readFile(path.join(dist,b.assetPath));
 assert.equal(sha(buf),b.sha256,'SOURCE_PNG_INVALID:'+b.mediaId);
}
await mkdir('qa/results/bulk/browser',{recursive:true});
const browser=await chromium.launch({headless:true});
const report={schemaVersion:'DUDUQ_BULK_ORIGINALS_VISUAL_SMOKE_V1',
 baseManifestSha256:evidence.candidateManifestSha256,
 sources:49,newMediaIds:150,affectedQuestionCount:evidence.affectedQuestionCount,
 contracts:600,routeResults:[],visualSamples:[],humanVisualApproval:'PENDING',
 hasPlayedEveryQuestion:false,productionDeployed:false};
const candidates=[...expectedGroups.values()];
const sample=[],covered=new Set();
while(sample.length<18&&sample.length<candidates.length){
 const sorted=candidates.filter(q=>!sample.includes(q)).sort((a,b)=>{
  const newA=a.assets.filter(x=>!covered.has(x)).length;
  const newB=b.assets.filter(x=>!covered.has(x)).length;
  return newB-newA||b.assets.length-a.assets.length||a.id.localeCompare(b.id);
 });
 if(!sorted.length)break;
 const next=sorted[0];sample.push(next);next.assets.forEach(x=>covered.add(x));
}
let routeFailure=false;
try{
 for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
  const modulePath='/play/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/';
  let status=0;
  try{const r=await fetch(root+modulePath,{signal:AbortSignal.timeout(10000)});status=r.status;}
  catch(e){status=0;}
  report.routeResults.push({module:'Y'+y+'M'+String(m).padStart(2,'0'),status});
  if(status!==200)routeFailure=true;
 }
 for(const view of [{name:'desktop',width:1366,height:768},{name:'mobile',width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:view.width,height:view.height},
    hasTouch:view.name==='mobile',isMobile:view.name==='mobile'});
  for(const q of sample){
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   const mech=q.mechanic?.startsWith('smart-sentence')?'smart-sentence':q.mechanic;
   const route='/play/'+mech+'/?duduqModule='+q.id.split('-Q')[0]+'&duduqItem='+q.id+'&qaSeed=bulk-source-candidate';
   let status=0;
   try{const r=await page.goto(root+route,{waitUntil:'domcontentloaded',timeout:45000});status=r?.status()||0;}catch(e){errors.push(String(e));}
   const observed=new Map();
   const start=Date.now(),maxMs=q.mechanic==='bubble-pop'?13000:5000;
   do{
    for(const frame of page.frames()){
     try{
      const images=await frame.evaluate(paths=>[...document.images].map(img=>{
       let url;try{url=new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'');}catch{return null;}
       if(!paths.includes(url))return null;
       const b=img.getBoundingClientRect(),style=getComputedStyle(img);
       const visible=img.complete&&img.naturalWidth>0&&b.width>7&&b.height>7&&
         b.right>0&&b.bottom>0&&b.left<innerWidth&&b.top<innerHeight&&
         style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0;
       return{url,visible,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
         displayWidth:b.width,displayHeight:b.height,
         density:Math.min(img.naturalWidth/Math.max(1,b.width),img.naturalHeight/Math.max(1,b.height))};
      }).filter(Boolean),q.assets);
      for(const x of images)if(x.visible&&!observed.has(x.url))observed.set(x.url,x);
     }catch(e){errors.push('FRAME_INSPECT:'+String(e).slice(0,140));}
    }
    if(q.assets.every(x=>observed.has(x)))break;
    await page.waitForTimeout(350);
   }while(Date.now()-start<maxMs);
   await page.screenshot({path:'qa/results/bulk/browser/'+view.name+'-'+q.id+'.png',fullPage:true}).catch(()=>{});
   report.visualSamples.push({questionId:q.id,view:view.name,mechanic:q.mechanic,
     http:status,expected:q.assets,observed:[...observed.values()],missing:q.assets.filter(x=>!observed.has(x)),
     lowDensity:[...observed.values()].filter(x=>x.density<2).map(x=>({source:x.url,density:x.density})),
     errors,passedBoot:status===200&&errors.length===0});
   await page.close();
  }
  await ctx.close();
 }
}finally{await browser.close();}
report.status=routeFailure?'ROUTE_BOOT_FAIL_DO_NOT_DEPLOY':
 report.visualSamples.some(x=>!x.passedBoot)?'TARGETED_QUESTION_BOOT_REVIEW_REQUIRED':
 'ROUTES_PASS_TARGETED_VISUAL_OBSERVATIONS_RECORDED_PEDAGOGICAL_REVIEW_PENDING';
report.sampleQuestions=sample.length;report.sampleViews=report.visualSamples.length;
report.sampleAssetsCovered=covered.size;report.originalAssetsTotal=49;
report.routesPassed=report.routeResults.filter(x=>x.status===200).length;
report.visualSamplesWithAllImagesVisible=report.visualSamples.filter(x=>x.missing.length===0).length;
await writeFile('qa/results/bulk/browser/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,routeResults:report.routesPassed+'/30',
 questionsSampled:sample.length,views:report.sampleViews,uniqueAssetSourcesSampled:covered.size,
 allVisibleSamples:report.visualSamplesWithAllImagesVisible,
 bootPass:report.visualSamples.filter(x=>x.passedBoot).length,productionDeployed:false}));
if(routeFailure||report.visualSamples.some(x=>!x.passedBoot))process.exitCode=1;

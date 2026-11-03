#!/usr/bin/env node
// Real local Pages browser review of the 2-PNG Y1M06-Q004 QA candidate.
// Only candidate visual proof; no pedagogical approval or deployment.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),base='http://127.0.0.1:4175';
const evidence=JSON.parse(await readFile('qa/results/y1m06-fish-bird-evidence.json','utf8'));
assert.equal(evidence.status,'ISOLATED_QA_OVERLAY_CREATED_NO_DEPLOY');
assert.equal(evidence.mediaIds,2);
assert.equal(evidence.verifiedQuestionContracts,600);
const targets=evidence.changes;
const sha=b=>createHash('sha256').update(b).digest('hex');
const reg=JSON.parse(await readFile('dist-pages/content/english/media/media-registry.json','utf8'));
const registry=new Map(reg.entries.map(x=>[x.mediaId,x]));
const qData=JSON.parse(await readFile('dist-pages/content/english/year-1/module-06/questions.json','utf8'));
const q=qData.items.find(x=>x.item_id==='Y1M06-Q004');
assert(q?.mechanicId,'MISSING_TARGET_QUESTION');
for(const t of targets){
 const e=registry.get(t.mediaId);
 assert(e?.urlOrPath===t.assetPath&&e?.sha256===t.sha256,'MEDIA_BINDING_NOT_IN_OVERLAY:'+t.mediaId);
 assert(e?.temporary===true&&e?.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING');
 assert.equal(sha(await readFile(path.join(root,'dist-pages',t.assetPath))),t.sha256);
}
await mkdir('qa/results/y1m06-pets-browser',{recursive:true});
const result={schemaVersion:'Y1M06_FISH_BIRD_REAL_GAMEPLAY_VISUAL_QA_V1',
 sourceCandidateManifestSha256:evidence.candidateManifestSha256,
 questionId:'Y1M06-Q004',mechanic:q.mechanicId,sourcePNGCount:2,
 transport:[],views:[],visualPedagogicalApproval:false,gameplayInteractionApproved:false,
 productionDeployed:false,status:'IN_PROGRESS'};
for(const t of targets){
 const response=await fetch(base+'/'+t.assetPath);
 const b=Buffer.from(await response.arrayBuffer());
 const check={mediaId:t.mediaId,http:response.status,contentType:response.headers.get('content-type'),
  actualSha256:sha(b),expectedSha256:t.sha256,
  pass:response.status===200&&sha(b)===t.sha256};
 result.transport.push(check);
 assert(check.pass,'SERVING_WRONG_SOURCE_BYTES:'+t.mediaId);
}
const browser=await chromium.launch({headless:true});
let failures=[];
try{
 for(const view of [{name:'desktop',width:1366,height:768},{name:'mobile',width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:view.width,height:view.height}});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const route='/play/'+(q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId)+
   '/?duduqModule=Y1M06&duduqItem=Y1M06-Q004&qaSeed=pet-phase2';
  const res=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(res?.status(),200,'GAMEPLAY_ROUTE_NOT_200');
  const paths=targets.map(t=>t.assetPath);
  await page.waitForFunction(paths=>paths.every(p=>[...document.images].some(img=>{
   try{return new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'')===p&&img.complete&&img.naturalWidth>0}catch{return false}
  })),paths,{timeout:16000}).catch(()=>{});
  const rendered=await page.evaluate(paths=>{
   return [...document.images].map(img=>{
    const src=new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'');
    if(!paths.includes(src))return null;
    const r=img.getBoundingClientRect(),style=getComputedStyle(img);
    return {path:src,loaded:img.complete&&img.naturalWidth>0,
      x:r.x,y:r.y,width:r.width,height:r.height,visible:
      img.complete&&img.naturalWidth>0&&r.width>8&&r.height>8&&r.right>0&&r.bottom>0&&
      r.left<innerWidth&&r.top<innerHeight&&style.display!=='none'&&style.visibility!=='hidden'};
   }).filter(Boolean);
  },paths);
  await page.screenshot({path:'qa/results/y1m06-pets-browser/'+view.name+'-Y1M06-Q004.png',fullPage:true});
  const pass=paths.every(p=>rendered.some(x=>x.path===p&&x.visible))&&errors.length===0;
  if(!pass)failures.push({view:view.name,rendered,errors});
  result.views.push({view:view.name,route,response:res.status(),rendered,errors,pass});
  await ctx.close();
 }
}finally{await browser.close()}
result.status=failures.length?'FAIL_VISUAL_GATE_MANUAL_REVIEW_REQUIRED':'PASS_BOTH_PETS_VISIBLE_REAL_GAMEPLAY_NOT_FULL_INTERACTION';
await writeFile('qa/results/y1m06-pets-browser/report.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,views:result.views.map(v=>({view:v.view,pass:v.pass,images:v.rendered.length})),productionDeployed:false}));
if(failures.length)process.exitCode=1;

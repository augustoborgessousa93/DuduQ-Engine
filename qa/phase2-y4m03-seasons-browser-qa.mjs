#!/usr/bin/env node
/** Browser evidence only for the real isolated Y4M03 candidate, no deployment.
 *  Ensures original source hashes and explicit pixel-density assessment.
 *  A failed visual state is reported, never silently auto-approved. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const dist=path.resolve('dist-pages'),base='http://127.0.0.1:4175';
const evidence=JSON.parse(await readFile('qa/results/y4m03-seasons-evidence.json','utf8'));
assert.equal(evidence.status,'SEASON_IMAGES_APPLIED_IN_ISOLATED_QA_NO_DEPLOY');
assert.equal(evidence['600QuestionsVerified'],600);
assert.equal(evidence.sourceUniquePNGs,3);
assert.equal(evidence.changedMediaIds,8);
const changes=evidence.changes;
const sourceByPath=new Map(evidence.images.map(s=>[s.assetPath,s]));
const reg=JSON.parse(await readFile(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const ids=new Map(reg.entries.map(x=>[x.mediaId,x]));
for(const c of changes){assert.equal(ids.get(c.mediaId)?.urlOrPath,c.assetPath);
 assert.equal(ids.get(c.mediaId)?.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
 assert.equal(sha(await readFile(path.join(dist,c.assetPath))),c.sha256);
}
const qData=JSON.parse(await readFile(path.join(dist,'content/english/year-4/module-03/questions.json'),'utf8'));
const questions=new Map(qData.items.map(x=>[x.item_id,x]));
const qids=evidence.questionIds;
assert(qids.length>0&&qids.every(id=>questions.has(id)));
const report={schemaVersion:'Y4M03_SEASONS_DISPLAY_RESOLUTION_BROWSER_QA_V1',
 sourceSha256:evidence.images.map(x=>({name:x.name,sha256:x.sha256,width:x.width,height:x.height})),
 candidateManifestSha256:evidence.candidateManifestSha256,
 mediaIds:8,questionIds:qids,transport:[],views:[],status:'RUNNING',
 pedagogicallyApproved:false,interactionsComplete:false,productionDeployed:false};
for(const s of evidence.images){
 const response=await fetch(base+'/'+s.assetPath);
 const b=Buffer.from(await response.arrayBuffer());
 const okay=response.status===200&&sha(b)===s.sha256;
 report.transport.push({source:s.name,status:response.status,contentType:response.headers.get('content-type'),
  hashVerified:okay});
 assert(okay,'PNG_NOT_SERVED_WITH_EXACT_HASH:'+s.name);
}
await mkdir('qa/results/y4m03-seasons-browser',{recursive:true});
const browser=await chromium.launch({headless:true});
let allPassed=true;
try{
 for(const view of [{name:'desktop-1366x768',width:1366,height:768},
                    {name:'mobile-390x844',width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:view.width,height:view.height}});
  for(const qid of qids){
   const question=questions.get(qid);
   const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e.message||e)));
   const pathPart=question.mechanicId.startsWith('smart-sentence')?'smart-sentence':question.mechanicId;
   const route='/play/'+pathPart+'/?duduqModule=Y4M03&duduqItem='+qid+'&qaSeed=source-seasons';
   let response=null,fail=null;
   try{response=await p.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});}
   catch(e){fail=String(e);}
   const expected=[...new Set(changes.filter(c=>c.affectedQuestionIds.includes(qid)).map(c=>c.assetPath))];
   if(response?.status()===200){
    await p.waitForFunction(paths=>[...document.images].some(img=>{try{
       return paths.includes(new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,''))&&img.complete&&img.naturalWidth>0;
     }catch{return false;}}),expected,{timeout:10000}).catch(()=>{});
   }
   const visible=await p.evaluate(paths=>[...document.images].map(img=>{
    let uri;try{uri=new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'');}catch{return null;}
    if(!paths.includes(uri))return null;
    const r=img.getBoundingClientRect(),css=getComputedStyle(img);
    const inViewport=r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight;
    const loaded=img.complete&&img.naturalWidth>0;
    return {path:uri,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
     renderWidth:r.width,renderHeight:r.height,
     density:Math.min(img.naturalWidth/Math.max(1,r.width),img.naturalHeight/Math.max(1,r.height)),
     visible:loaded&&r.width>5&&r.height>5&&inViewport&&css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity)>0};
   }).filter(Boolean),expected);
   await p.screenshot({path:'qa/results/y4m03-seasons-browser/'+view.name+'-'+qid+'.png',fullPage:true}).catch(()=>{});
   const missing=expected.filter(x=>!visible.some(y=>y.path===x&&y.visible));
   const below2x=visible.filter(y=>y.visible&&y.density<2).map(y=>({path:y.path,density:y.density}));
   const passed=response?.status()===200&&errors.length===0&&missing.length===0&&below2x.length===0;
   report.views.push({questionId:qid,view:view.name,route,http:response?.status()??null,
    expectedImagePaths:expected,visibleImages:visible,missing,below2x,errors,pass:passed,error:fail});
   if(!passed)allPassed=false;
   await p.close();
  }
  await ctx.close();
 }
}finally{await browser.close();}
report.status=allPassed?'PASS_BROWSER_VISIBILITY_AND_EFFECTIVE_2X_DENSITY_PEDAGOGICAL_REVIEW_PENDING':
 'VISIBILITY_OR_DENSITY_NEEDS_REVIEW_QA_NOT_APPROVED';
await writeFile('qa/results/y4m03-seasons-browser/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:report.views.length,
 passed:report.views.filter(v=>v.pass).length,failed:report.views.filter(v=>!v.pass).map(v=>({view:v.view,questionId:v.questionId,missing:v.missing,below2x:v.below2x})),
 productionDeployed:false}));
if(!allPassed)process.exitCode=1;

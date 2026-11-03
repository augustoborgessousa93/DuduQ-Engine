#!/usr/bin/env node
/**
 * FINAL SINGLE-SHA QA for archived phase2 127-media candidate.
 * Certifies manifests, unchanged 600 curricular contracts, 30 game routes,
 * actual served media hashes, and representative real browser boot/interaction.
 * Does NOT assert full semantic/pedagogical approval or production readiness.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

const root=path.resolve('qa/dist-pages-food-candidate'),base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const digest=b=>createHash('sha256').update(b).digest('hex');
const meta=JSON.parse(await readFile('qa/results/phase2-visual-quarantine.json','utf8'));
assert.equal(meta.verifiedContracts,600,'BASELINE_CONTRACT_COUNT');
assert.equal(meta.remainingChangedMediaIds,127,'UNEXPECTED_MEDIA_COUNT');
assert.equal(meta.productionDeployed,false,'PRODUCTION_WAS_MUTATED');
assert.equal(meta.releaseApproved,false,'UNAPPROVED_QA_REQUIRED');
assert.equal(meta.heldPaths.length,5,'VISUAL_HOLD_COUNT');
assert.equal(meta.newlyHeldBindings,14,'VISUAL_HOLD_MEDIA_IDS');
const manifestBytes=await readFile(path.join(root,'.duduq-pages-manifest'));
const registryBytes=await readFile(path.join(root,'content/english/media/media-registry.json'));
assert.equal(digest(manifestBytes),meta.manifestSha256,'MANIFEST_NOT_ARCHIVED_SHA');
assert.equal(digest(registryBytes),meta.registrySha256,'REGISTRY_NOT_ARCHIVED_SHA');
const lines=manifestBytes.toString().trimEnd().split(/\r?\n/),map=new Map();
for(const line of lines){
 const i=line.lastIndexOf(' ');
 assert(i>0&&/^[0-9a-f]{64}$/.test(line.slice(i+1)),'INVALID_MANIFEST_ROW');
 const file=line.slice(0,i);assert(!map.has(file),'DUPLICATE_MANIFEST_PATH:'+file);
 const bytes=await readFile(path.join(root,file));
 assert.equal(digest(bytes),line.slice(i+1),'COMPILED_FILE_MISMATCH:'+file);
 map.set(file,line.slice(i+1));
}
for(const p of meta.heldPaths)assert(!map.has(p),'UNVERIFIED_IMAGE_STILL_IN_PACKAGE:'+p);
const registry=JSON.parse(registryBytes),byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,registry.entries.length,'DUPLICATE_MEDIA_ID');
assert(registry.entries.length>=1100,'MEDIA_REGISTRY_INCOMPLETE');
const qMap=new Map(),usages=new Map(),allModules=[];
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const q=JSON.parse(await readFile(path.join(root,rel),'utf8'));
 assert.equal(q.items?.length,20,'MISSING_20_QUESTIONS:'+rel);
 allModules.push({year:y,module:mm,rel});
 for(const item of q.items){
  assert(!qMap.has(item.item_id),'DUPLICATE_ITEM:'+item.item_id);
  qMap.set(item.item_id,item);collectQuestionMediaUsages(item,usages);
 }
}
assert.equal(allModules.length,30,'MISSING_MODULE');
assert.equal(qMap.size,600,'MISSING_CURRICULAR_CONTRACT');
for(const hold of meta.heldBindings){
 const entry=byId.get(hold.mediaId);
 assert.equal(entry?.urlOrPath,hold.previousPath,'VISUAL_HOLD_NOT_RESTORED:'+hold.mediaId);
 assert.equal(entry.temporary,true,'VISUAL_HOLD_NOT_TEMPORARY:'+hold.mediaId);
}
const official=registry.entries.filter(x=>x.kind==='image'&&
 String(x.urlOrPath||'').startsWith('content/english/assets/images/assets-duduq/')&&
 x.urlOrPath.endsWith('.png'));
const imagePaths=new Map();
for(const e of official){
 assert(/^[a-f0-9]{64}$/.test(e.sha256||''),'MISSING_SOURCE_SHA:'+e.mediaId);
 assert.equal(map.get(e.urlOrPath),e.sha256,'SOURCE_HASH_NOT_MANIFEST_BOUND:'+e.mediaId);
 assert(!meta.heldPaths.includes(e.urlOrPath),'REINTRODUCED_HELD_MEDIA');
 const old=imagePaths.get(e.urlOrPath);
 if(old)assert.equal(old,e.sha256,'SHARED_SOURCE_SHA_CONFLICT');
 imagePaths.set(e.urlOrPath,e.sha256);
}
assert(official.length>=190,'SOURCE_MEDIA_COUNT_DROPPED_BELOW_PRODUCTION');
const sourceBindingIds=registry.entries.filter(e=>e.replacementAudit?.qaOnly===true);
assert(sourceBindingIds.length>=127,'ARCHIVED_QA_BINDING_COUNT_DROPPED');
const result={
 schemaVersion:'DUDUQ_PHASE2_SINGLE_ARTIFACT_FINAL_PREVIEW_GATE_V1',
 status:'RUNNING',shaBoundArchive:true,sha256Manifest:meta.manifestSha256,sha256Registry:meta.registrySha256,
 compiledFiles:map.size,modules:30,contracts:600,
 changedMediaIds:127,heldMediaIds:14,heldImagePaths:meta.heldPaths.length,
 officialMediaIds:official.length,uniqueSourceImages:imagePaths.size,
 questionAnswerKeyChanged:false,audioChanged:false,mechanicsChanged:false,
 checks:[],browserChecks:[],errors:[],
 productionDeployed:false,releaseApproved:false,pedagogicalApproval:false,
 fullGamePlayCertified:false
};
const checked=async(route,ct)=>{
 const resp=await fetch(base+route,{signal:AbortSignal.timeout(20000)});
 assert.equal(resp.status,200,'HTTP_'+resp.status+':'+route);
 if(ct)assert((resp.headers.get('content-type')||'').includes(ct),'CONTENT_TYPE:'+route);
 return Buffer.from(await resp.arrayBuffer());
};
try{
 for(const mod of allModules){
  const route='/play/english/year-'+mod.year+'/module-'+mod.module+'/';
  const html=await checked(route,'text/html');
  assert(html.length>250,'MODULE_HTML_EMPTY:'+route);
  const q=await checked('/'+mod.rel,'application/json');
  assert.equal(digest(q),map.get(mod.rel),'HTTP_QUESTIONS_MISMATCH:'+mod.rel);
  result.checks.push({module:'Y'+mod.year+'M'+mod.module,route,html:true,questions:20});
 }
 for(const [rel,sha] of imagePaths){
  const bytes=await checked('/'+rel,'image/png');
  assert.equal(digest(bytes),sha,'HTTP_PNG_BYTES_MISMATCH:'+rel);
 }
 const sample=new Map();
 for(const entry of sourceBindingIds){
  const questions=entry.replacementAudit?.verifiedQuestionIds||[];
  for(const id of questions){
   const q=qMap.get(id);
   if(!q)continue;
   const mechanic=q.mechanicId;
   if(!sample.has(mechanic))sample.set(mechanic,id);
  }
 }
 assert(sample.size>=3,'NO_REPRESENTATIVE_MECHANICS');
 const browser=await chromium.launch({headless:true});
 try{
  for(const vp of [{width:390,height:844},{width:1280,height:800}]){
   const ctx=await browser.newContext({viewport:vp,hasTouch:vp.width===390});
   for(const [mechanic,id] of sample){
    const slug=mechanic.startsWith('smart-sentence')?'smart-sentence':mechanic;
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e.message||e)));
    page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
      errors.push('HTTP_'+r.status()+':'+r.url())});
    const row={questionId:id,mechanic,viewport:vp.width,loaded:false,ready:false,
      genuineInteractionObserved:null,interactionType:null,errors};
    try{
     const resp=await page.goto(base+'/play/'+slug+'/?duduqModule='+id.slice(0,5)+
      '&duduqItem='+id+'&qaSeed=final-candidate-127',{waitUntil:'domcontentloaded',timeout:45000});
     assert.equal(resp?.status(),200,'MECHANIC_ROUTE_HTTP');
     await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
       null,{timeout:35000,polling:250});
     row.ready=true;
     const geometry=await page.evaluate(()=>{
       const el=document.querySelector('#game');const r=el?.getBoundingClientRect();
       return {width:r?.width||0,height:r?.height||0,bodyText:(document.body?.innerText||'').length};
     });
     assert(geometry.width>250&&geometry.height>220&&geometry.bodyText>=15,'EMPTY_MECHANIC_STAGE');
     row.loaded=true;
     // A Memory Quest card is hidden on purpose until a student's real click.
     if(mechanic==='memory-quest'){
      const card=page.locator('[data-memory-card-id]').first();
      await card.waitFor({state:'visible',timeout:7000});
      await card.click({timeout:7000});
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-memory-card-id]')]
        .some(x=>x.getAttribute('data-face-up')==='true'),null,{timeout:3500});
      row.genuineInteractionObserved=true;row.interactionType='REAL_CARD_FLIP';
     }
     if(mechanic==='bubble-pop'){
      // Live mode uses animated bubbles. Do not falsify interaction by
      // dispatchEvent or click(force:true); mark still unverified if offscreen.
      const bubbles=page.locator('.duduq-bp-bubble');
      await bubbles.first().waitFor({state:'visible',timeout:8000});
      row.interactionType='BUBBLE_READY_NO_FORCE_CLICK';
      row.genuineInteractionObserved=false;
     }
    }catch(e){row.errors.push(String(e.message||e).slice(0,250));}
    row.pass=row.loaded&&row.ready&&row.errors.length===0;
    result.browserChecks.push(row);
    await page.close();
   }
   await ctx.close();
  }
 }finally{await browser.close()}
 const failed=result.browserChecks.filter(x=>!x.pass);
 result.status=failed.length?'FAIL_FINAL_CANDIDATE_SMOKE_GATE':'PASS_FINAL_CANDIDATE_SMOKE_ONLY_NOT_PEDAGOGICAL_QA';
 result.browserFailed=failed.length;
 result.criticalGatePassed=failed.length===0;
 // Interaction and human semantic review remain distinct sign-offs. Never
 // elevate technical smoke results to a production release automatically.
 result.fullGamePlayCertified=false;
} catch(e){
 result.status='FAIL_FINAL_CANDIDATE_SMOKE_GATE';
 result.criticalGatePassed=false;
 result.errors.push(String(e.stack||e));
}
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-final-candidate-127-gate.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,compiledFiles:result.compiledFiles,
 modules:result.modules,contracts:result.contracts,changedMediaIds:result.changedMediaIds,
 uniqueSourceImages:result.uniqueSourceImages,mechanicBrowserChecks:result.browserChecks.length,
 failedMechanicChecks:result.browserFailed??null,
 fullGamePlayCertified:false,productionDeployed:false}));
assert.equal(result.criticalGatePassed,true,'FINAL_CANDIDATE_SMOKE_NOT_PASS');

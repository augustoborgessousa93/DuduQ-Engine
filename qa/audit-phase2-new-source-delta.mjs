#!/usr/bin/env node
/**
 * Phase 2 new-source delta: strictly read-only preflight.
 * Never writes to compiled media registry, question contracts or Cloudflare.
 * Explicit audit options are candidates, NOT visual or pedagogical approval.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

const [distArg='qa/dist-pages-food-candidate',sourceArg='assets-source-expansion']=process.argv.slice(2);
const dist=path.resolve(distArg),source=path.resolve(sourceArg);
const apply=process.argv.includes('--apply');
if(apply){
 assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
 assert(dist.startsWith(path.resolve('qa')+path.sep),'APPLY_REQUIRES_ISOLATED_QA_DIST');
}
const manifest=JSON.parse(await readFile('docs/qa/media-audit-20261029/phase2-new-source-delta-20261102.json','utf8'));
const queue=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8')).queue;
const queueById=new Map(queue.map(q=>[q.mediaId,q]));
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const normalize=x=>String(x??'').trim().replace(/\s+/g,' ').toLowerCase();
const failClosed=(reasons,condition,code)=>{if(!condition)reasons.push(code)};
assert.equal(manifest.schemaVersion,'DUDUQ_PHASE2_NEW_SOURCE_DELTA_V1');
assert.equal(manifest.assets.length,39);
assert.equal(manifest.sourceTreeTruncated,false);
assert.equal(manifest.integratedMediaIds,0);
assert.equal(manifest.productionDeployed,false);
assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),manifest.sourceCommit,'SOURCE_COMMIT_CHANGED');
const regRel='content/english/media/media-registry.json';
const manifestText=await readFile(path.join(dist,'.duduq-pages-manifest'),'utf8');
const integrity=new Map(manifestText.trimEnd().split(/\r?\n/).map(line=>{
 const i=line.lastIndexOf(' ');assert(i>0,'BAD_MANIFEST_LINE');
 return [line.slice(0,i),line.slice(i+1)];
}));
const registryBytes=await readFile(path.join(dist,regRel));
assert.equal(sha256(registryBytes),integrity.get(regRel),'REGISTRY_SHA_MISMATCH');
const registry=JSON.parse(registryBytes);
const registryMap=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(registryMap.size,registry.entries.length,'DUPLICATE_MEDIA_ID');
const questions=new Map(),usages=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 assert.equal(sha256(bytes),integrity.get(rel),'QUESTION_SHA_MISMATCH:'+rel);
 const data=JSON.parse(bytes);
 assert.equal(data.moduleId,'Y'+y+'M'+mm);
 assert.equal(data.items.length,20,'MODULE_NOT_20:'+rel);
 for(const q of data.items){
  assert(!questions.has(q.item_id),'DUPLICATE_QUESTION_ID');
  questions.set(q.item_id,q);
  collectQuestionMediaUsages(q,usages);
 }
}
assert.equal(questions.size,600,'NOT_600_QUESTIONS');
const assets=[],candidates=[],seenIds=new Map();
for(const asset of manifest.assets){
 const file=path.resolve(source,asset.path);
 assert(file.startsWith(source+path.sep),'SOURCE_PATH_ESCAPE');
 const bytes=await readFile(file);
 assert.equal(gitBlob(bytes),asset.gitBlob,'SOURCE_GIT_BLOB_MISMATCH:'+asset.path);
 const signature=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const png=signature&&bytes.length>=26&&bytes.toString('ascii',12,16)==='IHDR';
 const width=png?bytes.readUInt32BE(16):null,height=png?bytes.readUInt32BE(20):null;
 const colorType=png?bytes[25]:null;
 const sourceRow={path:asset.path,gitBlob:asset.gitBlob,sha256:sha256(bytes),bytes:bytes.length,
  png,width,height,colorType,hasAlpha:colorType===4||colorType===6,
  explicitAuditBindings:asset.explicitAuditBindings.length};
 assets.push(sourceRow);
 for(const binding of asset.explicitAuditBindings){
  const reasons=[];
  const prior=seenIds.get(binding.mediaId);
  failClosed(reasons,!prior||prior===asset.path,'MEDIA_ID_MAPPED_TO_DIFFERENT_SOURCE');
  seenIds.set(binding.mediaId,asset.path);
  const q=questions.get(binding.questionId);
  failClosed(reasons,!!q,'QUESTION_NOT_IN_COMPILED_GRAPH');
  failClosed(reasons,q?.mechanicId===binding.mechanic,'MECHANIC_DIFFERS_FROM_AUDIT');
  // Options are nested differently across Gold Master mechanics. Verify the
  // actual leaf references collected from the complete compiled question tree,
  // not a hypothetical top-level q.options array.
  const leafUsages=(usages.get(binding.mediaId)||[]).filter(o=>o.questionId===binding.questionId);
  failClosed(reasons,leafUsages.length>0&&leafUsages.every(o=>
    normalize(o.semanticTarget)===normalize(asset.conceptHint)),
    'EXPLICIT_LEAF_NOT_CONFIRMED_IN_COMPILED_QUESTION');
  const occurrences=usages.get(binding.mediaId)||[];
  const actualQuestions=[...new Set(occurrences.map(o=>o.questionId))].sort();
  const auditedQuestions=[...new Set(manifest.assets.flatMap(a=>a.explicitAuditBindings.filter(b=>b.mediaId===binding.mediaId).map(b=>b.questionId)))].sort();
  // Shared IDs are allowed only when the complete 600-question graph proves
  // the same exact meaning at EVERY occurrence, not just at audited sample Qs.
  // The inventory's exampleQuestions are a sample, never a complete use list.
  failClosed(reasons,actualQuestions.length===queueById.get(binding.mediaId)?.usage&&
   (queueById.get(binding.mediaId)?.exampleQuestions||[]).every(id=>actualQuestions.includes(id)),
   'COMPLETE_SHARED_ID_USAGE_NOT_CONFIRMED');
  failClosed(reasons,occurrences.length>0,'NO_REAL_MEDIA_USAGE');
  // Chromium evidence (run #41536518602): every one of 38 missing-image
  // checks came from bubble-pop, on both viewports. Do NOT repoint shared
  // media IDs until that mechanic renders this media in actual gameplay.
  // A shared ID can be reused safely only if every consumer mechanic works.
  failClosed(reasons,actualQuestions.every(id=>questions.get(id)?.mechanicId!=='bubble-pop')||
   (apply&&process.env.DUDUQ_QA_ONLY==='1'&&process.env.DUDUQ_BUBBLE_FRAME_PROBE==='1'),
   'BUBBLE_POP_REQUIRES_IFRAME_AWARE_QA');
  failClosed(reasons,occurrences.every(o=>normalize(o.semanticTarget)===normalize(asset.conceptHint)),'MISSING_OR_CONFLICTING_LEAF_SEMANTICS');
  const reg=registryMap.get(binding.mediaId);
  const queueRow=queueById.get(binding.mediaId);
  failClosed(reasons,!!reg,'MEDIA_ID_MISSING_IN_REGISTRY');
  failClosed(reasons,!!queueRow&&queueRow.classification==='PROVISIONAL'&&
   queueRow.kind==='image'&&queueRow.semanticConflict===false&&
   normalize(queueRow.semantic)===normalize(asset.conceptHint)&&
   reg?.semantic===queueRow.semantic&&reg?.urlOrPath===queueRow.sourcePath,
   'QUEUE_AND_REGISTRY_PROVISIONAL_NOT_CONFIRMED');
  failClosed(reasons,reg?.temporary===true||
   (reg?.temporary==null&&queueRow?.temporary==null&&
    reg?.integrationStatus==='SOURCE_READY'&&queueRow?.integrationStatus==='SOURCE_READY'),
   'PROVISIONAL_STATE_NOT_CONFIRMED');
  failClosed(reasons,reg?.kind==='image','REGISTRY_KIND_NOT_IMAGE');
  failClosed(reasons,reg?.urlOrPath?.endsWith('.svg'),'NOT_PROVISIONAL_SVG');
  failClosed(reasons,reg?.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED'&&
   reg?.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH','EXISTING_OFFICIAL_APPROVAL');
  failClosed(reasons,png&&width>=1024&&height>=1024&&colorType===6,'SOURCE_NOT_1024_PLUS_RGBA_PNG');
  candidates.push({concept:asset.conceptHint,mediaId:binding.mediaId,questionId:binding.questionId,
   sourcePath:asset.path,sourceSha256:sourceRow.sha256,actualQuestionIds:actualQuestions,
   reasons:[...new Set(reasons)],structuralEligible:reasons.length===0,
   humanVisualReviewRequired:true,pedagogicalApproval:false});
 }
}
const uniqueIds=new Set(candidates.map(c=>c.mediaId));
// Show every actual blocker so the next integration pass can prioritize
// verified missing semantics/flags without weakening any fail-closed gate.
const reasonCounts=Object.fromEntries([...new Set(candidates.flatMap(c=>c.reasons))]
  .sort().map(reason=>[reason,candidates.filter(c=>c.reasons.includes(reason)).length]));
const report={schemaVersion:'DUDUQ_PHASE2_NEW_SOURCE_PREFLIGHT_V1',
 status:'INVENTORY_ONLY_NO_MEDIA_APPLIED',sourceCommit:manifest.sourceCommit,
 folderEntries:manifest.currentFolderEntries,folderDistinctGitBlobs:manifest.currentDistinctGitBlobs,
 verifiedContracts:questions.size,sourcePngsInspected:assets.length,
 explicitAuditBindings:candidates.length,distinctCandidateMediaIds:uniqueIds.size,
 structurallyEligibleBindings:candidates.filter(c=>c.structuralEligible).length,
 blockedBindings:candidates.filter(c=>!c.structuralEligible).length,
 blockingReasonCounts:reasonCounts,
 sourceAssets:assets,candidates,
 visualQaPassed:false,audioQaPassed:false,humanPedagogicalApproval:false,
 questionsChanged:0,answerKeysChanged:0,productionDeployed:false};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-new-source-preflight.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,sourceCommit:report.sourceCommit,
 files:assets.length,explicitBindings:candidates.length,distinctIds:uniqueIds.size,
 structural:report.structurallyEligibleBindings,blocked:report.blockedBindings,
 reasons:report.blockingReasonCounts,contracts:questions.size}));


// Apply only exact, complete-graph, source-pinned matches to a disposable QA copy.
// This is a real compiled media replacement, NOT a production or pedagogical release.
if(apply){
 const selectedById=new Map();
 for(const c of candidates){
  if(!selectedById.has(c.mediaId))selectedById.set(c.mediaId,[]);
  selectedById.get(c.mediaId).push(c);
 }
 const selected=[...selectedById].filter(([,rows])=>rows.every(c=>c.structuralEligible))
   .map(([mediaId,rows])=>({mediaId,rows,asset:manifest.assets.find(a=>a.path===rows[0].sourcePath)}));
 for(const x of selected){
  assert(x.asset,'SOURCE_ASSET_NOT_FOUND:'+x.mediaId);
  assert(x.rows.every(c=>c.sourcePath===x.asset.path),'SOURCE_CONFLICT:'+x.mediaId);
  const actual=[...new Set((usages.get(x.mediaId)||[]).map(o=>o.questionId))].sort();
  assert(actual.length===queueById.get(x.mediaId).usage,'SHARED_USAGE_COUNT_CHANGED:'+x.mediaId);
  assert((usages.get(x.mediaId)||[]).every(o=>normalize(o.semanticTarget)===normalize(x.asset.conceptHint)),
   'SHARED_SEMANTICS_CHANGED:'+x.mediaId);
 }

 if(selected.length===0){
  const hold={status:'NO_NEW_SOURCE_MEDIA_APPLIED_BUBBLE_POP_VISUAL_HOLD',
   sourceCommit:manifest.sourceCommit,verifiedContracts:600,changedMediaIds:0,
   images:[],bindings:[],changedQuestionIds:[],changedQuestionCount:0,
   questionsChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
   productionDeployed:false,releaseApproved:false,pedagogicalQAApproved:false,
   blockingReasonCounts:reasonCounts};
  await writeFile('qa/results/phase2-new-source-qa-patch.json',JSON.stringify(hold,null,2)+'\n');
  console.log(JSON.stringify({status:hold.status,changedMediaIds:0,reason:'bubble-pop missing source imagery on both viewports'}));
  process.exit(0);
 }
 const usedAssets=[...new Map(selected.map(x=>[x.asset.path,x.asset])).values()];
 const sourceImageMap=new Map();
 for(const asset of usedAssets){
  const bytes=await readFile(path.resolve(source,asset.path));
  const sha=sha256(bytes);
  const slug=normalize(asset.conceptHint).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  assert(slug&&slug.length<80,'BAD_SOURCE_SLUG:'+asset.path);
  const dest='content/english/assets/images/assets-duduq/new-source-'+slug+'-'+sha.slice(0,12)+'.png';
  assert(!integrity.has(dest),'IMAGE_ALREADY_EXISTS_IN_MANIFEST:'+dest);
  sourceImageMap.set(asset.path,{dest,sha,bytes,gitBlob:gitBlob(bytes)});
 }
 const next=structuredClone(registry);
 const indices=new Map(next.entries.map((e,i)=>[e.mediaId,i]));
 for(const x of selected){
  const idx=indices.get(x.mediaId);
  assert(Number.isInteger(idx),'MISSING_MEDIA_INDEX:'+x.mediaId);
  const prior=next.entries[idx],expected=queueById.get(x.mediaId);
  assert(prior.urlOrPath===expected.sourcePath&&prior.kind==='image','MEDIA_REGISTRY_CHANGED:'+x.mediaId);
  const img=sourceImageMap.get(x.asset.path);
  next.entries[idx]={...prior,temporary:true,
   integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
   humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
   urlOrPath:img.dest,sha256:img.sha,assets:[{path:img.dest,sha256:img.sha}],
   altText:x.asset.conceptHint,
   provenance:{provider:'Assets-DuduQ repository',
    sourceRepository:'augustoborgessousa93/Assets-DuduQ',sourceCommit:manifest.sourceCommit,
    sourcePath:x.asset.path,sourceGitBlob:img.gitBlob,sha256:img.sha},
   replacementAudit:{source:'all 600 compiled questions, exact leaf semantics and queue usage',
    verifiedQuestionIds:[...new Set(x.rows.flatMap(r=>r.actualQuestionIds))].sort(),
    previousPath:expected.sourcePath,qaOnly:true}};
 }
 const newRegistryBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
 const manifestLines=manifestText.trimEnd().split(/\r?\n/);
 const newLines=manifestLines.map(l=>l.startsWith(regRel+' ')?regRel+' '+sha256(newRegistryBytes):l);
 assert.equal(newLines.filter(l=>l.startsWith(regRel+' ')).length,1,'DUPLICATE_REGISTRY_IN_MANIFEST');
 for(const img of sourceImageMap.values())newLines.push(img.dest+' '+img.sha);
 const newManifestBytes=Buffer.from(newLines.join('\n')+'\n');
 const created=[];
 try{
  for(const img of sourceImageMap.values()){
   const file=path.resolve(dist,img.dest);
   assert(file.startsWith(dist+path.sep),'OUTPUT_ESCAPE');
   await mkdir(path.dirname(file),{recursive:true});
   await writeFile(file,img.bytes,{flag:'wx'});
   created.push(file);
  }
  await writeFile(path.join(dist,regRel),newRegistryBytes);
  await writeFile(path.join(dist,'.duduq-pages-manifest'),newManifestBytes);
  for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
   const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
   assert.equal(sha256(await readFile(path.join(dist,rel))),integrity.get(rel),
    'CONTRACT_CHANGED:'+rel);
  }
  for(const img of sourceImageMap.values())
   assert.equal(sha256(await readFile(path.join(dist,img.dest))),img.sha,'PNG_CHANGED:'+img.dest);
  assert.equal(sha256(await readFile(path.join(dist,regRel))),sha256(newRegistryBytes),
   'REGISTRY_WRITE_CORRUPTED');
  const changedQuestions=[...new Set(selected.flatMap(x=>x.rows.flatMap(r=>r.actualQuestionIds)))].sort();
  const patch={schemaVersion:'DUDUQ_PHASE2_NEW_SOURCE_QA_PATCH_V1',
   status:'ISOLATED_MEDIA_UPDATED_VISUAL_AND_PEDAGOGICAL_QA_PENDING',
   sourceCommit:manifest.sourceCommit,changedMediaIds:selected.length,changedQuestionCount:changedQuestions.length,
   changedQuestionIds:changedQuestions,changedModules:[...new Set(changedQuestions.map(x=>x.slice(0,5)))].sort(),
   images:[...sourceImageMap.values()].map(x=>({assetPath:x.dest,sha256:x.sha,sourceGitBlob:x.gitBlob})),
   bindings:selected.map(x=>({mediaId:x.mediaId,concept:x.asset.conceptHint,
    sourcePath:sourceImageMap.get(x.asset.path).dest,questionIds:[...new Set(x.rows.flatMap(r=>r.actualQuestionIds))].sort()})),
   verifiedContracts:600,questionsChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
   pedagogicalQAApproved:false,releaseApproved:false,productionDeployed:false,
   registrySha256:sha256(newRegistryBytes),manifestSha256:sha256(newManifestBytes)};
  await writeFile('qa/results/phase2-new-source-qa-patch.json',JSON.stringify(patch,null,2)+'\n');
  console.log(JSON.stringify({status:patch.status,mediaIds:patch.changedMediaIds,
   images:patch.images.length,questions:patch.changedQuestionCount,modules:patch.changedModules.length}));
 }catch(err){
  await writeFile(path.join(dist,regRel),registryBytes);
  await writeFile(path.join(dist,'.duduq-pages-manifest'),manifestText);
  for(const f of created)await rm(f,{force:true});
  throw err;
 }
}

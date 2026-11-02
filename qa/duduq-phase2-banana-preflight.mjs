#!/usr/bin/env node
/**
 * Phase 2 continuation: verify deferred banana bindings against the exact
 * compiled 600-question graph. Read-only QA; no production or content edits.
 * Usage: node qa/duduq-phase2-banana-preflight.mjs [dist-pages] [assets-source]
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';

const root=process.cwd();
const dist=path.resolve(process.argv[2]||'dist-pages');
const assets=path.resolve(process.argv[3]||'assets-source');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
const queue=await readJson('docs/qa/media-audit-20261029/replacement-queue.json');
const phase2=await readJson('docs/qa/media-audit-20261029/phase2-source-reuse-candidates-20261101.json');
assert.equal(phase2.schemaVersion,'DUDUQ_PHASE2_SOURCE_REUSE_CANDIDATES_V1');
assert.equal(gitBlob(Buffer.from(JSON.stringify(queue,null,2)+'\n')),phase2.auditBlob,'QUEUE_CHANGED_REAUDIT_REQUIRED');
const banana=phase2.candidateAssets.find(x=>x.concept==='banana');
assert(banana?.sourceGitBlob==='14f858bef72073c5489557904d22d564f186f393','SOURCE_BANANA_CHANGED');
assert.equal(banana.sourceFile,'Imagens Ilustrativa/banana.png');
const sourcePath=path.resolve(assets,banana.sourceFile);
assert(sourcePath.startsWith(assets+path.sep),'SOURCE_PATH_OUTSIDE_ASSETS');
const png=await readFile(sourcePath),qc=inspectPng(png);
assert.equal(gitBlob(png),banana.sourceGitBlob,'BANANA_SOURCE_BYTES_CHANGED');
assert(qc.valid&&qc.transparent&&png.readUInt32BE(16)>=1024&&png.readUInt32BE(20)>=1024&&png[24]===8&&png[25]===6,'BANANA_NOT_RGBA_TRANSPARENT_HIGH_RES');
const imageSha=sha256(png);
const imagePath='content/english/assets/images/assets-duduq/banana-'+imageSha.slice(0,12)+'.png';
const regRel='content/english/media/media-registry.json';
const regBytes=await readFile(path.join(dist,regRel));
const registry=JSON.parse(regBytes);
assert(Array.isArray(registry.entries)&&registry.entries.length>=1100,'BAD_COMPILED_REGISTRY');
const registryMap=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(registryMap.size,registry.entries.length,'DUPLICATE_MEDIA_IDS');
const manifest=await readFile(path.join(dist,'.duduq-pages-manifest'),'utf8');
const manifestMap=new Map();
for(const line of manifest.trimEnd().split(/\r?\n/)){
 const pos=line.lastIndexOf(' '),rel=line.slice(0,pos),digest=line.slice(pos+1);
 assert(pos>0&&/^[a-f0-9]{64}$/.test(digest)&&!manifestMap.has(rel),'INVALID_MANIFEST');
 manifestMap.set(rel,digest);
}
assert.equal(manifestMap.get(regRel),sha256(regBytes),'REGISTRY_NOT_BOUND_TO_MANIFEST');
const occurrences=new Map(),questions=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),mod='Y'+y+'M'+mm;
 const rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 assert.equal(sha256(bytes),manifestMap.get(rel),'COMPILED_QUESTION_HASH_MISMATCH:'+mod);
 const data=JSON.parse(bytes);
 assert.equal(data.moduleId,mod);assert.equal(data.items?.length,20);
 for(const q of data.items){
  assert(/^Y[1-5]M0[1-6]-Q\d{3}$/.test(q.item_id),'INVALID_ITEM_ID');
  assert(!questions.has(q.item_id),'DUPLICATE_QUESTION');
  questions.set(q.item_id,q);
  collectQuestionMediaUsages(q,occurrences);
 }
}
assert.equal(questions.size,600,'NOT_600_QUESTIONS');
const rows=phase2.sourceRows.filter(x=>x.concept==='banana');
assert.equal(rows.length,4,'BANANA_CANDIDATE_COUNT_CHANGED');
const results=[];
for(const planned of rows){
 const row=queue.queue.find(x=>x.mediaId===planned.mediaId);
 const current=registryMap.get(planned.mediaId);
 const found=occurrences.get(planned.mediaId)||[];
 const questionIds=[...new Set(found.map(x=>x.questionId))].sort();
 const expected=[...planned.exampleQuestions].sort();
 const explicit=found.filter(x=>String(x.semanticTarget||'').trim());
 const implicit=found.filter(x=>!String(x.semanticTarget||'').trim());
 const checks={
  auditRowMatches:Boolean(row&&row.mediaId===planned.mediaId&&row.semantic==='banana'&&
   row.classification==='PROVISIONAL'&&row.semanticConflict===false&&
   row.kind==='image'&&row.integrationStatus==='SOURCE_READY'&&row.temporary==null),
  registryIsUnapprovedSvg:Boolean(current&&current.kind==='image'&&
   current.urlOrPath===row?.sourcePath&&current.urlOrPath.endsWith('.svg')&&
   current.semantic==='banana'&&current.temporary===true&&
   current.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED'&&
   current.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH'),
  usageMatches:Boolean(questionIds.length===planned.queueUsage&&
   JSON.stringify(questionIds)===JSON.stringify(expected)),
  explicitSemanticsConsistent:explicit.every(x=>isExactPedagogicalConcept('banana',x.semanticTarget)),
  everyQuestionHasExplicitProof:questionIds.every(id=>
   explicit.some(x=>x.questionId===id&&isExactPedagogicalConcept('banana',x.semanticTarget)))
 };
 const safe=Object.values(checks).every(Boolean);
 results.push({mediaId:planned.mediaId,sourceConcept:'banana',questionIds,
  queueUsage:planned.queueUsage,actualDistinctQuestionCount:questionIds.length,
  actualNestedReferences:found.length,explicitReferences:explicit.length,
  implicitReferences:implicit.length,checks,
  decision:safe?'ELIGIBLE_FOR_ISOLATED_QA_PATCH':'HOLD_PROVISIONAL_REVIEW_REQUIRED',
  currentPath:current?.urlOrPath||null});
}
const sharedId='IMG-Y1M03-Q001-BLACK';
const shared=[...new Set((occurrences.get(sharedId)||[]).map(x=>x.questionId))].sort();
const sharedRow=queue.queue.find(x=>x.mediaId===sharedId);
const sharedBlack={mediaId:sharedId,queueUsage:sharedRow?.usage,
 listedQuestions:sharedRow?.exampleQuestions||[],actualQuestionIds:shared,
 actualQuestionCount:shared.length,needsAuditCorrection:shared.length!==sharedRow?.usage||
 JSON.stringify(shared)!==JSON.stringify([...(sharedRow?.exampleQuestions||[])].sort())};
const result={schemaVersion:'DUDUQ_PHASE2_BANANA_PREFLIGHT_V1',
 status:'READ_ONLY_PREFLIGHT_COMPLETE',sourceCommit:phase2.sourceCommit,
 sourceGitBlob:banana.sourceGitBlob,sourceSha256:imageSha,sourceAssetPath:imagePath,
 compiledRegistrySha256:sha256(regBytes),verifiedQuestionContracts:questions.size,
 candidates:rows.length,eligibleIds:results.filter(x=>x.decision==='ELIGIBLE_FOR_ISOLATED_QA_PATCH').length,
 blockedIds:results.filter(x=>x.decision!=='ELIGIBLE_FOR_ISOLATED_QA_PATCH').length,
 bindings:results,sharedBlack,whiteImageBlockedForContrast:true,
 questionsChanged:0,answerKeysChanged:0,audioChanged:0,
 releaseApproved:false,productionDeployed:false};
await mkdir(path.join(root,'qa/results'),{recursive:true});
await writeFile(path.join(root,'qa/results/phase2-banana-preflight.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,contracts:result.verifiedQuestionContracts,
 bananaCandidates:result.candidates,eligible:result.eligibleIds,blocked:result.blockedIds,
 blackAuditNeedsCorrection:sharedBlack.needsAuditCorrection,productionDeployed:false}));

/**
 * QA-only apply mode. Uses the same complete-graph preflight above; the
 * production package, source curriculum and approved media are immutable.
 * Usage: copy the verified dist-pages into qa/dist-pages-banana-candidate, then run:
 * DUDUQ_QA_ONLY=1 node qa/duduq-phase2-banana-preflight.mjs qa/dist-pages-banana-candidate assets-source --apply
 * Never patch the canonical dist-pages tree in place.
 * The result is an isolated, unapproved candidate, NOT a release.
 */
if(process.argv.includes('--apply')){
 assert.equal(process.env.DUDUQ_QA_ONLY,'1','APPLY_REQUIRES_EXPLICIT_EPHEMERAL_QA');
 assert.notEqual(dist,path.resolve(root,'dist-pages'),'REFUSE_TO_MUTATE_CANONICAL_DIST_PAGES');
 assert(dist.startsWith(path.resolve(root,'qa')+path.sep),'APPLY_REQUIRES_ISOLATED_QA_DIST');
 assert.equal(result.verifiedQuestionContracts,600,'QUESTION_COUNT_CHANGED');
 const eligible=results.filter(x=>x.decision==='ELIGIBLE_FOR_ISOLATED_QA_PATCH');
 assert(eligible.length>0,'NO_SEMANTICALLY_VERIFIED_BANANA_BINDINGS');
 assert(!manifestMap.has(imagePath),'BANANA_ASSET_ALREADY_IN_COMPILED_MANIFEST');
 const byId=new Map(rows.map(x=>[x.mediaId,x]));
 const selected=[];
 for(const item of eligible){
  const planned=byId.get(item.mediaId),current=registryMap.get(item.mediaId);
  assert(planned&&current&&item.checks.everyQuestionHasExplicitProof&&
   item.checks.explicitSemanticsConsistent&&item.checks.usageMatches,
   'UNVERIFIED_BINDING:'+item.mediaId);
  assert.equal(current.temporary,true,'MISSING_EXPLICIT_PROVISIONAL_FLAG:'+item.mediaId);
  assert.equal(planned.sourceFile,banana.sourceFile,'SOURCE_CONCEPT_MISMATCH:'+item.mediaId);
  assert.equal(current.urlOrPath,queue.queue.find(x=>x.mediaId===item.mediaId)?.sourcePath,
   'REGISTRY_SOURCE_PATH_CHANGED:'+item.mediaId);
  assert(current.urlOrPath.endsWith('.svg')&&current.kind==='image'&&
   current.semantic==='banana'&&current.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED',
   'IMMUTABLE_OR_NON_BANANA_BINDING:'+item.mediaId);
  selected.push({mediaId:item.mediaId,questionIds:item.questionIds,
   previousPath:current.urlOrPath});
 }
 const updated=structuredClone(registry);
 const indices=new Map(updated.entries.map((entry,i)=>[entry.mediaId,i]));
 for(const binding of selected){
  const index=indices.get(binding.mediaId);
  assert(Number.isInteger(index),'MEDIA_ID_NOT_IN_REGISTRY:'+binding.mediaId);
  const previous=updated.entries[index];
  updated.entries[index]={...previous,status:previous.status,kind:'image',
   temporary:true,integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
   humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
   urlOrPath:imagePath,sha256:imageSha,
   assets:[{path:imagePath,sha256:imageSha}],altText:'banana',
   provenance:{provider:'Assets-DuduQ repository',
    sourceRepository:phase2.sourceRepository,sourceCommit:phase2.sourceCommit,
    sourcePath:banana.sourceFile,sourceGitBlob:banana.sourceGitBlob,
    nativeWidth:png.readUInt32BE(16),nativeHeight:png.readUInt32BE(20),sha256:imageSha},
   replacementAudit:{source:'600 compiled questions with explicit semantic proof',
    verifiedQuestionIds:binding.questionIds,previousPath:binding.previousPath,qaOnly:true}};
 }
 assert.equal(updated.entries.length,registry.entries.length,'REGISTRY_ENTRY_COUNT_CHANGED');
 const newRegistryBytes=Buffer.from(JSON.stringify(updated,null,2)+'\n');
 const manifestLines=manifest.trimEnd().split(/\r?\n/);
 const oldRegistryLines=manifestLines.filter(line=>line.startsWith(regRel+' '));
 assert.equal(oldRegistryLines.length,1,'REGISTRY_MANIFEST_ENTRY_NOT_UNIQUE');
 const newLines=manifestLines.map(line=>line.startsWith(regRel+' ')?
  regRel+' '+sha256(newRegistryBytes):line);
 newLines.push(imagePath+' '+imageSha);
 const finalManifestBytes=Buffer.from(newLines.join('\n')+'\n');
 const registryFile=path.join(dist,regRel),manifestFile=path.join(dist,'.duduq-pages-manifest');
 const assetFile=path.join(dist,imagePath);
 assert(assetFile.startsWith(dist+path.sep),'ASSET_PATH_OUTSIDE_QA_DIST');
 let assetCreated=false;
 try{
  await mkdir(path.dirname(assetFile),{recursive:true});
  await writeFile(assetFile,png,{flag:'wx'});assetCreated=true;
  await writeFile(registryFile,newRegistryBytes);
  await writeFile(manifestFile,finalManifestBytes);
  assert.equal(sha256(await readFile(assetFile)),imageSha,'WRITTEN_PNG_MISMATCH');
  assert.equal(sha256(await readFile(registryFile)),sha256(newRegistryBytes),'WRITTEN_REGISTRY_MISMATCH');
  assert.equal(sha256(await readFile(manifestFile)),sha256(finalManifestBytes),'WRITTEN_MANIFEST_MISMATCH');
  for(const [rel,digest] of manifestMap){
   if(/^content\/english\/year-[1-5]\/module-0[1-6]\/questions\.json$/.test(rel))
    assert.equal(sha256(await readFile(path.join(dist,rel))),digest,
     'QUESTION_CHANGED_DURING_PATCH:'+rel);
  }
  const changedQuestions=[...new Set(selected.flatMap(x=>x.questionIds))].sort();
  const applied={schemaVersion:'DUDUQ_PHASE2_BANANA_QA_PATCH_V1',
   status:'ISOLATED_QA_PATCH_REQUIRES_PEDAGOGICAL_AND_VISUAL_APPROVAL',
   sourceCommit:phase2.sourceCommit,sourceGitBlob:banana.sourceGitBlob,
   sourceSha256:imageSha,assetPath:imagePath,
   changedMediaIds:selected.length,changedQuestionCount:changedQuestions.length,
   changedQuestionIds:changedQuestions,bindings:selected,
   verifiedQuestionContracts:600,questionsChanged:0,answerKeysChanged:0,
   audioChanged:0,mechanicsChanged:0,productionDeployed:false,
   releaseApproved:false,pedagogicalQAApproved:false,
   registrySha256:sha256(newRegistryBytes),manifestSha256:sha256(finalManifestBytes)};
  await writeFile(path.join(root,'qa/results/phase2-banana-qa-patch.json'),
   JSON.stringify(applied,null,2)+'\n');
  console.log(JSON.stringify({status:applied.status,
   changedMediaIds:applied.changedMediaIds,changedQuestions:applied.changedQuestionCount,
   productionDeployed:false}));
 }catch(error){
  await writeFile(registryFile,regBytes);
  await writeFile(manifestFile,manifest);
  if(assetCreated)await rm(assetFile,{force:true});
  throw error;
 }
}


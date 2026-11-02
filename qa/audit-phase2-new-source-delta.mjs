#!/usr/bin/env node
/**
 * Phase 2 new-source delta: strictly read-only preflight.
 * Never writes to compiled media registry, question contracts or Cloudflare.
 * Explicit audit options are candidates, NOT visual or pedagogical approval.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

const [distArg='qa/dist-pages-food-candidate',sourceArg='assets-source-expansion']=process.argv.slice(2);
const dist=path.resolve(distArg),source=path.resolve(sourceArg);
const manifest=JSON.parse(await readFile('docs/qa/media-audit-20261029/phase2-new-source-delta-20261102.json','utf8'));
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
  failClosed(reasons,JSON.stringify(actualQuestions)===JSON.stringify(auditedQuestions),'SHARED_ID_HAS_UNAUDITED_QUESTION_USAGE');
  failClosed(reasons,occurrences.length>0,'NO_REAL_MEDIA_USAGE');
  failClosed(reasons,occurrences.every(o=>normalize(o.semanticTarget)===normalize(asset.conceptHint)),'MISSING_OR_CONFLICTING_LEAF_SEMANTICS');
  const reg=registryMap.get(binding.mediaId);
  failClosed(reasons,!!reg,'MEDIA_ID_MISSING_IN_REGISTRY');
  failClosed(reasons,reg?.temporary===true,'TEMPORARY_FLAG_NOT_TRUE');
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

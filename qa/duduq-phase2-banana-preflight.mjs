#!/usr/bin/env node
/**
 * Phase 2 continuation: verify deferred banana bindings against the exact
 * compiled 600-question graph. Read-only QA; no production or content edits.
 * Usage: node qa/duduq-phase2-banana-preflight.mjs [dist-pages] [assets-source]
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
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
   current.semantic==='banana'&&current.temporary!==false&&
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

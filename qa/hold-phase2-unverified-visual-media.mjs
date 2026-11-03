#!/usr/bin/env node
/**
 * Conservative fail-closed quarantine of five compiled source PNGs whose
 * actual visibility was NOT demonstrated in run #41547068602.
 *
 * Modifies ONLY a disposable QA dist copied from the archived 141-ID candidate.
 * Never touches contracts, Gold Masters, audio, answer keys or production.
 * All bindings sharing an unproven source PNG are restored as a group.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink,access,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const dist=path.resolve(process.argv[2]||'qa/dist-pages-food-candidate');
assert(dist.startsWith(path.resolve('qa')+path.sep),'ISOLATED_DIST_REQUIRED');
const sha=b=>createHash('sha256').update(b).digest('hex');
const registryRel='content/english/media/media-registry.json';
const manifestPath=path.join(dist,'.duduq-pages-manifest');
const oldManifest=await readFile(manifestPath,'utf8'), oldRegistryBytes=await readFile(path.join(dist,registryRel));
const registry=JSON.parse(oldRegistryBytes);
const before=JSON.parse(await readFile('qa/results/phase2-persisted-visual-hold.json','utf8'));
assert.equal(before.changedMediaIds,141,'BASE_CANDIDATE_CHANGED');
assert.equal(before.verifiedContracts,600,'BASE_CONTRACTS_INCOMPLETE');
assert.equal(before.registrySha256,sha(oldRegistryBytes),'BASE_REGISTRY_SHA_MISMATCH');
assert.equal(before.manifestSha256,sha(Buffer.from(oldManifest)),'BASE_MANIFEST_SHA_MISMATCH');
const unverified=[
 'content/english/assets/images/assets-duduq/auto-passaro-046b76b9215c.png',
 'content/english/assets/images/assets-duduq/auto-june-ac2d20efd8e2.png',
 'content/english/assets/images/assets-duduq/auto-bathroom-5e1f63875a01.png',
 'content/english/assets/images/assets-duduq/auto-bed-1170ca641000.png',
 'content/english/assets/images/assets-duduq/auto-bank-banco-4d651caa1be0.png'
];
const unverifiedSet=new Set(unverified);
const queueRows=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8')).queue;
const queue=new Map(queueRows.map(x=>[x.mediaId,x]));
const lines=oldManifest.trimEnd().split(/\r?\n/);
const integrity=new Map(lines.map(l=>{
 const i=l.lastIndexOf(' ');
 assert(i>0,'MANIFEST_LINE_INVALID');
 return [l.slice(0,i),l.slice(i+1)];
}));
assert.equal(integrity.get(registryRel),sha(oldRegistryBytes),'REGISTRY_OUT_OF_MANIFEST');
const questions=new Map(),usages=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 assert.equal(sha(bytes),integrity.get(rel),'QUESTION_HASH_CHANGED:'+rel);
 const data=JSON.parse(bytes);assert.equal(data.items.length,20,'NOT_20_PER_MODULE:'+rel);
 for(const q of data.items){
  assert(!questions.has(q.item_id),'DUPLICATE_QUESTION_ID');
  questions.set(q.item_id,q);collectQuestionMediaUsages(q,usages);
 }
}
assert.equal(questions.size,600);
const restorations=[],verifiedPaths=new Set(),changedQuestionIds=new Set();
for(const entry of registry.entries){
 if(!unverifiedSet.has(entry.urlOrPath))continue;
 const previous=entry.replacementAudit?.previousPath;
 const row=queue.get(entry.mediaId);
 assert.equal(entry.replacementAudit?.qaOnly,true,'PUBLISHED_BINDING_CANNOT_BE_REVERTED:'+entry.mediaId);
 assert(previous?.endsWith('.svg'),'PREVIOUS_PROVISIONAL_SVG_ABSENT:'+entry.mediaId);
 assert(row?.classification==='PROVISIONAL'&&row?.semanticConflict===false,'QUEUE_APPROVAL_MISMATCH:'+entry.mediaId);
 assert.equal(row.sourcePath,previous,'PREVIOUS_MEDIA_SOURCE_CHANGED:'+entry.mediaId);
 assert.equal(row.semantic,entry.semantic,'SEMANTIC_CHANGED:'+entry.mediaId);
 assert.equal(entry.kind,'image');
 const references=usages.get(entry.mediaId)||[];
 const qIds=[...new Set(references.map(r=>r.questionId))].sort();
 assert(qIds.length>0&&qIds.length===row.usage,'SHARED_USAGE_NOT_VERIFIED:'+entry.mediaId);
 assert(references.every(r=>r.semanticTarget?.trim().toLowerCase()===entry.semantic.trim().toLowerCase()),
  'SHARED_SEMANTIC_CHANGED:'+entry.mediaId);
 restorations.push({mediaId:entry.mediaId,concept:entry.semantic,sourcePath:entry.urlOrPath,previousPath:previous,questionIds:qIds});
 for(const id of qIds)changedQuestionIds.add(id);
 verifiedPaths.add(entry.urlOrPath);
 const oldStatus=row.integrationStatus||'IMAGE_REFINEMENT_PENDING';
 entry.urlOrPath=previous;
 entry.temporary=true;
 entry.integrationStatus=oldStatus;
 entry.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
 delete entry.provenance;delete entry.replacementAudit;delete entry.assets;delete entry.sha256;
}
assert.equal(verifiedPaths.size,unverifiedSet.size,'NOT_ALL_FIVE_FAILED_ASSETS_PRESENT');
assert(restorations.length>=5&&restorations.length<60,'UNEXPECTED_RESTORATION_COUNT');
for(const src of unverified){
 assert(!registry.entries.some(e=>e.urlOrPath===src||(e.assets||[]).some(a=>a.path===src)),
  'FAILED_MEDIA_STILL_REFERENCED:'+src);
 assert(integrity.has(src),'FAILED_MEDIA_NOT_IN_MANIFEST:'+src);
}
const newRegBytes=Buffer.from(JSON.stringify(registry,null,2)+'\n');
const newLines=lines.filter(l=>!unverifiedSet.has(l.slice(0,l.lastIndexOf(' '))))
 .map(l=>l.startsWith(registryRel+' ')?registryRel+' '+sha(newRegBytes):l);
const newManifest=Buffer.from(newLines.join('\n')+'\n');
const remaining=before.changedMediaIds-restorations.length;
assert(remaining>=80&&remaining<141,'UNEXPECTED_REMAINING_COUNT');
const result={
 schemaVersion:'DUDUQ_PHASE2_CONSERVATIVE_QA_VISUAL_HOLD_V1',
 status:'PERSISTENT_CANDIDATE_REQUIRES_FINAL_FUNCTIONAL_AND_PEDAGOGICAL_QA',
 baselineChangedMediaIds:before.changedMediaIds,
 newlyHeldBindings:restorations.length,remainingChangedMediaIds:remaining,
 heldPaths:unverified,heldBindings:restorations,
 changedQuestionsNeedingDirectedRegression:[...changedQuestionIds].sort(),
 affectedModules:[...new Set([...changedQuestionIds].map(id=>id.slice(0,5)))].sort(),
 verifiedContracts:600,sourceCommit:before.sourceCommit,
 registrySha256:sha(newRegBytes),manifestSha256:sha(newManifest),
 questionsChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
 productionDeployed:false,releaseApproved:false,pedagogicalQAApproved:false,
 originalVisualRun:41547068602
};
await writeFile(path.join(dist,registryRel),newRegBytes);
await writeFile(manifestPath,newManifest);
for(const src of unverified)await unlink(path.join(dist,src));
for(const line of newLines){
 const i=line.lastIndexOf(' '),name=line.slice(0,i),digest=line.slice(i+1);
 assert.equal(sha(await readFile(path.join(dist,name))),digest,'POST_QUARANTINE_HASH:'+name);
}
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-visual-quarantine.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,remainingChangedMediaIds:result.remainingChangedMediaIds,
 revertedMediaIds:result.newlyHeldBindings,restoredQuestions:result.changedQuestionsNeedingDirectedRegression.length,
 affectedModules:result.affectedModules,verifiedContracts:600,productionDeployed:false}));

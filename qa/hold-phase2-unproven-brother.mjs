#!/usr/bin/env node
/**
 * Persist real QA media while holding ONE shared brother ID that failed
 * intermittent real mobile visibility in run 41542079899 and 41546047110.
 * Uses the immutable integrated QA artifact, does not edit question contracts,
 * audio, mechanic Gold Masters or production. Fail-closed and reproducible.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=process.cwd();
const dist=path.resolve(process.argv[2]||'qa/dist-pages-food-candidate');
assert(dist.startsWith(path.join(root,'qa')+path.sep),'ONLY_ISOLATED_QA_ALLOWED');
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_FLAG_REQUIRED');
const sha=b=>createHash('sha256').update(b).digest('hex');
const regRel='content/english/media/media-registry.json';
const manifestPath=path.join(dist,'.duduq-pages-manifest');
const oldManifest=await readFile(manifestPath,'utf8');
const map=new Map();
for(const line of oldManifest.trimEnd().split(/\r?\n/)){
 const split=line.lastIndexOf(' ');
 assert(split>0,'MANIFEST_LINE_INVALID');
 const name=line.slice(0,split),digest=line.slice(split+1);
 assert(!map.has(name)&&/^[0-9a-f]{64}$/.test(digest),'MANIFEST_DUPLICATE_OR_HASH_INVALID');
 map.set(name,digest);
}
const oldRegBytes=await readFile(path.join(dist,regRel));
assert.equal(sha(oldRegBytes),map.get(regRel),'REGISTRY_NOT_MANIFEST_BOUND');
const oldReg=JSON.parse(oldRegBytes);
assert(oldReg.entries.length>1100,'REGISTRY_INCOMPLETE');
const reg=structuredClone(oldReg);
const id='IMG-V11-2B-0E55AE94BCF4CC3E';
const idx=reg.entries.findIndex(e=>e.mediaId===id);
assert(idx>=0,'BROTHER_ID_NOT_IN_COMPILED_REGISTRY');
const e=reg.entries[idx];
const imported='content/english/assets/images/assets-duduq/new-source-brother-397021c3cfab.png';
assert.equal(e.urlOrPath,imported,'VISUAL_HOLD_NO_LONGER_APPLIES');
assert.equal(e.semantic,'brother','UNEXPECTED_BROTHER_SEMANTIC');
assert.equal(e.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING','ALREADY_HOMOLOGATED');
assert.equal(e.replacementAudit?.qaOnly,true,'NOT_AN_ISOLATED_QA_REPLACEMENT');
const previous=e.replacementAudit.previousPath;
assert(previous?.endsWith('.svg'),'MISSING_PROVISIONAL_PATH');
const queue=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8')).queue;
const row=queue.find(q=>q.mediaId===id);
assert(row?.classification==='PROVISIONAL'&&row.semantic==='brother'&&
 row.sourcePath===previous&&row.semanticConflict===false,'QUEUE_SEMANTIC_CONFLICT');
const restored={...e,urlOrPath:previous,
 integrationStatus:'SOURCE_READY',humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
 temporary:true};
delete restored.sha256;
delete restored.assets;
delete restored.provenance;
delete restored.replacementAudit;
reg.entries[idx]=restored;
const newRegBytes=Buffer.from(JSON.stringify(reg,null,2)+'\n');
const pathStillReferenced=reg.entries.some(x=>x.urlOrPath===imported||
 (x.assets||[]).some(a=>a.path===imported));
const oldAssetPath=path.join(dist,imported);
const imageExists=await access(oldAssetPath).then(()=>true,()=>false);
assert(imageExists,'BROTHER_IMAGE_NOT_PRESENT_IN_CANDIDATE');
if(!pathStillReferenced)assert(map.has(imported),'ORPHAN_IMAGE_NOT_IN_MANIFEST');
const beforeQuestions=new Map();
let count=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 assert.equal(sha(bytes),map.get(rel),'COMPILED_CONTRACT_CHANGED:'+rel);
 const data=JSON.parse(bytes);
 assert.equal(data.items?.length,20,'CONTRACT_COUNT_CHANGED:'+rel);
 beforeQuestions.set(rel,sha(bytes));count+=data.items.length;
}
assert.equal(count,600,'NOT_600_CONTRACTS');
const sourceReportPath='qa/results/phase2-new-source-qa-patch.json';
const patch=JSON.parse(await readFile(sourceReportPath,'utf8'));
assert.equal(patch.verifiedContracts,600,'PATCH_NOT_600');
assert.equal(patch.status,'ISOLATED_MEDIA_UPDATED_VISUAL_AND_PEDAGOGICAL_QA_PENDING','PATCH_STATUS_CHANGED');
assert.equal(patch.bindings.filter(b=>b.mediaId===id).length,1,'BROTHER_NOT_EXACTLY_ONE_BINDING');
const remaining=patch.bindings.filter(b=>b.mediaId!==id);
assert.equal(patch.bindings.length-remaining.length,1,'UNEXPECTED_HOLD_SIZE');
patch.bindings=remaining;
patch.changedMediaIds=remaining.length;
patch.changedQuestionIds=[...new Set(remaining.flatMap(b=>b.questionIds))].sort();
patch.changedQuestionCount=patch.changedQuestionIds.length;
patch.changedModules=[...new Set(patch.changedQuestionIds.map(q=>q.slice(0,5)))].sort();
patch.images=patch.images.filter(a=>remaining.some(b=>b.sourcePath===a.assetPath));
patch.heldIds=[{mediaId:id,reason:'MOBILE_Y2M03_Q013_INTERMITTENT_NO_RENDER',
 evidenceRuns:[41542079899,41546047110],previousPath:previous}];
const newLines=[];
for(const [name,digest] of map){
 if(name===imported&&!pathStillReferenced)continue;
 newLines.push(name+' '+(name===regRel?sha(newRegBytes):digest));
}
const newManifest=Buffer.from(newLines.join('\n')+'\n');
const allPatches=['phase2-banana-qa-patch.json','phase2-food-qa-patch.json',
 'phase2-new-source-qa-patch.json','phase2-multilingual-source-qa-patch.json'];
const layers=await Promise.all(allPatches.map(async n=>n==='phase2-new-source-qa-patch.json'?patch:
 JSON.parse(await readFile('qa/results/'+n,'utf8'))));
const mediaIds=new Set(),questionIds=new Set();
for(const layer of layers){
 assert.equal(layer.questionsChanged,0,'LAYER_MUTATED_CURRICULUM');
 assert.equal(layer.answerKeysChanged,0,'LAYER_MUTATED_ANSWER_KEY');
 assert.equal(layer.audioChanged,0,'LAYER_MUTATED_AUDIO');
 assert.equal(layer.productionDeployed,false,'LAYER_PRODUCTION_MUTATED');
 for(const b of layer.bindings){assert(!mediaIds.has(b.mediaId),'DUPLICATE_ID_BETWEEN_LAYERS');mediaIds.add(b.mediaId);}
 for(const q of layer.changedQuestionIds)questionIds.add(q);
}
assert.equal(mediaIds.size,141,'EXPECTED_141_SAFE_IDS_NOT_FOUND');
const after={
 schemaVersion:'DUDUQ_PHASE2_PERSISTED_CANDIDATE_VISUAL_HOLD_V1',
 status:'CANDIDATE_REQUIRES_MULTILINGUAL_VISUAL_AND_INTERACTION_QA',
 verifiedContracts:600,changedMediaIds:mediaIds.size,
 changedQuestionCount:questionIds.size,changedModules:[...new Set([...questionIds].map(q=>q.slice(0,5)))].sort(),
 heldMediaIds:[id],newSourceMediaIds:patch.changedMediaIds,
 sourceCommit:'a51e0958d0c68941701b8373ccf30acf88aaf7d0',
 registrySha256:sha(newRegBytes),manifestSha256:sha(newManifest),
 questionsChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
 productionDeployed:false,releaseApproved:false,pedagogicalApproval:false,
 evidenceRuns:[41542079899,41546047110],
 reason:'A single shared brother media ID has a reproducible intermittently blank mobile occurrence; all other changes retained in QA'};
await writeFile(path.join(dist,regRel),newRegBytes);
await writeFile(manifestPath,newManifest);
if(!pathStillReferenced)await unlink(oldAssetPath);
await writeFile(sourceReportPath,JSON.stringify(patch,null,2)+'\n');
await writeFile('qa/results/phase2-persisted-visual-hold.json',JSON.stringify(after,null,2)+'\n');
assert.equal(sha(await readFile(path.join(dist,regRel))),after.registrySha256,'REGISTRY_WRITE_FAILED');
assert.equal(sha(await readFile(manifestPath)),after.manifestSha256,'MANIFEST_WRITE_FAILED');
for(const [rel,digest] of beforeQuestions)assert.equal(sha(await readFile(path.join(dist,rel))),digest,'QUESTION_CHANGED:'+rel);
for(const [file,digest] of new Map(newLines.map(l=>{const i=l.lastIndexOf(' ');return [l.slice(0,i),l.slice(i+1)];}))){
 assert.equal(sha(await readFile(path.join(dist,file))),digest,'FINAL_MANIFEST_ASSET_HASH:'+file);
}
assert.equal(reg.entries.length,oldReg.entries.length,'REGISTRY_ENTRY_COUNT_CHANGED');
assert.equal(reg.entries.find(x=>x.mediaId===id).urlOrPath,previous,'BROTHER_NOT_HELD');
console.log(JSON.stringify({status:after.status,mediaIds:after.changedMediaIds,
 questions:after.changedQuestionCount,modules:after.changedModules.length,
 imagesRemoved:imageExists&&!pathStillReferenced?1:0,held:after.heldMediaIds,contracts:after.verifiedContracts}));

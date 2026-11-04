#!/usr/bin/env node
/**
 * QA-only consolidation of two independently audited original-image deltas
 * on the exact published Orange baseline. No deployment, no QA auto-approval.
 *
 * Inputs:
 *  dist-pages/ (canonical Orange release tar extracted)
 *  qa/results/pets/{y1m06-fish-bird-delta-only.tar.gz,y1m06-fish-bird-evidence.json}
 *  qa/results/seasons/{y4m03-seasons-delta-only.tar.gz,y4m03-seasons-evidence.json}
 *  qa/work/pets/ and qa/work/seasons/: extracted overlay tar files
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.cwd();
if(process.env.DUDUQ_QA_ONLY!=='1')throw Error('MUST_RUN_IN_EXPLICIT_ISOLATED_QA_ONLY');
const dist=path.resolve('dist-pages'),registryRel='content/english/media/media-registry.json';
const baseRegistryBytes=await readFile(path.join(dist,registryRel));
const baseManifestBytes=await readFile(path.join(dist,'.duduq-pages-manifest'));
const baseRegistry=JSON.parse(baseRegistryBytes);
assert.equal(baseRegistry.entries.length,1166,'BASE_ORANGE_REGISTRY_NOT_1166');
const baseLines=baseManifestBytes.toString('utf8').trimEnd().split(/\r?\n/);
assert.equal(baseLines.length,2891,'BASE_ORANGE_FILE_COUNT_NOT_2891');
const manifest=new Map();
for(let i=0;i<baseLines.length;i++){
 const line=baseLines[i],breakAt=line.lastIndexOf(' ');
 assert(breakAt>0,'MANIFEST_SYNTAX');
 const file=line.slice(0,breakAt),hash=line.slice(breakAt+1);
 assert(!manifest.has(file)&&/^[a-f0-9]{64}$/.test(hash),'MANIFEST_DUPLICATE_OR_BAD_HASH:'+file);
 manifest.set(file,{i,hash});
}
assert.equal(manifest.get(registryRel)?.hash,sha(baseRegistryBytes),'BASE_REGISTRY_HASH_MISMATCH');
const baselineIndexes=new Map(baseRegistry.entries.map((e,i)=>[e.mediaId,i]));
assert.equal(baselineIndexes.size,baseRegistry.entries.length,'BASE_DUPLICATE_MEDIA_IDS');

const changeGroups=[
 {key:'pets',evidence:'y1m06-fish-bird-evidence.json',expectedIds:2,expectedAssets:2,
   manifestEntries:2893,expectedQuestions:['Y1M06-Q004']},
 {key:'seasons',evidence:'y4m03-seasons-evidence.json',expectedIds:8,expectedAssets:3,
   manifestEntries:2894,expectedQuestions:['Y4M03-Q006','Y4M03-Q011','Y4M03-Q014','Y4M03-Q016']}
];
const updated=structuredClone(baseRegistry),newFiles=new Map(),replaced=new Map();
const auditGroups=[];
for(const group of changeGroups){
 const dir=path.join('qa/work',group.key),e=JSON.parse(await readFile(path.join('qa/results',group.key,group.evidence),'utf8'));
 const mbytes=await readFile(path.join(dir,'.duduq-pages-manifest'));
 assert.equal(sha(mbytes),e.candidateManifestSha256,'DELTA_MANIFEST_HASH_MISMATCH:'+group.key);
 const mlines=mbytes.toString('utf8').trimEnd().split(/\r?\n/);
 assert.equal(mlines.length,group.manifestEntries,'DELTA_MANIFEST_LENGTH_MISMATCH:'+group.key);
 assert.equal(e.sourceAssetsCommit??e.sourceAssetsCommit,'a62c07c075a4a744f81dee2eea3a6b93108f9d08');
 assert.equal(e.changes.length,group.expectedIds,'DELTA_ID_COUNT_MISMATCH:'+group.key);
 const overlayBytes=await readFile(path.join(dir,registryRel));
 const ovReg=JSON.parse(overlayBytes);
 assert.equal(ovReg.entries.length,baseRegistry.entries.length,'DELTA_REGISTRY_LENGTH_CHANGED');
 const ovMap=new Map(ovReg.entries.map(x=>[x.mediaId,x]));
 assert.equal(ovMap.size,ovReg.entries.length,'DELTA_REGISTRY_DUPLICATE_IDS');
 const expected=new Set(e.changes.map(x=>x.mediaId));
 for(const [i,entry] of baseRegistry.entries.entries()){
   const alt=ovReg.entries[i];
   assert.equal(alt.mediaId,entry.mediaId,'DELTA_REGISTRY_ORDER_CHANGED');
   if(!expected.has(entry.mediaId))
     assert.equal(JSON.stringify(alt),JSON.stringify(entry),'DELTA_CHANGED_UNRELATED_MEDIA_ID:'+entry.mediaId);
 }
 const deltaAssets=new Set();
 for(const c of e.changes){
  assert(!replaced.has(c.mediaId),'MEDIA_ID_OVERLAY_CONFLICT:'+c.mediaId);
  const i=baselineIndexes.get(c.mediaId),old=baseRegistry.entries[i],next=ovMap.get(c.mediaId);
  assert(old&&next&&next.mediaId===old.mediaId,'MISSING_OR_RENAMED_MEDIA_ID:'+c.mediaId);
  assert(String(old.urlOrPath).endsWith('.svg'),'BASE_MEDIA_ALREADY_OFFICIAL:'+c.mediaId);
  assert(!['PEDAGOGICAL_QA_APPROVED','RELEASE_APPROVED'].includes(old.humanResolutionStatus));
  assert(old.semantic===c.semantic,'SEMANTIC_TARGET_CONFLICT:'+c.mediaId);
  assert(next.urlOrPath===c.assetPath&&next.sha256===c.sha256,'DELTA_SOURCE_IMAGE_BINDING_MISMATCH:'+c.mediaId);
  assert(next.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING','HUMAN_REVIEW_MUST_REMAIN_PENDING');
  assert(next.integrationStatus==='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING');
  assert(!manifest.has(c.assetPath),'IMAGE_ALREADY_IN_ORANGE_BASE:'+c.assetPath);
  const img=await readFile(path.join(dir,c.assetPath));
  assert(img.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'NOT_PNG');
  assert.equal(sha(img),c.sha256,'IMAGE_BYTES_CHANGED:'+c.assetPath);
  if(newFiles.has(c.assetPath))assert.equal(sha(newFiles.get(c.assetPath)),sha(img),'IMAGE_COLLISION');
  else newFiles.set(c.assetPath,img);
  replaced.set(c.mediaId,{previous:old,next,sourceGroup:group.key,sourcePath:c.assetPath,sha256:c.sha256});
  updated.entries[i]=next;
  deltaAssets.add(c.assetPath);
 }
 assert.equal(deltaAssets.size,group.expectedAssets,'IMAGE_SET_COUNT_MISMATCH:'+group.key);
 auditGroups.push({key:group.key,changedMediaIds:expected.size,uniquePNGs:deltaAssets.size,
  independentEvidenceManifest:e.candidateManifestSha256,
  questionIds:group.expectedQuestions});
}
assert.equal(replaced.size,10,'NEED_EXACTLY_TEN_DIFFERENT_MEDIA_IDS');
assert.equal(newFiles.size,5,'NEED_EXACTLY_FIVE_ORIGINAL_PNGS');
const questionHashes=[],questionIds=[];
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const id='Y'+y+'M'+String(m).padStart(2,'0');
 const f='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,f));
 assert.equal(sha(bytes),manifest.get(f)?.hash,'BASE_QUESTION_HASH_MISMATCH:'+id);
 const data=JSON.parse(bytes);assert.equal(data.moduleId,id);assert.equal(data.items.length,20);
 for(const q of data.items)questionIds.push(q.item_id);
 questionHashes.push([f,sha(bytes)]);
}
assert.equal(new Set(questionIds).size,600,'QUESTION_IDS_NOT_UNIQUE');
for(const [id,{next,sourceGroup}] of replaced){
 const uses=[];
 for(const [f] of questionHashes){
  const data=JSON.parse(await readFile(path.join(dist,f),'utf8'));
  for(const q of data.items){
   if(JSON.stringify(q).includes('"'+id+'"'))uses.push(q.item_id);
  }
 }
 assert(uses.length>0,'MEDIA_ID_NOT_REFERENCED:'+id);
 if(sourceGroup==='pets')assert(uses.every(q=>q==='Y1M06-Q004'),'PETS_UNEXPECTED_USE:'+id);
 else assert(uses.every(q=>/^Y4M03-Q(006|011|014|016)$/.test(q)),'SEASONS_UNEXPECTED_USE:'+id);
 assert(next.temporary===true,'TEMPORARY_IMAGE_NOT_EXPLICITLY_UNAPPROVED:'+id);
}
const nextRegBytes=Buffer.from(JSON.stringify(updated,null,2)+'\n');
const nextLines=[...baseLines];
nextLines[manifest.get(registryRel).i]=registryRel+' '+sha(nextRegBytes);
for(const f of [...newFiles.keys()].sort())nextLines.push(f+' '+sha(newFiles.get(f)));
assert.equal(nextLines.length,2896,'COMBINED_MANIFEST_EXPECTED_2896');
const nextManifestBytes=Buffer.from(nextLines.join('\n')+'\n');
await mkdir('qa/results/consolidated',{recursive:true});
for(const [file,bytes] of newFiles){
 const full=path.resolve(dist,file);assert(full.startsWith(dist+path.sep),'UNSAFE_IMAGE_PATH');
 await mkdir(path.dirname(full),{recursive:true});
 await writeFile(full,bytes,{flag:'wx'});
}
await writeFile(path.join(dist,registryRel),nextRegBytes);
await writeFile(path.join(dist,'.duduq-pages-manifest'),nextManifestBytes);
for(const [f,h] of questionHashes)assert.equal(sha(await readFile(path.join(dist,f))),h,'QUESTION_MODIFIED_BY_OVERLAY');
for(const [f,bytes]of newFiles)assert.equal(sha(await readFile(path.join(dist,f))),sha(bytes));
assert.equal(sha(await readFile(path.join(dist,registryRel))),sha(nextRegBytes));
assert.equal(sha(await readFile(path.join(dist,'.duduq-pages-manifest')),sha(nextManifestBytes));
const res={
 schemaVersion:'DUDUQ_PHASE2_CONSOLIDATED_5PNGS_10IDS_QA_V1',
 status:'ISOLATED_QA_CONSOLIDATED_NO_DEPLOY',
 baselineProductionDeployment:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 baselineProductionCommit:'acccef36c8a3029d98e5efef1923b0b6fdad36e1',
 sourceRepository:'augustoborgessousa93/Assets-DuduQ',
 sourceCommit:'a62c07c075a4a744f81dee2eea3a6b93108f9d08',
 baselineManifestEntries:2891,candidateManifestEntries:2896,
 candidateManifestSha256:sha(nextManifestBytes),
 mediaIdsModified:replaced.size,sourceImagesAdded:newFiles.size,
 sourceImageHashes:[...newFiles].map(([file,bytes])=>({file,sha256:sha(bytes)})),
 groups:auditGroups,questionContractsChecked:600,questionIdsUnique:600,
 questionsChanged:0,answersChanged:0,audioChanged:0,mechanicsChanged:0,
 runtimeChanged:0,goldMastersChanged:0,
 humanPedagogicalApproval:'PENDING',productionDeployed:false,rollbackDeployment:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 mediaBindings:[...replaced].map(([id,o])=>({mediaId:id,previous:o.previous.urlOrPath,next:o.next.urlOrPath,sourceGroup:o.sourceGroup}))
};
await writeFile('qa/results/consolidated/evidence.json',JSON.stringify(res,null,2)+'\n');
console.log(JSON.stringify({status:res.status,candidateManifestSha256:res.candidateManifestSha256,
 originalImages:res.sourceImagesAdded,mediaIds:res.mediaIdsModified,questionsChecked:res.questionContractsChecked,
 questionsChanged:0,productionDeployed:false}));

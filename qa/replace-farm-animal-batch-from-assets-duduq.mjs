#!/usr/bin/env node
/**
 * Direct source-hash-bound farm-animal batch, after independently validated pig.
 * Four source PNGs -> 13 provisional IDs -> 28 media usages -> nine questions.
 * Does not change any question, option, key, mechanic, approved image, or audio.
 * QA compiled artifact ONLY. Intended for a single final release candidate.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd(),dist=path.resolve(root,'dist-pages'),apply=process.argv.includes('--apply');
const sourceRoot=path.resolve(process.argv[2]||'assets-source');
if(apply&&process.env.DUDUQ_QA_ONLY!=='1')throw Error('FARM_ANIMAL_APPLY_ONLY_IN_EPHEMERAL_QA');
const sourceCommit='50fb80a89a5779d73f81c96aab35f6e86193d769';
const sourceRepository='augustoborgessousa93/Assets-DuduQ';
const animals=[
 {concept:'cow',file:'animal-cow-vaca.png',gitBlob:'e18d43b0011fb3b63f6addb47c5c85aec1a2a8db',ids:3,uses:7},
 {concept:'duck',file:'animal-duck-pato.png',gitBlob:'4db13d08b9c3813fd096dc768cd297b0ca34003b',ids:3,uses:6},
 {concept:'horse',file:'animal-horse-cavalo.png',gitBlob:'b70502487d880b0784443831916821cb458e2c53',ids:4,uses:8},
 {concept:'sheep',file:'animal-sheep-ovelha.png',gitBlob:'b9d8cce39afc874c3f12c2f1fd5e0adfb8960d90',ids:3,uses:7}
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const within=(base,full)=>full.startsWith(base+path.sep);
const sourceBytes=new Map();
for(const a of animals){
 const file=path.resolve(sourceRoot,'Imagens Ilustrativa',a.file);
 assert(within(sourceRoot,file),'UNSAFE_SOURCE_FILE');
 const bytes=await readFile(file),qc=inspectPng(bytes);
 assert.equal(blob(bytes),a.gitBlob,'SOURCE_ASSET_GIT_BLOB_MISMATCH:'+a.concept);
 assert(qc.valid&&qc.transparent&&bytes.readUInt32BE(16)>=1024&&
  bytes.readUInt32BE(20)>=1024&&bytes[24]===8&&bytes[25]===6,
  'SOURCE_IMAGE_NOT_HIGH_RES_TRANSPARENT_RGBA:'+a.concept);
 a.sha256=sha(bytes);a.width=bytes.readUInt32BE(16);a.height=bytes.readUInt32BE(20);
 a.assetPath='content/english/assets/images/assets-duduq/'+a.file.replace('.png','')+
  '-'+a.sha256.slice(0,12)+'.png';
 sourceBytes.set(a.concept,bytes);
}
const queue=JSON.parse(await readFile(path.join(root,'docs/qa/media-audit-20261029/replacement-queue.json'),'utf8'));
const audit=JSON.parse(await readFile(path.join(root,'docs/qa/media-audit-20261029/year-2.json'),'utf8'));
const y2m05=audit.modules.find(m=>m.moduleId==='Y2M05');
assert(y2m05?.questions?.length===20,'CURRICULUM_FARM_ANIMAL_AUDIT_NOT_20');
const memoryQ=y2m05.questions.find(q=>q.questionId==='Y2M05-Q004');
assert.equal(memoryQ?.mechanic,'memory-quest');
const regRel='content/english/media/media-registry.json',regFile=path.join(dist,regRel);
const originalRegistry=await readFile(regFile),reg=JSON.parse(originalRegistry);
assert(Array.isArray(reg.entries)&&reg.entries.length>=1100,'BAD_RUNTIME_REGISTRY');
const index=new Map();
reg.entries.forEach((v,i)=>{assert(!index.has(v.mediaId));index.set(v.mediaId,i)});
const manifestFile=path.join(dist,'.duduq-pages-manifest'),originalManifest=await readFile(manifestFile);
const manifestLines=originalManifest.toString('utf8').trimEnd().split(/\r?\n/);
const integrity=new Map();
manifestLines.forEach((line,i)=>{const k=line.lastIndexOf(' '),p=line.slice(0,k),digest=line.slice(k+1);
 assert(k>0&&/^[a-f0-9]{64}$/.test(digest)&&!integrity.has(p),'BAD_MANIFEST_ENTRY');
 integrity.set(p,{sha:digest,i});
});
assert.equal(integrity.get(regRel)?.sha,sha(originalRegistry),'REGISTRY_NOT_HASH_BOUND');
const usages=new Map(),qHashes={};let qCount=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),prefix='Y'+y+'M'+mm;
 const rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const content=await readFile(path.join(dist,rel)),j=JSON.parse(content);
 assert.equal(integrity.get(rel)?.sha,sha(content),'QUESTION_HASH_CHANGED:'+prefix);
 assert.equal(j.moduleId,prefix);assert.equal(j.items?.length,20);
 qHashes[rel]=sha(content);
 for(const q of j.items){assert(q.item_id?.startsWith(prefix+'-'));collectQuestionMediaUsages(q,usages);qCount++}
}
assert.equal(qCount,600);
const bindings=[],changedQuestionIds=new Set(),skipped=[];
for(const a of animals){
 const rows=queue.queue.filter(q=>q.semantic===a.concept&&q.kind==='image'&&
  q.classification==='PROVISIONAL'&&!q.semanticConflict);
 assert.equal(rows.length,a.ids,'QUEUE_EXACT_ID_COUNT_CHANGED:'+a.concept);
 assert.equal(rows.reduce((n,r)=>n+r.usage,0),a.uses,'QUEUE_USAGE_COUNT_CHANGED:'+a.concept);
 assert(!integrity.has(a.assetPath),'ASSET_ALREADY_COMPILED:'+a.concept);
 for(const row of rows){
  assert(/^IMG-V11-2B-[A-Z0-9]+$/.test(row.mediaId),'UNEXPECTED_ASSET_ID');
  const matches=usages.get(row.mediaId)||[],questionIds=[...new Set(matches.map(x=>x.questionId))].sort();
  assert.deepEqual(questionIds,[...row.exampleQuestions].sort(),'MEDIA_ID_USED_OUTSIDE_EXACT_AUDIT:'+row.mediaId);
  // The 600-question walker records nested references (e.g. Target Shooter
  // question + option + target + mediaBindings) independently. Queue usage is
  // the number of DISTINCT questions, not the number of nested DOM bindings.
  // Still inspect every occurrence below for semantic conflicts.
  assert.equal(questionIds.length,row.usage,'MEDIA_ID_DISTINCT_QUESTION_USAGE_CHANGED:'+row.mediaId);
  assert(questionIds.every(x=>x.startsWith('Y2M05-Q')),'PIG_MODULE_SCOPE_VIOLATION:'+row.mediaId);
  const current=reg.entries[index.get(row.mediaId)];
  assert(current?.kind==='image'&&current.urlOrPath?.endsWith('.svg')&&
   current.semantic===a.concept,'REGISTRY_NOT_EXACT_SOURCE_SEMANTIC:'+row.mediaId);
  assert(current.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED'&&
   current.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH',
   'IMMUTABLE_OFFICIAL_IMAGE_PROTECTED:'+row.mediaId);
  const implicit=matches.filter(x=>!isExactPedagogicalConcept(a.concept,x.semanticTarget));
  for(const occurrence of implicit){
   assert(!String(occurrence.semanticTarget||'').trim(),'SEMANTIC_CONFLICT:'+row.mediaId);
   const q=y2m05.questions.find(q=>q.questionId===occurrence.questionId);
   assert(q?.mediaIds?.includes(row.mediaId),
     'UNVERIFIED_NESTED_MEDIA_USAGE:'+row.mediaId+':'+occurrence.questionId);
   // The audited option is authoritative for Target Shooter and explicit
   // Bubble Pop choices. The same ID may also appear in top-level lists with
   // no leaf semantic; require a matching explicit option, never guess.
   const explicit=(q.options||[]).filter(o=>o.mediaId===row.mediaId);
   if(explicit.length){
    assert(explicit.every(o=>isExactPedagogicalConcept(a.concept,o.semanticTarget)),
      'AUDITED_OPTION_SEMANTIC_CONFLICT:'+row.mediaId);
   }else{
    assert(['memory-quest','drag-drop-multimedia','matching','bubble-pop'].includes(q.mechanic),
     'IMPLICIT_SEMANTIC_NOT_SUPPORTED_FOR_MECHANIC:'+row.mediaId+':'+q.mechanic);
    if(q.mechanic==='memory-quest')
     assert(memoryQ.mediaIds.includes(row.mediaId)&&
       new RegExp('(?:^|\\W)'+a.concept+'(?:\\W|$)','i').test(memoryQ.learningTarget),
       'MEMORY_CONCEPT_NOT_BOUND_TO_LEARNING_TARGET:'+row.mediaId);
   }
   if(!skipped.some(x=>x.id===row.mediaId&&x.questionId===occurrence.questionId))
    skipped.push({id:row.mediaId,questionId:occurrence.questionId,
     reason:'NESTED_SEMANTIC_ABSENT_REQUIRES_PEDAGOGICAL_REVIEW',
     supportingEvidence:explicit.length?'Same question audited option':
       'Exact source registry and audited curriculum mediaIds'});
  }
  bindings.push({concept:a.concept,mediaId:row.mediaId,questionIds,
   former:current.urlOrPath,assetPath:a.assetPath,sha256:a.sha256,
   implicitSemanticOccurrences:implicit.length});
  questionIds.forEach(x=>changedQuestionIds.add(x));
 }
}
assert.equal(bindings.length,13);
assert.equal(bindings.reduce((n,b)=>n+b.questionIds.length,0),28);
assert.equal(changedQuestionIds.size,9);
const report={
 schemaVersion:'DUDUQ_FARM_ANIMAL_SOURCE_REUSE_BATCH_V1',
 status:apply?'APPLYING_EPHEMERAL_QA':'PREFLIGHT_PASS',
 sourceRepository,sourceCommit,
 sourceUniquePngs:4,changedMediaIds:13,
 changedQuestionMediaUsages:28,affectedQuestions:9,
 verifiedQuestionContracts:600,
 images:animals.map(a=>({concept:a.concept,sourceFile:a.file,gitBlob:a.gitBlob,
  sha256:a.sha256,width:a.width,height:a.height,assetPath:a.assetPath,mediaIds:a.ids,usages:a.uses})),
 bindings,semanticManualReviewRequired:skipped,
 questionsChanged:0,answerKeysChanged:0,
 pedagogicalQAApproved:false,releaseApproved:false,productionDeployed:false
};
if(!apply){console.log(JSON.stringify(report));process.exit(0)}
const next=structuredClone(reg);
for(const b of bindings){
 const i=index.get(b.mediaId),prior=next.entries[i],asset=animals.find(a=>a.concept===b.concept);
 next.entries[i]={...prior,status:'APPROVED',kind:'image',temporary:true,
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  urlOrPath:asset.assetPath,sha256:asset.sha256,
  assets:[{path:asset.assetPath,sha256:asset.sha256}],altText:b.concept,
  provenance:{provider:'Assets-DuduQ repository',sourceRepository,sourceCommit,
   sourcePath:'Imagens Ilustrativa/'+asset.file,sourceGitBlob:asset.gitBlob,
   nativeWidth:asset.width,nativeHeight:asset.height,sha256:asset.sha256},
  replacementAudit:{source:'600 question graph+reviewed audit queue',
   verifiedQuestionIds:b.questionIds,previousPath:prior.urlOrPath,qaOnly:true}};
}
const bytes=Buffer.from(JSON.stringify(next,null,2)+'\n'),lines=[...manifestLines];
lines[integrity.get(regRel).i]=regRel+' '+sha(bytes);
for(const a of animals)lines.push(a.assetPath+' '+a.sha256);
const manifestBytes=Buffer.from(lines.join('\n')+'\n'),created=[];
try{
 for(const a of animals){
  const target=path.join(dist,a.assetPath);assert(within(dist,target));
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,sourceBytes.get(a.concept),{flag:'wx'});created.push(target);
 }
 await writeFile(regFile,bytes);
 await writeFile(manifestFile,manifestBytes);
 assert.equal(sha(await readFile(regFile)),sha(bytes));
 assert.equal(sha(await readFile(manifestFile)),sha(manifestBytes));
 for(const a of animals)assert.equal(sha(await readFile(path.join(dist,a.assetPath))),a.sha256);
 for(const [rel,expected]of Object.entries(qHashes))
  assert.equal(sha(await readFile(path.join(dist,rel))),expected,'QUESTION_CHANGED:'+rel);
 const result={...report,status:'FOUR_FARM_ANIMAL_PNGS_APPLIED_EPHEMERAL_QA',
  finalManifestSha256:sha(manifestBytes)};
 await mkdir(path.join(root,'qa/results'),{recursive:true});
 await writeFile(path.join(root,'qa/results/farm-animal-source-batch.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,sourceUniquePngs:4,
  changedMediaIds:13,questionMediaUsages:28,questions:9,productionDeployed:false}));
}catch(error){
 await writeFile(regFile,originalRegistry);
 await writeFile(manifestFile,originalManifest);
 for(const file of created)await rm(file,{force:true});
 throw error;
}

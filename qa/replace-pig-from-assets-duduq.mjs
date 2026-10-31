#!/usr/bin/env node
/**
 * One-image -> three-media-ID -> seven-question EXACT semantic replacement.
 * Runs on an immutable V26 compiled QA build, never on production.
 * Source: Assets-DuduQ@50fb80a.../Imagens Ilustrativa/animal-pig-porco.png
 * All 600 question contracts and answer keys remain byte-for-byte unchanged.
 *
 * Usage:
 *   node qa/replace-pig-from-assets-duduq.mjs assets-source [--apply]
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages');
const qaOnly=process.env.DUDUQ_QA_ONLY==='1',apply=process.argv.includes('--apply');
if(apply&&!qaOnly)throw Error('PIG_IMPORT_REQUIRES_EPHEMERAL_QA_ONLY');
const sourceRoot=path.resolve(process.argv[2]||'assets-source');
const sourceCommit='50fb80a89a5779d73f81c96aab35f6e86193d769';
const sourcePath='Imagens Ilustrativa/animal-pig-porco.png';
const sourceGitBlob='35a0445417a58d901d8e4661254889905d7b7c8b';
const targets={
 'IMG-V11-2B-5F33235E8503D0CB':['Y2M05-Q002','Y2M05-Q016','Y2M05-Q020'],
 'IMG-V11-2B-6041412CE84A73C4':['Y2M05-Q001','Y2M05-Q011','Y2M05-Q017'],
 'IMG-V11-2B-F61F39A60C6F1C46':['Y2M05-Q004']
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const safe=(base,target)=>target.startsWith(base+path.sep);
const pngFile=path.resolve(sourceRoot,sourcePath);
if(!safe(sourceRoot,pngFile))throw Error('SOURCE_PATH_ESCAPE');
const bytes=await readFile(pngFile),actualHash=hash(bytes);
assert.equal(blob(bytes),sourceGitBlob,'SOURCE_PIG_BLOB_SHA_MISMATCH');
const qc=inspectPng(bytes);
assert(qc.valid&&qc.transparent,'SOURCE_PIG_PNG_ALPHA_OR_CRC_INVALID:'+JSON.stringify(qc));
const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
assert(w>=1024&&h>=1024&&bytes[24]===8&&bytes[25]===6,
 'SOURCE_PIG_NOT_NATIVE_HIGH_RES_RGBA');
const queue=JSON.parse(await readFile(path.join(root,'docs/qa/media-audit-20261029/replacement-queue.json'),'utf8'));
const queueIndex=new Map(queue.queue.map(q=>[q.mediaId,q]));
for(const [id,questionIds] of Object.entries(targets)){
 const record=queueIndex.get(id);
 assert(record&&record.classification==='PROVISIONAL'&&record.semantic==='pig'&&
   record.semanticConflict===false&&record.kind==='image',
   'PIG_QUEUE_CLASSIFICATION_MISMATCH:'+id);
 assert.deepEqual([...record.exampleQuestions].sort(),[...questionIds].sort(),
   'PIG_QUEUE_USAGE_SCOPE_CHANGED:'+id);
}
const registryRel='content/english/media/media-registry.json';
const registryPath=path.join(dist,registryRel);
const integrityPath=path.join(dist,'.duduq-pages-manifest');
const originalRegistry=await readFile(registryPath);
const originalIntegrity=await readFile(integrityPath);
const registry=JSON.parse(originalRegistry),lines=originalIntegrity.toString('utf8').trimEnd().split(/\r?\n/);
assert(Array.isArray(registry.entries)&&registry.entries.length>1000,'INVALID_COMPILED_REGISTRY');
const indexed=new Map(),integrity=new Map();
registry.entries.forEach((e,i)=>{
 assert(e.mediaId&&!indexed.has(e.mediaId),'DUPLICATE_MEDIA_ID');
 indexed.set(e.mediaId,i);
});
lines.forEach((line,i)=>{
 const p=line.lastIndexOf(' '),rel=line.slice(0,p),digest=line.slice(p+1);
 assert(p>0&&!integrity.has(rel)&&/^[a-f0-9]{64}$/.test(digest),'BAD_MANIFEST');
 integrity.set(rel,{sha:digest,index:i});
});
assert.equal(integrity.get(registryRel)?.sha,hash(originalRegistry),'REGISTRY_NOT_HASH_BOUND');
const usages=new Map(),originalQuestionHashes={};
let qcount=0;
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const mm=String(module).padStart(2,'0'),moduleId='Y'+year+'M'+mm;
 const rel='content/english/year-'+year+'/module-'+mm+'/questions.json';
 const file=await readFile(path.join(dist,rel)),j=JSON.parse(file);
 assert.equal(j.moduleId,moduleId);
 assert.equal(j.items?.length,20,'MISSING_20_QUESTIONS:'+moduleId);
 assert.equal(integrity.get(rel)?.sha,hash(file),'QUESTION_MANIFEST_MISMATCH:'+moduleId);
 originalQuestionHashes[rel]=hash(file);
 for(const q of j.items){assert(q.item_id.startsWith(moduleId+'-'));collectQuestionMediaUsages(q,usages);qcount++;}
}
assert.equal(qcount,600);
const pigIds=Object.keys(targets),allQuestions=new Set();
for(const id of pigIds){
 const rows=usages.get(id)||[],names=[...new Set(rows.map(x=>x.questionId))];
 assert.deepEqual(names.sort(),[...targets[id]].sort(),'PIG_REAL_600_CONTRACT_USAGE_MISMATCH:'+id);
 assert(rows.every(x=>isExactPedagogicalConcept('pig',x.semanticTarget)),
  'PIG_SEMANTIC_CONFLICT_OR_MISSING_TARGET:'+id);
 for(const q of names)allQuestions.add(q);
 const current=registry.entries[indexed.get(id)];
 assert(current?.kind==='image','MISSING_IMAGE_REGISTRY:'+id);
 assert(current.urlOrPath?.endsWith('.svg'),'PIG_NOT_SOURCE_SVG_OR_ALREADY_REPLACED:'+id);
 assert(!['OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH','RELEASE_APPROVED'].includes(current.integrationStatus) &&
   current.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED',
   'PIG_EXISTING_OFFICIAL_MEDIA_PROTECTED:'+id);
}
assert.equal(allQuestions.size,7,'EXPECTED_SEVEN_PIG_AFFECTED_QUESTIONS');
const rel='content/english/assets/images/assets-duduq/animal-pig-porco-'+actualHash.slice(0,12)+'.png';
assert(!integrity.has(rel),'PIG_MEDIA_PATH_ALREADY_IN_BUILD');
const out=path.join(dist,rel);
const plan={schemaVersion:'DUDUQ_EXACT_PIG_REUSE_V1',
 status:apply?'PREPARING_QA_ONLY':'PREFLIGHT_PASS',
 sourceCommit,sourcePath,sourceGitBlob,sha256:actualHash,width:w,height:h,
 sourceUniquePngs:1,changedMediaIds:pigIds,affectedQuestionIds:[...allQuestions].sort(),
 affectedQuestions:7,verifiedQuestionContracts:600,mediaBindings:3,
 semantics:'PIG_EXACT_NO_CONFLICT',answerKeysChanged:0,questionsChanged:0,
 goldMastersModified:false,humanPedagogicalApproval:false,
 releaseApproved:false,productionDeployed:false};
if(!apply){console.log(JSON.stringify(plan));process.exit(0);}

const next=structuredClone(registry);
for(const id of pigIds){
 const i=indexed.get(id),prior=next.entries[i];
 next.entries[i]={...prior,status:'APPROVED',kind:'image',temporary:true,
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  urlOrPath:rel,sha256:actualHash,
  assets:[{path:rel,sha256:actualHash}],
  altText:'pig',provenance:{provider:'Assets-DuduQ repository',sourceRepository:'augustoborgessousa93/Assets-DuduQ',
   sourceCommit,sourcePath,sourceGitBlob,nativeWidth:w,nativeHeight:h,sha256:actualHash},
  replacementAudit:{source:'exact semantic + 600-question graph',verifiedQuestionIds:targets[id],
   previousPath:prior.urlOrPath,qaOnly:true}};
}
const newReg=Buffer.from(JSON.stringify(next,null,2)+'\n');
const newLines=[...lines];
newLines[integrity.get(registryRel).index]=registryRel+' '+hash(newReg);
newLines.push(rel+' '+actualHash);
const newManifest=Buffer.from(newLines.join('\n')+'\n');
let created=false;
try{
 await mkdir(path.dirname(out),{recursive:true});
 await writeFile(out,bytes,{flag:'wx'});created=true;
 await writeFile(registryPath,newReg);
 await writeFile(integrityPath,newManifest);
 assert.equal(hash(await readFile(out)),actualHash);
 assert.equal(hash(await readFile(registryPath)),hash(newReg));
 assert.equal(hash(await readFile(integrityPath)),hash(newManifest));
 for(const [relative,expected] of Object.entries(originalQuestionHashes))
  assert.equal(hash(await readFile(path.join(dist,relative))),expected,'QUESTION_CHANGED:'+relative);
 const evidence={...plan,status:'EXACT_PIG_MEDIA_PATCHED_EPHEMERAL_QA',artifactManifestSha256:hash(newManifest),
  assetPath:rel,sourceFileBytes:(await stat(out)).size};
 const reportPath=path.join(root,'qa/results/pig-source-direct-reuse.json');
 await mkdir(path.dirname(reportPath),{recursive:true});
 await writeFile(reportPath,JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence));
}catch(err){
 await writeFile(registryPath,originalRegistry);
 await writeFile(integrityPath,originalIntegrity);
 if(created)await import('node:fs/promises').then(fs=>fs.rm(out,{force:true}));
 throw err;
}

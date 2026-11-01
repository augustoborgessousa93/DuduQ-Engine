#!/usr/bin/env node
/**
 * Reuse EXACT bilingual source PNGs in a compiled QA artifact only.
 * Does not edit questions, keys, mechanics, Gold Masters or production.
 * Existing pedagogically-approved media are immutable.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd(),dist=path.resolve(root,'dist-pages'),apply=process.argv.includes('--apply');
if(apply&&process.env.DUDUQ_QA_ONLY!=='1')throw Error('VOCAB_REUSE_QA_ONLY');
const sourceRoot=path.resolve(process.argv[2]||'assets-source');
const sourceCommit='50fb80a89a5779d73f81c96aab35f6e86193d769';
const sources=[
 ['one','number-01-one-um.png','69797d76b6691c5a041a1eb58a70d6b198090893'],
 ['two','number-02-two-dois.png','6cd661861d3c66e2e22826fd81040d97336d4a8e'],
 ['three','number-03-three-tres.png','35df6fa3cf3af45a92a6c4e47a1e86fd3548abd4'],
 ['four','number-04-four-quatro.png','c7d0f655038e7d33ea489a7a93209b9e757d4ed3'],
 ['five','number-05-five-cinco.png','e09e3cc58271c667ba1c3f93eb03e76e22495ce3'],
 ['six','number-06-six-seis.png','89e5d7c65b53c8b0afe102e42819cdff010c68b2'],
 ['seven','number-07-seven-sete.png','5be78da55a68ba352537e08838442cf01a13e8d9'],
 ['eight','number-08-eight-oito.png','604dc435bc2c26abaa71a715406fd8dcca79fcc5'],
 ['nine','number-09-nine-nove.png','5b5effc4d24e4c95d571a795608b91d1945ca92'],
 ['ten','number-10-ten-dez.png','734081fc405be227f02f6b0b4e95d8f4af2f86ec'],
 ['red','color-red-vermelho.png','9c5fd365ad6fee630f695d2c403e6a02ba5fb4d6'],
 ['blue','color-blue-azul.png','d1c5c6980118941b1f43131214a6dcc7d7e39761'],
 ['yellow','color-yellow-amarelo.png','d641e8582975e926fe49ea04c32f4817114f53f0'],
 ['green','color-green-verde.png','425907d66db6bd1e8fefb6846f3f17e9a86eece1'],
 ['dog','pet-dog-cachorro.png','b2c39c9abd7e113e093151a1780cde0fc79a5d3c'],
 ['cat','pet-cat-gato.png','a78d1430c8a62a83b52726312c10f494d6491155']
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const inRoot=(base,p)=>p.startsWith(base+path.sep);
const queue=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8'));
const audit=new Map(queue.queue.map(q=>[q.mediaId,q]));
const regRel='content/english/media/media-registry.json',regFile=path.join(dist,regRel);
const oldReg=await readFile(regFile),reg=JSON.parse(oldReg);
const index=new Map(reg.entries.map((v,i)=>[v.mediaId,i]));
assert.equal(index.size,reg.entries.length,'DUPLICATE_MEDIA_ID');
const manifestPath=path.join(dist,'.duduq-pages-manifest');
const oldManifest=await readFile(manifestPath);
const lines=oldManifest.toString('utf8').trimEnd().split(/\r?\n/),integrity=new Map();
for(let i=0;i<lines.length;i++){
 const line=lines[i],pos=line.lastIndexOf(' '),rel=line.slice(0,pos),digest=line.slice(pos+1);
 assert(pos>0&&/^[a-f0-9]{64}$/.test(digest)&&!integrity.has(rel),'BAD_MANIFEST');
 integrity.set(rel,{digest,i});
}
assert.equal(integrity.get(regRel)?.digest,hash(oldReg));
const usages=new Map(),questionHashes={};let count=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mod='Y'+y+'M'+String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,rel)),data=JSON.parse(bytes);
 assert.equal(integrity.get(rel)?.digest,hash(bytes),'QUESTION_HASH_MISMATCH:'+mod);
 assert.equal(data.moduleId,mod);assert.equal(data.items.length,20);
 questionHashes[rel]=hash(bytes);
 for(const q of data.items){collectQuestionMediaUsages(q,usages);count++;}
}
assert.equal(count,600);
const bytesByConcept=new Map(),candidates=[],skipped=[],images=[];
for(const [concept,file,expectedBlob]of sources){
 const full=path.resolve(sourceRoot,'Imagens Ilustrativa',file);
 assert(inRoot(sourceRoot,full),'UNSAFE_SOURCE_PATH');
 const bytes=await readFile(full),qc=inspectPng(bytes),digest=hash(bytes);
 assert.equal(blob(bytes),expectedBlob,'SOURCE_BLOB_CHANGED:'+concept);
 assert(qc.valid&&qc.transparent&&bytes.readUInt32BE(16)>=1024&&bytes.readUInt32BE(20)>=1024&&bytes[24]===8&&bytes[25]===6,'NOT_HIGH_RES_TRANSPARENT_PNG:'+concept);
 const assetPath='content/english/assets/images/assets-duduq/'+file.replace(/\.png$/i,'')+'-'+digest.slice(0,12)+'.png';
 assert(!integrity.has(assetPath),'EXISTING_SOURCE_PATH_REQUIRES_EXPLICIT_RECONCILIATION:'+concept);
 const image={concept,file,sourceGitBlob:expectedBlob,sha256:digest,assetPath,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bindings:0};
 images.push(image);bytesByConcept.set(concept,bytes);
 for(const row of queue.queue.filter(q=>q.semantic===concept&&q.kind==='image')){
  const previous=reg.entries[index.get(row.mediaId)];
  if(row.classification!=='PROVISIONAL'||row.semanticConflict||row.temporary!==true||
    previous?.humanResolutionStatus==='PEDAGOGICAL_QA_APPROVED'||
    previous?.integrationStatus==='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH'||
    !previous?.urlOrPath?.endsWith('.svg')){
   skipped.push({id:row.mediaId,concept,reason:'NOT_SAFE_UNAPPROVED_SOURCE_SVG'});continue;
  }
  if(!isExactPedagogicalConcept(concept,previous.semantic)){
   skipped.push({id:row.mediaId,concept,reason:'REGISTRY_SEMANTIC_NOT_EXACT'});continue;
  }
  const occurrences=usages.get(row.mediaId)||[];
  const qs=[...new Set(occurrences.map(x=>x.questionId))].sort();
  if(!qs.length||qs.length!==row.usage||JSON.stringify(qs)!==JSON.stringify([...row.exampleQuestions].sort())){
   skipped.push({id:row.mediaId,concept,reason:'REAL_QUESTION_USAGE_DIFFERS_FROM_AUDIT'});continue;
  }
  // Reject any explicit, contradictory concept, even in nested option bindings.
  if(occurrences.some(x=>x.semanticTarget&&!isExactPedagogicalConcept(concept,x.semanticTarget))){
   skipped.push({id:row.mediaId,concept,reason:'EXPLICIT_NESTED_SEMANTIC_CONFLICT'});continue;
  }
  // Missing leaf-level semantics never imply pedagogical approval. Require a matching
  // audited, actual question mediaId and preserve the need for manual review.
  const missing=occurrences.filter(x=>!x.semanticTarget);
  candidates.push({concept,mediaId:row.mediaId,questionIds:qs,sourcePath:assetPath,sha256:digest,
   missingSemanticOccurrences:missing.length,previousPath:previous.urlOrPath});
  image.bindings++;
 }
}
assert(candidates.length>0,'NO_SAFE_VOCABULARY_REUSE_FOUND');
const used=images.filter(x=>x.bindings>0),changedQuestions=[...new Set(candidates.flatMap(x=>x.questionIds))].sort();
const report={schemaVersion:'DUDUQ_EXACT_VOCAB_SOURCE_REUSE_V1',
 status:apply?'APPLYING_EPHEMERAL_QA':'PREFLIGHT_PASS',
 sourceRepository:'augustoborgessousa93/Assets-DuduQ',sourceCommit,
 usedUniquePngs:used.length,changedMediaIds:candidates.length,affectedQuestions:changedQuestions.length,
 affectedQuestionIds:changedQuestions,verifiedContracts:600,images:used,bindings:candidates,skipped,
 missingSemanticReviewRequired:candidates.filter(x=>x.missingSemanticOccurrences>0).map(x=>({mediaId:x.mediaId,concept:x.concept,questionIds:x.questionIds})),
 questionsChanged:0,answerKeysChanged:0,mechanicsChanged:0,
 humanPedagogicalApproval:false,releaseApproved:false,productionDeployed:false};
if(!apply){console.log(JSON.stringify({status:report.status,uniquePNGs:used.length,mediaIds:candidates.length,questions:changedQuestions.length,skipped:skipped.length}));process.exit(0)}
const next=structuredClone(reg);
for(const b of candidates){
 const i=index.get(b.mediaId),prior=next.entries[i],img=used.find(x=>x.concept===b.concept);
 next.entries[i]={...prior,status:'APPROVED',temporary:true,kind:'image',
 integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
 humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',urlOrPath:b.sourcePath,sha256:b.sha256,
 assets:[{path:b.sourcePath,sha256:b.sha256}],altText:b.concept,
 provenance:{provider:'Assets-DuduQ repository',sourceRepository:report.sourceRepository,
 sourceCommit,sourcePath:'Imagens Ilustrativa/'+img.file,sourceGitBlob:img.sourceGitBlob,
 nativeWidth:img.width,nativeHeight:img.height,sha256:b.sha256},
 replacementAudit:{source:'600 immutable question graph + audited queue',qaOnly:true,
 verifiedQuestionIds:b.questionIds,previousPath:b.previousPath,
 missingLeafSemanticsRequireReview:b.missingSemanticOccurrences>0}};
}
const regBytes=Buffer.from(JSON.stringify(next,null,2)+'\n'),nextLines=[...lines],created=[];
nextLines[integrity.get(regRel).i]=regRel+' '+hash(regBytes);
for(const img of used)nextLines.push(img.assetPath+' '+img.sha256);
const manifestBytes=Buffer.from(nextLines.join('\n')+'\n');
try{
 for(const img of used){
  const out=path.resolve(dist,img.assetPath);assert(inRoot(dist,out));
  await mkdir(path.dirname(out),{recursive:true});
  await writeFile(out,bytesByConcept.get(img.concept),{flag:'wx'});created.push(out);
 }
 await writeFile(regFile,regBytes);await writeFile(manifestPath,manifestBytes);
 assert.equal(hash(await readFile(regFile)),hash(regBytes));
 assert.equal(hash(await readFile(manifestPath)),hash(manifestBytes));
 for(const [relative,digest]of Object.entries(questionHashes))
  assert.equal(hash(await readFile(path.join(dist,relative))),digest,'QUESTION_CHANGED:'+relative);
 for(const img of used)assert.equal(hash(await readFile(path.join(dist,img.assetPath))),img.sha256);
 await mkdir('qa/results',{recursive:true});
 report.status='EXACT_VOCAB_SOURCE_REUSED_EPHEMERAL_QA';
 report.finalManifestSha256=hash(manifestBytes);
 await writeFile('qa/results/vocabulary-source-batch.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,uniquePNGs:used.length,mediaIds:candidates.length,
  questions:changedQuestions.length,productionDeployed:false,releaseApproved:false}));
}catch(e){
 await writeFile(regFile,oldReg);await writeFile(manifestPath,oldManifest);
 for(const out of created)await rm(out,{force:true});
 throw e;
}

#!/usr/bin/env node
/**
 * Phase 2 food media: strict compiled-graph audit and optional isolated QA patch.
 * Never modifies dist-pages, source curriculum, answer keys, audio or production.
 * node qa/duduq-phase2-food-qa.mjs qa/dist-pages-food-candidate assets-source [--apply]
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';

const dist=path.resolve(process.argv[2]||'qa/dist-pages-food-candidate');
const sourceRoot=path.resolve(process.argv[3]||'assets-source');
const apply=process.argv.includes('--apply');
const root=process.cwd();
assert(dist.startsWith(path.join(root,'qa')+path.sep),'QA_DIST_MUST_BE_ISOLATED');
if(apply)assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
const sourceCommit='50fb80a89a5779d73f81c96aab35f6e86193d769';
const sourceSpecs=[
 {concept:'apple',file:'apple.png',blob:'a523513041f45fa01660e2e539217329d9744a4d'},
 {concept:'pear',file:'Pear - pera.png',blob:'36833a42a891ac34311228532c0043b6576d88a7'},
 {concept:'carrot',file:'carrot.png',blob:'4fa03312965af56f69e6cc603a2cf12c996858c7'},
 {concept:'papaya',file:'Papaya - mamão.png',blob:'512b8577b233e243f034806552ae2e523bea6fbf'},
 {concept:'potato',file:'Potato - batata.png',blob:'d2b66cd3d56918e3105d4a5ab75e15297a074d23'},
 {concept:'tomato',file:'Tomato - tomate.png',blob:'2264f1613186236d6655166e2e0cffe4d57a55c0'},
 {concept:'melon',file:'Melon - melão.png',blob:'0ec3595c300f08bd18df23816fb237af5e78e441'},
 {concept:'jacket',file:'Jacket — Jaqueta.png',blob:'73b2c1bc562e9303e64ce1c6f563663ac61c83eb'},
 {concept:'dress',file:'Dress — Vestido.png',blob:'f8c1d3801b5cdf014f0c131d0ce9b98a3ae3a542'},
 {concept:'bedroom',file:'Bedroom — Quarto.png',blob:'1f5d55444fd018a8a38584bc70a0ae5314ade8f3'},
 {concept:'bathroom',file:'Bathroom — Banheiro.png',blob:'3d56badbe196f9d5150cb17dc0c3f8a1ff3572a1'},
 {concept:'kitchen',file:'Kitchen — Cozinha.png',blob:'2dca8e82e188ee27abb7f505275b2f1b987a2f10'},
 // New exact room concept: all shared occurrences still require leaf-semantic and provisional guards.
 {concept:'living room',file:'Living room — Sala de estar.png',blob:'518127541034f86f152366bc31b405205e5dfc40'}
];
// Grapes deliberately excluded: a bunch of grapes is not an exact singular "grape" proof.
const queue=(await readJson('docs/qa/media-audit-20261029/replacement-queue.json')).queue;
const regRel='content/english/media/media-registry.json';
const oldRegistry=await readFile(path.join(dist,regRel));
const registry=JSON.parse(oldRegistry);
assert(Array.isArray(registry.entries)&&registry.entries.length>=1100,'INVALID_COMPILED_REGISTRY');
const registryById=new Map(registry.entries.map((e,i)=>[e.mediaId,{entry:e,index:i}]));
assert.equal(registryById.size,registry.entries.length,'DUPLICATE_REGISTRY_IDS');
const oldManifest=await readFile(path.join(dist,'.duduq-pages-manifest'),'utf8');
const manifestLines=oldManifest.trimEnd().split(/\r?\n/);
const manifest=new Map();
for(let i=0;i<manifestLines.length;i++){
 const line=manifestLines[i],pos=line.lastIndexOf(' ');
 const name=line.slice(0,pos),digest=line.slice(pos+1);
 assert(pos>0&&/^[a-f0-9]{64}$/.test(digest)&&!manifest.has(name),'BAD_MANIFEST');
 manifest.set(name,{digest,index:i});
}
assert.equal(manifest.get(regRel)?.digest,sha256(oldRegistry),'REGISTRY_HASH_MISMATCH');
const usages=new Map(),questionById=new Map(),questionHashes=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 assert.equal(sha256(bytes),manifest.get(rel)?.digest,'QUESTION_HASH_MISMATCH:'+rel);
 const data=JSON.parse(bytes);
 assert.equal(data.moduleId,'Y'+y+'M'+mm);
 assert.equal(data.items?.length,20);
 questionHashes.set(rel,sha256(bytes));
 for(const q of data.items){
  assert(!questionById.has(q.item_id),'DUPLICATE_QUESTION_ID');
  questionById.set(q.item_id,q);
  collectQuestionMediaUsages(q,usages);
 }
}
assert.equal(questionById.size,600,'NOT_600_CONTRACTS');
const assets=[],eligible=[],blocked=[];
for(const spec of sourceSpecs){
 const full=path.resolve(sourceRoot,'Imagens Ilustrativa',spec.file);
 assert(full.startsWith(sourceRoot+path.sep),'UNSAFE_SOURCE_PATH');
 const bytes=await readFile(full);
 assert.equal(gitBlob(bytes),spec.blob,'SOURCE_BLOB_CHANGED:'+spec.concept);
 const qc=inspectPng(bytes);
 const valid=qc.valid&&qc.transparent&&bytes.readUInt32BE(16)>=1024&&bytes.readUInt32BE(20)>=1024&&bytes[24]===8&&bytes[25]===6;
 const digest=sha256(bytes);
 const rel='content/english/assets/images/assets-duduq/food-'+spec.concept+'-'+digest.slice(0,12)+'.png';
 const asset={...spec,sourceCommit,sha256:digest,path:rel,bytes,valid};
 assets.push(asset);
 const rows=queue.filter(r=>r.semantic===spec.concept&&r.classification==='PROVISIONAL');
 for(const row of rows){
  const reg=registryById.get(row.mediaId)?.entry;
  const found=usages.get(row.mediaId)||[];
  const questions=[...new Set(found.map(x=>x.questionId))].sort();
  const example=[...new Set(row.exampleQuestions||[])].sort();
  const checks={
   sourceValid:valid,
   queueExact:row.kind==='image'&&row.semanticConflict===false&&
    row.integrationStatus==='SOURCE_READY'&&row.temporary==null,
   registryProvisional:!!reg&&reg.kind==='image'&&reg.semantic===spec.concept&&
    reg.urlOrPath===row.sourcePath&&reg.urlOrPath.endsWith('.svg')&&
    (reg.temporary===true||(reg.temporary==null&&reg.integrationStatus==='SOURCE_READY'))&&
    reg.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED'&&
    reg.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH',
   usageExact:questions.length===row.usage&&example.every(id=>questions.includes(id)),
   allLeafSemanticsExplicit:found.length>0&&found.every(x=>String(x.semanticTarget||'').trim()&&
    isExactPedagogicalConcept(spec.concept,x.semanticTarget)),
   knownBlankMechanicAbsent:questions.every(id=>questionById.get(id)?.mechanicId!=='bubble-pop'),
   sourceNotAlreadyInManifest:!manifest.has(rel)
  };
  const binding={mediaId:row.mediaId,concept:spec.concept,questionIds:questions,
   nestedReferences:found.length,checks,previousPath:reg?.urlOrPath||null,
   assetPath:rel,sourceGitBlob:spec.blob,sha256:digest};
  (Object.values(checks).every(Boolean)?eligible:blocked).push(binding);
 }
}
const affected=[...new Set(eligible.flatMap(x=>x.questionIds))].sort();
const report={schemaVersion:'DUDUQ_PHASE2_FOOD_STRICT_QA_V1',status:'PREFLIGHT_COMPLETE',
 sourceRepository:'augustoborgessousa93/Assets-DuduQ',sourceCommit,
 inspectedConcepts:sourceSpecs.map(x=>x.concept),sourceFiles:assets.map(x=>({
  concept:x.concept,file:x.file,gitBlob:x.blob,sha256:x.sha256,valid:x.valid})),
 verifiedQuestionContracts:questionById.size,candidateIds:eligible.length+blocked.length,
 eligibleIds:eligible.length,blockedIds:blocked.length,affectedQuestions:affected.length,
 affectedModules:[...new Set(affected.map(id=>id.slice(0,5)))].sort(),
 eligible,blocked,questionsChanged:0,answerKeysChanged:0,audioChanged:0,
 productionDeployed:false,releaseApproved:false,pedagogicalQAApproved:false};
await mkdir(path.join(root,'qa/results'),{recursive:true});
await writeFile('qa/results/phase2-food-preflight.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,eligible:eligible.length,blocked:blocked.length,
 affectedQuestions:affected.length,modules:report.affectedModules,productionDeployed:false}));
if(!apply)process.exit(0);
assert(eligible.length>0,'NO_EXPLICIT_SEMANTICALLY_VERIFIED_FOOD_BINDINGS');
const used=assets.filter(a=>eligible.some(x=>x.concept===a.concept));
const next=structuredClone(registry);
for(const binding of eligible){
 const i=registryById.get(binding.mediaId).index,prior=next.entries[i];
 const asset=used.find(x=>x.concept===binding.concept);
 assert(prior.urlOrPath===binding.previousPath,'REGISTRY_CHANGED_DURING_PATCH');
 next.entries[i]={...prior,temporary:true,kind:'image',
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',urlOrPath:asset.path,
  sha256:asset.sha256,assets:[{path:asset.path,sha256:asset.sha256}],
  altText:binding.concept,provenance:{provider:'Assets-DuduQ repository',
   sourceRepository:report.sourceRepository,sourceCommit,sourcePath:'Imagens Ilustrativa/'+asset.file,
   sourceGitBlob:asset.blob,sha256:asset.sha256},
  replacementAudit:{source:'600 compiled questions with explicit leaf semantics',
   verifiedQuestionIds:binding.questionIds,previousPath:binding.previousPath,qaOnly:true}};
}
assert.equal(next.entries.length,registry.entries.length,'REGISTRY_SIZE_CHANGED');
const registryBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
const nextLines=[...manifestLines];
nextLines[manifest.get(regRel).index]=regRel+' '+sha256(registryBytes);
for(const asset of used)nextLines.push(asset.path+' '+asset.sha256);
const newManifest=Buffer.from(nextLines.join('\n')+'\n');
const created=[];
try{
 for(const asset of used){
  const output=path.resolve(dist,asset.path);
  assert(output.startsWith(dist+path.sep),'UNSAFE_OUTPUT_PATH');
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,asset.bytes,{flag:'wx'});
  created.push(output);
 }
 await writeFile(path.join(dist,regRel),registryBytes);
 await writeFile(path.join(dist,'.duduq-pages-manifest'),newManifest);
 for(const [rel,digest] of questionHashes)
  assert.equal(sha256(await readFile(path.join(dist,rel))),digest,'QUESTION_MUTATED:'+rel);
 for(const asset of used)
  assert.equal(sha256(await readFile(path.join(dist,asset.path))),asset.sha256);
 assert.equal(sha256(await readFile(path.join(dist,regRel))),sha256(registryBytes));
 const patch={schemaVersion:'DUDUQ_PHASE2_FOOD_QA_PATCH_V1',
  status:'ISOLATED_QA_PENDING_VISUAL_AND_PEDAGOGICAL_REVIEW',
  sourceCommit,verifiedQuestionContracts:600,changedMediaIds:eligible.length,
  changedQuestionCount:affected.length,changedQuestionIds:affected,
  changedModules:report.affectedModules,bindings:eligible,
  images:used.map(a=>({concept:a.concept,path:a.path,sha256:a.sha256,sourceGitBlob:a.blob})),
  questionsChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
  productionDeployed:false,releaseApproved:false,pedagogicalQAApproved:false,
  registrySha256:sha256(registryBytes),manifestSha256:sha256(newManifest)};
 await writeFile('qa/results/phase2-food-qa-patch.json',JSON.stringify(patch,null,2)+'\n');
 console.log(JSON.stringify({status:patch.status,mediaIds:patch.changedMediaIds,
  questions:patch.changedQuestionCount,images:patch.images.length}));
}catch(error){
 await writeFile(path.join(dist,regRel),oldRegistry);
 await writeFile(path.join(dist,'.duduq-pages-manifest'),oldManifest);
 for(const file of created)await rm(file,{force:true});
 throw error;
}

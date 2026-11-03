#!/usr/bin/env node
/**
 * DUDUQ Fase 2: integra em lote imagens inequívocas de Assets-DuduQ em um
 * build QA ISOLADO. Nunca modifica contratos/gabaritos/runtime nem faz deploy.
 * Sem novos desenhos: fonte original imutável, hash de Git e SHA-256 conferidos.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const dist=path.resolve(process.env.DUDUQ_QA_DIST||'qa/dist-pages-food-candidate');
const source=JSON.parse(await readFile('docs/qa/media-audit-20261029/phase2-full-asset-inventory-20261103.json','utf8'));
const pinned=JSON.parse(await readFile('docs/qa/media-audit-20261029/phase2-canonical-semantic-map-20261103.json','utf8'));
assert.equal(source.sourceCommit,pinned.sourceCommit,'SOURCE_PIN_COMMIT_DRIFT');
const queue=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8'));
const queueById=new Map(queue.queue.map(x=>[x.mediaId,x]));
const regRel='content/english/media/media-registry.json', regFile=path.join(dist,regRel);
const manifestFile=path.join(dist,'.duduq-pages-manifest');
const regOriginal=await readFile(regFile), manifestOriginal=await readFile(manifestFile);
const registry=JSON.parse(regOriginal);
assert(Array.isArray(registry.entries)&&registry.entries.length>=1100,'INCOMPLETE_QA_REGISTRY');
const byId=new Map(registry.entries.map((e,i)=>[e.mediaId,i]));
assert.equal(byId.size,registry.entries.length,'DUPLICATE_REGISTRY_ID');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const normalize=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const assetByPath=new Map(source.assets.map(a=>[a.path,a]));
assert.equal(assetByPath.size,source.assets.length,'DUPLICATE_SOURCE_PATH');
const sourceByConcept=new Map();
for(const [rawConcept,sourcePath] of Object.entries(pinned.pins)){
 const concept=normalize(rawConcept), asset=assetByPath.get(sourcePath);
 assert(asset&&asset.gitBlob&&asset.bytes>0,'INVALID_PINNED_SOURCE:'+sourcePath);
 assert(!sourceByConcept.has(concept),'DUPLICATE_PINNED_CONCEPT:'+concept);
 sourceByConcept.set(concept,asset);
}
const manifestLines=manifestOriginal.toString('utf8').trimEnd().split(/\r?\n/);
const manifest=new Map();
for(let i=0;i<manifestLines.length;i++){
 const line=manifestLines[i],p=line.lastIndexOf(' ');
 assert(p>0&&/^[a-f0-9]{64}$/.test(line.slice(p+1)),'INVALID_MANIFEST');
 const rel=line.slice(0,p);
 assert(!manifest.has(rel),'DUPLICATE_MANIFEST_PATH');
 manifest.set(rel,{sha256:line.slice(p+1),index:i});
}
assert.equal(manifest.get(regRel)?.sha256,sha256(regOriginal),'BASE_REGISTRY_MANIFEST_MISMATCH');
const usages=new Map(),questionHashes=new Map(),questionMechanics=new Map();
let questions=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const b=await readFile(path.join(dist,rel)),doc=JSON.parse(b);
 assert.equal(doc.items?.length,20,'INCOMPLETE_MODULE:'+rel);
 assert.equal(manifest.get(rel)?.sha256,sha256(b),'BASE_CONTRACT_HASH_MISMATCH:'+rel);
 questionHashes.set(rel,sha256(b));
 for(const q of doc.items){collectQuestionMediaUsages(q,usages);questionMechanics.set(q.item_id,q.mechanicId);questions++;}
}
assert.equal(questions,600);
const selected=new Map(),held=[];
const block=(id,why)=>held.push({mediaId:id,reason:why});
for(const [id,rows] of usages){
 const i=byId.get(id),entry=registry.entries[i],q=queueById.get(id);
 if(!entry||entry.kind!=='image'||!q||q.classification!=='PROVISIONAL')continue;
 const concept=normalize(q.semantic),sourceAsset=sourceByConcept.get(concept);
 if(!sourceAsset)continue;
 if(/WHITE|BLACK|BANANA/i.test(id)){block(id,'HISTORICAL_SEMANTIC_OR_VISUAL_HOLD');continue;}
 if(q.semanticConflict||q.temporary===false||entry.temporary===false){block(id,'AMBIGUOUS_OR_NOT_PROVISIONAL');continue;}
 if(!entry.urlOrPath?.endsWith('.svg')||
    !entry.urlOrPath.startsWith('content/english/assets/images/')){
   block(id,'EXISTING_NON_PROVISIONAL_OR_PNG');continue;
 }
 if(entry.humanResolutionStatus==='PEDAGOGICAL_QA_APPROVED'||
    entry.integrationStatus==='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH'){
   block(id,'ALREADY_APPROVED_SOURCE');continue;
 }
 if(normalize(entry.semantic)&&normalize(entry.semantic)!==concept){block(id,'REGISTRY_SEMANTIC_CONFLICT');continue;}
 if(q.optionSemanticTargets?.some(x=>normalize(x)!==concept)){block(id,'QUEUE_OPTION_CONFLICT');continue;}
 if((q.mustInclude||[]).length||(q.mustNotInclude||[]).length){block(id,'VISUAL_CONSTRAINTS_REQUIRE_INSPECTION');continue;}
 // An image shared by many questions may only be replaced if EVERY occurrence
 // has the same explicit meaning; missing meaning cannot be guessed.
 const realQuestions=[...new Set(rows.map(x=>x.questionId))].sort();
 // Leaf semanticTarget can be absent in older mechanics. Only infer it from the
 // audited PROVISIONAL queue if EVERY nonempty leaf agrees, the exact number
 // of real questions agrees, and every sampled question also matches.
 if(!rows.length||rows.some(x=>normalize(x.semanticTarget)&&normalize(x.semanticTarget)!==concept)||
    q.usage!==realQuestions.length||
    (q.exampleQuestions||[]).some(x=>!realQuestions.includes(x))){
   block(id,'REAL_OCCURRENCE_OR_EXPLICIT_LEAF_CONFLICT');continue;
 }
 selected.set(id,{mediaId:id,concept,asset:sourceAsset,questionIds:realQuestions,
  occurrences:rows.length,missingLeafSemantics:rows.filter(x=>!normalize(x.semanticTarget)).length,
  previousPath:entry.urlOrPath});
}
assert(selected.size>0,'NO_UNAMBIGUOUS_SOURCE_REPLACEMENTS');
const assets=[...new Map([...selected.values()].map(x=>[x.concept,x.asset])).entries()];
const loaded=new Map(),skippedSources=[];
for(const [concept,a] of assets){
 const uri='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+source.sourceCommit+'/'+a.path.split('/').map(encodeURIComponent).join('/');
 const resp=await fetch(uri,{signal:AbortSignal.timeout(60000)});
 if(!resp.ok){skippedSources.push({concept,reason:'HTTP_'+resp.status});continue;}
 const bytes=Buffer.from(await resp.arrayBuffer());
 if(gitBlob(bytes)!==a.gitBlob){skippedSources.push({concept,reason:'GIT_BLOB_MISMATCH'});continue;}
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
    bytes.readUInt32BE(16)<768||bytes.readUInt32BE(20)<768||bytes[25]!==6){
   skippedSources.push({concept,reason:'PNG_TRANSPARENCY_OR_DIMENSIONS'});continue;
 }
 const digest=sha256(bytes),rel='content/english/assets/images/assets-duduq/phase2-delta-'+concept.replace(/ /g,'-')+'-'+digest.slice(0,12)+'.png';
 if(manifest.has(rel)){skippedSources.push({concept,reason:'ALREADY_PRESENT_IN_BASELINE'});continue;}
 loaded.set(concept,{bytes,sha256:digest,path:rel,gitBlob:a.gitBlob,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sourceFile:a.path});
}
const applied=[...selected.values()].filter(x=>loaded.has(x.concept));
assert(applied.length>0,'NO_VERIFIED_SOURCE_BYTES_TO_APPLY');
const next=structuredClone(registry),created=[],changedAssets=new Set(),lines=[...manifestLines];
for(const x of applied){
 const asset=loaded.get(x.concept),i=byId.get(x.mediaId),prior=next.entries[i];
 next.entries[i]={...prior,temporary:true,urlOrPath:asset.path,sha256:asset.sha256,
  assets:[{path:asset.path,sha256:asset.sha256}],altText:x.concept,
  integrationStatus:'PHASE2_BULK_QA_CANDIDATE_NO_PRODUCTION',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  provenance:{provider:'Assets-DuduQ',sourceRepository:source.sourceRepository,sourceCommit:source.sourceCommit,
   sourcePath:asset.sourceFile,sourceGitBlob:asset.gitBlob,sha256:asset.sha256,nativeWidth:asset.width,nativeHeight:asset.height},
  replacementAudit:{qaOnly:true,verifiedQuestionIds:x.questionIds,occurrences:x.occurrences,previousPath:x.previousPath,
   source:'immutable 600-contract occurrence graph'}};
 changedAssets.add(x.concept);
}
const newRegistry=Buffer.from(JSON.stringify(next,null,2)+'\n');
lines[manifest.get(regRel).index]=regRel+' '+sha256(newRegistry);
for(const concept of changedAssets){const a=loaded.get(concept);lines.push(a.path+' '+a.sha256);}
const newManifest=Buffer.from(lines.join('\n')+'\n');
try{
 for(const concept of changedAssets){
  const a=loaded.get(concept),out=path.resolve(dist,a.path);
  assert(out.startsWith(dist+path.sep),'UNSAFE_ASSET_PATH');
  await mkdir(path.dirname(out),{recursive:true});
  await writeFile(out,a.bytes,{flag:'wx'});created.push(out);
 }
 await writeFile(regFile,newRegistry);
 await writeFile(manifestFile,newManifest);
 for(const [rel,h] of questionHashes)assert.equal(sha256(await readFile(path.join(dist,rel))),h,'QUESTION_CHANGED:'+rel);
 for(const c of changedAssets){const a=loaded.get(c);assert.equal(sha256(await readFile(path.join(dist,a.path))),a.sha256);}
 const report={schemaVersion:'DUDUQ_PHASE2_BATCH_INTEGRATION_V1',mode:'ISOLATED_QA_CANDIDATE_ONLY',
  sourceCommit:source.sourceCommit,baseline:'immutable 127-ID approved technical QA package',sourcePngCatalog:source.assets.length,pinnedConcepts:sourceByConcept.size,
  questionContracts:600,answerKeysChanged:0,audioChanged:0,runtimeChanged:0,
  newMediaIds:applied.length,newPngs:changedAssets.size,
  affectedQuestionIds:[...new Set(applied.flatMap(x=>x.questionIds))].sort(),
  bindings:applied.map(({asset,...x})=>({...x,sourceFile:asset.path,sha256:loaded.get(x.concept).sha256,destination:loaded.get(x.concept).path})),
  createdImages:[...changedAssets].map(c=>loaded.get(c).path),
  sha256Registry:sha256(newRegistry),sha256Manifest:sha256(newManifest),
  skippedSources,held,releaseApproved:false,productionDeployed:false,
  note:'All 600 question files byte-identical; source names manually mapped to exact English concepts. Visual/browser QA remains pending before release.'};
 await mkdir('qa/results',{recursive:true});
 await writeFile('qa/results/phase2-batch-source-integration.json',JSON.stringify(report,null,2)+'\n');
 console.log('DUDUQ_BATCH_INTEGRATED='+JSON.stringify({mediaIds:report.newMediaIds,pngs:report.newPngs,questions:report.affectedQuestionIds.length,held:held.length,productionDeployed:false}));
}catch(err){
 await writeFile(regFile,regOriginal);await writeFile(manifestFile,manifestOriginal);
 for(const out of created)await rm(out,{force:true});
 throw err;
}

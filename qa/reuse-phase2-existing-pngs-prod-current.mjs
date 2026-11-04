#!/usr/bin/env node
/**
 * Production-current image reuse without downloads or new images.
 * Uses ONLY official PNGs ALREADY in the current published orange release.
 * Full 600-question occurrence graph; fail-closed on incomplete/implicit semantics.
 * Preflight is read-only. --apply changes a disposable QA copy ONLY.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
const qa=process.env.DUDUQ_QA_ONLY==='1',apply=process.argv.includes('--apply');
assert(qa,'DUDUQ_QA_ONLY_REQUIRED');
const root=path.resolve(process.env.DUDUQ_QA_DIST||'qa/production-orange-immutable');
assert(root.startsWith(path.resolve('qa')+path.sep),'QA_DIR_REQUIRED');
if(apply)assert(root.endsWith('qa/production-orange-review-candidate'),'QA_APPLY_DISPOSABLE_ONLY');
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=b=>createHash('sha256').update(b).digest('hex');
const pinned=JSON.parse(await readFile('docs/qa/media-audit-20261029/phase2-canonical-semantic-map-20261103.json','utf8'));
const queueData=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8'));
const queue=new Map(queueData.queue.map(x=>[x.mediaId,x]));
const concepts=new Map(Object.entries(pinned.pins).map(([c,p])=>[norm(c),p]));
const regRel='content/english/media/media-registry.json';
const regFile=path.join(root,regRel),manFile=path.join(root,'.duduq-pages-manifest');
const regBytes=await readFile(regFile),manBytes=await readFile(manFile);
const registry=JSON.parse(regBytes),byId=new Map(registry.entries.map((e,i)=>[e.mediaId,i]));
assert.equal(byId.size,registry.entries.length);
const manifestLines=manBytes.toString('utf8').trimEnd().split(/\r?\n/);
const manifest=new Map(manifestLines.map((l,i)=>{
 const at=l.lastIndexOf(' ');assert(at>0);return [l.slice(0,at),{sha:l.slice(at+1),index:i}];
}));
assert.equal(manifest.get(regRel)?.sha,hash(regBytes),'SOURCE_REGISTRY_UNTRUSTED');
assert.equal(manifestLines.length,2891,'SOURCE_ORANGE_NOT_CANONICAL');
const imgs=new Map();
for(const e of registry.entries){
 const source=e.provenance?.sourcePath,rel=e.urlOrPath,sha=e.sha256;
 if(!source||!rel?.endsWith('.png')||!/^[a-f0-9]{64}$/i.test(sha||''))continue;
 if(manifest.get(rel)?.sha!==sha)continue;
 if(!imgs.has(source))imgs.set(source,new Map());
 imgs.get(source).set(sha,rel);
}
const usages=new Map(),qIds=new Set();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const b=await readFile(path.join(root,rel)),d=JSON.parse(b);
 assert.equal(d.items?.length,20);assert.equal(manifest.get(rel)?.sha,hash(b));
 for(const q of d.items){assert(!qIds.has(q.item_id));qIds.add(q.item_id);collectQuestionMediaUsages(q,usages);}
}
assert.equal(qIds.size,600);
const selected=[],held=[],reasonCounts={},queueUnused=[];
const blocked=(id,reason,concept,path)=>{reasonCounts[reason]=(reasonCounts[reason]||0)+1;
 held.push({mediaId:id,concept,path,reason});};
const uniqueContent=new Map();
for(const [id,links] of usages){
 const e=registry.entries[byId.get(id)],q=queue.get(id);
 if(!e||e.kind!=='image'||!e.urlOrPath?.endsWith('.svg'))continue;
 const concept=norm(q?.semantic||e.semantic),base=e.urlOrPath;
 if(!q||q.classification!=='PROVISIONAL'){blocked(id,'NO_PROVISIONAL_QUEUE',concept,base);continue;}
 if(q.semanticConflict||q.temporary===false||e.temporary===false){blocked(id,'NOT_SAFE_PROVISIONAL',concept,base);continue;}
 if(/(?:^|[^a-z])(white|black|banana|orange)(?:$|[^a-z])/.test(concept)||/WHITE|BLACK|BANANA|ORANGE/i.test(id)){blocked(id,'HISTORICAL_HOLD_OR_ORANGE',concept,base);continue;}
 if(q.mustInclude?.length||q.mustNotInclude?.length){blocked(id,'VISUAL_CONSTRAINTS_PENDING',concept,base);continue;}
 if(!concepts.has(concept)){blocked(id,'NO_VERIFIED_PIN_FOR_CONCEPT',concept,base);continue;}
 const source=concepts.get(concept),matching=imgs.get(source);
 if(!matching?.size){blocked(id,'OFFICIAL_PNG_NOT_YET_PUBLISHED',concept,base);continue;}
 if(matching.size!==1){blocked(id,'CONFLICTING_SOURCE_SHA',concept,base);continue;}
 if(norm(e.semantic)&&norm(e.semantic)!==concept){blocked(id,'REGISTRY_CONCEPT_CONFLICT',concept,base);continue;}
 if(q.optionSemanticTargets?.some(x=>norm(x)!==concept)){blocked(id,'OPTION_TARGET_CONFLICT',concept,base);continue;}
 const realQuestions=[...new Set(links.map(l=>l.questionId))].sort();
 if(q.usage!==realQuestions.length||(q.exampleQuestions||[]).some(x=>!realQuestions.includes(x))){
  blocked(id,'SHARED_USAGE_COUNT_OR_QUESTION_SET_DRIFT',concept,base);continue;
 }
 if(links.some(l=>!norm(l.semanticTarget))){blocked(id,'IMPLICIT_SEMANTICS_MUST_REVIEW',concept,base);continue;}
 if(links.some(l=>norm(l.semanticTarget)!==concept)){blocked(id,'EXPLICIT_LEAF_SEMANTIC_CONFLICT',concept,base);continue;}
 const [sha,rel]=matching.entries().next().value;
 const rec={mediaId:id,concept,questionIds:realQuestions,realOccurrences:links.length,
  previousPath:base,publishedOfficialPath:rel,sha256:sha,sourcePath:source};
 selected.push(rec);
 for(const questionId of realQuestions){
  if(!uniqueContent.has(questionId))uniqueContent.set(questionId,new Set());
  uniqueContent.get(questionId).add(concept);
 }
}
selected.sort((a,b)=>a.mediaId.localeCompare(b.mediaId));
const prior=JSON.parse(await readFile('qa/results/phase2-prod-current-source-closure.json','utf8'));
assert.equal(prior.verifiedQuestionContracts,600);assert.equal(prior.packageHashesVerified,2891);
const preflight={schemaVersion:'DUDUQ_PHASE2_PRODUCTION_EXISTING_PNG_REUSE_PREFLIGHT_V1',
 status:'QA_PREFLIGHT_NOT_PEDAGOGICALLY_APPROVED',
 sourceProduction:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 sourceRegistrySha256:hash(regBytes),verifiedContracts:600,
 reusedPngsDistinct:[...new Set(selected.map(x=>x.publishedOfficialPath))].length,
 eligibleMediaIds:selected.length,affectedQuestions:uniqueContent.size,
 affectedModules:[...new Set([...uniqueContent.keys()].map(x=>x.slice(0,5)))].sort(),
 eligible:selected,
 heldCount:held.length,reasonCounts,heldSamples:held.slice(0,80),
 remainingProvisionalSvgAfterHypotheticalApply:prior.imageSummary.svg_provisional.mediaIds-selected.length,
 applied:false,productionDeployed:false,releaseApproved:false,pedagogicalApproved:false,
 caveat:'All selected matches have explicit leaf semanticTarget and existing published PNG SHA. Visual and human pedagogical QA still required.'};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-prod-existing-png-reuse-preflight.json',JSON.stringify(preflight,null,2)+'\n');
console.log('PROD_CURRENT_REUSE_PREFLIGHT='+JSON.stringify({
 candidateMediaIds:preflight.eligibleMediaIds,distinctExistingPngs:preflight.reusedPngsDistinct,
 affectedQuestions:preflight.affectedQuestions,affectedModules:preflight.affectedModules,
 remainingSvgAfterApply:preflight.remainingProvisionalSvgAfterHypotheticalApply,
 reasonCounts:preflight.reasonCounts,applied:false,productionDeployed:false}));
if(!apply)process.exit(0);
assert(selected.length>0,'NO_SAFE_NEW_SUBSTITUTIONS');
const next=structuredClone(registry);
for(const rec of selected){
 const i=byId.get(rec.mediaId),e=next.entries[i];
 assert.equal(e.urlOrPath,rec.previousPath);
 next.entries[i]={...e,urlOrPath:rec.publishedOfficialPath,sha256:rec.sha256,
  temporary:true,assets:[{path:rec.publishedOfficialPath,sha256:rec.sha256}],
  integrationStatus:'PHASE2_CURRENT_PRODUCTION_PNG_REUSE_QA_ONLY',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  provenance:{provider:'Assets-DuduQ',sourcePath:rec.sourcePath,sha256:rec.sha256,
   sourceRelease:'duduq-phase2-orange-fruit-color-corrected-20261103'},
  replacementAudit:{qaOnly:true,previousPath:rec.previousPath,
   verifiedQuestionIds:rec.questionIds,realOccurrences:rec.realOccurrences,
   source:'exact 600 question leaf semanticTarget and already published PNG sha256'}};
}
const newBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
const lines=[...manifestLines];lines[manifest.get(regRel).index]=regRel+' '+hash(newBytes);
const newManifest=Buffer.from(lines.join('\n')+'\n');
await writeFile(regFile,newBytes);await writeFile(manFile,newManifest);
for(const rel of Object.keys(prior.imageSummary)){
 assert(rel,'VALID_SUMMARY_GROUP');
}
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 assert.equal(hash(await readFile(path.join(root,rel))),manifest.get(rel)?.sha,'QUESTION_MUTATED:'+rel);
}
const applied={...preflight,status:'CANDIDATE_INTEGRATED_QA_ONLY_VISUAL_NOT_CERTIFIED',
 applied:true,registryShaAfter:hash(newBytes),manifestShaAfter:hash(newManifest),
 updatedQuestionJsonFiles:0,updatedGoldMasters:0,updatedAudioFiles:0,updatedMechanics:0,
 addedImages:0,changedFiles:['.duduq-pages-manifest',regRel],
 productionDeployed:false,releaseApproved:false};
await writeFile('qa/results/phase2-prod-existing-png-reuse-applied.json',JSON.stringify(applied,null,2)+'\n');
console.log('PROD_CURRENT_EXACT_PNG_REUSED_IN_QA='+JSON.stringify({
 mediaIds:selected.length,distinctPublishedPngs:preflight.reusedPngsDistinct,
 questions:preflight.affectedQuestions,addedImages:0,
 changedFiles:applied.changedFiles,productionDeployed:false}));

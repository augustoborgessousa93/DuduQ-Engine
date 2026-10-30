#!/usr/bin/env node
/**
 * QA-preview ONLY: correct real option/destination media references by occurrence.
 * No mass global mediaId substitutions: mixed-use IDs are split for the exact
 * question and semantic concept (as already done for Y1M05). The only permitted
 * question changes are mediaId/assetId/imageRef/image_ref strings. Answer keys,
 * mechanics, instruction, distractor order and Gold Masters stay identical.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
const ROOT=process.cwd(),DIST=path.join(ROOT,'dist-pages');
const sha=v=>createHash('sha256').update(v).digest('hex');
const mediaKeys=['assetId','mediaId','imageRef','image_ref'];
const scoped=new Set(['Y1M02','Y1M03','Y1M04','Y1M06']);
if(process.env.CF_PAGES_BRANCH!=='integration/assets-duduq-resume-20261030'&&process.env.DUDUQ_ASSETS_SAFE_QA!=='1')
 throw Error('NOT_REVIEW_PREVIEW_BRANCH');
const registryRel='content/english/media/media-registry.json',mf=path.join(DIST,'.duduq-pages-manifest');
const lines=(await readFile(mf,'utf8')).trimEnd().split(/\r?\n/);
const manifest=new Map();
for(const line of lines){let m=/^(.*) ([a-f0-9]{64})$/.exec(line);if(!m||manifest.has(m[1]))throw Error('BAD_MANIFEST');manifest.set(m[1],m[2]);}
async function readOriginal(rel){const bytes=await readFile(path.join(DIST,rel));assert.equal(sha(bytes),manifest.get(rel),'UNPINNED_INPUT:'+rel);return bytes;}
const reg=JSON.parse((await readOriginal(registryRel)).toString('utf8'));
assert(Array.isArray(reg.entries));
const originalById=new Map(reg.entries.map(x=>[x.mediaId,x]));
assert.equal(originalById.size,reg.entries.length);
const imported=new Map();
for(const e of reg.entries){
 const qa=e.replacementAudit,pro=e.provenance;
 if(pro?.sourceRepository!=='augustoborgessousa93/Assets-DuduQ'||
  pro?.sourceCommit!=='658d94f08031820cfea5258a6f4e7c24f278df92'||e.temporary!==true||
  !e.urlOrPath?.startsWith('content/english/assets/images/assets-duduq-review/'))continue;
 const module=qa?.scope||qa?.questionId?.slice(0,5);
 if(!scoped.has(module)||!e.semantic)continue;
 assert.equal(sha(await readOriginal(e.urlOrPath)),e.sha256,'IMPORTED_SOURCE_HASH_MISMATCH');
 const key=module+'|'+e.semantic.toLowerCase().trim();
 const previous=imported.get(key);
 if(previous && previous.sha256!==e.sha256)throw Error('DIVERGENT_ART_FOR_SAME_SEMANTIC:'+key);
 imported.set(key,e);
}
// QA-only cross-module reuse: a small explicit whitelist of exact, single-word
// concepts. Never infer an animal adjective or rename a school object.
// The source file/hash stays pinned to the original audited repository commit.
const crossModuleExact=new Map([
 ['Y1M04',new Map([
  ...['red','blue','green','yellow','black','white'].map(c=>[c,'Y1M03']),
  ...['one','two','three','four'].map(c=>[c,'Y1M02'])
 ])],
 ['Y1M06',new Map(
  ['red','blue','green','yellow'].map(c=>[c,'Y1M03'])
 )]
]);
const chooseAuditedAsset=(module,concept)=>{
 const local=imported.get(module+'|'+concept);
 if(local)return {asset:local,sourceModule:module,crossModule:false};
 const sourceModule=crossModuleExact.get(module)?.get(concept);
 if(!sourceModule)return null;
 const asset=imported.get(sourceModule+'|'+concept);
 if(!asset)return null;
 if(String(asset.semantic||'').trim().toLowerCase()!==concept)
  throw Error('CROSS_MODULE_NOT_IDENTICAL_SEMANTIC:'+module+':'+concept);
 return {asset,sourceModule,crossModule:true};
};
const mediaMask=n=>{
 if(Array.isArray(n))return n.map(mediaMask);
 if(!n||typeof n!=='object')return n;
 const res={};for(const [k,v] of Object.entries(n)){
  if(k==='media'&&/^Y1M03-Q020-I[1-8]$/.test(String(n.id||''))&&
     v?.role==='OPTION'&&typeof v?.assetId==='string')continue;
  res[k]=mediaKeys.includes(k)&&typeof v==='string' ? '<MEDIA_ID>' : mediaMask(v);
 }
 return res;
};
const report={schemaVersion:'DUDUQ_PER_OCCURRENCE_MEDIA_REPAIR_V1',sourceBranch:'integration/assets-duduq-resume-20261030',
 candidateOnly:true,productionUntouched:true,humanPedagogicalQA:'PENDING',questionFilesModified:[],createdIds:[],
 modifiedReferences:[],groupingCardBindings:[],byModule:{},skippedCounts:{},sourcePngsAlreadyPinned:imported.size};
const nextRegistry=structuredClone(reg),known=new Set(nextRegistry.entries.map(x=>x.mediaId));
const newAssignments=new Map(),updates=new Map(),pencilCaseUsages=[];
const pencilCaseId='IMG-Y1M04-Q003-PENCIL-CASE';
let count=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),module='Y'+y+'M'+mm;
 const rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const bytes=await readOriginal(rel);
 const originalDoc=JSON.parse(bytes.toString('utf8'));
 assert.equal(originalDoc.moduleId,module,'BAD_MODULE_ID');
 assert.equal(originalDoc.items?.length,20,'NOT_20_QUESTIONS');
 count+=20;
 for(const q of originalDoc.items){
   // Special-case a known canonical alias: pencil case / pencil-case.
   // Scan ALL 600 source questions, to prove this shared ID does not cross
   // module boundaries or carry any unrelated visual meaning.
   function scanPencil(node){
     if(!node||typeof node!=='object')return;
     if(!Array.isArray(node) && mediaKeys.some(key=>node[key]===pencilCaseId)){
       pencilCaseUsages.push({moduleId:module,questionId:q.item_id,
        semantic:String(node.semanticTarget||''),mustInclude:String(node.mustInclude||'')});
     }
     for(const v of Object.values(node))if(v&&typeof v==='object')scanPencil(v);
   }
   scanPencil(q);
 }
 if(!scoped.has(module))continue;
 const doc=structuredClone(originalDoc),changes=[];
 function visit(n,qid){
  if(!n||typeof n!=='object')return;
  if(Array.isArray(n)){for(const x of n)visit(x,qid);return;}
  for(const key of mediaKeys){
   const from=n[key];
   if(typeof from!=='string'||!from.startsWith('IMG-'))continue;
   const regEntry=originalById.get(from);
   if(!regEntry||regEntry.kind!=='image'||regEntry.temporary!==true||regEntry.provenance){
     report.skippedCounts.NONPROVISIONAL_OR_ALREADY_MAPPED=(report.skippedCounts.NONPROVISIONAL_OR_ALREADY_MAPPED||0)+1;continue;
   }
   if(!/^content\/english\/assets\/images\/year-1\/provisional-semantic-v1\//.test(regEntry.urlOrPath||'')){
     report.skippedCounts.UNEXPECTED_SOURCE_PATH=(report.skippedCounts.UNEXPECTED_SOURCE_PATH||0)+1;continue;
   }
   const concept=String(n.semanticTarget||'').trim().toLowerCase();
   const mustInclude=String(n.mustInclude||'').trim().toLowerCase();
   if(!concept||!isExactPedagogicalConcept(concept,regEntry.semantic)||!mustInclude||!isExactPedagogicalConcept(mustInclude,concept)){
     report.skippedCounts.UNPROVEN_CONTEXT_OR_SEMANTIC=(report.skippedCounts.UNPROVEN_CONTEXT_OR_SEMANTIC||0)+1;continue;
   }
   const chosen=chooseAuditedAsset(module,concept);
   if(!chosen){report.skippedCounts.NO_EXACT_PINNED_SOURCE=(report.skippedCounts.NO_EXACT_PINNED_SOURCE||0)+1;continue;}
   const {asset,sourceModule,crossModule}=chosen;
   // Exact matching on BOTH question context keys and the old registry entry
   // is mandatory for cross-module reuse; never relax to fuzzy matching.
   if(crossModule&&(
     String(regEntry.semantic||'').trim().toLowerCase()!==concept ||
     String(n.mustInclude||'').trim().toLowerCase()!==concept)){
     report.skippedCounts.CROSS_MODULE_CONTEXT_NOT_EXACT=(report.skippedCounts.CROSS_MODULE_CONTEXT_NOT_EXACT||0)+1;
     continue;
   }
   // Same old ID can mean different things across other questions: split rather
   // than rewriting the shared registry entry. One new ID for each q+concept.
   const assignmentKey=qid+'|'+concept+'|'+from;
   let replacement=newAssignments.get(assignmentKey);
   if(!replacement){
    replacement='IMG-'+qid+'-CTX-'+sha(Buffer.from(assignmentKey)).slice(0,12).toUpperCase();
    if(known.has(replacement))throw Error('NEW_MEDIA_ID_COLLISION:'+replacement);
    const clone={...structuredClone(regEntry),mediaId:replacement,
      status:'APPROVED',temporary:true,
      urlOrPath:asset.urlOrPath,sha256:asset.sha256,
      assets:[{path:asset.urlOrPath,sha256:asset.sha256}],
      integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
      humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
      provenance:{...asset.provenance},
      splitAudit:{sourceMediaId:from,questionId:qid,semanticTarget:concept,
       sourceRegistrySemantic:regEntry.semantic,reason:'SAME_ID_USED_IN_MULTIPLE_CONTEXTS',
       previewOnly:true,sourceModule,crossModuleExact:crossModule,originalAsset:regEntry.urlOrPath}};
    nextRegistry.entries.push(clone);
    known.add(replacement);
    newAssignments.set(assignmentKey,replacement);
    report.createdIds.push({moduleId:module,questionId:qid,from,to:replacement,concept,sourceModule,crossModule,sourceImage:asset.urlOrPath});
   }
   n[key]=replacement;
   changes.push({questionId:qid,from,to:replacement,concept,sourceModule,crossModule,field:key});
  }
  for(const v of Object.values(n))if(v&&typeof v==='object')visit(v,qid);
 }
 for(const q of doc.items)visit(q,q.item_id);
 // QA only: assign exact pinned color PNGs to the actual seven visible
 // cards, not to unrelated metadata. Purple has no exact PNG and stays pending.
 // Preserve labels, item IDs, group IDs, distractor order and answer key.
 const colorBindings=[];
 if(module==='Y1M03'){
  const q020=doc.items.find(q=>q.item_id==='Y1M03-Q020');
  const originalQ020=originalDoc.items.find(q=>q.item_id==='Y1M03-Q020');
  const allowed=new Set(['red','blue','yellow','green','black','white','orange']);
  assert.equal(q020?.mechanicId,'drag-drop','Q020_MECHANIC_CHANGED');
  assert.deepEqual(q020.items.map(x=>[x.id,x.semanticTarget,x.groupId]),
   originalQ020.items.map(x=>[x.id,x.semanticTarget,x.groupId]),'Q020_GROUP_CONTRACT_CHANGED');
  for(const card of q020.items){
   const concept=String(card.semanticTarget||'').trim().toLowerCase();
   if(!allowed.has(concept)){
    if(concept==='purple')report.skippedCounts.Q020_PURPLE_SOURCE_REQUIRED=(report.skippedCounts.Q020_PURPLE_SOURCE_REQUIRED||0)+1;
    else throw Error('Q020_UNEXPECTED_COLOR:'+concept);
    continue;
   }
   if(card.media||card.assetId)throw Error('Q020_ALREADY_HAS_CARD_MEDIA:'+card.id);
   const chosen=chooseAuditedAsset('Y1M03',concept);
   if(!chosen||chosen.crossModule||String(chosen.asset.semantic||'').trim().toLowerCase()!==concept)
    throw Error('Q020_EXACT_COLOR_MEDIA_MISSING:'+concept);
   card.media={assetId:chosen.asset.mediaId,role:'OPTION',
    semanticTarget:concept,mustInclude:concept};
   colorBindings.push({moduleId:module,questionId:q020.item_id,
    cardId:card.id,concept,mediaId:chosen.asset.mediaId,source:chosen.asset.urlOrPath});
  }
  assert.equal(colorBindings.length,7,'Q020_EXPECTED_SEVEN_AUDITED_COLOR_CARD_ASSETS');
  report.groupingCardBindings.push(...colorBindings);
 }
 if(changes.length||colorBindings.length){
  assert.deepEqual(mediaMask(doc),mediaMask(originalDoc),'NON_MEDIA_FIELD_CHANGED:'+module);
  const data=Buffer.from(JSON.stringify(doc,null,2)+'\n');
  updates.set(rel,data);
  report.questionFilesModified.push({moduleId:module,questionFile:rel,sha256Before:sha(bytes),sha256After:sha(data),changes:changes.length,extraGroupingCardMedia:colorBindings.length});
  report.modifiedReferences.push(...changes);
  report.byModule[module]={occurrences:changes.length,extraGroupingCardMedia:colorBindings.length,newIds:changes.reduce((a,x)=>a.add(x.to),new Set()).size};
 }
}
assert.equal(count,600);
if(!report.createdIds.length)throw Error('NO_SEMANTICALLY_VERIFIED_DESTINATION_OCCURRENCES');
// The single legacy Y1M04 pencil-case shared ID can be reused safely only
// after proving every actual usage in all 600 questions is the exact same noun.
// This is NOT a general-purpose alias or cross-module registry substitution.
const normalizeCase=v=>String(v||'').normalize('NFKC').toLowerCase().trim().replaceAll('-',' ').replace(/\s+/g,' ');
const originalCase=originalById.get(pencilCaseId),mappedCase=imported.get('Y1M04|pencil case');
if(originalCase?.temporary===true&&mappedCase){
 if(!pencilCaseUsages.length||pencilCaseUsages.some(u=>u.moduleId!=='Y1M04'||
  normalizeCase(u.semantic)!=='pencil case'||normalizeCase(u.mustInclude)!=='pencil case'))
   throw Error('PENCIL_CASE_SHARED_ID_HAS_AMBIGUOUS_MEANING');
 const pos=nextRegistry.entries.findIndex(e=>e.mediaId===pencilCaseId);
 if(pos<0)throw Error('PENCIL_CASE_REGISTRY_ID_MISSING');
 const existing=nextRegistry.entries[pos];
 if(existing.provenance)throw Error('PENCIL_CASE_ALREADY_REPLACED');
 nextRegistry.entries[pos]={...existing,urlOrPath:mappedCase.urlOrPath,
  status:'APPROVED',temporary:true,sha256:mappedCase.sha256,
  assets:[{path:mappedCase.urlOrPath,sha256:mappedCase.sha256}],
  provenance:{...mappedCase.provenance},
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  replacementAudit:{previewOnly:true,reason:'VERIFIED_LEXICAL_ALIAS_PENCIL_CASE',
   sourceMediaId:pencilCaseId,usageCount:pencilCaseUsages.length}};
 report.globalAliasFixes=[{mediaId:pencilCaseId,verifiedOccurrences:pencilCaseUsages.length,
  semantic:'pencil case',image:mappedCase.urlOrPath}];
}
const regBytes=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');updates.set(registryRel,regBytes);
for(const [rel,data] of updates){
  await writeFile(path.join(DIST,rel),data);manifest.set(rel,sha(data));
}
const nextManifest=[...manifest].map(([p,h])=>p+' '+h).join('\n')+'\n';
await writeFile(mf,nextManifest);
for(const [p,h] of manifest)assert.equal(sha(await readFile(path.join(DIST,p))),h,'FINAL_HASH_FAILED:'+p);
report.manifestSha256=sha(Buffer.from(nextManifest));
report.totalNewMediaIds=report.createdIds.length;
report.totalQuestionMediaOccurrencesRebound=report.modifiedReferences.length;
report.crossModuleExactReuses=report.modifiedReferences.filter(x=>x.crossModule).length;
report.exactColorGroupingCardBindings=report.groupingCardBindings.length;
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/assets-duduq-occurrence-scoped-repair.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_OCCURRENCE_SCOPED_MEDIA_REPAIR='+JSON.stringify({status:'QA_PREVIEW_ONLY',sourcePngs:imported.size,
  newMediaIds:report.totalNewMediaIds,occurrences:report.totalQuestionMediaOccurrencesRebound,byModule:report.byModule,
  crossModuleExactReuses:report.crossModuleExactReuses,
  exactColorGroupingCardBindings:report.exactColorGroupingCardBindings,
  forbiddenFieldsChanged:0,questionsChecked:count,productionUntouched:true}));

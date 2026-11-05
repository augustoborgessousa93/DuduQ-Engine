import {createHash} from 'node:crypto';

export const MODULE_ID='Y3M04';
export const MODULE_PATH='content/english/year-3/module-04/questions.json';
export const REGISTRY_PATH='content/english/media/media-registry.json';
export const BUNDLE_REL='qa/media-candidates/y3m04-official-20261105';
export const MEDIA_FIELDS=new Set(['assetId','mediaId','image_ref','imageRef']);

export const EXPECTED={
  questions:20,
  sourceIds:36,
  logicalUsageRecords:71,
  rawReferenceFields:337,
  finalIds:67,
  reviewAssets:30,
  uniquePngs:30,
  sourceQuestionSha256:'9b188f3def974c6fd3629a9c912f45aa9508180692febbf56f112187fa2d2ba7',
  sourceQuestionInvariantSha256:'2125ae6dc1d7d5057bee34859d0898ef96ea1c235ff08eb8dd5e5c5b86934886',
  generationRegistrySha256:'f11c12fe929379947e7d4f76736f8f73bc6320618bf01265bfb48a4e18ef5e30',
  generationRegistryEntries:1225,
  generationCompiledManifestSha256:'c66f6db5dd24f322966ee6c9868449bac34fcf87b3e96ff1b766b4f9eeee71ab',
  cleanV26RegistrySha256:'aa615a3ed307b0e8cae6abf6901a1582c22ab59aa7f95c6339a635ca7d35fc89',
  cleanV26RegistryEntries:1159,
  cleanV26CompiledManifestSha256:'5993aaceaff272626c863aef07e1b33a909ca7f9fcc41d2d40890baa6c08b822',
  sourceRegistryEntryProjectionSha256:'d9619f2878b00423209ac859f992e0d4106bc7d6b6b7f313971006d736d3cf02',
  candidateManifestSha256:'7404e01764414048cdadfa57b52b535d28bd78d3e56117aacc90980bb8c0c4e5',
  generationManifestSha256:'6ad2f23e3fb97b94fa468c2cf3fe67b49fb5cdd60430c996f8c2a865db986b17',
  generationSemanticSha256:'c53c06fe10a75485b873e30b5126ead2e5fc97b86aeed5afd8576e266226e37e',
  bindingPlanSha256:'214302c3339fd5a899a888a29306385905409b3f89473640b748f28a1f2b052d',
  questionInventorySha256:'ca80e651f3827421e49711551ba8aa9d376cb9ebf4b0bde8f7d94af17bd1eeac',
  sourcePinSha256:'169da7d23487d0a7ef0d6df71daed48c9e7c29ae03b174c0bd6fe782b28825c2',
  alphaAuditSha256:'d799411fa2fac6c87b7318be94fa028395531cfdb9bb1c3710a3cfda4c72f245',
  pngValidationSha256:'cf4f5a5dbc72ea3cd65c63b1c1364de9ba21525e75797be89bfe6e629bac344e'
};

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');

export function withoutVisualMediaIds(node){
  if(Array.isArray(node))return node.map(withoutVisualMediaIds);
  if(!node||typeof node!=='object')return node;
  const output={};
  for(const [key,value] of Object.entries(node))
    output[key]=MEDIA_FIELDS.has(key)&&typeof value==='string'&&value.length>0?'<MEDIA_ID>':withoutVisualMediaIds(value);
  return output;
}

export function locate(question,field){
  const parts=[...field.matchAll(/([A-Za-z0-9_]+)|\[(\d+)\]/g)].map(match=>match[1]??Number(match[2]));
  let node=question;
  for(const part of parts.slice(0,-1))node=node?.[part];
  return {node,key:parts.at(-1)};
}

export function structuralDiff(a,b,prefix=''){
  if(Object.is(a,b))return [];
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return [prefix];
  return [...new Set([...Object.keys(a),...Object.keys(b)])]
    .flatMap(key=>structuralDiff(a[key],b[key],prefix+(prefix?'.':'')+key));
}

export function parseIntegrity(bytes){
  const lines=bytes.toString('utf8').trimEnd().split(/\r?\n/),entries=new Map();
  lines.forEach((line,index)=>{
    const split=line.lastIndexOf(' '),name=line.slice(0,split),hash=line.slice(split+1);
    if(split<1||entries.has(name)||!/^[a-f0-9]{64}$/.test(hash))throw Error('BAD_COMPILED_MANIFEST:'+name);
    entries.set(name,{sha:hash,index});
  });
  return {lines,entries};
}

export function collectReferenceFields(question,allowedIds,records=[]){
  const questionId=question?.item_id,moduleId=questionId?.slice(0,5);
  if(!/^Y[1-5]M0[1-6]-Q\d{3}$/.test(questionId||''))throw Error('INVALID_QUESTION_ID:'+questionId);
  function walk(node,field=''){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach((value,index)=>walk(value,field+`[${index}]`));return;}
    const declaredSemantic=node.semanticTarget??node.media?.semanticTarget??null;
    for(const [key,value] of Object.entries(node)){
      const child=field?field+'.'+key:key;
      if(MEDIA_FIELDS.has(key)&&typeof value==='string'&&(!allowedIds||allowedIds.has(value)))
        records.push({questionId,moduleId,field:child,mediaId:value,declaredSemantic});
      if(value&&typeof value==='object')walk(value,child);
    }
  }
  walk(question);
  return records;
}

export function deriveOccurrenceGroups(questions,sourceIds){
  const records=[];
  for(const question of questions.items||[])collectReferenceFields(question,sourceIds,records);
  const groups=new Map();
  for(const record of records){
    const key=record.mediaId+'\0'+record.questionId;
    if(!groups.has(key))groups.set(key,{sourceMediaId:record.mediaId,questionId:record.questionId,fields:[]});
    groups.get(key).fields.push(record.field);
  }
  return {records,groups:[...groups.values()].map(group=>({...group,fields:[...new Set(group.fields)].sort()}))
    .sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.sourceMediaId.localeCompare(b.sourceMediaId))};
}

export function nodeContainsMediaId(node,mediaId){
  if(!node||typeof node!=='object')return false;
  if(Array.isArray(node))return node.some(value=>nodeContainsMediaId(value,mediaId));
  return Object.entries(node).some(([key,value])=>MEDIA_FIELDS.has(key)&&value===mediaId||
    value&&typeof value==='object'&&nodeContainsMediaId(value,mediaId));
}

export function allBindings(manifest){
  return (manifest.assets||[]).flatMap(asset=>(asset.bindings||[]).map(binding=>({asset,...binding})));
}

export function bindingKey(sourceMediaId,questionId){return sourceMediaId+'\0'+questionId;}

export function buildReviewManifest(generationManifest,{sourceRegistryRebaseSha256,integrationSemanticSha256}){
  const review=structuredClone(generationManifest);
  Object.assign(review,{
    schemaVersion:'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1',
    lane:'integration',
    status:'HASH_BOUND_REUSE_CANDIDATE_BUNDLE_READY_FOR_ISOLATED_INTEGRATION_QA',
    originalAuditedPendingIds:EXPECTED.sourceIds,
    finalBindingIds:EXPECTED.finalIds,
    totalQuestionUsageRecords:EXPECTED.logicalUsageRecords,
    generationManifestEvidence:'generation-batch-manifest.json',
    generationManifestSha256:EXPECTED.generationManifestSha256,
    generationSemanticEvidence:'generation-semantic-evidence.json',
    generationSemanticSha256:EXPECTED.generationSemanticSha256,
    sourceRegistryRebaseEvidence:'source-registry-rebase.json',
    sourceRegistryRebaseEvidenceSha256:sourceRegistryRebaseSha256,
    integrationSemanticEvidence:'integration-semantic-evidence.json',
    integrationSemanticEvidenceSha256:integrationSemanticSha256,
    applicationStatus:'NOT_APPLIED',
    integrationStatus:'READY_FOR_INDEPENDENT_INTEGRATION_LANE',
    integrated:false,productionApproved:false,approvalFlagsChanged:false
  });
  review.assets=(generationManifest.assets||[]).map(asset=>({...structuredClone(asset),
    reviewEvidence:BUNDLE_REL+'/integration-semantic-evidence.json'}));
  return review;
}

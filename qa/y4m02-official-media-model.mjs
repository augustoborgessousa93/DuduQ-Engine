import {createHash} from 'node:crypto';

export const MODULE_ID='Y4M02';
export const MODULE_PATH='content/english/year-4/module-02/questions.json';
export const REGISTRY_PATH='content/english/media/media-registry.json';
export const BUNDLE_REL='qa/media-candidates/y4m02-official-20261106';
export const MEDIA_FIELDS=new Set(['assetId','mediaId','image_ref','imageRef']);

export const EXPECTED={
  questions:20,
  sourceIds:39,
  logicalUsageRecords:94,
  rawReferenceFields:416,
  finalIds:78,
  reviewAssets:22,
  uniquePngs:22,
  sourceQuestionSha256:'ad303063d8044abdd86d9d71bef5b8a3bc93ad7a18eaa27a4d2dd56cbf7d3f77',
  sourceQuestionInvariantSha256:'1b1c30e8bffc479b7df4c101c0cf39fedf61e69d22de351033ce89881917edfa',
  generationRegistrySha256:'f11c12fe929379947e7d4f76736f8f73bc6320618bf01265bfb48a4e18ef5e30',
  generationRegistryEntries:1225,
  generationCompiledManifestSha256:'c66f6db5dd24f322966ee6c9868449bac34fcf87b3e96ff1b766b4f9eeee71ab',
  cleanV26RegistrySha256:'aa615a3ed307b0e8cae6abf6901a1582c22ab59aa7f95c6339a635ca7d35fc89',
  cleanV26RegistryEntries:1159,
  cleanV26CompiledManifestSha256:'5993aaceaff272626c863aef07e1b33a909ca7f9fcc41d2d40890baa6c08b822',
  sourceRegistryEntryProjectionSha256:'683eab3bcd217167dc7437bf82e3f8573868132de1e17b61276fdf3e76828858',
  candidateManifestSha256:'295967a35de3a946423e1fa4c7aab65589ccc458e5c97a1e5b4b7f9f34de9b77',
  generationManifestSha256:'a12e8c1e9b17e383568090015509767657eef04831c5f37772415315f286e74c',
  generationSemanticSha256:'e18eda16cc8bc960bdd26c914f413a94bbe9dcec0cddd6fcc6eeff5351bb01cf',
  bindingPlanSha256:'3955c4f2941379067e3e18fdbc69cfe3e9437420db762d7d38f6ad610c00870a',
  questionInventorySha256:'b9b2d39615f0254885e6c865e638e23c7a6fae10dce1636965a5874c79a0ccb0',
  sourcePinSha256:'149490eb18e1cdd31b0f70d8792b76ede187d30675b69ef38d6d782f6bcbf093',
  alphaAuditSha256:'0e1eb3edf5fd84a36b67f0b1860719dfbb6c729e55f18c79a6eefa114890c695',
  pngValidationSha256:'4f7c1ef645a975070ba7f01ef57dcb6b7b1769011d94dcf9bce74da28a67888b'
};

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
// Git may materialize tracked JSON as CRLF on Windows. Evidence hashes are
// pinned to the repository's canonical LF form, so normalize only text
// evidence before hashing; compiled artifacts and PNGs remain byte-exact.
export const canonicalTextBytes=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
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

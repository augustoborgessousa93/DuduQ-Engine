import {createHash} from 'node:crypto';

export const MODULE_ID='Y3M03';
export const MODULE_PATH='content/english/year-3/module-03/questions.json';
export const REGISTRY_PATH='content/english/media/media-registry.json';
export const BUNDLE_REL='qa/media-candidates/y3m03-official-20261104';
export const MEDIA_FIELDS=new Set(['assetId','mediaId','image_ref','imageRef']);

export const EXPECTED={
  questions:20,
  sourceIds:29,
  logicalUsageRecords:74,
  rawReferenceFields:340,
  finalIds:66,
  reviewAssets:16,
  uniquePngs:16,
  sourceQuestionSha256:'66af094d150b6731774a567ae15581bd663dfa2842f247d4899644f1404a21ea',
  sourceQuestionInvariantSha256:'b4ef7c698c6fa46f8b792e31cd82c2c9f2522f89241941a5d6cc3b3b79cfadb2',
  generationRegistrySha256:'ce8b74d3087e513622ff1efc9a999536c98744578d1989b0222b427b33f9d1c2',
  generationRegistryEntries:1235,
  generationCompiledManifestSha256:'fa3464d4d16b0d3d2802545a8b32af648dd113628039b3aee67f938aef697c46',
  cleanV26RegistrySha256:'aa615a3ed307b0e8cae6abf6901a1582c22ab59aa7f95c6339a635ca7d35fc89',
  cleanV26RegistryEntries:1159,
  cleanV26CompiledManifestSha256:'5993aaceaff272626c863aef07e1b33a909ca7f9fcc41d2d40890baa6c08b822',
  sourceRegistryEntryProjectionSha256:'aaa645770822e222c23112ab775e434a43bbe4c493452b022b2370563b0b3c22',
  generationManifestSha256:'a9177cf041eaa6e7c04d4a679ed7f7e085d9215035ff02c1d0cb00128024cf76',
  generationSemanticSha256:'55e4169e88c3628d64049d5affa24bf6e072607d40c9f0210c38d3bb89038d6c',
  bindingPlanSha256:'a1685fd5914090c4572a8e338f312f8aa1169321f721ab21a1932e53c0c8a8a2',
  questionInventorySha256:'2687c31aa163323d962effe2360b6d10ad0d25df1a5e0b18c4f3a1746ae1551f',
  sourcePinSha256:'3f50887e34129194233a234740f25ecfd86d126db009695727066041ad8fd84a',
  alphaAuditSha256:'f70bd7f1358cf6fe6f84041bcc55033add8e49335fadfcc1a5983ea2344ab24c',
  pngValidationSha256:'bef821da312b348eb3f2c180d56db9d6f650ba20ce1713b17b88e6d9ef0b166d'
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
    status:'HASH_BOUND_REUSE_CANDIDATE_BUNDLE_READY_FOR_ISOLATED_INTEGRATION_QA',
    generationManifestEvidence:'generation-batch-manifest.json',
    generationManifestSha256:EXPECTED.generationManifestSha256,
    generationSemanticEvidence:'generation-semantic-evidence.json',
    generationSemanticSha256:EXPECTED.generationSemanticSha256,
    sourceRegistryRebaseEvidence:'source-registry-rebase.json',
    sourceRegistryRebaseEvidenceSha256:sourceRegistryRebaseSha256,
    integrationSemanticEvidence:'integration-semantic-evidence.json',
    integrationSemanticEvidenceSha256:integrationSemanticSha256,
    integrated:false,productionApproved:false,approvalFlagsChanged:false
  });
  review.assets=(generationManifest.assets||[]).map(asset=>({...structuredClone(asset),
    reviewEvidence:BUNDLE_REL+'/integration-semantic-evidence.json'}));
  return review;
}

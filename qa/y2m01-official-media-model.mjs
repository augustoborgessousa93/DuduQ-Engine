import {createHash} from 'node:crypto';

export const MODULE_ID='Y2M01';
export const MODULE_PATH='content/english/year-2/module-01/questions.json';
export const REGISTRY_PATH='content/english/media/media-registry.json';
export const BUNDLE_REL='qa/media-candidates/y2m01-official-20261031';
export const MEDIA_FIELDS=new Set(['assetId','mediaId','image_ref','imageRef']);

export const EXPECTED={
  questions:20,
  sourceIds:29,
  sourceUsageRecords:93,
  finalIds:57,
  splitRecords:93,
  reviewAssets:43,
  uniquePngs:28,
  cleanV26QuestionSha256:'257776f3d2a896a929db2233d3d238ba2f2881d652cdab0be82dae5c3519f432',
  cleanV26QuestionInvariantSha256:'b7cc44db6fdc6b597a963e01f59b1e6706f1a51031be282ae3b97e1529d97233',
  cleanV26RegistrySha256:'aa615a3ed307b0e8cae6abf6901a1582c22ab59aa7f95c6339a635ca7d35fc89',
  cleanV26RegistryEntries:1159,
  cleanV26ManifestSha256:'5993aaceaff272626c863aef07e1b33a909ca7f9fcc41d2d40890baa6c08b822',
  generationManifestSha256:'aee8df3a6f77df0e9a15a8397a441c4684fa70c926ecd912460f2a43cf62d139',
  generationSemanticSha256:'28ec96efed2f58b90333f735fb0b1671f7460e38ee6f78eb8b92034503f21fdf',
  bindingPlanSha256:'3037c930c73579e38989aa635c867755170c7a0f10b6c14503dc872ae443bbe2',
  questionInventorySha256:'e096a4c33c532afc5eff2df7903de25b44ce2e2f605f113b5324991f2ac6460e'
};

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');

export function withoutVisualMediaIds(node){
  if(Array.isArray(node))return node.map(withoutVisualMediaIds);
  if(!node||typeof node!=='object')return node;
  const output={};
  for(const [key,value] of Object.entries(node))
    output[key]=MEDIA_FIELDS.has(key)&&typeof value==='string'?'<MEDIA_ID>':withoutVisualMediaIds(value);
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

export function collectVisualUsages(question,allowedIds,usages=new Map()){
  const questionId=question?.item_id,moduleId=questionId?.slice(0,5);
  if(!/^Y[1-5]M0[1-6]-Q\d{3}$/.test(questionId||''))throw Error('INVALID_QUESTION_ID:'+questionId);
  function walk(node,field=''){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach((value,index)=>walk(value,field+`[${index}]`));return;}
    for(const [key,value] of Object.entries(node)){
      const child=field?field+'.'+key:key;
      if(MEDIA_FIELDS.has(key)&&typeof value==='string'&&(!allowedIds||allowedIds.has(value))){
        if(!usages.has(value))usages.set(value,[]);
        usages.get(value).push({questionId,moduleId,field:child,semanticTarget:node.semanticTarget??null});
      }else if(value&&typeof value==='object')walk(value,child);
    }
  }
  walk(question);
  return usages;
}

export function contextMediaId({sourceMediaId,questionId,semanticTarget}){
  const digest=sha256(Buffer.from(sourceMediaId+'|'+questionId+'|'+normalize(semanticTarget))).slice(0,12).toUpperCase();
  return `IMG-${questionId}-CTX-${digest}`;
}

export function deriveOccurrenceGroups(questions,sourceIds){
  const usages=new Map();
  for(const question of questions.items||[])collectVisualUsages(question,sourceIds,usages);
  const groups=new Map();
  for(const sourceMediaId of [...sourceIds].sort())for(const record of usages.get(sourceMediaId)||[]){
    if(!record.semanticTarget)throw Error('Y2M01_MISSING_OCCURRENCE_SEMANTIC:'+sourceMediaId+':'+record.questionId+':'+record.field);
    const key=sourceMediaId+'\0'+record.questionId+'\0'+record.semanticTarget;
    if(!groups.has(key))groups.set(key,{sourceMediaId,questionId:record.questionId,
      semanticTarget:record.semanticTarget,newMediaId:contextMediaId({sourceMediaId,...record}),fields:[]});
    groups.get(key).fields.push(record.field);
  }
  return {usages,groups:[...groups.values()].sort((a,b)=>a.questionId.localeCompare(b.questionId)||
    a.sourceMediaId.localeCompare(b.sourceMediaId)||a.semanticTarget.localeCompare(b.semanticTarget))};
}

export function allBindings(manifest){
  return (manifest.assets||[]).flatMap(asset=>(asset.bindings||[]).map(binding=>({asset,...binding})));
}

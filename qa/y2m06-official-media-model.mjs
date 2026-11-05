import {createHash} from 'node:crypto';

export const MODULE_ID='Y2M06';
export const MODULE_PATH='content/english/year-2/module-06/questions.json';
export const REGISTRY_PATH='content/english/media/media-registry.json';
export const BUNDLE_REL='qa/media-candidates/y2m06-official-20261102';
export const PLAN_REL='qa/results/y2m06-official-media-binding-plan.json';
export const MEDIA_FIELDS=new Set(['assetId','mediaId','image_ref','imageRef']);

export const EXPECTED={
  questions:20,
  sourceIds:56,
  logicalUsageRecords:106,
  finalIds:94,
  actualMediaFieldSplits:488,
  guardedUsageRecords:296,
  reviewAssets:29,
  uniquePngs:29,
  cleanV26QuestionSha256:'b3199e7be552ca42ce01138eacf96967cd245be79557cace8d39e3a3fcc0cc62',
  cleanV26QuestionInvariantSha256:'ddb5c5ecda9fb85994c5c3529c26be9f73b9a5696e1458d8bb7881fc72f62ad1',
  cleanV26RegistrySha256:'aa615a3ed307b0e8cae6abf6901a1582c22ab59aa7f95c6339a635ca7d35fc89',
  cleanV26RegistryEntries:1159,
  cleanV26ManifestSha256:'5993aaceaff272626c863aef07e1b33a909ca7f9fcc41d2d40890baa6c08b822',
  legacyReviewedRegistrySha256:'ce8b74d3087e513622ff1efc9a999536c98744578d1989b0222b427b33f9d1c2',
  legacyReviewedRegistryEntries:1235,
  sourceEntryProjectionSha256:'6f6fd68e79af7946404c07b8b46b817bb510b51d1b6e355f4cd6ffc7b2940270',
  generationManifestSha256:'7bd9ae25c57c72cb7aae085daf047b9e57a0a927b580999634b4f4530c9bc416',
  generationSemanticSha256:'2b7481249bb855bbb984fbec26b2d0b9b4061ef5a14831a808d85e3b8a838347',
  bindingPlanSha256:'ac2ffe3ea473adbb4bfe229710d99458f4ae33213f3af807c667db8530691480',
  questionInventorySha256:'d4a04bd6fbb127c37a03884e4b8f1285c33670b25ed52d39077f85a9c1ef2515',
  sourceRegistryPinSha256:'ec8d78ada0a337006523f69f5a3c4854fa89fd947bc1335e79acdaefb1d97260'
};

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const canonicalLfSha256=bytes=>sha256(Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')));
export const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');

export function withoutVisualMediaIds(node){
  if(Array.isArray(node))return node.map(withoutVisualMediaIds);
  if(!node||typeof node!=='object')return node;
  const output={};
  for(const [key,value] of Object.entries(node))
    output[key]=MEDIA_FIELDS.has(key)&&typeof value==='string'&&value.startsWith('IMG-')?'<MEDIA_ID>':withoutVisualMediaIds(value);
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

export function allBindings(manifest){
  return (manifest.assets||[]).flatMap(asset=>(asset.bindings||[]).map(binding=>({asset,...binding})));
}

export function bindingKey(questionId,sourceMediaId){return questionId+'\0'+sourceMediaId;}

export function collectMediaFieldSplits(questions,bindings){
  const byContext=new Map();
  for(const binding of bindings){
    const key=bindingKey(binding.questionId,binding.splitFromMediaId);
    if(byContext.has(key))throw Error('AMBIGUOUS_Y2M06_CONTEXT_BINDING:'+key.replace('\0',':'));
    byContext.set(key,binding);
  }
  const splits=[];
  for(const question of questions.items||[]){
    function walk(node,field=''){
      if(!node||typeof node!=='object')return;
      if(Array.isArray(node)){node.forEach((value,index)=>walk(value,field+`[${index}]`));return;}
      for(const [key,value] of Object.entries(node)){
        const child=field?field+'.'+key:key;
        if(MEDIA_FIELDS.has(key)&&typeof value==='string'){
          const binding=byContext.get(bindingKey(question.item_id,value));
          if(binding)splits.push({questionId:question.item_id,field:child,from:value,to:binding.mediaId,
            semanticTarget:binding.asset.semanticTarget});
        }else if(value&&typeof value==='object')walk(value,child);
      }
    }
    walk(question);
  }
  return splits.sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.field.localeCompare(b.field));
}

import {createHash} from 'node:crypto';

export const MODULE_ID='Y1M06';
export const MODULE_PATH='content/english/year-1/module-06/questions.json';
export const REGISTRY_PATH='content/english/media/media-registry.json';
export const BUNDLE_REL='qa/media-candidates/y1m06-official-20261030';

export const EXPECTED={
  questions:20,
  sourceIds:93,
  usageRecords:93,
  finalIds:93,
  assets:22,
  splits:6,
  cleanV26QuestionSha256:'31d4cc0be48882dfd405cca0f8cb2b708c6f6d3d201fab71ad94e757e771e4b5',
  cleanV26QuestionInvariantSha256:'1ce8860d805daf65293951183eb1a461b65a1c93c3c9b2ce8c1b34912d33b15d',
  cleanV26RegistrySha256:'aa615a3ed307b0e8cae6abf6901a1582c22ab59aa7f95c6339a635ca7d35fc89',
  cleanV26RegistryEntries:1159,
  cleanV26ManifestSha256:'5993aaceaff272626c863aef07e1b33a909ca7f9fcc41d2d40890baa6c08b822',
  sourceRegistryEntryProjectionSha256:'be6d7f0d999d1c0c7081315df4b26a0fd41309a401da7253434c5a2828cd0e38',
  sourceUsageProjectionSha256:'302d698ca908d2e204d90d21ef80531cd7a666c78a91f7328973d103f51d0e28',
  registryEntriesOutsideY1M04:1076,
  registryEntriesOutsideY1M04Sha256:'e1e444bdffaf308d38bcb22bd0a950468c6c95c3bd88bf2ecb7d4b35b6c0af92',
  generationManifestSha256:'8f79609976a5987b2787d461856c8d78b759496b7b44c5e298a9a3bf503c5796',
  generationSemanticSha256:'d7be56d12bc6f4faaf2882b5661c353c817b4b7156852695f3625914938f723f'
};

export const SPLITS=[
  {questionId:'Y1M06-Q001',field:'targets[0].media.assetId',from:'IMG-Y1M06-Q001-DOG',to:'IMG-Y1M06-Q001-T1-DOG',semanticTarget:'dog',externalModule:'Y2M05'},
  {questionId:'Y1M06-Q001',field:'targets[1].media.assetId',from:'IMG-Y1M06-Q001-CAT',to:'IMG-Y1M06-Q001-T2-CAT',semanticTarget:'cat',externalModule:'Y2M05'},
  {questionId:'Y1M06-Q001',field:'targets[2].media.assetId',from:'IMG-Y1M06-Q001-FISH',to:'IMG-Y1M06-Q001-T3-FISH',semanticTarget:'fish',externalModule:'Y2M05'},
  {questionId:'Y1M06-Q001',field:'targets[3].media.assetId',from:'IMG-Y1M06-Q001-RABBIT',to:'IMG-Y1M06-Q001-T4-RABBIT',semanticTarget:'rabbit',externalModule:'Y2M05'},
  {questionId:'Y1M06-Q009',field:'mediaBindings[0].assetId',from:'IMG-Q009-BIG',to:'IMG-Y1M06-Q009-M1-BIG',semanticTarget:'big',externalModule:'Y2M06'},
  {questionId:'Y1M06-Q014',field:'pairs[3].b.media.assetId',from:'IMG-Y1M06-Q014-SMALL',to:'IMG-Y1M06-Q014-B4-SMALL',semanticTarget:'small',externalModule:'Y4M05'}
];

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const canonicalLfSha256=bytes=>sha256(Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')));

export function withoutMediaIds(node){
  if(Array.isArray(node))return node.map(withoutMediaIds);
  if(!node||typeof node!=='object')return node;
  const out={};
  for(const [key,value] of Object.entries(node)){
    out[key]=['assetId','mediaId','image_ref','imageRef'].includes(key)&&typeof value==='string'&&value.startsWith('IMG-')
      ?'<MEDIA_ID>':withoutMediaIds(value);
  }
  return out;
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

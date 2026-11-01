import {createHash} from 'node:crypto';

export const moduleId='Y1M02';
export const bundleRel='qa/media-candidates/y1m02-official-20261030';
export const questionsRel='content/english/year-1/module-02/questions.json';
export const registryRel='content/english/media/media-registry.json';
export const numberWords=['one','two','three','four','five','six','seven','eight','nine','ten'];
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

// Immutable source pins for replaying the Y1M02 overlay. The semantic review
// was originally recorded on a composed review registry; keep that historical
// hash as provenance, while independently proving the exact pristine V26
// question contract and the 92 registry entries that Y1M02 actually consumes.
export const sourcePin={
  cleanV26QuestionSha256:'f230e65de323b0182243f34038f3b17659785427c6fc05e29c893b624fb4061a',
  cleanV26QuestionInvariantSha256:'93a6e8294499c6a27d748ba42d283acdc10d533800c03f1eb2215c17a5dbf858',
  cleanV26RegistrySha256:'aa615a3ed307b0e8cae6abf6901a1582c22ab59aa7f95c6339a635ca7d35fc89',
  cleanV26RegistryEntries:1159,
  cleanV26ManifestSha256:'5993aaceaff272626c863aef07e1b33a909ca7f9fcc41d2d40890baa6c08b822',
  legacyReviewedRegistrySha256:'3527932cc326e35b5396b88e789b2d86cab9bf5fc9eb60efe1cb7b8648c08f36',
  legacyCanonicalClosureSha256:'775bd72bc8b9caaa13fb4f4afb2682fd44a7b2f20c60fab4c3511e9bfd29c8d2',
  sourceRegistryEntryProjectionSha256:'e6996c366e9f2806bdf6ab0f1b1a9136c89357146e4aec6bc5430844081bed8f',
  sourceUsageProjectionSha256:'bb47e4ba7364116b44071e4cbd69d06d27627d1f5da5e93455a1435deafb60c4',
  registryEntriesOutsideY1M04:1076,
  registryEntriesOutsideY1M04Sha256:'e1e444bdffaf308d38bcb22bd0a950468c6c95c3bd88bf2ecb7d4b35b6c0af92'
};

export const splits=[
  {questionId:'Y1M02-Q001',field:'targets[0].media.assetId',from:'IMG-Y1M02-Q001-ONE',to:'IMG-Y1M02-Q001-T1-ONE',semanticTarget:'one'},
  {questionId:'Y1M02-Q001',field:'targets[1].media.assetId',from:'IMG-Y1M02-Q001-TWO',to:'IMG-Y1M02-Q001-T2-TWO',semanticTarget:'two'},
  {questionId:'Y1M02-Q001',field:'targets[2].media.assetId',from:'IMG-Y1M02-Q001-THREE',to:'IMG-Y1M02-Q001-T3-THREE',semanticTarget:'three'},
  {questionId:'Y1M02-Q001',field:'targets[3].media.assetId',from:'IMG-Y1M02-Q001-FOUR',to:'IMG-Y1M02-Q001-T4-FOUR',semanticTarget:'four'},
  {questionId:'Y1M02-Q002',field:'bubbleDistractorPool[2].media.assetId',from:'IMG-Y1M02-Q002-FIVE',to:'IMG-Y1M02-Q002-D3-FIVE',semanticTarget:'five'},
  {questionId:'Y1M02-Q002',field:'bubbleDistractorPool[3].media.assetId',from:'IMG-Y1M02-Q002-SIX',to:'IMG-Y1M02-Q002-D4-SIX',semanticTarget:'six'},
  {questionId:'Y1M02-Q002',field:'bubbleDistractorPool[4].media.assetId',from:'IMG-Y1M02-Q002-SEVEN',to:'IMG-Y1M02-Q002-D5-SEVEN',semanticTarget:'seven'},
  {questionId:'Y1M02-Q002',field:'bubbleDistractorPool[5].media.assetId',from:'IMG-Y1M02-Q002-EIGHT',to:'IMG-Y1M02-Q002-D6-EIGHT',semanticTarget:'eight'},
  {questionId:'Y1M02-Q007',field:'bubbleDistractorPool[1].media.assetId',from:'IMG-Y1M02-Q007-NINE',to:'IMG-Y1M02-Q007-D2-NINE',semanticTarget:'nine'},
  {questionId:'Y1M02-Q007',field:'bubbleDistractorPool[2].media.assetId',from:'IMG-Y1M02-Q007-TEN',to:'IMG-Y1M02-Q007-D3-TEN',semanticTarget:'ten'},
  {questionId:'Y1M02-Q018',field:'mediaBindings[0].assetId',from:'IMG-Y1M02-Q007-NINE',to:'IMG-Y1M02-Q018-M1-NINE',semanticTarget:'nine'}
];
export const sharedSourceIds=[...new Set(splits.map(x=>x.from))].sort();
export const splitTargetIds=splits.map(x=>x.to).sort();

const sourceHashes={
  one:'db5c25dc3d048532af972dba45f58faf2158093beae6f3fb48ae3041f5900eec',
  two:'fe388324cd87df4ccab5791ffdb4e6b9e1dbe86306d4c44ffcdb24f2deb6fe6a',
  three:'f7d841143ad970661a842e33385aae4cc765860834b4e0cfc85761079da4ad4b',
  four:'eb9a66a2a51d34c01bb660918d1a30a43e80b92f539bb06bed8b8976ea4b148a',
  five:'3f7bfb852d53dd43ed1aa0e9051ff4f9f6cd36971da3470467d61b525b3eb4a5',
  six:'2a4e1df89aac1d90b8652fc98047f3b900213da886355e57ca2ea630c3f3ac90',
  seven:'cf8eaa0b36b46893e4b8ef2962f2ac42c5e806ef81d4426f907484fc0c3270cb',
  eight:'63fb7f3eb46635f62903a2790c7fdf3353433a0c738e1cd19b0f683455e19fe2',
  nine:'d606b31ad47da7e85f5294252146a6d682429f45f2db551f6b588bd4147ca23a',
  ten:'018be7f295443648fb6138b8f8aafedc3bd700badf550740a4a10ee819f1453f'
};
const finalHashes={
  one:'e65ad687b4d68c317b065a9fce4a7d3dfbd7cffbe45835899dd9826ccaf4d8f5',
  two:'f81a55d609c8318622a798e554f19e564fd23690bf5a117a1418a06a934a74df',
  three:'346c0cd7a52c9c2685187551e1fcb6a71721f2c53639e37f2a06fdb857939398',
  four:'d7e0f1fd9f5b565a62b75b0dcf8f07fb257096a33947c6ec6ee1fadd87c61505',
  five:'b12f817867e3fa002e1468cadbfdda80932b8965ae74e1255db41016f9b57eee',
  six:'d6482204a9c9caf61913193ac2369abd3e3681226568a0b4262fed3460faef66',
  seven:'b675fb761c6054b737cf35ba6b9d36e9fe50ed7a317ae07e4a3dc30000272667',
  eight:'f1f51c261a1662616fcdc24eff0cab7761aa886c48189ed48adee1c81129bf23',
  nine:'a49f122a9e0967699c4602ce5cd294ad228dff16bd644e9d906b26e9d87eae5c',
  ten:'2fd76a2d23ed7d7f835876bd92de3f079943ea10b3829ed8c880970f2e9b8d3b'
};
const finalSizes={one:[1536,1536],two:[1774,1536],three:[2172,1536],four:[1536,1536],five:[1536,1536],six:[1536,1536],seven:[1536,1536],eight:[1774,1536],nine:[1536,1536],ten:[1983,1536]};
const layouts={one:'one centered apple',two:'one row of two',three:'one row of three',four:'two rows of two',five:'three apples above two',six:'two rows of three',seven:'two above three above two',eight:'two rows of four',nine:'three rows of three',ten:'two rows of five'};
const nativePaths={
  one:'C:/Users/augus/.codex/generated_images/01a0ed15-a760-74f1-bc93-8b78f2b31b92/exec-615c1d8c-d53a-410b-92d3-810b5e307ead.png',
  two:'C:/Users/augus/.codex/generated_images/01a0ed15-a760-74f1-bc93-8b78f2b31b92/exec-507518ac-630d-4899-837c-9887309f1c9d.png',
  three:'C:/Users/augus/.codex/generated_images/01a0ed15-a760-74f1-bc93-8b78f2b31b92/exec-973f8377-462f-413a-a3ee-6f63192036c0.png',
  four:'C:/Users/augus/.codex/generated_images/01a0ed15-a760-74f1-bc93-8b78f2b31b92/exec-75ec55e9-377e-44ff-9c23-2d7cb5699747.png',
  five:'C:/Users/augus/.codex/generated_images/01a18c9c-1db8-70d1-8e0e-489a267a01d0/exec-e37a788c-eb54-40eb-be4d-d1226579f7c8.png',
  six:'C:/Users/augus/.codex/generated_images/01a18c9c-1db8-70d1-8e0e-489a267a01d0/exec-060beb1e-0529-4d2a-9f5e-7b78eb029ba1.png',
  seven:'C:/Users/augus/.codex/generated_images/01a18c9c-1db8-70d1-8e0e-489a267a01d0/exec-9552a280-02f8-4596-a6e9-7be977b063cd.png',
  eight:'C:/Users/augus/.codex/generated_images/01a18c9c-1db8-70d1-8e0e-489a267a01d0/exec-f1ebda1e-7abe-434b-a0d0-3376a523ef45.png',
  nine:'C:/Users/augus/.codex/generated_images/01a18c9c-1db8-70d1-8e0e-489a267a01d0/exec-5394898d-fd15-4d67-b233-d8f729543bc3.png',
  ten:'C:/Users/augus/.codex/generated_images/01a18c9c-1db8-70d1-8e0e-489a267a01d0/exec-b015a75b-c773-4db5-995c-f0b65b2ac683.png'
};

export function canonicalPrompt(word){
  const count=numberWords.indexOf(word)+1;
  return `Use case: stylized-concept\nAsset type: DUDUQ English educational quantity-card image for children ages 6-11\nPrimary request: exactly ${count} matching glossy red apple${count===1?'':'s'}, complete and individually countable, teaching the English quantity ${word}\nComposition: ${layouts[word]}, clear separation, every apple fully inside the canvas, generous transparent safe margin\nStyle: premium polished rounded 3D children's animation render, realistic glossy red apples with small green leaves, crisp silhouette\nLighting: soft bright studio lighting\nConstraints: one transparent PNG; no other countable objects; no cutoff; no overlap that obscures counting; no floor, cast shadow, glow, halo, vignette, backdrop, text, numeral, letters, symbols, logo, watermark, collage, grid or frame`;
}

export const assetDefinitions=numberWords.map((word,index)=>({
  word,count:index+1,code:word.toUpperCase(),assetKey:`Y1M02-OFFICIAL-${word.toUpperCase()}`,
  file:`images/DUDUQ-Y1M02-${word.toUpperCase()}.png`,originalFile:`provenance/originals/${word.toUpperCase()}-ORIGINAL.png`,
  sourceSha256:sourceHashes[word],finalSha256:finalHashes[word],width:finalSizes[word][0],height:finalSizes[word][1],
  expectedComponents:index+1,nativeSourceLocalPath:nativePaths[word],
  generationClass:index<4?'REUSED_NATIVE_20261030_PROVEN_BY_CODEX_HOME_EXACT_HASH':'NATIVE_IMAGEGEN_THIS_SESSION',
  originalPromptRecordStatus:index<4?'ORIGINAL_PROMPT_NOT_PERSISTED_CANONICAL_SPEC_RECONSTRUCTED':'EXACT_SESSION_PROMPT_RECORDED',
  prompt:canonicalPrompt(word)
}));

export function locate(question,field){
  const parts=[...field.matchAll(/([A-Za-z0-9_]+)|\[(\d+)\]/g)].map(x=>x[1]??Number(x[2]));
  let node=question;for(const part of parts.slice(0,-1))node=node?.[part];return {node,key:parts.at(-1)};
}
export function withoutMediaIds(node){
  if(Array.isArray(node))return node.map(withoutMediaIds);
  if(!node||typeof node!=='object')return node;
  const out={};for(const [key,value] of Object.entries(node))out[key]=['assetId','mediaId','image_ref','imageRef'].includes(key)&&typeof value==='string'&&value.startsWith('IMG-')?'<MEDIA_ID>':withoutMediaIds(value);
  return out;
}
export function applyOccurrenceSplits(source,{semanticMatcher}={}){
  const questions=structuredClone(source),changes=[];
  for(const split of splits){
    const question=questions.items.find(x=>x.item_id===split.questionId);if(!question)throw Error('SPLIT_QUESTION_MISSING:'+split.questionId);
    const {node,key}=locate(question,split.field);if(node?.[key]!==split.from)throw Error('SPLIT_OCCURRENCE_CHANGED:'+split.from+':'+split.questionId);
    if(semanticMatcher&&!semanticMatcher(node?.semanticTarget,split.semanticTarget))throw Error('SPLIT_SEMANTIC_CHANGED:'+split.from+':'+split.questionId);
    node[key]=split.to;changes.push({...split});
  }
  return {questions,changes};
}
export function diffObjects(a,b,p=''){
  if(Object.is(a,b))return [];
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return [p];
  return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>diffObjects(a[key],b[key],p+(p?'.':'')+key));
}
export function splitDiffPaths(source){
  return splits.map(split=>{const i=source.items.findIndex(x=>x.item_id===split.questionId);if(i<0)throw Error('SPLIT_QUESTION_MISSING:'+split.questionId);return `items.${i}.${split.field.replaceAll('[','.').replaceAll(']','')}`;}).sort();
}

#!/usr/bin/env node
/**
 * Build the hash-bound Y1M05 native-image bundle from reviewed PNGs.
 * This writes evidence only; it does not modify questions, registry entries,
 * runtime files, Gold Masters, or production.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd();
const bundleRel='qa/media-candidates/y1m05-official-20261030';
const bundle=path.join(root,bundleRel);
const questionsRel='content/english/year-1/module-05/questions.json';
const questionsPath=path.join(root,'dist-pages',questionsRel);
const registryPath=path.join(root,'dist-pages/content/english/media/media-registry.json');
const evidenceRel=bundleRel+'/semantic-evidence.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

const splits=[
  {questionId:'Y1M05-Q001',field:'options[0].media.assetId',from:'IMG-Y1M05-Q001-HEAD',to:'IMG-Y1M05-Q001-O1-HEAD',semanticTarget:'head'},
  {questionId:'Y1M05-Q001',field:'options[1].media.assetId',from:'IMG-Y1M05-Q001-HANDS',to:'IMG-Y1M05-Q001-O2-HANDS',semanticTarget:'hands'},
  {questionId:'Y1M05-Q001',field:'options[2].media.assetId',from:'IMG-Y1M05-Q001-LEGS',to:'IMG-Y1M05-Q001-O3-LEGS',semanticTarget:'legs'},
  {questionId:'Y1M05-Q001',field:'options[3].media.assetId',from:'IMG-Y1M05-Q001-ARMS',to:'IMG-Y1M05-Q001-O4-ARMS',semanticTarget:'arms'},
  {questionId:'Y1M05-Q003',field:'pairs[3].b.media.assetId',from:'IMG-Y1M05-Q003-FEET',to:'IMG-Y1M05-Q003-B4-FEET',semanticTarget:'feet'}
];

const prompts={
  head:"One friendly school-age child's head and upper shoulders, clear frontal close-up emphasizing the head; premium rounded 3D cartoon for children ages 6–11, vivid natural colors, crisp silhouette. Square transparent PNG, subject fully visible with clear margin. One child only; no hands, extra people, unrelated objects, text, watermark, collage, grid or opaque background.",
  hands:`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: exactly two open human hands, clearly teaching the English word "hands"\nSubject: a matched pair of friendly child hands with five natural fingers each, palms facing forward, wrists included, no other body parts\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette, vivid natural skin tones\nComposition/framing: centered close-up, both hands fully visible and separated, large readable subject with generous safe margin\nLighting/mood: soft bright studio lighting, cheerful and neutral\nConstraints: one individual image; genuinely transparent background; accurate anatomy; no cutoff; no extra fingers; no missing fingers; no arms beyond short wrists; no face; no text; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame; no floor shadow`,
  arms:`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: a compact clear visual teaching the English word "arms"\nSubject: one friendly school-age child shown from chest upward with exactly two complete arms raised diagonally in a wide joyful V, elbows softly bent; both upper arms and forearms are fully visible and unmistakably emphasized, hands small and relaxed at the endpoints\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette, simple blue short-sleeve shirt\nComposition/framing: compact nearly square centered front view, both arms entirely inside the canvas with at least 10 percent transparent safe margin on every side\nLighting/mood: soft bright studio lighting, cheerful and neutral\nConstraints: one child only; one individual image; genuinely transparent background with every background pixel fully transparent; accurate anatomy; exactly two arms; no extra limbs; no props; no floor; no cast shadow; no glow; no halo; no vignette; no text; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame`,
  legs:`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: a clear visual teaching the English word "legs"\nSubject: one friendly school-age child lower body from shorts to simple sneakers, standing naturally with exactly two complete legs; thighs, knees and lower legs are the unmistakable focus\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette, simple blue shorts and neutral sneakers\nComposition/framing: centered front view, both legs fully visible from shorts to shoes with generous safe margin, no cropped limbs\nLighting/mood: soft bright studio lighting, cheerful and neutral\nConstraints: one individual image; genuinely transparent background; accurate anatomy; exactly two legs; no extra limbs; no torso above the waist; no text; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame; no props; no opaque backdrop; no floor shadow`,
  feet:`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: a clear visual teaching the English word "feet"\nSubject: exactly two friendly child feet wearing simple matching blue-and-white sneakers, shown together from just above the ankles; the two feet are the unmistakable focus\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette\nComposition/framing: compact nearly square centered close-up, both shoes and ankles fully visible and separated, generous safe margin on every side\nLighting/mood: soft bright studio lighting, cheerful and neutral\nConstraints: one individual image; genuinely transparent background with every background pixel fully transparent; accurate anatomy; exactly two feet; no legs above short ankles; no extra limbs; no floor; no cast shadow; no glow; no halo; no vignette; no text; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame`,
  'sit down':`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: unmistakably show the classroom command "sit down"\nSubject: one friendly school-age child in a blue shirt and shorts fully seated upright on one simple classroom chair, hips on the seat, knees bent, feet on the floor, calm cheerful expression\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette\nComposition/framing: compact centered three-quarter view, full child and complete chair fully visible with generous safe margin\nLighting/mood: soft bright studio lighting, cheerful classroom-learning mood\nConstraints: one child and one chair only; one individual image; genuinely transparent background with every background pixel fully transparent; no standing pose; no extra people; no extra furniture; no scene backdrop; no floor; no cast shadow; no glow; no halo; no text; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame`,
  'stand up':`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: unmistakably show the classroom command "stand up"\nSubject: one friendly school-age child in a blue shirt and shorts standing fully upright beside one simple classroom chair, straight legs and tall posture, cheerful expression; chair makes the contrast with sitting clear\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette\nComposition/framing: compact centered three-quarter view, full child and complete chair fully visible with generous safe margin\nLighting/mood: soft bright studio lighting, cheerful classroom-learning mood\nConstraints: one child and one chair only; one individual image; genuinely transparent background with every background pixel fully transparent; child must not be seated; no extra people; no extra furniture; no scene backdrop; no floor; no cast shadow; no glow; no halo; no text; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame`,
  'come in':`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: unmistakably show the classroom command "come in"\nSubject: one friendly school-age child stepping forward through one open simple classroom doorway, one foot crossing the threshold, cheerful welcoming expression and natural entering motion\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette, blue shirt and shorts\nComposition/framing: compact centered three-quarter view, full child and complete minimal doorframe fully visible with generous transparent safe margin\nLighting/mood: soft bright studio lighting, cheerful classroom-learning mood\nConstraints: one child and one doorway only; one individual image; genuinely transparent background with every background pixel fully transparent; entering through the doorway, not leaving; no room scene; no extra people; no extra furniture; no floor; no cast shadow; no glow; no halo; no text; no exit sign; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame around the whole image`,
  'silence, please':`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: unmistakably show the classroom phrase "silence, please"\nSubject: one friendly school-age child from waist up making a clear quiet gesture, one index finger gently vertical against closed lips, calm attentive expression\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette, simple blue shirt\nComposition/framing: compact centered front three-quarter view, full head, torso, hand and finger fully visible with generous transparent safe margin\nLighting/mood: soft bright studio lighting, calm and friendly\nConstraints: one child only; one individual image; genuinely transparent background with every background pixel fully transparent; anatomically correct hand and finger; no extra people; no props; no speech bubbles; no sound-wave symbols; no floor; no cast shadow; no glow; no halo; no text; no letters; no logos; no watermark; no collage; no grid; no frame`,
  'thank you':`Use case: stylized-concept\nAsset type: DUDUQ English educational game vocabulary-card image for children ages 6–11\nPrimary request: unmistakably show the polite phrase "thank you"\nSubject: one friendly school-age child from knees up, smiling warmly with one open hand resting over the heart and a small polite bow of the head, a clear sincere gratitude gesture\nStyle/medium: premium polished rounded 3D children's animation render, crisp clean silhouette, simple blue shirt and shorts\nComposition/framing: compact centered three-quarter view, full gesture and body framing fully visible with generous transparent safe margin\nLighting/mood: soft bright studio lighting, warm grateful and friendly\nConstraints: one child only; one individual image; genuinely transparent background with every background pixel fully transparent; no extra people; no gift; no props; no prayer pose; no speech bubbles; no floor; no cast shadow; no glow; no halo; no text; no letters; no symbols; no logos; no watermark; no collage; no grid; no frame`
};

const catalog=[
  ['HEAD','head','DUDUQ-Y1M05-HEAD.png','REUSED_NATIVE_20261029','02f4b0a096e8433efdfb5f3f210ead571ec74c84cba41dc05cead6db6f318068',1,1536,1536],
  ['HANDS','hands','DUDUQ-Y1M05-HANDS.png','NATIVE_IMAGEGEN_THIS_SESSION','99322110b54172bfe1b10cba62bd0cba6eff628ab20dd5a5a1c62c18bd5079d3',2,1792,1536],
  ['ARMS','arms','DUDUQ-Y1M05-ARMS.png','NATIVE_IMAGEGEN_THIS_SESSION','a2f604b8b4a7068f48f0ce0ac362bf05c509795624c466ab9fe38237a2d3c560',1,1536,1536],
  ['LEGS','legs','DUDUQ-Y1M05-LEGS.png','NATIVE_IMAGEGEN_THIS_SESSION','e3c4115d78b4917321bfcfcee22c2b66bce6e7b7a71ec2304664e7d017db56a6',1,1536,1536],
  ['FEET','feet','DUDUQ-Y1M05-FEET.png','NATIVE_IMAGEGEN_THIS_SESSION','8ca6d7e7c6cac005aa7d1f1895bf83d9f667bae3a36f1a9a1f1ccf3e1340c16c',1,1536,1536],
  ['SIT-DOWN','sit down','DUDUQ-Y1M05-SIT-DOWN.png','NATIVE_IMAGEGEN_THIS_SESSION','5ec6fe61c58477f6b6ff4c275e9ea0d3871d32aca6adbea9fb3481b64b6cf9c8',1,1536,1792],
  ['STAND-UP','stand up','DUDUQ-Y1M05-STAND-UP.png','NATIVE_IMAGEGEN_THIS_SESSION','793f12590fbb69d0de47eb2d25ff0b4a6923da32933434fa3568fe91131df8d0',2,1536,1536],
  ['COME-IN','come in','DUDUQ-Y1M05-COME-IN.png','NATIVE_IMAGEGEN_THIS_SESSION','9d8617cfdae99c85b09f318bfe4dd79c9d98b9503b0feac7ccde67dacd44eeba',1,1536,1792],
  ['SILENCE-PLEASE','silence, please','DUDUQ-Y1M05-SILENCE-PLEASE.png','NATIVE_IMAGEGEN_THIS_SESSION','c7a761561edc0dd0f976acdbf1c91c8f9d7f6e215e5a90b259c26c04cc70f385',1,1536,1536],
  ['THANK-YOU','thank you','DUDUQ-Y1M05-THANK-YOU.png','NATIVE_IMAGEGEN_THIS_SESSION','4c9dd9d0fcdc7f400e83d791446156e9b9a73bf6b5e5f3956d08468fd09a7495',1,1536,1792]
].map(([key,concept,file,generationClass,sourceSha256,components,minWidth,minHeight])=>({key,concept,file,generationClass,sourceSha256,components,minWidth,minHeight}));

function withoutMediaIds(node){
  if(Array.isArray(node))return node.map(withoutMediaIds);
  if(!node||typeof node!=='object')return node;
  const out={};
  for(const [key,value] of Object.entries(node))out[key]=['assetId','mediaId','image_ref','imageRef'].includes(key)&&typeof value==='string'&&value.startsWith('IMG-')?'<MEDIA_ID>':withoutMediaIds(value);
  return out;
}
function locate(question,field){
  const parts=[...field.matchAll(/([A-Za-z0-9_]+)|\[(\d+)\]/g)].map(x=>x[1]??Number(x[2]));
  let node=question;
  for(const part of parts.slice(0,-1))node=node?.[part];
  return {node,key:parts.at(-1)};
}

const questionBytes=await readFile(questionsPath);
const questions=JSON.parse(questionBytes);
if(questions.moduleId!=='Y1M05'||questions.items?.length!==20)throw Error('Y1M05_20_QUESTION_CONTRACT_REQUIRED');
const sourceInvariantSha256=hash(Buffer.from(JSON.stringify(withoutMediaIds(questions))));
const originalUsages=new Map();
for(const question of questions.items)collectQuestionMediaUsages(question,originalUsages);
if(originalUsages.size!==101||[...originalUsages.values()].reduce((n,x)=>n+x.length,0)!==101)throw Error('AUDITED_Y1M05_101_BINDING_CONTRACT_CHANGED');

// Confirm the five IDs that require occurrence-scoped isolation are exactly
// the five IDs shared with Y2M06 in the verified 600-question artifact.
const globalUsages=new Map();
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0');
  const data=JSON.parse(await readFile(path.join(root,`dist-pages/content/english/year-${year}/module-${mm}/questions.json`),'utf8'));
  if(data.items?.length!==20)throw Error('GLOBAL_20_QUESTION_CONTRACT_REQUIRED:'+data.moduleId);
  for(const question of data.items)collectQuestionMediaUsages(question,globalUsages);
}
const sharedFromY1=[...originalUsages.keys()].filter(id=>new Set((globalUsages.get(id)||[]).map(x=>x.moduleId)).size>1).sort();
const expectedShared=splits.map(x=>x.from).sort();
if(JSON.stringify(sharedFromY1)!==JSON.stringify(expectedShared))throw Error('Y1M05_SHARED_ID_SET_CHANGED:'+JSON.stringify(sharedFromY1));
for(const split of splits){
  const records=globalUsages.get(split.from)||[],modules=[...new Set(records.map(x=>x.moduleId))].sort();
  if(JSON.stringify(modules)!==JSON.stringify(['Y1M05','Y2M06'])||records.filter(x=>x.semanticTarget).some(x=>!isExactPedagogicalConcept(split.semanticTarget,x.semanticTarget)))
    throw Error('SHARED_ID_SEMANTIC_REVIEW_FAILED:'+split.from);
}

const modeled=structuredClone(questions);
for(const split of splits){
  const question=modeled.items.find(x=>x.item_id===split.questionId);if(!question)throw Error('SPLIT_QUESTION_MISSING:'+split.questionId);
  const {node,key}=locate(question,split.field);
  if(node?.[key]!==split.from||!isExactPedagogicalConcept(node?.semanticTarget,split.semanticTarget))throw Error('SPLIT_OCCURRENCE_CHANGED:'+split.from);
  node[key]=split.to;
}
if(hash(Buffer.from(JSON.stringify(withoutMediaIds(modeled))))!==sourceInvariantSha256)throw Error('QUESTION_INVARIANT_CHANGED_WHILE_MODELING_SPLITS');
const postSplit=new Map();
for(const question of modeled.items)collectQuestionMediaUsages(question,postSplit);
if(postSplit.size!==101||[...postSplit.values()].reduce((n,x)=>n+x.length,0)!==101)throw Error('POST_SPLIT_BINDING_COUNT_CHANGED');
for(const [id,records] of postSplit){
  if(records.length!==1||records[0].moduleId!=='Y1M05'||!records[0].semanticTarget)throw Error('POST_SPLIT_BINDING_NOT_OCCURRENCE_SCOPED:'+id);
}

const manifestAssets=[],evidenceAssets=[],assetForSemantic=new Map();
for(const asset of catalog){
  const original=await readFile(path.join(bundle,'provenance/originals',asset.key+'-ORIGINAL.png'));
  if(hash(original)!==asset.sourceSha256)throw Error('ORIGINAL_SOURCE_HASH_MISMATCH:'+asset.key);
  const file='images/'+asset.file,bytes=await readFile(path.join(bundle,file)),sha256=hash(bytes);
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),qc=inspectPng(bytes);
  if(width!==asset.minWidth||height!==asset.minHeight||bytes[24]!==8||bytes[25]!==6||!qc.valid||!qc.transparent||qc.subjectScaleQc!=='PASS')
    throw Error('FINAL_PNG_QC_FAILED:'+asset.key+':'+JSON.stringify({width,height,qc}));
  const entry={
    assetKey:'Y1M05-OFFICIAL-'+asset.key,file,semanticTarget:asset.concept,sha256,pixelWidth:width,pixelHeight:height,
    review:'MODEL_SEMANTIC_PRECHECK_PASSED',reviewEvidence:evidenceRel,bindings:[],
    provenance:{provider:'Codex built-in image_gen',generationClass:asset.generationClass,prompt:prompts[asset.concept],
      originalFile:'provenance/originals/'+asset.key+'-ORIGINAL.png',originalSha256:asset.sourceSha256,
      alphaNormalization:{script:'qa/normalize-transparent-png-alpha.mjs',semanticPixelsChanged:false,expectedCoreComponents:asset.components,
        operation:'remove detached low-alpha background pixels; retain opaque subject plus 3px antialias edge; add transparent safe-margin padding'}}
  };
  manifestAssets.push(entry);assetForSemantic.set(asset.concept,entry);
  evidenceAssets.push({assetKey:entry.assetKey,concept:asset.concept,file,width,height,format:'PNG_RGBA',sha256,sourceSha256:asset.sourceSha256,
    semanticPrecheck:'PASSED',technicalQc:{...qc},visualReview:'PASSED_FULL_SUBJECT_NO_CUTOFF_NO_TEXT_NO_DISTRACTOR_TRANSPARENT'});
}

for(const [mediaId,records] of [...postSplit].sort(([a],[b])=>a.localeCompare(b))){
  const record=records[0],asset=assetForSemantic.get(record.semanticTarget);
  if(!asset)throw Error('NO_REVIEWED_ASSET_FOR_SEMANTIC:'+record.semanticTarget+':'+mediaId);
  asset.bindings.push({questionId:record.questionId,mediaId,verifiedQuestionIds:[record.questionId]});
}
if(manifestAssets.reduce((n,x)=>n+x.bindings.length,0)!==101||manifestAssets.some(x=>!x.bindings.length))throw Error('Y1M05_BINDING_COVERAGE_MISMATCH');

const manifest={schemaVersion:'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1',createdAt:'2026-10-30',moduleId:'Y1M05',
  source:'Codex native OpenAI image generation',provider:'Codex built-in image_gen',status:'HASH_BOUND_REVIEWED_BUNDLE_READY_FOR_QA_OVERLAY',
  originalAuditedPendingIds:101,occurrenceScopedSplits:splits,finalBindingIds:101,totalQuestionUsageRecords:101,
  questionContractsReviewed:20,preservesAnswerKeysAndMechanics:true,productionApproved:false,assets:manifestAssets};
const evidence={schemaVersion:'DUDUQ_Y1M05_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V1',createdAt:'2026-10-30',moduleId:'Y1M05',
  provider:'Codex built-in image_gen',sourceQuestionContractSha256:hash(questionBytes),sourceRegistrySha256:hash(await readFile(registryPath)),
  sourceQuestionInvariantSha256:sourceInvariantSha256,reviewedQuestionCount:20,auditedPendingIds:101,postSplitIds:101,usageRecords:101,
  splitReview:{status:'APPROVED_OCCURRENCE_SCOPED_SPLITS',count:5,splits,
    reason:'Five media IDs are also referenced by Y2M06-Q015. New IDs are assigned only to the exact Y1M05 option/pair occurrences so Y2M06 remains provisional and untouched.'},
  renderedReview:{status:'PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW',criteria:['correct concept in all 101 usages','no cutoff','non-empty subject','no unrelated object','no embedded text','transparent background','small-card readability']},
  candidateAssets:evidenceAssets,productionReleaseCertified:false,goldMastersModified:false};
const plan={schemaVersion:'DUDUQ_Y1M05_OFFICIAL_MEDIA_BINDING_PLAN_V1',moduleId:'Y1M05',status:'PASS',
  sourceQuestionContractSha256:evidence.sourceQuestionContractSha256,sourceQuestionInvariantSha256:sourceInvariantSha256,
  inputMediaIds:101,outputMediaIds:101,usageRecords:101,splits,concepts:[...assetForSemantic.keys()].sort(),
  bindings:manifestAssets.flatMap(a=>a.bindings.map(b=>({assetKey:a.assetKey,semanticTarget:a.semanticTarget,...b}))).sort((a,b)=>a.mediaId.localeCompare(b.mediaId)),productionApproved:false};
await writeFile(path.join(bundle,'batch-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(bundle,'semantic-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
await writeFile(path.join(root,'qa/results/y1m05-official-media-binding-plan.json'),JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({status:'Y1M05_OFFICIAL_MEDIA_BUNDLE_PREPARED',sourceImages:10,manifestAssets:10,
  auditedPendingIds:101,postSplitIds:101,usageRecords:101,splits:5,questions:20,productionApproved:false,bundle:bundleRel},null,2));

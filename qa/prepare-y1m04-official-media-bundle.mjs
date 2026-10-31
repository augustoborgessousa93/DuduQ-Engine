#!/usr/bin/env node
/**
 * Build the hash-bound Y1M04 media bundle from the reviewed PNGs in this
 * isolated worktree. This script is read-only with respect to game content:
 * it writes only bundle evidence and the semantic binding plan.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

const root=process.cwd();
const bundleRel='qa/media-candidates/y1m04-official-20261030';
const bundle=path.join(root,bundleRel);
const questionsPath=path.join(root,'dist-pages/content/english/year-1/module-04/questions.json');
const evidenceRel=bundleRel+'/semantic-evidence.json';
const split={
  questionId:'Y1M04-Q008',
  field:'mediaBindings[0].assetId',
  from:'IMG-Y1M04-Q003-PENCIL-CASE',
  to:'IMG-Y1M04-Q008-PENCIL-CASE',
  semanticTarget:'pencil-case'
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

const generatedPromptSummary={
  'pencil case':'One plain closed blue zippered school pencil case, fully visible and isolated; no contents, decorative symbols, text, logo, watermark, collage, grid, or opaque background.',
  red:'One unmistakable solid red rounded color token, isolated and fully visible; no object cue, text, logo, watermark, collage, grid, or opaque background.',
  blue:'One unmistakable solid blue rounded color token, isolated and fully visible; no object cue, text, logo, watermark, collage, grid, or opaque background.',
  yellow:'One unmistakable solid yellow rounded color token, isolated and fully visible; no object cue, text, logo, watermark, collage, grid, or opaque background.',
  green:'One unmistakable solid green rounded color token, isolated and fully visible; no object cue, text, logo, watermark, collage, grid, or opaque background.',
  black:'One unmistakable solid black rounded color token, isolated and fully visible with a clean silhouette; no object cue, text, logo, watermark, collage, grid, or opaque background.',
  white:'One unmistakable solid white rounded color token with a subtle neutral outline for visibility, isolated and fully visible; no object cue, text, logo, watermark, collage, grid, or opaque background.',
  one:'Exactly one yellow wooden school pencil, fully visible and isolated; no extra objects, numerals, text, watermark, collage, grid, or opaque background.',
  two:'Exactly two identical yellow wooden school pencils, separated and fully visible; no extra objects, numerals, text, watermark, collage, grid, or opaque background.',
  three:'Exactly three identical yellow wooden school pencils, separated and fully visible; no extra objects, numerals, text, watermark, collage, grid, or opaque background.',
  four:'Exactly four identical yellow wooden school pencils, separated and fully visible; no extra objects, numerals, text, watermark, collage, grid, or opaque background.'
};
const catalog=[
  ['BACKPACK','backpack','DUDUQ-Y1M04-BACKPACK.png','REUSED_NATIVE_20261029'],
  ['BLACK','black','DUDUQ-Y1M04-BLACK.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['BLUE','blue','DUDUQ-Y1M04-BLUE.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['CRAYON','crayon','DUDUQ-Y1M04-CRAYON.png','REUSED_NATIVE_20261029'],
  ['ERASER','eraser','DUDUQ-Y1M04-ERASER.png','REUSED_NATIVE_20261029'],
  ['FOUR','four','DUDUQ-Y1M04-FOUR.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['GREEN','green','DUDUQ-Y1M04-GREEN.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['ONE','one','DUDUQ-Y1M04-ONE.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['PEN','pen','DUDUQ-Y1M04-PEN.png','REUSED_NATIVE_20261029'],
  ['PENCIL-CASE','pencil case','DUDUQ-Y1M04-PENCIL-CASE.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['PENCIL','pencil','DUDUQ-Y1M04-PENCIL.png','REUSED_NATIVE_20261029'],
  ['RED','red','DUDUQ-Y1M04-RED.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['RULER','ruler','DUDUQ-Y1M04-RULER.png','REUSED_NATIVE_20261029'],
  ['THREE','three','DUDUQ-Y1M04-THREE.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['TWO','two','DUDUQ-Y1M04-TWO.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['WHITE','white','DUDUQ-Y1M04-WHITE.png','NATIVE_IMAGEGEN_THIS_SESSION'],
  ['YELLOW','yellow','DUDUQ-Y1M04-YELLOW.png','NATIVE_IMAGEGEN_THIS_SESSION']
].map(([key,concept,file,generationClass])=>({key,concept,file,generationClass}));

const questions=JSON.parse(await readFile(questionsPath,'utf8'));
if(questions.moduleId!=='Y1M04'||questions.items?.length!==20)throw Error('Y1M04_20_QUESTION_CONTRACT_REQUIRED');
const usages=new Map();
for(const question of questions.items)collectQuestionMediaUsages(question,usages);
if(usages.size!==83)throw Error('AUDITED_Y1M04_PENDING_ID_COUNT_CHANGED:'+usages.size);
const shared=[...usages].filter(([,records])=>new Set(records.map(x=>x.questionId)).size>1);
if(shared.length!==2)throw Error('UNEXPECTED_SHARED_ID_COUNT:'+shared.length);
const ambiguous=[...usages].filter(([,records])=>new Set(records.map(x=>x.semanticTarget)).size>1);
if(ambiguous.length!==1||ambiguous[0][0]!==split.from)throw Error('EXPECTED_ONLY_Q003_Q008_PENCIL_CASE_AMBIGUITY');
const ambiguousRecords=ambiguous[0][1];
if(ambiguousRecords.length!==2||!ambiguousRecords.some(x=>x.questionId==='Y1M04-Q003'&&x.semanticTarget==='pencil case')||
   !ambiguousRecords.some(x=>x.questionId===split.questionId&&x.semanticTarget===split.semanticTarget))
  throw Error('PENCIL_CASE_SPLIT_OCCURRENCES_CHANGED');

// Model the one occurrence-scoped split without mutating questions here.
const postSplit=new Map();
for(const [mediaId,records] of usages){
  for(const record of records){
    const id=mediaId===split.from&&record.questionId===split.questionId?split.to:mediaId;
    if(!postSplit.has(id))postSplit.set(id,[]);
    postSplit.get(id).push(record);
  }
}
if(postSplit.size!==84)throw Error('EXPECTED_84_IDS_AFTER_SCOPED_SPLIT:'+postSplit.size);
for(const [id,records] of postSplit){
  if(new Set(records.map(x=>x.semanticTarget)).size!==1)throw Error('AMBIGUOUS_POST_SPLIT_MEDIA_ID:'+id);
  if(records.some(x=>x.moduleId!=='Y1M04'))throw Error('CROSS_MODULE_BINDING:'+id);
}

const oldProvenance=JSON.parse(await readFile(path.join(bundle,'provenance/CANDIDATE_BATCH_MANIFEST-20261029.json'),'utf8'));
const oldByConcept=new Map((oldProvenance.assets||[]).filter(x=>x.review==='PEDAGOGICAL_QA_PENDING').map(x=>[x.concept,x]));
const evidenceAssets=[];
const manifestAssets=[];
const assetForSemantic=new Map();
for(const asset of catalog){
  const file='images/'+asset.file;
  const bytes=await readFile(path.join(bundle,file));
  const sha256=hash(bytes),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),qc=inspectPng(bytes);
  if(width<1024||height<1024||bytes[24]!==8||bytes[25]!==6||!qc.valid||!qc.transparent||qc.subjectScaleQc!=='PASS')
    throw Error('FINAL_PNG_QC_FAILED:'+asset.key+':'+JSON.stringify({width,height,qc}));
  const prior=oldByConcept.get(asset.concept);
  if(asset.generationClass==='REUSED_NATIVE_20261029'&&(!prior||prior.sha256!==sha256))
    throw Error('REUSED_NATIVE_PROVENANCE_MISMATCH:'+asset.key);
  const prompt=prior?.prompt||generatedPromptSummary[asset.concept];
  if(!prompt)throw Error('MISSING_PROMPT_PROVENANCE:'+asset.key);
  const entry={
    assetKey:'Y1M04-OFFICIAL-'+asset.key,
    file,
    semanticTarget:asset.concept,
    sha256,pixelWidth:width,pixelHeight:height,
    review:'MODEL_SEMANTIC_PRECHECK_PASSED',
    reviewEvidence:evidenceRel,
    bindings:[],
    provenance:{
      provider:'Codex built-in image_gen',
      generationClass:asset.generationClass,
      promptRecord:prior?'VERBATIM_FROM_20261029_NATIVE_MANIFEST':'SESSION_PROMPT_SUMMARY',
      prompt,
      reusedSourceManifest:prior?'provenance/CANDIDATE_BATCH_MANIFEST-20261029.json':null,
      alphaNormalization:prior?null:{script:'qa/normalize-transparent-png-alpha.mjs',semanticPixelsChanged:false,operation:'remove detached low-alpha background pixels; preserve opaque subject and 3px antialias edge'}
    }
  };
  assetForSemantic.set(asset.concept,entry);
  manifestAssets.push(entry);
  evidenceAssets.push({assetKey:entry.assetKey,concept:entry.semanticTarget,file,width,height,format:'PNG_RGBA',sha256,
    semanticPrecheck:'PASSED',technicalQc:{...qc},visualReview:'PASSED_FULL_OBJECT_NO_CUTOFF_NO_TEXT_NO_DISTRACTOR'});
}
// The compiled exact-semantic guard distinguishes the authored hyphenated
// target in Q008. Reuse the reviewed pixels but retain a separate asset key.
const pencilCase=assetForSemantic.get('pencil case');
const pencilCaseAlias={...pencilCase,assetKey:'Y1M04-OFFICIAL-PENCIL-CASE-Q008',semanticTarget:'pencil-case',bindings:[],
  provenance:{...pencilCase.provenance,semanticAliasReason:'Authored Q008 semanticTarget is hyphenated; scoped media ID split prevents cross-question ambiguity.'}};
manifestAssets.push(pencilCaseAlias);
evidenceAssets.push({...evidenceAssets.find(x=>x.assetKey===pencilCase.assetKey),assetKey:pencilCaseAlias.assetKey,concept:'pencil-case',
  semanticPrecheck:'PASSED',semanticAliasOf:pencilCase.assetKey});
assetForSemantic.set('pencil-case',pencilCaseAlias);

let usageRecords=0;
for(const [mediaId,records] of [...postSplit].sort(([a],[b])=>a.localeCompare(b))){
  const semantic=records[0].semanticTarget,asset=assetForSemantic.get(semantic);
  if(!asset)throw Error('NO_REVIEWED_ASSET_FOR_SEMANTIC:'+semantic+':'+mediaId);
  const questionIds=[...new Set(records.map(x=>x.questionId))].sort();
  asset.bindings.push({questionId:questionIds[0],mediaId,verifiedQuestionIds:questionIds});
  usageRecords+=records.length;
}
if(usageRecords!==85||manifestAssets.reduce((n,x)=>n+x.bindings.length,0)!==84)
  throw Error('Y1M04_BINDING_COUNT_MISMATCH');
if(manifestAssets.some(x=>!x.bindings.length))throw Error('UNUSED_REVIEWED_ASSET_IN_FINAL_BUNDLE');

const manifest={
  schemaVersion:'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1',
  createdAt:'2026-10-30',
  moduleId:'Y1M04',
  source:'Native ChatGPT image generation (not Cloudflare)',
  provider:'Codex built-in image_gen',
  status:'HASH_BOUND_REVIEWED_BUNDLE_READY_FOR_QA_OVERLAY',
  originalAuditedPendingIds:83,
  occurrenceScopedSplit:split,
  finalBindingIds:84,
  totalQuestionUsageRecords:85,
  questionContractsReviewed:20,
  preservesAnswerKeysAndMechanics:true,
  productionApproved:false,
  assets:manifestAssets
};
const evidence={
  schemaVersion:'DUDUQ_Y1M04_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V1',
  createdAt:'2026-10-30',moduleId:'Y1M04',provider:'Codex built-in image_gen',
  sourceQuestionContractSha256:hash(await readFile(questionsPath)),
  reviewedQuestionCount:20,auditedPendingIds:83,postSplitIds:84,usageRecords:85,
  splitReview:{...split,status:'APPROVED_OCCURRENCE_SCOPED_SPLIT',reason:'Q003 expects pencil case while Q008 authors pencil-case; all other shared IDs are exact.'},
  renderedReview:{status:'PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW',criteria:['correct concept','exact count for one/two/three/four','no cutoff','non-empty pixels','no unrelated object','no embedded text','transparent background']},
  candidateAssets:evidenceAssets,
  productionReleaseCertified:false,goldMastersModified:false
};
const plan={
  schemaVersion:'DUDUQ_Y1M04_OFFICIAL_MEDIA_BINDING_PLAN_V1',moduleId:'Y1M04',status:'PASS',
  sourceQuestionContractSha256:evidence.sourceQuestionContractSha256,
  inputMediaIds:83,outputMediaIds:84,usageRecords:85,split,
  concepts:[...new Set(manifestAssets.map(x=>x.semanticTarget))].sort(),
  bindings:manifestAssets.flatMap(a=>a.bindings.map(b=>({assetKey:a.assetKey,semanticTarget:a.semanticTarget,...b}))).sort((a,b)=>a.mediaId.localeCompare(b.mediaId)),
  productionApproved:false
};
await writeFile(path.join(bundle,'batch-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(bundle,'semantic-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
await writeFile(path.join(root,'qa/results/y1m04-official-media-binding-plan.json'),JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({status:'Y1M04_OFFICIAL_MEDIA_BUNDLE_PREPARED',sourceImages:catalog.length,manifestAssets:manifestAssets.length,
  auditedPendingIds:83,postSplitIds:84,usageRecords,questions:20,productionApproved:false,bundle:bundleRel},null,2));

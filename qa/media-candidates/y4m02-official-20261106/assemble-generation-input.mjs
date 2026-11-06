#!/usr/bin/env node
/**
 * Assemble the immutable Y4M02 generation-lane input from the six native
 * Codex generations completed for this module and sixteen exact, previously
 * verified originals. This script writes only generation-input.json beside
 * itself and never touches questions, the registry, runtime, or production.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const createdAt='2026-11-06T15:07:26.406Z';
const batchRel='qa/media-candidates/y4m02-official-20261106';
const nativeSession='C:/Users/augus/.codex/sessions/2026/11/06/rollout-2026-11-06T11-48-36-01a1b155-3c73-7423-894d-cc590dc5bac5.jsonl';
const letterSession='C:/Users/augus/.codex/sessions/2026/10/31/rollout-2026-10-31T16-03-08-01a19358-2070-7d40-adf4-ca83e871348d.jsonl';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const readJson=async relative=>JSON.parse(await readFile(path.join(root,relative),'utf8'));

async function generationRecord(transcript,callId){
  const text=await readFile(transcript,'utf8');
  for(const line of text.split(/\r?\n/)){
    if(!line.includes(callId)||!line.includes('image_gen.generation'))continue;
    try{
      const item=JSON.parse(line).payload?.item;
      if(item?.kind==='image_gen.generation'&&item.id===callId&&item.status==='completed'&&item.revisedPrompt)
        return item;
    }catch{}
  }
  throw Error('Y4M02_GENERATION_SESSION_RECORD_MISSING:'+callId);
}

const generatedMeta=[
  {
    concept:'english',slug:'ENGLISH',callId:'exec-39fabced-35ab-4d58-b8dc-0d90836268f0',
    output:'C:/Users/augus/.codex/generated_images/01a1b155-3c73-7423-894d-cc590dc5bac5/exec-39fabced-35ab-4d58-b8dc-0d90836268f0.png',
    hash:'850e9b0fd0061baeca2dcc722d4ff6babacf2ff18de73b369ae2b770f52261bd',
    visualObservation:'One open royal-blue book forms a connected emblem with two attached speech bubbles containing blank conversation lines; no words, alphabet glyphs, flags, or unrelated subject cues are visible.',
    pedagogicalFit:'Unmistakable text-free language, reading, and conversation cue for the school subject English, distinct from the A–D letter targets.'
  },
  {
    concept:'geography',slug:'GEOGRAPHY',callId:'exec-9062daaf-694c-49a1-8950-bf8c39277bc4',
    output:'C:/Users/augus/.codex/generated_images/01a1b155-3c73-7423-894d-cc590dc5bac5/exec-9062daaf-694c-49a1-8950-bf8c39277bc4.png',
    hash:'6ff21c8b5d245c3dae717f7c60702c84714748d0adf43f2b4598d13c5ae5b9ab',
    visualObservation:'One connected geography emblem shows a blue-and-green globe on its stand with an overlapping folded map and compass; there are no labels, flags, borders, or unrelated subject cues.',
    pedagogicalFit:'Clear small-card visual for Geography through globe, map, and compass study tools without baked-in answer text.'
  },
  {
    concept:'mathematics',slug:'MATHEMATICS',callId:'exec-7005a78b-2e8c-4d48-b6d9-6f1b8013f9e5',
    output:'C:/Users/augus/.codex/generated_images/01a1b155-3c73-7423-894d-cc590dc5bac5/exec-7005a78b-2e8c-4d48-b6d9-6f1b8013f9e5.png',
    hash:'2c8ed7171f0f10ce7b77aa492c2364e4dbd0ef3de5d0fe4ed78e2a225de0d841',
    visualObservation:'One connected classroom abacus with five rails and colorful beads is visible; a plus and equals cue are embossed in the base, with no numerals or complete equation.',
    pedagogicalFit:'Unmistakable general Mathematics study emblem that remains distinct from the four exact equation-answer assets.'
  },
  {
    concept:'science',slug:'SCIENCE',callId:'exec-6d1871bf-c08f-4c62-8f47-0e4ade6c388c',
    output:'C:/Users/augus/.codex/generated_images/01a1b155-3c73-7423-894d-cc590dc5bac5/exec-6d1871bf-c08f-4c62-8f47-0e4ade6c388c.png',
    hash:'4db85d8cf2b5dd47ea2ec7669860d59275b3d6c19f2cfd7718b05fc949750cbb',
    visualObservation:'One connected laboratory emblem combines a microscope, one green-liquid flask, and one blue-liquid test tube secured to the same base; no warning, formula, or unrelated cue appears.',
    pedagogicalFit:'Clear laboratory-equipment visual for the school subject Science at small game-card scale.'
  },
  {
    concept:'history',slug:'HISTORY',callId:'exec-a1a6e6cd-8b8e-4767-93de-1163b283934e',
    output:'C:/Users/augus/.codex/generated_images/01a1b155-3c73-7423-894d-cc590dc5bac5/exec-a1a6e6cd-8b8e-4767-93de-1163b283934e.png',
    hash:'65d289b1680f0381118c429e49f3c87cbe66af45c9424a04c279b99c6f70f675',
    visualObservation:'One connected history-study emblem contains an open burgundy-and-gold antique book, a golden hourglass, and an ivory classical-column relief; no dates, flags, weapons, or people appear.',
    pedagogicalFit:'Broad, friendly past-and-time study cue for History without presenting one culture or conflict as the whole subject.'
  },
  {
    concept:'art',slug:'ART',callId:'exec-b466d0c6-96bd-45e7-959b-7a681f875644',
    output:'C:/Users/augus/.codex/generated_images/01a1b155-3c73-7423-894d-cc590dc5bac5/exec-b466d0c6-96bd-45e7-959b-7a681f875644.png',
    hash:'1e472cc18685ff86d63b94e0fa0ed771d944ea0ec21885c6b96c088d8c12f403',
    visualObservation:'One wooden painter palette has exactly five colored paint daubs and exactly two crossing brushes, all forming one connected silhouette; no canvas, text, or unrelated subject cue appears.',
    pedagogicalFit:'Exact child-friendly art-class tool emblem for Art, replacing the provisional emoji concept without introducing a distractor.'
  }
];

const generated=[];
for(const meta of generatedMeta){
  const bytes=await readFile(meta.output);
  if(sha256(bytes)!==meta.hash)throw Error('Y4M02_NATIVE_OUTPUT_HASH_MISMATCH:'+meta.concept);
  const record=await generationRecord(nativeSession,meta.callId);
  generated.push({
    concept:meta.concept,slug:meta.slug,expectedObjectCount:1,alphaNormalizationApplied:false,
    generatorOutputOriginalPath:meta.output,expectedOriginalSha256:meta.hash,
    generatorCallId:meta.callId,sourceSessionTranscript:nativeSession,prompt:record.revisedPrompt,
    visualObservation:meta.visualObservation,pedagogicalFit:meta.pedagogicalFit
  });
}

const letterMeta=[
  ['a','LETTER-A','exec-9fc64420-aabd-4804-80c9-e2f11c6659d9','45a0be67a1decff6ca5568884f271d1fd5b90faa9dcb5ca876e455d10eb9d38e'],
  ['b','LETTER-B','exec-606f67b5-b378-4a5d-b7ff-35ec06bc5bba','c106081f6e8b230577b66ed0b9e4583e708e86aeb182e7bbf010fb761f132e2b'],
  ['c','LETTER-C','exec-ac6b1a11-ece6-4d61-83ee-3b093403a1c0','8b71947d742140dbb5da17de8cfcba88763cebad499069b700dfcb5f40b6546b'],
  ['d','LETTER-D','exec-5650de39-167d-4914-943c-b27fc28a68c2','699a56752b3917251bfec5453216ec14dbc4a562476c56d4eabf4be59c5cff75']
];
const letters=[];
for(const [concept,slug,callId,hash] of letterMeta){
  const upper=concept.toUpperCase();
  const prompt=(await generationRecord(letterSession,callId)).revisedPrompt;
  letters.push({
    concept,slug,expectedObjectCount:1,
    sourceBatch:'qa/media-candidates/y2m01-official-20261031',
    sourceFile:`images/DUDUQ-Y2M01-LETTER-${upper}.png`,
    sourceOriginal:`provenance/originals/DUDUQ-Y2M01-LETTER-${upper}-ORIGINAL.png`,
    sourceGenerationProvenance:'generation-provenance.json',expectedSourceSha256:hash,expectedOriginalSha256:hash,
    nativeOutputPath:`C:/Users/augus/.codex/generated_images/01a19358-2070-7d40-adf4-ca83e871348d/${callId}.png`,
    generatorCallId:callId,sourceSessionTranscript:letterSession,prompt,
    visualObservation:`Exactly one premium uppercase ${upper} glyph is isolated and unmistakable; no other letter, word, numeral, icon, or object is present.`,
    pedagogicalFit:`Exact reusable uppercase ${upper} target for the Y4M02 letter-choice questions.`
  });
}

async function modernReuse(sourceBatch,targets){
  const provenance=await readJson(sourceBatch+'/generation-provenance.json');
  const input=await readJson(sourceBatch+'/generation-input.json');
  return targets.map(target=>{
    const asset=provenance.assets.find(record=>normalize(record.concept)===normalize(target));
    const sourceInput=input.generated.find(record=>normalize(record.concept)===normalize(target));
    if(!asset||!sourceInput)throw Error('Y4M02_REUSE_SOURCE_RECORD_MISSING:'+target);
    return {
      concept:normalize(target),slug:asset.slug,expectedObjectCount:sourceInput.expectedObjectCount,
      normalizationExpectedComponents:sourceInput.normalizationExpectedComponents,
      sourceBatch,sourceFile:asset.candidateFile,sourceOriginal:asset.originalFile,
      sourceGenerationProvenance:'generation-provenance.json',
      expectedSourceSha256:asset.candidateSha256,expectedOriginalSha256:asset.originalSha256,
      nativeOutputPath:asset.generatorOutputOriginalPath,prompt:asset.prompt,
      visualObservation:sourceInput.visualObservation,pedagogicalFit:sourceInput.pedagogicalFit
    };
  });
}

const preferences=await modernReuse('qa/media-candidates/y3m04-official-20261105',[
  'i prefer grapes','i do not like carrots','i like papaya','i like apples'
]);
const equations=await modernReuse('qa/media-candidates/y3m05-official-20261105',[
  'three plus four equals seven','nine minus five equals four','two plus three equals five','six minus two equals four'
]);

const shapeSource=await readJson('qa/media-candidates/y3m06-official-20261106/generation-input.json');
const shapeTargets=new Set(['blue square','red triangle','yellow rectangle','green circle']);
const shapes=shapeSource.reused.filter(record=>shapeTargets.has(normalize(record.concept))).map(record=>({...record,concept:normalize(record.concept)}));
if(shapes.length!==4)throw Error('Y4M02_REQUIRES_FOUR_VERIFIED_SHAPE_REUSES');

const reused=[...letters,...preferences,...equations,...shapes];
if(reused.length!==16||new Set(reused.map(record=>normalize(record.concept))).size!==16)
  throw Error('Y4M02_REUSE_SET_INVALID');

const input={
  schemaVersion:'DUDUQ_Y4M02_GENERATION_INPUT_V1',createdAt,moduleId:'Y4M02',lane:'generation',
  writeBoundary:batchRel,provider:'OpenAI Codex native image generation',tool:'image_gen.imagegen',
  apiPurchaseOrExternalCredentialUsed:false,transparentBackgroundRequested:true,
  sourceQuestionFile:'dist-pages/content/english/year-4/module-02/questions.json',
  auditedQuestionCount:20,auditedVisualUsageCount:94,auditedSourceMediaIdCount:39,auditedSemanticConceptCount:22,
  globalPendingMediaIdsAtAudit:1055,generated,reused,failedAttempts:[]
};
await writeFile(path.join(batchDir,'generation-input.json'),JSON.stringify(input,null,2)+'\n');
console.log(JSON.stringify({status:'Y4M02_GENERATION_INPUT_ASSEMBLED',generated:generated.length,reused:reused.length,failedAttempts:0}));

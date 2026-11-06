#!/usr/bin/env node
/**
 * Assemble the immutable Y4M03 native-generation input.
 * Writes only generation-input.json beside this script.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const createdAt='2026-11-06T20:01:29.963Z';
const moduleId='Y4M03';
const batchRel='qa/media-candidates/y4m03-official-20261106';
const session='C:/Users/augus/.codex/sessions/2026/11/06/rollout-2026-11-06T16-33-36-01a1b25a-2630-7050-9efd-638b69dbdd9b.jsonl';
const outputRoot='C:/Users/augus/.codex/generated_images/01a1b25a-2630-7050-9efd-638b69dbdd9b';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

async function generationRecord(callId){
  const text=await readFile(session,'utf8');
  for(const line of text.split(/\r?\n/)){
    if(!line.includes(callId)||!line.includes('image_gen.generation'))continue;
    try{
      const item=JSON.parse(line).payload?.item;
      if(item?.kind==='image_gen.generation'&&item.id===callId&&item.status==='completed'&&item.revisedPrompt){
        return item;
      }
    }catch{}
  }
  throw Error('Y4M03_GENERATION_SESSION_RECORD_MISSING:'+callId);
}

const monthCalls=[
  ['january','JANUARY',1,'exec-a17c098c-1dac-4fe6-8dfe-293c239b6828'],
  ['february','FEBRUARY',2,'exec-88771f5b-7a3c-4912-8a3c-d571e0d02ed2'],
  ['march','MARCH',3,'exec-36a55d21-ce29-4b9f-ade1-b910cd2185a1'],
  ['april','APRIL',4,'exec-455b8161-7284-4ba5-a503-ee26900d98c1'],
  ['may','MAY',5,'exec-febdc948-1aaa-4ba2-a2fe-b6ed61196c8e'],
  ['june','JUNE',6,'exec-62b02670-c7a0-4629-b26c-425efbf424f9'],
  ['july','JULY',7,'exec-16d51b89-4ff7-453d-8988-ef0531e61e51'],
  ['august','AUGUST',8,'exec-c511c573-fb3e-45ca-a21e-1f30af3d0338'],
  ['september','SEPTEMBER',9,'exec-a13d7e5f-549d-409d-89c4-18de29441d95'],
  ['october','OCTOBER',10,'exec-82d1b41c-fcd2-4bdf-b3d9-199e8d6f9b90'],
  ['november','NOVEMBER',11,'exec-951e53f3-ddb4-4e77-bcdc-f03cc99ee05e'],
  ['december','DECEMBER',12,'exec-dca681aa-a9a4-4d15-99b6-90481cbc2546']
];
const seasonCalls=[
  ['spring','SPRING','exec-5b316cf3-eb96-46d0-b196-034d799e69fd',
    'One connected fresh-green plant cluster has exactly three large pink flowers with yellow centers, leaves, stems and a grassy base; no seasonally conflicting object is present.',
    'Exact text-free spring vocabulary cue, distinct from summer, autumn, fall and winter.'],
  ['summer','SUMMER','exec-7920d343-8b3d-4925-8e97-928bf6ad98cb',
    'One connected golden sun token has one circular center and exactly twelve attached rounded rays; it has no face and no other object.',
    'Exact text-free summer vocabulary cue using the source-backed warm-sun concept.'],
  ['autumn','AUTUMN','exec-83a1e517-f852-401d-bde2-8fb46678ea2f',
    'One deciduous tree has a connected amber-orange-red canopy, brown trunk and attached leaf carpet on one compact earth base; no airborne leaf or unrelated object is present.',
    'Exact text-free autumn vocabulary cue, intentionally distinct from the separate single falling-leaf asset.'],
  ['fall','FALL','exec-9089c3d5-ebab-43ff-b6c7-09de2bc79e2d',
    'Exactly one red-orange maple leaf with one complete curled brown stem appears in a dynamic diagonal falling tilt; no tree, second leaf or unrelated object is present.',
    'Exact text-free fall vocabulary cue, visually distinct from the full autumn-tree asset while preserving the synonym relationship.'],
  ['winter','WINTER','exec-f0893378-0240-4cd8-a7a9-424b4fdcff88',
    'One compact evergreen tree has three deep-green tiers, clean white snow caps, one brown trunk and one connected snow mound; no holiday decoration or unrelated object is present.',
    'Exact text-free winter vocabulary cue using the source-backed snow concept.']
];

const januaryAcceptedPath=path.join(outputRoot,'exec-a17c098c-1dac-4fe6-8dfe-293c239b6828.png');
const januaryAcceptedSha256=sha256(await readFile(januaryAcceptedPath));
const accepted=[];
for(const [concept,slug,index,callId] of monthCalls){
  const output=path.join(outputRoot,callId+'.png');
  const bytes=await readFile(output);
  const record=await generationRecord(callId);
  const clockPosition=index===1?'12 o’clock':index===4?'3 o’clock':index===7?'6 o’clock':index===10?'9 o’clock':
    index<4?String(index)+' o’clock':index<7?String(index)+' o’clock':index<10?String(index)+' o’clock':String(index)+' o’clock';
  accepted.push({
    concept,slug,semanticFamily:'MONTH_POSITION_ON_TWELVE_PART_YEAR_WHEEL',monthOrdinal:index,
    expectedObjectCount:1,normalizationExpectedComponents:1,alphaNormalizationApplied:true,
    generatorOutputOriginalPath:output,expectedOriginalSha256:sha256(bytes),generatorCallId:callId,
    sourceSessionTranscript:session,prompt:record.revisedPrompt,
    editReferenceGeneratorOutput:index===1?path.join(outputRoot,'exec-3dc91d57-072f-4992-a9a4-08f135513cf8.png'):januaryAcceptedPath,
    editReferenceSha256:index===1?sha256(await readFile(path.join(outputRoot,'exec-3dc91d57-072f-4992-a9a4-08f135513cf8.png'))):januaryAcceptedSha256,
    visualObservation:`One connected blue year-wheel has exactly twelve rim beads and one ivory center hub; only ordinal position ${index} (${clockPosition}) is enlarged and warm gold, while the other eleven beads are smaller sky blue.`,
    pedagogicalFit:`The ${concept} asset preserves the source-backed twelve-position month dial and distinguishes month ordinal ${index} without words, letters, numerals, dates or seasonal assumptions.`
  });
}
for(const [concept,slug,callId,visualObservation,pedagogicalFit] of seasonCalls){
  const output=path.join(outputRoot,callId+'.png');
  const bytes=await readFile(output);
  const record=await generationRecord(callId);
  const referenceByConcept={
    spring:'exec-e5ccb7f6-7f46-46de-8a4f-6225a53ca84a',
    summer:'exec-ec9df50b-1e46-4837-834e-8dbfbb2f47f1'
  };
  const referenceId=referenceByConcept[concept]??null;
  const referencePath=referenceId?path.join(outputRoot,referenceId+'.png'):null;
  accepted.push({
    concept,slug,semanticFamily:'SEASON_VOCABULARY_CUE',expectedObjectCount:1,
    normalizationExpectedComponents:1,alphaNormalizationApplied:true,
    generatorOutputOriginalPath:output,expectedOriginalSha256:sha256(bytes),generatorCallId:callId,
    sourceSessionTranscript:session,prompt:record.revisedPrompt,
    editReferenceGeneratorOutput:referencePath,
    editReferenceSha256:referencePath?sha256(await readFile(referencePath)):null,
    visualObservation,pedagogicalFit
  });
}

const rejectedMeta=[
  ['january','JANUARY-ATTEMPT-1','exec-3dc91d57-072f-4992-a9a4-08f135513cf8','ALPHA_FRAMING_REJECTED_SHORT_MARGIN_AND_DETACHED_BLUE_SPECKS'],
  ['march','MARCH-ATTEMPT-1','exec-e04efcde-a96e-4114-a2b3-3f7dca7672c2','SEMANTIC_REJECTED_HIGHLIGHT_REPEATED_FEBRUARY_POSITION'],
  ['spring','SPRING-ATTEMPT-1','exec-e5ccb7f6-7f46-46de-8a4f-6225a53ca84a','ALPHA_REJECTED_WIDE_COLORED_HALO'],
  ['summer','SUMMER-ATTEMPT-1','exec-ec9df50b-1e46-4837-834e-8dbfbb2f47f1','ALPHA_REJECTED_DETACHED_GOLD_RED_SPECKS']
];
const failedAttempts=[];
for(const [concept,slug,callId,rejectionReason] of rejectedMeta){
  const output=path.join(outputRoot,callId+'.png');
  const bytes=await readFile(output);
  const record=await generationRecord(callId);
  failedAttempts.push({
    concept,slug,generatorOutputOriginalPath:output,expectedOriginalSha256:sha256(bytes),
    generatorCallId:callId,sourceSessionTranscript:session,prompt:record.revisedPrompt,
    rejectionReason,acceptedAsCandidate:false
  });
}

if(accepted.length!==17||new Set(accepted.map(record=>record.concept)).size!==17){
  throw Error('Y4M03_REQUIRES_EXACTLY_17_DISTINCT_ACCEPTED_CONCEPTS');
}
if(failedAttempts.length!==4)throw Error('Y4M03_REJECTED_ATTEMPT_COUNT_DRIFT');
const input={
  schemaVersion:'DUDUQ_Y4M03_GENERATION_INPUT_V1',createdAt,moduleId,lane:'generation',
  writeBoundary:batchRel,provider:'OpenAI Codex native image generation',tool:'image_gen.imagegen',
  apiPurchaseOrExternalCredentialUsed:false,transparentBackgroundRequested:true,
  sourceQuestionFile:'dist-pages/content/english/year-4/module-03/questions.json',
  auditedQuestionCount:20,auditedVisualUsageCount:84,auditedSourceMediaIdCount:43,
  auditedVisualConceptCount:17,auditedAllSemanticTargetCount:24,
  nonVisualOnlySemanticTargets:['autumn/fall','brother','father','grandfather','grandmother','mother','sister'],
  globalPendingMediaIdsAtAudit:1055,
  preexistingOriginalAudit:{
    searchedCandidateManifests:true,searchedModuleCandidateFilenames:true,
    exactVerifiedOriginalMatches:[],verifiedReuseCount:0,generationRequiredCount:17,
    currentRegistrySources:'43 provisional SVG assets; no eligible original PNG'
  },
  generated:accepted,reused:[],failedAttempts,
  generatorLimitReached:false,blockedGenerator:false
};
await writeFile(path.join(batchDir,'generation-input.json'),JSON.stringify(input,null,2)+'\n');
console.log(JSON.stringify({status:'Y4M03_GENERATION_INPUT_ASSEMBLED',generated:accepted.length,reused:0,
  failedAttempts:failedAttempts.length,blockedGenerator:false,writeBoundary:batchRel}));

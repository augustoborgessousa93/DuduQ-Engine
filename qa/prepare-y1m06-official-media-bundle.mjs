#!/usr/bin/env node
/**
 * Convert the hash-bound Y1M06 generation bundle into an occurrence-safe
 * review bundle. No runtime, source question, answer, mechanic, Gold Master,
 * approval flag, or production file is changed here.
 */
import {readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {validateDuduqRgbaPng} from './validate-duduq-png.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,SPLITS,
  locate,sha256,withoutMediaIds
} from './y1m06-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundle=path.join(root,BUNDLE_REL);
const generationManifestPath=path.join(bundle,'generation-batch-manifest.json');
const manifestPath=path.join(bundle,'batch-manifest.json');
const generationSemanticPath=path.join(bundle,'generation-semantic-evidence.json');
const semanticPath=path.join(bundle,'semantic-evidence.json');
const questionPath=path.join(dist,MODULE_PATH),registryPath=path.join(dist,REGISTRY_PATH);
const sourceManifestBytes=await readFile(manifestPath);

let generationManifestBytes;
try{generationManifestBytes=await readFile(generationManifestPath);}
catch(error){
  if(error.code!=='ENOENT')throw error;
  if(sha256(sourceManifestBytes)!==EXPECTED.generationManifestSha256)
    throw Error('Y1M06_GENERATION_MANIFEST_HASH_MISMATCH_BEFORE_PREPARATION');
  generationManifestBytes=sourceManifestBytes;
  await writeFile(generationManifestPath,generationManifestBytes);
}
if(sha256(generationManifestBytes)!==EXPECTED.generationManifestSha256)
  throw Error('Y1M06_GENERATION_MANIFEST_PROVENANCE_MISMATCH');
const generated=JSON.parse(generationManifestBytes);
if(generated.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||generated.moduleId!==MODULE_ID||
   generated.assets?.length!==EXPECTED.assets||generated.originalAuditedPendingIds!==EXPECTED.sourceIds||
   generated.finalBindingIds!==EXPECTED.sourceIds||generated.totalQuestionUsageRecords!==EXPECTED.usageRecords||
   generated.questionContractsReviewed!==EXPECTED.questions||generated.productionApproved!==false||generated.integrated!==false)
  throw Error('STALE_Y1M06_GENERATION_BUNDLE');

let generationSemanticBytes;
try{generationSemanticBytes=await readFile(generationSemanticPath);}
catch(error){
  if(error.code!=='ENOENT')throw error;
  generationSemanticBytes=await readFile(semanticPath);
  const generationSemantic=JSON.parse(generationSemanticBytes);
  if(generationSemantic.schemaVersion!=='DUDUQ_Y1M06_SEMANTIC_EVIDENCE_V1'||
     generationSemantic.evidenceClass!=='CODEX_MODEL_PRECHECK_ONLY'||generationSemantic.assetCount!==EXPECTED.assets)
    throw Error('STALE_Y1M06_GENERATION_SEMANTIC_EVIDENCE');
  await writeFile(generationSemanticPath,generationSemanticBytes);
}
const generationSemantic=JSON.parse(generationSemanticBytes);

const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
  readFile(questionPath),readFile(registryPath),readFile(path.join(dist,'.duduq-pages-manifest'))
]);
if(sha256(questionBytes)!==EXPECTED.cleanV26QuestionSha256||sha256(registryBytes)!==EXPECTED.cleanV26RegistrySha256||
   sha256(integrityBytes)!==EXPECTED.cleanV26ManifestSha256)
  throw Error('Y1M06_PREPARATION_REQUIRES_EXACT_CLEAN_V26');
const questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes);
if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions||registry.entries?.length!==EXPECTED.cleanV26RegistryEntries)
  throw Error('Y1M06_CLEAN_V26_SHAPE_MISMATCH');
const invariant=sha256(Buffer.from(JSON.stringify(withoutMediaIds(questions))));
if(invariant!==EXPECTED.cleanV26QuestionInvariantSha256)throw Error('Y1M06_SOURCE_QUESTION_INVARIANT_MISMATCH');

const localUsages=new Map();
for(const question of questions.items)collectQuestionMediaUsages(question,localUsages);
if(localUsages.size!==EXPECTED.sourceIds||[...localUsages.values()].reduce((n,x)=>n+x.length,0)!==EXPECTED.usageRecords)
  throw Error('Y1M06_SOURCE_USAGE_COUNT_CHANGED');

const globalUsages=new Map();
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0');
  const contract=JSON.parse(await readFile(path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`),'utf8'));
  if(contract.items?.length!==20)throw Error('GLOBAL_20_QUESTION_CONTRACT_REQUIRED:'+contract.moduleId);
  for(const question of contract.items)collectQuestionMediaUsages(question,globalUsages);
}
const shared=[...localUsages.keys()].filter(id=>new Set((globalUsages.get(id)||[]).map(x=>x.moduleId)).size>1).sort();
const expectedShared=SPLITS.map(x=>x.from).sort();
if(JSON.stringify(shared)!==JSON.stringify(expectedShared))throw Error('Y1M06_SHARED_MEDIA_SET_CHANGED:'+JSON.stringify(shared));
const sharedEvidence=[];
for(const split of SPLITS){
  const records=globalUsages.get(split.from)||[],external=records.filter(x=>x.moduleId!==MODULE_ID);
  const modules=[...new Set(external.map(x=>x.moduleId))].sort();
  if(JSON.stringify(modules)!==JSON.stringify([split.externalModule])||
     external.filter(x=>x.semanticTarget).some(x=>!isExactPedagogicalConcept(x.semanticTarget,split.semanticTarget)))
    throw Error('Y1M06_SHARED_MEDIA_EXTERNAL_SCOPE_CHANGED:'+split.from);
  sharedEvidence.push({mediaId:split.from,localQuestionId:split.questionId,externalModules:modules,
    externalQuestionIds:[...new Set(external.map(x=>x.questionId))].sort(),externalUsageRecords:external.length});
}

const modeled=structuredClone(questions);
for(const split of SPLITS){
  const question=modeled.items.find(x=>x.item_id===split.questionId);
  const {node,key}=locate(question,split.field);
  if(node?.[key]!==split.from||!isExactPedagogicalConcept(node?.semanticTarget,split.semanticTarget))
    throw Error('Y1M06_SPLIT_OCCURRENCE_CHANGED:'+split.from);
  node[key]=split.to;
}
if(sha256(Buffer.from(JSON.stringify(withoutMediaIds(modeled))))!==invariant)throw Error('Y1M06_SPLIT_CHANGED_QUESTION_BEHAVIOR');
const modeledUsages=new Map();
for(const question of modeled.items)collectQuestionMediaUsages(question,modeledUsages);
if(modeledUsages.size!==EXPECTED.finalIds||[...modeledUsages.values()].reduce((n,x)=>n+x.length,0)!==EXPECTED.usageRecords||
   [...modeledUsages.values()].some(records=>records.length!==1||records[0].moduleId!==MODULE_ID||!records[0].semanticTarget))
  throw Error('Y1M06_POST_SPLIT_USAGE_SCOPE_INVALID');

const registryIndex=new Map(registry.entries.map(entry=>[entry.mediaId,entry]));
const sourceIds=[...localUsages.keys()].sort();
const sourceEntries=sourceIds.map(id=>{
  const entry=registryIndex.get(id);
  if(!entry||entry.kind!=='image'||entry.temporary!==true)throw Error('Y1M06_SOURCE_ENTRY_NOT_PROVISIONAL_IMAGE:'+id);
  return entry;
});
const usageProjection=sourceIds.map(mediaId=>({mediaId,records:localUsages.get(mediaId).map(record=>({
  questionId:record.questionId,moduleId:record.moduleId,semanticTarget:record.semanticTarget
}))}));
if(sha256(Buffer.from(JSON.stringify(sourceEntries)))!==EXPECTED.sourceRegistryEntryProjectionSha256||
   sha256(Buffer.from(JSON.stringify(usageProjection)))!==EXPECTED.sourceUsageProjectionSha256)
  throw Error('Y1M06_SOURCE_SCOPE_PIN_MISMATCH');

const y1m04Bundle=JSON.parse(await readFile(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json')));
const y1m04Ids=new Set(y1m04Bundle.assets.flatMap(asset=>asset.bindings.map(binding=>binding.mediaId)));
const outsideY1M04=registry.entries.filter(entry=>!y1m04Ids.has(entry.mediaId));
if(outsideY1M04.length!==EXPECTED.registryEntriesOutsideY1M04||
   sha256(Buffer.from(JSON.stringify(outsideY1M04)))!==EXPECTED.registryEntriesOutsideY1M04Sha256)
  throw Error('Y1M06_OUTSIDE_Y1M04_PIN_MISMATCH');

const sourcePin={
  schemaVersion:'DUDUQ_Y1M06_SOURCE_REGISTRY_PIN_V1',status:'PASS_EXACT_CLEAN_V26_AND_SCOPED_Y1M04_PREDECESSOR',
  moduleId:MODULE_ID,createdAt:'2026-10-30',cleanV26QuestionSha256:EXPECTED.cleanV26QuestionSha256,
  cleanV26QuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  cleanV26RegistrySha256:EXPECTED.cleanV26RegistrySha256,cleanV26RegistryEntries:EXPECTED.cleanV26RegistryEntries,
  cleanV26ManifestSha256:EXPECTED.cleanV26ManifestSha256,sourceRegistryEntryCount:EXPECTED.sourceIds,
  sourceQuestionUsageRecords:EXPECTED.usageRecords,sourceRegistryEntryProjectionSha256:EXPECTED.sourceRegistryEntryProjectionSha256,
  sourceUsageProjectionSha256:EXPECTED.sourceUsageProjectionSha256,
  registryEntriesOutsideY1M04:EXPECTED.registryEntriesOutsideY1M04,
  registryEntriesOutsideY1M04Sha256:EXPECTED.registryEntriesOutsideY1M04Sha256,
  occurrenceScopedSplits:SPLITS,sharedSourceEvidence:sharedEvidence,sourceHashesRewritten:false,
  productionApproved:false,goldMastersModified:false
};
const pinBytes=Buffer.from(JSON.stringify(sourcePin,null,2)+'\n'),pinSha256=sha256(pinBytes);
await writeFile(path.join(bundle,'source-registry-pin.json'),pinBytes);

const manifest=structuredClone(generated),splitByOccurrence=new Map(SPLITS.map(x=>[x.questionId+'\0'+x.from,x]));
manifest.status='HASH_BOUND_OCCURRENCE_SCOPED_REVIEW_BUNDLE_READY_FOR_QA_OVERLAY';
manifest.occurrenceScopedSplits=SPLITS;
manifest.sourceRegistryPinEvidence='source-registry-pin.json';
manifest.sourceRegistryPinEvidenceSha256=pinSha256;
manifest.generationManifestEvidence='generation-batch-manifest.json';
manifest.generationManifestSha256=EXPECTED.generationManifestSha256;
manifest.sourceQuestionContractSha256=EXPECTED.cleanV26QuestionSha256;
manifest.sourceQuestionInvariantSha256=EXPECTED.cleanV26QuestionInvariantSha256;
manifest.assets=manifest.assets.map(asset=>{
  const next=structuredClone(asset),visualSemanticTarget=next.semanticTarget;
  if(next.assetKey==='Y1M06-CANDIDATE-BIG-SPIDER'){
    next.visualSemanticTarget=visualSemanticTarget;
    next.semanticTarget='big';
  }
  next.reviewEvidence=BUNDLE_REL+'/semantic-evidence.json';
  next.bindings=next.bindings.map(binding=>{
    const split=splitByOccurrence.get(binding.questionId+'\0'+binding.mediaId);
    return split?{...binding,mediaId:split.to,splitFromMediaId:split.from}:binding;
  });
  return next;
});

const candidateAssets=[];
for(const asset of manifest.assets){
  const bytes=await readFile(path.join(bundle,asset.file));
  if(sha256(bytes)!==asset.sha256)throw Error('Y1M06_FINAL_PNG_HASH_MISMATCH:'+asset.assetKey);
  const qc=validateDuduqRgbaPng(bytes);
  if(qc.width!==asset.pixelWidth||qc.height!==asset.pixelHeight||qc.width<1024||qc.height<1024)
    throw Error('Y1M06_FINAL_PNG_DIMENSION_MISMATCH:'+asset.assetKey);
  const originalFile=asset.provenance?.originalFile;
  if(!originalFile||sha256(await readFile(path.join(bundle,originalFile)))!==asset.provenance.originalSha256)
    throw Error('Y1M06_ORIGINAL_PROVENANCE_HASH_MISMATCH:'+asset.assetKey);
  const generatedRecord=(generationSemantic.assets||[]).find(x=>x.assetKey===asset.assetKey);
  if(generatedRecord?.manualModelPrecheck!=='PASS'||generatedRecord.sha256!==asset.sha256)
    throw Error('Y1M06_GENERATION_SEMANTIC_PRECHECK_STALE:'+asset.assetKey);
  candidateAssets.push({assetKey:asset.assetKey,concept:asset.semanticTarget,
    visualConcept:asset.visualSemanticTarget||asset.semanticTarget,file:asset.file,width:qc.width,height:qc.height,
    format:'PNG_RGBA8_NONINTERLACED',sha256:asset.sha256,sourceSha256:asset.provenance.originalSha256,
    semanticPrecheck:'PASSED',technicalQc:{...qc},visualReview:'PASSED_FULL_SUBJECT_NO_CUTOFF_NO_TEXT_NO_WRONG_DISTRACTOR_TRANSPARENT'});
}

const bindings=manifest.assets.flatMap(asset=>asset.bindings.map(binding=>({assetKey:asset.assetKey,
  semanticTarget:asset.semanticTarget,visualSemanticTarget:asset.visualSemanticTarget||asset.semanticTarget,...binding})));
if(bindings.length!==EXPECTED.usageRecords||new Set(bindings.map(x=>x.mediaId)).size!==EXPECTED.finalIds)
  throw Error('Y1M06_PREPARED_BINDING_COUNT_MISMATCH');
for(const binding of bindings){
  const records=modeledUsages.get(binding.mediaId)||[];
  if(records.length!==1||records[0].questionId!==binding.questionId||
     !isExactPedagogicalConcept(records[0].semanticTarget,binding.semanticTarget))
    throw Error('Y1M06_PREPARED_BINDING_SEMANTIC_MISMATCH:'+binding.mediaId);
}

const semantic={
  schemaVersion:'DUDUQ_Y1M06_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V2',createdAt:'2026-10-30',moduleId:MODULE_ID,
  provider:'Codex built-in image_gen',reviewAuthority:'CODEX_DELEGATED_BY_OWNER_REQUEST',
  evidenceBoundary:'Independent Codex visual/semantic review for isolated compiled QA; no owner homologation or production approval claimed.',
  generationSemanticEvidence:'generation-semantic-evidence.json',generationSemanticEvidenceSha256:sha256(generationSemanticBytes),
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  sourceRegistrySha256:EXPECTED.cleanV26RegistrySha256,reviewedQuestionCount:EXPECTED.questions,
  auditedPendingIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,usageRecords:EXPECTED.usageRecords,
  splitReview:{status:'APPROVED_OCCURRENCE_SCOPED_SPLITS',count:SPLITS.length,splits:SPLITS,
    reason:'Six source IDs are referenced outside Y1M06. Only the exact Y1M06 occurrences receive new IDs, so Y2M05, Y2M06 and Y4M05 remain provisional and untouched.'},
  renderedReview:{status:'PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW',criteria:[
    'correct concept in all 93 reviewed occurrences','complete transparent subject','no embedded text or watermark',
    'no wrong distractor','BIG and SMALL use the same neutral cube family at materially different scale',
    'BIG-SPIDER retains the answer concept big while preserving the reviewed spider scale clue'
  ]},
  candidateAssets,productionReleaseCertified:false,humanHomologationClaimed:false,
  answerKeysModified:false,mechanicsModified:false,goldMastersModified:false
};
const plan={
  schemaVersion:'DUDUQ_Y1M06_OFFICIAL_MEDIA_BINDING_PLAN_V1',moduleId:MODULE_ID,status:'PASS',
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  sourceRegistryPinSha256:pinSha256,inputMediaIds:EXPECTED.sourceIds,outputMediaIds:EXPECTED.finalIds,
  usageRecords:EXPECTED.usageRecords,occurrenceScopedSplits:SPLITS,concepts:[...new Set(manifest.assets.map(x=>x.semanticTarget))].sort(),
  bindings:bindings.sort((a,b)=>a.mediaId.localeCompare(b.mediaId)),productionApproved:false
};
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await writeFile(semanticPath,JSON.stringify(semantic,null,2)+'\n');
await writeFile(path.join(root,'qa/results/y1m06-official-media-binding-plan.json'),JSON.stringify(plan,null,2)+'\n');
const finalStats=await stat(manifestPath);
console.log(JSON.stringify({status:'Y1M06_OFFICIAL_MEDIA_BUNDLE_PREPARED',questions:EXPECTED.questions,
  sourceIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,usageRecords:EXPECTED.usageRecords,
  occurrenceScopedSplits:SPLITS.length,sourceImages:EXPECTED.assets,manifestBytes:finalStats.size,
  sourceHashesRewritten:false,productionApproved:false},null,2));

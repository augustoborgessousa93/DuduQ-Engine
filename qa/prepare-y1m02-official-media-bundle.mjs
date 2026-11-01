#!/usr/bin/env node
/** Prepare the hash-bound native-image bundle for the audited Y1M02 review artifact. */
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {canonicalLfSha256,verifyY1M02SourceRegistryContext} from './verify-y1m02-source-registry-pin.mjs';
import {
  applyOccurrenceSplits,assetDefinitions,bundleRel,moduleId,numberWords,questionsRel,registryRel,
  sha256,sharedSourceIds,sourcePin,splits,withoutMediaIds
} from './y1m02-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundle=path.join(root,bundleRel);
const qPath=path.join(dist,questionsRel),regPath=path.join(dist,registryRel),evidenceRel=bundleRel+'/semantic-evidence.json';
const [qBytes,regBytes,closureBytes,pinBytes]=await Promise.all([
  readFile(qPath),readFile(regPath),readFile(path.join(root,'qa/results/media-module-closure.json')),
  readFile(path.join(bundle,'source-registry-pin.json'))
]);
const source=JSON.parse(qBytes),closure=JSON.parse(closureBytes);
if(source.moduleId!==moduleId||source.items?.length!==20)throw Error('Y1M02_20_QUESTION_CONTRACT_REQUIRED');
const closureModule=closure.modulesDetail?.find(x=>x.moduleId===moduleId);
if(closure.modules!==30||closure.activities!==600||closureModule?.referencedMediaIds!==92||closureModule?.provisionalOrBlockedReferencedIds!==92)
  throw Error('FRESH_30X600_Y1M02_92_ID_CANONICAL_AUDIT_REQUIRED');
const sourceRegistryGate=await verifyY1M02SourceRegistryContext({root,dist,questionBytes:qBytes,registryBytes:regBytes,
  integrityBytes:await readFile(path.join(dist,'.duduq-pages-manifest'))});

const sourceUsages=new Map();for(const question of source.items)collectQuestionMediaUsages(question,sourceUsages);
const sourceUsageRecords=[...sourceUsages.values()].reduce((n,x)=>n+x.length,0);
if(sourceUsages.size!==92||sourceUsageRecords!==94)throw Error('AUDITED_Y1M02_92_ID_94_USAGE_CONTRACT_CHANGED');
const closureIds=(closureModule.blockers||[]).map(x=>x.mediaId).sort();
if(JSON.stringify(closureIds)!==JSON.stringify([...sourceUsages.keys()].sort()))throw Error('CANONICAL_Y1M02_PENDING_SET_CHANGED');

// Prove the exact shared-ID set against all 600 immutable question contracts.
const globalUsages=new Map();let globalModulesVerified=0,globalActivitiesVerified=0;
for(let year=1;year<=5;year++)for(let n=1;n<=6;n++){
  const mm=String(n).padStart(2,'0');
  const contract=JSON.parse(await readFile(path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`),'utf8'));
  if(contract.items?.length!==20)throw Error('GLOBAL_20_QUESTION_CONTRACT_REQUIRED:'+contract.moduleId);
  globalModulesVerified++;globalActivitiesVerified+=contract.items.length;
  for(const question of contract.items)collectQuestionMediaUsages(question,globalUsages);
}
if(globalModulesVerified!==30||globalActivitiesVerified!==600)throw Error('GLOBAL_30_MODULE_600_ACTIVITY_CONTRACT_REQUIRED');
const observedShared=[...sourceUsages.keys()].filter(id=>new Set((globalUsages.get(id)||[]).map(x=>x.moduleId)).size>1).sort();
if(JSON.stringify(observedShared)!==JSON.stringify(sharedSourceIds))throw Error('Y1M02_SHARED_ID_SET_CHANGED:'+JSON.stringify(observedShared));
for(const id of sharedSourceIds){
  const local=sourceUsages.get(id)||[],modules=[...new Set((globalUsages.get(id)||[]).map(x=>x.moduleId))].sort();
  if(!local.length||!modules.includes(moduleId)||modules.length<2||local.some(x=>!x.semanticTarget))throw Error('SHARED_ID_SCOPE_NOT_PROVEN:'+id);
}

const invariant=sha256(Buffer.from(JSON.stringify(withoutMediaIds(source))));
const {questions:modeled}=applyOccurrenceSplits(source,{semanticMatcher:isExactPedagogicalConcept});
if(sha256(Buffer.from(JSON.stringify(withoutMediaIds(modeled))))!==invariant)throw Error('QUESTION_ANSWER_OR_MECHANIC_CHANGED_DURING_SPLIT_MODELING');
const postUsages=new Map();for(const question of modeled.items)collectQuestionMediaUsages(question,postUsages);
const postUsageRecords=[...postUsages.values()].reduce((n,x)=>n+x.length,0);
if(postUsages.size!==93||postUsageRecords!==94)throw Error('EXPECTED_93_FINAL_IDS_AND_94_USAGE_RECORDS');
for(const id of sharedSourceIds)if(postUsages.has(id))throw Error('SHARED_SOURCE_ID_REMAINS_IN_Y1M02:'+id);
for(const [id,records] of postUsages){
  if(!records.length||records.some(x=>x.moduleId!==moduleId||!numberWords.includes(x.semanticTarget)))throw Error('UNREVIEWED_Y1M02_USAGE:'+id);
  if(records.some(x=>!isExactPedagogicalConcept(records[0].semanticTarget,x.semanticTarget)))throw Error('AMBIGUOUS_Y1M02_MEDIA_ID:'+id);
}

const manifestAssets=[],candidateAssets=[],assetForWord=new Map();
for(const definition of assetDefinitions){
  const [original,finalBytes,nativeBytes]=await Promise.all([
    readFile(path.join(bundle,definition.originalFile)),readFile(path.join(bundle,definition.file)),readFile(definition.nativeSourceLocalPath)
  ]);
  const sourceSha=sha256(original),nativeSha=sha256(nativeBytes),finalSha=sha256(finalBytes);
  if(sourceSha!==definition.sourceSha256||nativeSha!==definition.sourceSha256||!original.equals(nativeBytes))
    throw Error('NATIVE_SOURCE_PROVENANCE_HASH_MISMATCH:'+definition.code);
  const width=finalBytes.readUInt32BE(16),height=finalBytes.readUInt32BE(20),qc=inspectPng(finalBytes),originalQc=inspectPng(original);
  if(finalSha!==definition.finalSha256||width!==definition.width||height!==definition.height||finalBytes[24]!==8||finalBytes[25]!==6||
     !qc.valid||!qc.transparent||qc.subjectScaleQc!=='PASS')throw Error('FINAL_PNG_QC_FAILED:'+definition.code+':'+JSON.stringify({width,height,finalSha,qc}));
  if(!originalQc.valid||!originalQc.transparent||original[24]!==8||original[25]!==6)throw Error('NATIVE_ORIGINAL_QC_FAILED:'+definition.code);
  const asset={
    assetKey:definition.assetKey,file:definition.file,semanticTarget:definition.word,sha256:finalSha,pixelWidth:width,pixelHeight:height,
    review:'MODEL_SEMANTIC_PRECHECK_PASSED',reviewEvidence:evidenceRel,bindings:[],
    provenance:{provider:'Codex built-in image_gen',generationClass:definition.generationClass,prompt:definition.prompt,
      originalPromptRecordStatus:definition.originalPromptRecordStatus,originalFile:definition.originalFile,originalSha256:sourceSha,
      nativeSourceLocalPathAtReview:definition.nativeSourceLocalPath,nativeSourceExactHashMatch:true,
      alphaNormalization:{script:'qa/normalize-transparent-png-alpha.mjs',semanticPixelsChanged:false,
        expectedCoreComponents:definition.expectedComponents,
        operation:'retain opaque subject plus antialias edge, remove detached or diffuse low-alpha pixels, and add transparent safe-margin padding'}}
  };
  manifestAssets.push(asset);assetForWord.set(definition.word,asset);
  candidateAssets.push({assetKey:asset.assetKey,concept:definition.word,count:definition.count,file:definition.file,width,height,format:'PNG_RGBA',
    sha256:finalSha,sourceSha256:sourceSha,nativeSourceExactHashMatch:true,semanticPrecheck:'PASSED',technicalQc:{...qc},
    visualReview:'PASSED_EXACT_COUNT_FULL_SUBJECT_NO_CUTOFF_NONEMPTY_NO_TEXT_NO_DISTRACTOR_TRANSPARENT'});
}
if(new Set(manifestAssets.map(x=>x.sha256)).size!==10)throw Error('EXPECTED_10_UNIQUE_NATIVE_PNGS');

for(const [mediaId,records] of [...postUsages].sort(([a],[b])=>a.localeCompare(b))){
  const semantic=records[0].semanticTarget,asset=assetForWord.get(semantic);if(!asset)throw Error('NO_ASSET_FOR_SEMANTIC:'+semantic);
  const questionIds=[...new Set(records.map(x=>x.questionId))].sort();
  asset.bindings.push({questionId:questionIds[0],mediaId,verifiedQuestionIds:questionIds});
}
const bindingCount=manifestAssets.reduce((n,x)=>n+x.bindings.length,0);
if(bindingCount!==93||manifestAssets.some(x=>!x.bindings.length))throw Error('Y1M02_BINDING_COVERAGE_MISMATCH');

const sourceModules=Object.fromEntries(sharedSourceIds.map(id=>[id,[...new Set((globalUsages.get(id)||[]).map(x=>x.moduleId))].sort()]));
const manifest={schemaVersion:'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1',createdAt:'2026-10-30',moduleId,
  source:'Codex native OpenAI image generation',provider:'Codex built-in image_gen',status:'HASH_BOUND_REVIEWED_BUNDLE_READY_FOR_QA_OVERLAY',
  sourceRegistryPinEvidence:'source-registry-pin.json',sourceRegistryPinEvidenceSha256:canonicalLfSha256(pinBytes),
  originalAuditedPendingIds:92,originalQuestionUsageRecords:94,occurrenceScopedSplits:splits,finalBindingIds:93,totalQuestionUsageRecords:94,
  uniqueNativePngs:10,questionContractsReviewed:20,preservesAllQuestionsAnswerKeysAndMechanics:true,productionApproved:false,assets:manifestAssets};
const evidence={schemaVersion:'DUDUQ_Y1M02_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V1',createdAt:'2026-10-30',moduleId,
  provider:'Codex built-in image_gen',sourceQuestionContractSha256:sha256(qBytes),sourceRegistrySha256:sourcePin.legacyReviewedRegistrySha256,
  sourceRegistryReplaySha256:sha256(regBytes),sourceQuestionInvariantSha256:invariant,
  sourceCanonicalClosureSha256:sourcePin.legacyCanonicalClosureSha256,replayCanonicalClosureSha256:sha256(closureBytes),sourceRegistryGate,
  reviewedQuestionCount:20,
  auditedPendingIds:92,sourceUsageRecords:94,postSplitIds:93,usageRecords:94,uniqueNativePngs:10,
  splitReview:{status:'APPROVED_OCCURRENCE_SCOPED_SPLITS',count:splits.length,distinctSharedSourceIds:sharedSourceIds.length,splits,sourceModules,
    reason:'Ten source IDs have consumers outside Y1M02. Eleven exact Y1M02 occurrences are isolated; every external consumer and original registry entry remains provisional and untouched.'},
  renderedReview:{status:'PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW',criteria:[
    'exact quantity of one through ten glossy red apples','all apples complete, individually countable and fully visible','no cutoff or empty image',
    'no unrelated countable object, embedded text, numeral, watermark or opaque backdrop','genuine transparency and small-card readability'
  ]},candidateAssets,globalModulesVerified,globalActivitiesVerified,productionReleaseCertified:false,goldMastersModified:false};
const plan={schemaVersion:'DUDUQ_Y1M02_OFFICIAL_MEDIA_BINDING_PLAN_V1',moduleId,status:'PASS',
  sourceQuestionContractSha256:evidence.sourceQuestionContractSha256,sourceQuestionInvariantSha256:invariant,inputMediaIds:92,
  outputMediaIds:93,usageRecords:94,uniqueNativePngs:10,sharedSourceIds,splits,concepts:numberWords,
  bindings:manifestAssets.flatMap(asset=>asset.bindings.map(binding=>({assetKey:asset.assetKey,semanticTarget:asset.semanticTarget,sha256:asset.sha256,...binding}))).sort((a,b)=>a.mediaId.localeCompare(b.mediaId)),
  productionApproved:false};
await Promise.all([
  writeFile(path.join(bundle,'batch-manifest.json'),JSON.stringify(manifest,null,2)+'\n'),
  writeFile(path.join(bundle,'semantic-evidence.json'),JSON.stringify(evidence,null,2)+'\n'),
  writeFile(path.join(root,'qa/results/y1m02-official-media-binding-plan.json'),JSON.stringify(plan,null,2)+'\n')
]);
console.log(JSON.stringify({status:'Y1M02_OFFICIAL_MEDIA_BUNDLE_PREPARED',nativePngs:10,manifestAssets:10,auditedPendingIds:92,
  sourceUsageRecords:94,finalMediaIds:93,finalUsageRecords:94,splits:11,sharedSourceIds:10,questions:20,
  globalModulesVerified,globalActivitiesVerified,productionApproved:false,bundle:bundleRel},null,2));

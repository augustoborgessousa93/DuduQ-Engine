#!/usr/bin/env node
/** Apply the isolated, occurrence-scoped Y2M06 media overlay to dist-pages. */
import {readFile,writeFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {verifyY2M06SourceRegistryContext} from './verify-y2m06-source-registry-rebase.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,PLAN_REL,REGISTRY_PATH,
  allBindings,canonicalLfSha256,locate,normalize,parseIntegrity,sha256,structuralDiff,withoutVisualMediaIds
} from './y2m06-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL),
  apply=process.argv.includes('--apply'),qPath=path.join(dist,MODULE_PATH),regPath=path.join(dist,REGISTRY_PATH),
  integrityPath=path.join(dist,'.duduq-pages-manifest');
const [manifestBytes,evidenceBytes,rebaseBytes,pinBytes,planBytes,qBytes,regBytes,integrityBytes]=await Promise.all([
  readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'semantic-evidence.json')),
  readFile(path.join(bundleDir,'source-registry-rebase.json')),readFile(path.join(bundleDir,'source-registry-pin.json')),
  readFile(path.join(root,PLAN_REL)),readFile(qPath),readFile(regPath),readFile(integrityPath)
]);
const manifest=JSON.parse(manifestBytes),evidence=JSON.parse(evidenceBytes),rebase=JSON.parse(rebaseBytes),
  pin=JSON.parse(pinBytes),plan=JSON.parse(planBytes),integrity=parseIntegrity(integrityBytes);
if(integrity.entries.get(MODULE_PATH)?.sha!==sha256(qBytes)||integrity.entries.get(REGISTRY_PATH)?.sha!==sha256(regBytes))
  throw Error('Y2M06_SOURCE_FILES_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.moduleId!==MODULE_ID||
   manifest.originalAuditedPendingIds!==EXPECTED.sourceIds||manifest.finalBindingIds!==EXPECTED.finalIds||
   manifest.totalQuestionUsageRecords!==EXPECTED.logicalUsageRecords||manifest.actualMediaFieldSplits!==EXPECTED.actualMediaFieldSplits||
   manifest.guardedUsageRecords!==EXPECTED.guardedUsageRecords||manifest.assets?.length!==EXPECTED.reviewAssets||
   new Set(manifest.assets.map(asset=>asset.sha256)).size!==EXPECTED.uniquePngs||manifest.productionApproved!==false)
  throw Error('STALE_OR_INVALID_Y2M06_REVIEW_BUNDLE');
if(evidence.schemaVersion!=='DUDUQ_Y2M06_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V2'||
   evidence.sourceQuestionContractSha256!==EXPECTED.cleanV26QuestionSha256||
   evidence.sourceQuestionInvariantSha256!==EXPECTED.cleanV26QuestionInvariantSha256||
   evidence.renderedReview?.status!=='PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW'||
   evidence.candidateAssets?.length!==EXPECTED.reviewAssets||evidence.productionReleaseCertified!==false||
   evidence.humanHomologationClaimed!==false)throw Error('Y2M06_SEMANTIC_EVIDENCE_STALE_OR_INCOMPLETE');
if(manifest.sourceRegistryPinEvidenceSha256!==canonicalLfSha256(pinBytes)||
   manifest.sourceRegistryRebaseEvidenceSha256!==canonicalLfSha256(rebaseBytes)||
   manifest.integrationBindingPlanSha256!==canonicalLfSha256(planBytes)||
   plan.actualMediaFieldSplits?.length!==EXPECTED.actualMediaFieldSplits)
  throw Error('Y2M06_SOURCE_EVIDENCE_OR_SPLIT_REFERENCE_MISMATCH');
const sourceRegistryGate=await verifyY2M06SourceRegistryContext({root,questionBytes:qBytes,registryBytes:regBytes,integrityBytes});

const questions=JSON.parse(qBytes),registry=JSON.parse(regBytes),sourceIds=new Set(pin.sourceMediaIds),bindings=allBindings(manifest),
  finalIds=new Set(bindings.map(binding=>binding.mediaId));
if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions||bindings.length!==EXPECTED.finalIds||
   finalIds.size!==EXPECTED.finalIds)throw Error('INVALID_Y2M06_CONTRACT_OR_BINDINGS');
const invariantBefore=sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))));
if(invariantBefore!==EXPECTED.cleanV26QuestionInvariantSha256)throw Error('Y2M06_QUESTION_INVARIANT_SOURCE_MISMATCH');

for(const split of plan.actualMediaFieldSplits){
  const question=questions.items.find(item=>item.item_id===split.questionId),{node,key}=locate(question,split.field);
  if(node?.[key]!==split.from||!sourceIds.has(split.from)||!finalIds.has(split.to))
    throw Error('Y2M06_SPLIT_OCCURRENCE_CHANGED:'+split.questionId+':'+split.field);
  node[key]=split.to;
}
if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))))!==invariantBefore)
  throw Error('Y2M06_QUESTION_OR_BEHAVIOR_CHANGED_BY_SPLIT');
const baseline=JSON.parse(qBytes),expectedDiffs=plan.actualMediaFieldSplits.map(split=>{
  const questionIndex=baseline.items.findIndex(item=>item.item_id===split.questionId);
  return `items.${questionIndex}.${split.field.replaceAll('[','.').replaceAll(']','')}`;
}).sort(),actualDiffs=structuralDiff(baseline,questions).sort();
if(JSON.stringify(actualDiffs)!==JSON.stringify(expectedDiffs))
  throw Error('Y2M06_QUESTION_DIFF_NOT_MEDIA_FIELD_SCOPED:'+JSON.stringify(actualDiffs));

const postSplitUsages=new Map();for(const question of questions.items)collectQuestionMediaUsages(question,postSplitUsages);
const finalUsageRows=[...postSplitUsages].filter(([id])=>finalIds.has(id));
if(finalUsageRows.length!==EXPECTED.finalIds||finalUsageRows.reduce((sum,[,records])=>sum+records.length,0)!==EXPECTED.guardedUsageRecords)
  throw Error('Y2M06_POST_SPLIT_BINDING_COUNT_MISMATCH');
for(const binding of bindings){
  const records=postSplitUsages.get(binding.mediaId)||[];
  if(!records.length||records.some(record=>record.questionId!==binding.questionId||
     normalize(record.semanticTarget)!==normalize(binding.asset.semanticTarget)))
    throw Error('Y2M06_BUNDLE_SEMANTIC_OR_QUESTION_MISMATCH:'+binding.mediaId);
}
for(const id of sourceIds)if(postSplitUsages.has(id))throw Error('Y2M06_SOURCE_MEDIA_ID_REMAINS_IN_MODULE:'+id);

const nextRegistry=structuredClone(registry),registryIndex=new Map(nextRegistry.entries.map((entry,index)=>[entry.mediaId,index])),
  splitFieldsByTarget=new Map();
for(const split of plan.actualMediaFieldSplits){
  if(!splitFieldsByTarget.has(split.to))splitFieldsByTarget.set(split.to,[]);
  splitFieldsByTarget.get(split.to).push(split.field);
}
for(const binding of bindings){
  const sourceIndex=registryIndex.get(binding.splitFromMediaId),prior=nextRegistry.entries[sourceIndex];
  if(!prior)throw Error('Y2M06_SHARED_SOURCE_REGISTRY_ENTRY_MISSING:'+binding.splitFromMediaId);
  if(registryIndex.has(binding.mediaId))throw Error('Y2M06_SPLIT_ID_ALREADY_EXISTS:'+binding.mediaId);
  const clone={...structuredClone(prior),mediaId:binding.mediaId,status:'APPROVED',kind:'image',temporary:true,
    semantic:binding.asset.semanticTarget,description:'Occurrence-scoped provisional clone for an audited Y2M06 visual context.',
    integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
    splitAudit:{questionId:binding.questionId,fromMediaId:binding.splitFromMediaId,
      fields:[...(splitFieldsByTarget.get(binding.mediaId)||[])].sort(),
      logicalContractPaths:[...(binding.contractPaths||[])].sort(),
      reason:'Preserve every shared source ID while importing only the exact Y2M06 question occurrence.'}};
  registryIndex.set(binding.mediaId,nextRegistry.entries.length);nextRegistry.entries.push(clone);
}
const nextQ=Buffer.from(JSON.stringify(questions,null,2)+'\n'),nextReg=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');
const result={status:'Y2M06_OFFICIAL_MEDIA_OVERLAY_PREFLIGHT_PASS',mode:apply?'APPLY':'DRY_RUN',
  questions:EXPECTED.questions,sourcePendingIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,
  logicalUsageRecords:EXPECTED.logicalUsageRecords,guardedUsageRecords:EXPECTED.guardedUsageRecords,
  actualMediaFieldSplits:EXPECTED.actualMediaFieldSplits,reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,
  sourceRegistryGate,onlyQuestionDiffs:expectedDiffs,answerKeysChanged:0,mechanicsChanged:0,
  goldMastersModified:false,productionModified:false,humanHomologationClaimed:false};
if(!apply){console.log(JSON.stringify(result,null,2));process.exit(0);}

const runtimePaths=manifest.assets.map(asset=>'content/english/assets/images/chatgpt/'+
  asset.assetKey.toLowerCase()+'-'+asset.sha256.slice(0,12)+'.png');
const original={q:qBytes,reg:regBytes,integrity:integrityBytes},existedBefore=new Map();
for(const relative of runtimePaths)existedBefore.set(relative,await stat(path.join(dist,relative)).then(()=>true,()=>false));
try{
  await writeFile(qPath,nextQ);await writeFile(regPath,nextReg);
  const lines=[...integrity.lines];
  lines[integrity.entries.get(MODULE_PATH).index]=MODULE_PATH+' '+sha256(nextQ);
  lines[integrity.entries.get(REGISTRY_PATH).index]=REGISTRY_PATH+' '+sha256(nextReg);
  await writeFile(integrityPath,lines.join('\n')+'\n');
  const importerPath=path.join(root,'scripts/duduq-import-chatgpt-bundle.mjs'),originalArgv=[...process.argv];
  try{
    process.argv.splice(0,process.argv.length,process.execPath,importerPath,bundleDir,'--apply');
    await import(pathToFileURL(importerPath).href+'?y2m06-overlay');
  }finally{process.argv.splice(0,process.argv.length,...originalArgv);}
  const finalIntegrity=parseIntegrity(await readFile(integrityPath)),finalQ=await readFile(qPath),finalReg=await readFile(regPath);
  if(finalIntegrity.entries.get(MODULE_PATH)?.sha!==sha256(finalQ)||
     finalIntegrity.entries.get(REGISTRY_PATH)?.sha!==sha256(finalReg))throw Error('Y2M06_FINAL_MANIFEST_MISMATCH');
  if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(JSON.parse(finalQ)))))!==invariantBefore)
    throw Error('Y2M06_FINAL_QUESTION_INVARIANT_MISMATCH');
  const finalRegistry=JSON.parse(finalReg),finalRegistryIndex=new Map(finalRegistry.entries.map(entry=>[entry.mediaId,entry]));
  for(const binding of bindings){
    const entry=finalRegistryIndex.get(binding.mediaId);
    if(entry?.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry?.temporary!==true||
       entry?.sha256!==binding.asset.sha256)throw Error('Y2M06_IMPORTED_ENTRY_NOT_HASH_BOUND:'+binding.mediaId);
  }
  const sourceProjection=pin.sourceMediaIds.slice().sort().map(id=>finalRegistryIndex.get(id));
  if(sha256(Buffer.from(JSON.stringify(sourceProjection)))!==pin.sourceRegistryEntryProjectionSha256)
    throw Error('Y2M06_SOURCE_REGISTRY_ENTRY_CHANGED_BY_OVERLAY');
  result.status='Y2M06_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED';
  result.compiledManifestSha256=sha256(await readFile(integrityPath));result.importedBindings=bindings.length;
  result.runtimePngPaths=new Set(runtimePaths).size;result.uniquePngHashes=new Set(bindings.map(binding=>binding.asset.sha256)).size;
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(qPath,original.q);await writeFile(regPath,original.reg);await writeFile(integrityPath,original.integrity);
  for(const relative of runtimePaths)if(!existedBefore.get(relative))await rm(path.join(dist,relative),{force:true});
  throw error;
}

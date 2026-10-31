#!/usr/bin/env node
/** Apply the isolated, occurrence-safe Y2M01 media overlay to dist-pages. */
import {readFile,writeFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyY2M01SourceRegistryContext} from './verify-y2m01-source-registry-pin.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  allBindings,collectVisualUsages,locate,parseIntegrity,sha256,structuralDiff,withoutVisualMediaIds
} from './y2m01-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL),
  apply=process.argv.includes('--apply'),qPath=path.join(dist,MODULE_PATH),regPath=path.join(dist,REGISTRY_PATH),
  integrityPath=path.join(dist,'.duduq-pages-manifest');
const [manifestBytes,evidenceBytes,pinBytes,qBytes,regBytes,integrityBytes]=await Promise.all([
  readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'semantic-evidence.json')),
  readFile(path.join(bundleDir,'source-registry-pin.json')),readFile(qPath),readFile(regPath),readFile(integrityPath)
]);
const manifest=JSON.parse(manifestBytes),evidence=JSON.parse(evidenceBytes),pin=JSON.parse(pinBytes),integrity=parseIntegrity(integrityBytes);
if(integrity.entries.get(MODULE_PATH)?.sha!==sha256(qBytes)||integrity.entries.get(REGISTRY_PATH)?.sha!==sha256(regBytes))
  throw Error('Y2M01_SOURCE_FILES_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.moduleId!==MODULE_ID||
   manifest.originalAuditedPendingIds!==EXPECTED.sourceIds||manifest.finalBindingIds!==EXPECTED.finalIds||
   manifest.totalQuestionUsageRecords!==EXPECTED.sourceUsageRecords||manifest.occurrenceScopedSplits?.length!==EXPECTED.splitRecords||
   manifest.assets?.length!==EXPECTED.reviewAssets||new Set(manifest.assets.map(asset=>asset.sha256)).size!==EXPECTED.uniquePngs||
   manifest.productionApproved!==false)throw Error('STALE_OR_INVALID_Y2M01_REVIEW_BUNDLE');
if(evidence.schemaVersion!=='DUDUQ_Y2M01_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V2'||
   evidence.sourceQuestionContractSha256!==EXPECTED.cleanV26QuestionSha256||
   evidence.sourceQuestionInvariantSha256!==EXPECTED.cleanV26QuestionInvariantSha256||
   evidence.renderedReview?.status!=='PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW'||
   evidence.candidateAssets?.length!==EXPECTED.reviewAssets||evidence.productionReleaseCertified!==false||
   evidence.humanHomologationClaimed!==false)throw Error('Y2M01_SEMANTIC_EVIDENCE_STALE_OR_INCOMPLETE');
if(manifest.sourceRegistryPinEvidenceSha256!==sha256(pinBytes)||
   JSON.stringify(manifest.occurrenceScopedSplits)!==JSON.stringify(pin.occurrenceScopedSplits))
  throw Error('Y2M01_SOURCE_PIN_OR_SPLIT_REFERENCE_MISMATCH');
const sourceRegistryGate=await verifyY2M01SourceRegistryContext({root,questionBytes:qBytes,registryBytes:regBytes,integrityBytes});

const questions=JSON.parse(qBytes),registry=JSON.parse(regBytes),sourceIds=new Set(pin.sourceMediaIds);
if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions)throw Error('INVALID_Y2M01_CONTRACT');
const invariantBefore=sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))));
if(invariantBefore!==EXPECTED.cleanV26QuestionInvariantSha256)throw Error('Y2M01_QUESTION_INVARIANT_SOURCE_MISMATCH');
const sourceUsages=new Map();for(const question of questions.items)collectVisualUsages(question,sourceIds,sourceUsages);
if(sourceUsages.size!==EXPECTED.sourceIds||[...sourceUsages.values()].reduce((sum,records)=>sum+records.length,0)!==EXPECTED.sourceUsageRecords)
  throw Error('Y2M01_SOURCE_BINDINGS_CHANGED');

for(const split of manifest.occurrenceScopedSplits){
  const question=questions.items.find(item=>item.item_id===split.questionId),{node,key}=locate(question,split.field);
  if(node?.[key]!==split.from||node?.semanticTarget!==split.semanticTarget)
    throw Error('Y2M01_SPLIT_OCCURRENCE_CHANGED:'+split.questionId+':'+split.field);
  node[key]=split.to;
}
if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))))!==invariantBefore)
  throw Error('Y2M01_QUESTION_OR_BEHAVIOR_CHANGED_BY_SPLIT');
const baseline=JSON.parse(qBytes),expectedDiffs=manifest.occurrenceScopedSplits.map(split=>{
  const questionIndex=baseline.items.findIndex(item=>item.item_id===split.questionId);
  return `items.${questionIndex}.${split.field.replaceAll('[','.').replaceAll(']','')}`;
}).sort(),actualDiffs=structuralDiff(baseline,questions).sort();
if(JSON.stringify(actualDiffs)!==JSON.stringify(expectedDiffs))
  throw Error('Y2M01_QUESTION_DIFF_NOT_OCCURRENCE_SCOPED:'+JSON.stringify(actualDiffs));

const finalIds=new Set(allBindings(manifest).map(binding=>binding.mediaId)),postSplitUsages=new Map();
for(const question of questions.items)collectVisualUsages(question,finalIds,postSplitUsages);
if(postSplitUsages.size!==EXPECTED.finalIds||[...postSplitUsages.values()].reduce((sum,records)=>sum+records.length,0)!==EXPECTED.sourceUsageRecords)
  throw Error('Y2M01_POST_SPLIT_BINDING_COUNT_MISMATCH');
const bindings=allBindings(manifest);
if(bindings.length!==EXPECTED.finalIds||new Set(bindings.map(binding=>binding.mediaId)).size!==EXPECTED.finalIds)
  throw Error('Y2M01_BUNDLE_BINDINGS_NOT_EXACT');
for(const binding of bindings){
  const records=postSplitUsages.get(binding.mediaId)||[];
  if(!records.length||records.some(record=>record.questionId!==binding.questionId||record.semanticTarget!==binding.asset.semanticTarget))
    throw Error('Y2M01_BUNDLE_SEMANTIC_OR_QUESTION_MISMATCH:'+binding.mediaId);
}
for(const id of postSplitUsages.keys())if(!bindings.some(binding=>binding.mediaId===id))throw Error('UNCOVERED_Y2M01_MEDIA_ID:'+id);

const nextRegistry=structuredClone(registry),registryIndex=new Map(nextRegistry.entries.map((entry,index)=>[entry.mediaId,index]));
const splitByTarget=new Map();
for(const split of manifest.occurrenceScopedSplits){
  if(!splitByTarget.has(split.to))splitByTarget.set(split.to,{...split,fields:[]});
  splitByTarget.get(split.to).fields.push(split.field);
}
for(const binding of bindings){
  const split=splitByTarget.get(binding.mediaId),prior=nextRegistry.entries[registryIndex.get(split?.from)];
  if(!prior)throw Error('Y2M01_SHARED_SOURCE_REGISTRY_ENTRY_MISSING:'+split?.from);
  if(registryIndex.has(binding.mediaId))throw Error('Y2M01_SPLIT_ID_ALREADY_EXISTS:'+binding.mediaId);
  const clone={...structuredClone(prior),mediaId:binding.mediaId,status:'APPROVED',kind:'image',temporary:true,
    semantic:binding.asset.semanticTarget,description:'Occurrence-scoped provisional clone for an audited Y2M01 visual context.',
    integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
    splitAudit:{questionId:binding.questionId,fromMediaId:split.from,fields:[...split.fields].sort(),
      reason:'Preserve every shared or canonical source ID while importing only the exact Y2M01 question context.'}};
  registryIndex.set(binding.mediaId,nextRegistry.entries.length);nextRegistry.entries.push(clone);
}
const nextQ=Buffer.from(JSON.stringify(questions,null,2)+'\n'),nextReg=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');
const result={status:'Y2M01_OFFICIAL_MEDIA_OVERLAY_PREFLIGHT_PASS',mode:apply?'APPLY':'DRY_RUN',
  questions:EXPECTED.questions,sourcePendingIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,
  usageRecords:EXPECTED.sourceUsageRecords,occurrenceScopedSplitRecords:EXPECTED.splitRecords,
  reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,sourceRegistryGate,
  onlyQuestionDiffs:expectedDiffs,answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,productionModified:false};
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
    await import(pathToFileURL(importerPath).href+'?y2m01-overlay');
  }finally{process.argv.splice(0,process.argv.length,...originalArgv);}
  const finalIntegrity=parseIntegrity(await readFile(integrityPath)),finalQ=await readFile(qPath),finalReg=await readFile(regPath);
  if(finalIntegrity.entries.get(MODULE_PATH)?.sha!==sha256(finalQ)||
     finalIntegrity.entries.get(REGISTRY_PATH)?.sha!==sha256(finalReg))throw Error('Y2M01_FINAL_MANIFEST_MISMATCH');
  if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(JSON.parse(finalQ)))))!==invariantBefore)
    throw Error('Y2M01_FINAL_QUESTION_INVARIANT_MISMATCH');
  const finalRegistry=JSON.parse(finalReg);
  for(const binding of bindings){
    const entry=finalRegistry.entries.find(candidate=>candidate.mediaId===binding.mediaId);
    if(entry?.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry?.temporary!==true||
       entry?.sha256!==binding.asset.sha256)throw Error('Y2M01_IMPORTED_ENTRY_NOT_HASH_BOUND:'+binding.mediaId);
  }
  result.status='Y2M01_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED';
  result.compiledManifestSha256=sha256(await readFile(integrityPath));result.importedBindings=bindings.length;
  result.runtimePngPaths=new Set(runtimePaths).size;result.uniquePngHashes=new Set(bindings.map(binding=>binding.asset.sha256)).size;
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(qPath,original.q);await writeFile(regPath,original.reg);await writeFile(integrityPath,original.integrity);
  for(const relative of runtimePaths)if(!existedBefore.get(relative))await rm(path.join(dist,relative),{force:true});
  throw error;
}

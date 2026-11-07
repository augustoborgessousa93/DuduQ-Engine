#!/usr/bin/env node
/** Apply the isolated, occurrence-safe Y4M02 candidate overlay to dist-pages. */
import {readFile,writeFile,rm,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {verifyY4M02SourceRegistryContext} from './verify-y4m02-source-registry-rebase.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  allBindings,bindingKey,collectReferenceFields,deriveOccurrenceGroups,locate,
  parseIntegrity,sha256,structuralDiff,withoutVisualMediaIds
} from './y4m02-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL),
  apply=process.argv.includes('--apply'),qPath=path.join(dist,MODULE_PATH),regPath=path.join(dist,REGISTRY_PATH),
  integrityPath=path.join(dist,'.duduq-pages-manifest'),resultPath=path.join(root,'qa/results/y4m02-overlay-application.json');
const [manifestBytes,evidenceBytes,rebaseBytes,qBytes,regBytes,integrityBytes]=await Promise.all([
  readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'integration-semantic-evidence.json')),
  readFile(path.join(bundleDir,'source-registry-rebase.json')),readFile(qPath),readFile(regPath),readFile(integrityPath)
]);
const manifest=JSON.parse(manifestBytes),evidence=JSON.parse(evidenceBytes),rebase=JSON.parse(rebaseBytes),
  integrity=parseIntegrity(integrityBytes);
if(integrity.entries.get(MODULE_PATH)?.sha!==sha256(qBytes)||integrity.entries.get(REGISTRY_PATH)?.sha!==sha256(regBytes))
  throw Error('Y4M02_SOURCE_FILES_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.moduleId!==MODULE_ID||
   manifest.originalAuditedPendingIds!==EXPECTED.sourceIds||manifest.finalBindingIds!==EXPECTED.finalIds||
   manifest.totalQuestionUsageRecords!==EXPECTED.logicalUsageRecords||manifest.assets?.length!==EXPECTED.reviewAssets||
   new Set(manifest.assets.map(asset=>asset.sha256)).size!==EXPECTED.uniquePngs||manifest.productionApproved!==false||
   manifest.integrated!==false)throw Error('STALE_OR_INVALID_Y4M02_REVIEW_BUNDLE');
if(evidence.schemaVersion!=='DUDUQ_Y4M02_INTEGRATION_SEMANTIC_EVIDENCE_V1'||
   evidence.status!=='PASS_FOR_ISOLATED_COMPILED_QA_OVERLAY'||
   evidence.sourceQuestionSha256!==EXPECTED.sourceQuestionSha256||
   evidence.sourceQuestionInvariantSha256!==EXPECTED.sourceQuestionInvariantSha256||
   evidence.renderedReview?.status!=='PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW'||
   evidence.candidateAssets?.length!==EXPECTED.reviewAssets||evidence.productionReleaseCertified!==false||
   evidence.humanHomologationClaimed!==false||evidence.sourceRegistryRebaseSha256!==sha256(rebaseBytes))
  throw Error('Y4M02_INTEGRATION_SEMANTIC_EVIDENCE_STALE');
const sourceRegistryGate=await verifyY4M02SourceRegistryContext({root,questionBytes:qBytes,registryBytes:regBytes,integrityBytes});

const questions=JSON.parse(qBytes),registry=JSON.parse(regBytes),sourceIds=new Set(rebase.sourceMediaIds||
  JSON.parse(await readFile(path.join(bundleDir,'source-registry-pin.json'),'utf8')).sourceMediaIds);
// Rebase evidence deliberately records counts/hashes, while the generation pin
// remains the sole canonical list of all 39 source IDs.
if(!rebase.sourceMediaIds){
  sourceIds.clear();
  const pin=JSON.parse(await readFile(path.join(bundleDir,'source-registry-pin.json'),'utf8'));
  for(const id of pin.sourceMediaIds)sourceIds.add(id);
}
if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions||sourceIds.size!==EXPECTED.sourceIds)
  throw Error('INVALID_Y4M02_CONTRACT_OR_SOURCE_IDS');
const invariantBefore=sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))));
if(invariantBefore!==EXPECTED.sourceQuestionInvariantSha256)throw Error('Y4M02_QUESTION_INVARIANT_SOURCE_MISMATCH');

const {records:sourceRecords,groups}=deriveOccurrenceGroups(questions,sourceIds),
  groupsByKey=new Map(groups.map(group=>[bindingKey(group.sourceMediaId,group.questionId),group])),
  bindings=allBindings(manifest),bindingsByKey=new Map();
if(sourceRecords.length!==EXPECTED.rawReferenceFields||groups.length!==EXPECTED.finalIds||
   new Set(sourceRecords.map(record=>record.mediaId)).size!==EXPECTED.sourceIds)
  throw Error('Y4M02_SOURCE_BINDINGS_CHANGED');
for(const binding of bindings){
  const key=bindingKey(binding.splitFromMediaId,binding.questionId);
  if(bindingsByKey.has(key)||!groupsByKey.has(key))throw Error('Y4M02_BINDING_GROUP_MISMATCH:'+key);
  bindingsByKey.set(key,binding);
}
if(bindingsByKey.size!==EXPECTED.finalIds)throw Error('Y4M02_BINDING_COUNT_MISMATCH');

const baseline=structuredClone(questions),expectedDiffs=[];
for(const group of groups){
  const binding=bindingsByKey.get(bindingKey(group.sourceMediaId,group.questionId));
  if(!binding)throw Error('Y4M02_GROUP_WITHOUT_BINDING:'+group.sourceMediaId+':'+group.questionId);
  const question=questions.items.find(item=>item.item_id===group.questionId),questionIndex=questions.items.indexOf(question);
  for(const field of group.fields){
    const {node,key}=locate(question,field);
    if(node?.[key]!==group.sourceMediaId)throw Error('Y4M02_SPLIT_FIELD_CHANGED:'+group.questionId+':'+field);
    node[key]=binding.mediaId;expectedDiffs.push(`items.${questionIndex}.${field.replaceAll('[','.').replaceAll(']','')}`);
  }
}
if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))))!==invariantBefore)
  throw Error('Y4M02_QUESTION_OR_BEHAVIOR_CHANGED_BY_SPLIT');
const actualDiffs=structuralDiff(baseline,questions).sort();expectedDiffs.sort();
if(JSON.stringify(actualDiffs)!==JSON.stringify(expectedDiffs))
  throw Error('Y4M02_QUESTION_DIFF_NOT_OCCURRENCE_SCOPED:'+JSON.stringify(actualDiffs));

const finalIds=new Set(bindings.map(binding=>binding.mediaId)),postSplitRecords=[];
for(const question of questions.items)collectReferenceFields(question,finalIds,postSplitRecords);
if(bindings.length!==EXPECTED.finalIds||finalIds.size!==EXPECTED.finalIds||
   postSplitRecords.length!==EXPECTED.rawReferenceFields||new Set(postSplitRecords.map(record=>record.mediaId)).size!==EXPECTED.finalIds)
  throw Error('Y4M02_POST_SPLIT_BINDING_COUNT_MISMATCH');
for(const binding of bindings){
  const records=postSplitRecords.filter(record=>record.mediaId===binding.mediaId);
  if(!records.length||records.some(record=>record.questionId!==binding.questionId))
    throw Error('Y4M02_BUNDLE_QUESTION_SCOPE_MISMATCH:'+binding.mediaId);
}

const nextRegistry=structuredClone(registry),registryIndex=new Map(nextRegistry.entries.map((entry,index)=>[entry.mediaId,index]));
for(const binding of bindings){
  const prior=nextRegistry.entries[registryIndex.get(binding.splitFromMediaId)],group=groupsByKey.get(bindingKey(binding.splitFromMediaId,binding.questionId));
  if(!prior||prior.kind!=='image')throw Error('Y4M02_SHARED_SOURCE_REGISTRY_ENTRY_MISSING:'+binding.splitFromMediaId);
  if(registryIndex.has(binding.mediaId))throw Error('Y4M02_SPLIT_ID_ALREADY_EXISTS:'+binding.mediaId);
  // APPROVED is loader compatibility only. The temporary/pending fields below
  // deliberately keep this QA-only clone out of official/pedagogical closure.
  const clone={...structuredClone(prior),mediaId:binding.mediaId,status:'APPROVED',kind:'image',temporary:true,
    semantic:binding.asset.semanticTarget,description:'Occurrence-scoped provisional clone for an audited Y4M02 visual context.',
    integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
    splitAudit:{questionId:binding.questionId,fromMediaId:binding.splitFromMediaId,fields:[...group.fields],
      logicalContractPaths:[...(binding.contractPaths||[])].sort(),
      reason:'Preserve every shared source ID while importing only the exact Y4M02 question context.'}};
  delete clone.verification;
  registryIndex.set(binding.mediaId,nextRegistry.entries.length);nextRegistry.entries.push(clone);
}
const nextQ=Buffer.from(JSON.stringify(questions,null,2)+'\n'),nextReg=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');
const result={schemaVersion:'DUDUQ_Y4M02_OVERLAY_APPLICATION_V1',
  status:'Y4M02_OFFICIAL_MEDIA_OVERLAY_PREFLIGHT_PASS',mode:apply?'APPLY':'DRY_RUN',questions:EXPECTED.questions,
  sourcePendingIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,logicalUsageRecords:EXPECTED.logicalUsageRecords,
  rawReferenceFields:EXPECTED.rawReferenceFields,reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,
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
  const child=spawnSync(process.execPath,['scripts/duduq-import-chatgpt-bundle.mjs',bundleDir,'--apply'],{
    cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024
  });
  if(child.stdout)process.stdout.write(child.stdout);if(child.stderr)process.stderr.write(child.stderr);
  if(child.status!==0)throw Error('Y4M02_HASH_BOUND_IMPORTER_FAILED:'+child.status+':'+
    String(child.error?.code||child.error?.message||'NO_SPAWN_ERROR'));
  const finalIntegrity=parseIntegrity(await readFile(integrityPath)),finalQ=await readFile(qPath),finalReg=await readFile(regPath);
  if(finalIntegrity.entries.get(MODULE_PATH)?.sha!==sha256(finalQ)||
     finalIntegrity.entries.get(REGISTRY_PATH)?.sha!==sha256(finalReg))throw Error('Y4M02_FINAL_MANIFEST_MISMATCH');
  if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(JSON.parse(finalQ)))))!==invariantBefore)
    throw Error('Y4M02_FINAL_QUESTION_INVARIANT_MISMATCH');
  const finalRegistry=JSON.parse(finalReg);
  for(const binding of bindings){
    const entry=finalRegistry.entries.find(candidate=>candidate.mediaId===binding.mediaId);
    if(entry?.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry?.temporary!==true||
       entry?.sha256!==binding.asset.sha256)throw Error('Y4M02_IMPORTED_ENTRY_NOT_HASH_BOUND:'+binding.mediaId);
  }
  result.status='Y4M02_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED';result.createdAt=new Date().toISOString();
  result.compiledManifestSha256=sha256(await readFile(integrityPath));result.importedBindings=bindings.length;
  result.runtimePngPaths=new Set(runtimePaths).size;result.uniquePngHashes=new Set(bindings.map(binding=>binding.asset.sha256)).size;
  await writeFile(resultPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(qPath,original.q);await writeFile(regPath,original.reg);await writeFile(integrityPath,original.integrity);
  for(const relative of runtimePaths)if(!existedBefore.get(relative))await rm(path.join(dist,relative),{force:true});
  throw error;
}




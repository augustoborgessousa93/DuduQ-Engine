#!/usr/bin/env node
/** Apply the isolated, occurrence-safe Y1M06 media overlay to dist-pages. */
import {readFile,writeFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {verifyY1M06SourceRegistryContext} from './verify-y1m06-source-registry-pin.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,SPLITS,
  allBindings,locate,parseIntegrity,sha256,structuralDiff,withoutMediaIds
} from './y1m06-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),apply=process.argv.includes('--apply');
const bundle=path.join(root,BUNDLE_REL),qPath=path.join(dist,MODULE_PATH),regPath=path.join(dist,REGISTRY_PATH);
const integrityPath=path.join(dist,'.duduq-pages-manifest');
const [manifestBytes,evidenceBytes,qBytes,regBytes,integrityBytes]=await Promise.all([
  readFile(path.join(bundle,'batch-manifest.json')),readFile(path.join(bundle,'semantic-evidence.json')),
  readFile(qPath),readFile(regPath),readFile(integrityPath)
]);
const manifest=JSON.parse(manifestBytes),evidence=JSON.parse(evidenceBytes);
const original={q:qBytes,reg:regBytes,integrity:integrityBytes};
const integrity=parseIntegrity(integrityBytes);
if(integrity.entries.get(MODULE_PATH)?.sha!==sha256(qBytes)||integrity.entries.get(REGISTRY_PATH)?.sha!==sha256(regBytes))
  throw Error('Y1M06_SOURCE_FILES_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.moduleId!==MODULE_ID||
   manifest.status!=='HASH_BOUND_OCCURRENCE_SCOPED_REVIEW_BUNDLE_READY_FOR_QA_OVERLAY'||
   manifest.originalAuditedPendingIds!==EXPECTED.sourceIds||manifest.finalBindingIds!==EXPECTED.finalIds||
   manifest.totalQuestionUsageRecords!==EXPECTED.usageRecords||manifest.occurrenceScopedSplits?.length!==EXPECTED.splits||
   manifest.assets?.length!==EXPECTED.assets||manifest.productionApproved!==false)
  throw Error('STALE_OR_INVALID_Y1M06_REVIEW_BUNDLE');
if(evidence.schemaVersion!=='DUDUQ_Y1M06_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V2'||
   evidence.sourceQuestionContractSha256!==EXPECTED.cleanV26QuestionSha256||
   evidence.sourceQuestionInvariantSha256!==EXPECTED.cleanV26QuestionInvariantSha256||
   evidence.renderedReview?.status!=='PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW'||
   evidence.candidateAssets?.length!==EXPECTED.assets||evidence.productionReleaseCertified!==false)
  throw Error('Y1M06_SEMANTIC_EVIDENCE_STALE_OR_INCOMPLETE');
const sourceRegistryGate=await verifyY1M06SourceRegistryContext({root,questionBytes:qBytes,registryBytes:regBytes,integrityBytes});

const questions=JSON.parse(qBytes),registry=JSON.parse(regBytes);
if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions)throw Error('INVALID_Y1M06_CONTRACT');
const invariantBefore=sha256(Buffer.from(JSON.stringify(withoutMediaIds(questions))));
if(invariantBefore!==EXPECTED.cleanV26QuestionInvariantSha256)throw Error('Y1M06_QUESTION_INVARIANT_SOURCE_MISMATCH');
const sourceUsages=new Map();for(const question of questions.items)collectQuestionMediaUsages(question,sourceUsages);
if(sourceUsages.size!==EXPECTED.sourceIds||[...sourceUsages.values()].reduce((n,x)=>n+x.length,0)!==EXPECTED.usageRecords)
  throw Error('Y1M06_SOURCE_BINDINGS_CHANGED');

for(const split of SPLITS){
  const question=questions.items.find(x=>x.item_id===split.questionId);
  const {node,key}=locate(question,split.field);
  if(node?.[key]!==split.from||!isExactPedagogicalConcept(node?.semanticTarget,split.semanticTarget))
    throw Error('Y1M06_SPLIT_OCCURRENCE_CHANGED:'+split.from);
  node[key]=split.to;
}
if(sha256(Buffer.from(JSON.stringify(withoutMediaIds(questions))))!==invariantBefore)
  throw Error('Y1M06_QUESTION_OR_BEHAVIOR_CHANGED_BY_SPLIT');
const baseline=JSON.parse(qBytes),expectedDiffs=SPLITS.map(split=>{
  const questionIndex=baseline.items.findIndex(x=>x.item_id===split.questionId);
  return `items.${questionIndex}.${split.field.replaceAll('[','.').replaceAll(']','')}`;
}).sort();
const actualDiffs=structuralDiff(baseline,questions).sort();
if(JSON.stringify(actualDiffs)!==JSON.stringify(expectedDiffs))
  throw Error('Y1M06_QUESTION_DIFF_NOT_OCCURRENCE_SCOPED:'+JSON.stringify(actualDiffs));

const postSplit=new Map();for(const question of questions.items)collectQuestionMediaUsages(question,postSplit);
if(postSplit.size!==EXPECTED.finalIds||[...postSplit.values()].reduce((n,x)=>n+x.length,0)!==EXPECTED.usageRecords)
  throw Error('Y1M06_POST_SPLIT_BINDING_COUNT_MISMATCH');
const bindings=allBindings(manifest);
if(bindings.length!==EXPECTED.usageRecords||new Set(bindings.map(x=>x.mediaId)).size!==EXPECTED.finalIds)
  throw Error('Y1M06_BUNDLE_BINDINGS_NOT_EXACT');
for(const binding of bindings){
  const records=postSplit.get(binding.mediaId)||[];
  if(records.length!==1||records[0].questionId!==binding.questionId||
     !isExactPedagogicalConcept(binding.asset.semanticTarget,records[0].semanticTarget))
    throw Error('Y1M06_BUNDLE_SEMANTIC_OR_QUESTION_MISMATCH:'+binding.mediaId);
}
for(const id of postSplit.keys())if(!bindings.some(x=>x.mediaId===id))throw Error('UNCOVERED_Y1M06_MEDIA_ID:'+id);

const nextRegistry=structuredClone(registry),registryIndex=new Map(nextRegistry.entries.map((entry,index)=>[entry.mediaId,index]));
for(const split of SPLITS){
  const prior=nextRegistry.entries[registryIndex.get(split.from)];
  if(!prior||prior.kind!=='image'||prior.temporary!==true)throw Error('Y1M06_SHARED_SOURCE_NOT_PROVISIONAL:'+split.from);
  if(registryIndex.has(split.to))throw Error('Y1M06_SPLIT_ID_ALREADY_EXISTS:'+split.to);
  const clone={...structuredClone(prior),mediaId:split.to,semantic:split.semanticTarget,
    description:'Occurrence-scoped provisional clone for an audited Y1M06 node; reviewed pixels are imported only into the isolated QA artifact.',
    splitAudit:{questionId:split.questionId,fromMediaId:split.from,field:split.field,externalModule:split.externalModule,
      reason:'Keep the external module provisional and untouched while binding only the exact Y1M06 occurrence.'}};
  registryIndex.set(split.to,nextRegistry.entries.length);nextRegistry.entries.push(clone);
}
const nextQ=Buffer.from(JSON.stringify(questions,null,2)+'\n'),nextReg=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');
const result={status:'Y1M06_OFFICIAL_MEDIA_OVERLAY_PREFLIGHT_PASS',mode:apply?'APPLY':'DRY_RUN',questions:EXPECTED.questions,
  sourcePendingIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,occurrenceScopedSplits:EXPECTED.splits,
  pngSourceImages:EXPECTED.assets,manifestAssets:EXPECTED.assets,sourceRegistryGate,
  onlyQuestionDiffs:expectedDiffs,answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,productionModified:false};
if(!apply){console.log(JSON.stringify(result,null,2));process.exit(0);}

const runtimePaths=manifest.assets.map(asset=>'content/english/assets/images/chatgpt/'+
  asset.assetKey.toLowerCase()+'-'+asset.sha256.slice(0,12)+'.png');
const existedBefore=new Map();
for(const relative of runtimePaths)existedBefore.set(relative,await stat(path.join(dist,relative)).then(()=>true,()=>false));
try{
  await writeFile(qPath,nextQ);await writeFile(regPath,nextReg);
  const lines=[...integrity.lines];
  lines[integrity.entries.get(MODULE_PATH).index]=MODULE_PATH+' '+sha256(nextQ);
  lines[integrity.entries.get(REGISTRY_PATH).index]=REGISTRY_PATH+' '+sha256(nextReg);
  await writeFile(integrityPath,lines.join('\n')+'\n');
  // The unattended Windows sandbox can deny child-process creation with
  // spawn EPERM. Execute the existing importer module in this process so its
  // full preflight, backup, rollback and integrity guards remain unchanged.
  const importerPath=path.join(root,'scripts/duduq-import-chatgpt-bundle.mjs');
  const originalArgv=[...process.argv];
  try{
    process.argv.splice(0,process.argv.length,process.execPath,importerPath,bundle,'--apply');
    await import(pathToFileURL(importerPath).href+'?y1m06-overlay');
  }finally{
    process.argv.splice(0,process.argv.length,...originalArgv);
  }
  const finalIntegrity=parseIntegrity(await readFile(integrityPath)),finalQ=await readFile(qPath),finalReg=await readFile(regPath);
  if(finalIntegrity.entries.get(MODULE_PATH)?.sha!==sha256(finalQ)||
     finalIntegrity.entries.get(REGISTRY_PATH)?.sha!==sha256(finalReg))throw Error('Y1M06_FINAL_MANIFEST_MISMATCH');
  if(sha256(Buffer.from(JSON.stringify(withoutMediaIds(JSON.parse(finalQ)))))!==invariantBefore)
    throw Error('Y1M06_FINAL_QUESTION_INVARIANT_MISMATCH');
  const finalRegistry=JSON.parse(finalReg);
  for(const binding of bindings){
    const entry=finalRegistry.entries.find(x=>x.mediaId===binding.mediaId);
    if(entry?.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry?.temporary!==true||
       entry?.sha256!==binding.asset.sha256)throw Error('Y1M06_IMPORTED_ENTRY_NOT_HASH_BOUND:'+binding.mediaId);
  }
  result.status='Y1M06_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED';
  result.compiledManifestSha256=sha256(await readFile(integrityPath));
  result.importedBindings=bindings.length;result.runtimePngs=new Set(bindings.map(x=>x.asset.sha256)).size;
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(qPath,original.q);await writeFile(regPath,original.reg);await writeFile(integrityPath,original.integrity);
  for(const relative of runtimePaths)if(!existedBefore.get(relative))await rm(path.join(dist,relative),{force:true});
  throw error;
}

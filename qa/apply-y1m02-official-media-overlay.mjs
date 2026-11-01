#!/usr/bin/env node
/** Apply the reviewed Y1M02 native-media overlay to the compiled review artifact only. */
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {verifyY1M02SourceRegistryContext} from './verify-y1m02-source-registry-pin.mjs';
import {
  applyOccurrenceSplits,bundleRel,diffObjects,moduleId,questionsRel,registryRel,sha256,sharedSourceIds,
  splitDiffPaths,withoutMediaIds
} from './y1m02-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),apply=process.argv.includes('--apply');
const qPath=path.join(dist,questionsRel),regPath=path.join(dist,registryRel),integrityPath=path.join(dist,'.duduq-pages-manifest');
const applicationReportPath=path.join(root,'qa/results/y1m02-overlay-application.json');
const bundle=path.join(root,bundleRel);
const [manifestBytes,evidenceBytes,qBytes,regBytes,integrityBytes]=await Promise.all([
  readFile(path.join(bundle,'batch-manifest.json')),readFile(path.join(bundle,'semantic-evidence.json')),
  readFile(qPath),readFile(regPath),readFile(integrityPath)
]);
const manifest=JSON.parse(manifestBytes),evidence=JSON.parse(evidenceBytes),source=JSON.parse(qBytes),sourceRegistry=JSON.parse(regBytes);

function parseIntegrity(bytes){
  const lines=bytes.toString('utf8').trimEnd().split(/\r?\n/),entries=new Map();
  lines.forEach((line,index)=>{const p=line.lastIndexOf(' '),name=line.slice(0,p),sha=line.slice(p+1);
    if(p<1||entries.has(name)||!/^[a-f0-9]{64}$/.test(sha))throw Error('BAD_COMPILED_MANIFEST:'+name);entries.set(name,{sha,index});});
  return {lines,entries};
}
const integrity=parseIntegrity(integrityBytes);
if(integrity.entries.get(questionsRel)?.sha!==sha256(qBytes))throw Error('QUESTION_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(integrity.entries.get(registryRel)?.sha!==sha256(regBytes))throw Error('REGISTRY_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.moduleId!==moduleId||manifest.originalAuditedPendingIds!==92||
   manifest.originalQuestionUsageRecords!==94||manifest.finalBindingIds!==93||manifest.totalQuestionUsageRecords!==94||
   manifest.uniqueNativePngs!==10||manifest.occurrenceScopedSplits?.length!==11||manifest.assets?.length!==10)
  throw Error('STALE_OR_INVALID_Y1M02_BUNDLE');
if(evidence.sourceQuestionContractSha256!==sha256(qBytes))
  throw Error('Y1M02_SOURCE_EVIDENCE_HASH_MISMATCH');
if(source.moduleId!==moduleId||source.items?.length!==20)throw Error('INVALID_Y1M02_CONTRACT');
const sourceRegistryGate=await verifyY1M02SourceRegistryContext({root,dist,questionBytes:qBytes,
  registryBytes:regBytes,integrityBytes});
const invariant=sha256(Buffer.from(JSON.stringify(withoutMediaIds(source))));
if(invariant!==evidence.sourceQuestionInvariantSha256)throw Error('QUESTION_INVARIANT_SOURCE_MISMATCH');
const sourceUsages=new Map();for(const question of source.items)collectQuestionMediaUsages(question,sourceUsages);
if(sourceUsages.size!==92||[...sourceUsages.values()].reduce((n,x)=>n+x.length,0)!==94)throw Error('Y1M02_SOURCE_BINDINGS_CHANGED');

const {questions,changes}=applyOccurrenceSplits(source,{semanticMatcher:isExactPedagogicalConcept});
if(JSON.stringify(changes)!==JSON.stringify(manifest.occurrenceScopedSplits))throw Error('OCCURRENCE_SPLIT_PLAN_CHANGED');
if(sha256(Buffer.from(JSON.stringify(withoutMediaIds(questions))))!==invariant)throw Error('QUESTION_ANSWER_OR_MECHANIC_CHANGED_BY_SPLIT');
const expectedDiffs=splitDiffPaths(source),actualDiffs=diffObjects(source,questions).filter(Boolean).sort();
if(JSON.stringify(actualDiffs)!==JSON.stringify(expectedDiffs))throw Error('QUESTION_DIFF_NOT_OCCURRENCE_SCOPED:'+JSON.stringify(actualDiffs));

const usages=new Map();for(const question of questions.items)collectQuestionMediaUsages(question,usages);
if(usages.size!==93||[...usages.values()].reduce((n,x)=>n+x.length,0)!==94)throw Error('POST_SPLIT_BINDING_COUNT_MISMATCH');
for(const id of sharedSourceIds)if(usages.has(id))throw Error('SHARED_SOURCE_ID_REMAINS_LOCAL:'+id);
const bindings=manifest.assets.flatMap(asset=>(asset.bindings||[]).map(binding=>({asset,...binding})));
if(bindings.length!==93||new Set(bindings.map(x=>x.mediaId)).size!==93)throw Error('BUNDLE_BINDINGS_NOT_EXACTLY_93');
for(const binding of bindings){
  const records=usages.get(binding.mediaId)||[],questionIds=[...new Set(records.map(x=>x.questionId))].sort();
  if(!records.length||!questionIds.includes(binding.questionId)||JSON.stringify(questionIds)!==JSON.stringify([...binding.verifiedQuestionIds].sort())||
     records.some(x=>x.moduleId!==moduleId||!isExactPedagogicalConcept(binding.asset.semanticTarget,x.semanticTarget)))
    throw Error('BUNDLE_SEMANTIC_OR_QUESTION_MISMATCH:'+binding.mediaId);
}
for(const id of usages.keys())if(!bindings.some(x=>x.mediaId===id))throw Error('UNCOVERED_Y1M02_MEDIA_ID:'+id);

const nextRegistry=structuredClone(sourceRegistry),index=new Map(nextRegistry.entries.map((entry,i)=>[entry.mediaId,i]));
for(const split of manifest.occurrenceScopedSplits){
  const prior=nextRegistry.entries[index.get(split.from)];
  if(!prior||prior.kind!=='image'||prior.temporary!==true)throw Error('SHARED_SOURCE_ID_NOT_PROVISIONAL:'+split.from);
  if(index.has(split.to))throw Error('SPLIT_ID_ALREADY_EXISTS:'+split.to);
  const clone={...structuredClone(prior),mediaId:split.to,semantic:split.semanticTarget,altText:split.semanticTarget,
    description:'Occurrence-scoped provisional registry clone for the audited Y1M02 native-media overlay.',
    splitAudit:{moduleId,questionId:split.questionId,fromMediaId:split.from,field:split.field,
      reason:'The source ID has consumers outside Y1M02; only this exact reviewed occurrence is isolated.'}};
  index.set(split.to,nextRegistry.entries.length);nextRegistry.entries.push(clone);
}
const nextQ=Buffer.from(JSON.stringify(questions,null,2)+'\n'),nextReg=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');
const result={status:'Y1M02_OFFICIAL_MEDIA_OVERLAY_PREFLIGHT_PASS',mode:apply?'APPLY':'DRY_RUN',questions:20,
  sourcePendingIds:92,sourceUsageRecords:94,postSplitIds:93,postSplitUsageRecords:94,occurrenceScopedSplits:11,
  nativePngs:10,manifestAssets:10,onlyQuestionDiffs:expectedDiffs,answerKeysChanged:0,mechanicsChanged:0,
  sourceRegistryGate,sourceHashesRewritten:false,sourceQuestionFilesModified:false,goldMastersModified:false,productionModified:false};
if(!apply){console.log(JSON.stringify(result,null,2));process.exit(0);}

try{
  await writeFile(qPath,nextQ);await writeFile(regPath,nextReg);
  const lines=[...integrity.lines];lines[integrity.entries.get(questionsRel).index]=questionsRel+' '+sha256(nextQ);
  lines[integrity.entries.get(registryRel).index]=registryRel+' '+sha256(nextReg);await writeFile(integrityPath,lines.join('\n')+'\n');
  const child=spawnSync(process.execPath,['scripts/duduq-import-chatgpt-bundle.mjs',bundle,'--apply'],{
    cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024
  });
  if(child.stdout)process.stdout.write(child.stdout);if(child.stderr)process.stderr.write(child.stderr);
  if(child.status!==0)throw Error('HASH_BOUND_IMPORTER_FAILED:'+child.status+':'+String(child.error?.code||child.error?.message||'NO_SPAWN_ERROR'));
  const [finalIntegrityBytes,finalQ,finalReg]=await Promise.all([readFile(integrityPath),readFile(qPath),readFile(regPath)]);
  const finalIntegrity=parseIntegrity(finalIntegrityBytes);
  if(finalIntegrity.entries.get(questionsRel)?.sha!==sha256(finalQ)||finalIntegrity.entries.get(registryRel)?.sha!==sha256(finalReg))
    throw Error('FINAL_COMPILED_MANIFEST_MISMATCH');
  if(sha256(Buffer.from(JSON.stringify(withoutMediaIds(JSON.parse(finalQ)))))!==invariant)throw Error('FINAL_QUESTION_INVARIANT_MISMATCH');
  const finalRegistry=JSON.parse(finalReg),runtimePaths=new Set(),runtimeHashes=new Set();
  for(const binding of bindings){
    const entry=finalRegistry.entries.find(x=>x.mediaId===binding.mediaId);
    if(entry?.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry?.temporary!==true||entry?.sha256!==binding.asset.sha256)
      throw Error('IMPORTED_ENTRY_NOT_HASH_BOUND_CANDIDATE:'+binding.mediaId);
    runtimePaths.add(entry.urlOrPath);runtimeHashes.add(entry.sha256);
  }
  if(runtimePaths.size!==10||runtimeHashes.size!==10)throw Error('EXPECTED_10_RUNTIME_PNG_PATHS_AND_HASHES');
  result.status='Y1M02_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED';result.compiledManifestSha256=sha256(finalIntegrityBytes);
  result.importedBindings=bindings.length;result.runtimePngPaths=runtimePaths.size;result.uniqueNativePngHashes=runtimeHashes.size;
  result.finishedAt=new Date().toISOString();await writeFile(applicationReportPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(qPath,qBytes);await writeFile(regPath,regBytes);await writeFile(integrityPath,integrityBytes);throw error;
}

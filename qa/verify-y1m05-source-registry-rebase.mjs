#!/usr/bin/env node
/**
 * Fail-closed source-registry gate for the Y1M05 media overlay.
 *
 * The original semantic review was captured after Y1M04 had been finalized,
 * so its whole-registry hash is a valid composed-state hash, not pristine V26.
 * This gate keeps that legacy hash as provenance and permits exactly two
 * replay contexts:
 *   1. the exact pristine V26 registry; or
 *   2. a hash-bound, independently verified Y1M04 official predecessor.
 *
 * Both contexts must retain the exact full-entry projection for all 101
 * Y1M05 source IDs. No source hash is rewritten or inferred.
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Error('Y1M05_SOURCE_REGISTRY_REBASE_FAILED:'+code)};

function parseIntegrity(bytes){
  const entries=new Map();
  for(const line of bytes.toString('utf8').trimEnd().split(/\r?\n/)){
    const split=line.lastIndexOf(' '),name=line.slice(0,split),sha=line.slice(split+1);
    if(split<1||entries.has(name)||!/^[a-f0-9]{64}$/.test(sha))fail('BAD_COMPILED_MANIFEST:'+name);
    entries.set(name,sha);
  }
  return entries;
}

function sourceProjection(questions,registry){
  const usages=new Map();
  for(const question of questions.items||[])collectQuestionMediaUsages(question,usages);
  const ids=[...usages.keys()].sort();
  const usageRecords=[...usages.values()].reduce((count,records)=>count+records.length,0);
  if(ids.length!==101||usageRecords!==101)fail('SOURCE_USAGE_COUNT:'+ids.length+':'+usageRecords);
  const registryIndex=new Map();
  for(const entry of registry.entries||[]){
    if(!entry?.mediaId||registryIndex.has(entry.mediaId))fail('DUPLICATE_OR_INVALID_REGISTRY_ID:'+entry?.mediaId);
    registryIndex.set(entry.mediaId,entry);
  }
  const entries=ids.map(id=>{
    const entry=registryIndex.get(id);
    if(!entry)fail('SOURCE_REGISTRY_ENTRY_MISSING:'+id);
    if(entry.kind!=='image'||entry.temporary!==true)fail('SOURCE_ENTRY_NOT_PROVISIONAL_IMAGE:'+id);
    for(const record of usages.get(id))if(!isExactPedagogicalConcept(entry.semantic,record.semanticTarget))
      fail('SOURCE_ENTRY_SEMANTIC_MISMATCH:'+id+':'+entry.semantic+':'+record.semanticTarget);
    return entry;
  });
  const usageProjection=ids.map(mediaId=>({mediaId,records:usages.get(mediaId).map(record=>({
    questionId:record.questionId,moduleId:record.moduleId,semanticTarget:record.semanticTarget
  }))}));
  return {ids,usages,entries,registryIndex,usageRecords,
    entryProjectionSha256:hash(Buffer.from(JSON.stringify(entries))),
    usageProjectionSha256:hash(Buffer.from(JSON.stringify(usageProjection)))};
}

function outsideY1M04Projection(registry,bundle){
  const bindings=(bundle.assets||[]).flatMap(asset=>(asset.bindings||[]).map(binding=>({asset,...binding})));
  const ids=new Set(bindings.map(x=>x.mediaId));
  if(bundle.moduleId!=='Y1M04'||bindings.length!==84||ids.size!==84)fail('Y1M04_SCOPE_BINDINGS_INVALID');
  const present=registry.entries.filter(entry=>ids.has(entry.mediaId));
  const outside=registry.entries.filter(entry=>!ids.has(entry.mediaId));
  return {bindingIds:ids,presentEntries:present.length,entries:outside,count:outside.length,
    sha256:hash(Buffer.from(JSON.stringify(outside)))};
}

async function verifyLegacyAuditSnapshot(root,rebase,projection){
  const snapshotPath=path.join(root,rebase.legacyAuditSnapshot?.path||'');
  const snapshotBytes=await readFile(snapshotPath);
  if(hash(snapshotBytes)!==rebase.legacyAuditSnapshot.sha256)fail('LEGACY_AUDIT_SNAPSHOT_HASH');
  const snapshot=JSON.parse(snapshotBytes);
  if(snapshot.modules!==30||snapshot.activities!==600||snapshot.registryEntries!==rebase.legacyAuditSnapshot.registryEntries||
     snapshot.byStatus?.OFFICIAL_PEDAGOGICALLY_VERIFIED!==rebase.legacyAuditSnapshot.verifiedY1M04Ids)
    fail('LEGACY_AUDIT_SNAPSHOT_SHAPE');
  const auditIndex=new Map((snapshot.items||[]).map(item=>[item.mediaId,item]));
  for(const id of projection.ids){
    const audit=auditIndex.get(id),entry=projection.registryIndex.get(id);
    if(!audit||audit.status!=='PROVISIONAL'||audit.temporary!==true||audit.path!==entry.urlOrPath||
       !isExactPedagogicalConcept(audit.semantic,entry.semantic))fail('LEGACY_AUDIT_SCOPE_MISMATCH:'+id);
  }
  return {path:rebase.legacyAuditSnapshot.path,sha256:hash(snapshotBytes),sourceEntriesMatched:projection.ids.length};
}

async function verifyY1M04OfficialPredecessor({root,dist,registry,integrity,projection,rebase,y1m04Bundle,outsideY1M04}){
  if(registry.entries?.length!==rebase.legacyAuditSnapshot.registryEntries)fail('PREDECESSOR_REGISTRY_ENTRY_COUNT');
  if(outsideY1M04.presentEntries!==rebase.officialY1M04PredecessorEntries)fail('PREDECESSOR_Y1M04_ENTRY_COUNT');
  const evidenceRel='content/english/media/qa-evidence/y1m04-official-media-qa.json';
  const evidenceBytes=await readFile(path.join(dist,evidenceRel));
  const evidenceSha256=hash(evidenceBytes);
  if(integrity.get(evidenceRel)!==evidenceSha256)fail('Y1M04_EVIDENCE_NOT_MANIFEST_BOUND');
  const evidence=JSON.parse(evidenceBytes);
  if(evidence.schemaVersion!=='DUDUQ_MEDIA_OFFICIAL_QA_V1'||evidence.status!=='PASS'||evidence.moduleId!=='Y1M04'||
     evidence.pedagogicalQaApproved!==true||evidence.visualQaApproved!==true||evidence.browserQaApproved!==true||
     evidence.productionReleaseApproved!==false||evidence.finalMediaIds!==84||evidence.globalActivitiesVerified!==600)
    fail('Y1M04_EVIDENCE_INVALID');

  const bindings=y1m04Bundle.assets.flatMap(asset=>(asset.bindings||[]).map(binding=>({asset,...binding})));
  const q=JSON.parse(await readFile(path.join(dist,'content/english/year-1/module-04/questions.json')));
  const usages=new Map();for(const question of q.items||[])collectQuestionMediaUsages(question,usages);
  if(q.moduleId!=='Y1M04'||q.items?.length!==20||usages.size!==84||[...usages.values()].reduce((n,x)=>n+x.length,0)!==85)
    fail('Y1M04_PREDECESSOR_QUESTION_SCOPE_INVALID');
  for(const binding of bindings){
    const entry=projection.registryIndex.get(binding.mediaId),records=usages.get(binding.mediaId)||[];
    if(!entry||entry.temporary!==false||entry.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH'||
       entry.sha256!==binding.asset.sha256||entry.verification?.evidenceSha256!==evidenceSha256||records.length<1||
       records.some(record=>!isExactPedagogicalConcept(binding.asset.semanticTarget,record.semanticTarget)))
      fail('Y1M04_PREDECESSOR_ENTRY_INVALID:'+binding.mediaId);
    if(integrity.get(entry.urlOrPath)!==binding.asset.sha256||hash(await readFile(path.join(dist,entry.urlOrPath)))!==binding.asset.sha256)
      fail('Y1M04_PREDECESSOR_ASSET_HASH:'+binding.mediaId);
  }
  return {moduleId:'Y1M04',mediaIds:84,evidencePath:evidenceRel,evidenceSha256,
    browserReportSha256:evidence.browserQa?.sha256,productionReleaseApproved:false};
}

export async function verifyY1M05SourceRegistryContext(options={}){
  const root=path.resolve(options.root||process.cwd()),dist=path.resolve(options.dist||path.join(root,'dist-pages'));
  const bundleDir=path.join(root,'qa/media-candidates/y1m05-official-20261030');
  const [manifestBytes,semanticBytes,y1m04BundleBytes,questionsBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'semantic-evidence.json')),
    readFile(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json')),
    options.questionsBytes||readFile(path.join(dist,'content/english/year-1/module-05/questions.json')),
    options.registryBytes||readFile(path.join(dist,'content/english/media/media-registry.json')),
    options.integrityBytes||readFile(path.join(dist,'.duduq-pages-manifest'))
  ]);
  const manifest=JSON.parse(manifestBytes),semantic=JSON.parse(semanticBytes),y1m04Bundle=JSON.parse(y1m04BundleBytes),
    questions=JSON.parse(questionsBytes),registry=JSON.parse(registryBytes);
  if(manifest.moduleId!=='Y1M05'||manifest.sourceRegistryRebaseEvidence!=='source-registry-rebase.json'||
     !/^[a-f0-9]{64}$/.test(manifest.sourceRegistryRebaseEvidenceSha256||''))fail('BUNDLE_REBASE_REFERENCE');
  const rebaseBytes=await readFile(path.join(bundleDir,manifest.sourceRegistryRebaseEvidence));
  if(hash(rebaseBytes)!==manifest.sourceRegistryRebaseEvidenceSha256)fail('REBASE_EVIDENCE_HASH');
  const rebase=JSON.parse(rebaseBytes),integrity=parseIntegrity(integrityBytes);
  if(rebase.schemaVersion!=='DUDUQ_Y1M05_SOURCE_REGISTRY_REBASE_V2'||rebase.moduleId!=='Y1M05'||
     rebase.status!=='PASS_REBASE_TO_CLEAN_V26_WITH_SCOPE_IDENTITY'||rebase.productionApproved!==false)
    fail('REBASE_EVIDENCE_SCHEMA');
  if(semantic.sourceRegistrySha256!==rebase.legacyReviewedRegistrySha256||
     semantic.sourceQuestionContractSha256!==rebase.sourceQuestionContractSha256||
     semantic.sourceQuestionInvariantSha256!==rebase.sourceQuestionInvariantSha256)
    fail('LEGACY_SEMANTIC_EVIDENCE_LINK');
  if(hash(questionsBytes)!==rebase.sourceQuestionContractSha256||questions.moduleId!=='Y1M05'||questions.items?.length!==20)
    fail('SOURCE_QUESTION_CONTRACT');
  const registryRel='content/english/media/media-registry.json';
  if(integrity.get(registryRel)!==hash(registryBytes))fail('REGISTRY_NOT_MANIFEST_BOUND');

  const projection=sourceProjection(questions,registry);
  if(projection.entryProjectionSha256!==rebase.sourceRegistryEntryProjectionSha256||
     projection.usageProjectionSha256!==rebase.sourceUsageProjectionSha256||
     projection.ids.length!==rebase.sourceRegistryEntryCount||projection.usageRecords!==rebase.sourceQuestionUsageRecords)
    fail('Y1M05_SOURCE_SCOPE_PIN');
  const outsideY1M04=outsideY1M04Projection(registry,y1m04Bundle);
  if(outsideY1M04.count!==rebase.registryEntriesOutsideY1M04Count||
     outsideY1M04.sha256!==rebase.registryEntriesOutsideY1M04Sha256)
    fail('REGISTRY_OUTSIDE_Y1M04_SCOPE_PIN');
  const legacyAudit=await verifyLegacyAuditSnapshot(root,rebase,projection);
  const actualRegistrySha256=hash(registryBytes);
  let context,predecessor=null;
  if(actualRegistrySha256===rebase.cleanV26RegistrySha256){
    if(registry.entries.length!==rebase.cleanV26RegistryEntries)fail('CLEAN_V26_REGISTRY_ENTRY_COUNT');
    if(outsideY1M04.presentEntries!==rebase.cleanV26Y1M04SourceEntries)fail('CLEAN_V26_Y1M04_ENTRY_COUNT');
    context='PRISTINE_V26_EXACT_WHOLE_REGISTRY_PIN';
  }else{
    predecessor=await verifyY1M04OfficialPredecessor({root,dist,registry,integrity,projection,rebase,y1m04Bundle,outsideY1M04});
    context='Y1M04_OFFICIAL_PREDECESSOR_WITH_HASH_BOUND_EVIDENCE_AND_EXACT_Y1M05_SCOPE_PIN';
  }
  return {status:'PASS',gate:'Y1M05_SOURCE_REGISTRY_REBASE',context,actualRegistrySha256,
    legacyReviewedRegistrySha256:rebase.legacyReviewedRegistrySha256,cleanV26RegistrySha256:rebase.cleanV26RegistrySha256,
    sourceRegistryEntryProjectionSha256:projection.entryProjectionSha256,
    sourceUsageProjectionSha256:projection.usageProjectionSha256,sourceEntries:projection.ids.length,
    registryEntriesOutsideY1M04:outsideY1M04.count,
    registryEntriesOutsideY1M04Sha256:outsideY1M04.sha256,
    sourceUsageRecords:projection.usageRecords,legacyAudit,predecessor,sourceHashesRewritten:false,
    answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,productionDeployed:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  console.log(JSON.stringify(await verifyY1M05SourceRegistryContext(),null,2));
}

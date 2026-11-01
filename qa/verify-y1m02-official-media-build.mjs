#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {bundleRel,moduleId,questionsRel,registryRel,sha256} from './y1m02-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),resultPath=path.join(root,'qa/results/y1m02-review-build.json');
const applicationPath=path.join(root,'qa/results/y1m02-overlay-application.json');
assert(existsSync(applicationPath),'MISSING_FRESH_Y1M02_OVERLAY_APPLICATION_EVIDENCE');
const applicationBytes=readFileSync(applicationPath),application=JSON.parse(applicationBytes);
assert.equal(application.status,'Y1M02_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED');
assert.equal(application.sourceRegistryGate?.status,'PASS');assert.equal(application.sourceRegistryGate?.sourceHashesRewritten,false);
assert.match(application.sourceRegistryGate?.context||'',/^(?:PRISTINE_V26|Y1M04_OFFICIAL_PREDECESSOR_)/);
assert.equal(application.sourceQuestionFilesModified,false);assert.equal(application.goldMastersModified,false);assert.equal(application.productionModified,false);

const protectedDiff=spawnSync('git',['diff','--name-only','--','content','functions','golden','core'],{cwd:root,encoding:'utf8',windowsHide:true});
assert.equal(protectedDiff.status,0,'PROTECTED_SCOPE_GIT_CHECK_FAILED');assert.equal(String(protectedDiff.stdout||'').trim(),'','PROTECTED_TRACKED_SCOPE_MODIFIED');
const manifestPath=path.join(dist,'.duduq-pages-manifest'),manifestBytes=readFileSync(manifestPath),integrity=new Map();
assert.equal(application.compiledManifestSha256,sha256(manifestBytes),'OVERLAY_APPLICATION_MANIFEST_CHANGED');
for(const line of manifestBytes.toString('utf8').trimEnd().split(/\r?\n/)){
  const p=line.lastIndexOf(' '),name=line.slice(0,p),expected=line.slice(p+1);assert(p>0&&!integrity.has(name)&&/^[a-f0-9]{64}$/.test(expected),'INVALID_COMPILED_MANIFEST_ENTRY:'+name);
  const file=path.join(dist,name);assert(existsSync(file),'MISSING_COMPILED_FILE:'+name);assert.equal(sha256(readFileSync(file)),expected,'COMPILED_FILE_HASH_MISMATCH:'+name);integrity.set(name,expected);
}
let modules=0,activities=0;const mechanics=new Set();
for(let year=1;year<=5;year++)for(let n=1;n<=6;n++){
  const mm=String(n).padStart(2,'0'),id=`Y${year}M${mm}`,route=path.join(dist,`play/english/year-${year}/module-${mm}/index.html`);
  const qPath=path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`);assert(existsSync(route),'MISSING_PLAYABLE_ROUTE:'+id);
  assert(readFileSync(route,'utf8').includes('<html'),'INVALID_PLAYABLE_ROUTE:'+id);const contract=JSON.parse(readFileSync(qPath,'utf8'));
  assert.equal(contract.moduleId,id);assert.equal(contract.items?.length,20,'MODULE_ACTIVITY_COUNT_MISMATCH:'+id);
  for(const item of contract.items){assert(item.item_id?.startsWith(id+'-'));assert(item.mechanicId);mechanics.add(item.mechanicId);activities++;}modules++;
}
assert.equal(modules,30);assert.equal(activities,600);
const bundle=JSON.parse(readFileSync(path.join(root,bundleRel,'batch-manifest.json'),'utf8'));
const registry=JSON.parse(readFileSync(path.join(dist,registryRel),'utf8')),index=new Map(registry.entries.map(x=>[x.mediaId,x]));
const runtimePaths=new Set(),runtimeHashes=new Set();
for(const asset of bundle.assets)for(const binding of asset.bindings){
  const entry=index.get(binding.mediaId);assert(entry,'Y1M02_BUILD_BINDING_MISSING:'+binding.mediaId);assert.equal(entry.sha256,asset.sha256,'Y1M02_BUILD_HASH_MISMATCH:'+binding.mediaId);
  assert.equal(integrity.get(entry.urlOrPath),asset.sha256,'Y1M02_BUILD_ASSET_NOT_MANIFEST_BOUND:'+binding.mediaId);runtimePaths.add(entry.urlOrPath);runtimeHashes.add(entry.sha256);
}
assert.equal(bundle.assets.flatMap(x=>x.bindings).length,93);assert.equal(runtimePaths.size,10);assert.equal(runtimeHashes.size,10);
assert.equal(integrity.get(questionsRel),sha256(readFileSync(path.join(dist,questionsRel))));
const report={schemaVersion:'DUDUQ_Y1M02_REVIEW_BUILD_V1',status:'PASS',createdAt:new Date().toISOString(),
  buildStrategy:'FRESH_IMMUTABLE_V26_PLUS_HASH_BOUND_Y1M02_REVIEW_OVERLAY',
  overlayApplicationEvidence:'qa/results/y1m02-overlay-application.json',overlayApplicationEvidenceSha256:sha256(applicationBytes),
  sourceRegistryGate:application.sourceRegistryGate,
  currentCompiledManifestSha256:sha256(manifestBytes),compiledManifestEntries:integrity.size,modules,activities,mechanics:[...mechanics].sort(),
  y1m02:{moduleId,questions:20,sourceAuditedIds:92,sourceUsageRecords:94,bindingIds:93,usageRecords:94,uniquePngs:10,runtimePaths:[...runtimePaths].sort()},
  protectedScopeGitCheck:'PASS',sourceQuestionFilesModified:false,goldMastersModified:false,productionDeployed:false};
writeFileSync(resultPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

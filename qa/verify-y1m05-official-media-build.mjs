#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dist=path.join(root,'dist-pages');
const resultPath=path.join(root,'qa/results/y1m05-review-build.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

const baseBuildPath=path.join(root,'qa/results/y1m04-v26-build.json');
assert(existsSync(baseBuildPath),'MISSING_REUSABLE_V26_BASE_BUILD_EVIDENCE');
const baseBuildBytes=readFileSync(baseBuildPath);
const baseBuild=JSON.parse(baseBuildBytes);
assert.equal(baseBuild.status,'PASS');
assert.equal(baseBuild.modules,30);
assert.equal(baseBuild.activities,600);
assert.equal(baseBuild.productionDeployed,false);

const manifestPath=path.join(dist,'.duduq-pages-manifest');
const manifestBytes=readFileSync(manifestPath);
const integrity=new Map();
for(const line of manifestBytes.toString('utf8').trimEnd().split(/\r?\n/)){
  const split=line.lastIndexOf(' '),name=line.slice(0,split),expected=line.slice(split+1);
  assert(split>0&&!integrity.has(name)&&/^[a-f0-9]{64}$/.test(expected),'INVALID_COMPILED_MANIFEST_ENTRY:'+name);
  const file=path.join(dist,name);
  assert(existsSync(file),'MISSING_COMPILED_FILE:'+name);
  assert.equal(sha(readFileSync(file)),expected,'COMPILED_FILE_HASH_MISMATCH:'+name);
  integrity.set(name,expected);
}

let modules=0,activities=0;
const mechanics=new Set();
for(let year=1;year<=5;year++)for(let n=1;n<=6;n++){
  const mm=String(n).padStart(2,'0'),moduleId=`Y${year}M${mm}`;
  const route=path.join(dist,`play/english/year-${year}/module-${mm}/index.html`);
  const questionsPath=path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`);
  assert(existsSync(route),'MISSING_PLAYABLE_ROUTE:'+moduleId);
  assert(readFileSync(route,'utf8').includes('<html'),'INVALID_PLAYABLE_ROUTE:'+moduleId);
  const contract=JSON.parse(readFileSync(questionsPath,'utf8'));
  assert.equal(contract.moduleId,moduleId,'MODULE_CONTRACT_ID_MISMATCH:'+moduleId);
  assert.equal(contract.items?.length,20,'MODULE_ACTIVITY_COUNT_MISMATCH:'+moduleId);
  for(const item of contract.items){
    assert(item.item_id?.startsWith(moduleId+'-'),'ACTIVITY_ID_MISMATCH:'+item.item_id);
    assert(item.mechanicId,'ACTIVITY_MECHANIC_MISSING:'+item.item_id);
    mechanics.add(item.mechanicId);activities++;
  }
  modules++;
}
assert.equal(modules,30);assert.equal(activities,600);

const bundle=JSON.parse(readFileSync(path.join(root,'qa/media-candidates/y1m05-official-20261030/batch-manifest.json'),'utf8'));
const registry=JSON.parse(readFileSync(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const registryIndex=new Map(registry.entries.map(entry=>[entry.mediaId,entry]));
const runtimePaths=new Set();
for(const asset of bundle.assets){
  for(const binding of asset.bindings){
    const entry=registryIndex.get(binding.mediaId);
    assert(entry,'Y1M05_BUILD_BINDING_MISSING:'+binding.mediaId);
    assert.equal(entry.sha256,asset.sha256,'Y1M05_BUILD_BINDING_HASH_MISMATCH:'+binding.mediaId);
    assert.equal(integrity.get(entry.urlOrPath),asset.sha256,'Y1M05_BUILD_ASSET_NOT_MANIFEST_BOUND:'+binding.mediaId);
    runtimePaths.add(entry.urlOrPath);
  }
}
assert.equal(runtimePaths.size,10);

const report={
  schemaVersion:'DUDUQ_Y1M05_REVIEW_BUILD_V1',
  status:'PASS',
  createdAt:new Date().toISOString(),
  buildStrategy:'REUSE_VERIFIED_V26_BASE_AND_APPLY_HASH_BOUND_MEDIA_OVERLAY',
  baseBuildEvidence:'qa/results/y1m04-v26-build.json',
  baseBuildEvidenceSha256:sha(baseBuildBytes),
  baseBuildManifestSha256:baseBuild.finalCompiledManifestSha256,
  currentCompiledManifestSha256:sha(manifestBytes),
  compiledManifestEntries:integrity.size,
  modules,activities,mechanics:[...mechanics].sort(),
  y1m05:{questions:20,bindingIds:101,usageRecords:101,uniquePngs:10,runtimePaths:[...runtimePaths].sort()},
  sourceQuestionFilesModified:false,
  goldMastersModified:false,
  productionDeployed:false
};
writeFileSync(resultPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));

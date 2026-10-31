#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {
  BUNDLE_REL,EXPECTED,MODULE_PATH,allBindings,parseIntegrity,sha256
} from './y1m06-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages');
const resultPath=path.join(root,'qa/results/y1m06-review-build.json');
const baseBuildPath=path.join(root,'qa/results/y1m04-v26-build.json');
assert(existsSync(baseBuildPath),'MISSING_REUSABLE_V26_BASE_BUILD_EVIDENCE');
const baseBuildBytes=readFileSync(baseBuildPath),baseBuild=JSON.parse(baseBuildBytes);
assert.equal(baseBuild.status,'PASS');assert.equal(baseBuild.modules,30);assert.equal(baseBuild.activities,600);
assert.equal(baseBuild.productionDeployed,false);

const manifestBytes=readFileSync(path.join(dist,'.duduq-pages-manifest')),integrity=parseIntegrity(manifestBytes);
for(const [name,record] of integrity.entries){
  const file=path.join(dist,name);assert(existsSync(file),'MISSING_COMPILED_FILE:'+name);
  assert.equal(sha256(readFileSync(file)),record.sha,'COMPILED_FILE_HASH_MISMATCH:'+name);
}
let modules=0,activities=0;const mechanics=new Set();
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0'),moduleId=`Y${year}M${mm}`;
  const route=path.join(dist,`play/english/year-${year}/module-${mm}/index.html`);
  const questionPath=path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`);
  assert(existsSync(route),'MISSING_PLAYABLE_ROUTE:'+moduleId);
  assert(readFileSync(route,'utf8').includes('<html'),'INVALID_PLAYABLE_ROUTE:'+moduleId);
  const contract=JSON.parse(readFileSync(questionPath,'utf8'));
  assert.equal(contract.moduleId,moduleId);assert.equal(contract.items?.length,20);
  for(const item of contract.items){assert(item.item_id?.startsWith(moduleId+'-'));assert(item.mechanicId);mechanics.add(item.mechanicId);activities++;}
  modules++;
}
assert.equal(modules,30);assert.equal(activities,600);
const bundle=JSON.parse(readFileSync(path.join(root,BUNDLE_REL,'batch-manifest.json'),'utf8'));
const registry=JSON.parse(readFileSync(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const index=new Map(registry.entries.map(entry=>[entry.mediaId,entry])),runtimePaths=new Set();
for(const binding of allBindings(bundle)){
  const entry=index.get(binding.mediaId);assert(entry,'Y1M06_BUILD_BINDING_MISSING:'+binding.mediaId);
  assert.equal(entry.sha256,binding.asset.sha256,'Y1M06_BUILD_BINDING_HASH_MISMATCH:'+binding.mediaId);
  assert.equal(integrity.entries.get(entry.urlOrPath)?.sha,binding.asset.sha256,'Y1M06_BUILD_ASSET_NOT_MANIFEST_BOUND:'+binding.mediaId);
  runtimePaths.add(entry.urlOrPath);
}
assert.equal(runtimePaths.size,EXPECTED.assets);assert.equal(sha256(readFileSync(path.join(dist,MODULE_PATH))),
  sha256(readFileSync(path.join(dist,MODULE_PATH))));
const report={
  schemaVersion:'DUDUQ_Y1M06_REVIEW_BUILD_V1',status:'PASS',createdAt:new Date().toISOString(),
  buildStrategy:'REUSE_VERIFIED_V26_BASE_AND_APPLY_HASH_BOUND_OCCURRENCE_SCOPED_MEDIA_OVERLAY',
  baseBuildEvidence:'qa/results/y1m04-v26-build.json',baseBuildEvidenceSha256:sha256(baseBuildBytes),
  baseBuildManifestSha256:baseBuild.finalCompiledManifestSha256,currentCompiledManifestSha256:sha256(manifestBytes),
  compiledManifestEntries:integrity.entries.size,modules,activities,mechanics:[...mechanics].sort(),
  y1m06:{questions:EXPECTED.questions,bindingIds:EXPECTED.finalIds,usageRecords:EXPECTED.usageRecords,
    occurrenceScopedSplits:EXPECTED.splits,uniquePngs:EXPECTED.assets,runtimePaths:[...runtimePaths].sort()},
  sourceQuestionFilesModified:false,answerKeysModified:false,mechanicsModified:false,
  goldMastersModified:false,productionDeployed:false
};
writeFileSync(resultPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {
  BUNDLE_REL,EXPECTED,MODULE_PATH,allBindings,parseIntegrity,sha256
} from './y2m01-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),resultPath=path.join(root,'qa/results/y2m01-review-build.json');
const manifestBytes=readFileSync(path.join(dist,'.duduq-pages-manifest')),integrity=parseIntegrity(manifestBytes);
for(const [name,record] of integrity.entries){
  const file=path.join(dist,name);assert(existsSync(file),'MISSING_COMPILED_FILE:'+name);
  assert.equal(sha256(readFileSync(file)),record.sha,'COMPILED_FILE_HASH_MISMATCH:'+name);
}
let modules=0,activities=0;const mechanics=new Set();
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0'),moduleId=`Y${year}M${mm}`,
    route=path.join(dist,`play/english/year-${year}/module-${mm}/index.html`),
    questionPath=path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`);
  assert(existsSync(route),'MISSING_PLAYABLE_ROUTE:'+moduleId);
  assert(readFileSync(route,'utf8').includes('<html'),'INVALID_PLAYABLE_ROUTE:'+moduleId);
  const contract=JSON.parse(readFileSync(questionPath,'utf8'));
  assert.equal(contract.moduleId,moduleId);assert.equal(contract.items?.length,20);
  for(const item of contract.items){assert(item.item_id?.startsWith(moduleId+'-'));assert(item.mechanicId);mechanics.add(item.mechanicId);activities++;}
  modules++;
}
assert.equal(modules,30);assert.equal(activities,600);
const bundle=JSON.parse(readFileSync(path.join(root,BUNDLE_REL,'batch-manifest.json'),'utf8')),
  registry=JSON.parse(readFileSync(path.join(dist,'content/english/media/media-registry.json'),'utf8')),
  index=new Map(registry.entries.map(entry=>[entry.mediaId,entry])),runtimePaths=new Set(),runtimeHashes=new Set();
for(const binding of allBindings(bundle)){
  const entry=index.get(binding.mediaId);assert(entry,'Y2M01_BUILD_BINDING_MISSING:'+binding.mediaId);
  assert.equal(entry.sha256,binding.asset.sha256,'Y2M01_BUILD_BINDING_HASH_MISMATCH:'+binding.mediaId);
  assert.equal(integrity.entries.get(entry.urlOrPath)?.sha,binding.asset.sha256,'Y2M01_BUILD_ASSET_NOT_MANIFEST_BOUND:'+binding.mediaId);
  runtimePaths.add(entry.urlOrPath);runtimeHashes.add(entry.sha256);
}
assert.equal(runtimePaths.size,EXPECTED.reviewAssets);assert.equal(runtimeHashes.size,EXPECTED.uniquePngs);
assert.equal(sha256(readFileSync(path.join(dist,MODULE_PATH))),integrity.entries.get(MODULE_PATH)?.sha);
const report={schemaVersion:'DUDUQ_Y2M01_REVIEW_BUILD_V1',status:'PASS',createdAt:new Date().toISOString(),
  buildStrategy:'REBUILD_PRISTINE_V26_THEN_APPLY_HASH_BOUND_OCCURRENCE_SCOPED_Y2M01_MEDIA_OVERLAY',
  currentCompiledManifestSha256:sha256(manifestBytes),compiledManifestEntries:integrity.entries.size,
  modules,activities,mechanics:[...mechanics].sort(),y2m01:{questions:EXPECTED.questions,sourceIds:EXPECTED.sourceIds,
    bindingIds:EXPECTED.finalIds,usageRecords:EXPECTED.sourceUsageRecords,occurrenceScopedSplitRecords:EXPECTED.splitRecords,
    reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,runtimePaths:[...runtimePaths].sort()},
  sourceQuestionFilesModified:false,answerKeysModified:false,mechanicsModified:false,goldMastersModified:false,
  humanHomologationClaimed:false,productionDeployed:false};
writeFileSync(resultPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

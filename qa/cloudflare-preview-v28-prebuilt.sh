#!/usr/bin/env bash
# Rebuild Phase 2 preview from the immutable already-published production
# release and approved Assets-DuduQ source SHA. No direct deployment here.
set -Eeuo pipefail
ROOT="qa/fast-bilingual-immutable-candidate"
TAG="duduq-phase2-orange-fruit-color-corrected-20261103"
FILE="duduq-phase2-orange-fruit-color-corrected.tar.gz"
SHA="cf049f8c7a5f3d02696f7997b6dd1e31ec7b28942f6c77b96af656e72b5a1800"
mkdir -p "$ROOT" qa/results
TMP="$(mktemp -t duduq-media-XXXXXX.tar.gz)"
trap 'rm -f "$TMP"' EXIT
curl -fLSs --retry 3 --retry-delay 3 --connect-timeout 20 --max-time 360 \
 "https://github.com/augustoborgessousa93/DuduQ-Engine/releases/download/$TAG/$FILE" -o "$TMP"
echo "$SHA  $TMP" | sha256sum -c
tar -xzf "$TMP" -C "$ROOT"
cp qa/input/pinned-assets-tree-a62c07c.json qa/results/assets-duduq-current-head-tree.json
DUDUQ_QA_ONLY=1 node qa/phase2-fast-bilingual-bulk.mjs
DUDUQ_QA_ONLY=1 node qa/phase2-fast-bilingual-bulk.mjs --apply
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const patch=JSON.parse(readFileSync('qa/results/phase2-fast-bilingual-bulk-applied.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(patch.sourceCommit,'a62c07c075a4a744f81dee2eea3a6b93108f9d08');
assert.equal(patch.realContracts,600);
for(const key of ['changedQuestionJsonFiles','changedAudioFiles','changedGoldMasters','changedRuntimeFiles'])
 assert.equal(patch[key],0,key);
assert.equal(patch.productionDeployed,false);
assert(!patch.applied.some(x=>x.mediaId==='Y1M01-EMOJI-SLEEP-001'));
const lines=readFileSync(root+'/.duduq-pages-manifest','utf8').trimEnd().split(/\r?\n/),manifest=new Map();
for(const line of lines){
 const n=line.lastIndexOf(' '),rel=line.slice(0,n),expected=line.slice(n+1);
 assert(n>0&&/^[a-f0-9]{64}$/.test(expected)&&!manifest.has(rel));
 const dest=path.resolve(root,rel);
 assert(dest.startsWith(root+path.sep));
 assert.equal(sha(readFileSync(dest)),expected,'BAD_ASSET_SHA:'+rel);
 manifest.set(rel,expected);
}
let questions=0;
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const mm=String(module).padStart(2,'0');
 const data=JSON.parse(readFileSync(root+'/content/english/year-'+year+'/module-'+mm+'/questions.json'));
 assert.equal(data.moduleId,'Y'+year+'M'+mm);
 assert.equal(data.items?.length,20);
 questions+=20;
}
assert.equal(questions,600);
const reg=JSON.parse(readFileSync(root+'/content/english/media/media-registry.json'));
const byId=new Map(reg.entries.map(x=>[x.mediaId,x]));
assert.equal(byId.size,reg.entries.length);
const fruit=byId.get('IMG-ASSETS-DUDUQ-ORANGE-FRUIT-PHASE2');
const color=byId.get('IMG-Y1M03-Q001-ORANGE');
assert(fruit&&color&&fruit.urlOrPath!==color.urlOrPath,'ORANGE_CONTEXT_REGRESSION');
for(const item of patch.applied){
 const entry=byId.get(item.mediaId);
 assert.equal(entry?.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
 assert.equal(entry?.provenance?.sourceCommit,patch.sourceCommit);
 assert.equal(entry?.sha256,manifest.get(entry.urlOrPath));
}
console.log('PHASE2_PINNED_BUILD_VERIFIED='+JSON.stringify({
 mediaIds:patch.appliedMediaIds,affectedQuestions:patch.appliedQuestionIds.length,
 assets:manifest.size,contracts:questions,orangeSplit:true,productionDeployed:false}));
NODE
mkdir -p dist-pages
cp -a "$ROOT"/. dist-pages/
echo "READY_FOR_MANUAL_QA_PREVIEW_DEPLOYMENT"

#!/usr/bin/env bash
# Phase 2 media release: rehydrate exact current production, then integrate
# only previously QA-reviewed candidates. This file is a RELEASE gate, not QA.
# SHA256 fingerprints are pinned to successful full-coverage QA run #42274846580,
# which checked all 143 source/engine pairs in two viewports (286 cases).
set -Eeuo pipefail
ROOT="qa/fast-bilingual-immutable-candidate"
SOURCE_SHA="db68bc43eafd33e8b4a287604f6f94a1e9d7df02"
QA_REGISTRY_SHA="66a636ae3944e04c680d631dec32d43716918d6463e6c12d5fea7a6acefc604a"
QA_MANIFEST_SHA="ba0e46f5432bd976e9b439e5ea3028b139b53f808d8ec20e352658cfb145e28f"
EXPECTED_NEW_MEDIA_IDS="137"
EXPECTED_NEW_PNGS="59"
# Fail closed on any unpinned or accidentally modified QA baseline.
case "$QA_REGISTRY_SHA$QA_MANIFEST_SHA$EXPECTED_NEW_MEDIA_IDS$EXPECTED_NEW_PNGS" in
  *"__PIN_"*) echo "RELEASE_NOT_PINNED_TO_QA_EVIDENCE" >&2; exit 42;;
esac
mkdir -p "$ROOT" qa/results dist-pages
TMP="$(mktemp -t duduq-prod-release-XXXXXX.tar.gz)"
trap 'rm -f "$TMP"' EXIT
curl -fLSs --retry 3 --retry-delay 2 --connect-timeout 20 --max-time 360 \
 "https://github.com/augustoborgessousa93/DuduQ-Engine/releases/download/duduq-phase2-orange-fruit-color-corrected-20261103/duduq-phase2-orange-fruit-color-corrected.tar.gz" -o "$TMP"
printf '%s  %s\n' \
 cf049f8c7a5f3d02696f7997b6dd1e31ec7b28942f6c77b96af656e72b5a1800 "$TMP" | sha256sum -c
tar -xzf "$TMP" -C "$ROOT"
DUDUQ_QA_ONLY=1 node qa/reconcile-duduq-live-04nov.mjs
curl -fLSs --retry 3 --retry-delay 2 --connect-timeout 20 --max-time 90 \
 -H 'Accept: application/vnd.github+json' \
 "https://api.github.com/repos/augustoborgessousa93/Assets-DuduQ/git/trees/$SOURCE_SHA?recursive=1" \
 -o qa/results/assets-duduq-current-head-tree.json.tmp
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const t=JSON.parse(readFileSync('qa/results/assets-duduq-current-head-tree.json.tmp'));
assert.equal(t.sha,'db68bc43eafd33e8b4a287604f6f94a1e9d7df02','SOURCE_SNAPSHOT_MOVED');
assert.equal(t.truncated,false,'SOURCE_INDEX_TRUNCATED');
const source=t.tree.filter(x=>x.type==='blob'&&x.path.startsWith('Imagens Ilustrativa/')&&/\.png$/i.test(x.path));
assert.equal(source.length,488,'SOURCE_IMAGE_COUNT_CHANGED');
writeFileSync('qa/results/assets-duduq-current-head-tree.json',
 JSON.stringify({sha:t.sha,tree:t.tree,truncated:t.truncated},null,2)+'\n');
NODE
DUDUQ_QA_ONLY=1 node qa/phase2-fast-bilingual-bulk.mjs
DUDUQ_QA_ONLY=1 node qa/phase2-fast-bilingual-bulk.mjs --apply
QA_REGISTRY_SHA="$QA_REGISTRY_SHA" QA_MANIFEST_SHA="$QA_MANIFEST_SHA" \
 EXPECTED_NEW_MEDIA_IDS="$EXPECTED_NEW_MEDIA_IDS" EXPECTED_NEW_PNGS="$EXPECTED_NEW_PNGS" \
 node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='qa/fast-bilingual-immutable-candidate/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const report=JSON.parse(readFileSync('qa/results/phase2-fast-bilingual-bulk-applied.json'));
const baseline=JSON.parse(readFileSync('qa/results/phase2-reconciled-live-production-04nov.json'));
assert.equal(baseline.result,'PUBLISHED_MANIFEST_BYTES_VERIFIED','PRODUCTION_BYTES_NOT_PROVEN');
assert.equal(baseline.changedMediaIds,39,'PUBLISHED_LINKS_NOT_PRESERVED');
assert.equal(report.sourceCommit,'db68bc43eafd33e8b4a287604f6f94a1e9d7df02');
assert.equal(report.registrySHA256Before,baseline.productionRegistrySHA256,
 'OLD_PUBLISHED_REGISTRY_NOT_PRESERVED');
assert.equal(report.manifestSHA256Before,baseline.publishedManifestSHA256,
 'OLD_PUBLISHED_MANIFEST_NOT_PRESERVED');
assert.equal(report.realContracts,600,'CONTRACTS_NOT_600');
assert.equal(report.appliedMediaIds,Number(process.env.EXPECTED_NEW_MEDIA_IDS),'QA_BINDINGS_COUNT_CHANGED');
assert.equal(report.actuallyAddedPngs,Number(process.env.EXPECTED_NEW_PNGS),'QA_IMAGE_COUNT_CHANGED');
assert.equal(report.downloadFailures.length,0,'SOURCE_DOWNLOAD_FAILURES');
for(const k of ['changedQuestionJsonFiles','changedGoldMasters','changedAudioFiles','changedRuntimeFiles'])assert.equal(report[k],0,k);
assert.equal(report.productionDeployed,false,'PROCESS_MUST_HAVE_NO_SIDE_EFFECT_DEPLOY');
assert.equal(report.releaseApproved,false,'HUMAN_PEDAGOGICAL_SIGNOFF_NOT_CLAIMED');
const registryBytes=readFileSync(root+'content/english/media/media-registry.json');
const manifestBytes=readFileSync(root+'.duduq-pages-manifest');
assert.equal(sha(registryBytes),process.env.QA_REGISTRY_SHA,'REGISTRY_DIFFERS_FROM_GREEN_QA');
assert.equal(sha(manifestBytes),process.env.QA_MANIFEST_SHA,'MANIFEST_DIFFERS_FROM_GREEN_QA');
const reg=JSON.parse(registryBytes),byId=new Map(reg.entries.map(x=>[x.mediaId,x]));
assert.equal(byId.size,reg.entries.length,'DUPLICATE_MEDIA_ID');
const fruit=byId.get('IMG-ASSETS-DUDUQ-ORANGE-FRUIT-PHASE2');
const color=byId.get('IMG-Y1M03-Q001-ORANGE');
assert(fruit&&color&&fruit.urlOrPath!==color.urlOrPath,'ORANGE_FRUIT_COLOR_COLLAPSE');
let count=0; const files=new Map();
for(const line of manifestBytes.toString('utf8').trimEnd().split(/\r?\n/)){
 const i=line.lastIndexOf(' ');assert(i>0,'MALFORMED_MANIFEST');
 const p=line.slice(0,i),expected=line.slice(i+1);
 assert(!p.startsWith('/')&&!p.includes('..')&&!files.has(p),'INVALID_PATH');
 assert.equal(sha(readFileSync(root+p)),expected,'MISMATCH:'+p);
 files.set(p,expected);count++;
}
assert.equal(count,2899+Number(process.env.EXPECTED_NEW_PNGS),'FILE_COUNT_CHANGED');
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const path='content/english/year-'+year+'/module-'+String(module).padStart(2,'0')+'/questions.json';
 const data=JSON.parse(readFileSync(root+path));
 assert.equal(data.items.length,20,'NOT_20_ITEMS:'+path);
}
for(const m of report.applied){
 const v=byId.get(m.mediaId);assert(v,'MISSING_MEDIA:'+m.mediaId);
 assert.equal(v.provenance?.sourceGitBlob,m.sourceGitBlob,'WRONG_SOURCE:'+m.mediaId);
 assert.equal(v.sha256,files.get(v.urlOrPath),'WRONG_PNG_HASH:'+m.mediaId);
 assert.equal(v.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING',
 'NO_FALSE_PEDAGOGICAL_APPROVAL');
}
console.log('RELEASE_BUILD_CONTENT_IDENTICAL_TO_GREEN_QA='+JSON.stringify({
 newMedia:report.appliedMediaIds,newPngs:report.actuallyAddedPngs,
 allStaticFiles:count,contracts:600,baselineLinksPreserved:39,
 runtimeChanged:false,productionActionYet:false
}));
NODE
cp -a "$ROOT"/. dist-pages/
echo "PINNED_QA_ARTIFACT_READY_FOR_PAGES_UPLOAD"

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
node --input-type=module <<'DUDUQ_GREETING_BLOCK_DIAG'
import {readFileSync} from 'node:fs';
const x=JSON.parse(readFileSync('qa/results/phase2-fast-bilingual-bulk-plan.json','utf8'));
for(const id of ['IMG-Y1M01-GREETING-GENERIC-001','IMG-Y1M01-FAREWELL-GENERIC-001','Y1M01-EMOJI-SLEEP-001','Y1M01-EMOJI-FOOD-001']){
 const chosen=(x.proposed||[]).find(y=>y.mediaId===id);
 const hold=(x.exceptions||[]).find(y=>y.mediaId===id);
 console.log('DUDUQ_GREETING_PLAN_DETAIL='+JSON.stringify({id,
  selected:chosen?{concept:chosen.concept,source:chosen.sourcePath,questionIds:chosen.questionIds}:null,
  hold:hold?{reason:hold.reason,concept:hold.concept}:null}));
}
DUDUQ_GREETING_BLOCK_DIAG
node --input-type=module <<'Q001_EXACT'
import {readFileSync} from 'node:fs';
const root='qa/fast-bilingual-immutable-candidate';
const doc=JSON.parse(readFileSync(root+'/content/english/year-1/module-01/questions.json','utf8'));
const q=doc.items.find(x=>x.item_id==='Y1M01-Q001');
const registry=JSON.parse(readFileSync(root+'/content/english/media/media-registry.json','utf8'));
const map=new Map(registry.entries.map(x=>[x.mediaId,x]));
const ids=['IMG-Y1M01-GREETING-GENERIC-001','IMG-Y1M01-FAREWELL-GENERIC-001','Y1M01-EMOJI-SLEEP-001','Y1M01-EMOJI-FOOD-001'];
console.log('Q001_ORIGINAL_EXACT='+JSON.stringify(q));
console.log('Q001_REGISTRY='+JSON.stringify(ids.map(id=>({id,registry:map.get(id)}))));
Q001_EXACT
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
// Exact QA selection of 04/11: 39 IDs, 8 new source blobs, 44 questions.
// Fail closed if a transient Cloudflare source download reduces the bundle.
assert.equal(patch.appliedMediaIds,44,'PREVIEW_EXPECTED_TWO_GREETING_PLUS_SLEEP_AND_SNACK_TRIALS');
const required=['IMG-Y1M01-GREETING-GENERIC-001','IMG-Y1M01-FAREWELL-GENERIC-001','Y1M01-EMOJI-SLEEP-001','Y1M01-EMOJI-FOOD-001'];
for(const mediaId of required)assert(patch.applied.some(x=>x.mediaId===mediaId),'MISSING_AUDITED_GREETING_MEDIA:'+mediaId);
const neededNewBlobs=new Set(patch.applied.filter(x=>!x.sourceAlreadyPublished)
 .map(x=>x.sourceGitBlob));
assert.equal(patch.actuallyAddedPngs,neededNewBlobs.size,
 'PREVIEW_SOURCE_PNG_COUNT_NOT_BLOB_DEDUPLICATION');
assert(patch.actuallyAddedPngs>=8&&patch.actuallyAddedPngs<=12,
 'UNEXPECTED_SOURCE_IMAGE_VOLUME');
const planned=JSON.parse(readFileSync('qa/results/phase2-fast-bilingual-bulk-plan.json'));
assert.equal(patch.appliedQuestionIds.length,planned.matchedQuestionCount,'PREVIEW_REAL_QUESTIONS_NOT_PLANNED');
assert.equal(patch.downloadFailures.length,0,'PREVIEW_INCOMPLETE_SOURCE_DOWNLOAD');
for(const key of ['changedQuestionJsonFiles','changedAudioFiles','changedGoldMasters','changedRuntimeFiles'])
 assert.equal(patch[key],0,key);
assert.equal(patch.productionDeployed,false);
// The shared SLEEP image is a QA trial; release requires browser proof.
const sleepTrial=patch.applied.some(x=>x.mediaId==='Y1M01-EMOJI-SLEEP-001');
assert(sleepTrial,'SLEEP_EXACT_SOURCE_QA_TRIAL_EXPECTED');
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
const auditedIds=['IMG-Y1M01-GREETING-GENERIC-001','IMG-Y1M01-FAREWELL-GENERIC-001','Y1M01-EMOJI-FOOD-001'];
const mediaRows=Object.fromEntries(auditedIds.map(id=>[id,[]]));
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0');
 const doc=JSON.parse(readFileSync(root+'/content/english/year-'+y+'/module-'+mm+'/questions.json'));
 for(const question of doc.items){
  const walk=(node,where,context={})=>{
   if(!node||typeof node!=='object')return;
   if(Array.isArray(node)){node.forEach((item,i)=>walk(item,where+'['+i+']',context));return}
   const labels=Object.fromEntries(Object.entries(node).filter(([k,v])=>
    /^(semanticTarget|label|text|alt|caption|concept|optionSemantic|value|description)$/i.test(k)&&typeof v==='string'));
   const inherited={...context,...labels};
   for(const [k,v] of Object.entries(node)){
    if(['mediaId','assetId','image_ref','imageRef'].includes(k)&&auditedIds.includes(v)){
     mediaRows[v].push({questionId:question.item_id,at:where+'.'+k,labels:inherited,
      questionAudio:question.audio?.transcript||question.audio_transcript||null});
    }
    if(v&&typeof v==='object')walk(v,where+'.'+k,inherited);
   }
  };
  walk(question,'question');
 }
}
for(const id of auditedIds){
 const rows=mediaRows[id],entry=byId.get(id),questions=[...new Set(rows.map(r=>r.questionId))];
 console.log('DUDUQ_GREETING_ALL_OCCURRENCES='+JSON.stringify({mediaId:id,count:questions.length,
  questions,registrySemantic:entry?.semantic,source:entry?.urlOrPath,
  occurrences:rows.filter(r=>!r.at.includes('mediaBindings')).slice(0,60)}));
}
for(const mediaId of ['IMG-Y1M01-GREETING-GENERIC-001',
 'IMG-Y1M01-FAREWELL-GENERIC-001','Y1M01-EMOJI-SLEEP-001']){
 const entry=byId.get(mediaId),record=patch.applied.find(x=>x.mediaId===mediaId);
 if(!record){console.log('DUDUQ_GREETING_DELTA='+JSON.stringify({mediaId,integrated:false}));continue;}
 const original=readFileSync(path.join(root,record.previousPath));
 const official=readFileSync(path.join(root,entry.urlOrPath));
 console.log('DUDUQ_GREETING_DELTA='+JSON.stringify({
  mediaId,integrated:true,originalSha256:sha(original),newSha256:sha(official),
  bytesActuallyChanged:sha(original)!==sha(official),source:record.sourcePath,
  totalUses:record.questionIds.length}));
}
console.log('PHASE2_PINNED_BUILD_VERIFIED='+JSON.stringify({
 mediaIds:patch.appliedMediaIds,affectedQuestions:patch.appliedQuestionIds.length,
 assets:manifest.size,contracts:questions,orangeSplit:true,sleepTrial,productionDeployed:false}));
NODE
# Targeted student-facing Q001 amendment only; immutable source PNG bytes.
DUDUQ_QA_ONLY=1 node --check qa/patch-y1m01-q001-hello-focus.mjs
DUDUQ_QA_ONLY=1 node qa/patch-y1m01-q001-hello-focus.mjs
test -s qa/results/y1m01-q001-focused-preview.json
mkdir -p dist-pages
cp -a "$ROOT"/. dist-pages/
echo "READY_FOR_MANUAL_QA_PREVIEW_DEPLOYMENT"

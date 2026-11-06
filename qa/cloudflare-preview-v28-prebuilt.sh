#!/usr/bin/env bash
# DUDUQ official media release, exact match to verified 06-Nov staging build.
# Images remain flagged PEDAGOGICAL_QA_PENDING; no answer-key/Gold Master edits.
set -Eeuo pipefail
if [[ "$CF_PAGES_BRANCH" != "release/duduq-phase2-orange-fruit-20261103" ]]; then
 echo "DUDUQ_PRODUCTION_RELEASE_BRANCH_ONLY" >&2; exit 43
fi
export DUDUQ_QA_ONLY=1 DUDUQ_VISUAL_REVIEW=1
ROOT="qa/fast-bilingual-immutable-candidate"
mkdir -p "$ROOT" qa/results dist-pages
TAR="$(mktemp -t duduq-review-XXXXXXXX.tar.gz)"
trap 'rm -f "$TAR"' EXIT
curl -fLSs --retry 3 --retry-delay 2 --max-time 360 \
 "https://github.com/augustoborgessousa93/DuduQ-Engine/releases/download/duduq-phase2-orange-fruit-color-corrected-20261103/duduq-phase2-orange-fruit-color-corrected.tar.gz" -o "$TAR"
echo "cf049f8c7a5f3d02696f7997b6dd1e31ec7b28942f6c77b96af656e72b5a1800  $TAR" | sha256sum -c
tar -xzf "$TAR" -C "$ROOT"
node qa/reconcile-duduq-live-04nov.mjs
curl -fLSs --retry 3 --retry-delay 3 --max-time 120 \
 -H 'Accept: application/vnd.github+json' \
 "https://api.github.com/repos/augustoborgessousa93/Assets-DuduQ/git/trees/db68bc43eafd33e8b4a287604f6f94a1e9d7df02?recursive=1" \
 -o qa/results/visual-review-source-tree.json
node --input-type=module <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const tree=JSON.parse(readFileSync('qa/results/visual-review-source-tree.json'));
assert.equal(tree.sha,'db68bc43eafd33e8b4a287604f6f94a1e9d7df02');
assert.equal(tree.truncated,false);
const pngs=tree.tree.filter(x=>x.type==='blob'&&x.path.startsWith('Imagens Ilustrativa/')&&/\.png$/i.test(x.path));
assert.equal(pngs.length,488);
writeFileSync('qa/results/assets-duduq-current-head-tree.json',
 JSON.stringify({sha:tree.sha,tree:tree.tree,truncated:tree.truncated},null,2)+'\n');
NODE
node qa/phase2-fast-bilingual-bulk.mjs
node qa/phase2-fast-bilingual-bulk.mjs --apply
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const root='qa/fast-bilingual-immutable-candidate/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const report=JSON.parse(readFileSync('qa/results/phase2-fast-bilingual-bulk-applied.json'));
const reg=JSON.parse(readFileSync(root+'content/english/media/media-registry.json'));
const byId=new Map(reg.entries.map(x=>[x.mediaId,x]));
assert.equal(sha(readFileSync(root+'content/english/media/media-registry.json')),
 '1f62cb7bec76fd386fdbaae65d3f7f9f89eb489c8d3f6bdbb3f8f9a6a0a04db8',
 'RELEASE_REGISTRY_DIFFERS_FROM_SUCCESSFUL_VISUAL_PREVIEW');
assert.equal(byId.size,reg.entries.length,'DUPLICATE_MEDIA_ID');
assert.equal(report.realContracts,600);
assert.equal(report.downloadFailures.length,0,'PNG_DOWNLOAD_FAILED');
const exactNewMedia=new Map([["IMG-V11-2B-F2653D7AC92E1719","twenty-one.png"],["IMG-V11-2B-9E2DFCFD8850D6B3","twenty-two.png"],["IMG-V11-2B-34691F7FF392D134","Letra A - EI.png"],["IMG-V11-2B-B53AD4A3B76BCB34","Letra B - BI.png"],["IMG-V11-2B-5FC56902AD57463A","Letra C - SI.png"],["IMG-V11-2B-5A685792F5F3892E","Letra D - DI.png"],["IMG-V11-2B-500B7CA70EE94EA9","pants.png"],["IMG-V11-2B-37D4A49BBE547EF2","pants.png"],["IMG-V11-2B-DF1ED31F1CA904F3","Two green pillows on the sofa.png"],["IMG-V11-2B-AD8C3930F382C54F","One white plate in the kitchen.png"]]);
for(const [id,filename] of exactNewMedia){
 const hit=report.applied.find(x=>x.mediaId===id);
 assert(hit,'RELEASE_EXACT_ID_NOT_PRESENT:'+id);
 assert.equal(hit.sourcePath,'Imagens Ilustrativa/'+filename,
  'RELEASE_EXACT_SEMANTIC_SOURCE_MISMATCH:'+id);
}

for(const [concept,file] of Object.entries({'23':'twenty-three.png','24':'twenty-four.png','25':'twenty-five.png'})){
 const matches=report.applied.filter(x=>x.concept===concept&&x.sourcePath==='Imagens Ilustrativa/'+file);
 assert.equal(matches.length,1,'NUMERAL_NOT_LINKED_TO_OFFICIAL_SOURCE:'+concept);
}
assert.equal(report.appliedMediaIds,269,'RELEASE_MEDIA_COUNT_CHANGED');
assert.equal(report.actuallyAddedPngs,97,'RELEASE_PNG_SET_CHANGED');
assert.equal(report.heldCount,143,'RELEASE_BLOCKED_SET_CHANGED');
for(const f of ['changedQuestionJsonFiles','changedGoldMasters','changedAudioFiles','changedRuntimeFiles'])
 assert.equal(report[f],0,'CURRICULUM_OR_RUNTIME_CHANGED:'+f);
const manifest=new Map();
for(const s of readFileSync(root+'.duduq-pages-manifest','utf8').trimEnd().split(/\r?\n/)){
 const i=s.lastIndexOf(' ');assert(i>0);
 const p=s.slice(0,i),h=s.slice(i+1);
 assert(/^[a-f0-9]{64}$/.test(h)&&!p.startsWith('/')&&!p.includes('..')&&!manifest.has(p));
 assert.equal(sha(readFileSync(root+p)),h,'HASH_CHANGED:'+p);
 manifest.set(p,h);
}
assert.equal(manifest.size,2899+report.actuallyAddedPngs,'FILE_COUNT_INVALID');
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const p='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const q=JSON.parse(readFileSync(root+p));
 assert.equal(q.items?.length,20,'QUESTION_COUNT:'+p);
}
const published=await fetch('https://495c9848.duduq-engine-13a.pages.dev/content/english/media/media-registry.json',
 {signal:AbortSignal.timeout(90000)});
assert(published.ok,'LIVE_06NOV_REGISTRY_UNAVAILABLE');
const previous=JSON.parse(await published.text());
let preserved=0;
for(const e of previous.entries){
 if(e.provenance?.sourceCommit!=='db68bc43eafd33e8b4a287604f6f94a1e9d7df02')continue;
 const now=byId.get(e.mediaId);
 assert(now,'PREVIOUS_MEDIA_MISSING:'+e.mediaId);
 assert.equal(now.sha256,e.sha256,'PUBLISHED_MEDIA_BYTES_REGRESSED:'+e.mediaId);
 assert.equal(now.urlOrPath,e.urlOrPath,'PUBLISHED_MEDIA_PATH_REGRESSED:'+e.mediaId);
 preserved++;
}
assert(preserved>=259,'CURRENT_259_PUBLISHED_MEDIA_REGRESSION');
const keyIds=['Y1M01-EMOJI-NIGHT-001','Y1M01-EMOJI-SLEEP-001',
 'IMG-Y1M01-GREETING-GENERIC-001','IMG-Y1M01-FAREWELL-GENERIC-001'];
const firstModule=keyIds.map(mediaId=>({
 mediaId,source:report.applied.find(x=>x.mediaId===mediaId)?.sourcePath||null,
 currentPath:byId.get(mediaId)?.urlOrPath||null
}));
assert(firstModule.some(x=>x.mediaId==='Y1M01-EMOJI-NIGHT-001'&&x.source?.endsWith('boy_noite_night_bedtime_rotina_de_sono.png')),
 'Y1M01_Q003_NIGHT_NOT_RESTORED');
const result={schema:'DUDUQ_MEDIA_BROAD_VISUAL_REVIEW_V1',
 sourceImages:488,reviewOnly:true,pedagogicalApproved:false,
 matchedMediaIds:report.appliedMediaIds,affectedQuestions:report.appliedQuestionIds.length,
 addedPngs:report.actuallyAddedPngs,held:report.heldCount,
 publishedMediaPreserved:preserved,contracts:600,
 firstModule,unresolved:report.exceptions,productionDeployed:false};
writeFileSync('qa/results/visual-review-outcome.json',JSON.stringify(result,null,2)+'\n');
console.log('VISUAL_REVIEW_PREVIEW_READY='+JSON.stringify({
 media:result.matchedMediaIds,questions:result.affectedQuestions,
 addedPngs:result.addedPngs,holds:result.held,
 preservedLinks:preserved,module1:firstModule,approved:false}));
NODE
node --check qa/duduq-media-clarity-audit.mjs
DUDUQ_QA_ONLY=1 DUDUQ_VISUAL_REVIEW=1 node qa/duduq-media-clarity-audit.mjs
cp -a "$ROOT"/. dist-pages/
DUDUQ_QA_ONLY=1 DUDUQ_VISUAL_REVIEW=1 node qa/duduq-media-clarity-audit.mjs --production-media-fit
node --check qa/phase2-purple-color-override.mjs
DUDUQ_QA_ONLY=1 node qa/phase2-purple-color-override.mjs --release
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
const base='dist-pages/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const regRel='content/english/media/media-registry.json';
const imgRel='content/english/assets/images/assets-duduq/fast-aafd4cfb4960-9ff04eb4f5f1.png';
const actualRegistry=readFileSync(base+regRel);
assert.equal(hash(actualRegistry),
 'd9c4c31c4764c5a8a42cc99be0b29259a128ae1971d32855af89067304465dab',
 'REGISTRY_MUST_MATCH_APPROVED_PURPLE_QA_PREVIEW');
assert.equal(hash(readFileSync(base+imgRel)),
 '9ff04eb4f5f169a5b0737c4b607a287f8cb0163381a88f583bda7b22994c1d03',
 'PURPLE_IMAGE_BYTES_MUST_MATCH_GITHUB_SOURCE');
const manifest=readFileSync(base+'.duduq-pages-manifest','utf8');
assert(manifest.includes(regRel+' '+hash(actualRegistry)),'MANIFEST_REGISTRY_MISMATCH');
assert(manifest.includes(imgRel+' '+'9ff04eb4f5f169a5b0737c4b607a287f8cb0163381a88f583bda7b22994c1d03'),
 'MANIFEST_IMAGE_MISMATCH');
assert(!existsSync(base+'media-review/purple.html'),'REVIEW_PAGE_MUST_NOT_BE_IN_PRODUCTION');
console.log('DUDUQ_PURPLE_PRODUCTION_QA_ARTIFACT_VERIFIED=11_COLOR_MEDIA');
NODE
echo "DUDUQ_RELEASE_ARTIFACT_269_BINDINGS_97_PNGS_AND_PROPORTIONAL_MEDIA_FIT"

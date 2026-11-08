#!/usr/bin/env bash
# DUDUQ official media release, exact match to verified 06-Nov staging build.
# Images remain flagged PEDAGOGICAL_QA_PENDING; no answer-key/Gold Master edits.
set -Eeuo pipefail
if [[ "$CF_PAGES_BRANCH" != "staging/duduq-37-new-exact-media-20261107" ]]; then
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
cp qa/fixtures/phase2-official-source-tree-db68bc43.json qa/results/visual-review-source-tree.json
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
node --check qa/phase2-gray-memory-fast-feedback.mjs
DUDUQ_QA_ONLY=1 DUDUQ_VISUAL_REVIEW=1 node qa/phase2-gray-memory-fast-feedback.mjs --release
node --input-type=module --check < dist-pages/play/memory-quest/memory-quest.js
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
const hash=buf=>createHash('sha256').update(buf).digest('hex');
const base='dist-pages/';
const registry='content/english/media/media-registry.json';
const memory='play/memory-quest/memory-quest.js';
const gray='content/english/assets/images/assets-duduq/fast-64a278da3c63-db611390d77d.png';
const expect=new Map([
 [registry,'9d2aa04d5230c1b6419284a4e222cca7abf43bde2d72b971eaa0ce0a713c93fa'],
 [memory,'1af7a78dd707ae87d8fc1c98350673a47324ff39dfba5b9120fac70957388ec3'],
 [gray,'db611390d77dff45da09ac8206b7b9a90d546df378e217223fb97a5980821680']
]);
const manifest=readFileSync(base+'.duduq-pages-manifest','utf8');
for(const [name,digest] of expect){
 assert.equal(hash(readFileSync(base+name)),digest,'PRODUCTION_BYTES_DIFFER_FROM_QA:'+name);
 assert(manifest.includes(name+' '+digest),'PRODUCTION_MANIFEST_MISMATCH:'+name);
}
assert(!existsSync(base+'media-review/gray.html'),'QA_REPORT_LEAKED_IN_PRODUCTION');
const reg=JSON.parse(readFileSync(base+registry));
const grayIDs=reg.entries.filter(e=>e.semantic==='gray'&&/GRAY/.test(e.mediaId));
assert.equal(grayIDs.length,9,'GRAY_ID_COUNT_CHANGED');
assert(grayIDs.every(e=>e.provenance?.sourcePath==='Imagens Ilustrativa/Color_Cinza_Grey.png'));
console.log('DUDUQ_GRAY_MEMORY_RELEASE_PINNED_QA_PASS=9_GRAY_AND_FAST_ACTION_BUTTONS');
NODE
# Authorized exact source-image release based on preview 071d149d.
node --check qa/phase2-exact-five-clusters.mjs
DUDUQ_QA_ONLY=1 DUDUQ_VISUAL_REVIEW=1 node qa/phase2-exact-five-clusters.mjs --release
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
const root='dist-pages/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected='f7c8db9bae95722fa8255a1df5f1b55f4033ae93010ebfa2caef7c41591327f9';
const registry='content/english/media/media-registry.json';
const bytes=readFileSync(root+registry);
assert.equal(hash(bytes),expected,'QA_071D149D_REGISTRY_SHA_MISMATCH');
const r=JSON.parse(bytes),byId=new Map(r.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,r.entries.length,'REGISTRY_DUPLICATE_ID');
assert.equal(r.entries.length,1166,'REGISTRY_ENTRY_COUNT_CHANGED');
const report=JSON.parse(readFileSync('qa/results/exact-five-clusters.json'));
assert.equal(report.newRegistrySha,expected,'CANDIDATE_NOT_IDENTICAL_TO_QA');
assert.equal(report.previousRegistrySha,
 '9d2aa04d5230c1b6419284a4e222cca7abf43bde2d72b971eaa0ce0a713c93fa',
 'PREVIOUS_LIVE_REGISTRY_NOT_PRESERVED');
assert.equal(report.mediaIdsUpdated,10,'NOT_TEN_NEW_MEDIA_LINKS');
assert.equal(report.affectedQuestionCount,15,'DIFFERENT_QUESTION_CONSUMERS');
assert.equal(report.contracts,600,'CONTRACT_COUNT_CHANGED');
assert.equal(report.images.length,5,'WRONG_IMAGE_SET');
assert.equal(report.images.filter(x=>!x.reused).length,3,'WRONG_NEW_PNG_COUNT');
assert.equal(report.images.filter(x=>x.reused).length,2,'WRONG_PNG_REUSE_COUNT');
assert.deepEqual(report.concepts.slice().sort(),
 ['blue square','brazil','headache','in the kitchen','rainy'].sort(),
 'UNEXPECTED_SOURCE_CONCEPTS');
const manifest=new Map();
for(const line of readFileSync(root+'.duduq-pages-manifest','utf8').trimEnd().split(/\r?\n/)){
 const i=line.lastIndexOf(' ');assert(i>0);
 const name=line.slice(0,i),digest=line.slice(i+1);
 assert(!manifest.has(name),'DUPLICATE_MANIFEST_FILE:'+name);
 manifest.set(name,digest);
}
assert.equal(manifest.get(registry),expected,'REGISTRY_MANIFEST_HASH_WRONG');
for(const img of report.images){
 assert.equal(img.sha256,manifest.get(img.url),'SOURCE_PNG_HASH_WRONG:'+img.filename);
 assert.equal(hash(readFileSync(root+img.url)),img.sha256,'SOURCE_PNG_BYTES_WRONG:'+img.filename);
 assert(img.width>=512&&img.height>=512,'SOURCE_PNG_RESOLUTION_WRONG');
 for(const id of img.ids){
  const e=byId.get(id);
  assert(e,'TARGET_MEDIA_MISSING:'+id);
  assert.equal(e.semantic,img.concept,'TARGET_CONCEPT_WRONG:'+id);
  assert.equal(e.urlOrPath,img.url,'TARGET_PNG_WRONG:'+id);
  assert.equal(e.sha256,img.sha256,'TARGET_BYTES_WRONG:'+id);
 }
}
let count=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const q='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const d=JSON.parse(readFileSync(root+q,'utf8'));
 assert.equal(d.items.length,20,'QUESTION_CONTRACT_DIFFERENCE:'+q);
 count+=d.items.length;
}
assert.equal(count,600);
assert(!existsSync(root+'media-review/five-concepts.html'),'QA_GALLERY_LEAK_TO_PRODUCTION');
assert(!existsSync(root+'media-review/five-concepts.json'),'QA_DATA_LEAK_TO_PRODUCTION');
// Critical Memory Quest, gray, purple media and old production runtime are
// already verified earlier in this build and must remain untouched.
console.log('DUDUQ_FIVE_CONCEPT_RELEASE_SHA_MATCH_QA_071D149D=PASS');
NODE
node --check qa/phase2-new-37-exact-media.mjs
DUDUQ_QA_ONLY=1 DUDUQ_VISUAL_REVIEW=1 node qa/phase2-new-37-exact-media.mjs --preview
echo "DUDUQ_RELEASE_ARTIFACT_269_BINDINGS_97_PNGS_AND_PROPORTIONAL_MEDIA_FIT"
echo "DUDUQ_37_NEW_PNG_CONCEPTS_PREVIEW_ONLY"

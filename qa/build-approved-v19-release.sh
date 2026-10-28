#!/usr/bin/env bash
# Exact user-approved V19 reconstruction. Isolated QA only.
set -Eeuo pipefail
export CI=true DUDUQ_QA_STATIC_PREVIEW=1
bash qa/run-cloudflare-stage-46507.sh
node --check qa/derive-bubble-target-shooter-v18.mjs
node qa/derive-bubble-target-shooter-v18.mjs
export EXPECTED_ARTIFACT_SHA256=50E85BA7BAB172DE2892137F9A4F8DFE7B9768B4938E7FAFC4924A6130F34F7A
test "$(tr -d '\n' < qa/results/v18-bubble-target-manifest.txt)" = "$EXPECTED_ARTIFACT_SHA256"
node qa/verify-artifact.mjs
echo "V19_PREFLIGHT_V18_BASE=PASS:$EXPECTED_ARTIFACT_SHA256"
node --check qa/derive-grouping-feedback-latency-v19.mjs
node qa/derive-grouping-feedback-latency-v19.mjs
export EXPECTED_ARTIFACT_SHA256=CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E
test "$(tr -d '\n' < qa/results/v19-grouping-latency-manifest.txt)" = "$EXPECTED_ARTIFACT_SHA256"
node --check dist-pages/play/drag-drop/drag-drop.js
node --check dist-pages/core/ui/duduq-canonical-question-hud.js
node qa/verify-artifact.mjs
module_count=0
for year in 1 2 3 4 5; do
 for month in 01 02 03 04 05 06; do
  test -s "dist-pages/play/english/year-$year/module-$month/index.html"
  test -s "dist-pages/content/english/year-$year/module-$month/questions.json"
  module_count=$((module_count + 1))
 done
done
test "$module_count" -eq 30
node --input-type=module <<'NODE'
import {readFileSync} from 'node:fs';
let slots=0,modules=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const path='dist-pages/content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const data=JSON.parse(readFileSync(path,'utf8'));
 if(!Array.isArray(data.items)||data.items.length!==20)throw Error('INVALID_CURRICULUM_MODULE:'+path);
 slots+=data.items.length;
 modules++;
}
if(slots!==600||modules!==30)throw Error('SLOTS_INCOMPLETE:'+slots);
console.log('V19_RELEASE_CURRICULUM=PASS:'+modules+'/'+slots);
NODE
echo "V19_RELEASE_MODULES=PASS:$module_count"
echo "V19_RELEASE_ARTIFACT=PASS:$EXPECTED_ARTIFACT_SHA256"

#!/usr/bin/env bash
# Certified V18 release artifact. No production deployment here.
# Only stage known sources, validate the exact immutable manifest.
set -Eeuo pipefail
export CI=true
export DUDUQ_QA_STATIC_PREVIEW=1
bash qa/run-cloudflare-stage-46507.sh
node --check qa/derive-bubble-target-shooter-v18.mjs
node qa/derive-bubble-target-shooter-v18.mjs
export EXPECTED_ARTIFACT_SHA256=50E85BA7BAB172DE2892137F9A4F8DFE7B9768B4938E7FAFC4924A6130F34F7A
actual="$(tr -d '\n' < qa/results/v18-bubble-target-manifest.txt)"
if [[ "$actual" != "$EXPECTED_ARTIFACT_SHA256" ]]; then
  echo "DUDUQ_V18_RELEASE_MANIFEST_MISMATCH:$actual"
  exit 1
fi
node qa/verify-artifact.mjs
module_count=0
for year in 1 2 3 4 5; do
 for month in 01 02 03 04 05 06; do
  test -s "dist-pages/play/english/year-$year/module-$month/index.html"
  module_count=$((module_count+1))
 done
done
test "$module_count" -eq 30
echo "DUDUQ_V18_RELEASE_MODULES=PASS:$module_count"
echo "DUDUQ_V18_RELEASE_ARTIFACT=PASS:$EXPECTED_ARTIFACT_SHA256"

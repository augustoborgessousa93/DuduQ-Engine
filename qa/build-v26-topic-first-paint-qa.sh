#!/usr/bin/env bash
set -Eeuo pipefail
bash qa/build-v25-early-header-title-qa.sh
node --check qa/apply-v26-topic-first-paint.mjs
node qa/apply-v26-topic-first-paint.mjs
node --check qa/tests/verify-v26-topic-first-paint.mjs
node qa/tests/verify-v26-topic-first-paint.mjs
echo 'DUDUQ_V26_CRITICAL_HUD_TOPIC_RELEASE_GATE=PASS'

# On the isolated Assets-DuduQ preview branch ONLY, stage visually reviewed
# school-object PNGs onto the compiled QA artifact. Official production branch
# never receives this file change. Reject absent source rather than silently
# showing the baseline as if the new PNGs were integrated.
if [[ "${CF_PAGES_BRANCH:-}" == "integration/assets-duduq-resume-20261030" ]]; then
  test -f qa/assets-reuse-source/y1m04/.git-source-commit || {
    echo 'DUDUQ_ASSETS_REUSE_PREVIEW_SOURCE_MISSING'; exit 2;
  }
  node qa/apply-assets-duduq-y1m04-review.mjs qa/assets-reuse-source/y1m04
  echo 'DUDUQ_ASSETS_REUSE_PREVIEW_PATCH=PASS:PRODUCTION_UNTOUCHED'
fi

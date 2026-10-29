#!/usr/bin/env bash
set -Eeuo pipefail
bash qa/build-v24-header-title-qa.sh
node --check qa/apply-v25-early-header-title.mjs
node qa/apply-v25-early-header-title.mjs
node --check qa/tests/verify-v25-early-header-title.mjs
node qa/tests/verify-v25-early-header-title.mjs
echo 'DUDUQ_V25_EARLY_TOPIC_FIT_RELEASE_GATE=PASS'

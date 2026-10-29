#!/usr/bin/env bash
set -Eeuo pipefail
bash qa/build-v25-early-header-title-qa.sh
node --check qa/apply-v26-topic-first-paint.mjs
node qa/apply-v26-topic-first-paint.mjs
node --check qa/tests/verify-v26-topic-first-paint.mjs
node qa/tests/verify-v26-topic-first-paint.mjs
echo 'DUDUQ_V26_CRITICAL_HUD_TOPIC_RELEASE_GATE=PASS'

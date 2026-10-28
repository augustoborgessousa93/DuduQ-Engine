#!/usr/bin/env bash
set -Eeuo pipefail
bash qa/build-v21-embed-dnd-matching-qa.sh
node --check qa/apply-v22-matching-feedback.mjs
node qa/apply-v22-matching-feedback.mjs
node --check dist-pages/core/matching/duduq-matching-runtime-v22.js
node --check dist-pages/core/ui/duduq-canonical-question-hud.js
node --check dist-pages/core/duduq-matching-production-bridge.js
node --check qa/tests/verify-v22-matching-feedback.mjs
node qa/tests/verify-v22-matching-feedback.mjs
echo 'V22_MATCHING_FEEDBACK_RELEASE_GATE=PASS'

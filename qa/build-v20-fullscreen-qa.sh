#!/usr/bin/env bash
set -Eeuo pipefail
bash qa/build-v20-pinned-v19-content.sh
node --check functions/play/english/_middleware.js
node --check qa/tests/verify-direct-module-fullscreen-v20.mjs
node qa/tests/verify-direct-module-fullscreen-v20.mjs
echo "DUDUQ_V20_FULLSCREEN_QA=PASS"

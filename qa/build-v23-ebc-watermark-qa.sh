#!/usr/bin/env bash
set -Eeuo pipefail
bash qa/build-v22-matching-feedback-qa.sh
node --check qa/apply-v23-ebc-watermark.mjs
node qa/apply-v23-ebc-watermark.mjs
node --check dist-pages/core/duduq-ebc-attribution-watermark.js
node --check qa/tests/verify-v23-ebc-watermark.mjs
node qa/tests/verify-v23-ebc-watermark.mjs
echo "DUDUQ_V23_ATTRIBUTION_QA=PASS"

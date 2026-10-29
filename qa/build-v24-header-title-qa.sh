#!/usr/bin/env bash
set -Eeuo pipefail
bash qa/build-v23-ebc-watermark-qa.sh
node --check qa/apply-v24-header-title.mjs
node qa/apply-v24-header-title.mjs
node --check dist-pages/core/duduq-header-title-fit-v24.js
node --check qa/tests/verify-v24-header-title.mjs
node qa/tests/verify-v24-header-title.mjs
echo "DUDUQ_V24_RESPONSIVE_HEADER_TITLE_QA=PASS"

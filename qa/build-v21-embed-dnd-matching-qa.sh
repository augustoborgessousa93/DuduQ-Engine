#!/usr/bin/env bash
# QA ONLY: freeze V19/20, apply 4 V21 runtime overlays, verify 30 modules and tests.
set -Eeuo pipefail
bash qa/build-v21-from-approved-v19.sh
node --check qa/apply-v21-approved-content-overlay.mjs
node qa/apply-v21-approved-content-overlay.mjs
node --check functions/play/english/_middleware.js
node --check dist-pages/play/drag-drop/drag-drop.js
node --check dist-pages/play/drag-drop-multimedia/drag-drop-multimedia-gameplay.js
node --check dist-pages/core/ui/duduq-canonical-question-hud.js
node --check qa/tests/verify-v21-targeted.mjs
node qa/tests/verify-v21-targeted.mjs
echo "DUDUQ_V21_EMBED_DND_MATCHING_QA=PASS"

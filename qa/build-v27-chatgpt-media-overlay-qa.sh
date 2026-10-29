#!/usr/bin/env bash
# V27: stage the exact approved V26 release, then apply a strictly checked media overlay.
# Never merge or publish on failure. No API keys or paid image-generation plugins.
set -Eeuo pipefail
export DUDUQ_CHATGPT_IMAGE_BUNDLE="${DUDUQ_CHATGPT_IMAGE_BUNDLE:-qa/media-inbox/batch-20261029}"
if [[ ! -s "$DUDUQ_CHATGPT_IMAGE_BUNDLE/batch-manifest.json" ]]; then
  echo "DUDUQ_MEDIA_BUNDLE_MISSING_MANIFEST"
  exit 1
fi
bash qa/build-v26-topic-first-paint-qa.sh
node --check scripts/duduq-import-chatgpt-bundle.mjs
node scripts/duduq-import-chatgpt-bundle.mjs "$DUDUQ_CHATGPT_IMAGE_BUNDLE" > qa/results/v27-chatgpt-media-preflight.json
node scripts/duduq-import-chatgpt-bundle.mjs "$DUDUQ_CHATGPT_IMAGE_BUNDLE" --apply > qa/results/v27-chatgpt-media-import.json
node --check qa/tests/verify-v27-chatgpt-media-overlay.mjs
node qa/tests/verify-v27-chatgpt-media-overlay.mjs
echo "DUDUQ_V27_CHATGPT_MEDIA_RELEASE_CANDIDATE=PASS"

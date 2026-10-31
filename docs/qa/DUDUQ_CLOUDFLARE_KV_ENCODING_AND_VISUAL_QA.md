# DUDUQ Cloudflare QA KV binary contract — 2026-10-29

The read-only QA Worker `duduq-media-qa-staging` uses `MEDIA_CANDIDATES.get(key)` and **decodes the stored value with `atob(data)`** before returning `image/jpeg`. Therefore the KV namespace `a3e5341c66e14987b15499c47c1b967e` must store **base64 text of the original JPEG**, not raw JPEG bytes. Storing raw bytes returned HTTP 500 for the V3 QA route. The same V3 source was repaired in KV by encoding to base64 and verifying the decoded SHA-256 was unchanged; no new inference was performed.

## Fail-closed generation and review gates

Before each inference, query Cloudflare GraphQL `aiInferenceAdaptiveGroups.sum.totalNeurons` for the current UTC day. If unavailable or rate-limited, do not generate. Keep usage below the conservative 5,000 neurons/day cap and no more than 10 generation attempts per execution; do not repeat failed generations without a concrete diagnosis. Use only `@cf/black-forest-labs/flux-2-klein-4b` with native 1920×1920 output, one object per image and no collages. No paid APIs or production Workers.

After generation, verify JPEG magic, size and SHA-256, base64-encode into QA KV, read back and verify decoded bytes and SHA. The Linux runner must independently download the QA JPEG, verify its SHA, remove background with open-source rembg, inspect native 1920×1920 RGBA/alpha/contrast, and stage only a candidate after visual/semantic checks. Keep all media provisional until genuine in-game pedagogical review. Never approve merely because a loader reports `APPROVED`.

## Current eraser evidence

V2 technical integrity and four Chromium render checks passed in [browser run #40951515080](https://github.com/augustoborgessousa93/DuduQ-Engine/actions/runs/40951515080), but **actual-size visual review rejected it**: a blue-gray block at target-card size, with a separate mobile target clipping concern. The exact V2 PNG remains an isolated, temporary candidate; importer blocks promotion when rendered evidence is rejected.

V3 source JPEG SHA-256: `b4c09926644ea26dbec8d999dab7a8f1116713e68e2e9f966325d662808bd64c`. Technical rembg QA passed in [run #40952133185](https://github.com/augustoborgessousa93/DuduQ-Engine/actions/runs/40952133185), producing PNG SHA-256 `46414e32d26b7b139a30a13e5862ba9a43d1d64d779c0ae728b57db54e5493be`. Model visual inspection **rejected V3** because it resembles a pink U-shaped clip, not a recognizable eraser. V3 PNG remains in the QA artifact only and was not imported.

No merge, production deployment, Gold Master change, gabarito change or final pedagogical homologation occurred.

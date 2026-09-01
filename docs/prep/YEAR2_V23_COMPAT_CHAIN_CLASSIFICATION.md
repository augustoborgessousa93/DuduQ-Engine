# Year 2 v2.3 — compatibility-chain preparation classification

Preparation only. No script is removed, reordered or rewritten by this document.

## Status vocabulary

- `ACTIVE`: current public M01–M06 entrypoints load the layer and a reachable transformation path exists.
- `DORMANT`: the code is present, but the current public-entry configuration cannot satisfy its activation gate.
- `REDUNDANT`: equivalent behavior has been proven elsewhere and the layer can be removed without changing output. **No Year 2 layer is classified REDUNDANT yet.**
- `REQUIRED`: current evidence shows the layer protects a contract still used by the public candidate, or no parity replacement has been proven; retain it for future homologation.

## Common public-entry chain (M01–M06)

Observed across the six public v2.3 entrypoints:

- `year2-v22-homolog-core.js`
- `year2-v22-homolog-editorial-assets.js`
- `year2-v23-multimodal-adapter.js`
- `year2-v23-gamification-diversity.js`
- `year2-v23-gamification-router-compat.js`
- `year2-v23-manual-review-hotfix-v2.js`
- `year2-v23-manual-review-router-compat.js`
- `year2-v23-mechanics-regression-hotfix.js`
- `year2-v23-bubble-smart-renderer-bridge.js`
- `year2-v23-mechanics-regression-router-compat.js`
- `year2-v23-dragdrop-visual-patch.js`
- `year2-v22-homolog-layout.js`

M01 additionally carries first-listen/mobile compact scripts. Player and Loader are appended dynamically with a `Date.now()` query stamp. Current evidence classifies the timestamp as cache-busting; no functional state is derived from it.

## Explicit classification

| layer / sub-path | status | evidence / disposition |
|---|---|---|
| v2.2 homolog core | ACTIVE + REQUIRED | base factory consumed by v2.3 adapter chain; no independent v2.3 replacement proven |
| v2.2 editorial assets | ACTIVE + REQUIRED | source visual/editorial metadata remains input to later v2.3 transforms |
| v2.3 multimodal adapter | ACTIVE + REQUIRED | public candidate content is built from the v2.3 source and R0/multimodal rules |
| v2.3 gamification diversity | ACTIVE + REQUIRED | current rules have reachable M02–M06 consumers including Bubble/Target/Matching/DD choices |
| gamification-router-compat | ACTIVE + REQUIRED | wraps `buildModule`, normalizes Router-facing fields after diversity transforms and preserves source answers; no native-Router parity proven |
| manual-review-hotfix-v2 | ACTIVE + REQUIRED | official-assets-first and complete Matching-pair reconstruction are current delivery transformations, not cosmetic cleanup |
| manual-review-router-compat | ACTIVE + REQUIRED | normalizes post-manual-review Bubble/Target/DD payloads before Router; no equivalent modern entrypoint proven |
| mechanics-regression-hotfix | ACTIVE + REQUIRED | quarantine/fallback layer for unsafe Word Slash, non-unique Target visuals and Bubble upgrades; preserves source answers |
| bubble-smart-renderer-bridge | ACTIVE + REQUIRED | Bubble Pop 1.0.31 is immutable/current and bridge supplies official image rendering + synthetic duplicate visual dedupe without answer mutation |
| mechanics-regression-router-compat | ACTIVE + REQUIRED | synchronizes post-hotfix mechanics/payloads with Router and protects fallback output; removal not parity-proven |
| dragdrop-visual-patch — generic response-target normalization | ACTIVE + REQUIRED | runs for current DD questions whenever target metadata needs response normalization |
| dragdrop-visual-patch — EN2-M1-12 spell-slot/mobile adaptation | ACTIVE + REQUIRED | M01 source still has the first-listen + positional L/E/O requirement and public M01 loads this patch |
| dragdrop-visual-patch — M03 DD2.0.23 SINGLE_TARGET_CHOICE pilot | **DORMANT** | activation requires both `interactionPilot === "SINGLE_TARGET_CHOICE"` and `dragDropCandidate === "2.0.23"`; current M03 public entry declares neither. Do not delete yet: prove regression-safe before extracting the dormant sub-path |
| v2.2 homolog layout | ACTIVE + REQUIRED | public pages still load the layout layer; no layout-parity replacement proven |
| Player/Loader `Date.now()` cache stamp | ACTIVE, not a contract layer | observable use is URL cache-busting only. Do not classify as product bug or remove until deployment-cache equivalence is proven |

## No REDUNDANT classification yet

A script being old, layered, duplicated-looking or carrying an RC name is insufficient to call it redundant. The current preparation evidence supports zero whole-file removals.

The only evidence-backed dormant portion is the **M03 DD2.0.23 single-target pilot sub-path** inside `year2-v23-dragdrop-visual-patch.js`; the same file has other active responsibilities, so the file itself remains REQUIRED.

## Why the Router wrappers remain REQUIRED

The three compatibility wrappers execute after different transformation stages:

1. diversity / gamification output;
2. manual-review visual + Matching reconstruction;
3. regression quarantine/fallback output.

Each stage can create a different Router-facing shape while preserving source answer metadata. A future consolidation may replace them only with an A/B gate proving identical effective mechanic, accepted payload, answer, asset provenance, retry/success and Completion for M01–M06.

## Runtime regression quarantine

`year2-v23-mechanics-regression-hotfix.js` is technical debt but still functional:

- validates Word Slash renderability;
- provides reversible Word Slash→Target Shooter fallback when unsafe;
- validates unique Target Shooter visual sets and can fall back to Drag & Drop;
- upgrades Bubble alternatives to safe resolved visuals;
- preserves source-answer metadata.

Word Slash 1.0.17 remains quarantined until an explicit Year 2 gate proves the affected payloads mount and complete natively.

## Date.now()

The public entry constructs versioned Player/Loader URLs with a timestamp query. Nothing in the inspected path reads the timestamp back into pedagogy, session state, answer resolution or mechanic selection. Current classification: **cache-busting behavior, not a hidden contract**. Removal is still deferred until deployment-cache behavior is tested.

## Required pre-homologation evidence

Before FILA A reaches Year 2, produce a read-only matrix per M01–M06 with:

- effective mechanic after all transformations;
- compatibility layers that touched each item;
- active fallback and reason;
- source answer before/after;
- resolved visual provenance;
- public-entry chain;
- runtime mount, retry/success and Completion under then-current Canary.

Only that evidence can promote a layer from `REQUIRED` to `REDUNDANT` or authorize consolidation.

# Year 2 v2.3 — compatibility-chain preparation classification

Preparation only. No script is removed, reordered or rewritten by this document.

## Common public-entry chain (M01–M06)

Observed across all six Year 2 public v2.3 entrypoints:

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

M01 additionally has local first-listen/mobile compact scripts.

Player and Loader are appended dynamically with a `Date.now()` query stamp. Current evidence classifies this as cache-busting only. No functional dependency on the timestamp has been proven.

## Classification by responsibility

### Schema/router compatibility — CURRENTLY FUNCTIONAL, DO NOT REMOVE

`year2-v23-gamification-router-compat.js`
- normalizes payload presentation fields that the shared Router does not accept;
- preserves source answers;
- belongs to the transformation layer rather than pedagogy.

`year2-v23-manual-review-router-compat.js`
- keeps manual-review output compatible with Router after visual/matching normalization;
- paired with the manual-review factory transformation;
- removal requires a real entrypoint parity test, not cleanup reasoning.

`year2-v23-mechanics-regression-router-compat.js`
- protects post-hotfix payloads from Router rejection;
- coupled to mechanics-regression fallbacks;
- retain until the relevant payload forms are proven native under the then-current Router contract.

### Visual/media compatibility — CURRENTLY FUNCTIONAL

`year2-v23-bubble-smart-renderer-bridge.js`
- keeps Bubble Pop 1.0.31 immutable;
- injects official Assets-DuduQ absolute URLs through the existing `.duduq-bp-media` contract;
- deduplicates only synthetic duplicate visuals while explicitly preserving source answers;
- current Canary still uses Bubble Pop 1.0.31, therefore this bridge is not classified as dead.

`year2-v23-dragdrop-visual-patch.js`
Contains three distinct responsibilities and must not be treated as one cleanup unit:
1. generic response-target normalization — potentially still active;
2. EN2-M1-12 spell-slot/first-listen adaptation — specific and potentially still active;
3. M03 single-target pilot for Drag & Drop 2.0.23 — explicitly gated by `interactionPilot=SINGLE_TARGET_CHOICE` plus `dragDropCandidate=2.0.23`; under Canary DD 2.0.24 this sub-path appears dormant unless an entrypoint still declares the old pilot. Prove dormant across M01–M06 before deleting only that sub-path.

### Pedagogy-preserving visual transformation — CURRENTLY FUNCTIONAL

`year2-v23-manual-review-hotfix-v2.js`
- official asset bank first;
- reconstructs Matching as complete audio↔visual pairs rather than loose distractors;
- requires original pedagogical answer/concept to remain represented;
- falls back only when safe distinct visuals are unavailable.

This is not a cosmetic patch. It changes delivery representation while preserving source pedagogy.

### Runtime regression quarantine — CURRENTLY FUNCTIONAL / TECHNICAL DEBT

`year2-v23-mechanics-regression-hotfix.js`
- validates Word Slash payload renderability;
- provides reversible Word Slash→Target Shooter fallback when the Word Slash contract/runtime is unsafe;
- deduplicates/validates Target Shooter image sets and can fall back to Drag & Drop when images are not unique;
- upgrades Bubble Pop alternatives to safe resolved visuals where possible;
- preserves source answer metadata.

Word Slash 1.0.17 must remain quarantined until an explicit Year 2 runtime gate proves the relevant payloads can mount and complete without the fallback.

## Consolidation candidates — NOT YET AUTHORIZED

1. Replace the three Year 2 router compatibility wrappers with the modern real-entry/bootstrap pattern only if an A/B gate proves identical payload acceptance, source-answer preservation, mechanics selection and completion for all six modules.
2. Replace dynamic Player/Loader stamping with stable versioned URLs only after proving there is no stale-cache deployment dependency. `Date.now()` itself is not currently a product bug.
3. Remove the obsolete DD 2.0.23 M03 pilot sub-path only after scanning all public entries/config for `SINGLE_TARGET_CHOICE` / `dragDropCandidate: 2.0.23` and running a regression that shows no active consumer.
4. Move Bubble Pop official-image support into a future shared release only in a separately homologated release. Do not mutate 1.0.31 in this preparation branch.

## Required Year 2 pre-homologation gate

Before FILA A reaches Year 2, create a read-only compatibility matrix per M01–M06 that records:
- effective mechanics after all transformations;
- which compatibility layer touched each item;
- whether a fallback is active;
- source answer before/after;
- resolved visual provenance;
- public-entry script chain;
- runtime mount + Completion under current Canary.

Only after that matrix is green may individual wrappers be classified as safely replaceable.

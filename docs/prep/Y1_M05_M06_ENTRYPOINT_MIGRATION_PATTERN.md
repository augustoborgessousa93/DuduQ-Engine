# Year 1 M05/M06 — common entrypoint migration pattern

Preparation only. This is the proven technical shape to apply on each future homologation branch after its official mechanic contract is fixed.

## Legacy condition shared by M05 and M06

Both current Foundation modules use:
- `channel: canary-v1` but legacy content package R124/v2.2;
- `contentVersion: year1-systemic-loader-v1`;
- direct Player + Loader only;
- no runtime surface guard;
- no bootstrap-only direct-payload compatibility bridge;
- legacy procedural preview generators in the content file.

## Target migration pattern

For a module whose audited payload contains Target Shooter and Drag & Drop direct `single-choice`:

1. keep `channel: canary-v1`;
2. set `requiredMechanics` to the exact audited mechanics only;
3. load local visual-composition helper only if the module has a proven local presentation exception;
4. load `duduq-runtime-surface-guard-v1.js` before Player when Target Shooter surface validation is required;
5. load `duduq-router-direct-payload-compat-v1.js` before Player when the module actually publishes direct DD single-choice payloads;
6. load Player then Loader;
7. use stable explicit query/version tokens, not `Date.now()`;
8. preserve fail-closed behavior: if module identity/contract cannot be proven, local helpers do nothing.

## QA pattern to inherit from M01–M04

- real entrypoint, not universal harness, once the module is officially homologated;
- stable Host step requires session + expected `stepIndex` + `!transitioning` + `!completed` + mounted iframe/view + `DuduQTransition.getState()==="idle"`;
- MutationObserver/latch installed before an interaction when validating transient audio playback;
- wrong answer → retry and same Host step;
- correct answer → success and deterministic next stable step;
- mobile uses reduced-motion audit;
- prohibit `data:image`, procedural SVG, `gap-preview`, `legacy-fallback` in production candidate;
- canonical asset provenance must resolve to immutable Assets pin;
- completion requires session completed + progress 100 + visible completion UI + zero blocker pageerrors/critical 404.

## Scope rule

Do not apply the direct-payload bridge simply because M05/M06 currently list Drag & Drop. Apply it only after their future v2.3 implementation actually emits the same direct `single-choice` contract already homologated in M01–M04.

The source v2.3 modality map already makes that highly likely for many M05/M06 items, but the final entrypoint is still cut on the homologation branch, not on this preparation branch.

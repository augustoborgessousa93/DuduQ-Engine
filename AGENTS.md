# DUDUQ Sync

1. **READ `DUDUQ_PROJECT_STATE.json` FIRST.**
2. Read `DUDUQ_ARCHITECTURE.md` and `DUDUQ_SYNC.md` before changing the sync.

For “ATUALIZE O CORE” and its aliases, run the documented Universal Sync protocol. Preserve the golden checkpoints and validated Matching/Target Shooter consumers.

Critical rules:

- PENPOT VISUAL SYNC IS SCREEN-WIDE AND NODE-GENERIC. The official command accepts no component selector; a behavior-bound node and every visual descendant remain eligible for visual updates.

- Never recover an older mechanic merely because it was historically known to be playable. Always resolve the current approved Gold Master from project state and repository evidence. Penpot updates Gold Master visuals; it does not select or replace the mechanic version.

- Do not redesign the sync architecture or create a V3.
- Do not add property-specific visual handlers or component-specific visual adapters.
- Do not use `--component` for normal “ATUALIZE O CORE”.
- Do not bypass `DuduQScreenRuntime` / the Universal Screen Host.
- Do not edit successful snapshots manually.
- Do not modify golden baselines without regression proof.
- Prefer the existing Penpot compiler, graph, package, host, and E2E infrastructure.

When the user says **“Atualize o Core”**:

- read `DUDUQ_PROJECT_STATE.json`;
- run the official `npm run duduq:update-core` flow (never add `--component` unless explicitly requested);
- resolve the consumers actually affected by the live change;
- ensure the official preview server is running and HTTP-health-check every verification URL;
- ALWAYS include verified clickable mechanic preview links in the final response, including for `NO_CHANGES` when the relevant consumer is known.
- Never call a preview “verified” from HTTP 200 alone: require active package-hash, package-asset, golden-visual, and gameplay-E2E health.
- `GAMEPLAY API PASS` is not `INTERACTION PASS`: verified mechanics require real Playwright mouse/pointer input on visible Penpot package nodes and an observable visible state transition. Hidden legacy DOM, direct runtime calls, `dispatchEvent`, and test-only controls are invalid proof.
- Human preview URLs must remain LIVE_VISUAL_PACKAGE routes and never default to Golden/static fixture mode.
- `NO_CHANGES` describes source plus applied-runtime consistency, not merely an empty graph diff. Before returning it, compare the live source hash with the last applied source hash, verify active package/runtime visual hashes and Gold Master identity, and treat any package-hash mismatch as `VISUAL_DRIFT_DETECTED` requiring reconciliation.
- Runtime geometry is screen-wide and node-generic: resolve the current Penpot screen hierarchy, apply one uniform board-to-iframe scale and Penpot-owned x/y/size without allowing legacy flex/grid layout to reflow synced nodes. Gold Master behavior, listeners, state, hit testing, and progression remain unchanged.

- Production visual contract: Penpot's complete LIVE_VISUAL_PACKAGE is the only visible scene; Gold Master files are behavior engines only. Do not load legacy iframe geometry projection or property/component visual patching.

# DUDUQ Sync

1. **READ `DUDUQ_PROJECT_STATE.json` FIRST.**
2. Read `DUDUQ_ARCHITECTURE.md` and `DUDUQ_SYNC.md` before changing the sync.

For “ATUALIZE O CORE” and its aliases, run the documented Universal Sync protocol. Preserve the golden checkpoints and validated Matching/Target Shooter consumers.

Critical rules:

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

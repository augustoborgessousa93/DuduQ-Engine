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

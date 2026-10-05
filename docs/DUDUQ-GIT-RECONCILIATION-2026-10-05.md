# DUDUQ Git Reconciliation — 2026-10-05

## Branch safety

- Current branch/upstream: `feat/design-sync-primary-button-v1` / `origin/feat/design-sync-primary-button-v1`.
- Origin: `https://github.com/augustoborgessousa93/DuduQ-Engine.git`; default branch is `main`.
- The local 22 September remote-only commit `3aa963c1af93175529d376dd95e2209cd23bb9a3` was metadata/recovery-only. It was preserved by tag `duduq-remote-continuity-2026-09-22` and connected using reconciliation merge `4cbaa052` with strategy `ours`.
- The pre-cleanup state is recoverable from `duduq-pre-repository-cleanup-2026-10-05` and the verified external backup (`3,722` files; `534,438,632` bytes; zero SHA-256 mismatches).
- Before final cleanup commit, feature branch was 758 ahead / 0 behind its upstream. No merge/push to `main` is authorized in this task; it remains untouched and diverged.

## Classification / disposition

| Class | Disposition | Representative items |
|---|---|---|
| `PRODUCT_REQUIRED` | Keep/tracked | Current mechanics, engines, renderers, assets, route code; no gameplay source changed by cleanup. |
| `SOURCE_REFERENCE` | Keep selectively | `artifacts/penpot-live/*.json`; approved Penpot/runtime snapshot sources under `design-system/runtime-snapshots/`. Old MCP snapshots removed after backup. |
| `QA_TEST_FIXTURE_REQUIRED` | Keep | Maintained tests and fixtures; generated artifacts are ignored with scoped paths, not committed wholesale. |
| `QA_CURRENT_GOLD_REFERENCE` | Keep selectively | Current flow screenshots and final Penpot reference if present; the required `artifacts/delivery/final-flow/penpot-transition-reference.png` was absent locally and is not claimed as available. |
| `TOOLING_REQUIRED` | Keep | `tools/penpot-mcp` pinned submodule at commit `9d08e26cb3d0ed003a5cf7df37adc778019bf75e`; `.gitmodules` records the upstream. |
| `GENERATED_REPRODUCIBLE` | Remove/ignore | Chromium profiles, captures produced by harnesses, local caches and package-store data. |
| `TEMPORARY` | Remove/ignore | Verified temp scripts and log/output files. |
| `LEGACY_REPLACED` | Remove | Obsolete `test-visual.html` demo hub and standalone `DUDUQ_DRAG_DROP.html`; current routes are under `play/drag-drop/` and `play/drag-drop-multimedia/`. |
| `UNKNOWN` | None remaining in reviewed set | No unresolved untracked root files remain in the curated change. |

## Cleanup totals and controls

- Historical/source/tool cleanup: 684 files / 110,307,344 bytes verified by per-file SHA-256 against the external backup.
- Additional generated profile cleanup: 2,638 files / 249,190,211 bytes verified by SHA-256.
- Additional historical/generated QA cleanup: 115 files / 96,328,426 bytes verified by SHA-256.
- Earlier profile/log/temp cleanup: 1,731 files / 155,348,184 bytes; four maintenance evidence files / 1,746,445 bytes; one zero-byte accidental file.
- No `git clean`, reset, rebase, force push, broad wildcard deletion, gameplay change, or Gold Master modification was performed.
- `.gitignore` remains path-specific; it does not exclude whole source/test/tooling trees. Generic `*.zip` ignore was removed.

## Validation and remaining limitation

- Engine/unit tests: Drag Drop, Matching (7/7), Target Shooter, Smart Sentence Complete/Order/combined; canonical HUD guard and multimedia mixed-engine fixture passed.
- Syntax checks: Bubble Pop, Smart Sentence, Memory Quest, Drag Drop, Drag Drop Multimedia, Intro owners passed.
- HTTP 200: Matching, Target Shooter, Drag Drop, Drag Drop Multimedia, Bubble Pop, Smart Sentence Complete/Order, Memory Quest, Intro Module.
- Focused Playwright mouse/drop smoke showed visible input response for Matching selection, Target Shooter correct hit, both Drag Drop placements, Bubble Pop local incorrect state, Smart Sentence Complete and Order selection, and Memory Quest reveal.
- Aggregate `npm run test:human-interaction` did not finish: its Matching navigation waited for `networkidle` and timed out. Therefore suite status is `PARTIAL`, not full interaction certification; retry/Continue/fullscreen lifecycle is not certified for every mechanic.
- TV Switch is verified as a shared transition in `core/duduq-page-transition.js` + `.css`; it has no dedicated product route.

## Final GitHub status

The exact cleanup commit, baseline tag, remote branch SHA, and current working-tree state are recorded in `DUDUQ-REPOSITORY-STATE-2026-10-05.md` after synchronization. `main` remains untouched.

# DUDUQ Autonomous Recovery Checkpoint

Captured: 2026-09-22

## Repository identity

- Branch: `feat/design-sync-primary-button-v1`
- HEAD: `df5cf094a568cea382f740eb5d631ae77a2ec9aa`
- Remote tracking: `origin/feat/design-sync-primary-button-v1`
- Recent continuity commits: `df5cf094`, `76c32a31`, `bd4834e0`, `6a2d02ed`, `9c16a1de`, `c55b8cdc`, `706f7132`, `d43a16df`
- Worktree: dirty; no reset, checkout, or discard performed.

## Worktree status at capture

Tracked modifications:

```text
M .duduq/AUTOPILOT_STATUS.json
M core/duduq-canonical-header-hud.css
M core/duduq-matching-visual-bridge.js
M core/duduq-screen-runtime.js
M core/duduq-target-shooter-visual-bridge.js
M design-system/penpot-sync/graph/current-live.json
M runtime/preview/index.html
M scripts/duduq-penpot-bootstrap.mjs
```

Untracked paths:

```text
?? DUDUQ_DESIGN_CONTRACT_V1.md
?? DUDUQ_DRAG_DROP.html
?? artifacts/
?? design-system/penpot-sync/generated-preview/
?? design-system/penpot-sync/generated/
?? design-system/penpot-sync/input/
?? design-system/penpot-sync/reports/
?? design-system/penpot-sync/schema/authorized-penpot-export.schema.json
?? design-system/penpot-sync/semantic-bindings.json
?? design-system/primary-button-component-contract.json
?? design-system/runtime-snapshots/
?? design-system/runtime/golden/matching-master.svg
?? design-system/runtime/golden/previews/
?? design-system/runtime/golden/target-shooter-master.svg
?? test/penpot-sync/duduq-penpot-transformer.test.mjs
?? test/penpot-sync/duduq-semantic-binding.test.mjs
```

## Tracked diff inventory

`git diff --stat` at capture:

```text
8 files changed, 51 insertions(+), 55 deletions(-)
```

The complete tracked diff is preserved by Git in the working tree at this
checkpoint and is reproducible with:

```text
git diff df5cf094a568cea382f740eb5d631ae77a2ec9aa -- .duduq/AUTOPILOT_STATUS.json core/duduq-canonical-header-hud.css core/duduq-matching-visual-bridge.js core/duduq-screen-runtime.js core/duduq-target-shooter-visual-bridge.js design-system/penpot-sync/graph/current-live.json runtime/preview/index.html scripts/duduq-penpot-bootstrap.mjs
```

Key diff facts: visual bridges now mount the package in the normal route and
hide the legacy iframe; the runtime forwards package clicks via the target's
native `.click()`; the matching audio proxy was removed; the bootstrap now
launches the discovered Penpot installation through Git Bash; and preview
verification counts package roots rather than visible iframes.

## Gold Master identities (repository/project-state evidence)

Matching:

- Version: `gold-master-candidate-v1`
- Path: `test/matching/gold-master-candidate-v1`
- Approved marker: `MATCHING_GOLD_MASTER.md` (status `GOLD MASTER — APPROVED`)
- Behavior entry points: `src/matching-engine.js`, `src/matching-board.js`, `src/matching-components.js`, `src/core-components.js`, `src/game-shell.js`
- Project-state commit: `761127dddaed830ea4f77a0fa292b505577f0a37`

Target Shooter:

- Version: `gold-master-clean-v2`
- Path: `test/target-shooter/gold-master-clean-v2`
- Approved marker: `TARGET_SHOOTER_GOLD_MASTER_LOCK.md` (status `HUMAN APPROVED`)
- Behavior entry point: `src/static-view.js` and the mechanic adapter used by the candidate
- Project-state commit: `761127dddaed830ea4f77a0fa292b505577f0a37`
- Durable decision: active Gold Master is Magic Cannon / Magic Launcher.

The repository also contains historical release mechanics under
`engine/releases/mechanics/`; these are not selected as the current Gold
Masters for this sync task.

## Relevant runtime paths

- Universal host: `core/duduq-screen-runtime.js`
- Matching bridge: `core/duduq-matching-visual-bridge.js`
- Target Shooter bridge: `core/duduq-target-shooter-visual-bridge.js`
- Matching Gold Master: `test/matching/gold-master-candidate-v1/`
- Target Shooter Gold Master: `test/target-shooter/gold-master-clean-v2/`
- Active packages: `design-system/runtime/screens/matching-master/` and `design-system/runtime/screens/target-shooter-master/`
- Live graph: `design-system/penpot-sync/graph/current-live.json`
- Bootstrap: `scripts/duduq-penpot-bootstrap.mjs`

## Safety conclusion

This checkpoint records the pre-existing dirty worktree. It is not a rollback
or promotion. Unrelated user changes and all existing experimental files must
be preserved until the coordinator explicitly determines their ownership.

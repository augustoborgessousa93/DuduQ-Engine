# DUDUQ — M01 Target Shooter / tablet 768×1024 — failure evidence

Date: 2026-10-29. Scope: **QA-only diagnosis**, no Gold Master modification.

## Reproduced in actual browser

- [Systemic Foundation Audit #40971518778](https://github.com/augustoborgessousa93/DuduQ-Engine/actions/runs/40971518778), job `year1-loader-compat`.
- `test/systemic/canary-r147-core-1.0.12-smoke.mjs`: viewport 768×1024, M01 first Target Shooter step.
- Outer document: `documentElement.scrollWidth = 768`, `innerWidth = 768`, overflow **0 px**.
- Embedded mechanic: `body.scrollWidth = 1076`, `documentElement.clientWidth = 768`, horizontal overflow **308 px**.
- Failing assertion remained enforced: `M01 TS/tablet-768x1024: overflow horizontal`.

### Offending elements measured in the iframe

| Element | CSS rendered bounding box | Outside the 768px viewport |
|---|---|---:|
| `.duduq-progress-trail` | x=395…1091, width=696 | +323px (right edge) |
| `.duduq-progress-copy` | x=1005…1083, width=78 | +315px |
| `.duduq-engine-fullscreen-button` | x=1000…1056, width=56 | +288px |
| `.duduq-progress-track` | x=403…983, width=580 | +215px |
| An `img` element | x=-29…195, width=224 | 29px beyond left edge |

The progress/HUD layout is a proven contributor. The out-of-bounds `img` requires separate visual identification before modification; it may be intentionally transformed and is not the principal right-side contributor.

## Source candidates for surgical review

- Canary manifest `engine/channels/canary-v1.json`, revision 147, Core 1.0.12 and Target Shooter 1.0.21.
- Immutable runtime `engine/releases/mechanics/target-shooter/1.0.21/DUDUQ_TARGET_SHOOTER.html` contains multiple responsive header/progress rules, including a breakpoint at `max-width:720px`, below the failing 768px viewport.
- Global progress injection `engine/releases/core/1.0.12/duduq-progress-ui.js` has progress grid rules at `max-width:1119px` and `max-width:720px`.
- These observations **do not yet prove a single responsible CSS declaration**: overlapping rules and actual computed header grid need inspection. Avoid speculative changes to the versioned Gold Master.

## Required correction and acceptance gates

1. Inspect computed `grid-template-columns`, width, min-width, `grid-column`, `position` and `box-sizing` on `.duduq-engine-header`, `.duduq-progress-trail`, `.duduq-progress-track`, and fullscreen control at 768px, before editing CSS.
2. Prepare a **new review-only release candidate**, not an edit to immutable 1.0.21 or Core 1.0.12. Keep rollback through channel manifest; do not promote or deploy automatically.
3. Correct responsive HUD layout and flex/grid shrink/wrapping behavior. Do **not** conceal failing content via a broad `overflow-x:hidden` or wholesale page scaling.
4. Re-run 768×1024 tablet, 390×844 mobile, and ≥1120px desktop checks for Target Shooter and Drag & Drop: no horizontal overflow (allowed QA tolerance ≤6px), instruction ≥85% visible, targets ≥44px, fullscreen reachable, retry/progress/completion function.
5. Keep Foundation Audit failing while the separately known `Year 3 was added before systemic foundation gate was retired` invariant remains unresolved; don't remove it merely to make CI green.
6. Only consider production after visual/pedagogical homologation and all other media gates are satisfied.

Status: **ROOT-AREA_IDENTIFIED; CODE_FIX_NOT_APPLIED; PROD_UNCHANGED**.

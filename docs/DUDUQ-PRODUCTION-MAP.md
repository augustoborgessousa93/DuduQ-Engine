# DUDUQ Production Map

Current source-of-truth inventory. Routes below are served from the workspace runtime at `http://127.0.0.1:4175`.

| Mechanic | Status | Engine / state owner | Renderer | Route | Baseline / test |
|---|---|---|---|---|---|
| Matching | OFFICIAL_FROZEN | `core/duduq-headless-product.js` (`MatchingEngine`) | `play/matching/` + universal screen runtime | `/play/matching/` | Gold Master; engine test + pointer smoke |
| Target Shooter | OFFICIAL_FROZEN | `core/duduq-headless-product.js` (`TargetShooterEngine`) | `play/target-shooter/` + universal screen runtime | `/play/target-shooter/` | Gold Master; engine test + pointer success smoke |
| Drag Drop | OFFICIAL_FROZEN | `core/duduq-drag-drop-engine.js` | `play/drag-drop/drag-drop.js` | `/play/drag-drop/` | `duduq-drag-drop-engine-v1`; engine test + pointer drop smoke |
| Drag Drop Multimedia | ACTIVE_CURRENT | `core/duduq-drag-drop-engine.js` | `play/drag-drop-multimedia/drag-drop-multimedia.js` + gameplay/round modules | `/play/drag-drop-multimedia/` | mixed fixture + pointer drop smoke |
| Bubble Pop | OFFICIAL_FROZEN | `core/duduq-bubble-pop-engine.js` | `play/bubble-pop/bubble-pop.js` | `/play/bubble-pop/` | `duduq-bubble-pop-v1`; local incorrect-pop pointer smoke; no dedicated unit suite found |
| Smart Sentence | ACTIVE_CURRENT | `core/duduq-smart-sentence-engine.js` | `play/smart-sentence/smart-sentence.js` | `/play/smart-sentence/` (`?mode=complete`, `?mode=order`) | Complete V1 tag `duduq-smart-sentence-complete-v1`; Complete/Order/combined regression suite |
| Memory Quest | ACTIVE_CURRENT | `play/memory-quest/memory-quest.js` | `play/memory-quest/memory-quest.js` + `.css` | `/play/memory-quest/` | current; click-to-reveal smoke; no dedicated automated functional test found |
| Intro Module | OFFICIAL_FROZEN | `core/duduq-intro.js` | `play/intro-module/intro-module.js` | `/play/intro-module/` | approved baseline; route/syntax smoke |
| TV Switch | SHARED_REQUIRED | `core/duduq-page-transition.js` | `core/duduq-page-transition.css` | No standalone game route | shared Gold Master transition consumed by Intro and play shells; not a separate activity |

## Shared Gold Master infrastructure

- Header/HUD: `core/ui/duduq-canonical-header-hud.js`, `core/duduq-live-hud.css`.
- Question HUD: `core/ui/duduq-canonical-question-hud.js` and its stylesheet.
- Fullscreen: `core/duduq-fullscreen-mode.css` and shared runtime helpers.
- Feedback/results: `core/ui/result-fx.js` and canonical feedback/button components.
- Penpot compiler/host/runtime remains governed by `DUDUQ_PROJECT_STATE.json`, `DUDUQ_ARCHITECTURE.md`, and `DUDUQ_SYNC.md`.

## QA notes

- All eight activity routes above returned HTTP 200 in the local test server.
- Engine tests, syntax checks, canonical HUD guard, and focused pointer/drop smoke passed for available flows.
- Aggregate Playwright human-interaction certification is **PARTIAL**: its `networkidle` navigation timed out on Matching. Do not treat this map as full end-to-end certification of retry/Continue/fullscreen on every activity.
- `/play/tv-switch/` is intentionally not a product route; TV Switch is a shared transition.

# DUDUQ Delivery Plan

AAA gate: `npm run duduq:certify-aaa-flow` now requires the independent official 1366×768 Penpot reference before it can return exit 0. The native matching-to-target evidence viewport is aligned to the official frame.

## Phase 1 — Transition

Shared `DuduQGameFlow` registry and transition route for the approved product routes. The official routes use the project-state-approved direct Gold Masters.

Completed 2026-09-23: native Matching → `/play/transition/` → Target Shooter lifecycle. The transition route allowlists its mechanic ID, completes ENTER/HOLD/EXIT before navigation, and the document boundary disposes Matching. Evidence: `artifacts/delivery/REAL-matching-transition-target.webm`, screenshots, and `artifacts/delivery/REAL-matching-transition-target-trace.zip`.

The remaining visual-certification gate is the external official Penpot frame PNG at `artifacts/delivery/final-flow/penpot-transition-reference.png` (1366×768). The certifier rejects a missing, malformed, wrong-sized, or runtime-identical reference and can wait with `npm run duduq:certify-approved-flow -- --wait-for-reference`.

## Phase 2 — Bubble Pop

Audit completed 2026-09-23: `test/bubble-pop/candidate-1.0.31/`, backed by `engine/releases/mechanics/bubble-pop/1.0.31/`, is the strongest playable candidate. It has real questions, wrong/correct feedback, multi-question progression, audio hooks, and responsive behavior.

Next delivery task: build a direct no-iframe `/play/bubble-pop/` host from this existing mechanic. Its legacy adapter is iframe-only and the channel remains unapproved, so it is not promoted until the direct host receives native QA.

## Phase 3 — Drag & Drop

Audit completed 2026-09-23: `engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js` is the best base. It supports validation, retry, completion, audio, and desktop/touch/keyboard input. Its only existing harness is iframe-based; exact evidence is in `docs/release/drag-drop-delivery-audit.md`.

Next delivery task: create a direct no-iframe `/play/drag-drop/` host from this existing mechanic, then run native QA.

## Phase 4 — Remaining mechanics

Integrate each approved direct product through the shared flow registry.

## Phase 5 — Content

Add production question sets and progression.

## Phase 6 — Final QA

Native interaction, responsiveness, regression, visual evidence, and delivery review.

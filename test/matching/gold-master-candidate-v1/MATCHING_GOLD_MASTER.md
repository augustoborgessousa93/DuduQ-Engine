# DUDUQ MATCHING — GOLD MASTER

**Status:** GOLD MASTER — APPROVED  
**Human target:** HUMAN TARGET HOMOLOGATED  
**Homologation date:** 2026-09-16  
**Snapshot reference:** `test/matching/gold-master-candidate-v1` (approved candidate state)

> DO NOT REDESIGN WITHOUT EXPLICIT HUMAN REQUEST.

## Scope

The approved flow is: select → connect → confirm → validate → feedback. Matching Engine, retry locking, correct/incorrect feedback, progress, touch/pointer interaction and semantic `activity-success` are preserved.

## Core structure

- `src/matching-engine.js` — pair validation, progress and retry state.
- `src/matching-board.js` — cards, anchors and connector presentation.
- `src/matching-components.js` — mechanic composition.
- `src/core-components.js` — HUD, question panel, controls, actions and feedback.
- `src/core/ui/` — shared UI roles, CTA attention and Result FX (`celebration.success.canvas.aaa`).
- `src/game-shell.js` — shell, background, fullscreen and responsive bounds.
- `styles/tokens.css` — DUDUQ design and motion tokens.
- `styles/shell.css`, `styles/matching.css` — shell/mechanic layout and responsive rules.

## Responsive/embed contract

The candidate uses container-aware Grid/Flex rules and shell bounds rather than fixed viewport coordinates. Approved targets include 1920×1080, 1366×768, 1280×720, 640×360 and 480×320, plus narrow/low-height embeds. Preserve card proportions, connector anchors, readable copy, accessible controls and safe CTA spacing.

## States and accessibility

Preserve idle, selected, connected, correct/locked, incorrect, retry, loading and complete states. Keep keyboard/pointer/touch targets, focus-visible behavior and `prefers-reduced-motion` fallbacks. Correct pairs remain locked across retry; incorrect pairs reset.

## Reuse rules

Reuse DUDUQ Core tokens/components for future mechanics. Matching-specific layout and state remain local; visual primitives, feedback, motion, mascot standards and success celebration remain Core-owned.

## Regression protection

Any future change must be checked against this snapshot for proportion, position, scale, color, typography, depth, motion, responsive behavior and interaction. Do not change production or other mechanics as part of Matching maintenance.

**Documentation owner:** DUDUQ Core / Matching Gold Master.

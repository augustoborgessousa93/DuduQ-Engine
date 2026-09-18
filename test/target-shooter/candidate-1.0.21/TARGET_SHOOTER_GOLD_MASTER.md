# DUDUQ TARGET SHOOTER — Candidate 1.0.21

## Purpose

Educational target selection: the learner reads/hears an instruction, aims at a visual target and receives immediate positive or retry feedback. The mechanic is content-driven and does not embed question-specific presentation logic.

## Gold Master DNA reused

- DUDUQ Core shell, HUD, mascot, typography, tokens, CTA and feedback language.
- Whispering Woods environment treatment and responsive safe areas.
- Semantic activity lifecycle and `activity-success` celebration routing.
- Touch/pointer-friendly hit areas and reduced-motion policy.

## Target Shooter-specific behavior

- Target field with image, word, numeric and category target payloads.
- Lively aim/shoot interaction with friendly projectile/impact feedback.
- Presentation ordering with anti-repeat protection.
- Single-answer validation, retry and lesson completion bridge.

## Content contract

Questions provide `metadata.targetShooter` with `items`, `correctIds`, `mode`, `shape`, `audioText` and optional difficulty. The mechanic adapts text/image/audio combinations without coupling content to layout.

## Runtime

- Adapter: `mechanics/target-shooter.js`
- Runtime: `engine/releases/mechanics/target-shooter/1.0.21/`
- Isolated review entry: `test/target-shooter/candidate-1.0.21/index.html`
- Preview URL: `http://localhost:4173/test/target-shooter/candidate-1.0.21/`

## Responsive/embed contract

The host mounts a full-size iframe with `width:100%`, `height:100%`, `min-height:0` and no fixed viewport dependency. Validate 1920×1080, 1366×768, 1280×720, 640×360, 480×320 and narrow/low-height embeds.

**HUMAN TARGET:** Matching Gold Master is the visual and UX reference.  
**DO NOT REDESIGN WITHOUT EXPLICIT HUMAN REQUEST.**

# DUDUQ Global Gold Master Baselines

**Human approval:** Augusto  
**Approval date:** 2026-09-29  
**Status:** frozen / read-only

## Frozen Gold Masters

| Baseline | Approved route or scope | Frozen contract |
| --- | --- | --- |
| Intro Module | `/play/intro-module/` | Official background; COVER stage and responsiveness; mascot; Ano/Série, Módulo and Disciplina cards; dotted outlines, depths, shadows, lower blur; Start button and attention motion; accessibility; fullscreen; dynamic `nextUrl` and `?next=/play/...`. |
| DUDUQ TV SWITCH | Global transition | Button press; vertical collapse; white center line; line collapse; hidden URL change; white line; vertical expansion; current timing, easing, glow, entry/exit, reduced-motion fallback and duplicate-click protection. |
| Matching | `/play/matching/` | Layout, HUD, cards, connectors, selection, validation, feedback, progress, retry, input, accessibility, audio, responsiveness and animations. Final completion flow is **manual continue only**. |
| Target Shooter | `/play/target-shooter/` | Approved arena, mission, HUD, targets, launcher, feedback, input, proportional scale, responsive composition, runtime and effects. |
| Shared components | Shared Gold Master consumers | Official header, mascot/header blink, Question HUD, Confirm button, Fullscreen, feedback states and shared visual components consumed by the listed baselines. |

## Matching completion contract

`ALL CORRECT → FEEDBACK FINAL → CONTINUAR → WAIT FOR USER → CLICK CONTINUAR → ADVANCE`

- Auto advance: **disabled**.
- The correct cards, connectors, feedback and progress remain visible while waiting.
- The Continue attention motion repeats approximately every two seconds.
- The first valid Continue click is the only progression trigger; duplicate clicks are blocked.

## Read-only protection

All Gold Master surfaces, behavior, timing, DOM structure, CSS, paths, assets,
responsive geometry and navigation contracts above are read-only without explicit
authorization from Augusto. This includes refactors, cleanup, class renames,
runtime changes and convenience optimizations.

New mechanics must consume the Intro, TV Switch and shared components without
modifying their baselines. Penpot remains the visual authority for new components,
but approved components must not be reopened, synchronized or improved without
explicit approval.

Before any future change to a shared file, identify affected Gold Masters and run
regression checks. If a requested change requires a Gold Master modification, stop
and obtain explicit authorization from Augusto.

## Snapshot record

- Git `HEAD` at freeze: `fa21cd5eb520217774ae5be518da0759626a42c5`
- Worktree at freeze: dirty, 169 tracked/untracked entries.
- A dedicated commit was intentionally **not** created: the worktree contains
  unrelated infrastructure, artifacts, generated outputs and user-owned changes
  that cannot be safely mixed into a baseline commit.
- The snapshot is therefore the recorded `HEAD` plus the homologated worktree
  state on 2026-09-29. Create a dedicated commit only after those unrelated changes
  are separately resolved or explicitly scoped by Augusto.

## Read-only regression checks at freeze

- Intro: PASS
- DUDUQ TV SWITCH: PASS
- Matching: PASS
- Target Shooter: PASS
- Matching manual continue: PASS
- Matching no auto advance: PASS
- Dynamic `nextUrl`: PASS

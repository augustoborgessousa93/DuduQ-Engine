# DUDUQ Intro + Transition Gold Master

**Human approval:** Augusto  
**Approval date:** 2026-09-29  
**Status:** frozen baseline / read-only

## Approved Intro Module

Route: `/play/intro-module/`

The entire current Intro Module is a Gold Master. Preserve its approved background,
COVER responsiveness, mascot, Ano/Série, Módulo and Disciplina cards, lower blur,
Start button, button-attention animation, geometry, paths, dotted outlines, depths,
shadows, typography and icons exactly as implemented.

The Intro remains universal. Its approved internal navigation contract is:

1. `?next=/play/...` takes precedence;
2. configured `nextUrl` is used next;
3. invalid/external targets fall back to an internal `/play/` route.

This baseline supports Matching, Target Shooter, Drag & Drop and future mechanics
without a mechanic-specific Intro variant.

## Approved Global Transition

Name: **DUDUQ TV SWITCH**

The approved interaction sequence is:

`click → button press → vertical collapse → white center line → line collapse → hidden URL change → white line → vertical expansion → game`

Preserve the current exit/entry timings, easing, white-line glow, reduced-motion
fallback and double-click blocking. The transition is global and reusable; it must
not introduce mechanic-specific copies for Matching, Target Shooter or future routes.

## Protection Rule

The following files are baseline-sensitive:

- `play/intro-module/index.html`
- `play/intro-module/intro-module.js`
- `play/intro-module/intro-module.css`
- `core/duduq-page-transition.js`
- `core/duduq-page-transition.css`
- transition includes in `play/matching/index.html` and `play/target-shooter/index.html`

Before a future change that could affect any of these files, identify the impact,
preserve this behavior, and run regression checks. Do not redesign, duplicate,
reinterpret, refactor visually, or change approved timings without explicit
authorization from Augusto.

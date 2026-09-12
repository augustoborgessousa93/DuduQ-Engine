# DuduQ Visual Experience 2.0 — Target pilot

Status: implementation candidate, awaiting browser battery and human visual review.

## Baseline and scope

- Repository: augustoborgessousa93/DuduQ-Engine.
- Base commit: `00c1ba10042eb91fbc98d86f1cb8f33f640263ef`.
- Branch: `feat/duduq-visual-experience-2-pilots`.
- Canary manifest revision 149, Core 1.0.12, Target Shooter 1.0.21, Matching 1.0.23.
- Assets repository inspected at `67e763c40532ec1fd3331508db8e6cdc0b290f48`.
- Canonical asset runtime remains pinned to the revision already used by Canary.
- No active channel, official content, immutable release or other mechanic is modified.
- Matching is not implemented: it is gated on Target technical PASS.

## Short audit

Target Shooter was opened in the published Year 1 Module 1 entry. The root homepage displayed a module-loading error, while the direct module entry worked. The following visual observations refer to that working activity, not the error screen.

| Element | Decision | Reason |
| --- | --- | --- |
| Official questions, answer rules, audio, progress and launcher | KEEP | Preserve learning and the existing Host contract. |
| Large, image-led choices | KEEP | Appropriate for early literacy; no new reading requirement. |
| Mascot integration | EVOLVE | Existing header presence is small; relate motion to actual interaction state. |
| Targets and buttons | EVOLVE | Create a shared press/elevation language and clearer material depth. |
| Instructions and feedback | EVOLVE | Stronger hierarchy, sentence case and non-punitive retry styling. |
| Busy world background around the stage | REPLACE in pilot | A quieter aqua/blue field puts the learning images first. |
| Continuous idle movement | REPLACE in pilot | Prioritize event-driven reactions and a stable touch target. |

Matching visual audit is pending; no invented findings or screenshots are asserted.

## Implementation

`engine/visual-experience-2/target-pilot.js` decorates the registered Target adapter. It passes mount arguments, payload, validation and onComplete through unchanged. It installs an opt-in stylesheet in the iframe and derives mascot states from rendered audio/feedback/target states. Disposal disconnects its observer and removes its listener and stylesheet.

The active adapter version stays 1.0.21. This is an opt-in visual overlay, not a new mechanic release. Integration is demonstrated in the isolated review page; production does not load the overlay.

Open `/test/visual-experience-2/` on the branch preview to compare the real current and candidate adapters. Both pages use the unchanged official Target questions from Year 1 Module 1, in source order. The review page omits other mechanics only to isolate this pilot.

## Provisional visual language

This is a candidate definition, **not the final two-pilot design-system specification**.

- Colors: ink `#12354b`, blue `#0765d5`, aqua `#00b9bd`, warm orange `#ffb342`, success `#15764e`, retry `#975006`.
- Typography: preserve the runtime font stack; responsive 19–28px headings and 17–24px instructions.
- Space: 4, 8, 12, 16, 24, 32px tokens. Radii: 14, 22, 32px.
- Materials: white surfaces, directional inner highlight, a short solid lower shadow and soft ambient shadow.
- Buttons: minimum 44px touch dimension, visible keyboard focus, short compressed pressed state, explicit disabled treatment.
- Targets: contained source images, stable touch positions, elevated hover, compressed pending state, bounded success/retry animation.
- Mascot: no raster deformation; idle is still; listening/thinking use contextual accents, success and retry use brief container reactions.
- Motion: 140ms press, 280ms state motion, 420ms entrance; transform/opacity. Event particles are reduced; no continuous particle layer.
- Audio: retain the native play behavior and repeat availability; existing playing state drives visual emphasis. No new sound source.
- Progress: existing progress values with blue–aqua treatment; no new score or economy.
- Responsive rules: fluid typography, smaller padding and mascot slots on narrow/short surfaces; retain the actual runtime geometry and World Fusion layout.
- Reduced motion: remove nonessential motion/particles while preserving state colors and existing feedback text.
- High DPI: source images use contain with no image transform; actual source/display ratios are recorded by the battery.

## Validation and anti-loop rule

The local Node contract test passes: adapter identity, validation, payload identity, callbacks and disposal are preserved. Syntax checks pass. This is not a browser or functional PASS.

Local Chromium startup was blocked by the execution environment (`socket() failed: Operation not permitted`); escalation was rejected by the session policy. The user authorized implementation directly in GitHub. The dedicated PR workflow runs the browser battery in GitHub Actions with read-only repository permissions.

Battery 1 covers the eight requested sizes, three DPR2 sizes, 13-width resize sweep, initial/interaction/retry/correct screenshots, image loading/proportions, focus, wrong-answer completion guard, success and Host advance. Evidence is uploaded as `duduq-vx2-target-evidence`.

Native audio audibility, subjective visual quality and real-device performance cannot be proved by static checks. Unobserved playback or blocked assets must remain explicitly unverified. Screenshot inspection is required before claiming visual PASS.

Only one minimal correction is permitted after a real redesign blocker, followed by Battery 2. No third battery, second correction or Matching implementation without Target PASS. The workflow must not be rerun for cosmetic preference changes.

Final aesthetic approval belongs to the user. Do not label this candidate “FINAL VISUAL APPROVED”.

## Target stabilization — 2026-09-12 (new mission)

Visual base: f686c832aa768b097b612f29db3d5e73cdd1c50e.
Branch: fix/vx2-target-stabilization-20260912. Maximum two CI batteries,
with at most one minimal correction after Battery 1. Matching remains unchanged.

Inspection confirmed Host 1.0.12 dispatches step-complete then swaps the runtime;
Target 1.0.21 guards its completion callback. Clicking an outgoing iframe's
feedback action is a HARNESS_BUG. The new harness observes exact completion and
start counts in the parent, then checks that the replacement runtime is ready.

Previous Battery 2 artifact 10301781763 was downloaded and its report and mobile
retry screenshot inspected. Legacy #root rules with !important retain minimum
arena heights despite less-specific pilot overrides, causing real clipping.
The consolidated opt-in layout overrides that cascade, distributes available
height between header, stage and feedback, and bounds targets by both arena axes.
Sky, meadow, target materials, mascot reactions and event effects are retained.
The ineffective ultra-compact block (26px audio / 12px instructions) was removed.

Boot interception is not assumed to be harmless: readiness now waits for the
boot to stop intercepting input. Persistent boot and resource errors remain
blocking evidence. No forced clicks or detached-frame exception suppression.

Battery 1: pending. Node adapter contract and JavaScript syntax: PASS.
No production release, Core, Canary, official content or main change.

### Battery 1 result and sole permitted correction

Run 34708787011, SHA fa032e18b9f2ecc5feff5a88946ad6e8de69a313:
NO-GO. All 11 functional paths passed, including exact Host completion/advance,
wrong-answer guards, ready, focus and raster density. Reduced motion passed.
New clipping detection exposed Target centers too close to arena edges.
The 1071x549 parent iframe was 150px tall in both baseline and candidate:
BASELINE_INHERITED. The Core fixed this only below 900px width.
Some late legacy selectors still won ties against the first layout stylesheet.

The single correction strengthens scoped layout specificity, bounds target
centers with room for focus/float, restores a definite pilot Host height with
cleanup, and corrects audio-shell dimensions. The audio harness now observes
state transitions from before the click instead of taking one immediate sample;
an unobserved playback state is blocking. No audio source is changed.

Battery 2 is the final run. No third battery or further code correction allowed.


========================================
DUDUQ VISUAL EXPERIENCE 2.0
TARGET STABILIZATION REPORT
========================================

REPOSITORY: augustoborgessousa93/DuduQ-Engine
BASE ORIGINAL: 00c1ba10042eb91fbc98d86f1cb8f33f640263ef
VISUAL BASE: f686c832aa768b097b612f29db3d5e73cdd1c50e
STABILIZATION BRANCH: fix/vx2-target-stabilization-20260912
FINAL SHA (tested product): 0a2a803c2cf3e9bdb0ec14b719b03326e50f5081
TARGET VERSION: 1.0.21
CORE: 1.0.12

----------------------------------------
FAILURE CLASSIFICATION
----------------------------------------
Counts below are outstanding gate failures, counted by resize width.
HARNESS_BUG: 0 confirmed outstanding
PRODUCT_RESPONSIVE_BLOCKER: 3 observed resize cases (390, 600, 700px)
BASELINE_INHERITED: 0 outstanding in candidate
ENVIRONMENT_LIMITATION: 0 reported by final battery

Historical classifications:
- HARNESS_BUG: outgoing-frame click after Host completion; immediate audio-state
  sampling; missing boot-ready precondition. Corrected without suppressing errors.
- PRODUCT_RESPONSIVE_BLOCKER: legacy min-height cascade and centered target edge
  clipping. Fixed viewport tests now pass; resize gate still fails.
- BASELINE_INHERITED: 1071x549 yielded a 150px iframe. Fixed only in opt-in adapter.
- ENVIRONMENT_LIMITATION: direct git push lacked CLI credentials; GitHub connector
  committed the exact local file trees successfully. No final CI limitation.

Resize evidence: 390px reports B and A clipped; 600px reports C; 700px reports A.
That is four control observations across three widths. These are candidate-only
reports relative to baseline. The sweep records geometry but no per-width capture
or ancestor bounds. A transient resize-timing contribution is not excluded;
persistence and precise clipping ancestor are unproven. No extra run was used to
reclassify these as harness errors or waive the failing gate.

----------------------------------------
FUNCTIONAL
----------------------------------------
MOUNT: PASS
READY: PASS
AUDIO: PASS (playback state observed; acoustic quality not measured)
WRONG: PASS
RETRY: PASS
CORRECT: PASS
HOST COMPLETION: PASS (exactly 1)
HOST ADVANCE: PASS (exactly 1)
DUPLICATE COMPLETION: 0

All 11 scenarios passed these checks, with no page errors. Parent event logs are
in the JSON artifact. No success-screen delay was added for screenshots.

----------------------------------------
VISUAL EXPERIENCE
----------------------------------------
DIRECTION OF ART: PENDING HUMAN REVIEW
GAME FEEL: PENDING HUMAN REVIEW
MASCOT: preserved; PENDING HUMAN REVIEW
TARGETS: PASS fixed viewport geometry; FAIL resize gate
MOTION: preserved; subjective quality PENDING HUMAN REVIEW
PARTICLES: preserved, event-driven
FEEDBACK: PASS fixed viewport interaction and geometry
AUDIO UX: PASS playback-state observation; subjective quality PENDING HUMAN REVIEW
DEPTH: preserved; PENDING HUMAN REVIEW
TRANSITIONS: PASS Host advancement; visual quality PENDING HUMAN REVIEW

No aesthetic PASS is invented from screenshots or source code. Before/after
initial and retry captures exist for the six mandatory evidence sizes. Final
mobile retry, short desktop initial and desktop DPR2 captures were visually
inspected: instructions, controls, targets, scenery and feedback are present.
Screenshots do not prove animation smoothness or real-device performance.

----------------------------------------
VIEWPORTS
----------------------------------------
1366x900: PASS
1200x800: PASS
1071x549: PASS
865x549: PASS
768x700: PASS
768x1024: PASS
390x700: PASS
390x844: PASS

These are independent fixed-viewport scenarios, not the dynamic resize sweep.

----------------------------------------
DPR2
----------------------------------------
1366x900: PASS
768x1024: PASS
390x844: PASS

----------------------------------------
RESPONSIVE QUALITY
----------------------------------------
RESIZE SWEEP: FAIL (3 of 13 widths)
HORIZONTAL OVERFLOW: 0
NEW CANDIDATE CLIPPING: 4 control observations in resize; 0 fixed scenarios
IMAGE DISTORTION: 0 observed in inspected screenshots / contain checks
ASPECT VIOLATIONS: 0 observed; not independently quantified in the sweep
LOW RES BLOCKERS: 0
GLOBAL SCALE: NO
GLOBAL ZOOM: NO

----------------------------------------
ACCESSIBILITY / MOTION
----------------------------------------
FOCUS: PASS
REDUCED MOTION: PASS

----------------------------------------
CREATIVE QUALITY
----------------------------------------
CSS/SVG PROCEDURAL EFFECTS: YES
NEW RASTER ASSETS: 0
MASCOT REACTIONS: YES (retained state-driven implementation)
TARGET IMPACT: YES
EVENT PARTICLES: YES
ANIMATED AUDIO STATE: YES
GAME STAGE DEPTH: YES

----------------------------------------
SCOPE
----------------------------------------
TARGET MODIFIED: YES (opt-in visual adapter only)
MATCHING MODIFIED: NO
BUBBLE POP: NO
DRAG DROP: NO
WORD SLASH: NO
SMART SENTENCE: NO
CORE: UNCHANGED
CANARY: UNCHANGED
MAIN: UNCHANGED
PRODUCTION: UNCHANGED

----------------------------------------
ANTI-LOOP
----------------------------------------
BATTERIES: 2
CORRECTIONS: 1
BATTERY 3: NO

----------------------------------------
PREVIEW
----------------------------------------
CLOUDFLARE PREVIEW (diagnostic, not approved):
https://ba24fe07.duduq-engine.pages.dev/test/visual-experience-2/target.html

Branch preview:
https://fix-vx2-target-stabilization.duduq-engine.pages.dev/test/visual-experience-2/

PR: https://github.com/augustoborgessousa93/DuduQ-Engine/pull/100
Battery 1: https://github.com/augustoborgessousa93/DuduQ-Engine/actions/runs/34708787011
Battery 2: https://github.com/augustoborgessousa93/DuduQ-Engine/actions/runs/34709059557
Final screenshots + JSON artifact: 10302573855 (duduq-vx2-target-evidence).

----------------------------------------
FINAL STATUS
----------------------------------------
NO-GO — TARGET STABILIZATION

STOP. No further correction, test battery, Matching implementation or merge.
========================================

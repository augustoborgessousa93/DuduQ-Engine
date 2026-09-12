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

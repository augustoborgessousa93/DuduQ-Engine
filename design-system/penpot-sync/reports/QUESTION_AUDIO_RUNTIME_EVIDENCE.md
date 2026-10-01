# Question Audio — Runtime Evidence Audit

Audit mode: read-only. No Core, mechanic, CSS, token, Penpot, baseline, manifest, or asset was changed.

## Method

Chrome installed locally rendered the supplied localhost URLs through a temporary read-only static server at `127.0.0.1:4176`, with a 1920 × 1080 browser window. The audit queried the rendered DOM and `getComputedStyle`, inspected button descendants and pseudo-elements, recorded matching CSS rules, and captured PNG evidence. Runtime state was idle; no pointer/pressed state was induced.

## Rendered runtime evidence

| MECHANIC | SELECTOR | VISIBLE COLOR | BACKGROUND | RADIUS | SHADOW | RENDERED SIZE | LAYERS | SOURCE | OVERRIDE STATUS | SCREENSHOT | CONFIDENCE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Matching | `.duduq-canonical-question-hud .audio-button` | Orange / gold | `linear-gradient(#ffc95f 0%, #f4a83a 56%, #d88023 100%)` | 18px | `0 5px 0 #aa641f`, `0 8px 12px rgba(103,64,25,.18)`, inset highlight | 56 × 56; x=1241, y=144.453125 | button + 26 × 26 SVG + two `path`s; no visual pseudo-elements | `core/duduq-canonical-question-hud.css` | CANONICAL_CORE_ONLY; no inline style; canonical rule wins with `!important` | `artifacts/question-audio-baseline-audit/matching-full.png`; `matching-audio.png` | HIGH |
| Target Shooter | `.duduq-canonical-question-hud .audio-button` | Orange / gold | `linear-gradient(#ffc95f 0%, #f4a83a 56%, #d88023 100%)` | 18px | Same three-part composite shadow | 56 × 56; x=1241, y=144.453125 | Same button + SVG + paths; no visual pseudo-elements | `core/duduq-canonical-question-hud.css` | CANONICAL_CORE_ONLY; no inline style; no matching local audio rule. Escaped `.legacy-audio-button` declarations do not match this element | `artifacts/question-audio-baseline-audit/target-shooter-full.png`; `target-shooter-audio.png` | HIGH |
| Drag & Drop | Not rendered | Not observable | Not observable | Not observable | Not observable | Not observable | No Question HUD or audio control in DOM | `canonical-hud-adapter.js` is the expected creator, but its mount preconditions were not met at capture | UNKNOWN — RUNTIME_CAPTURE_BLOCKED | `artifacts/question-audio-baseline-audit/drag-drop-full.png` | HIGH for absence during capture; no visual conclusion |

The complete computed-style, geometry, descendant, pseudo-element, inline-style, and matching-rule records are the machine-readable evidence in `artifacts/question-audio-baseline-audit/*-computed.json`.

## CSS cascade and construction

For both rendered mechanics, the live element has `data-component="DUDUQ_CANONICAL_AUDIO_BUTTON"`, no `style` attribute, opacity `1`, static position, no transform, and no z-index. Its only visual construction is the button envelope plus the white SVG speaker and wave paths. `::before` and `::after` have no background, border, or shadow.

The winning declaration is the identical `core/duduq-canonical-question-hud.css` selector in both pages. Its visual properties are marked `!important`, including dimensions, padding, border, radius, background and shadow. No later matching local declaration was found in the live stylesheet cascade.

Creation paths:

- Matching: `test/matching/gold-master-candidate-v1/src/core-components.js` invokes `DuduQCanonicalQuestionHUD`; its local re-export resolves to the Core constructor.
- Target Shooter: `test/target-shooter/gold-master-clean-v2/src/static-view.js` invokes the Core `DuduQCanonicalQuestionHUD` directly.
- Drag & Drop: `test/drag-drop/gold-master-candidate-v1/canonical-hud-adapter.js` imports the Core constructor and waits for `.duduq-dd-instruction` or `.duduq-udd-instruction`. In this capture neither selector appeared, so it could not mount the HUD.

## Baseline gate conclusion

RUNTIME_GOLDEN_BASELINE: `ORANGE_CORE_CANONICAL`.

CORE_TO_MECHANICS_PROPAGATION: `PASS`. Matching and Target Shooter independently rendered the same canonical Core Question Audio output.

DRAG_DROP: `DEFERRED_NOT_BLOCKING`. It is explicitly outside this baseline gate.

VISUAL_DEFINITION_DIVERGENCE: `CONFIRMED`. The observed Core golden mechanics render an orange/gold single-button CSS composition. The Penpot Official Question Main defines a blue multilayer composition. This is not an implementation-only difference.

BASELINE_AUTHORITY: `UNRESOLVED`.

## Supporting comparison

PENPOT MAIN: Local authorized export confirms the official Audio Action is a 56 × 56 multilayer blue composition: separate 56 × 51 depth/surface layers, 44 × 5 shadow layer and 28 × 5 highlight. It is not a single CSS button.

PENPOT SCREEN INSTANCES: `PENPOT_INSTANCE_STATUS = HUMAN_UI_INSPECTION_REQUIRED`. Local composition/property maps identify the screen node IDs, but the available export/API does not provide attachment/detach state or instance-level fill overrides for Matching or Target Shooter. No such status is inferred.

COLOR: FACTUAL RESULT — Matching and Target Shooter render orange/gold Core gradient output. Drag & Drop color is not observable. The official Penpot Main export is blue multilayer.

RADIUS: The measurements are an implementation-layer difference; they do not negate the confirmed overall visual-definition divergence. Penpot's 16px radius belongs to internal surface/depth layers while Core's 18px radius is the outer 56 × 56 button envelope.

SHADOW: Penpot encodes a separate shadow layer and Core renders a composite CSS shadow. This supports the confirmed divergent visual definitions; it does not establish which baseline has authority.

DIMENSIONS: 56 × 56 Core envelope versus 56 × 51 Penpot material layers is an implementation-layer distinction. It does not resolve the baseline-authority question.

## Decision gate

**READY_FOR_SINGLE_BASELINE_AUTHORITY_DECISION.** The required human decision is whether the approved Penpot screens are authoritative instances of the blue Official Main, or instead carry an override, are detached, or use a local composition. Do not modify either baseline until that Penpot UI inspection establishes authority.

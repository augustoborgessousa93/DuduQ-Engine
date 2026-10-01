# Question Audio Baseline Reconciliation

## Evidence and limits

The local test server exposed all three actual candidate URLs on port 4175:

- `http://127.0.0.1:4175/test/matching/gold-master-candidate-v1/index.html`
- `http://127.0.0.1:4175/test/target-shooter/gold-master-clean-v2/index.html`
- `http://127.0.0.1:4175/test/drag-drop/gold-master-candidate-v1/index.html`

Browser UI was unavailable and the sandbox blocked headless Chrome before it could render. Consequently, no claimed live computed-style value or screenshot is included. The findings below are source and real-export evidence, not a substitute for browser visual approval.

## Penpot official Question Main

`Question Panel / Audio Action` (`88954f25-7a86-800b-8008-a87e700a22eb`) is a 56 × 56 board with no own fill. Its visible composition is multilayered:

| Layer | Node | Material |
| --- | --- | --- |
| Shadow | `…476e` Button Shadow | #253b53, opacity .35, 44 × 5 |
| Depth | `…476f` Button Depth | #175c93, 56 × 51, radius 16 |
| Surface | `…4770` Button Surface | #349fdf, 56 × 51, radius 16 |
| Highlight | `…4771` Button Highlight | #bfe8ff, opacity .4167, 28 × 5, radius 4 |
| Icon | `…4775`/`…4776` | white paths, 12 × 18 / 7.5 × 18 |

There is no audio-surface gradient in this export. `#349fdf` is the primary exposed surface layer, but it is not the full visual composition.

## Core canonical architecture

`core/ui/duduq-canonical-question-hud.js` creates the Question HUD and replaces any prior `.audio-button` with `DuduQCanonicalAudioButton`. The latter always emits `.audio-button[data-component="DUDUQ_CANONICAL_AUDIO_BUTTON"]`.

The winning intended canonical declaration is in `core/duduq-canonical-question-hud.css`, loaded by Matching, Target Shooter clean-v2, and Drag & Drop:

```css
.duduq-canonical-question-hud .audio-button {
  width: calc(56px * var(--duduq-gold-scale));
  height: calc(56px * var(--duduq-gold-scale));
  border: 1px solid rgba(255,221,125,.92);
  border-radius: calc(18px * var(--duduq-gold-scale));
  background: linear-gradient(180deg,#ffc95f 0%,#f4a83a 56%,#d88023 100%) !important;
  box-shadow: 0 5px 0 #aa641f, 0 8px 12px rgba(103,64,25,.18), inset 0 1px 0 rgba(255,255,255,.58) !important;
}
```

This is a canonical global rule, not a fallback, legacy selector, or variant. The only state variation is pressed/playing transform and shadow.

## Consumer audit

| Mechanic | Canonical source | Known local audio override | Runtime computed evidence | Match to declared Core |
| --- | --- | --- | --- | --- |
| Matching | canonical Question HUD import and constructor | No; systemic guard prohibits it | BLOCKED by browser sandbox | Expected canonical orange |
| Target Shooter clean-v2 | canonical Question HUD import and constructor | No canonical `.audio-button` override; legacy selector is escaped/non-matching | BLOCKED by browser sandbox | Expected canonical orange |
| Drag & Drop | canonical CSS + canonical HUD adapter | No; systemic guard prohibits it | BLOCKED by browser sandbox | Expected canonical orange |

`design-system/duduq-screen-property-map.json` maps all three Question HUD instances to `core/ui/duduq-canonical-question-hud.js` and permits only x/y/width/height/spacing/alignment. It records no material override. The exported authorized JSON contains only the official Mains, not the three screen instances; detached status and Penpot per-instance fill overrides require a human Penpot inspection.

## Other properties

| Property | Penpot | Core | Result |
| --- | --- | --- | --- |
| Dimensions | 56 × 56 action board / 56 × 51 material layers | 56 × scale | Review: structural composition differs |
| Radius | 16 surface/depth | 18 × scale | Mismatch |
| Border | no surface stroke | 1px warm border | Mismatch |
| Shadow | separate shadow rectangle | composite box-shadow | Mismatch |
| Icon geometry | 28 × 28 group, white paths | 26 × scale SVG | Partial / review |

## Header quick audit

Header export has a pale three-stop linear root gradient, inner 2px #c9ded2 stroke, radius 28 and drop shadow. Core is a separate layered runtime implementation. No full property mapping was performed in this task, therefore **HEADER BASELINE: REVIEW_REQUIRED**; no critical runtime evidence was captured.

## Classification and gate

**DIVERGENCE CLASS: E — MULTILAYER COMPOSITION**, with unresolved source-of-truth direction between the official Penpot Main and canonical Core. Static evidence rules out a known local mechanic override but cannot prove approved browser pixels or Penpot instance attachment.

**QUESTION AUDIO FILL BASELINE: HUMAN_REVIEW_REQUIRED.**

## Required human decision

In Penpot, inspect the Official Question Main and each screen instance for Matching (`b96e92df-258a-802e-8008-a91dbcfc7e62`), Target Shooter (`b96e92df-258a-802e-8008-a91dbf2053c3`), and Drag & Drop (`b96e92df-258a-802e-8008-a91dc208b0e8`): verify component attachment, no detach, and no local fill override. Then open the three URLs above in a human browser and record computed styles for `.duduq-canonical-question-hud .audio-button`.

Do not update either source until those two visual truths are confirmed. If all three runtime buttons are orange and approved, classify as `PENPOT_MAIN_REQUIRES_BASELINE_UPDATE`; the Penpot update would need the Core material values shown above. If approved runtime is blue, classify as `CORE_REQUIRES_BASELINE_UPDATE`.
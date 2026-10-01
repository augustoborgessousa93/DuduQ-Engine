# Current Core Equivalence Audit

## Canonical Question Audio Button

| Penpot node property | Penpot export value | Current Core property | Match status |
| --- | --- | --- | --- |
| Node | `88954f25-7a86-800b-8008-a87e700a22eb` / Question Panel / Audio Action | `.duduq-canonical-question-hud .audio-button` | YES (semantic target) |
| Size | 56 × 56 | Core geometry is scaled by `--duduq-gold-scale` | NOT EVALUATED (no generated token) |
| Surface fill | `#349fdf` at `Button Surface` (`…4770`) | `linear-gradient(180deg,#ffc95f 0%,#f4a83a 56%,#d88023 100%)` | NO |
| Radius | 16 on `Button Surface` | `calc(18px * var(--duduq-gold-scale))` | NO |
| Depth | `#175c93`, radius 16 | `0 5px 0 #aa641f` | NO |
| Shadow | Penpot node has no `shadows`; separate Button Shadow rectangle | composite Core `box-shadow` | MAPPING_REVIEW_REQUIRED |
| Stroke | none on Button Surface | `1px solid rgba(255,221,125,.92)` | NO |
| Icon | white paths under `Icon / Audio` | `color: #fff` SVG | PARTIAL |

## Safety conclusion

The authorized export is valid and deterministic, but the exposed Penpot audio-button material is not semantically equivalent to the approved Core audio-button material. No Core token may be emitted or imported until a human resolves the source-of-truth divergence. The transformer therefore emits an empty preview and `MAPPING_REVIEW_REQUIRED`.
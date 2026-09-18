# DUDUQ Target Shooter — Penpot Internal Style Lock

Status: **BLOCKED BY PENPOT DATA AVAILABILITY**

Source requested: Penpot MCP, board `ba7410f9-72c0-80ac-8008-a3e5d6987767`, 1366 × 768.

The Penpot MCP service is not available in this session. The connected Penpot browser canvas confirms the approved board exists, but does not expose the recursive layer serialization required to extract fills, gradients, strokes, shadows, vector paths, component-main descendants, or targeted asset exports. No appearance values below are inferred.

## Extraction gate

| Semantic role | Layer / reference | Available geometry | Required visual data | Status |
|---|---|---|---|---|
| Cat incorrect X | `a6aad67f-36be-80e2-8008-a510543564be` | board `622/222/65/56`, center `654.5/250` | fill, stroke, shadow, vector path, opacity, rotation, z-order | BLOCKED |
| Rabbit correct check | Canonical Rabbit `a6aad67f-36be-80e2-8008-a51a6f805987` | no child check-layer serialization available | child layer ID, geometry, component reference, style, vector/export | BLOCKED |
| Pedestal | Slingshot source `ba7410f9-72c0-80ac-8008-a3e69e8a63bd` | board `544/714/252/32` | structure, fills, gradient, stroke, shadow, path/export | BLOCKED |
| Left arm | same source | board `567.606270/598.040848/40/132`, rotation `335` | structure, fills, gradient, stroke, shadow, path/export | BLOCKED |
| Right arm | same source | board `679.606270/601.421794/40/132`, rotation `25` | structure, fills, gradient, stroke, shadow, path/export | BLOCKED |
| Elastic left | same source | board `613.751804/611.119195/16/112`, rotation `352` | path, stroke, color, opacity, shadow, z-order | BLOCKED |
| Elastic right | same source | board `696.777592/611.675888/16/112`, rotation `8` | path, stroke, color, opacity, shadow, z-order | BLOCKED |
| Pocket | same source | board `635/693/70/38` | shape/path, fills, stroke, shadow, z-order | BLOCKED |
| Orb aura | same source | board `631/626/80/80`, center `671/666` | fill, gradient, blur, blend, shadow, z-order | BLOCKED |
| Orb | same source | board `642/637/58/58`, center `671/666` | constituent layers, fills, rim, glow, shadow, z-order | BLOCKED |
| Orb highlight | same source | board `654/636/19/16` | shape/path, fill, opacity, blur, z-order | BLOCKED |
| Orb star | same source | board `657/637/28/32` | vector/component reference, path, fill, stroke, shadow, z-order | BLOCKED |

## Aim trajectory

All nine dot centers and `9×9` dimensions are locked in `PENPOT_GEOMETRY_LOCK.md`. The MCP-derived geometry records effective opacity `1` for dots 1–9, but no fills, strokes, blur, shadows, blend modes, or individual z-order/style serialization is available in this session. Consequently, each dot’s visual style is BLOCKED rather than assumed identical.

| Dot | Penpot layer ID | Center | Dimensions | Style status |
|---:|---|---:|---:|---|
| 1 | `ba7410f9-72c0-80ac-8008-a3e6759698ca` | `671/666` | `9/9` | BLOCKED |
| 2 | `ba7410f9-72c0-80ac-8008-a3e675d9ec24` | `633.125/606.644497` | `9/9` | BLOCKED |
| 3 | `ba7410f9-72c0-80ac-8008-a3e6761bb5e7` | `590.75/559.536797` | `9/9` | BLOCKED |
| 4 | `ba7410f9-72c0-80ac-8008-a3e6765b7b44` | `548.375/515.658614` | `9/9` | BLOCKED |
| 5 | `ba7410f9-72c0-80ac-8008-a3e6769d768b` | `506/476` | `9/9` | BLOCKED |
| 6 | `ba7410f9-72c0-80ac-8008-a3e676dddfa9` | `463.625/440.908614` | `9/9` | BLOCKED |
| 7 | `ba7410f9-72c0-80ac-8008-a3e677219fab` | `421.25/410.036797` | `9/9` | BLOCKED |
| 8 | `ba7410f9-72c0-80ac-8008-a3e6776225a1` | `378.875/382.394497` | `9/9` | BLOCKED |
| 9 | `ba7410f9-72c0-80ac-8008-a3e677a53340` | `336.5/356.5` | `9/9` | BLOCKED |

## Implementation gate

No Target visual implementation is authorized until Penpot MCP (or an equivalent read-only Penpot API/export surface) provides the missing recursive style and vector/export data for every required row above.

# DUDUQ Target Shooter — Penpot Geometry Lock

Absolute source: Penpot MCP. Board `ba7410f9-72c0-80ac-8008-a3e5d6987767` (`DUDUQ TARGET SHOOTER — GOLD MASTER SCREEN 1.1 — APROVADO`), `1366 × 768`. All coordinates below are relative to this board. Opacity `null` from Penpot is recorded as effective `1`.

## Board-level geometry

| Element | Layer ID | Parent | X | Y | W | H | Center | Rotation | Opacity | Board z-order |
|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|
| Header | `ba7410f9-72c0-80ac-8008-a3e5d698776b` | Board | 149 | 12 | 1056 | 94 | 677,59 | 0 | .98 | 3 |
| Question wide | `ba7410f9-72c0-80ac-8008-a3e5d698776c` | Board | 270 | 126 | 826 | 86 | 683,169 | 0 | 1 | 4 |
| Dog / selected | `ba7410f9-72c0-80ac-8008-a3e5d69888f1` | Board | 264 | 269 | 224 | 211 | 376,374.5 | 0 | 1 | 19 |
| Cat / incorrect | `ba7410f9-72c0-80ac-8008-a3e5d69888f2` | Board | 483 | 230 | 225 | 213 | 595.5,336.5 | 0 | 1 | 20 |
| Rabbit / correct composition | `ba7410f9-72c0-80ac-8008-a3e5d69888f4` | Board | 515 | 440 | 224 | 188 | 627,534 | 0 | 1 | 21 |
| Rabbit canonical real instance | `a6aad67f-36be-80e2-8008-a51a6f805987` | Board | 705 | 305 | 184 | 236 | 797,423 | 0 | 1 | 90 |
| Fish / idle | `ba7410f9-72c0-80ac-8008-a3e5d69888f3` | Board | 861 | 237 | 246 | 228 | 984,351 | 0 | 1 | 23 |
| Magic Slingshot instance | `ba7410f9-72c0-80ac-8008-a3e5d69888f5` | Board | 568 | 572 | 230 | 150 | 683,647 | 0 | 1 | 22 |

`QuestionPanel(question, "wide")` remains the only question local-geometry source. The static code uses the canonical Rabbit instance (`184 × 236`), confirmed above.

## Target internals

| State / layer | Layer ID | X | Y | W | H | Center | Rotation | Opacity |
|---|---|---:|---:|---:|---:|---|---:|---:|
| Dog official shell | `a6aad67f-36be-80e2-8008-a4f25a4bb72e` | 286 | 263 | 180 | 224.92 | 376,375.46 | 0 | 1 |
| Dog illustration | `7abecf1e-b7be-8023-8008-a3f8c6a96d7d` | 324 | 302 | 104 | 104 | 376,354 | 0 | 1 |
| Dog selection ring | `a6aad67f-36be-80e2-8008-a51052c7a80d` | 284 | 260 | 184 | 184 | 376,352 | 0 | 1 |
| Dog aim ring | `ba7410f9-72c0-80ac-8008-a3e5d6994125` | 292 | 268 | 168 | 168 | 376,352 | 0 | 1 |
| Cat official shell | `a6aad67f-36be-80e2-8008-a4f2fc641367` | 505.5 | 223.5 | 180 | 224.92 | 595.5,335.96 | 0 | 1 |
| Cat illustration | `7abecf1e-b7be-8023-8008-a3f8c7078d8a` | 546 | 262 | 100 | 100 | 596,312 | 0 | 1 |
| Cat incorrect ring | `ba7410f9-72c0-80ac-8008-a3e5d699412a` | 511.5 | 228.5 | 168 | 168 | 595.5,312.5 | 0 | 1 |
| Cat incorrect X | `a6aad67f-36be-80e2-8008-a510543564be` | 622 | 222 | 65 | 56 | 654.5,250 | 0 | 1 |
| Rabbit shell | `a6aad67f-36be-80e2-8008-a4f2fe3bfbbe` | 707 | 308 | 180 | 225 | 797,420.5 | 0 | 1 |
| Rabbit illustration | `7abecf1e-b7be-8023-8008-a3f8c7ad7d2a` | 740 | 335.5 | 108 | 114 | 794,392.5 | 0 | 1 |
| Rabbit correct ring | `a6aad67f-36be-80e2-8008-a4f2ff214297` | 713 | 313 | 168 | 168 | 797,397 | 0 | 1 |
| Fish shell | `a6aad67f-36be-80e2-8008-a4f2fd4e3a20` | 894 | 232 | 180 | 224.92 | 984,344.46 | 0 | 1 |
| Fish illustration | `7abecf1e-b7be-8023-8008-a3f8c75a9081` | 935 | 271 | 98 | 98 | 984,320 | 0 | 1 |

Ring-center deltas to their official shells: Dog `(0,-23.46)`, Cat `(0,-23.46)`, Rabbit `(0,-23.5)`. These are intentional Penpot offsets; no corrective translation is introduced.

## Magic Slingshot

Official library source: `ba7410f9-72c0-80ac-8008-a3e69e8a63bd`. The approved-board instance is listed above. The following raw geometry is relative to the board (subtract instance origin `568,572` for local coordinates).

| Layer | Layer ID | X | Y | W | H | Center | Rotation | Opacity | Board z-order |
|---|---|---:|---:|---:|---:|---|---:|---:|---:|
| Pedestal | `ba7410f9-72c0-80ac-8008-a3e66f360702` | 544 | 714 | 252 | 32 | 670,730 | 0 | 1 | 45 |
| Left arm | `ba7410f9-72c0-80ac-8008-a3e67092ab63` | 567.606270 | 598.040848 | 40 | 132 | 587.606270,664.040848 | 335 | 1 | 48 |
| Right arm | `ba7410f9-72c0-80ac-8008-a3e671308021` | 679.606270 | 601.421794 | 40 | 132 | 699.606270,667.421794 | 25 | 1 | 49 |
| Elastic left | `ba7410f9-72c0-80ac-8008-a3e6726cd5c4` | 613.751804 | 611.119195 | 16 | 112 | 621.751804,667.119195 | 352 | 1 | 52 |
| Elastic right | `ba7410f9-72c0-80ac-8008-a3e672bd0b1b` | 696.777592 | 611.675888 | 16 | 112 | 704.777592,667.675888 | 8 | 1 | 53 |
| Pocket | `ba7410f9-72c0-80ac-8008-a3e6734eed54` | 635 | 693 | 70 | 38 | 670,712 | 0 | 1 | 55 |
| Orb aura | `ba7410f9-72c0-80ac-8008-a3e673d21f0a` | 631 | 626 | 80 | 80 | 671,666 | 0 | 1 | 57 |
| Orb | `ba7410f9-72c0-80ac-8008-a3e67411871e` | 642 | 637 | 58 | 58 | 671,666 | 0 | 1 | 58 |
| Orb highlight | `ba7410f9-72c0-80ac-8008-a3e67450df83` | 654 | 636 | 19 | 16 | 663.5,644 | 0 | 1 | 59 |
| Orb star | `ba7410f9-72c0-80ac-8008-a3e6748b1538` | 657 | 637 | 28 | 32 | 671,653 | 0 | 1 | 60 |

Orb/aura concentricity delta: `(0,0)`.

## Aim trajectory — 9 direct Penpot samples

| Dot | Layer ID | Center X | Center Y | W | H | Rotation | Opacity | Board z-order |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | `ba7410f9-72c0-80ac-8008-a3e6759698ca` | 671 | 666 | 9 | 9 | 0 | 1 | 61 |
| 2 | `ba7410f9-72c0-80ac-8008-a3e675d9ec24` | 633.125 | 606.644497 | 9 | 9 | 0 | 1 | 62 |
| 3 | `ba7410f9-72c0-80ac-8008-a3e6761bb5e7` | 590.75 | 559.536797 | 9 | 9 | 0 | 1 | 63 |
| 4 | `ba7410f9-72c0-80ac-8008-a3e6765b7b44` | 548.375 | 515.658614 | 9 | 9 | 0 | 1 | 64 |
| 5 | `ba7410f9-72c0-80ac-8008-a3e6769d768b` | 506 | 476 | 9 | 9 | 0 | 1 | 65 |
| 6 | `ba7410f9-72c0-80ac-8008-a3e676dddfa9` | 463.625 | 440.908614 | 9 | 9 | 0 | 1 | 66 |
| 7 | `ba7410f9-72c0-80ac-8008-a3e677219fab` | 421.25 | 410.036797 | 9 | 9 | 0 | 1 | 67 |
| 8 | `ba7410f9-72c0-80ac-8008-a3e6776225a1` | 378.875 | 382.394497 | 9 | 9 | 0 | 1 | 68 |
| 9 | `ba7410f9-72c0-80ac-8008-a3e677a53340` | 336.5 | 356.5 | 9 | 9 | 0 | 1 | 69 |

## Static delta contract

| Element | Penpot X/Y/W/H | Code X/Y/W/H | Delta X/Y/W/H |
|---|---|---|---|
| Header | 149/12/1056/94 | 149/12/1056/94 | 0/0/0/0 |
| Question | 270/126/826/86 | 270/126/826/86 | 0/0/0/0 |
| Dog | 264/269/224/211 | 264/269/224/211 | 0/0/0/0 |
| Cat | 483/230/225/213 | 483/230/225/213 | 0/0/0/0 |
| Rabbit | 705/305/184/236 | 705/305/184/236 | 0/0/0/0 |
| Fish | 861/237/246/228 | 861/237/246/228 | 0/0/0/0 |
| Slingshot | 568/572/230/150 | 568/572/230/150 | 0/0/0/0 |

Each code dot is positioned by the exact independent Penpot center in the preceding table; center delta is `0,0` for dots 1–9. Core, matching, Penpot, production, background, and legacy target files are not changed/consulted.

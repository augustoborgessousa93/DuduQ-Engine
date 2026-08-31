# Year 1 — M05/M06 v2.3 preparation map

Purpose: technical preparation only. This file does not alter IDs, answers, alternatives or pedagogical content. Source authority used for the modality map: `DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3`.

## M05 — Pets, Colors & Size

All scored items are R0 and must be answerable without autonomous English reading.

| Item | Official interaction direction | Required visual/context | Technical candidate for future homologation | Prep status |
|---|---|---|---|---|
| EN1-M5-01 | image/context → audio | dog | DD 2.0.24 single-choice | canonical dog available |
| EN1-M5-02 | image/context → audio | cat | DD 2.0.24 single-choice | canonical cat available |
| EN1-M5-03 | image/context → audio | fish | DD 2.0.24 single-choice | canonical fish available |
| EN1-M5-04 | image/context → audio | rabbit | DD 2.0.24 single-choice | canonical rabbit available |
| EN1-M5-05 | image/context → audio | hamster | DD 2.0.24 single-choice | canonical hamster available |
| EN1-M5-06 | image/context → audio | bird | DD 2.0.24 single-choice | canonical bird available |
| EN1-M5-07 | image/context → audio | same dog shown at clearly different sizes | DD single-choice + local visual composition if needed | canonical dog exists; safest composition candidate is same canonical source rendered twice at different scales rather than a generated pair asset |
| EN1-M5-08 | image/context → audio | same cat shown at clearly different sizes | DD single-choice + local visual composition if needed | canonical cat exists; same-source two-scale composition is a candidate |
| EN1-M5-09 | image/context → audio | brown dog | DD single-choice | real brown-dog visual equivalence not yet proven; keep as asset/composition gap until verified |
| EN1-M5-10 | image/context → audio | turtle | DD single-choice | canonical turtle available |
| EN1-M5-11 | audio → image | three fictional character+pet scenes (dog/rabbit/cat), correct cat | TS 1.0.21 candidate | local scene composition may be possible from canonical person + pet assets, but equivalence must be proven before implementation |
| EN1-M5-12 | image/context → audio | small white cat | DD single-choice | exact white-small-cat equivalence not yet proven; keep gap fail-closed |

### M05 transversal migration already justified

- Replace legacy R124/systemic-loader-v1 entrypoint with the modern real-entry pattern only after the homologation branch is cut from the then-current Foundation.
- Use strong Host/Transition readiness and audio MutationObserver/latch from the first QA gate.
- Remove procedural `data:image`/`gap-preview`; never promote legacy `PREVIEW_VISUALS` as production media.
- M05 Q01–Q10/Q12 strongly align with the already homologated image/context→audio single-choice contract. Q11 is directionally different (audio→image), so do not force it into DD just for uniformity.

## M06 — My English World – Review

The v2.3 rule is explicit: OUVIR + VER + INTERAGIR; no scored item depends on autonomous English reading.

| Item | Official direction | Context requirement | Technical candidate | Prep status |
|---|---|---|---|---|
| EN1-M6-01 | scene → audio | morning + character card Leo | DD single-choice | morning scene exists; card/name composition requires exact implementation review |
| EN1-M6-02 | audio → image | six blue pencils vs five blue pencils vs six blue rulers | TS candidate | quantity/object compositions can reuse canonical object sources locally; exact layout pending |
| EN1-M6-03 | image/context → audio | red backpack | DD single-choice | backpack canonical; red variant/composition equivalence pending |
| EN1-M6-04 | image/context → audio | three orange crayons | DD single-choice | orange crayon canonical; three-source DOM composition analogous to M03 Q10 is a strong candidate |
| EN1-M6-05 | audio → image | sit / stand / enter | TS | canonical action scenes available; `come in` representation must use the M04-proven scene mapping if still valid |
| EN1-M6-06 | audio → image/context | touch hands vs feet vs head; no answer text shown before response | TS | canonical body-action assets available |
| EN1-M6-07 | image/context → audio | small turtle | DD single-choice | canonical turtle available; size presentation needs equivalence proof |
| EN1-M6-08 | image/context → audio | red pencil | DD single-choice | canonical red pencil already known in asset bank |
| EN1-M6-09 | audio → image | 4 vs 5 vs 6 rulers | TS + local quantity composition candidate | same canonical ruler source can be repeated per option locally, no generated count asset |
| EN1-M6-10 | audio → image/context | legs vs arms vs head | TS | body assets available; LEGS may reuse M04 local highlight pattern only if the same semantic contract is confirmed |
| EN1-M6-11 | image/context → audio | big brown dog | DD single-choice | exact brown+big dog visual equivalence still unresolved |
| EN1-M6-12 | sequence/context → audio | arrival/name then farewell | DD single-choice with sequence scene context candidate | canonical arrival/farewell scenes exist; local two-scene composition likely reusable if exact semantics match |

### M06 transversal migration already justified

- Same obsolete entrypoint/procedural family as M05; infrastructure migration can be prepared from one shared pattern, but module payloads remain individually audited.
- Reuse only presentation patterns already homologated when the semantic contract is identical: repeated canonical-image composition (M03 Q10), strong transition readiness, audio latch, and local fail-closed helpers.
- Do not generalize M04 LEGS highlight or M03 color/ruler helper code until the M06 item proves the same DOM/semantic contract.

## Gaps to resolve before each FILA A implementation

M05: brown dog; character+pet alternatives; small white cat.
M06: red backpack representation; quantity compositions; small turtle; big brown dog; exact sequence-scene composition.

These are local representation questions, not global blockers. No Assets-DuduQ mutation is authorized by this preparation map.

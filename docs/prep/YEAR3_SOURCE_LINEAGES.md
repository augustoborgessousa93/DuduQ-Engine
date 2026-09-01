# Year 3 — GitHub source lineages

Preparation-only record for FILA B. No Year 3 implementation is promoted by this file.

## Decision summary

- **Editorial/pedagogical authority:** `feat/year3-v23-multimodal` + `DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3.docx`.
- **Best materialized implementation candidate:** `scale/shared-engine-year3-bootstrap`.
- **Alternative technical lineage, not deployable authority:** `scale/year3-shared-engine-foundation`.

This decision means Year 3 must **not** be reconstructed from zero, but neither historical scale branch is promoted wholesale. The candidate must be reconciled onto the then-current Foundation/Canary.

## 1. Editorial authority — v2.3 policy/source branch

Branch: `feat/year3-v23-multimodal`

The Year 3 README explicitly names `DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3.docx` as source of truth and requires:

- 90/90 source IDs `EN3-M1-*` through `EN3-M6-*`;
- source answers and order preserved;
- no autonomous English reading as a success requirement;
- repeatable audio for verbal content;
- visual/context support before autonomous reading;
- assets-first resolution;
- mechanic selection by pedagogical fit, not diversity for its own sake.

Therefore this branch/source governs **what must be preserved**.

## 2. Best materialized implementation candidate

Branch: `scale/shared-engine-year3-bootstrap`
Head observed: `f33f1a2a2d8d3fdc4b0f89cc388b1e0c86cc8a08`

Why this is the best materialized candidate:

1. Contains real `module-01` through `module-06` directories with public `index.html` entrypoints.
2. Uses `year3-content-factory-v1.js` plus shared visual/content compatibility layers.
3. Module M01 declares version `1.1.0-v23-multimodal` and explicitly cites the v2.3 pedagogical source.
4. M01 materializes 15 IDs with prompts/options/answers in source-shaped records; the six-module architecture therefore matches the expected 90-item Year 3 structure.
5. The branch includes explicit Year 3 v2.3 contract tests, all-modules browser smoke, smart-asset audit and visual proof tooling.
6. Its shared workflow also includes Year 4/5 baselines, so this tree is closer to a deployable multi-year bootstrap than the alternative lineage.

Historical runtime caveat:
- entrypoints target `scale-v1`, not current Canary R146/Foundation;
- shared scale compatibility/visual layers must be reconciled, not copied blindly;
- any old generated-vector fallback must be rechecked against the current Assets-DuduQ-first policy.

## 3. Alternative shared-engine foundation lineage

Branch: `scale/year3-shared-engine-foundation`
Head observed: `44f55de3095d900feeb96d627c77d8b7e13854d6`

Observed shape differs materially:

- M01 contains `module-01-source-v22.js` + `module-01-runtime-v1.js`;
- no equivalent module-level public `index.html` at the inspected M01 path;
- Year root carries `year3-factory-v1.js`, `year3-plan-v1.js`, `year3-visual-resolver-v1.js`;
- source naming still references v2.2 in the module split.

Classification: **technical reference lineage**, useful only where an abstraction is proven superior/equivalent. It is not the preferred materialized content tree because it is less directly aligned to the v2.3 deployable module shape.

## Reconciliation contract before Year 3 FILA A

For M13–M18:

1. Extract authoritative IDs/order/answers/literacy constraints from v2.3.
2. Diff each `module-XX-v1.js` in `scale/shared-engine-year3-bootstrap` against that authority.
3. Record per-item mechanic, media requirement, asset provenance, audio support and any fallback.
4. Replace only historical runtime/bootstrap details that conflict with current Foundation/Canary.
5. Compare alternative-foundation utilities only as implementation candidates; never let a v2.2 source split override v2.3 editorial content.
6. Run 90/90 static source parity before browser homologation.
7. Materialize the future homologation branch from current official Foundation, overlaying reconciled Year 3 content rather than merging a historical scale tree wholesale.

## Current FILA B status

M13–M18: **SOURCE AUTHORITY IDENTIFIED + BEST MATERIALIZED CANDIDATE IDENTIFIED**.

Next preparation work is per-module source parity and technical migration mapping, not source discovery.

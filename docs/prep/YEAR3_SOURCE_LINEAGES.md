# Year 3 — GitHub source lineages

Preparation-only record for FILA B. No Year 3 implementation is promoted by this file.

## 1. v2.3 policy/source branch

Branch: `feat/year3-v23-multimodal`

Role observed: v2.3 multimodal source/policy staging. This is the pedagogical-direction branch to reconcile against implementation candidates.

## 2. Shared-engine bootstrap implementation

Branch: `scale/shared-engine-year3-bootstrap`
Head observed: `f33f1a2a2d8d3fdc4b0f89cc388b1e0c86cc8a08`

Contains six materialized module directories and real public entrypoints.
Example M01:
- channel `scale-v1`;
- `requiredMechanics: ["drag-drop","target-shooter"]`;
- content `module-01-v1.js` version `1.1.0-v23-multimodal`;
- `year3-content-factory-v1.js`;
- shared smart-visual aliases and content-compat;
- shared Player/Loader.

The M01 content explicitly cites the Year 3 v2.3 multimodal revision and materializes 15 official item IDs with source prompts/options/answers preserved. This makes this branch a strong implementation candidate, but its scale-v1 runtime still needs reconciliation with current Canary R146/Foundation when Year 3 reaches FILA A.

## 3. Shared-engine foundation experiment

Branch: `scale/year3-shared-engine-foundation`
Head observed: `44f55de3095d900feeb96d627c77d8b7e13854d6`

Contains six module directories but a different shape. M01, for example, contains:
- `module-01-source-v22.js`;
- `module-01-runtime-v1.js`;
- no module-level `index.html` at that path.

The Year root also includes `year3-factory-v1.js`, `year3-plan-v1.js` and `year3-visual-resolver-v1.js`.

This branch therefore looks like an earlier/different shared-foundation architecture rather than the same deployable tree as `scale/shared-engine-year3-bootstrap`.

## Reconciliation rule before Year 3 FILA A

Do not merge these lineages mechanically. Before Year 3 homologation:

1. Treat v2.3 pedagogical source as authoritative for IDs/prompts/options/answers and literacy policy.
2. Compare the six `module-XX-v1.js` implementations in `scale/shared-engine-year3-bootstrap` against that authority.
3. Reuse only technical bootstrap/factory/resolver elements that remain compatible with current Foundation/Canary.
4. Compare the `scale/year3-shared-engine-foundation` utilities for useful shared abstractions, but do not replace deployable modules merely because that branch name contains “foundation”.
5. Create a Year 3 candidate on the then-current official Foundation, not by promoting either historical scale branch wholesale.

## Current FILA B status

M13–M18: technical sources located; no need to reconstruct from zero. Authority reconciliation remains the preparation task before homologation begins.

# Drag & Drop delivery audit

Date: 2026-09-23

## Candidate selected

`engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js` is the most
complete current candidate.  It composes the 2.0.22 runtime and adds the
explicit `single-choice` contract without changing the established
association, classification, pairs, or sequence paths.

Its existing browser suite covers a wrong placement followed by retry and a
correct placement, direct correct placement, keyboard, pointer drag, touch,
audio-card replay, desktop, mobile, and the four inherited modes.

## Promotion decision

Do **not** promote this candidate to `/play/drag-drop/` yet.  The candidate's
only executable harness, `test/drag-drop/single-choice-2.0.24/index.html`,
mounts the mechanic through `#mount iframe`.  That is appropriate for the
existing isolated regression suite but not for an official product route.
Promoting it as-is would violate the no-iframe product contract.

## Reproducible verification findings

- `node test/drag-drop/single-choice-2.0.24/contract.mjs` currently fails
  before exercising the candidate because its immutable 2.0.22 runtime hash
  is stale.  Expected: `7449c73cb2b321a4ff4af1b4ccdbcc97070ffd82`; current:
  `244d871c9206a9399726fa621dea9f913e481d66`.
- `node test/drag-drop/single-choice-2.0.24/e2e.mjs` cannot currently resolve
  the `playwright` package from this workspace.  The project package manifest
  does not declare it.
- `node test/systemic/canary-r146-drag-drop-2.0.24-contract.mjs` is also a
  historical contract: it requires canary revision 146, while the current
  manifest is revision 147.  It must be replaced by a revision-independent
  release assertion before it can serve as delivery evidence.

## Next executable delivery task

Create a no-iframe `/play/drag-drop/` host that mounts the existing 2.0.24
mechanic directly, then repair the two test-environment guards above without
altering the release runtime or approved Matching/Target baselines.

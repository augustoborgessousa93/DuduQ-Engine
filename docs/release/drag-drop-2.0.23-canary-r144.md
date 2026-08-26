# Drag & Drop 2.0.23 — Canary R144 promotion runbook

## Scope

This promotion changes only two active production surfaces:

1. `engine/channels/canary-v1.json`: R143 → R144 and `drag-drop` 2.0.22 → 2.0.23.
2. `content/english/year-2/module-03/index.html`: explicitly enables the Year 2 M03 `SINGLE_TARGET_CHOICE` pilot and loads the 2.0.23 active DD2 runtime patch before the loader.

All other Canary mechanics and core releases must remain byte-equivalent to R143.

## Pre-activation gate

Promotion is allowed only after the dedicated workflow passes all of the following on the promotion branch:

- static promotion/rollback contract;
- public M03 propagation through `canary-v1`;
- initial disabled lifecycle;
- original M03 answer mapping (`B / opt-2 = doll`);
- real drag, tap/click, replacement, wrong retry/return and success;
- generic three-target Drag & Drop through Canary R144, with no `SINGLE_TARGET_CHOICE` DOM leak;
- sequence 2.0.22 ↔ 2.0.23 parity;
- desktop 1366×768, notebook 1280×650, tablet 1024×768 and mobile visual gates.

## Rollback pair

Rollback must restore **both** production surfaces, not only the manifest:

- manifest snapshot: `engine/channels/rollback/canary-r143-before-drag-drop-2.0.23.json` → restore as `engine/channels/canary-v1.json`;
- M03 snapshot: `engine/channels/rollback/canary-r143-m03-public-entry.html` → restore as `content/english/year-2/module-03/index.html`.

The restored state is Canary R143 with `drag-drop@2.0.22`, no M03 `interactionPilot`, and no M03 load of `dd2-single-target-runtime-patch.js`.

## Immediate rollback triggers

Rollback instead of hot-patching R144 if any of these are observed after promotion:

- M03 cannot start or remains disabled after the initial audio gate;
- drag/tap does not place exactly one choice in the target;
- correctness is revealed before CONFIRMAR;
- wrong choice does not return after the retry dwell;
- B/`opt-2` is not the accepted answer for EN2-M3-01;
- generic multi-target or sequence Drag & Drop changes behavior;
- CONFIRMAR is clipped at an approved breakpoint;
- unexpected browser errors originate from the 2.0.23 adapter/runtime patch.

Do not edit the immutable 2.0.22 release as part of rollback.

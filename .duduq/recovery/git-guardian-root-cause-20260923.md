# Git Guardian / Root-Cause Recovery

- HEAD at inspection: `c8ff65888610279e02b28182aa3240b6f79023c2`
- Branch: `feat/design-sync-primary-button-v1`
- Worktree: dirty; preserve all pre-existing user and generated changes. Do not reset or clean.
- Existing production tags include `duduq-exact-penpot-playable-v1` and `duduq-penpot-core-production-v2`; they must not be overwritten.
- Canonical identities from `DUDUQ_PROJECT_STATE.json` remain Matching `test/matching/gold-master-candidate-v1` and Target Shooter `test/target-shooter/gold-master-clean-v2`, both commit `761127dddaed830ea4f77a0fa292b505577f0a37`.
- Root cause proven in repository: `scripts/duduq-test-server.mjs` rewrites both `/play/matching/` and `/play/target-shooter/` to `/runtime/preview/index.html`; that preview mounts `mechanics/*.js`, which create Gold Master iframes. The visible package is only a visual host while the gameplay implementation remains in the iframe. The prior certification artifact is therefore not evidence of a real product route and must not be reused.
- Existing final-certification videos are absent (`matching-product-play.webm`, `target-shooter-product-play.webm`), further invalidating the earlier certification.

Safe handling: implement the headless gameplay extraction/product route work in a new commit on the current branch, then create a new tag only after real `/play/*` pointer QA, video, trace, and dynamic progression evidence pass. Do not amend or reuse prior certification tags.

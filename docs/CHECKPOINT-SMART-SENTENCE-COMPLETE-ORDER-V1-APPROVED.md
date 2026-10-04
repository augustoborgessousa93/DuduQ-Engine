# Smart Sentence Complete + Order V1 — Approved checkpoint

Status: approved and saved

- Route: `/play/smart-sentence/`
- Engine: `core/duduq-smart-sentence-engine.js`
- Renderer: `play/smart-sentence/smart-sentence.js`
- Complete and Order run as rounds in the same activity and engine instance.
- The canonical Gold Master shell, header, Question HUD, feedback footer, and fullscreen are preserved.
- Complete keeps its protected V1 interaction and validation behavior; Order supports selection/drag, removal, confirmation, retry, and explicit Continue.
- The Complete-to-Order handoff uses the official transition cover/reveal with its mascot, card, background, and progress presentation. It does not navigate away or auto-advance.
- Header counter text is centered horizontally and vertically, in route-scoped Nunito 15.64px / 900 styling.
- Unscramble remains unimplemented.

Validation performed:

- `node --check play/smart-sentence/smart-sentence.js`
- Complete V1 regression test
- Order mode test
- Combined Complete → Continue → Order test
- Browser check of Complete success → Continue → Order at `/play/smart-sentence/`
- HTTP 200 for the route
- `git diff --check`

Git reference: `duduq-smart-sentence-complete-order-v1-approved`.

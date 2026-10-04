# Smart Sentence Complete + Order V1 checkpoint

Status: combined baseline saved; Complete V1 behavior remains protected.

- Route: `/play/smart-sentence/`
- Engine: `core/duduq-smart-sentence-engine.js`
- Renderer: `play/smart-sentence/smart-sentence.js`
- One activity config and one engine instance run Complete then Order.
- The canonical Gold Master header, Question HUD, feedback footer, and fullscreen remain shared. The play area changes by configured round mode.
- Progress reports the current round out of the combined activity total. A correct answer waits for explicit Continue; no mode or question auto-advances.
- Complete V1 stays covered by its regression test. Order supports click/tap, drag/drop, removing placed words, validation, retry, and Continue.
- Unscramble remains unimplemented.

Git reference: `duduq-smart-sentence-complete-order-v1` (created with the checkpoint commit).

Validation: `node --check` for engine and renderer; direct Complete V1 and Order engine regression tests; visible browser interaction through Complete success → Continue → Order success; route HTTP 200.

# DUDUQ Smart Sentence

**Smart Sentence Engine:** in development and extensible

**Complete mode:** V1 homologated / frozen baseline

**Order mode:** not implemented

**UnScramble mode:** not implemented

Route: `/play/smart-sentence/`

## Owners

- Engine: `core/duduq-smart-sentence-engine.js`
- Renderer: `play/smart-sentence/smart-sentence.js`
- Screen/activity config and visual assets: `play/smart-sentence/`

The activity config is the single pedagogical source of truth. The renderer consumes it for presentation and input; the engine validates semantic `answerKey` values, never displayed text, DOM order, or position.

## Complete V1 contract

- A round uses `mode: "complete"`, one sentence slot with an `answerKey`, and an options bank whose choices each have a stable `id`, visible `label`, and semantic `answerKey`.
- The learner can fill the single slot by click/tap or pointer drag. A later choice replaces the selected choice; an invalid drop leaves the current selection unchanged and the card returns to its bank position.
- Confirm is enabled only when the slot is filled and uses the canonical DuduQ primary action. Validation compares the selected option's `answerKey` to the round answer key.
- Incorrect answers lock input until Try Again. Retry returns the selected option to the bank and restores an editable slot.
- Correct answers lock the choice and wait for explicit Continue. There is no automatic advance.
- Header, Question HUD, feedback footer, and fullscreen use the shared Gold Master infrastructure.

The renderer owns drag gestures, snap/presentation, and DOM state. The engine owns selection, validation, retry, and continue lifecycle and does not depend on CSS, DOM selectors, or coordinates.

## Extension policy

Future `order` and `unscramble` modes may extend the same engine. Any engine change must keep the Complete V1 regression suite passing. If an Order change risks changing Complete behavior, stop and report `COMPLETE_REGRESSION_RISK`; do not adapt the frozen mode to fit the new one.

Regression test: `node --test test/smart-sentence/complete-v1-regression.test.mjs`.

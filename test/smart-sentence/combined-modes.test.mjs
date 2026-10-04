import assert from "node:assert/strict";
import { DuduQSmartSentenceEngine, SMART_SENTENCE_STATUS } from "../../core/duduq-smart-sentence-engine.js";

const activity = { id: "complete-order", rounds: [
  { id: "complete", mode: "complete", options: [{ id: "dog", label: "DOG", answerKey: "dog" }, { id: "cat", label: "CAT", answerKey: "cat" }], answer: ["dog"] },
  { id: "order", mode: "order", options: [{ id: "i", label: "I", answerKey: "i" }, { id: "like", label: "LIKE", answerKey: "like" }, { id: "dogs", label: "DOGS", answerKey: "dogs" }], answer: ["i", "like", "dogs"] }
] };

const engine = new DuduQSmartSentenceEngine(activity);
engine.start();
engine.select("dog");
assert.equal(engine.confirm()?.correct, true);
assert.equal(engine.snapshot().round.mode, "complete");
assert.equal(engine.snapshot().roundNumber, 1);
assert.equal(engine.status, SMART_SENTENCE_STATUS.CORRECT);

const order = engine.continue();
assert.equal(order.round.mode, "order");
assert.equal(order.roundNumber, 2);
assert.equal(order.totalRounds, 2);
assert.equal(order.canConfirm, false);
engine.place("i", 0); engine.place("like", 1); engine.place("dogs", 2);
assert.equal(engine.confirm()?.correct, true);
assert.equal(engine.status, SMART_SENTENCE_STATUS.CORRECT);
assert.equal(engine.snapshot().complete, false);
assert.equal(engine.continue().complete, true);
assert.equal(engine.status, SMART_SENTENCE_STATUS.COMPLETED);

console.log("PASS combined Complete → explicit Continue → Order → explicit completion.");

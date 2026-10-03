import assert from "node:assert/strict";
import { DuduQSmartSentenceEngine, SMART_SENTENCE_STATUS } from "../../core/duduq-smart-sentence-engine.js";

const activity = {
  id: "complete-v1-regression",
  rounds: [{
    id: "complete-dog",
    mode: "complete",
    sentence: [
      { type: "text", value: "THE" },
      { type: "slot", id: "missing-word", answerKey: "dog" },
      { type: "text", value: "IS ON THE BED." }
    ],
    options: [
      { id: "dog", label: "DOG", answerKey: "dog" },
      { id: "cat", label: "CAT", answerKey: "cat" },
      { id: "fish", label: "FISH", answerKey: "fish" }
    ],
    answer: ["dog"]
  }]
};

function emptySlotAndReplacement() {
  const engine = new DuduQSmartSentenceEngine(activity);
  engine.start();

  assert.equal(engine.canConfirm(), false);
  assert.equal(engine.confirm(), null);

  engine.select("dog");
  assert.deepEqual(engine.snapshot().selected.map(({ id }) => id), ["dog"]);
  engine.select("cat");
  assert.deepEqual(engine.snapshot().selected.map(({ id }) => id), ["cat"]);
  assert.deepEqual(engine.snapshot().available.map(({ id }) => id), ["dog", "fish"]);
}

function wrongRetryCorrectAndContinue() {
  const engine = new DuduQSmartSentenceEngine(activity);
  engine.start();

  engine.select("cat");
  assert.equal(engine.confirm()?.correct, false);
  assert.equal(engine.status, SMART_SENTENCE_STATUS.INCORRECT);
  assert.equal(engine.select("dog"), null);

  engine.retry();
  engine.remove("cat");
  assert.equal(engine.status, SMART_SENTENCE_STATUS.PLAYING);
  assert.equal(engine.snapshot().selected.length, 0);
  engine.select("dog");
  assert.equal(engine.confirm()?.correct, true);
  assert.equal(engine.status, SMART_SENTENCE_STATUS.CORRECT);

  const beforeContinue = engine.snapshot();
  assert.equal(beforeContinue.roundNumber, 1);
  assert.equal(beforeContinue.complete, false);
  assert.equal(engine.select("cat"), null);
  assert.equal(engine.snapshot().status, SMART_SENTENCE_STATUS.CORRECT);
  assert.equal(engine.continue().complete, true);
}

emptySlotAndReplacement();
wrongRetryCorrectAndContinue();
console.log("PASS Complete V1 engine regression: empty slot, replacement, incorrect/retry, correct lock, explicit Continue, no auto advance.");

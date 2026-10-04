import assert from "node:assert/strict";
import { DuduQSmartSentenceEngine, SMART_SENTENCE_STATUS } from "../../core/duduq-smart-sentence-engine.js";

const activity = { id: "order-test", rounds: [{ id: "order-1", mode: "order", options: [
  { id: "eu", label: "EU", answerKey: "eu" },
  { id: "gosto", label: "GOSTO", answerKey: "gosto" },
  { id: "de", label: "DE", answerKey: "de" },
  { id: "dog", label: "CACHORRO", answerKey: "cachorro" }
], answer: ["eu", "gosto", "de", "cachorro"] }] };

const engine = new DuduQSmartSentenceEngine(activity);
engine.start();
assert.equal(engine.snapshot().selected.length, 4);
assert.equal(engine.canConfirm(), false);
assert.equal(engine.confirm(), null);
engine.place("dog", 3);
engine.place("eu", 0);
engine.place("de", 2);
engine.place("gosto", 1);
assert.deepEqual(engine.snapshot().selected.map((option) => option?.id), ["eu", "gosto", "de", "dog"]);
assert.equal(engine.canConfirm(), true);
assert.equal(engine.confirm()?.correct, true);
assert.equal(engine.status, SMART_SENTENCE_STATUS.CORRECT);
assert.equal(engine.select("dog"), null);
assert.equal(engine.continue().complete, true);

const retryEngine = new DuduQSmartSentenceEngine(activity);
retryEngine.start();
retryEngine.place("eu", 0); retryEngine.place("de", 1); retryEngine.place("gosto", 2); retryEngine.place("dog", 3);
assert.equal(retryEngine.confirm()?.correct, false);
retryEngine.retry();
retryEngine.place("gosto", 1);
retryEngine.place("de", 2);
assert.equal(retryEngine.confirm()?.correct, true);

console.log("PASS Smart Sentence ORDER: all slots required, ordered validation, replacement/reorder, retry, explicit Continue.");

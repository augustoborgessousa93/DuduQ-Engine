import assert from "node:assert/strict";
import { createDuduqDragDropEngine } from "../../core/duduq-drag-drop-engine.js";
import { createDuduqDragDropLifecycle } from "../../core/duduq-drag-drop-lifecycle.js";
import { createMultimediaRound } from "../../play/drag-drop-multimedia/drag-drop-multimedia-round.js";
import { MIXED_MULTIMEDIA_QA_FIXTURE } from "./unified-engine-mixed-fixture.mjs";

const grouping = createDuduqDragDropEngine({
  id: "grouping-qa", layout: "grouping", validation: { strategy: "groupId" },
  items: [
    { id: "cat", type: "image", correctGroupId: "animals" },
    { id: "apple", type: "image", correctGroupId: "food" }
  ],
  targets: [
    { id: "animals", type: "group", groupId: "animals", capacity: "infinite" },
    { id: "food", type: "group", groupId: "food", capacity: "infinite" }
  ]
});
assert.ok(grouping.place("cat", "animals"));
assert.ok(grouping.place("apple", "food"));
assert.equal(grouping.validate().outcome, "correct");
assert.equal(grouping.continueActivity(), true);
assert.equal(grouping.continueActivity(), false);

const mixed = createDuduqDragDropEngine(MIXED_MULTIMEDIA_QA_FIXTURE);
assert.deepEqual(mixed.snapshot().items.map(item => item.type), ["text", "audio", "image"]);
assert.ok(mixed.place("text-fish", "target-fish"));
assert.ok(mixed.place("audio-dog", "target-dog"));
assert.ok(mixed.place("image-cat", "target-cat"));
assert.equal(mixed.validate().outcome, "correct");

const retry = createDuduqDragDropEngine(MIXED_MULTIMEDIA_QA_FIXTURE);
retry.place("text-fish", "target-dog");
retry.place("audio-dog", "target-fish");
retry.place("image-cat", "target-cat");
assert.equal(retry.validate().outcome, "incorrect");
assert.deepEqual(retry.retry().sort(), ["audio-dog", "text-fish"]);
assert.equal(retry.snapshot().items.find(item => item.id === "image-cat").locked, true);

const groupedAdapter = createMultimediaRound({
  id: "group-adapter-qa", layout: "grouping", validation: { strategy: "groupId" },
  items: [{ id: "group-image", type: "image", correctGroupId: "animals" }],
  targets: [{ id: "animals", type: "group", groupId: "animals", capacity: "infinite" }]
});
groupedAdapter.place("group-image", "animals");
assert.equal(groupedAdapter.validate().outcome, "correct");

const finiteCapacity = createDuduqDragDropEngine({
  layout: "target-grid", validation: { strategy: "answerKey" },
  items: [{ id: "a", answerKey: "a" }, { id: "b", answerKey: "b" }, { id: "c", answerKey: "c" }],
  targets: [{ id: "target", type: "image", answerKey: "a", capacity: 2 }]
});
finiteCapacity.place("a", "target");
finiteCapacity.place("b", "target");
assert.equal(finiteCapacity.place("c", "target"), null);
assert.deepEqual(finiteCapacity.snapshot().targets[0].itemIds, ["a", "b"]);
assert.throws(() => createDuduqDragDropEngine({ layout: "target-grid", validation: { strategy: "answerKey" }, items: [{ id: "missing" }], targets: [{ id: "target", answerKey: "x" }] }));

const lifecycle = createDuduqDragDropLifecycle(createDuduqDragDropEngine({
  layout: "target-grid", validation: { strategy: "answerKey" },
  items: [{ id: "only", answerKey: "only" }], targets: [{ id: "only-target", answerKey: "only" }]
}));
assert.equal(lifecycle.canConfirm(), false);
assert.ok(lifecycle.place("only", "only-target"));
assert.equal(lifecycle.canConfirm(), true);
assert.equal(lifecycle.validate().outcome, "correct");
assert.equal(lifecycle.canEdit("only"), false);
assert.equal(lifecycle.continueActivity(), true);
console.log("DUDUQ drag-drop shared engine: PASS");

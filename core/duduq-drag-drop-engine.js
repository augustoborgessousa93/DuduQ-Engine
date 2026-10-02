// Shared, DOM-free state engine for every DuduQ drag-and-drop renderer.
// Renderers own their layout; this module owns placement and answer semantics.
export const DUDUQ_DRAGGABLE_TYPES = Object.freeze(["text", "audio", "image"]);
export const DUDUQ_TARGET_TYPES = Object.freeze(["image", "group"]);
export const DUDUQ_VALIDATION_STRATEGIES = Object.freeze(["answerKey", "groupId"]);

const capacityFor = target => {
  if (target.capacity === "infinite") return Infinity;
  if (Number.isFinite(target.capacity) && target.capacity >= 1) return target.capacity;
  return target.type === "group" ? Infinity : 1;
};

const assertUniqueIds = (entries, name) => {
  const ids = new Set();
  for (const entry of entries) {
    if (!entry?.id || ids.has(entry.id)) throw new Error(`Drag-drop ${name} requires unique non-empty ids.`);
    ids.add(entry.id);
  }
};

export function normalizeDuduqDragDropActivity(activity) {
  if (!activity || !Array.isArray(activity.items) || !Array.isArray(activity.targets)) throw new Error("Drag-drop activity requires items and targets arrays.");
  const validationStrategy = activity.validation?.strategy || activity.validationStrategy || (activity.layout === "grouping" ? "groupId" : "answerKey");
  if (!DUDUQ_VALIDATION_STRATEGIES.includes(validationStrategy)) throw new Error(`Unsupported drag-drop validation strategy: ${validationStrategy}`);
  assertUniqueIds(activity.items, "items");
  assertUniqueIds(activity.targets, "targets");
  for (const item of activity.items) {
    if (!DUDUQ_DRAGGABLE_TYPES.includes(item.type || "image")) throw new Error(`Unsupported draggable type: ${item.type}`);
    if (validationStrategy === "answerKey" && !item.answerKey) throw new Error(`Item ${item.id} requires answerKey validation data.`);
    if (validationStrategy === "groupId" && !item.correctGroupId) throw new Error(`Item ${item.id} requires correctGroupId validation data.`);
  }
  for (const target of activity.targets) {
    if (!DUDUQ_TARGET_TYPES.includes(target.type || "image")) throw new Error(`Unsupported target type: ${target.type}`);
    if (validationStrategy === "answerKey" && !target.answerKey) throw new Error(`Target ${target.id} requires answerKey validation data.`);
    if (validationStrategy === "groupId" && !target.groupId) throw new Error(`Target ${target.id} requires groupId validation data.`);
  }
  return Object.freeze({
    id: activity.id || "duduq-drag-drop", mechanic: "drag-drop", layout: activity.layout || "target-grid", validationStrategy,
    items: activity.items.map(item => Object.freeze({ ...item, type: item.type || "image" })),
    targets: activity.targets.map(target => Object.freeze({ ...target, type: target.type || "image", capacity: capacityFor(target) }))
  });
}

export function createDuduqDragDropEngine(activity) {
  const config = normalizeDuduqDragDropActivity(activity);
  const itemState = new Map(config.items.map(item => [item.id, { id: item.id, type: item.type, answerKey: item.answerKey, correctGroupId: item.correctGroupId, currentTargetId: null, state: "idle", locked: false }]));
  const targetState = new Map(config.targets.map(target => [target.id, { id: target.id, type: target.type, answerKey: target.answerKey, groupId: target.groupId, capacity: target.capacity, itemIds: [] }]));
  let status = "editing";
  let continued = false;
  const detach = item => {
    if (!item.currentTargetId) return;
    const target = targetState.get(item.currentTargetId);
    if (target) target.itemIds = target.itemIds.filter(id => id !== item.id);
    item.currentTargetId = null;
  };
  const snapshot = () => ({
    id: config.id, mechanic: config.mechanic, layout: config.layout, validationStrategy: config.validationStrategy, status, continued,
    items: [...itemState.values()].map(item => ({ ...item })),
    targets: [...targetState.values()].map(target => ({ ...target, itemIds: [...target.itemIds], itemId: target.itemIds[0] || null })),
    placedCount: [...itemState.values()].filter(item => item.currentTargetId).length, totalItems: itemState.size
  });
  const place = (itemId, targetId) => {
    const item = itemState.get(itemId);
    const target = targetState.get(targetId);
    if (!item || !target || status !== "editing" || item.locked || item.state === "correct") return null;
    const displacedIds = target.itemIds.filter(id => id !== item.id);
    if (target.itemIds.length >= target.capacity && target.capacity !== 1) return null;
    if (target.itemIds.length >= target.capacity && displacedIds.some(id => itemState.get(id)?.locked)) return null;
    detach(item);
    if (target.itemIds.length >= target.capacity) for (const displacedId of displacedIds) {
      const displaced = itemState.get(displacedId);
      if (!displaced || displaced.locked) continue;
      detach(displaced);
      displaced.state = "idle";
    }
    target.itemIds.push(item.id);
    item.currentTargetId = target.id;
    item.state = "placed";
    return { replacedItemId: displacedIds[0] || null, replacedItemIds: displacedIds, state: snapshot() };
  };
  const remove = itemId => {
    const item = itemState.get(itemId);
    if (!item || status !== "editing" || item.locked || !item.currentTargetId) return false;
    detach(item); item.state = "idle"; return true;
  };
  const validate = () => {
    if (status !== "editing" || [...itemState.values()].some(item => !item.currentTargetId)) return null;
    status = "checking";
    let correctCount = 0;
    for (const item of itemState.values()) {
      const target = targetState.get(item.currentTargetId);
      const correct = config.validationStrategy === "groupId" ? item.correctGroupId === target?.groupId : item.answerKey === target?.answerKey;
      item.state = correct ? "correct" : "incorrect"; item.locked = correct;
      if (correct) correctCount += 1;
    }
    const incorrectCount = itemState.size - correctCount;
    status = incorrectCount ? "retry" : "completed";
    return { outcome: incorrectCount ? "incorrect" : "correct", correctCount, incorrectCount, state: snapshot() };
  };
  const retry = () => {
    if (status !== "retry") return [];
    const returned = [];
    for (const item of itemState.values()) {
      if (item.state !== "incorrect" || item.locked) continue;
      detach(item); item.state = "idle"; returned.push(item.id);
    }
    if (returned.length) status = "editing";
    return returned;
  };
  const continueActivity = () => {
    if (status !== "completed" || continued) return false;
    continued = true; return true;
  };
  return Object.freeze({ config, snapshot, place, remove, validate, retry, continueActivity });
}

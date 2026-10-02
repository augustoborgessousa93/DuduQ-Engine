// Pure state engine for the experimental multimedia drag-and-drop round.
export function createMultimediaRound({ items, targets }) {
  const itemState = new Map(items.map(item => [item.id, {
    id: item.id, type: item.type, answerKey: item.answerKey,
    currentTargetId: null, state: "idle", locked: false
  }]));
  const targetState = new Map(targets.map(target => [target.id, {
    id: target.id, answerKey: target.answerKey, itemId: null
  }]));
  let status = "editing";
  let continued = false;

  const snapshot = () => ({
    status,
    continued,
    items: [...itemState.values()].map(item => ({ ...item })),
    targets: [...targetState.values()].map(target => ({ ...target })),
    placedCount: [...itemState.values()].filter(item => item.currentTargetId).length,
    totalItems: itemState.size
  });
  const place = (itemId, targetId) => {
    const item = itemState.get(itemId);
    const target = targetState.get(targetId);
    if (!item || !target || status !== "editing" || item.locked || item.state === "correct") return null;

    const previousItemId = target.itemId;
    if (previousItemId && previousItemId !== item.id && itemState.get(previousItemId)?.locked) return null;
    if (item.currentTargetId) {
      const previousTarget = targetState.get(item.currentTargetId);
      if (previousTarget?.itemId === item.id) previousTarget.itemId = null;
    }
    if (previousItemId && previousItemId !== item.id) {
      const replaced = itemState.get(previousItemId);
      if (replaced && !replaced.locked) {
        replaced.currentTargetId = null;
        replaced.state = "idle";
      }
    }
    target.itemId = item.id;
    item.currentTargetId = target.id;
    item.state = "placed";
    return { replacedItemId: previousItemId && previousItemId !== item.id ? previousItemId : null, state: snapshot() };
  };
  const remove = itemId => {
    const item = itemState.get(itemId);
    if (!item || status !== "editing" || item.locked || !item.currentTargetId) return false;
    const target = targetState.get(item.currentTargetId);
    if (target?.itemId === item.id) target.itemId = null;
    item.currentTargetId = null;
    item.state = "idle";
    return true;
  };
  const validate = () => {
    if (status !== "editing" || [...itemState.values()].some(item => !item.currentTargetId)) return null;
    status = "checking";
    let correctCount = 0;
    for (const item of itemState.values()) {
      const target = targetState.get(item.currentTargetId);
      item.state = target && item.answerKey === target.answerKey ? "correct" : "incorrect";
      item.locked = item.state === "correct";
      if (item.state === "correct") correctCount += 1;
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
      const target = targetState.get(item.currentTargetId);
      if (target?.itemId === item.id) target.itemId = null;
      item.currentTargetId = null;
      item.state = "idle";
      returned.push(item.id);
    }
    if (returned.length) status = "editing";
    return returned;
  };
  const continueActivity = () => {
    if (status !== "completed" || continued) return false;
    continued = true;
    return true;
  };
  return Object.freeze({ snapshot, place, remove, validate, retry, continueActivity });
}

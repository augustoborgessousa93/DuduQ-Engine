// Shared renderer contract. Layouts own hit-testing and DOM; this owns engine-facing interaction rules.
export function createDuduqDragDropLifecycle(engine) {
  const snapshot = () => engine.snapshot();
  const itemState = itemId => snapshot().items.find(item => item.id === itemId) || null;
  const canEdit = itemId => {
    const item = itemState(itemId);
    return snapshot().status === "editing" && Boolean(item) && !item.locked && item.state !== "correct";
  };
  const canConfirm = () => {
    const state = snapshot();
    return state.status === "editing" && state.placedCount === state.totalItems;
  };
  const place = (itemId, targetId) => canEdit(itemId) ? engine.place(itemId, targetId) : null;
  const remove = itemId => canEdit(itemId) ? engine.remove(itemId) : false;
  const validate = () => canConfirm() ? engine.validate() : null;
  const retry = () => snapshot().status === "retry" ? engine.retry() : [];
  const continueActivity = () => snapshot().status === "completed" ? engine.continueActivity() : false;
  return Object.freeze({ config: engine.config, snapshot, itemState, canEdit, canConfirm, place, remove, validate, retry, continueActivity });
}

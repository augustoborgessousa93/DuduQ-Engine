import { createDuduqDragDropEngine } from "/core/duduq-drag-drop-engine.js";

// Multimedia adapter: all round state and behavior live in the shared engine.
export function createMultimediaRound(activity) {
  return createDuduqDragDropEngine(activity);
}

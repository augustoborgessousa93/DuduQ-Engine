import { createDuduqDragDropEngine } from "../../core/duduq-drag-drop-engine.js";

// Compatibility adapter: this renderer now consumes the shared DOM-free engine.
export function createMultimediaRound(activity) {
  return createDuduqDragDropEngine({
    ...activity,
    id: activity.id || "drag-drop-multimedia",
    mechanic: "drag-drop",
    layout: activity.layout || "target-grid",
    validation: activity.validation || { strategy: "answerKey" }
  });
}

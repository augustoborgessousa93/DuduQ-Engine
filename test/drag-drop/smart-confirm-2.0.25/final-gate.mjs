console.log("FINAL GATE — existing functional suite");
await import("./e2e.mjs");
console.log("FINAL GATE — media + sequence evidence gaps");
await import("./media-sequence.mjs");
console.log("PASS — Drag & Drop 2.0.25 FINAL GATE");

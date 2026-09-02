console.log("FINAL GATE — existing functional suite");
await import("./e2e.mjs");

const failures=[];
for (const [label,path] of [["MEDIA","./media-gap.mjs"],["SEQUENCE","./sequence-gap.mjs"]]) {
  try {
    console.log(`FINAL GATE — ${label}`);
    await import(path);
  } catch (error) {
    console.error(`${label} FAIL`, error?.stack || error);
    failures.push(label);
  }
}

if (failures.length) throw new Error(`FINAL GATE FAIL: ${failures.join(", ")}`);
console.log("PASS — Drag & Drop 2.0.25 FINAL GATE");
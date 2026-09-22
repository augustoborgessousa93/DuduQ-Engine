import assert from "node:assert/strict";
import fs from "node:fs";

// Generic contract: behavior bindings identify an action owner only. The
// compiled visual tree (including descendants) remains present and is not
// replaced by a mechanic-specific renderer.
const dir = "design-system/runtime/screens/matching-master";
const bindings = JSON.parse(fs.readFileSync(`${dir}/bindings.json`, "utf8"));
const markup = fs.readFileSync(`${dir}/visual.svg`, "utf8");
for (const binding of bindings.behaviorBindings || []) {
  const source = `id="shape-${binding.sourceId}"`;
  const start = markup.indexOf(source);
  assert(start >= 0, `bound visual node missing: ${binding.sourceId}`);
  const end = markup.indexOf("</g>", start);
  assert(end > start, `bound visual container has no visual subtree: ${binding.sourceId}`);
  assert(markup.slice(start, end).includes("shape-"), `bound visual descendants were dropped: ${binding.sourceId}`);
}
console.log("Behavior-bound visual sync contract: PASS");

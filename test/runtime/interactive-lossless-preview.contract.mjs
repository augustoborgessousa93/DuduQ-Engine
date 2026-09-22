import assert from "node:assert/strict";
import fs from "node:fs";

const host = fs.readFileSync("core/duduq-screen-runtime.js", "utf8");
const preview = fs.readFileSync("runtime/preview/index.html", "utf8");

// The Golden reference is an oracle.  A runtime import or image node would
// silently turn visual regression into Golden-vs-Golden comparison.
assert.doesNotMatch(host, /visual-reference\.png/);
assert.doesNotMatch(host, /data-duduq-visual-reference/);
assert.match(host, /data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"/);
assert.match(host, /data-duduq-visual-package-markup-hash/);
assert.match(host, /duduq-visual-markup>svg/);

for (const mechanic of ["matching", "target-shooter"]) {
  const pkg = mechanic === "matching" ? "matching-master" : "target-shooter-master";
  const visual = fs.readFileSync(`design-system/runtime/screens/${pkg}/visual.svg`, "utf8");
  assert.match(visual, /^<svg\b/);
  assert.doesNotMatch(visual, /visual-reference\.png/);
  assert.match(preview, new RegExp(`mechanic=${mechanic}|${mechanic}`));
}

console.log("Interactive lossless preview anti-cheat contract: PASS");

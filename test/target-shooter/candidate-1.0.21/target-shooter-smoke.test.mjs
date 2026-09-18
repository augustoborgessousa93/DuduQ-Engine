import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const here = dirname(fileURLToPath(import.meta.url));
const adapter = await readFile(resolve(root, "mechanics/target-shooter.js"), "utf8");
const content = await readFile(resolve(here, "target-shooter-test-content.js"), "utf8");
const entry = await readFile(resolve(here, "index.html"), "utf8");

assert.match(adapter, /id:\s*MECHANIC_ID/);
assert.match(adapter, /version:\s*VERSION/);
assert.match(adapter, /metadata:\s*\{/);
assert.match(adapter, /metadata\.targetShooter/);
assert.match(adapter, /iframe\.style\.width\s*=\s*"100%"/);
assert.match(adapter, /iframe\.style\.height\s*=\s*"100%"/);
assert.match(content, /mechanic:\s*"target-shooter"/);
assert.match(content, /correctIds/);
assert.match(content, /items:/);
assert.match(entry, /requiredMechanics:\s*\["target-shooter"\]/);
console.log("Target Shooter smoke: PASS");

import fs from "node:fs";
import assert from "node:assert/strict";

const state = JSON.parse(fs.readFileSync("DUDUQ_PROJECT_STATE.json", "utf8"));
const sync = fs.readFileSync("DUDUQ_SYNC.md", "utf8");
const agents = fs.readFileSync("AGENTS.md", "utf8");
assert.equal(state.verification.requiredAfterUpdateCore, true);
assert.equal(state.verification.healthCheckRequired, true);
assert.match(state.verification.routes.matching, /runtime\/preview/);
assert.match(state.verification.routes["target-shooter"], /runtime\/preview/);
assert.match(sync, /verification URLs/i);
assert.match(sync, /duduq-test-server\.mjs/);
assert.match(agents, /ALWAYS include verified clickable mechanic preview links/i);
assert.equal(state.commands.updateCore, "npm run duduq:update-core");
console.log(JSON.stringify({ status: "PASS", updateCore: state.commands.updateCore, routes: state.verification.routes }));

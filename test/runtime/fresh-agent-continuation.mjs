import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const state = JSON.parse(fs.readFileSync(path.join(root, "DUDUQ_PROJECT_STATE.json"), "utf8"));
const architecture = fs.readFileSync(path.join(root, "DUDUQ_ARCHITECTURE.md"), "utf8");
const sync = fs.readFileSync(path.join(root, "DUDUQ_SYNC.md"), "utf8");
const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");

assert.equal(state.project, "DUDUQ");
assert.equal(state.status, "PRODUCTION_READY");
assert.equal(state.productionBaseline, "70c1c791");
assert.equal(state.penpot.mcpEndpoint, "http://localhost:4401/mcp");
assert.equal(state.commands.updateCore, "npm run duduq:update-core");
assert.equal(state.commands.dryRun, "npm run duduq:update-core -- --dry-run");
assert.deepEqual(state.validatedConsumers, ["matching", "target-shooter"]);
assert.match(architecture, /Penpot.*visual authoring source/i);
assert.match(architecture, /DuduQScreenRuntime/);
assert.match(architecture, /Golden consumers/);
assert.match(sync, /Universal live protocol/);
assert.match(sync, /last-successful\.json/);
assert.match(agents, /READ `DUDUQ_PROJECT_STATE\.json` FIRST/);
assert.match(agents, /Do not add property-specific visual handlers/);

console.log(JSON.stringify({
  status: "PASS",
  architecture: "resolved",
  updateCore: state.commands.updateCore,
  penpot: state.penpot.mcpEndpoint,
  packages: state.screenPackages.root,
  host: state.universalHost,
  consumers: state.validatedConsumers,
  baseline: state.productionBaseline,
  continuation: state.nextSafeAction,
  prohibited: "no new runtime architecture"
}));

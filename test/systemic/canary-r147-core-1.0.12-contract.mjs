import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const current = readJson("engine/channels/canary-v1.json");
const rollback = readJson("engine/channels/canary-r146-rollback.json");

assert(rollback.revision === 146, `Rollback revision ${rollback.revision}.`);
assert(rollback.core?.release === "1.0.11", `Rollback Core ${rollback.core?.release}.`);
assert(rollback.mechanics?.["drag-drop"]?.release === "2.0.24", `Rollback DD ${rollback.mechanics?.["drag-drop"]?.release}.`);
assert(rollback.mechanics?.["target-shooter"]?.release === "1.0.21", `Rollback TS ${rollback.mechanics?.["target-shooter"]?.release}.`);
assert(rollback.policy?.rollbackViaManifest === true, "Rollback R146 perdeu rollbackViaManifest.");

assert(current.revision === 147, `Canary revision ${current.revision}.`);
assert(current.core?.release === "1.0.12", `Canary Core ${current.core?.release}.`);
assert(current.channel === "canary-v1", `Canal ${current.channel}.`);
assert(current.policy?.rollbackViaManifest === true, "Canary R147 perdeu rollbackViaManifest.");

const coreJson = JSON.stringify(current.core);
assert(!coreJson.includes("/engine/releases/core/1.0.11/"), "R147 ainda referencia path Core 1.0.11.");
assert(!coreJson.includes('"release":"1.0.11"'), "R147 ainda declara release Core 1.0.11.");
assert(coreJson.includes("/engine/releases/core/1.0.12/"), "R147 não referencia Core 1.0.12.");

assert(JSON.stringify(current.mechanics) === JSON.stringify(rollback.mechanics), "Mechanics mudaram durante promoção R147.");
assert(JSON.stringify(current.policy) === JSON.stringify(rollback.policy), "Policy mudou durante promoção R147.");
assert(current.policy?.canonicalAssetRuntimeCommit === rollback.policy?.canonicalAssetRuntimeCommit, "Pin de assets mudou em R147.");

const expectedRollback = { ...current, revision: 146, core: rollback.core, status: rollback.status };
assert(JSON.stringify({ ...rollback }) === JSON.stringify(expectedRollback), "Snapshot R146 não corresponde exatamente ao estado pré-promoção exceto Core/revision/status esperados.");

console.log(JSON.stringify({
  contract: "DUDUQ_CANARY_R147_CORE_1_0_12",
  status: "PASS",
  rollback: { revision: rollback.revision, core: rollback.core.release, dd: rollback.mechanics["drag-drop"].release, ts: rollback.mechanics["target-shooter"].release },
  current: { revision: current.revision, core: current.core.release, dd: current.mechanics["drag-drop"].release, ts: current.mechanics["target-shooter"].release },
  canonicalAssetRuntimeCommit: current.policy.canonicalAssetRuntimeCommit
}, null, 2));

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const current = readJson("engine/channels/canary-v1.json");
const rollback = readJson("engine/channels/canary-r145-rollback.json");

assert(rollback.revision === 145, `Rollback revision ${rollback.revision}.`);
assert(rollback.core?.release === "1.0.11", `Rollback Core ${rollback.core?.release}.`);
assert(rollback.mechanics?.["drag-drop"]?.release === "2.0.22", `Rollback DD ${rollback.mechanics?.["drag-drop"]?.release}.`);

assert(current.revision === 146, `Canary revision ${current.revision}.`);
assert(current.core?.release === "1.0.11", `Canary Core ${current.core?.release}.`);
assert(current.mechanics?.["drag-drop"]?.release === "2.0.24", `Canary DD ${current.mechanics?.["drag-drop"]?.release}.`);
assert(current.mechanics?.["drag-drop"]?.adapter === "/engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js", "Canary DD adapter não aponta para 2.0.24.");
assert(current.mechanics?.["drag-drop"]?.runtime === "/engine/releases/mechanics/drag-drop/2.0.22/DUDUQ_DRAG_DROP.html", "Canary DD runtime base não preservou 2.0.22.");
assert(current.policy?.dragDropSingleChoiceApproved === true, "Policy single-choice não aprovada.");

const unchangedMechanics = ["bubble-pop", "matching", "memory-quest", "smart-sentence", "target-shooter", "word-slash"];
for (const id of unchangedMechanics) {
  assert(JSON.stringify(current.mechanics[id]) === JSON.stringify(rollback.mechanics[id]), `${id} mudou durante promoção R146.`);
}
assert(JSON.stringify(current.core) === JSON.stringify(rollback.core), "Core mudou durante promoção R146.");
assert(current.policy?.canonicalAssetRuntimeCommit === rollback.policy?.canonicalAssetRuntimeCommit, "Pin de assets mudou.");

const allowedPolicy = { ...rollback.policy, dragDropSingleChoiceApproved: true };
assert(JSON.stringify(current.policy) === JSON.stringify(allowedPolicy), "Policy mudou além de dragDropSingleChoiceApproved.");
assert(current.channel === rollback.channel && current.channel === "canary-v1", "Canal Canary mudou.");

console.log(JSON.stringify({
  contract: "DUDUQ_CANARY_R146_DRAG_DROP_2_0_24",
  status: "PASS",
  previous: { revision: rollback.revision, core: rollback.core.release, dragDrop: rollback.mechanics["drag-drop"].release },
  current: { revision: current.revision, core: current.core.release, dragDrop: current.mechanics["drag-drop"].release }
}, null, 2));

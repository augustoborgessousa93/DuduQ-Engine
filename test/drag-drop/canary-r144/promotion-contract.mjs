import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
function assert(condition, message) { if (!condition) throw new Error(message); }

const promoted = json("engine/channels/canary-v1.json");
const rollback = json("engine/channels/rollback/canary-r143-before-drag-drop-2.0.23.json");
const rollbackM03 = read("engine/channels/rollback/canary-r143-m03-public-entry.html");
const m03 = read("content/english/year-2/module-03/index.html");
const contentPatch = read("content/english/year-2/year2-v23-dragdrop-visual-patch.js");
const runtimePatch = read("engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js");

assert(rollback.revision === 143, "Rollback snapshot precisa ser R143.");
assert(rollback.mechanics?.["drag-drop"]?.release === "2.0.22", "Rollback snapshot precisa apontar Drag & Drop 2.0.22.");
assert(rollbackM03.includes('channel:"canary-v1"'), "Snapshot M03 R143 perdeu o canal canary-v1.");
assert(!rollbackM03.includes('interactionPilot:"SINGLE_TARGET_CHOICE"'), "Snapshot M03 R143 não pode ativar SINGLE_TARGET_CHOICE.");
assert(!rollbackM03.includes('dd2-single-target-runtime-patch.js'), "Snapshot M03 R143 não pode carregar o runtime patch 2.0.23.");

assert(promoted.revision === 144, `Promoção precisa ser R144; encontrado ${promoted.revision}.`);
assert(promoted.channel === "canary-v1", "Promoção deve preservar o canal canary-v1.");
assert(promoted.mechanics?.["drag-drop"]?.release === "2.0.23", "R144 não aponta Drag & Drop 2.0.23.");
assert(promoted.mechanics?.["drag-drop"]?.adapter === "/engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js", "Adapter de promoção incorreto.");
assert(promoted.mechanics?.["drag-drop"]?.runtime === "/engine/releases/mechanics/drag-drop/2.0.22/DUDUQ_DRAG_DROP.html", "2.0.23 deve continuar compondo o runtime HTML imutável 2.0.22.");
assert(promoted.policy?.rollbackViaManifest === true, "Rollback via manifest deixou de estar habilitado.");
assert(promoted.policy?.dragDropSingleTargetChoiceApproved === true, "R144 não registra aprovação do SINGLE_TARGET_CHOICE.");

assert(JSON.stringify(promoted.core) === JSON.stringify(rollback.core), "Promoção alterou o core; escopo deveria ser apenas Drag & Drop + metadata de aprovação.");
for (const [name, mechanic] of Object.entries(rollback.mechanics)) {
  if (name === "drag-drop") continue;
  assert(JSON.stringify(promoted.mechanics[name]) === JSON.stringify(mechanic), `Promoção alterou indevidamente a mecânica ${name}.`);
}

assert(m03.includes('channel:"canary-v1"'), "M03 público precisa continuar no canary-v1.");
assert(m03.includes('interactionPilot:"SINGLE_TARGET_CHOICE"'), "M03 público não declara a ativação do piloto.");
assert(m03.includes('dragDropCandidate:"2.0.23"'), "M03 público não declara dragDropCandidate 2.0.23.");
assert(m03.includes('engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js'), "M03 público não carrega o owner/runtime DD2 2.0.23.");
assert(m03.indexOf('dd2-single-target-runtime-patch.js') < m03.indexOf('duduq-loader-v1.js'), "Runtime patch deve ser instalado antes do loader.");
assert(!m03.includes('homolog-m03-single-target-v1'), "M03 público não pode depender do canal de homologação.");

assert(contentPatch.includes('window.DUDUQ_PUBLIC_ENTRY?.interactionPilot === "SINGLE_TARGET_CHOICE"'), "Gate editorial perdeu interactionPilot.");
assert(contentPatch.includes('window.DUDUQ_PUBLIC_ENTRY?.dragDropCandidate === "2.0.23"'), "Gate editorial perdeu dragDropCandidate.");
assert(runtimePatch.includes('const VERSION = "2.0.23-dd2-single-target-g"'), "Runtime patch esperado não é a revisão homologada g.");

console.log("PASS — Canary R144 promotion contract");
console.log("Scope: canary Drag & Drop 2.0.22 → 2.0.23 + M03 explicit activation only");
console.log("Rollback pair: R143 manifest + R143 M03 public entry snapshots");

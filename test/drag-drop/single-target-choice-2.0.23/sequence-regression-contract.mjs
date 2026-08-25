import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const consolidated = read("engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js");
const candidate = read("engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js");
const activeRuntimePatch = read("engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js");

// Regression guard: 2.0.23 must remain a composition of the already-homologated
// 2.0.22 sequence behavior instead of reimplementing sequence semantics.
expect(
  candidate.includes('const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js"'),
  "2.0.23 deixou de compor a base 2.0.22; o contrato de regressão de sequence perdeu validade."
);

// The consolidated 2.0.22 sequence contract must still exist unchanged in its immutable source.
for (const signature of [
  'question.strategy === "sequence"',
  'duduq-dd2-sequence-slot',
  'setCorrectItemIds(correct)',
  'setWrongItemIds(incorrect.slice())',
  'setRetryAnimating(true)',
  '}, 850);',
  'Os itens corretos ficaram em verde. Complete as posições restantes.'
]) {
  expect(consolidated.includes(signature), `2.0.22 perdeu assinatura crítica de sequence: ${signature}`);
}

// SINGLE_TARGET_CHOICE may share retry infrastructure, but every behavioral
// branch introduced by 2.0.23 must be explicitly gated. This prevents M03 rules
// from leaking into sequence/classification/association.
for (const gatedSignature of [
  'if (question.strategy !== "single-target-choice") return;',
  'onPointerDown:question.strategy === "single-target-choice" ? undefined',
  'question.strategy === "single-target-choice"\n      ? positionedCount === 1',
  'if (question.strategy === "single-target-choice") {',
  'question.strategy === "single-target-choice" || question.strategy === "sequence"'
]) {
  expect(activeRuntimePatch.includes(gatedSignature), `Patch DD2 sem gate explícito esperado: ${gatedSignature}`);
}

// Sequence must remain on the original synthetic pointer path. Only the new
// single-target strategy may opt out in favor of the native document-level owner.
expect(
  activeRuntimePatch.includes('onPointerDown:question.strategy === "single-target-choice" ? undefined : function (event) { onPointerDown(item.id,event); }'),
  "Pointer de sequence foi alterado: somente SINGLE_TARGET_CHOICE pode desabilitar o handler original."
);
expect(
  activeRuntimePatch.includes('onPointerMove:question.strategy === "single-target-choice" ? undefined : onPointerMove'),
  "Pointermove de sequence foi alterado pelo candidato."
);
expect(
  activeRuntimePatch.includes('onPointerUp:question.strategy === "single-target-choice" ? undefined : finishDrag'),
  "Pointerup de sequence foi alterado pelo candidato."
);

// Styling for the single-target mode must be scoped by its data attribute and
// must not redefine the existing list/sequence slot selectors.
expect(
  activeRuntimePatch.includes('.duduq-dd2-target[data-single-target-choice="true"]'),
  "CSS do single-target perdeu o seletor de escopo."
);
expect(
  !activeRuntimePatch.includes('.duduq-dd2-target[data-kind="list"]'),
  "2.0.23 passou a sobrescrever visual de sequence/list; isso pertence à 2.0.22."
);
expect(
  !activeRuntimePatch.includes('.duduq-dd2-sequence-slot'),
  "2.0.23 passou a sobrescrever slots de sequence; regressão potencial."
);

console.log("PASS — static sequence regression guard");
console.log("2.0.23 compõe 2.0.22; SINGLE_TARGET_CHOICE permanece gated e não sobrescreve sequence/list.");

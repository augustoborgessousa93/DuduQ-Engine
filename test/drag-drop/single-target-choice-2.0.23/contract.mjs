import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectOnce(source, needle, label) {
  const occurrences = count(source, needle);
  expect(occurrences === 1, `${label}: esperado 1, encontrado ${occurrences}`);
}

const candidatePath = "engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js";
const baseAdapterPath = "engine/releases/mechanics/drag-drop/2.0.18/drag-drop.js";
const baseRuntimePath = "engine/releases/mechanics/drag-drop/2.0.18/DUDUQ_DRAG_DROP.html";
const consolidatedPath = "engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js";
const canaryPath = "engine/channels/canary-v1.json";
const homologPath = "engine/channels/homolog-m03-single-target-v1.json";
const m03EntryPath = "content/english/year-2/module-03/index.html";
const m03PatchPath = "content/english/year-2/year2-v23-dragdrop-visual-patch.js";

const candidate = read(candidatePath);
const baseAdapter = read(baseAdapterPath);
const baseRuntime = read(baseRuntimePath);
const consolidated = read(consolidatedPath);
const canary = JSON.parse(read(canaryPath));
const homolog = JSON.parse(read(homologPath));
const m03Entry = read(m03EntryPath);
const m03Patch = read(m03PatchPath);

// 1) Isolamento: Canary deve continuar exatamente no Drag & Drop homologado atual.
expect(canary.mechanics?.["drag-drop"]?.release === "2.0.22", "Canary foi alterado: drag-drop precisa permanecer em 2.0.22 durante o piloto.");
expect(canary.revision === 143, `Canary inesperado: revisão ${canary.revision}; esperado 143 neste piloto.`);
expect(!JSON.stringify(canary).includes("2.0.23"), "Canary contém referência indevida ao candidato 2.0.23.");

// 2) Canal isolado precisa apontar somente o Drag & Drop para o candidato.
expect(homolog.policy?.homologationOnly === true, "Canal do piloto precisa estar marcado como homologationOnly.");
expect(homolog.mechanics?.["drag-drop"]?.release === "2.0.23", "Canal do piloto não está usando Drag & Drop 2.0.23.");
expect(homolog.mechanics?.["drag-drop"]?.adapter === "/engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js", "Adapter 2.0.23 incorreto no canal de homologação.");

// 3) M03 deve entrar pelo canal isolado e declarar explicitamente o piloto.
expect(m03Entry.includes('channel:"homolog-m03-single-target-v1"'), "M03 não aponta para o canal isolado do piloto.");
expect(m03Entry.includes('interactionPilot:"SINGLE_TARGET_CHOICE"'), "M03 não declara SINGLE_TARGET_CHOICE no entrypoint.");
expect(m03Entry.includes('dragDropCandidate:"2.0.23"'), "M03 não declara o candidato Drag & Drop 2.0.23.");

// 4) O patch pedagógico deve ser estritamente gated ao M03 e não vazar para outros módulos.
expect(m03Patch.includes('/^EN2-M3-\\d{2}$/.test'), "Patch do M03 perdeu o gate por ID EN2-M3-xx.");
expect(m03Patch.includes('question.metadata.singleTargetChoice = true'), "Patch não marca singleTargetChoice.");
expect(m03Patch.includes('question.metadata.confirmOnAnySelection = true'), "Patch não marca confirmação para qualquer seleção.");
expect(m03Patch.includes('question.metadata.tapToPlace = true'), "Patch não marca equivalência toque/clique.");
expect(m03Patch.includes('question.metadata.replacePreviousChoice = true'), "Patch não marca substituição da escolha anterior.");
expect(m03Patch.includes('target.kind = "single-choice"'), "Destino não foi marcado como single-choice.");

// 5) O candidato deve compor 2.0.22, não modificar release imutável.
expect(candidate.includes('const VERSION = "2.0.23"'), "Identidade do candidato 2.0.23 ausente.");
expect(candidate.includes('const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js"'), "Candidato não compõe a base 2.0.22.");
expect(candidate.includes('strategy: "single-target-choice"'), "Estratégia single-target-choice ausente no candidato.");
expect(candidate.includes('correctChoiceId'), "Candidato não separa gabarito da possibilidade de colocação.");
expect(candidate.includes('setSingleChoiceRetryAnimating'), "Candidato não possui estado temporário de erro/retorno.");
expect(candidate.includes('}, 850);'), "Janela de feedback vermelho/retorno de 850 ms ausente.");
expect(candidate.includes('data-single-target-choice'), "Hook visual single-target-choice ausente.");

// 6) Contrato de composição: assinaturas usadas pelo candidato precisam existir uma única vez nas bases.
expectOnce(consolidated, 'const CANDIDATE_VERSION = "2.0.22";', "2.0.22 / CANDIDATE_VERSION");
expectOnce(consolidated, 'source = source.split("DuduQ Drag & Drop 2.0.18").join("DuduQ Drag & Drop 2.0.22");', "2.0.22 / identity rewrite");

expectOnce(baseAdapter, 'const pairs = pairList(question.answer?.value || question.pairs);', "2.0.18 adapter / pairList");
expectOnce(baseAdapter, '    const items = [];\n    const usedTargets = new Map();', "2.0.18 adapter / adaptPairs items");
expectOnce(baseAdapter, '        rejectWrongDrop: true', "2.0.18 adapter / rejectWrongDrop");

expectOnce(baseRuntime, '  function validateDragDropQuestion(question) {\n    const issues = [];', "2.0.18 runtime / validator");
expectOnce(baseRuntime, '      if (assignedCount > capacity) {', "2.0.18 runtime / assigned capacity");
expectOnce(baseRuntime, '    if (totalCapacity < question.items.length) {', "2.0.18 runtime / total capacity");
expectOnce(baseRuntime, '    const previousFeedbackRef = useRef("idle");\n    const effectiveDisabled = isDragDropInteractionDisabled(disabled, feedbackState);', "2.0.18 runtime / disabled state");
expectOnce(baseRuntime, '        setPlacements((current) => ({ ...current, [itemId]: targetId }));', "2.0.18 runtime / place item");
expectOnce(baseRuntime, '    const allPlaced = question.items.every((item) => Boolean(placements[item.id]));', "2.0.18 runtime / confirm readiness");
expectOnce(baseRuntime, '        const correctItemIds = [];\n        const incorrectItemIds = [];\n        question.items.forEach((item) => {', "2.0.18 runtime / evaluation");

console.log("PASS — Drag & Drop 2.0.23 SINGLE_TARGET_CHOICE static composition contract");
console.log("Canary preservado em R143 / drag-drop 2.0.22");
console.log("M03 isolado em homolog-m03-single-target-v1 / drag-drop 2.0.23");

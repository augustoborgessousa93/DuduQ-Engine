import fs from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";

const ROOT = process.cwd();
const ROUTER = path.join(ROOT, "engine/releases/core/1.0.12-candidate/duduq-router.js");
const SCHEMA = path.join(ROOT, "engine/releases/core/1.0.12-candidate/duduq-schema.js");
const DD_BASE = path.join(ROOT, "engine/releases/mechanics/drag-drop/2.0.18/drag-drop.js");
const DD_222 = path.join(ROOT, "engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeAlternatives() {
  return [
    { id: "A", text: "A" },
    { id: "B", text: "B" },
    { id: "C", text: "C" }
  ];
}

function makeValidSingle(overrides = {}) {
  return {
    id: "router-dd-single-valid",
    statement: "Escolha a opção correta.",
    instruction: "Ouça e arraste.",
    alternatives: makeAlternatives(),
    answer: { type: "single", value: "C" },
    delivery: { mechanic: "drag-drop", preferred: ["drag-drop"] },
    payload: {
      mode: "association",
      strategy: "association",
      items: [
        { id: "A", required: false, spokenText: "A", speechLocale: "en-US" },
        { id: "B", required: false, spokenText: "B", speechLocale: "en-US" },
        { id: "C", required: true, targetId: "answer-target", spokenText: "C", speechLocale: "en-US" }
      ],
      targets: [
        { id: "answer-target", label: "", capacity: 1, kind: "box" }
      ]
    },
    ...overrides
  };
}

const [schemaSource, routerSource, ddBaseSource, dd222Source] = await Promise.all([
  fs.readFile(SCHEMA, "utf8"),
  fs.readFile(ROUTER, "utf8"),
  fs.readFile(DD_BASE, "utf8"),
  fs.readFile(DD_222, "utf8")
]);

// Prova permanente da capacidade real já existente na mecânica.
assert(dd222Source.includes('const BASE_VERSION = "2.0.18";'), "Drag & Drop 2.0.22 deixou de herdar a base 2.0.18.");
assert(ddBaseSource.includes("isObject(question.payload) && Array.isArray(question.payload.items) && Array.isArray(question.payload.targets)"), "buildStage não reconhece payload data-driven.");
assert(ddBaseSource.includes("const requiredItems = adapted.items.filter((item) => item.required !== false);"), "buildStage não preserva distratores required=false.");
assert(ddBaseSource.includes("if (!requiredItems.length)"), "buildStage não exige item obrigatório.");
assert(ddBaseSource.includes("if (!item.targetId || !targetIds.has(item.targetId))"), "buildStage não exige targetId válido para item obrigatório.");
assert(ddBaseSource.includes("if (Array.isArray(question.payload?.items) && Array.isArray(question.payload?.targets)) return true;"), "validate não aceita payload items+targets.");

class TestCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

const context = vm.createContext({
  console,
  structuredClone,
  CustomEvent: TestCustomEvent,
  window: null
});
context.window = context;
context.window.DuduQ = {
  hasMechanic(id) {
    return id === "drag-drop" || id === "bubble-pop";
  },
  listMechanics() {
    return [];
  }
};
context.window.dispatchEvent = () => true;

vm.runInContext(schemaSource, context, { filename: SCHEMA });
vm.runInContext(routerSource, context, { filename: ROUTER });

const router = context.window.DuduQRouter;
assert(router?.version === "1.0.1", `Router candidato inesperado: ${router?.version}`);
assert(JSON.stringify(router.getProfile("drag-drop")?.answerTypes) === JSON.stringify(["pairs", "sequence"]), "Proteção arquitetural violada: single foi adicionado genericamente ao profile.");

function dragCandidate(result) {
  return result.candidates.find((candidate) => candidate.mechanicId === "drag-drop");
}

// A) single + delivery drag-drop + payload data-driven válido -> elegível.
const validSingle = router.select(makeValidSingle());
assert(validSingle.analysis.hasStructuredDragDropPayload === true, "A: payload válido não foi reconhecido.");
assert(dragCandidate(validSingle)?.eligible === true, "A: Drag & Drop data-driven single deveria ser elegível.");
assert(validSingle.selected?.mechanicId === "drag-drop", `A: selecionado ${validSingle.selected?.mechanicId || "null"}.`);
assert(validSingle.analysis.structuredDragDropPayload.requiredItemCount === 1, "A: distratores required=false foram tratados como obrigatórios.");

// B) single + delivery drag-drop sem payload -> inelegível.
const noPayload = makeValidSingle();
delete noPayload.payload;
const noPayloadResult = router.select(noPayload);
assert(noPayloadResult.analysis.hasStructuredDragDropPayload === false, "B: ausência de payload foi marcada como válida.");
assert(dragCandidate(noPayloadResult)?.eligible === false, "B: single sem payload não pode liberar Drag & Drop.");
assert(noPayloadResult.selected === null, "B: delivery explícito não deve cair silenciosamente em outra mecânica.");

// C) pairs continua elegível exatamente pelo contrato anterior.
const pairsResult = router.select({
  id: "router-dd-pairs",
  statement: "Pareie.",
  alternatives: makeAlternatives(),
  answer: { type: "pairs", value: [["A", "B"]] },
  delivery: { mechanic: "drag-drop" }
});
assert(dragCandidate(pairsResult)?.eligible === true, "C: pairs regrediu.");
assert(pairsResult.selected?.mechanicId === "drag-drop", "C: pairs deixou de selecionar Drag & Drop.");

// D) sequence continua elegível exatamente pelo contrato anterior.
const sequenceResult = router.select({
  id: "router-dd-sequence",
  statement: "Ordene.",
  alternatives: makeAlternatives(),
  answer: { type: "sequence", value: ["A", "B", "C"] },
  delivery: { mechanic: "drag-drop" }
});
assert(dragCandidate(sequenceResult)?.eligible === true, "D: sequence regrediu.");
assert(sequenceResult.selected?.mechanicId === "drag-drop", "D: sequence deixou de selecionar Drag & Drop.");

// E) single genérico sem delivery drag-drop não transforma Drag & Drop em candidato automático.
const genericSingle = router.select({
  id: "router-generic-single",
  statement: "Escolha.",
  alternatives: makeAlternatives(),
  answer: { type: "single", value: "A" }
});
assert(dragCandidate(genericSingle)?.eligible === false, "E: single genérico liberou Drag & Drop indevidamente.");
assert(genericSingle.selected?.mechanicId === "bubble-pop", `E: single genérico deveria seguir o perfil existente; selecionado ${genericSingle.selected?.mechanicId || "null"}.`);

// F) payload vazio/inválido continua protegido.
const invalidCases = [
  makeValidSingle({ payload: { items: [], targets: [{ id: "answer-target" }] } }),
  makeValidSingle({ payload: { items: [{ id: "C", required: true, targetId: "missing" }], targets: [{ id: "answer-target" }] } }),
  makeValidSingle({ payload: { items: [{ id: "A", required: false }, { id: "B", required: false }], targets: [{ id: "answer-target" }] } }),
  makeValidSingle({ payload: { items: [{ id: "C", required: true, targetId: "answer-target" }], targets: [] } })
];
for (const [index, question] of invalidCases.entries()) {
  const result = router.select(question);
  assert(result.analysis.hasStructuredDragDropPayload === false, `F${index + 1}: payload inválido foi reconhecido como válido.`);
  assert(dragCandidate(result)?.eligible === false, `F${index + 1}: payload inválido liberou Drag & Drop.`);
  assert(result.selected === null, `F${index + 1}: payload inválido caiu em outra mecânica.`);
}

console.log(JSON.stringify({
  contract: "DUDUQ_ROUTER_DRAG_DROP_DATA_DRIVEN_SINGLE_V1",
  router: router.version,
  protections: {
    singleDataDrivenValid: "PASS",
    singleWithoutPayload: "PASS",
    pairs: "PASS",
    sequence: "PASS",
    genericSingle: "PASS",
    invalidPayload: "PASS"
  }
}, null, 2));

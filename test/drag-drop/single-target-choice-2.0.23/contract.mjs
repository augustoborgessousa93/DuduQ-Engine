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
const activeRuntimePatchPath = "engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js";
const baseAdapterPath = "engine/releases/mechanics/drag-drop/2.0.18/drag-drop.js";
const baseRuntimePath = "engine/releases/mechanics/drag-drop/2.0.18/DUDUQ_DRAG_DROP.html";
const consolidatedPath = "engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js";
const canaryPath = "engine/channels/canary-v1.json";
const homologPath = "engine/channels/homolog-m03-single-target-v1.json";
const m03EntryPath = "content/english/year-2/module-03/index.html";
const m03PatchPath = "content/english/year-2/year2-v23-dragdrop-visual-patch.js";

const candidate = read(candidatePath);
const activeRuntimePatch = read(activeRuntimePatchPath);
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

// 3) M03 deve entrar pelo canal isolado e carregar um único proprietário do pointer antes do loader.
expect(m03Entry.includes('channel:"homolog-m03-single-target-v1"'), "M03 não aponta para o canal isolado do piloto.");
expect(m03Entry.includes('interactionPilot:"SINGLE_TARGET_CHOICE"'), "M03 não declara SINGLE_TARGET_CHOICE no entrypoint.");
expect(m03Entry.includes('dragDropCandidate:"2.0.23"'), "M03 não declara o candidato Drag & Drop 2.0.23.");
expect(m03Entry.includes('engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js'), "M03 não carrega o patch do runtime DD2 ativo.");
expect(!m03Entry.includes('dd2-single-target-pointer-bridge.js'), "M03 ainda carrega a ponte externa de pointer; o piloto deve ter apenas um proprietário do gesto.");
expect(!m03Entry.includes('dd2-single-target-gate-diagnostic.js'), "M03 ainda carrega instrumentação diagnóstica do pointer.");
expect(
  m03Entry.indexOf('dd2-single-target-runtime-patch.js') < m03Entry.indexOf('duduq-loader-v1.js'),
  "Patch DD2 single-owner precisa ser instalado antes do loader."
);

// 4) O patch pedagógico deve ser estritamente gated ao M03 e não vazar para outros módulos.
expect(m03Patch.includes('/^EN2-M3-\\d{2}$/.test'), "Patch do M03 perdeu o gate por ID EN2-M3-xx.");
expect(m03Patch.includes('question.metadata.singleTargetChoice = true'), "Patch não marca singleTargetChoice.");
expect(m03Patch.includes('question.metadata.confirmOnAnySelection = true'), "Patch não marca confirmação para qualquer seleção.");
expect(m03Patch.includes('question.metadata.tapToPlace = true'), "Patch não marca equivalência toque/clique.");
expect(m03Patch.includes('question.metadata.replacePreviousChoice = true'), "Patch não marca substituição da escolha anterior.");
expect(m03Patch.includes('target.kind = "single-choice"'), "Destino não foi marcado como single-choice.");

// 5) O candidato compõe 2.0.22 sem modificar a release imutável.
expect(candidate.includes('const VERSION = "2.0.23"'), "Identidade do candidato 2.0.23 ausente.");
expect(candidate.includes('const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js"'), "Candidato não compõe a base 2.0.22.");
expect(candidate.includes('strategy: "single-target-choice"'), "Estratégia single-target-choice ausente no candidato.");
expect(candidate.includes('correctChoiceId'), "Candidato não separa gabarito da possibilidade de colocação.");
expect(candidate.includes('}, 850);'), "Janela de feedback vermelho/retorno de 850 ms ausente.");

// 5b) O comportamento homologado deve atingir a implementação DD2 realmente renderizada.
expect(activeRuntimePatch.includes('const VERSION = "2.0.23-dd2-single-target-f"'), "Patch ativo não está na revisão de release-cleanup esperada.");
expect(activeRuntimePatch.includes('const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__"'), "Patch ativo não compõe o hook consolidado 2.0.22.");
expect(activeRuntimePatch.includes('.duduq-dd2-target[data-single-target-choice="true"]'), "Patch ativo não estiliza o target DD2 real.");
expect(activeRuntimePatch.includes('"data-single-target-choice":question.strategy === "single-target-choice"'), "Patch ativo não marca o DOM DD2.");
expect(activeRuntimePatch.includes('"data-dd2-item-id":item.id'), "Patch ativo não fornece identidade DOM estável aos cards DD2.");
expect(activeRuntimePatch.includes('positionedCount === 1'), "Patch ativo não habilita CONFIRMAR após uma única escolha.");
expect(activeRuntimePatch.includes('correctChoiceId = question.behavior && question.behavior.correctChoiceId'), "Validação ativa não usa correctChoiceId.");
expect(activeRuntimePatch.includes('correctChoiceId: payload.behavior && payload.behavior.correctChoiceId'), "Normalização DD2 não preserva correctChoiceId do adapter.");
expect(activeRuntimePatch.includes('singleTargetChoice: Boolean(payload.behavior && payload.behavior.singleTargetChoice)'), "Normalização DD2 não preserva singleTargetChoice.");
expect(activeRuntimePatch.includes('place(item.id, singleTarget.id, "tap")'), "Patch ativo não implementa toque/clique equivalente ao arraste.");
expect(activeRuntimePatch.includes('question.strategy === "single-target-choice" || question.strategy === "sequence"') || activeRuntimePatch.includes('question.strategy === "sequence" || question.strategy === "single-target-choice"'), "Patch ativo não inclui retry do single-target.");
expect(activeRuntimePatch.includes('}, 850);') || consolidated.includes('}, 850);'), "Retry de 850 ms não está preservado na composição.");
expect(activeRuntimePatch.includes('.duduq-dd2-capacity'), "Patch ativo não remove visualmente o 0/1 do DD2.");
expect(activeRuntimePatch.includes('.duduq-dd2-bank-items'), "Patch ativo não controla o banco real de alternativas DD2.");

// 5c) Pointer: um único owner nativo estável, gated e sem telemetria global de homologação.
expect(!activeRuntimePatch.includes('window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__'), "Telemetria global do pointer ainda está embutida no runtime candidato.");
expect(!activeRuntimePatch.includes('pointerRuntime.'), "Contadores diagnósticos do pointer ainda estão embutidos no runtime candidato.");
expect(activeRuntimePatch.includes('var singleTargetPointerContextRef = useRef(null)'), "Owner nativo não mantém contexto atual em ref estável.");
expect(activeRuntimePatch.includes('singleTargetPointerContextRef.current = {'), "Contexto atual do pointer não é atualizado por render.");
expect(activeRuntimePatch.includes('if (question.strategy !== "single-target-choice") return;'), "Owner nativo perdeu o gate exclusivo do single-target-choice.");
expect(activeRuntimePatch.includes('document.addEventListener("pointerdown", onSingleTargetPointerDown, true)'), "Owner nativo não captura pointerdown no documento do iframe.");
expect(activeRuntimePatch.includes('document.addEventListener("pointermove", onSingleTargetPointerMove, true)'), "Owner nativo não acompanha pointermove no documento do iframe.");
expect(activeRuntimePatch.includes('document.addEventListener("pointerup", onSingleTargetPointerUp, true)'), "Owner nativo não captura pointerup no documento do iframe.");
expect(activeRuntimePatch.includes('document.addEventListener("pointercancel", onSingleTargetPointerCancel, true)'), "Owner nativo não trata cancelamento do gesto.");
expect(activeRuntimePatch.includes('ctx.place(activeDrag.itemId, targetId, "drop")'), "Arraste single-target não converge para o place() canônico via contexto atual.");
expect(activeRuntimePatch.includes('}, [question.id, question.strategy]);'), "Owner nativo ainda reanexa por dependências voláteis durante o gesto.");
expect(activeRuntimePatch.includes('onPointerDown:question.strategy === "single-target-choice" ? undefined'), "Synthetic pointer antigo continua concorrendo com o owner nativo.");
expect(activeRuntimePatch.includes('onPointerMove:question.strategy === "single-target-choice" ? undefined'), "Synthetic pointermove antigo continua concorrendo com o owner nativo.");
expect(activeRuntimePatch.includes('onPointerUp:question.strategy === "single-target-choice" ? undefined'), "Synthetic pointerup antigo continua concorrendo com o owner nativo.");

// 6) Assinaturas críticas devem continuar únicas nas bases para composição determinística.
expectOnce(consolidated, 'const CANDIDATE_VERSION = "2.0.22";', "2.0.22 / CANDIDATE_VERSION");
expectOnce(consolidated, 'source = source.split("DuduQ Drag & Drop 2.0.18").join("DuduQ Drag & Drop 2.0.22");', "2.0.22 / identity rewrite");
expectOnce(baseAdapter, 'const pairs = pairList(question.answer?.value || question.pairs);', "2.0.18 adapter / pairList");
expectOnce(baseAdapter, '    const items = [];\n    const usedTargets = new Map();', "2.0.18 adapter / adaptPairs items");
expectOnce(baseAdapter, '        rejectWrongDrop: true', "2.0.18 adapter / rejectWrongDrop");
expectOnce(baseRuntime, 'var onItemClick = useCallback(function (item) {', "2.0.18 active DD2 / onItemClick");
expectOnce(baseRuntime, 'var positionedCount = requiredItems.filter(function (item) { return Boolean(locationOf(item.id)); }).length;', "2.0.18 active DD2 / readiness");
expectOnce(baseRuntime, 'var validatePlacement = useCallback(function () {', "2.0.18 active DD2 / validatePlacement");
expectOnce(baseRuntime, '"data-dd2-target-id":target.id,', "2.0.18 active DD2 / target DOM");

console.log("PASS — Drag & Drop 2.0.23 SINGLE_TARGET_CHOICE active DD2 composition contract");
console.log("Canary preservado em R143 / drag-drop 2.0.22");
console.log("M03 isolado em homolog-m03-single-target-v1 / drag-drop 2.0.23");
console.log("Gabarito preservado + single-owner native pointer estável e sem telemetria global");
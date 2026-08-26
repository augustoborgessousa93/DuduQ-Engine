import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const count = (source, needle) => source.split(needle).length - 1;
function expect(condition, message) {
  if (!condition) throw new Error(message);
}
function expectOnce(source, needle, label) {
  const occurrences = count(source, needle);
  expect(occurrences === 1, `${label}: esperado 1, encontrado ${occurrences}`);
}

const candidate = read("engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js");
const runtime = read("engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js");
const baseAdapter = read("engine/releases/mechanics/drag-drop/2.0.18/drag-drop.js");
const baseRuntime = read("engine/releases/mechanics/drag-drop/2.0.18/DUDUQ_DRAG_DROP.html");
const consolidated = read("engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js");
const canary = JSON.parse(read("engine/channels/canary-v1.json"));
const homolog = JSON.parse(read("engine/channels/homolog-m03-single-target-v1.json"));
const publicM03Entry = read("content/english/year-2/module-03/index.html");
const homologHarness = read("test/drag-drop/single-target-choice-2.0.23/m03-homolog.html");
const m03Patch = read("content/english/year-2/year2-v23-dragdrop-visual-patch.js");

// 1) Produção permanece intacta enquanto 2.0.23 entra apenas como release candidate.
expect(canary.revision === 143, `Canary inesperado: revisão ${canary.revision}; esperado 143.`);
expect(canary.mechanics?.["drag-drop"]?.release === "2.0.22", "Canary precisa permanecer em Drag & Drop 2.0.22.");
expect(!JSON.stringify(canary).includes("2.0.23"), "Canary contém referência indevida ao candidato 2.0.23.");
expect(publicM03Entry.includes('channel:"canary-v1"'), "Entry público do M03 deixou de usar Canary durante revisão do RC.");
expect(!publicM03Entry.includes('interactionPilot:"SINGLE_TARGET_CHOICE"'), "Entry público do M03 ativou o piloto antes da promoção.");
expect(!publicM03Entry.includes('dragDropCandidate:"2.0.23"'), "Entry público do M03 referencia 2.0.23 antes da promoção.");
expect(!publicM03Entry.includes('dd2-single-target-runtime-patch.js'), "Entry público do M03 carrega runtime 2.0.23 antes da promoção.");
expect(!publicM03Entry.includes('homolog-m03-single-target-v1'), "Entry público do M03 vazou para o canal de homologação.");

// 2) Homologação continua disponível em harness isolado, sem alterar o entry público.
expect(homolog.policy?.homologationOnly === true, "Canal do piloto precisa ser homologationOnly.");
expect(homolog.mechanics?.["drag-drop"]?.release === "2.0.23", "Canal do piloto não usa Drag & Drop 2.0.23.");
expect(homolog.mechanics?.["drag-drop"]?.adapter === "/engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js", "Adapter incorreto no canal de homologação.");
expect(homologHarness.includes('channel: "homolog-m03-single-target-v1"'), "Harness M03 não aponta para o canal isolado.");
expect(homologHarness.includes('interactionPilot: "SINGLE_TARGET_CHOICE"'), "Harness M03 não declara SINGLE_TARGET_CHOICE.");
expect(homologHarness.includes('dragDropCandidate: "2.0.23"'), "Harness M03 não declara Drag & Drop 2.0.23.");
expect(homologHarness.includes('engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js'), "Harness M03 não carrega o runtime patch 2.0.23.");
expect(!homologHarness.includes('single-target-choice-visual-polish.js'), "Harness ainda depende do polish visual content-side.");
expect(!homologHarness.includes('dd2-single-target-pointer-bridge.js'), "Harness ainda depende do pointer bridge antigo.");
expect(!homologHarness.includes('dd2-single-target-gate-diagnostic.js'), "Harness ainda depende do gate diagnostic antigo.");
expect(homologHarness.indexOf('dd2-single-target-runtime-patch.js') < homologHarness.indexOf('duduq-loader-v1.js'), "Runtime patch precisa ser instalado antes do loader no harness.");

// 3) O patch de conteúdo fica inerte em produção e só ativa o M03 sob opt-in explícito.
expect(m03Patch.includes('window.DUDUQ_PUBLIC_ENTRY?.interactionPilot === "SINGLE_TARGET_CHOICE"'), "Patch M03 perdeu gate explícito de interactionPilot.");
expect(m03Patch.includes('window.DUDUQ_PUBLIC_ENTRY?.dragDropCandidate === "2.0.23"'), "Patch M03 perdeu gate explícito de candidato 2.0.23.");
expect(m03Patch.includes('if (!singleTargetPilotEnabled()) return;'), "Patch M03 não aborta fora do piloto explícito.");
expect(m03Patch.includes('/^EN2-M3-\\d{2}$/.test'), "Patch M03 perdeu gate por ID EN2-M3-xx.");
expect(m03Patch.includes('question.metadata.singleTargetChoice = true'), "singleTargetChoice ausente.");
expect(m03Patch.includes('question.metadata.confirmOnAnySelection = true'), "confirmOnAnySelection ausente.");
expect(m03Patch.includes('question.metadata.tapToPlace = true'), "tapToPlace ausente.");
expect(m03Patch.includes('question.metadata.replacePreviousChoice = true'), "replacePreviousChoice ausente.");
expect(m03Patch.includes('target.kind = "single-choice"'), "Destino não foi marcado como single-choice.");

// 4) Adapter 2.0.23 compõe a release imutável 2.0.22.
expect(candidate.includes('const VERSION = "2.0.23"'), "Identidade do candidato ausente.");
expect(candidate.includes('const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js"'), "Candidato não compõe 2.0.22.");
expect(candidate.includes('strategy: "single-target-choice"'), "Estratégia single-target-choice ausente.");
expect(candidate.includes('correctChoiceId'), "Adapter não separa gabarito da possibilidade de colocação.");
expect(candidate.includes('}, 850);'), "Retry/retorno de 850ms ausente do candidato.");

// 5) Runtime ativo: comportamento, pointer e visuais pertencem ao candidato.
expect(runtime.includes('const VERSION = "2.0.23-dd2-single-target-g"'), "Runtime patch não está na revisão consolidada esperada.");
expect(runtime.includes('const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__"'), "Runtime não compõe o hook 2.0.22.");
expect(runtime.includes('const RUNTIME_STYLE_ID = "duduq-dd23-single-target-runtime-style"'), "Identidade do CSS consolidado ausente.");
expect(runtime.includes('const COMPACT_HOST_ATTRIBUTE = "data-duduq-host-compact-viewport"'), "Contrato de viewport compacto ausente.");
expect(runtime.includes('hostWindow = window.parent'), "Viewport compacto não considera o host.");
expect(runtime.includes('width <= 1100 && height <= 800'), "Regra tablet/notebook de viewport compacto ausente.");
expect(runtime.includes('`<style id="${RUNTIME_STYLE_ID}">${SINGLE_TARGET_CSS}</style>${COMPACT_VIEWPORT_SCRIPT}</head>`'), "CSS/viewport não são injetados pelo runtime candidato.");
expect(runtime.includes('.duduq-dd2-target[data-single-target-choice="true"]'), "Runtime não estiliza o target real.");
expect(runtime.includes('.duduq-dd2-bank-items'), "Runtime não controla o banco real de alternativas.");
expect(runtime.includes('.duduq-dd2-capacity'), "Runtime não esconde a capacidade 0/1.");
expect(runtime.includes('"data-single-target-choice":question.strategy === "single-target-choice"'), "Runtime não marca o DOM single-target.");
expect(runtime.includes('"data-dd2-item-id":item.id'), "Runtime não fornece identidade estável aos cards.");
expect(runtime.includes('positionedCount === 1'), "CONFIRMAR não habilita por uma única escolha.");
expect(runtime.includes('correctChoiceId = question.behavior && question.behavior.correctChoiceId'), "Validação não usa correctChoiceId.");
expect(runtime.includes('correctChoiceId: payload.behavior && payload.behavior.correctChoiceId'), "Normalização não preserva correctChoiceId.");
expect(runtime.includes('singleTargetChoice: Boolean(payload.behavior && payload.behavior.singleTargetChoice)'), "Normalização não preserva singleTargetChoice.");
expect(runtime.includes('place(item.id, singleTarget.id, "tap")'), "Tap não converge para place().");
expect(runtime.includes('ctx.place(activeDrag.itemId, targetId, "drop")'), "Drag não converge para place().");
expect(runtime.includes('if (question.strategy !== "single-target-choice") return;'), "Owner nativo perdeu o gate single-target.");
expect(runtime.includes('document.addEventListener("pointerdown", onSingleTargetPointerDown, true)'), "Owner nativo não captura pointerdown.");
expect(runtime.includes('document.addEventListener("pointermove", onSingleTargetPointerMove, true)'), "Owner nativo não captura pointermove.");
expect(runtime.includes('document.addEventListener("pointerup", onSingleTargetPointerUp, true)'), "Owner nativo não captura pointerup.");
expect(runtime.includes('document.addEventListener("pointercancel", onSingleTargetPointerCancel, true)'), "Owner nativo não trata pointercancel.");
expect(runtime.includes('}, [question.id, question.strategy]);'), "Owner nativo reanexa por dependências voláteis.");
expect(runtime.includes('onPointerDown:question.strategy === "single-target-choice" ? undefined'), "Synthetic pointer antigo concorre com o owner nativo.");
expect(runtime.includes('onPointerMove:question.strategy === "single-target-choice" ? undefined'), "Synthetic pointermove antigo concorre com o owner nativo.");
expect(runtime.includes('onPointerUp:question.strategy === "single-target-choice" ? undefined'), "Synthetic pointerup antigo concorre com o owner nativo.");
expect(runtime.includes('question.strategy === "sequence" || question.strategy === "single-target-choice"'), "Retry single-target não está composto com sequence.");
expect(runtime.includes('}, 850);') || consolidated.includes('}, 850);'), "Retry de 850ms não está preservado na composição.");
expect(!runtime.includes('window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__'), "Telemetria global do pointer voltou ao runtime.");
expect(!runtime.includes('pointerRuntime.'), "Contadores diagnósticos voltaram ao runtime.");

// 6) Assinaturas críticas da base continuam determinísticas.
expectOnce(consolidated, 'const CANDIDATE_VERSION = "2.0.22";', "2.0.22 / CANDIDATE_VERSION");
expectOnce(consolidated, 'source = source.split("DuduQ Drag & Drop 2.0.18").join("DuduQ Drag & Drop 2.0.22");', "2.0.22 / identity rewrite");
expectOnce(baseAdapter, 'const pairs = pairList(question.answer?.value || question.pairs);', "2.0.18 adapter / pairList");
expectOnce(baseAdapter, '    const items = [];\n    const usedTargets = new Map();', "2.0.18 adapter / adaptPairs items");
expectOnce(baseAdapter, '        rejectWrongDrop: true', "2.0.18 adapter / rejectWrongDrop");
expectOnce(baseRuntime, 'var onItemClick = useCallback(function (item) {', "2.0.18 DD2 / onItemClick");
expectOnce(baseRuntime, 'var positionedCount = requiredItems.filter(function (item) { return Boolean(locationOf(item.id)); }).length;', "2.0.18 DD2 / readiness");
expectOnce(baseRuntime, 'var validatePlacement = useCallback(function () {', "2.0.18 DD2 / validatePlacement");
expectOnce(baseRuntime, '"data-dd2-target-id":target.id,', "2.0.18 DD2 / target DOM");

console.log("PASS — Drag & Drop 2.0.23 SINGLE_TARGET_CHOICE release-candidate composition contract");
console.log("Canary e entry público M03 preservados em R143 / drag-drop 2.0.22");
console.log("M03 2.0.23 exercitado somente pelo harness isolado de homologação");
console.log("Pointer, scoring e visuais consolidados no candidato; ativação de conteúdo exige opt-in explícito");
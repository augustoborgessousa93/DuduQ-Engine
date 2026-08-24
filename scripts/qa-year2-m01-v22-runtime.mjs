import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleDir = path.join(root, "content", "english", "year-2", "module-01");
const corePath = path.join(root, "content", "english", "year-2", "year2-v22-homolog-core.js");
const runtimePath = path.join(moduleDir, "module-01-v22-homolog.js");
const pagePath = path.join(moduleDir, "homolog-v22-runtime.html");
const canonicalPath = path.join(moduleDir, "module-01-v22-canonical.json");

const core = fs.readFileSync(corePath, "utf8");
const source = fs.readFileSync(runtimePath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));

function check(condition, message) { if (!condition) throw new Error(message); }
function resolvedAnswer(question) {
  const alternatives = question.alternatives || [];
  if (question.answer?.type === "single") {
    return alternatives.find((alternative) => alternative.id === question.answer.value)?.text || null;
  }
  if (question.answer?.type === "pairs") {
    const pair = Array.isArray(question.answer.value) ? question.answer.value[0] : null;
    return alternatives.find((alternative) => alternative.id === pair?.source)?.text || null;
  }
  return null;
}

const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(core, sandbox, { filename: corePath });
check(sandbox.window.DuduQYear2V22Factory?.version === "1.2.0-homolog-core", "Factory v1.2 não carregou");
vm.runInContext(source, sandbox, { filename: runtimePath });

const moduleDefinition = sandbox.window.DUDUQ_CONTENT?.english?.year2?.module01v22homolog;
check(moduleDefinition, "Runtime v2.2 não registrou module01v22homolog");
check(moduleDefinition.version === "2.2.0-v12-homolog-e", `Versão inesperada: ${moduleDefinition.version}`);
check(moduleDefinition.year === 2 && moduleDefinition.module === 1, "Escopo deve ser 2º ano / M01");
check(moduleDefinition.normativeProfile?.profile === "Y2_FOUNDATIONAL_LITERACY", "Perfil Y2 v1.2 ausente");
check(moduleDefinition.normativeProfile?.reading.includes("R1"), "M01 deve declarar R0 dominante / R1 máximo");
check(Array.isArray(moduleDefinition.source?.pages) && moduleDefinition.source.pages.join(",") === "14,15", "Fonte deve apontar para páginas 14–15");

const questions = moduleDefinition.activities.flatMap((activity) => (activity.questions || []).map((question) => ({ activity, question })));
const runnableIds = questions.map(({ question }) => question.id);
const blocked = moduleDefinition.blockedItems || [];
const blockedIds = blocked.map((item) => item.id);
const expectedAll = Array.from({ length: 15 }, (_, index) => `EN2-M1-${String(index + 1).padStart(2, "0")}`);
const expectedRunnable = expectedAll.filter((id) => id !== "EN2-M1-12");
check(runnableIds.length === 14, `M01 deve ter 14 executáveis; atual=${runnableIds.length}`);
check(new Set(runnableIds).size === 14, "M01 possui IDs duplicados");
check(expectedRunnable.every((id) => runnableIds.includes(id)), "M01 não contém todos os 14 IDs liberados");
check(blocked.length === 1 && blockedIds[0] === "EN2-M1-12", "Somente EN2-M1-12 pode permanecer bloqueado");
check(new Set([...runnableIds, ...blockedIds]).size === 15, "Executáveis + bloqueado devem totalizar 15 IDs");

const canonicalById = new Map(canonical.items.map((item) => [item.id, item]));
for (const { activity, question } of questions) {
  const sourceItem = canonicalById.get(question.id);
  check(sourceItem, `${question.id}: ausente no manifesto canônico`);
  check(question.delivery?.mechanic === activity.mechanic && question.delivery.mechanic !== "auto", `${question.id}: mecânica explícita inválida`);
  const texts = (question.alternatives || []).map((alternative) => alternative.text);
  check(JSON.stringify(texts) === JSON.stringify(sourceItem.alternatives), `${question.id}: alternativas divergem da v2.2`);
  const selected = resolvedAnswer(question);
  check(selected === sourceItem.answer, `${question.id}: resposta diverge da v2.2; atual=${selected}; esperada=${sourceItem.answer}`);
  check(["R0", "R0-R1", "R1"].includes(question.metadata?.readingDemand), `${question.id}: readingDemand fora de R0/R1`);
  check(question.metadata?.sourceVersion === "2.2", `${question.id}: sourceVersion deve ser 2.2`);
  check(question.metadata?.factorySpec === "1.2.0", `${question.id}: factorySpec deve ser 1.2.0`);
}

const byMechanic = questions.reduce((acc, { activity }) => { acc[activity.mechanic] = (acc[activity.mechanic] || 0) + 1; return acc; }, {});
check(!byMechanic.matching, `M01 não deve executar Matching como single-choice; atual=${byMechanic.matching || 0}`);
check(byMechanic["drag-drop"] === 8, `M01 deve executar 8 itens single-choice de áudio em Drag & Drop; atual=${byMechanic["drag-drop"]}`);
check(byMechanic["target-shooter"] === 3, `M01 deve executar 3 itens em Target Shooter; atual=${byMechanic["target-shooter"]}`);
check(byMechanic["bubble-pop"] === 2, `M01 deve executar 2 itens em Bubble Pop; atual=${byMechanic["bubble-pop"]}`);
check(byMechanic["word-slash"] === 1, `M01 deve executar 1 Word Slash; atual=${byMechanic["word-slash"]}`);
check(Math.max(...Object.values(byMechanic)) / questions.length <= 0.70, "M01 excedeu 70% de concentração mecânica");

const getQuestion = (id) => questions.find((entry) => entry.question.id === id)?.question;
const slash = getQuestion("EN2-M1-08");
check(slash.delivery.mechanic === "word-slash", "EN2-M1-08 deve ser o único Word Slash");
check(slash.metadata?.wordSlash?.target?.hideValue === true, "EN2-M1-08 deve ocultar o alvo");
check(slash.metadata?.wordSlash?.difficulty?.maxObjects === 3, "Word Slash Y2 deve limitar a 3 objetos simultâneos");
check(slash.metadata?.wordSlash?.difficulty?.speedMinMs >= 6500, "Word Slash Y2 está rápido demais");
check(slash.metadata?.wordSlash?.difficulty?.wrongPenalty === 0, "Word Slash Y2 não pode penalizar erro/tempo");
check(JSON.stringify(slash.metadata?.wordSlash?.objects?.map((item) => item.value)) === JSON.stringify(["C", "A", "B", "D"]), "Word Slash deve preservar C/A/B/D");

const migratedIds = ["EN2-M1-01","EN2-M1-02","EN2-M1-03","EN2-M1-04","EN2-M1-05","EN2-M1-11","EN2-M1-13","EN2-M1-14"];
for (const id of migratedIds) {
  const item = getQuestion(id);
  check(item.delivery.mechanic === "drag-drop", `${id}: single-choice de áudio deve usar Drag & Drop nesta candidata`);
  check(item.answer?.type === "pairs" && item.answer.value?.length === 1, `${id}: deve preservar uma única resposta correta em pares`);
  check(item.alternatives.every((alternative) => alternative.audio?.enabled && alternative.audio?.text), `${id}: todas as alternativas devem oferecer áudio tocável`);
  check(item.metadata?.optionAudioRequired === true, `${id}: optionAudioRequired deve permanecer explícito`);
  check(item.metadata?.runtimeMechanicOverride?.from === "matching" && item.metadata.runtimeMechanicOverride.to === "drag-drop", `${id}: override Matching→Drag & Drop deve ser auditável`);
}

const item03 = getQuestion("EN2-M1-03");
check(!item03.image?.enabled, "EN2-M1-03 não deve declarar imagem principal incompatível com o perfil Router do Drag & Drop");
check(item03.metadata?.targets?.[0]?.imageSrc, "EN2-M1-03 deve manter apoio visual noturno dentro do alvo Drag & Drop");
check(item03.metadata?.contextualVisualPlacement === "drag-drop-target", "EN2-M1-03 deve auditar o posicionamento contextual da imagem");
const item15 = getQuestion("EN2-M1-15");
check(item15.delivery.mechanic === "target-shooter", "EN2-M1-15 deve usar Target Shooter nesta candidata");
check(item15.metadata?.sourceAnswer === "BAG", "EN2-M1-15 deve preservar BAG");

const blocked12 = blocked[0];
const canonical12 = canonicalById.get("EN2-M1-12");
check(blocked12.editorialAnswer === "LEO", "EN2-M1-12 bloqueado deve preservar LEO");
check(JSON.stringify(blocked12.editorialAlternatives) === JSON.stringify(["LEO", "LOE", "LEA", "ELO"]), "EN2-M1-12 deve preservar alternativas editoriais");
check(blocked12.intendedMechanic === "drag-drop", "EN2-M1-12 deve manter Drag & Drop como intenção");
check(/não exibir as letras durante a primeira escuta/i.test(canonical12.media), "Fonte canônica deve preservar gate da primeira escuta sem letras");

check(page.includes('modulePath: ["english", "year2", "module01v22homolog"]'), "Página deve apontar para module01v22homolog");
check(page.includes('contentScript: "./module-01-v22-homolog.js?v=2"'), "Página deve carregar o M01 v2.2 atualizado");
check(page.includes('../year2-v22-homolog-core.js?v=1'), "Página deve carregar Factory v1.2 antes do módulo");
check(page.includes('channel: "canary-v1"'), "Página deve continuar ancorada no Canary 143");

console.log("DUDUQ YEAR2 M01 V2.2 + FACTORY V1.2 RUNTIME OVERRIDES: PASS");
console.log(JSON.stringify({ runnableItems: runnableIds.length, blockedItems: blockedIds, mechanics: byMechanic, migratedFromMatching: migratedIds, contextualVisual: "EN2-M1-03@drag-drop-target", wordSlashPilot: "EN2-M1-08", runtimeKey: "module01v22homolog" }, null, 2));

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleDir = path.join(root, "content", "english", "year-2", "module-01");
const corePath = path.join(root, "content", "english", "year-2", "year2-v22-homolog-core.js");
const runtimePath = path.join(moduleDir, "module-01-v22-homolog.js");
const pagePath = path.join(moduleDir, "homolog-v22-runtime.html");
const gatePath = path.join(moduleDir, "m1-12-first-listen-gate.js");
const canonicalPath = path.join(moduleDir, "module-01-v22-canonical.json");

const core = fs.readFileSync(corePath, "utf8");
const source = fs.readFileSync(runtimePath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");
const gateSource = fs.readFileSync(gatePath, "utf8");
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));

function check(condition, message) { if (!condition) throw new Error(message); }
function resolvedAnswer(question) {
  const alternatives = question.alternatives || [];
  if (question.answer?.type === "single") {
    return alternatives.find((alternative) => alternative.id === question.answer.value)?.text || null;
  }
  if (question.answer?.type === "pairs") {
    const pairs = Array.isArray(question.answer.value) ? question.answer.value : [];
    return pairs.map((pair) => alternatives.find((alternative) => alternative.id === pair?.source)?.text || "").join("");
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
check(moduleDefinition.version === "2.2.0-v12-homolog-f", `Versão inesperada: ${moduleDefinition.version}`);
check(moduleDefinition.year === 2 && moduleDefinition.module === 1, "Escopo deve ser 2º ano / M01");
check(moduleDefinition.normativeProfile?.profile === "Y2_FOUNDATIONAL_LITERACY", "Perfil Y2 v1.2 ausente");
check(moduleDefinition.normativeProfile?.reading.includes("R1"), "M01 deve declarar R0 dominante / R1 máximo");
check(Array.isArray(moduleDefinition.source?.pages) && moduleDefinition.source.pages.join(",") === "14,15", "Fonte deve apontar para páginas 14–15");

const questions = moduleDefinition.activities.flatMap((activity) => (activity.questions || []).map((question) => ({ activity, question })));
const runnableIds = questions.map(({ question }) => question.id);
const blocked = moduleDefinition.blockedItems || [];
const expectedAll = Array.from({ length: 15 }, (_, index) => `EN2-M1-${String(index + 1).padStart(2, "0")}`);
check(runnableIds.length === 15, `M01 deve ter 15 executáveis; atual=${runnableIds.length}`);
check(new Set(runnableIds).size === 15, "M01 possui IDs duplicados");
check(expectedAll.every((id) => runnableIds.includes(id)), "M01 não contém todos os 15 IDs oficiais");
check(blocked.length === 0, `M01 não deve manter bloqueios após o gate de primeira escuta; atual=${blocked.map((item) => item.id).join(",")}`);

const canonicalById = new Map(canonical.items.map((item) => [item.id, item]));
for (const { activity, question } of questions) {
  const sourceItem = canonicalById.get(question.id);
  check(sourceItem, `${question.id}: ausente no manifesto canônico`);
  check(question.delivery?.mechanic === activity.mechanic && question.delivery.mechanic !== "auto", `${question.id}: mecânica explícita inválida`);
  const texts = (question.alternatives || []).map((alternative) => alternative.text);
  if (question.id === "EN2-M1-12") {
    check(JSON.stringify(question.metadata?.editorialAlternatives) === JSON.stringify(sourceItem.alternatives), `${question.id}: alternativas editoriais da v2.2 não foram preservadas`);
  } else {
    check(JSON.stringify(texts) === JSON.stringify(sourceItem.alternatives), `${question.id}: alternativas divergem da v2.2`);
  }
  const selected = resolvedAnswer(question);
  check(selected === sourceItem.answer, `${question.id}: resposta diverge da v2.2; atual=${selected}; esperada=${sourceItem.answer}`);
  check(["R0", "R0-R1", "R1"].includes(question.metadata?.readingDemand), `${question.id}: readingDemand fora de R0/R1`);
  check(question.metadata?.sourceVersion === "2.2", `${question.id}: sourceVersion deve ser 2.2`);
  check(question.metadata?.factorySpec === "1.2.0", `${question.id}: factorySpec deve ser 1.2.0`);
}

const byMechanic = questions.reduce((acc, { activity }) => { acc[activity.mechanic] = (acc[activity.mechanic] || 0) + 1; return acc; }, {});
check(!byMechanic.matching, `M01 não deve executar Matching como single-choice; atual=${byMechanic.matching || 0}`);
check(byMechanic["drag-drop"] === 9, `M01 deve executar 9 itens em Drag & Drop incluindo M01-12; atual=${byMechanic["drag-drop"]}`);
check(byMechanic["target-shooter"] === 3, `M01 deve executar 3 itens em Target Shooter; atual=${byMechanic["target-shooter"]}`);
check(byMechanic["bubble-pop"] === 2, `M01 deve executar 2 itens em Bubble Pop; atual=${byMechanic["bubble-pop"]}`);
check(byMechanic["word-slash"] === 1, `M01 deve executar 1 Word Slash; atual=${byMechanic["word-slash"]}`);
check(Math.max(...Object.values(byMechanic)) / questions.length <= 0.70, "M01 excedeu 70% de concentração mecânica");

const getEntry = (id) => questions.find((entry) => entry.question.id === id);
const getQuestion = (id) => getEntry(id)?.question;
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

const item12Entry = getEntry("EN2-M1-12");
const item12 = item12Entry.question;
const canonical12 = canonicalById.get("EN2-M1-12");
check(item12.delivery.mechanic === "drag-drop", "EN2-M1-12 deve usar Drag & Drop após a primeira escuta");
check(item12.answer?.type === "pairs" && item12.answer.value?.length === 3, "EN2-M1-12 deve montar três posições L-E-O");
check(JSON.stringify(item12.alternatives.map((item) => item.text)) === JSON.stringify(["L","E","O","A"]), "EN2-M1-12 deve oferecer L/E/O + A distrator somente após a primeira escuta");
check(item12.metadata?.editorialAnswer === "LEO", "EN2-M1-12 deve preservar resposta editorial LEO");
check(JSON.stringify(item12.metadata?.editorialAlternatives) === JSON.stringify(["LEO","LOE","LEA","ELO"]), "EN2-M1-12 deve preservar alternativas editoriais originais");
check(item12.metadata?.firstListenGate?.required === true, "EN2-M1-12 deve exigir firstListenGate");
check(item12.metadata?.firstListenGate?.hideMovablesBeforeFirstListen === true, "EN2-M1-12 deve ocultar letras móveis antes da primeira escuta");
check(item12.metadata?.firstListenGate?.commercialRecordedAudioRequired === true, "EN2-M1-12 deve manter gate de áudio gravado comercial");
check(item12.metadata?.targets?.length === 3, "EN2-M1-12 deve possuir três posições de montagem");
check(item12Entry.activity.id === "en2-m1-12-drag-drop" && item12Entry.activity.questions.length === 1, "EN2-M1-12 deve ficar isolado em atividade própria para o gate");
check(/não exibir as letras durante a primeira escuta/i.test(canonical12.media), "Fonte canônica deve preservar gate da primeira escuta sem letras");

const item15 = getQuestion("EN2-M1-15");
check(item15.delivery.mechanic === "target-shooter", "EN2-M1-15 deve usar Target Shooter nesta candidata");
check(item15.metadata?.sourceAnswer === "BAG", "EN2-M1-15 deve preservar BAG");

check(page.includes('modulePath: ["english", "year2", "module01v22homolog"]'), "Página deve apontar para module01v22homolog");
check(page.includes('contentScript: "./module-01-v22-homolog.js?v=2"'), "Página deve carregar o M01 v2.2 atualizado");
check(page.includes('../year2-v22-homolog-core.js?v=1'), "Página deve carregar Factory v1.2 antes do módulo");
check(page.includes('./m1-12-first-listen-gate.js?v=1'), "Página deve carregar o gate de primeira escuta do M01-12");
check(page.includes('runnableItems: 15'), "Página deve declarar 15 itens executáveis");
check(page.includes('blockedItems: []'), "Página não deve declarar M01-12 como bloqueado");
check(page.includes('channel: "canary-v1"'), "Página deve continuar ancorada no Canary 143");

check(gateSource.includes('const STEP_ID = "en2-m1-12-drag-drop"'), "Gate deve apontar para a atividade isolada M01-12");
check(gateSource.includes('visibility", "hidden"'), "Gate deve ocultar o iframe antes da primeira escuta");
check(gateSource.includes('SpeechSynthesisUtterance(STIMULUS)'), "Gate deve iniciar áudio antes do reveal");
check(gateSource.includes('utterance.onend = finish'), "Reveal deve depender da conclusão do áudio");
check(gateSource.includes('commercialRecordedAudioRequired') === false, "Bridge visual não deve fingir áudio comercial final");

console.log("DUDUQ YEAR2 M01 V2.2 + FACTORY V1.2 + FIRST LISTEN GATE: PASS");
console.log(JSON.stringify({ runnableItems: runnableIds.length, blockedItems: [], mechanics: byMechanic, migratedFromMatching: migratedIds, contextualVisual: "EN2-M1-03@drag-drop-target", firstListenGate: "EN2-M1-12", wordSlashPilot: "EN2-M1-08", runtimeKey: "module01v22homolog" }, null, 2));

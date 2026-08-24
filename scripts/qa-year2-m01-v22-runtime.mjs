import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleDir = path.join(root, "content", "english", "year-2", "module-01");
const runtimePath = path.join(moduleDir, "module-01-v22-homolog.js");
const pagePath = path.join(moduleDir, "homolog-v22-runtime.html");
const canonicalPath = path.join(moduleDir, "module-01-v22-canonical.json");

const source = fs.readFileSync(runtimePath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));

function fail(message) {
  throw new Error(message);
}

function check(condition, message) {
  if (!condition) fail(message);
}

const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: runtimePath });

const moduleDefinition = sandbox.window.DUDUQ_CONTENT?.english?.year2?.module01v22homolog;
check(moduleDefinition, "Runtime v2.2 não registrou module01v22homolog");
check(moduleDefinition.version === "2.2.0-homolog-runtime-a", "Versão inesperada do runtime v2.2");
check(moduleDefinition.year === 2 && moduleDefinition.module === 1, "Escopo do runtime deve ser 2º ano / M01");
check(moduleDefinition.source?.document?.includes("v2.2"), "Runtime deve declarar a fonte editorial v2.2");
check(Array.isArray(moduleDefinition.source?.pages) && moduleDefinition.source.pages.join(",") === "14,15", "Runtime deve apontar para páginas 14–15");

const questions = moduleDefinition.activities.flatMap((activity) =>
  (activity.questions || []).map((question) => ({ activity, question }))
);
const runnableIds = questions.map(({ question }) => question.id);
const blocked = moduleDefinition.blockedItems || [];
const blockedIds = blocked.map((item) => item.id);

const expectedAll = Array.from({ length: 15 }, (_, index) => `EN2-M1-${String(index + 1).padStart(2, "0")}`);
const expectedRunnable = expectedAll.filter((id) => id !== "EN2-M1-12");

check(runnableIds.length === 14, `Runtime A deve ter 14 itens executáveis; atual=${runnableIds.length}`);
check(new Set(runnableIds).size === 14, "Runtime A possui IDs executáveis duplicados");
check(expectedRunnable.every((id) => runnableIds.includes(id)), "Runtime A não contém todos os 14 IDs liberados");
check(blocked.length === 1 && blockedIds[0] === "EN2-M1-12", "Somente EN2-M1-12 pode permanecer bloqueado nesta candidata");
check(new Set([...runnableIds, ...blockedIds]).size === 15, "Itens executáveis + bloqueados devem contabilizar os 15 IDs oficiais");
check(expectedAll.every((id) => runnableIds.includes(id) || blockedIds.includes(id)), "Algum ID oficial não foi contabilizado");

const canonicalById = new Map(canonical.items.map((item) => [item.id, item]));
for (const { activity, question } of questions) {
  const sourceItem = canonicalById.get(question.id);
  check(sourceItem, `${question.id}: ausente no manifesto canônico`);
  check(activity.mechanic === sourceItem.homologationDecision.mechanic, `${question.id}: mecânica do runtime diverge do plano auditado`);
  check(question.delivery?.mechanic === activity.mechanic, `${question.id}: delivery.mechanic diverge da atividade`);

  const texts = (question.alternatives || []).map((alternative) => alternative.text);
  check(JSON.stringify(texts) === JSON.stringify(sourceItem.alternatives), `${question.id}: alternativas do runtime divergem da v2.2`);

  const selected = (question.alternatives || []).find((alternative) => alternative.id === question.answer?.value);
  check(selected?.text === sourceItem.answer, `${question.id}: resposta executável diverge da resposta editorial ${sourceItem.answer}`);
  check(["R0", "R0-R1", "R1"].includes(question.metadata?.readingDemand), `${question.id}: demanda de leitura fora do padrão Y2`);
}

const byMechanic = questions.reduce((acc, { activity }) => {
  acc[activity.mechanic] = (acc[activity.mechanic] || 0) + 1;
  return acc;
}, {});
check(byMechanic["target-shooter"] === 5, "Runtime A deve executar 5 itens em Target Shooter");
check(byMechanic.matching === 4, "Runtime A deve executar 4 itens em Matching");
check(byMechanic["bubble-pop"] === 4, "Runtime A deve executar 4 itens em Bubble Pop");
check(byMechanic["word-slash"] === 1, "Runtime A deve executar 1 item em Word Slash");
check(!byMechanic["drag-drop"], "EN2-M1-12 bloqueado: Drag & Drop ainda não deve aparecer no Runtime A");

const getQuestion = (id) => questions.find((entry) => entry.question.id === id)?.question;
const slash = getQuestion("EN2-M1-08");
check(slash.delivery.mechanic === "word-slash", "EN2-M1-08 deve ser o único Word Slash");
check(slash.metadata?.wordSlash?.target?.hideValue === true, "EN2-M1-08 deve ocultar o valor-alvo");
check(slash.metadata?.wordSlash?.difficulty?.maxObjects === 3, "Word Slash Y2 deve limitar a 3 objetos simultâneos");
check(slash.metadata?.wordSlash?.difficulty?.speedMinMs >= 6500, "Word Slash Y2 está rápido demais");
check(slash.metadata?.wordSlash?.difficulty?.timeLimitSeconds === 60, "Word Slash Y2 deve manter 60 s na homologação");
const slashObjects = slash.metadata?.wordSlash?.objects?.map((item) => item.value) || [];
check(JSON.stringify(slashObjects) === JSON.stringify(["C", "A", "B", "D"]), "Word Slash deve preservar o conjunto editorial C/A/B/D");

for (const id of ["EN2-M1-11", "EN2-M1-13"]) {
  const item = getQuestion(id);
  check(item.delivery.mechanic === "matching", `${id}: deve usar Matching`);
  check(item.metadata?.optionAudioRequired === true, `${id}: optionAudio deve ser obrigatório`);
  check(item.alternatives.every((alternative) => alternative.audio?.enabled && alternative.audio?.text), `${id}: todas as alternativas devem oferecer áudio`);
  check(item.metadata?.matching?.rightItems?.length === 4, `${id}: Matching deve preservar quatro opções`);
  check(item.metadata.matching.rightItems.every((right) => right.spokenText), `${id}: cada opção do Matching deve possuir spokenText`);
  check(item.metadata?.matching?.pairs?.length === 1, `${id}: a adaptação deve preservar seleção única, não exigir múltiplos pareamentos`);
}

const item03 = getQuestion("EN2-M1-03");
check(item03.image?.enabled === true && item03.image?.src, "EN2-M1-03 deve manter a imagem de rotina noturna exigida pela v2.2");

const item15 = getQuestion("EN2-M1-15");
check(item15.alternatives[item15.answer.value === "opt-1" ? 0 : -1]?.text === "BAG", "EN2-M1-15 deve preservar BAG como resposta");

const blocked12 = blocked[0];
check(blocked12.editorialAnswer === "LEO", "EN2-M1-12 bloqueado deve preservar resposta LEO");
check(JSON.stringify(blocked12.editorialAlternatives) === JSON.stringify(["LEO", "LOE", "LEA", "ELO"]), "EN2-M1-12 bloqueado deve preservar alternativas editoriais");
check(/não exibir as letras durante a primeira escuta/i.test(blocked12.requiredMediaRule), "EN2-M1-12 deve registrar explicitamente o gate de primeira escuta sem letras");
check(blocked12.intendedMechanic === "drag-drop", "EN2-M1-12 deve manter Drag & Drop como intenção após o gate");

check(!/GOOD MORNING\.\s*\n?.*EN2-M1-12/i.test(source), "Runtime v2.2 não pode reintroduzir o conteúdo antigo do EN2-M1-12");
check(!/Organize as palavras para formar SEE YOU/i.test(source), "Runtime v2.2 não pode reintroduzir o conteúdo antigo do EN2-M1-15");

check(page.includes('modulePath: ["english", "year2", "module01v22homolog"]'), "Página de homologação deve apontar para chave isolada module01v22homolog");
check(page.includes('contentScript: "./module-01-v22-homolog.js?v=1"'), "Página de homologação deve carregar o runtime v2.2 isolado");
check(page.includes('channel: "canary-v1"'), "Página v2.2 deve continuar ancorada no Canary 143");

console.log("DUDUQ YEAR2 M01 V2.2 RUNTIME A: PASS");
console.log(JSON.stringify({
  runnableItems: runnableIds.length,
  blockedItems: blockedIds,
  mechanics: byMechanic,
  wordSlashPilot: "EN2-M1-08",
  runtimeKey: "module01v22homolog"
}, null, 2));

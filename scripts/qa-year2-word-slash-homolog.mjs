import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleDir = path.join(root, "content", "english", "year-2", "module-01");
const overlayPath = path.join(moduleDir, "module-01-word-slash-homolog.js");
const modulePath = path.join(moduleDir, "module-01.js");
const policyPath = path.join(root, "content", "english", "year-2", "HOMOLOGATION_WORD_SLASH_POLICY.json");
const canaryPath = path.join(root, "engine", "channels", "canary-v1.json");

function loadText(file) {
  return fs.readFileSync(file, "utf8");
}

function fail(message) {
  throw new Error(message);
}

function check(condition, message) {
  if (!condition) fail(message);
}

function allQuestions(moduleDefinition) {
  return (moduleDefinition.activities || []).flatMap((activity) =>
    (activity.questions || []).map((question) => ({ activity, question }))
  );
}

const policy = JSON.parse(loadText(policyPath));
const canary = JSON.parse(loadText(canaryPath));

check(canary.revision === 143, `Canary base inesperado: ${canary.revision}`);
check(canary.policy?.wordSlashApproved === true, "Canary 143 não registra wordSlashApproved=true");
check(policy.scope?.baseCanaryRevision === 143, "Política não está ancorada na Revision 143");
check(policy.scope?.year === 2, "Política não está limitada ao 2º ano");
check(policy.publicationGate?.noAutomaticPromotion === true, "Política precisa bloquear promoção automática");
check(policy.publicationGate?.canary143MustRemainUnchanged === true, "Política precisa preservar Canary 143");

const sandbox = {
  window: {},
  console,
  setTimeout,
  clearTimeout,
  structuredClone: globalThis.structuredClone
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

vm.runInContext(loadText(overlayPath), sandbox, { filename: overlayPath });
vm.runInContext(loadText(modulePath), sandbox, { filename: modulePath });

const moduleDefinition = sandbox.window.DUDUQ_CONTENT?.english?.year2?.module01;
check(moduleDefinition, "module01 não foi carregado pelo harness");
check(moduleDefinition.version === "1.3.2-homolog-word-slash", `Versão homolog inesperada: ${moduleDefinition.version}`);

const entries = allQuestions(moduleDefinition);
const ids = entries.map(({ question }) => question.id);
const expectedIds = Array.from({ length: 15 }, (_, index) => `EN2-M1-${String(index + 1).padStart(2, "0")}`);

check(entries.length === 15, `Quantidade de itens mudou: ${entries.length}`);
check(new Set(ids).size === 15, "Há IDs duplicados no módulo homologado");
check(expectedIds.every((id) => ids.includes(id)), "Um ou mais IDs oficiais EN2-M1-01..15 foram perdidos");

const wordSlashEntries = entries.filter(({ question }) => question.delivery?.mechanic === "word-slash");
check(wordSlashEntries.length === 1, `Word Slash deve aparecer somente uma vez no piloto; atual=${wordSlashEntries.length}`);

const pilot = wordSlashEntries[0]?.question;
check(pilot?.id === "EN2-M1-08", `Piloto incorreto: ${pilot?.id || "ausente"}`);
check(pilot.delivery?.allowAudio === true, "Piloto precisa manter áudio habilitado");
check(pilot.delivery?.allowImage === false, "Piloto não deve depender de imagem para responder");
check(pilot.metadata?.homologation?.readingDemand === "R0-R1", "Gate de leitura R0-R1 ausente");

const ws = pilot.metadata?.wordSlash;
check(ws?.target?.value === "C", "Alvo do piloto deve ser a letra C");
check(ws?.target?.spokenText === "C", "Estímulo oral do piloto deve ser C");
check(ws?.target?.hideValue === true, "Valor C deve permanecer oculto no alvo");
check(ws?.goal === 2, `Meta deve ser 2; atual=${ws?.goal}`);
check(ws?.difficulty?.speedMinMs >= 6500, "Velocidade mínima está rápida demais para o piloto do 2º ano");
check(ws?.difficulty?.speedMaxMs >= 8000, "Velocidade máxima está rápida demais para o piloto do 2º ano");
check(ws?.difficulty?.maxObjects <= 3, "Densidade visual deve ficar em até 3 objetos");
check(ws?.difficulty?.timeLimitSeconds >= 60, "Tempo do piloto deve ser de pelo menos 60 s");

const values = (ws?.objects || []).map((item) => item.value).sort();
check(JSON.stringify(values) === JSON.stringify(["A", "B", "C"]), `Distratores inesperados: ${values.join(",")}`);
check(moduleDefinition.audioCatalog?.[pilot.id]?.mechanic === "word-slash", "Catálogo de áudio não foi sincronizado com Word Slash");

const sourceMechanics = entries
  .filter(({ question }) => question.id !== pilot.id)
  .map(({ question }) => question.delivery?.mechanic)
  .filter(Boolean);
check(!sourceMechanics.includes("word-slash"), "Word Slash vazou para itens fora do piloto");

console.log("DUDUQ YEAR2 WORD SLASH HOMOLOGATION: PASS");
console.log(JSON.stringify({
  baseRevision: canary.revision,
  moduleVersion: moduleDefinition.version,
  officialIdsPreserved: ids.length,
  wordSlashPilot: pilot.id,
  target: ws.target.value,
  goal: ws.goal,
  maxObjects: ws.difficulty.maxObjects,
  timeLimitSeconds: ws.difficulty.timeLimitSeconds
}, null, 2));

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const yearDir = path.join(root, "content", "english", "year-2");
const sandbox = { console };
sandbox.window = {};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

function run(rel) {
  const file = path.join(root, rel);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: rel });
}
function check(condition, message) {
  if (!condition) throw new Error(message);
}
function questions(module) {
  return (module.activities || []).flatMap((activity) => activity.questions || []);
}

run("content/english/year-2/year2-v22-homolog-core.js");
check(sandbox.window.DuduQYear2V22Factory?.version === "1.2.0-homolog-core", "Factory Year2 v1.2 não carregou");
run("content/english/year-2/module-01/module-01-v22-homolog.js");
for (let m = 2; m <= 6; m += 1) {
  const mm = String(m).padStart(2, "0");
  run(`content/english/year-2/module-${mm}/module-${mm}-v22-homolog.js`);
}

const y2 = sandbox.window.DUDUQ_CONTENT?.english?.year2 || {};
const modules = [
  y2.module01v22homolog,
  y2.module02v22homolog,
  y2.module03v22homolog,
  y2.module04v22homolog,
  y2.module05v22homolog,
  y2.module06v22homolog
];
check(modules.every(Boolean), "Um ou mais módulos M01–M06 não foram registrados");

const expectedKeys = modules.map((_, i) => `module${String(i + 1).padStart(2, "0")}v22homolog`);
const runtimePages = modules.map((_, i) => path.join(yearDir, `module-${String(i + 1).padStart(2, "0")}`, "homolog-v22-runtime.html"));
runtimePages.forEach((p, index) => {
  check(fs.existsSync(p), `Página de homologação ausente: M${String(index + 1).padStart(2, "0")}`);
  const html = fs.readFileSync(p, "utf8");
  check(/channel\s*:\s*["']canary-v1["']/.test(html), `M${index + 1}: página deve permanecer no Canary 143`);
  check(html.includes(expectedKeys[index]), `M${index + 1}: modulePath de homologação incorreto`);
});

const allIds = [];
const executable = [];
const blocked = [];
const distributions = {};
for (let index = 0; index < modules.length; index += 1) {
  const module = modules[index];
  const m = index + 1;
  const q = questions(module);
  const b = module.blockedItems || [];
  check(q.length + b.length === 15, `M${m}: esperado 15 itens editoriais; executáveis=${q.length}; bloqueados=${b.length}`);
  check(module.year === 2 && module.module === m, `M${m}: metadados de ano/módulo inválidos`);
  if (m >= 2) {
    check(module.normativeProfile?.profile === "Y2_FOUNDATIONAL_LITERACY", `M${m}: perfil Y2 ausente`);
    check(module.normativeProfile?.reading.includes("R1"), `M${m}: limite R1 não declarado`);
  }
  const mechanics = {};
  q.forEach((item) => {
    allIds.push(item.id);
    executable.push(item);
    check(item.delivery?.mechanic && item.delivery.mechanic !== "auto", `${item.id}: mecânica deve ser explícita`);
    check(["R0", "R0-R1", "R1"].includes(item.metadata?.readingDemand), `${item.id}: readingDemand fora de R0/R1`);
    check(item.metadata?.sourceVersion === "2.2", `${item.id}: sourceVersion precisa ser 2.2`);
    mechanics[item.delivery.mechanic] = (mechanics[item.delivery.mechanic] || 0) + 1;
  });
  b.forEach((item) => { allIds.push(item.id); blocked.push(item); });
  const max = Math.max(...Object.values(mechanics)) / q.length;
  check(Object.keys(mechanics).length >= 2, `M${m}: diversidade mecânica insuficiente`);
  check(max <= 0.70, `M${m}: uma mecânica excede 70% (${(max * 100).toFixed(1)}%)`);
  distributions[`M${String(m).padStart(2, "0")}`] = mechanics;
}

const expectedIds = [];
for (let m = 1; m <= 6; m += 1) for (let i = 1; i <= 15; i += 1) expectedIds.push(`EN2-M${m}-${String(i).padStart(2, "0")}`);
check(allIds.length === 90, `Total editorial deve ser 90; atual=${allIds.length}`);
check(new Set(allIds).size === 90, "Há IDs duplicados entre M01–M06");
check(expectedIds.every((id) => allIds.includes(id)), "Um ou mais IDs oficiais EN2-M1..M6 estão ausentes");
check(executable.length === 89, `Esperado 89 executáveis enquanto M1-12 está bloqueado; atual=${executable.length}`);
check(blocked.length === 1 && blocked[0].id === "EN2-M1-12", `Único bloqueio permitido neste estágio é EN2-M1-12; atual=${blocked.map(x=>x.id).join(",")}`);

const wordSlash = executable.filter((q) => q.delivery?.mechanic === "word-slash");
check(wordSlash.length === 1 && wordSlash[0].id === "EN2-M1-08", `Word Slash deve permanecer somente no EN2-M1-08; atual=${wordSlash.map(q=>q.id).join(",")}`);
check(wordSlash[0].metadata?.wordSlash?.difficulty?.wrongPenalty === 0, "EN2-M1-08: Word Slash não pode ter penalidade por erro/tempo");
check(wordSlash[0].metadata?.wordSlash?.difficulty?.maxObjects <= 3, "EN2-M1-08: simultaneidade deve permanecer baixa");

const qById = Object.fromEntries(executable.map((q) => [q.id, q]));
const sentinels = {
  "EN2-M2-01": "eleven",
  "EN2-M2-15": "This is my grandfather.",
  "EN2-M3-09": "a kite",
  "EN2-M3-15": "three balls",
  "EN2-M4-11": "ten yellow ducks",
  "EN2-M4-15": "ten red stars",
  "EN2-M5-09": "Touch your nose.",
  "EN2-M5-14": "Touch your shoulders.",
  "EN2-M5-15": "two hands",
  "EN2-M6-10": "ten grapes",
  "EN2-M6-11": "carrot",
  "EN2-M6-12": "pear",
  "EN2-M6-15": "big apple / small apple"
};
for (const [id, answer] of Object.entries(sentinels)) check(qById[id]?.metadata?.sourceAnswer === answer, `${id}: sentinela editorial divergente`);

for (const id of ["EN2-M6-11", "EN2-M6-12"]) {
  const q = qById[id];
  check(q.delivery.mechanic === "target-shooter", `${id}: áudio→imagem deve usar Target Shooter nesta candidata`);
  check(q.metadata?.targetShooter?.mode === "audio-to-image", `${id}: modo deve ser audio-to-image`);
  check(q.metadata?.targetShooter?.items?.length === 4, `${id}: quatro imagens obrigatórias`);
  check(q.metadata.targetShooter.items.every((item) => item.display === "image" && item.label === ""), `${id}: primeira tentativa não pode exibir texto nas alternativas`);
}

console.log("DUDUQ YEAR2 M01-M06 V2.2 + FACTORY V1.2: PASS");
console.log(JSON.stringify({ editorialItems: allIds.length, executableItems: executable.length, blockedItems: blocked.map(x => x.id), wordSlash: wordSlash.map(q => q.id), distributions }, null, 2));

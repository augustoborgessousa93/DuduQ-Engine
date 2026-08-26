import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const moduleFiles = [1,2,3,4,5,6].map((module) =>
  `content/english/year-2/module-${String(module).padStart(2,"0")}/module-${String(module).padStart(2,"0")}-v23-multimodal.js`
);
const signatures = JSON.parse(read("content/english/year-2/YEAR2_V23_SOURCE_SIGNATURES.json"));
const canary = JSON.parse(read("engine/channels/canary-v1.json"));
const homolog = JSON.parse(read("engine/channels/homolog-year2-gamification-diversity-v1.json"));
const overlaySource = read("content/english/year-2/year2-v24-gamification-diversity-adapter.js");
const matchingCandidate = read("engine/releases/mechanics/matching/1.0.24/matching.js");

function sourceObject(code, variable, nextVariable) {
  const re = new RegExp(`const ${variable}=([\\s\\S]*?);\\s*const ${nextVariable}=`);
  const match = code.match(re);
  expect(match, `Não foi possível extrair ${variable} antes de ${nextVariable}.`);
  return JSON.parse(match[1]);
}

function distFromPlan(items, plan) {
  const out = {};
  for (const item of items) {
    const mechanic = plan[item.id]?.mechanic;
    expect(mechanic, `Plano v2.3 ausente para ${item.id}.`);
    out[mechanic] = (out[mechanic] || 0) + 1;
  }
  return out;
}

function normalizedDist(value) {
  return Object.fromEntries(Object.entries(value).filter(([,count]) => count > 0).sort(([a],[b]) => a.localeCompare(b)));
}

const sandbox = { window:{}, console };
vm.runInNewContext(overlaySource, sandbox, { filename:"year2-v24-gamification-diversity-adapter.js" });
const overlay = sandbox.window.DuduQYear2GamificationDiversity;
expect(overlay?.version === "1.0.0-homolog", "Overlay de diversidade não inicializou com versão esperada.");
const reviewPlan = overlay.plan;

const allItems = [];
const sourcePlans = new Map();
const beforeByModule = {};
for (let index = 0; index < moduleFiles.length; index += 1) {
  const moduleNumber = index + 1;
  const code = read(moduleFiles[index]);
  const items = sourceObject(code, "items", "plan");
  const plan = sourceObject(code, "plan", "pedagogicalProfile");
  expect(items.length === 15, `M${moduleNumber}: esperado 15 itens; encontrado ${items.length}.`);
  beforeByModule[moduleNumber] = distFromPlan(items, plan);
  for (const item of items) {
    expect(!allItems.some((existing) => existing.id === item.id), `ID duplicado na fonte v2.3: ${item.id}.`);
    expect(Array.isArray(item.alternatives) && item.alternatives.length >= 2, `${item.id}: alternativas canônicas inválidas.`);
    expect(item.alternatives[item.answerIndex] === item.answer, `${item.id}: answerIndex não aponta para answer canônico.`);
    expect(item.alternatives.includes(item.answer), `${item.id}: resposta canônica não pertence às alternativas.`);
    expect(signatures.items?.[item.id], `${item.id}: assinatura oficial v2.3 ausente.`);
    allItems.push({ ...item, moduleNumber });
    sourcePlans.set(item.id, plan[item.id]);
  }
}

expect(allItems.length === 90, `Fonte Year2 deveria conter 90 itens; encontrado ${allItems.length}.`);
expect(signatures.itemCount === 90, `Arquivo oficial de assinaturas não declara 90 itens (${signatures.itemCount}).`);
expect(Object.keys(signatures.items || {}).length === 90, "Arquivo oficial de assinaturas não contém 90 fingerprints individuais.");
expect(signatures.scope === "English Year 2 M01-M06", `Escopo oficial inesperado: ${signatures.scope}.`);

const expectedBefore = {
  1:{"target-shooter":7,"bubble-pop":2,"word-slash":1,"drag-drop":5},
  2:{"drag-drop":15},
  3:{"drag-drop":15},
  4:{"drag-drop":15},
  5:{"drag-drop":15},
  6:{"drag-drop":13,"target-shooter":2}
};
for (const [moduleNumber, expected] of Object.entries(expectedBefore)) {
  expect(
    JSON.stringify(normalizedDist(beforeByModule[moduleNumber])) === JSON.stringify(normalizedDist(expected)),
    `M${moduleNumber}: distribuição BEFORE divergiu. atual=${JSON.stringify(beforeByModule[moduleNumber])}`
  );
}

const forbiddenPlanFields = new Set(["prompt","alternatives","answer","answerIndex","skill","ability","objective","vocabulary","content"]);
for (const [id, change] of Object.entries(reviewPlan)) {
  expect(allItems.some((item) => item.id === id), `Plano de gamificação contém ID inexistente: ${id}.`);
  expect(["matching","bubble-pop","target-shooter"].includes(change.mechanic), `${id}: mecânica de revisão não autorizada: ${change.mechanic}.`);
  for (const key of Object.keys(change)) {
    expect(!forbiddenPlanFields.has(key), `${id}: plano de gamificação tentou definir campo pedagógico proibido: ${key}.`);
  }
}

function afterForModule(moduleNumber) {
  const items = allItems.filter((item) => item.moduleNumber === Number(moduleNumber));
  const out = {};
  for (const item of items) {
    const mechanic = reviewPlan[item.id]?.mechanic || sourcePlans.get(item.id)?.mechanic;
    out[mechanic] = (out[mechanic] || 0) + 1;
  }
  return out;
}

const expectedAfter = {
  1:{"drag-drop":5,"target-shooter":4,"bubble-pop":4,"matching":1,"word-slash":1},
  2:{"drag-drop":4,"matching":4,"bubble-pop":4,"target-shooter":3},
  3:{"drag-drop":3,"matching":4,"bubble-pop":4,"target-shooter":4},
  4:{"drag-drop":3,"matching":4,"bubble-pop":4,"target-shooter":4},
  5:{"drag-drop":3,"matching":4,"bubble-pop":4,"target-shooter":4},
  6:{"drag-drop":2,"matching":4,"bubble-pop":4,"target-shooter":5}
};
for (const [moduleNumber, expected] of Object.entries(expectedAfter)) {
  const actual = afterForModule(moduleNumber);
  expect(
    JSON.stringify(normalizedDist(actual)) === JSON.stringify(normalizedDist(expected)),
    `M${moduleNumber}: distribuição AFTER divergiu. atual=${JSON.stringify(actual)}`
  );
}

/* Production must stay frozen while this broad pedagogical-gamification review is homologated. */
expect(canary.revision === 143, `Canary público saiu da R143: R${canary.revision}.`);
expect(canary.mechanics?.["drag-drop"]?.release === "2.0.22", "Canary público alterou Drag & Drop.");
expect(canary.mechanics?.matching?.release === "1.0.23", "Canary público alterou Matching.");
expect(homolog.policy?.homologationOnly === true, "Canal de diversidade precisa ser homologationOnly.");
expect(homolog.policy?.year2ContentImmutable === true, "Canal não declara conteúdo Year2 imutável.");
expect(homolog.mechanics?.matching?.release === "1.0.24", "Canal isolado não usa Matching 1.0.24.");
expect(homolog.mechanics?.["drag-drop"]?.release === "2.0.22", "Revisão ampla alterou Drag & Drop sem necessidade.");

/* Candidate Matching changes only the explicit right-distractor capability. */
expect(matchingCandidate.includes('const VERSION = "1.0.24"'), "Matching candidato perdeu identidade 1.0.24.");
expect(matchingCandidate.includes('/engine/releases/mechanics/matching/1.0.23/matching.js'), "Matching 1.0.24 não compõe adapter 1.0.23.");
expect(matchingCandidate.includes('allowRightDistractors'), "Matching 1.0.24 não possui gate explícito para distratores.");
expect(matchingCandidate.includes('UNPAIRED_RIGHT_ITEM'), "Matching 1.0.24 não preserva assinatura do validador base.");

const changedCounts = Object.fromEntries([1,2,3,4,5,6].map((moduleNumber) => [moduleNumber,
  allItems.filter((item) => item.moduleNumber === moduleNumber && reviewPlan[item.id]).length
]));
expect(JSON.stringify(changedCounts) === JSON.stringify({1:3,2:11,3:12,4:12,5:12,6:11}), `Contagem de atividades revisadas inesperada: ${JSON.stringify(changedCounts)}.`);

console.log("PASS — Year2 diversity contract: 90 canonical items + answer membership + immutable production + before/after mechanic distributions + no pedagogical fields in conversion plan");

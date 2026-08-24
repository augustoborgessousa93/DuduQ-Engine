import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleDir = path.join(root, "content", "english", "year-2", "module-01");
const canonicalPath = path.join(moduleDir, "module-01-v22-canonical.json");
const auditPath = path.join(moduleDir, "M01_V22_MECHANIC_COMPATIBILITY_AUDIT.json");
const targetShooterPath = path.join(root, "engine", "releases", "mechanics", "target-shooter", "1.0.21", "target-shooter.js");
const matchingPath = path.join(root, "engine", "releases", "mechanics", "matching", "1.0.23", "matching.js");
const dragDropPath = path.join(root, "engine", "releases", "mechanics", "drag-drop", "2.0.18", "drag-drop.js");

const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const targetShooterSource = fs.readFileSync(targetShooterPath, "utf8");
const matchingSource = fs.readFileSync(matchingPath, "utf8");
const dragDropSource = fs.readFileSync(dragDropPath, "utf8");

function fail(message) {
  throw new Error(message);
}

function check(condition, message) {
  if (!condition) fail(message);
}

check(canonical.status === "homologation-source-of-truth", "M01 v2.2 precisa permanecer marcado como fonte de homologação");
check(canonical.year === 2 && canonical.module === 1, "Escopo do manifesto canônico deve ser 2º ano / M01");
check(Array.isArray(canonical.source?.pages) && canonical.source.pages.join(",") === "14,15", "Fonte editorial deve apontar para as páginas 14–15 da v2.2");
check(canonical.implementationStatus?.runtimeAligned === false, "Até a reconstrução v2.2, o manifesto deve declarar runtimeAligned=false");
check(audit.baseCanaryRevision === 143, "Auditoria de compatibilidade deve permanecer ancorada na Revision 143");

const items = canonical.items || [];
const expectedIds = Array.from({ length: 15 }, (_, index) => `EN2-M1-${String(index + 1).padStart(2, "0")}`);
check(items.length === 15, `M01 v2.2 deve conter 15 itens; atual=${items.length}`);
check(new Set(items.map((item) => item.id)).size === 15, "Há IDs duplicados no manifesto canônico");
check(expectedIds.every((id) => items.some((item) => item.id === id)), "Um ou mais IDs EN2-M1-01..15 estão ausentes");

const expectedAnswers = {
  "EN2-M1-01": "Hello",
  "EN2-M1-02": "Good morning",
  "EN2-M1-03": "Good night",
  "EN2-M1-04": "Bye!",
  "EN2-M1-05": "See you later!",
  "EN2-M1-06": "A",
  "EN2-M1-07": "B",
  "EN2-M1-08": "C",
  "EN2-M1-09": "M",
  "EN2-M1-10": "S",
  "EN2-M1-11": "How do you spell your name?",
  "EN2-M1-12": "LEO",
  "EN2-M1-13": "I’m fine, thanks.",
  "EN2-M1-14": "Hi!",
  "EN2-M1-15": "BAG"
};

for (const item of items) {
  check(item.answer === expectedAnswers[item.id], `${item.id}: resposta editorial divergente; atual=${item.answer}`);
  check(Array.isArray(item.alternatives) && item.alternatives.length === 4, `${item.id}: deve preservar 4 alternativas editoriais`);
  check(item.alternatives[item.answerIndex] === item.answer, `${item.id}: answerIndex não aponta para a resposta editorial`);
  check(item.homologationDecision?.mechanic, `${item.id}: decisão mecânica ausente`);
  check(["R0", "R0-R1", "R1"].includes(item.homologationDecision?.readingDemand), `${item.id}: demanda de leitura acima do padrão Y2`);
}

const byMechanic = items.reduce((acc, item) => {
  const mechanic = item.homologationDecision.mechanic;
  acc[mechanic] = (acc[mechanic] || 0) + 1;
  return acc;
}, {});

const declared = canonical.mechanicDistribution || {};
for (const [mechanic, count] of Object.entries(byMechanic)) {
  check(declared[mechanic] === count, `Distribuição declarada incorreta para ${mechanic}: declarada=${declared[mechanic]} real=${count}`);
  check(audit.approvedDistribution?.[mechanic] === count, `Auditoria e manifesto divergem em ${mechanic}`);
}
check(declared.total === items.length, "Total declarado da distribuição mecânica está incorreto");
check(audit.approvedDistribution?.total === items.length, "Total da auditoria mecânica está incorreto");

const shares = Object.values(byMechanic).map((count) => count / items.length);
const maximumShare = Math.max(...shares);
check(maximumShare <= 0.70, `Uma mecânica excede 70% do M01: ${(maximumShare * 100).toFixed(1)}%`);
check(Math.abs(maximumShare - declared.maximumShare) < 0.001, "maximumShare declarado não corresponde à distribuição real");
check(Math.abs(maximumShare - audit.approvedDistribution.maximumShare) < 0.001, "maximumShare da auditoria não corresponde à distribuição real");
check(Object.keys(byMechanic).length >= 2, "M01 precisa ter diversidade mecânica real");

const wordSlashItems = items.filter((item) => item.homologationDecision.wordSlash === true || item.homologationDecision.mechanic === "word-slash");
check(wordSlashItems.length === 1, `Word Slash deve ter somente um piloto no M01; atual=${wordSlashItems.length}`);
check(wordSlashItems[0].id === "EN2-M1-08", `Piloto Word Slash deve ser EN2-M1-08; atual=${wordSlashItems[0].id}`);
check(wordSlashItems[0].answer === "C", "Piloto Word Slash deve preservar resposta editorial C");
check(wordSlashItems[0].homologationDecision.readingDemand === "R0-R1", "Piloto Word Slash deve permanecer em R0-R1");

for (const item of items.filter((entry) => entry.homologationDecision.sequenceTask || entry.homologationDecision.sequenceRecognition)) {
  check(item.homologationDecision.mechanic !== "word-slash", `${item.id}: Word Slash não pode ser usado como mecânica de sequência`);
}

const item11 = items.find((item) => item.id === "EN2-M1-11");
const item13 = items.find((item) => item.id === "EN2-M1-13");
check(/optionAudio:\s*false/.test(targetShooterSource), "Contrato esperado mudou: Target Shooter 1.0.21 deveria declarar optionAudio=false");
check(/optionAudio:\s*true/.test(matchingSource), "Contrato esperado mudou: Matching 1.0.23 deveria declarar optionAudio=true");
check(item11?.homologationDecision?.mechanic === "matching" && item11?.homologationDecision?.optionAudioRequired === true, "EN2-M1-11 deve usar Matching com optionAudio obrigatório");
check(item13?.homologationDecision?.mechanic === "matching" && item13?.homologationDecision?.optionAudioRequired === true, "EN2-M1-13 deve usar Matching com optionAudio obrigatório");
check(audit.itemOverridesAfterCapabilityAudit?.["EN2-M1-11"]?.approvedPlan === "matching", "Auditoria deve registrar override do EN2-M1-11 para Matching");
check(audit.itemOverridesAfterCapabilityAudit?.["EN2-M1-13"]?.approvedPlan === "matching", "Auditoria deve registrar override do EN2-M1-13 para Matching");

check(/function adaptSequence\(/.test(dragDropSource), "Drag & Drop base precisa manter adaptSequence para EN2-M1-12");
check(/strategy:\s*"sequence"/.test(dragDropSource), "Drag & Drop base precisa manter strategy sequence");
check(items.find((item) => item.id === "EN2-M1-12")?.homologationDecision?.mechanic === "drag-drop", "EN2-M1-12 deve permanecer em Drag & Drop de sequência");

check(items.find((item) => item.id === "EN2-M1-12")?.answer === "LEO", "EN2-M1-12 precisa refletir a v2.2 (LEO), não a versão antiga GOOD MORNING");
check(items.find((item) => item.id === "EN2-M1-15")?.answer === "BAG", "EN2-M1-15 precisa refletir a v2.2 (BAG), não a versão antiga SEE YOU");

console.log("DUDUQ YEAR2 M01 V2.2 CANONICAL + ADAPTER CAPABILITIES: PASS");
console.log(JSON.stringify({
  items: items.length,
  answersPreserved: Object.keys(expectedAnswers).length,
  mechanics: byMechanic,
  maximumShare: Number(maximumShare.toFixed(4)),
  wordSlashPilot: wordSlashItems[0].id,
  optionAudioProtectedItems: [item11.id, item13.id],
  runtimeAligned: canonical.implementationStatus.runtimeAligned
}, null, 2));

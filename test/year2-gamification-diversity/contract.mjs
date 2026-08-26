import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const json = (relative) => JSON.parse(read(relative));

function extractJsonConst(source, name, nextName){
  const startToken = `const ${name}=`;
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${name} ausente`);
  const contentStart = start + startToken.length;
  const endToken = `;const ${nextName}=`;
  const end = source.indexOf(endToken, contentStart);
  assert.notEqual(end, -1, `${nextName} não delimita ${name}`);
  return JSON.parse(source.slice(contentStart, end));
}

const planDoc = json("content/english/year-2/YEAR2_GAMIFICATION_DIVERSITY_PLAN_v1.json");
const canary = json("engine/channels/canary-v1.json");
const homolog = json("engine/channels/homolog-year2-gamification-diversity-v1.json");
const candidate = read("engine/releases/mechanics/matching/1.0.24/matching.js");
const diversityAdapter = read("content/english/year-2/year2-v23-gamification-diversity-adapter.js");

assert.equal(planDoc.status, "HOMOLOGATION_ONLY");
assert.equal(planDoc.sourceLock.itemCount, 90);
assert.deepEqual(planDoc.sourceLock.canonicalFieldsImmutable, ["id", "prompt", "alternatives", "answer"]);

assert.equal(canary.revision, 143, "Canary deve permanecer R143 nesta frente");
assert.equal(canary.mechanics.matching.release, "1.0.23", "Canary Matching não pode ser promovido silenciosamente");
assert.equal(homolog.mechanics.matching.release, "1.0.24");
assert.match(homolog.mechanics.matching.adapter, /matching\/1\.0\.24\/matching\.js$/);
assert.match(homolog.mechanics.matching.runtime, /matching\/1\.0\.23\/DUDUQ_MATCHING\.html$/);
assert.equal(homolog.policy.homologationOnly, true);
assert.equal(homolog.policy.year2ContentImmutable, true);

assert.match(candidate, /BASE_ADAPTER_URL\s*=\s*"\/engine\/releases\/mechanics\/matching\/1\.0\.23\/matching\.js"/);
assert.match(candidate, /allowRightDistractors/);
assert.match(candidate, /UNPAIRED_RIGHT_ITEM/);
assert.doesNotMatch(candidate, /UNPAIRED_LEFT_ITEM/);
assert.match(candidate, /const VERSION = "1\.0\.24"/);

assert.match(diversityAdapter, /matching-single-choice-homolog/);
assert.match(diversityAdapter, /allowRightDistractors:\s*true/);
assert.doesNotMatch(diversityAdapter, /allowDistractors:\s*true/);
assert.match(diversityAdapter, /CONTENT_LOCK_VIOLATION/);

const matchingIds = new Set(planDoc.matchingQuestionIds);
assert.equal(matchingIds.size, planDoc.matchingQuestionIds.length, "IDs de Matching duplicados no plano");
assert.equal(matchingIds.size, 41, "Quantidade planejada de Matching mudou");

const allIds = new Set();
const actualDistribution = {};
const perModule = {};
let itemCount = 0;

for(let moduleNumber = 1; moduleNumber <= 6; moduleNumber += 1){
  const pad = String(moduleNumber).padStart(2, "0");
  const sourcePath = `content/english/year-2/module-${pad}/module-${pad}-v23-multimodal.js`;
  const indexPath = `content/english/year-2/module-${pad}/index.html`;
  const source = read(sourcePath);
  const publicIndex = read(indexPath);

  assert.match(publicIndex, /channel:\s*"canary-v1"/, `M${pad} entry público deve continuar em canary-v1`);
  assert.doesNotMatch(publicIndex, /gamification-diversity/i, `M${pad} entry público não pode carregar homologação`);
  assert.doesNotMatch(source, /year2-v23-gamification-diversity-adapter/, `M${pad} fonte canônica não pode depender do adapter de homologação`);

  const items = extractJsonConst(source, "items", "plan");
  const sourcePlan = extractJsonConst(source, "plan", "pedagogicalProfile");
  assert.equal(items.length, 15, `M${pad} deve manter 15 itens`);

  const moduleDist = {};
  for(const item of items){
    itemCount += 1;
    assert.ok(/^EN2-M[1-6]-\d{2}$/.test(item.id), `ID inválido: ${item.id}`);
    assert.equal(allIds.has(item.id), false, `ID duplicado: ${item.id}`);
    allIds.add(item.id);

    assert.ok(Array.isArray(item.alternatives) && item.alternatives.length >= 2, `${item.id}: alternativas ausentes`);
    assert.ok(Number.isInteger(item.answerIndex), `${item.id}: answerIndex inválido`);
    assert.ok(item.answerIndex >= 0 && item.answerIndex < item.alternatives.length, `${item.id}: answerIndex fora do intervalo`);
    assert.equal(item.alternatives[item.answerIndex], item.answer, `${item.id}: gabarito editorial inconsistente`);
    assert.ok(typeof item.prompt === "string" && item.prompt.length > 0, `${item.id}: prompt ausente`);

    const entry = sourcePlan[item.id];
    assert.ok(entry, `${item.id}: plan ausente`);

    let mechanic = entry.mechanic;
    if(matchingIds.has(item.id)){
      assert.ok(entry.mode === "image-choice" || entry.mode === "audio-choice", `${item.id}: modo incompatível com Matching single-choice`);
      assert.equal(entry.hideOptionTextBeforeAnswer, true, `${item.id}: Matching selecionado deve ocultar grafia antes da resposta`);
      mechanic = "matching";
    }

    moduleDist[mechanic] = (moduleDist[mechanic] || 0) + 1;
    actualDistribution[mechanic] = (actualDistribution[mechanic] || 0) + 1;
  }

  perModule[`M${pad}`] = moduleDist;
}

assert.equal(itemCount, 90);
assert.equal(allIds.size, 90);
for(const id of matchingIds) assert.ok(allIds.has(id), `ID planejado não existe na fonte: ${id}`);

const expectedDistribution = {...planDoc.expectedDistribution};
delete expectedDistribution.total;
assert.deepEqual(actualDistribution, expectedDistribution, "Distribuição global divergiu do plano");

for(const [moduleKey, expected] of Object.entries(planDoc.moduleExpectations)){
  const normalizedKey = `M${moduleKey.slice(1).padStart(2,"0")}`;
  assert.deepEqual(perModule[normalizedKey], expected, `${normalizedKey}: distribuição divergiu do plano`);
}

const expectedTotal = Object.values(actualDistribution).reduce((sum, value) => sum + value, 0);
assert.equal(expectedTotal, planDoc.expectedDistribution.total);

console.log("YEAR2_GAMIFICATION_DIVERSITY_CONTRACT_OK");
console.log(JSON.stringify({itemCount, matchingItems: matchingIds.size, distribution: actualDistribution, perModule}, null, 2));

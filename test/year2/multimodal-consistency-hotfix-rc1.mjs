import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function run(relativePath) {
  vm.runInThisContext(fs.readFileSync(path.join(root, relativePath), "utf8"), { filename: relativePath });
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function unique(values) {
  return new Set(values).size === values.length;
}
function visualSource(value) {
  const src = String(value || "").trim();
  return /^https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\//i.test(src) ||
    /^data:image\//i.test(src) || /^https?:\/\//i.test(src);
}
function targetVisualSource(target) {
  const image = target?.image;
  return String(
    target?.imageSrc || target?.imageUrl || target?.imageAssetKey ||
    (image && typeof image === "object" ? image.src : image) || ""
  ).trim();
}
function singleTargetChoiceShape(question) {
  const pairs = Array.isArray(question?.answer?.value) ? question.answer.value : [];
  const targets = Array.isArray(question?.metadata?.targets) ? question.metadata.targets : [];
  const alternatives = Array.isArray(question?.alternatives) ? question.alternatives : [];
  return question?.delivery?.mechanic === "drag-drop" && pairs.length === 1 && targets.length === 1 &&
    Number(targets[0]?.capacity || 1) === 1 && alternatives.length >= 2 && alternatives.length <= 4 &&
    question?.metadata?.optionPresentation !== "MOVABLE_LETTERS_AFTER_FIRST_LISTEN";
}

globalThis.window = globalThis;
window.DUDUQ_PUBLIC_ENTRY = Object.freeze({ year: 2, sourceVersion: "2.3" });
window.DUDUQ_CONTENT = {};
if (!globalThis.document) globalThis.document = { querySelector: () => ({}) };
if (typeof globalThis.Response !== "function") throw new Error("Node runtime must expose Response.");

const matchingValidatorFixture = `rightIds.forEach((id) => {\n      if (!rightDegrees.get(id)) {\n        issues.push({ path: \`rightItems:\${id}\`, code: "UNPAIRED_RIGHT_ITEM", message: "Todo item da direita deve participar de ao menos uma conexão correta.", severity: "error" });\n      }\n    });`;
const runtimeFixtures = {
  matching: `<html><head></head><body><script>${matchingValidatorFixture}\nconst layoutDensity = layoutPairCount <= 3 ? "comfortable" : layoutPairCount === 4 ? "balanced" : "compact";</script></body></html>`,
  wordSlash: `<html><head></head><body><script>const startY = arenaHeight + metrics.height + 12;(presentation.initialObjectIds || []).forEach((id, index) => timers.push(schedule(() => spawnObject(id), 180 + index * 300)));</script></body></html>`,
  bubble: `<html><head></head><body><script>function BubblePopMedia(){const source = assets[bubble.imageAssetKey];}</script></body></html>`
};
window.fetch = async function (input) {
  const url = typeof input === "string" ? input : String(input?.url || "");
  if (/DUDUQ_MATCHING\.html/i.test(url)) return new Response(runtimeFixtures.matching, { status: 200 });
  if (/DUDUQ_WORD_SLASH\.html/i.test(url)) return new Response(runtimeFixtures.wordSlash, { status: 200 });
  if (/DUDUQ_BUBBLE_POP\.html/i.test(url)) return new Response(runtimeFixtures.bubble, { status: 200 });
  return new Response("offline-test-placeholder", { status: 200 });
};

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/year2-v23-multimodal-adapter.js");
run("content/english/year-2/year2-v23-gamification-diversity.js");
run("content/english/year-2/year2-v23-gamification-router-compat.js");
run("content/english/year-2/year2-v23-manual-review-hotfix-v2.js");
run("content/english/year-2/year2-v23-manual-review-router-compat.js");
run("content/english/year-2/year2-v23-mechanics-regression-hotfix.js");
run("content/english/year-2/year2-v23-mechanics-regression-router-compat.js");
run("content/english/year-2/year2-v23-final-root-bridge.js");
run("content/english/year-2/year2-v23-multimodal-consistency-hotfix.js");
run("content/english/year-2/year2-v23-dragdrop-modality-finalize.js");
run("content/english/year-2/year2-v23-dragdrop-listening-association-final.js");
run("content/english/year-2/year2-v23-multimodal-router-finalize.js");
run("content/english/year-2/year2-v23-dragdrop-visual-patch.js");

let total = 0;
let listeningAssociationChoices = 0;
let targetVisualQuestions = 0;
let bubbleVisualQuestions = 0;
let matchingQuestions = 0;
const moduleReports = [];

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  run(`content/english/year-2/module-${mm}/module-${mm}-v23-multimodal.js`);
  const built = window.DUDUQ_CONTENT?.english?.year2?.[`module${mm}v23multimodal`];
  assert(built, `M${mm}: módulo não construído.`);
  const questions = (built.activities || []).flatMap((activity) => activity.questions || []);
  assert(questions.length === 15, `M${mm}: esperado 15 itens, encontrado ${questions.length}.`);

  const ids = questions.map((question) => question.id);
  const expectedIds = Array.from({ length: 15 }, (_, index) => `EN2-M${module}-${String(index + 1).padStart(2, "0")}`);
  assert(JSON.stringify(ids) === JSON.stringify(expectedIds), `M${mm}: IDs/ordem foram alterados.`);

  for (const question of questions) {
    total += 1;
    assert(String(question?.metadata?.sourceAnswerV23 || "").trim(), `${question.id}: sourceAnswerV23 ausente.`);
    assert(question?.metadata?.englishReadingRequired === false, `${question.id}: leitura autônoma em inglês voltou a ser requisito.`);

    if (singleTargetChoiceShape(question)) {
      listeningAssociationChoices += 1;
      const target = question.metadata.targets[0];
      const alternatives = question.alternatives || [];
      const sourceLabels = Array.isArray(question?.metadata?.sourceAlternativesV23)
        ? question.metadata.sourceAlternativesV23.map(String)
        : [];
      const association = question?.metadata?.listeningAssociation;

      assert(question?.metadata?.singleTargetChoice === true, `${question.id}: single-target sem marca pedagógica.`);
      assert(question?.metadata?.confirmOnAnySelection === true, `${question.id}: CONFIRMAR não está liberado para qualquer seleção.`);
      assert(question?.metadata?.replacePreviousChoice === true, `${question.id}: troca de alternativa não está habilitada.`);
      assert(question?.metadata?.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES", `${question.id}: apresentação final não é áudio-alternativa.`);
      assert(question?.metadata?.pedagogicalModality === "LISTENING_IMAGE_AUDIO_ASSOCIATION", `${question.id}: modalidade final incorreta.`);
      assert(association?.status === "READY", `${question.id}: listeningAssociation não está READY.`);
      assert(JSON.stringify(association?.sequence) === JSON.stringify(["PRIMARY_AUDIO","CENTRAL_IMAGE","AUDIO_OPTIONS","DRAG_DROP","CONFIRM"]), `${question.id}: sequência pedagógica final incorreta.`);
      assert(association?.primaryAudioReady === true, `${question.id}: áudio principal ausente.`);

      const centralImage = targetVisualSource(target);
      assert(visualSource(centralImage), `${question.id}: imagem central não resolvida: ${centralImage}`);
      assert(sourceLabels.length === alternatives.length && sourceLabels.length >= 2, `${question.id}: alternativas fonte não preservadas.`);

      alternatives.forEach((alternative, index) => {
        assert(alternative?.audio?.enabled === true, `${question.id}/${alternative.id}: alternativa sem áudio.`);
        assert(String(alternative?.audio?.text || "") === sourceLabels[index], `${question.id}/${alternative.id}: áudio não corresponde ao texto original.`);
        assert(alternative?.audio?.role === "option", `${question.id}/${alternative.id}: áudio sem role option.`);
        assert(alternative?.image?.enabled === false, `${question.id}/${alternative.id}: alternativa ainda é imagem-primária.`);
        assert(!alternative?.imageSrc && !alternative?.imageUrl && !alternative?.metadata?.imageAssetKey, `${question.id}/${alternative.id}: asset visual permaneceu na alternativa.`);
        assert(String(alternative?.metadata?.sourceWrittenLabel || "") === sourceLabels[index], `${question.id}/${alternative.id}: rótulo original não preservado em metadata.`);
        assert(alternative?.metadata?.writtenLabelVisibleBeforeAnswer === false, `${question.id}/${alternative.id}: palavra inglesa voltou a ficar visível antes da resposta.`);
        assert(String(alternative?.text || "") === String.fromCharCode(65 + index), `${question.id}/${alternative.id}: identificação visual A/B/C/D inconsistente.`);
      });
    }

    if (question?.delivery?.mechanic === "target-shooter") {
      const config = question?.metadata?.targetShooter;
      if (Array.isArray(config?.items) && config.items.length >= 2) {
        const sources = config.items.map((item) => item?.image || item?.imageSrc || item?.imageUrl || "");
        assert(sources.every(visualSource), `${question.id}: Target Shooter sem asset visual final.`);
        assert(unique(sources), `${question.id}: Target Shooter contém imagem repetida.`);
        assert(question?.metadata?.targetShooterSmartAssets?.status === "COMPLETE", `${question.id}: Target Shooter sem auditoria visual COMPLETE.`);
        targetVisualQuestions += 1;
      }
    }

    if (question?.delivery?.mechanic === "bubble-pop") {
      const alternatives = question.alternatives || [];
      const sources = alternatives.map((alternative) => alternative?.metadata?.imageAssetKey || "");
      assert(alternatives.length >= 2, `${question.id}: Bubble Pop sem alternativas suficientes.`);
      assert(sources.every(visualSource), `${question.id}: Bubble Pop sem asset visual final.`);
      assert(unique(sources), `${question.id}: Bubble Pop contém imagem repetida.`);
      assert(question?.metadata?.bubbleSmartAssets?.status === "COMPLETE", `${question.id}: Bubble Pop sem auditoria visual COMPLETE.`);
      bubbleVisualQuestions += 1;
    }

    if (question?.delivery?.mechanic === "matching") {
      const matching = question?.metadata?.matching;
      assert(matching && Array.isArray(matching.pairs) && matching.pairs.length >= 2, `${question.id}: Matching sem pares completos.`);
      assert(Array.isArray(matching.leftItems) && matching.leftItems.length === matching.pairs.length, `${question.id}: Matching lado áudio incompleto.`);
      assert(Array.isArray(matching.rightItems) && matching.rightItems.length === matching.pairs.length, `${question.id}: Matching lado visual incompleto.`);
      const sources = matching.rightItems.map((item) => matching.assets?.[item.imageAssetKey] || "");
      assert(sources.every(visualSource), `${question.id}: Matching sem asset resolvido no payload final.`);
      assert(unique(sources), `${question.id}: Matching contém imagem repetida no mesmo conjunto.`);
      assert(question?.metadata?.matchingDiversity?.sourceAnswerIncluded === true, `${question.id}: diversidade removeu o gabarito do banco v2.3.`);
      matchingQuestions += 1;
    }
  }

  if (module === 1) {
    const matchingList = questions.filter((question) => question?.delivery?.mechanic === "matching");
    const byTopic = new Map();
    for (const question of matchingList) {
      const topic = String(question?.metadata?.matchingDiversity?.topic || question?.metadata?.topic || "GENERAL");
      if (!byTopic.has(topic)) byTopic.set(topic, []);
      byTopic.get(topic).push(question);
    }
    for (const [topic, list] of byTopic) {
      for (let index = 1; index < list.length; index += 1) {
        const previous = new Set(list[index - 1]?.metadata?.matchingDiversity?.labels || []);
        const current = new Set(list[index]?.metadata?.matchingDiversity?.labels || []);
        if (!previous.size || !current.size) continue;
        const overlap = [...previous].filter((label) => current.has(label)).length;
        const denominator = Math.max(previous.size, current.size);
        assert(overlap / denominator <= 0.5, `M01/${topic}: Matching consecutivo com sobreposição excessiva (${overlap}/${denominator}).`);
      }
    }
  }

  const listeningAudit = built?.audit?.dragDropListeningAssociation;
  assert(listeningAudit, `M${mm}: auditoria dragDropListeningAssociation ausente.`);
  assert(listeningAudit.failures.length === 0, `M${mm}: falhas listening association: ${JSON.stringify(listeningAudit.failures)}`);
  assert(listeningAudit.missingPrimaryAudio.length === 0, `M${mm}: áudio principal ausente em: ${listeningAudit.missingPrimaryAudio.join(", ")}`);

  const consistencyAudit = built?.audit?.multimodalConsistency;
  assert(consistencyAudit, `M${mm}: auditoria multimodalConsistency ausente.`);
  assert(consistencyAudit.targetVisualFailures.length === 0, `M${mm}: Target Shooter com resolução visual incompleta.`);
  assert(consistencyAudit.bubbleVisualFailures.length === 0, `M${mm}: Bubble Pop com resolução visual incompleta.`);

  moduleReports.push({
    module,
    distribution: built.mechanicDistribution,
    dragDropListeningAssociation: listeningAudit,
    multimodalConsistency: consistencyAudit,
    multimodalRouterFinalize: built?.audit?.multimodalRouterFinalize
  });
}

assert(total === 90, `Esperados 90 itens; encontrados ${total}.`);
assert(listeningAssociationChoices >= 1, "Nenhum Drag & Drop listening association foi homologado.");
assert(targetVisualQuestions >= 1, "Sem cobertura Target Shooter visual.");
assert(bubbleVisualQuestions >= 1, "Sem cobertura Bubble Pop visual.");
assert(matchingQuestions >= 1, "Sem cobertura Matching.");

console.log(JSON.stringify({
  status: "PASS",
  contract: "YEAR2_V23_LISTENING_IMAGE_AUDIO_ASSOCIATION",
  total,
  listeningAssociationChoices,
  targetVisualQuestions,
  bubbleVisualQuestions,
  matchingQuestions,
  moduleReports
}, null, 2));

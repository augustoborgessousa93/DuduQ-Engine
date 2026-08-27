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

globalThis.window = globalThis;
window.DUDUQ_PUBLIC_ENTRY = Object.freeze({ year: 2, sourceVersion: "2.3" });
window.DUDUQ_CONTENT = {};
if (typeof globalThis.Response !== "function") throw new Error("Node runtime must expose Response.");
window.fetch = async () => new Response("offline-test-placeholder", { status: 200 });

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/year2-v23-multimodal-adapter.js");
run("content/english/year-2/year2-v23-gamification-diversity.js");
run("content/english/year-2/year2-v23-gamification-router-compat.js");
run("content/english/year-2/year2-v23-manual-review-hotfix-v2.js");
run("content/english/year-2/year2-v23-dragdrop-visual-patch.js");

const report = [];
const failures = [];
for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  try {
    run(`content/english/year-2/module-${mm}/module-${mm}-v23-multimodal.js`);
    const key = `module${mm}v23multimodal`;
    const built = window.DUDUQ_CONTENT?.english?.year2?.[key];
    assert(built, `M${mm}: módulo não construído.`);
    assert(String(built?.intro?.collectionLogo || "").includes("Logo%20EduQ%20Play.png"), `M${mm}: logo oficial EduQ Play ausente.`);
    assert(built?.visualPolicy?.repositoryAssetsPreferred === true, `M${mm}: banco oficial não está priorizado.`);
    assert(built?.visualPolicy?.provisionalEmojiVectorAllowed === false, `M${mm}: emoji provisório continua permitido.`);

    const questions = (built.activities || []).flatMap((activity) => activity.questions || []);
    assert(questions.length === 15, `M${mm}: esperado 15 questões; recebido ${questions.length}.`);
    questions.forEach((question, index) => {
      const expected = `EN2-M${module}-${String(index + 1).padStart(2, "0")}`;
      assert(question.id === expected, `M${mm}: ordem/ID divergente em ${index + 1}: ${question.id} != ${expected}.`);
      assert(question?.metadata?.sourceAnswerV23, `${question.id}: sourceAnswerV23 ausente.`);
    });

    const matching = [];
    const fallbacks = [];
    for (const question of questions) {
      if (question?.delivery?.mechanic === "matching") {
        const m = question?.metadata?.matching || {};
        const pairs = Array.isArray(m.pairs) ? m.pairs : [];
        const left = Array.isArray(m.leftItems) ? m.leftItems : [];
        const right = Array.isArray(m.rightItems) ? m.rightItems : [];
        const n = pairs.length;
        assert(n >= 2, `${question.id}: Matching precisa de pelo menos 2 pares completos.`);
        assert(left.length === n && right.length === n, `${question.id}: Matching não é NxN (${left.length}/${right.length}/${n}).`);
        assert((question.alternatives || []).length === n, `${question.id}: alternativas visíveis devem corresponder exatamente aos ${n} pares.`);
        assert(m?.behavior?.allowUnpairedDistractors !== true, `${question.id}: distratores soltos continuam habilitados.`);
        assert(question?.metadata?.manualReviewMatching?.sourceCorrectIncluded === true, `${question.id}: conceito/gabarito original não está nos pares.`);
        assert(question?.metadata?.manualReviewMatching?.pairCount === n, `${question.id}: pairCount de auditoria divergente.`);

        const leftIds = left.map((item) => item.id);
        const rightIds = right.map((item) => item.id);
        assert(unique(leftIds) && unique(rightIds), `${question.id}: IDs duplicados no Matching.`);
        const usedLeft = pairs.map((pair) => pair.leftId);
        const usedRight = pairs.map((pair) => pair.rightId);
        assert(unique(usedLeft) && unique(usedRight), `${question.id}: um item está ligado a mais de um par correto.`);
        assert(leftIds.every((id) => usedLeft.includes(id)) && rightIds.every((id) => usedRight.includes(id)), `${question.id}: existe item sem par.`);
        for (const pair of pairs) {
          assert(leftIds.includes(pair.leftId), `${question.id}: pair.leftId inválido ${pair.leftId}.`);
          assert(rightIds.includes(pair.rightId), `${question.id}: pair.rightId inválido ${pair.rightId}.`);
        }
        for (const item of left) assert(String(item?.spokenText || "").trim(), `${question.id}: áudio de par vazio.`);
        for (const item of right) {
          const assetKey = item?.imageAssetKey;
          assert(assetKey && m?.assets?.[assetKey], `${question.id}: imagem de par não resolvida.`);
        }
        matching.push({ id: question.id, pairs: n, statuses: question.metadata.manualReviewMatching.visualStatuses || [] });
      }

      if (question?.metadata?.manualReviewFallback) {
        const f = question.metadata.manualReviewFallback;
        assert(question.delivery?.mechanic === "drag-drop", `${question.id}: fallback deve ser drag-drop.`);
        assert(question.answer?.type === "pairs" && question.answer?.value?.length === 1, `${question.id}: fallback perdeu escolha única.`);
        assert((question.alternatives || []).length >= 2, `${question.id}: fallback sem alternativas suficientes.`);
        assert((question.alternatives || []).every((alt) => alt?.audio?.enabled && alt?.audio?.text), `${question.id}: fallback exige áudio em todas as alternativas.`);
        assert(f.sourceAnswerPreserved === true, `${question.id}: fallback sem garantia de gabarito preservado.`);
        fallbacks.push({ id: question.id, reason: f.reason });
      }
    }

    report.push({
      module,
      matching,
      fallbacks,
      pairCounts: matching.reduce((acc, item) => ({ ...acc, [item.pairs]: (acc[item.pairs] || 0) + 1 }), {}),
      smartVisualUpgrades: built?.manualReviewHotfix?.smartVisualUpgrades || 0
    });
  } catch (error) {
    failures.push({ module, error: error?.stack || error?.message || String(error) });
  }
}

console.log(JSON.stringify({ status: failures.length ? "BLOCKED" : "PASS", contract: "VARIABLE_COMPLETE_MATCHING_PAIRS", report, failures }, null, 2));
if (failures.length) process.exit(1);

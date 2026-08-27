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
function visibleEmoji(value) {
  return /\p{Extended_Pictographic}/u.test(String(value || ""));
}
function unique(values) {
  return new Set(values).size === values.length;
}

globalThis.window = globalThis;
window.DUDUQ_PUBLIC_ENTRY = Object.freeze({ year: 2, sourceVersion: "2.3" });
window.DUDUQ_CONTENT = {};
if (typeof globalThis.Response !== "function") throw new Error("Node runtime must expose Response.");

const matchingValidatorFixture = `rightIds.forEach((id) => {
      if (!rightDegrees.get(id)) {
        issues.push({ path: \`rightItems:\${id}\`, code: "UNPAIRED_RIGHT_ITEM", message: "Todo item da direita deve participar de ao menos uma conexão correta.", severity: "error" });
      }
    });`;
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
run("content/english/year-2/year2-v23-dragdrop-visual-patch.js");

const report = [];
let total = 0;
let totalWordSlash = 0;
let totalBubble = 0;
let totalTargetImages = 0;
let totalTargetFallbacks = 0;
let totalCompactMatching = 0;

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  run(`content/english/year-2/module-${mm}/module-${mm}-v23-multimodal.js`);
  const built = window.DUDUQ_CONTENT?.english?.year2?.[`module${mm}v23multimodal`];
  assert(built, `M${mm}: module missing.`);
  const questions = (built.activities || []).flatMap((activity) => activity.questions || []);
  assert(questions.length === 15, `M${mm}: expected 15 questions, got ${questions.length}.`);
  assert(built?.mechanicsRegressionAudit?.idsPreserved === true, `M${mm}: hotfix ID gate missing.`);
  assert(built?.mechanicsRegressionAudit?.sourceAnswersPreserved === true, `M${mm}: hotfix answer gate missing.`);

  questions.forEach((question, index) => {
    total += 1;
    const expectedId = `EN2-M${module}-${String(index + 1).padStart(2, "0")}`;
    assert(question.id === expectedId, `${question.id}: order/ID changed; expected ${expectedId}.`);
    assert(question?.metadata?.sourceAnswerV23, `${question.id}: sourceAnswerV23 missing.`);
    assert(!visibleEmoji(question.statement), `${question.id}: emoji/icon remains in statement: ${question.statement}`);
    assert(!visibleEmoji(question.instruction), `${question.id}: emoji/icon remains in instruction: ${question.instruction}`);
    assert(!visibleEmoji(question?.feedback?.correct), `${question.id}: emoji/icon remains in correct feedback.`);
    assert(!visibleEmoji(question?.feedback?.incorrect), `${question.id}: emoji/icon remains in incorrect feedback.`);

    if (question.delivery?.mechanic === "word-slash") {
      totalWordSlash += 1;
      const validation = question?.metadata?.wordSlashPayloadAudit;
      assert(validation?.valid === true, `${question.id}: Word Slash payload is not valid.`);
      assert(question?.metadata?.wordSlash?.objects?.length >= 2, `${question.id}: Word Slash objects missing.`);
      assert(question?.metadata?.wordSlash?.target?.value, `${question.id}: Word Slash target missing.`);
    }

    if (question.delivery?.mechanic === "bubble-pop") {
      totalBubble += 1;
      const alternatives = question.alternatives || [];
      assert(alternatives.length >= 2, `${question.id}: Bubble Pop alternatives missing.`);
      const imageKeys = alternatives.map((alternative) => alternative?.metadata?.imageAssetKey).filter(Boolean);
      assert(imageKeys.length === alternatives.length, `${question.id}: Bubble Pop image missing.`);
      assert(unique(imageKeys), `${question.id}: Bubble Pop contains duplicate smart images.`);
      assert(imageKeys.every((key) => /^https:\/\/raw\.githubusercontent\.com\//.test(key)), `${question.id}: Bubble Pop did not use official bank URLs.`);
      assert(question?.metadata?.bubbleSmartAssets?.status === "COMPLETE", `${question.id}: Bubble Pop smart asset audit incomplete.`);
    }

    if (question.delivery?.mechanic === "target-shooter" && question?.metadata?.targetShooter?.mode === "audio-to-image") {
      totalTargetImages += 1;
      const images = (question.metadata.targetShooter.items || []).map((item) => item.image).filter(Boolean);
      assert(images.length === question.metadata.targetShooter.items.length, `${question.id}: Target Shooter image missing.`);
      assert(unique(images), `${question.id}: Target Shooter contains repeated image.`);
    }

    if (question?.metadata?.mechanicsRegressionFallback?.from === "target-shooter") {
      totalTargetFallbacks += 1;
      assert(question.delivery?.mechanic === "drag-drop", `${question.id}: repeated Target Shooter did not fallback.`);
      assert(question.answer?.type === "pairs" && question.answer?.value?.length === 1, `${question.id}: Target fallback answer invalid.`);
      assert((question.alternatives || []).every((alternative) => alternative?.audio?.enabled), `${question.id}: Target fallback alternatives require audio.`);
    }

    if (question.delivery?.mechanic === "matching") {
      const pairCount = question?.metadata?.matching?.pairs?.length || 0;
      if (pairCount > 3) {
        totalCompactMatching += 1;
        assert(question?.metadata?.matching?.layout?.density === "compact", `${question.id}: 4+ pair Matching not marked compact.`);
        assert(question?.metadata?.matching?.layout?.fit === "viewport", `${question.id}: 4+ pair Matching viewport fit missing.`);
      }
    }
  });

  report.push({
    module,
    distribution: built.mechanicDistribution,
    audit: built.mechanicsRegressionAudit
  });
}

assert(total === 90, `Expected 90 Year 2 questions, got ${total}.`);
assert(totalWordSlash >= 1, "Expected at least one valid Word Slash candidate after hotfix.");
assert(totalBubble >= 1, "Expected Bubble Pop coverage after hotfix.");
assert(totalCompactMatching >= 1, "Expected 4+ pair Matching coverage after hotfix.");

const matchingHtml = await window.fetch("https://example.test/DUDUQ_MATCHING.html?year2=1").then((response) => response.text());
assert(matchingHtml.includes('layoutPairCount <= 3 ? "comfortable" : "compact"'), "Matching runtime density patch missing.");
assert(matchingHtml.includes('duduq-year2-matching-density-hotfix'), "Matching compact CSS injection missing.");
assert(matchingHtml.includes("question.behavior?.allowUnpairedDistractors !== true"), "Existing Matching validator patch was lost.");

const wordSlashHtml = await window.fetch("https://example.test/DUDUQ_WORD_SLASH.html?year2=1").then((response) => response.text());
assert(wordSlashHtml.includes("Math.max(8, arenaHeight - metrics.height - 10)"), "Word Slash visible-entry spawn patch missing.");
assert(wordSlashHtml.includes("90 + index * 220"), "Word Slash immediate initial spawn patch missing.");

const bubbleHtml = await window.fetch("https://example.test/DUDUQ_BUBBLE_POP.html?year2=1").then((response) => response.text());
assert(bubbleHtml.includes("data:image\\/"), "Bubble Pop direct smart-image URL runtime patch missing.");
assert(window.__DUDUQ_YEAR2_MECHANICS_REGRESSION_FETCH_PATCH__, "Year 2 mechanics runtime patch marker missing.");

console.log(JSON.stringify({
  status: "PASS",
  version: window.DuduQYear2V23Factory.mechanicsRegressionHotfixVersion,
  total,
  totalWordSlash,
  totalBubble,
  totalTargetImages,
  totalTargetFallbacks,
  totalCompactMatching,
  report
}, null, 2));

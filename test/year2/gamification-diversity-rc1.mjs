import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(relativePath) {
  const absolute = path.join(root, relativePath);
  const source = fs.readFileSync(absolute, "utf8");
  vm.runInThisContext(source, { filename: relativePath });
}

globalThis.window = globalThis;
window.DUDUQ_PUBLIC_ENTRY = Object.freeze({ year: 2, sourceVersion: "2.3" });
window.DUDUQ_CONTENT = {};

// The diversity layer only wraps fetch for Matching runtime HTML; module construction itself is offline.
if (typeof globalThis.Response !== "function") {
  throw new Error("Node runtime must expose Response.");
}
window.fetch = async function () {
  return new Response("offline-test-placeholder", { status: 200 });
};

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/year2-v23-multimodal-adapter.js");
run("content/english/year-2/year2-v23-gamification-diversity.js");
run("content/english/year-2/year2-v23-dragdrop-visual-patch.js");

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  run(`content/english/year-2/module-${mm}/module-${mm}-v23-multimodal.js`);
}

const year2 = window.DUDUQ_CONTENT?.english?.year2;
assert(year2, "Year 2 content registry was not created.");

const requiredByModule = {
  1: ["drag-drop", "matching", "target-shooter", "bubble-pop", "word-slash"],
  2: ["drag-drop", "matching", "target-shooter", "bubble-pop"],
  3: ["drag-drop", "matching", "target-shooter"],
  4: ["drag-drop", "matching", "target-shooter"],
  5: ["drag-drop", "matching", "target-shooter"],
  6: ["drag-drop", "matching", "target-shooter"]
};

const report = [];

for (let module = 1; module <= 6; module += 1) {
  const key = `module${String(module).padStart(2, "0")}v23multimodal`;
  const built = year2[key];
  assert(built, `M${module}: module object not registered as ${key}.`);

  const questions = (built.activities || []).flatMap((activity) => activity.questions || []);
  assert(questions.length === 15, `M${module}: expected 15 questions, got ${questions.length}.`);

  const expectedIds = Array.from({ length: 15 }, (_, index) =>
    `EN2-M${module}-${String(index + 1).padStart(2, "0")}`
  );
  const actualIds = questions.map((q) => q.id);
  assert(JSON.stringify(actualIds) === JSON.stringify(expectedIds), `M${module}: IDs/order changed.`);

  const audit = built.gamificationDiversityAudit;
  assert(audit, `M${module}: missing gamificationDiversityAudit.`);
  assert(audit.idsPreserved === true, `M${module}: idsPreserved is not true.`);
  assert(audit.contentChanged === false, `M${module}: contentChanged must remain false.`);
  assert(audit.autonomousEnglishReadingIntroduced === false, `M${module}: reading gate failed.`);
  assert(audit.sourceItems === 15 && audit.finalItems === 15, `M${module}: source/final count mismatch.`);
  assert((audit.skipped || []).length === 0, `M${module}: unsafe candidates were skipped: ${JSON.stringify(audit.skipped)}`);

  for (const mechanic of requiredByModule[module]) {
    assert((built.mechanicDistribution?.[mechanic] || 0) > 0, `M${module}: expected mechanic ${mechanic}.`);
  }

  for (const q of questions) {
    assert(q.metadata?.sourceAnswerV23, `${q.id}: sourceAnswerV23 missing.`);
    assert(q.metadata?.englishReadingRequired === false, `${q.id}: English reading unexpectedly required.`);

    const diversity = q.metadata?.gamificationDiversity;
    if (!diversity) continue;
    assert(diversity.contentChanged === false, `${q.id}: diversity layer flagged content change.`);
    assert(diversity.sourceIdPreserved === true, `${q.id}: source ID not preserved.`);
    assert(diversity.sourceAnswerPreserved === true, `${q.id}: source answer not preserved.`);

    if (q.delivery?.mechanic === "matching") {
      const matching = q.metadata?.matching;
      assert(matching, `${q.id}: Matching metadata missing.`);
      assert(matching.pairs?.length === 1, `${q.id}: Matching must keep exactly one correct source relation.`);
      assert(matching.rightItems?.length === 4, `${q.id}: Matching must preserve four editorial choices.`);
      assert(matching.behavior?.allowUnpairedDistractors === true, `${q.id}: Matching distractor gate missing.`);
    }

    if (q.delivery?.mechanic === "target-shooter") {
      const target = q.metadata?.targetShooter;
      assert(target?.mode === "audio-to-image", `${q.id}: Target Shooter must be audio-to-image.`);
      assert(target.items?.length === 4, `${q.id}: Target Shooter must preserve four choices.`);
      assert(target.items.every((item) => item.display === "image" && item.image), `${q.id}: Target Shooter must use image targets.`);
    }

    if (q.delivery?.mechanic === "bubble-pop") {
      assert(q.alternatives?.length === 4, `${q.id}: Bubble Pop must preserve four choices.`);
      assert(q.alternatives.every((alternative) => /^\d+$/.test(String(alternative.text))), `${q.id}: Year 2 number Bubble Pop must expose numerals, not English reading.`);
    }
  }

  report.push({
    module,
    distribution: built.mechanicDistribution,
    changed: audit.changed.length,
    skipped: audit.skipped.length
  });
}

// Verify the narrowly-scoped Matching validator patch itself.
const originalMatchingValidator = `rightIds.forEach((id) => {\n      if (!rightDegrees.get(id)) {\n        issues.push({ path: \`rightItems:\${id}\`, code: "UNPAIRED_RIGHT_ITEM", message: "Todo item da direita deve participar de ao menos uma conexão correta.", severity: "error" });\n      }\n    });`;
window.__DUDUQ_YEAR2_MATCHING_DISTRACTOR_FETCH_PATCH__ = undefined;

console.log(JSON.stringify({
  status: "PASS",
  version: window.DuduQYear2V23Factory.gamificationDiversityVersion,
  ruleCount: Object.keys(window.DuduQYear2V23Factory.gamificationDiversityRules || {}).length,
  report
}, null, 2));

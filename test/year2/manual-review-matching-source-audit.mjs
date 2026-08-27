import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
function run(relativePath) {
  vm.runInThisContext(fs.readFileSync(path.join(root, relativePath), "utf8"), { filename: relativePath });
}

globalThis.window = globalThis;
window.DUDUQ_PUBLIC_ENTRY = Object.freeze({ year: 2, sourceVersion: "2.3" });
window.DUDUQ_CONTENT = {};
if (typeof globalThis.Response !== "function") throw new Error("Response required");
window.fetch = async () => new Response("offline", { status: 200 });

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/year2-v23-multimodal-adapter.js");
run("content/english/year-2/year2-v23-gamification-diversity.js");
run("content/english/year-2/year2-v23-gamification-router-compat.js");
run("content/english/year-2/year2-v23-dragdrop-visual-patch.js");

const report = [];
for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  run(`content/english/year-2/module-${mm}/module-${mm}-v23-multimodal.js`);
  const key = `module${mm}v23multimodal`;
  const built = window.DUDUQ_CONTENT?.english?.year2?.[key];
  for (const activity of built?.activities || []) {
    for (const question of activity.questions || []) {
      if (question?.delivery?.mechanic !== "matching") continue;
      const matching = question.metadata?.matching || {};
      report.push({
        module,
        id: question.id,
        topic: question.metadata?.topic || activity.topic || activity.title || null,
        sourcePrompt: question.metadata?.sourcePromptV23 || null,
        sourceAlternatives: question.metadata?.sourceAlternativesV23 || [],
        sourceAnswer: question.metadata?.sourceAnswerV23 || null,
        diversityRule: question.metadata?.gamificationDiversity?.rule || null,
        fromMechanic: question.metadata?.gamificationDiversity?.fromMechanic || null,
        currentMode: matching.mode || null,
        currentLeft: matching.leftItems || [],
        currentRight: matching.rightItems || [],
        currentAssets: matching.assets || {}
      });
    }
  }
}
console.log(JSON.stringify({ status: "PASS", matchingCount: report.length, report }, null, 2));

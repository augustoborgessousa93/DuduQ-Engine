import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function run(relativePath) {
  const absolute = path.join(root, relativePath);
  vm.runInThisContext(fs.readFileSync(absolute, "utf8"), { filename: relativePath });
}

globalThis.window = globalThis;
window.DUDUQ_PUBLIC_ENTRY = Object.freeze({ year: 2, sourceVersion: "2.3" });
window.DUDUQ_CONTENT = {};

if (typeof globalThis.Response !== "function") {
  throw new Error("Node runtime must expose Response.");
}
window.fetch = async () => new Response("offline-test-placeholder", { status: 200 });

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/year2-v23-multimodal-adapter.js");
run("content/english/year-2/year2-v23-gamification-diversity.js");
run("content/english/year-2/year2-v23-gamification-router-compat.js");
run("content/english/year-2/year2-v23-manual-review-hotfix.js");
run("content/english/year-2/year2-v23-dragdrop-visual-patch.js");

const failures = [];
const successes = [];

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  try {
    run(`content/english/year-2/module-${mm}/module-${mm}-v23-multimodal.js`);
    const key = `module${mm}v23multimodal`;
    const built = window.DUDUQ_CONTENT?.english?.year2?.[key];
    const matching = (built?.activities || [])
      .flatMap((activity) => activity.questions || [])
      .filter((question) => question?.delivery?.mechanic === "matching")
      .map((question) => ({
        id: question.id,
        pairs: question.metadata?.matching?.pairs?.length || 0,
        left: question.metadata?.matching?.leftItems?.length || 0,
        right: question.metadata?.matching?.rightItems?.length || 0
      }));
    successes.push({ module, matching });
  } catch (error) {
    failures.push({ module, error: error?.message || String(error) });
  }
}

console.log(JSON.stringify({ status: failures.length ? "BLOCKED" : "PASS", successes, failures }, null, 2));
if (failures.length) process.exit(1);

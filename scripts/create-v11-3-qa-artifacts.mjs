import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "docs/qa");
await mkdir(outDir, { recursive: true });
const load = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const originalLog = console.log;
console.log = () => {};
const { report: sourceQa } = await import("./qa-v11-3-source-product.mjs");
console.log = originalLog;
const mechanicErrors = [
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:intro:core/duduq-module-flow.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:intro:play/intro-module/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:intro:play/intro-module/intro-module.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:target-shooter:play/target-shooter/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:target-shooter:test/target-shooter/gold-master-clean-v2/src/static-view.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:target-shooter:test/target-shooter/gold-master-clean-v2/src/target-shooter-gameplay.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:target-shooter:integration:core/duduq-target-shooter-content.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:bubble-pop:play/bubble-pop/bubble-pop.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:bubble-pop:play/bubble-pop/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:drag-drop-multimedia:play/drag-drop-multimedia/drag-drop-multimedia-gameplay.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:drag-drop-multimedia:play/drag-drop-multimedia/drag-drop-multimedia.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:drag-drop-multimedia:play/drag-drop-multimedia/drag-drop-multimedia.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:drag-drop-multimedia:play/drag-drop-multimedia/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:drag-drop:play/drag-drop/drag-drop.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:drag-drop:play/drag-drop/drag-drop.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:drag-drop:play/drag-drop/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:matching:play/matching/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:matching:test/matching/gold-master-candidate-v1/src/app.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:matching:test/matching/gold-master-candidate-v1/src/core-components.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:matching:test/matching/gold-master-candidate-v1/src/matching-board.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:smart-sentence-complete:play/smart-sentence/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:smart-sentence-complete:play/smart-sentence/smart-sentence.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:smart-sentence-complete:play/smart-sentence/smart-sentence.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:smart-sentence-order:play/smart-sentence/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:smart-sentence-order:play/smart-sentence/smart-sentence.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:smart-sentence-order:play/smart-sentence/smart-sentence.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:memory-quest:play/memory-quest/index.html",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:memory-quest:play/memory-quest/memory-quest-contract.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:memory-quest:play/memory-quest/memory-quest.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:memory-quest:play/memory-quest/memory-quest.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-y1m01-module-runtime.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-canonical-screen-transition.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-module-flow.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/ui/duduq-canonical-header-hud.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/ui/duduq-canonical-question-hud.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-canonical-question-hud.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-live-hud.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-page-transition.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-page-transition.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-transition.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-transition.css",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/audio/duduq-sound-system.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/audio/duduq-sound-manifest.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-sound.js",
  "CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:core/duduq-content-audio.js",
  "PRODUCTION_ROUTE_OWNER_MISMATCH:play/target-shooter/index.html:/runtime/gold-masters/target-shooter/src/static-view.js"
];
const modules = [];
const activityRoutes = [];
const routeByMechanic = {
  "target-shooter": "/play/target-shooter/", "bubble-pop": "/play/bubble-pop/",
  "drag-drop-multimedia": "/play/drag-drop-multimedia/", "drag-drop": "/play/drag-drop/",
  matching: "/play/matching/", "memory-quest": "/play/memory-quest/",
  "smart-sentence-complete": "/play/smart-sentence/", "smart-sentence-order": "/play/smart-sentence/"
};
for (let year = 1; year <= 5; year += 1) {
  for (let number = 1; number <= 6; number += 1) {
    const moduleId = `Y${year}M${String(number).padStart(2, "0")}`;
    const modulePath = `content/english/year-${year}/module-${String(number).padStart(2, "0")}`;
    const metadata = await load(`${modulePath}/module.json`);
    const questionDoc = await load(`${modulePath}/questions.json`);
    const sourceRoute = `/play/english/year-${year}/module-${String(number).padStart(2, "0")}/`;
    modules.push({ moduleId, year, title: metadata.title, sourceRoute, officialUrl: null, deploymentStatus: "NOT_PUBLISHED_SOURCE_GATE_FAILED" });
    for (const item of questionDoc.items || []) {
      const itemId = item.item_id || item.itemId;
      const mechanicId = item.mechanicId || item.runtimeMechanic || item.mecanica_preferida;
      const route = routeByMechanic[mechanicId];
      const questionId = item.questionId || itemId?.match(/Q\d{3}$/)?.[0];
      const url = route && itemId ? `${route}?duduqModule=${encodeURIComponent(moduleId)}&duduqItem=${encodeURIComponent(itemId)}` : null;
      activityRoutes.push({ moduleId, itemId, questionId, mechanicId, sourceRoute: url, officialUrl: null, status: url ? "SOURCE_ROUTE_RESOLVED_NOT_DEPLOYED" : "ROUTE_BLOCKER" });
    }
  }
}

const blockers = mechanicErrors.map((message) => ({ severity: "P0_BLOCKER", gate: "CANONICAL_MECHANIC_BUILD_GATE", message }));
const report = {
  feature: "DUDUQ_FULL_600_ACTIVITY_QA_AND_DEPLOYMENT_V11_3",
  generatedAt: new Date().toISOString(),
  status: blockers.length || sourceQa.status !== "PASS" ? "ISSUE" : "PASS",
  sourceProduct: { modules: sourceQa.modules, activities: sourceQa.activities, yearTotals: sourceQa.yearTotals, sourceContracts: sourceQa.status },
  validators: {
    curricular: { status: "PASS", modules: 30, yearCounts: [6, 6, 6, 6, 6], vocabularyItems: 323 },
    deterministicContracts: { status: "PASS", contracts: 460, modules: 23, mediaRequirements: 1015, audioRequirements: 566, errors: 0 },
    mechanicEligibility: { status: "PASS", modules: 30, errors: 0 },
    canonicalMechanicBuildGate: { status: "FAIL", implementationCount: 3367, errors: mechanicErrors }
  },
  staticActivityQa: sourceQa,
  specialCurriculumChecks: {
    y4m04Sports: "soccer, basketball, tennis, volleyball",
    y5m05Q006: "LIVING ROOM/KITCHEN; TV→LIVING ROOM; PLATE→KITCHEN",
    year1AndY2M01: "preserved; no wholesale reauthoring in this mission"
  },
  humanReview: {
    audioStatus: "TECHNICAL_PASS_HUMAN_REVIEW_PENDING",
    imageRefinementPending: 711,
    newAudioGeneratedQcPass: 555,
    fullHumanReviewRequiredBeforeDeployment: false
  },
  blockers,
  build: { status: "NOT_RUN_SOURCE_GATE_FAILED", pipeline: "scripts/build-cloudflare-pages.mjs", dist: "dist-pages (last valid artifact preserved; not replaced)" },
  cloudflare: { project: "duduq-engine", status: "NOT_RUN", deploymentId: null, productionUrl: null },
  productionVerification: { status: "NOT_RUN", reason: "Build gate failed; deployment was not authorized to proceed under the conditional mission gate." },
  routes: { moduleEntries: modules.length, activities: activityRoutes.length, officialLinksPublished: false },
  changes: [
    "scripts/build-cloudflare-pages.mjs: include all 30 module entry trees and copy only media referenced by the production contracts",
    "play/home/modules.json: list all 30 modules",
    "play/home/home.js: show READY_FOR_RELEASE correctly",
    "play/english/year-2/module-01/index.html: add shared-runtime entry for Y2M01",
    "scripts/qa-v11-3-source-product.mjs: add read-only 600-activity/static-asset QA",
    "scripts/create-v11-3-qa-artifacts.mjs: add reproducible QA/link manifest generation"
  ],
  safety: { broadReset: false, commit: "NONE", push: "NONE", tag: "NONE", rea: "PAUSED", penpotOperations: 0 }
};

const routeManifest = {
  feature: report.feature,
  deploymentStatus: "NOT_DEPLOYED",
  activityCount: activityRoutes.length,
  modules,
  activities: activityRoutes
};
const linksJson = { feature: report.feature, status: "OFFICIAL_URLS_NOT_PUBLISHED", modules };
const markdown = [
  "# DUDUQ English — Official Module Links V11.3",
  "",
  "Deployment was not performed: the canonical-mechanics build gate reports P0 blockers. These source routes are not official production URLs.",
  "",
  "| Year | Module | Topic | Source entry route | Official URL | Status |",
  "|---:|---|---|---|---|---|",
  ...modules.map((module) => `| ${module.year} | ${module.moduleId} | ${module.title.replaceAll("|", "\\|")} | \`${module.sourceRoute}\` | NOT PUBLISHED | ${module.deploymentStatus} |`),
  "",
  "Official production links will be added only after the source gate, official build, and Cloudflare production verification pass.",
  ""
].join("\n");
const qaMarkdown = [
  "# DUDUQ English Full Product QA V11.3",
  "",
  `Status: **${report.status}**. Build and deployment were not run because the conditional source gate failed.`,
  "",
  `- Source structural scan: ${sourceQa.modules}/30 modules, ${sourceQa.activities}/600 activities, all five year totals 120/120.` ,
  `- Answer keys: ${sourceQa.answerKeys}/600; visible instructions: ${sourceQa.visibleInstructions}/600; physical media/audio refs missing: ${sourceQa.missingMediaOrAudio}.`,
  "- Curriculum validator: PASS; deterministic contract validator: PASS; mechanic eligibility: PASS.",
  `- Canonical mechanic build gate: FAIL, ${mechanicErrors.length} errors.`,
  "",
  "## Exact build blockers",
  "",
  ...mechanicErrors.map((message) => `- P0: \`${message}\``),
  "",
  "Cloudflare project: duduq-engine. Deployment ID and production URL: none (not deployed). Existing dist-pages was not replaced. Human audio/visual refinements remain separate from the technical gate.",
  ""
].join("\n");

await Promise.all([
  writeFile(path.join(outDir, "DUDUQ_ENGLISH_FULL_PRODUCT_QA_V11_3.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(path.join(outDir, "DUDUQ_ENGLISH_FULL_PRODUCT_QA_V11_3.md"), qaMarkdown, "utf8"),
  writeFile(path.join(outDir, "DUDUQ_ENGLISH_ACTIVITY_ROUTE_MANIFEST_V11_3.json"), `${JSON.stringify(routeManifest, null, 2)}\n`, "utf8"),
  writeFile(path.join(outDir, "DUDUQ_ENGLISH_OFFICIAL_MODULE_LINKS_V11_3.json"), `${JSON.stringify(linksJson, null, 2)}\n`, "utf8"),
  writeFile(path.join(outDir, "DUDUQ_ENGLISH_OFFICIAL_MODULE_LINKS_V11_3.md"), markdown, "utf8")
]);
console.log(JSON.stringify({ status: report.status, sourceModules: sourceQa.modules, activities: sourceQa.activities, p0: blockers.length, canonicalGateErrors: mechanicErrors.length, reports: ["docs/qa/DUDUQ_ENGLISH_FULL_PRODUCT_QA_V11_3.json", "docs/qa/DUDUQ_ENGLISH_FULL_PRODUCT_QA_V11_3.md", "docs/qa/DUDUQ_ENGLISH_ACTIVITY_ROUTE_MANIFEST_V11_3.json", "docs/qa/DUDUQ_ENGLISH_OFFICIAL_MODULE_LINKS_V11_3.md", "docs/qa/DUDUQ_ENGLISH_OFFICIAL_MODULE_LINKS_V11_3.json"] }, null, 2));

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const { chromium } = await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const base = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4177";
const manifestPath = path.join(root, "docs/qa/DUDUQ_ENGLISH_600_ACTIVITY_PRODUCTION_ROUTES_2026-10-20.json");
const output = path.resolve(root, process.env.DUDUQ_600_BOOT_OUTPUT || "docs/qa/DUDUQ_FINAL_600_ACTIVITY_QA_MATRIX_2026-10-20.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
await context.addInitScript(() => {
  const params = new URLSearchParams(location.search);
  const moduleId = params.get("duduqModule") || "";
  const itemId = params.get("duduqItem") || "";
  if (moduleId === "Y1M01") {
    const index = Number(itemId.match(/Q(\d{3})$/)?.[1]) - 1;
    if (index >= 0 && index < 20) sessionStorage.setItem("duduq-module:Y1M01", JSON.stringify({ moduleId, index, itemId }));
  }
});
const page = await context.newPage();
let active = null;
const pageErrors = [];
const httpErrors = [];
page.on("pageerror", error => pageErrors.push({ activityId: active, url: page.url(), error: error.message }));
page.on("response", response => {
  if (response.status() >= 400) httpErrors.push({ activityId: active, status: response.status(), url: response.url() });
});
const results = [];
try {
  for (const expected of manifest.activities) {
    active = expected.activityId;
    const route = new URL(expected.route, base);
    const errorsAtStart = pageErrors.length, requestsAtStart = httpErrors.length;
    let result;
    try {
      await page.goto(route.href, { waitUntil: "domcontentloaded", timeout: 15000 });
      const runtime = await page.evaluate(async () => {
        const moduleId = new URL(location.href).searchParams.get("duduqModule") || "";
        const api = moduleId === "Y1M01" ? window.DuduQY1M01 : window.DuduQProductionQuestionBootstrap;
        if (!api?.ready) throw new Error("ACTIVITY_BOOTSTRAP_MISSING");
        const context = await api.ready;
        const root = document.querySelector("#game, #smart-sentence-root, #memory-quest-root");
        const questionHud = document.querySelector(".duduq-canonical-question-hud, .smart-sentence-instruction, .question-panel");
        const visibleText = (node) => Boolean(node && node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
        return {
          apiEnabled: Boolean(api.enabled),
          moduleId: context?.moduleId || api.moduleId,
          itemId: context?.item?.item_id || context?.item?.questionId || context?.item?.id,
          mechanic: context?.mechanic || context?.item?.mechanicId,
          root: root?.id || root?.className || null,
          questionRendered: visibleText(questionHud) && Boolean(questionHud.innerText.trim()),
          instruction: Boolean(window.DuduQInstructionAudioConfig?.instructionAudioEnId),
          productionAlert: document.querySelector(".smart-sentence-production-error [role='alert']")?.innerText || document.querySelector("[role='alert']")?.innerText || null,
          runtimeState: root?.dataset.duduqInteractionState || root?.dataset.interactionState || null,
          documentScrollX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          documentScrollY: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight)
        };
      });
      if (expected.mechanic === "smart-sentence-complete") await page.waitForTimeout(400);
      const identity = runtime.moduleId === expected.module && runtime.itemId === expected.activityId && runtime.mechanic === expected.mechanic;
      const activityErrorToken = `${expected.module}:${expected.activityId.slice(expected.module.length + 1)}`;
      const matchingErrors = pageErrors.filter(entry => entry.error.includes(expected.activityId) || entry.error.includes(activityErrorToken));
      const strictBootstrapFailure = matchingErrors.some(entry => entry.error.startsWith("SMART_SENTENCE_AUDIO_FLOW_V2_ASSET_MISSING")) ||
        Boolean(runtime.productionAlert?.includes("SMART_SENTENCE_AUDIO_FLOW_V2_ASSET_MISSING"));
      const boot = Boolean(runtime.apiEnabled && runtime.root && identity && !strictBootstrapFailure);
      result = {
        moduleId: expected.module, questionId: expected.activityId, mechanic: expected.mechanic, route: expected.route,
        boot, identity, instruction: runtime.instruction ? "BOUND" : "ISSUE", runtime,
        bootstrapFailure: strictBootstrapFailure ? matchingErrors.map(entry => entry.error) : [],
        wrongPath: "NOT_RUN", incorrectFeedbackTitle: "NOT_RUN", incorrectFeedbackSubtitle: "NOT_RUN",
        tryAgainVisible: "NOT_RUN", tryAgainClickable: "NOT_RUN", retryReady: "NOT_RUN",
        correctPath: "NOT_RUN", correctFeedbackTitle: "NOT_RUN", correctFeedbackSubtitle: "NOT_RUN",
        continueVisible: "NOT_RUN", continueEnabled: "NOT_RUN", continueClickable: "NOT_RUN", advance: "NOT_RUN",
        assets: httpErrors.slice(requestsAtStart), console: matchingErrors,
        scrollX: runtime.documentScrollX, scrollY: runtime.documentScrollY,
        interactionFlow: "NOT_RUN", result: boot ? "BOOT_PASS_FLOW_NOT_TESTED" : "BOOT_FAIL"
      };
    } catch (error) {
      result = {
        moduleId: expected.module, questionId: expected.activityId, mechanic: expected.mechanic, route: expected.route,
        boot: false, identity: false, instruction: "ISSUE", runtime: null,
        bootstrapFailure: [],
        wrongPath: "NOT_RUN", incorrectFeedbackTitle: "NOT_RUN", incorrectFeedbackSubtitle: "NOT_RUN",
        tryAgainVisible: "NOT_RUN", tryAgainClickable: "NOT_RUN", retryReady: "NOT_RUN",
        correctPath: "NOT_RUN", correctFeedbackTitle: "NOT_RUN", correctFeedbackSubtitle: "NOT_RUN",
        continueVisible: "NOT_RUN", continueEnabled: "NOT_RUN", continueClickable: "NOT_RUN", advance: "NOT_RUN",
        assets: httpErrors.slice(requestsAtStart), console: [...pageErrors.slice(errorsAtStart), error.message],
        scrollX: null, scrollY: null, interactionFlow: "NOT_RUN", result: "BOOT_FAIL"
      };
    }
    results.push(result);
    if (results.length % 50 === 0) console.log(`BROWSER_ACTIVITY_BOOT ${results.length}/${manifest.activities.length}`);
  }
} finally {
  await browser.close();
}
const failures = results.filter(item => item.result === "BOOT_FAIL");
const report = {
  feature: "DUDUQ_FINAL_600_ACTIVITY_BROWSER_BOOT_MATRIX",
  testedAt: new Date().toISOString(),
  source: base,
  requested: 600,
  rendered: results.length,
  browserBootPass: results.filter(item => item.boot).length,
  browserBootFail: failures.length,
  fullInteractionFlowTested: 0,
  fullInteractionFlowRequired: 600,
  pageErrors: pageErrors.length,
  pageErrorDetails: pageErrors,
  httpErrors: httpErrors.length,
  httpErrorDetails: httpErrors,
  strictAudioBootstrapFailures: results.filter(item => item.bootstrapFailure?.length).length,
  identityCorrelated: results.filter(item => item.identity).length,
  interactionFlowsCompleted: 0,
  failures,
  result: results.length === 600 && failures.length === 0 ? "PARTIAL_BOOT_ONLY_NOT_CERTIFIED" : "ISSUE",
  activities: results
};
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ result: report.result, requested: report.requested, rendered: report.rendered, browserBootPass: report.browserBootPass, browserBootFail: report.browserBootFail, pageErrors: report.pageErrors, httpErrors: report.httpErrors, fullInteractionFlowTested: report.fullInteractionFlowTested, output }, null, 2));
if (report.result === "ISSUE") process.exitCode = 1;

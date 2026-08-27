import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-02/index.html?qa=bubble-runtime-asset-bridge-diagnostic-rc3`;
const OUTPUT_DIR = path.resolve("test-results/year2-bubble-runtime-asset-bridge-diagnostic-rc3");

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(30_000);

const consoleMessages = [];
const pageErrors = [];
page.on("console", (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
page.on("pageerror", (error) => pageErrors.push(error.message));

// Runs in the main page and every same-origin mechanic iframe before application scripts.
// This captures the exact DUDUQ_LOAD_CONTENT payload before Bubble React consumes it.
await page.addInitScript(() => {
  window.__DUDUQ_QA_MESSAGE_TRACE__ = [];
  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "DUDUQ_LOAD_CONTENT") return;
    try {
      window.__DUDUQ_QA_MESSAGE_TRACE__.push(JSON.parse(JSON.stringify(data)));
    } catch (_) {
      window.__DUDUQ_QA_MESSAGE_TRACE__.push({ type: data.type, serializationFailed: true });
    }
  });
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => Boolean(
    window.DUDUQ_CONTENT?.english?.year2?.module02v23multimodal &&
    window.DuduQIntro &&
    window.DuduQ
  ), null, { timeout: 30_000 });

  const parentModel = await page.evaluate(() => {
    const built = window.DUDUQ_CONTENT.english.year2.module02v23multimodal;
    const firstActivity = built.activities[0];
    const firstQuestion = firstActivity.questions[0];
    return {
      moduleAudit: built.mechanicsRegressionRouterCompatibilityAudit || null,
      activityId: firstActivity.id,
      activityMechanic: firstActivity.mechanic,
      questionId: firstQuestion.id,
      questionMechanic: firstQuestion.delivery?.mechanic || null,
      statement: firstQuestion.statement,
      alternatives: (firstQuestion.alternatives || []).map((alternative) => ({
        id: alternative.id,
        text: alternative.text,
        imageEnabled: alternative?.image?.enabled,
        imageSrc: alternative?.image?.src || null,
        imageAssetKey: alternative?.metadata?.imageAssetKey || null,
        smartAssetStatus: alternative?.metadata?.smartAssetStatus || null
      }))
    };
  });

  const startMission = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
  await startMission.waitFor({ state: "visible", timeout: 25_000 });
  await startMission.click();

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === 2 && session?.totalSteps > 0 && session?.stepIndex === 0);
  }, null, { timeout: 30_000 });

  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 20_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "Bubble iframe inaccessible.");

  await frame.locator(".duduq-bp-bubble").first().waitFor({ state: "visible", timeout: 25_000 });
  await page.waitForTimeout(500);

  const frameState = await frame.evaluate(() => {
    let evalAssets = null;
    let evalAssetsType = "unavailable";
    let evalAssetsKeys = [];
    try {
      evalAssetsType = typeof BUBBLE_POP_ASSETS;
      if (typeof BUBBLE_POP_ASSETS !== "undefined") {
        evalAssets = BUBBLE_POP_ASSETS;
        evalAssetsKeys = Object.keys(BUBBLE_POP_ASSETS || {}).slice(0, 50);
      }
    } catch (error) {
      evalAssetsType = `error:${error?.message || String(error)}`;
    }

    const trace = Array.isArray(window.__DUDUQ_QA_MESSAGE_TRACE__)
      ? window.__DUDUQ_QA_MESSAGE_TRACE__
      : [];
    const loadMessages = trace.filter((entry) => entry?.type === "DUDUQ_LOAD_CONTENT");
    const last = loadMessages.at(-1) || null;
    const adaptedQuestions = last?.payload?.questions || [];
    const firstAdapted = adaptedQuestions[0] || null;

    const globalCandidates = Object.keys(window)
      .filter((key) => /BUBBLE|DUDUQ.*ASSET/i.test(key))
      .sort();

    return {
      href: location.href,
      bridgeMarker: window.__DUDUQ_YEAR2_BUBBLE_ASSET_BRIDGE__ || null,
      windowBubbleAssetsType: typeof window.BUBBLE_POP_ASSETS,
      windowBubbleAssetsKeyCount: window.BUBBLE_POP_ASSETS && typeof window.BUBBLE_POP_ASSETS === "object"
        ? Object.keys(window.BUBBLE_POP_ASSETS).length
        : null,
      evalAssetsType,
      evalAssetsKeyCount: evalAssets && typeof evalAssets === "object" ? Object.keys(evalAssets).length : null,
      evalAssetsKeys,
      globalCandidates,
      messageCount: loadMessages.length,
      firstAdaptedQuestion: firstAdapted ? {
        id: firstAdapted.id,
        bubbles: (firstAdapted.bubbles || []).map((bubble) => ({
          id: bubble.id,
          label: bubble.label,
          imageAssetKey: bubble.imageAssetKey || null,
          alt: bubble.alt || null
        }))
      } : null,
      bubbleCount: document.querySelectorAll(".duduq-bp-bubble").length,
      mediaCount: document.querySelectorAll(".duduq-bp-media").length,
      bubbleText: Array.from(document.querySelectorAll(".duduq-bp-bubble")).map((node) => String(node.innerText || "").trim()),
      bodyText: String(document.body?.innerText || "").slice(0, 1400)
    };
  });

  const officialKeys = parentModel.alternatives
    .map((alternative) => alternative.imageAssetKey)
    .filter(Boolean);

  const bridgeProbe = await frame.evaluate((keys) => {
    const result = [];
    for (const key of keys) {
      let evalValue = null;
      try {
        evalValue = typeof BUBBLE_POP_ASSETS !== "undefined" ? BUBBLE_POP_ASSETS?.[key] || null : null;
      } catch (_) {}
      result.push({
        key,
        windowValue: window.BUBBLE_POP_ASSETS?.[key] || null,
        evalValue
      });
    }
    return result;
  }, officialKeys);

  const report = {
    status: "DIAGNOSTIC",
    parentModel,
    frameState,
    bridgeProbe,
    consoleMessages,
    pageErrors
  };

  await page.screenshot({ path: path.join(OUTPUT_DIR, "M02-desktop-bubble-runtime.png"), fullPage: false });
  await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page.close();
  await browser.close();
}

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/word-slash-frame-diagnostic-rc2");
const REPORT_FILE = path.join(OUTPUT_DIR, "EN2-M1-08-frame-lifecycle.json");
const SCREENSHOT_FILE = path.join(OUTPUT_DIR, "EN2-M1-08-frame-lifecycle.png");
const MODULE_URL = `${BASE_URL}/content/english/year-2/module-01/index.html?qa=word-slash-frame-diagnostic-rc2`;
const SAMPLE_DELAYS = [0, 250, 750, 1500, 3000, 6000, 10000];

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(25_000);

const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    consoleMessages.push({ type: message.type(), text: message.text() });
  }
});
page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack || null }));
page.on("requestfailed", (request) => failedRequests.push({
  url: request.url(),
  method: request.method(),
  failure: request.failure()?.errorText || "unknown"
}));

await page.route("**/engine/duduq-player-v1.js*", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;"
  });
});

async function sample(label) {
  const host = await page.evaluate(() => {
    const root = document.querySelector("#root");
    const iframes = Array.from(root?.querySelectorAll("iframe") || []).map((iframe, index) => {
      const rect = iframe.getBoundingClientRect();
      return {
        index,
        title: iframe.title || "",
        srcAttribute: iframe.getAttribute("src") || "",
        srcdocLength: String(iframe.getAttribute("srcdoc") || iframe.srcdoc || "").length,
        connected: iframe.isConnected,
        visible: rect.width > 0 && rect.height > 0 && getComputedStyle(iframe).display !== "none" && getComputedStyle(iframe).visibility !== "hidden",
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) }
      };
    });
    return {
      rootChildCount: root?.children?.length || 0,
      rootText: String(root?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 600),
      rootHtmlPrefix: String(root?.innerHTML || "").slice(0, 1200),
      iframes,
      mechanics: window.DuduQ?.listMechanics?.().map((entry) => ({ id: entry.id, version: entry.version })) || []
    };
  });

  const frames = [];
  for (const frame of page.frames()) {
    let state;
    try {
      state = await frame.evaluate(() => ({
        href: location.href,
        readyState: document.readyState,
        bodyExists: Boolean(document.body),
        bodyChildCount: document.body?.children?.length || 0,
        bodyText: String(document.body?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 600),
        rootChildCount: document.querySelector("#root")?.children?.length || 0,
        wsObjectCount: document.querySelectorAll(".duduq-ws-object").length,
        runtimeError: String(document.querySelector("#duduq-runtime-error")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 1000),
        bootText: String(document.querySelector("#duduq-boot")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 600)
      }));
    } catch (error) {
      state = { evaluationError: error.message };
    }
    frames.push({ name: frame.name(), url: frame.url(), ...state });
  }

  return { label, atMs: Date.now() - startedAt, host, frames };
}

let startedAt = Date.now();
let startResult = null;
let fatalError = null;
const samples = [];

try {
  await page.goto(MODULE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(
    window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal?.mechanicsRegressionAudit &&
    window.DuduQ?.hasMechanic?.("word-slash")
  ), null, { timeout: 25_000 });

  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-word-slash-frame-diagnostic-rc2" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
    document.documentElement.removeAttribute("data-duduq-initial-speech-gate");
  });

  startResult = await page.evaluate(() => {
    const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
    const activity = (built.activities || []).find((entry) =>
      (entry.questions || []).some((question) => question.id === "EN2-M1-08")
    );
    if (!activity) throw new Error("EN2-M1-08 activity not found.");
    const source = activity.questions.find((question) => question.id === "EN2-M1-08");
    const question = JSON.parse(JSON.stringify(source));
    const mechanic = question.delivery?.mechanic || activity.mechanic;
    window.DuduQ.destroy();
    const started = window.DuduQ.start({
      id: "qa-word-slash-frame-diagnostic-EN2-M1-08",
      title: "QA EN2-M1-08",
      year: built.year,
      subject: built.subject,
      module: built.module,
      container: "#root",
      steps: [{
        id: "qa-EN2-M1-08",
        mechanic,
        payload: {
          id: "qa-EN2-M1-08-payload",
          title: activity.title || "EN2-M1-08",
          subject: built.subject,
          year: built.year,
          module: built.module,
          questions: [question]
        },
        options: { contentVersion: built.version, skill: activity.skill || null }
      }]
    });
    return {
      started: Boolean(started),
      mechanic,
      registered: window.DuduQ.hasMechanic(mechanic),
      hostVersion: window.DuduQ.version,
      wordSlashAudit: question.metadata?.wordSlashPayloadAudit || null,
      wordSlashObjectCount: question.metadata?.wordSlash?.objects?.length || 0
    };
  });

  startedAt = Date.now();
  let previous = 0;
  for (const delay of SAMPLE_DELAYS) {
    const wait = Math.max(0, delay - previous);
    if (wait) await page.waitForTimeout(wait);
    samples.push(await sample(`t+${delay}ms`));
    previous = delay;
  }

  await page.screenshot({ path: SCREENSHOT_FILE, fullPage: false, timeout: 10_000 });
} catch (error) {
  fatalError = { name: error.name, message: error.message, stack: error.stack || null };
  try { samples.push(await sample("fatal-snapshot")); } catch (_) {}
  try { await page.screenshot({ path: SCREENSHOT_FILE, fullPage: false, timeout: 5_000 }); } catch (_) {}
} finally {
  const childFrames = samples.flatMap((entry) => entry.frames.filter((frame) => frame.url !== MODULE_URL));
  const loadedWordSlash = childFrames.some((frame) => frame.wsObjectCount > 0);
  const srcdocMounted = samples.some((entry) => entry.host.iframes.some((iframe) => iframe.srcdocLength > 0));
  const mountErrorText = samples.map((entry) => entry.host.rootText).find((text) => /Erro ao preparar a atividade Word Slash/i.test(text)) || "";
  const attachedBlankFrame = samples.some((entry) => entry.host.iframes.length > 0 && entry.frames.some((frame) => frame.url === "about:blank" && frame.bodyChildCount === 0));

  const classification = loadedWordSlash
    ? "WORD_SLASH_RUNTIME_RENDERED"
    : mountErrorText
      ? "WORD_SLASH_ADAPTER_PREPARE_ERROR"
      : srcdocMounted
        ? "WORD_SLASH_SRCDOC_MOUNTED_BUT_RUNTIME_NOT_RENDERED"
        : attachedBlankFrame
          ? "WORD_SLASH_IFRAME_STAYED_BLANK_BEFORE_SRCDOC"
          : "WORD_SLASH_FRAME_STATE_UNRESOLVED";

  const report = {
    status: fatalError ? "DIAGNOSTIC_ERROR" : "OBSERVED",
    contract: "YEAR2_WORD_SLASH_FRAME_LIFECYCLE_RC2",
    id: "EN2-M1-08",
    startResult,
    classification,
    fatalError,
    samples,
    consoleMessages,
    pageErrors,
    failedRequests
  };

  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    status: report.status,
    id: report.id,
    classification: report.classification,
    startResult: report.startResult,
    consoleMessages: consoleMessages.slice(-8),
    pageErrors: pageErrors.slice(-8),
    failedRequests: failedRequests.slice(-8),
    reportFile: REPORT_FILE
  }, null, 2));

  await page.close().catch(() => {});
  await browser.close().catch(() => {});
}

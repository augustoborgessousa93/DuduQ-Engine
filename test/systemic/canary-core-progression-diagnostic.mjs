import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/systemic/canary-core-progression-diagnostic");
const MODULE_URL = `${BASE}/content/english/year-1/module-01/?qa=core-progression-diagnostic`;
const VIEWPORT = { width: 1366, height: 768 };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function manifestFor(coreRelease, sourceManifest) {
  const manifest = clone(sourceManifest);
  const from = "1.0.11";
  const to = coreRelease;

  manifest.revision = coreRelease === "1.0.9" ? 143 : 145;
  manifest.core.release = coreRelease;
  manifest.core.styles = manifest.core.styles.map((entry) => ({
    ...entry,
    href: String(entry.href).replaceAll(`/core/${from}/`, `/core/${to}/`),
    release: coreRelease
  }));

  manifest.core.preMechanicScripts = manifest.core.preMechanicScripts
    .filter((entry) => coreRelease !== "1.0.9" || entry.id !== "duduq-canonical-assets-runtime")
    .map((entry) => {
      if (entry.id === "duduq-canonical-assets-runtime") return { ...entry };
      return {
        ...entry,
        src: String(entry.src).replaceAll(`/core/${from}/`, `/core/${to}/`),
        release: coreRelease
      };
    });

  manifest.core.router = {
    ...manifest.core.router,
    src: String(manifest.core.router.src).replaceAll(`/core/${from}/`, `/core/${to}/`),
    release: coreRelease
  };

  if (coreRelease === "1.0.9") {
    delete manifest.policy.canonicalAssetCatalogSchema;
    delete manifest.policy.canonicalAssetRuntimeCommit;
    manifest.status = "diagnostic-r143-core-1.0.9";
  } else {
    manifest.status = "diagnostic-r145-core-1.0.11";
  }

  return manifest;
}

function compactSession(session) {
  if (!session) return null;
  return {
    stepIndex: session.stepIndex,
    totalSteps: session.totalSteps,
    stepCompleted: session.stepCompleted,
    completed: session.completed,
    transitioning: session.transitioning,
    progress: session.progress ? {
      current: session.progress.current,
      total: session.progress.total,
      percent: session.progress.percent
    } : null
  };
}

async function runScenario(browser, coreRelease, manifest) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const pageErrors = [];
  const critical404 = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("response", (response) => {
    if (response.status() !== 404) return;
    const url = response.url();
    if (url.includes("/engine/") || url.includes("/content/english/year-1/")) critical404.push(url);
  });

  await page.route("**/engine/channels/canary-v1.json**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(manifest),
      headers: { "cache-control": "no-store" }
    });
  });

  const scenario = {
    core: coreRelease,
    manifestRevision: manifest.revision,
    nextAccepted: null,
    initial: null,
    immediateAfterNext: null,
    final: null,
    result: "UNKNOWN",
    timeout: false,
    pageErrors,
    critical404,
    trace: []
  };

  try {
    const response = await page.goto(MODULE_URL, { waitUntil: "domcontentloaded", timeout: 35_000 });
    if (!response?.ok()) throw new Error(`entry HTTP ${response?.status()}`);
    await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

    const loadedCore = await page.evaluate(() => window.DUDUQ_ENGINE_MANIFEST?.core?.release || "");
    if (loadedCore !== coreRelease) throw new Error(`expected Core ${coreRelease}, loaded ${loadedCore}`);

    await page.evaluate(() => {
      const trace = [];
      const snap = (name, detail = null) => {
        const session = window.DuduQ?.getSession?.() || null;
        const iframe = document.querySelector("iframe");
        trace.push({
          t: Math.round(performance.now() * 100) / 100,
          name,
          detail,
          session: session ? {
            stepIndex: session.stepIndex,
            totalSteps: session.totalSteps,
            stepCompleted: session.stepCompleted,
            completed: session.completed,
            transitioning: session.transitioning,
            progress: session.progress ? {
              current: session.progress.current,
              total: session.progress.total,
              percent: session.progress.percent
            } : null
          } : null,
          transitionState: window.DuduQTransition?.getState?.() || null,
          iframe: iframe ? {
            hasSrcdoc: Boolean(iframe.srcdoc),
            src: iframe.getAttribute("src") || "",
            title: iframe.contentDocument?.title || ""
          } : null
        });
      };

      window.__DUDUQ_PROGRESSION_TRACE = trace;
      window.__DUDUQ_PROGRESSION_SNAP = snap;

      [
        "duduq:step-complete",
        "duduq:step-start",
        "duduq:transition-cover-start",
        "duduq:transition-covered",
        "duduq:transition-swap",
        "duduq:transition-reveal-start",
        "duduq:transition-complete",
        "duduq:module-complete"
      ].forEach((eventName) => {
        window.addEventListener(eventName, (event) => snap(eventName, event.detail || null));
      });

      window.addEventListener("message", (event) => {
        const type = event?.data?.type;
        if (typeof type === "string" && type.startsWith("DUDUQ_")) {
          snap(`message:${type}`, null);
        }
      });
      snap("trace-installed");
    });

    const start = page.locator(".duduq-intro-start-button");
    await start.waitFor({ state: "visible", timeout: 30_000 });
    await start.click();

    await page.waitForFunction(() => {
      const session = window.DuduQ?.getSession?.();
      const iframe = document.querySelector("iframe");
      return Boolean(session && !session.transitioning && iframe?.srcdoc && window.DuduQTransition?.getState?.() === "idle");
    }, null, { timeout: 35_000 });

    scenario.initial = compactSession(await page.evaluate(() => window.DuduQ.getSession()));
    await page.evaluate(() => window.__DUDUQ_PROGRESSION_SNAP?.("pre-next-ready-condition"));

    scenario.nextAccepted = await page.evaluate(() => window.DuduQ.next({ qa: "core-progression-diagnostic", stepIndex: 0 }));
    scenario.immediateAfterNext = compactSession(await page.evaluate(() => window.DuduQ.getSession()));
    await page.evaluate(() => window.__DUDUQ_PROGRESSION_SNAP?.("immediate-after-next"));

    try {
      await page.waitForFunction(() => {
        const session = window.DuduQ?.getSession?.();
        if (!session || session.transitioning) return false;
        const iframe = document.querySelector("iframe");
        return session.stepIndex === 1 && session.completed === false && Boolean(iframe?.srcdoc) && window.DuduQTransition?.getState?.() === "idle";
      }, null, { timeout: 12_000 });
      scenario.result = "PASS";
    } catch (error) {
      scenario.timeout = true;
      scenario.result = "FAIL";
      scenario.timeoutError = String(error?.message || error);
    }

    await page.evaluate(() => window.__DUDUQ_PROGRESSION_SNAP?.("diagnostic-final"));
    scenario.final = compactSession(await page.evaluate(() => window.DuduQ.getSession()));
    scenario.trace = await page.evaluate(() => window.__DUDUQ_PROGRESSION_TRACE || []);
  } finally {
    await page.close();
  }

  return scenario;
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const sourceManifest = JSON.parse(await fs.readFile(path.resolve("engine/channels/canary-v1.json"), "utf8"));
const manifests = {
  "1.0.9": manifestFor("1.0.9", sourceManifest),
  "1.0.11": manifestFor("1.0.11", sourceManifest)
};

const browser = await chromium.launch({ headless: true });
let report;
try {
  const core109 = await runScenario(browser, "1.0.9", manifests["1.0.9"]);
  const core1011 = await runScenario(browser, "1.0.11", manifests["1.0.11"]);
  const classification = core109.result === "PASS" && core1011.result === "FAIL"
    ? "A_CORE_109_PASS_CORE_1011_FAIL"
    : core109.result === "FAIL" && core1011.result === "FAIL"
      ? "B_BOTH_FAIL"
      : core109.result === "PASS" && core1011.result === "PASS"
        ? "C_BOTH_PASS"
        : "OTHER";
  report = { contract: "DUDUQ_CORE_PROGRESSION_DIAGNOSTIC", classification, scenarios: [core109, core1011] };
} finally {
  await browser.close();
}

await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

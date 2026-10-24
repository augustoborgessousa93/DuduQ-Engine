import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const base = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4177";
const { chromium } = await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [], httpErrors = [], results = [];
page.on("pageerror", error => pageErrors.push({ url: page.url(), message: error.message }));
page.on("response", response => { if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() }); });
try {
  for (let year = 1; year <= 5; year++) for (let module = 1; module <= 6; module++) {
    const moduleId = `Y${year}M${String(module).padStart(2, "0")}`;
    const route = `/play/english/year-${year}/module-${String(module).padStart(2, "0")}/`;
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const start = page.locator("[data-intro-start]");
    await start.waitFor({ state: "visible", timeout: 10000 });
    const intro = await page.evaluate(() => ({
      module: document.querySelector(".intro-info__module")?.textContent.trim() || document.querySelector("[data-intro-module]")?.textContent.trim() || null,
      year: document.querySelector(".intro-info__grade")?.textContent.trim() || document.querySelector("[data-intro-grade]")?.textContent.trim() || null,
      cta: Boolean(document.querySelector("[data-intro-start]")?.getClientRects().length),
      scrollX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      scrollY: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight)
    }));
    await start.click();
    const expectedItem = `${moduleId}-Q001`;
    await page.waitForFunction(id => new URL(location.href).searchParams.get("duduqItem") === id, expectedItem, { timeout: 15000 });
    await page.waitForFunction(id => {
      const moduleId = new URL(location.href).searchParams.get("duduqModule");
      const api = moduleId === "Y1M01" ? window.DuduQY1M01 : window.DuduQProductionQuestionBootstrap;
      return Boolean(api?.ready);
    }, expectedItem, { timeout: 10000 });
    const runtime = await page.evaluate(async () => {
      const moduleId = new URL(location.href).searchParams.get("duduqModule");
      const api = moduleId === "Y1M01" ? window.DuduQY1M01 : window.DuduQProductionQuestionBootstrap;
      const item = await api.ready;
      return { moduleId: item?.moduleId || api.moduleId, questionId: item?.item?.item_id || item?.itemId || item?.item?.questionId || null,
        mechanic: item?.mechanic || item?.item?.mechanicId || null, root: Boolean(document.querySelector("#game")) };
    });
    results.push({ moduleId, route, intro, runtime, startClicked: true, result: runtime.root ? "PASS" : "ISSUE" });
  }
} finally { await browser.close(); }
const report = { feature: "DUDUQ_FINAL_30_MODULE_INTRO_TO_Q001", testedAt: new Date().toISOString(), source: base,
  requested: 30, rendered: results.length, passed: results.filter(item => item.result === "PASS").length,
  pageErrors, httpErrors, results, status: results.length === 30 && results.every(item => item.result === "PASS") && !pageErrors.length && !httpErrors.length ? "PASS" : "ISSUE" };
const output = path.join(root, "docs/qa/DUDUQ_FINAL_30_MODULE_INTRO_CLICK_QA_2026-10-20.json");
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, requested: 30, rendered: results.length, passed: report.passed, pageErrors: pageErrors.length, httpErrors: httpErrors.length, output }, null, 2));

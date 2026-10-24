import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const base = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4177";
const manifest = JSON.parse(await fs.readFile(path.join(root, "docs/qa/DUDUQ_ENGLISH_600_ACTIVITY_PRODUCTION_ROUTES_2026-10-20.json"), "utf8"));
const expected = manifest.activities.filter(item => item.mechanic === "smart-sentence-complete");
const { chromium } = await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const results = [];
try {
  for (const item of expected) {
    const errors = [];
    const onError = error => errors.push(error.message);
    page.on("pageerror", onError);
    await page.goto(new URL(item.route, base).href, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate(async () => {
      const api = window.DuduQProductionQuestionBootstrap;
      if (api?.ready) await api.ready;
    }).catch(() => {});
    await page.waitForTimeout(120);
    const runtime = await page.evaluate(() => ({
      url: location.href,
      rootClass: document.querySelector("#game")?.className || "",
      alert: document.querySelector("#game [role='alert']")?.innerText || null,
      runtimeItem: window.DuduQProductionQuestionBootstrap?.ready ? true : false
    }));
    results.push({ moduleId: item.module, questionId: item.activityId, route: item.route, errors, ...runtime,
      result: errors.some(error => error.startsWith("SMART_SENTENCE_AUDIO_FLOW_V2_ASSET_MISSING")) || runtime.alert?.includes("SMART_SENTENCE_AUDIO_FLOW_V2_ASSET_MISSING") ? "AUDIO_BOOTSTRAP_BLOCKED" : "BOOTED" });
    page.off("pageerror", onError);
  }
} finally { await browser.close(); }
const blocked = results.filter(item => item.result === "AUDIO_BOOTSTRAP_BLOCKED");
const report = { feature: "DUDUQ_SMART_SENTENCE_COMPLETE_AUDIO_BOOTSTRAP_AUDIT", testedAt: new Date().toISOString(), source: base,
  requested: expected.length, rendered: results.length, blocked: blocked.length, results,
  status: blocked.length ? "ISSUE" : "PASS" };
const output = path.join(root, "docs/qa/DUDUQ_FINAL_SMART_SENTENCE_AUDIO_BOOTSTRAP_2026-10-20.json");
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, requested: report.requested, rendered: report.rendered, blocked: report.blocked, output }, null, 2));

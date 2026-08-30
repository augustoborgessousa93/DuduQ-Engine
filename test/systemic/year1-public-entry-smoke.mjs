import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/systemic/year1-public-entry");
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber += 1) {
      const moduleKey = String(moduleNumber).padStart(2, "0");
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));

      try {
        const url = `${BASE}/content/english/year-1/module-${moduleKey}/?qa=systemic-foundation`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        assert(response?.ok(), `Y1 M${moduleKey}: entrypoint HTTP ${response?.status()}.`);

        await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 30_000 });
        const boot = await page.evaluate((moduleKey) => {
          const module = window.DUDUQ_CONTENT?.english?.year1?.[`module${moduleKey}`];
          const config = window.DUDUQ_GAME_CONFIG || {};
          const scripts = Array.from(document.scripts).map((script) => script.getAttribute("src") || "").filter(Boolean);
          const legacyScripts = scripts.filter((src) => {
            let pathname = "";
            try { pathname = new URL(src, location.href).pathname; } catch { pathname = String(src); }
            // Correct versioned runtime lives under /engine/releases/**.
            // Legacy debt means the old top-level /core/** or /mechanics/** trees.
            return /^\/(?:core|mechanics)\//.test(pathname);
          });
          return {
            moduleExists: Boolean(module),
            activities: Array.isArray(module?.activities) ? module.activities.length : 0,
            channel: config.channel || "",
            modulePath: config.modulePath || [],
            scripts,
            legacyScripts,
            documentWidth: document.documentElement.scrollWidth,
            rootText: String(document.querySelector("#root")?.textContent || "").trim()
          };
        }, moduleKey);

        assert(boot.moduleExists && boot.activities > 0, `Y1 M${moduleKey}: conteúdo público não carregou.`);
        assert(boot.channel === "canary-v1", `Y1 M${moduleKey}: canal inesperado ${boot.channel}.`);
        assert(boot.modulePath.join("/") === `english/year1/module${moduleKey}`, `Y1 M${moduleKey}: modulePath incorreto ${boot.modulePath.join("/")}.`);
        assert(boot.scripts.some((src) => /engine\/duduq-loader-v1\.js/.test(src)), `Y1 M${moduleKey}: Loader versionado ausente.`);
        assert(boot.legacyScripts.length === 0, `Y1 M${moduleKey}: entrypoint ainda carrega raiz legada diretamente: ${boot.legacyScripts.join(", ")}`);
        assert(!/^Erro:/i.test(boot.rootText), `Y1 M${moduleKey}: erro no boot: ${boot.rootText}`);
        assert(boot.documentWidth <= viewport.width + 6, `Y1 M${moduleKey}: overflow na Intro.`);

        const start = page.locator(".duduq-intro-start-button");
        await start.waitFor({ state: "visible", timeout: 30_000 });
        await start.click();

        await page.waitForFunction(() => Array.from(document.querySelectorAll("iframe")).some((frame) => {
          const rect = frame.getBoundingClientRect();
          const doc = frame.contentDocument;
          return rect.width > 40 && rect.height > 40 && Boolean(frame.srcdoc) && Boolean(doc?.querySelector?.("#root"));
        }), null, { timeout: 30_000 });

        await page.waitForTimeout(850);
        const runtime = await page.evaluate(() => ({
          rootText: String(document.querySelector("#root")?.textContent || "").trim(),
          documentWidth: document.documentElement.scrollWidth,
          frames: Array.from(document.querySelectorAll("iframe")).map((frame) => {
            const rect = frame.getBoundingClientRect();
            return {
              title: frame.title || "",
              hasSrcdoc: Boolean(frame.srcdoc),
              srcdocLength: String(frame.srcdoc || "").length,
              width: rect.width,
              height: rect.height,
              innerTitle: frame.contentDocument?.title || "",
              hasRoot: Boolean(frame.contentDocument?.querySelector?.("#root"))
            };
          })
        }));

        assert(!/^Erro:/i.test(runtime.rootText), `Y1 M${moduleKey}: erro após iniciar: ${runtime.rootText}`);
        assert(runtime.frames.some((frame) => frame.hasSrcdoc && frame.srcdocLength > 1000 && frame.width > 40 && frame.height > 40 && frame.hasRoot), `Y1 M${moduleKey}: runtime não ficou ativo.`);
        assert(runtime.documentWidth <= viewport.width + 6, `Y1 M${moduleKey}: overflow após iniciar (${runtime.documentWidth} > ${viewport.width}).`);
        assert(pageErrors.length === 0, `Y1 M${moduleKey}: pageerror: ${pageErrors.join(" | ")}`);

        const screenshot = path.join(OUT, `year1-m${moduleKey}-${viewport.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: false });
        report.push({ module: moduleNumber, viewport: viewport.name, boot, runtime, screenshot });
      } finally {
        await page.close();
      }
    }
  }

  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify({ status: "PASS", report }, null, 2));
  console.log(JSON.stringify({ status: "PASS", contract: "YEAR1_PUBLIC_ENTRY_SYSTEMIC_LOADER", cases: report.length }, null, 2));
} finally {
  await browser.close();
}

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    for (let moduleNumber = 2; moduleNumber <= 6; moduleNumber += 1) {
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
      try {
        const url = `${BASE}/test/systemic/year1-loader-compat.html?module=${moduleNumber}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 30_000 });

        const moduleState = await page.evaluate((moduleNumber) => {
          const key = `module${String(moduleNumber).padStart(2, "0")}`;
          const module = window.DUDUQ_CONTENT?.english?.year1?.[key];
          return {
            exists: Boolean(module),
            activityCount: Array.isArray(module?.activities) ? module.activities.length : 0,
            mechanics: Array.from(new Set((module?.activities || []).map((activity) => activity?.mechanic).filter(Boolean))),
            rootText: String(document.querySelector("#root")?.textContent || "").trim(),
            documentWidth: document.documentElement.scrollWidth
          };
        }, moduleNumber);

        assert(moduleState.exists, `Y1 M${moduleNumber}: conteúdo não carregou via Loader.`);
        assert(moduleState.activityCount > 0, `Y1 M${moduleNumber}: sem atividades.`);
        assert(moduleState.mechanics.every((mechanic) => ["drag-drop", "target-shooter"].includes(mechanic)), `Y1 M${moduleNumber}: mecânica fora do contrato atual: ${moduleState.mechanics.join(", ")}`);
        assert(!/^Erro:/i.test(moduleState.rootText), `Y1 M${moduleNumber}: Player reportou ${moduleState.rootText}`);
        assert(moduleState.documentWidth <= viewport.width + 6, `Y1 M${moduleNumber}: overflow antes do início (${moduleState.documentWidth} > ${viewport.width}).`);

        const start = page.locator(".duduq-intro-start-button");
        await start.waitFor({ state: "visible", timeout: 30_000 });
        await start.click();

        await page.waitForFunction(() => {
          const root = document.querySelector("#root");
          if (/^Erro:/i.test(String(root?.textContent || "").trim())) return false;
          return Array.from(document.querySelectorAll("iframe")).some((frame) => {
            const rect = frame.getBoundingClientRect();
            const style = getComputedStyle(frame);
            return rect.width > 40 && rect.height > 40 && style.display !== "none" && style.visibility !== "hidden";
          });
        }, null, { timeout: 30_000 });

        await page.waitForTimeout(900);
        const runtimeState = await page.evaluate(() => ({
          rootText: String(document.querySelector("#root")?.textContent || "").trim(),
          iframeSrcs: Array.from(document.querySelectorAll("iframe")).map((frame) => frame.src).filter(Boolean),
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight
        }));

        assert(!/^Erro:/i.test(runtimeState.rootText), `Y1 M${moduleNumber}: erro após iniciar: ${runtimeState.rootText}`);
        assert(runtimeState.iframeSrcs.some((src) => /DUDUQ_(?:DRAG_DROP|TARGET_SHOOTER)\.html/i.test(src)), `Y1 M${moduleNumber}: runtime esperado não abriu.`);
        assert(runtimeState.documentWidth <= viewport.width + 6, `Y1 M${moduleNumber}: overflow após início (${runtimeState.documentWidth} > ${viewport.width}).`);
        assert(pageErrors.length === 0, `Y1 M${moduleNumber}: pageerror: ${pageErrors.join(" | ")}`);

        report.push({ viewport: viewport.name, module: moduleNumber, mechanics: moduleState.mechanics, runtime: runtimeState.iframeSrcs });
      } finally {
        await page.close();
      }
    }
  }

  console.log(JSON.stringify({ status: "PASS", contract: "YEAR1_UNIVERSAL_LOADER_COMPAT", report }, null, 2));
} finally {
  await browser.close();
}

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4173";
const outDir = process.env.DUDUQ_QA_ARTIFACT_DIR || "artifacts/year2-visual";
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const report = [];
const failures = [];

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const url = `${base}/content/english/year-2/module-${mm}/homolog-v22-runtime.html`;
    const screenshot = path.join(outDir, `M${mm}-${viewport.name}.png`);
    const entry = { module: `M${mm}`, viewport: viewport.name, url, screenshot, pass: false };

    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      check(response && response.ok(), `M${mm}/${viewport.name}: HTTP ${response?.status?.()}`);

      const startButton = page.getByRole("button", { name: /INICIAR MISSÃO/i });
      await startButton.waitFor({ state: "visible", timeout: 15000 });
      const startBox = await startButton.boundingBox();
      check(startBox && startBox.width >= 180 && startBox.height >= 44, `M${mm}/${viewport.name}: botão inicial fora do padrão de toque`);
      await startButton.click();

      await page.waitForFunction(() => {
        const root = document.getElementById("root");
        const text = root?.textContent || "";
        return Boolean(document.querySelector("iframe")) || /Erro:/i.test(text) || /Erro ao carregar/i.test(text);
      }, undefined, { timeout: 20000 });

      const rootText = await page.locator("#root").innerText().catch(() => "");
      check(!/Erro:/i.test(rootText) && !/Erro ao carregar/i.test(rootText), `M${mm}/${viewport.name}: runtime exibiu erro: ${rootText.slice(0, 220)}`);

      await page.evaluate(() => {
        try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-after-start" }); } catch (_) {}
        try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
      });
      await page.waitForTimeout(1000);

      const iframe = page.locator("iframe").first();
      await iframe.waitFor({ state: "visible", timeout: 10000 });
      const box = await iframe.boundingBox();
      check(box && box.width >= Math.min(300, viewport.width - 24), `M${mm}/${viewport.name}: iframe estreito demais (${box?.width || 0}px)`);
      check(box && box.height >= 220, `M${mm}/${viewport.name}: iframe baixo demais (${box?.height || 0}px)`);

      const mainMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight
      }));
      check(mainMetrics.scrollWidth <= mainMetrics.clientWidth + 12, `M${mm}/${viewport.name}: overflow horizontal no host (${mainMetrics.scrollWidth}/${mainMetrics.clientWidth})`);

      const frame = page.frames().find((candidate) => candidate !== page.mainFrame() && /engine\/releases\/mechanics\//.test(candidate.url())) || page.frames().find((candidate) => candidate !== page.mainFrame());
      check(frame, `M${mm}/${viewport.name}: frame da mecânica não localizado`);
      await frame.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(700);

      const frameMetrics = await frame.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const text = (body?.innerText || "").trim();
        const interactive = document.querySelectorAll('button,[role="button"],[draggable="true"],[tabindex],input,select,.duduq-dd2-item').length;
        return {
          textLength: text.length,
          textSample: text.slice(0, 180),
          interactive,
          scrollWidth: Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0),
          clientWidth: doc?.clientWidth || 0,
          scrollHeight: Math.max(doc?.scrollHeight || 0, body?.scrollHeight || 0),
          clientHeight: doc?.clientHeight || 0
        };
      });

      check(frameMetrics.textLength > 0, `M${mm}/${viewport.name}: mecânica sem conteúdo textual/semântica carregada`);
      check(!/^Erro\b/i.test(frameMetrics.textSample), `M${mm}/${viewport.name}: mecânica exibiu erro: ${frameMetrics.textSample}`);
      check(frameMetrics.interactive > 0, `M${mm}/${viewport.name}: nenhum controle interativo detectado`);
      check(frameMetrics.scrollWidth <= frameMetrics.clientWidth + 18, `M${mm}/${viewport.name}: overflow horizontal na mecânica (${frameMetrics.scrollWidth}/${frameMetrics.clientWidth})`);
      check(pageErrors.length === 0, `M${mm}/${viewport.name}: pageerror: ${pageErrors.join(" | ")}`);

      entry.pass = true;
      entry.mainMetrics = mainMetrics;
      entry.frameMetrics = frameMetrics;
      entry.consoleErrors = consoleErrors;
      console.log(`PASS M${mm}/${viewport.name}`);
    } catch (error) {
      entry.error = String(error?.message || error);
      entry.pageErrors = pageErrors;
      entry.consoleErrors = consoleErrors;
      failures.push(entry);
      console.error(`FAIL M${mm}/${viewport.name}: ${entry.error}`);
    } finally {
      await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
      report.push(entry);
      await page.close();
    }
  }
}

await browser.close();
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ base, cases: report }, null, 2));

if (failures.length) {
  console.error("DUDUQ YEAR2 VISUAL/FUNCTIONAL QA: FAIL");
  for (const failure of failures) console.error(`${failure.module}/${failure.viewport}: ${failure.error}`);
  process.exit(1);
}

console.log("DUDUQ YEAR2 VISUAL/FUNCTIONAL QA: PASS");
console.log(JSON.stringify({ cases: report.length, modules: 6, viewports: viewports.map((v) => v.name) }, null, 2));

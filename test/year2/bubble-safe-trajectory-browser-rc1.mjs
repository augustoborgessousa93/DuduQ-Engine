import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-bubble-safe-trajectory-browser-rc1");
const MODULE_URL = `${BASE_URL}/content/english/year-2/module-02/index.html?qa=bubble-safe-trajectory-browser-rc1`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const reports = [];

async function homologate(name, viewport) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(MODULE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(
      window.DUDUQ_CONTENT?.english?.year2?.module02v23multimodal &&
      window.DuduQIntro &&
      window.DuduQ
    ));

    const startMission = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
    await startMission.waitFor({ state: "visible" });
    await startMission.click();

    const iframe = page.locator("#root iframe").first();
    await iframe.waitFor({ state: "attached" });
    const handle = await iframe.elementHandle();
    const frame = await handle?.contentFrame();
    assert(frame, `${name}: Bubble iframe inacessível.`);

    await frame.locator(".duduq-bp-arena[data-mode='dynamic-stream']").waitFor({ state: "visible" });
    await frame.locator(".duduq-bp-bubble-shell--dynamic").first().waitFor({ state: "attached" });

    const styleState = await frame.evaluate(() => {
      const style = document.getElementById("duduq-year2-bubble-safe-trajectory");
      const shell = document.querySelector(".duduq-bp-bubble-shell--dynamic");
      const computed = shell ? getComputedStyle(shell) : null;
      return {
        stylePresent: Boolean(style),
        styleVersion: style?.dataset?.duduqYear2BubbleSafeTrajectory || null,
        animationName: computed?.animationName || null,
        safeEdge: computed?.getPropertyValue("--y2-bp-safe-edge")?.trim() || null,
        bridge: window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_PATCH__ || null
      };
    });

    assert(styleState.stylePresent, `${name}: estilo de trajetória segura não foi instalado.`);
    assert(styleState.animationName === "duduq-year2-bp-stream-safe", `${name}: animação segura não está ativa (${styleState.animationName}).`);
    assert(styleState.bridge?.safeTrajectory === true, `${name}: bridge não marcou safeTrajectory.`);

    const samples = [];
    let visibleSamples = 0;
    for (let sampleIndex = 0; sampleIndex < 14; sampleIndex += 1) {
      await page.waitForTimeout(360);
      const sample = await frame.evaluate(() => {
        const arena = document.querySelector(".duduq-bp-arena[data-mode='dynamic-stream']");
        if (!arena) return { arena: null, visible: [] };
        const a = arena.getBoundingClientRect();
        const visible = Array.from(document.querySelectorAll(".duduq-bp-bubble-shell--dynamic"))
          .map((shell) => {
            const bubble = shell.querySelector(".duduq-bp-bubble") || shell;
            const style = getComputedStyle(shell);
            const rect = bubble.getBoundingClientRect();
            return {
              opacity: Number(style.opacity || 0),
              popped: shell.getAttribute("data-popped") === "true",
              rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
            };
          })
          .filter((entry) => entry.opacity >= 0.15 && !entry.popped && entry.rect.width > 1 && entry.rect.height > 1);
        return {
          arena: { left: a.left, top: a.top, right: a.right, bottom: a.bottom, width: a.width, height: a.height },
          visible
        };
      });

      assert(sample.arena, `${name}: arena dinâmica ausente.`);
      const tolerance = 2.5;
      for (const bubble of sample.visible) {
        visibleSamples += 1;
        const r = bubble.rect;
        const a = sample.arena;
        assert(r.left >= a.left - tolerance, `${name}: bolha cortou borda esquerda (${r.left.toFixed(1)} < ${a.left.toFixed(1)}).`);
        assert(r.right <= a.right + tolerance, `${name}: bolha cortou borda direita (${r.right.toFixed(1)} > ${a.right.toFixed(1)}).`);
        assert(r.top >= a.top - tolerance, `${name}: bolha cortou borda superior (${r.top.toFixed(1)} < ${a.top.toFixed(1)}).`);
        assert(r.bottom <= a.bottom + tolerance, `${name}: bolha cortou borda inferior (${r.bottom.toFixed(1)} > ${a.bottom.toFixed(1)}).`);
      }
      samples.push(sample);
    }

    assert(visibleSamples >= 4, `${name}: amostragem insuficiente de bolhas visíveis (${visibleSamples}).`);
    assert(pageErrors.length === 0, `${name}: erros de página: ${pageErrors.join(" | ")}`);

    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}.png`), fullPage: false });
    const report = { name, viewport, styleState, visibleSamples, samples, pageErrors };
    reports.push(report);
    return report;
  } finally {
    await page.close();
  }
}

try {
  await homologate("M02-desktop-safe-bubbles", { width: 1366, height: 768 });
  await homologate("M02-mobile-safe-bubbles", { width: 390, height: 844 });
  await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify({ status: "PASS", reports }, null, 2));
  console.log(JSON.stringify({ status: "PASS", reports: reports.map(({ name, viewport, styleState, visibleSamples }) => ({ name, viewport, styleState, visibleSamples })) }, null, 2));
} finally {
  await browser.close();
}

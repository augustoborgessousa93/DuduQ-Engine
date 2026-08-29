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
      window.DuduQIntro && window.DuduQ
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

    await frame.waitForFunction(() => Boolean(
      document.getElementById("duduq-shared-bubble-safe-trajectory-v1") &&
      window.__DUDUQ_SHARED_BUBBLE_RUNTIME_SAFETY_ACTIVE__ &&
      window.__DUDUQ_SHARED_BUBBLE_SMART_MEDIA_PATCH__
    ));

    const styleState = await frame.evaluate(() => {
      const localStyle = document.getElementById("duduq-year2-bubble-safe-trajectory");
      const sharedStyle = document.getElementById("duduq-shared-bubble-safe-trajectory-v1");
      const shell = document.querySelector(".duduq-bp-bubble-shell--dynamic");
      const computed = shell ? getComputedStyle(shell) : null;
      return {
        channel: String(parent?.DUDUQ_GAME_CONFIG?.channel || ""),
        localStylePresent: Boolean(localStyle),
        sharedStylePresent: Boolean(sharedStyle),
        sharedStyleVersion: sharedStyle?.dataset?.duduqSharedBubbleSafety || null,
        animationName: computed?.animationName || null,
        sharedSafeEdge: computed?.getPropertyValue("--duduq-bp-safe-edge")?.trim() || null,
        legacyYear2Bridge: window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_PATCH__ || null,
        sharedSmartMedia: window.__DUDUQ_SHARED_BUBBLE_SMART_MEDIA_PATCH__ || null,
        sharedRuntime: window.__DUDUQ_SHARED_BUBBLE_RUNTIME_SAFETY_ACTIVE__ || null
      };
    });

    assert(styleState.channel === "scale-v1", `${name}: teste exige scale-v1, recebeu ${styleState.channel}.`);
    assert(styleState.sharedStylePresent, `${name}: estilo compartilhado de trajetória segura não foi instalado.`);
    assert(!styleState.localStylePresent, `${name}: scale-v1 não pode manter trajetória Year2 duplicada.`);
    assert(styleState.animationName === "duduq-shared-bp-stream-safe", `${name}: animação compartilhada segura não está ativa (${styleState.animationName}).`);
    assert(Boolean(styleState.sharedSafeEdge), `${name}: safe edge compartilhado ausente.`);
    assert(Number.parseFloat(styleState.sharedSafeEdge) >= (viewport.width <= 430 ? 86 : viewport.width <= 720 ? 90 : 98), `${name}: safe edge insuficiente (${styleState.sharedSafeEdge}).`);
    assert(!styleState.legacyYear2Bridge, `${name}: bridge Year2 de Bubble smart media não pode permanecer ativo no scale-v1.`);
    assert(styleState.sharedSmartMedia?.officialAssets === true, `${name}: smart media compartilhado não confirmou assets oficiais.`);
    assert(styleState.sharedSmartMedia?.syntheticVisualDedupe === true, `${name}: smart media compartilhado não confirmou dedupe sintético.`);
    assert(styleState.sharedRuntime?.safeTrajectory === true, `${name}: runtime compartilhado não marcou safeTrajectory.`);
    assert(styleState.sharedRuntime?.visualBreathingRoom === true, `${name}: runtime compartilhado não marcou margem visual segura.`);

    const samples = [];
    let visibleSamples = 0;
    for (let sampleIndex = 0; sampleIndex < 24; sampleIndex += 1) {
      await page.waitForTimeout(400);
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
      const minimumVisualMargin = 10;
      for (const bubble of sample.visible) {
        visibleSamples += 1;
        const r = bubble.rect;
        const a = sample.arena;
        assert(r.left >= a.left + minimumVisualMargin, `${name}: bolha ficou próxima/cortou borda esquerda (${r.left.toFixed(1)} vs ${a.left.toFixed(1)}).`);
        assert(r.right <= a.right - minimumVisualMargin, `${name}: bolha ficou próxima/cortou borda direita (${r.right.toFixed(1)} vs ${a.right.toFixed(1)}).`);
        assert(r.top >= a.top + minimumVisualMargin, `${name}: bolha ficou próxima/cortou borda superior (${r.top.toFixed(1)} vs ${a.top.toFixed(1)}).`);
        assert(r.bottom <= a.bottom - minimumVisualMargin, `${name}: bolha ficou próxima/cortou borda inferior (${r.bottom.toFixed(1)} vs ${a.bottom.toFixed(1)}).`);
      }
      samples.push(sample);
    }

    assert(visibleSamples >= 8, `${name}: amostragem insuficiente de bolhas visíveis (${visibleSamples}).`);
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

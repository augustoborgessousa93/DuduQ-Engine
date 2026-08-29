import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-01/index.html?qa=m1-wide-desktop-browser-rc1`;
const OUTPUT_DIR = path.resolve("test-results/year2-m1-wide-desktop-browser-rc1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const reports = [];

async function inspect(name, viewport) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(30_000);
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(
      window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal && window.DuduQIntro && window.DuduQ
    ));

    const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
    await start.waitFor({ state: "visible" });
    await start.click();

    const iframe = page.locator("#root iframe").first();
    await iframe.waitFor({ state: "attached" });
    const handle = await iframe.elementHandle();
    const frame = await handle?.contentFrame();
    assert(frame, `${name}: iframe Drag & Drop inacessível.`);

    await frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').waitFor({ state: "visible" });
    await frame.locator(".duduq-dd2-item-shell-audio-choice").first().waitFor({ state: "visible" });

    const state = await frame.evaluate(() => {
      const target = document.querySelector('.duduq-dd2-target[data-single-target-choice="true"]');
      const media = target?.querySelector(".duduq-dd2-target-media");
      const zone = target?.querySelector(".duduq-dd2-zone");
      const choice = document.querySelector(".duduq-dd2-item-shell-audio-choice > .duduq-dd2-item");
      const style = document.getElementById("duduq-year2-m01-wide-single-target");
      const rect = (node) => {
        if (!node) return null;
        const value = node.getBoundingClientRect();
        return { width: value.width, height: value.height, top: value.top, left: value.left };
      };
      return {
        stylePresent: Boolean(style),
        styleVersion: style?.dataset?.duduqYear2M01Wide || null,
        target: rect(target),
        media: rect(media),
        zone: rect(zone),
        choice: rect(choice),
        viewport: { width: innerWidth, height: innerHeight }
      };
    });

    assert(state.stylePresent, `${name}: bridge visual M01 não foi instalado.`);
    assert(state.target && state.zone && state.choice, `${name}: elementos principais ausentes.`);

    if (viewport.width >= 900 && viewport.height >= 620) {
      assert(state.target.width >= 295, `${name}: alvo desktop continua pequeno (${state.target.width.toFixed(1)}px).`);
      assert(state.target.width <= 360, `${name}: alvo desktop ficou excessivo (${state.target.width.toFixed(1)}px).`);
      assert(state.zone.height >= 60, `${name}: zona de soltura desktop pequena (${state.zone.height.toFixed(1)}px).`);
      assert(state.choice.width >= 92, `${name}: alternativa desktop pequena (${state.choice.width.toFixed(1)}px).`);
      if (state.media) assert(state.media.height >= 150, `${name}: imagem principal desktop pequena (${state.media.height.toFixed(1)}px).`);
    } else {
      assert(state.target.width <= 180, `${name}: regra desktop vazou para mobile (${state.target.width.toFixed(1)}px).`);
      assert(state.choice.width < 92, `${name}: alternativa mobile recebeu escala desktop (${state.choice.width.toFixed(1)}px).`);
    }

    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}.png`), fullPage: false });
    reports.push({ name, viewport, state });
  } finally {
    await page.close();
  }
}

try {
  await inspect("M01-desktop-wide", { width: 1366, height: 768 });
  await inspect("M01-fullscreen-wide", { width: 1600, height: 900 });
  await inspect("M01-mobile-preserved", { width: 390, height: 844 });
  await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify({ status: "PASS", reports }, null, 2));
  console.log(JSON.stringify({ status: "PASS", reports }, null, 2));
} finally {
  await browser.close();
}

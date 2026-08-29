import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
page.setDefaultTimeout(20_000);

try {
  await page.goto(`${BASE_URL}/content/english/year-2/module-01/index.html?qa=m1-12-visual-polish-rc1`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });

  await page.waitForFunction(() => Boolean(
    window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal &&
    window.__DUDUQ_YEAR2_M1_12_IMAGE_GROUP__
  ), null, { timeout: 30_000 });

  const activityIndex = await page.evaluate(() => {
    const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
    return (built.activities || []).findIndex((activity) =>
      (activity.questions || []).some((question) => question?.id === "EN2-M1-12")
    );
  });
  assert(activityIndex >= 0, "Etapa EN2-M1-12 não encontrada.");

  const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
  const started = await page.evaluate(() => Boolean(window.DuduQ?.getSession?.()?.module === 1));
  if (!started) {
    await start.waitFor({ state: "visible", timeout: 20_000 });
    await start.click();
  }

  await page.waitForFunction(() => Boolean(window.DuduQ?.getSession?.()?.module === 1 && !window.DuduQ?.getSession?.()?.transitioning), null, { timeout: 20_000 });

  for (let index = 0; index < activityIndex; index += 1) {
    await page.evaluate(() => window.DuduQ.next({ qaSkip: true }));
    await page.waitForFunction((expected) => {
      const session = window.DuduQ?.getSession?.();
      return Boolean(session && !session.transitioning && session.stepIndex === expected);
    }, index + 1, { timeout: 12_000 });
  }

  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const frame = await (await iframe.elementHandle())?.contentFrame();
  assert(frame, "Iframe da Etapa 12 inacessível.");
  await frame.waitForSelector("#duduq-m1-12-v23-visual-polish", { state: "attached", timeout: 10_000 });
  await frame.waitForSelector(".duduq-dd2-bank .duduq-m1-12-image-card-shell", { state: "visible", timeout: 10_000 });

  const result = await frame.evaluate(() => {
    const rect = (node) => {
      const r = node.getBoundingClientRect();
      return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height };
    };
    const targets = Array.from(document.querySelectorAll(".duduq-dd2-target"));
    const heads = Array.from(document.querySelectorAll(".duduq-dd2-target-head > span"));
    const shells = Array.from(document.querySelectorAll(".duduq-dd2-bank .duduq-m1-12-image-card-shell"));
    const explicitAudio = Array.from(document.querySelectorAll(".duduq-dd2-bank .duduq-m1-12-image-audio"));
    const internalMarks = Array.from(document.querySelectorAll(".duduq-dd2-bank .duduq-m1-12-image-card-shell .duduq-dd2-audio-mark"));
    const visibleInternalMarks = internalMarks.filter((node) => getComputedStyle(node).display !== "none");
    const actions = document.querySelector(".duduq-dd2-actions");
    const bank = document.querySelector(".duduq-dd2-bank");
    const targetFontSizes = heads.map((node) => Number.parseFloat(getComputedStyle(node).fontSize || "0"));
    return {
      targets: targets.map(rect),
      targetFontSizes,
      shells: shells.map(rect),
      explicitAudio: explicitAudio.map(rect),
      visibleInternalAudioMarks: visibleInternalMarks.length,
      bank: bank ? rect(bank) : null,
      actions: actions ? rect(actions) : null,
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }
    };
  });

  assert(result.targets.length === 3, `Esperados 3 destinos; encontrados ${result.targets.length}.`);
  assert(result.targetFontSizes.length === 3 && result.targetFontSizes.every((size) => size >= 24), `L/E/O não têm destaque suficiente: ${JSON.stringify(result.targetFontSizes)}`);
  assert(result.targets.every((target) => target.height <= 190), `Destinos continuam altos demais: ${JSON.stringify(result.targets)}`);

  assert(result.shells.length === 6, `Esperados 6 cards; encontrados ${result.shells.length}.`);
  const tops = result.shells.map((shell) => shell.top);
  assert(Math.max(...tops) - Math.min(...tops) <= 10, `Desktop quebrou os 6 cards em mais de uma linha: ${JSON.stringify(result.shells)}`);
  assert(result.shells.every((shell) => shell.left >= 0 && shell.right <= result.viewport.width + 2), `Cards saíram da largura útil: ${JSON.stringify(result.shells)}`);

  assert(result.explicitAudio.length === 6, `Esperados 6 botões explícitos de áudio; encontrados ${result.explicitAudio.length}.`);
  assert(result.visibleInternalAudioMarks === 0, `Ainda há áudio decorativo duplicado dentro dos cards (${result.visibleInternalAudioMarks}).`);
  assert(result.explicitAudio.every((button) => button.width >= 30 && button.height >= 30), `Botões de áudio ficaram pequenos demais: ${JSON.stringify(result.explicitAudio)}`);

  if (result.actions && result.bank) {
    assert(result.actions.top >= result.bank.bottom - 2, `CONFIRMAR sobrepõe o banco de imagens. bank=${JSON.stringify(result.bank)} actions=${JSON.stringify(result.actions)}`);
  }
  assert(result.scroll.width <= result.viewport.width + 4, `Overflow horizontal na Etapa 12: ${result.scroll.width}/${result.viewport.width}.`);

  console.log(JSON.stringify({ status:"PASS", contract:"M1_12_COMPACT_GROUPING_VISUAL", result }, null, 2));
} finally {
  await context.close();
  await browser.close();
}

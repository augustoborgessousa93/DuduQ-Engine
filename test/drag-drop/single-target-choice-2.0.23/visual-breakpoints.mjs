import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;
const RESULTS = "test-results/single-target-choice-2.0.23";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function boot(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => window.DuduQDD23SingleTargetRuntimePatch?.ready === true, null, { timeout: 20_000 });
  assert(
    await page.evaluate(() => window.DuduQYear2M03SingleTargetVisualPolish === undefined),
    "M03 ainda expõe o helper visual content-side."
  );

  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  const frame = page.frameLocator('iframe[title="DuduQ — Drag & Drop"]');
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]');
  await target.waitFor({ state: "visible", timeout: 35_000 });
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"), null, { timeout: 10_000 });

  const choiceA = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await choiceA.waitFor({ state: "visible", timeout: 5_000 });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline && !(await choiceA.isEnabled().catch(() => false))) await page.waitForTimeout(50);
  assert(await choiceA.isEnabled(), "Alternativa A não ficou habilitada após o gate inicial.");
  return { frame, target, choiceA };
}

async function visibleRatio(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    let left = Math.max(0, rect.left);
    let top = Math.max(0, rect.top);
    let right = Math.min(window.innerWidth, rect.right);
    let bottom = Math.min(window.innerHeight, rect.bottom);
    let node = element.parentElement;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const clipsX = /(hidden|clip|auto|scroll)/.test(`${style.overflowX} ${style.overflow}`);
      const clipsY = /(hidden|clip|auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
      if (clipsX || clipsY) {
        const parentRect = node.getBoundingClientRect();
        if (clipsX) { left = Math.max(left, parentRect.left); right = Math.min(right, parentRect.right); }
        if (clipsY) { top = Math.max(top, parentRect.top); bottom = Math.min(bottom, parentRect.bottom); }
      }
      node = node.parentElement;
    }
    const area = Math.max(1, rect.width * rect.height);
    return { ratio: Math.max(0, right-left) * Math.max(0, bottom-top) / area, bottom, rectBottom: rect.bottom };
  });
}

async function scenario(browser, name, viewport, minChoiceWidth, expectedCompact) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const { frame, target, choiceA } = await boot(page);
  const bank = frame.locator(".duduq-dd2-bank");
  const confirm = frame.locator(".duduq-dd2-confirm");

  assert(await frame.locator("#duduq-dd23-single-target-runtime-style").count() === 1, `${name}: CSS runtime 2.0.23 ausente.`);
  assert(await frame.locator("#duduq-m03-single-target-choice-visual-polish").count() === 0, `${name}: CSS content-side antigo ainda presente.`);
  const compact = await frame.locator("html").getAttribute("data-duduq-host-compact-viewport");
  assert(compact === (expectedCompact ? "true" : "false"), `${name}: modo compacto incorreto (${compact}).`);

  const targetBox = await target.boundingBox();
  const bankBox = await bank.boundingBox();
  const choiceBox = await choiceA.boundingBox();
  const image = target.locator(".duduq-dd2-target-head img").first();
  await image.waitFor({ state: "visible", timeout: 5_000 });
  const imageBox = await image.boundingBox();
  const zoneBox = await target.locator(".duduq-dd2-zone").boundingBox();

  assert(targetBox && bankBox && choiceBox && imageBox && zoneBox, `${name}: elementos principais não mensuráveis.`);
  assert(targetBox.x < bankBox.x, `${name}: target não ficou à esquerda das alternativas.`);
  assert(choiceBox.width >= minChoiceWidth && choiceBox.height >= 58, `${name}: alternativa pequena (${Math.round(choiceBox.width)}x${Math.round(choiceBox.height)}).`);
  assert(imageBox.width >= 125 && imageBox.height >= 95, `${name}: imagem principal pequena (${Math.round(imageBox.width)}x${Math.round(imageBox.height)}).`);
  assert(zoneBox.height <= 135, `${name}: área SOLTE AQUI excessiva (${Math.round(zoneBox.height)}px).`);
  assert(!/🔊/.test((await choiceA.innerText()).trim()), `${name}: glyph de áudio duplicado no rótulo.`);

  await choiceA.click();
  await target.locator('.duduq-dd2-item[data-dd2-item-id="opt-1"]').waitFor({ state: "visible", timeout: 3_000 });
  assert(!(await confirm.isDisabled()), `${name}: CONFIRMAR não habilitou.`);
  const visibility = await visibleRatio(confirm);
  assert(visibility.ratio >= 0.98 && visibility.bottom >= visibility.rectBottom - 2, `${name}: CONFIRMAR está cortado (${(visibility.ratio*100).toFixed(1)}%).`);

  await page.screenshot({ path: `${RESULTS}/${name}-selected.png`, fullPage: false });
  console.log(`PASS — ${name}: compact=${compact}, choice=${Math.round(choiceBox.width)}x${Math.round(choiceBox.height)}, image=${Math.round(imageBox.width)}x${Math.round(imageBox.height)}`);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await scenario(browser, "desktop-1366x768", { width: 1366, height: 768 }, 210, false);
  await scenario(browser, "notebook-1280x650", { width: 1280, height: 650 }, 210, true);
  await scenario(browser, "tablet-1024x768", { width: 1024, height: 768 }, 185, true);
  console.log("PASS — runtime-owned visual breakpoints desktop + notebook + tablet");
} finally {
  await browser.close();
}

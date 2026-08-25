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
  await page.waitForFunction(
    () => window.DuduQDD23SingleTargetRuntimePatch?.ready === true && window.DuduQYear2M03SingleTargetVisualPolish?.ready === true,
    null,
    { timeout: 20_000 }
  );
  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  const frame = page.frameLocator('iframe[title="DuduQ — Drag & Drop"]');
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]');
  await target.waitFor({ state: "visible", timeout: 35_000 });
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"),
    null,
    { timeout: 10_000 }
  );
  const choiceA = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await choiceA.waitFor({ state: "visible", timeout: 5_000 });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await choiceA.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(50);
  }
  assert(await choiceA.isEnabled(), "Alternativa A não ficou habilitada após o gate inicial.");
  await page.waitForTimeout(350);
  return { frame, target, choiceA };
}

async function scenario(browser, name, viewport, minimumChoiceWidth) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const { frame, target, choiceA } = await boot(page);
  const bank = frame.locator(".duduq-dd2-bank");
  const confirm = frame.locator(".duduq-dd2-confirm");

  assert(await frame.locator("#duduq-m03-single-target-choice-visual-polish").count() === 1, `${name}: CSS de homologação não foi injetado no iframe.`);

  const targetBox = await target.boundingBox();
  const bankBox = await bank.boundingBox();
  const choiceBox = await choiceA.boundingBox();
  const image = target.locator(".duduq-dd2-target-head img").first();
  await image.waitFor({ state: "visible", timeout: 5_000 });
  const imageBox = await image.boundingBox();
  const zone = target.locator(".duduq-dd2-zone");
  const zoneBox = await zone.boundingBox();

  assert(targetBox && bankBox && choiceBox && imageBox && zoneBox, `${name}: elementos principais não são mensuráveis.`);
  assert(targetBox.x < bankBox.x, `${name}: target e alternativas deixaram de ficar lado a lado.`);
  assert(choiceBox.width >= minimumChoiceWidth, `${name}: alternativa continua estreita (${Math.round(choiceBox.width)}px).`);
  assert(choiceBox.height >= 60, `${name}: alternativa continua baixa (${Math.round(choiceBox.height)}px).`);
  assert(imageBox.width >= 125 && imageBox.height >= 95, `${name}: imagem principal continua pequena (${Math.round(imageBox.width)}x${Math.round(imageBox.height)}).`);
  assert(zoneBox.height <= 135, `${name}: área SOLTE AQUI ainda ocupa espaço excessivo (${Math.round(zoneBox.height)}px).`);

  const label = (await choiceA.innerText()).trim();
  assert(!/🔊/.test(label), `${name}: rótulo ainda duplica o glyph de áudio (${label}).`);

  await choiceA.click();
  await target.locator('.duduq-dd2-item[data-dd2-item-id="opt-1"]').waitFor({ state: "visible", timeout: 3_000 });
  assert(!(await confirm.isDisabled()), `${name}: CONFIRMAR não habilitou após seleção.`);
  const confirmBox = await confirm.boundingBox();
  assert(confirmBox, `${name}: CONFIRMAR não possui bounding box.`);
  assert(confirmBox.y + confirmBox.height <= viewport.height, `${name}: CONFIRMAR ficou fora do primeiro viewport (${Math.round(confirmBox.y + confirmBox.height)} > ${viewport.height}).`);

  await page.screenshot({ path: `${RESULTS}/${name}-selected.png`, fullPage: true });
  console.log(`PASS — ${name}: choice=${Math.round(choiceBox.width)}x${Math.round(choiceBox.height)}, image=${Math.round(imageBox.width)}x${Math.round(imageBox.height)}, zone=${Math.round(zoneBox.height)}, confirmBottom=${Math.round(confirmBox.y + confirmBox.height)}`);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await scenario(browser, "notebook-1280x650", { width: 1280, height: 650 }, 210);
  await scenario(browser, "tablet-1024x768", { width: 1024, height: 768 }, 185);
  console.log("PASS — visual breakpoints notebook + tablet");
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/test/drag-drop/single-target-choice-2.0.24/m03-r143-visual-homolog.html`;
const RESULTS = "test-results/single-target-choice-2.0.24";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe DD2 2.0.24 não apareceu.");
}

async function boot(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => window.DuduQDD24R143VisualRuntimePatch?.ready === true, null, { timeout: 20_000 });

  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  const frame = await waitFrame(page);
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
  await target.waitFor({ state: "visible", timeout: 35_000 });

  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"),
    null,
    { timeout: 12_000 }
  );

  const first = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await first.waitFor({ state: "visible", timeout: 5_000 });
  const deadline = Date.now() + 6_000;
  while (Date.now() < deadline && !(await first.isEnabled().catch(() => false))) await page.waitForTimeout(50);
  assert(await first.isEnabled(), "Alternativas não ficaram interativas após o gate inicial.");
  await page.waitForTimeout(350);
  return { frame, target };
}

async function box(locator, label) {
  const value = await locator.boundingBox();
  assert(value, `${label}: bounding box indisponível.`);
  return value;
}

async function waitTargetItem(target, itemId) {
  await target.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first().waitFor({ state: "visible", timeout: 3_000 });
}

async function drag(page, source, target) {
  const sourceBox = await box(source, "source");
  const zone = target.locator(".duduq-dd2-zone").first();
  const zoneBox = await box(zone, "drop zone");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(zoneBox.x + zoneBox.width / 2, zoneBox.y + zoneBox.height / 2, { steps: 18 });
  await page.mouse.up();
}

async function promptLine(frame) {
  const text = await frame.locator("body").innerText();
  return text.split(/\n+/).map((line) => line.trim()).find((line) => /VEJA.*OUÇA.*ESCOLHA/i.test(line)) || "";
}

async function assertCleanAlternatives(frame) {
  const items = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
  assert(await items.count() === 4, `Esperadas 4 alternativas; encontrado ${await items.count()}.`);
  for (let index = 0; index < 4; index += 1) {
    const text = (await items.nth(index).innerText()).replace(/\s+/g, " ").trim();
    assert(!/[🔊🔉🔈]/u.test(text), `Alternativa ainda contém glyph editorial duplicado: ${text}`);
    assert(/[A-D]/.test(text), `Alternativa perdeu identificação A–D: ${text}`);
  }
}

async function assertImageProminence(target) {
  const metrics = await target.evaluate((node) => {
    const head = node.querySelector(".duduq-dd2-target-head");
    const media = head?.querySelector("img, .duduq-dd2-item-media, .duduq-dd2-target-media") || head?.firstElementChild;
    const headRect = head?.getBoundingClientRect();
    const mediaRect = media?.getBoundingClientRect();
    const style = media ? getComputedStyle(media) : null;
    return {
      head: headRect ? { width: headRect.width, height: headRect.height } : null,
      media: mediaRect ? { width: mediaRect.width, height: mediaRect.height } : null,
      fontSize: style ? parseFloat(style.fontSize || "0") : 0
    };
  });

  /* Compact notebook mode deliberately reserves vertical space for the stable
     drop zone and CONFIRMAR. Judge prominence by the rendered stimulus itself,
     not by an arbitrary parent-height threshold that would encourage card growth. */
  assert(metrics.head && metrics.head.height >= 108, `Área útil do estímulo colapsou: ${JSON.stringify(metrics)}.`);
  const imageLarge = Boolean(metrics.media && metrics.media.width >= 120 && metrics.media.height >= 105);
  const emojiLarge = metrics.fontSize >= 72;
  assert(imageLarge || emojiLarge, `Imagem/emoji principal não aproveita o espaço: ${JSON.stringify(metrics)}.`);
  return metrics;
}

async function assertConfirmFullyVisible(frame, viewportHeight, label) {
  const confirm = frame.locator(".duduq-dd2-confirm").first();
  await confirm.waitFor({ state: "visible", timeout: 3_000 });
  const rect = await box(confirm, `${label} confirmar`);
  assert(rect.y >= -1, `${label}: topo do CONFIRMAR cortado (${rect.y}).`);
  assert(rect.y + rect.height <= viewportHeight - 2, `${label}: CONFIRMAR cortado na base (${rect.y + rect.height} > ${viewportHeight - 2}).`);
  return confirm;
}

async function desktopScenario(browser, viewport, name) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (msg) => { if (msg.type() === "error") browserErrors.push(msg.text()); });

  const { frame, target } = await boot(page);
  assert(await frame.locator("#duduq-dd24-r143-single-target-style").count() === 1, `${name}: CSS 2.0.24 não foi injetado.`);

  const line = await promptLine(frame);
  assert(line === "VEJA, OUÇA E ESCOLHA", `${name}: enunciado ainda está poluído: ${JSON.stringify(line)}.`);
  await assertCleanAlternatives(frame);
  const stimulusMetrics = await assertImageProminence(target);

  const bankItems = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
  const firstBox = await box(bankItems.nth(0), `${name} item 1`);
  const secondBox = await box(bankItems.nth(1), `${name} item 2`);
  assert(Math.abs(firstBox.y - secondBox.y) < 8, `${name}: alternativas deixaram de ficar horizontais.`);

  const targetBefore = await box(target, `${name} target inicial`);
  const zoneBefore = await box(target.locator(".duduq-dd2-zone"), `${name} zone inicial`);
  assert(zoneBefore.height <= 68, `${name}: drop zone alta demais antes da seleção (${zoneBefore.height}).`);
  await page.screenshot({ path: `${RESULTS}/${name}-initial.png`, fullPage: true });
  console.log(`${name} stimulus=${JSON.stringify(stimulusMetrics)} target=${Math.round(targetBefore.width)}x${Math.round(targetBefore.height)} zone=${Math.round(zoneBefore.height)}`);

  const opt1 = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await drag(page, opt1, target);
  await waitTargetItem(target, "opt-1");

  const targetAfterDrag = await box(target, `${name} target após drag`);
  assert(Math.abs(targetAfterDrag.height - targetBefore.height) <= 2, `${name}: card cresceu após drag (${targetBefore.height} → ${targetAfterDrag.height}).`);

  const placedOpt1 = target.locator('.duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  const placedBox = await box(placedOpt1, `${name} item encaixado`);
  assert(placedBox.height <= 50 && placedBox.width <= 130, `${name}: item encaixado não ficou compacto (${placedBox.width}x${placedBox.height}).`);

  let confirm = await assertConfirmFullyVisible(frame, viewport.height, name);
  assert(!(await confirm.isDisabled()), `${name}: CONFIRMAR não habilitou após drag de alternativa.`);

  // Tap/click must replace the previous choice automatically.
  await page.waitForTimeout(360);
  const opt3 = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-3"]').first();
  await opt3.click();
  await waitTargetItem(target, "opt-3");
  assert(await target.locator(".duduq-dd2-item").count() === 1, `${name}: nova escolha não substituiu a anterior.`);
  const targetAfterTap = await box(target, `${name} target após tap`);
  assert(Math.abs(targetAfterTap.height - targetBefore.height) <= 2, `${name}: card cresceu após tap (${targetBefore.height} → ${targetAfterTap.height}).`);
  confirm = await assertConfirmFullyVisible(frame, viewport.height, name);
  assert(!(await confirm.isDisabled()), `${name}: CONFIRMAR não permaneceu habilitado após troca.`);

  // Choose a known wrong answer (opt-1; Q1 correct is opt-2), then validate only after CONFIRMAR.
  const wrong = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await wrong.click();
  await waitTargetItem(target, "opt-1");
  assert(!(await frame.locator('.duduq-engine-feedback[data-state="success"]').isVisible().catch(() => false)), `${name}: gabarito foi revelado antes da confirmação.`);
  confirm = await assertConfirmFullyVisible(frame, viewport.height, name);
  await confirm.click();

  const wrongCard = target.locator('.duduq-dd2-item[data-wrong="true"]').first();
  await wrongCard.waitFor({ state: "visible", timeout: 2_500 });
  const wrongStyle = await wrongCard.evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    border: getComputedStyle(node).borderColor
  }));
  assert(wrongStyle.border && wrongStyle.border !== "rgb(0, 0, 0)", `${name}: card errado não recebeu feedback visual vermelho.`);
  await page.screenshot({ path: `${RESULTS}/${name}-wrong-red.png`, fullPage: true });

  await frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first().waitFor({ state: "visible", timeout: 2_500 });
  const filledAfterRetry = await target.getAttribute("data-filled");
  assert(filledAfterRetry === "false", `${name}: destino não esvaziou após erro (${filledAfterRetry}).`);

  // Correct answer.
  const correct = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-2"]').first();
  await correct.click();
  await waitTargetItem(target, "opt-2");
  confirm = await assertConfirmFullyVisible(frame, viewport.height, name);
  await confirm.click();
  await frame.locator('.duduq-engine-feedback[data-state="success"] .duduq-engine-feedback-card').waitFor({ state: "visible", timeout: 3_000 });
  await page.screenshot({ path: `${RESULTS}/${name}-success.png`, fullPage: true });

  const fatal = browserErrors.filter((message) => /error|erro|failed|falha/i.test(message));
  assert(fatal.length === 0, `${name}: erros de browser: ${fatal.join(" | ")}`);

  console.log(`PASS — ${name}: clean prompt + one glyph owner + R143 horizontal + stable card + drag/tap + confirm + red retry + success`);
  await context.close();
}

async function mobileScenario(browser) {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const { frame, target } = await boot(page);

  const line = await promptLine(frame);
  assert(line === "VEJA, OUÇA E ESCOLHA", `mobile: enunciado poluído: ${JSON.stringify(line)}.`);
  await assertCleanAlternatives(frame);
  const stimulusMetrics = await assertImageProminence(target);

  const items = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
  const a = await box(items.nth(0), "mobile item 1");
  const b = await box(items.nth(1), "mobile item 2");
  const c = await box(items.nth(2), "mobile item 3");
  assert(Math.abs(a.y - b.y) < 8, "mobile: primeira linha não possui duas alternativas.");
  assert(c.y > a.y + 20, "mobile: alternativas não quebraram para a segunda linha.");

  const targetBefore = await box(target, "mobile target inicial");
  await page.screenshot({ path: `${RESULTS}/mobile-390x844-initial.png`, fullPage: true });
  console.log(`mobile stimulus=${JSON.stringify(stimulusMetrics)} target=${Math.round(targetBefore.width)}x${Math.round(targetBefore.height)}`);

  await items.nth(0).click();
  const placedId = await target.locator(".duduq-dd2-item").first().getAttribute("data-dd2-item-id");
  assert(placedId, "mobile: toque não moveu alternativa para SOLTE AQUI.");
  const targetAfter = await box(target, "mobile target selecionado");
  assert(Math.abs(targetAfter.height - targetBefore.height) <= 2, `mobile: card cresceu após toque (${targetBefore.height} → ${targetAfter.height}).`);
  const confirm = await assertConfirmFullyVisible(frame, viewport.height, "mobile");
  assert(!(await confirm.isDisabled()), "mobile: CONFIRMAR não habilitou após escolha.");

  const overflow = await frame.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  assert(overflow <= 1, `mobile: overflow horizontal ${overflow}px.`);
  await page.screenshot({ path: `${RESULTS}/mobile-390x844-selected.png`, fullPage: true });
  console.log("PASS — mobile-390x844: 2 columns + stable target + full confirm + no horizontal overflow");
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await desktopScenario(browser, { width: 1366, height: 768 }, "desktop-1366x768");
  await desktopScenario(browser, { width: 1280, height: 650 }, "notebook-1280x650");
  await desktopScenario(browser, { width: 1024, height: 768 }, "tablet-1024x768");
  await mobileScenario(browser);
  console.log("PASS — DD 2.0.24 full M03 UX/visual gate");
} finally {
  await browser.close();
}

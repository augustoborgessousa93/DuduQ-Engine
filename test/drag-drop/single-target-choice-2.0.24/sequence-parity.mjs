import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/test/drag-drop/sequence-2.0.24/index.html`;
const RESULTS = "test-results/single-target-choice-2.0.24";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) { if (!condition) throw new Error(message); }

async function waitFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe sequence 2.0.24 não apareceu.");
}

async function waitEnabled(locator, timeout = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isEnabled().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Item sequence permaneceu desabilitado.");
}

function itemByAlt(frame, alt) {
  return frame.locator(`.duduq-dd2-bank .duduq-dd2-item:has(img[alt="${alt}"])`).first();
}

async function dragItem(page, frame, alt) {
  const item = itemByAlt(frame, alt);
  await item.waitFor({ state: "visible", timeout: 6_000 });
  await waitEnabled(item);
  const zone = frame.locator('.duduq-dd2-target[data-kind="list"] .duduq-dd2-zone').first();
  const sourceBox = await item.boundingBox();
  const targetBox = await zone.boundingBox();
  assert(sourceBox && targetBox, `${alt}: bounding box indisponível.`);
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 16 });
  await page.mouse.up();
  await frame.locator(`.duduq-dd2-target[data-kind="list"] .duduq-dd2-item:has(img[alt="${alt}"])`).waitFor({ state: "visible", timeout: 3_000 });
}

async function slotOrder(frame) {
  return frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-dd2-sequence-slot")).map((slot) => slot.querySelector("img")?.getAttribute("alt") || null));
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => window.DuduQDD24R143VisualRuntimePatch?.ready === true, null, { timeout: 20_000 });
  await page.waitForFunction(() => window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release === "2.0.24", null, { timeout: 20_000 });

  const frame = await waitFrame(page);
  const target = frame.locator('.duduq-dd2-target[data-kind="list"]').first();
  await target.waitFor({ state: "visible", timeout: 35_000 });
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"), null, { timeout: 12_000 });

  assert(await frame.locator(".duduq-dd2-sequence-slot").count() === 3, "Sequence deveria renderizar 3 slots.");
  assert(await frame.locator('[data-single-target-choice="true"]').count() === 0, "SINGLE_TARGET_CHOICE vazou para sequence.");
  assert(await frame.locator("#duduq-dd24-r143-single-target-style").count() === 1, "Style 2.0.24 não foi injetado.");

  const confirm = frame.locator(".duduq-dd2-confirm");
  await confirm.waitFor({ state: "visible", timeout: 5_000 });
  assert(await confirm.isDisabled(), "Sequence deveria iniciar com CONFIRMAR desabilitado.");

  await dragItem(page, frame, "six");
  assert(await confirm.isDisabled(), "CONFIRMAR habilitou em 1/3.");
  await dragItem(page, frame, "eight");
  assert(await confirm.isDisabled(), "CONFIRMAR habilitou em 2/3.");
  await dragItem(page, frame, "seven");
  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou em 3/3.");

  const wrongOrder = await slotOrder(frame);
  assert(JSON.stringify(wrongOrder) === JSON.stringify(["six", "eight", "seven"]), `Ordem inesperada: ${JSON.stringify(wrongOrder)}.`);

  await confirm.click();
  await frame.locator('.duduq-engine-feedback[data-state="retry"] .duduq-engine-feedback-card').waitFor({ state: "visible", timeout: 3_000 });
  const retryState = await frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-dd2-sequence-slot")).map((slot) => ({
    correct: slot.getAttribute("data-correct"),
    wrong: slot.getAttribute("data-wrong"),
    alt: slot.querySelector("img")?.getAttribute("alt") || null
  })));
  assert(retryState[0]?.correct === "true" && retryState[0]?.alt === "six", `Slot correto alterado: ${JSON.stringify(retryState)}.`);
  assert(retryState[1]?.wrong === "true" && retryState[2]?.wrong === "true", `Feedback vermelho sequence alterado: ${JSON.stringify(retryState)}.`);

  await page.waitForTimeout(1_150);
  const afterReturn = await slotOrder(frame);
  assert(JSON.stringify(afterReturn) === JSON.stringify(["six", null, null]), `Retry sequence divergiu: ${JSON.stringify(afterReturn)}.`);
  assert(await itemByAlt(frame, "seven").isEnabled(), "seven não retornou habilitado.");
  assert(await itemByAlt(frame, "eight").isEnabled(), "eight não retornou habilitado.");
  assert(await frame.locator('.duduq-dd2-sequence-slot .duduq-dd2-item:has(img[alt="six"])').first().isDisabled(), "six correto deveria permanecer bloqueado.");

  const postRetry = await frame.evaluate(() => ({
    feedbackState: document.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || null,
    confirmExists: Boolean(document.querySelector(".duduq-dd2-confirm")),
    bodyText: document.body?.innerText || ""
  }));
  assert(postRetry.feedbackState === "retry", `Feedback sequence divergiu do baseline: ${postRetry.feedbackState}.`);
  assert(postRetry.confirmExists === false, "CONFIRMAR sequence reapareceu e divergiu do baseline 2.0.22/2.0.23.");
  assert(/Os itens corretos ficaram em verde/i.test(postRetry.bodyText), "Mensagem parcial sequence mudou.");

  const fatal = errors.filter((message) => /error|erro|failed|falha/i.test(message));
  assert(fatal.length === 0, `Erros sequence 2.0.24: ${fatal.join(" | ")}`);
  await page.screenshot({ path: `${RESULTS}/sequence-2.0.24-retry-parity.png`, fullPage: false });
  console.log("PASS — DD 2.0.24 sequence parity: sem vazamento visual/single-target, retry equivalente ao baseline");
  await context.close();
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/test/drag-drop/sequence-2.0.23/index.html`;
const RESULTS = "test-results/single-target-choice-2.0.23";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForMechanicFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe about:srcdoc do Drag & Drop sequence não apareceu.");
}

async function waitUntilEnabled(locator, timeout = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await locator.isEnabled().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Item de sequence permaneceu desabilitado além da janela esperada.");
}

function itemByAlt(frame, alt) {
  return frame.locator(`.duduq-dd2-bank .duduq-dd2-item:has(img[alt="${alt}"])`).first();
}

async function dragItem(page, frame, alt) {
  const item = itemByAlt(frame, alt);
  await item.waitFor({ state: "visible", timeout: 6_000 });
  await waitUntilEnabled(item);

  const zone = frame.locator('.duduq-dd2-target[data-kind="list"] .duduq-dd2-zone').first();
  const sourceBox = await item.boundingBox();
  const targetBox = await zone.boundingBox();
  assert(sourceBox && targetBox, `${alt}: bounding box indisponível para drag sequence.`);

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 16 });
  await page.mouse.up();

  await frame.locator(`.duduq-dd2-target[data-kind="list"] .duduq-dd2-item:has(img[alt="${alt}"])`).waitFor({
    state: "visible",
    timeout: 3_000
  });
}

async function slotOrder(frame) {
  return frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-dd2-sequence-slot")).map((slot) => {
    const img = slot.querySelector("img");
    return img ? img.getAttribute("alt") : null;
  }));
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") browserErrors.push(msg.text());
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => window.DuduQDD23SingleTargetRuntimePatch?.ready === true, null, { timeout: 20_000 });

  const frame = await waitForMechanicFrame(page);
  const target = frame.locator('.duduq-dd2-target[data-kind="list"]').first();
  await target.waitFor({ state: "visible", timeout: 35_000 });

  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"),
    null,
    { timeout: 12_000 }
  );

  const slots = frame.locator(".duduq-dd2-sequence-slot");
  assert(await slots.count() === 3, `Sequence deveria renderizar 3 slots; encontrado ${await slots.count()}.`);
  assert(await frame.locator('[data-single-target-choice="true"]').count() === 0, "Gate SINGLE_TARGET_CHOICE vazou para sequence.");

  const nativeOwnerBefore = await frame.evaluate(() => window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__ || null);
  assert(nativeOwnerBefore === null, "Owner nativo exclusivo do SINGLE_TARGET_CHOICE foi instalado em strategy=sequence.");

  const confirm = frame.locator(".duduq-dd2-confirm");
  assert(await confirm.isDisabled(), "Sequence deveria iniciar com CONFIRMAR desabilitado.");

  // Cenário sentinela real: 6 correto na posição 1; 8 e 7 trocados nas posições 2/3.
  await dragItem(page, frame, "six");
  assert(await confirm.isDisabled(), "CONFIRMAR habilitou antes de completar a sequence (1/3). ");
  await dragItem(page, frame, "eight");
  assert(await confirm.isDisabled(), "CONFIRMAR habilitou antes de completar a sequence (2/3). ");
  await dragItem(page, frame, "seven");
  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou com os 3 itens posicionados.");

  const wrongOrder = await slotOrder(frame);
  assert(JSON.stringify(wrongOrder) === JSON.stringify(["six", "eight", "seven"]), `Ordem pré-confirmação inesperada: ${JSON.stringify(wrongOrder)}.`);

  await confirm.click();
  await frame.locator('.duduq-engine-feedback[data-state="retry"] .duduq-engine-feedback-card').waitFor({ state: "visible", timeout: 3_000 });

  const retryState = await frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-dd2-sequence-slot")).map((slot) => ({
    correct: slot.getAttribute("data-correct"),
    wrong: slot.getAttribute("data-wrong"),
    alt: slot.querySelector("img")?.getAttribute("alt") || null
  })));

  assert(retryState[0]?.correct === "true" && retryState[0]?.alt === "six", `Slot correto 1 não ficou verde/bloqueado: ${JSON.stringify(retryState)}.`);
  assert(retryState[1]?.wrong === "true" && retryState[2]?.wrong === "true", `Slots incorretos não ficaram vermelhos: ${JSON.stringify(retryState)}.`);

  await page.waitForTimeout(1_150);
  const afterReturn = await slotOrder(frame);
  assert(JSON.stringify(afterReturn) === JSON.stringify(["six", null, null]), `Após ~850ms somente o item correto deveria permanecer: ${JSON.stringify(afterReturn)}.`);
  assert(await itemByAlt(frame, "seven").isVisible(), "seven incorreto não retornou ao banco.");
  assert(await itemByAlt(frame, "eight").isVisible(), "eight incorreto não retornou ao banco.");
  assert(await confirm.isDisabled(), "CONFIRMAR deveria voltar a desabilitado enquanto a sequence está incompleta.");

  // Completa as posições restantes no fluxo original de sequence.
  await dragItem(page, frame, "seven");
  await dragItem(page, frame, "eight");
  const correctedOrder = await slotOrder(frame);
  assert(JSON.stringify(correctedOrder) === JSON.stringify(["six", "seven", "eight"]), `Ordem corrigida inesperada: ${JSON.stringify(correctedOrder)}.`);
  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou após completar a ordem correta.");

  await confirm.click();
  const success = frame.locator('.duduq-engine-feedback[data-state="success"] .duduq-engine-feedback-card');
  await success.waitFor({ state: "visible", timeout: 3_000 });
  const successText = (await success.innerText()).trim();
  assert(/Correto|Muito bem/i.test(successText), `Feedback final de sequence não ficou observável: ${successText}`);

  const nativeOwnerAfter = await frame.evaluate(() => window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__ || null);
  assert(nativeOwnerAfter === null, "Owner nativo SINGLE_TARGET_CHOICE apareceu após interação de sequence.");

  const fatal = browserErrors.filter((message) => /Falha|Error|erro|failed/i.test(message));
  assert(fatal.length === 0, `Erros de browser na regressão sequence: ${fatal.join(" | ")}`);

  await page.screenshot({ path: `${RESULTS}/sequence-2.0.23-success.png`, fullPage: false });
  console.log("PASS — browser sequence regression: synthetic drag + partial retry + 850ms return + correct lock + success; native single-target owner absent");
  await context.close();
} finally {
  await browser.close();
}

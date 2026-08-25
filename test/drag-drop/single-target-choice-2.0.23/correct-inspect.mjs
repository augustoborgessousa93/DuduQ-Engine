import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;
const EXPECTED_SOURCE_ID = "opt-2"; // EN2-M3-01: doll = source alternative index 1.

async function waitForMechanicFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe about:srcdoc do Drag & Drop não apareceu.");
}

async function waitUntilEnabled(locator, timeout = 6_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await locator.isEnabled().catch(() => false)) return Date.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Alternativa permaneceu desabilitada por mais de ${timeout}ms após o DD2 ficar visível.`);
}

async function boot(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => window.DuduQDD23SingleTargetRuntimePatch?.ready === true, null, { timeout: 20_000 });
  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}
  const frame = await waitForMechanicFrame(page);
  await frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').waitFor({ state: "visible", timeout: 35_000 });
  const firstChoice = frame.locator(".duduq-dd2-bank .duduq-dd2-item").first();
  await firstChoice.waitFor({ state: "visible", timeout: 5_000 });
  const interactiveWaitMs = await waitUntilEnabled(firstChoice);
  return { context, page, frame, interactiveWaitMs };
}

async function probe(browser, letter) {
  const { context, page, frame, interactiveWaitMs } = await boot(browser);
  try {
    const button = frame.locator(".duduq-dd2-bank .duduq-dd2-item").filter({ hasText: `🔊 ${letter}` }).first();
    await button.waitFor({ state: "visible", timeout: 5_000 });
    await waitUntilEnabled(button);
    const itemId = await button.getAttribute("data-dd2-item-id");
    const aria = await button.getAttribute("aria-label");
    await button.click();
    await frame.waitForFunction(() => document.querySelector('.duduq-dd2-target[data-single-target-choice="true"]')?.getAttribute("data-filled") === "true");
    const confirm = frame.locator(".duduq-dd2-confirm");
    if (await confirm.isDisabled()) throw new Error(`${letter}/${itemId}: CONFIRMAR permaneceu desabilitado.`);
    await confirm.click();
    await page.waitForTimeout(120);
    const result = await frame.evaluate(() => {
      const feedback = document.querySelector(".duduq-engine-feedback");
      const card = document.querySelector(".duduq-engine-feedback-card");
      return {
        feedbackState: feedback?.getAttribute("data-state") || null,
        feedbackDisplay: feedback ? getComputedStyle(feedback).display : null,
        feedbackText: card?.innerText || null,
        bodyText: document.body?.innerText || ""
      };
    });
    return { letter, itemId, aria, interactiveWaitMs, ...result };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const probes = [];
  for (const letter of ["A", "B", "C", "D"]) probes.push(await probe(browser, letter));

  console.log("=== DD2 CORRECT CHOICE MAPPING PROBE ===");
  console.log(JSON.stringify(probes, null, 2));

  const successes = probes.filter((entry) => entry.feedbackState === "success");
  if (successes.length === 0) {
    throw new Error(
      `Nenhuma alternativa foi aceita como correta em EN2-M3-01. ` +
      `Fonte v2.3 exige ${EXPECTED_SOURCE_ID} (doll); provável perda de behavior.correctChoiceId na adaptação.`
    );
  }
  if (successes.length !== 1) {
    throw new Error(`Mapeamento inválido: ${successes.length} alternativas foram aceitas como corretas.`);
  }

  const accepted = successes[0];
  if (accepted.itemId !== EXPECTED_SOURCE_ID) {
    throw new Error(
      `Gabarito runtime diverge da fonte v2.3: aceitou ${accepted.letter}/${accepted.itemId}; ` +
      `esperado ${EXPECTED_SOURCE_ID} (doll).`
    );
  }
  if (!accepted.feedbackText || accepted.feedbackDisplay === "none") {
    throw new Error(`A alternativa correta ${accepted.letter}/${accepted.itemId} foi aceita, mas o feedback padrão de acerto não ficou observável.`);
  }

  console.log(`PASS — EN2-M3-01 preserva fonte: ${accepted.letter}/${accepted.itemId} = doll e feedback success observável.`);
} finally {
  await browser.close();
}
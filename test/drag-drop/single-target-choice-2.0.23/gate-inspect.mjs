import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;

async function waitForMechanicFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe about:srcdoc do Drag & Drop não apareceu.");
}

async function waitForFinalInteractive(page, frame, locator, timeout = 10_000) {
  const startedAt = Date.now();

  // A timeline provou um falso estado actionável antes da liberação do primeiro áudio:
  // 0ms enabled -> 168ms disabled -> ~3030ms gate removido + enabled final.
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"),
    null,
    { timeout }
  );

  let stableSince = null;
  while (Date.now() - startedAt < timeout) {
    const enabled = await locator.isEnabled().catch(() => false);
    const arenaDisabled = await frame.evaluate(
      () => document.querySelector(".duduq-dd2-arena")?.getAttribute("data-disabled") === "true"
    ).catch(() => true);

    if (enabled && !arenaDisabled) {
      if (stableSince === null) stableSince = Date.now();
      if (Date.now() - stableSince >= 350) return Date.now() - startedAt;
    } else {
      stableSince = null;
    }
    await page.waitForTimeout(50);
  }

  throw new Error(`DD2 não atingiu estado interativo final e estável em ${timeout}ms.`);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(
    () => window.DuduQDD23SingleTargetRuntimePatch?.ready === true && window.DuduQDD23PointerGateDiagnostic?.ready === true,
    null,
    { timeout: 20_000 }
  );

  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  const frame = await waitForMechanicFrame(page);
  const choiceA = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await choiceA.waitFor({ state: "visible", timeout: 35_000 });
  await frame.waitForFunction(() => window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__?.attached === true, null, { timeout: 10_000 });

  const interactiveWaitMs = await waitForFinalInteractive(page, frame, choiceA);
  const preflight = {
    gate: await page.evaluate(() => document.documentElement.getAttribute("data-duduq-initial-speech-gate")),
    ...(await frame.evaluate(() => ({
      arenaDisabled: document.querySelector(".duduq-dd2-arena")?.getAttribute("data-disabled") || null,
      buttonDisabled: document.querySelector('.duduq-dd2-item[data-dd2-item-id="opt-1"]')?.disabled ?? null,
      feedbackState: document.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "idle"
    })))
  };
  console.log("=== DD2 FINAL INTERACTIVE PREFLIGHT ===");
  console.log(JSON.stringify({ interactiveWaitMs, ...preflight }, null, 2));

  if (preflight.gate !== null || preflight.buttonDisabled !== false || preflight.arenaDisabled === "true") {
    throw new Error(`DD2 não ficou interativo após o gate inicial: ${JSON.stringify(preflight)}`);
  }

  await choiceA.hover({ timeout: 8_000 });
  const box = await choiceA.boundingBox();
  if (!box) throw new Error("Alternativa A não possui bounding box.");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);

  const diagnostic = await frame.evaluate(() => ({
    pointer: window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__ || null,
    activeElement: document.activeElement ? {
      tag: document.activeElement.tagName,
      className: document.activeElement.className,
      disabled: document.activeElement.disabled ?? null,
      itemId: document.activeElement.getAttribute?.("data-dd2-item-id") || null
    } : null
  }));

  await page.mouse.up();
  console.log("=== DD2 POINTERDOWN GATE PROBE ===");
  console.log(JSON.stringify(diagnostic, null, 2));

  const pointer = diagnostic.pointer;
  if (!pointer) throw new Error("Pointer runtime diagnóstico não existe.");
  if ((pointer.pointerDownSeen || 0) < 1) {
    throw new Error("Listener instrumentado não recebeu pointerdown, embora o botão estivesse actionável.");
  }
  if (pointer.rejectedBy) {
    throw new Error(`Pointerdown foi rejeitado por '${pointer.rejectedBy}'. Gate=${JSON.stringify(pointer.lastPointerDownGate)}`);
  }
  if ((pointer.pointerDownAccepted || 0) < 1 || (pointer.pointerDown || 0) < 1) {
    throw new Error(`Pointerdown passou pelos gates, mas o drag state não iniciou. Gate=${JSON.stringify(pointer.lastPointerDownGate)}`);
  }

  console.log("PASS — pointerdown aceito após o gate inicial terminar e o DD2 ficar estável");
  await context.close();
} finally {
  await browser.close();
}

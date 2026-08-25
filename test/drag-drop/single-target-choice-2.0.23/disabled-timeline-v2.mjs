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

function sameState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const browser = await chromium.launch({ headless: true });
try {
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
  const choiceA = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await choiceA.waitFor({ state: "visible", timeout: 35_000 });

  const startedAt = Date.now();
  const transitions = [];
  let previous = null;

  while (Date.now() - startedAt < 7000) {
    const elapsedMs = Date.now() - startedAt;
    const top = await page.evaluate(() => ({
      initialSpeechGate: document.documentElement.getAttribute("data-duduq-initial-speech-gate"),
      transitionClass: document.querySelector(".duduq-transition-root")?.className || null,
      introVisible: Boolean(document.querySelector(".duduq-intro-root:not([hidden])")),
      speechSpeaking: Boolean(window.speechSynthesis?.speaking),
      speechPending: Boolean(window.speechSynthesis?.pending)
    }));
    const inner = await frame.evaluate(() => {
      const button = document.querySelector('.duduq-dd2-item[data-dd2-item-id="opt-1"]');
      const arena = document.querySelector(".duduq-dd2-arena");
      const feedback = document.querySelector(".duduq-engine-feedback");
      return {
        buttonDisabled: button?.disabled ?? null,
        arenaDisabled: arena?.getAttribute("data-disabled") || null,
        feedbackState: feedback?.getAttribute("data-state") || "idle"
      };
    });

    const state = { ...top, ...inner };
    if (!previous || !sameState(previous, state)) {
      transitions.push({ elapsedMs, ...state });
      previous = state;
    }
    await page.waitForTimeout(50);
  }

  console.log("=== DD2 DISABLED TIMELINE V2 ===");
  console.log(JSON.stringify(transitions, null, 2));

  const enabledTransitions = transitions.filter((entry) => entry.buttonDisabled === false && entry.arenaDisabled !== "true");
  const last = transitions.at(-1) || null;
  if (enabledTransitions.length === 0) throw new Error("DD2 nunca ficou interativo durante a janela de 7s.");
  if (!last || last.buttonDisabled !== false || last.arenaDisabled === "true" || last.initialSpeechGate !== null) {
    throw new Error(`DD2 não terminou a janela em estado interativo final: ${JSON.stringify(last)}`);
  }

  console.log(`PASS — timeline v2 capturada; estados=${transitions.length}`);
  await context.close();
} finally {
  await browser.close();
}

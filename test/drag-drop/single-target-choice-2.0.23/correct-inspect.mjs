import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;

function choice(frame, letter) {
  return frame.locator(".duduq-dd2-bank .duduq-dd2-item").filter({ hasText: `🔊 ${letter}` }).first();
}

async function waitForMechanicFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe about:srcdoc do Drag & Drop não apareceu.");
}

async function sample(page, frame, label) {
  let runtime = null;
  try {
    runtime = await frame.evaluate(() => {
      const feedback = document.querySelector(".duduq-engine-feedback");
      const card = document.querySelector(".duduq-engine-feedback-card");
      const target = document.querySelector('.duduq-dd2-target[data-single-target-choice="true"]');
      const confirm = document.querySelector(".duduq-dd2-confirm");
      return {
        bodyText: document.body?.innerText || "",
        feedbackState: feedback?.getAttribute("data-state") || null,
        feedbackHidden: feedback?.hidden ?? null,
        feedbackDisplay: feedback ? getComputedStyle(feedback).display : null,
        feedbackText: card?.innerText || null,
        targetFilled: target?.getAttribute("data-filled") || null,
        targetWrong: target?.getAttribute("data-wrong") || null,
        confirmDisabled: confirm?.disabled ?? null
      };
    });
  } catch (error) {
    runtime = { detachedOrUnavailable: true, error: String(error?.message || error) };
  }

  const parent = await page.evaluate(() => ({
    progress: window.DuduQ?.getProgress?.() || null,
    bodyText: document.body?.innerText || "",
    events: window.__DUDUQ_CORRECT_INSPECT_EVENTS__ || [],
    iframeCount: document.querySelectorAll('iframe[title="DuduQ — Drag & Drop"]').length
  }));

  return { label, runtime, parent };
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(
    () => window.DuduQDD23SingleTargetRuntimePatch?.ready === true && window.DuduQDD23PointerBridge?.ready === true,
    null,
    { timeout: 20_000 }
  );

  await page.evaluate(() => {
    window.__DUDUQ_CORRECT_INSPECT_EVENTS__ = [];
    for (const type of ["duduq:step-start", "duduq:step-complete", "duduq:progress", "duduq:complete"]) {
      window.addEventListener(type, (event) => {
        window.__DUDUQ_CORRECT_INSPECT_EVENTS__.push({
          type,
          at: performance.now(),
          detail: event.detail || null
        });
      });
    }
  });

  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  const frame = await waitForMechanicFrame(page);
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]');
  await target.waitFor({ state: "visible", timeout: 35_000 });

  // EN2-M3-01: B é a resposta correta.
  await choice(frame, "B").click();
  await frame.waitForFunction(() => document.querySelector('.duduq-dd2-target[data-single-target-choice="true"]')?.getAttribute("data-filled") === "true");

  const confirm = frame.locator(".duduq-dd2-confirm");
  if (await confirm.isDisabled()) throw new Error("CONFIRMAR permaneceu desabilitado após selecionar B.");

  const snapshots = [];
  snapshots.push(await sample(page, frame, "before-confirm"));
  await confirm.click();

  for (const [label, delay] of [["t+50", 50], ["t+200", 150], ["t+500", 300], ["t+1000", 500], ["t+1800", 800], ["t+3000", 1200]]) {
    await page.waitForTimeout(delay);
    snapshots.push(await sample(page, frame, label));
  }

  console.log("=== DD2 CORRECT FEEDBACK DIAGNOSTIC ===");
  console.log(JSON.stringify(snapshots, null, 2));

  const successObserved = snapshots.some((entry) => entry.runtime?.feedbackState === "success" && entry.runtime?.feedbackText);
  if (!successObserved) {
    const stepCompleted = snapshots.some((entry) => (entry.parent?.events || []).some((event) => event.type === "duduq:step-complete"));
    throw new Error(
      stepCompleted
        ? "Resposta correta concluiu/avançou a etapa sem evidência observável do feedback padrão de acerto."
        : "Resposta correta não exibiu feedback padrão de acerto e também não concluiu a etapa."
    );
  }

  await context.close();
} finally {
  await browser.close();
}

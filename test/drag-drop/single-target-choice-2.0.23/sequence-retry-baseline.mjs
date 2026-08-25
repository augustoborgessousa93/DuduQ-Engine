import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const CASES = [
  { name: "baseline-2.0.22", url: `${BASE_URL}/test/drag-drop/sequence-2.0.22/index.html` },
  { name: "candidate-2.0.23", url: `${BASE_URL}/test/drag-drop/sequence-2.0.23/index.html` }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe DD2 sequence não apareceu.");
}

function bankItem(frame, alt) {
  return frame.locator(`.duduq-dd2-bank .duduq-dd2-item:has(img[alt="${alt}"])`).first();
}

async function drag(page, frame, alt) {
  const item = bankItem(frame, alt);
  await item.waitFor({ state: "visible", timeout: 6_000 });
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline && !(await item.isEnabled().catch(() => false))) await page.waitForTimeout(50);
  assert(await item.isEnabled(), `${alt}: item não ficou habilitado.`);

  const zone = frame.locator('.duduq-dd2-target[data-kind="list"] .duduq-dd2-zone').first();
  const source = await item.boundingBox();
  const target = await zone.boundingBox();
  assert(source && target, `${alt}: sem bounding box.`);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 16 });
  await page.mouse.up();
  await frame.locator(`.duduq-dd2-target[data-kind="list"] .duduq-dd2-item:has(img[alt="${alt}"])`).waitFor({ state: "visible", timeout: 3_000 });
}

async function snapshot(frame, elapsedMs) {
  return frame.evaluate((elapsedMs) => {
    const feedback = document.querySelector(".duduq-engine-feedback");
    const confirm = document.querySelector(".duduq-dd2-confirm");
    const arena = document.querySelector(".duduq-dd2-arena");
    const slots = Array.from(document.querySelectorAll(".duduq-dd2-sequence-slot")).map((slot) => ({
      alt: slot.querySelector("img")?.getAttribute("alt") || null,
      correct: slot.getAttribute("data-correct"),
      wrong: slot.getAttribute("data-wrong")
    }));
    const buttons = Array.from(document.querySelectorAll("button")).map((button) => ({
      text: (button.innerText || "").trim(),
      aria: button.getAttribute("aria-label"),
      className: button.className || null,
      disabled: Boolean(button.disabled),
      display: getComputedStyle(button).display,
      visibility: getComputedStyle(button).visibility
    })).filter((entry) => entry.text || entry.aria);
    return {
      elapsedMs,
      feedbackState: feedback?.getAttribute("data-state") || null,
      feedbackDisplay: feedback ? getComputedStyle(feedback).display : null,
      feedbackText: document.querySelector(".duduq-engine-feedback-card")?.innerText || null,
      confirm: confirm ? {
        exists: true,
        disabled: Boolean(confirm.disabled),
        display: getComputedStyle(confirm).display,
        visibility: getComputedStyle(confirm).visibility,
        ariaHiddenParent: confirm.closest('[aria-hidden="true"]')?.className || null
      } : { exists: false },
      arenaDisabled: arena?.getAttribute("data-disabled") || null,
      slots,
      bankEnabled: Array.from(document.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item")).map((item) => ({
        alt: item.querySelector("img")?.getAttribute("alt") || null,
        disabled: Boolean(item.disabled)
      })),
      buttons,
      bodyText: document.body?.innerText || ""
    };
  }, elapsedMs);
}

async function runCase(browser, entry) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(entry.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const frame = await waitForFrame(page);
  await frame.locator('.duduq-dd2-target[data-kind="list"]').first().waitFor({ state: "visible", timeout: 35_000 });
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"), null, { timeout: 12_000 }).catch(() => {});

  await drag(page, frame, "six");
  await drag(page, frame, "eight");
  await drag(page, frame, "seven");
  const confirm = frame.locator(".duduq-dd2-confirm");
  await confirm.waitFor({ state: "visible", timeout: 5_000 });
  assert(!(await confirm.isDisabled()), `${entry.name}: confirmar não habilitou em 3/3.`);
  await confirm.click();
  await frame.locator('.duduq-engine-feedback[data-state="retry"] .duduq-engine-feedback-card').waitFor({ state: "visible", timeout: 3_000 });

  const points = [0, 900, 2000, 5000];
  const states = [];
  let previous = 0;
  for (const point of points) {
    if (point > previous) await page.waitForTimeout(point - previous);
    states.push(await snapshot(frame, point));
    previous = point;
  }
  await context.close();
  return { name: entry.name, states };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const entry of CASES) results.push(await runCase(browser, entry));
  console.log("=== DD2 SEQUENCE RETRY A/B BASELINE ===");
  console.log(JSON.stringify(results, null, 2));

  const baseline = results[0].states.at(-1);
  const candidate = results[1].states.at(-1);
  const comparable = {
    baselineFeedback: baseline.feedbackState,
    candidateFeedback: candidate.feedbackState,
    baselineConfirmExists: baseline.confirm.exists,
    candidateConfirmExists: candidate.confirm.exists,
    baselineSlots: baseline.slots.map((slot) => slot.alt),
    candidateSlots: candidate.slots.map((slot) => slot.alt)
  };
  console.log("=== DD2 SEQUENCE RETRY COMPARISON @ 5s ===");
  console.log(JSON.stringify(comparable, null, 2));

  assert(
    comparable.baselineFeedback === comparable.candidateFeedback &&
    comparable.baselineConfirmExists === comparable.candidateConfirmExists &&
    JSON.stringify(comparable.baselineSlots) === JSON.stringify(comparable.candidateSlots),
    `2.0.23 divergiu do baseline 2.0.22 no pós-retry: ${JSON.stringify(comparable)}`
  );
  console.log("PASS — 2.0.23 reproduz o lifecycle pós-retry observado em 2.0.22; qualquer requisito adicional deve ser tratado como baseline UX, não regressão do candidato.");
} finally {
  await browser.close();
}

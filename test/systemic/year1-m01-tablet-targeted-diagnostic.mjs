import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/systemic/year1-m01-tablet-targeted");
const VIEWPORT = { width: 768, height: 1024 };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function snapshot(page, label) {
  return page.evaluate((snapshotLabel) => {
    const iframe = document.querySelector("iframe");
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    const targets = [...(doc?.querySelectorAll(".duduq-ts-target") || [])];
    const feedback = doc?.querySelector(".duduq-engine-feedback");
    const audioButtons = [...(doc?.querySelectorAll("button") || [])].filter((button) =>
      /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || ""))
    );
    const session = window.DuduQ?.getSession?.() || null;
    const moduleDefinition = window.DUDUQ_CONTENT?.english?.year1?.module01;
    const activity = moduleDefinition?.activities?.[session?.stepIndex ?? 0] || null;
    const question = activity?.questions?.[0] || null;
    return {
      label: snapshotLabel,
      epochMs: Date.now(),
      perfMs: performance.now(),
      questionId: question?.id || "EN1-M1-01",
      activityIndex: session?.stepIndex ?? null,
      activityQuestionIds: (activity?.questions || []).map((entry) => entry.id),
      stage: String(doc?.querySelector(".duduq-engine-counter")?.textContent || "").trim() || "1 / 1",
      mechanic: activity?.mechanic || "target-shooter",
      host: session,
      transition: window.DuduQTransition?.getState?.() || null,
      feedback: feedback?.getAttribute("data-state") || "",
      iframe: {
        src: iframe?.getAttribute("src") || "srcdoc",
        title: doc?.title || "",
        targetShooterRoot: Boolean(doc?.querySelector(".duduq-ts-root")),
        runtimeScripts: [...(doc?.scripts || [])].map((script) => script.src).filter(Boolean).filter((src) => /target-shooter|duduq/i.test(src)).slice(-8)
      },
      targets: targets.map((target) => ({
        aria: target.getAttribute("aria-label") || "",
        disabled: Boolean(target.disabled),
        ariaDisabled: target.getAttribute("aria-disabled") || "",
        tabIndex: target.tabIndex
      })),
      audio: {
        speechSpeaking: Boolean(win?.speechSynthesis?.speaking),
        speechPending: Boolean(win?.speechSynthesis?.pending),
        controls: audioButtons.map((button) => ({
          aria: button.getAttribute("aria-label") || "",
          disabled: Boolean(button.disabled),
          pressed: button.getAttribute("aria-pressed") || ""
        }))
      },
      diagnosticEvents: win?.__DUDUQ_TABLET_DIAG__?.events ? [...win.__DUDUQ_TABLET_DIAG__.events] : []
    };
  }, label);
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });
const pageErrors = [];
const critical404 = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (url.includes("/engine/") || url.includes("/content/english/year-1/module-01/") || url.includes("asset-catalog/runtime-index.js")) {
    critical404.push(url);
  }
});

let result;
try {
  const response = await page.goto(`${BASE}/content/english/year-1/module-01/?qa=tablet-targeted-r146-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 35_000
  });
  assert(response?.ok(), `M01 HTTP ${response?.status()}.`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

  const start = page.locator(".duduq-intro-start-button");
  await start.waitFor({ state: "visible", timeout: 30_000 });
  await start.click();
  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    return Boolean(
      session && session.stepIndex === 0 && !session.transitioning && !session.completed &&
      window.DuduQTransition?.getState?.() === "idle" &&
      doc?.querySelector(".duduq-ts-root") && doc.querySelectorAll(".duduq-ts-target").length === 3
    );
  }, null, { timeout: 35_000 });

  // Reproduz exatamente o caminho do gate original: entra e sai de fullscreen antes do disparo.
  assert(await page.evaluate(() => typeof window.DuduQFullscreen?.toggle === "function"), "fullscreen API ausente");
  await page.evaluate(() => window.DuduQFullscreen.toggle());
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5_000 });
  await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5_000 });

  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const target = doc?.querySelector('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]');
    const session = window.DuduQ?.getSession?.();
    return Boolean(target && !target.disabled && session?.stepIndex === 0 && !session?.transitioning && window.DuduQTransition?.getState?.() === "idle");
  }, null, { timeout: 8_000 });

  // Instrumentação somente em memória: observa feedback e temporizadores do runtime sem alterar arquivos/produto.
  await page.evaluate(() => {
    const iframe = document.querySelector("iframe");
    const win = iframe?.contentWindow;
    const doc = iframe?.contentDocument;
    if (!win || !doc) throw new Error("iframe indisponível para diagnóstico");
    const diag = win.__DUDUQ_TABLET_DIAG__ = { events: [] };
    const mark = (type, extra = {}) => diag.events.push({ type, epochMs: Date.now(), perfMs: performance.now(), ...extra });
    mark("instrumentation-ready", {
      feedback: doc.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "",
      speechSpeaking: Boolean(win.speechSynthesis?.speaking)
    });

    const feedback = doc.querySelector(".duduq-engine-feedback");
    if (feedback) {
      new MutationObserver(() => {
        mark("feedback-change", { state: feedback.getAttribute("data-state") || "" });
      }).observe(feedback, { attributes: true, attributeFilter: ["data-state"] });
    }

    doc.addEventListener("click", (event) => {
      const target = event.target?.closest?.(".duduq-ts-target");
      if (target) mark("target-click", { aria: target.getAttribute("aria-label") || "", disabled: Boolean(target.disabled) });
    }, true);

    const nativeSetTimeout = win.setTimeout.bind(win);
    win.setTimeout = function patchedSetTimeout(callback, delay, ...args) {
      if (typeof callback !== "function") return nativeSetTimeout(callback, delay, ...args);
      const source = Function.prototype.toString.call(callback);
      const onAnswerLike = /onAnswer|isCorrect|resolveShot/.test(source);
      const timerId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      if (onAnswerLike) mark("onAnswer-timer-scheduled", { timerId, delay: Number(delay) || 0, source: source.slice(0, 220) });
      return nativeSetTimeout(function wrappedDiagnosticTimer(...callbackArgs) {
        if (onAnswerLike) mark("onAnswer-timer-fired", { timerId, delay: Number(delay) || 0 });
        return callback(...callbackArgs);
      }, delay, ...args);
    };
  });

  const before = await snapshot(page, "before-interaction");
  const interactionEpochMs = Date.now();
  const interactionPerfMs = await page.evaluate(() => performance.now());
  const wrongTarget = page.frameLocator("iframe").locator('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]').first();
  await wrongTarget.click({ force: true });

  let feedbackObserved = false;
  try {
    await page.waitForFunction(() => {
      const doc = document.querySelector("iframe")?.contentDocument;
      return doc?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === "retry";
    }, null, { timeout: 8_000 });
    feedbackObserved = true;
  } catch (_) {
    feedbackObserved = false;
  }

  const after = await snapshot(page, feedbackObserved ? "retry-observed" : "retry-not-observed-8s");
  const events = after.diagnosticEvents;
  const feedbackEvent = events.find((event) => event.type === "feedback-change" && event.state === "retry") || null;
  const onAnswerTimer = events.find((event) => event.type === "onAnswer-timer-fired") || null;
  result = {
    contract: "DUDUQ_M01_TABLET_TARGETED_DIAGNOSTIC_R146",
    viewport: "768x1024",
    question: "EN1-M1-01",
    activityIndex: 0,
    stage: before.stage,
    hostStepIndex: before.host?.stepIndex,
    mechanic: "target-shooter",
    feedbackExpected: "retry",
    feedbackBefore: before.feedback,
    feedbackAfter: after.feedback,
    interactionEpochMs,
    interactionPerfMs,
    onAnswerObservedEpochMs: onAnswerTimer?.epochMs ?? null,
    feedbackChangedEpochMs: feedbackEvent?.epochMs ?? null,
    observedDelayMs: feedbackEvent ? feedbackEvent.epochMs - interactionEpochMs : null,
    onAnswerDelayMs: onAnswerTimer ? onAnswerTimer.epochMs - interactionEpochMs : null,
    feedbackObservedWithin8s: feedbackObserved,
    before,
    after,
    pageErrors,
    critical404
  };
  console.log(`TABLET_TARGETED_DIAGNOSTIC ${JSON.stringify(result)}`);
  await fs.writeFile(path.join(OUT, "diagnostic.json"), JSON.stringify(result, null, 2));
  await page.screenshot({ path: path.join(OUT, "tablet-after.png"), fullPage: false });
  assert(pageErrors.length === 0, `pageerror: ${pageErrors.join(" | ")}`);
  assert(critical404.length === 0, `404 crítico: ${critical404.join(" | ")}`);
  assert(feedbackObserved, "retry não apareceu dentro da janela diagnóstica de 8000ms");
} finally {
  await page.close();
  await browser.close();
}

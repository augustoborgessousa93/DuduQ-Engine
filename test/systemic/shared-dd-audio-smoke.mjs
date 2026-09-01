import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import {
  clickDdOptionWithAudio,
  closeBrowserBounded,
  runQuestionGuarded,
  waitDdReady,
  waitFeedback,
  waitSingleStepCompletion,
} from "./lib/turbo-item-guard.mjs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const MODULE = String(process.env.MODULE || "").padStart(2, "0");
const QUESTION_ID = process.env.QUESTION_ID || "";
const CORRECT_ID = process.env.CORRECT_ID || "";
const WRONG_ID = process.env.WRONG_ID || "";
const VIEWPORT = process.env.VIEWPORT_NAME || "desktop-1366x768";

if (!/^(05|06)$/.test(MODULE)) throw new Error(`Unsupported MODULE=${MODULE}`);
if (!/^EN1-M[56]-\d{2}$/.test(QUESTION_ID)) throw new Error(`Invalid QUESTION_ID=${QUESTION_ID}`);
if (!/^[A-D]$/.test(CORRECT_ID)) throw new Error(`Invalid CORRECT_ID=${CORRECT_ID}`);
if (WRONG_ID && !/^[A-D]$/.test(WRONG_ID)) throw new Error(`Invalid WRONG_ID=${WRONG_ID}`);
if (VIEWPORT !== "desktop-1366x768") throw new Error(`Smoke must use desktop-1366x768, got ${VIEWPORT}`);

const moduleKey = `module${MODULE}`;
const modulePath = `module-${MODULE}`;
const OUT = path.resolve(`test-results/systemic/shared-dd-audio-smoke/${modulePath}`);
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const critical404 = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (/\/engine\//.test(url) || url.includes(`/${modulePath}/`) || /Assets-DuduQ/.test(url)) critical404.push(url);
});

try {
  const response = await page.goto(`${BASE}/content/english/year-1/${modulePath}/?qa=shared-dd-audio-smoke-${QUESTION_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 35000,
  });
  if (!response?.ok()) throw new Error(`Entry HTTP ${response?.status()}`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35000 });

  const source = await page.evaluate(({ moduleKey, questionId }) => {
    const module = window.DUDUQ_CONTENT?.english?.year1?.[moduleKey];
    const questions = (module?.activities || []).flatMap((activity) => activity.questions || []);
    const question = questions.find((item) => item.id === questionId);
    return {
      moduleFound: !!module,
      questionFound: !!question,
      mechanic: question?.delivery?.mechanic || null,
      answer: question?.answer?.value || null,
      itemIds: (question?.payload?.items || []).map((item) => item.id),
      hasOptionAudio: (question?.payload?.items || []).map((item) => ({
        id: item.id,
        spokenText: item.spokenText || "",
        speechLocale: item.speechLocale || "",
      })),
    };
  }, { moduleKey, questionId: QUESTION_ID });

  if (!source.moduleFound || !source.questionFound) throw new Error(`Question ${QUESTION_ID} not materialized`);
  if (source.mechanic !== "drag-drop") throw new Error(`${QUESTION_ID} mechanic=${source.mechanic}, expected drag-drop`);
  if (source.answer !== CORRECT_ID) throw new Error(`${QUESTION_ID} answer=${source.answer}, expected ${CORRECT_ID}`);
  if (!source.itemIds.includes(CORRECT_ID)) throw new Error(`${QUESTION_ID} correct item ${CORRECT_ID} missing`);
  if (!source.hasOptionAudio.every((item) => item.spokenText && item.speechLocale)) {
    throw new Error(`${QUESTION_ID} option audio/TTS contract missing`);
  }

  await page.waitForFunction(() => !!document.querySelector(".duduq-intro-start-button"), null, { timeout: 30000 });
  const mounted = await page.evaluate(({ moduleKey, questionId }) => {
    const module = window.DUDUQ_CONTENT.english.year1[moduleKey];
    const question = (module.activities || []).flatMap((activity) => activity.questions || []).find((item) => item.id === questionId);
    window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-shared-dd-audio-smoke" });
    window.DuduQTransition?.hideImmediate?.();
    const step = {
      id: `qa-${question.id}`,
      mechanic: question.delivery.mechanic,
      payload: {
        id: `qa-${question.id}-payload`,
        title: question.metadata?.topic || question.statement || question.id,
        subject: module.subject,
        year: module.year,
        module: module.module,
        questions: [question],
      },
      options: { contentVersion: module.version, skill: question.skill || null },
    };
    window.DuduQ.start({
      id: `${module.id}-qa-shared-audio-smoke`,
      title: module.title,
      year: module.year,
      subject: module.subject,
      module: module.module,
      container: "#root",
      steps: [step],
    });
    return { id: question.id, mechanic: question.delivery.mechanic };
  }, { moduleKey, questionId: QUESTION_ID });

  if (mounted.id !== QUESTION_ID || mounted.mechanic !== "drag-drop") throw new Error(`Mount mismatch for ${QUESTION_ID}`);
  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const d = document.querySelector("iframe")?.contentDocument;
    return !!(session && session.stepIndex === 0 && !session.transitioning && !session.completed && d?.body && window.DuduQTransition?.getState?.() === "idle");
  }, null, { timeout: 25000 });

  console.log(`${QUESTION_ID} START`);
  const audioModes = [];
  await runQuestionGuarded({
    page,
    browser,
    questionId: QUESTION_ID,
    viewport: VIEWPORT,
    mechanic: "drag-drop",
    pageErrors,
    critical404,
    currentStep: 0,
    screenshotPath: path.join(OUT, `${QUESTION_ID}-${VIEWPORT}-FAIL.png`),
    run: async (guard) => {
      const ready = await waitDdReady(page);
      guard.note({ phase: "initial-dd-ready", currentStep: 0, ...ready });

      if (WRONG_ID) {
        guard.note({ phase: `wrong-attempt:${WRONG_ID}` });
        const wrongAudio = await clickDdOptionWithAudio(page, WRONG_ID, { guard, pageErrors, critical404 });
        audioModes.push({ attempt: "wrong", item: WRONG_ID, mode: wrongAudio.mode });
        await waitFeedback(page, "retry");
        guard.note({ phase: "retry-feedback", feedbackState: "retry" });
        const retryReady = await waitDdReady(page);
        guard.note({ phase: "retry-dd-ready", ...retryReady });
      }

      guard.note({ phase: `correct-attempt:${CORRECT_ID}` });
      const correctAudio = await clickDdOptionWithAudio(page, CORRECT_ID, { guard, pageErrors, critical404 });
      audioModes.push({ attempt: "correct", item: CORRECT_ID, mode: correctAudio.mode });
      await waitFeedback(page, "success");
      guard.note({ phase: "success-feedback", feedbackState: "success" });
      await waitSingleStepCompletion(page);
      guard.note({ phase: "progression-complete", currentStep: 0, transitionState: "idle" });
    },
  });

  const done = await page.evaluate(() => {
    const session = window.DuduQ?.getSession?.();
    return { completed: !!session?.completed, progress: session?.progress?.percent ?? null };
  });
  if (!done.completed || done.progress !== 100) throw new Error(`Progression failed: ${JSON.stringify(done)}`);
  if (pageErrors.length) throw new Error(`pageErrors: ${pageErrors.join(" | ")}`);
  if (critical404.length) throw new Error(`critical404: ${critical404.join(" | ")}`);

  await page.screenshot({ path: path.join(OUT, `${QUESTION_ID}-${VIEWPORT}-PASS.png`), fullPage: true });
  await fs.writeFile(path.join(OUT, `${QUESTION_ID}-${VIEWPORT}.json`), JSON.stringify({
    module: `M${MODULE}`,
    questionId: QUESTION_ID,
    viewport: VIEWPORT,
    mechanic: "drag-drop",
    sequence: WRONG_ID ? ["card", "audio-sync-or-headless-fallback", "zone", "retry", "card", "audio-sync-or-headless-fallback", "zone", "success", "progression"] : ["card", "audio-sync-or-headless-fallback", "zone", "success", "progression"],
    audioModes,
    pageErrors,
    critical404,
    result: "PASS",
  }, null, 2));
  console.log(`${QUESTION_ID} PASS audioModes=${JSON.stringify(audioModes)}`);
} finally {
  await closeBrowserBounded(browser, 1200);
}

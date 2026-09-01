import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import {
  clickDdOptionWithAudio,
  closeBrowserBounded,
  runQuestionGuarded,
  waitDdReady,
  waitFeedback,
} from "./lib/turbo-item-guard-v2.mjs";
import { installHeadlessTtsSafety } from "./lib/headless-tts-safety.mjs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const MODULE = String(process.env.MODULE || "").padStart(2, "0");
const VIEWPORT_NAME = process.env.VIEWPORT_NAME || "";
const VIEWPORTS = {
  "desktop-1366x768": { width: 1366, height: 768 },
  "fullhd-1920x1080": { width: 1920, height: 1080 },
  "tablet-768x1024": { width: 768, height: 1024 },
  "mobile-390x844": { width: 390, height: 844, mobile: true },
};
const viewport = VIEWPORTS[VIEWPORT_NAME];
if (!/^(01|02|03|04|05|06)$/.test(MODULE)) throw new Error(`Invalid MODULE=${MODULE}`);
if (!viewport) throw new Error(`Invalid VIEWPORT_NAME=${VIEWPORT_NAME}`);

const OUT = path.resolve(`test-results/systemic/year3-v23-functional/module-${MODULE}`);
await fs.mkdir(OUT, { recursive: true });

function ok(value, message) {
  if (!value) throw new Error(message);
}

async function waitStep(page, index, timeout = 20000) {
  await page.waitForFunction((n) => {
    const session = window.DuduQ?.getSession?.();
    const d = document.querySelector("iframe")?.contentDocument;
    return !!(
      session && session.stepIndex === n && !session.transitioning && !session.completed &&
      d?.body && window.DuduQTransition?.getState?.() === "idle"
    );
  }, index, { timeout, polling: 50 });
}

async function waitProgression(page, index, total, timeout = 20000) {
  await page.waitForFunction(({ index, total }) => {
    const session = window.DuduQ?.getSession?.();
    if (!session || session.transitioning) return false;
    if (session.completed) return index === total - 1 && session.progress?.percent === 100;
    return session.stepIndex === index + 1 && !!document.querySelector("iframe")?.contentDocument?.body && window.DuduQTransition?.getState?.() === "idle";
  }, { index, total }, { timeout, polling: 50 });
}

async function waitTsReady(page, timeout = 12000) {
  const handle = await page.waitForFunction(() => {
    const d = document.querySelector("iframe")?.contentDocument;
    const targets = [...(d?.querySelectorAll(".duduq-ts-target") || [])];
    const enabled = targets.length > 0 && targets.every((target) => !target.disabled && target.getAttribute("aria-disabled") !== "true");
    const busy = !!d?.querySelector("[data-audio-playing='true']");
    if (!d?.querySelector(".duduq-ts-root") || !enabled || busy) return false;
    return { targetPresent: true, targetEnabled: true, interactionEnabled: true, targetCount: targets.length };
  }, null, { timeout, polling: 50 });
  return handle.jsonValue();
}

async function clickTsTargetDom(page, index) {
  return page.evaluate((targetIndex) => {
    const d = document.querySelector("iframe")?.contentDocument;
    const targets = [...(d?.querySelectorAll(".duduq-ts-target") || [])];
    const target = targets[targetIndex];
    if (!target) throw new Error(`TS target index ${targetIndex} missing`);
    if (target.disabled || target.getAttribute("aria-disabled") === "true") throw new Error(`TS target index ${targetIndex} disabled`);
    target.click();
    return { count: targets.length, aria: target.getAttribute("aria-label") || "", title: target.getAttribute("title") || "" };
  }, index);
}

async function surfaceState(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("iframe");
    const d = frame?.contentDocument;
    const root = d?.querySelector(".duduq-dd2-root,.duduq-ts-root");
    const frameRect = frame?.getBoundingClientRect();
    const interactive = [...(d?.querySelectorAll(".duduq-dd2-item,.duduq-ts-target") || [])].map((node) => {
      const r = node.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    return {
      frameWidth: frameRect?.width || 0,
      frameHeight: frameRect?.height || 0,
      scrollWidth: root?.scrollWidth || 0,
      clientWidth: root?.clientWidth || 0,
      interactive,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: viewport.width, height: viewport.height },
  hasTouch: !!viewport.mobile,
  isMobile: !!viewport.mobile,
});
await installHeadlessTtsSafety(page);
if (viewport.mobile) await page.emulateMedia({ reducedMotion: "reduce" });

const pageErrors = [];
const critical404 = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (/\/engine\//.test(url) || url.includes(`/year-3/module-${MODULE}/`) || /Assets-DuduQ/.test(url)) critical404.push(url);
});

try {
  const response = await page.goto(`${BASE}/content/english/year-3/module-${MODULE}/?qa=year3-functional-${VIEWPORT_NAME}`, {
    waitUntil: "domcontentloaded",
    timeout: 35000,
  });
  ok(response?.ok(), `entry HTTP ${response?.status()}`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35000 });

  const moduleKey = `module${MODULE}`;
  const source = await page.evaluate((key) => {
    const module = window.DUDUQ_CONTENT?.english?.year3?.[key];
    const questions = (module?.activities || []).flatMap((activity) => activity.questions || []);
    const manifest = window.DUDUQ_ENGINE_MANIFEST || {};
    return {
      found: !!module,
      id: module?.id || null,
      title: module?.title || null,
      version: module?.version || null,
      year: module?.year || null,
      module: module?.module || null,
      count: questions.length,
      ids: questions.map((q) => q.id),
      mechanics: questions.map((q) => q.delivery?.mechanic),
      answers: questions.map((q) => q.answer?.value),
      options: questions.map((q) => (q.alternatives || []).map((a) => a.id)),
      revision: manifest.revision,
      core: manifest.core?.release,
      dd: manifest.mechanics?.["drag-drop"]?.release,
      ts: manifest.mechanics?.["target-shooter"]?.release,
    };
  }, moduleKey);

  ok(source.found, `Year 3 ${moduleKey} not materialized`);
  ok(source.count === 15, `Year 3 ${moduleKey} count=${source.count}, expected 15`);
  ok(source.ids.every((id, i) => id === `EN3-M${Number(MODULE)}-${String(i + 1).padStart(2, "0")}`), `Year 3 ${moduleKey} ID sequence mismatch`);
  ok(source.mechanics.every((m) => m === "drag-drop" || m === "target-shooter"), `Year 3 ${moduleKey} unsupported mechanic`);
  ok(source.revision === 147 && source.core === "1.0.12" && source.dd === "2.0.24" && source.ts === "1.0.21", `Year 3 ${moduleKey} foundation mismatch`);

  await page.waitForFunction(() => !!document.querySelector(".duduq-intro-start-button"), null, { timeout: 30000 });
  const mounted = await page.evaluate((key) => {
    const module = window.DUDUQ_CONTENT.english.year3[key];
    const questions = (module.activities || []).flatMap((activity) => activity.questions || []);
    window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-year3-functional" });
    window.DuduQTransition?.hideImmediate?.();
    const steps = questions.map((q) => ({
      id: `qa-${q.id}`,
      mechanic: q.delivery.mechanic,
      payload: {
        id: `qa-${q.id}-payload`,
        title: q.metadata?.screenTitle || q.statement || q.id,
        subject: module.subject,
        year: module.year,
        module: module.module,
        questions: [q],
      },
      options: { contentVersion: module.version, skill: q.skill || null },
    }));
    window.DuduQ.start({
      id: `${module.id}-qa-functional`,
      title: module.title,
      year: module.year,
      subject: module.subject,
      module: module.module,
      container: "#root",
      steps,
    });
    return { count: steps.length, ids: questions.map((q) => q.id) };
  }, moduleKey);
  ok(mounted.count === 15, `Year 3 ${moduleKey} mount count=${mounted.count}`);
  await waitStep(page, 0, 25000);

  const evidence = [];
  for (let index = 0; index < source.count; index++) {
    const questionId = source.ids[index];
    const mechanic = source.mechanics[index];
    const answerId = source.answers[index];
    const correctIndex = source.options[index].indexOf(answerId);
    ok(correctIndex >= 0, `${questionId}: correct option not found`);
    console.log(`${questionId} START`);

    const audioModes = [];
    await runQuestionGuarded({
      page,
      browser,
      questionId,
      viewport: VIEWPORT_NAME,
      mechanic,
      pageErrors,
      critical404,
      currentStep: index,
      screenshotPath: path.join(OUT, `${VIEWPORT_NAME}-${questionId}-FAIL.png`),
      run: async (guard) => {
        await waitStep(page, index);
        guard.note({ phase: "step-ready", currentStep: index });
        const layout = await surfaceState(page);
        ok(layout.frameWidth > 200 && layout.frameHeight > 200, `${questionId}: surface missing`);
        ok(layout.scrollWidth <= layout.clientWidth + 8, `${questionId}: mechanic overflow`);
        ok(layout.interactive.every((r) => r.width >= 44 && r.height >= 44), `${questionId}: interactive target below 44px`);

        if (mechanic === "drag-drop") {
          const ready = await waitDdReady(page);
          guard.note({ phase: "dd-ready", ...ready });
          const audio = await clickDdOptionWithAudio(page, answerId, { guard, pageErrors, critical404 });
          audioModes.push(audio.mode);
        } else {
          const ready = await waitTsReady(page);
          guard.note({ phase: "ts-ready", currentStep: index, ...ready, audioState: { mode: "stimulus-synchronized-or-headless-safe" } });
          await clickTsTargetDom(page, correctIndex);
          guard.note({ phase: `ts-click:${correctIndex}`, targetPresent: true, targetEnabled: true, interactionEnabled: true });
        }

        await waitFeedback(page, "success");
        guard.note({ phase: "success-feedback", feedbackState: "success" });
        await waitProgression(page, index, source.count);
        guard.note({ phase: "progression", currentStep: index });
      },
    });

    evidence.push({ questionId, mechanic, answerId, audioModes, result: "PASS" });
    console.log(`${questionId} PASS`);
  }

  const done = await page.evaluate(() => {
    const session = window.DuduQ?.getSession?.();
    return { completed: !!session?.completed, progress: session?.progress?.percent ?? null };
  });
  ok(done.completed && done.progress === 100, `Year 3 M${MODULE} progression failed: ${JSON.stringify(done)}`);
  ok(pageErrors.length === 0, `pageErrors: ${pageErrors.join(" | ")}`);
  ok(critical404.length === 0, `critical404: ${critical404.join(" | ")}`);
  ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= viewport.width + 6, "public overflow");

  await page.screenshot({ path: path.join(OUT, `${VIEWPORT_NAME}-PASS.png`), fullPage: true });
  await fs.writeFile(path.join(OUT, `${VIEWPORT_NAME}.json`), JSON.stringify({
    year: 3,
    module: `M${MODULE}`,
    viewport: VIEWPORT_NAME,
    itemCount: source.count,
    evidence,
    pageErrors,
    critical404,
    result: "PASS",
  }, null, 2));
  console.log(`YEAR3 M${MODULE} ${VIEWPORT_NAME} PASS ${source.count}/15`);
} finally {
  await closeBrowserBounded(browser, 1200);
}

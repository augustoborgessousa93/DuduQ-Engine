export const ITEM_TIMEOUT_MS = 70000;
const SOFT_TIMEOUT_MS = ITEM_TIMEOUT_MS - 2000;

function timeoutError(message, code = "TIMEOUT") {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function raceReject(task, ms, message, code = "TIMEOUT") {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(message, code)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function safeBounded(task, ms, fallback = null) {
  try {
    return await raceReject(task, ms, `bounded operation exceeded ${ms}ms`, "BOUNDED_TIMEOUT");
  } catch {
    return fallback;
  }
}

function isTimeout(error) {
  return error?.code === "ITEM_TIMEOUT" || /ITEM_TIMEOUT/.test(String(error?.message || ""));
}

async function liveState(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("iframe");
    const d = frame?.contentDocument;
    const w = frame?.contentWindow;
    const session = window.DuduQ?.getSession?.();
    const zone = d?.querySelector(".duduq-dd2-zone,.duduq-dd2-target[data-dd2-target-id]");
    const items = [...(d?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    const customPlaying = [...(d?.querySelectorAll("[data-audio-playing='true']") || [])].map((node) =>
      node.getAttribute("data-dd2-item-id") || node.id || node.className || node.tagName
    );
    const htmlAudio = [...(d?.querySelectorAll("audio") || [])].map((audio) => ({
      paused: !!audio.paused,
      ended: !!audio.ended,
      currentTime: Number(audio.currentTime || 0),
      readyState: Number(audio.readyState || 0),
    }));
    const synth = w?.speechSynthesis;
    return {
      currentStep: session?.stepIndex ?? null,
      sessionTransitioning: !!session?.transitioning,
      completed: !!session?.completed,
      progress: session?.progress?.percent ?? null,
      transitionState: window.DuduQTransition?.getState?.() || "unknown",
      feedbackState: d?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "none",
      audioState: {
        customPlaying,
        htmlAudioPlaying: htmlAudio.some((a) => !a.paused && !a.ended),
        htmlAudio,
        speechSynthesis: {
          available: !!synth,
          speaking: !!synth?.speaking,
          pending: !!synth?.pending,
          paused: !!synth?.paused,
        },
      },
      targetPresent: !!zone,
      targetEnabled: !!zone && !zone.disabled && zone.getAttribute("aria-disabled") !== "true" && !zone.classList.contains("is-disabled"),
      interactionEnabled: items.length > 0 && items.every((item) => !item.disabled && item.getAttribute("aria-disabled") !== "true"),
      itemCount: items.length,
    };
  });
}

export async function collectItemDiagnostic(page, meta, cache = {}) {
  const live = await safeBounded(() => liveState(page), 900, null);
  return {
    questionId: meta.questionId,
    viewport: meta.viewport,
    mechanic: meta.mechanic,
    phase: cache.phase || "unknown",
    currentStep: live?.currentStep ?? cache.currentStep ?? null,
    audioState: live?.audioState ?? cache.audioState ?? { mode: "unavailable" },
    feedbackState: live?.feedbackState ?? cache.feedbackState ?? "unavailable",
    transitionState: live?.transitionState ?? cache.transitionState ?? "unavailable",
    sessionTransitioning: live?.sessionTransitioning ?? cache.sessionTransitioning ?? null,
    targetPresent: live?.targetPresent ?? cache.targetPresent ?? null,
    targetEnabled: live?.targetEnabled ?? cache.targetEnabled ?? null,
    interactionEnabled: live?.interactionEnabled ?? cache.interactionEnabled ?? null,
    pageErrors: [...(meta.pageErrors || [])],
    critical404: [...(meta.critical404 || [])],
  };
}

export async function closeBrowserBounded(browser, ms = 1200) {
  if (!browser) return true;
  const result = await safeBounded(async () => {
    await browser.close();
    return true;
  }, ms, false);
  return result === true;
}

export async function runQuestionGuarded({
  page,
  browser,
  questionId,
  viewport,
  mechanic,
  pageErrors = [],
  critical404 = [],
  screenshotPath = null,
  currentStep = null,
  run,
}) {
  const startedAt = Date.now();
  const cache = {
    phase: "start",
    currentStep,
    audioState: { mode: "not-started" },
    feedbackState: "unknown",
    transitionState: "unknown",
    targetPresent: null,
    targetEnabled: null,
    interactionEnabled: null,
  };
  const note = (patch = {}) => Object.assign(cache, patch);
  const meta = { questionId, viewport, mechanic, pageErrors, critical404 };
  let hardTimer;
  let hardTriggered = false;

  const hardKill = () => {
    hardTriggered = true;
    const diagnostic = {
      questionId,
      viewport,
      mechanic,
      phase: cache.phase,
      currentStep: cache.currentStep,
      audioState: cache.audioState,
      feedbackState: cache.feedbackState,
      transitionState: cache.transitionState,
      targetPresent: cache.targetPresent,
      targetEnabled: cache.targetEnabled,
      interactionEnabled: cache.interactionEnabled,
      pageErrors: [...pageErrors],
      critical404: [...critical404],
      elapsedMs: Date.now() - startedAt,
      hardTimeout: true,
    };
    console.error(`ITEM_TIMEOUT_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
    process.exit(124);
  };

  hardTimer = setTimeout(hardKill, ITEM_TIMEOUT_MS);
  try {
    const value = await raceReject(
      () => run({ note, cache }),
      SOFT_TIMEOUT_MS,
      `ITEM_TIMEOUT ${questionId}`,
      "ITEM_TIMEOUT"
    );
    return value;
  } catch (error) {
    const diagnostic = await collectItemDiagnostic(page, meta, cache);
    diagnostic.elapsedMs = Date.now() - startedAt;
    diagnostic.timeout = isTimeout(error);
    if (screenshotPath) {
      await safeBounded(() => page.screenshot({ path: screenshotPath, fullPage: true }), 500, null);
    }
    console.error(`ITEM_FAILURE_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
    if (isTimeout(error)) {
      await closeBrowserBounded(browser, 500);
    }
    const wrapped = new Error(
      `QUESTION=${questionId} VIEWPORT=${viewport} MECHANIC=${mechanic} ` +
      `STATE=${JSON.stringify(diagnostic)} CAUSE=${error?.message || String(error)}`
    );
    wrapped.code = isTimeout(error) ? "ITEM_TIMEOUT" : "ITEM_FAILURE";
    wrapped.diagnostic = diagnostic;
    throw wrapped;
  } finally {
    if (!hardTriggered) clearTimeout(hardTimer);
  }
}

export async function waitDdReady(page, timeout = 12000) {
  const handle = await page.waitForFunction(() => {
    const frame = document.querySelector("iframe");
    const d = frame?.contentDocument;
    const zone = d?.querySelector(".duduq-dd2-zone,.duduq-dd2-target[data-dd2-target-id]");
    const items = [...(d?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    const enabled = items.length > 0 && items.every((item) => !item.disabled && item.getAttribute("aria-disabled") !== "true");
    const targetEnabled = !!zone && !zone.disabled && zone.getAttribute("aria-disabled") !== "true" && !zone.classList.contains("is-disabled");
    const customBusy = !!d?.querySelector("[data-audio-playing='true']");
    if (!d?.querySelector(".duduq-dd2-root") || !targetEnabled || !enabled || customBusy) return false;
    return { targetPresent: true, targetEnabled, interactionEnabled: enabled, itemCount: items.length };
  }, null, { timeout, polling: 50 });
  return handle.jsonValue();
}

async function installClickProbe(page, id) {
  await page.evaluate((itemId) => {
    const frame = document.querySelector("iframe");
    const d = frame?.contentDocument;
    const card = d?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${itemId}"]`);
    if (!card) throw new Error(`DD card ${itemId} not found`);
    const probe = { itemId, clicked: false };
    card.addEventListener("click", () => { probe.clicked = true; }, { capture: true, once: true });
    window.__DUDUQ_QA_DD_AUDIO_PROBE__ = probe;
  }, id);
}

async function readAudioObservation(page, id) {
  return page.evaluate((itemId) => {
    const frame = document.querySelector("iframe");
    const d = frame?.contentDocument;
    const w = frame?.contentWindow;
    const card = d?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${itemId}"]`);
    const zone = d?.querySelector(".duduq-dd2-zone,.duduq-dd2-target[data-dd2-target-id]");
    const items = [...(d?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    const synth = w?.speechSynthesis;
    const customPlaying = card?.getAttribute("data-audio-playing") === "true" || !!d?.querySelector("[data-audio-playing='true']");
    const htmlAudioPlaying = [...(d?.querySelectorAll("audio") || [])].some((audio) => !audio.paused && !audio.ended);
    const speechSpeaking = !!(synth?.speaking || synth?.pending);
    return {
      clicked: window.__DUDUQ_QA_DD_AUDIO_PROBE__?.clicked === true,
      customPlaying,
      htmlAudioPlaying,
      speechSpeaking,
      speechAvailable: !!synth,
      targetPresent: !!zone,
      targetEnabled: !!zone && !zone.disabled && zone.getAttribute("aria-disabled") !== "true" && !zone.classList.contains("is-disabled"),
      interactionEnabled: items.length > 0 && items.every((item) => !item.disabled && item.getAttribute("aria-disabled") !== "true"),
    };
  }, id);
}

async function observeAudioStart(page, id, timeout = 1400) {
  try {
    const handle = await page.waitForFunction((itemId) => {
      const frame = document.querySelector("iframe");
      const d = frame?.contentDocument;
      const w = frame?.contentWindow;
      const card = d?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${itemId}"]`);
      const customPlaying = card?.getAttribute("data-audio-playing") === "true" || !!d?.querySelector("[data-audio-playing='true']");
      const htmlAudioPlaying = [...(d?.querySelectorAll("audio") || [])].some((audio) => !audio.paused && !audio.ended);
      const synth = w?.speechSynthesis;
      const speechSpeaking = !!(synth?.speaking || synth?.pending);
      if (!customPlaying && !htmlAudioPlaying && !speechSpeaking) return false;
      return { customPlaying, htmlAudioPlaying, speechSpeaking };
    }, id, { timeout, polling: 50 });
    return await handle.jsonValue();
  } catch (error) {
    if (/Timeout/.test(String(error?.message || error))) return null;
    throw error;
  }
}

async function waitAudioIdle(page, id, timeout = 9000) {
  await page.waitForFunction((itemId) => {
    const frame = document.querySelector("iframe");
    const d = frame?.contentDocument;
    const w = frame?.contentWindow;
    const card = d?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${itemId}"]`);
    const customPlaying = card?.getAttribute("data-audio-playing") === "true" || !!d?.querySelector("[data-audio-playing='true']");
    const htmlAudioPlaying = [...(d?.querySelectorAll("audio") || [])].some((audio) => !audio.paused && !audio.ended);
    const synth = w?.speechSynthesis;
    return !customPlaying && !htmlAudioPlaying && !synth?.speaking && !synth?.pending;
  }, id, { timeout, polling: 50 });
}

export async function clickDdOptionWithAudio(page, id, {
  guard = null,
  pageErrors = [],
  critical404 = [],
  startWindowMs = 1400,
} = {}) {
  const ready = await waitDdReady(page);
  guard?.note?.({ phase: "dd-ready", targetPresent: ready.targetPresent, targetEnabled: ready.targetEnabled, interactionEnabled: ready.interactionEnabled });

  const frame = page.frameLocator("iframe");
  const card = frame.locator(`.duduq-dd2-item[data-dd2-item-id="${id}"]`).first();
  const hasAudio = (await card.getAttribute("data-has-audio")) === "true";
  const errorsBefore = pageErrors.length;
  await installClickProbe(page, id);

  guard?.note?.({ phase: `card-click:${id}`, audioState: { mode: hasAudio ? "probing" : "no-audio" } });
  await card.click({ force: true, timeout: 5000 });

  let mode = "no-audio";
  if (hasAudio) {
    guard?.note?.({ phase: `audio-start-window:${id}`, audioState: { mode: "start-window" } });
    const started = await observeAudioStart(page, id, startWindowMs);
    if (started) {
      mode = started.speechSpeaking ? "speech-synthesis" : started.htmlAudioPlaying ? "html-audio" : "data-audio-playing";
      guard?.note?.({ phase: `audio-playing:${id}`, audioState: { mode, ...started } });
      await waitAudioIdle(page, id);
      guard?.note?.({ phase: `audio-idle:${id}`, audioState: { mode, idle: true } });
    } else {
      const fallback = await safeBounded(() => readAudioObservation(page, id), 900, null);
      if (!fallback?.clicked) throw new Error(`DD ${id}: card click was not observed`);
      if (pageErrors.length !== errorsBefore) throw new Error(`DD ${id}: JavaScript error after card click: ${pageErrors.slice(errorsBefore).join(" | ")}`);
      if (!fallback.targetPresent || !fallback.targetEnabled || !fallback.interactionEnabled) {
        throw new Error(`DD ${id}: headless audio fallback rejected because target/interaction is unavailable`);
      }
      mode = "headless-no-observable-playback";
      guard?.note?.({
        phase: `audio-headless-fallback:${id}`,
        audioState: { mode, speechAvailable: fallback.speechAvailable },
        targetPresent: fallback.targetPresent,
        targetEnabled: fallback.targetEnabled,
        interactionEnabled: fallback.interactionEnabled,
      });
    }
  }

  if (critical404.length) {
    guard?.note?.({ phase: `zone-click:${id}`, audioState: { mode, critical404Present: true } });
  } else {
    guard?.note?.({ phase: `zone-click:${id}`, audioState: { mode } });
  }
  const zone = frame.locator(".duduq-dd2-zone").first();
  await zone.click({ force: true, timeout: 5000 });
  return { mode };
}

export async function waitFeedback(page, state, timeout = 7000) {
  await page.waitForFunction((expected) => {
    const d = document.querySelector("iframe")?.contentDocument;
    return d?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === expected;
  }, state, { timeout, polling: 50 });
}

export async function waitSingleStepCompletion(page, timeout = 18000) {
  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    return !!(session?.completed && session?.progress?.percent === 100 && !session?.transitioning);
  }, null, { timeout, polling: 50 });
}

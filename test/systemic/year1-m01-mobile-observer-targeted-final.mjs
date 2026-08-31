import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const pageErrors = [];
const critical404 = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.emulateMedia({ reducedMotion: "reduce" });
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (url.includes("/engine/") || url.includes("/content/english/year-1/module-01/") || url.includes("asset-catalog/runtime-index.js")) critical404.push(url);
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const response = await page.goto(`${BASE}/content/english/year-1/module-01/?qa=mobile-observer-final-r146`, { waitUntil: "domcontentloaded", timeout: 35_000 });
  assert(response?.ok(), `M01 HTTP ${response?.status()}`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });
  const start = page.locator(".duduq-intro-start-button");
  await start.waitFor({ state: "visible", timeout: 30_000 });
  await start.click();
  await page.waitForFunction(() => {
    const s = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    return Boolean(s?.stepIndex === 0 && !s.transitioning && window.DuduQTransition?.getState?.() === "idle" && doc?.querySelector('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]'));
  }, null, { timeout: 35_000 });
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const target = doc?.querySelector('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]');
    const controls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) => /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || "")));
    const busy = controls.some((button) => Boolean(button.disabled) || /reprodução|playing/i.test(String(button.getAttribute("aria-label") || "")));
    return Boolean(target && !target.disabled && controls.length >= 1 && !busy);
  }, null, { timeout: 8_000 });
  await page.frameLocator("iframe").locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first().click({ force: true });
  await page.waitForFunction(() => {
    const s = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    return Boolean(s?.stepIndex === 1 && !s.transitioning && window.DuduQTransition?.getState?.() === "idle" && doc?.querySelector('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]'));
  }, null, { timeout: 15_000 });

  const before = await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const card = doc?.querySelector('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]');
    return {
      host: window.DuduQ?.getSession?.(),
      transition: window.DuduQTransition?.getState?.(),
      card: { exists: Boolean(card), disabled: Boolean(card?.disabled), hasAudio: card?.getAttribute("data-has-audio"), audioPlaying: card?.getAttribute("data-audio-playing") },
      reducedMotion: doc?.querySelector(".duduq-dd2-root")?.getAttribute("data-reduced-motion")
    };
  });
  assert(before.host?.stepIndex === 1 && !before.host?.transitioning && before.transition === "idle", "Host/Transition não estavam estáveis na Q02.");
  assert(before.card.exists && !before.card.disabled && before.card.hasAudio === "true", "Card A não estava pronto para áudio.");
  assert(before.reducedMotion === "true", "reduced-motion não propagou ao DD.");

  await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const card = doc?.querySelector('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]');
    if (!card) throw new Error("Card A ausente antes do observer.");
    const latch = { installedBeforeClick: true, seenPlaying: card.getAttribute("data-audio-playing") === "true", observer: null, playingAt: 0, stoppedAt: 0 };
    const observer = new MutationObserver(() => {
      const value = card.getAttribute("data-audio-playing");
      if (value === "true") {
        latch.seenPlaying = true;
        if (!latch.playingAt) latch.playingAt = Date.now();
      } else if (latch.seenPlaying && !latch.stoppedAt) {
        latch.stoppedAt = Date.now();
      }
    });
    observer.observe(card, { attributes: true, attributeFilter: ["data-audio-playing"] });
    latch.observer = observer;
    window.__DUDUQ_QA_FINAL_MOBILE_AUDIO_LATCH__ = latch;
  });

  const clickRequestedAt = Date.now();
  await page.frameLocator("iframe").locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first().click({ force: true });
  await page.waitForFunction(() => window.__DUDUQ_QA_FINAL_MOBILE_AUDIO_LATCH__?.seenPlaying === true, null, { timeout: 1_500 });
  await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 6_000 });

  const after = await page.evaluate(() => {
    const latch = window.__DUDUQ_QA_FINAL_MOBILE_AUDIO_LATCH__;
    const state = {
      installedBeforeClick: latch?.installedBeforeClick === true,
      seenPlaying: latch?.seenPlaying === true,
      playingAt: latch?.playingAt || 0,
      stoppedAt: latch?.stoppedAt || 0,
      host: window.DuduQ?.getSession?.(),
      transition: window.DuduQTransition?.getState?.(),
      feedback: document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || ""
    };
    latch?.observer?.disconnect?.();
    delete window.__DUDUQ_QA_FINAL_MOBILE_AUDIO_LATCH__;
    return state;
  });

  assert(after.installedBeforeClick && after.seenPlaying, "MutationObserver/latch não capturou reprodução.");
  assert(after.host?.stepIndex === 1 && !after.host?.transitioning && !after.host?.completed, "Host mudou durante teste auditivo.");
  assert(after.transition === "idle", "Transition saiu de idle durante teste auditivo.");
  assert(pageErrors.length === 0, `pageerror: ${pageErrors.join(" | ")}`);
  assert(critical404.length === 0, `404 crítico: ${critical404.join(" | ")}`);

  console.log("MOBILE_OBSERVER_TARGETED_PASS", JSON.stringify({
    viewport: "390x844",
    question: "EN1-M1-02",
    mechanic: "drag-drop",
    reducedMotion: true,
    observerInstalledBeforeClick: after.installedBeforeClick,
    latchSeenPlaying: after.seenPlaying,
    observedStartDelayMs: after.playingAt ? after.playingAt - clickRequestedAt : null,
    observedPlaybackMs: after.playingAt && after.stoppedAt ? after.stoppedAt - after.playingAt : null,
    hostStepIndex: after.host?.stepIndex,
    transition: after.transition,
    pageErrors,
    critical404
  }));
} finally {
  await page.close();
  await browser.close();
}

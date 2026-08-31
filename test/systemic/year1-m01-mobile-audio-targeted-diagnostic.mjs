import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.emulateMedia({ reducedMotion: "reduce" });

const pageErrors = [];
const critical404 = [];
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
  const response = await page.goto(`${BASE}/content/english/year-1/module-01/?qa=mobile-audio-targeted-${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 35_000
  });
  assert(response?.ok(), `M01 HTTP ${response?.status()}`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

  const start = page.locator(".duduq-intro-start-button");
  await start.waitFor({ state: "visible", timeout: 30_000 });
  await start.click();
  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    return Boolean(session?.stepIndex === 0 && !session?.transitioning && window.DuduQTransition?.getState?.() === "idle" && doc?.querySelector(".duduq-ts-root"));
  }, null, { timeout: 35_000 });

  // Reproduz o mesmo fullscreen do gate oficial.
  await page.evaluate(() => window.DuduQFullscreen.toggle());
  await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5_000 });
  await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5_000 });

  // Sentinela já homologado no tablet: só interage com TS quando a instrução auditiva está livre.
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const target = doc?.querySelector('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]');
    const audioControls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) =>
      /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || ""))
    );
    const audioBusy = audioControls.some((button) => Boolean(button.disabled) || /reprodução|playing/i.test(String(button.getAttribute("aria-label") || "")));
    const session = window.DuduQ?.getSession?.();
    return Boolean(target && !target.disabled && audioControls.length && !audioBusy && session?.stepIndex === 0 && !session?.transitioning && window.DuduQTransition?.getState?.() === "idle");
  }, null, { timeout: 12_000 });

  await page.frameLocator("iframe").locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first().click({ force: true });
  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    return Boolean(session?.stepIndex === 1 && !session?.transitioning && window.DuduQTransition?.getState?.() === "idle" && doc?.querySelector(".duduq-dd2-root") && items.length === 3 && items.every((item) => !item.disabled));
  }, null, { timeout: 20_000 });

  const before = await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const item = doc?.querySelector('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]');
    const session = window.DuduQ?.getSession?.();
    return {
      epochMs: Date.now(),
      question: "EN1-M1-02",
      activityIndex: session?.stepIndex,
      host: session,
      transition: window.DuduQTransition?.getState?.(),
      feedback: doc?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "",
      item: {
        exists: Boolean(item),
        disabled: Boolean(item?.disabled),
        hasAudio: item?.getAttribute("data-has-audio") || "",
        audioPlaying: item?.getAttribute("data-audio-playing") || "",
        text: String(item?.textContent || "").trim()
      },
      reducedMotion: doc?.querySelector(".duduq-dd2-root")?.getAttribute("data-reduced-motion") || ""
    };
  });
  assert(before.item.exists && !before.item.disabled && before.item.hasAudio === "true", "card A não estava interativo/auditivo antes do clique");

  await page.evaluate(() => {
    const iframe = document.querySelector("iframe");
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    const item = doc?.querySelector('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]');
    if (!doc || !win || !item) throw new Error("runtime DD/card A ausente");
    const diag = window.__DUDUQ_MOBILE_AUDIO_DIAG__ = {
      installedAt: Date.now(),
      clickAt: null,
      seenPlaying: item.getAttribute("data-audio-playing") === "true",
      playingAt: null,
      stoppedAt: null,
      events: []
    };
    const mark = (type, extra = {}) => diag.events.push({ type, epochMs: Date.now(), ...extra });
    new MutationObserver(() => {
      const playing = item.getAttribute("data-audio-playing") === "true";
      mark("audio-attribute", { value: item.getAttribute("data-audio-playing") || "" });
      if (playing && !diag.seenPlaying) {
        diag.seenPlaying = true;
        diag.playingAt = Date.now();
      } else if (!playing && diag.seenPlaying && !diag.stoppedAt) {
        diag.stoppedAt = Date.now();
      }
    }).observe(item, { attributes: true, attributeFilter: ["data-audio-playing", "disabled", "aria-disabled"] });
    doc.addEventListener("click", (event) => {
      const card = event.target?.closest?.('.duduq-dd2-item[data-dd2-item-id="A"]');
      if (!card) return;
      diag.clickAt = Date.now();
      mark("click", { disabled: Boolean(card.disabled), playing: card.getAttribute("data-audio-playing") || "" });
    }, true);
  });

  const clickAt = Date.now();
  await page.frameLocator("iframe").locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first().click({ force: true });

  let latched = true;
  try {
    await page.waitForFunction(() => window.__DUDUQ_MOBILE_AUDIO_DIAG__?.seenPlaying === true, null, { timeout: 6_000 });
  } catch (_) {
    latched = false;
  }

  if (latched) {
    await page.waitForFunction(() => {
      const doc = document.querySelector("iframe")?.contentDocument;
      const item = doc?.querySelector('.duduq-dd2-item[data-dd2-item-id="A"]');
      return Boolean(item && item.getAttribute("data-audio-playing") !== "true");
    }, null, { timeout: 8_000 });
  }

  const after = await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const item = doc?.querySelector('.duduq-dd2-item[data-dd2-item-id="A"]');
    return {
      epochMs: Date.now(),
      feedback: doc?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "",
      item: {
        disabled: Boolean(item?.disabled),
        hasAudio: item?.getAttribute("data-has-audio") || "",
        audioPlaying: item?.getAttribute("data-audio-playing") || ""
      },
      diag: window.__DUDUQ_MOBILE_AUDIO_DIAG__,
      host: window.DuduQ?.getSession?.(),
      transition: window.DuduQTransition?.getState?.()
    };
  });

  const result = {
    contract: "DUDUQ_M01_MOBILE_AUDIO_TARGETED_R146",
    viewport: "390x844",
    question: "EN1-M1-02",
    mechanic: "drag-drop",
    reducedMotion: true,
    expected: "observable repeatable card audio",
    before,
    clickRequestedAt: clickAt,
    latchedPlaying: latched,
    observedStartDelayMs: after.diag?.playingAt ? after.diag.playingAt - clickAt : null,
    observedPlaybackMs: after.diag?.playingAt && after.diag?.stoppedAt ? after.diag.stoppedAt - after.diag.playingAt : null,
    after,
    pageErrors,
    critical404
  };
  console.log(`MOBILE_AUDIO_TARGETED ${JSON.stringify(result)}`);
  assert(pageErrors.length === 0, `pageerror ${pageErrors.join(" | ")}`);
  assert(critical404.length === 0, `404 crítico ${critical404.join(" | ")}`);
  assert(latched, "data-audio-playing=true nunca foi observado em 6s após clique válido");
} finally {
  await page.close();
  await browser.close();
}

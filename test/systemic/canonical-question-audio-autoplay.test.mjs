import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const base = "http://127.0.0.1:4175";
const routes = [
  "/play/matching/",
  "/play/target-shooter/",
  "/play/drag-drop/",
  "/play/drag-drop-multimedia/",
  "/play/bubble-pop/",
  "/play/smart-sentence/",
  "/play/memory-quest/"
];
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}) });

try {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
      window.__questionSpeechLog = [];
      let activeUtterance = null;
      class TestUtterance {
        constructor(text) { this.text = text; this.lang = ""; }
      }
      const synthesis = {
        get speaking() { return Boolean(activeUtterance); },
        get pending() { return false; },
        getVoices() { return []; },
        addEventListener() {},
        removeEventListener() {},
        cancel() {
          const canceled = activeUtterance;
          activeUtterance = null;
          if (canceled) queueMicrotask(() => canceled.onerror?.({ error: "canceled" }));
        },
        speak(utterance) {
          activeUtterance = utterance;
          window.__questionSpeechLog.push(utterance.text);
          setTimeout(() => {
            if (activeUtterance !== utterance) return;
            activeUtterance = null;
            utterance.onend?.({ elapsedTime: 450 });
          }, 450);
        }
      };
      Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: TestUtterance });
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
    });

    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    const button = page.locator("#game .duduq-canonical-question-hud .audio-button");
    await button.waitFor({ state: "visible" });
    try {
      await page.waitForFunction(() => document.querySelector("#game .duduq-canonical-question-hud .audio-button")?.dataset.audioState === "playing", null, { timeout: 15000 });
    } catch (error) {
      console.error(route, await page.evaluate(() => ({
        state: document.querySelector("#game .duduq-canonical-question-hud .audio-button")?.dataset.audioState,
        buttonMarkup: document.querySelector("#game .duduq-canonical-question-hud .audio-button")?.outerHTML,
        audioKey: document.querySelector("#game .duduq-canonical-question-hud")?.dataset.questionAudioAutoPlayed,
        autoplayStatus: document.querySelector("#game .duduq-canonical-question-hud")?.dataset.questionAudioAutoplayState,
        speechType: typeof window.SpeechSynthesisUtterance,
        visibility: document.visibilityState,
        connected: document.querySelector("#game .duduq-canonical-question-hud .audio-button")?.isConnected,
        fonts: document.fonts.status,
        images: [...document.querySelectorAll("#game img")].map(image => ({ src:image.currentSrc || image.src, complete:image.complete, naturalWidth:image.naturalWidth })),
        speech: window.__questionSpeechLog
      })));
      console.error("page errors", pageErrors);
      throw error;
    }
    const active = await page.evaluate(() => {
      const button = document.querySelector("#game .duduq-canonical-question-hud .audio-button");
      const surface = button?.querySelector(".duduq-audio-surface");
      const rect = button?.getBoundingClientRect();
      const style = surface && getComputedStyle(surface);
      const depth = button?.querySelector(".duduq-audio-depth");
      return {
        count: window.__questionSpeechLog.length,
        state: button?.dataset.audioState,
        width: rect?.width,
        height: rect?.height,
        borderStyle: style?.borderTopStyle,
        borderColor: style?.borderTopColor,
        activeGradient: style?.backgroundImage,
        activeDepth: depth && getComputedStyle(depth).backgroundColor
      };
    });
    assert.equal(active.count, 1, `${route} should autoplay exactly one prompt`);
    assert.equal(active.state, "playing", `${route} should retain the visual playing state for the full utterance`);
    assert.equal(active.width, 50, `${route} should retain the official audio control width`);
    assert.equal(active.height, 52, `${route} should retain the official audio control height`);
    assert.equal(active.borderStyle, "solid", `${route} should show the active green border`);
    assert.equal(active.borderColor, "rgb(43, 157, 18)", `${route} should show the green active border`);
    assert.match(active.activeGradient, /121, 229, 51/, `${route} should show the canonical green playing state`);
    assert.equal(active.activeDepth, "rgb(23, 121, 9)", `${route} should use the green depth while audio is playing`);
    await page.waitForFunction(() => document.querySelector("#game .duduq-canonical-question-hud .audio-button")?.dataset.audioState === "idle", null, { timeout: 5000 });
    const idleBorderStyle = await page.locator("#game .duduq-canonical-question-hud .duduq-audio-surface").evaluate(surface => getComputedStyle(surface).borderTopStyle);
    assert.equal(idleBorderStyle, "none", `${route} should match the borderless neutral Penpot surface`);
    await context.close();
  }
  console.log(`Canonical question audio autoplay and Penpot visual contract: PASS (${routes.length} routes)`);
} finally {
  await browser.close();
}

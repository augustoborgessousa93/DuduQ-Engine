import { chromium } from "playwright";

const baseUrl = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4177";
const item = process.env.DUDUQ_QA_ITEM || "Y2M01-Q014";
const routeByItem = {
  "Y2M01-Q002": "/play/drag-drop-multimedia/",
  "Y2M01-Q004": "/play/drag-drop/",
  "Y2M01-Q005": "/play/memory-quest/",
  "Y2M01-Q010": "/play/drag-drop/",
  "Y2M01-Q011": "/play/memory-quest/",
  "Y2M01-Q014": "/play/drag-drop-multimedia/",
  "Y2M01-Q015": "/play/memory-quest/",
  "Y2M01-Q016": "/play/drag-drop-multimedia/",
  "Y2M01-Q020": "/play/drag-drop-multimedia/"
};
const route = routeByItem[item];
if (!route) throw new Error(`Unsupported Y2M01 item: ${item}`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__duduqAudioPlayCalls = [];
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      window.__duduqAudioPlayCalls.push({
        src: this.currentSrc || this.src || "",
        currentTime: this.currentTime,
        duration: this.duration
      });
      return originalPlay.apply(this, args);
    };
  });
  const url = `${baseUrl}${route}?duduqModule=Y2M01&duduqItem=${item}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`QA route returned HTTP ${response?.status() ?? "no-response"}`);
  const instruction = page.getByRole("button", { name: "Play instruction in English, then Portuguese" });
  if (await instruction.count()) {
    await instruction.click();
    await page.waitForTimeout(12000);
  }
  const learnerControl = page.locator('[data-audio-id^="AUD-EN-LETTER-"] button[aria-label="Ouvir estímulo em inglês"], button[aria-label="Ouvir estímulo em inglês"]').first();
  await learnerControl.waitFor({ state: "visible", timeout: 10000 });
  await learnerControl.click();
  await page.waitForFunction(() => {
    const controls = [...document.querySelectorAll('[data-audio-state="playing"]')];
    return controls.length > 0 || window.__duduqAudioPlayCalls.length > 0;
  }, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(7000);
  const result = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    audioPlayCalls: window.__duduqAudioPlayCalls,
    activeControls: [...document.querySelectorAll('[data-audio-state="playing"]')].map(el => ({
      label: el.getAttribute("aria-label"),
      audioId: el.closest("[data-audio-id]")?.getAttribute("data-audio-id") ?? null
    })),
    visibleIds: [...document.querySelectorAll('[data-audio-id]')].map(el => el.getAttribute("data-audio-id"))
  }));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}

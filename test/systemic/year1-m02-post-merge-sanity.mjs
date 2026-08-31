import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/systemic/year1-m02-post-merge-sanity");
const EXPECTED = [
  ["EN1-M2-01","A","target-shooter"],
  ["EN1-M2-02","B","drag-drop"],
  ["EN1-M2-03","B","target-shooter"],
  ["EN1-M2-04","B","drag-drop"],
  ["EN1-M2-05","B","target-shooter"],
  ["EN1-M2-06","B","drag-drop"],
  ["EN1-M2-07","B","target-shooter"],
  ["EN1-M2-08","B","drag-drop"],
  ["EN1-M2-09","B","target-shooter"],
  ["EN1-M2-10","C","drag-drop"],
  ["EN1-M2-11","A","drag-drop"],
  ["EN1-M2-12","A","drag-drop"]
];

function assert(condition, message) { if (!condition) throw new Error(message); }

async function waitStableStep(page, step, timeout = 20_000) {
  await page.waitForFunction((expected) => {
    const session = window.DuduQ?.getSession?.();
    const iframe = document.querySelector("iframe");
    return Boolean(session && session.stepIndex === expected && !session.transitioning && !session.completed &&
      window.DuduQTransition?.getState?.() === "idle" && iframe && (iframe.srcdoc || iframe.getAttribute("src")));
  }, step, { timeout });
}

async function waitFeedback(page, state, timeout = 5_000) {
  await page.waitForFunction((expected) =>
    document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === expected,
    state, { timeout });
}

async function waitTSReady(page, timeout = 12_000) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const targets = [...(doc?.querySelectorAll(".duduq-ts-target") || [])];
    const controls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) =>
      /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || "")));
    const busy = controls.some((button) => Boolean(button.disabled) || /reprodução|playing/i.test(String(button.getAttribute("aria-label") || "")));
    return Boolean(doc?.querySelector(".duduq-ts-root") && targets.length === 3 && targets.every((target) => !target.disabled) && !busy);
  }, null, { timeout });
}

async function waitDDReady(page, timeout = 12_000) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    return Boolean(doc?.querySelector(".duduq-dd2-root") && doc?.querySelector(".duduq-dd2-target[data-dd2-target-id]") &&
      items.length === 3 && items.every((item) => !item.disabled));
  }, null, { timeout });
}

async function waitNextOrComplete(page, previous, total, timeout = 20_000) {
  await page.waitForFunction(({ previous, total }) => {
    const session = window.DuduQ?.getSession?.();
    if (!session || session.transitioning) return false;
    if (session.completed) return previous === total - 1 && session.progress?.percent === 100;
    return session.stepIndex === previous + 1 && window.DuduQTransition?.getState?.() === "idle" &&
      Boolean(document.querySelector("iframe")?.srcdoc || document.querySelector("iframe")?.getAttribute("src"));
  }, { previous, total }, { timeout });
}

async function armAudioLatch(page, itemId) {
  await page.evaluate((id) => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const card = doc?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`);
    if (!card) throw new Error(`Card ${id} ausente.`);
    const latch = { seen: card.getAttribute("data-audio-playing") === "true", observer: null };
    const observer = new MutationObserver(() => { if (card.getAttribute("data-audio-playing") === "true") latch.seen = true; });
    observer.observe(card, { attributes: true, attributeFilter: ["data-audio-playing"] });
    latch.observer = observer;
    window.__DUDUQ_M02_SANITY_AUDIO__ = latch;
  }, itemId);
}

async function finishAudioLatch(page) {
  await page.waitForFunction(() => window.__DUDUQ_M02_SANITY_AUDIO__?.seen === true, null, { timeout: 2_500 });
  await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 7_000 });
  await page.evaluate(() => {
    window.__DUDUQ_M02_SANITY_AUDIO__?.observer?.disconnect?.();
    delete window.__DUDUQ_M02_SANITY_AUDIO__;
  });
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const critical404 = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (url.includes("/engine/") || url.includes("/content/english/year-1/module-02/") || url.includes("asset-catalog/runtime-index.js")) critical404.push(url);
});

try {
  const response = await page.goto(`${BASE}/content/english/year-1/module-02/?qa=post-merge-sanity`, { waitUntil: "domcontentloaded", timeout: 35_000 });
  assert(response?.ok(), `M02 public entry HTTP ${response?.status()}.`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

  const audit = await page.evaluate(() => {
    const manifest = window.DUDUQ_ENGINE_MANIFEST || {};
    const module = window.DUDUQ_CONTENT?.english?.year1?.module02;
    return {
      module: Boolean(module),
      count: (module?.activities || []).length,
      revision: manifest.revision,
      core: manifest.core?.release || "",
      ts: manifest.mechanics?.["target-shooter"]?.release || "",
      dd: manifest.mechanics?.["drag-drop"]?.release || "",
      player: Array.from(document.scripts).some((script) => script.src.includes("/engine/duduq-player-v1.js")),
      loader: Array.from(document.scripts).some((script) => script.src.includes("/engine/duduq-loader-v1.js"))
    };
  });
  assert(audit.module && audit.count === 12, "M02 merged content missing/incomplete.");
  assert(audit.revision === 146 && audit.core === "1.0.11" && audit.ts === "1.0.21" && audit.dd === "2.0.24", `Runtime drift: ${JSON.stringify(audit)}`);
  assert(audit.player && audit.loader, "Player/Loader ausente no entrypoint merged.");

  const intro = page.locator(".duduq-intro-start-button");
  await intro.waitFor({ state: "visible", timeout: 30_000 });
  await intro.click();
  await waitStableStep(page, 0, 35_000);

  let audioObserved = false;
  for (let step = 0; step < EXPECTED.length; step += 1) {
    const [id, answer, mechanic] = EXPECTED[step];
    await waitStableStep(page, step);
    const frame = page.frameLocator("iframe");

    if (mechanic === "target-shooter") {
      await waitTSReady(page);
      const wrong = ["A", "B", "C"].find((candidate) => candidate !== answer);
      await frame.locator(`.duduq-ts-target[aria-label="Lançar estrela no alvo ${wrong}"]`).first().click({ force: true });
      await waitFeedback(page, "retry", 4_000);
      const retry = await page.evaluate(() => window.DuduQ?.getSession?.());
      assert(retry?.stepIndex === step && !retry.completed, `${id}: retry TS avançou.`);
      await waitTSReady(page);
      await frame.locator(`.duduq-ts-target[aria-label="Lançar estrela no alvo ${answer}"]`).first().click({ force: true });
      await waitFeedback(page, "success", 5_000);
    } else {
      await waitDDReady(page);
      const wrong = ["A", "B", "C"].find((candidate) => candidate !== answer);
      const wrongCard = frame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${wrong}"]`).first();
      if (!audioObserved && await wrongCard.getAttribute("data-has-audio") === "true") {
        await armAudioLatch(page, wrong);
        await wrongCard.click({ force: true });
        await finishAudioLatch(page);
        audioObserved = true;
      } else {
        await wrongCard.click({ force: true });
      }
      await frame.locator(".duduq-dd2-zone").first().click({ force: true });
      await waitFeedback(page, "retry", 4_000);
      const retry = await page.evaluate(() => window.DuduQ?.getSession?.());
      assert(retry?.stepIndex === step && !retry.completed, `${id}: retry DD avançou.`);
      await waitDDReady(page);
      const correctCard = frame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${answer}"]`).first();
      await correctCard.click({ force: true });
      if (await correctCard.getAttribute("data-has-audio") === "true") {
        await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 7_000 });
      }
      await frame.locator(".duduq-dd2-zone").first().click({ force: true });
      await waitFeedback(page, "success", 5_000);
    }
    await waitNextOrComplete(page, step, EXPECTED.length);
  }

  const finalState = await page.evaluate(() => ({
    session: window.DuduQ?.getSession?.(),
    text: String(document.body?.innerText || "").replace(/\s+/g, " ").trim(),
    transition: window.DuduQTransition?.getState?.() || ""
  }));
  assert(audioObserved, "Nenhum estado transitório de áudio foi observado no sanity.");
  assert(finalState.session?.completed === true && finalState.session?.progress?.percent === 100, "Progress/Completion inválido.");
  assert(/Missão concluída/i.test(finalState.text), "UI de Completion ausente.");
  assert(pageErrors.length === 0, `pageerror blocker: ${pageErrors.join(" | ")}`);
  assert(critical404.length === 0, `404 crítico: ${critical404.join(" | ")}`);

  const report = {
    contract: "DUDUQ_YEAR1_M02_POST_MERGE_SANITY_R146",
    status: "PASS",
    merge: "081bd1464012299a6e18b8ca4dfe897b6f6ae0ab",
    canary: 146,
    core: "1.0.11",
    targetShooter: "1.0.21",
    dragDrop: "2.0.24",
    intro: "PASS",
    audio: "PASS",
    retry: "PASS",
    success: "PASS",
    progress: 100,
    completion: "PASS",
    pageErrors,
    critical404
  };
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

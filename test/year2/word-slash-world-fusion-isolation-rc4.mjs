import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const HOST = `${BASE_URL}/engine/releases/core/1.0.9/duduq-host.js`;
const SCHEMA = `${BASE_URL}/engine/releases/core/1.0.9/duduq-schema.js`;
const WORLD = `${BASE_URL}/engine/releases/core/1.0.9/duduq-world-fusion.js?v=rc4`;
const WORLD_CSS = `${BASE_URL}/engine/releases/core/1.0.9/duduq-world-fusion.css?v=rc4`;
const AUDIO_NATIVE = `${BASE_URL}/engine/releases/core/1.0.10-candidate/duduq-audio-native.js`;
const AUDIO_NATIVE_CSS = `${BASE_URL}/engine/releases/core/1.0.10-candidate/duduq-audio-native.css`;
const ADAPTER = `${BASE_URL}/engine/releases/mechanics/word-slash/1.0.17/word-slash.js?rc4=1`;

const question = {
  id: "EN2-M1-08",
  subject: "Língua Inglesa",
  year: 2,
  module: 1,
  difficulty: "easy",
  statement: "OUÇA E TOQUE",
  instruction: "OUÇA E TOQUE",
  contentLanguage: "en-US",
  instructionLanguage: "pt-BR",
  feedbackLanguage: "pt-BR",
  alternatives: [
    { id: "opt-1", text: "C" },
    { id: "opt-2", text: "A" },
    { id: "opt-3", text: "B" },
    { id: "opt-4", text: "D" }
  ],
  answer: { type: "single", value: "opt-1" },
  audio: { enabled: true, text: "C", language: "en-US", role: "stimulus" },
  feedback: { correct: "Muito bem!", incorrect: "Ouça novamente.", language: "pt-BR" },
  delivery: { mechanic: "word-slash", allowImage: false, allowAudio: true },
  metadata: {
    screenTitle: "ALPHABET",
    wordSlash: {
      mode: "correct-word",
      audioText: "C",
      goal: 2,
      target: { label: "OUÇA", value: "C", spokenText: "C", hideValue: true },
      difficulty: {
        speedMinMs: 6500,
        speedMaxMs: 8000,
        maxObjects: 3,
        spawnEveryMs: 1300,
        timeLimitSeconds: 60,
        correctProbability: 0.6,
        wrongPenalty: 0
      },
      objects: [
        { id: "letter-c-1", type: "word", label: "C", value: "C", category: "C", weight: 2 },
        { id: "letter-a-2", type: "word", label: "A", value: "A", category: "A", weight: 1 },
        { id: "letter-b-3", type: "word", label: "B", value: "B", category: "B", weight: 1 },
        { id: "letter-d-4", type: "word", label: "D", value: "D", category: "D", weight: 1 }
      ]
    }
  }
};

const browser = await chromium.launch({ headless: true });

function timed(promise, ms, fallback) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

async function probe(label, withFusion) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleLines = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (["warning", "error"].includes(msg.type())) consoleLines.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${BASE_URL}/?qa=word-slash-rc4-${label}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.setContent('<!doctype html><html lang="pt-BR" data-duduq-ano="2" data-duduq-ano-ativo="2"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="mount" style="width:100%;height:720px"></div></body></html>');
  await page.evaluate((base) => {
    window.DUDUQ_ENGINE_BASE = base;
    window.DUDUQ_ANO = 2;
  }, BASE_URL);

  if (withFusion) {
    await page.addStyleTag({ url: WORLD_CSS });
    await page.addStyleTag({ url: AUDIO_NATIVE_CSS });
    await page.addScriptTag({ url: WORLD });
    await page.addScriptTag({ url: AUDIO_NATIVE });
  }
  await page.addScriptTag({ url: HOST });
  await page.addScriptTag({ url: SCHEMA });
  await page.addScriptTag({ url: ADAPTER });

  const started = await page.evaluate((q) => {
    const mechanic = window.DuduQ?.getMechanic?.("word-slash");
    if (!mechanic) throw new Error("Word Slash 1.0.17 not registered");
    const cleanup = mechanic.mount({
      container: document.getElementById("mount"),
      payload: { title: "ALPHABET", questions: [q] },
      context: { year: 2, subject: "Língua Inglesa", module: 1, stepIndex: 0, totalSteps: 1 },
      onComplete() {}
    });
    window.__RC4_CLEANUP__ = cleanup;
    return true;
  }, question);

  const samples = [];
  for (const delay of [300, 800, 1600, 2600, 4200]) {
    await page.waitForTimeout(delay - (samples.at(-1)?.delay || 0));
    const state = await timed(page.evaluate(() => {
      const frame = document.querySelector("#mount iframe");
      const doc = frame?.contentDocument;
      const arena = doc?.querySelector(".duduq-ws-arena");
      return {
        frame: Boolean(frame),
        srcdocLength: String(frame?.srcdoc || "").length,
        readyState: doc?.readyState || "",
        engineRoot: doc?.querySelectorAll(".duduq-engine-root").length || 0,
        wsRoot: doc?.querySelectorAll(".duduq-ws-root").length || 0,
        wsObjects: doc?.querySelectorAll(".duduq-ws-object").length || 0,
        arena: arena ? { width: arena.clientWidth, height: arena.clientHeight } : null,
        fusion: doc?.documentElement?.classList.contains("duduq-world-fusion") || false,
        mechanicMarker: doc?.documentElement?.getAttribute("data-duduq-mechanic") || "",
        bodyText: String(doc?.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 240)
      };
    }), 1000, { stateRead: "timeout" });
    samples.push({ delay, ...state });
    if (state?.stateRead === "timeout") break;
  }

  const result = { label, withFusion, started, samples, consoleLines, pageErrors };
  console.log(JSON.stringify(result));
  try { await timed(page.evaluate(() => window.__RC4_CLEANUP__?.()), 500, null); } catch (_) {}
  await timed(page.close().catch(() => {}), 800, null);
  return result;
}

const withoutFusion = await probe("without-fusion", false);
const withFusion = await probe("with-fusion", true);

console.log(JSON.stringify({
  status: "OBSERVED",
  contract: "WORD_SLASH_OBJECT_SPAWN_WORLD_FUSION_ISOLATION_RC4",
  withoutFusion,
  withFusion
}, null, 2));

await timed(browser.close().catch(() => {}), 1000, null);

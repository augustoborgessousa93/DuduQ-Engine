import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const base = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4177";
const cases = [
  { moduleId: "Y3M03", file: "content/english/year-3/module-03/questions.json", itemId: "Y3M03-Q013" },
  { moduleId: "Y4M06", file: "content/english/year-4/module-06/questions.json", itemId: "Y4M06-Q013" }
];
const { chromium } = await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.addInitScript(() => {
  window.__memoryQuestPointerEvents = [];
  window.__memoryQuestVoiceStates = [];
  window.__memoryQuestLastVoiceEventAt = 0;
  window.addEventListener('duduq:voice-state', event => {
    window.__memoryQuestVoiceStates.push(event.detail);
    window.__memoryQuestLastVoiceEventAt = performance.now();
  });
  for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event => {
    const slot = event.target?.closest?.('.memory-quest-card-slot');
    window.__memoryQuestPointerEvents.push({ type, cardId: slot?.dataset.cardId || null,
      target: event.target?.tagName || null, disabled: slot?.disabled ?? null, x: event.clientX, y: event.clientY });
  }, true);
});
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const results = [];
try {
  for (const testCase of cases) {
    const { items } = JSON.parse(await fs.readFile(path.join(rootDir, testCase.file), "utf8"));
    const item = items.find(candidate => candidate.item_id === testCase.itemId);
    assert(item && item.pairs.length === 2);
    await page.goto(`${base}/play/memory-quest/?duduqModule=${testCase.moduleId}&duduqItem=${testCase.itemId}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.DuduQProductionQuestionBootstrap?.ready), null, { timeout: 10000 });
    const context = await page.evaluate(() => window.DuduQProductionQuestionBootstrap.ready);
    assert.equal(context.item.item_id, testCase.itemId);
    const cards = page.locator(".memory-quest-card-slot:visible");
    await page.waitForFunction(() => document.querySelectorAll(".memory-quest-card-slot:not([hidden])").length === 4, null, { timeout: 10000 });
    const visibleCardCount = await cards.count();
    const overflow = await page.evaluate(() => ({ x: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth), y: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight) }));
    assert.deepEqual(overflow, { x: 0, y: 0 });
    const instructionAudio = page.locator(".duduq-canonical-question-hud .audio-button");
    const instructionPtId = await page.locator(".duduq-canonical-question-hud").getAttribute("data-instruction-audio-pt-id");
    const initialNarrationEnded = instructionPtId ? await page.waitForFunction(
      id => window.__memoryQuestVoiceStates.filter(event => event?.audioId === id).at(-1)?.state === "ended",
      instructionPtId, { timeout: 5000 }).then(() => true).catch(() => false) : false;
    if (!initialNarrationEnded) {
      await page.evaluate(() => { window.__memoryQuestVoiceStates = []; window.__memoryQuestLastVoiceEventAt = performance.now(); });
      await instructionAudio.click();
      if (instructionPtId) await page.waitForFunction(id => window.__memoryQuestVoiceStates.filter(event => event?.audioId === id).at(-1)?.state === "ended", instructionPtId, { timeout: 35000 });
    }
    await page.waitForFunction(() => {
      const grid = document.querySelector(".memory-quest-card-grid");
      const slots = [...document.querySelectorAll(".memory-quest-card-slot:not([hidden])")];
      const hud = document.querySelector(".duduq-canonical-question-hud");
      return grid?.dataset.state === "READY" && slots.length === 4 && slots.every(slot => !slot.disabled) &&
        hud?.dataset.instructionAudioState === "ready" && document.querySelector("#game")?.dataset.duduqInteractionState === "READY" &&
        performance.now() - (window.__memoryQuestLastVoiceEventAt || 0) > 1200;
    }, null, { timeout: 35000 });
    await page.waitForTimeout(250);
    const matchedPairs = [];
    for (const pair of item.pairs) {
      for (const card of pair.cards) {
        const slot = page.locator(`.memory-quest-card-slot[data-card-id="${card.cardId}"]`);
        // Use a native Playwright click at the visible card center for both
        // modalities; offset corner clicks can hit the 3-D card's shadow/front
        // decoration instead of its actual button hitbox.
        await slot.click();
        if (card.modality === "audio") {
          await page.waitForFunction(id => document.querySelector(`.memory-quest-card-slot[data-card-id="${CSS.escape(id)}"]`)?.dataset.flipped === "true", card.cardId, { timeout: 4000 }).catch(async error => {
            const diagnostic = await page.evaluate(id => {
              const element = document.querySelector(`.memory-quest-card-slot[data-card-id="${CSS.escape(id)}"]`);
              const box = element?.getBoundingClientRect();
              const hit = box && document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
              return { cardId: id, disabled: element?.disabled, bounds: box && { x: box.x, y: box.y, width: box.width, height: box.height },
                hitClass: hit?.className?.baseVal || hit?.className || hit?.tagName, rootAudioQaError: document.querySelector('#game')?.dataset.audioQaError,
                rootCardIdentityError: document.querySelector('#game')?.dataset.cardIdentityError,
                interactionState: document.querySelector('#game')?.dataset.duduqInteractionState,
                instructionAudioState: document.querySelector('.duduq-canonical-question-hud')?.dataset.instructionAudioState,
                instructionIds: { en: document.querySelector('.duduq-canonical-question-hud')?.getAttribute('data-instruction-audio-en-id'), pt: document.querySelector('.duduq-canonical-question-hud')?.getAttribute('data-instruction-audio-pt-id') },
                voiceStates: window.__memoryQuestVoiceStates,
                audioElements: [...document.querySelectorAll('audio')].map(audio => ({ src: audio.currentSrc, paused: audio.paused, ended: audio.ended, currentTime: audio.currentTime, duration: audio.duration, readyState: audio.readyState, error: audio.error?.code })),
                grid: document.querySelector('.memory-quest-card-grid')?.dataset ? {...document.querySelector('.memory-quest-card-grid').dataset} : null,
                events: window.__memoryQuestPointerEvents };
            }, card.cardId);
            throw new Error(`MEMORY_AUDIO_CARD_NOT_REVEALED:${testCase.itemId}:${JSON.stringify(diagnostic)}:${error.message}`);
          });
          await page.waitForFunction(() => document.querySelector(".memory-quest-card-grid")?.dataset.state === "READY", null, { timeout: 20000 });
        }
      }
      const pairSlots = pair.cards.map(card => page.locator(`.memory-quest-card-slot[data-card-id="${card.cardId}"]`));
      await page.waitForFunction(ids => ids.every(id => document.querySelector(`.memory-quest-card-slot[data-card-id="${CSS.escape(id)}"]`)?.dataset.matched === "true"), pair.cards.map(card => card.cardId), { timeout: 15000 }).catch(async error => {
        const state = await page.evaluate(ids => ({ grid: document.querySelector(".memory-quest-card-grid")?.dataset.state,
          cards: [...document.querySelectorAll(".memory-quest-card-slot:not([hidden])")].map(slot => ({ id: slot.dataset.cardId, flipped: slot.dataset.flipped, matched: slot.dataset.matched, disabled: slot.disabled, label: slot.getAttribute("aria-label"), text: slot.querySelector("[data-card-content]")?.textContent.trim() })) , expected: ids }), pair.cards.map(card => card.cardId));
        throw new Error(`MEMORY_PAIR_DID_NOT_MATCH:${testCase.itemId}:${pair.pairId}:${JSON.stringify(state)}:${error.message}`);
      });
      matchedPairs.push(pair.pairId);
    }
    const feedback = page.locator(".feedback-ribbon:not([hidden])");
    await feedback.waitFor({ state: "visible", timeout: 20000 });
    const copy = await feedback.evaluate(node => ({ title: node.querySelector("[data-slot='feedback-title']")?.textContent.trim(), subtitle: node.querySelector("[data-slot='feedback-detail']")?.textContent.trim(), action: node.querySelector(".feedback-action")?.textContent.trim() }));
    assert(copy.title && copy.subtitle && copy.action);
    await page.waitForFunction(() => { const button = document.querySelector(".feedback-ribbon:not([hidden]) .feedback-action"); return button && !button.disabled && button.getAttribute("aria-disabled") !== "true"; }, null, { timeout: 20000 });
    await feedback.locator(".feedback-action").click();
    const nextItemId = `${testCase.moduleId}-Q014`;
    await page.waitForFunction(expected => new URL(location.href).searchParams.get("duduqItem") === expected, nextItemId, { timeout: 15000 });
    results.push({ moduleId: testCase.moduleId, itemId: testCase.itemId, pairCount: item.pairs.length, visibleCards: visibleCardCount, matchedPairs, feedback: copy, overflow, continue: "PASS" });
  }
} finally { await browser.close(); }
assert.deepEqual(errors, []);
const report = { feature: "DUDUQ_MEMORY_QUEST_TWO_PAIR_PRODUCTION_FLOW", testedAt: new Date().toISOString(), cases: results, pageErrors: errors, status: results.length === 2 ? "PASS" : "ISSUE" };
const output = path.join(rootDir, "docs/qa/DUDUQ_MEMORY_QUEST_TWO_PAIR_RUNTIME_QA_2026-10-20.json");
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, cases: results, output }, null, 2));

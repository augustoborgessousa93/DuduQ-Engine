import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const origin = process.env.DUDUQ_QA_ORIGIN || "http://127.0.0.1:4177";
const queue = JSON.parse(await fs.readFile(path.join(root, "docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json"), "utf8"));
const activityByQuestion = new Map();
for (const job of queue.jobs) for (const consumer of job.consumers || []) {
  const moduleId = consumer.moduleId;
  const year = moduleId.match(/^Y(\d)/)?.[1];
  const number = moduleId.match(/M(\d+)$/)?.[1];
  const file = path.join(root, `content/english/year-${year}/module-${number}/questions.json`);
  const document = JSON.parse(await fs.readFile(file, "utf8"));
  const item = document.items.find(row => row.item_id === consumer.questionId);
  assert(item, `Missing source item ${consumer.questionId}`);
  const prior = activityByQuestion.get(item.item_id) || { moduleId, item, audio: [] };
  prior.audio.push({ audioId: job.audioId, transcript: job.transcript });
  activityByQuestion.set(item.item_id, prior);
}

const { chromium } = await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("response", response => { if (response.status() >= 400) errors.push(`HTTP_${response.status()}:${response.url()}`); });
await page.addInitScript(() => {
  window.__ssRetryVoiceEvents = [];
  window.addEventListener("duduq:voice-state", event => window.__ssRetryVoiceEvents.push(event.detail));
});

const results = [];
try {
  for (const { moduleId, item, audio } of activityByQuestion.values()) {
    const questionId = item.item_id;
    const response = await page.goto(`${origin}/play/smart-sentence/?duduqModule=${moduleId}&duduqItem=${questionId}`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200, `${questionId}: route`);
    await page.waitForFunction(() => document.querySelector("#game.smart-sentence--complete"), null, { timeout: 15000 });
    const rootEl = page.locator("#game");
    const bootstrapErrors = await rootEl.getAttribute("data-production-audio-error");
    assert.equal(bootstrapErrors, null, `${questionId}: no audio bootstrap error`);
    try {
      await page.waitForFunction(() => document.querySelector("#game")?.dataset.duduqInteractionState === "READY", null, { timeout: 12000 });
    } catch {
      const instruction = page.locator(".duduq-instruction-audio-control");
      assert.equal(await instruction.count(), 1, `${questionId}: visible instruction audio control`);
      await instruction.click();
      await page.waitForFunction(() => document.querySelector("#game")?.dataset.duduqInteractionState === "READY", null, { timeout: 20000 });
    }
    await page.evaluate(() => { window.__ssRetryVoiceEvents = []; });

    const correct = String(item.answerKey ?? item.answer ?? "").trim().toLocaleLowerCase("en-US");
    const options = item.options || [];
    const wrong = options.find(option => String(option.answerKey ?? option.optionId ?? "").trim().toLocaleLowerCase("en-US") !== correct);
    assert(wrong, `${questionId}: deterministic incorrect option exists`);
    const wrongButton = page.locator(".smart-sentence-option:not([hidden])").filter({ hasText: new RegExp(`^${String(wrong.label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).first();
    await wrongButton.click();
    const confirm = page.locator(".smart-sentence-confirm-action:not([hidden])");
    await page.waitForFunction(() => document.querySelector(".smart-sentence-confirm-action:not([hidden])")?.disabled === false, null, { timeout: 8000 });
    const confirmBox = await confirm.boundingBox();
    assert(confirmBox, `${questionId}: visible confirmation hitbox`);
    await page.mouse.click(confirmBox.x + confirmBox.width / 2, confirmBox.y + confirmBox.height / 2);
    await page.waitForFunction(() => {
      const feedback = document.querySelector(".feedback-ribbon");
      return feedback && !feedback.hidden && feedback.dataset.feedback === "incorrect";
    }, null, { timeout: 12000 });
    const feedbackCopy = await page.locator(".feedback-ribbon:not([hidden])").evaluate(node => ({
      title: node.querySelector("[data-slot='feedback-title']")?.textContent.trim() || "",
      subtitle: node.querySelector("[data-slot='feedback-detail']")?.textContent.trim() || "",
      action: node.querySelector(".feedback-action")?.textContent.trim() || ""
    }));
    assert(feedbackCopy.title && feedbackCopy.subtitle && /TENTAR NOVAMENTE|TRY AGAIN/i.test(feedbackCopy.action), `${questionId}: complete incorrect feedback`);
    const retryButton = page.locator(".feedback-ribbon:not([hidden]) .feedback-action");
    await page.waitForFunction(() => {
      const button = document.querySelector(".feedback-ribbon:not([hidden]) .feedback-action");
      return button && !button.disabled && button.getAttribute("aria-disabled") !== "true";
    }, null, { timeout: 15000 });
    await retryButton.click();

    const expectedIds = audio.map(entry => entry.audioId);
    for (const audioId of expectedIds) {
      await page.waitForFunction(id => window.__ssRetryVoiceEvents.some(event => event?.state === "playing" && event.audioId === id), audioId, { timeout: 15000 });
      await page.waitForFunction(id => window.__ssRetryVoiceEvents.some(event => event?.state === "ended" && event.audioId === id), audioId, { timeout: 15000 });
    }
    // The shared HUD also writes data-duduq-interaction-state on #game when
    // feedback is hidden. For Smart Sentence, the authoritative retry-ready
    // signal is the mechanic-owned option buttons becoming enabled after both
    // required retry clips have completed.
    await page.waitForFunction(expected => {
      const buttons = [...document.querySelectorAll(".smart-sentence-option:not([hidden])")];
      return buttons.length === expected && buttons.every(button => !button.disabled);
    }, options.length, { timeout: 35000 });
    const retryState = await page.evaluate(() => ({
      root: { ...document.querySelector("#game").dataset },
      options: [...document.querySelectorAll(".smart-sentence-option")].map(node => ({ text: node.textContent.trim(), hidden: node.hidden, disabled: node.disabled, ariaDisabled: node.getAttribute("aria-disabled"), className: node.className, rect: node.getBoundingClientRect().toJSON() })),
      feedback: document.querySelector(".feedback-ribbon")?.outerHTML.slice(0, 1600)
    }));
    const retryReady = retryState.options.filter(node => !node.hidden && !node.disabled && node.ariaDisabled !== "true").length;
    assert.equal(retryReady, options.length, `${questionId}: retry restores all options; ${JSON.stringify(retryState)}`);
    results.push({ moduleId, questionId, wrongAttempt: "PASS", incorrectFeedback: feedbackCopy, retryButton: "PASS", exactRetryAudioIds: expectedIds, exactAudioPlayback: "PASS", readyAfterRetry: "PASS", wrongOption: wrong.optionId || wrong.label, correctOption: options.find(option => String(option.answerKey).trim().toLocaleLowerCase("en-US") === correct)?.optionId || "", result: "PASS" });
  }
} finally {
  await browser.close();
}

const report = {
  feature: "DUDUQ_SMART_SENTENCE_RETRY_AUDIO_44_V3",
  testedAt: new Date().toISOString(),
  source: origin,
  requested: activityByQuestion.size,
  completed: results.length,
  passed: results.filter(row => row.result === "PASS").length,
  failures: errors,
  activities: results,
  status: results.length === 44 && errors.length === 0 ? "PASS" : "ISSUE"
};
const out = path.join(root, "docs/qa/DUDUQ_SMART_SENTENCE_RETRY_AUDIO_44_V3.json");
await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, requested: report.requested, completed: report.completed, passed: report.passed, failures: errors.length, output: out }, null, 2));
if (report.status !== "PASS") process.exitCode = 1;

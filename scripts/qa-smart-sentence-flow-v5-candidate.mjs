import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const origin = process.env.DUDUQ_QA_ORIGIN || "http://127.0.0.1:4177";
const queue = JSON.parse(await fs.readFile(path.join(root, "docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json"), "utf8"));
const items = new Map();
for (const job of queue.jobs) for (const consumer of job.consumers || []) {
  const match = consumer.moduleId.match(/^Y(\d)M(\d+)$/);
  const doc = JSON.parse(await fs.readFile(path.join(root, `content/english/year-${match[1]}/module-${match[2]}/questions.json`), "utf8"));
  const item = doc.items.find(row => row.item_id === consumer.questionId);
  assert(item, `Question missing: ${consumer.questionId}`);
  const record = items.get(item.item_id) || { moduleId: consumer.moduleId, item, retryAudio: [] };
  record.retryAudio.push({ audioId: job.audioId }); items.set(item.item_id, record);
}

const protectedPath = path.join(root, "play/smart-sentence/smart-sentence.js");
const protectedBytes = await fs.readFile(protectedPath);
const protectedSha256 = createHash("sha256").update(protectedBytes).digest("hex");
const original = protectedBytes.toString("utf8");
const originalBlock = 'const completedSentence = round.sentence.map(part => part.type === "slot" ? selected?.label || "" : part.value).join(" ").replace(/\\s+([.,!?])/g, "$1").replace(/\\s+/g, " ").trim();\n    if (completedSentence !== round.completedSentenceEn) throw new Error(`SMART_SENTENCE_VISIBLE_AUDIO_TEXT_MISMATCH:${productionQuestion.item.questionId}:${completedSentence}:${round.completedSentenceEn}`);';
assert.equal(original.split(originalBlock).length - 1, 1, "protected assertion block must match exactly once");
const helper = [
  "function resolveCompleteSentenceText(visibleSentence, contractSentence, questionId) {",
  '  const visible = String(visibleSentence ?? "").replace(/\\s+/g, " ").trim();',
  '  const expected = String(contractSentence ?? "").replace(/\\s+/g, " ").trim();',
  '  if (!expected) throw new Error("SMART_SENTENCE_CONTRACT_TEXT_MISSING:" + questionId);',
  "  if (visible === expected) return expected;",
  '  const missingOneTerminalMark = [".", "!", "?"].some(mark => expected.endsWith(mark) && visible === expected.slice(0, -mark.length));',
  "  if (missingOneTerminalMark) return expected;",
  '  throw new Error("SMART_SENTENCE_VISIBLE_AUDIO_TEXT_MISMATCH:" + questionId + ":" + visible + ":" + expected);',
  "}"
].join("\n");
const replacement = `const assembledSentence = round.sentence.map(part => part.type === "slot" ? selected?.label || "" : part.value).join(" ").replace(/\\s+([.,!?])/g, "$1").replace(/\\s+/g, " ").trim();
    const completedSentence = resolveCompleteSentenceText(assembledSentence, round.completedSentenceEn, productionQuestion.item.questionId);`;
const marker = "async function confirmSelection() {";
assert.equal(original.split(marker).length - 1, 1, "confirmSelection marker must match exactly once");
const candidateSource = original.replace(marker, `${helper}\n${marker}`).replace(originalBlock, replacement);
assert.notEqual(candidateSource, original, "candidate patch must be applied in-memory");

const playwrightPath = "C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [], httpErrors = [], results = [];
let active = "";
const requestedId = process.env.DUDUQ_V5_SMART_SENTENCE_ID || "";
const requestedLimit = Number(process.env.DUDUQ_V5_SMART_SENTENCE_LIMIT || 0);
const correctOnly = process.env.DUDUQ_V5_SMART_SENTENCE_CORRECT_ONLY === "1";
const reportPath = process.env.DUDUQ_V5_CANDIDATE_OUTPUT || "docs/qa/DUDUQ_SMART_SENTENCE_FLOW_V5_CANDIDATE.json";
const flowItems = [...items.values()].filter(record => !requestedId || record.item.item_id === requestedId).slice(0, requestedLimit || undefined);
const audioOverrideHits = [];
let audioOverrideManifest = [];
if (process.env.DUDUQ_V6_REPLACEMENT_AUDIO_REPORT) {
  const candidateReport = JSON.parse(await fs.readFile(path.resolve(root, process.env.DUDUQ_V6_REPLACEMENT_AUDIO_REPORT), "utf8"));
  const registry = JSON.parse(await fs.readFile(path.join(root, "content/english/audio/audio-registry.json"), "utf8"));
  assert.equal(candidateReport.status, "TECHNICAL_QC_PASS_PENDING_HUMAN_PRONUNCIATION");
  const registryById = new Map(registry.entries.map(entry => [entry.audioId, entry]));
  audioOverrideManifest = candidateReport.candidates.map(candidate => {
    const entry = registryById.get(candidate.audioId);
    assert(entry?.urlOrPath, `Active rejected audio path missing: ${candidate.audioId}`);
    return { audioId: candidate.audioId, oldPath: entry.urlOrPath.replaceAll("\\", "/"),
      newPath: candidate.replacementRelativePath, expectedSha256: candidate.replacementSha256 };
  });
}
page.on("pageerror", error => pageErrors.push({ activity: active, message: error.message }));
page.on("response", response => { if (response.status() >= 400) httpErrors.push({ activity: active, status: response.status(), url: response.url() }); });
if (audioOverrideManifest.length) await page.route("**/*", async route => {
  const url = new URL(route.request().url());
  let pathname; try { pathname = decodeURIComponent(url.pathname).replace(/^\/+/, ""); } catch { pathname = url.pathname.replace(/^\/+/, ""); }
  const replacement = audioOverrideManifest.find(entry => pathname.endsWith(entry.oldPath));
  if (!replacement) return route.continue();
  const bytes = await fs.readFile(path.join(root, replacement.newPath));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), replacement.expectedSha256, `replacement hash ${replacement.audioId}`);
  audioOverrideHits.push({ audioId: replacement.audioId, requestedPath: pathname, sha256: replacement.expectedSha256 });
  return route.fulfill({ status: 200, contentType: "audio/mpeg", body: bytes, headers: { "cache-control": "no-store" } });
});
await page.route("**/play/smart-sentence/smart-sentence.js*", route => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: candidateSource, headers: { "cache-control": "no-store" } }));
await page.addInitScript(() => { window.__v5AudioEvents = []; window.addEventListener("duduq:voice-state", event => window.__v5AudioEvents.push(event.detail)); });
const clickCenter = async locator => { const box = await locator.boundingBox(); assert(box, `${active}: missing hitbox`); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); };
const feedback = state => page.locator(`.feedback-ribbon:not([hidden])[data-feedback="${state}"]`).evaluate(node => ({ title: node.querySelector('[data-slot="feedback-title"]')?.textContent.trim() || "", subtitle: node.querySelector('[data-slot="feedback-detail"]')?.textContent.trim() || "", action: node.querySelector('[data-slot="feedback-action"]')?.textContent.trim() || "" }));

try {
  for (const { moduleId, item, retryAudio } of flowItems) {
    active = item.item_id;
    try {
      const url = `${origin}/play/smart-sentence/?duduqModule=${moduleId}&duduqItem=${item.item_id}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      assert.equal(response?.status(), 200);
      await page.waitForSelector("#game.smart-sentence--complete", { timeout: 15000 });
      await page.waitForFunction(() => document.querySelector("#game")?.dataset.duduqInteractionState === "READY", null, { timeout: 12000 }).catch(async () => {
        const play = page.locator(".duduq-instruction-audio-control"); assert.equal(await play.count(), 1); await clickCenter(play);
        await page.waitForFunction(() => document.querySelector("#game")?.dataset.duduqInteractionState === "READY", null, { timeout: 20000 });
      });
      const correct = String(item.answerKey ?? item.answer ?? "").trim().toLowerCase();
      const options = item.options || [];
      const optionFor = entry => page.locator(".smart-sentence-option:not([hidden])").filter({ hasText: new RegExp(`^${String(entry.label).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}$`, "i") }).first();
      const confirm = page.locator(".smart-sentence-confirm-action:not([hidden])");
      if (!correctOnly) {
        const wrong = options.find(option => String(option.answerKey ?? option.optionId ?? "").trim().toLowerCase() !== correct);
        assert(wrong, "wrong answer option required");
        await clickCenter(optionFor(wrong));
        await page.waitForFunction(() => { const button = document.querySelector(".smart-sentence-confirm-action:not([hidden])"); return button && !button.disabled; }, null, { timeout: 10000 });
        await clickCenter(confirm);
        await page.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="incorrect"]', { timeout: 12000 });
        const wrongFeedback = await feedback("incorrect"); assert(wrongFeedback.title && wrongFeedback.subtitle && /TENTAR NOVAMENTE|TRY AGAIN/i.test(wrongFeedback.action));
        const retry = page.locator('.feedback-ribbon:not([hidden]) .feedback-action');
        await page.waitForFunction(() => { const button = document.querySelector(".feedback-ribbon:not([hidden]) .feedback-action"); return button && !button.disabled && button.getAttribute("aria-disabled") !== "true"; }, null, { timeout: 20000 });
        await clickCenter(retry);
        for (const audio of retryAudio) {
          await page.waitForFunction(id => window.__v5AudioEvents.some(event => event?.state === "playing" && event.audioId === id), audio.audioId, { timeout: 15000 });
          await page.waitForFunction(id => window.__v5AudioEvents.some(event => event?.state === "ended" && event.audioId === id), audio.audioId, { timeout: 18000 });
        }
        await page.waitForFunction(count => { const buttons = [...document.querySelectorAll(".smart-sentence-option:not([hidden])")]; return buttons.length === count && buttons.every(button => !button.disabled); }, options.length, { timeout: 35000 });
      }
      const right = options.find(option => String(option.answerKey ?? "").trim().toLowerCase() === correct); assert(right, "correct answer option missing");
      await clickCenter(optionFor(right));
      await page.waitForFunction(() => { const button = document.querySelector(".smart-sentence-confirm-action:not([hidden])"); return button && !button.disabled; }, null, { timeout: 10000 });
      await clickCenter(confirm);
      await page.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="correct"]', { timeout: 15000 });
      const correctFeedback = await feedback("correct"); assert(correctFeedback.title && correctFeedback.subtitle && /CONTINUAR/i.test(correctFeedback.action));
      const continueButton = page.locator('.feedback-ribbon:not([hidden]) .feedback-action');
      await page.waitForFunction(() => { const button = document.querySelector(".feedback-ribbon:not([hidden]) .feedback-action"); return button && !button.disabled && button.getAttribute("aria-disabled") !== "true" && getComputedStyle(button).pointerEvents !== "none"; }, null, { timeout: 25000 });
      const before = await page.evaluate(() => ({ url: location.href, text: document.querySelector("#game")?.innerText || "" }));
      await clickCenter(continueButton);
      await page.waitForFunction(prior => location.href !== prior.url || (document.querySelector("#game")?.innerText || "") !== prior.text, before, { timeout: 15000 });
      results.push({ moduleId, questionId: item.item_id, wrong: correctOnly ? "NOT_RUN" : "PASS", retryAudio: correctOnly ? "NOT_RUN" : "PASS", correct: "PASS", feedback: "PASS", continue: "PASS", advance: "PASS", result: "PASS" });
    } catch (error) { results.push({ moduleId, questionId: item.item_id, result: "FAIL", error: error.message, url: page.url() }); }
  }
} finally { await browser.close(); }

const finalProtectedSha256 = createHash("sha256").update(await fs.readFile(protectedPath)).digest("hex");
const report = { feature: "DUDUQ_SMART_SENTENCE_FLOW_V5_CANDIDATE", generatedAt: new Date().toISOString(), source: origin, candidateServedInMemoryOnly: true, correctOnly, protectedRuntimeSha256Before: protectedSha256, protectedRuntimeSha256After: finalProtectedSha256, protectedRuntimeUnchanged: protectedSha256 === finalProtectedSha256, audioReplacementsServedInMemoryOnly: audioOverrideManifest.length > 0, audioReplacementCount: audioOverrideManifest.length, audioReplacementHits: audioOverrideHits, requestedTotal: items.size, requestedThisRun: flowItems.length, completed: results.length, passed: results.filter(row => row.result === "PASS").length, failed: results.filter(row => row.result === "FAIL").length, pageErrors, httpErrors, activities: results, classification: "ISOLATED_CANDIDATE_NOT_PRODUCTION_APPROVAL" };
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ requested: report.requestedThisRun, completed: report.completed, passed: report.passed, failed: report.failed, pageErrors: pageErrors.length, httpErrors: httpErrors.length, runtimeUnchanged: report.protectedRuntimeUnchanged, output: reportPath }, null, 2));

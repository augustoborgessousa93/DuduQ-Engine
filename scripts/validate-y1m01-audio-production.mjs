#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const manifest = await readJson("duduq-audio/manifests/AUDIO_MANIFEST.json");
const registry = await readJson("content/english/audio/audio-registry.json");
const bindingFile = await readJson("content/english/year-1/module-01/audio-production-manifest.json");
const questions = await readJson("content/english/year-1/module-01/questions.json");
const imageManifest = await readJson("content/english/media/image-generation-manifest.json");
const moduleItems = manifest.items.filter((item) => item.module === "Y1M01");
const registryById = new Map(registry.entries.map((entry) => [entry.audioId, entry]));
const byId = new Map(manifest.items.map((entry) => [entry.id, entry]));
const bindings = bindingFile.items || {};
const boundIds = new Set(Object.values(bindings).flat().map((binding) => binding.audioId));
const issues = [];
const fail = (code) => issues.push(code);
let overlapPassed = false;
let questionChangePassed = false;
let missingIdPassed = false;

if (moduleItems.length !== 23) fail(`CONTRACT_COUNT:${moduleItems.length}`);
for (const item of moduleItems) {
  const registryEntry = registryById.get(item.id);
  const asset = path.resolve(root, item.audioPath || "");
  const registryPath = registryEntry?.urlOrPath?.replace(/^\/+/, "");
  if (item.status !== "APPROVED" || item.voiceVersion !== "DUDUQ_GOLD_VOICE_v1" || item.deliveryProfile !== "NATURAL_CLEAR_V2") fail(`APPROVAL_METADATA:${item.id}`);
  if (!/\.mp3$/i.test(item.audioPath || "") || /\.wav$/i.test(item.audioPath || "")) fail(`NON_MP3_RUNTIME_PATH:${item.id}`);
  if (registryPath !== item.audioPath || registryEntry?.status !== "APPROVED") fail(`REGISTRY_MISMATCH:${item.id}`);
  if (item.displayText !== registryEntry?.transcript) fail(`TRANSCRIPT_MISMATCH:${item.id}`);
  const audioBytes = await readFile(asset).catch(() => null);
  if (!audioBytes || audioBytes.length <= 1024) fail(`ASSET_MISSING:${item.id}`);
  else if (createHash("sha256").update(audioBytes).digest("hex") !== item.contentHash) fail(`ASSET_HASH_MISMATCH:${item.id}`);
  if (item.id.startsWith("AUD-Y1M01-") && !boundIds.has(item.id)) fail(`NO_CONTENT_BINDING:${item.id}`);
}

for (const [questionId, questionBindings] of Object.entries(bindings)) {
  if (!questions.items.some((item) => item.item_id === questionId)) fail(`UNKNOWN_QUESTION:${questionId}`);
  if (!Array.isArray(questionBindings)) fail(`INVALID_BINDINGS:${questionId}`);
  for (const binding of questionBindings || []) {
    if (!binding.audioId || binding.src || binding.path || !byId.has(binding.audioId)) fail(`NON_CANONICAL_BINDING:${questionId}:${binding.role}`);
    if (!byId.get(binding.audioId)?.activity?.includes(questionId)) fail(`ACTIVITY_MAPPING_MISMATCH:${questionId}:${binding.audioId}`);
  }
}
const q009 = bindings["Y1M01-Q009"] || [];
const q015 = bindings["Y1M01-Q015"] || [];
if (q009.length !== 3 || new Set(q009.map((item) => item.audioId)).size !== 3) fail("Q009_BINDINGS");
if (q015.length !== 2 || new Set(q015.map((item) => item.audioId)).size !== 2) fail("Q015_BINDINGS");
for (const questionId of ["Y1M01-Q010", "Y1M01-Q013"]) {
  const dialogue = (bindings[questionId] || []).find((item) => item.role === "dialogue");
  if (!dialogue || byId.get(dialogue.audioId)?.type !== "DIALOGUE") fail(`DIALOGUE_BINDING:${questionId}`);
}
const globalPtBr = moduleItems.filter((item) => item.type === "GLOBAL_UI" && item.locale === "pt-BR");
if (!globalPtBr.length) fail("PT_BR_GLOBAL_UI_MISSING");

async function playwrightModule() {
  try { return await import("playwright"); }
  catch { return await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href); }
}

const baseUrl = "http://127.0.0.1:4175";
let serverProcess = null;
async function isServerReady() {
  try { return (await fetch(`${baseUrl}/qa/y1m01-audio/`, { method: "HEAD" })).ok; }
  catch { return false; }
}
if (!await isServerReady()) {
  serverProcess = spawn(process.execPath, [path.join(root, "scripts/duduq-test-server.mjs")], { cwd: root, stdio: "ignore", windowsHide: true });
  for (let attempt = 0; attempt < 60 && !await isServerReady(); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 250));
}

let browser;
const runtimeResults = [];
try {
  assert(await isServerReady(), "PREVIEW_SERVER_UNAVAILABLE");
  for (const item of moduleItems) {
    const response = await fetch(`${baseUrl}/${item.audioPath.replace(/^\/+/, "")}`, { method: "HEAD", cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    if (response.status !== 200 || !contentType.toLowerCase().includes("audio/mpeg")) fail(`HTTP_AUDIO_INVALID:${item.id}:${response.status}:${contentType}`);
  }

  const { chromium } = await playwrightModule();
  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) });
  const page = await browser.newPage({ acceptDownloads: false });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/qa/y1m01-audio/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.DuduQContentAudio?.version === "1.0.5", null, { timeout: 10000 });
  const resolved = await page.evaluate(async (ids) => Promise.all(ids.map((id) => window.DuduQContentAudio.resolveAudio(id))), moduleItems.map((item) => item.id));
  for (const result of resolved) {
    if (result.status !== "READY" || !result.url?.startsWith(`${baseUrl}/`) || !result.url.toLowerCase().endsWith(".mp3")) fail(`SHARED_RESOLVER:${result.audioId}:${result.status}`);
  }

  await page.evaluate(() => {
    window.__audioRuntimeSmoke = { state: "idle", audioId: null, source: null, errors: [] };
    window.addEventListener("duduq:voice-state", (event) => Object.assign(window.__audioRuntimeSmoke, event.detail));
    const root = document.createElement("div"); root.id = "shared-runtime-smoke-controls";
    document.body.append(root);
    const NativeAudio = window.Audio;
    window.__audioRuntimeSmoke.instances = [];
    window.Audio = function (src) { const instance = new NativeAudio(src); window.__audioRuntimeSmoke.instances.push(instance); return instance; };
    window.Audio.prototype = NativeAudio.prototype;
  });

  for (const item of moduleItems) {
    await page.evaluate((id) => {
      const button = document.createElement("button");
      button.id = "runtime-play-" + id;
      button.addEventListener("click", () => { void window.DuduQContentAudio.playVoice(id); });
      document.querySelector("#shared-runtime-smoke-controls").replaceChildren(button);
    }, item.id);
    await page.locator(`#runtime-play-${item.id}`).click();
    try {
      await page.waitForFunction((id) => window.__audioRuntimeSmoke?.state === "playing" && window.__audioRuntimeSmoke?.audioId === id, item.id, { timeout: 8000 });
      const active = await page.evaluate(() => ({ id: window.DuduQContentAudio.getActiveVoiceId(), eventId: window.__audioRuntimeSmoke.audioId, source: window.__audioRuntimeSmoke.source, running: window.__audioRuntimeSmoke.instances.filter((audio) => !audio.paused && !audio.ended).length }));
      if (active.id !== item.id || active.eventId !== item.id || active.source !== resolved.find((entry) => entry.audioId === item.id).url || active.running !== 1) fail(`SHARED_PLAYER:${item.id}`);
      runtimeResults.push({ id: item.id, status: "PASS" });
    } catch (error) {
      fail(`SHARED_PLAYER_START:${item.id}:${error.message}`);
      runtimeResults.push({ id: item.id, status: "ISSUE" });
    }
    await page.evaluate(() => window.DuduQContentAudio.stopVoice());
  }

  const firstId = moduleItems[0].id;
  const missing = await page.evaluate(async (id) => window.DuduQContentAudio.playVoice(`${id}-MISSING`), firstId);
  missingIdPassed = missing.status !== "READY" && !(await page.evaluate(() => window.DuduQContentAudio.getActiveVoiceId()));
  if (!missingIdPassed) fail("MISSING_ID_FAIL_SAFE");
  const secondId = moduleItems[1].id;
  for (const id of [firstId, secondId]) {
    await page.evaluate((audioId) => {
      const button = document.createElement("button"); button.id = "runtime-overlap-" + audioId;
      button.addEventListener("click", () => { void window.DuduQContentAudio.playVoice(audioId); });
      document.querySelector("#shared-runtime-smoke-controls").replaceChildren(button);
    }, id);
    await page.locator(`#runtime-overlap-${id}`).click();
    await page.waitForFunction((audioId) => window.__audioRuntimeSmoke?.state === "playing" && window.__audioRuntimeSmoke?.audioId === audioId, id, { timeout: 8000 });
  }
  overlapPassed = await page.evaluate((id) => window.DuduQContentAudio.getActiveVoiceId() === id && window.__audioRuntimeSmoke.instances.filter((audio) => !audio.paused && !audio.ended).length === 1, secondId);
  if (!overlapPassed) fail("VOICE_OVERLAP_PROTECTION");
  await page.evaluate(() => window.DuduQContentAudio.stopVoice());
  await page.evaluate(() => {
    window.DuduQContentAudio.setActiveQuestion("QA-ONE");
    window.__audioRuntimeSmoke.questionChangeTest = true;
  });
  await page.evaluate((id) => { void window.DuduQContentAudio.playVoice(id); }, firstId);
  await page.waitForFunction((id) => window.__audioRuntimeSmoke?.state === "playing" && window.__audioRuntimeSmoke?.audioId === id, firstId, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.DuduQContentAudio.setActiveQuestion("QA-TWO"));
  questionChangePassed = !(await page.evaluate(() => window.DuduQContentAudio.getActiveVoiceId()));
  if (!questionChangePassed) fail("QUESTION_CHANGE_DID_NOT_STOP");
  if (pageErrors.length) fail(`BROWSER_PAGE_ERRORS:${pageErrors.join("|")}`);
} catch (error) {
  fail(`RUNTIME_SMOKE:${error?.message || String(error)}`);
} finally {
  await browser?.close().catch(() => {});
  if (serverProcess) serverProcess.kill();
}

const imageItemBindingsMissing = questions.items.filter((item) => !item.image_ref).length;
const imageRequirementItems = new Set(imageManifest.entries.flatMap((entry) => entry.usedByItems || []));
if (imageRequirementItems.size !== questions.items.length || questions.items.some((item) => !imageRequirementItems.has(item.item_id))) fail("IMAGE_REQUIREMENT_COVERAGE_MISMATCH");
const report = {
  status: issues.length ? "ISSUE" : "PASS",
  audioDomain: issues.length ? "ISSUE" : "PASS",
  imageDomain: imageItemBindingsMissing ? "PENDING" : "PASS",
  moduleRelease: imageItemBindingsMissing ? "NOT_READY" : "READY",
  approvedAudio: moduleItems.length,
  canonicalResolver: resolvedReadyCount(runtimeResults),
  sharedRuntimePlayback: runtimeResults,
  q009: q009.length === 3 && new Set(q009.map((item) => item.audioId)).size === 3 ? "PASS" : "ISSUE",
  q015: q015.length === 2 && new Set(q015.map((item) => item.audioId)).size === 2 ? "PASS" : "ISSUE",
  dialogues: ["Y1M01-Q010", "Y1M01-Q013"].every((id) => (bindings[id] || []).some((item) => item.role === "dialogue")) ? "PASS" : "ISSUE",
  globalPtBrUiAudioIds: globalPtBr.map((item) => item.id),
  voiceOverlapProtection: overlapPassed ? "PASS" : "ISSUE",
  questionChangeStop: questionChangePassed ? "PASS" : "ISSUE",
  missingIdFailSafe: missingIdPassed ? "PASS" : "ISSUE",
  wavUsedByRuntime: "NO",
  imageItemBindingsMissing,
  uniqueImageRequirements: imageManifest.entries.length,
  imageCountExplanation: `${imageItemBindingsMissing} question-level image bindings are pending; ${imageManifest.entries.length} deduplicated visual requirements cover those items via reusable usedByItems.`,
  issues
};
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exitCode = 1;

function resolvedReadyCount(results) {
  return results.filter((result) => result.status === "PASS").length;
}

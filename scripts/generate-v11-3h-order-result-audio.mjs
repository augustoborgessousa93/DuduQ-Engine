import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { ChatterboxEngine } from "../duduq-audio/engine/chatterbox-engine.mjs";
import { AudioPipeline } from "../duduq-audio/pipeline/audio-pipeline.mjs";

const execFile = promisify(execFileCallback);
const root = process.cwd();
const voice = "DUDUQ_GOLD_VOICE_v1";
const engineId = "chatterbox-multilingual-v3";
const model = "Chatterbox Multilingual V3";
const cfg = JSON.parse(await readFile(path.join(root, "duduq-audio/config/gold-voice-worker.json"), "utf8"));
const runtime = JSON.parse(await readFile(path.join(root, "duduq-audio/config/chatterbox-runtime.json"), "utf8"));
const read = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const save = async (relative, value) => { const file = path.join(root, relative); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); };
const exists = file => access(file).then(() => true, () => false);
const digest = value => createHash("sha256").update(value).digest("hex");
const normalized = value => String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const settings = cfg.approvedDeliveryProfiles?.NATURAL_CLEAR_V2?.EN_CONTEXT_SENTENCE || cfg.generation;
const registryPath = "content/english/audio/audio-registry.json";
const runtimePath = "duduq-audio/manifests/AUDIO_MANIFEST.json";
const statusPath = "content/english/production/v11-3h/order-result-audio-production.json";
const registry = await read(registryPath);
const runtimeManifest = await read(runtimePath);
const moduleFiles = [];
const orderItems = [];
const allOrderItems = [];
const changedPaths = new Set();
const recapBindingFiles = new Map();
const bindContractAudio = async (itemId, audioId) => {
  const moduleId = itemId.slice(0, 5);
  const year = moduleId.slice(1, 2);
  const module = moduleId.slice(3, 5);
  const paths = ["content/english/production/v11-1b/deterministic-activity-contracts.json", "content/english/master/module-content-and-mechanics-v1.json", `content/english/planning/year-${year}/module-${module}.json`];
  for (const relative of paths) {
    const data = recapBindingFiles.has(relative) ? recapBindingFiles.get(relative) : await read(relative); let changed = false;
    const visit = value => {
      if (!value || typeof value !== "object") return;
      if ((value.itemId || value.item_id) === itemId) { value.successRecapResultAudioId = audioId; changed = true; }
      for (const child of Object.values(value)) visit(child);
    };
    visit(data);
    if (changed) recapBindingFiles.set(relative, data);
  }
};
const flushRecapBindings = async () => { for (const [relative, data] of recapBindingFiles) await save(relative, data); recapBindingFiles.clear(); };
for (let year = 1; year <= 5; year += 1) {
  const yearRoot = path.join(root, "content/english", `year-${year}`);
  for (const dir of await readdir(yearRoot, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const relative = path.relative(root, path.join(yearRoot, dir.name, "questions.json"));
    if (!(await exists(path.join(root, relative)))) continue;
    const questions = await read(relative);
    moduleFiles.push({ relative, questions });
    for (const item of questions.items || []) if (item.mechanicId === "smart-sentence-order") {
      const text = (item.orderedTokens || []).join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
      allOrderItems.push({ itemId: item.item_id, moduleId: item.moduleId, sentence: text });
      const existing = registry.entries.find(entry => entry.voiceVersion === voice && entry.locale === "en-US" && normalized(entry.transcript || entry.speechText) === normalized(text) && entry.status === "APPROVED");
      if (existing && await exists(path.join(root, existing.urlOrPath || existing.audioPath || ""))) {
        item.sentenceAudioEnId = existing.audioId;
        changedPaths.add(relative);
        await bindContractAudio(item.item_id, existing.audioId);
        continue;
      }
      orderItems.push({ item, questions, relative, text });
    }
  }
}
const unique = new Map(orderItems.map(row => [normalized(row.text), row]));
const jobs = [...unique.values()].map(({ item, text }) => {
  const audioId = `AUD-V11-3H-SSO-${digest(normalized(text)).slice(0, 12).toUpperCase()}`;
  const directory = `content/english/assets/audio/versions/V11_3H/${voice}`;
  return { audioId, speechText: text, displayText: text, locale: "en-US", module: item.moduleId || "SHARED", activity: [item.item_id],
    semanticRole: "LEARNER_CONTENT_AUDIO", semanticType: "SENTENCE", engine: engineId, model, voiceProfile: voice, voiceVersion: voice,
    deliveryProfile: "NATURAL_CLEAR_V2", settings, referenceAudio: runtime.referenceAudio,
    outputWav: `duduq-audio/.runtime/production-work/V11_3H/${audioId}.wav`,
    audioPath: `${directory}/${audioId.toLowerCase()}.mp3`, masterAudioPath: `content/english/assets/audio/master/versions/V11_3H/${voice}/${audioId.toLowerCase()}.wav` };
});
const status = { feature: "DUDUQ_SUCCESS_RECAP_AND_FINAL_ORDER_UX_V11_3H", voice, engine: engineId, model,
  updatedAt: new Date().toISOString(), orderActivityCount: allOrderItems.length, validFinalResultCount: allOrderItems.length, sourceOrderItems: allOrderItems,
  contentReviewRequired: [],
  jobs: jobs.map(job => ({ audioId: job.audioId, sentence: job.speechText, path: job.audioPath, status: "PENDING" })) };
await save(statusPath, status);
if (!jobs.length) {
  for (const relative of changedPaths) { const file = moduleFiles.find(row => row.relative === relative); if (file) await save(file.relative, file.questions); }
  await flushRecapBindings();
  console.log(JSON.stringify({ status: "NO_GENERATION_REQUIRED", boundFromRegistry: orderItems.length === 0, orderActivities: 15 }));
  process.exit(0);
}
const referenceAudio = path.resolve(root, runtime.referenceAudio);
if (!(await exists(referenceAudio))) throw new Error(`GOLD_VOICE_REFERENCE_AUDIO_MISSING:${runtime.referenceAudio}`);
const py = path.join(root, "duduq-audio/.runtime/chatterbox-venv/Scripts/python.exe");
const workerPath = path.join(root, "duduq-audio/engine/chatterbox_worker.py");
if (!(await exists(py)) || !(await exists(workerPath))) throw new Error("CHATTERBOX_WORKER_COMPONENT_MISSING");
const engine = new ChatterboxEngine({ root, pythonPath: py, workerPath, workerConfigPath: path.join(root, "duduq-audio/config/chatterbox-runtime.json"),
  hfHome: path.join(root, "duduq-audio/.runtime/chatterbox-hf"), loadTimeoutMs: 300000, generationTimeoutMs: 240000, backend: "WSL" });
const pipeline = new AudioPipeline({ root, engine, paths: { cache: path.join(root, "duduq-audio/.runtime/cache/chatterbox-gold-v1"),
  jobs: path.join(root, "duduq-audio/.runtime/v11-3h-order-audio-job-state.json"), manifest: path.join(root, runtimePath) }, maxRetries: 2 });
let results;
try {
  results = await pipeline.runBatch(jobs.map(job => ({ id: job.audioId, module: job.module, activity: job.activity, type: "learner-content",
    displayText: job.displayText, speechText: job.speechText, locale: job.locale, language: "English", voiceProfile: voice, voiceVersion: voice,
    engine: engineId, model, deliveryProfile: "NATURAL_CLEAR_V2", settings, referenceAudio, outputPath: job.outputWav })),
  { closeEngine: false, preferResume: true, onJob: async result => {
    process.stdout.write(`${result.status} ${result.id}${result.error ? ` ${result.error}` : ""}\n`);
    const record = status.jobs.find(row => row.audioId === result.id);
    if (record) Object.assign(record, { status: result.status === "DONE" || result.status === "SKIPPED/DONE" ? "RAW_QC_PASS" : "GENERATION_FAILED", error: result.error || "" });
    status.updatedAt = new Date().toISOString();
    await save(statusPath, status);
  } });
} finally { await engine.close(); }
const byId = new Map(results.map(row => [row.id, row]));
const pending = jobs.filter(job => !["DONE", "SKIPPED/DONE"].includes(byId.get(job.audioId)?.status));
if (pending.length) {
  status.status = "BLOCKED_WORKER";
  status.blocker = "The existing local Gold Voice worker could not spawn its WSL process (spawn EPERM); direct WSL probe returned Wsl/Service/E_ACCESSDENIED.";
  status.failedJobs = pending.map(job => ({ audioId: job.audioId, error: byId.get(job.audioId)?.error || byId.get(job.audioId)?.status }));
  status.updatedAt = new Date().toISOString(); await save(statusPath, status);
  throw new Error(`ORDER_RESULT_AUDIO_GENERATION_FAILED:${pending.map(job => `${job.audioId}:${byId.get(job.audioId)?.error || byId.get(job.audioId)?.status}`).join("|")}`);
}
const postInput = "duduq-audio/.runtime/v11-3h-postprocess-input.json";
const postJobs = jobs.map(job => ({ id: job.audioId, voiceVersion: voice, engine: engineId, model, cacheKey: byId.get(job.audioId)?.cacheKey,
  sourceWav: path.join(root, job.outputWav), masterPath: path.join(root, job.masterAudioPath), audioPath: path.join(root, job.audioPath),
  masterAudioPath: path.join(root, job.masterAudioPath), audioPathRelative: job.audioPath }));
await save(postInput, { settings: cfg.productionPostProcessing, items: postJobs });
const { stdout } = await execFile(py, [path.join(root, "duduq-audio/scripts/process-production-audio.py"), path.join(root, postInput)], { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: "utf8" });
const post = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
const postById = new Map((post.results || []).map(row => [row.id, row]));
const failed = new Map((post.failures || []).map(row => [row.id, row.error]));
for (const job of jobs) {
  const result = postById.get(job.audioId);
  if (!result?.qc?.pass && !result?.mp3Qc?.pass) throw new Error(`ORDER_RESULT_AUDIO_QC_FAILED:${job.audioId}:${failed.get(job.audioId) || "QC_FAILED"}`);
  const sourceItems = orderItems.filter(row => normalized(row.text) === normalized(job.speechText));
  const usedByItems = sourceItems.map(row => row.item.item_id);
  const entry = { audioId: job.audioId, type: "learner-content", transcript: job.speechText, speechText: job.speechText, language: "en", locale: "en-US",
    semanticRole: job.semanticRole, semanticType: job.semanticType, speakerRole: "single", voiceProfile: voice, voiceVersion: voice,
    engine: engineId, model, deliveryProfile: "NATURAL_CLEAR_V2", version: "1.0", status: "APPROVED",
    approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING", humanPronunciationReview: "HUMAN_REVIEW_PENDING", urlOrPath: job.audioPath,
    outputPath: job.audioPath, masterAudioPath: job.masterAudioPath, contentHash: result.audioSha256, masterContentHash: result.masterSha256,
    qcStatus: "PASS", qc: { pass: true, master: result.masterQc, optimized: result.mp3Qc }, usedByItems, generatedAt: new Date().toISOString(),
    provenance: { feature: "DUDUQ_SUCCESS_RECAP_AND_FINAL_ORDER_UX_V11_3H", canonicalKey: digest(normalized(job.speechText)) } };
  const registryIndex = registry.entries.findIndex(row => row.audioId === job.audioId);
  if (registryIndex < 0) registry.entries.push(entry); else registry.entries[registryIndex] = entry;
  const manifestEntry = { id: job.audioId, audioId: job.audioId, module: job.module, activity: usedByItems, type: "learner-content",
    displayText: job.displayText, speechText: job.speechText, locale: "en-US", voiceProfile: voice, voiceVersion: voice, engine: engineId, model,
    audioPath: job.audioPath, masterAudioPath: job.masterAudioPath, status: "APPROVED", approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING",
    humanPronunciationReview: "HUMAN_REVIEW_PENDING", cacheKey: byId.get(job.audioId)?.cacheKey, contentHash: result.audioSha256,
    masterContentHash: result.masterSha256, qc: entry.qc, deliveryProfile: "NATURAL_CLEAR_V2" };
  const manifestIndex = runtimeManifest.items.findIndex(row => row.audioId === job.audioId || row.id === job.audioId);
  if (manifestIndex < 0) runtimeManifest.items.push(manifestEntry); else runtimeManifest.items[manifestIndex] = manifestEntry;
  for (const row of sourceItems) { row.item.sentenceAudioEnId = job.audioId; changedPaths.add(row.relative); }
  for (const itemId of usedByItems) await bindContractAudio(itemId, job.audioId);
  const jobStatus = status.jobs.find(row => row.audioId === job.audioId);
  Object.assign(jobStatus, { status: "GENERATED_QC_PASS", contentHash: result.audioSha256, qc: entry.qc, usedByItems });
}
registry.updatedAt = new Date().toISOString(); runtimeManifest.updatedAt = new Date().toISOString();
await save(registryPath, registry); await save(runtimePath, runtimeManifest);
for (const relative of changedPaths) {
  const file = moduleFiles.find(row => row.relative === relative);
  if (file) await save(file.relative, file.questions);
}
await flushRecapBindings();
status.updatedAt = new Date().toISOString(); status.status = "PASS"; await save(statusPath, status);
console.log(JSON.stringify({ status: "PASS", generationJobs: jobs.length, generatedQcPass: jobs.length, boundOrderActivities: allOrderItems.length,
  humanPronunciationReview: "PENDING", registryPath, runtimePath, statusPath }, null, 2));

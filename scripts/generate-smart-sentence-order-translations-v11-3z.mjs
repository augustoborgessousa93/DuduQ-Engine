import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { ChatterboxEngine } from "../duduq-audio/engine/chatterbox-engine.mjs";
import { AudioPipeline } from "../duduq-audio/pipeline/audio-pipeline.mjs";

const execFile = promisify(execFileCallback);
const root = process.cwd();
const sourcePath = "content/english/production/v11-3z/order-translations.json";
const contractsPath = "content/english/production/v11-1b/deterministic-activity-contracts.json";
const registryPath = "content/english/audio/audio-registry.json";
const runtimeManifestPath = "duduq-audio/manifests/AUDIO_MANIFEST.json";
const source = JSON.parse(await readFile(path.join(root, sourcePath), "utf8"));
const contractsDoc = JSON.parse(await readFile(path.join(root, contractsPath), "utf8"));
const registry = JSON.parse(await readFile(path.join(root, registryPath), "utf8"));
const runtimeManifest = JSON.parse(await readFile(path.join(root, runtimeManifestPath), "utf8"));
const workerConfigPath = path.join(root, "duduq-audio/config/chatterbox-runtime.json");
const workerConfig = JSON.parse(await readFile(workerConfigPath, "utf8"));
const voiceConfig = JSON.parse(await readFile(path.join(root, "duduq-audio/config/gold-voice-worker.json"), "utf8"));
const voiceVersion = "DUDUQ_GOLD_VOICE_v1";
const engineId = "chatterbox-multilingual-v3";
const model = "Chatterbox Multilingual V3";
const profile = "NATURAL_CLEAR_V2";
const prefix = source.prefix;
const sha = value => createHash("sha256").update(value).digest("hex");
const short = value => sha(value).slice(0, 16).toUpperCase();
const normalize = value => String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
const normalizeSentence = value => normalize(value).replace(/[.!?]+$/, "").toLocaleLowerCase("en-US");
const writeJsonAtomic = async (relative, value) => {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
};
const hasFile = relative => access(path.join(root, relative)).then(() => true, () => false);

if (source.items.length !== 15 || !prefix) throw new Error("ORDER_TRANSLATION_SOURCE_COUNT_OR_PREFIX_INVALID");
const contractByItem = new Map(contractsDoc.contracts.map(contract => [contract.itemId, contract]));
const runtimeItems = [];
const jobs = [];
for (const row of source.items) {
  const contract = contractByItem.get(row.itemId);
  if (!contract || contract.moduleId !== row.moduleId || contract.mechanicId !== "smart-sentence-order") {
    throw new Error(`ORDER_TRANSLATION_CONTRACT_MISSING:${row.itemId}`);
  }
  const english = (contract.studentStimuli?.canonicalOrder || []).join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
  if (normalizeSentence(english) !== normalizeSentence(row.english) || normalizeSentence(contract.targetContent) !== normalizeSentence(row.english)) {
    throw new Error(`ORDER_TRANSLATION_ENGLISH_SOURCE_MISMATCH:${row.itemId}:${english}:${row.english}`);
  }
  const speechText = `${prefix} ${row.translationPt}`;
  const audioId = `AUD-V11-3Z-ORDER-PT-${short(`${row.itemId}|${row.english}|${speechText}|${voiceVersion}`)}`;
  const folder = `content/english/assets/audio/versions/V11_3Z/${voiceVersion}`;
  const audioPath = `${folder}/${audioId.toLowerCase()}.mp3`;
  const masterAudioPath = `content/english/assets/audio/master/versions/V11_3Z/${voiceVersion}/${audioId.toLowerCase()}.wav`;
  const outputPath = `duduq-audio/.runtime/production-work/V11_3Z/${audioId}.wav`;
  const existing = registry.entries.find(entry => entry.audioId === audioId);
  if (existing && (normalize(existing.speechText || existing.transcript) !== normalize(speechText) ||
      existing.locale !== "pt-BR" || existing.voiceVersion !== voiceVersion || existing.status !== "APPROVED")) {
    throw new Error(`ORDER_TRANSLATION_AUDIO_ID_COLLISION:${audioId}`);
  }
  runtimeItems.push({ ...row, speechText, audioId, audioPath, masterAudioPath });
  jobs.push({ id: audioId, module: row.moduleId, activity: [row.itemId], type: "SUCCESS_TRANSLATION",
    displayText: speechText, speechText, locale: "pt-BR", language: "Portuguese", voiceProfile: voiceVersion,
    voiceVersion, engine: engineId, model, deliveryProfile: profile,
    settings: { ...voiceConfig.approvedDeliveryProfiles?.[profile]?.PT_BR_INSTRUCTION },
    referenceAudio: workerConfig.referenceAudio, outputPath });
}
const translationAudio = runtimeItems.map(item => ({ id: item.audioId, audioId: item.audioId, module: item.moduleId,
  activity: [item.itemId], type: "SUCCESS_TRANSLATION", displayText: item.speechText, speechText: item.speechText,
  locale: "pt-BR", voiceProfile: voiceVersion, voiceVersion, engine: engineId, model,
  deliveryProfile: profile, audioPath: item.audioPath, masterAudioPath: item.masterAudioPath }));
const audioManifestById = new Map(runtimeManifest.items.map((entry, index) => [entry.audioId || entry.id, index]));
const registryById = new Map(registry.entries.map((entry, index) => [entry.audioId, index]));
const validAudioIds = new Set();
for (const item of runtimeItems) {
  const entry = registry.entries.find(row => row.audioId === item.audioId);
  const manifestEntry = runtimeManifest.items.find(row => (row.audioId || row.id) === item.audioId);
  const valid = entry?.status === "APPROVED" && manifestEntry?.status === "APPROVED" &&
    normalize(entry.speechText || entry.transcript) === normalize(item.speechText) &&
    normalize(manifestEntry.speechText) === normalize(item.speechText) && entry.voiceVersion === voiceVersion &&
    manifestEntry.voiceVersion === voiceVersion && entry.locale === "pt-BR" && manifestEntry.locale === "pt-BR" &&
    entry.qcStatus === "PASS" && Boolean(entry.contentHash) && await hasFile(item.audioPath) && await hasFile(item.masterAudioPath);
  if (valid) validAudioIds.add(item.audioId);
}
const allValid = validAudioIds.size === runtimeItems.length;

let generatedRows = [];
if (!allValid) {
  const audioRoot = path.join(root, "duduq-audio");
  const engine = new ChatterboxEngine({ root: audioRoot, backend: "WINDOWS",
    pythonPath: path.join(audioRoot, ".runtime/chatterbox-venv/Scripts/python.exe"),
    workerPath: path.join(audioRoot, "engine/chatterbox_worker.py"), workerConfigPath,
    hfHome: path.join(audioRoot, ".runtime/chatterbox-hf"), loadTimeoutMs: 300000, generationTimeoutMs: 240000 });
  const pipeline = new AudioPipeline({ root, engine, paths: {
    cache: path.join(audioRoot, ".runtime/cache/chatterbox-gold-v1"),
    jobs: path.join(audioRoot, ".runtime/v11-3z-order-translation-job-state.json"),
    manifest: path.join(audioRoot, ".runtime/v11-3z-order-translation-run-manifest.json")
  }, maxRetries: 2 });
  const pendingJobs = jobs.filter(job => !validAudioIds.has(job.id));
  let rawRows;
  try {
    rawRows = await pipeline.runBatch(pendingJobs, {
      closeEngine: true, preferResume: true,
      onJob: result => process.stdout.write(`${result.status} ${result.id}\n`)
    });
  } finally { await engine.close(); }
  const failures = rawRows.filter(row => !["DONE", "SKIPPED/DONE"].includes(row.status));
  if (failures.length) throw new Error(`ORDER_TRANSLATION_GOLD_VOICE_GENERATION_FAILED:${JSON.stringify(failures)}`);
  const postPath = path.join(audioRoot, ".runtime/v11-3z-order-translation-postprocess.json");
  await writeJsonAtomic(path.relative(root, postPath), { settings: workerConfig.productionPostProcessing,
    items: runtimeItems.filter(item => !validAudioIds.has(item.audioId)).map(item => ({ id: item.audioId, voiceVersion, engine: engineId, model,
      deliveryProfile: profile, profile: "PT_BR_INSTRUCTION", cacheKey: rawRows.find(row => row.id === item.audioId)?.cacheKey,
      sourceWav: path.join(root, jobs.find(job => job.id === item.audioId).outputPath), masterPath: path.join(root, item.masterAudioPath),
      masterAudioPath: item.masterAudioPath, audioPath: path.join(root, item.audioPath), audioPathRelative: item.audioPath })) });
  const python = path.join(audioRoot, ".runtime/chatterbox-venv/Scripts/python.exe");
  const postScript = path.join(audioRoot, "scripts/process-production-audio.py");
  const { stdout } = await execFile(python, [postScript, postPath], { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: "utf8" });
  const post = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  const postById = new Map((post.results || []).map(result => [result.id, result]));
  const postFailures = new Map((post.failures || []).map(result => [result.id, result.error]));
  for (const item of runtimeItems.filter(row => !validAudioIds.has(row.audioId))) {
    const result = postById.get(item.audioId);
    if (!result?.audioSha256 || !result?.masterSha256 || !result.mp3Qc?.pass || !result.masterQc?.pass) {
      throw new Error(`ORDER_TRANSLATION_AUDIO_QC_FAILED:${item.itemId}:${postFailures.get(item.audioId) || item.audioId}`);
    }
    generatedRows.push({ ...item, qc: { pass: true, master: result.masterQc, optimized: result.mp3Qc },
      contentHash: result.audioSha256, masterContentHash: result.masterSha256,
      cacheKey: rawRows.find(row => row.id === item.audioId)?.cacheKey });
  }
}

const qcById = new Map(generatedRows.map(row => [row.audioId, row]));
for (const item of runtimeItems) {
  const contract = contractByItem.get(item.itemId);
  const fresh = qcById.get(item.audioId);
  let registryEntry = registry.entries.find(entry => entry.audioId === item.audioId);
  let manifestEntry = runtimeManifest.items.find(entry => (entry.audioId || entry.id) === item.audioId);
  if (!registryEntry || fresh) {
    registryEntry = { audioId: item.audioId, type: "success-translation-pt", transcript: item.speechText,
      speechText: item.speechText, language: "pt", locale: "pt-BR", semanticRole: "SUCCESS_TRANSLATION",
      semanticType: "ORDER_SENTENCE_TRANSLATION", speakerRole: "single", voiceProfile: voiceVersion,
      voiceVersion, engine: engineId, model, deliveryProfile: profile, version: "1.0", status: "APPROVED",
      approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING", humanPronunciationReview: "HUMAN_REVIEW_PENDING",
      urlOrPath: item.audioPath, outputPath: item.audioPath, masterAudioPath: item.masterAudioPath,
      contentHash: fresh?.contentHash || registryEntry?.contentHash,
      masterContentHash: fresh?.masterContentHash || registryEntry?.masterContentHash,
      qcStatus: "PASS", qc: fresh?.qc || registryEntry?.qc, usedByItems: [item.itemId],
      generatedAt: new Date().toISOString(), provenance: { feature: source.feature,
        exactTextHash: sha(item.speechText), sourceItemId: item.itemId, sourceEnglish: item.english } };
    const index = registryById.get(item.audioId);
    if (index === undefined) { registryById.set(item.audioId, registry.entries.length); registry.entries.push(registryEntry); }
    else registry.entries[index] = registryEntry;
  }
  manifestEntry = { ...translationAudio.find(row => row.id === item.audioId), status: "APPROVED",
    approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING", humanPronunciationReview: "HUMAN_REVIEW_PENDING",
    cacheKey: fresh?.cacheKey || manifestEntry?.cacheKey, contentHash: fresh?.contentHash || manifestEntry?.contentHash,
    masterContentHash: fresh?.masterContentHash || manifestEntry?.masterContentHash, qc: fresh?.qc || manifestEntry?.qc };
  const manifestIndex = audioManifestById.get(item.audioId);
  if (manifestIndex === undefined) { audioManifestById.set(item.audioId, runtimeManifest.items.length); runtimeManifest.items.push(manifestEntry); }
  else runtimeManifest.items[manifestIndex] = manifestEntry;

  contract.completedSentenceEn = item.english;
  contract.completedSentencePt = item.translationPt;
  contract.successTranslationPt = item.speechText;
  contract.successTranslationAudioId = item.audioId;
  const successAudio = { audioConceptId: `AUD-ORDER-SUCCESS-PT-${short(`${item.itemId}|${item.speechText}`)}`,
    language: "pt-BR", spokenTarget: item.speechText, role: "SUCCESS_TRANSLATION", semanticType: "ORDER_SENTENCE_TRANSLATION",
    voice: `${voiceVersion} / CHATTERBOX_MULTILINGUAL_V3`, assetStatus: "RESOLVED", audioId: item.audioId, assetPath: item.audioPath };
  contract.requiredAudio.successReinforcement = [successAudio];
  contract.resolvedAssetBindings.audio ||= [];
  contract.resolvedAssetBindings.audio = contract.resolvedAssetBindings.audio.filter(entry => entry.audioConceptId !== successAudio.audioConceptId);
  contract.resolvedAssetBindings.audio.push({ audioConceptId: successAudio.audioConceptId, audioId: item.audioId, assetPath: item.audioPath });

  const moduleNumber = item.moduleId.slice(-2);
  const moduleYear = item.moduleId[1];
  const questionsPath = `content/english/year-${moduleYear}/module-${moduleNumber}/questions.json`;
  const questions = JSON.parse(await readFile(path.join(root, questionsPath), "utf8"));
  const question = questions.items.find(row => row.item_id === item.itemId);
  if (!question) throw new Error(`ORDER_TRANSLATION_QUESTION_MISSING:${item.itemId}`);
  if (normalizeSentence(question.orderedTokens?.join(" ").replace(/\s+([.,!?])/g, "$1")) !== normalizeSentence(item.english)) {
    throw new Error(`ORDER_TRANSLATION_RUNTIME_ENGLISH_MISMATCH:${item.itemId}`);
  }
  question.completedSentenceEn = item.english;
  question.completedSentencePt = item.translationPt;
  question.successTranslationPt = item.speechText;
  question.successTranslationAudioId = item.audioId;
  question.successTranslationRole = "SUCCESS_TRANSLATION";
  question.audioBindings ||= [];
  question.audioBindings = question.audioBindings.filter(binding => binding.role !== "success-translation-pt");
  question.audioBindings.push({ role: "success-translation-pt", audioId: item.audioId, text: item.speechText, locale: "pt-BR" });
  await writeJsonAtomic(questionsPath, questions);
}
registry.updatedAt = new Date().toISOString();
runtimeManifest.updatedAt = new Date().toISOString();
await writeJsonAtomic(contractsPath, contractsDoc);
await writeJsonAtomic(registryPath, registry);
await writeJsonAtomic(runtimeManifestPath, runtimeManifest);

const report = { feature: source.feature, status: "PASS", engine: `${voiceVersion} / CHATTERBOX_MULTILINGUAL_V3`,
  backend: "WINDOWS", prefix, totalOrder: runtimeItems.length, generatedThisRun: generatedRows.length,
  translations: runtimeItems.map(item => ({ moduleId: item.moduleId, itemId: item.itemId, english: item.english,
    translationPt: item.translationPt, speechText: item.speechText, audioId: item.audioId, path: item.audioPath,
    qc: registry.entries.find(entry => entry.audioId === item.audioId)?.qc?.pass === true })),
  technicalQc: "PASS", humanPronunciation: "PENDING", recordedAt: new Date().toISOString() };
await writeJsonAtomic("content/english/production/v11-3z/order-translation-audio-production.json", report);
console.log(JSON.stringify({ status: report.status, totalOrder: report.totalOrder, generatedThisRun: report.generatedThisRun,
  qcPass: report.translations.filter(item => item.qc).length, ids: report.translations.map(item => item.audioId) }, null, 2));

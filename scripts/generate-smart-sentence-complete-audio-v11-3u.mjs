import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { ChatterboxEngine } from "../duduq-audio/engine/chatterbox-engine.mjs";
import { AudioPipeline, inspectWav } from "../duduq-audio/pipeline/audio-pipeline.mjs";
import {
  COMPLETE_IMAGE_INSTRUCTION_EN,
  COMPLETE_IMAGE_INSTRUCTION_PT,
  COMPLETE_TRANSLATIONS_PT,
  completeSuccessTranslationPt,
  isCompleteImageClueBinding
} from "./lib/smart-sentence-complete-v11-3u-data.mjs";

const execFile = promisify(execFileCallback);
const root = process.cwd();
const audioRoot = path.join(root, "duduq-audio");
const voice = "DUDUQ_GOLD_VOICE_v1";
const engineId = "chatterbox-multilingual-v3";
const model = "Chatterbox Multilingual V3";
const deliveryProfile = "NATURAL_CLEAR_V2";
const pronunciationHotfix = process.env.DUDUQ_SMART_SENTENCE_EN_PRONUNCIATION_HOTFIX === "V11_3V";
const hotfixAssetVersion = "V11_3V_R2";
const runtimeManifestPath = "duduq-audio/manifests/AUDIO_MANIFEST.json";
const registryPath = "content/english/audio/audio-registry.json";
const statusPath = pronunciationHotfix
  ? "content/english/production/v11-3v/smart-sentence-complete-en-instruction.json"
  : "content/english/production/v11-3u/smart-sentence-complete-audio-production.json";
const jobStatePath = path.join(audioRoot, `.runtime/jobs/${pronunciationHotfix ? "v11-3v-smart-sentence-en-instruction-r2" : "v11-3u-smart-sentence-complete"}.json`);
const workRoot = `duduq-audio/.runtime/production-work/${pronunciationHotfix ? hotfixAssetVersion : "V11_3U"}`;
const audioFolder = `content/english/assets/audio/versions/${pronunciationHotfix ? hotfixAssetVersion : "V11_3U"}/${voice}`;
const masterFolder = `content/english/assets/audio/master/versions/${pronunciationHotfix ? hotfixAssetVersion : "V11_3U"}/${voice}`;
const linuxPython = "/home/augus/.duduq/chatterbox-venv/bin/python";

const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const saveJson = async (relative, value) => {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
};
const exists = target => access(target).then(() => true, () => false);
const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = value => String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const absolute = relative => {
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`OUTPUT_PATH_ESCAPES_WORKSPACE:${relative}`);
  return target;
};
const toWslPath = async value => {
  const { stdout } = await execFile("wsl.exe", ["-d", "Ubuntu", "-u", "augus", "--", "wslpath", "-a", path.resolve(value).replaceAll("\\", "/")], { windowsHide: true });
  const translated = stdout.trim();
  if (!translated.startsWith("/")) throw new Error(`WSL_PATH_TRANSLATION_FAILED:${value}`);
  return translated;
};

if (process.env.DUDUQ_GOLD_VOICE_BACKEND?.toUpperCase() !== "WSL") {
  throw new Error("WSL_BACKEND_NOT_SELECTED");
}

const completeItems = [];
for (let year = 1; year <= 5; year += 1) {
  for (let module = 1; module <= 6; module += 1) {
    const moduleId = `Y${year}M${String(module).padStart(2, "0")}`;
    const document = await readJson(`content/english/year-${year}/module-${String(module).padStart(2, "0")}/questions.json`);
    for (const item of document.items.filter(row => row.mechanicId === "smart-sentence-complete")) {
      const itemId = item.item_id || `${moduleId}-${item.questionId}`;
      const translation = COMPLETE_TRANSLATIONS_PT[itemId];
      if (!translation) throw new Error(`SMART_SENTENCE_COMPLETE_TRANSLATION_MISSING:${itemId}`);
      const imageBinding = (item.mediaBindings || []).find(isCompleteImageClueBinding);
      completeItems.push({ itemId, moduleId, item, translation, imageClue: Boolean(imageBinding) });
    }
  }
}
if (completeItems.length !== 55) throw new Error(`SMART_SENTENCE_COMPLETE_COUNT:${completeItems.length}:expected=55`);
if (completeItems.filter(row => row.imageClue).length !== 54) throw new Error(`SMART_SENTENCE_COMPLETE_IMAGE_CLUE_COUNT:${completeItems.filter(row => row.imageClue).length}:expected=54`);
const unknownTranslations = Object.keys(COMPLETE_TRANSLATIONS_PT).filter(itemId => !completeItems.some(row => row.itemId === itemId));
if (unknownTranslations.length) throw new Error(`SMART_SENTENCE_COMPLETE_TRANSLATION_ORPHANS:${unknownTranslations.join(",")}`);

const requestMap = new Map();
const addRequest = request => {
  const key = `${request.locale}|${normalize(request.text)}`;
  const current = requestMap.get(key);
  if (current) {
    current.usedByItems = [...new Set([...current.usedByItems, ...request.usedByItems])].sort();
    return;
  }
  requestMap.set(key, { ...request, usedByItems: [...new Set(request.usedByItems)].sort() });
};
const imageItems = completeItems.filter(row => row.imageClue).map(row => row.itemId);
addRequest({ text: COMPLETE_IMAGE_INSTRUCTION_EN, locale: "en-US", profile: "EN_CONTEXT_SENTENCE", semanticRole: "SMART_SENTENCE_COMPLETE_IMAGE_INSTRUCTION", type: "instruction-en", usedByItems: imageItems });
addRequest({ text: COMPLETE_IMAGE_INSTRUCTION_PT, locale: "pt-BR", profile: "PT_BR_INSTRUCTION", semanticRole: "SMART_SENTENCE_COMPLETE_IMAGE_INSTRUCTION", type: "instruction-pt", usedByItems: imageItems });
for (const row of completeItems) {
  addRequest({ text: completeSuccessTranslationPt(row.translation), locale: "pt-BR", profile: "PT_BR_INSTRUCTION", semanticRole: "SMART_SENTENCE_COMPLETE_SUCCESS_TRANSLATION", type: "success-translation-pt", usedByItems: [row.itemId] });
}
let requests = [...requestMap.values()];
if (requests.length !== 56) throw new Error(`SMART_SENTENCE_COMPLETE_AUDIO_REQUEST_COUNT:${requests.length}:expected=56`);
if (pronunciationHotfix) {
  requests = requests.filter(request => request.type === "instruction-en");
  if (requests.length !== 1 || requests[0].text !== COMPLETE_IMAGE_INSTRUCTION_EN || requests[0].locale !== "en-US") {
    throw new Error("V11_3V_EN_INSTRUCTION_REQUEST_INVALID");
  }
}

const [workerConfig, runtimeConfig, runtimeManifest, registry] = await Promise.all([
  readJson("duduq-audio/config/gold-voice-worker.json"),
  readJson("duduq-audio/config/chatterbox-runtime.json"),
  readJson(runtimeManifestPath),
  readJson(registryPath)
]);
const profiles = workerConfig.approvedDeliveryProfiles?.[deliveryProfile];
if (workerConfig.voiceVersion !== voice || !profiles?.PT_BR_INSTRUCTION || !profiles?.EN_CONTEXT_SENTENCE) {
  throw new Error("DUDUQ_GOLD_VOICE_PROFILE_UNAVAILABLE");
}
if (!await exists(runtimeConfig.referenceAudio)) throw new Error(`GOLD_VOICE_REFERENCE_AUDIO_MISSING:${runtimeConfig.referenceAudio}`);

const exactRuntimeEntry = request => runtimeManifest.items.find(entry => entry.status === "APPROVED" && entry.voiceProfile === voice &&
  entry.locale === request.locale && normalize(entry.speechText) === normalize(request.text) && entry.audioPath && !entry.audioPath.split(/[\\/]/).includes("..") &&
  (!pronunciationHotfix || String(entry.audioPath).includes(hotfixAssetVersion)));
const reusable = new Map();
for (const request of requests) {
  const entry = exactRuntimeEntry(request);
  if (entry && await exists(absolute(entry.audioPath))) reusable.set(`${request.locale}|${normalize(request.text)}`, entry);
}
const missing = requests.filter(request => !reusable.has(`${request.locale}|${normalize(request.text)}`));
const jobs = missing.map(request => {
  const digest = sha(`${request.locale}|${request.text}|${voice}|${request.profile}|${deliveryProfile}`).slice(0, 14).toUpperCase();
  const marker = request.semanticRole.endsWith("INSTRUCTION") ? (request.locale === "en-US" ? "INSTR-EN" : "INSTR-PT") : "MEANING-PT";
  const audioId = `AUD-${pronunciationHotfix ? "V11-3V-R2" : "V11-3U"}-SSC-${marker}-${digest}`;
  return {
    ...request,
    audioId,
    outputWav: `${workRoot}/${audioId}.source.wav`,
    audioPath: `${audioFolder}/${audioId.toLowerCase()}.mp3`,
    masterAudioPath: `${masterFolder}/${audioId.toLowerCase()}.wav`
  };
});

const status = {
  schemaVersion: pronunciationHotfix ? "duduq-smart-sentence-complete-en-instruction-v11-3v" : "duduq-smart-sentence-complete-audio-v11-3u",
  feature: pronunciationHotfix ? "DUDUQ_SMART_SENTENCE_QA_ACCESS_EN_PRONUNCIATION_V11_3V" : "DUDUQ_SMART_SENTENCE_COMPLETE_AUDIO_FEEDBACK_V11_3U",
  voiceProfile: voice,
  engine: engineId,
  model,
  completeItemsAudited: completeItems.length,
  imageClueItems: imageItems.length,
  uniqueAudioRequests: requests.length,
  reused: requests.length - jobs.length,
  jobs: jobs.map(job => ({ audioId: job.audioId, text: job.text, locale: job.locale, role: job.semanticRole, usedByItems: job.usedByItems, status: "PENDING" })),
  updatedAt: new Date().toISOString()
};
await saveJson(statusPath, status);

let rawResults = [];
if (jobs.length) {
  const engine = new ChatterboxEngine({
    backend: "WSL",
    root,
    pythonPath: path.join(audioRoot, ".runtime/chatterbox-venv/Scripts/python.exe"),
    linuxPythonPath: linuxPython,
    workerPath: path.join(audioRoot, "engine/chatterbox_worker.py"),
    workerConfigPath: path.join(audioRoot, "config/chatterbox-runtime.json"),
    hfHome: path.join(audioRoot, ".runtime/chatterbox-hf"),
    loadTimeoutMs: 900000,
    generationTimeoutMs: 240000
  });
  const pipeline = new AudioPipeline({ root, engine, paths: {
    cache: path.join(audioRoot, `.runtime/cache/${pronunciationHotfix ? "chatterbox-gold-v1-v11-3v-r2" : "chatterbox-gold-v1"}`),
    jobs: jobStatePath,
    manifest: null
  }, maxRetries: 1 });
  try {
    rawResults = await pipeline.runBatch(jobs.map(job => ({
      id: job.audioId,
      module: "SMART_SENTENCE_COMPLETE",
      activity: job.usedByItems,
      type: job.type,
      displayText: job.text,
      speechText: job.text,
      locale: job.locale,
      language: job.locale === "pt-BR" ? "Portuguese" : "English",
      voiceProfile: voice,
      voiceVersion: voice,
      deliveryProfile,
      engine: engineId,
      model,
      settings: { ...profiles[job.profile] },
      referenceAudio: runtimeConfig.referenceAudio,
      outputPath: absolute(job.outputWav)
    })), { closeEngine: false, preferResume: true, onJob: async result => {
      const row = status.jobs.find(job => job.audioId === result.id);
      if (row) row.status = ["DONE", "SKIPPED/DONE"].includes(result.status) ? "RAW_QC_PASS" : result.status;
      status.updatedAt = new Date().toISOString();
      await saveJson(statusPath, status);
      process.stdout.write(`${result.status}${result.cache ? " CACHE_HIT" : ""} ${result.id}\n`);
    } });
  } finally {
    await engine.close();
  }
  const rawById = new Map(rawResults.map(result => [result.id, result]));
  const failed = jobs.filter(job => !["DONE", "SKIPPED/DONE"].includes(rawById.get(job.audioId)?.status));
  if (failed.length) throw new Error(`SMART_SENTENCE_COMPLETE_GOLD_VOICE_FAILED:${failed.map(job => `${job.audioId}:${rawById.get(job.audioId)?.status || "NO_RESULT"}`).join("|")}`);

  const postPath = `duduq-audio/.runtime/${pronunciationHotfix ? "v11-3v-smart-sentence-en-instruction-r2" : "v11-3u-smart-sentence-complete"}-postprocess.json`;
  await saveJson(postPath, {
    settings: runtimeConfig.productionPostProcessing,
    items: await Promise.all(jobs.map(async job => ({
      id: job.audioId,
      voiceVersion: voice,
      engine: engineId,
      model,
      deliveryProfile,
      profile: job.profile,
      cacheKey: rawById.get(job.audioId)?.cacheKey,
      sourceWav: await toWslPath(absolute(job.outputWav)),
      masterPath: await toWslPath(absolute(job.masterAudioPath)),
      audioPath: await toWslPath(absolute(job.audioPath)),
      masterAudioPath: job.masterAudioPath,
      audioPathRelative: job.audioPath
    })))
  });
  const { stdout } = await execFile("wsl.exe", ["-d", "Ubuntu", "-u", "augus", "--", linuxPython,
    await toWslPath(path.join(audioRoot, "scripts/process-production-audio.py")), await toWslPath(absolute(postPath))],
    { windowsHide: true, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" });
  const jsonStart = stdout.lastIndexOf("\n{");
  const processed = JSON.parse((jsonStart >= 0 ? stdout.slice(jsonStart + 1) : stdout).trim());
  const processedById = new Map((processed.results || []).map(result => [result.id, result]));
  if (processed.failures?.length || processedById.size !== jobs.length) {
    throw new Error(`SMART_SENTENCE_COMPLETE_POSTPROCESS_FAILED:${JSON.stringify(processed.failures || [])}`);
  }

  for (const job of jobs) {
    const raw = rawById.get(job.audioId);
    const processedAudio = processedById.get(job.audioId);
    const wavInspection = await inspectWav(absolute(job.masterAudioPath));
    if (!processedAudio?.masterQc?.pass || !processedAudio?.mp3Qc?.pass ||
      (processedAudio?.onsetQc?.required && !processedAudio?.onsetQc?.pass) || !wavInspection.pass ||
      !await exists(absolute(job.audioPath))) {
      throw new Error(`SMART_SENTENCE_COMPLETE_AUDIO_QC_FAILED:${job.audioId}`);
    }
    const runtimeEntry = {
      id: job.audioId,
      audioId: job.audioId,
      module: "SMART_SENTENCE_COMPLETE",
      activity: job.usedByItems,
      type: job.type,
      displayText: job.text,
      speechText: job.text,
      locale: job.locale,
      language: job.locale === "pt-BR" ? "Portuguese" : "English",
      voiceProfile: voice,
      voiceVersion: voice,
      engine: engineId,
      model,
      deliveryProfile,
      audioPath: job.audioPath,
      masterAudioPath: job.masterAudioPath,
      cacheKey: raw.cacheKey,
      contentHash: processedAudio.audioSha256,
      masterContentHash: processedAudio.masterSha256,
      status: "APPROVED",
      approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING",
      humanPronunciationReview: "HUMAN_REVIEW_PENDING",
      qcStatus: "PASS",
      qc: { pass: true, master: processedAudio.masterQc, optimized: processedAudio.mp3Qc, onset: processedAudio.onsetQc },
      usedByItems: job.usedByItems
    };
    const runtimeIndex = runtimeManifest.items.findIndex(entry => entry.id === job.audioId || entry.audioId === job.audioId);
    if (runtimeIndex >= 0) runtimeManifest.items[runtimeIndex] = runtimeEntry;
    else runtimeManifest.items.push(runtimeEntry);
    const registryEntry = {
      audioId: job.audioId,
      type: job.type,
      transcript: job.text,
      speechText: job.text,
      language: job.locale === "pt-BR" ? "pt" : "en",
      locale: job.locale,
      semanticRole: job.semanticRole,
      semanticType: job.semanticRole,
      speakerRole: "single",
      voiceProfile: voice,
      voiceVersion: voice,
      engine: "CHATTERBOX_MULTILINGUAL_V3",
      model,
      deliveryProfile,
      version: "1.0",
      status: "GENERATED",
      approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING",
      humanPronunciationReview: "HUMAN_REVIEW_PENDING",
      urlOrPath: job.audioPath,
      outputPath: job.audioPath,
      masterAudioPath: job.masterAudioPath,
      contentHash: processedAudio.audioSha256,
      masterContentHash: processedAudio.masterSha256,
      cacheKey: raw.cacheKey,
      qcStatus: "PASS",
      qc: { pass: true, master: processedAudio.masterQc, optimized: processedAudio.mp3Qc, onset: processedAudio.onsetQc },
      usedByItems: job.usedByItems,
      generatedAt: new Date().toISOString(),
      provenance: { feature: pronunciationHotfix ? "DUDUQ_SMART_SENTENCE_QA_ACCESS_EN_PRONUNCIATION_V11_3V" : "DUDUQ_SMART_SENTENCE_COMPLETE_AUDIO_FEEDBACK_V11_3U", exactTextHash: sha(`${job.locale}|${job.text}`) }
    };
    const registryIndex = registry.entries.findIndex(entry => entry.audioId === job.audioId);
    if (registryIndex >= 0) registry.entries[registryIndex] = registryEntry;
    else registry.entries.push(registryEntry);
    reusable.set(`${job.locale}|${normalize(job.text)}`, runtimeEntry);
    const statusJob = status.jobs.find(row => row.audioId === job.audioId);
    Object.assign(statusJob, { status: "GENERATED_QC_PASS", audioPath: job.audioPath, durationSeconds: processedAudio.mp3Qc?.durationSeconds, contentHash: processedAudio.audioSha256 });
  }
  runtimeManifest.updatedAt = new Date().toISOString();
  registry.updatedAt = new Date().toISOString();
  await Promise.all([saveJson(runtimeManifestPath, runtimeManifest), saveJson(registryPath, registry)]);
}

for (const request of requests) {
  const entry = reusable.get(`${request.locale}|${normalize(request.text)}`) || exactRuntimeEntry(request);
  if (!entry || !await exists(absolute(entry.audioPath))) throw new Error(`SMART_SENTENCE_COMPLETE_AUDIO_NOT_BOUND:${request.locale}:${request.text}`);
}
status.status = "PASS";
status.generatedQcPass = jobs.length;
status.audioValid = `${requests.length}/${requests.length}`;
status.humanPronunciation = "PENDING";
status.updatedAt = new Date().toISOString();
await saveJson(statusPath, status);
console.log(JSON.stringify({ status: "PASS", completeItems: completeItems.length, imageClueItems: imageItems.length,
  requests: requests.length, reused: requests.length - jobs.length, generatedQcPass: jobs.length,
  humanPronunciation: "PENDING", statusPath }, null, 2));

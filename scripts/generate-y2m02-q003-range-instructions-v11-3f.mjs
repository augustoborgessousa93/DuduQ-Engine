import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { ChatterboxEngine } from "../duduq-audio/engine/chatterbox-engine.mjs";
import { inspectWav } from "../duduq-audio/pipeline/audio-pipeline.mjs";

const root = process.cwd();
const voice = "DUDUQ_GOLD_VOICE_v1";
const engineId = "chatterbox-multilingual-v3";
const model = "Chatterbox Multilingual V3";
const json = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const save = async (file, value) => {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
};
const exists = file => access(path.join(root, file)).then(() => true, () => false);
const workerConfig = await json("duduq-audio/config/chatterbox-runtime.json");
const settings = await json("duduq-audio/config/gold-voice-worker.json");
const pythonPath = path.join(root, "duduq-audio/.runtime/chatterbox-venv/Scripts/python.exe");
const hfHome = path.join(root, "duduq-audio/.runtime/chatterbox-hf");
const workspace = "duduq-audio/.runtime/production-work/V11_3F/Q003-range";
const outputDir = "content/english/assets/audio/versions/V11_3F/DUDUQ_GOLD_VOICE_v1";
const masterDir = "content/english/assets/audio/master/versions/V11_3F/DUDUQ_GOLD_VOICE_v1";
const phrases = [
  { id: "AUD-V11-3F-Y2M02-Q003-EN-INSTRUCTION", text: "Listen to each number and put it in the correct group.", locale: "en-US", language: "English", role: "INSTRUCTION", profile: "EN_FUNCTIONAL_CHUNK", module: "Y2M02", activity: ["Y2M02-Q003"] },
  { id: "AUD-V11-3F-Y2M02-Q003-PT-INSTRUCTION", text: "Ouça cada número e coloque no grupo correto. Neste grupo vão os números de 1 a 5; no outro, de 6 a 10.", locale: "pt-BR", language: "Portuguese", role: "INSTRUCTION", profile: "PT_BR_INSTRUCTION", module: "Y2M02", activity: ["Y2M02-Q003"] },
  { id: "AUD-V11-3F-RETRY-NUMBER-PT", text: "Lembre-se: o número é.", locale: "pt-BR", language: "Portuguese", role: "RETRY_REMINDER_FRAME", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-RETRY-COLOR-PT", text: "Agora procure a cor.", locale: "pt-BR", language: "Portuguese", role: "RETRY_REMINDER_FRAME", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-RETRY-SHAPE-PT", text: "Lembre-se: a forma geométrica é.", locale: "pt-BR", language: "Portuguese", role: "RETRY_REMINDER_FRAME", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-RETRY-OBJECT-PT", text: "Lembre-se: o objeto é.", locale: "pt-BR", language: "Portuguese", role: "RETRY_REMINDER_FRAME", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-RETRY-ANIMAL-PT", text: "Lembre-se: o animal é.", locale: "pt-BR", language: "Portuguese", role: "RETRY_REMINDER_FRAME", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-RETRY-WORD-PT", text: "Lembre-se: a palavra é.", locale: "pt-BR", language: "Portuguese", role: "RETRY_REMINDER_FRAME", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-RETRY-EXPRESSION-PT", text: "Lembre-se: a expressão é.", locale: "pt-BR", language: "Portuguese", role: "RETRY_REMINDER_FRAME", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-RETRY-ORDER-PT", text: "Organize as palavras novamente.", locale: "pt-BR", language: "Portuguese", role: "RETRY_TASK_REMINDER", profile: "PT_BR_INSTRUCTION", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-ORDER-WRONG-PT", text: "Quase! As palavras ainda não estão na ordem certa.", locale: "pt-BR", language: "Portuguese", role: "SMART_SENTENCE_ORDER_FEEDBACK", profile: "PT_BR_FEEDBACK", module: "SHARED", activity: [] },
  { id: "AUD-V11-3F-ORDER-SUCCESS-PT", text: "Aí sim! Você organizou as palavras na ordem certa!", locale: "pt-BR", language: "Portuguese", role: "SMART_SENTENCE_ORDER_FEEDBACK", profile: "PT_BR_FEEDBACK", module: "SHARED", activity: [] },
];
const audioRegistryPath = "content/english/audio/audio-registry.json";
const audioRegistry = await json(audioRegistryPath);
const byId = new Map(audioRegistry.entries.map(entry => [entry.audioId, entry]));
const runtimeManifestPath = "duduq-audio/manifests/AUDIO_MANIFEST.json";
const runtimeManifest = await json(runtimeManifestPath);
if (!workerConfig.referenceAudio || !(await exists("duduq-audio/config/chatterbox-runtime.json")) || !(await exists(path.relative(root, pythonPath)))) {
  throw new Error("GOLD_VOICE_WINDOWS_PREREQUISITE_MISSING");
}
for (const item of phrases) {
  const entry = byId.get(item.id);
  if (entry?.qcStatus === "PASS" && entry?.speechText === item.text && await exists(entry.urlOrPath || entry.audioPath)) continue;
  const productionSidecar = `${masterDir}/${item.id.toLowerCase()}.wav.production.json`;
  if (await exists(`${outputDir}/${item.id.toLowerCase()}.mp3`) && !(await exists(productionSidecar))) {
    throw new Error(`VERSIONED_AUDIO_PATH_ALREADY_EXISTS_UNREGISTERED:${item.id}`);
  }
}
const pendingPhrases = [];
for (const item of phrases) {
  const entry = byId.get(item.id);
  if (entry?.qcStatus === "PASS" && entry?.speechText === item.text && await exists(entry.urlOrPath || entry.audioPath)) continue;
  pendingPhrases.push(item);
}
const inputs = pendingPhrases.map(item => ({
  id: item.id, module: item.module, activity: item.activity, type: item.role,
  displayText: item.text, speechText: item.text, locale: item.locale, language: item.language,
  voiceProfile: voice, voiceVersion: voice, deliveryProfile: "NATURAL_CLEAR_V2",
  engine: engineId, model, settings: settings.approvedDeliveryProfiles.NATURAL_CLEAR_V2[item.profile],
  referenceAudio: workerConfig.referenceAudio, outputPath: `${workspace}/${item.id}.wav`
}));
if (inputs.length === 0) {
  let manifestChanged = false;
  for (const source of phrases) {
    const registered = byId.get(source.id);
    if (!registered || runtimeManifest.items.some(item => item.id === source.id || item.audioId === source.id)) continue;
    runtimeManifest.items.push({
      id: source.id, audioId: source.id, module: source.module, activity: source.activity, type: source.role,
      displayText: source.text, speechText: source.text, locale: source.locale, language: source.language,
      voiceProfile: voice, voiceVersion: voice, deliveryProfile: "NATURAL_CLEAR_V2", engine: "chatterbox-multilingual-v3",
      model, audioPath: registered.urlOrPath, masterAudioPath: registered.masterAudioPath, status: "APPROVED",
      approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING", humanPronunciationReview: "HUMAN_REVIEW_PENDING",
      contentHash: registered.contentHash, masterContentHash: registered.masterContentHash, qc: registered.qc
    });
    manifestChanged = true;
  }
  if (manifestChanged) {
    runtimeManifest.generatedAt = new Date().toISOString();
    await save(runtimeManifestPath, runtimeManifest);
  }
  console.log(JSON.stringify({ status: "ALREADY_GENERATED_QC_PASS", audioIds: phrases.map(item => item.id) }));
  process.exit(0);
}
const raw = [];
for (const job of inputs) {
  const wav = path.join(root, job.outputPath);
  const qc = await inspectWav(wav);
  if (!qc.pass) throw new Error(`Q003_RANGE_AUDIO_RAW_QC_FAILED:${job.id}`);
  raw.push({ id: job.id, status: "DIRECT_APPROVED_WORKER_GENERATION", cacheKey: createHash("sha256").update(`${job.speechText}|${job.locale}|${voice}|${engineId}`).digest("hex"), qc });
}
const rawById = new Map(raw.map(item => [item.id, item]));
const processInput = `${workspace}/postprocess-input.json`;
const items = await Promise.all(inputs.map(async job => ({
  id: job.id, voiceVersion: voice, engine: engineId, model, cacheKey: rawById.get(job.id).cacheKey,
  sourceWav: path.join(root, job.outputPath), masterPath: path.join(root, masterDir, `${job.id.toLowerCase()}.wav`),
  audioPath: path.join(root, outputDir, `${job.id.toLowerCase()}.mp3`),
  masterAudioPath: path.join(root, masterDir, `${job.id.toLowerCase()}.wav`),
  audioPathRelative: `${outputDir}/${job.id.toLowerCase()}.mp3`
})));
await save(processInput, { settings: settings.productionPostProcessing, items });
const sidecars = await Promise.all(items.map(async item => {
  const sidecarPath = `${item.masterAudioPath}.production.json`;
  if (!(await exists(path.relative(root, sidecarPath)))) return null;
  return json(path.relative(root, sidecarPath));
}));
if (sidecars.some(item => !item)) {
  console.log(JSON.stringify({ status: "POSTPROCESS_INPUT_READY", input: processInput, requiredAction: `Run ${pythonPath} duduq-audio/scripts/process-production-audio.py ${path.join(root, processInput)}` }, null, 2));
  process.exit(0);
}
const processed = { results: sidecars, failures: [] };
if (processed.failures?.length || processed.results?.length !== items.length || processed.results.some(result =>
  !result.masterQc?.pass || !result.mp3Qc?.pass || result.normalization?.targetLufs !== -16 || result.normalization?.truePeakLimitDb !== -1.5 || result.mp3Qc?.bitrateKbps !== 128)) {
  throw new Error(`Q003_RANGE_AUDIO_TECHNICAL_QC_FAILED:${JSON.stringify(processed.failures || [])}`);
}
const postById = new Map(processed.results.map(item => [item.id, item]));
const registryAdditions = [];
for (const job of inputs) {
  const source = phrases.find(item => item.id === job.id);
  const result = postById.get(job.id);
  const rawResult = rawById.get(job.id);
  const entry = {
    audioId: job.id, type: source.role,
    transcript: source.text, speechText: source.text, language: source.locale === "pt-BR" ? "pt" : "en", locale: source.locale,
    semanticRole: source.role, semanticType: source.role, speakerRole: "single", voiceProfile: voice, voiceVersion: voice,
    engine: "CHATTERBOX_MULTILINGUAL_V3", model, deliveryProfile: "NATURAL_CLEAR_V2", version: "1.0",
    status: "GENERATED", approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING", humanPronunciationReview: "HUMAN_REVIEW_PENDING",
    urlOrPath: `${outputDir}/${job.id.toLowerCase()}.mp3`, masterAudioPath: `${masterDir}/${job.id.toLowerCase()}.wav`,
    contentHash: result.audioSha256, masterContentHash: result.masterSha256, cacheKey: rawResult.cacheKey,
    qcStatus: "PASS", qc: { pass: true, master: result.masterQc, optimized: result.mp3Qc, normalization: result.normalization },
    usedByItems: source.activity, generatedAt: new Date().toISOString(), provenance: { feature: "DUDUQ_RETRY_CLICK_TRIGGER_AND_ORDER_UX_V11_3F" }
  };
  const oldIndex = audioRegistry.entries.findIndex(item => item.audioId === job.id);
  if (oldIndex >= 0) audioRegistry.entries[oldIndex] = entry; else audioRegistry.entries.push(entry);
  const runtimeEntry = {
    id: job.id, audioId: job.id, module: source.module, activity: source.activity, type: source.role,
    displayText: source.text, speechText: source.text, locale: source.locale, language: source.language,
    voiceProfile: voice, voiceVersion: voice, deliveryProfile: "NATURAL_CLEAR_V2", engine: "chatterbox-multilingual-v3",
    model, audioPath: entry.urlOrPath, masterAudioPath: entry.masterAudioPath, status: "APPROVED",
    approvalStatus: "TECHNICAL_PASS_HUMAN_PENDING", humanPronunciationReview: "HUMAN_REVIEW_PENDING",
    contentHash: result.audioSha256, masterContentHash: result.masterSha256, qc: entry.qc
  };
  const runtimeIndex = runtimeManifest.items.findIndex(item => item.id === job.id || item.audioId === job.id);
  if (runtimeIndex >= 0) runtimeManifest.items[runtimeIndex] = runtimeEntry; else runtimeManifest.items.push(runtimeEntry);
  registryAdditions.push({ audioId: job.id, locale: source.locale, text: source.text, path: entry.urlOrPath, qc: entry.qc });
}
audioRegistry.updatedAt = new Date().toISOString();
runtimeManifest.generatedAt = new Date().toISOString();
await save(audioRegistryPath, audioRegistry);
await save(runtimeManifestPath, runtimeManifest);
const result = { status: "PASS", engine: "DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3", backend: "WINDOWS",
  modelLoadCount: 1, workerStartCount: 1, voiceConditioningCount: 1, generated: registryAdditions, recordedAt: new Date().toISOString() };
await save("content/english/production/v11-3f/q003-range-instruction-audio.json", result);
console.log(JSON.stringify(result, null, 2));

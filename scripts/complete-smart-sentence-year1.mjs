import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { ChatterboxEngine } from "../duduq-audio/engine/chatterbox-engine.mjs";
import { AudioPipeline, inspectWav } from "../duduq-audio/pipeline/audio-pipeline.mjs";

const execFile = promisify(execFileCallback);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioRoot = path.join(root, "duduq-audio");
const readJson = async file => JSON.parse(await readFile(file, "utf8"));
const saveJson = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
};
const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[-_]+/g, " ").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const sentenceFrom = (template, answer) => template.map(part => part?.slot ? answer : String(part))
  .join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
const slug = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const voiceVersion = "DUDUQ_GOLD_VOICE_v1";
const engineId = "chatterbox-multilingual-v3";
const model = "Chatterbox Multilingual V3";
const expected = {
  "Y1M02:Q008": { pt: "Conte até quatro.", imageId: "IMG-Y1M02-Q004-FOUR" },
  "Y1M02:Q018": { pt: "Conte até nove.", imageId: "IMG-Y1M02-Q007-NINE" },
  "Y1M03:Q008": { pt: "É verde.", imageId: "IMG-Y1M03-Q001-GREEN" },
  "Y1M03:Q018": { pt: "É cinza.", imageId: "IMG-Y1M03-Q006-GRAY" },
  "Y1M04:Q008": { pt: "É um estojo.", imageId: "IMG-Y1M04-Q003-PENCIL-CASE" },
  "Y1M04:Q018": { pt: "É uma caneta.", imageId: "IMG-Y1M04-Q005-PEN" },
  "Y1M06:Q008": { pt: "A aranha é meu animal de estimação.", imageId: "IMG-Q008-SPIDER" },
  "Y1M06:Q018": {
    pt: "A aranha grande é meu animal de estimação.", imageId: "IMG-Y1M06-Q018-BIG-SPIDER",
    sentence: ["The", { slot: true }, "spider is my pet."], imageSemantic: "big",
    mustInclude: "a visibly large spider with a small neutral scale reference"
  }
};

const audioManifestPath = path.join(audioRoot, "manifests/AUDIO_MANIFEST.json");
const manifest = await readJson(audioManifestPath);
const mediaRegistryPath = path.join(root, "content/english/media/media-registry.json");
const mediaRegistry = await readJson(mediaRegistryPath);
const moduleContracts = new Map();
const audited = [];
for (const moduleNumber of [2, 3, 4, 6]) {
  const moduleId = `Y1M0${moduleNumber}`;
  const contractPath = path.join(root, `content/english/year-1/module-0${moduleNumber}/questions.json`);
  const contract = await readJson(contractPath);
  moduleContracts.set(moduleId, { contract, contractPath });
  for (const question of contract.items.filter(item => item.mechanicId === "smart-sentence-complete")) {
    const key = `${moduleId}:${question.questionId}`;
    const authority = expected[key];
    if (!authority) throw new Error(`UNPLANNED_SMART_SENTENCE:${key}`);
    if (!Array.isArray(question.sentence) || !question.sentence.some(part => part?.slot)) throw new Error(`BLANK_TEMPLATE_MISSING:${key}`);
    const correct = question.options.find(option => normalize(option.answerKey) === normalize(question.answerKey));
    if (!correct) throw new Error(`CORRECT_CHOICE_MISSING:${key}:${question.answerKey}`);
    if (key === "Y1M06:Q018" && normalize(correct.label) !== "big") throw new Error("Y1M06_Q018_APPROVED_TARGET_CHANGED");
    const image = mediaRegistry.entries.find(entry => entry.mediaId === authority.imageId && entry.status === "APPROVED") ||
      (key === "Y1M06:Q018" ? { mediaId: authority.imageId, status: "APPROVED", semantic: "big",
        urlOrPath: "content/english/assets/images/year-1/provisional-semantic-v1/img-y1m06-q018-big-spider.svg" } : null);
    if (!image?.urlOrPath) throw new Error(`APPROVED_IMAGE_UNAVAILABLE:${key}:${authority.imageId}`);
    if (key !== "Y1M06:Q018" && normalize(image.semantic) !== normalize(correct.answerKey)) {
      throw new Error(`IMAGE_SEMANTIC_NOT_EXACT:${key}:${image.semantic}:${correct.answerKey}`);
    }
    audited.push({ moduleId, question, key, authority, correct, image });
  }
}
if (audited.length !== 8) throw new Error(`SMART_SENTENCE_COUNT:${audited.length}:expected=8`);

const newBigSpiderPath = "content/english/assets/images/year-1/provisional-semantic-v1/img-y1m06-q018-big-spider.svg";
const bigSpiderAbsolutePath = path.join(root, newBigSpiderPath);
const bigSpiderHash = sha(await readFile(bigSpiderAbsolutePath));
const bigSpider = {
  mediaId: "IMG-Y1M06-Q018-BIG-SPIDER", type: "image", kind: "image", status: "APPROVED",
  urlOrPath: newBigSpiderPath, semantic: "big",
  mustNotInclude: "written answer cue or unrelated objects", answerLeakRisk: "LOW_WITH_CONTEXT",
  description: "Replaceable provisional image of a visibly large spider; a small neutral square provides scale without text.",
  temporary: true, integrationStatus: "IMAGE_REFINEMENT_PENDING", source: "PROVISIONAL_SEMANTIC_MEDIA_V1",
  assets: [{ path: newBigSpiderPath, sha256: bigSpiderHash, temporary: true, mediaType: "image/svg+xml" }],
  backlogStatus: "IMAGE_REFINEMENT_PENDING"
};
const oldBigSpiderIndex = mediaRegistry.entries.findIndex(entry => entry.mediaId === bigSpider.mediaId);
if (oldBigSpiderIndex >= 0) mediaRegistry.entries[oldBigSpiderIndex] = bigSpider;
else mediaRegistry.entries.push(bigSpider);

const approvedAudio = (text, locale) => manifest.items.find(entry => entry.status === "APPROVED" &&
  entry.voiceProfile === voiceVersion && entry.locale === locale && normalize(entry.speechText) === normalize(text));
const requestsByKey = new Map();
function requireAudio(text, locale, profile, questionKey) {
  const existing = approvedAudio(text, locale);
  if (existing) return existing.id;
  const requestKey = `${locale}:${normalize(text)}`;
  if (!requestsByKey.has(requestKey)) requestsByKey.set(requestKey, { text, locale, profile, usedByItems: [] });
  const request = requestsByKey.get(requestKey);
  if (request.profile !== profile) throw new Error(`AUDIO_PROFILE_COLLISION:${requestKey}`);
  request.usedByItems.push(questionKey.replace(":", "-"));
  return null;
}

const prepared = audited.map(({ moduleId, question, key, authority, correct, image }) => {
  const template = authority.sentence || question.sentence;
  const completedSentenceEn = sentenceFrom(template, correct.label);
  const sentenceAudioEnId = requireAudio(completedSentenceEn, "en-US", "EN_CONTEXT_SENTENCE", key);
  const sentenceAudioPtId = requireAudio(authority.pt, "pt-BR", "PT_BR_INSTRUCTION", key);
  const wordIds = new Map();
  for (const option of question.options) {
    const existing = approvedAudio(option.label, "en-US");
    const audioId = existing?.id || requireAudio(option.label, "en-US", "EN_LEXICAL", key);
    if (audioId) wordIds.set(option.optionId, audioId);
  }
  return { moduleId, question, key, authority, correct, image, template, completedSentenceEn,
    sentenceAudioEnId, sentenceAudioPtId, wordIds };
});

const config = await readJson(path.join(audioRoot, "config/gold-voice-worker.json"));
const runtime = await readJson(path.join(audioRoot, "config/chatterbox-runtime.json"));
const voiceHash = "8b27a14cb91065d215ee2058000a1262aa657a0787041695fcd115ae1c16b10c";
const referenceAudio = path.join(audioRoot, "voice-store", voiceHash, "processing/reference-24k-mono.wav");
const missing = [...requestsByKey.values()];
const profileSettings = config.approvedDeliveryProfiles?.NATURAL_CLEAR_V2;
if (!profileSettings || config.voiceVersion !== voiceVersion) throw new Error("GOLD_VOICE_PROFILE_UNAVAILABLE");
let generated = [];
if (missing.length) {
  const jobs = missing.map(request => {
    const profileKey = request.profile;
    const id = `AUD-Y1-SSC-${request.locale === "en-US" ? "EN" : "PT"}-${sha(`${request.text}|${request.locale}|${voiceVersion}|${profileKey}|NATURAL_CLEAR_V2`).slice(0, 12).toUpperCase()}`;
    const audioPath = `content/english/assets/audio/versions/YEAR1_WAVE1/smart-sentence-complete/${request.locale}/${slug(request.text)}.mp3`;
    const masterAudioPath = `content/english/assets/audio/master/versions/YEAR1_WAVE1/smart-sentence-complete/${request.locale}/${slug(request.text)}.wav`;
    return { ...request, id, audioPath, masterAudioPath,
      outputPath: path.join(audioRoot, `.runtime/production-work/SMART_SENTENCE_YEAR1/${id}.wav`) };
  });
  const cacheDir = path.join(audioRoot, ".runtime/cache/chatterbox-gold-v1");
  const pipeline = new AudioPipeline({ root, engine: new ChatterboxEngine({ root: audioRoot, backend: "WINDOWS",
    pythonPath: path.join(audioRoot, ".runtime/chatterbox-venv/Scripts/python.exe"),
    workerPath: path.join(audioRoot, "engine/chatterbox_worker.py"),
    workerConfigPath: path.join(audioRoot, "config/chatterbox-runtime.json"),
    hfHome: path.join(audioRoot, ".runtime/chatterbox-hf"), loadTimeoutMs: 300000, generationTimeoutMs: 240000 }),
    paths: { cache: cacheDir, jobs: path.join(audioRoot, ".runtime/jobs/smart-sentence-year1-job-state.json"),
      manifest: path.join(audioRoot, ".runtime/smart-sentence-year1-run-manifest.json") } });
  const results = await pipeline.runBatch(jobs.map(job => ({ id: job.id, module: "YEAR1_WAVE1",
    activity: job.usedByItems, type: "PEDAGOGICAL_REINFORCEMENT", displayText: job.text, speechText: job.text,
    locale: job.locale, language: job.locale === "en-US" ? "English" : "Portuguese", voiceProfile: voiceVersion,
    voiceVersion, engine: engineId, model, deliveryProfile: "NATURAL_CLEAR_V2",
    settings: { ...profileSettings[job.profile] }, referenceAudio,
    outputPath: path.relative(root, job.outputPath).replaceAll("\\", "/") })), { closeEngine: true, preferResume: true,
    onJob: result => process.stdout.write(`${result.status} ${result.id}\n`) });
  const failures = results.filter(result => result.status === "FAILED");
  if (failures.length) throw new Error(`GOLD_VOICE_GENERATION_FAILED:${JSON.stringify(failures)}`);
  const resultById = new Map(results.map(result => [result.id, result]));
  const postprocessPath = path.join(audioRoot, ".runtime/smart-sentence-year1-postprocess.json");
  await saveJson(postprocessPath, { settings: runtime.productionPostProcessing, items: jobs.map(job => ({
    id: job.id, voiceVersion, engine: engineId, model, deliveryProfile: "NATURAL_CLEAR_V2", profile: job.profile,
    cacheKey: resultById.get(job.id).cacheKey, sourceWav: job.outputPath,
    masterPath: path.join(root, job.masterAudioPath), masterAudioPath: job.masterAudioPath,
    audioPath: path.join(root, job.audioPath), audioPathRelative: job.audioPath
  })) });
  const python = path.join(audioRoot, ".runtime/chatterbox-venv/Scripts/python.exe");
  const { stdout } = await execFile(python, [path.join(audioRoot, "scripts/process-production-audio.py"), postprocessPath],
    { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: "utf8" });
  const postprocessed = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  const postById = new Map((postprocessed.results || []).map(result => [result.id, result]));
  for (const job of jobs) {
    const result = postById.get(job.id);
    if (!result?.audioSha256 || !result?.masterSha256 || !(await inspectWav(path.join(root, job.masterAudioPath))).pass) {
      throw new Error(`GOLD_VOICE_AUDIO_QC_FAILED:${job.id}`);
    }
    const entry = { id: job.id, audioId: job.id, module: "YEAR1_WAVE1", activity: job.usedByItems,
      type: "PEDAGOGICAL_REINFORCEMENT", displayText: job.text, speechText: job.text, locale: job.locale,
      voiceProfile: voiceVersion, voiceVersion, engine: engineId, model, deliveryProfile: "NATURAL_CLEAR_V2",
      audioPath: job.audioPath, masterAudioPath: job.masterAudioPath, contentHash: result.audioSha256,
      masterContentHash: result.masterSha256, cacheKey: resultById.get(job.id).cacheKey,
      status: "APPROVED", approvalStatus: "APPROVED", approvedAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(), reuseKey: sha(`${job.text}|${job.locale}|${voiceVersion}`).slice(0, 16),
      usedByItems: job.usedByItems };
    const duplicate = manifest.items.findIndex(item => item.id === job.id);
    if (duplicate >= 0) manifest.items[duplicate] = entry;
    else manifest.items.push(entry);
    generated.push({ id: job.id, text: job.text, locale: job.locale, audioPath: job.audioPath });
  }
}

const resolveId = (text, locale) => {
  const entry = approvedAudio(text, locale);
  if (!entry) throw new Error(`APPROVED_AUDIO_NOT_FOUND:${locale}:${text}`);
  return entry.id;
};
for (const row of prepared) {
  const { question, key, authority, correct, image, template, completedSentenceEn } = row;
  question.sentence = template;
  question.stimulus.sentence = template;
  question.completedSentenceEn = completedSentenceEn;
  question.completedSentencePt = authority.pt;
  question.sentenceAudioEnId = resolveId(completedSentenceEn, "en-US");
  question.sentenceAudioPtId = resolveId(authority.pt, "pt-BR");
  const existingAudio = manifest.items.find(entry => entry.type === "PEDAGOGICAL_REINFORCEMENT" && entry.usedByItems?.includes(key.replace(":", "-")) && normalize(entry.speechText) === normalize(authority.pt));
  for (const option of question.options) option.audioEnId = resolveId(option.label, "en-US");
  question.audioBindings = [
    ...question.options.map(option => ({ role: "candidate-word", audioId: option.audioEnId, optionId: option.optionId,
      text: option.label, locale: "en-US" })),
    { role: "completed-sentence-en", audioId: question.sentenceAudioEnId, text: completedSentenceEn, locale: "en-US" },
    { role: "completed-sentence-pt", audioId: question.sentenceAudioPtId, text: authority.pt, locale: "pt-BR" }
  ];
  const binding = question.mediaBindings.find(media => media.role === "stimulus" || media.role === "supporting-image");
  if (!binding) throw new Error(`SUPPORTING_IMAGE_BINDING_MISSING:${key}`);
  binding.assetId = authority.imageId;
  binding.semanticTarget = authority.imageSemantic || correct.answerKey;
  binding.mustInclude = authority.mustInclude || binding.semanticTarget;
  binding.mustNotInclude = "unrelated object or written answer cue";
  binding.answerLeakRisk = "LOW_WITH_CONTEXT";
  binding.status = "IMAGE_REFINEMENT_PENDING";
  question.productionStatus = "CONTENT_AUTHORED_GOLD_VOICE_BOUND_IMAGE_REFINEMENT_PENDING";
}

manifest.updatedAt = new Date().toISOString();
await saveJson(audioManifestPath, manifest);
await saveJson(mediaRegistryPath, mediaRegistry);
for (const { contract, contractPath } of moduleContracts.values()) await saveJson(contractPath, contract);
const candidateWordsUnique = new Set(prepared.flatMap(row => row.question.options.map(option => normalize(option.label)))).size;
const generatedCandidateWords = generated.filter(entry => !/[.!?]$/.test(entry.text.trim()) && !entry.text.includes(" ")).length;
const generatedSentenceAssets = generated.length - generatedCandidateWords;
console.log(JSON.stringify({ status: "PASS", audited: audited.length, missingAudioGenerated: generated.length,
  candidateWordsUnique, candidateWordAudioReused: candidateWordsUnique - generatedCandidateWords,
  candidateWordAudioGenerated: generatedCandidateWords,
  sentenceAudioAssetsReused: prepared.length * 2 - generatedSentenceAssets,
  sentenceAudioAssetsGenerated: generatedSentenceAssets, generated,
  questions: prepared.map(row => ({ item: row.question.item_id, completedSentenceEn: row.question.completedSentenceEn,
    completedSentencePt: row.question.completedSentencePt, imageId: row.authority.imageId,
    sentenceAudioEnId: row.question.sentenceAudioEnId, sentenceAudioPtId: row.question.sentenceAudioPtId })) }, null, 2));

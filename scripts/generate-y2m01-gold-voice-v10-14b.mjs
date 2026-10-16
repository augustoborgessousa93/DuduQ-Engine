import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { ChatterboxEngine } from '../duduq-audio/engine/chatterbox-engine.mjs';
import { AudioPipeline, sha256File } from '../duduq-audio/pipeline/audio-pipeline.mjs';

const execFile = promisify(execFileCallback);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioRoot = path.join(root, 'duduq-audio');
const rel = value => path.relative(root, value).split(path.sep).join('/');
const readJson = async value => JSON.parse(await readFile(path.join(root, value), 'utf8'));
const saveJson = async (value, document) => {
  const file = path.join(root, value);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await rename(temp, file);
};
const fileExists = async value => stat(value).then(() => true, () => false);
const ids = [
  'AUD-PT-LETTER-CUE-EARLY-Y2',
  'AUD-Y2M01-Q004-RANGE-INSTRUCTION-EN', 'AUD-Y2M01-Q004-RANGE-INSTRUCTION-PT',
  'AUD-Y2M01-Q010-RANGE-INSTRUCTION-EN', 'AUD-Y2M01-Q010-RANGE-INSTRUCTION-PT',
  'AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-EN', 'AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-PT',
  'AUD-Y2M01-Q019-AUDIO-GROUP-INSTRUCTION-EN', 'AUD-Y2M01-Q019-AUDIO-GROUP-INSTRUCTION-PT'
];
const voiceVersion = 'DUDUQ_GOLD_VOICE_v1';
const engineId = 'chatterbox-multilingual-v3';
const modelName = 'Chatterbox Multilingual V3';
const deliveryProfile = 'NATURAL_CLEAR_V2';
const requestPath = 'duduq-audio/manifests/y2m01-production-audio-requests.json';
const audioManifestPath = 'duduq-audio/manifests/AUDIO_MANIFEST.json';
const registryPath = 'content/english/audio/audio-registry.json';
const generationPath = 'content/english/audio/audio-generation-manifest.json';
const questionPath = 'content/english/year-2/module-01/questions.json';
const reportPath = 'duduq-audio/reports/runtime/y2m01-gold-voice-v10-14b.json';
const requestDoc = await readJson(requestPath);
const requests = requestDoc.entries.filter(item => ids.includes(item.id));
if (requests.length !== ids.length || ids.some(id => !requests.some(item => item.id === id))) {
  throw new Error('V10_14B_REQUEST_SET_MISMATCH');
}
const approvedSpeech = {
  'AUD-PT-LETTER-CUE-EARLY-Y2': { displayText: 'A letra é...', speechText: 'A letra é' },
  'AUD-Y2M01-Q004-RANGE-INSTRUCTION-EN': { displayText: 'Listen and sort: A to C or D to E.', speechText: 'Listen and sort. Letters A to C go in the first group. Letters D to E go in the second group.' },
  'AUD-Y2M01-Q004-RANGE-INSTRUCTION-PT': { displayText: 'Ouça cada letra e coloque no grupo correto: A até C ou D até E.', speechText: 'Ouça cada letra e coloque no grupo correto. No primeiro grupo vão as letras de A até C. No segundo, as letras de D até E.' },
  'AUD-Y2M01-Q010-RANGE-INSTRUCTION-EN': { displayText: 'Listen and sort: A to E or F to J.', speechText: 'Listen and sort. Letters A to E go in the first group. Letters F to J go in the second group.' },
  'AUD-Y2M01-Q010-RANGE-INSTRUCTION-PT': { displayText: 'Ouça cada letra e coloque no grupo correto: A até E ou F até J.', speechText: 'Ouça cada letra e coloque no grupo correto. No primeiro grupo vão as letras de A até E. No segundo, as letras de F até J.' },
  'AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-EN': { displayText: 'Listen and shoot the spelled name.', speechText: 'Listen to the letter names and shoot the matching name card.' },
  'AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-PT': { displayText: 'Ouça e acerte o nome soletrado.', speechText: 'Ouça os nomes das letras em inglês e escolha a figura com o nome correspondente.' },
  'AUD-Y2M01-Q019-AUDIO-GROUP-INSTRUCTION-EN': { displayText: 'Listen and sort each phrase.', speechText: 'Listen to each phrase and sort it into greetings or farewells.' },
  'AUD-Y2M01-Q019-AUDIO-GROUP-INSTRUCTION-PT': { displayText: 'Ouça cada frase e organize no grupo certo.', speechText: 'Ouça cada frase e coloque no grupo certo: cumprimentos ou despedidas.' }
};
for (const item of requests) Object.assign(item, approvedSpeech[item.id]);
const questions = await readJson(questionPath);
const qItems = questions.items ?? questions.questions ?? [];
const contractBindings = new Map();
for (const item of requests.filter(item => item.module === 'Y2M01')) {
  const question = qItems.find(candidate => (candidate.item_id ?? candidate.itemId ?? candidate.id) === item.activity?.[0]);
  if (!question) throw new Error(`QUESTION_NOT_FOUND:${item.activity?.[0]}`);
  const field = item.locale === 'en-US' ? 'instructionAudioEnId' : 'instructionAudioPtId';
  if (!question.instruction || !(field in question.instruction)) throw new Error(`INSTRUCTION_AUDIO_FIELD_MISSING:${item.activity?.[0]}:${field}`);
  contractBindings.set(item.id, { question, field });
}
const audioDoc = await readJson(audioManifestPath);
const registry = await readJson(registryPath);
const generation = await readJson(generationPath);
for (const id of ids) {
  for (const [label, list, key] of [['AUDIO_MANIFEST', audioDoc.items, 'id'], ['AUDIO_REGISTRY', registry.entries, 'audioId'], ['GENERATION_MANIFEST', generation.entries, 'audioId']]) {
    if (list.some(item => item[key] === id)) throw new Error(`AUDIO_ID_ALREADY_REGISTERED:${label}:${id}`);
  }
}

const gold = await readJson('duduq-audio/config/gold-voice-worker.json');
const runtime = await readJson('duduq-audio/config/chatterbox-runtime.json');
if (runtime.voiceVersion !== voiceVersion || runtime.device !== 'cpu' || !runtime.referenceAudio ||
    await sha256File(runtime.referenceAudio) !== 'de8a2962c8b0da2af1a0a7360a7d741053195c2870d443d5c45897a583035c4c') {
  throw new Error('APPROVED_GOLD_VOICE_REFERENCE_OR_RUNTIME_MISMATCH');
}
const processingSettings = gold.productionPostProcessing;
if (processingSettings.targetLufs !== -16 || processingSettings.truePeakDb !== -1.5 ||
    processingSettings.leadingPaddingMs !== 120 || !processingSettings.requireOnsetSafetyMargin) {
  throw new Error('APPROVED_GOLD_VOICE_POSTPROCESS_SETTINGS_MISSING');
}
const settingsFor = item => {
  if (item.id === 'AUD-PT-LETTER-CUE-EARLY-Y2' || item.locale === 'pt-BR') {
    return gold.approvedDeliveryProfiles?.[deliveryProfile]?.PT_BR_INSTRUCTION;
  }
  return gold.approvedDeliveryProfiles?.[deliveryProfile]?.EN_CONTEXT_SENTENCE;
};
const workDir = path.join(audioRoot, '.runtime/production-work/Y2M01-V10-14B');
const cacheDir = path.join(audioRoot, '.runtime/cache/chatterbox-gold-v1-NATURAL_CLEAR_V2-y2m01-v10-14b');
const jobsPath = path.join(audioRoot, '.runtime/jobs/chatterbox-y2m01-v10-14b-jobs.json');
const tempManifest = path.join(audioRoot, '.runtime/y2m01-v10-14b-generation-run.json');
const masterBase = 'content/english/assets/audio/master/versions/YEAR2/NATURAL_CLEAR_V2';
const mp3Base = 'content/english/assets/audio/versions/YEAR2/NATURAL_CLEAR_V2';
const inputs = requests.map(item => {
  const locale = item.locale;
  const language = item.language;
  const profile = settingsFor(item);
  if (!profile) throw new Error(`APPROVED_DELIVERY_PROFILE_MISSING:${item.id}`);
  const extension = item.id.toLowerCase();
  const outputPath = path.join(workDir, `${extension}.wav`);
  const audioPath = `${mp3Base}/${locale}/${extension}.mp3`;
  const masterAudioPath = `${masterBase}/${locale}/${extension}.wav`;
  return { ...item, locale, language, voiceProfile: voiceVersion, voiceVersion, engine: engineId, model: modelName,
    deliveryProfile, settings: profile, referenceAudio: runtime.referenceAudio, outputPath: rel(outputPath),
    plannedAudioPath: audioPath, plannedMasterAudioPath: masterAudioPath };
});
for (const item of inputs) {
  if (await fileExists(path.join(root, item.plannedAudioPath)) || await fileExists(path.join(root, item.plannedMasterAudioPath))) {
    throw new Error(`REFUSE_OVERWRITE_EXISTING_AUDIO:${item.id}`);
  }
}
for (const item of inputs.filter(item => item.module === 'Y2M01')) {
  const binding = contractBindings.get(item.id);
  if (!binding) throw new Error(`INSTRUCTION_BINDING_NOT_FOUND:${item.id}`);
  binding.question.instruction[binding.field] = item.id;
  const instruction = binding.question.instruction;
  instruction.instructionAudioEnId = inputs.find(candidate => candidate.activity?.[0] === item.activity?.[0] && candidate.locale === 'en-US')?.id ?? instruction.instructionAudioEnId;
  instruction.instructionAudioPtId = inputs.find(candidate => candidate.activity?.[0] === item.activity?.[0] && candidate.locale === 'pt-BR')?.id ?? instruction.instructionAudioPtId;
  instruction.audioOrder = ['en', 'pt'];
  instruction.instructionAudioStatus = 'TECHNICAL_PASS_HUMAN_PRONUNCIATION_PENDING';
  delete instruction.audioGenerationBlocker;
}
questions.updatedAt = new Date().toISOString();

const engine = new ChatterboxEngine({ root: audioRoot, pythonPath: path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe'),
  workerPath: path.join(audioRoot, 'engine/chatterbox_worker.py'), workerConfigPath: path.join(audioRoot, 'config/chatterbox-runtime.json'),
  hfHome: path.join(audioRoot, '.runtime/chatterbox-hf'), loadTimeoutMs: 300000, generationTimeoutMs: 240000, backend: 'WSL' });
const pipeline = new AudioPipeline({ root, engine, paths: { cache: cacheDir, jobs: jobsPath, manifest: tempManifest }, maxRetries: 1 });
const startedAt = new Date().toISOString();
const events = [];
let batch;
try {
  await engine.start();
  batch = await pipeline.runBatch(inputs.map(item => ({ ...item, outputPath: path.join(root, item.outputPath) })), {
    closeEngine: false, preferResume: false,
    onJob: result => { events.push(result); process.stdout.write(`${result.status}${result.cache ? '_CACHE' : ''} ${result.id}\n`); }
  });
  if (batch.length !== ids.length || batch.some(result => result.status !== 'DONE' || !result.qc?.pass)) {
    throw new Error('Y2M01_V10_14B_GOLD_VOICE_WAV_QC_FAILED');
  }
} catch (error) {
  await saveJson(reportPath, { status: 'ISSUE', startedAt, error: error.message, events });
  throw error;
} finally {
  await engine.close();
}

const wslPath = async value => (await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', 'wslpath', '-a', String(value).replaceAll('\\', '/')], { windowsHide: true })).stdout.trim();
const processedInputPath = path.join(audioRoot, '.runtime/y2m01-v10-14b-postprocess.json');
const processingItems = inputs.map(item => {
  const result = batch.find(candidate => candidate.id === item.id);
  const id = item.id.toLowerCase();
  return { id: item.id, voiceVersion, engine: engineId, model: modelName, deliveryProfile, cacheKey: result.cacheKey,
    sourceWav: path.resolve(root, result.output), masterPath: path.resolve(root, item.plannedMasterAudioPath),
    audioPath: path.resolve(root, item.plannedAudioPath), masterAudioPath: item.plannedMasterAudioPath,
    audioPathRelative: item.plannedAudioPath, _id: id };
});
const wslItems = await Promise.all(processingItems.map(async item => ({ ...item,
  sourceWav: await wslPath(item.sourceWav), masterPath: await wslPath(item.masterPath), audioPath: await wslPath(item.audioPath) })));
await saveJson(rel(processedInputPath), { settings: processingSettings, items: wslItems });
const wslPython = '/home/augus/.duduq/chatterbox-venv/bin/python';
const wslHelper = await wslPath(path.join(audioRoot, 'scripts/process-production-audio.py'));
const wslInput = await wslPath(processedInputPath);
const processedRaw = await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', wslPython, wslHelper, wslInput], {
  windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8'
});
const processed = JSON.parse(processedRaw.stdout.trim().split(/\r?\n/).at(-1));
if (processed.failures?.length || processed.results?.length !== ids.length || processed.results.some(result =>
  !result.masterQc?.pass || !result.mp3Qc?.pass || !result.onsetQc?.pass || result.normalization?.targetLufs !== -16 ||
  result.normalization?.truePeakLimitDb !== -1.5 || result.mp3Qc?.bitrateKbps !== 128)) {
  throw new Error(`Y2M01_V10_14B_AUDIO_PRODUCTION_QC_FAILED:${JSON.stringify(processed.failures ?? [])}`);
}

const resultById = new Map(processed.results.map(result => [result.id, result]));
const jobById = new Map(batch.map(result => [result.id, result]));
const now = new Date().toISOString();
for (const item of inputs) {
  const result = resultById.get(item.id);
  const job = jobById.get(item.id);
  const info = {
    id: item.id, audioId: item.id, module: item.module, activity: item.activity, type: item.id === ids[0] ? 'LETTER_AUDIO_CUE' : 'INSTRUCTION_AUDIO',
    displayText: item.displayText, speechText: item.speechText, locale: item.locale, language: item.language,
    voiceProfile: voiceVersion, voiceVersion, engine: engineId, model: modelName, deliveryProfile,
    audioPath: item.plannedAudioPath, masterAudioPath: item.plannedMasterAudioPath, status: 'APPROVED',
    approvalStatus: 'APPROVED_TECHNICAL_QC_HUMAN_PRONUNCIATION_PENDING', humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING',
    cache: Boolean(job.cache), cacheKey: job.cacheKey, contentHash: result.audioSha256, masterContentHash: result.masterSha256,
    duration: result.mp3Qc.durationSeconds, qcStatus: 'PASS', qc: { pass: true, master: result.masterQc, optimized: result.mp3Qc,
      onset: result.onsetQc, normalization: result.normalization }, generatedAt: now, runtimeVersion: 'DUDUQ_AUDIO_RUNTIME_v1'
  };
  audioDoc.items.push(info);
  const dedupeKey = createHash('sha256').update(`${item.speechText}|${item.locale}|${voiceVersion}|${engineId}|${deliveryProfile}`).digest('hex');
  registry.entries.push({ audioId: item.id, type: item.id === ids[0] ? 'learner-content-cue' : 'instruction', transcript: item.displayText,
    speechText: item.speechText, language: item.locale, locale: item.locale, speakerRole: 'single', voiceProfile: voiceVersion,
    prosodyProfile: deliveryProfile, voiceVersion, engine: engineId, model: modelName, deliveryProfile, status: 'APPROVED',
    approvalStatus: info.approvalStatus, humanPronunciationReview: info.humanPronunciationReview, urlOrPath: item.plannedAudioPath,
    outputPath: item.plannedAudioPath, masterAudioPath: item.plannedMasterAudioPath, filename: path.posix.basename(item.plannedAudioPath),
    version: '1.0', dedupeKey, contentHash: result.audioSha256, sha256: result.audioSha256, masterContentHash: result.masterSha256,
    cacheKey: job.cacheKey, qcStatus: 'PASS', qc: info.qc, usedByItems: item.activity, reuseScope: item.id === ids[0] ? 'SHARED_EARLY_YEARS_LETTER_AUDIO' : 'ITEM_INSTRUCTION' });
  generation.entries.push({ audioId: item.id, category: item.id === ids[0] ? 'LEARNER_CONTENT_CUE' : 'INSTRUCTION',
    type: info.type, transcript: item.displayText, speechText: item.speechText, displayText: item.displayText, locale: item.locale,
    language: item.language, voiceProfile: voiceVersion, voiceVersion, engine: engineId, model: modelName, deliveryProfile,
    status: 'GENERATED', urlOrPath: item.plannedAudioPath, outputPath: item.plannedAudioPath, masterAudioPath: item.plannedMasterAudioPath,
    contentHash: result.audioSha256, masterContentHash: result.masterSha256, cacheKey: job.cacheKey, qcStatus: 'PASS', qc: info.qc,
    humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING', generatedAt: now, usedByItems: item.activity });
  const request = requestDoc.entries.find(entry => entry.id === item.id);
  request.status = 'GENERATED_TECHNICAL_PASS_HUMAN_PENDING';
  request.audioPath = item.plannedAudioPath;
  request.masterAudioPath = item.plannedMasterAudioPath;
  request.contentHash = result.audioSha256;
  request.qcStatus = 'PASS';
  request.humanPronunciationReview = 'TECHNICAL_PASS_HUMAN_PENDING';
  delete request.error;
}
audioDoc.updatedAt = registry.updatedAt = generation.updatedAt = requestDoc.updatedAt = now;
requestDoc.status = 'GOLD_VOICE_GENERATED_TECHNICAL_QC_PASS_HUMAN_PENDING';
requestDoc.lastGenerationAttempt = { status: 'PASS_TECHNICAL_QC_HUMAN_PENDING', startedAt, completedAt: now,
  engine: 'CHATTERBOX_MULTILINGUAL_V3', voiceVersion, generatedCount: ids.length, modelLoadCount: engine.loadInfo?.modelLoadCount ?? 1,
  voicePromptBuildCount: engine.loadInfo?.voicePromptBuildCount ?? 1, fallbackUsed: false };
await saveJson(audioManifestPath, audioDoc);
await saveJson(registryPath, registry);
await saveJson(generationPath, generation);
await saveJson(requestPath, requestDoc);
await saveJson(questionPath, questions);
await saveJson(reportPath, { status: 'PASS_TECHNICAL_QC_HUMAN_PENDING', startedAt, completedAt: now, voiceVersion,
  engine: 'CHATTERBOX_MULTILINGUAL_V3', deliveryProfile, inputCount: ids.length, generatedCount: batch.filter(item => !item.cache).length,
  cacheHits: batch.filter(item => item.cache).length, modelLoadCount: engine.loadInfo?.modelLoadCount ?? 1,
  voicePromptBuildCount: engine.loadInfo?.voicePromptBuildCount ?? 1, technicalQcPass: processed.results.length,
  humanPronunciationReview: 'PENDING', items: inputs.map(item => ({ id: item.id, audioPath: item.plannedAudioPath,
    masterAudioPath: item.plannedMasterAudioPath, duration: resultById.get(item.id).mp3Qc.durationSeconds,
    contentHash: resultById.get(item.id).audioSha256, qcStatus: 'PASS' })) });
console.log(JSON.stringify({ status: 'PASS_TECHNICAL_QC_HUMAN_PENDING', inputCount: ids.length,
  generatedCount: batch.filter(item => !item.cache).length, modelLoadCount: engine.loadInfo?.modelLoadCount ?? 1,
  voicePromptBuildCount: engine.loadInfo?.voicePromptBuildCount ?? 1, pronunciation: 'HUMAN_LISTENING_PENDING' }, null, 2));

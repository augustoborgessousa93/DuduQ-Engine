import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { ChatterboxEngine } from '../duduq-audio/engine/chatterbox-engine.mjs';
import { AudioPipeline, sha256File } from '../duduq-audio/pipeline/audio-pipeline.mjs';

const execFile = promisify(execFileCb);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioRoot = path.join(root, 'duduq-audio');
const json = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const save = async (relative, value) => writeFile(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const exists = async file => stat(file).then(value => value.isFile(), () => false);
const audioDocPath = 'duduq-audio/manifests/AUDIO_MANIFEST.json';
const registryPath = 'content/english/audio/audio-registry.json';
const generationPath = 'content/english/audio/audio-generation-manifest.json';
const questionsPath = 'content/english/year-1/module-01/questions.json';
const reportPath = 'duduq-audio/reports/runtime/y1m01-instruction-audio-v1.json';
const voiceVersion = 'DUDUQ_GOLD_VOICE_v1';
const engineId = 'chatterbox-multilingual-v3';
const modelName = 'Chatterbox Multilingual V3';
const deliveryProfile = 'NATURAL_CLEAR_V2';
const workerConfigPath = path.join(audioRoot, 'config/chatterbox-runtime.json');
const workerConfig = await json('duduq-audio/config/chatterbox-runtime.json');
const goldVoiceConfig = await json('duduq-audio/config/gold-voice-worker.json');
const audioDoc = await json(audioDocPath);
const registry = await json(registryPath);
const generation = await json(generationPath);
const questionDoc = await json(questionsPath);
const expectedVoiceHash = '8b27a14cb91065d215ee2058000a1262aa657a0787041695fcd115ae1c16b10c';
const referenceAudio = workerConfig.referenceAudio;
if (workerConfig.voiceVersion !== voiceVersion || workerConfig.device !== 'cpu' || !workerConfig.referenceAudio ||
    await sha256File(workerConfig.referenceAudio) !== 'de8a2962c8b0da2af1a0a7360a7d741053195c2870d443d5c45897a583035c4c') {
  throw new Error('APPROVED_GOLD_VOICE_REFERENCE_OR_RUNTIME_MISMATCH');
}
const originalItems = audioDoc.items.filter(item => item.module === 'Y1M01' && !String(item.type).includes('INSTRUCTION'));
if (originalItems.length !== 23) throw new Error(`ORIGINAL_AUDIO_CONTRACTS_EXPECTED_23:${originalItems.length}`);
const originalHashes = new Map();
for (const item of originalItems) for (const relative of [item.audioPath, item.masterAudioPath]) {
  if (!relative) continue;
  const full = path.join(root, relative);
  originalHashes.set(relative, await sha256File(full));
}
const questions = questionDoc.items;
if (questions.length !== 20 || questions.some(item => !item.instruction?.instructionAudioId || !item.instruction?.spokenText)) throw new Error('PEDAGOGICAL_INSTRUCTION_CONTRACTS_INCOMPLETE');
const generationSettings = goldVoiceConfig.approvedDeliveryProfiles?.[deliveryProfile]?.PT_BR_INSTRUCTION;
const processingSettings = goldVoiceConfig.productionPostProcessing;
if (!generationSettings || processingSettings?.targetLufs !== -16 || processingSettings?.truePeakDb !== -1.5 ||
    processingSettings?.leadingPaddingMs !== 120 || !processingSettings?.requireOnsetSafetyMargin) throw new Error('APPROVED_GOLD_VOICE_SETTINGS_MISSING');

const workDir = path.join(audioRoot, '.runtime/instruction-work/Y1M01');
const cacheDir = path.join(audioRoot, '.runtime/cache/chatterbox-gold-v1-NATURAL_CLEAR_V2-instructions');
const jobsPath = path.join(audioRoot, '.runtime/jobs/chatterbox-y1m01-instruction-v1-jobs.json');
const tempManifest = path.join(audioRoot, '.runtime/y1m01-instruction-generation-run.json');
const masterBase = 'content/english/assets/audio/master/versions/Y1M01/NATURAL_CLEAR_V2/instructions';
const mp3Base = 'content/english/assets/audio/versions/Y1M01/NATURAL_CLEAR_V2/instructions';
const inputs = questions.map(item => ({
  id: item.instruction.instructionAudioId,
  module: 'Y1M01', activity: [item.item_id], type: 'INSTRUCTION_AUDIO',
  displayText: item.instruction.spokenText, speechText: item.instruction.spokenText,
  locale: 'pt-BR', language: 'Portuguese', voiceProfile: voiceVersion, voiceVersion,
  engine: engineId, model: modelName, deliveryProfile, settings: generationSettings,
  referenceAudio, outputPath: path.join(workDir, `${item.item_id.toLowerCase()}-instruction.wav`)
}));
const engine = new ChatterboxEngine({ root: audioRoot, pythonPath: path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe'),
  workerPath: path.join(audioRoot, 'engine/chatterbox_worker.py'), workerConfigPath,
  hfHome: path.join(audioRoot, '.runtime/chatterbox-hf'), loadTimeoutMs: 300000, generationTimeoutMs: 240000 });
const pipeline = new AudioPipeline({ root, engine, paths: { cache: cacheDir, jobs: jobsPath, manifest: tempManifest }, maxRetries: 1 });
const started = new Date().toISOString();
const events = [];
let batch = [];
try {
  await engine.start();
  batch = await pipeline.runBatch(inputs, { closeEngine: false, preferResume: false,
    onJob: result => { events.push(result); console.log(`INSTRUCTION ${result.status}${result.cache ? '_CACHE' : ''} ${result.id}`); } });
  if (batch.length !== 20 || batch.some(result => result.status !== 'DONE' || !result.qc?.pass)) throw new Error('INSTRUCTION_GENERATION_OR_WAV_QC_FAILED');
} catch (error) {
  await save(reportPath, { status: 'ISSUE', startedAt: started, error: error.message, stack: error.stack, events });
  throw error;
} finally { await engine.close(); }

const processingItems = questions.map(question => {
  const result = batch.find(candidate => candidate.id === question.instruction.instructionAudioId);
  const id = question.instruction.instructionAudioId;
  return { id, voiceVersion, engine: engineId, model: modelName, deliveryProfile, cacheKey: result.cacheKey,
    sourceWav: path.resolve(root, result.output),
    masterPath: path.resolve(root, `${masterBase}/${id.toLowerCase()}.wav`),
    audioPath: path.resolve(root, `${mp3Base}/${id.toLowerCase()}.mp3`),
    masterAudioPath: `${masterBase}/${id.toLowerCase()}.wav`, audioPathRelative: `${mp3Base}/${id.toLowerCase()}.mp3` };
});
const processingInput = path.join(audioRoot, '.runtime/y1m01-instruction-postprocess.json');
await save(path.relative(root, processingInput), { settings: processingSettings, items: processingItems });
const py = path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe');
const processedRaw = await execFile(py, [path.join(audioRoot, 'scripts/process-production-audio.py'), processingInput], { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
const processed = JSON.parse(processedRaw.stdout.trim().split(/\r?\n/).at(-1));
if (processed.failures.length || processed.results.length !== 20 || processed.results.some(result =>
  !result.masterQc?.pass || !result.mp3Qc?.pass || !result.onsetQc?.pass || result.normalization?.targetLufs !== -16 ||
  result.normalization?.truePeakLimitDb !== -1.5 || result.mp3Qc?.bitrateKbps !== 128)) {
  throw new Error(`INSTRUCTION_PRODUCTION_QC_FAILED:${JSON.stringify(processed.failures)}`);
}

const processedById = new Map(processed.results.map(result => [result.id, result]));
const batchById = new Map(batch.map(result => [result.id, result]));
const manifestAdditions = [];
const registryAdditions = [];
const generationAdditions = [];
for (const question of questions) {
  const id = question.instruction.instructionAudioId;
  const result = processedById.get(id);
  const job = batchById.get(id);
  const audioPath = `${mp3Base}/${id.toLowerCase()}.mp3`;
  const masterAudioPath = `${masterBase}/${id.toLowerCase()}.wav`;
  const record = {
    id, audioId: id, module: 'Y1M01', activity: [question.item_id], type: 'INSTRUCTION_AUDIO',
    displayText: question.instruction.spokenText, speechText: question.instruction.spokenText,
    instruction: { title: question.instruction.title, subtitle: question.instruction.subtitle, text: question.instruction.text },
    locale: 'pt-BR', languageConditioning: 'pt', voiceProfile: voiceVersion, voiceVersion,
    engine: engineId, model: modelName, deliveryProfile, version: '1.0', audioPath, masterAudioPath,
    status: 'APPROVED', approvalStatus: 'APPROVED_TECHNICAL_QC_HUMAN_PRONUNCIATION_PENDING',
    humanPronunciationReview: 'NEEDS_HUMAN_REVIEW', cache: job.cache, cacheKey: job.cacheKey,
    contentHash: result.audioSha256, masterContentHash: result.masterSha256,
    sha256: result.audioSha256, duration: result.mp3Qc.durationSeconds, generationTime: job.metadata?.generationTime ?? null,
    qcStatus: 'PASS', qc: { pass: true, master: result.masterQc, optimized: result.mp3Qc, onset: result.onsetQc,
      normalization: result.normalization }, generatedAt: result.createdAt || new Date().toISOString(),
    runtimeVersion: 'DUDUQ_AUDIO_RUNTIME_v1'
  };
  manifestAdditions.push(record);
  const dedupeKey = createHash('sha256').update(`${record.speechText}|pt-BR|${voiceVersion}|${engineId}|${deliveryProfile}`).digest('hex');
  const registryRecord = { audioId: id, type: 'instruction', transcript: record.displayText, speechText: record.speechText,
    language: 'pt-BR', locale: 'pt-BR', speakerRole: 'single', voiceProfile: voiceVersion,
    prosodyProfile: deliveryProfile, voiceVersion, engine: engineId, model: modelName, deliveryProfile,
    status: 'APPROVED', approvalStatus: record.approvalStatus, humanPronunciationReview: 'NEEDS_HUMAN_REVIEW',
    urlOrPath: audioPath, outputPath: audioPath, masterAudioPath, filename: path.posix.basename(audioPath),
    version: '1.0', dedupeKey, contentHash: result.audioSha256, sha256: result.audioSha256,
    masterContentHash: result.masterSha256, cacheKey: job.cacheKey, qcStatus: 'PASS', qc: record.qc,
    usedByItems: [question.item_id], reuseScope: 'ITEM_INSTRUCTION' };
  registryAdditions.push(registryRecord);
  generationAdditions.push({ ...registryRecord, category: 'INSTRUCTION', type: 'INSTRUCTION_AUDIO',
    displayText: record.displayText, speechText: record.speechText, locale: 'pt-BR', outputPath: audioPath });
}

const ensureNoOverwrite = (entries, id, label) => { if (entries.some(entry => (entry.id || entry.audioId) === id)) throw new Error(`DUPLICATE_AUDIO_ID:${label}:${id}`); };
for (const item of manifestAdditions) ensureNoOverwrite(audioDoc.items, item.id, 'AUDIO_MANIFEST');
for (const item of registryAdditions) ensureNoOverwrite(registry.entries, item.audioId, 'AUDIO_REGISTRY');
for (const item of generationAdditions) ensureNoOverwrite(generation.entries, item.audioId, 'GENERATION_MANIFEST');
audioDoc.items.push(...manifestAdditions); audioDoc.updatedAt = new Date().toISOString();
registry.entries.push(...registryAdditions); registry.updatedAt = new Date().toISOString();
generation.entries.push(...generationAdditions); generation.updatedAt = new Date().toISOString();
await save(audioDocPath, audioDoc); await save(registryPath, registry); await save(generationPath, generation);

const originalsPreserved = await Promise.all([...originalHashes].map(async ([relative, hash]) => (await sha256File(path.join(root, relative))) === hash));
if (!originalsPreserved.every(Boolean)) throw new Error('ORIGINAL_APPROVED_AUDIO_HASH_CHANGED');
const report = { status: 'PASS_TECHNICAL_QC', startedAt: started, completedAt: new Date().toISOString(),
  voiceVersion, engine: 'CHATTERBOX_MULTILINGUAL_V3', model: modelName, deliveryProfile,
  referenceOriginalSha256: expectedVoiceHash, referenceProcessedSha256: await sha256File(referenceAudio),
  inputCount: inputs.length, generatedCount: batch.filter(item => !item.cache).length, cacheHits: batch.filter(item => item.cache).length,
  modelLoadCount: engine.loadInfo?.modelLoadCount ?? 1, profile: 'PT_BR_INSTRUCTION',
  audioQcPass: processed.results.filter(result => result.masterQc?.pass && result.mp3Qc?.pass).length,
  onsetQcPass: processed.results.filter(result => result.onsetQc?.pass).length,
  humanPronunciationReview: 'NEEDS_HUMAN_REVIEW', originalAudio23HashesPreserved: originalsPreserved.every(Boolean),
  items: manifestAdditions.map(item => ({ id: item.id, item: item.activity[0], path: item.audioPath,
    sha256: item.sha256, duration: item.duration, qc: item.qcStatus, cacheKey: item.cacheKey })) };
await save(reportPath, report);
console.log(JSON.stringify({ status: report.status, generated: report.generatedCount, cacheHits: report.cacheHits,
  instructionAudio: report.items.length, originalAudio23HashesPreserved: report.originalAudio23HashesPreserved,
  pronunciation: report.humanPronunciationReview }, null, 2));

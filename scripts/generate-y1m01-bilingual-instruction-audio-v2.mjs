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
const read = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const save = async (relative, value) => writeFile(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const hashText = value => createHash('sha256').update(value).digest('hex');
const audioManifestPath = 'duduq-audio/manifests/AUDIO_MANIFEST.json';
const registryPath = 'content/english/audio/audio-registry.json';
const generationPath = 'content/english/audio/audio-generation-manifest.json';
const audioBindingsPath = 'content/english/year-1/module-01/audio-production-manifest.json';
const questionsPath = 'content/english/year-1/module-01/questions.json';
const reportPath = 'duduq-audio/reports/runtime/y1m01-bilingual-instruction-audio-v2.json';
const voiceVersion = 'DUDUQ_GOLD_VOICE_v1';
const engineId = 'chatterbox-multilingual-v3';
const modelName = 'Chatterbox Multilingual V3';
const deliveryProfile = 'NATURAL_CLEAR_V2';
const workerConfig = await read('duduq-audio/config/chatterbox-runtime.json');
const goldVoice = await read('duduq-audio/config/gold-voice-worker.json');
const audioManifest = await read(audioManifestPath);
const registry = await read(registryPath);
const generation = await read(generationPath);
const audioBindings = await read(audioBindingsPath);
const questions = await read(questionsPath);
const expectedProcessedVoiceHash = 'de8a2962c8b0da2af1a0a7360a7d741053195c2870d443d5c45897a583035c4c';
if (workerConfig.voiceVersion !== voiceVersion || workerConfig.device !== 'cpu' ||
    !workerConfig.referenceAudio || await sha256File(workerConfig.referenceAudio) !== expectedProcessedVoiceHash) {
  throw new Error('APPROVED_GOLD_VOICE_REFERENCE_OR_RUNTIME_MISMATCH');
}
const originalY1m01Audio = audioManifest.items.filter(item => item.module === 'Y1M01' && !String(item.type).includes('INSTRUCTION'));
if (originalY1m01Audio.length !== 23) throw new Error(`ORIGINAL_AUDIO_CONTRACTS_EXPECTED_23:${originalY1m01Audio.length}`);
const preservedHashes = new Map();
for (const entry of audioManifest.items) {
  if (entry.module !== 'Y1M01') continue;
  for (const rel of [entry.audioPath, entry.masterAudioPath].filter(Boolean)) {
    if (!preservedHashes.has(rel)) preservedHashes.set(rel, await sha256File(path.join(root, rel)));
  }
}
if (questions.items.length !== 20 || questions.items.some(item => !item.instruction?.instructionAudioEnId || !item.instruction?.instructionAudioPtId)) {
  throw new Error('BILINGUAL_INSTRUCTION_CONTRACTS_INCOMPLETE');
}
const settingsByLanguage = {
  English: goldVoice.approvedDeliveryProfiles?.[deliveryProfile]?.EN_FUNCTIONAL_CHUNK,
  Portuguese: goldVoice.approvedDeliveryProfiles?.[deliveryProfile]?.PT_BR_INSTRUCTION
};
if (Object.values(settingsByLanguage).some(value => !value)) throw new Error('APPROVED_BILINGUAL_GENERATION_SETTINGS_MISSING');
const processingSettings = goldVoice.productionPostProcessing;
if (processingSettings?.targetLufs !== -16 || processingSettings?.truePeakDb !== -1.5 ||
    processingSettings?.leadingPaddingMs !== 120 || !processingSettings?.requireOnsetSafetyMargin) {
  throw new Error('APPROVED_GOLD_VOICE_POSTPROCESS_SETTINGS_MISSING');
}

const workDir = path.join(audioRoot, '.runtime/instruction-v2-work/Y1M01');
const cacheDir = path.join(audioRoot, '.runtime/cache/chatterbox-gold-v1-NATURAL_CLEAR_V2-bilingual-instructions');
const jobsPath = path.join(audioRoot, '.runtime/jobs/chatterbox-y1m01-bilingual-v2-jobs.json');
const tempManifestPath = path.join(audioRoot, '.runtime/y1m01-bilingual-v2-generation-run.json');
const masterBase = 'content/english/assets/audio/master/versions/Y1M01/NATURAL_CLEAR_V2/bilingual-instructions-v2';
const mp3Base = 'content/english/assets/audio/versions/Y1M01/NATURAL_CLEAR_V2/bilingual-instructions-v2';
const inputs = questions.items.flatMap((item, index) => {
  const copy = item.instruction;
  return [
    { id: copy.instructionAudioEnId, item, index, locale: 'en-US', language: 'English', languageConditioning: 'en',
      profile: 'EN_FUNCTIONAL_CHUNK', displayText: copy.spokenTextEn, speechText: copy.spokenTextEn },
    { id: copy.instructionAudioPtId, item, index, locale: 'pt-BR', language: 'Portuguese', languageConditioning: 'pt',
      profile: 'PT_BR_INSTRUCTION', displayText: copy.spokenTextPt, speechText: copy.spokenTextPt }
  ].map(job => ({ ...job, module: 'Y1M01', activity: [item.item_id], type: `INSTRUCTION_AUDIO_${job.languageConditioning.toUpperCase()}`,
    voiceProfile: voiceVersion, voiceVersion, engine: engineId, model: modelName, deliveryProfile,
    settings: settingsByLanguage[job.language], referenceAudio: workerConfig.referenceAudio,
    outputPath: path.join(workDir, `${item.item_id.toLowerCase()}-${job.languageConditioning}.wav`) }));
});
if (inputs.length !== 40) throw new Error(`BILINGUAL_INSTRUCTION_JOB_COUNT:${inputs.length}`);
const engine = new ChatterboxEngine({ root: audioRoot,
  pythonPath: path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe'),
  workerPath: path.join(audioRoot, 'engine/chatterbox_worker.py'),
  workerConfigPath: path.join(audioRoot, 'config/chatterbox-runtime.json'),
  hfHome: path.join(audioRoot, '.runtime/chatterbox-hf'), loadTimeoutMs: 300000, generationTimeoutMs: 240000 });
const pipeline = new AudioPipeline({ root, engine, paths: { cache: cacheDir, jobs: jobsPath, manifest: tempManifestPath }, maxRetries: 1 });
const startedAt = new Date().toISOString();
const events = [];
let batch = [];
try {
  await engine.start();
  batch = await pipeline.runBatch(inputs, { closeEngine: false, preferResume: false,
    onJob: result => { events.push(result); console.log(`BILINGUAL ${result.status}${result.cache ? '_CACHE' : ''} ${result.id}`); } });
  if (batch.length !== 40 || batch.some(result => result.status !== 'DONE' || !result.qc?.pass)) throw new Error('BILINGUAL_INSTRUCTION_GENERATION_OR_WAV_QC_FAILED');
} catch (error) {
  await save(reportPath, { status: 'ISSUE', startedAt, error: error.message, stack: error.stack, events });
  throw error;
} finally { await engine.close(); }

const postprocessItems = inputs.map(job => {
  const generated = batch.find(result => result.id === job.id);
  const basename = job.id.toLowerCase();
  return { id: job.id, activity: job.activity, locale: job.locale, languageConditioning: job.languageConditioning,
    languageProfile: job.profile, cacheKey: generated.cacheKey,
    sourceWav: path.resolve(root, generated.output),
    masterPath: path.resolve(root, `${masterBase}/${basename}.wav`),
    audioPath: path.resolve(root, `${mp3Base}/${basename}.mp3`),
    masterAudioPath: `${masterBase}/${basename}.wav`, audioPathRelative: `${mp3Base}/${basename}.mp3` };
});
const processingInput = path.join(audioRoot, '.runtime/y1m01-bilingual-v2-postprocess.json');
await save(path.relative(root, processingInput), { settings: processingSettings, items: postprocessItems });
const python = path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe');
const processResult = await execFile(python, [path.join(audioRoot, 'scripts/process-production-audio.py'), processingInput],
  { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
const processed = JSON.parse(processResult.stdout.trim().split(/\r?\n/u).at(-1));
if (processed.failures.length || processed.results.length !== 40 || processed.results.some(result =>
  !result.masterQc?.pass || !result.mp3Qc?.pass || !result.onsetQc?.pass || result.normalization?.targetLufs !== -16 ||
  result.normalization?.truePeakLimitDb !== -1.5 || result.mp3Qc?.bitrateKbps !== 128)) {
  throw new Error(`BILINGUAL_INSTRUCTION_PRODUCTION_QC_FAILED:${JSON.stringify(processed.failures)}`);
}

const processedById = new Map(processed.results.map(result => [result.id, result]));
const batchById = new Map(batch.map(result => [result.id, result]));
const additions = [];
const registryAdditions = [];
const generationAdditions = [];
for (const job of inputs) {
  const result = processedById.get(job.id);
  const pipelineResult = batchById.get(job.id);
  const lowerId = job.id.toLowerCase();
  const audioPath = `${mp3Base}/${lowerId}.mp3`;
  const masterAudioPath = `${masterBase}/${lowerId}.wav`;
  const side = job.languageConditioning === 'en' ? 'instructionAudioEnId' : 'instructionAudioPtId';
  const contract = job.item.instruction;
  const entry = {
    id: job.id, audioId: job.id, module: 'Y1M01', activity: job.activity, type: job.type,
    displayText: job.displayText, speechText: job.speechText, locale: job.locale,
    languageConditioning: job.languageConditioning, instructionField: side,
    instruction: { titleEn: contract.titleEn, titlePt: contract.titlePt,
      instructionEn: contract.instructionEn, instructionPt: contract.instructionPt },
    voiceProfile: voiceVersion, voiceVersion, engine: engineId, model: modelName,
    deliveryProfile, version: '2.0', audioPath, masterAudioPath, status: 'APPROVED',
    approvalStatus: 'APPROVED_TECHNICAL_QC_HUMAN_PRONUNCIATION_PENDING',
    humanPronunciationReview: 'NEEDS_HUMAN_REVIEW', cache: pipelineResult.cache,
    cacheKey: pipelineResult.cacheKey, contentHash: result.audioSha256, masterContentHash: result.masterSha256,
    sha256: result.audioSha256, duration: result.mp3Qc.durationSeconds,
    generationTime: pipelineResult.metadata?.generationTime ?? null, qcStatus: 'PASS',
    qc: { pass: true, master: result.masterQc, optimized: result.mp3Qc, onset: result.onsetQc,
      normalization: result.normalization }, generatedAt: pipelineResult.metadata?.createdAt || new Date().toISOString(),
    runtimeVersion: 'DUDUQ_AUDIO_RUNTIME_v1'
  };
  additions.push(entry);
  const registryEntry = { audioId: job.id, type: job.languageConditioning === 'en' ? 'instruction-en' : 'instruction-pt',
    transcript: job.displayText, speechText: job.speechText, language: job.languageConditioning === 'en' ? 'en' : 'pt-BR',
    locale: job.locale, speakerRole: 'single', voiceProfile: voiceVersion, prosodyProfile: deliveryProfile,
    voiceVersion, engine: 'CHATTERBOX_MULTILINGUAL_V3', model: modelName, deliveryProfile,
    status: 'APPROVED', approvalStatus: entry.approvalStatus, humanPronunciationReview: 'NEEDS_HUMAN_REVIEW',
    urlOrPath: audioPath, outputPath: audioPath, masterAudioPath, filename: path.posix.basename(audioPath),
    version: '2.0', dedupeKey: hashText(`${job.speechText}|${job.locale}|${voiceVersion}|${engineId}|${deliveryProfile}|${job.profile}`),
    contentHash: result.audioSha256, sha256: result.audioSha256, masterContentHash: result.masterSha256,
    cacheKey: pipelineResult.cacheKey, qcStatus: 'PASS', qc: entry.qc, usedByItems: job.activity,
    reuseScope: 'ITEM_INSTRUCTION_LANGUAGE' };
  registryAdditions.push(registryEntry);
  generationAdditions.push({ ...registryEntry, category: 'INSTRUCTION', type: entry.type,
    displayText: entry.displayText, locale: job.locale, outputPath: audioPath });
}
for (const [entries, label] of [[audioManifest.items, 'AUDIO_MANIFEST'], [registry.entries, 'AUDIO_REGISTRY'], [generation.entries, 'GENERATION_MANIFEST']]) {
  const existing = new Set(entries.map(entry => entry.id || entry.audioId));
  for (const addition of additions) if (existing.has(addition.id)) throw new Error(`DUPLICATE_AUDIO_ID:${label}:${addition.id}`);
}
audioManifest.items.push(...additions);
registry.entries.push(...registryAdditions);
generation.entries.push(...generationAdditions);
for (const item of questions.items) {
  const bindings = audioBindings.items[item.item_id] || [];
  audioBindings.items[item.item_id] = [
    ...bindings.filter(binding => !['instruction_en', 'instruction_pt'].includes(binding.role)),
    { role: 'instruction_en', audioId: item.instruction.instructionAudioEnId },
    { role: 'instruction_pt', audioId: item.instruction.instructionAudioPtId }
  ];
}
audioManifest.updatedAt = registry.updatedAt = generation.updatedAt = new Date().toISOString();
await save(audioManifestPath, audioManifest);
await save(registryPath, registry);
await save(generationPath, generation);
await save(audioBindingsPath, audioBindings);

const oldAudioPreserved = await Promise.all([...preservedHashes].map(async ([relative, priorHash]) =>
  await sha256File(path.join(root, relative)) === priorHash));
if (!oldAudioPreserved.every(Boolean)) throw new Error('PREEXISTING_Y1M01_AUDIO_HASH_CHANGED');
const report = {
  status: 'PASS_TECHNICAL_QC', startedAt, completedAt: new Date().toISOString(),
  standard: 'DUDUQ_BILINGUAL_PEDAGOGICAL_INSTRUCTION_V2', voiceVersion,
  engine: 'CHATTERBOX_MULTILINGUAL_V3', model: modelName, deliveryProfile,
  modelLoadCount: engine.loadInfo?.modelLoadCount ?? 1,
  originalApprovedCurricularAudioCount: 23, originalAudioHashesPreserved: oldAudioPreserved.every(Boolean),
  englishInstructionCount: additions.filter(entry => entry.type === 'INSTRUCTION_AUDIO_EN').length,
  portugueseInstructionCount: additions.filter(entry => entry.type === 'INSTRUCTION_AUDIO_PT').length,
  englishGeneratedInferenceCount: batch.filter(result => !result.cache && inputs.find(job => job.id === result.id)?.languageConditioning === 'en').length,
  portugueseGeneratedInferenceCount: batch.filter(result => !result.cache && inputs.find(job => job.id === result.id)?.languageConditioning === 'pt').length,
  cacheHits: batch.filter(result => result.cache).length,
  audioQcPass: processed.results.filter(result => result.masterQc?.pass && result.mp3Qc?.pass).length,
  onsetQcPass: processed.results.filter(result => result.onsetQc?.pass).length,
  normalization: { targetLufs: -16, truePeakDb: -1.5, leadingPaddingMs: 120 },
  humanPronunciationReview: 'NEEDS_HUMAN_REVIEW',
  items: additions.map(entry => ({ id: entry.id, item: entry.activity[0], locale: entry.locale,
    path: entry.audioPath, sha256: entry.sha256, duration: entry.duration, qc: entry.qcStatus,
    cache: entry.cache, cacheKey: entry.cacheKey }))
};
await save(reportPath, report);
console.log(JSON.stringify({ status: report.status, english: report.englishInstructionCount,
  portuguese: report.portugueseInstructionCount, modelLoadCount: report.modelLoadCount,
  inference: report.englishGeneratedInferenceCount + report.portugueseGeneratedInferenceCount,
  cacheHits: report.cacheHits, qc: `${report.audioQcPass}/40`, onsetQc: `${report.onsetQcPass}/40`,
  originalsPreserved: report.originalAudioHashesPreserved }, null, 2));

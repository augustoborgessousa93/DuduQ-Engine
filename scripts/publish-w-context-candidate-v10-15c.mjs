import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { sha256File } from '../duduq-audio/pipeline/audio-pipeline.mjs';
const execFile = promisify(execFileCb);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = value => path.relative(root, value).split(path.sep).join('/');
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const saveJson = async (file, value) => {
  const target = path.join(root, file), tmp = `${target}.${process.pid}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await rename(tmp, target);
};
const toWsl = async value => (await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', 'wslpath', '-a', value.replaceAll('\\', '/')], { windowsHide: true })).stdout.trim();
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const signal = await readJson('duduq-audio/.runtime/production-work/V10-15C-EW-candidates/isolation-qc.json');
const selected = signal.candidates.find(row => row.letter === 'W' && row.source === 'w-context.wav');
if (!selected || selected.status !== 'TECHNICAL_SIGNAL_PASS_HUMAN_PENDING' || selected.voicedSegments < 2 || selected.targetReferencesInPrompt !== 1) throw new Error('W_CONTEXT_SIGNAL_QC_NOT_PASS');
const version = 'NATURAL_CLEAR_V4_SURGICAL_EW_CONTEXT_ALT';
const base = 'aud-en-letter-w';
const source = path.join(root, 'duduq-audio/.runtime/production-work/V10-15C-EW-candidates/w-w-context-target.wav');
const masterPath = path.join(root, `content/english/assets/audio/master/versions/CANONICAL_LETTERS/${version}/lexical/${base}.wav`);
const audioPath = path.join(root, `content/english/assets/audio/versions/CANONICAL_LETTERS/${version}/lexical/${base}.mp3`);
const masterAudioPath = `content/english/assets/audio/master/versions/CANONICAL_LETTERS/${version}/lexical/${base}.wav`;
const audioPathRelative = `content/english/assets/audio/versions/CANONICAL_LETTERS/${version}/lexical/${base}.mp3`;
for (const file of [masterPath, audioPath, `${masterPath}.production.json`]) {
  try { await readFile(file); throw new Error(`DESTINATION_ALREADY_EXISTS:${rel(file)}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const settings = (await readJson('duduq-audio/config/gold-voice-worker.json')).productionPostProcessing;
const payloadPath = 'duduq-audio/.runtime/v10-15c-w-context-postprocess.json';
const payload = { settings, items: [{ id: 'AUD-EN-LETTER-W', sourceWav: await toWsl(source),
  masterPath: await toWsl(masterPath), audioPath: await toWsl(audioPath), masterAudioPath, audioPathRelative,
  voiceVersion: 'DUDUQ_GOLD_VOICE_v1', engine: 'chatterbox-multilingual-v3', model: 'Chatterbox Multilingual V3', cacheKey: await sha256File(source) }] };
await saveJson(payloadPath, payload);
const processPy = await toWsl(path.join(root, 'duduq-audio/scripts/process-production-audio.py'));
const processPayload = await toWsl(path.join(root, payloadPath));
const run = await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', '/home/augus/.duduq/chatterbox-venv/bin/python', processPy, processPayload],
  { windowsHide: true, maxBuffer: 6 * 1024 * 1024, encoding: 'utf8' });
const processed = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1));
const result = processed.results?.[0];
if (processed.failures?.length || processed.results?.length !== 1 || !result.masterQc?.pass || !result.mp3Qc?.pass ||
  !result.onsetQc?.pass || result.normalization?.truePeakLimitDb !== -1.5 || result.mp3Qc?.bitrateKbps !== 128) {
  throw new Error(`W_CONTEXT_PRODUCTION_QC_FAILED:${JSON.stringify(processed.failures ?? [])}`);
}
const manifestPath = 'duduq-audio/manifests/AUDIO_MANIFEST.json';
const registryPath = 'content/english/audio/audio-registry.json';
const manifest = await readJson(manifestPath), registry = await readJson(registryPath);
const active = manifest.items.find(row => (row.id ?? row.audioId) === 'AUD-EN-LETTER-W');
const registered = registry.entries.find(row => row.audioId === 'AUD-EN-LETTER-W');
if (!active || !registered) throw new Error('W_REGISTRY_ENTRY_MISSING');
const manifestHistory = [...(active.previousCanonicalVersion ? [active.previousCanonicalVersion] : []), ...(active.historicalPreviousCanonicalVersions ?? [])];
const registryHistory = [...(registered.previousCanonicalVersion ? [registered.previousCanonicalVersion] : []), ...(registered.historicalPreviousCanonicalVersions ?? [])];
const oldManifest = { audioPath: active.audioPath, masterAudioPath: active.masterAudioPath, contentHash: active.contentHash, masterContentHash: active.masterContentHash };
const oldRegistry = { urlOrPath: registered.urlOrPath, outputPath: registered.outputPath, masterAudioPath: registered.masterAudioPath,
  contentHash: registered.contentHash, masterContentHash: registered.masterContentHash, sha256: registered.sha256 };
const metadata = { version, voiceVersion: 'DUDUQ_GOLD_VOICE_v1', engine: 'CHATTERBOX_MULTILINGUAL_V3',
  deliveryProfile: 'NATURAL_CLEAR_V2', synthesisPrompt: 'Listen carefully. Here is the English letter name: double-you.',
  targetExtraction: 'FINAL_VOICED_SEGMENT_25MS_PRE_ROLL_V10_15C', targetReferencesInPrompt: 1,
  contextToTargetGapSeconds: selected.contextTargetGapSeconds, isolatedTargetDurationSeconds: selected.isolatedDurationSeconds,
  rawTargetCount: 1, candidateSelection: 'Compared against the W pause-context candidate; selected for higher achievable integrated loudness under the same true-peak ceiling.',
  humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING' };
const qc = { pass: true, master: result.masterQc, optimized: result.mp3Qc, onset: result.onsetQc, normalization: result.normalization };
Object.assign(active, { previousCanonicalVersion: oldManifest, historicalPreviousCanonicalVersions: manifestHistory,
  audioPath: audioPathRelative, masterAudioPath, contentHash: result.audioSha256, masterContentHash: result.masterSha256,
  approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING', humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING',
  qcStatus: 'PASS', qc, generatedAt: new Date().toISOString(), candidateMetadata: metadata });
Object.assign(registered, { previousCanonicalVersion: oldRegistry, historicalPreviousCanonicalVersions: registryHistory,
  urlOrPath: audioPathRelative, outputPath: audioPathRelative, masterAudioPath,
  contentHash: result.audioSha256, sha256: result.audioSha256, masterContentHash: result.masterSha256,
  version: '4.1-surgical-w', approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING',
  humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING', qcStatus: 'PASS', qc, candidateMetadata: metadata });
manifest.updatedAt = registry.updatedAt = new Date().toISOString();
await saveJson(manifestPath, manifest); await saveJson(registryPath, registry);
const report = { status: 'TECHNICAL_PASS_HUMAN_PENDING', audioId: 'AUD-EN-LETTER-W',
  priorW4: oldRegistry, newPath: audioPathRelative, newHash: result.audioSha256,
  masterPath: masterAudioPath, masterHash: result.masterSha256, result };
await saveJson('duduq-audio/.runtime/production-work/V10-15C-EW-candidates/selected-w-context-qc.json', report);
console.log(JSON.stringify({ status: report.status, oldPath: oldRegistry.urlOrPath,
  newPath: audioPathRelative, newHash: result.audioSha256,
  outputLufs: result.normalization.measuredOutputLufs, truePeakDb: result.normalization.measuredTruePeakDb,
  targetSegmentSeconds: selected.targetSegmentSeconds, humanPronunciation: 'PENDING' }, null, 2));

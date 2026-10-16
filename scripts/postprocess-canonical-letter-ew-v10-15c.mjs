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
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, target);
};
const toWsl = async value => (await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', 'wslpath', '-a', value.replaceAll('\\', '/')], { windowsHide: true })).stdout.trim();
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');

const signal = await readJson('duduq-audio/.runtime/production-work/V10-15C-EW-candidates/isolation-qc.json');
if (signal.status !== 'TECHNICAL_SIGNAL_PASS_HUMAN_PENDING' || signal.issues?.length) throw new Error('EW_SIGNAL_QC_NOT_PASS');
const selected = [
  { letter: 'E', source: 'e-e-pause-target.wav', prompt: 'The English letter name is ... E.' },
  { letter: 'W', source: 'w-w-pause-target.wav', prompt: 'The English letter name is ... W.' },
];
const destinationVersion = 'NATURAL_CLEAR_V4_SURGICAL_EW';
const rows = selected.map(({ letter, source, prompt }) => {
  const base = `aud-en-letter-${letter.toLowerCase()}`;
  return { id: `AUD-EN-LETTER-${letter}`, letter, prompt,
    sourceWav: path.join(root, 'duduq-audio/.runtime/production-work/V10-15C-EW-candidates', source),
    masterPath: path.join(root, `content/english/assets/audio/master/versions/CANONICAL_LETTERS/${destinationVersion}/lexical/${base}.wav`),
    audioPath: path.join(root, `content/english/assets/audio/versions/CANONICAL_LETTERS/${destinationVersion}/lexical/${base}.mp3`),
    masterAudioPath: `content/english/assets/audio/master/versions/CANONICAL_LETTERS/${destinationVersion}/lexical/${base}.wav`,
    audioPathRelative: `content/english/assets/audio/versions/CANONICAL_LETTERS/${destinationVersion}/lexical/${base}.mp3` };
});
for (const row of rows) for (const file of [row.masterPath, row.audioPath, `${row.masterPath}.production.json`]) {
  try { await readFile(file); throw new Error(`DESTINATION_ALREADY_EXISTS:${rel(file)}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const gold = await readJson('duduq-audio/config/gold-voice-worker.json');
const settings = gold.productionPostProcessing;
const payloadPath = 'duduq-audio/.runtime/v10-15c-ew-postprocess.json';
const payload = { settings, items: await Promise.all(rows.map(async row => ({ id: row.id,
  sourceWav: await toWsl(row.sourceWav), masterPath: await toWsl(row.masterPath), audioPath: await toWsl(row.audioPath),
  masterAudioPath: row.masterAudioPath, audioPathRelative: row.audioPathRelative,
  voiceVersion: 'DUDUQ_GOLD_VOICE_v1', engine: 'chatterbox-multilingual-v3', model: 'Chatterbox Multilingual V3',
  cacheKey: await sha256File(row.sourceWav) }))) };
await saveJson(payloadPath, payload);
const processingScript = await toWsl(path.join(root, 'duduq-audio/scripts/process-production-audio.py'));
const processingPayload = await toWsl(path.join(root, payloadPath));
const run = await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', '/home/augus/.duduq/chatterbox-venv/bin/python', processingScript, processingPayload],
  { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
const output = run.stdout.trim().split(/\r?\n/).at(-1);
const processed = JSON.parse(output);
if (processed.failures?.length || processed.results?.length !== 2 || processed.results.some(result =>
  !result.masterQc?.pass || !result.mp3Qc?.pass || !result.onsetQc?.pass ||
  result.normalization?.targetLufs !== -16 || result.normalization?.truePeakLimitDb !== -1.5 ||
  result.mp3Qc?.bitrateKbps !== 128)) throw new Error(`EW_PRODUCTION_QC_FAILED:${JSON.stringify(processed.failures ?? [])}`);

const manifestPath = 'duduq-audio/manifests/AUDIO_MANIFEST.json';
const registryPath = 'content/english/audio/audio-registry.json';
const manifest = await readJson(manifestPath), registry = await readJson(registryPath);
const qcById = new Map(processed.results.map(result => [result.id, result]));
const now = new Date().toISOString();
const bindingReport = [];
for (const row of rows) {
  const active = manifest.items.find(item => (item.id ?? item.audioId) === row.id);
  const registered = registry.entries.find(item => item.audioId === row.id);
  const result = qcById.get(row.id);
  if (!active || !registered || !result) throw new Error(`EW_CANONICAL_RECORD_MISSING:${row.id}`);
  const oldVersion = { audioPath: active.audioPath, masterAudioPath: active.masterAudioPath,
    contentHash: active.contentHash, masterContentHash: active.masterContentHash };
  const manifestHistory = active.historicalPreviousCanonicalVersions ??
    (active.previousCanonicalVersion ? [active.previousCanonicalVersion] : []);
  const oldReg = { urlOrPath: registered.urlOrPath, masterAudioPath: registered.masterAudioPath,
    contentHash: registered.contentHash, masterContentHash: registered.masterContentHash };
  const previousChain = registered.historicalPreviousCanonicalVersions ??
    (registered.previousCanonicalVersion ? [registered.previousCanonicalVersion] : []);
  Object.assign(active, { previousCanonicalVersion: oldVersion, historicalPreviousCanonicalVersions: manifestHistory,
    audioPath: row.audioPathRelative, masterAudioPath: row.masterAudioPath,
    contentHash: result.audioSha256, masterContentHash: result.masterSha256,
    status: 'APPROVED', approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING',
    humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING', qcStatus: 'PASS',
    qc: { pass: true, master: result.masterQc, optimized: result.mp3Qc, onset: result.onsetQc, normalization: result.normalization },
    generatedAt: now, candidateMetadata: { version: destinationVersion, voiceVersion: 'DUDUQ_GOLD_VOICE_v1',
      engine: 'CHATTERBOX_MULTILINGUAL_V3', deliveryProfile: 'NATURAL_CLEAR_V2', targetExtraction: 'FINAL_VOICED_SEGMENT_25MS_PRE_ROLL_V10_15C',
      sourceCandidate: signal.candidates.find(candidate => candidate.letter === row.letter && candidate.output.endsWith(`${row.letter.toLowerCase()}-${row.letter.toLowerCase()}-pause-target.wav`)),
      synthesisPrompt: row.prompt, targetReferencesInPrompt: 1, rawTargetCount: 1, cueTargetGapMs: 260,
      humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING' } });
  Object.assign(registered, { previousCanonicalVersion: oldReg, historicalPreviousCanonicalVersions: previousChain,
    urlOrPath: row.audioPathRelative, outputPath: row.audioPathRelative, masterAudioPath: row.masterAudioPath,
    contentHash: result.audioSha256, sha256: result.audioSha256, masterContentHash: result.masterSha256,
    version: '4.0-surgical-ew', status: 'APPROVED', approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING',
    humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING', qcStatus: 'PASS',
    qc: active.qc, candidateMetadata: active.candidateMetadata });
  bindingReport.push({ audioId: row.id, oldPath: oldReg.urlOrPath, oldHash: oldReg.contentHash,
    newPath: row.audioPathRelative, newHash: result.audioSha256, masterPath: row.masterAudioPath,
    masterHash: result.masterSha256, qc: 'PASS', human: 'PENDING' });
}
manifest.updatedAt = registry.updatedAt = now;
await saveJson(manifestPath, manifest); await saveJson(registryPath, registry);
await saveJson('duduq-audio/.runtime/production-work/V10-15C-EW-candidates/production-qc.json',
  { feature: 'DUDUQ_SURGICAL_E_W_AUDIO_REFINEMENT_V10_15C', status: 'TECHNICAL_PASS_HUMAN_PENDING',
    destinationVersion, bindings: bindingReport, results: processed.results });
console.log(JSON.stringify({ status: 'TECHNICAL_PASS_HUMAN_PENDING', destinationVersion, bindings: bindingReport,
  filesUpdated: [manifestPath, registryPath], humanPronunciation: 'PENDING' }, null, 2));

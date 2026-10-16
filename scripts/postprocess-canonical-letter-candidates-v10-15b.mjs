import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioRoot = path.join(root, 'duduq-audio');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const version = 'NATURAL_CLEAR_V3_CANDIDATE';
const voiceVersion = 'DUDUQ_GOLD_VOICE_v1';
const engine = 'chatterbox-multilingual-v3';
const deliveryProfile = 'NATURAL_CLEAR_V2';
const rel = value => path.relative(root, value).split(path.sep).join('/');
const readJson = async relPath => JSON.parse(await readFile(path.join(root, relPath), 'utf8'));
const saveJson = async (relPath, value) => {
  const file = path.join(root, relPath), tmp = `${file}.${process.pid}.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
};
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const toWsl = async value => (await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', 'wslpath', '-a', value.replaceAll('\\', '/')], { windowsHide: true })).stdout.trim();

const qcReportPath = 'duduq-audio/.runtime/production-work/V10-15B-letter-candidates/isolation-qc.json';
const signalQc = await readJson(qcReportPath);
if (signalQc.status !== 'PASS_SIGNAL_ISOLATION_HUMAN_PENDING' || signalQc.letters?.length !== 26 || signalQc.issues?.length) {
  throw new Error('A_Z_TARGET_ISOLATION_GATE_NOT_PASS');
}
const gold = await readJson('duduq-audio/config/gold-voice-worker.json');
const settings = gold.productionPostProcessing;
const masterBase = `content/english/assets/audio/master/versions/CANONICAL_LETTERS/${version}`;
const audioBase = `content/english/assets/audio/versions/CANONICAL_LETTERS/${version}/lexical`;
const workFile = 'duduq-audio/.runtime/v10-15b-letter-postprocess.json';
const items = alphabet.map(letter => {
  const base = `aud-en-letter-${letter.toLowerCase()}`;
  return { id: `AUD-EN-LETTER-${letter}`, sourceWav: path.resolve(root, `content/english/assets/audio/versions/CANONICAL_LETTERS/${version}/lexical/${base}.wav`),
    masterPath: path.resolve(root, `${masterBase}/${base}.wav`), audioPath: path.resolve(root, `${audioBase}/${base}.mp3`),
    masterAudioPath: `${masterBase}/${base}.wav`, audioPathRelative: `${audioBase}/${base}.mp3`, signal: signalQc.letters.find(row => row.letter === letter) };
});
const processingItems = await Promise.all(items.map(async row => ({ ...row, voiceVersion, engine,
  model: 'Chatterbox Multilingual V3', deliveryProfile, cacheKey: await sha256(row.sourceWav),
  masterAudioPath: row.masterAudioPath, audioPathRelative: row.audioPathRelative,
  sourceWav: await toWsl(row.sourceWav), masterPath: await toWsl(row.masterPath), audioPath: await toWsl(row.audioPath) })));
await saveJson(workFile, { settings, items: processingItems });
const raw = await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', '/home/augus/.duduq/chatterbox-venv/bin/python',
  await toWsl(path.join(audioRoot, 'scripts/process-production-audio.py')), await toWsl(path.join(root, workFile))],
{ windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
const processed = JSON.parse(raw.stdout.trim().split(/\r?\n/).at(-1));
if (processed.failures?.length || processed.results?.length !== 26 || processed.results.some(row =>
  !row.masterQc?.pass || !row.mp3Qc?.pass || !row.onsetQc?.pass || row.normalization?.targetLufs !== -16 ||
  row.normalization?.truePeakLimitDb !== -1.5 || row.mp3Qc?.bitrateKbps !== 128)) {
  throw new Error(`A_Z_PRODUCTION_QC_FAILED:${JSON.stringify(processed.failures ?? [])}`);
}
const manifestPath = 'duduq-audio/manifests/AUDIO_MANIFEST.json';
const registryPath = 'content/english/audio/audio-registry.json';
const generationPath = 'content/english/audio/audio-generation-manifest.json';
const manifest = await readJson(manifestPath), registry = await readJson(registryPath), generation = await readJson(generationPath);
const qcById = new Map(processed.results.map(row => [row.id, row]));
const stagedIndexPath = 'duduq-audio/.runtime/production-work/V10-15B-letter-candidates/candidate-index.json';
const stagedIndex = await readJson(stagedIndexPath);
const now = new Date().toISOString();
for (const letter of alphabet) {
  const id = `AUD-EN-LETTER-${letter}`, q = qcById.get(id);
  const active = manifest.items.find(row => (row.id ?? row.audioId) === id);
  const reg = registry.entries.find(row => row.audioId === id);
  const gen = generation.entries.find(row => row.audioId === id);
  if (!active || !reg) throw new Error(`CANONICAL_REGISTRY_ENTRY_MISSING:${id}`);
  const newAudio = items.find(row => row.id === id);
  const newHash = q.audioSha256, masterHash = q.masterSha256;
  const synthesisPrompt = newAudio.signal.source.includes('-alt2.wav')
    ? `Listen carefully. Here is the English letter name. [English name of ${letter}] once.`
    : `The English letter name is ... ${letter}.`;
  const meta = { version, voiceVersion, engine: 'CHATTERBOX_MULTILINGUAL_V3', deliveryProfile,
    targetExtraction: 'LAST_VOICED_TARGET_AFTER_CONTEXT_SILENCE_V1', synthesisPrompt,
    targetReferencesInPrompt: 1, contextToTargetGapSeconds: newAudio.signal.detectedContextToTargetGapSeconds,
    isolatedTargetDurationSeconds: newAudio.signal.isolatedTargetDurationSeconds,
    humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING' };
  Object.assign(active, { previousCanonicalVersion: { audioPath: active.audioPath, masterAudioPath: active.masterAudioPath,
    contentHash: active.contentHash, masterContentHash: active.masterContentHash },
    audioPath: newAudio.audioPathRelative, masterAudioPath: newAudio.masterAudioPath, contentHash: newHash,
    masterContentHash: masterHash, status: 'APPROVED', approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING',
    humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING', qcStatus: 'PASS',
    qc: { pass: true, master: q.masterQc, optimized: q.mp3Qc, onset: q.onsetQc, normalization: q.normalization },
    generatedAt: now, runtimeVersion: 'DUDUQ_AUDIO_RUNTIME_v1', candidateMetadata: meta });
  Object.assign(reg, { previousCanonicalVersion: { urlOrPath: reg.urlOrPath, outputPath: reg.outputPath,
    masterAudioPath: reg.masterAudioPath, contentHash: reg.contentHash, sha256: reg.sha256 },
    urlOrPath: newAudio.audioPathRelative, outputPath: newAudio.audioPathRelative, masterAudioPath: newAudio.masterAudioPath,
    contentHash: newHash, sha256: newHash, masterContentHash: masterHash, version: '3.0-candidate', status: 'APPROVED',
    approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING', humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING',
    qcStatus: 'PASS', qc: active.qc, candidateMetadata: meta });
  if (gen) Object.assign(gen, { previousCanonicalVersion: { outputPath: gen.outputPath, masterAudioPath: gen.masterAudioPath,
    contentHash: gen.contentHash, masterContentHash: gen.masterContentHash }, outputPath: newAudio.audioPathRelative,
    urlOrPath: newAudio.audioPathRelative, masterAudioPath: newAudio.masterAudioPath, contentHash: newHash,
    masterContentHash: masterHash, version: '3.0-candidate', status: 'GENERATED_TECHNICAL_PASS_HUMAN_PENDING',
    qcStatus: 'PASS', qc: active.qc, humanPronunciationReview: 'TECHNICAL_PASS_HUMAN_PENDING', candidateMetadata: meta });
}
manifest.updatedAt = registry.updatedAt = generation.updatedAt = now;
stagedIndex.status = 'PUBLISHED_AS_CANONICAL_CANDIDATE_TECHNICAL_PASS_HUMAN_PENDING';
stagedIndex.audioVersion = version; stagedIndex.completedAt = now;
stagedIndex.candidateMetadata = metaFrom(signalQc);
await saveJson(manifestPath, manifest); await saveJson(registryPath, registry); await saveJson(generationPath, generation);
await saveJson(stagedIndexPath, stagedIndex);
function metaFrom(report) { return { letters: report.letters.length, signalIsolationIssues: report.issues.length,
  cueTargetGapMs: report.cueToTargetRuntimeGapMs, humanPronunciationReview: 'PENDING' }; }
console.log(JSON.stringify({ status: 'PASS_TECHNICAL_QC_HUMAN_PENDING', letters: alphabet.length,
  candidateVersion: version, newAssets: items.length * 2, oldAssetsPreserved: true,
  files: { audioManifest: manifestPath, registry: registryPath, generationManifest: generationPath },
  humanPronunciation: 'PENDING' }, null, 2));

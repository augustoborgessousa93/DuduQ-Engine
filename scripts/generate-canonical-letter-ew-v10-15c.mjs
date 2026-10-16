import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ChatterboxEngine } from '../duduq-audio/engine/chatterbox-engine.mjs';
import { AudioPipeline, sha256File } from '../duduq-audio/pipeline/audio-pipeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioRoot = path.join(root, 'duduq-audio');
const rel = value => path.relative(root, value).split(path.sep).join('/');
const readJson = async value => JSON.parse(await readFile(path.join(root, value), 'utf8'));
const letters = (process.argv[2] ?? '').toUpperCase().split('').filter(Boolean);
const candidate = process.argv[3] ?? 'context';
if (!letters.length || letters.some(letter => !'EW'.includes(letter))) throw new Error('ONLY_E_AND_W_ARE_ALLOWED');
const names = { E: 'ee', W: 'double-you' };
const outputRoot = path.join(audioRoot, '.runtime/production-work/V10-15C-EW-candidates');
const runtime = await readJson('duduq-audio/config/chatterbox-runtime.json');
const gold = await readJson('duduq-audio/config/gold-voice-worker.json');
const registry = await readJson('content/english/audio/audio-registry.json');
const referenceAudio = runtime.referenceAudio;
if (runtime.voiceVersion !== 'DUDUQ_GOLD_VOICE_v1' || runtime.device !== 'cpu' ||
  await sha256File(referenceAudio) !== 'de8a2962c8b0da2af1a0a7360a7d741053195c2870d443d5c45897a583035c4c') {
  throw new Error('APPROVED_GOLD_VOICE_REFERENCE_OR_RUNTIME_MISMATCH');
}
const registered = new Map(registry.entries.filter(row => /^AUD-EN-LETTER-[A-Z]$/.test(row.audioId)).map(row => [row.audioId, row]));
const inputs = letters.map(letter => {
  const id = `AUD-EN-LETTER-${letter}`;
  const source = registered.get(id);
  if (!source || source.language !== 'en' || source.voiceProfile !== 'DUDUQ_GOLD_VOICE_v1') throw new Error(`LETTER_BINDING_METADATA_INVALID:${letter}`);
  const speechText = candidate === 'lexical'
    ? `The English letter name is ${names[letter]}.`
    : candidate === 'pause'
      ? `The English letter name is ...\n${letter}.`
      : `Listen carefully. Here is the English letter name: ${names[letter]}.`;
  return { id: `CANDIDATE-${id}-V10-15C-${candidate.toUpperCase()}`, language: 'English', locale: 'en-US',
    voiceProfile: 'DUDUQ_GOLD_VOICE_v1', voiceVersion: 'DUDUQ_GOLD_VOICE_v1', engine: 'chatterbox-multilingual-v3',
    model: 'Chatterbox Multilingual V3', deliveryProfile: 'NATURAL_CLEAR_V2',
    settings: gold.approvedDeliveryProfiles.NATURAL_CLEAR_V2.EN_CONTEXT_SENTENCE,
    referenceAudio, speechText, displayText: letter, targetLetter: letter,
    outputPath: rel(path.join(outputRoot, `${letter.toLowerCase()}-${candidate}.wav`)), sourceAudioId: id,
    sourceAudioPath: source.urlOrPath };
});
await mkdir(outputRoot, { recursive: true });
const engine = new ChatterboxEngine({ root: audioRoot,
  pythonPath: path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe'),
  workerPath: path.join(audioRoot, 'engine/chatterbox_worker.py'),
  workerConfigPath: path.join(audioRoot, 'config/chatterbox-runtime.json'),
  hfHome: path.join(audioRoot, '.runtime/chatterbox-hf'), loadTimeoutMs: 300000,
  generationTimeoutMs: 240000, backend: 'WSL' });
const pipeline = new AudioPipeline({ root, engine, paths: {
  cache: path.join(audioRoot, `.runtime/cache/chatterbox-gold-v1-NATURAL_CLEAR_V2-v10-15c-ew-${candidate}`),
  jobs: path.join(audioRoot, `.runtime/jobs/v10-15c-ew-${candidate}.json`),
  manifest: path.join(audioRoot, `.runtime/v10-15c-ew-${candidate}-run.json`),
}, maxRetries: 1 });
const startedAt = new Date().toISOString();
let batch;
try {
  await engine.start();
  batch = await pipeline.runBatch(inputs.map(item => ({ ...item, outputPath: path.join(root, item.outputPath) })), {
    closeEngine: false, preferResume: false,
    onJob: item => process.stdout.write(`${item.status} ${item.id}\n`),
  });
  if (batch.length !== letters.length || batch.some(item => item.status !== 'DONE' || !item.qc?.pass)) throw new Error('EW_CANDIDATE_WAV_QC_FAILED');
} finally { await engine.close(); }
const indexPath = path.join(outputRoot, `candidate-index-${candidate}.json`);
await writeFile(indexPath, JSON.stringify({ feature: 'DUDUQ_SURGICAL_E_W_AUDIO_REFINEMENT_V10_15C',
  status: 'STAGED_NOT_PUBLISHED', startedAt, completedAt: new Date().toISOString(),
  voiceVersion: 'DUDUQ_GOLD_VOICE_v1', engine: 'CHATTERBOX_MULTILINGUAL_V3', candidate,
  targetNameMap: names, targetOccurrencesInSpeechText: 1, humanPronunciationReview: 'PENDING',
  candidates: inputs.map(item => ({ letter: item.targetLetter, candidateId: item.id,
    sourceAudioId: item.sourceAudioId, stagedWav: item.outputPath,
    cacheKey: batch.find(result => result.id === item.id)?.cacheKey ?? null,
    technicalGenerationStatus: 'PASS_WAV_ONLY_PENDING_TARGET_EXTRACTION_AND_PRODUCTION_QC' })) }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ status: 'STAGED_EW_CANDIDATES_READY_FOR_ISOLATION', letters,
  candidate, index: rel(indexPath), canonicalRegistryChanged: false, humanPronunciation: 'PENDING' }, null, 2));

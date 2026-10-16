import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ChatterboxEngine } from '../duduq-audio/engine/chatterbox-engine.mjs';
import { AudioPipeline } from '../duduq-audio/pipeline/audio-pipeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioRoot = path.join(root, 'duduq-audio');
const rel = p => path.relative(root, p).split(path.sep).join('/');
const readJson = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));
const letters = process.argv[2] ? process.argv[2].toUpperCase().split('') : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const spokenNames = { A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'eff', G: 'jee', H: 'aitch', I: 'eye', J: 'jay', K: 'kay', L: 'ell', M: 'em', N: 'en', O: 'oh', P: 'pee', Q: 'cue', R: 'are', S: 'ess', T: 'tee', U: 'you', V: 'vee', W: 'double-you', X: 'ex', Y: 'why', Z: 'zee' };
const voiceVersion = 'DUDUQ_GOLD_VOICE_v1';
const engineId = 'chatterbox-multilingual-v3';
const deliveryProfile = 'NATURAL_CLEAR_V2';
const runtime = await readJson('duduq-audio/config/chatterbox-runtime.json');
const gold = await readJson('duduq-audio/config/gold-voice-worker.json');
const refs = await readJson('content/english/audio/audio-registry.json');
const referenceAudio = runtime.referenceAudio;
const expectedReferenceHash = 'de8a2962c8b0da2af1a0a7360a7d741053195c2870d443d5c45897a583035c4c';
const { sha256File } = await import('../duduq-audio/pipeline/audio-pipeline.mjs');
if (runtime.voiceVersion !== voiceVersion || runtime.device !== 'cpu' || await sha256File(referenceAudio) !== expectedReferenceHash) {
  throw new Error('APPROVED_GOLD_VOICE_REFERENCE_OR_RUNTIME_MISMATCH');
}
const registered = new Map(refs.entries.filter(row => /^AUD-EN-LETTER-[A-Z]$/.test(row.audioId)).map(row => [row.audioId, row]));
if (registered.size !== 26) throw new Error(`CANONICAL_LETTER_SET_INCOMPLETE:${registered.size}`);
const outputRoot = path.join(audioRoot, '.runtime/production-work/V10-15B-letter-candidates');
const cache = path.join(audioRoot, '.runtime/cache/chatterbox-gold-v1-NATURAL_CLEAR_V2-v10-15b-letter-candidates');
const inputs = letters.map(letter => {
  const id = `AUD-EN-LETTER-${letter}`;
  const source = registered.get(id);
  if (!source || source.language !== 'en' || source.voiceProfile !== voiceVersion) throw new Error(`LETTER_BINDING_METADATA_INVALID:${letter}`);
  return {
    id: `CANDIDATE-${id}-V10-15B`,
    language: 'English', locale: 'en-US', voiceProfile: voiceVersion, voiceVersion,
    engine: engineId, model: 'Chatterbox Multilingual V3', deliveryProfile,
    settings: gold.approvedDeliveryProfiles.NATURAL_CLEAR_V2.EN_CONTEXT_SENTENCE,
    referenceAudio, speechText: process.argv[2]
      ? (process.argv[3] === '2' ? `Listen carefully. Here is the English letter name. ${spokenNames[letter]}.` : `Listen carefully. The English letter name is:\n${letter}.`)
      : `The English letter name is ... ${letter}.`,
    displayText: letter, targetLetter: letter,
    outputPath: rel(path.join(outputRoot, `${letter.toLowerCase()}${process.argv[2] ? `-alt${process.argv[3] ?? '1'}` : ''}.wav`)),
    sourceAudioId: id, sourceAudioPath: source.urlOrPath,
  };
});
await mkdir(outputRoot, { recursive: true });
const engine = new ChatterboxEngine({ root: audioRoot,
  pythonPath: path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe'),
  workerPath: path.join(audioRoot, 'engine/chatterbox_worker.py'),
  workerConfigPath: path.join(audioRoot, 'config/chatterbox-runtime.json'),
  hfHome: path.join(audioRoot, '.runtime/chatterbox-hf'), loadTimeoutMs: 300000,
  generationTimeoutMs: 240000, backend: 'WSL' });
const pipeline = new AudioPipeline({ root, engine, paths: {
  cache, jobs: path.join(audioRoot, '.runtime/jobs/v10-15b-letter-candidates.json'),
  manifest: path.join(audioRoot, '.runtime/v10-15b-letter-candidate-run.json'),
}, maxRetries: 1 });
const startedAt = new Date().toISOString();
let batch;
try {
  await engine.start();
  batch = await pipeline.runBatch(inputs.map(x => ({ ...x, outputPath: path.join(root, x.outputPath) })), {
    closeEngine: false, preferResume: false,
    onJob: item => process.stdout.write(`${item.status} ${item.id}\n`),
  });
  if (batch.length !== letters.length || batch.some(x => x.status !== 'DONE' || !x.qc?.pass)) throw new Error('LETTER_CANDIDATE_WAV_QC_FAILED');
} finally { await engine.close(); }
const indexName = process.argv[2] ? `candidate-index-${process.argv[2].toLowerCase()}-${process.argv[3] ?? '1'}.json` : 'candidate-index.json';
await writeFile(path.join(outputRoot, indexName), JSON.stringify({
  feature: 'DUDUQ_FINAL_LETTER_AUDIO_REBUILD_V10_15B', status: 'STAGED_NOT_PUBLISHED',
  startedAt, completedAt: new Date().toISOString(), voiceVersion, engine: 'CHATTERBOX_MULTILINGUAL_V3',
  synthesisPromptPattern: 'The English letter name is ... {LETTER}.',
  targetOccurrencesInPrompt: 1, expectedLetterTargets: letters.length,
  humanPronunciationReview: 'PENDING',
  candidates: inputs.map(item => ({ letter: item.targetLetter, candidateId: item.id,
    sourceAudioId: item.sourceAudioId, sourceAudioPath: item.sourceAudioPath,
    stagedWav: item.outputPath, cacheKey: batch.find(row => row.id === item.id)?.cacheKey ?? null,
    technicalGenerationStatus: 'PASS_WAV_ONLY_PENDING_TARGET_ISOLATION_AND_POSTPROCESS_QC' })),
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ status: 'STAGED_WAV_CANDIDATES_READY_FOR_SIGNAL_REVIEW', count: 26,
  candidateIndex: rel(path.join(outputRoot, indexName)),
  humanPronunciation: 'PENDING', canonicalRegistryChanged: false }, null, 2));

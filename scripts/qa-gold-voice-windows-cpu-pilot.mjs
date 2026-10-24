import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { cacheKeyFor, sha256File } from '../duduq-audio/pipeline/audio-pipeline.mjs';
import { ChatterboxEngine } from '../duduq-audio/engine/chatterbox-engine.mjs';
import { inspectWav } from '../duduq-audio/pipeline/audio-pipeline.mjs';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const audioRoot = path.join(root, 'duduq-audio');
const runtimePath = path.join(audioRoot, 'config/chatterbox-runtime.json');
const voicePath = path.join(audioRoot, 'gold-voice/DUDUQ_GOLD_VOICE_v1.json');
const pythonPath = path.join(audioRoot, '.runtime/chatterbox-venv/Scripts/python.exe');
const runtime = JSON.parse(await readFile(runtimePath, 'utf8'));
const voice = JSON.parse(await readFile(voicePath, 'utf8'));
if (voice.status !== 'HOMOLOGATED' || voice.voiceVersion !== 'DUDUQ_GOLD_VOICE_v1' ||
    voice.engine !== 'chatterbox-multilingual-v3' || voice.device !== 'cpu' || runtime.device !== 'cpu') {
  throw new Error('APPROVED_WINDOWS_CPU_IDENTITY_PRECHECK_FAILED');
}
const { stdout: pythonInfo } = await execFile(pythonPath, ['-c',
  "import importlib.metadata as m, torch, sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}|{torch.__version__}|{m.version(\"chatterbox-tts\")}|{torch.cuda.is_available()}')"],
{ windowsHide: true, encoding: 'utf8' });
if (pythonInfo.trim() !== '3.11.9|2.6.0+cpu|0.1.7|False') throw new Error(`APPROVED_WINDOWS_CPU_RUNTIME_MISMATCH:${pythonInfo.trim()}`);

const transcript = 'There are ... objects.';
const outputPath = path.join(audioRoot, '.runtime/recovery-smoke/v3-native-cpu-pilot-v2.wav');
const referencePath = runtime.referenceAudio;
const generationOptions = voice.deliveryProfileApproval.generationProfiles.EN_CONTEXT_SENTENCE;
if (!generationOptions) throw new Error('APPROVED_CONTEXT_SENTENCE_PROFILE_MISSING');
await mkdir(path.dirname(outputPath), { recursive: true });
const engine = new ChatterboxEngine({ root: audioRoot, backend: 'WINDOWS', pythonPath,
  workerPath: path.join(audioRoot, 'engine/chatterbox_worker.py'), workerConfigPath: runtimePath,
  hfHome: path.join(audioRoot, '.runtime/chatterbox-hf'), loadTimeoutMs: 300000, generationTimeoutMs: 240000 });
let generation;
let error = null;
try {
  generation = await engine.generate({ text: transcript, outputPath, language: 'English',
    voiceProfile: 'DUDUQ_GOLD_VOICE_v1', options: generationOptions });
} catch (caught) {
  error = caught?.stack || String(caught);
} finally {
  await engine.close().catch(() => {});
}
const wavQc = !error ? await inspectWav(outputPath).catch(caught => ({ pass: false, error: caught.message })) : null;
let deliveryQc = null;
if (!error && wavQc?.pass) {
  const outputDir = path.dirname(outputPath);
  const masterPath = path.join(outputDir, 'v3-native-cpu-pilot-v2-master.wav');
  const audioPath = path.join(outputDir, 'v3-native-cpu-pilot-v2.mp3');
  const payloadPath = path.join(outputDir, 'v3-native-cpu-pilot-v2-postprocess.json');
  const cacheKey = cacheKeyFor({ speechText: transcript, language: 'English', locale: 'en-US',
    voiceProfile: voice.voiceVersion, voiceVersion: voice.voiceVersion, engine: voice.engine,
    model: voice.model, deliveryProfile: 'NATURAL_CLEAR_V2', settings: generationOptions,
    referenceVoiceHash: await sha256File(referencePath) });
  await writeFile(payloadPath, `${JSON.stringify({ settings: runtime.productionPostProcessing, items: [{
    id: 'DUDUQ-V3-NATIVE-CPU-PILOT', voiceVersion: voice.voiceVersion, engine: voice.engine,
    model: voice.model, deliveryProfile: voice.approvedDeliveryProfile, text: transcript,
    speechText: transcript, cacheKey, sourceWav: outputPath, masterPath, audioPath,
    masterAudioPath: masterPath, audioPathRelative: audioPath,
  }] }, null, 2)}\n`, 'utf8');
  try {
    const { stdout } = await execFile(pythonPath, [path.join(audioRoot, 'scripts/process-production-audio.py'), payloadPath],
      { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
    const postprocess = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
    const row = postprocess.results?.[0];
    deliveryQc = row ? { status: row.masterQc?.pass && row.mp3Qc?.pass ? 'PASS' : 'ISSUE', masterQc: row.masterQc, mp3Qc: row.mp3Qc,
      normalization: row.normalization, onsetQc: row.onsetQc, audioSha256: row.audioSha256,
      masterSha256: row.masterSha256, audioPath, masterPath } : { status: 'ISSUE', failures: postprocess.failures || [] };
  } catch (caught) { deliveryQc = { status: 'ISSUE', error: caught.message }; }
}
const report = {
  feature: 'DUDUQ_GOLD_VOICE_WINDOWS_CPU_PILOT',
  testedAt: new Date().toISOString(),
  backend: 'WINDOWS',
  voice: voice.voiceVersion,
  engine: voice.engine,
  model: voice.model,
  pythonRuntime: pythonInfo.trim(),
  referenceSha256: voice.reference.sourceSha256,
  transcript,
  generated: Boolean(generation),
  generation: generation || null,
  wavQc: wavQc || null,
  deliveryQc,
  promotion: 'NONE — isolated pilot only; no audio registry, manifest, or active binding changed',
  result: !error && wavQc?.pass && deliveryQc?.status === 'PASS' ?
    'PILOT_GENERATION_AND_APPROVED_DELIVERY_QC_PASS_PENDING_PRONUNCIATION_REVIEW' : 'BLOCKED',
  error,
};
const reportPath = path.join(root, 'docs/qa/DUDUQ_GOLD_VOICE_WINDOWS_CPU_PILOT_2026-10-20.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: report.result, backend: report.backend, transcript,
  generationSeconds: generation?.generationTime ?? null, wavQc, report: reportPath }, null, 2));
if (report.result === 'BLOCKED') process.exitCode = 1;

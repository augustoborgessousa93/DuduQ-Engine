import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { ChatterboxEngine } from '../duduq-audio/engine/chatterbox-engine.mjs';
import { inspectWav, sha256File } from '../duduq-audio/pipeline/audio-pipeline.mjs';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const qaRoot = path.join(root, 'docs/qa');
const decisionsPath = path.resolve(root, '../DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4_DECISIONS.json');
const registryPath = path.join(root, 'content/english/audio/audio-registry.json');
const recoveryPath = path.join(qaRoot, 'DUDUQ_GOLD_VOICE_RECOVERY_V3.json');
const queuePath = path.join(qaRoot, 'DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json');
const runtimePath = path.join(root, 'duduq-audio/config/chatterbox-runtime.json');
const voicePath = path.join(root, 'duduq-audio/gold-voice/DUDUQ_GOLD_VOICE_v1.json');
const statusPath = path.join(root, 'duduq-audio/AUDIO_AUTOPILOT_STATUS.json');
const pythonPath = path.join(root, 'duduq-audio/.runtime/chatterbox-venv/Scripts/python.exe');
const processScript = path.join(root, 'duduq-audio/scripts/process-production-audio.py');
const rejectedIds = new Set([
  'AUD-SS-RETRY-EN-6628E7B69B593A0A',
  'AUD-SS-RETRY-EN-EB9D435DBF3638E0',
  'AUD-SS-RETRY-EN-60C1207D7CE0208C',
  'AUD-SS-RETRY-EN-C48CD3942011CBDD',
]);
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const shaText = text => createHash('sha256').update(text).digest('hex');
const reportPath = path.join(qaRoot, 'DUDUQ_FOUR_AUDIO_REGENERATION_V6_1.json');

const [decisions, registry, recovery, queue, runtime, voice, status] = await Promise.all([
  json(decisionsPath), json(registryPath), json(recoveryPath), json(queuePath), json(runtimePath), json(voicePath), json(statusPath),
]);
const report = {
  feature: 'DUDUQ_FOUR_AUDIO_REGENERATION_V6_1', generatedAt: new Date().toISOString(),
  engine: 'CHATTERBOX_MULTILINGUAL_V3', voice: 'DUDUQ_GOLD_VOICE_v1', backend: 'WINDOWS_CPU_APPROVED_PATH',
  humanReviewFile: decisionsPath, candidates: [], promotion: 'NONE', activeRegistryOrBindingsChanged: false,
};
const finish = async () => writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

try {
  if (decisions.schema !== 'DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4' || decisions.humanAuthority !== 'Augusto' || decisions.items?.length !== 29)
    throw new Error('HUMAN_DECISION_FILE_SCHEMA_OR_COUNT_INVALID');
  const rejected = decisions.items.filter(item => item.decision === 'REJECTED');
  if (rejected.length !== 4 || rejected.some(item => !rejectedIds.has(item.audioId))) throw new Error('REJECTED_SET_DOES_NOT_MATCH_AUTHORIZED_FOUR');
  const registered = new Map(registry.entries.map(entry => [entry.audioId, entry]));
  const generated = new Map(recovery.generatedAssets.map(asset => [asset.audioId, asset]));
  const jobs = new Map(queue.jobs.map(job => [job.audioId, job]));
  for (const decision of rejected) {
    const entry = registered.get(decision.audioId), asset = generated.get(decision.audioId), job = jobs.get(decision.audioId);
    if (!entry || !asset || !job || entry.urlOrPath !== asset.path) throw new Error(`SOURCE_TRACEABILITY_INVALID:${decision.audioId}`);
    const oldPath = path.resolve(root, entry.urlOrPath);
    const oldHash = await sha256File(oldPath);
    if (oldHash !== decision.audioSha256 || oldHash !== entry.contentHash || oldHash !== asset.contentHash)
      throw new Error(`REJECTED_AUDIO_HASH_MISMATCH:${decision.audioId}`);
  }
  if (voice.status !== 'HOMOLOGATED' || voice.voiceVersion !== 'DUDUQ_GOLD_VOICE_v1' || voice.engine !== 'chatterbox-multilingual-v3' ||
      voice.device !== 'cpu' || runtime.device !== 'cpu') throw new Error('APPROVED_VOICE_IDENTITY_PRECHECK_FAILED');
  if (await sha256File(runtime.referenceAudio) !== voice.reference.processedAudioSha256) throw new Error('APPROVED_PROCESSED_REFERENCE_HASH_MISMATCH');
  await access(pythonPath);
  const { stdout: pythonInfo } = await execFile(pythonPath, ['-c',
    "import importlib.metadata as m, torch, sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}|{torch.__version__}|{m.version(\"chatterbox-tts\")}|{torch.cuda.is_available()}')"],
  { windowsHide: true, encoding: 'utf8' });
  report.pythonRuntime = pythonInfo.trim();
  if (pythonInfo.trim() !== '3.11.9|2.6.0+cpu|0.1.7|False') throw new Error(`APPROVED_WINDOWS_CPU_RUNTIME_MISMATCH:${pythonInfo.trim()}`);

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(qaRoot, 'gold-voice-human-review-v6_1', `replacement-candidates-${runId}`);
  await mkdir(outputDir, { recursive: true });
  report.candidateDirectory = path.relative(root, outputDir).replaceAll('\\', '/');
  const hfHome = status.hfCache || path.join(root, 'duduq-audio/.runtime/chatterbox-hf');
  const engine = new ChatterboxEngine({ root: path.join(root, 'duduq-audio'), backend: 'WINDOWS', pythonPath,
    workerPath: path.join(root, 'duduq-audio/engine/chatterbox_worker.py'), workerConfigPath: runtimePath,
    hfHome, loadTimeoutMs: 300000, generationTimeoutMs: 240000 });
  try {
    for (const decision of rejected) {
      const entry = registered.get(decision.audioId), job = jobs.get(decision.audioId);
      const transcript = entry.speechText || entry.transcript;
      if (!transcript || transcript !== job.transcript) throw new Error(`EXACT_TRANSCRIPT_MISMATCH:${decision.audioId}`);
      const stem = decision.audioId.toLowerCase();
      const sourceWav = path.join(outputDir, `${stem}.source.wav`);
      const masterWav = path.join(outputDir, `${stem}.master.wav`);
      const mp3 = path.join(outputDir, `${stem}.candidate.mp3`);
      const payload = path.join(outputDir, `${stem}.postprocess.json`);
      const preexisting = await Promise.all([sourceWav, masterWav, mp3, payload].map(file => access(file).then(() => true).catch(() => false)));
      if (preexisting.some(Boolean)) throw new Error(`CANDIDATE_OUTPUT_COLLISION:${decision.audioId}`);
      const generation = await engine.generate({ text: transcript, outputPath: sourceWav, language: 'English',
        voiceProfile: 'DUDUQ_GOLD_VOICE_v1', options: voice.deliveryProfileApproval.generationProfiles.EN_CONTEXT_SENTENCE });
      const sourceQc = await inspectWav(sourceWav);
      if (!sourceQc.pass) throw new Error(`SOURCE_WAV_QC_FAILED:${decision.audioId}`);
      const textHash = job.queue.textHash;
      const item = { id: decision.audioId, voiceVersion: voice.voiceVersion, engine: voice.engine, model: voice.model,
        cacheKey: textHash, sourceWav, masterPath: masterWav, audioPath: mp3,
        masterAudioPath: path.relative(root, masterWav).replaceAll('\\', '/'),
        audioPathRelative: path.relative(root, mp3).replaceAll('\\', '/') };
      await writeFile(payload, `${JSON.stringify({ settings: runtime.productionPostProcessing, items: [item] }, null, 2)}\n`);
      const { stdout } = await execFile(pythonPath, [processScript, payload], { windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8',
        env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', HF_HOME: hfHome, HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' } });
      const processed = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
      const qc = processed.results?.find(row => row.id === decision.audioId);
      if (processed.failures?.length || !qc?.masterQc?.pass || !qc?.mp3Qc?.pass) throw new Error(`DELIVERY_QC_FAILED:${decision.audioId}`);
      report.candidates.push({ audioId: decision.audioId, transcript, consumers: job.consumers,
        rejectedSha256: decision.audioSha256, rejectedPath: entry.urlOrPath, replacementRelativePath: item.audioPathRelative,
        replacementSha256: qc.audioSha256, masterSha256: qc.masterSha256, textHash, sourceQc, deliveryQc: qc,
        generation: { generationTimeSeconds: generation.generationTime, engine: generation.engine, model: generation.model,
          voice: voice.voiceVersion, referenceSha256: voice.reference.sourceSha256, generationProfile: 'EN_CONTEXT_SENTENCE' },
        humanDecision: 'PENDING_HUMAN_REVIEW_FOR_REPLACEMENT_HASH' });
      await finish();
    }
  } finally { await engine.close().catch(() => {}); }
  report.status = report.candidates.length === 4 && report.candidates.every(item => item.deliveryQc.masterQc.pass && item.deliveryQc.mp3Qc.pass)
    ? 'TECHNICAL_QC_PASS_PENDING_HUMAN_PRONUNCIATION' : 'ISSUE';
} catch (error) {
  report.status = 'BLOCKED_OR_ISSUE';
  report.error = error?.stack || String(error);
} finally { await finish(); }
console.log(JSON.stringify({ status: report.status, candidates: report.candidates.length, report: reportPath, error: report.error || null }, null, 2));
if (report.status !== 'TECHNICAL_QC_PASS_PENDING_HUMAN_PRONUNCIATION') process.exitCode = 1;

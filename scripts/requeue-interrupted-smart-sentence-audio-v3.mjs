import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createAudioControl } from '../duduq-audio/control/audio-control.mjs';

const root = process.cwd();
const queueReportPath = path.join(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json');
const queueRoot = path.join(root, '.duduq/audio-queue');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const exists = async file => stat(file).then(() => true).catch(() => false);
const report = await readJson(queueReportPath);
const registry = await createAudioControl(root).loadRegistry();
const pendingFiles = (await readdir(path.join(queueRoot, 'pending'))).filter(name => name.endsWith('.json'));
if (pendingFiles.length) throw new Error(`PENDING_AUDIO_QUEUE_NOT_EMPTY:${pendingFiles.length}`);
const processing = await readdir(path.join(queueRoot, 'processing'));
const failed = await readdir(path.join(queueRoot, 'failed'));
const completed = await readdir(path.join(queueRoot, 'completed'));
const recover = [];
for (const job of report.jobs) {
  const semantic = registry.audioControlLayer.semanticAssets[job.audioId];
  if (semantic?.currentAudioId) continue;
  const failedRequestName = failed.find(name => name === `${job.queue?.requestId}.json`);
  const processingRequestName = processing.find(name => name === `${job.queue?.requestId}.json`);
  const completedRequestName = completed.find(name => name === `${job.queue?.requestId}.json`);
  if (completedRequestName) continue;
  const state = semantic?.pendingRequest;
  if (failedRequestName) {
    const failedResult = await readJson(path.join(queueRoot, 'failed', `${failedRequestName}.result.json`));
    if (failedResult.error !== 'AUDIO_WORKER_WINDOWS_PYTHON_NOT_CONFIGURED') throw new Error(`UNEXPECTED_FAILED_REQUEST:${job.audioId}:${failedResult.error}`);
    if (state) throw new Error(`FAILED_REQUEST_STILL_PENDING:${job.audioId}:${state}`);
  } else if (processingRequestName) {
    const processingRequest = await readJson(path.join(queueRoot, 'processing', processingRequestName));
    if (processingRequest.audioId !== job.audioId || processingRequest.text !== job.transcript) throw new Error(`PROCESSING_IDENTITY_MISMATCH:${job.audioId}`);
    if (state !== processingRequest.requestId) throw new Error(`PROCESSING_PENDING_REQUEST_MISMATCH:${job.audioId}:${state}`);
    const source = path.resolve(root, processingRequest.outputWav);
    if (await exists(source)) throw new Error(`ORPHAN_SOURCE_WAV_REQUIRES_QC_RECOVERY:${job.audioId}:${processingRequest.outputWav}`);
    semantic.pendingRequest = null;
    delete semantic.pendingTextHash;
    delete semantic.pendingText;
    delete semantic.pendingOperation;
    await createAudioControl(root).saveRegistry(registry);
  } else throw new Error(`UNACCOUNTED_REQUEST_STATE:${job.audioId}`);
  recover.push(job);
}

const control = createAudioControl(root);
const results = [];
for (const job of recover) {
  const result = await control.enqueue({ audioId: job.audioId, semanticRole: 'SMART_SENTENCE_RETRY',
    language: 'en', text: job.transcript, operation: 'create', shared: true });
  results.push({ audioId: job.audioId, transcript: job.transcript, result });
}
const output = { feature: 'DUDUQ_GOLD_VOICE_RECOVERY_V3_INTERRUPTED_REQUEUE',
  createdAt: new Date().toISOString(), recoveredCount: results.length,
  priorQueueHistoryPreserved: true, results };
const outputPath = path.join(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_INTERRUPTED_REQUEUE.json');
await import('node:fs/promises').then(fs => fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8'));
console.log(JSON.stringify({ recoveredCount: output.recoveredCount,
  queued: results.filter(row => row.result.status === 'PREPARED_WORKER_OFFLINE').length, output: outputPath }, null, 2));

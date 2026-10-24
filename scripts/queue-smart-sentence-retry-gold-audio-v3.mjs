import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAudioControl } from '../duduq-audio/control/audio-control.mjs';

const root = process.cwd();
const bootstrapPath = path.join(root, 'docs/qa/DUDUQ_FINAL_SMART_SENTENCE_AUDIO_BOOTSTRAP_2026-10-20.json');
const manifestPath = path.join(root, 'duduq-audio/manifests/AUDIO_MANIFEST.json');
const reportPath = path.join(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json');
const bootstrap = JSON.parse(await readFile(bootstrapPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (bootstrap.requested !== 55 || bootstrap.rendered !== 55 || bootstrap.blocked !== 44) {
  throw new Error(`FRESH_SMART_SENTENCE_BOOTSTRAP_EXPECTATION_MISMATCH:${bootstrap.requested}/${bootstrap.rendered}/${bootstrap.blocked}`);
}
const transcriptSet = new Set();
const consumers = new Map();
for (const result of bootstrap.results.filter(row => row.result !== 'BOOTED')) {
  for (const error of result.errors || []) {
    const match = error.match(/^SMART_SENTENCE_AUDIO_FLOW_V2_ASSET_MISSING:[^:]+:[^:]+:(.*)$/);
    if (!match) continue;
    for (const text of match[1].split('|').map(value => value.normalize('NFC').replace(/\s+/g, ' ').trim()).filter(Boolean)) {
      transcriptSet.add(text);
      const list = consumers.get(text) || [];
      list.push({ moduleId: result.moduleId, questionId: result.questionId });
      consumers.set(text, list);
    }
  }
}
const transcripts = [...transcriptSet].sort();
if (transcripts.length !== 29) throw new Error(`EXPECTED_29_EXACT_RETRY_TRANSCRIPTS:${transcripts.length}`);
const approvedExact = transcripts.flatMap(text => manifest.items.filter(row => row.status === 'APPROVED' &&
  row.voiceVersion === 'DUDUQ_GOLD_VOICE_v1' && row.engine === 'chatterbox-multilingual-v3' &&
  (row.speechText || row.transcript || '') === text).map(row => ({ text, audioId: row.id || row.audioId })));
if (approvedExact.length) throw new Error(`EXACT_APPROVED_AUDIO_EXISTS_REUSE_FIRST:${JSON.stringify(approvedExact)}`);

const control = createAudioControl(root);
const registry = await control.loadRegistry();
const jobs = [];
for (const text of transcripts) {
  const hash = createHash('sha256').update(`${text}|en-US|DUDUQ_GOLD_VOICE_v1|CHATTERBOX_MULTILINGUAL_V3`).digest('hex').slice(0, 16).toUpperCase();
  const audioId = `AUD-SS-RETRY-EN-${hash}`;
  const prior = registry.audioControlLayer.semanticAssets[audioId];
  if (prior && (prior.text !== text || prior.language !== 'en' || prior.semanticRole !== 'SMART_SENTENCE_RETRY')) {
    throw new Error(`STABLE_AUDIO_ID_COLLISION:${audioId}`);
  }
  const result = await control.enqueue({ audioId, semanticRole: 'SMART_SENTENCE_RETRY', language: 'en',
    text, operation: 'create', shared: true });
  jobs.push({ audioId, transcript: text, consumers: consumers.get(text) || [], queue: result });
}
const report = { feature: 'DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE', createdAt: new Date().toISOString(),
  sourceBootstrap: bootstrapPath, requestedTranscripts: 29, exactApprovedReuse: 0,
  queued: jobs.filter(job => job.queue.status === 'PREPARED_WORKER_OFFLINE').length,
  reused: jobs.filter(job => job.queue.status === 'REUSED_EXISTING').length, jobs };
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ requested: report.requestedTranscripts, queued: report.queued, reused: report.reused, report: reportPath }, null, 2));

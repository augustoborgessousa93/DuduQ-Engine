import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const uiRoot = resolve(root, 'docs/qa/gold-voice-human-review-v4');
const recoveryPath = resolve(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3.json');
const queuePath = resolve(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json');
const registryPath = resolve(root, 'content/english/audio/audio-registry.json');
const candidateReportPath = resolve(root, 'docs/qa/DUDUQ_FOUR_AUDIO_REGENERATION_V6_1.json');
const decisionsPath = resolve(root, '../DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4_DECISIONS.json');
const port = Number(process.env.DUDUQ_REVIEW_PORT || 4182);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg' };
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const safePath = relative => {
  if (typeof relative !== 'string' || relative.includes('..') || relative.startsWith('/') || relative.includes('\\')) throw new Error('UNSAFE_AUDIO_PATH');
  const full = resolve(root, relative);
  if (!full.startsWith(root + sep)) throw new Error('AUDIO_PATH_OUTSIDE_WORKSPACE');
  return full;
};

async function inventory() {
  const [recovery, queue, registry, candidateReport, decisions] = await Promise.all([
    json(recoveryPath), json(queuePath), json(registryPath), json(candidateReportPath), json(decisionsPath),
  ]);
  if (candidateReport.status !== 'TECHNICAL_QC_PASS_PENDING_HUMAN_PRONUNCIATION' || candidateReport.candidates?.length !== 4)
    throw new Error('REPLACEMENT_CANDIDATE_REPORT_NOT_PASS');
  if (decisions.schema !== 'DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4' || decisions.humanAuthority !== 'Augusto' || decisions.items?.length !== 29)
    throw new Error('HUMAN_DECISION_FILE_INVALID');
  const approved = decisions.items.filter(row => row.decision === 'APPROVED');
  const rejected = decisions.items.filter(row => row.decision === 'REJECTED');
  if (approved.length !== 25 || rejected.length !== 4 || decisions.items.some(row => !['APPROVED', 'REJECTED'].includes(row.decision)))
    throw new Error('HUMAN_DECISION_COUNTS_INVALID');
  const recoveryById = new Map(recovery.generatedAssets.map(row => [row.audioId, row]));
  const queueById = new Map(queue.jobs.map(row => [row.audioId, row]));
  const registryById = new Map(registry.entries.map(row => [row.audioId, row]));
  const rejectedById = new Map(rejected.map(row => [row.audioId, row]));
  const replacementById = new Map(candidateReport.candidates.map(row => [row.audioId, row]));
  const initialDecisions = [];
  const items = [];
  for (const old of recovery.generatedAssets) {
    const entry = registryById.get(old.audioId), job = queueById.get(old.audioId), human = decisions.items.find(row => row.audioId === old.audioId);
    if (!entry || !job || !human) throw new Error(`REVIEW_ITEM_TRACEABILITY_MISSING:${old.audioId}`);
    let pathValue = entry.urlOrPath, expectedHash = old.contentHash, previousSha256 = null, previousPath = null;
    let qcStatus = entry.qcStatus;
    if (human.decision === 'APPROVED') {
      if (pathValue !== old.path || expectedHash !== human.audioSha256 || entry.contentHash !== expectedHash) throw new Error(`APPROVED_AUDIO_METADATA_MISMATCH:${old.audioId}`);
      initialDecisions.push({ audioId: old.audioId, audioSha256: human.audioSha256, decision: 'APPROVED',
        reviewer: human.reviewer, reviewedAt: human.reviewedAt, notes: String(human.notes || '') });
    } else {
      const replacement = replacementById.get(old.audioId);
      if (!replacement || replacement.rejectedSha256 !== human.audioSha256 || replacement.rejectedPath !== entry.urlOrPath ||
          replacement.transcript !== (entry.speechText || entry.transcript) || !replacement.deliveryQc.masterQc?.pass || !replacement.deliveryQc.mp3Qc?.pass)
        throw new Error(`REPLACEMENT_AUDIO_METADATA_MISMATCH:${old.audioId}`);
      const previousBytes = await readFile(safePath(entry.urlOrPath));
      if (sha256(previousBytes) !== human.audioSha256) throw new Error(`REJECTED_AUDIO_HASH_MISMATCH:${old.audioId}`);
      pathValue = replacement.replacementRelativePath;
      expectedHash = replacement.replacementSha256;
      previousSha256 = human.audioSha256;
      previousPath = entry.urlOrPath;
      qcStatus = 'PASS';
    }
    const bytes = await readFile(safePath(pathValue));
    const actualHash = sha256(bytes);
    if (actualHash !== expectedHash) throw new Error(`REVIEW_AUDIO_HASH_MISMATCH:${old.audioId}`);
    const technicalDetails = replacementById.get(old.audioId)?.deliveryQc;
    items.push({ audioId: old.audioId, transcript: entry.transcript, speechText: entry.speechText,
      audioSha256: actualHash, qcStatus, technicalApprovalStatus: human.decision === 'APPROVED' ? 'HUMAN_APPROVED_EXACT_HASH' : 'TECHNICAL_QC_PASS_HUMAN_PRONUNCIATION_PENDING',
      path: pathValue, sizeBytes: bytes.length, consumers: job.consumers, groupLabel: 'SMART SENTENCE · RETRY',
      previousSha256, previousPath, onsetSafety: technicalDetails?.onsetQc || null, _absolute: safePath(pathValue),
      _previousAbsolute: previousPath ? safePath(previousPath) : null });
  }
  if (items.length !== 29 || new Set(items.map(row => row.audioId)).size !== 29 || new Set(items.map(row => row.audioSha256)).size !== 29)
    throw new Error('REVIEW_INVENTORY_IDENTITY_OR_HASH_DUPLICATE');
  return { items, initialDecisions };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/health') {
      const { items } = await inventory();
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ status: 'PASS', total: items.length, humanReviewRequired: true, approvedImported: 25, replacementCandidatesPending: 4 })); return;
    }
    if (url.pathname === '/api/items') {
      const data = await inventory();
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ feature: 'DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V6_1', total: data.items.length,
        technicalQcPassed: data.items.filter(row => row.qcStatus === 'PASS').length,
        humanApproval: '25_EXISTING_APPROVALS_IMPORTED_4_REPLACEMENTS_PENDING',
        initialDecisions: data.initialDecisions,
        items: data.items.map(({ _absolute, _previousAbsolute, ...item }) => item) })); return;
    }
    if (url.pathname.startsWith('/audio/') || url.pathname.startsWith('/previous/')) {
      const previous = url.pathname.startsWith('/previous/');
      const id = decodeURIComponent(url.pathname.slice(previous ? '/previous/'.length : '/audio/'.length));
      const item = (await inventory()).items.find(row => row.audioId === id);
      const fullPath = previous ? item?._previousAbsolute : item?._absolute;
      if (!item || !fullPath) { res.writeHead(404); res.end('Unknown audio'); return; }
      const info = await stat(fullPath), bytes = await readFile(fullPath), range = req.headers.range;
      res.setHeader('content-type', 'audio/mpeg'); res.setHeader('accept-ranges', 'bytes'); res.setHeader('cache-control', 'no-store');
      if (range) {
        const [startText, endText] = range.replace(/bytes=/, '').split('-');
        const start = Number(startText), end = endText ? Math.min(Number(endText), info.size - 1) : info.size - 1;
        if (!Number.isInteger(start) || start < 0 || end < start) { res.writeHead(416); res.end(); return; }
        res.writeHead(206, { 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 }); res.end(bytes.subarray(start, end + 1));
      } else { res.writeHead(200, { 'content-length': bytes.length }); res.end(bytes); }
      return;
    }
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const target = resolve(uiRoot, `.${pathname}`);
    if (!target.startsWith(uiRoot + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(body);
  } catch (error) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); }
});

server.listen(port, '127.0.0.1', () => console.log(`DUDUQ GOLD VOICE HUMAN REVIEW V6.1: http://127.0.0.1:${port}/`));

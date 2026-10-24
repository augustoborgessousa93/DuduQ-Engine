import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const uiRoot = resolve(root, 'docs/qa/gold-voice-human-review-v4');
const recoveryPath = resolve(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3.json');
const queuePath = resolve(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json');
const registryPath = resolve(root, 'content/english/audio/audio-registry.json');
const port = Number(process.env.DUDUQ_REVIEW_PORT || 4181);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg' };

async function inventory() {
  const [recovery, queue, registry] = await Promise.all([recoveryPath, queuePath, registryPath].map(async p => JSON.parse(await readFile(p, 'utf8'))));
  const registryEntries = new Map(registry.entries.map(x => [x.audioId, x]));
  const jobs = new Map(queue.jobs.map(x => [x.audioId, x]));
  const items = [];
  for (const asset of recovery.generatedAssets) {
    const entry = registryEntries.get(asset.audioId);
    const job = jobs.get(asset.audioId);
    if (!entry || !job) throw new Error(`Registry/queue entry absent for ${asset.audioId}`);
    const rel = entry.urlOrPath;
    if (rel !== asset.path) throw new Error(`Registry/QC path mismatch for ${asset.audioId}`);
    if (typeof rel !== 'string' || rel.includes('..') || rel.startsWith('/') || rel.includes('\\')) throw new Error(`Unsafe asset path for ${asset.audioId}`);
    const absolute = resolve(root, rel);
    if (!absolute.startsWith(root + sep)) throw new Error(`Asset escaped workspace: ${asset.audioId}`);
    const bytes = await readFile(absolute);
    const actualHash = createHash('sha256').update(bytes).digest('hex');
    if (actualHash !== asset.contentHash || actualHash !== entry.contentHash) throw new Error(`Audio hash drift: ${asset.audioId}`);
    items.push({ audioId: asset.audioId, transcript: entry.transcript, speechText: entry.speechText, audioSha256: actualHash, qcStatus: entry.qcStatus, technicalApprovalStatus: entry.approvalStatus, path: rel, sizeBytes: bytes.length, consumers: job.consumers, groupLabel: 'SMART SENTENCE · RETRY', _absolute: absolute });
  }
  if (items.length !== 29 || new Set(items.map(x => x.audioId)).size !== 29) throw new Error(`Expected exactly 29 unique assets, found ${items.length}`);
  return items;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'PASS', humanReviewRequired: true })); return; }
    if (url.pathname === '/api/items') {
      const items = await inventory();
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ feature: 'DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4', total: items.length, technicalQcPassed: items.filter(x => x.qcStatus === 'PASS').length, humanApproval: 'PENDING', items: items.map(({ _absolute, ...item }) => item) })); return;
    }
    if (url.pathname.startsWith('/audio/')) {
      const id = decodeURIComponent(url.pathname.slice('/audio/'.length));
      const item = (await inventory()).find(x => x.audioId === id);
      if (!item) { res.writeHead(404); res.end('Unknown audio'); return; }
      const info = await stat(item._absolute);
      const range = req.headers.range;
      res.setHeader('content-type', 'audio/mpeg');
      res.setHeader('accept-ranges', 'bytes');
      res.setHeader('cache-control', 'no-store');
      if (range) {
        const [startText, endText] = range.replace(/bytes=/, '').split('-');
        const start = Number(startText); const end = endText ? Math.min(Number(endText), info.size - 1) : info.size - 1;
        if (!Number.isInteger(start) || start < 0 || end < start) { res.writeHead(416); res.end(); return; }
        const bytes = await readFile(item._absolute);
        res.writeHead(206, { 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 }); res.end(bytes.subarray(start, end + 1));
      } else { const bytes = await readFile(item._absolute); res.writeHead(200, { 'content-length': bytes.length }); res.end(bytes); }
      return;
    }
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const target = resolve(uiRoot, `.${pathname}`);
    if (!target.startsWith(uiRoot + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(body);
  } catch (error) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); }
});

server.listen(port, '127.0.0.1', () => console.log(`DUDUQ GOLD VOICE HUMAN REVIEW: http://127.0.0.1:${port}/`));

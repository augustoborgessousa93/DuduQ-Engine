import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createContentStudioMediaApi } from '../../scripts/lib/content-studio-media-api.mjs';

const root = process.cwd();
const v19Root = path.join(root, 'dist-pages');
const tempData = await mkdtemp(path.join(os.tmpdir(), 'duduq-media-api-'));
const handler = createContentStudioMediaApi({ root, dataDir: tempData, v19Root, moduleIndexPath: path.join(root, 'content/english/master/modules-index.json') });
const server = createServer(async (req, res) => {
  const origin = `http://${req.headers.host}`;
  const url = new URL(req.url, origin);
  try { if (!await handler(req, res, url, origin, 'test-admin-session')) res.writeHead(404).end(); }
  catch (error) { res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error.message })); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const auth = { 'x-duduq-admin-token': 'test-admin-session' };

test('API local restringe inventário e entrega o gabarito canônico dos casos reais', async () => {
  const denied = await fetch(`${origin}/api/media/image-inventory`);
  assert.equal(denied.status, 403);
  const inventoryResponse = await fetch(`${origin}/api/media/image-inventory`, { headers: auth });
  assert.equal(inventoryResponse.status, 200);
  const inventory = await inventoryResponse.json();
  assert.equal(inventory.moduleCount, 30); assert.equal(inventory.questionCount, 600);
  assert.equal(inventory.v19ManifestSha256, 'CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E');

  const target = await (await fetch(`${origin}/api/media/activity?moduleId=Y1M03&itemId=Y1M03-Q007`, { headers: auth })).json();
  assert.equal(target.answerKey.status, 'IDENTIFIED'); assert.equal(target.answerKey.responseText, 'purple');
  assert.deepEqual(target.answerKey.alternatives.map(item => [item.label, item.role]), [['purple','CORRECT'],['gray','DISTRACTOR'],['brown','DISTRACTOR'],['red','DISTRACTOR']]);
  const grouping = await (await fetch(`${origin}/api/media/activity?moduleId=Y1M03&itemId=Y1M03-Q002`, { headers: auth })).json();
  assert.equal(grouping.answerKey.associations.length, 8);
  assert.equal(grouping.answerKey.associations.find(item => item.label === 'purple').groupLabel, 'MORE COLOR WORDS');
  assert.match(grouping.previewHint, /fluxo curricular oficial/);
  assert.equal(grouping.gabaritoAdminOnly, true);
});

test('API faz upload PNG real validado sem tocar na fonte V19', async () => {
  const file = path.join(v19Root, 'content/english/assets/images/year-1/module-01/temporary/17b5d6b93dc5-bye-tchau.png');
  const bytes = await readFile(file);
  const response = await fetch(`${origin}/api/media/image-upload?filename=qa-temporary.png&alpha=QA_ONLY`, {
    method: 'POST', headers: { ...auth, origin, 'content-type': 'image/png' }, body: bytes
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.entry.immutable, true); assert.equal(result.entry.width, 1254); assert.equal(result.entry.height, 1254);
  assert.match(result.entry.sha256, /^[a-f0-9]{64}$/);
  const notImage = await fetch(`${origin}/api/media/image-upload?filename=bad.png`, { method: 'POST', headers: { ...auth, origin, 'content-type': 'image/png' }, body: Buffer.from('not-image') });
  assert.equal(notImage.status, 422);
  assert.equal((await readFile(file)).equals(bytes), true);
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await rm(tempData, { recursive: true, force: true });
});

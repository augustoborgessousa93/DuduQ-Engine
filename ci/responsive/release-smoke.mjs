import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const origin = process.env.DUDUQ_CANDIDATE_ORIGIN || 'http://127.0.0.1:4176';
const root = await (await fetch(`${origin}/__duduq/status`)).json();
assert.equal(root.status, 'ready', 'candidate server is healthy');
const expectedCss = {
  '/core/duduq-live-hud.css': 'a6e77a2de7b9928fe2fc5482e1e828edf6ec161773d3ad3d7e063d96c62da8ba',
  '/play/drag-drop-multimedia/drag-drop-multimedia.css': '2a5aa9665c642ff5bb621d924e054b02a187cafcdba2ff7b3d8e15b09ca78175',
  '/play/drag-drop/drag-drop.css': '4ed80343a9e24cff70b3b30b6dbe4a4833835f4beaa9c01b613c9e0a5c9a90f5',
  '/play/intro-module/intro-module.css': '512a5daa57c0ea27e59737a15fb1a6d23073dd4397c7b258caf3eb35fdddd34f'
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const css = {};
for (const [route, expected] of Object.entries(expectedCss)) {
  const response = await fetch(new URL(route, origin));
  assert.equal(response.status, 200, `CSS HTTP 200 ${route}`);
  const actual = digest(Buffer.from(await response.arrayBuffer()));
  assert.equal(actual, expected, `served candidate CSS hash ${route}`);
  css[route] = actual;
}
const modules = [];
for (let year = 1; year <= 5; year++) for (let module = 1; module <= 6; module++) {
  const route = `/play/english/year-${year}/module-${String(module).padStart(2, '0')}/`;
  const response = await fetch(new URL(route, origin));
  modules.push({ route, status: response.status });
}
const failed = modules.filter(row => row.status !== 200);
assert.equal(failed.length, 0, `all official module routes HTTP 200; failures ${JSON.stringify(failed)}`);
const report = { schema: 'DUDUQ_CANDIDATE_RELEASE_SMOKE_V1', testedAt: new Date().toISOString(), origin,
  serverRoot: root.root, candidateManifestSha256: 'a94b510cf4178a4ae84aba352d15ea9fe1a0ed66545a8071822f3ec49434b829',
  servedCssHashes: css, moduleRoutesRequested: 30, moduleRoutesPassed: modules.length - failed.length, modules, status: 'PASS' };
await writeFile('ci-run/release-smoke.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, routes: `${report.moduleRoutesPassed}/30`, cssFiles: Object.keys(css).length }, null, 2));


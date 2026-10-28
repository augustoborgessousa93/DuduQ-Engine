import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';

const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
const officialBase = 'E159D916FD824BE98BC276B67180F8B07797D03927A092C3C9137D000E377F8C';
const manifestPath = 'dist-pages/.duduq-pages-manifest';
const original = readFileSync(manifestPath);
const originalSha = SHA(original).toUpperCase();
if (originalSha !== officialBase) throw Error('V23_FROZEN_V22_MANIFEST_MISMATCH:' + originalSha);
const lines = original.toString('utf8').trimEnd().split(/\r?\n/);
if (lines.length !== 2671) throw Error('V23_V22_ENTRIES_NOT_2671:' + lines.length);

const entries = new Map();
for (let i = 0; i < lines.length; i++) {
  const n = lines[i].lastIndexOf(' '), path = lines[i].slice(0, n), sha = lines[i].slice(n + 1);
  if (n < 1 || entries.has(path) || !/^[a-f0-9]{64}$/.test(sha)) throw Error('V23_INVALID_ENTRY:' + path);
  entries.set(path, { index: i, sha });
}

const loader = '<script defer src="/core/duduq-ebc-attribution-watermark.js" data-duduq-attribution-loader="v23"></script>';
const targets = [...entries.keys()].filter(path => path.endsWith('/index.html') || path === 'index.html')
  .filter(path => path === 'index.html' || path === 'home/index.html' || path.startsWith('play/'));
if (targets.length !== 43) throw Error('V23_EXPECTED_43_OFFICIAL_SCREENS:' + targets.length);

for (const path of targets) {
  if (path.startsWith('runtime/gold-masters/')) throw Error('V23_REFUSES_GOLD_MASTER_EDIT:' + path);
  const originalHtml = readFileSync('dist-pages/' + path);
  if (SHA(originalHtml) !== entries.get(path).sha) throw Error('V23_BASE_HTML_CHANGED:' + path);
  const html = originalHtml.toString('utf8');
  if (html.includes('duduq-ebc-attribution-watermark')) throw Error('V23_DUPLICATE_LOADER:' + path);
  const match = [...html.matchAll(/<\/body\s*>/gi)];
  if (match.length !== 1) throw Error('V23_MISSING_OR_DUPLICATE_BODY_END:' + path + ':' + match.length);
  const insertionAt = match[0].index;
  const next = html.slice(0, insertionAt) + '    ' + loader + '\n' + html.slice(insertionAt);
  writeFileSync('dist-pages/' + path, next);
  const entry = entries.get(path);
  lines[entry.index] = path + ' ' + SHA(Buffer.from(next));
}

const asset = 'core/duduq-ebc-attribution-watermark.js';
if (entries.has(asset)) throw Error('V23_ATTRIBUTION_EXISTS');
const script = readFileSync('qa/overlays/v23/' + asset);
if (!script.toString().includes('https://brasilcultural.com.br/')) throw Error('V23_URL_NOT_OFFICIAL');
if (!script.toString().includes('Editora Brasil Cultural')) throw Error('V23_COPY_INCORRECT');
mkdirSync(dirname('dist-pages/' + asset), { recursive: true });
writeFileSync('dist-pages/' + asset, script);
lines.push(asset + ' ' + SHA(script));
const output = Buffer.from(lines.join('\n') + '\n');
writeFileSync(manifestPath, output);
mkdirSync('qa/results', { recursive: true });
writeFileSync('qa/results/v23-ebc-watermark-manifest.txt', output);
console.log('V23_GOLD_MASTERS_UNCHANGED=PASS');
console.log('V23_BRANDED_GAME_SCREENS=PASS:' + targets.length);
console.log('V23_ATTRIBUTION_COPY=PASS:© 2026 Copyright | Desenvolvido por Editora Brasil Cultural');
console.log('V23_MANIFEST=PASS:' + SHA(output).toUpperCase() + ':2672:MODIFIED=43:ADDED=1');

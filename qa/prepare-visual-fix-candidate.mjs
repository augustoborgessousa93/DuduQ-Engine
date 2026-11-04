import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const expectedManifest = '46507A5A595ADB4AFB467D45AC0CEC1849E913E7F1C8722FE8B1CDA5CB3E0B69';
const replacements = new Map([
  ['core/duduq-fullscreen-mode.css', '543369632550cbbfb111698770cf5d6e7e90b76be073c56a5da4328e995e92a3'],
  ['core/duduq-live-hud.css', '0da2aed468acf52154c28a9d915d30b80ed666f335f0a0a528960d8764841a58'],
  ['core/ui/duduq-canonical-question-hud.js', '51d4b61c3d109762e9632fce48add1180ce77d3291ccea22d06e55cc42565d06'],
  ['play/bubble-pop/bubble-pop.js', '026f82ceb06d4ff295cc8e14892b174087917160fdd8b48ea048e0edb78aff57'],
  ['play/drag-drop/drag-drop.css', '3dee9a2c1c9d5f901d66f03db95366a4a7b0dfa94b0ab40ab66dce78113144d4'],
  ['play/drag-drop/drag-drop.js', '360e56444fe04b5950dc46231563bf9c919718e016be59d5ff76d1885d66d248'],
  ['play/memory-quest/memory-quest-contract.js', '2dc86e93116554d2b6b35d39241a243ebce0bf24e394858e64c652292058ff1d'],
]);
const path = 'dist-pages/.duduq-pages-manifest';
const original = await readFile(path, 'utf8');
const hadFinalNewline = original.endsWith('\n');
const lines = original.split(/\r?\n/);
if (hadFinalNewline && lines.at(-1) === '') lines.pop();
if (lines.length !== 2670) throw new Error(`Unexpected source manifest entries: ${lines.length}`);
const seen = new Set();
for (const [assetPath, expectedHash] of replacements) {
  const indices = [];
  for (let i = 0; i < lines.length; i++) if (lines[i].slice(0, assetPath.length + 1) === assetPath + ' ') indices.push(i);
  if (indices.length !== 1) throw new Error(`Expected exactly one manifest row for ${assetPath}; found ${indices.length}`);
  const index = indices[0];
  const actualPath = lines[index].slice(0, lines[index].lastIndexOf(' '));
  if (actualPath !== assetPath) throw new Error(`Manifest path mismatch for ${assetPath}`);
  lines[index] = `${assetPath} ${expectedHash}`;
  seen.add(assetPath);
}
if (seen.size !== replacements.size) throw new Error('Not all overlay entries were applied');
const candidate = lines.join('\n') + (hadFinalNewline ? '\n' : '');
const actualManifest = createHash('sha256').update(candidate).digest('hex').toUpperCase();
if (actualManifest !== expectedManifest) throw new Error(`Candidate manifest reconstruction mismatch: ${actualManifest}`);
await writeFile(path, candidate, 'utf8');
console.log(JSON.stringify({status:'PASS',manifestSha256:actualManifest,entries:lines.length,patchedRows:[...seen]}));

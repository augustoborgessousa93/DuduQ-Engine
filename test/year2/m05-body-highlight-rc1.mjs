import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const Y2 = path.join(ROOT, 'content', 'english', 'year-2');

function load(file, context) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const sandbox = { console, setTimeout, clearTimeout, URL, encodeURIComponent, decodeURIComponent };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const context = vm.createContext(sandbox);

load(path.join(Y2, 'year2-v22-homolog-core.js'), context);
sandbox.window.DuduQYear2V23Factory = Object.freeze({
  buildModule() { return { activities: [], audit: {} }; }
});
load(path.join(Y2, 'year2-v23-manual-review-hotfix-v2.js'), context);
load(path.join(Y2, 'year2-v23-final-root-bridge.js'), context);
load(path.join(Y2, 'year2-v23-body-highlight-bridge.js'), context);

const factory = sandbox.window.DuduQYear2V23Factory;
assert.equal(factory.__bodyHighlightBridgeApplied, true, 'body highlight bridge não aplicado');
assert.equal(factory.bodyHighlightBridgeVersion, '1.0.0-m05-body-highlight-rc1');

for (const label of ['head', 'eye', 'ear', 'nose', 'mouth', 'shoulders', 'arms', 'hands', 'knee', 'legs', 'feet', 'finger']) {
  const visual = factory.resolveYear2Visual(label);
  assert.ok(visual?.src, `${label}: visual ausente`);
  assert.equal(visual.status, 'semantic-body-highlight', `${label}: destaque semântico não aplicado`);
  assert.match(visual.src, /^data:image\/svg\+xml/i, `${label}: esperado SVG de destaque`);
  assert.match(visual.visualKey, /^body-highlight:/, `${label}: visualKey de destaque ausente`);
}

assert.notEqual(factory.resolveYear2Visual('head').src, factory.resolveYear2Visual('hands').src, 'head/hands não podem compartilhar o mesmo visual');
assert.notEqual(factory.resolveYear2Visual('eye').src, factory.resolveYear2Visual('ear').src, 'eye/ear não podem compartilhar o mesmo visual');
assert.notEqual(factory.resolveYear2Visual('two legs').visualKey, factory.resolveYear2Visual('one leg').visualKey, 'quantidade de legs deve permanecer distinta');
assert.notEqual(factory.resolveYear2Visual('two hands').visualKey, factory.resolveYear2Visual('one hand').visualKey, 'quantidade de hands deve permanecer distinta');

const index = fs.readFileSync(path.join(Y2, 'module-05', 'index.html'), 'utf8');
const rootPos = index.indexOf('year2-v23-final-root-bridge.js');
const bodyPos = index.indexOf('year2-v23-body-highlight-bridge.js');
const consistencyPos = index.indexOf('year2-v23-multimodal-consistency-hotfix.js');
assert.ok(rootPos >= 0 && bodyPos > rootPos, 'M05: body bridge deve carregar após final-root');
assert.ok(consistencyPos > bodyPos, 'M05: body bridge deve carregar antes da consistência multimodal');

console.log('PASS m05-body-highlight-rc1');

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const Y2 = path.join(ROOT, 'content', 'english', 'year-2');

function load(file, context) {
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: file });
}

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  URL,
  encodeURIComponent,
  decodeURIComponent
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const context = vm.createContext(sandbox);

load(path.join(Y2, 'year2-v22-homolog-core.js'), context);

// Minimal v2.3 upstream stub: the manual-review layer only needs buildModule.
sandbox.window.DuduQYear2V23Factory = Object.freeze({
  buildModule() {
    return { activities: [], audit: {} };
  }
});

load(path.join(Y2, 'year2-v23-manual-review-hotfix-v2.js'), context);
load(path.join(Y2, 'year2-v23-final-root-bridge.js'), context);

const factory = sandbox.window.DuduQYear2V23Factory;
assert.equal(typeof factory.resolveYear2Visual, 'function', 'resolver Year 2 ausente');

function visual(label) {
  const value = factory.resolveYear2Visual(label);
  assert.ok(value?.src, `visual ausente para: ${label}`);
  return value;
}

function isRepo(value) {
  return /^https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\/main\/Imagens%20Ilustrativa\//.test(String(value?.src || ''));
}

// Exact bank concepts must stay repository-first.
for (const label of ['hello', 'mother', 'eleven', 'apple', 'head']) {
  const value = visual(label);
  assert.ok(isRepo(value), `${label}: deveria usar Assets-DuduQ oficial`);
  assert.ok(/^repository-asset/.test(String(value.status)), `${label}: status oficial inválido (${value.status})`);
}

// Critical ambiguity: M06 standalone ORANGE means fruit, never the color card.
const orange = visual('orange');
assert.ok(isRepo(orange), 'orange fruit: deveria usar asset oficial');
assert.match(decodeURIComponent(orange.src), /Orange  -laranja fruta\.png$/i, 'orange: asset de fruta incorreto');
assert.doesNotMatch(orange.src, /color-orange-laranja/i, 'orange: regressão para cartão de cor');

// Descriptor-only fallback is forbidden when there is a semantic object.
for (const label of ['red apple', 'yellow banana', 'red tomato']) {
  const value = visual(label);
  assert.doesNotMatch(value.src, /\/color-[^/]+/i, `${label}: não pode virar cartão isolado de cor`);
  assert.ok(
    isRepo(value) || /^data:image\//i.test(value.src),
    `${label}: fonte visual inesperada`
  );
}

// Colored toy composites must preserve both object and color semantics.
for (const label of ['red train', 'two red boats']) {
  const value = visual(label);
  assert.match(value.status, /^semantic-object-color-count$/, `${label}: composição colorida não aplicada`);
  assert.match(value.src, /^data:image\/svg\+xml/i, `${label}: composição SVG esperada`);
  assert.doesNotMatch(value.src, /color-red-vermelho/i, `${label}: não pode virar cartão RED`);
}

// Quantity combinations use deterministic semantic composition when no exact bank image exists.
for (const label of ['four dolls', 'three balls', 'ten grapes', 'four carrots']) {
  const value = visual(label);
  assert.equal(value.status, 'semantic-object-count', `${label}: composição de quantidade esperada`);
  assert.match(value.src, /^data:image\/svg\+xml/i, `${label}: composição visual esperada`);
}

// Size combinations are controlled semantic gaps, not generic fallbacks.
assert.equal(visual('big potato').status, 'semantic-food-size');
assert.equal(visual('big apple / small apple').status, 'semantic-food-size-pair');

// Genuine bank gaps remain semantic and explicit.
assert.match(visual('eleven blue circles').status, /^semantic-vector$/, 'shape-count deve permanecer semântico');
assert.match(visual('eye').status, /^semantic-vector$/, 'eye sem asset exato deve permanecer semântico');

assert.equal(factory.smartVisualContract, 'OFFICIAL_EXACT > OBJECT_AWARE_COMPOSITE > CONTROLLED_SEMANTIC');
console.log('PASS smart-assets-official-first-rc1');

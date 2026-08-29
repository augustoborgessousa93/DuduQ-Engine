import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const sandbox = { window: {} };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, '0');
  const rel = `content/english/year-3/module-${mm}/module-${mm}-source-v22.js`;
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  new vm.Script(source, { filename: rel }).runInContext(sandbox);
}

const modules = sandbox.window.DUDUQ_YEAR3_SOURCE_MODULES;
assert(modules && typeof modules === 'object', 'Year 3 source registry not created');

const ids = [];
const report = [];
for (let module = 1; module <= 6; module += 1) {
  const entry = modules[module];
  assert(entry, `M${module}: source module missing`);
  assert(entry.module === module, `M${module}: wrong module number`);
  assert(Array.isArray(entry.items) && entry.items.length === 15, `M${module}: expected 15 items`);
  assert(entry.profile && entry.profile['Objetivo revisado'], `M${module}: pedagogical profile missing`);

  entry.items.forEach((item, index) => {
    const expectedId = `EN3-M${module}-${String(index + 1).padStart(2, '0')}`;
    assert(item.id === expectedId, `${expectedId}: source ID/order changed (${item.id})`);
    assert(Array.isArray(item.alternatives) && item.alternatives.length === 4, `${item.id}: expected four source alternatives`);
    assert(item.answer && /^[A-D]$/.test(item.answer.id), `${item.id}: invalid answer id`);
    const found = item.alternatives.findIndex((alt) => alt.id === item.answer.id);
    assert(found >= 0, `${item.id}: answer is not present in alternatives`);
    assert(found === item.answer.index, `${item.id}: answer index drifted`);
    assert(item.alternatives[found].text === item.answer.text, `${item.id}: answer text drifted`);
    assert(typeof item.prompt === 'string' && item.prompt.trim(), `${item.id}: empty prompt`);
    assert(typeof item.media === 'string' && item.media.trim(), `${item.id}: source media/format missing`);
    ids.push(item.id);
  });

  report.push({ module, title: entry.title, items: entry.items.length });
}

assert(ids.length === 90, `Expected 90 Year 3 IDs, got ${ids.length}`);
assert(new Set(ids).size === 90, 'Duplicate Year 3 source IDs detected');

console.log(JSON.stringify({
  status: 'PASS',
  contract: 'YEAR3_OFFICIAL_SOURCE_V22_90_ITEMS',
  total: ids.length,
  modules: report
}, null, 2));

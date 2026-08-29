import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const files = [
  'core/duduq-gamified-typography.js',
  'core/duduq-tactile-buttons-3d.js',
  'core/duduq-host-completion-guard.js'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const report = [];
for (const rel of files) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert(source.trim().length > 200, `${rel}: shared component unexpectedly empty`);
  assert(!/YEAR2|year-2|english-year-2/i.test(source), `${rel}: Year 2 scope leaked into shared foundation`);
  assert(/scope:\s*["']shared/.test(source) || /scope:\s*["']shared-public-entry/.test(source), `${rel}: shared scope marker missing`);
  assert(/releaseModified:\s*false/.test(source), `${rel}: must explicitly preserve mechanic releases`);
  report.push({ file: rel, bytes: Buffer.byteLength(source) });
}

const typography = fs.readFileSync(path.join(ROOT, files[0]), 'utf8');
assert(typography.includes('__DUDUQ_GAMIFIED_TYPOGRAPHY__'), 'typography: generic global contract missing');
assert(typography.includes('display=swap'), 'typography: font swap contract missing');
assert(typography.includes('Arial Rounded MT Bold'), 'typography: safe rounded fallback missing');

const tactile = fs.readFileSync(path.join(ROOT, files[1]), 'utf8');
assert(tactile.includes('__DUDUQ_TACTILE_BUTTONS_3D__'), 'tactile: generic global contract missing');
assert(tactile.includes('prefers-reduced-motion'), 'tactile: reduced-motion contract missing');
assert(tactile.includes('data-duduq-tactile-preserve-transform'), 'tactile: mechanic transform preservation missing');

const completion = fs.readFileSync(path.join(ROOT, files[2]), 'utf8');
assert(completion.includes('__DUDUQ_HOST_COMPLETION_GUARD__'), 'completion: generic global contract missing');
assert(completion.includes('.duduq-engine-complete'), 'completion: mechanic completion selector missing');
assert(completion.includes('hostOwnsProgression: true'), 'completion: Host ownership contract missing');

console.log(JSON.stringify({
  status: 'PASS',
  contract: 'SHARED_ENGINE_FOUNDATION_RC1',
  components: report
}, null, 2));

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matrix = JSON.parse(await readFile(path.join(root, 'content/english/master/mechanic-curricular-eligibility-v1.json'), 'utf8'));
const master = JSON.parse(await readFile(path.join(root, 'content/english/master/curricular-master-v3.json'), 'utf8'));
const registry = JSON.parse(await readFile(path.join(root, 'content/mechanics/canonical-mechanics-registry.json'), 'utf8'));
const errors = [];
const allowed = new Set(['HIGH', 'MEDIUM', 'LOW', 'NOT_RECOMMENDED', 'CORE_RECURRING_WITH_BOUNDED_ROLE']);
const ids = new Set(matrix.modules.map((item) => item.moduleId));
if (master.modules.length !== 30 || matrix.modules.length !== 30 || ids.size !== 30) errors.push('Expected 30 unique modules in both V3 and the eligibility matrix.');
for (const module of matrix.modules) {
  if (!master.modules.some((entry) => entry.id === module.moduleId)) errors.push(`${module.moduleId}: not present in V3.`);
  for (const [name, record] of [['Memory Quest', module.memoryQuest], ['Smart Sentence Complete', module.smartSentenceComplete], ['Smart Sentence Order', module.smartSentenceOrder]]) {
    if (!record || !allowed.has(record.fit)) errors.push(`${module.moduleId}: invalid ${name} fit.`);
    if (!record?.rationale?.trim()) errors.push(`${module.moduleId}: ${name} rationale missing.`);
  }
  if (module.memoryQuest.fit === 'HIGH' || module.memoryQuest.fit === 'MEDIUM' || module.memoryQuest.fit === 'CORE_RECURRING_WITH_BOUNDED_ROLE') {
    if (!['AUDIO_IMAGE','TEXT_IMAGE','AUDIO_TEXT','FUTURE_PHRASE_SCENE'].includes(module.memoryQuest.preferredMode)) errors.push(`${module.moduleId}: preferred Memory Quest mode missing/invalid.`);
    if (module.memoryQuest.fit === 'CORE_RECURRING_WITH_BOUNDED_ROLE' && (!module.memoryQuest.historicalFit || !module.memoryQuest.historicalRationale)) errors.push(`${module.moduleId}: bounded recurring use must preserve historical fit and rationale.`);
  } else if (module.memoryQuest.preferredMode !== null) errors.push(`${module.moduleId}: mode must be null when Memory Quest is low/not recommended.`);
}
if (matrix.memoryQuestPolicy?.status !== 'CORE_RECURRING_MECHANIC' || matrix.memoryQuestPolicy?.globalMinimumPerModule !== 2) errors.push('Missing Augusto-authorized recurring Memory Quest policy/minimum.');
for (const id of ['smart-sentence-complete','smart-sentence-order']) if (registry.mechanics[id]?.status !== 'PRODUCTION_CANONICAL_LOCKED') errors.push(`${id} is not locked in registry.`);
if (!['NOT_IMPLEMENTED','LEGACY_BLOCKED','BLOCKED'].includes(registry.mechanics['smart-sentence-unscramble']?.status)) errors.push('Smart Sentence Unscramble is not blocked.');
const result = {
  status: errors.length ? 'ISSUE' : 'PASS',
  v3Modules: master.modules.length,
  matrixModules: matrix.modules.length,
  uniqueIds: ids.size,
  completeLocked: registry.mechanics['smart-sentence-complete']?.status,
  orderLocked: registry.mechanics['smart-sentence-order']?.status,
  unscramble: registry.mechanics['smart-sentence-unscramble']?.status,
  errors
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;

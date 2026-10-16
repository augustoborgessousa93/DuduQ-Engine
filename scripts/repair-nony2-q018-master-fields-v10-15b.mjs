import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const load = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const save = async (file, value) => {
  const target = path.join(root, file), temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
};
const masterPath = 'content/english/master/module-content-and-mechanics-v1.json';
const master = await load(masterPath);
let restored = 0;
for (const module of master.modules || []) {
  if (module.moduleId === 'Y2M01') continue;
  const match = /^Y([1-5])M0([1-6])$/.exec(module.moduleId || '');
  if (!match) continue;
  const planPath = `content/english/planning/year-${match[1]}/module-0${match[2]}.json`;
  const plan = await load(planPath);
  const q018s = [];
  const visit = value => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value.moduleId === module.moduleId && value.activityId === 'Q018' && Array.isArray(value.imageRequirements)) q018s.push(value);
    Object.values(value).forEach(visit);
  };
  visit(plan);
  const source = q018s[0];
  const target = (module.activitySequence || []).find(item => item.activityId === 'Q018');
  if (!source || !target) throw new Error(`NON_Y2_Q018_PLAN_OR_MASTER_ROW_MISSING:${module.moduleId}`);
  for (const field of ['imageRequirements', 'mediaRequirements', 'productionNotes']) {
    if (field in source) target[field] = source[field];
    else delete target[field];
  }
  restored++;
}
await save(masterPath, master);
console.log(JSON.stringify({ status: 'RESTORED_NON_Y2_Q018_PLANNING_FIELDS', modules: restored, preservedException: 'Y2M01' }, null, 2));

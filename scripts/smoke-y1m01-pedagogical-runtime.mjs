import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const [questionDoc, registryDoc, runtimeSource] = await Promise.all([
  readJson('content/english/year-1/module-01/questions.json'),
  readJson('content/english/media/media-registry.json'),
  readFile('core/duduq-y1m01-module-runtime.js', 'utf8')
]);
const mediaById = new Map(registryDoc.entries.map(entry => [entry.mediaId, entry]));
async function resolveLocalMedia(mediaId, seen = new Set()) {
  if (seen.has(mediaId)) return { status: 'CIRCULAR_COMPOSITION', assets: [] };
  seen.add(mediaId);
  const entry = mediaById.get(mediaId);
  if (!entry || entry.status !== 'APPROVED') return { status: 'MISSING', assets: [] };
  const assets = [];
  for (const childId of entry.components || []) {
    const child = await resolveLocalMedia(childId, new Set(seen));
    if (child.status !== 'READY') return { status: 'COMPONENT_UNAVAILABLE', assets: [] };
    assets.push(...child.assets);
  }
  for (const asset of entry.assets || []) assets.push({ url: `/${asset.path}`, alt: entry.description || entry.altText || mediaId });
  if (!assets.length && entry.urlOrPath) assets.push({ url: `/${entry.urlOrPath}`, alt: entry.description || entry.altText || mediaId });
  return assets.length ? { status: 'READY', temporary: Boolean(entry.temporary), assets } : { status: 'MISSING', assets: [] };
}
const results = [];
for (let index = 0; index < questionDoc.items.length; index += 1) {
  const item = questionDoc.items[index];
  const session = JSON.stringify({ moduleId: 'Y1M01', index, itemId: item.item_id });
  const window = {
    location: { search: `?duduqModule=Y1M01&duduqItem=${encodeURIComponent(item.item_id)}`, assign() {} },
    sessionStorage: { getItem: () => session, setItem() {}, removeItem() {} },
    DuduQContentAudio: { setActiveQuestion() {}, stopVoice() {} },
    DuduQContentMedia: { resolveMedia: resolveLocalMedia }
  };
  const context = { window, URLSearchParams, fetch: async () => ({ ok: true, json: async () => questionDoc }) };
  vm.runInNewContext(runtimeSource, context, { filename: 'duduq-y1m01-module-runtime.js' });
  const activity = await window.DuduQY1M01.ready;
  const instruction = activity.prompt.instruction;
  if (!instruction?.titleEn || !instruction?.titlePt || !instruction?.instructionEn || !instruction?.instructionPt ||
      !activity.prompt.instructionAudioEnId || !activity.prompt.instructionAudioPtId ||
      activity.prompt.instructionAudioIds?.join(',') !== `${activity.prompt.instructionAudioEnId},${activity.prompt.instructionAudioPtId}` ||
      activity.prompt.question !== instruction.instructionEn) throw new Error(`BILINGUAL_INSTRUCTION_PROMPT:${item.item_id}`);
  if (activity.mechanic === 'target-shooter' && (activity.targets.length !== 4 || activity.targets.filter(target => target.id === activity.correctTargetIds[0]).length !== 1 || activity.targets.some(target => !target.imageSrc))) throw new Error(`TARGET_SHOOTER_BINDING:${item.item_id}`);
  if (activity.mechanic === 'bubble-pop' && (activity.incorrectPool.length !== 6 || activity.targetsToFind.length !== 1 || activity.incorrectPool.some(option => !option.src))) throw new Error(`BUBBLE_POOL_BINDING:${item.item_id}`);
  if (activity.mechanic === 'drag-drop-multimedia' && (activity.targets.length !== 3 || activity.items.length !== (item.item_id === 'Y1M01-Q009' ? 3 : 1) || activity.targets.some(target => !target.imageSrc))) throw new Error(`DRAG_DROP_BINDING:${item.item_id}`);
  results.push({ itemId: item.item_id, mechanic: activity.mechanic, progress: `${activity.progress.current}/${activity.progress.total}`, targets: activity.targets?.length ?? activity.targetsToFind?.length, correct: 'PASS' });
}
console.log(JSON.stringify({ status: results.length === 20 ? 'PASS' : 'ISSUE', questions: results.length, mechanics: Object.fromEntries(['target-shooter', 'bubble-pop', 'drag-drop-multimedia'].map(name => [name, results.filter(item => item.mechanic === name).length])), allInstructionsMounted: results.length, allCanonicalContractsValid: results.length, results }, null, 2));

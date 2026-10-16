import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'duduq-audio/manifests/AUDIO_MANIFEST.json',
  'content/english/audio/audio-registry.json',
  'content/english/audio/audio-generation-manifest.json',
  'duduq-audio/manifests/y2m01-production-audio-requests.json',
];
const retiredIds = new Set([
  'AUD-Y2M01-NAME-LUCAS-SPELLED-PAUSED-V1',
  'AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-EN',
  'AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-PT',
  'AUD-SS-NAME-SPELLING-WRONG-PT',
]);
const keyFor = file => file.includes('AUDIO_MANIFEST') ? 'id'
  : file.includes('production-audio-requests') ? 'id' : 'audioId';
for (const file of files) {
  const full = path.join(root, file), doc = JSON.parse(await readFile(full, 'utf8'));
  const list = doc.items ?? doc.entries ?? [];
  for (const item of list) {
    const id = item[keyFor(file)];
    if (retiredIds.has(id)) {
      item.status = 'RETIRED_HUMAN_REJECTED_NOT_FOR_RUNTIME';
      item.approvalStatus = 'HISTORICAL_NOT_FOR_RUNTIME';
      item.retirementReason = 'Q018 auditory spelling was explicitly rejected by human QA and replaced with question-to-context-image listening comprehension.';
      if (Array.isArray(item.activity)) item.activity = item.activity.filter(x => x !== 'Y2M01-Q018');
      if (Array.isArray(item.usedByItems)) item.usedByItems = item.usedByItems.filter(x => x !== 'Y2M01-Q018');
      if (item.humanPronunciationReview) item.humanPronunciationReview = 'NOT_APPLICABLE_RETIRED';
    }
    if (id === 'AUD-PT-LETTER-CUE-EARLY-Y2') {
      if (Array.isArray(item.activity)) item.activity = item.activity.filter(x => x !== 'Y2M01-Q018');
      if (Array.isArray(item.usedByItems)) item.usedByItems = item.usedByItems.filter(x => x !== 'Y2M01-Q018');
    }
  }
  const temp = `${full}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  await rename(temp, full);
}
console.log(JSON.stringify({ status: 'RETIRED_FROM_ACTIVE_Q018', ids: [...retiredIds], files }, null, 2));

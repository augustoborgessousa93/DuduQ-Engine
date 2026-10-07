import { readFile } from 'node:fs/promises';

const baseUrl = process.env.DUDUQ_RUNTIME_URL || 'http://127.0.0.1:4175';
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const [questions, audio, media] = await Promise.all([
  readJson('content/english/year-1/module-01/questions.json'),
  readJson('duduq-audio/manifests/AUDIO_MANIFEST.json'),
  readJson('content/english/media/media-registry.json')
]);
const audioRecords = audio.items.filter(item => item.module === 'Y1M01');
const mediaById = new Map(media.entries.map(entry => [entry.mediaId, entry]));
const mediaIds = new Set();
for (const item of questions.items) {
  if (item.image_ref) mediaIds.add(item.image_ref);
  for (const option of [...(item.options || []), ...(item.mediaBindings || []), ...(item.audioBindings || []), ...(item.bubbleDistractorPool || [])]) {
    if (option.mediaId) mediaIds.add(option.mediaId);
  }
}
const paths = [
  'play/english/year-1/module-01/',
  'content/english/year-1/module-01/questions.json',
  'duduq-audio/manifests/AUDIO_MANIFEST.json',
  ...audioRecords.map(item => item.audioPath),
  ...[...mediaIds].flatMap(id => mediaById.get(id)?.assets?.map(asset => asset.path) || [])
];
const checks = await Promise.all(paths.map(async path => {
  try {
    const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl}/`));
    return { path, status: response.status, contentType: response.headers.get('content-type') || '' };
  } catch (error) { return { path, status: 0, error: error.message }; }
}));
const failures = checks.filter(item => item.status !== 200 ||
  (item.path.endsWith('.mp3') && !item.contentType.toLowerCase().includes('audio/mpeg')) ||
  (item.path.endsWith('.svg') && !item.contentType.toLowerCase().includes('image/svg+xml')));
const instructionCount = audioRecords.filter(item => item.type === 'INSTRUCTION_AUDIO').length;
const curriculumCount = audioRecords.length - instructionCount;
const report = {
  status: failures.length ? 'ISSUE' : 'PASS',
  productRoute: checks[0],
  questions: questions.items.length,
  approvedCurricularAudio: curriculumCount,
  instructionAudio: instructionCount,
  uniqueMediaIds: mediaIds.size,
  checkedResources: checks.length,
  http200: checks.filter(item => item.status === 200).length,
  missingOrInvalid: failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;

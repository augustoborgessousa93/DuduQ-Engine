import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaId = 'IMG-Y2M01-Q018-NAME-QUESTION-SCENE-V1';
const relativeAsset = 'content/english/assets/images/year-2/module-01/q018-name-question-scene-v1.png';
const absoluteAsset = path.join(root, relativeAsset);
const hash = createHash('sha256').update(await readFile(absoluteAsset)).digest('hex');
const read = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const save = async (file, data) => {
  const full = path.join(root, file), temp = `${full}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temp, full);
};
const registryPath = 'content/english/media/media-registry.json';
const generationPath = 'content/english/media/image-generation-manifest.json';
const registry = await read(registryPath), generation = await read(generationPath);
if (registry.entries.some(row => row.mediaId === mediaId) || generation.entries.some(row => row.mediaId === mediaId)) {
  throw new Error('Q018_SCENE_MEDIA_ID_ALREADY_REGISTERED');
}
registry.entries.push({ mediaId, requirementId: 'Y2M01-Q018-SCENE-01', status: 'PENDING_HUMAN_REVIEW',
  kind: 'image', semantic: 'two children in a name-exchange question context; one asks and the other indicates their blank name badge',
  altText: 'One child asks another child’s name in a school garden scene', urlOrPath: relativeAsset,
  assets: [{ path: relativeAsset, sha256: hash, source: 'GENERATED_FOR_DUDUQ_V10_15B_Q018', temporary: false }],
  temporary: false, integrationStatus: 'CANDIDATE_REQUIRES_HUMAN_REVIEW', humanResolutionStatus: 'PENDING' });
generation.entries.push({ requirementId: 'Y2M01-Q018-SCENE-01', proposedMediaId: mediaId, mediaId,
  usedByItems: ['Y2M01-Q018'], productionBrief: 'Square, text-free 3D illustration of two children in a name-question context.',
  pedagogicalPurpose: 'Recognize the social context of the spoken English question “What’s your name?” without reading.',
  mustShow: ['two children facing one another', 'one child asking by conversational gesture', 'other child responding and indicating a blank name badge'],
  mustNotShow: ['letters or words', 'readable name', 'answer labels', 'selection highlight or checkmark', 'greeting wave, farewell, or bedtime'],
  composition: 'one balanced square scene; both children visible', ageAppropriateness: 'Year 2, child-friendly and inclusive',
  visualConsistencyRules: 'Use the approved DuduQ rounded 3D editorial style; no embedded answer text.', aspectRatio: '1:1',
  backgroundRequirement: 'simple school garden', altTextDraft: 'One child asks another child’s name in a school garden scene',
  filename: path.posix.basename(relativeAsset), outputPath: relativeAsset, sha256: hash,
  styleProfile: 'DUDUQ_ENGLISH_EDITORIAL_V1', status: 'GENERATED_CANDIDATE_HUMAN_REVIEW_PENDING' });

const questionPath = 'content/english/year-2/module-01/questions.json';
const questions = await read(questionPath);
const q = questions.items.find(row => row.questionId === 'Q018');
if (!q || q.mechanicId !== 'target-shooter' || q.stimulus?.target !== "What's your name?") throw new Error('Q018_MODEL_NOT_READY_FOR_MEDIA_BINDING');
for (const option of q.options) if (option.answerKey === 'IMG-Y1M01-NAME-QUESTION-001') {
  option.answerKey = mediaId; option.media.assetId = mediaId;
  option.media.status = 'GENERATED_CANDIDATE_HUMAN_REVIEW_PENDING';
  option.media.mustInclude = 'two children in a clear name-question exchange';
}
for (const binding of q.mediaBindings) if (binding.assetId === 'IMG-Y1M01-NAME-QUESTION-001') {
  binding.assetId = mediaId; binding.status = 'GENERATED_CANDIDATE_HUMAN_REVIEW_PENDING';
}
if (q.answerKey === 'IMG-Y1M01-NAME-QUESTION-001') q.answerKey = mediaId;

const planPath = 'content/english/planning/year-2/module-01.json';
const plan = await read(planPath);
const updateTree = value => {
  if (Array.isArray(value)) return value.forEach(updateTree);
  if (!value || typeof value !== 'object') return;
  if (value.moduleId === 'Y2M01' && (value.activityId === 'Q018' || value.questionId === 'Q018' || value.item_id === 'Y2M01-Q018') && Array.isArray(value.imageRequirements)) {
    const target = value.imageRequirements.find(row => row.assetRole === 'name-question-context-scene') ?? value.imageRequirements[0];
    if (target) { target.assetId = mediaId; target.outputPath = relativeAsset; target.productionStatus = 'GENERATED_CANDIDATE_HUMAN_REVIEW_PENDING';
      target.mustInclude = 'two children in a clear name-question exchange'; target.pedagogicalPurpose = 'understand the spoken name-question in social context without reading';
      target.semanticTarget = 'two children in a name-question context'; target.mustNotInclude = 'unrelated words or answer cues';
      if ('status' in target) target.status = 'GENERATED_CANDIDATE_HUMAN_REVIEW_PENDING'; }
  if (value.moduleId === 'Y2M01' && (value.activityId === 'Q018' || value.questionId === 'Q018' || value.item_id === 'Y2M01-Q018') && Array.isArray(value.mediaRequirements?.slotIds)) {
    value.mediaRequirements.slotIds = value.mediaRequirements.slotIds.map(id => id === 'IMG-Y1M01-NAME-QUESTION-001' ? mediaId : id);
    value.mediaRequirements.status = 'CANDIDATE_REQUIRES_HUMAN_REVIEW'; }
  if (value.moduleId === 'Y2M01' && (value.activityId === 'Q018' || value.questionId === 'Q018' || value.item_id === 'Y2M01-Q018') && typeof value.productionNotes === 'string') {
    value.productionNotes = 'Auditory spelling is retired for Q018. Use the canonical English name-question clip and the new two-child name-question scene; select among four text-free social-context images.'; }
  }
  for (const child of Object.values(value)) updateTree(child);
};
updateTree(plan);
const masterPath = 'content/english/master/module-content-and-mechanics-v1.json';
const master = await read(masterPath); updateTree(master);
const now = new Date().toISOString(); registry.updatedAt = generation.updatedAt = questions.updatedAt = now;
await save(registryPath, registry); await save(generationPath, generation); await save(questionPath, questions);
await save(planPath, plan); await save(masterPath, master);
console.log(JSON.stringify({ status: 'Q018_TARGET_IMAGE_REGISTERED_HUMAN_PENDING', mediaId, asset: relativeAsset, sha256: hash,
  updated: [registryPath, generationPath, questionPath, planPath, masterPath] }, null, 2));

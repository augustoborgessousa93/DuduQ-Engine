import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'content/english/year-1/module-01/questions.json');
const requiredIds = ['Y1M01-Q006', 'Y1M01-Q007', 'Y1M01-Q008', 'Y1M01-Q009', 'Y1M01-Q014'];
const normalized = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/gu, ' ');
const stable = value => JSON.stringify(value);
export function classifyDdmPair(left, right) {
  const sameCore = stable(left.audioTargets) === stable(right.audioTargets) &&
    stable(left.visualTargets) === stable(right.visualTargets) && stable(left.mappingPairs) === stable(right.mappingPairs);
  if (sameCore) {
    return { status: stable(left.orderedMapping) === stable(right.orderedMapping) ? 'EXACT_DUPLICATE' : 'PERMUTATION_DUPLICATE', similarity: 1 };
  }
  const audioSimilarity = left.audioTargets.filter(target => right.audioTargets.includes(target)).length / 4;
  const visualSimilarity = left.visualTargets.filter(target => right.visualTargets.includes(target)).length / 4;
  const similarity = (audioSimilarity + visualSimilarity) / 2;
  if (similarity < 0.75) return { status: 'DISTINCT_ACTIVITY', similarity };
  const rationale = [left.reused, right.reused].some(value => value && normalized(value).length >= 24);
  return { status: rationale ? 'PEDAGOGICAL_RECYCLING' : 'DDM_NEAR_DUPLICATE_REVIEW', similarity };
}

export async function validateY1M01DdmDiversity() {
const data = JSON.parse(await readFile(file, 'utf8'));
const errors = [];
const warnings = [];
const records = [];
for (const id of requiredIds) {
  const item = data.items.find(entry => entry.item_id === id);
  if (!item) { errors.push(`${id}:QUESTION_MISSING`); continue; }
  const audio = item.audioBindings || [];
  const visuals = item.mediaBindings || [];
  const mappings = item.dragDropContract?.mapping || [];
  const rationale = item.contentDifferentiation;
  if (item.mechanicId !== 'drag-drop-multimedia' || item.dragDropContract?.mode !== 'multi-match') errors.push(`${id}:WRONG_MECHANIC_OR_MODE`);
  if (audio.length !== 4 || visuals.length !== 4 || mappings.length !== 4) errors.push(`${id}:4X4_REQUIRED`);
  if (new Set(audio.map(entry => entry.itemId)).size !== 4 || new Set(audio.map(entry => entry.audioId)).size !== 4) errors.push(`${id}:AUDIO_ID_DUPLICATE_OR_MISSING`);
  if (new Set(visuals.map(entry => `${entry.mediaId}:${entry.assetIndex ?? 0}`)).size !== 4) errors.push(`${id}:VISUAL_MEDIA_DUPLICATE`);
  if (new Set(visuals.map(entry => entry.targetId)).size !== 4 || new Set(visuals.map(entry => entry.answerKey)).size !== 4) errors.push(`${id}:VISUAL_TARGET_DUPLICATE_OR_MISSING`);
  if (new Set(audio.map(entry => entry.answerKey)).size !== 4) errors.push(`${id}:AUDIO_ANSWER_DUPLICATE_OR_MISSING`);
  for (const entry of audio) {
    if (!visuals.some(visual => visual.targetId === entry.targetId && visual.answerKey === entry.answerKey) ||
        !mappings.some(mapping => mapping.itemId === entry.itemId && mapping.targetId === entry.targetId && mapping.answerKey === entry.answerKey)) {
      errors.push(`${id}:ORPHAN_OR_INVALID_MAPPING:${entry.itemId}`);
    }
    if (!entry.semanticTarget?.trim()) errors.push(`${id}:AUDIO_SEMANTIC_TARGET_MISSING`);
  }
  for (const visual of visuals) if (!audio.some(entry => entry.targetId === visual.targetId && entry.answerKey === visual.answerKey)) errors.push(`${id}:ORPHAN_VISUAL:${visual.targetId}`);
  if (!rationale?.activityPurpose?.trim() || !rationale?.recyclingRationale?.trim()) errors.push(`${id}:PEDAGOGICAL_RATIONALE_REQUIRED`);
  if (!item.topicEn?.trim() || !item.learningTarget?.trim()) errors.push(`${id}:TOPIC_OR_LEARNING_TARGET_REQUIRED`);
  const audioTargets = audio.map(entry => normalized(entry.semanticTarget)).sort();
  const visualTargets = visuals.map(entry => normalized(entry.semanticTarget)).sort();
  const mappingPairs = audio.map(entry => `${normalized(entry.semanticTarget)}=>${normalized(visuals.find(visual => visual.answerKey === entry.answerKey)?.semanticTarget)}`).sort();
  const orderedMapping = audio.map(entry => `${normalized(entry.semanticTarget)}=>${normalized(visuals.find(visual => visual.answerKey === entry.answerKey)?.semanticTarget)}`);
  records.push({ id, topic: item.topicEn, phase: item.pedagogicalPhase, exposureMode: item.exposureMode,
    purpose: rationale?.activityPurpose, audioTargets, visualTargets, mappingPairs, orderedMapping,
    objective: normalized(item.learningTarget), reused: rationale?.recyclingRationale });
}

const pairs = [];
for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
    const left = records[leftIndex]; const right = records[rightIndex];
    const classification = classifyDdmPair(left, right);
    if (classification.status === 'EXACT_DUPLICATE' || classification.status === 'PERMUTATION_DUPLICATE') {
      errors.push(`DDM_${classification.status}:${left.id}:${right.id}`);
      pairs.push({ left: left.id, right: right.id, status: classification.status });
      continue;
    }
    if (classification.status === 'PEDAGOGICAL_RECYCLING' || classification.status === 'DDM_NEAR_DUPLICATE_REVIEW') {
      const reason = [left.reused, right.reused].find(value => value && normalized(value).length >= 24);
      if (classification.status === 'DDM_NEAR_DUPLICATE_REVIEW') errors.push(`${classification.status}:${left.id}:${right.id}:${classification.similarity.toFixed(2)}`);
      else warnings.push(`${classification.status}:${left.id}:${right.id}:${classification.similarity.toFixed(2)}:${reason}`);
      pairs.push({ left: left.id, right: right.id, status: classification.status, combinedSimilarity: classification.similarity });
    }
  }
}
const result = { status: errors.length ? 'ISSUE' : 'PASS', moduleId: data.moduleId,
  orderedIndependentSemanticSignatures: records.map(record => ({ questionId: record.id,
    signature: { audioTargets: record.audioTargets, visualTargets: record.visualTargets,
      mappings: record.mappingPairs, learningObjective: record.objective } })),
  questions: records.map(({ orderedMapping, ...record }) => record), pairComparisons: pairs,
  duplicateCounts: { exact: pairs.filter(pair => pair.status === 'EXACT_DUPLICATE').length,
    permutation: pairs.filter(pair => pair.status === 'PERMUTATION_DUPLICATE').length,
    nearReview: pairs.filter(pair => pair.status === 'DDM_NEAR_DUPLICATE_REVIEW').length,
    justifiedRecycling: pairs.filter(pair => pair.status === 'PEDAGOGICAL_RECYCLING').length }, errors, warnings };
return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateY1M01DdmDiversity();
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

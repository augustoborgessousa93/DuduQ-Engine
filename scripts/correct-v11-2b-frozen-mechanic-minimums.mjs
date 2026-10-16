import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const paths = {
  contracts: 'content/english/production/v11-1b/deterministic-activity-contracts.json',
  mediaRequirements: 'content/english/production/v11-1b/media-requirements.json',
  audioRequirements: 'content/english/production/v11-1b/audio-requirements.json',
  mediaRegistry: 'content/english/media/media-registry.json',
  audioRegistry: 'content/english/audio/audio-registry.json',
  mediaMap: 'content/english/production/v11-2/media-concept-binding-map.json',
  audioMap: 'content/english/production/v11-2b/audio-concept-binding-map.json'
};
const read = async key => JSON.parse(await readFile(path.join(root, paths[key]), 'utf8'));
const save = async (key, doc) => writeFile(path.join(root, paths[key]), `${JSON.stringify(doc, null, 2)}\n`);
const exists = async file => { try { await access(path.join(root, file)); return true; } catch { return false; } };
const slug = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = text => String(text ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
const [contractsDoc, mediaReqDoc, audioReqDoc, mediaRegistry, audioRegistry, mediaMap, audioMap] = await Promise.all([
  read('contracts'), read('mediaRequirements'), read('audioRequirements'), read('mediaRegistry'), read('audioRegistry'), read('mediaMap'), read('audioMap')
]);
const contracts = new Map(contractsDoc.contracts.map(row => [row.itemId, row]));
const mediaReqIds = new Set(mediaReqDoc.requirements.map(row => row.mediaConceptId));
const audioReqIds = new Set(audioReqDoc.requirements.map(row => row.audioConceptId));
const changes = [];

const mediaFor = async (item, target, role) => {
  const candidates = mediaRegistry.entries.filter(row => row.status === 'APPROVED' && norm(row.semantic ?? row.semanticTarget ?? row.concept) === norm(target))
    .sort((a, b) => Number(String(b.mediaId).includes('V11-2B')) - Number(String(a.mediaId).includes('V11-2B')));
  const candidate = await (async () => { for (const row of candidates) { const file = row.urlOrPath ?? row.assets?.[0]?.path; if (file && await exists(file)) return row; } return null; })();
  if (!candidate) throw new Error(`MECHANIC_MINIMUM_MEDIA_UNRESOLVED:${item.itemId}:${target}`);
  const id = `IMG-${item.itemId}-${slug(role)}-${slug(target)}`;
  const file = candidate.urlOrPath ?? candidate.assets?.[0]?.path;
  let requirement = item.requiredMedia.find(row => row.mediaConceptId === id);
  if (!mediaReqIds.has(id)) {
    requirement = { mediaConceptId: id, semanticDescription: `Existing exact-semantic approved visual for ${target}; reused to satisfy frozen mechanic minimum; no written answer label.`,
      semanticTarget: target, role, answerLeakRisk: 'NONE_BEFORE_ACTION', assetStatus: 'RESOLVED', reuseCandidates: [candidate.mediaId],
      assetDisposition: 'REUSE_APPROVED', mediaId: candidate.mediaId, assetPath: file, technicalStatus: 'PASS', refinementStatus: candidate.refinementStatus ?? 'HUMAN_REVIEW_PENDING' };
    mediaReqDoc.requirements.push(requirement);
    mediaReqIds.add(id);
  }
  if (!requirement) requirement = { mediaConceptId: id, semanticDescription: `Existing exact-semantic approved visual for ${target}; reused to satisfy frozen mechanic minimum; no written answer label.`, semanticTarget: target, role };
  if (!item.requiredMedia.some(row => row.mediaConceptId === id)) item.requiredMedia.push(requirement);
  mediaMap.bindings[id] = { mediaId: candidate.mediaId, assetPath: file, disposition: 'REUSE_FROZEN_MECHANIC_MINIMUM', semanticKey: candidate.semanticKey ?? null };
  candidate.usedByItems = [...new Set([...(candidate.usedByItems ?? []), item.itemId])];
  return { mediaConceptId: id, semanticDescription: `Existing exact-semantic approved visual for ${target}.`, semanticTarget: target, role,
    answerLeakRisk: 'NONE_BEFORE_ACTION', assetStatus: 'RESOLVED' };
};
const audioFor = async (item, target, semanticType, role = 'DDM_STIMULUS', spokenTarget = target) => {
  const candidates = audioRegistry.entries.filter(row => row.status === 'APPROVED' && row.locale === 'en-US' &&
    !/instruction/i.test(row.semanticRole ?? '') && norm(row.speechText ?? row.transcript) === norm(spokenTarget))
    .sort((a, b) => Number(b.voiceVersion === 'DUDUQ_GOLD_VOICE_v1') - Number(a.voiceVersion === 'DUDUQ_GOLD_VOICE_v1'));
  const candidate = await (async () => { for (const row of candidates) { const file = row.urlOrPath ?? row.outputPath ?? row.assets?.[0]?.path; if (file && await exists(file)) return row; } return null; })();
  if (!candidate) throw new Error(`MECHANIC_MINIMUM_AUDIO_UNRESOLVED:${item.itemId}:${target}`);
  const conceptId = `AUD-${item.itemId}-${slug(role)}-${slug(spokenTarget)}`;
  const file = candidate.urlOrPath ?? candidate.outputPath ?? candidate.assets?.[0]?.path;
  const ref = { audioConceptId: conceptId, language: 'en-US', spokenTarget, role, semanticType, assetStatus: 'RESOLVED' };
  if (!audioReqIds.has(conceptId)) {
    audioReqDoc.requirements.push({ audioConceptId: conceptId, language: 'en-US', spokenTarget, role, semanticType,
      voice: candidate.voiceProfile ?? candidate.voiceVersion ?? 'EXISTING_APPROVED_CANONICAL', assetStatus: 'RESOLVED', reuseCandidates: [candidate.audioId],
      assetDisposition: 'REUSE_EXACT_TARGET', audioId: candidate.audioId, assetPath: file, technicalStatus: 'PASS', humanStatus: candidate.humanPronunciationReview ?? 'HUMAN_REVIEW_PENDING' });
    audioReqIds.add(conceptId);
  }
  audioMap.bindings[conceptId] = { audioId: candidate.audioId, path: file, disposition: 'REUSE_EXACT_TARGET', canonicalKey: null };
  candidate.usedByItems = [...new Set([...(candidate.usedByItems ?? []), item.itemId])];
  return { ...ref, audioId: candidate.audioId, assetPath: file };
};
const optionAdditions = {
  'Y2M05-Q009': ['four'], 'Y3M03-Q007': ['seven'], 'Y3M04-Q002': ['four'], 'Y3M04-Q006': ['five'],
  'Y3M04-Q010': ['four'], 'Y3M04-Q020': ['four'], 'Y5M03-Q007': ['I'], 'Y5M05-Q005': ['in'], 'Y5M05-Q014': ['on']
};
for (const [itemId, targets] of Object.entries(optionAdditions)) {
  const item = contracts.get(itemId);
  for (const target of targets) {
    if (item.studentStimuli.options.some(option => norm(option.semanticTarget) === norm(target))) continue;
    const optionId = `${itemId}-O${item.studentStimuli.options.length + 1}`;
    const mediaConcept = await mediaFor(item, target, 'OPTION');
    item.studentStimuli.options.push({ optionId, semanticTarget: target, mediaConcept, isCorrect: false });
  }
  if (item.studentStimuli.options.length !== 4) throw new Error(`TARGET_SHOOTER_OPTIONS_NOT_4:${itemId}`);
  changes.push({ itemId, change: 'FROZEN_TARGET_SHOOTER_FOUR_OPTION_MINIMUM', added: targets });
}
const ddmAdditions = {
  'Y2M05-Q012': [{ target: 'four', semanticType: 'NUMBER' }],
    'Y3M02-Q015': [{ target: '3', spokenTarget: 'three', semanticType: 'NUMBER' }],
  'Y3M03-Q014': [{ target: 'mother', semanticType: 'FAMILY_MEMBER' }, { target: 'father', semanticType: 'FAMILY_MEMBER' }],
  'Y3M04-Q013': [{ target: 'four', semanticType: 'NUMBER' }],
  'Y5M05-Q020': [{ target: 'on', semanticType: 'WORD_OR_STRUCTURE' }]
};
for (const [itemId, additions] of Object.entries(ddmAdditions)) {
  const item = contracts.get(itemId);
  for (const { target, semanticType } of additions) {
    if (item.studentStimuli.items.some(row => norm(row.semanticTarget) === norm(target))) continue;
    const index = item.studentStimuli.items.length + 1;
    const inputId = `${itemId}-I${index}`;
    const targetId = `${itemId}-T${index}`;
    const mediaConcept = await mediaFor(item, target, 'DDM_DESTINATION');
    const audioConcept = await audioFor(item, target, semanticType, 'DDM_STIMULUS', additions.find(row => row.target === target)?.spokenTarget ?? target);
    item.studentStimuli.items.push({ itemId: inputId, modality: 'audio', semanticTarget: target, audioConcept });
    item.studentStimuli.destinations.push({ targetId, semanticTarget: target, mediaConcept });
    item.studentStimuli.mappings.push({ itemId: inputId, targetId, semanticTarget: target });
    item.studentStimuli.answerKey[inputId] = targetId;
    item.correctAnswer[inputId] = targetId;
    item.requiredAudio.learnerTargets.push({ ...audioConcept, itemId: inputId, targetId });
  }
  if (item.studentStimuli.items.length !== 4 || item.studentStimuli.destinations.length !== 4 || item.studentStimuli.mappings.length !== 4) throw new Error(`DDM_MINIMUM_NOT_4:${itemId}`);
  changes.push({ itemId, change: 'FROZEN_DDM_FOUR_MATCH_MINIMUM', added: additions.map(row => row.target) });
}
const matchAdditions = {
  'Y3M03-Q009': ['they'], 'Y5M01-Q011': ['Brazil', 'Mia'], 'Y5M03-Q009': ['he', 'she'], 'Y5M06-Q009': ['he', 'she']
};
for (const [itemId, targets] of Object.entries(matchAdditions)) {
  const item = contracts.get(itemId);
  for (const target of targets) {
    if (item.studentStimuli.pairs.some(pair => norm(pair.semanticTarget) === norm(target))) continue;
    const n = item.studentStimuli.pairs.length + 1;
    const leftId = `${itemId}-L${n}`, rightId = `${itemId}-R${n}`;
    const mediaConcept = await mediaFor(item, target, 'MATCHING_PAIR');
    item.studentStimuli.pairs.push({ pairId: `${itemId}-P${n}`, semanticTarget: target,
      left: { id: leftId, modality: 'text', value: target }, right: { id: rightId, modality: 'image', mediaConcept } });
    item.studentStimuli.answerKey[leftId] = rightId;
  }
  if (item.studentStimuli.pairs.length < 3) throw new Error(`MATCHING_MINIMUM_LT_3:${itemId}`);
  changes.push({ itemId, change: 'FROZEN_MATCHING_THREE_PAIR_MINIMUM', added: targets });
}
contractsDoc.materializationCompatibilityCorrections = [...(contractsDoc.materializationCompatibilityCorrections ?? []), ...changes];
mediaReqDoc.count = mediaReqDoc.requirements.length;
audioReqDoc.count = audioReqDoc.requirements.length;
mediaMap.bindingCount = Object.keys(mediaMap.bindings).length;
mediaMap.updatedAt = audioMap.updatedAt = mediaRegistry.updatedAt = audioRegistry.updatedAt = new Date().toISOString();
await Promise.all([save('contracts', contractsDoc), save('mediaRequirements', mediaReqDoc), save('audioRequirements', audioReqDoc),
  save('mediaRegistry', mediaRegistry), save('audioRegistry', audioRegistry), save('mediaMap', mediaMap), save('audioMap', audioMap)]);
console.log(JSON.stringify({ status: 'PASS', activitiesCorrected: changes.length, addedDistractors: Object.values(optionAdditions).flat().length,
  addedDDMMatches: Object.values(ddmAdditions).flat().length, addedMatchingPairs: Object.values(matchAdditions).flat().length,
  newPhysicalMedia: 0, newPhysicalAudio: 0, reason: 'Frozen production adapter requires four options/matches and at least three pairs.' }, null, 2));

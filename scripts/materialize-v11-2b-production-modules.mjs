import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async rel => JSON.parse(await readFile(path.join(root, rel), 'utf8'));
const save = async (rel, data) => {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
};
const contractsDoc = await load('content/english/production/v11-1b/deterministic-activity-contracts.json');
const mediaMap = await load('content/english/production/v11-2/media-concept-binding-map.json');
const audioMap = await load('content/english/production/v11-2b/audio-concept-binding-map.json');
const mediaRegistry = await load('content/english/media/media-registry.json');
const audioRegistry = await load('content/english/audio/audio-registry.json');
const runtimeAudioManifest = await load('duduq-audio/manifests/AUDIO_MANIFEST.json');
const mechanicRegistry = await load('content/mechanics/canonical-mechanics-registry.json');
const mediaById = new Map(mediaRegistry.entries.map(row => [row.mediaId, row]));
const audioById = new Map(audioRegistry.entries.map(row => [row.audioId, row]));
const runtimeAudioIds = new Set(runtimeAudioManifest.items.filter(row => row.status === 'APPROVED').map(row => row.audioId || row.id));
const sourceItems = contractsDoc.contracts;
const byModule = new Map();
for (const item of sourceItems) {
  if (!byModule.has(item.moduleId)) byModule.set(item.moduleId, []);
  byModule.get(item.moduleId).push(item);
}
const planByModule = new Map();
for (const moduleId of byModule.keys()) {
  planByModule.set(moduleId, await load(`content/english/planning/year-${moduleId[1]}/module-${moduleId.slice(-2)}.json`));
}
const modeMap = {
  'single-target-choice': 'single-target-choice',
  'single-bubble-choice': 'single-target-find',
  'audio-to-visual-multimatch': 'audio-4-to-visual-4-multimatch',
  grouping: 'grouping', 'semantic-pairs': 'semantic-pair',
  AUDIO_IMAGE: 'AUDIO_IMAGE', AUDIO_TEXT: 'AUDIO_TEXT', TEXT_IMAGE: 'TEXT_IMAGE',
  'sentence-completion': 'complete', complete: 'complete',
  'sentence-order': 'order'
};
const routeByMechanic = {
  'target-shooter': '/play/target-shooter/', 'bubble-pop': '/play/bubble-pop/',
  'drag-drop-multimedia': '/play/drag-drop-multimedia/', 'drag-drop': '/play/drag-drop/',
  matching: '/play/matching/', 'memory-quest': '/play/memory-quest/',
  'smart-sentence-complete': '/play/smart-sentence/', 'smart-sentence-order': '/play/smart-sentence/'
};
const toAsset = (conceptId, itemId) => {
  if (conceptId === 'NO_MEDIA') return null;
  const binding = mediaMap.bindings[conceptId];
  if (!binding?.mediaId || !mediaById.has(binding.mediaId)) throw new Error(`MEDIA_UNRESOLVED:${itemId}:${conceptId}`);
  const entry = mediaById.get(binding.mediaId);
  return { mediaId: binding.mediaId, assetId: binding.mediaId, urlOrPath: entry.urlOrPath || entry.assets?.[0]?.path,
    role: entry.role || 'CONTENT', semanticTarget: entry.semantic || entry.concept || '', alt: entry.semantic || entry.concept || 'Illustration' };
};
const audioId = (conceptId, itemId) => {
  const binding = audioMap.bindings[conceptId];
  if (!binding?.audioId) throw new Error(`AUDIO_UNRESOLVED:${itemId}:${conceptId}`);
  const entry = audioById.get(binding.audioId);
  if (!entry || entry.status !== 'APPROVED' || !runtimeAudioIds.has(binding.audioId) || !(entry.path || entry.urlOrPath || entry.outputPath || entry.assets?.[0]?.path)) throw new Error(`AUDIO_NOT_RUNTIME_READY:${itemId}:${binding.audioId}`);
  return binding.audioId;
};
const audioIdForRef = (ref, itemId) => {
  if (!ref?.audioId) return audioId(ref?.audioConceptId, itemId);
  const entry = audioById.get(ref.audioId);
  if (!entry || entry.status !== 'APPROVED' || !runtimeAudioIds.has(ref.audioId) || !(entry.path || entry.urlOrPath || entry.outputPath || entry.assets?.[0]?.path)) {
    throw new Error(`AUDIO_NOT_RUNTIME_READY:${itemId}:${ref.audioId}`);
  }
  return ref.audioId;
};
const audioRefsFor = c => [...c.requiredAudio.instruction, ...c.requiredAudio.learnerTargets, ...(c.requiredAudio.completedSentence || []),
  ...(c.requiredAudio.optionTargets || []), ...(c.requiredAudio.completedTranslationPt || [])];
const mediaRefsFor = c => c.requiredMedia.filter(row => row.mediaConceptId !== 'NO_MEDIA');
const conceptIdFor = ref => ref?.mediaConcept?.mediaConceptId || ref?.media?.mediaConceptId || ref?.mediaConceptId;
const audioConceptIdFor = ref => ref?.audioConcept?.audioConceptId || ref?.audioConceptId;
const audioField = ref => audioId(audioConceptIdFor(ref), ref.itemId || ref.cardId || ref.targetId || 'UNKNOWN');
const inlineMedia = (ref, itemId) => {
  const asset = toAsset(conceptIdFor(ref), itemId);
  return asset ? { mediaId: asset.mediaId, assetId: asset.assetId, role: ref.role || asset.role,
    semanticTarget: ref.semanticTarget || asset.semanticTarget, alt: asset.alt } : null;
};
const findCorrectValue = (c, options) => {
  const answer = c.correctAnswer;
  return options.find(option => option.semanticTarget === answer || option.label === answer || option.answerKey === answer || option.isCorrect)?.optionId;
};
const moduleMediaCatalog = moduleId => {
  const catalog = new Map();
  const add = (semantic, conceptId) => {
    if (!semantic || !conceptId || conceptId === 'NO_MEDIA') return;
    const asset = mediaMap.bindings[conceptId];
    if (asset?.mediaId && mediaById.has(asset.mediaId)) {
      const key = String(semantic).trim().toLowerCase();
      if (!catalog.has(key)) catalog.set(key, { semanticTarget: String(semantic), mediaId: asset.mediaId, mediaConceptId: conceptId });
    }
  };
  for (const c of byModule.get(moduleId) || []) {
    for (const row of c.requiredMedia) add(row.semanticTarget, row.mediaConceptId);
    const visit = (value) => {
      if (!value || typeof value !== 'object') return;
      if (value.mediaConceptId) add(value.semanticTarget, value.mediaConceptId);
      for (const child of Object.values(value)) visit(child);
    };
    visit(c.studentStimuli);
  }
  for (const entry of mediaRegistry.entries) {
    if (!entry.mediaId || !entry.semantic || !entry.urlOrPath && !entry.assets?.[0]?.path) continue;
    const key = String(entry.semantic).trim().toLowerCase();
    if (!catalog.has(key) && entry.status === 'APPROVED') catalog.set(key, { semanticTarget: entry.semantic, mediaId: entry.mediaId, mediaConceptId: null });
  }
  return catalog;
};
const allItems = [];
for (const [moduleId, records] of byModule) {
  if (records.length !== 20 || records.some((row, index) => row.itemId !== `${moduleId}-Q${String(index + 1).padStart(3, '0')}`)) throw new Error(`CONTRACT_SEQUENCE_INVALID:${moduleId}`);
  const catalog = moduleMediaCatalog(moduleId);
  for (const c of records) {
    const mode = modeMap[c.studentStimuli.mode] || modeMap[c.mechanicMode];
    if (!routeByMechanic[c.mechanicId] || !mode) throw new Error(`MECHANIC_MODE_UNMAPPED:${c.itemId}:${c.mechanicId}:${c.studentStimuli.mode}`);
    const instructionEn = c.spokenInstructionPlan.en;
    const instructionPt = c.spokenInstructionPlan.pt;
    const instructionEnRef = c.requiredAudio.instruction.find(row => row.language === 'en-US');
    const instructionPtRef = c.requiredAudio.instruction.find(row => row.language === 'pt-BR');
    const item = {
      item_id: c.itemId, moduleId, questionId: c.questionId, activityId: c.itemId, sequencePosition: c.sequencePosition,
      topicEn: planByModule.get(moduleId).title, semanticTargetType: c.semanticType, taskType: c.taskType, targetSkill: c.targetSkill,
      curricularObjective: c.curricularObjective, learningTarget: c.learningTarget,
      mechanicId: c.mechanicId, mechanicMode: mode, primaryInstructionEn: c.visibleInstructionEn, supportInstructionPt: c.supportInstructionPt,
      instruction: { version: '1.2', titleEn: c.targetContent, titlePt: c.supportInstructionPt,
        instructionEn, instructionPt, instructionAudioEnId: audioIdForRef(instructionEnRef, c.itemId),
        instructionAudioPtId: audioIdForRef(instructionPtRef, c.itemId), audioOrder: ['en', 'pt'],
        languageEn: 'English', languagePt: 'pt-BR', standard: 'DUDUQ_ENGLISH_MASTER_INSTRUCTION_STANDARD_V1_2' },
      stimulus: null, options: [], targetsToFind: [], items: [], targets: [], groups: [], pairs: [], sentence: null,
      tokens: [], orderedTokens: [], answerKey: null, mappings: [], bubbleDistractorPool: [], audioBindings: [], mediaBindings: [],
      feedbackProfile: c.feedbackProfile, answerLeakStatus: c.answerLeakStatus, refinementFlags: c.refinementFlags,
      contractSource: 'content/english/production/v11-1b/deterministic-activity-contracts.json'
    };
    const mediaBindings = mediaRefsFor(c).map(ref => ({ ...inlineMedia(ref, c.itemId), semanticTarget: ref.semanticTarget, role: ref.role, answerLeakRisk: ref.answerLeakRisk }));
    item.mediaBindings = mediaBindings.filter(Boolean);
    const audioBindings = c.requiredAudio.learnerTargets.map(ref => ({ audioId: audioField(ref), role: ref.role,
      language: ref.language, spokenTarget: ref.spokenTarget, semanticTarget: ref.spokenTarget,
      itemId: ref.itemId || null, answerKey: ref.answerKey || null }));
    item.audioBindings = audioBindings;
    const stimulus = c.studentStimuli.stimulus;
    if (stimulus) {
      item.stimulus = { type: stimulus.modality === 'audio' ? 'content-audio' : stimulus.modality || 'content',
        target: stimulus.semanticTarget || stimulus.target || null };
      if (stimulus.audioConcept) item.stimulus.audioId = audioField(stimulus);
      if (stimulus.mediaConcept) item.stimulus.media = inlineMedia(stimulus, c.itemId);
    }
    if (c.mechanicId === 'target-shooter' || c.mechanicId === 'bubble-pop') {
      const options = c.studentStimuli.options.map(option => ({ optionId: option.optionId, id: option.optionId,
        label: option.semanticTarget, semanticTarget: option.semanticTarget,
        media: inlineMedia(option, c.itemId), mediaId: inlineMedia(option, c.itemId)?.mediaId,
        answerKey: option.isCorrect ? option.optionId : null, correct: Boolean(option.isCorrect) }));
      const correct = options.find(option => option.correct || option.semanticTarget === c.correctAnswer);
      if (!correct) throw new Error(`CORRECT_OPTION_NOT_FOUND:${c.itemId}`);
      item.options = options; item.answerKey = correct.optionId;
      if (c.mechanicId === 'bubble-pop') {
        item.targetsToFind = [{ ...correct, id: `${c.itemId}-${correct.optionId}`, type: 'image', correct: true }];
        const wrong = options.filter(option => option.optionId !== correct.optionId);
        const seen = new Set(wrong.map(option => option.semanticTarget.toLowerCase()));
        const additions = [...catalog.values()].filter(row => !seen.has(row.semanticTarget.toLowerCase()) && row.semanticTarget.toLowerCase() !== correct.semanticTarget.toLowerCase());
        const pool = [...wrong, ...additions].slice(0, 5);
        if (pool.length < 5) throw new Error(`BUBBLE_DISTRACTOR_POOL_LT_5:${c.itemId}:${pool.length}`);
        item.bubbleDistractorPool = pool.map((option, index) => ({ id: `${c.itemId}-D${index + 1}`, label: option.semanticTarget,
          semanticTarget: option.semanticTarget, mediaId: option.mediaId || option.media?.mediaId,
          media: option.media ? option.media : { assetId: option.mediaId, mediaId: option.mediaId, semanticTarget: option.semanticTarget } }));
      }
    } else if (c.mechanicId === 'drag-drop-multimedia') {
      const inputs = c.studentStimuli.items;
      const destinations = c.studentStimuli.destinations;
      item.items = inputs.map(input => ({ id: input.itemId, modality: input.modality, semanticTarget: input.semanticTarget,
        audioId: input.audioConcept ? audioField(input) : null,
        text: input.modality === 'text' ? input.semanticTarget : undefined,
        answerKey: c.correctAnswer[input.itemId] || c.studentStimuli.answerKey[input.itemId] }));
      item.targets = destinations.map(target => ({ id: target.targetId, semanticTarget: target.semanticTarget,
        media: inlineMedia(target, c.itemId), mediaId: inlineMedia(target, c.itemId)?.mediaId,
        answerKey: target.targetId }));
      item.mappings = c.studentStimuli.mappings.map(mapping => ({ itemId: mapping.itemId, targetId: mapping.targetId,
        answerKey: mapping.targetId }));
      item.dragDropContract = { mode: 'multi-match', mapping: item.mappings };
      item.answerKey = c.correctAnswer;
      item.targetsToFind = [];
    } else if (c.mechanicId === 'drag-drop') {
      item.groups = c.studentStimuli.groups.map(group => ({ id: group.groupId, label: group.label }));
      item.items = c.studentStimuli.items.map(input => ({ id: input.itemId, modality: input.modality,
        semanticTarget: input.semanticTarget, groupId: input.groupId,
        audioId: input.audioConcept ? audioField(input) : null,
        media: input.mediaConcept ? inlineMedia(input, c.itemId) : null,
        assetId: input.mediaConcept ? inlineMedia(input, c.itemId)?.mediaId : null,
        text: input.modality === 'text' ? input.semanticTarget : undefined,
        answerKey: input.groupId }));
      item.answerKey = c.correctAnswer;
    } else if (c.mechanicId === 'matching') {
      item.pairs = c.studentStimuli.pairs.map(pair => ({ pairId: pair.pairId, semanticTarget: pair.semanticTarget,
        a: { id: pair.left.id, modality: pair.left.modality, value: pair.left.value,
          ...(pair.left.audioConcept ? { audioId: audioField(pair.left) } : {}),
          ...(pair.left.mediaConcept ? { media: inlineMedia(pair.left, c.itemId), assetId: inlineMedia(pair.left, c.itemId)?.mediaId } : {}) },
        b: { id: pair.right.id, modality: pair.right.modality, value: pair.right.value,
          ...(pair.right.audioConcept ? { audioId: audioField(pair.right) } : {}),
          ...(pair.right.mediaConcept ? { media: inlineMedia(pair.right, c.itemId), assetId: inlineMedia(pair.right, c.itemId)?.mediaId } : {}) }
      }));
      item.answerKey = c.correctAnswer;
    } else if (c.mechanicId === 'memory-quest') {
      item.pairs = c.studentStimuli.pairs.map(pair => ({ pairId: pair.pairId, semanticTarget: pair.semanticTarget,
        cards: pair.cards.map(card => ({ cardId: card.cardId, modality: card.modality,
          ...(card.audioConcept ? { audioId: audioField(card) } : {}),
          ...(card.mediaConcept ? { media: inlineMedia(card, c.itemId), assetId: inlineMedia(card, c.itemId)?.mediaId } : {}),
          ...(card.value ? { text: card.value } : {}) })) }));
      item.answerKey = c.correctAnswer;
    } else if (c.mechanicId === 'smart-sentence-complete') {
      const stim = c.studentStimuli;
      const tokens = stim.sentence.split(/\s+/);
      const index = stim.blank.tokenIndex;
      if (index < 0 || index >= tokens.length) throw new Error(`SMART_SENTENCE_BLANK_INDEX_INVALID:${c.itemId}`);
      item.sentence = tokens.map((word, i) => i === index ? { slot: true } : word);
      item.options = stim.options.map((value, i) => ({ optionId: `${c.itemId}-O${i + 1}`, label: value, answerKey: value }));
      item.answerKey = c.correctAnswer;
      item.completedSentenceEn = stim.sourceSentence;
      item.completedSentencePt = c.completedSentencePt || instructionPt;
      if (c.successTranslationPt && c.successTranslationAudioId) {
        item.successTranslationPt = c.successTranslationPt;
        item.successTranslationAudioId = c.successTranslationAudioId;
      }
      const normalizeSpeech = speech => String(speech || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.!?]+$/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
      const existingSpeech = speech => audioRegistry.entries.find(row => row.status === 'APPROVED' &&
        row.locale === 'en-US' && !/instruction/i.test(row.semanticRole || '') && normalizeSpeech(row.speechText || row.transcript) === normalizeSpeech(speech) &&
        (row.path || row.urlOrPath || row.outputPath || row.assets?.[0]?.path));
      item.options = item.options.map(option => {
        const speech = existingSpeech(option.label);
        if (!speech) throw new Error(`SMART_SENTENCE_OPTION_AUDIO_MISSING:${c.itemId}:${option.label}`);
        return { ...option, audioEnId: speech.audioId };
      });
      const fullSentenceRef = c.requiredAudio.completedSentence?.find(row => row.language === 'en-US');
      if (!fullSentenceRef) throw new Error(`SMART_SENTENCE_COMPLETION_AUDIO_REQUIREMENT_MISSING:${c.itemId}`);
      item.sentenceAudioEnId = audioId(fullSentenceRef.audioConceptId, c.itemId);
      item.sentenceAudioPtId = item.successTranslationAudioId || audioIdForRef(instructionPtRef, c.itemId);
    } else if (c.mechanicId === 'smart-sentence-order') {
      item.tokens = c.studentStimuli.units;
      item.orderedTokens = c.studentStimuli.canonicalOrder;
      item.answerKey = c.correctAnswer;
    }
    if (item.mechanicId === 'drag-drop-multimedia') {
      item.audioBindings = item.items.filter(row => row.audioId).map(row => ({ role: 'CONTENT_STIMULUS', itemId: row.id, semanticTarget: row.semanticTarget, audioId: row.audioId, targetId: row.answerKey }));
      item.mediaBindings = item.targets.map(row => ({ role: 'DESTINATION', targetId: row.id, semanticTarget: row.semanticTarget, mediaId: row.mediaId, assetId: row.mediaId }));
    }
    if (item.mechanicId === 'memory-quest') item.semanticTargetType = c.semanticType;
    if (item.mechanicId === 'smart-sentence-complete') item.semanticTargetType = c.semanticType;
    allItems.push(item);
  }
}

const context = { window: {} };
vm.runInNewContext(await readFile(path.join(root, 'core/duduq-canonical-mechanic-adapter-registry.js'), 'utf8'), context);
const adapter = context.window.DuduQCanonicalMechanicAdapterRegistry;
const errors = [];
for (const item of allItems) {
  const error = adapter.validateContract(item);
  if (error) errors.push(error);
  try { adapter.resolve(item.mechanicId, item.mechanicMode, mechanicRegistry); }
  catch (failure) { errors.push(`${item.item_id}:${failure.message}`); }
}
if (errors.length) throw new Error(`MATERIALIZATION_RUNTIME_CONTRACT_ERRORS:${errors.slice(0, 30).join('|')}`);

const missing = [];
for (const c of sourceItems) {
  for (const ref of audioRefsFor(c)) {
    if (ref.audioId) {
      try { audioIdForRef(ref, c.itemId); } catch (error) { missing.push(error.message); }
    } else if (!audioMap.bindings[ref.audioConceptId]?.audioId) missing.push(`${c.itemId}:${ref.audioConceptId}`);
  }
  for (const ref of mediaRefsFor(c)) if (!mediaMap.bindings[ref.mediaConceptId]?.mediaId) missing.push(`${c.itemId}:${ref.mediaConceptId}`);
}
if (missing.length) throw new Error(`SOURCE_READY_DEPENDENCIES_PENDING:${missing.slice(0, 50).join('|')}`);

const mediaRequirementsDoc = await load('content/english/production/v11-1b/media-requirements.json');
const audioRequirementsDoc = await load('content/english/production/v11-1b/audio-requirements.json');
for (const requirement of mediaRequirementsDoc.requirements) {
  const binding = mediaMap.bindings[requirement.mediaConceptId];
  if (!binding?.mediaId) throw new Error(`MEDIA_REQUIREMENT_NOT_BOUND:${requirement.mediaConceptId}`);
  const entry = mediaById.get(binding.mediaId);
  requirement.assetStatus = 'RESOLVED'; requirement.mediaId = binding.mediaId;
  requirement.assetPath = entry.urlOrPath || entry.assets?.[0]?.path;
  requirement.technicalStatus = entry.technicalStatus || 'PASS';
  requirement.refinementStatus = entry.refinementStatus || 'HUMAN_REVIEW_PENDING';
}
for (const requirement of audioRequirementsDoc.requirements) {
  const binding = audioMap.bindings[requirement.audioConceptId];
  if (!binding?.audioId) throw new Error(`AUDIO_REQUIREMENT_NOT_BOUND:${requirement.audioConceptId}`);
  const entry = audioById.get(binding.audioId);
  if (!entry) throw new Error(`AUDIO_REQUIREMENT_NOT_IN_REGISTRY:${requirement.audioConceptId}:${binding.audioId}`);
  requirement.assetStatus = 'RESOLVED'; requirement.audioId = binding.audioId;
  requirement.assetPath = entry.urlOrPath || entry.outputPath || entry.assets?.[0]?.path;
  requirement.technicalStatus = entry.qcStatus || entry.status || 'PASS';
  requirement.humanStatus = entry.humanPronunciationReview || 'HUMAN_REVIEW_PENDING';
}
for (const contract of sourceItems) {
  const bindNested = value => {
    if (!value || typeof value !== 'object') return;
    if (value.mediaConceptId && mediaMap.bindings[value.mediaConceptId]) {
      const binding = mediaMap.bindings[value.mediaConceptId];
      value.mediaId = binding.mediaId; value.assetPath = binding.assetPath; value.assetStatus = 'RESOLVED';
    }
    if (value.audioId && audioById.has(value.audioId)) {
      const entry = audioById.get(value.audioId);
      if (entry.status !== 'APPROVED' || !runtimeAudioIds.has(value.audioId)) errors.push(`AUDIO_DIRECT_BINDING_NOT_RUNTIME_READY:${contract.itemId}:${value.audioId}`);
    } else if (value.audioConceptId && audioMap.bindings[value.audioConceptId]) {
      const binding = audioMap.bindings[value.audioConceptId];
      value.audioId = binding.audioId; value.assetPath = binding.path; value.assetStatus = 'RESOLVED';
    }
    for (const nested of Object.values(value)) bindNested(nested);
  };
  bindNested(contract);
  contract.contractStatus = 'PRODUCTION_SOURCE_READY';
  contract.resolvedAssetBindings = {
    media: contract.requiredMedia.filter(row => row.mediaConceptId !== 'NO_MEDIA').map(row => ({ mediaConceptId: row.mediaConceptId,
      mediaId: mediaMap.bindings[row.mediaConceptId].mediaId, assetPath: mediaMap.bindings[row.mediaConceptId].assetPath })),
    audio: audioRefsFor(contract).map(row => {
      const boundAudioId = audioIdForRef(row, contract.itemId);
      const entry = audioById.get(boundAudioId);
      return { audioConceptId: row.audioConceptId || null, audioId: boundAudioId,
        assetPath: entry?.path || entry?.urlOrPath || entry?.outputPath || entry?.assets?.[0]?.path || audioMap.bindings[row.audioConceptId]?.path };
    })
  };
}

const modules = [...byModule.keys()].sort();
for (const moduleId of modules) {
  const planPath = `content/english/planning/year-${moduleId[1]}/module-${moduleId.slice(-2)}.json`;
  const plan = planByModule.get(moduleId);
  const records = allItems.filter(row => row.moduleId === moduleId);
  const sequence = records.map(row => row.item_id);
  const first = records[0];
  const firstRoute = `${routeByMechanic[first.mechanicId]}?duduqModule=${moduleId}&duduqItem=${first.item_id}`;
  const moduleLabel = `MÓDULO ${Number(moduleId.slice(-2))}`;
  const gradeLabel = `${Number(moduleId[1])}º ANO`;
  const subjectLabel = 'LÍNGUA INGLESA';
  const metadata = {
    schemaVersion: 'duduq-year1-module-production-v1', moduleId, year: Number(moduleId[1]), moduleNumber: Number(moduleId.slice(-2)),
    title: plan.title, topic: plan.centralTheme, subtitle: 'Listen, look and learn!',
    intro: { required: true, moduleLabel, gradeLabel, subjectLabel, route: '/play/intro-module/' },
    allowedMechanics: [...new Set(records.map(row => row.mechanicId))], blockedMechanics: ['smart-sentence-unscramble'],
    lifecycle: 'DUDUQ_SHARED_MODULE_RUNTIME_ROUTE_V1', finalContract: 'MODULE_FINAL_CANONICAL_LOCKED',
    sourceBlueprint: planPath, curriculumAuthority: 'content/english/master/curricular-master-v3.json',
    navigation: { intro: `/play/intro-module/?${new URLSearchParams({ module: moduleLabel, grade: gradeLabel, subject: subjectLabel, next: firstRoute })}`,
      first: firstRoute, sequence, final: `/play/final-module/?moduleId=${moduleId}` },
    productionStatus: 'PRODUCTION_READY', productionSource: 'content/english/production/v11-1b/deterministic-activity-contracts.json'
  };
  const questionDoc = { schemaVersion: 'duduq-year1-question-contract-v1', moduleId, itemCount: 20, items: records };
  const base = `content/english/year-${moduleId[1]}/module-${moduleId.slice(-2)}`;
  await save(`${base}/module.json`, metadata);
  await save(`${base}/questions.json`, questionDoc);
  const route = `play/english/year-${moduleId[1]}/module-${moduleId.slice(-2)}/index.html`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>DUDUQ English — ${moduleId}</title><script src="/core/duduq-module-flow.js"></script><script src="/core/duduq-canonical-mechanic-adapter-registry.js"></script><script src="/core/duduq-shared-module-route-runtime.js"></script></head><body><main data-duduq-module-entry="${moduleId}" aria-live="polite"></main><script src="/core/duduq-year1-module-entry.js"></script></body></html>\n`;
  await mkdir(path.dirname(path.join(root, route)), { recursive: true });
  await writeFile(path.join(root, route), html);
}
const report = { schemaVersion: 'duduq-v11-2b-materialization-report-v1', generatedAt: new Date().toISOString(), modules: modules.length,
  activities: allItems.length, runtimeAdapterValidation: 'PASS', moduleIds: modules,
  routeFiles: modules.map(id => `play/english/year-${id[1]}/module-${id.slice(-2)}/index.html`), status: 'PRODUCTION_SOURCE_READY' };
await save('content/english/production/v11-2b/module-materialization-report.json', report);
await save('content/english/production/v11-1b/deterministic-activity-contracts.json', contractsDoc);
await save('content/english/production/v11-1b/media-requirements.json', mediaRequirementsDoc);
await save('content/english/production/v11-1b/audio-requirements.json', audioRequirementsDoc);
console.log(JSON.stringify({ status: report.status, modules: report.modules, activities: report.activities, runtimeAdapterValidation: report.runtimeAdapterValidation }, null, 2));

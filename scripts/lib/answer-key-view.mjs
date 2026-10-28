const scalarKey = value => typeof value === 'string' || typeof value === 'number' ? String(value) : null;
const allStrings = value => Array.isArray(value) ? value.map(scalarKey).filter(Boolean) : [];

function mediaIds(node, out = new Set(), seen = new WeakSet()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return [...out];
  seen.add(node);
  if (Array.isArray(node)) { for (const entry of node) mediaIds(entry, out, seen); return [...out]; }
  for (const [key, value] of Object.entries(node)) {
    if (['mediaId', 'assetId', 'image_ref', 'imageRef', 'imageId', 'imageAssetId', 'visualMediaId'].includes(key) && typeof value === 'string' && /^(IMG|MEDIA|Y[1-5]M\d{2}-EMOJI)-/i.test(value)) out.add(value);
    else if (value && typeof value === 'object' && !/audio|voice|sound|transcript/i.test(key)) mediaIds(value, out, seen);
  }
  return [...out];
}

function mediaRecords(node, refsById) {
  return mediaIds(node).map(id => refsById.get(id) || { mediaId: id, status: 'MISSING_FROM_IMAGE_INDEX', assetPath: null, assetSha256: null, assetIntegrity: 'UNREGISTERED' });
}

function base(question) {
  return {
    activityId: question.item_id,
    mechanicId: question.mechanicId || question.mechanic || question.mecanica_preferida || 'UNKNOWN',
    mechanicMode: question.mechanicMode || null,
    instructionEn: question.instruction?.instructionEn || question.primaryInstructionEn || null,
    instructionPt: question.instruction?.instructionPt || question.supportInstructionPt || question.instrucao_pt || null,
    learningTarget: question.learningTarget || question.objetivo || question.topicEn || null,
    status: 'NOT_IDENTIFIED',
    kind: 'UNRESOLVED',
    responseText: null,
    alternatives: [], pairs: [], associations: [], sequence: []
  };
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }

/** Builds an admin-only gabarito view from explicit answerKey fields/contracts. Never guesses from labels or image IDs. */
export function buildAnswerKeyView(question, references = []) {
  const view = base(question);
  const refsById = new Map(references.map(ref => [ref.mediaId, ref]));
  const answerKey = question.answerKey ?? question.correctAnswerKey ?? question.correctAnswerKeys ?? null;
  const explicitOptionKeys = unique([
    ...allStrings(question.correctAnswerKeys),
    ...allStrings(question.optionContract?.correctOptionIds),
    ...allStrings(question.correctAnswerContract?.optionIds)
  ]);

  if (view.mechanicId === 'bubble-pop' && scalarKey(answerKey) && Array.isArray(question.targetsToFind) && question.targetsToFind.length
    && question.targetsToFind.some(item => item.media?.role === 'CORRECT_BUBBLE')) {
    const distractors = Array.isArray(question.bubbleDistractorPool) ? question.bubbleDistractorPool : [];
    const alternatives = [
      ...question.targetsToFind.map(item => ({ item, sourceRole: 'TARGET' })),
      ...distractors.map(item => ({ item, sourceRole: 'DISTRACTOR' }))
    ].map(({ item, sourceRole }) => {
      const officialMediaRole = item.media?.role;
      const role = sourceRole === 'DISTRACTOR' && officialMediaRole === 'DISTRACTOR_BUBBLE'
        ? 'DISTRACTOR'
        : sourceRole === 'TARGET' && officialMediaRole === 'CORRECT_BUBBLE'
          ? 'CORRECT'
          : 'UNRESOLVED';
      return { id: item.optionId || item.id || null, label: item.label || item.semanticTarget || item.answerKey || item.id || null, role, media: mediaRecords(item, refsById) };
    });
    if (alternatives.some(item => item.role === 'CORRECT') && alternatives.every(item => item.role === 'CORRECT' || item.role === 'DISTRACTOR')) {
      view.status = 'IDENTIFIED'; view.kind = 'CHOICE'; view.alternatives = alternatives;
      view.responseText = alternatives.filter(item => item.role === 'CORRECT').map(item => item.label).join(' / ');
      return view;
    }
    view.alternatives = alternatives;
    return view;
  }

  if (['target-shooter', 'bubble-pop', 'smart-sentence-complete'].includes(view.mechanicId) && Array.isArray(question.options) && question.options.length) {
    const scalar = scalarKey(answerKey);
    const keySet = new Set([...explicitOptionKeys, ...allStrings(answerKey)]);
    const marked = question.options.map(option => {
      const keys = [scalarKey(option.answerKey), scalarKey(option.optionId)].filter(Boolean);
      const correct = scalar ? keys.includes(scalar) : keys.some(key => keySet.has(key));
      return {
        id: option.optionId || option.answerKey || null,
        label: option.label || option.text || option.value || null,
        answerKey: option.answerKey ?? null,
        role: correct ? 'CORRECT' : 'DISTRACTOR',
        media: mediaRecords(option, refsById),
        audioId: option.audioId || option.audioEnId || null
      };
    });
    const correct = marked.filter(option => option.role === 'CORRECT');
    if (correct.length && (scalar || explicitOptionKeys.length || Array.isArray(answerKey))) {
      view.status = 'IDENTIFIED'; view.kind = 'CHOICE'; view.alternatives = marked;
      view.responseText = correct.map(option => option.label || option.answerKey).join(' / ');
      return view;
    }
    view.alternatives = marked.map(option => ({ ...option, role: 'UNRESOLVED' }));
    return view;
  }

  if (view.mechanicId === 'bubble-pop' && scalarKey(answerKey) && Array.isArray(question.targetsToFind) && question.targetsToFind.length) {
    const candidates = [...question.targetsToFind, ...(question.bubbleDistractorPool || [])];
    const alternatives = candidates.map(item => ({
      id: item.id || null,
      label: item.label || item.semanticTarget || item.answerKey || item.id || null,
      role: item.media?.role === 'CORRECT_BUBBLE' ? 'CORRECT' : item.media?.role === 'DISTRACTOR_BUBBLE' ? 'DISTRACTOR' : 'UNRESOLVED',
      media: mediaRecords(item, refsById)
    }));
    if (alternatives.some(item => item.role === 'CORRECT') && alternatives.every(item => item.role === 'CORRECT' || item.role === 'DISTRACTOR')) {
      view.status = 'IDENTIFIED'; view.kind = 'CHOICE'; view.alternatives = alternatives;
      view.responseText = question.target?.semanticTarget || scalarKey(answerKey) || alternatives.filter(item => item.role === 'CORRECT').map(item => item.label).join(' / ');
    }
    return view;
  }

  if (view.mechanicId === 'drag-drop' && question.mechanicMode === 'grouping' && question.answerKey && !Array.isArray(question.answerKey) && typeof question.answerKey === 'object' && Array.isArray(question.items)) {
    const groups = new Map((question.groups || []).map(group => [String(group.id), group.label || group.id]));
    const associations = question.items.map(item => {
      const groupId = question.answerKey[item.id];
      return { itemId: item.id, label: item.label || item.text || item.semanticTarget || item.id, groupId: groupId ?? null, groupLabel: groups.get(String(groupId)) || null, role: groupId && groups.has(String(groupId)) ? 'CORRECT_GROUP' : 'UNRESOLVED', media: mediaRecords(item, refsById) };
    });
    if (associations.length && associations.every(item => item.role === 'CORRECT_GROUP') && Object.keys(question.answerKey).length === associations.length) {
      view.status = 'IDENTIFIED'; view.kind = 'GROUPING'; view.associations = associations; view.responseText = `${associations.length} associações corretas`;
    }
    return view;
  }

  if (view.mechanicId === 'matching' && question.answerKey && !Array.isArray(question.answerKey) && typeof question.answerKey === 'object') {
    const endpoints = new Map();
    for (const pair of question.pairs || []) for (const endpoint of [pair.a, pair.b]) if (endpoint?.id) endpoints.set(String(endpoint.id), endpoint);
    const pairs = Object.entries(question.answerKey).map(([leftId, rightId]) => {
      const left = endpoints.get(leftId), right = endpoints.get(String(rightId));
      return { leftId, rightId: String(rightId), leftLabel: left?.label || left?.value || leftId, rightLabel: right?.label || right?.value || String(rightId), media: [...mediaRecords(left || {}, refsById), ...mediaRecords(right || {}, refsById)] };
    });
    if (pairs.length && pairs.every(pair => endpoints.has(pair.leftId) && endpoints.has(pair.rightId))) {
      view.status = 'IDENTIFIED'; view.kind = 'PAIRS'; view.pairs = pairs; view.responseText = `${pairs.length} pares corretos`;
    }
    return view;
  }

  if (view.mechanicId === 'memory-quest' && Array.isArray(answerKey) && Array.isArray(question.pairs)) {
    const keys = new Set(answerKey.map(String));
    const pairs = question.pairs.map(pair => ({
      pairId: pair.pairId,
      label: pair.label || pair.semanticTarget || pair.pairId,
      correct: keys.has(String(pair.pairId)),
      cards: [pair.a, pair.b, ...(pair.cards || [])].filter(Boolean).map(card => ({ id: card.cardId || card.id, label: card.label || card.value || card.modality || card.cardId || card.id, modality: card.modality || null, media: mediaRecords(card, refsById) }))
    }));
    if (pairs.length && pairs.every(pair => pair.correct) && pairs.every(pair => pair.cards.length >= 2)) {
      view.status = 'IDENTIFIED'; view.kind = 'MEMORY_PAIRS'; view.pairs = pairs; view.responseText = `${pairs.length} pares correspondentes`;
    }
    return view;
  }

  if (view.mechanicId === 'drag-drop-multimedia') {
    const mapping = Array.isArray(question.dragDropContract?.mapping) ? question.dragDropContract.mapping : question.mappings;
    const itemList = Array.isArray(question.options) && question.options.length ? question.options : question.items;
    if (!Array.isArray(mapping) || !mapping.length || !Array.isArray(itemList)) return view;
    const options = new Map(itemList.map(option => [String(option.itemId || option.optionId || option.id), option]));
    const targetSource = Array.isArray(question.targets) && question.targets.length ? question.targets : itemList;
    const targets = new Map(targetSource.map(target => {
      const targetId = target.targetId ?? target.id ?? target.itemId ?? target.optionId;
      return targetId === undefined || targetId === null ? null : [String(targetId), target];
    }).filter(Boolean));
    const answerMap = question.answerKey && !Array.isArray(question.answerKey) && typeof question.answerKey === 'object' ? question.answerKey : null;
    const associations = mapping.map(mappingItem => {
      const item = options.get(String(mappingItem.itemId)); const target = targets.get(String(mappingItem.targetId));
      const explicitlyMatches = answerMap ? String(answerMap[mappingItem.itemId]) === String(mappingItem.targetId) : question.dragDropContract?.mappingAuthority === 'explicit-one-to-one';
      return { itemId: mappingItem.itemId, targetId: mappingItem.targetId, label: item?.label || item?.semanticTarget || mappingItem.itemId, itemLabel: item?.label || item?.semanticTarget || mappingItem.itemId, targetLabel: target?.label || target?.text || target?.semanticTarget || mappingItem.targetId, role: explicitlyMatches ? 'CORRECT_MATCH' : 'UNRESOLVED', media: [...mediaRecords(item || {}, refsById), ...mediaRecords(target || {}, refsById)], audioId: item?.audioId || null };
    });
    if (associations.length && associations.every(item => item.role === 'CORRECT_MATCH' && options.has(String(item.itemId)) && targets.has(String(item.targetId)))) {
      view.status = 'IDENTIFIED'; view.kind = 'DRAG_DROP_MATCHES'; view.associations = associations; view.responseText = `${associations.length} destinos corretos`;
    }
    return view;
  }

  if (view.mechanicId === 'smart-sentence-order' && Array.isArray(answerKey) && answerKey.length && answerKey.every(token => typeof token === 'string')) {
    view.status = 'IDENTIFIED'; view.kind = 'ORDERED_SEQUENCE'; view.sequence = [...answerKey]; view.responseText = answerKey.join(' '); return view;
  }

  if (typeof answerKey === 'string' && answerKey && view.mechanicId === 'drag-drop-multimedia') {
    const answers = question.correctAnswerKeys || answerKey.split('+');
    const keys = new Set(answers.map(String));
    const options = (question.options || []).map(option => ({ id: option.itemId || option.optionId || null, label: option.label || option.semanticTarget || null, answerKey: option.answerKey || null, role: keys.has(String(option.answerKey)) ? 'CORRECT' : 'DISTRACTOR', media: mediaRecords(option, refsById), audioId: option.audioId || null }));
    if (options.length && options.every(option => option.answerKey && keys.has(option.answerKey))) { view.status = 'IDENTIFIED'; view.kind = 'MULTI_MATCH'; view.alternatives = options; view.responseText = `${options.length} associações corretas`; }
  }
  return view;
}

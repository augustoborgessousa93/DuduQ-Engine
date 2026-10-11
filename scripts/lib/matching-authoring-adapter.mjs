const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function validateMatchingDraft(question, allowedImageAssetKeys) {
  const errors = [];
  if (!question || typeof question !== 'object' || Array.isArray(question)) return { ok: false, errors: ['O conteúdo da questão deve ser um objeto.'] };
  const matching = question.metadata?.matching;
  if (!matching || typeof matching !== 'object') return { ok: false, errors: ['Informe metadata.matching.'] };
  const left = matching.leftItems;
  const right = matching.rightItems;
  const pairs = matching.pairs;
  if (!Array.isArray(left) || !Array.isArray(right) || !Array.isArray(pairs)) return { ok: false, errors: ['Preencha leftItems, rightItems e pairs.'] };
  if (![2, 4].includes(left.length) || right.length !== left.length) errors.push('Esta versão candidata suporta exatamente 2×2 ou 4×4 itens.');
  const ids = (items, side) => {
    const result = new Set();
    for (const [index, item] of (Array.isArray(items) ? items : []).entries()) {
      if (!item || typeof item !== 'object' || !SAFE_ID.test(String(item.id || ''))) errors.push(`${side}[${index + 1}]: ID ausente ou inválido.`);
      else if (result.has(item.id)) errors.push(`${side}: o ID ${item.id} está duplicado.`);
      else result.add(item.id);
      const label = side === 'leftItems' ? item?.label : item?.alt;
      if (typeof label !== 'string' || !label.trim() || label.length > 120) errors.push(`${side}[${index + 1}]: texto/descrição obrigatório (máximo 120 caracteres).`);
      if (side === 'rightItems' && !allowedImageAssetKeys?.has(item?.imageAssetKey)) errors.push(`${side}[${index + 1}]: selecione uma imagem catalogada suportada.`);
    }
    return result;
  };
  const leftIds = ids(left, 'leftItems');
  const rightIds = ids(right, 'rightItems');
  if (pairs.length !== left.length) errors.push('Cada item precisa ter exatamente uma relação correta.');
  const usedLeft = new Set();
  const usedRight = new Set();
  for (const [index, pair] of pairs.entries()) {
    if (!pair || !leftIds.has(pair.leftId) || !rightIds.has(pair.rightId)) {
      errors.push(`pairs[${index + 1}]: referência a item inexistente.`);
      continue;
    }
    if (usedLeft.has(pair.leftId) || usedRight.has(pair.rightId)) errors.push(`pairs[${index + 1}]: relações devem ser bijetivas (1:1), sem repetição.`);
    usedLeft.add(pair.leftId);
    usedRight.add(pair.rightId);
  }
  if (usedLeft.size !== leftIds.size || usedRight.size !== rightIds.size) errors.push('Há itens sem par correto.');
  for (const field of ['statement', 'instruction']) {
    if (typeof question[field] !== 'string' || !question[field].trim() || question[field].length > 240) errors.push(`${field}: texto obrigatório (máximo 240 caracteres).`);
  }
  return { ok: errors.length === 0, errors };
}

export function toMatchingRuntimePayload(question, module, project) {
  const matching = question.metadata.matching;
  return {
    id: question.questionId,
    topic: String(project.subject || 'Atividade').slice(0, 60),
    subtitle: `Preview isolado · ${String(module.title || module.moduleId).slice(0, 80)}`,
    counter: '1 / 1',
    completed: 0,
    total: 1,
    question: {
      id: question.questionId,
      label: String(question.instruction).slice(0, 120),
      prompt: String(question.statement).slice(0, 240),
      audioText: ''
    },
    leftTitle: String(matching.leftTitle || 'Itens').slice(0, 60),
    rightTitle: String(matching.rightTitle || 'Correspondências').slice(0, 60),
    leftItems: matching.leftItems.map(item => ({ id: item.id, label: item.label })),
    rightItems: matching.rightItems.map(item => ({ id: item.id, imageAssetKey: item.imageAssetKey, alt: item.alt })),
    pairs: matching.pairs.map(pair => ({ leftId: pair.leftId, rightId: pair.rightId })),
    actionLabel: 'CONFIRMAR'
  };
}

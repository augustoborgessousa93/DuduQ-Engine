export const MODE_MODALITIES = Object.freeze({
  AUDIO_IMAGE: Object.freeze(["audio", "image"]),
  TEXT_IMAGE: Object.freeze(["text", "image"]),
  AUDIO_TEXT: Object.freeze(["audio", "text"])
});

// These two authored production activities are deliberately two-pair checks,
// not incomplete 3–6-pair boards. The exception is bound to the canonical item
// ID, mode, pair IDs, and semantic targets; every other activity keeps the
// established 3–6 pair contract.
const TWO_PAIR_CURRICULAR_CASES = Object.freeze({
  "Y3M03-Q013": Object.freeze({
    mode: "AUDIO_TEXT",
    pairs: Object.freeze([
      Object.freeze({ pairId: "Y3M03-Q013-P1", semanticTarget: "he" }),
      Object.freeze({ pairId: "Y3M03-Q013-P2", semanticTarget: "she" })
    ])
  }),
  "Y4M06-Q013": Object.freeze({
    mode: "TEXT_IMAGE",
    pairs: Object.freeze([
      Object.freeze({ pairId: "Y4M06-Q013-P1", semanticTarget: "in" }),
      Object.freeze({ pairId: "Y4M06-Q013-P2", semanticTarget: "on" })
    ])
  })
});

function isExplicitTwoPairCurricularCase(activity, mode) {
  const expected = TWO_PAIR_CURRICULAR_CASES[String(activity?.id || "").trim()];
  if (!expected || mode !== expected.mode || !Array.isArray(activity?.pairs) || activity.pairs.length !== 2) return false;
  return expected.pairs.every((pair, index) =>
    activity.pairs[index]?.pairId === pair.pairId &&
    String(activity.pairs[index]?.semanticTarget || "").trim().toLocaleLowerCase("en-US") === pair.semanticTarget
  );
}

export function validateMemoryQuestActivity(activity, { qaOnly = false } = {}) {
  const errors = [];
  const mode = String(activity?.mode || "").toUpperCase();
  const required = MODE_MODALITIES[mode];
  if (!required) errors.push(`INVALID_MODE:${mode || "missing"}`);
  if (!String(activity?.topicEn || "").trim()) errors.push("TOPIC_EN_REQUIRED");
  if (!String(activity?.instructionEn || "").trim()) errors.push("INSTRUCTION_EN_REQUIRED");
  if (!String(activity?.instructionPt || "").trim()) errors.push("INSTRUCTION_PT_REQUIRED");
  const twoPairCase = isExplicitTwoPairCurricularCase(activity, mode);
  if (!Array.isArray(activity?.pairs) || activity.pairs.length > 6 || (activity.pairs.length < 3 && !twoPairCase)) errors.push("PAIR_COUNT_MUST_BE_3_TO_6");

  const pairIds = new Set();
  const cardIds = new Set();
  const allModalities = new Set();
  for (const pair of activity?.pairs || []) {
    const pairId = String(pair?.pairId || "").trim();
    const semanticTarget = String(pair?.semanticTarget || "").trim().toLocaleLowerCase("en-US");
    if (!pairId) errors.push("PAIR_ID_REQUIRED");
    if (pairIds.has(pairId)) errors.push(`DUPLICATE_PAIR_ID:${pairId}`);
    pairIds.add(pairId);
    if (!semanticTarget) errors.push(`SEMANTIC_TARGET_REQUIRED:${pairId}`);
    const cards = Array.isArray(pair?.cards) ? pair.cards : [];
    if (cards.length !== 2) errors.push(`PAIR_MUST_HAVE_EXACTLY_TWO_CARDS:${pairId}`);
    const modalities = new Set();
    for (const card of cards) {
      const cardId = String(card?.cardId || "").trim();
      const modality = String(card?.modality || "").toLowerCase();
      if (!cardId) errors.push(`CARD_ID_REQUIRED:${pairId}`);
      if (cardIds.has(cardId)) errors.push(`DUPLICATE_CARD_ID:${cardId}`);
      cardIds.add(cardId);
      if (!["audio", "image", "text"].includes(modality)) errors.push(`UNSUPPORTED_MODALITY:${cardId}:${modality}`);
      modalities.add(modality);
      allModalities.add(modality);
      if (card?.pairId && card.pairId !== pair.pairId) errors.push(`CARD_PAIR_BINDING_MISMATCH:${cardId}`);
      if (card?.semanticTarget && String(card.semanticTarget).toLocaleLowerCase("en-US") !== semanticTarget) errors.push(`CARD_SEMANTIC_MISMATCH:${cardId}`);
      if (modality === "audio" && !(card.audioSrc || (qaOnly && card.spokenText))) errors.push(`AUDIO_SOURCE_REQUIRED:${cardId}`);
      if (modality === "text" && !String(card.text || "").trim()) errors.push(`TEXT_CONTENT_REQUIRED:${cardId}`);
      if (modality === "image" && (!String(card.imageSrc || "").trim() || !String(card.alt || "").trim())) errors.push(`IMAGE_SOURCE_AND_ALT_REQUIRED:${cardId}`);
    }
    if (modalities.size !== 2 || [...modalities].some(modality => !required?.includes(modality))) errors.push(`PAIR_MODALITIES_INVALID:${pairId}:${mode}`);
  }
  if (required && (allModalities.size !== 2 || required.some(modality => !allModalities.has(modality)))) errors.push(`ACTIVITY_MODALITIES_INVALID:${mode}`);
  const audioEnId = activity?.instructionAudioEnId || activity?.instructionAudio?.enId;
  const audioPtId = activity?.instructionAudioPtId || activity?.instructionAudio?.ptId;
  if (!qaOnly && (!audioEnId || !audioPtId)) errors.push("PRODUCTION_INSTRUCTION_AUDIO_REQUIRED");
  return { valid: errors.length === 0, errors };
}

export function flattenMemoryQuestCards(activity) {
  return (activity?.pairs || []).flatMap(pair => pair.cards.map(card => ({
    ...card,
    pairId: pair.pairId,
    semanticTarget: pair.semanticTarget
  })));
}

export function compareSemanticPair(first, second) {
  return Boolean(first && second && first.cardId !== second.cardId && first.pairId === second.pairId && first.semanticTarget === second.semanticTarget);
}

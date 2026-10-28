const productionQuestion = await window.DuduQProductionQuestionBootstrap?.ready;
if (productionQuestion?.mechanic === "matching") {
  const pairs = productionQuestion.matching.pairs;
  const pairRepresentations = pairs.map(pair => {
    const source = pair.a.modality === "image" ? pair.b : pair.a;
    const rightSource = pair.a.modality === "image" ? pair.a : pair.b;
    return {
      left: { id: source.id, label: String(source.value || source.text || source.semanticTarget || pair.pairId).toUpperCase() },
      right: { id: rightSource.id, imageSrc: rightSource.url, alt: rightSource.alt || pair.semanticTarget || pair.pairId }
    };
  });
  const leftItems = pairRepresentations.map(pair => pair.left);
  const rightItems = pairRepresentations.map(pair => pair.right);
  const order = window.DuduQOptionPresentationOrder;
  const shuffle = order?.shuffle || (values => values.slice());
  const presentedLeftItems = shuffle(leftItems, "matching-left-options");
  const presentedRightItems = shuffle(rightItems, "matching-right-options");
  const content = Object.freeze({
    topic: productionQuestion.item.topicEn, subtitle: productionQuestion.prompt.instructionPt,
    counter: `${productionQuestion.index + 1} / ${productionQuestion.total}`,
    completed: productionQuestion.index + 1, total: productionQuestion.total,
    question: { id: productionQuestion.item.item_id, label: productionQuestion.prompt.instructionPt,
      prompt: productionQuestion.prompt.instructionEn, audioText: productionQuestion.prompt.instructionEn },
    leftTitle: "Palavras", rightTitle: "Imagens", leftItems: presentedLeftItems, rightItems: presentedRightItems,
    pairs: pairRepresentations.map(pair => ({ leftId: pair.left.id, rightId: pair.right.id })),
    actionLabel: "CONFIRMAR"
  });
  window.DUDUQ_MATCHING_GOLD_MASTER = content;
  window.DUDUQ_MATCHING_GOLD_MASTER_ROUNDS = [content];
}
// V22 production adapter: preserve immutable Gold Master files; use a derived runtime with immediate retry/continue.
await import("/core/matching/duduq-matching-runtime-v22.js");

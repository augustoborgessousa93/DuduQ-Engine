/* Fixture de visualização derivado do conteúdo visível no Gold Master aprovado.
   Não é fonte canônica de questões e não altera módulos publicados. */
window.DUDUQ_MATCHING_GOLD_MASTER = Object.freeze({
  topic: "ANIMALS",
  subtitle: "Ligue cada palavra à imagem correta",
  counter: "4 / 10",
  completed: 4,
  total: 10,
  question: Object.freeze({
    id: "matching-gold-master-preview",
    label: "Ligue cada palavra à imagem correta",
    prompt: "Match the words to the correct pictures",
    audioText: "Match the words to the correct pictures"
  }),
  leftTitle: "Palavras",
  rightTitle: "Imagens",
  leftItems: Object.freeze([
    { id: "word-dog", label: "DOG" },
    { id: "word-cat", label: "CAT" },
    { id: "word-rabbit", label: "RABBIT" },
    { id: "word-fish", label: "FISH" }
  ]),
  rightItems: Object.freeze([
    { id: "picture-fish", imageAssetKey: "pet-fish", alt: "Peixe laranja" },
    { id: "picture-dog", imageAssetKey: "pet-dog", alt: "Cachorro" },
    { id: "picture-rabbit", imageAssetKey: "pet-rabbit", alt: "Coelho" },
    { id: "picture-cat", imageAssetKey: "pet-cat", alt: "Gato laranja" }
  ]),
  pairs: Object.freeze([
    { leftId: "word-dog", rightId: "picture-dog" },
    { leftId: "word-cat", rightId: "picture-cat" },
    { leftId: "word-rabbit", rightId: "picture-rabbit" },
    { leftId: "word-fish", rightId: "picture-fish" }
  ]),
  actionLabel: "CONFIRMAR"
});

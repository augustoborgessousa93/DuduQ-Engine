// QA data fixture: three draggable modalities, one target-grid engine configuration.
export const MIXED_MULTIMEDIA_QA_FIXTURE = Object.freeze({
  id: "drag-drop-mixed-multimedia-qa",
  mechanic: "drag-drop",
  layout: "target-grid",
  validation: { strategy: "answerKey" },
  prompt: { eyebrow: "QA", title: "Mixed drag and drop" },
  items: [
    { id: "text-fish", type: "text", text: "FISH", answerKey: "fish" },
    { id: "audio-dog", type: "audio", audioSrc: "/core/assets/audio/dog.mp3", answerKey: "dog" },
    { id: "image-cat", type: "image", imageSrc: "/core/assets/drag-drop/option-cat-card.png", answerKey: "cat" }
  ],
  targets: [
    { id: "target-fish", type: "image", imageSrc: "/core/assets/drag-drop/option-fish-card.png", answerKey: "fish", capacity: 1 },
    { id: "target-dog", type: "image", imageSrc: "/core/assets/drag-drop/option-dog-card.png", answerKey: "dog", capacity: 1 },
    { id: "target-cat", type: "image", imageSrc: "/core/assets/drag-drop/option-cat-card.png", answerKey: "cat", capacity: 1 }
  ]
});

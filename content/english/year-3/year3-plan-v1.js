/* DUDUQ English Year 3 — pedagogical/mechanic plan v1
   This layer selects HOW an official source item is delivered.
   It must never silently rewrite source IDs or editorial answers.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  window.DUDUQ_YEAR3_PLANS = window.DUDUQ_YEAR3_PLANS || {};

  window.DUDUQ_YEAR3_PLANS[1] = Object.freeze({
    version: VERSION,
    module: 1,
    readingProfile: "R0-R2_SUPPORTED",
    topic: "SOCIAL & PROFILES",
    items: Object.freeze({
      "EN3-M1-01": {
        mechanic: "bubble-pop",
        instruction: "OUÇA E TOQUE NA RESPOSTA CORRETA.",
        audioText: "Hi, I'm Mia.",
        optionSpeech: true
      },
      "EN3-M1-02": {
        mechanic: "drag-drop",
        instruction: "OBSERVE E ARRASTE A RESPOSTA CORRETA.",
        contextVisual: { type: "scene", scene: "friends" },
        optionSpeech: true
      },
      "EN3-M1-03": {
        mechanic: "target-shooter",
        instruction: "OBSERVE E TOQUE NA CENA CORRETA.",
        targetVisuals: "auto",
        optionSpeech: true
      },
      "EN3-M1-04": {
        mechanic: "bubble-pop",
        instruction: "LEIA, OUÇA E TOQUE NA PERGUNTA CORRETA.",
        optionSpeech: true
      },
      "EN3-M1-05": {
        mechanic: "bubble-pop",
        instruction: "OUÇA A LETRA E TOQUE NELA.",
        audioText: "M",
        optionSpeech: true
      },
      "EN3-M1-06": {
        mechanic: "drag-drop",
        instruction: "LEIA A MINIFicha E ARRASTE A RESPOSTA CORRETA.",
        contextVisual: {
          type: "profile",
          data: { name: "Maya", age: "9", birthday: "May 12", favoriteAnimal: "dog" }
        },
        optionSpeech: true
      },
      "EN3-M1-07": {
        mechanic: "drag-drop",
        instruction: "LEIA A MINIFicha E ARRASTE A RESPOSTA CORRETA.",
        contextVisual: {
          type: "profile",
          data: { name: "Maya", age: "9", birthday: "May 12", favoriteAnimal: "dog" }
        },
        optionSpeech: true
      },
      "EN3-M1-08": {
        mechanic: "drag-drop",
        instruction: "LEIA A MINIFicha E ARRASTE A RESPOSTA CORRETA.",
        contextVisual: {
          type: "profile",
          data: { name: "Maya", age: "9", birthday: "May 12", favoriteAnimal: "dog" }
        },
        optionSpeech: true
      },
      "EN3-M1-09": {
        mechanic: "drag-drop",
        instruction: "LEIA A MINIFicha E ARRASTE O ANIMAL CORRETO.",
        contextVisual: {
          type: "profile",
          data: { name: "Maya", age: "9", birthday: "May 12", favoriteAnimal: "dog" }
        },
        optionVisuals: "auto",
        optionSpeech: true
      },
      "EN3-M1-10": {
        mechanic: "drag-drop",
        instruction: "OBSERVE A CENA E ARRASTE A FRASE CORRETA.",
        contextVisual: { type: "scene", scene: "friends" },
        optionSpeech: true
      },
      "EN3-M1-11": {
        mechanic: "bubble-pop",
        instruction: "COMPLETE O DIÁLOGO E TOQUE NA RESPOSTA.",
        audioText: "Nice to meet you.",
        optionSpeech: true
      },
      "EN3-M1-12": {
        mechanic: "smart-sentence",
        instruction: "OUÇA E MONTE A PALAVRA.",
        audioText: "H. E. L. L. O.",
        smart: {
          mode: "word-build",
          tokens: [
            { id: "h", value: "H" },
            { id: "e", value: "E" },
            { id: "l1", value: "L" },
            { id: "l2", value: "L" },
            { id: "o", value: "O" },
            { id: "a", value: "A" }
          ],
          answer: ["H", "E", "L", "L", "O"]
        }
      },
      "EN3-M1-13": {
        mechanic: "bubble-pop",
        instruction: "COMPLETE O DIÁLOGO E TOQUE NA RESPOSTA.",
        audioText: "How are you?",
        optionSpeech: true
      },
      "EN3-M1-14": {
        mechanic: "target-shooter",
        instruction: "OBSERVE A DESPEDIDA E TOQUE NA CENA CORRETA.",
        targetVisuals: "auto",
        optionSpeech: true
      },
      "EN3-M1-15": {
        mechanic: "bubble-pop",
        instruction: "OUÇA O DIÁLOGO E TOQUE NA RESPOSTA.",
        audioText: "Good afternoon, Leo!",
        optionSpeech: true
      }
    })
  });
})();

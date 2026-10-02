import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD } from "/core/ui/index.js";
import { initializeMultimediaDragDrop } from "../drag-drop-multimedia/drag-drop-multimedia-gameplay.js";
import { MIXED_MULTIMEDIA_QA_FIXTURE } from "../../test/drag-drop/unified-engine-mixed-fixture.mjs";

const root = document.querySelector("#game");
const fixture = MIXED_MULTIMEDIA_QA_FIXTURE;
const background = window.DuduQAssets?.assets?.backgrounds?.["1"] || "";

root.className = "game-screen target-shooter-screen duduq-shared-gold-shell drag-drop-screen drag-drop-multimedia-screen";
root.dataset.qaMixed = "true";
root.innerHTML = `<div class="world-backdrop" aria-hidden="true"></div><div class="readability-veil" aria-hidden="true"></div><section class="game-shell dnd-game-shell" aria-label="Mixed QA"><div data-canonical-header-slot></div><div data-canonical-question-slot></div></section>`;
root.querySelector(".world-backdrop").style.backgroundImage = `url("${background}")`;

const header = DuduQCanonicalHeaderHUD({ title: "DRAG & DROP QA", progressCurrent: 0, progressTotal: 1, progressArtwork: "penpot-official-board", mascot: "/core/assets/duduq-hud-mascot.png" });
const questionHud = DuduQCanonicalQuestionHUD({ eyebrow: fixture.prompt.eyebrow, question: "TEXT, AUDIO e IMAGE na mesma atividade.", audio: "Arraste cada item para a imagem correta." });
const shell = root.querySelector(".dnd-game-shell");
shell.append(header, questionHud);

const panel = document.createElement("section");
panel.className = "dnd-multimedia-central-panel";
panel.setAttribute("aria-label", "Targets da fixture mista");
questionHud.after(panel);

const assetBase = "/play/drag-drop-multimedia/assets";
const targetElements = fixture.targets.map((target, index) => {
  const card = document.createElement("figure");
  card.className = `dnd-multimedia-image-option${index ? ` dnd-multimedia-image-option--0${index + 1}` : ""}`;
  card.dataset.targetId = target.id;
  card.dataset.answerKey = target.answerKey;
  card.setAttribute("aria-label", `Imagem alvo ${target.answerKey}`);
  card.innerHTML = `<img src="${assetBase}/rectangle-0${index + 1}-pet.png" alt="${target.answerKey}">`;
  const slot = document.createElement("div");
  slot.className = `dnd-multimedia-question-group${index ? ` dnd-multimedia-question-group--0${index + 1}` : ""}`;
  slot.dataset.dropTargetId = target.id;
  slot.dataset.answerKey = target.answerKey;
  slot.tabIndex = 0;
  slot.setAttribute("role", "group");
  slot.setAttribute("aria-label", "ARRASTE AQUI");
  slot.innerHTML = `<img src="${assetBase}/rectangle-group-question${index ? "-02" : ""}.svg" alt=""><span class="dnd-multimedia-question-group__label">ARRASTE AQUI</span>`;
  const pair = document.createElement("div");
  pair.className = "dnd-mixed-qa-target-pair";
  pair.append(card, slot);
  panel.append(pair);
  return { id: target.id, answerKey: target.answerKey, element: card, slot };
});

const bank = document.createElement("div");
bank.className = "dnd-multimedia-drag-word-bank";
for (const item of fixture.items) {
  const element = document.createElement("figure");
  element.className = item.type === "audio" ? "dnd-multimedia-audio-item" : "dnd-multimedia-drag-word-item";
  element.dataset.itemId = item.id;
  element.dataset.itemType = item.type;
  element.dataset.answerKey = item.answerKey;
  if (item.audioSrc) element.dataset.audioSrc = "../drag-drop-multimedia/test-assets/test-fish-a.wav";
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  if (item.type === "audio") {
    element.innerHTML = `<span class="dnd-multimedia-drag-word-item__surface" aria-hidden="true"></span><img class="dnd-multimedia-audio-item__play-art" src="${assetBase}/drag-audio-item.svg" alt=""><button class="dnd-multimedia-audio-item__play" type="button" aria-label="Ouvir áudio"><span class="dnd-multimedia-audio-item__play-depth"></span><span class="dnd-multimedia-audio-item__play-visual"><span class="dnd-multimedia-audio-item__play-ring"></span><span class="dnd-multimedia-audio-item__play-surface"><svg class="dnd-multimedia-audio-item__playing-icon" viewBox="0 0 53 53"><path class="dnd-multimedia-audio-item__speaker" d="M15 24L20 24L27 18L27 36L20 30L15 30Z"/><path class="dnd-multimedia-audio-item__waves" d="M31 22C35 25 35 29 31 32M34 18C41 24 41 30 34 36"/></svg></span></span></button>`;
  } else if (item.type === "image") {
    element.innerHTML = `<span class="dnd-multimedia-drag-word-item__surface" aria-hidden="true"></span><img src="${item.imageSrc}" alt="Imagem arrastável">`;
  } else {
    element.innerHTML = `<span class="dnd-multimedia-drag-word-item__surface" aria-hidden="true"></span><span class="dnd-multimedia-drag-word-item__label">${item.text}</span>`;
  }
  bank.append(element);
}
panel.after(bank);
initializeMultimediaDragDrop({ root, centralPanel: panel, dragWordBank: bank, targets: targetElements, items: [...bank.children], activity: fixture });

header.setQuestionProgress?.(0, 1);
window.DuduQMixedDragDropQA = Object.freeze({ fixture, engine: "/core/duduq-drag-drop-engine.js" });

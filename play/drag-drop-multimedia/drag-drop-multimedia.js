import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD } from "/core/ui/index.js";
import { initializeMultimediaDragDrop } from "./drag-drop-multimedia-gameplay.js";

const root = document.querySelector("#game");
if (!root) throw new Error("Drag & Drop Multimedia root was not found.");

const background = window.DuduQAssets?.assets?.backgrounds?.["1"] || "";
const activity = Object.freeze({
  title: "DRAG & DROP",
  progress: { completed: 0, total: 1 },
  questionHud: {
    title: "MATCH THE WORDS",
    instruction: "Drag each word to the correct picture.",
    audio: "Drag each word to the correct picture."
  }
});

root.className = "game-screen target-shooter-screen duduq-shared-gold-shell drag-drop-screen drag-drop-multimedia-screen";
root.setAttribute("aria-label", "DuduQ Drag and Drop");
root.innerHTML = `
  <div class="world-backdrop" aria-hidden="true"></div>
  <div class="readability-veil" aria-hidden="true"></div>
  <section class="game-shell dnd-game-shell" aria-label="Atividade">
    <div data-canonical-header-slot></div>
    <div data-canonical-question-slot></div>
  </section>`;

root.querySelector(".world-backdrop").style.backgroundImage = `url("${background}")`;

const header = DuduQCanonicalHeaderHUD({
  title: activity.title,
  progressCurrent: activity.progress.completed,
  progressTotal: activity.progress.total,
  progressArtwork: "penpot-official-board",
  mascot: "/core/assets/duduq-hud-mascot.png"
});
header.dataset.mechanic = "matching";

const questionHud = DuduQCanonicalQuestionHUD({
  eyebrow: activity.questionHud.title,
  question: activity.questionHud.instruction,
  audio: activity.questionHud.audio
});

root.querySelector(".dnd-game-shell").append(header, questionHud);

const centralPanel = document.createElement("section");
centralPanel.className = "dnd-multimedia-central-panel";
centralPanel.dataset.component = "DND_MULTIMEDIA_CENTRAL_PANEL";
centralPanel.setAttribute("aria-label", "Painel central");
questionHud.after(centralPanel);

const imageOptionCard = document.createElement("figure");
imageOptionCard.className = "dnd-multimedia-image-option";
imageOptionCard.dataset.component = "PENPOT_RECTANGLE_01";
imageOptionCard.dataset.targetId = "target-fish-01";
imageOptionCard.dataset.answerKey = "fish";
imageOptionCard.setAttribute("aria-label", "Opção com imagem");
imageOptionCard.innerHTML = `
  <img src="./assets/rectangle-01-pet.png" alt="Peixe ilustrado">
  <svg class="dnd-multimedia-image-option__stroke" viewBox="0 0 256 208" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="dnd-multimedia-image-option-inner-clip">
        <rect x="0" y="0" width="256" height="208" rx="30" ry="30"></rect>
      </clipPath>
    </defs>
    <rect x="0" y="0" width="256" height="208" rx="30" ry="30" fill="none" stroke="#b17f00" stroke-opacity="1" stroke-width="6" stroke-dasharray="13 13" clip-path="url(#dnd-multimedia-image-option-inner-clip)"></rect>
  </svg>`;
centralPanel.append(imageOptionCard);

const imageOptionCard02 = document.createElement("figure");
imageOptionCard02.className = "dnd-multimedia-image-option dnd-multimedia-image-option--02";
imageOptionCard02.dataset.component = "PENPOT_RECTANGLE_02";
imageOptionCard02.dataset.targetId = "target-fish-02";
imageOptionCard02.dataset.answerKey = "fish";
imageOptionCard02.setAttribute("aria-label", "Retângulo 2 com imagem");
imageOptionCard02.innerHTML = '<img src="./assets/rectangle-02-pet.png" alt="Peixe ilustrado">';
centralPanel.append(imageOptionCard02);

const imageOptionCard03 = document.createElement("figure");
imageOptionCard03.className = "dnd-multimedia-image-option dnd-multimedia-image-option--03";
imageOptionCard03.dataset.component = "PENPOT_RECTANGLE_03";
imageOptionCard03.dataset.targetId = "target-fish-03";
imageOptionCard03.dataset.answerKey = "fish";
imageOptionCard03.setAttribute("aria-label", "Retângulo 3 com imagem");
imageOptionCard03.innerHTML = '<img src="./assets/rectangle-03-pet.png" alt="Peixe ilustrado">';
centralPanel.append(imageOptionCard03);

const imageOptionCard04 = document.createElement("figure");
imageOptionCard04.className = "dnd-multimedia-image-option dnd-multimedia-image-option--04";
imageOptionCard04.dataset.component = "PENPOT_RECTANGLE_04";
imageOptionCard04.dataset.targetId = "target-fish-04";
imageOptionCard04.dataset.answerKey = "fish";
imageOptionCard04.setAttribute("aria-label", "Retângulo 4 com imagem");
imageOptionCard04.innerHTML = '<img src="./assets/rectangle-04-pet.png" alt="Peixe ilustrado">';
centralPanel.append(imageOptionCard04);

// Penpot validation badges are shown only after a card has been checked.
const imageOptionCards = [imageOptionCard, imageOptionCard02, imageOptionCard03, imageOptionCard04];
for (const card of imageOptionCards) {
  card.insertAdjacentHTML("beforeend", `
    <span class="dnd-multimedia-image-option__state-icon dnd-multimedia-image-option__state-icon--correct" aria-hidden="true"><img src="./assets/state-correct-check-badge.svg" alt=""></span>
    <span class="dnd-multimedia-image-option__state-icon dnd-multimedia-image-option__state-icon--incorrect" aria-hidden="true"><img src="./assets/state-incorrect-cross-badge.svg" alt=""></span>`);
}

const questionGroup = document.createElement("div");
questionGroup.className = "dnd-multimedia-question-group";
questionGroup.dataset.component = "PENPOT_DUDUQ_DRAG_HERE_01";
questionGroup.dataset.penpotBoard = "604bd19c-1954-8078-8008-b9b8eff8a29f";
questionGroup.dataset.dropTargetId = "target-fish-01";
questionGroup.dataset.answerKey = "fish";
questionGroup.setAttribute("role", "group");
questionGroup.tabIndex = 0;
questionGroup.setAttribute("aria-label", "ARRASTE AQUI");
questionGroup.innerHTML = '<img src="./assets/rectangle-group-question.svg" alt=""><span class="dnd-multimedia-question-group__label">ARRASTE AQUI</span>';
centralPanel.append(questionGroup);

const questionGroup02 = document.createElement("div");
questionGroup02.className = "dnd-multimedia-question-group dnd-multimedia-question-group--02";
questionGroup02.dataset.component = "PENPOT_DUDUQ_DRAG_HERE_02";
questionGroup02.dataset.penpotBoard = "604bd19c-1954-8078-8008-b9b96a6ea6fe";
questionGroup02.dataset.dropTargetId = "target-fish-02";
questionGroup02.dataset.answerKey = "fish";
questionGroup02.setAttribute("role", "group");
questionGroup02.tabIndex = 0;
questionGroup02.setAttribute("aria-label", "ARRASTE AQUI");
questionGroup02.innerHTML = '<img src="./assets/rectangle-group-question-02.svg" alt=""><span class="dnd-multimedia-question-group__label">ARRASTE AQUI</span>';
centralPanel.append(questionGroup02);

const questionGroup03 = document.createElement("div");
questionGroup03.className = "dnd-multimedia-question-group dnd-multimedia-question-group--03";
questionGroup03.dataset.component = "PENPOT_DUDUQ_DRAG_HERE_03";
questionGroup03.dataset.penpotBoard = "604bd19c-1954-8078-8008-b9b9b1f0cbfb";
questionGroup03.dataset.dropTargetId = "target-fish-03";
questionGroup03.dataset.answerKey = "fish";
questionGroup03.setAttribute("role", "group");
questionGroup03.tabIndex = 0;
questionGroup03.setAttribute("aria-label", "ARRASTE AQUI");
questionGroup03.innerHTML = '<img src="./assets/rectangle-group-question-02.svg" alt=""><span class="dnd-multimedia-question-group__label">ARRASTE AQUI</span>';
centralPanel.append(questionGroup03);

const questionGroup04 = document.createElement("div");
questionGroup04.className = "dnd-multimedia-question-group dnd-multimedia-question-group--04";
questionGroup04.dataset.component = "PENPOT_DUDUQ_DRAG_HERE_04";
questionGroup04.dataset.penpotBoard = "604bd19c-1954-8078-8008-b9b9d0b89839";
questionGroup04.dataset.dropTargetId = "target-fish-04";
questionGroup04.dataset.answerKey = "fish";
questionGroup04.setAttribute("role", "group");
questionGroup04.tabIndex = 0;
questionGroup04.setAttribute("aria-label", "ARRASTE AQUI");
questionGroup04.innerHTML = '<img src="./assets/rectangle-group-question-02.svg" alt=""><span class="dnd-multimedia-question-group__label">ARRASTE AQUI</span>';
centralPanel.append(questionGroup04);

const dragWordItem = document.createElement("figure");
dragWordItem.className = "dnd-multimedia-drag-word-item";
dragWordItem.dataset.component = "PENPOT_NEUTRAL_DRAG_BUTTON";
dragWordItem.dataset.penpotBoard = "e3b9056b-29d3-8012-8008-b72fefe919e1";
dragWordItem.dataset.itemId = "text-fish-01";
dragWordItem.dataset.itemType = "text";
dragWordItem.dataset.answerKey = "fish";
dragWordItem.setAttribute("role", "button");
dragWordItem.tabIndex = 0;
dragWordItem.setAttribute("aria-label", "FISH, item neutro de arraste");
dragWordItem.innerHTML = `
  <span class="dnd-multimedia-drag-word-item__surface" aria-hidden="true"></span>
  <svg class="dnd-multimedia-drag-word-item__grip" viewBox="0 0 56 54" aria-hidden="true" focusable="false">
    <ellipse cx="21" cy="11.25" rx="2.3333333" ry="2.25" />
    <ellipse cx="35" cy="11.25" rx="2.3333333" ry="2.25" />
    <ellipse cx="21" cy="27" rx="2.3333333" ry="2.25" />
    <ellipse cx="35" cy="27" rx="2.3333333" ry="2.25" />
    <ellipse cx="21" cy="42.75" rx="2.3333333" ry="2.25" />
    <ellipse cx="35" cy="42.75" rx="2.3333333" ry="2.25" />
  </svg>
  <span class="dnd-multimedia-drag-word-item__label">FISH</span>`;

const dragWordBank = document.createElement("div");
dragWordBank.className = "dnd-multimedia-drag-word-bank";
dragWordBank.append(dragWordItem);

const dragWordItem02 = dragWordItem.cloneNode(true);
dragWordItem02.dataset.component = "PENPOT_NEUTRAL_DRAG_BUTTON_02";
dragWordItem02.dataset.penpotBoard = "e3b9056b-29d3-8012-8008-b72ff42792fe";
dragWordItem02.dataset.itemId = "text-fish-02";
dragWordItem02.dataset.itemType = "text";
dragWordItem02.dataset.answerKey = "fish";
dragWordBank.append(dragWordItem02);

const createDragAudioItem = (componentId, order, { audioSrc = "" } = {}) => {
  const item = document.createElement("figure");
  item.className = "dnd-multimedia-audio-item";
  item.dataset.component = `PENPOT_DRAG_AUDIO_ITEM_${order}`;
  item.dataset.penpotComponentId = componentId;
  item.dataset.itemId = `audio-fish-${order}`;
  item.dataset.itemType = "audio";
  item.dataset.answerKey = "fish";
  if (audioSrc) item.dataset.audioSrc = audioSrc;
  item.setAttribute("role", "group");
  item.setAttribute("aria-label", "Item de áudio para arrastar");
  item.innerHTML = `
    <span class="dnd-multimedia-drag-word-item__surface" aria-hidden="true"></span>
    <svg class="dnd-multimedia-drag-word-item__grip" viewBox="0 0 56 54" aria-hidden="true" focusable="false">
      <ellipse cx="21" cy="11.25" rx="2.3333333" ry="2.25" /><ellipse cx="35" cy="11.25" rx="2.3333333" ry="2.25" />
      <ellipse cx="21" cy="27" rx="2.3333333" ry="2.25" /><ellipse cx="35" cy="27" rx="2.3333333" ry="2.25" />
      <ellipse cx="21" cy="42.75" rx="2.3333333" ry="2.25" /><ellipse cx="35" cy="42.75" rx="2.3333333" ry="2.25" />
    </svg>
    <img class="dnd-multimedia-audio-item__play-art" src="./assets/drag-audio-item.svg" alt="">
    <button class="dnd-multimedia-audio-item__play" type="button" aria-label="Ouvir FISH"${audioSrc ? "" : " disabled aria-disabled=\"true\" title=\"Áudio de conteúdo ainda não configurado\""}>
      <span class="dnd-multimedia-audio-item__play-depth" aria-hidden="true"></span>
      <span class="dnd-multimedia-audio-item__play-surface" aria-hidden="true">
        <svg class="dnd-multimedia-audio-item__playing-icon" viewBox="0 0 53 53" focusable="false">
          <path class="dnd-multimedia-audio-item__speaker" d="M15 24L20.105 24L27.256 18L27.256 36L20.105 30L15 30Z" />
          <path class="dnd-multimedia-audio-item__waves" d="M31.34 22C34.746 25.334 34.746 28.668 31.34 32M34.404 18C40.531 24 40.531 30 34.404 36" />
        </svg>
      </span>
    </button>`;
  return item;
};

// DEV AUDIO FIXTURE — REMOVE/REPLACE WHEN REAL CONTENT AUDIO IS PROVIDED
dragWordBank.append(
  createDragAudioItem("6b1bdf21-2d2c-8040-8008-b998d41569ff", "01", { audioSrc: "./test-assets/test-fish-a.wav" }),
  createDragAudioItem("6b1bdf21-2d2c-8040-8008-b99902174c7f", "02", { audioSrc: "./test-assets/test-fish-b.wav" })
);
centralPanel.after(dragWordBank);

initializeMultimediaDragDrop({
  root,
  centralPanel,
  dragWordBank,
  targets: [
    { id: imageOptionCard.dataset.targetId, answerKey: imageOptionCard.dataset.answerKey, element: imageOptionCard, slot: questionGroup },
    { id: imageOptionCard02.dataset.targetId, answerKey: imageOptionCard02.dataset.answerKey, element: imageOptionCard02, slot: questionGroup02 },
    { id: imageOptionCard03.dataset.targetId, answerKey: imageOptionCard03.dataset.answerKey, element: imageOptionCard03, slot: questionGroup03 },
    { id: imageOptionCard04.dataset.targetId, answerKey: imageOptionCard04.dataset.answerKey, element: imageOptionCard04, slot: questionGroup04 }
  ],
  items: [dragWordItem, dragWordItem02, ...dragWordBank.querySelectorAll(".dnd-multimedia-audio-item")]
});

const setQuestionProgress = (currentQuestionIndex, totalQuestions) => {
  const total = Math.max(1, Math.floor(Number(totalQuestions) || 1));
  const index = Math.min(total - 1, Math.max(0, Math.floor(Number(currentQuestionIndex) || 0)));
  const visualProgress = (index + 1) / total;
  const progressBar = header.querySelector(".hud-progress");
  const fill = progressBar?.querySelector(".hud-progress-fill");
  if (!progressBar || !fill) return visualProgress;

  const fillWidth = 482 * visualProgress;
  fill.style.setProperty("width", `${fillWidth}px`, "important");
  fill.style.setProperty("max-width", "none", "important");
  progressBar.style.setProperty("--dnd-progress-highlight-width", `${Math.max(0, fillWidth - 14)}px`);
  return visualProgress;
};

header.setQuestionProgress = setQuestionProgress;
setQuestionProgress(0, 1);
window.DuduQDragDropShell = Object.freeze({ activity, header, setQuestionProgress });

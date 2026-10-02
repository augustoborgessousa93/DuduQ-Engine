import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD, GameActionButton, CTAAttention } from "/core/ui/index.js";
import { DuduqSound } from "/core/audio/duduq-sound-system.js";
import { ResultFXLayer } from "/core/ui/result-fx.js";
import { Feedback } from "/test/matching/gold-master-candidate-v1/src/core-components.js";

const root = document.querySelector("#game");
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

root.className = "game-screen target-shooter-screen duduq-shared-gold-shell drag-drop-screen";
root.setAttribute("aria-label", "DuduQ Drag and Drop");
root.innerHTML = `
  <div class="world-backdrop" aria-hidden="true"></div>
  <div class="readability-veil" aria-hidden="true"></div>
  <section class="dnd-options-cards-group" data-dnd-owner="OptionsCardsGroup" aria-label="Áreas de classificação">
    <div class="dnd-options-cards-group__shadow">
      <div class="dnd-options-cards-group__surface"></div>
    </div>
    <section class="dnd-rectangle-group dnd-options-cards-group__category dnd-options-cards-group__category--animals" data-dnd-owner="RectangleGroup" data-penpot-id="0f686644-17fe-807c-8008-b8127a01851a" data-drop-target-id="animals" data-drop-state="idle" role="group" aria-label="Animals">
      <div class="dnd-rectangle-group__surface dnd-options-cards-group__category-surface" data-penpot-id="0f686644-17fe-807c-8008-b8127a025e36"></div>
      <svg class="dnd-rectangle-group__border" viewBox="0 0 476 263" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect x="1.5" y="1.5" width="473" height="260" rx="28.5" ry="28.5" fill="none" stroke="#B17F00" stroke-width="3" stroke-dasharray="12 14" stroke-linecap="butt"></rect>
      </svg>
      <div class="dnd-group-header">
      <p class="dnd-rectangle-group__title dnd-options-cards-group__category-label" data-penpot-id="0f686644-17fe-807c-8008-b8127a025e37">ANIMALS</p>
      <svg class="dnd-rectangle-group__paw dnd-options-cards-group__paw" data-penpot-id="0f686644-17fe-807c-8008-b8127a025e38" viewBox="0 0 31.733333333333576 30" aria-hidden="true">
        <g transform="translate(23236.84 18475)">
          <ellipse data-penpot-id="0f686644-17fe-807c-8008-b8127a025e3a" cx="-23222.295555555555" cy="-18470" rx="2.644444444444162" ry="2.5"></ellipse>
          <ellipse data-penpot-id="0f686644-17fe-807c-8008-b8127a025e3b" cx="-23213.04" cy="-18465" rx="2.644444444444162" ry="2.5"></ellipse>
          <ellipse data-penpot-id="0f686644-17fe-807c-8008-b8127a025e3c" cx="-23210.395555555555" cy="-18455" rx="2.644444444444162" ry="2.5"></ellipse>
          <path data-penpot-id="0f686644-17fe-807c-8008-b8127a025e3d" d="M-23224.939453125,-18462.5C-23221.2890625,-18462.5,-23218.328125,-18459.703125,-23218.328125,-18456.25L-23218.328125,-18451.875C-23218.330078125,-18449.71484375,-23219.998046875,-18447.87890625,-23222.2578125,-18447.552734375C-23224.515625,-18447.2265625,-23226.689453125,-18448.5078125,-23227.373046875,-18450.5703125C-23227.9375,-18452.291015625,-23229.126953125,-18453.41796875,-23230.943359375,-18453.951171875C-23233.123046875,-18454.595703125,-23234.478515625,-18456.6484375,-23234.134765625,-18458.783203125C-23233.79296875,-18460.91796875,-23231.853515625,-18462.49609375,-23229.568359375,-18462.5L-23224.939453125,-18462.5"></path>
        </g>
      </svg>
      </div>
      <div class="dnd-drop-zone__content" data-drop-zone-content="animals" aria-label="Cards colocados em Animals"></div>
    </section>
    <section class="dnd-category-food dnd-options-cards-group__category dnd-options-cards-group__category--food" data-dnd-owner="CategoryFood" data-penpot-id="0f686644-17fe-807c-8008-b8135943a54b" data-drop-target-id="food" data-drop-state="idle" role="group" aria-label="Food">
      <div class="dnd-category-food__surface dnd-options-cards-group__category-surface" data-penpot-id="0f686644-17fe-807c-8008-b8135943a54d"></div>
      <svg class="dnd-category-food__border" viewBox="0 0 476 263" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect x="1.5" y="1.5" width="473" height="260" rx="28.5" ry="28.5" fill="none" stroke="#B17F00" stroke-width="3" stroke-dasharray="12 14" stroke-linecap="butt"></rect>
      </svg>
      <div class="dnd-group-header">
      <p class="dnd-category-food__title dnd-options-cards-group__category-label" data-penpot-id="0f686644-17fe-807c-8008-b8135943a54e">FOOD</p>
      <svg class="dnd-options-cards-group__menu-icon" data-penpot-id="7ea34028-34b7-806a-8008-b7e83286ed51" viewBox="-22747 -18475.25 30 30" aria-hidden="true">
        <rect x="-22747" y="-18475.25" width="30" height="30"></rect>
        <path d="M-22732,-18455L-22742,-18455C-22743.3828125,-18455,-22744.5,-18456.1171875,-22744.5,-18457.5C-22743.3828125,-18460,-22742,-18460L-22722,-18460C-22720.6171875,-18460,-22719.5,-18458.8828125,-22719.5,-18457.5L-22727.3125,-18455"></path>
        <path d="M-22740.75,-18460C-22742.1328125,-18460,-22743.25,-18461.1171875,-22743.25,-18462.5C-22743.25,-18467.33203125,-22738.212890625,-18471.25,-22732,-18471.25C-22725.787109375,-18471.25,-22720.75,-18467.33203125,-22720.75,-18462.5C-22720.75,-18461.1171875,-22721.8671875,-18460,-22723.25,-18460"></path>
        <path d="M-22740.75,-18455C-22742.1328125,-18455,-22743.25,-18453.8828125,-22743.25,-18452.5C-22743.25,-18450.4296875,-22741.5703125,-18448.75,-22739.5,-18448.75L-22724.5,-18448.75C-22722.4296875,-18448.75,-22720.75,-18450.4296875,-22720.75,-18452.5C-22720.75,-18453.8828125,-22721.8671875,-18455,-22723.25,-18455"></path>
        <path d="M-22738.662109375,-18460L-22731,-18454.25C-22730.46875,-18453.8515625,-22729.802734375,-18453.681640625,-22729.146484375,-18453.7734375C-22728.48828125,-18453.869140625,-22727.8984375,-18454.21875,-22727.5,-18454.75L-22723.5625,-18460"></path>
      </svg>
      </div>
      <div class="dnd-drop-zone__content" data-drop-zone-content="food" aria-label="Cards colocados em Food"></div>
    </section>
  </section>
  <div class="dnd-image-card-row" data-dnd-owner="ImageCardRow" aria-label="Cards de imagem">
  <figure class="dnd-option-image-card" data-dnd-owner="OptionImageCard" data-penpot-id="179c70ae-2ebb-806e-8008-b75e3fc9cd10" role="button" tabindex="0" aria-label="Card de imagem 1. Arraste para Animals ou Food" data-correct-target-id="animals">
    <img class="dnd-option-image-card__hover-frame" src="/core/assets/drag-drop/card-hover-frame.svg" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__hover-pet" src="/core/assets/drag-drop/answer-cat-official.png" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__artwork" src="/core/assets/drag-drop/option-cat-card.png" alt="">
  </figure>
  <figure class="dnd-option-image-card" data-dnd-owner="OptionImageCard" data-penpot-id="179c70ae-2ebb-806e-8008-b75e41b72598" role="button" tabindex="0" aria-label="Card de imagem 2. Arraste para Animals ou Food" data-correct-target-id="animals">
    <img class="dnd-option-image-card__hover-frame" src="/core/assets/drag-drop/card-hover-frame.svg" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__hover-pet" src="/core/assets/drag-drop/answer-cat-official.png" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__artwork" src="/core/assets/drag-drop/option-cat-card.png" alt="">
  </figure>
  <figure class="dnd-option-image-card" data-dnd-owner="OptionImageCard" data-penpot-id="179c70ae-2ebb-806e-8008-b75e43521863" role="button" tabindex="0" aria-label="Card de imagem 3. Arraste para Animals ou Food" data-correct-target-id="animals">
    <img class="dnd-option-image-card__hover-frame" src="/core/assets/drag-drop/card-hover-frame.svg" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__hover-pet" src="/core/assets/drag-drop/answer-cat-official.png" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__artwork" src="/core/assets/drag-drop/option-cat-card.png" alt="">
  </figure>
  <figure class="dnd-option-image-card" data-dnd-owner="OptionImageCard" data-penpot-id="179c70ae-2ebb-806e-8008-b75e451a311d" role="button" tabindex="0" aria-label="Card de imagem 4. Arraste para Animals ou Food" data-correct-target-id="animals">
    <img class="dnd-option-image-card__hover-frame" src="/core/assets/drag-drop/card-hover-frame.svg" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__hover-pet" src="/core/assets/drag-drop/answer-cat-official.png" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__artwork" src="/core/assets/drag-drop/option-cat-card.png" alt="">
  </figure>
  <figure class="dnd-option-image-card" data-dnd-owner="OptionImageCard" data-penpot-id="179c70ae-2ebb-806e-8008-b75e46f2972a" role="button" tabindex="0" aria-label="Card de imagem 5. Arraste para Animals ou Food" data-correct-target-id="animals">
    <img class="dnd-option-image-card__hover-frame" src="/core/assets/drag-drop/card-hover-frame.svg" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__hover-pet" src="/core/assets/drag-drop/answer-cat-official.png" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__artwork" src="/core/assets/drag-drop/option-cat-card.png" alt="">
  </figure>
  <figure class="dnd-option-image-card" data-dnd-owner="OptionImageCard" data-penpot-id="179c70ae-2ebb-806e-8008-b75e48b27cfc" role="button" tabindex="0" aria-label="Card de imagem 6. Arraste para Animals ou Food" data-correct-target-id="animals">
    <img class="dnd-option-image-card__hover-frame" src="/core/assets/drag-drop/card-hover-frame.svg" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__hover-pet" src="/core/assets/drag-drop/answer-cat-official.png" alt="" aria-hidden="true">
    <img class="dnd-option-image-card__artwork" src="/core/assets/drag-drop/option-cat-card.png" alt="">
  </figure>
  </div>
  <section class="game-shell dnd-game-shell" data-dnd-owner="GameShell">
    <div data-canonical-header-slot></div>
    <div data-canonical-question-slot></div>
    <div class="dnd-confirm-action-motion cta-attention-wrapper" data-dnd-owner="ConfirmAction" hidden>
      <button class="primary-action game-action-button--primary dnd-confirm-action" type="button" aria-label="Confirmar classificação">
        <span class="dnd-confirm-action__shadow" aria-hidden="true"></span>
        <span class="dnd-confirm-action__depth" aria-hidden="true"></span>
        <span class="dnd-confirm-action__surface" aria-hidden="true"></span>
        <span class="dnd-confirm-action__highlight" aria-hidden="true"></span>
        <span class="dnd-confirm-action__label" data-slot="action">CONFIRMAR</span>
      </button>
    </div>
  </section>
  <div class="result-fx-layer success-celebration-layer" aria-hidden="true"></div>
  <section class="feedback-ribbon" data-feedback="" aria-live="polite" aria-atomic="true" hidden>
    <img class="feedback-mascot" data-asset="feedback-mascot" alt="">
    <div class="feedback-copy">
      <h2 data-slot="feedback-title"></h2>
      <p data-slot="feedback-detail"></p>
    </div>
    <button class="feedback-action game-button" type="button">
      <span data-slot="feedback-action"></span>
    </button>
  </section>
  <div class="sr-only" data-slot="live" aria-live="polite" aria-atomic="true"></div>`;

root.querySelector(".world-backdrop").style.backgroundImage = `url("${background}")`;

const header = DuduQCanonicalHeaderHUD({
  title: activity.title,
  progressCurrent: activity.progress.completed,
  progressTotal: activity.progress.total,
  progressArtwork: "penpot-official-board",
  mascot: "/core/assets/duduq-hud-mascot.png"
});
header.dataset.mechanic = "matching";
root.querySelector("[data-canonical-header-slot]").replaceWith(header);
root.querySelector("[data-canonical-question-slot]").replaceWith(
  DuduQCanonicalQuestionHUD({
    eyebrow: activity.questionHud.title,
    question: activity.questionHud.instruction,
    audio: activity.questionHud.audio
  })
);

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

// Drag & Drop V2: placement is provisional; the learner confirms the full set.
const imageCards = [...root.querySelectorAll(".dnd-option-image-card")];
const imageCardRow = root.querySelector(".dnd-image-card-row");
const dropTargets = [...root.querySelectorAll("[data-drop-target-id]")];
const panel = root.querySelector(".dnd-options-cards-group");
const confirmAction = root.querySelector(".dnd-confirm-action-motion");
const confirmButton = confirmAction.querySelector(".dnd-confirm-action");
const feedbackRibbon = root.querySelector(".feedback-ribbon");
const resultFxLayer = root.querySelector(".result-fx-layer");
ResultFXLayer(resultFxLayer);
GameActionButton(confirmButton, "primary");
const confirmAttention = CTAAttention(confirmButton, { delay: 700, repeat: 2000, target: confirmAction });
const items = imageCards.map((element, index) => ({
  id: `card-${String(index + 1).padStart(2, "0")}`,
  type: "image",
  correctTargetId: element.dataset.correctTargetId,
  currentTargetId: null,
  locked: false,
  element,
  state: "idle"
}));
const itemForElement = new Map(items.map(item => [item.element, item]));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionDuration = milliseconds => reducedMotion.matches ? Math.min(80, milliseconds) : milliseconds;
const DRAG_THRESHOLD_PX = 6;
let activeDrag = null;
let questionComplete = false;
let completionSoundPlayed = false;
let isValidating = false;
let hasValidatedPlacement = false;
let roundStatus = "editing";
let continueRequested = false;

const getPlacedCount = () => items.filter(item => Boolean(item.currentTargetId)).length;
const isFullscreenEnhanced = () => root.dataset.duduqFullscreenEnhanced === "true";
const baseCardSize = () => {
  if (!isFullscreenEnhanced()) return 150;
  const requestedSize = Math.max(171, Math.min(210, root.clientWidth * 0.11));
  const content = dropTargets[0]?.querySelector("[data-drop-zone-content]");
  if (!content?.clientWidth || !content.clientHeight) return requestedSize;
  const styles = getComputedStyle(content);
  const gapX = Number.parseFloat(styles.columnGap) || 10;
  const gapY = Number.parseFloat(styles.rowGap) || 10;
  const sixCardWidth = (content.clientWidth - gapX * 2) / 3;
  const sixCardHeight = (content.clientHeight - gapY) / 2;
  return Math.max(1, Math.min(requestedSize, sixCardWidth, sixCardHeight));
};
const stageScale = () => {
  const rect = root.getBoundingClientRect();
  return { x: rect.width / (root.offsetWidth || rect.width), y: rect.height / (root.offsetHeight || rect.height) };
};
const rectMap = elements => new Map(elements.map(element => [element, element.getBoundingClientRect()]));
const cardsIn = parent => [...parent.querySelectorAll(":scope > .dnd-option-image-card")];

const animateFlip = (elements, beforeRects, duration = 210) => {
  const live = elements.filter(element => element.isConnected && beforeRects.has(element));
  for (const element of live) {
    const before = beforeRects.get(element);
    const after = element.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    const scaleX = after.width ? before.width / after.width : 1;
    const scaleY = after.height ? before.height / after.height : 1;
    if (Math.abs(dx) < .5 && Math.abs(dy) < .5) continue;
    element.style.transition = "none";
    element.style.transformOrigin = "top left";
    element.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scaleX}, ${scaleY})`;
  }
  void root.offsetWidth;
  requestAnimationFrame(() => {
    for (const element of live) {
      if (!element.style.transform) continue;
      element.style.transition = `transform ${motionDuration(duration)}ms cubic-bezier(.2,.75,.25,1)`;
      element.style.transform = "translate3d(0, 0, 0) scale(1, 1)";
      window.setTimeout(() => {
        if (element.dataset.dragState) return;
        element.style.removeProperty("transition");
        element.style.removeProperty("transform");
        element.style.removeProperty("transform-origin");
      }, motionDuration(duration) + 35);
    }
  });
};

const updateConfirmAction = ({ restartAttention = false } = {}) => {
  const ready = roundStatus === "editing" && !questionComplete && getPlacedCount() === items.length;
  const wasVisible = !confirmAction.hidden;
  confirmAction.hidden = !ready;
  if (!ready) confirmAttention.stop();
  else if (!wasVisible || restartAttention) confirmAttention.start();
};

const recenterSourceRow = beforeRects => {
  const remaining = cardsIn(imageCardRow);
  const panelRect = panel.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const scale = stageScale();
  const cardWidth = remaining[0]?.getBoundingClientRect().width / scale.x || baseCardSize();
  const rowStyles = getComputedStyle(imageCardRow);
  const gap = Number.parseFloat(rowStyles.columnGap) || 20;
  const rowWidth = remaining.length ? remaining.length * cardWidth + (remaining.length - 1) * gap : 0;
  const leftInStage = (panelRect.left - rootRect.left) / scale.x + (panelRect.width / scale.x - rowWidth) / 2;
  imageCardRow.style.left = `${leftInStage}px`;
  imageCardRow.style.transform = isFullscreenEnhanced() ? "none" : "";
  animateFlip(remaining, beforeRects);
};

const setCardArtSize = (card, size) => {
  const artwork = card.querySelector(".dnd-option-image-card__artwork");
  const ratio = size / 150;
  card.style.width = `${size}px`;
  card.style.height = `${size}px`;
  if (artwork) {
    artwork.style.width = `${210 * ratio}px`;
    artwork.style.height = `${228 * ratio}px`;
    artwork.style.left = `${-24 * ratio}px`;
    artwork.style.top = `${-27 * ratio}px`;
  }
};

const layoutPlacedCards = (target, beforeRects = new Map()) => {
  const content = target.querySelector("[data-drop-zone-content]");
  const cards = cardsIn(content);
  const count = cards.length;
  const columns = count <= 2 ? Math.max(1, count) : count === 3 ? 3 : count === 4 ? 2 : 3;
  const rows = count ? Math.ceil(count / columns) : 1;
  const styles = getComputedStyle(content);
  const gapX = Number.parseFloat(styles.columnGap) || 10;
  const gapY = Number.parseFloat(styles.rowGap) || 10;
  const availableWidth = Math.max(1, content.clientWidth);
  const availableHeight = Math.max(1, content.clientHeight);
  const maximumSize = baseCardSize();
  const size = count ? Math.max(1, Math.min(maximumSize,
    (availableWidth - gapX * (columns - 1)) / columns,
    (availableHeight - gapY * (rows - 1)) / rows
  )) : maximumSize;
  content.style.setProperty("--dnd-grid-columns", String(columns));
  content.style.setProperty("--dnd-card-size", `${size}px`);
  for (const card of cards) setCardArtSize(card, size);
  animateFlip(cards, beforeRects, 220);
};

const clearTargetStates = except => {
  for (const target of dropTargets) if (target !== except && target.dataset.dropState === "active") target.dataset.dropState = "idle";
};
const captureRowRects = () => rectMap(cardsIn(imageCardRow));
const targetForCard = card => dropTargets.find(target => target.querySelector("[data-drop-zone-content]")?.contains(card)) || null;
const restoreCardLayout = card => {
  card.removeAttribute("data-drag-state");
  card.style.position = "relative";
  card.style.left = "auto";
  card.style.top = "auto";
  card.style.zIndex = "auto";
  card.style.margin = "0";
  card.style.transform = "none";
  card.style.removeProperty("transform-origin");
  card.style.removeProperty("transition");
  card.style.removeProperty("pointer-events");
};
const setCardState = (item, state) => {
  item.state = state;
  item.locked = state === "correct";
  if (state === "idle") item.element.removeAttribute("data-state");
  else item.element.dataset.state = state;
  const artwork = item.element.querySelector(".dnd-option-image-card__artwork");
  if (artwork) {
    artwork.dataset.baseSrc ||= artwork.getAttribute("src");
    artwork.src = state === "correct"
      ? "/core/assets/drag-drop/option-cat-card-correct.png"
      : state === "incorrect"
        ? "/core/assets/drag-drop/option-cat-card-incorrect.png"
        : artwork.dataset.baseSrc;
  }
  item.element.querySelector(".dnd-option-image-card__state-art")?.remove();
  if (state === "correct" || state === "incorrect") {
    const stateArt = document.createElement("span");
    stateArt.className = `dnd-option-image-card__state-art dnd-option-image-card__state-art--${state}`;
    stateArt.setAttribute("aria-hidden", "true");
    stateArt.innerHTML = state === "correct"
      ? `<svg viewBox="0 0 161.29 159" preserveAspectRatio="none"><circle cx="144.14499999999998" cy="17.144999999999996" r="15.1667307692303" fill="#3BB46B" stroke="#fff" stroke-width="3"/><path d="M137.286376953125 17.40869140625L141.50732421875 21.4970703125L150.87158203125 12.0018310546875" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg viewBox="0 0 160 157" preserveAspectRatio="none"><circle cx="143.14499999999998" cy="17.144999999999996" r="15.1667307692303" fill="#E62B51" stroke="#fff" stroke-width="3"/><path d="M148 12L138 22M138 12L148 22" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    item.element.append(stateArt);
  }
  const locked = item.locked || questionComplete;
  item.element.setAttribute("aria-disabled", String(locked));
  item.element.tabIndex = locked ? -1 : 0;
};

const returnToOrigin = drag => {
  const { card, item, originalParent, originalIndex, originalTarget, originalTargetId, originalState } = drag;
  const currentRect = card.getBoundingClientRect();
  const beforeParent = rectMap(cardsIn(originalParent));
  beforeParent.set(card, currentRect);
  restoreCardLayout(card);
  if (originalParent === imageCardRow) setCardArtSize(card, baseCardSize());
  const siblings = cardsIn(originalParent);
  originalParent.insertBefore(card, siblings[originalIndex] || null);
  item.currentTargetId = originalTargetId;
  setCardState(item, originalState);
  if (originalParent === imageCardRow) recenterSourceRow(beforeParent);
  else if (originalTarget) layoutPlacedCards(originalTarget, beforeParent);
  clearTargetStates();
  updateConfirmAction();
};

const placeInTarget = (drag, target) => {
  const { card, item } = drag;
  const currentRect = card.getBoundingClientRect();
  const content = target.querySelector("[data-drop-zone-content]");
  const before = rectMap(cardsIn(content));
  before.set(card, currentRect);
  restoreCardLayout(card);
  card.style.width = `${baseCardSize()}px`;
  card.style.height = `${baseCardSize()}px`;
  content.append(card);
  item.currentTargetId = target.dataset.dropTargetId;
  hasValidatedPlacement = false;
  setCardState(item, "placed");
  card.setAttribute("aria-label", `Card ${item.id.slice(-2)} colocado em ${item.currentTargetId}. Pressione Enter para mover de grupo.`);
  clearTargetStates();
  layoutPlacedCards(target, before);
  DuduqSound.play("snap");
  updateConfirmAction();
};

const moveCardToTarget = (card, target) => {
  const item = itemForElement.get(card);
  if (!item || item.locked || item.state === "correct" || roundStatus !== "editing" || questionComplete || isValidating || activeDrag || !target) return;
  const originalParent = card.parentElement;
  const originalTarget = targetForCard(card);
  const beforeParent = rectMap(cardsIn(originalParent));
  beforeParent.set(card, card.getBoundingClientRect());
  card.remove();
  if (originalParent === imageCardRow) recenterSourceRow(beforeParent);
  else if (originalTarget) layoutPlacedCards(originalTarget, beforeParent);
  placeInTarget({ card, item }, target);
};

const completeQuestion = () => {
  if (completionSoundPlayed) return;
  completionSoundPlayed = true;
  DuduqSound.play("complete");
};

const retryIncorrectItems = () => {
  if (roundStatus !== "retry") return;
  const incorrectItems = items.filter(item => item.state === "incorrect" && !item.locked);
  if (!incorrectItems.length) return;

  DuduqSound.play("uiClick");
  feedbackRibbon.hidden = true;
  feedbackRibbon.querySelector(".feedback-action")?._duduqAttention?.stop();

  const sourceBefore = rectMap(cardsIn(imageCardRow));
  const targetBefore = new Map(dropTargets.map(target => [
    target,
    rectMap(cardsIn(target.querySelector("[data-drop-zone-content]")))
  ]));
  const affectedTargets = new Set();

  for (const item of incorrectItems) {
    const card = item.element;
    sourceBefore.set(card, card.getBoundingClientRect());
    const target = targetForCard(card);
    if (target) affectedTargets.add(target);
    card.remove();
    restoreCardLayout(card);
    card.style.width = `${baseCardSize()}px`;
    card.style.height = `${baseCardSize()}px`;
    setCardArtSize(card, baseCardSize());
    item.currentTargetId = null;
    setCardState(item, "idle");
    card.setAttribute("aria-label", `Card ${item.id.slice(-2)}. Arraste para Animals ou Food.`);
  }

  const sourceCards = [...cardsIn(imageCardRow), ...incorrectItems.map(item => item.element)];
  sourceCards.sort((a, b) => itemForElement.get(a).id.localeCompare(itemForElement.get(b).id));
  for (const card of sourceCards) imageCardRow.append(card);

  for (const target of affectedTargets) {
    layoutPlacedCards(target, targetBefore.get(target));
  }

  roundStatus = "editing";
  hasValidatedPlacement = false;
  continueRequested = false;
  recenterSourceRow(sourceBefore);
  updateConfirmAction();
  incorrectItems[0].element.focus();
};

const showValidationFeedback = outcome => {
  Feedback(feedbackRibbon, window.DuduQAssets?.assets, outcome, () => {
    if (outcome === "incorrect") {
      retryIncorrectItems();
      return;
    }
    if (continueRequested) return;
    continueRequested = true;
    DuduqSound.play("uiClick");
    const button = feedbackRibbon.querySelector(".feedback-action");
    if (button) button.disabled = true;
    root.dispatchEvent(new CustomEvent("dnd:continue-requested", {
      bubbles: true,
      detail: { placedCount: getPlacedCount(), totalItems: items.length, questionComplete: true }
    }));
  });

  feedbackRibbon.querySelector('[data-slot="feedback-title"]').textContent = outcome === "correct" ? "Correto!" : "Ops!";
  feedbackRibbon.querySelector('[data-slot="feedback-detail"]').textContent = outcome === "correct"
    ? "Você classificou corretamente."
    : "Revise os grupos e tente novamente.";
  feedbackRibbon.querySelector('[data-slot="feedback-action"]').textContent = outcome === "correct"
    ? "CONTINUAR"
    : "TENTAR NOVAMENTE";
};

const confirmAnswers = () => {
  if (isValidating || roundStatus !== "editing" || hasValidatedPlacement || questionComplete || getPlacedCount() !== items.length) return;
  roundStatus = "checking";
  isValidating = true;
  hasValidatedPlacement = true;
  confirmAttention.stop();
  updateConfirmAction();
  DuduqSound.play("uiClick");
  let correctCount = 0;
  for (const item of items) {
    const state = item.currentTargetId === item.correctTargetId ? "correct" : "incorrect";
    if (state === "correct") correctCount += 1;
    setCardState(item, state);
  }
  const incorrectCount = items.length - correctCount;
  isValidating = false;

  if (incorrectCount === 0) {
    roundStatus = "completed";
    questionComplete = true;
    updateConfirmAction();
    DuduqSound.play("correct");
    resultFxLayer.dispatchEvent(new CustomEvent("activity-success", {
      bubbles: true,
      detail: { source: "drag-drop" }
    }));
    window.setTimeout(() => {
      DuduqSound.playVoice("correct", { onEnded: completeQuestion }).then(started => {
        if (!started) completeQuestion();
      });
    }, 140);
    window.setTimeout(() => showValidationFeedback("correct"), 180);
    root.dispatchEvent(new CustomEvent("dnd:question-complete", {
      bubbles: true,
      detail: { placedCount: getPlacedCount(), totalItems: items.length, correctCount, incorrectCount, questionComplete }
    }));
    return;
  }

  roundStatus = "retry";
  DuduqSound.play("error");
  window.setTimeout(() => DuduqSound.playVoice("error"), 140);
  updateConfirmAction();
  window.setTimeout(() => showValidationFeedback("incorrect"), 180);
  root.dispatchEvent(new CustomEvent("dnd:answer-validated", {
    bubbles: true,
    detail: { placedCount: getPlacedCount(), totalItems: items.length, correctCount, incorrectCount, questionComplete: false, correct: false }
  }));
};

confirmButton.addEventListener("click", confirmAnswers);
confirmButton.addEventListener("pointerleave", () => { if (!confirmAction.hidden && !questionComplete) confirmAttention.start(); });
confirmButton.addEventListener("blur", () => { if (!confirmAction.hidden && !questionComplete) confirmAttention.start(); });

const finishDrag = (event, cancelled = false) => {
  if (!activeDrag || (event && event.pointerId !== activeDrag.pointerId)) return;
  const drag = activeDrag;
  if (!cancelled && event) {
    drag.dx = (event.clientX - drag.startX) / drag.scale.x;
    drag.dy = (event.clientY - drag.startY) / drag.scale.y;
    if (!drag.dragStarted && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= DRAG_THRESHOLD_PX) {
      drag.dragStarted = true;
      DuduqSound.play("dragStart");
    }
    if (drag.dragStarted) updateDragFrame(drag);
  } else if (drag.frame) {
    cancelAnimationFrame(drag.frame);
    drag.frame = 0;
  }
  activeDrag = null;
  if (root.hasPointerCapture?.(drag.pointerId)) root.releasePointerCapture(drag.pointerId);
  if (drag.dragStarted && drag.currentTarget) placeInTarget(drag, drag.currentTarget);
  else returnToOrigin(drag);
};

function updateDragFrame(drag) {
  drag.card.dataset.dragState = "dragging";
  drag.card.style.transition = "none";
  drag.card.style.transform = `translate3d(${drag.dx}px, ${drag.dy - 5}px, 0) rotate(${drag.angle}deg)`;
  const centerX = drag.originalRect.left + drag.dx * drag.scale.x + drag.originalRect.width / 2;
  const centerY = drag.originalRect.top + drag.dy * drag.scale.y + drag.originalRect.height / 2;
  let hit = null;
  for (const target of dropTargets) {
    const rect = drag.targetRects.get(target);
    if (centerX >= rect.left && centerX <= rect.right && centerY >= rect.top && centerY <= rect.bottom) { hit = target; break; }
  }
  if (hit !== drag.currentTarget) {
    drag.currentTarget = hit;
    clearTargetStates(hit);
    if (hit) hit.dataset.dropState = "active";
  }
}

root.addEventListener("pointerdown", event => {
  const card = event.target.closest?.(".dnd-option-image-card");
  const item = card && itemForElement.get(card);
  if (!item || item.locked || item.state === "correct" || roundStatus !== "editing" || questionComplete || isValidating || activeDrag || event.button > 0) return;
  event.preventDefault();
  const originalRect = card.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const scale = stageScale();
  const originalParent = card.parentElement;
  const originalTarget = targetForCard(card);
  const siblings = cardsIn(originalParent);
  const originalIndex = siblings.indexOf(card);
  const beforeParent = rectMap(siblings);
  const left = (originalRect.left - rootRect.left) / scale.x;
  const top = (originalRect.top - rootRect.top) / scale.y;
  activeDrag = {
    pointerId: event.pointerId, card, item, originalParent, originalIndex, originalRect,
    originalTarget, originalTargetId: item.currentTargetId, originalState: item.state,
    scale, startX: event.clientX, startY: event.clientY, lastX: event.clientX,
    dx: 0, dy: 0, angle: 0, currentTarget: null,
    targetRects: new Map(dropTargets.map(target => [target, target.getBoundingClientRect()])),
    frame: 0, dragStarted: false
  };
  item.currentTargetId = null;
  DuduqSound.play("pickup");
  root.setPointerCapture(event.pointerId);
  item.state = "picked";
  card.removeAttribute("data-state");
  card.dataset.dragState = "picked";
  card.style.position = "absolute";
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  card.style.width = `${originalRect.width / scale.x}px`;
  card.style.height = `${originalRect.height / scale.y}px`;
  card.style.zIndex = "1000";
  card.style.transform = "translate3d(0, 0, 0)";
  card.style.transition = `transform ${motionDuration(120)}ms cubic-bezier(.2,.8,.25,1)`;
  root.append(card);
  if (originalParent === imageCardRow) recenterSourceRow(beforeParent);
  else if (originalTarget) layoutPlacedCards(originalTarget, beforeParent);
  updateConfirmAction();
}, { passive: false });

root.addEventListener("pointermove", event => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  const drag = activeDrag;
  drag.dx = (event.clientX - drag.startX) / drag.scale.x;
  drag.dy = (event.clientY - drag.startY) / drag.scale.y;
  const direction = Math.max(-1, Math.min(1, (event.clientX - drag.lastX) / 12));
  drag.lastX = event.clientX;
  drag.angle = reducedMotion.matches ? 0 : direction * 1.5;
  if (!drag.dragStarted) {
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
    drag.dragStarted = true;
    DuduqSound.play("dragStart");
  }
  if (drag.frame) return;
  drag.frame = requestAnimationFrame(() => {
    drag.frame = 0;
    if (activeDrag !== drag) return;
    updateDragFrame(drag);
  });
});

root.addEventListener("pointerup", event => finishDrag(event));
root.addEventListener("pointercancel", event => finishDrag(event, true));
root.addEventListener("lostpointercapture", event => finishDrag(event, true));

for (const card of imageCards) card.addEventListener("keydown", event => {
  const item = itemForElement.get(card);
  if (!item || item.locked || item.state === "correct" || roundStatus !== "editing" || questionComplete || isValidating || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  const current = item.currentTargetId;
  const next = current === "animals" ? "food" : "animals";
  moveCardToTarget(card, dropTargets.find(target => target.dataset.dropTargetId === next));
});

window.DuduQDragDropGame = Object.freeze({
  items,
  confirm: confirmAnswers,
  getState: () => ({ placedCount: getPlacedCount(), totalItems: items.length, questionComplete, isValidating, roundStatus, correctCount: items.filter(item => item.state === "correct").length, incorrectCount: items.filter(item => item.state === "incorrect").length, activeItemId: activeDrag?.item.id || null }),
  getQuestionComplete: () => questionComplete
});

const refreshResponsiveCardGeometry = () => {
  if (activeDrag) return;
  const sourceBefore = captureRowRects();
  const targetBefore = new Map(dropTargets.map(target => [
    target,
    rectMap(cardsIn(target.querySelector("[data-drop-zone-content]")))
  ]));
  for (const card of cardsIn(imageCardRow)) setCardArtSize(card, baseCardSize());
  for (const target of dropTargets) layoutPlacedCards(target, targetBefore.get(target));
  recenterSourceRow(sourceBefore);
};
let geometryRefreshFrame = 0;
const scheduleResponsiveCardGeometry = () => {
  if (geometryRefreshFrame) cancelAnimationFrame(geometryRefreshFrame);
  geometryRefreshFrame = requestAnimationFrame(() => {
    geometryRefreshFrame = 0;
    refreshResponsiveCardGeometry();
  });
};
document.addEventListener("fullscreenchange", scheduleResponsiveCardGeometry);
window.addEventListener("resize", () => {
  if (isFullscreenEnhanced()) scheduleResponsiveCardGeometry();
}, { passive: true });
if (isFullscreenEnhanced()) scheduleResponsiveCardGeometry();

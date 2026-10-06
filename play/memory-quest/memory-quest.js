import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD, ResultFX } from "/core/ui/index.js";
import { DuduqSound } from "/core/audio/duduq-sound-system.js";
import { Feedback } from "/runtime/gold-masters/matching/src/core-components.js";

const root = document.querySelector("#game");
if (!root) throw new Error("Memory Quest root was not found.");

const MEMORY_QUEST_SHELL_CONFIG = Object.freeze({
  title: "MEMORY QUEST",
  progress: Object.freeze({ current: 0, total: 1 }),
  prompt: Object.freeze({
    eyebrow: "MEMORY CHALLENGE",
    question: "FIND THE MATCHING PAIRS.",
    audio: "Find the matching pairs."
  })
});

// Penpot order: first row (02, 03, 05, 07, 09, 11), then second row
// (01, 04, 06, 08, 10, 12). Keep each official export as its own component slot.
const MEMORY_CARD_COMPONENTS = Object.freeze([
  "02", "03", "05", "07", "09", "11",
  "01", "04", "06", "08", "10", "12"
]);
const MEMORY_QUEST_REQUIRED_PAIRS = MEMORY_CARD_COMPONENTS.length / 2;
const MEMORY_CARD_FLOAT_STAGGER_MS = 180;
const MEMORY_QUEST_CARD_CONFIG = Object.freeze(Object.fromEntries(
  MEMORY_CARD_COMPONENTS.map((componentId) => [
    componentId,
    Object.freeze({ pairKey: "rabbit", label: "rabbit" })
  ])
));
const MEMORY_QUEST_MATCH_FEEDBACK = Object.freeze({
  mismatchReturnMs: 900,
  correctBubbleDurationMs: 1500
});
const MEMORY_QUEST_MATCH_SOUNDS = Object.freeze({
  correct: createMatchSound("./assets/memory-quest-match-correct.mp3", 0.48),
  incorrect: createMatchSound("./assets/memory-quest-match-error.mp3", 0.42)
});
const MEMORY_QUEST_PAIR_VOICES = Object.freeze({
  correct: createMatchSound("./assets/Correct_MemoryQuesty_01.wav", 0.78),
  incorrect: createMatchSound("./assets/error_MemoryQuest_01.wav", 0.78)
});
let activePairVoice = null;

function createMatchSound(source, volume) {
  if (typeof Audio === "undefined") return null;
  const sound = new Audio(new URL(source, import.meta.url));
  sound.preload = "auto";
  sound.volume = volume;
  return sound;
}

function playMatchSound(outcome) {
  const sound = MEMORY_QUEST_MATCH_SOUNDS[outcome];
  if (!sound) return;
  sound.pause();
  try { sound.currentTime = 0; } catch {}
  sound.play().catch(() => {});
}

function stopPairVoice() {
  if (!activePairVoice) return;
  activePairVoice.pause();
  try { activePairVoice.currentTime = 0; } catch {}
  activePairVoice = null;
}

function playPairVoice(outcome) {
  stopPairVoice();
  const voice = MEMORY_QUEST_PAIR_VOICES[outcome];
  if (!voice) return;
  activePairVoice = voice;
  voice.play().catch(() => {
    if (activePairVoice === voice) activePairVoice = null;
  });
}

function showMatchCelebration(card, outcome) {
  const celebration = document.createElement("span");
  celebration.className = `memory-quest-match-celebration memory-quest-match-celebration--${outcome}`;
  celebration.setAttribute("aria-hidden", "true");
  const mascotSrc = outcome === "correct"
    ? "/core/assets/duduq-hud-mascot.png"
    : "./assets/memory-quest-match-incorrect-mascot.png";
  const iconSrc = outcome === "correct"
    ? "./assets/memory-quest-match-correct.png"
    : "./assets/memory-quest-match-incorrect.png";
  celebration.innerHTML = `
    <img class="memory-quest-celebration-mascot" src="${mascotSrc}" alt="" draggable="false">
    <img class="memory-quest-celebration-icon" src="${iconSrc}" alt="" draggable="false">
  `;
  const removeCelebration = () => {
    celebration.remove();
    window.clearTimeout(celebration.cleanupTimer);
  };
  celebration.addEventListener("animationend", removeCelebration, { once: true });
  celebration.addEventListener("animationcancel", removeCelebration, { once: true });
  celebration.cleanupTimer = window.setTimeout(
    removeCelebration,
    MEMORY_QUEST_MATCH_FEEDBACK.correctBubbleDurationMs
  );
  const cardRect = card.getBoundingClientRect();
  const playAreaRect = playArea.getBoundingClientRect();
  celebration.style.left = `${cardRect.left - playAreaRect.left + cardRect.width / 2}px`;
  celebration.style.top = `${cardRect.top - playAreaRect.top + cardRect.height / 2}px`;
  playArea.append(celebration);
}

root.className = "game-screen target-shooter-screen duduq-shared-gold-shell memory-quest-screen";
root.innerHTML = `
  <div class="world-backdrop" aria-hidden="true"></div>
  <div class="readability-veil" aria-hidden="true"></div>
  <section class="game-shell memory-quest-shell" aria-label="Memory Quest activity">
    <div data-canonical-header-slot></div>
    <div data-canonical-question-slot></div>
    <section class="memory-quest-play-area" aria-label="Memory Quest play area">
      <div class="memory-quest-card-grid" role="group" aria-label="Memory Quest cards">
        ${MEMORY_CARD_COMPONENTS.map((cardId, index) => `
          <button
            class="memory-quest-card-slot"
            type="button"
            data-memory-card-component="${cardId}"
            aria-label="Reveal memory card ${index + 1}"
            aria-pressed="false"
            style="--memory-card-float-delay: ${index * -MEMORY_CARD_FLOAT_STAGGER_MS}ms"
          >
            <span class="memory-quest-card-inner" aria-hidden="true">
              <img
                class="memory-quest-card-back"
                src="./assets/card-memory-${cardId}.png"
                alt=""
                draggable="false"
              >
              <span class="memory-quest-card-front">
                <img
                  class="memory-quest-card-front-art"
                  src="./assets/card-memory-verso.png"
                  alt=""
                  draggable="false"
                >
                <img
                  class="memory-quest-card-subject"
                  src="./assets/card-memory-verso-target.png"
                  alt=""
                  draggable="false"
                >
              </span>
            </span>
          </button>
        `).join("")}
      </div>
    </section>
  </section>
  <div class="result-fx-layer success-celebration-layer" aria-hidden="true"></div>
  <section class="feedback-ribbon" data-feedback="" aria-live="polite" aria-atomic="true" hidden>
    <span class="feedback-status-badge" aria-hidden="true"><span class="feedback-status-icon"></span></span>
    <img class="feedback-mascot" data-asset="feedback-mascot" alt="">
    <div class="feedback-copy"><h2 data-slot="feedback-title"></h2><p data-slot="feedback-detail"></p></div>
    <button class="feedback-action game-button" type="button"><span data-slot="feedback-action"></span></button>
  </section>
`;

const background = window.DuduQAssets?.assets?.backgrounds?.["1"] || "";
root.querySelector(".world-backdrop").style.backgroundImage = `url("${background}")`;

const header = DuduQCanonicalHeaderHUD({
  title: MEMORY_QUEST_SHELL_CONFIG.title,
  progressCurrent: MEMORY_QUEST_SHELL_CONFIG.progress.current,
  progressTotal: MEMORY_QUEST_SHELL_CONFIG.progress.total,
  progressArtwork: "penpot-official-board",
  mascot: "/core/assets/duduq-hud-mascot.png"
});
header.dataset.mechanic = "matching";
root.querySelector("[data-canonical-header-slot]").replaceWith(header);

const questionHud = DuduQCanonicalQuestionHUD(MEMORY_QUEST_SHELL_CONFIG.prompt);
root.querySelector("[data-canonical-question-slot]").replaceWith(questionHud);

const playArea = root.querySelector(".memory-quest-play-area");
const cardGrid = root.querySelector(".memory-quest-card-grid");
const feedback = root.querySelector(".feedback-ribbon");
const resultFx = ResultFX(root.querySelector(".success-celebration-layer"));
let pendingMemoryCard = null;
let foundPairCount = 0;
let activityComplete = false;

cardGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".memory-quest-card-slot");
  if (
    !card ||
    !cardGrid.contains(card) ||
    activityComplete ||
    card.dataset.flipped === "true" ||
    card.dataset.matched === "true" ||
    cardGrid.dataset.resolving === "true"
  ) return;

  const cardConfig = MEMORY_QUEST_CARD_CONFIG[card.dataset.memoryCardComponent];
  if (!cardConfig) return;

  const flip = (target, revealed) => {
    const targetConfig = MEMORY_QUEST_CARD_CONFIG[target.dataset.memoryCardComponent];
    target.dataset.flipped = String(revealed);
    target.setAttribute("aria-pressed", String(revealed));
    target.classList.toggle("is-flipped", revealed);
    target.setAttribute(
      "aria-label",
      revealed ? `Memory card revealed: ${targetConfig.label}` : "Reveal memory card"
    );
  };

  flip(card, true);
  if (!pendingMemoryCard) {
    pendingMemoryCard = card;
    return;
  }

  const pendingCard = pendingMemoryCard;
  pendingMemoryCard = null;
  const pendingConfig = MEMORY_QUEST_CARD_CONFIG[pendingCard.dataset.memoryCardComponent];
  cardGrid.dataset.resolving = "true";

  if (pendingConfig?.pairKey === cardConfig.pairKey) {
    playMatchSound("correct");
    const finalPair = foundPairCount + 1 === MEMORY_QUEST_REQUIRED_PAIRS;
    if (finalPair) stopPairVoice();
    else playPairVoice("correct");
    [pendingCard, card].forEach((matchedCard) => {
      // Keep matched cards explicitly on the pair-image side after the match.
      flip(matchedCard, true);
      matchedCard.dataset.matched = "true";
      matchedCard.classList.add("is-matched");
      matchedCard.setAttribute("aria-label", `Matching pair found: ${cardConfig.label}`);
      matchedCard.setAttribute("aria-disabled", "true");
      const badge = document.createElement("img");
      badge.className = "memory-quest-correct-badge";
      badge.src = "./assets/memory-quest-match-correct.png";
      badge.alt = "";
      badge.setAttribute("aria-hidden", "true");
      matchedCard.append(badge);
      // Keep the transient mascot outside the card's 3D flip stack so the
      // matched rabbit face remains unobstructed and cannot reveal the back.
      showMatchCelebration(matchedCard, "correct");
    });
    foundPairCount += 1;
    delete cardGrid.dataset.resolving;
    if (foundPairCount === MEMORY_QUEST_REQUIRED_PAIRS) {
      activityComplete = true;
      cardGrid.dataset.complete = "true";
      resultFx.trigger("correct");
      DuduqSound.playVoice("correct");
      Feedback(feedback, window.DuduQAssets?.assets, "correct", () => {
        window.dispatchEvent(new CustomEvent("duduq:feedback", {
          detail: { type: "continue", mechanic: "memory-quest" }
        }));
      });
      feedback.querySelector('[data-slot="feedback-title"]').textContent = "Parabéns!";
      feedback.querySelector('[data-slot="feedback-detail"]').textContent = "Você encontrou todos os pares!";
    }
    return;
  }

  showMatchCelebration(pendingCard, "incorrect");
  showMatchCelebration(card, "incorrect");
  playMatchSound("incorrect");
  playPairVoice("incorrect");
  window.setTimeout(() => {
    flip(pendingCard, false);
    flip(card, false);
    delete cardGrid.dataset.resolving;
  }, MEMORY_QUEST_MATCH_FEEDBACK.mismatchReturnMs);
});

const CARD_GRID_LAYOUTS = Object.freeze({
  desktop: Object.freeze({ width: 1238, height: 521 }),
  tablet: Object.freeze({ width: 548, height: 513 }),
  mobile: Object.freeze({ width: 333, height: 548 })
});

function fitCardGrid() {
  const layout = window.matchMedia("(max-width: 699px)").matches
    ? CARD_GRID_LAYOUTS.mobile
    : window.matchMedia("(max-width: 1099px)").matches
      ? CARD_GRID_LAYOUTS.tablet
      : CARD_GRID_LAYOUTS.desktop;
  const scale = Math.min(
    1,
    playArea.clientWidth / layout.width,
    playArea.clientHeight / layout.height
  );
  playArea.style.setProperty("--memory-card-scale", String(Math.max(0.5, scale)));
}

fitCardGrid();
new ResizeObserver(fitCardGrid).observe(playArea);

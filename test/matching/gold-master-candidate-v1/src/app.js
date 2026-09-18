import { createMatchingEngine, createMatchingInteraction } from "./matching-engine.js";
import { GameShell, BackgroundLayer, PlayfieldOverlay } from "./game-shell.js";
import { GameHUD, GameQuestionPanel, PrimaryAction, Feedback, LoadingState } from "./core-components.js";
import { MatchingBoard } from "./matching-board.js";
import { ResultFXLayer } from "./result-fx.js";
import { CTAAttention } from "./core/ui/index.js";
import { mountMatchingComponents } from "./matching-components.js";

const initialContent = window.DUDUQ_MATCHING_GOLD_MASTER;
const assetApi = window.DuduQAssets;
const shell = new GameShell(document.querySelector(".game-screen"));
const boardRoot = document;
const action = document.querySelector(".primary-action");
const feedback = document.querySelector(".feedback-ribbon");
const resultFXLayer = document.querySelector(".result-fx-layer");
resultFXLayer.dataset.quality = window.matchMedia?.("(min-width: 900px)").matches ? "high" : "medium";
const resultFX = ResultFXLayer(resultFXLayer);
const loading = document.querySelector(".loading-screen");
const rounds = [...(window.DUDUQ_MATCHING_GOLD_MASTER_ROUNDS || [])];
let roundIndex = 0;
let activeInteraction;
let activeBoard;
let confirmWasVisible = false;
const confirmAttention = CTAAttention(action, { target: action.closest(".cta-attention-wrapper") || action });

mountMatchingComponents(document);

function imageUrl(key) {
  const resolver = assetApi?.resolveImage;
  return typeof resolver === "function" ? resolver(key) || "" : "";
}

BackgroundLayer(shell, assetApi?.assets?.backgrounds?.["1"]);
PlayfieldOverlay(shell);

function updateAction(snapshot) {
  const complete = snapshot.connections.length === window.__MATCHING_ENGINE__.pairs.length;
  const available = complete && !["validating", "correct", "incorrect", "loading", "complete"].includes(snapshot.status);
  action.disabled = !available;
  action.hidden = !available;
  action.setAttribute("aria-hidden", String(!available));
  action.setAttribute("aria-label", available ? "Confirmar associações" : "Conecte todos os pares para confirmar");
  if (available && !confirmWasVisible) confirmAttention.start();
  if (!available) confirmAttention.stop();
  confirmWasVisible = available;
}

async function advance() {
  resultFX.clear();
  feedback.hidden = true;
  action.hidden = true;
  confirmAttention.stop();
  document.querySelector(".game-screen").dataset.screenState = "loading";
  loading.hidden = false;
  loading.dataset.state = "loading";
  LoadingState(loading, "loading");
  loading.querySelector('[data-slot="loading-title"]').textContent = "Preparando a próxima etapa…";
  loading.querySelector(".loading-progress").hidden = false;
  loading.querySelector(".complete-action").hidden = true;
  const transitionMascot = loading.querySelector('[data-asset="transition-mascot"]');
  transitionMascot.src = assetApi?.assets?.mascots?.transition || "";
  activeInteraction.setStatus("loading");
  await new Promise((resolve) => setTimeout(resolve, 680));
  let nextRound = rounds[roundIndex + 1] || null;
  if (!nextRound && typeof window.DUDUQ_MATCHING_HOST?.nextRound === "function") {
    nextRound = await window.DUDUQ_MATCHING_HOST.nextRound({ completed: window.__MATCHING_ENGINE__.progress.completed, total: window.__MATCHING_ENGINE__.progress.total });
  }
  if (nextRound) {
    roundIndex += 1;
    mountRound(nextRound);
    loading.hidden = true;
    document.querySelector(".game-screen").dataset.screenState = "idle";
    return;
  }
  loading.dataset.state = "complete";
  transitionMascot.src = assetApi?.assets?.mascots?.complete || assetApi?.assets?.mascots?.transition || "";
  transitionMascot.alt = "DuduQ celebrando a prévia concluída";
  loading.querySelector('[data-slot="loading-title"]').textContent = "Prévia concluída!";
  loading.querySelector(".loading-progress").hidden = true;
  const completeAction = loading.querySelector(".complete-action");
  completeAction.hidden = false;
  completeAction.onclick = () => {
    roundIndex = 0;
    mountRound(initialContent);
    loading.hidden = true;
    document.querySelector(".game-screen").dataset.screenState = "idle";
  };
}

function mountRound(content) {
  activeBoard?.destroy();
  feedback.hidden = true;
  action.hidden = false;
  confirmWasVisible = false;
  confirmAttention.stop();
  document.querySelector(".game-screen").dataset.screenState = "idle";
  const engine = createMatchingEngine(content);
  const interaction = createMatchingInteraction(engine);
  window.__MATCHING_ENGINE__ = engine;
  window.__MATCHING_INTERACTION__ = interaction;
  document.querySelector("[data-list='left']").replaceChildren();
  document.querySelector("[data-list='right']").replaceChildren();
  document.querySelector(".connection-layer").replaceChildren();
  GameHUD(document, content, assetApi?.assets, engine.progress);
  GameQuestionPanel(document, engine.question);
  PrimaryAction(action, content.actionLabel || "CONFIRMAR", async () => {
    const live = document.querySelector('[data-slot="live"]');
    const initial = interaction.snapshot();
    if (initial.connections.length !== engine.pairs.length) {
      live.textContent = `Ainda faltam associações: ${initial.connections.length} de ${engine.pairs.length}.`;
      return;
    }
    action.disabled = true;
    action.blur();
    document.querySelector(".game-screen").dataset.screenState = "validating";
    activeBoard.paint(interaction.setStatus("validating"));
    await new Promise((resolve) => setTimeout(resolve, 110));
    const result = interaction.confirm();
    action.hidden = true;
    document.querySelector(".game-screen").dataset.screenState = result.status;
    if (result.status === "incorrect") live.textContent = "Há associações incorretas. Revise os pares destacados.";
    else live.textContent = "Resposta correta! Muito bem.";
    activeBoard.paint(result.snapshot);
    window.setTimeout(() => {
      feedback.dataset.correctAnswer = engine.leftItems.find((item) => item.id === "word-dog")?.label || "DOG";
      Feedback(feedback, assetApi?.assets, result.status, () => {
        feedback.hidden = true;
        resultFX.clear();
        if (result.status === "incorrect") {
          activeBoard.paint(interaction.retry());
          document.querySelector(".game-screen").dataset.screenState = "idle";
          window.dispatchEvent(new CustomEvent("duduq:feedback", { detail: { type: "retry" } }));
          return;
        }
        window.dispatchEvent(new CustomEvent("duduq:feedback", { detail: { type: "continue" } }));
        void advance();
      });
      window.setTimeout(() => result.status === "correct" ? resultFXLayer.dispatchEvent(new CustomEvent("activity-success", { bubbles: true, detail: { source: "matching" } })) : resultFX.trigger("incorrect"), result.status === "correct" ? 40 : 0);
      window.dispatchEvent(new CustomEvent("duduq:feedback", { detail: { type: `feedback-${result.status}` } }));
    }, 180);
  });
  activeInteraction = interaction;
  activeBoard = MatchingBoard(boardRoot, engine, interaction, imageUrl, updateAction);
  window.__DUDUQ_MATCHING_DIAGNOSTIC__ = Object.freeze({
    headerMounted: Boolean(document.querySelector(".duduq-canonical-header-hud")),
    questionMounted: Boolean(document.querySelector(".duduq-canonical-question-hud")),
    roundMounted: true,
    wordCards: document.querySelectorAll('.matching-card[data-kind="word"]').length,
    imageCards: document.querySelectorAll('.matching-card[data-kind="image"]').length,
    engineInitialized: Boolean(window.__MATCHING_ENGINE__),
  });
}

try {
  mountRound(initialContent);
} catch (error) {
  console.error("[DUDUQ MATCHING BOOT]", error);
  window.__DUDUQ_MATCHING_DIAGNOSTIC__ = Object.freeze({ bootFailed: true, error: String(error?.message || error) });
  throw error;
}
window.DUDUQMatchingCandidate = Object.freeze({ mountRound, getInteraction: () => activeInteraction });

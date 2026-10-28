import { createMatchingEngine, createMatchingInteraction } from "/runtime/gold-masters/matching/src/matching-engine.js";
import { GameShell, BackgroundLayer, PlayfieldOverlay } from "/runtime/gold-masters/matching/src/game-shell.js";
import { GameHUD, GameQuestionPanel, PrimaryAction, Feedback, LoadingState } from "/runtime/gold-masters/matching/src/core-components.js";
import { MatchingBoard } from "/runtime/gold-masters/matching/src/matching-board.js";
import { ResultFXLayer } from "/runtime/gold-masters/matching/src/result-fx.js";
import { CTAAttention } from "/runtime/gold-masters/matching/src/core/ui/index.js";
import { mountMatchingComponents } from "/runtime/gold-masters/matching/src/matching-components.js";
import { DuduqSound } from "/core/audio/duduq-sound-system.js";

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
let completionSoundPlayed = false;
let feedbackGeneration = 0;
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

async function playMatchingSuccessRecap(engine, generation) {
  if (engine.pairs.length < 2) return;
  const pedagogy = window.DuduQPedagogicalAudioInteraction;
  for (const pair of engine.pairs) {
    if (generation !== feedbackGeneration || feedback.hidden) return;
    const left = engine.leftItems.find(item => item.id === pair.leftId);
    const right = engine.rightItems.find(item => item.id === pair.rightId);
    const nodes = [pair.leftId, pair.rightId].map(id => document.querySelector(`.matching-card[data-id="${CSS.escape(id)}"]`)).filter(Boolean);
    nodes.forEach(node => { node.dataset.successRecap = "active"; });
    const target = String(left?.label || "").trim();
    try {
      const entry = target && await pedagogy?.resolve?.(target, "en-US");
      const audioId = entry?.audioId || entry?.id || "";
      if (audioId && pedagogy?.speak) {
        let timer;
        await Promise.race([pedagogy.speak(target, { locale: "en-US", audioId, showFlag: false }), new Promise(resolve => { timer = window.setTimeout(resolve, 7000); })]);
        window.clearTimeout(timer);
      }
    } catch { /* recap audio is additive; never trap the completed activity */ }
    nodes.forEach(node => { delete node.dataset.successRecap; });
    if (generation !== feedbackGeneration || feedback.hidden) return;
    await new Promise(resolve => window.setTimeout(resolve, 160));
  }
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
  if (!completionSoundPlayed) {
    completionSoundPlayed = true;
    DuduqSound.play("complete");
  }
  transitionMascot.src = assetApi?.assets?.mascots?.complete || assetApi?.assets?.mascots?.transition || "";
  transitionMascot.alt = "DuduQ celebrando a prévia concluída";
  loading.querySelector('[data-slot="loading-title"]').textContent = "Prévia concluída!";
  loading.querySelector(".loading-progress").hidden = true;
  const completeAction = loading.querySelector(".complete-action");
  completeAction.hidden = false;
  completeAction.onclick = () => {
    roundIndex = 0;
    completionSoundPlayed = false;
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
    DuduqSound.play("uiClick");
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
    // Render the validated state before spoken feedback can delay this flow.
    activeBoard.paint(result.snapshot);
    // The board is already validated. Display feedback and its action immediately.
    // Narration and pair-by-pair recaps are additive, never a navigation gate.
    const generation = ++feedbackGeneration;
    let retryReminder = null;
    const pedagogy = window.DuduQPedagogicalAudioInteraction;
    action.hidden = true;
    document.querySelector(".game-screen").dataset.screenState = result.status;
    live.textContent = result.status === "incorrect"
      ? "Há associações incorretas. Revise os pares destacados."
      : "Resposta correta! Muito bem.";
    activeBoard.paint(result.snapshot);
    Feedback(feedback, assetApi?.assets, result.status, () => {
      if (generation !== feedbackGeneration) return;
      feedback.hidden = true;
      resultFX.clear();
      if (result.status === "incorrect") {
        feedbackGeneration++;
        DuduqSound.play("uiClick");
        const button = feedback.querySelector(".feedback-action");
        if (button) button.disabled = true;
        window.DuduQContentAudio?.stopVoice?.();
        activeBoard.paint(interaction.retry());
        document.querySelector(".game-screen").dataset.screenState = "idle";
        window.dispatchEvent(new CustomEvent("duduq:feedback", { detail: { type: "retry" } }));
        if (retryReminder && pedagogy?.enabled) {
          void Promise.resolve().then(() => pedagogy.speakRetryReminder?.(retryReminder)).catch(() => {});
        }
        return;
      }
      const continueEvent = new CustomEvent("duduq:feedback", {
        cancelable: true, detail: { type: "continue" }
      });
      feedbackGeneration++;
      window.DuduQContentAudio?.stopVoice?.();
      if (!window.dispatchEvent(continueEvent)) return;
      void advance();
    });
    const incorrectPairCount = (result.snapshot.connections || []).filter(connection => connection.state === "incorrect").length;
    feedback.querySelector('[data-slot="feedback-title"]').textContent = result.status === "correct" ? "Mandou bem!" : "Quase!";
    feedback.querySelector('[data-slot="feedback-detail"]').textContent = result.status === "correct"
      ? "Todos os pares foram conectados corretamente."
      : incorrectPairCount === 1
        ? "Um par ainda não está conectado corretamente."
        : "Alguns pares ainda não estão conectados corretamente.";
    window.setTimeout(() => {
      if (generation !== feedbackGeneration) return;
      if (result.status === "correct") resultFXLayer.dispatchEvent(new CustomEvent("activity-success", { bubbles: true, detail: { source: "matching" } }));
      else resultFX.trigger("incorrect");
    }, result.status === "correct" ? 40 : 0);
    window.dispatchEvent(new CustomEvent("duduq:feedback", { detail: { type: `feedback-${result.status}` } }));

    if (result.status === "correct") {
      DuduqSound.play("correct");
      void Promise.resolve().then(async () => {
        if (pedagogy?.enabled) await pedagogy.speakFeedback("MATCHING_FINAL_SUCCESS", { mechanic: "matching" });
        else window.setTimeout(() => DuduqSound.playVoice("correct"), 140);
        if (generation === feedbackGeneration) await playMatchingSuccessRecap(engine, generation);
      }).catch(() => {});
    } else if (result.status === "incorrect") {
      DuduqSound.play("error");
      if (pedagogy?.enabled) {
        void Promise.resolve().then(async () => {
          if (pedagogy.isPilotForCurrentQuestion?.("matching")) await pedagogy.speakMatchingWrong(result.total - result.correctCount);
          else await pedagogy.speakFeedback("MATCHING_WRONG", { mechanic: "matching" });
        }).catch(() => {});
        void Promise.resolve().then(() => window.DuduQProductionQuestionBootstrap?.resolveRetryReminder?.({
          numberOfActiveRelations: engine.pairs.length,
          incorrectRelationCount: result.total - result.correctCount,
          numberOfRemainingRelations: result.total - result.correctCount,
          answerLeakRisk: true
        })).then(plan => {
          if (generation === feedbackGeneration) retryReminder = plan || null;
        }).catch(() => {});
      } else window.setTimeout(() => DuduqSound.playVoice("error"), 140);
    }
  });
  activeInteraction = interaction;
  activeBoard = MatchingBoard(boardRoot, engine, interaction, imageUrl, updateAction, ({ card, previous, snapshot, side, id }) => {
    if (!window.DuduQPedagogicalAudioInteraction?.enabled || side !== "left" || previous.selected.left === id || snapshot.selected.left !== id) return;
    const item = engine.leftItems.find(candidate => candidate.id === id);
    if (item?.label) void window.DuduQPedagogicalAudioInteraction.speak(item.label, { locale: "en-US" });
  });
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

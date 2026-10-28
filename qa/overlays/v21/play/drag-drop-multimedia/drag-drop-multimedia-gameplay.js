import { GameActionButton, CTAAttention } from "/core/ui/index.js";
import { DuduqSound } from "/core/audio/duduq-sound-system.js";
import { ResultFXLayer } from "/core/ui/result-fx.js";
// Source QA serves the canonical Gold Master from its repository path. The
// official build rewrites this source prefix to /runtime/gold-masters/matching.
import { Feedback } from "/runtime/gold-masters/matching/src/core-components.js";
import { createMultimediaRound } from "./drag-drop-multimedia-round.js";
import { createDuduqDragDropLifecycle } from "/core/duduq-drag-drop-lifecycle.js";
import { DuduQCanonicalAudioButton } from "/core/ui/duduq-canonical-audio-button.js";

const DRAG_THRESHOLD = 5;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initializeMultimediaDragDrop({ root, centralPanel, dragWordBank, targets: targetElements, items: itemElements, activity }) {
  if (!activity || !Array.isArray(activity.items) || !Array.isArray(activity.targets)) {
    throw new Error("Drag & Drop Multimedia requires a complete activity configuration.");
  }
  const itemElementsById = new Map(itemElements.map(element => [element.dataset.itemId, element]));
  const targetElementsById = new Map(targetElements.map(target => [target.id, target]));
  const itemConfig = activity.items.map((definition, order) => {
    const element = itemElementsById.get(definition.id);
    if (!element) throw new Error(`Missing Multimedia item renderer for ${definition.id}.`);
    return { ...definition, element, homeOrder: order };
  });
  const targetConfig = activity.targets.map(definition => {
    const rendered = targetElementsById.get(definition.id);
    if (!rendered) throw new Error(`Missing Multimedia target renderer for ${definition.id}.`);
    return { ...definition, ...rendered };
  });
  if (itemConfig.length !== itemElements.length || targetConfig.length !== targetElements.length) {
    throw new Error("Multimedia activity configuration and renderer elements must match exactly.");
  }
  const round = createDuduqDragDropLifecycle(createMultimediaRound(activity));
  const itemsById = new Map(itemConfig.map(item => [item.id, item]));
  const targetsById = new Map(targetConfig.map(target => [target.id, target]));
  const targetsBySlot = new Map(targetConfig.map(target => [target.slot, target]));
  const removeButtonsByItemId = new Map();
  const stateByItem = () => new Map(round.snapshot().items.map(item => [item.id, item]));
  let activeDrag = null;
  let activeAudioItem = null;
  let activeContentAudio = null;
  let selectedKeyboardItem = null;

  for (const item of itemConfig) {
    const button = document.createElement("button");
    button.className = "dnd-multimedia-remove-option";
    button.type = "button";
    button.setAttribute("aria-label", "Remover opção e devolver ao local de origem");
    button.setAttribute("title", "Remover opção");
    button.hidden = true;
    button.innerHTML = '<img src="./assets/remove-option.svg" alt="" aria-hidden="true">';
    item.element.append(button);
    removeButtonsByItemId.set(item.id, button);
  }

  const shell = root.querySelector(".dnd-game-shell");
  const confirmMotion = document.createElement("div");
  confirmMotion.className = "dnd-multimedia-confirm-motion";
  confirmMotion.hidden = true;
  confirmMotion.innerHTML = `<button class="primary-action game-action-button--primary dnd-confirm-action" type="button" aria-label="Confirmar respostas">
    <span class="dnd-confirm-action__shadow" aria-hidden="true"></span>
    <span class="dnd-confirm-action__depth" aria-hidden="true"></span>
    <span class="dnd-confirm-action__surface" aria-hidden="true"></span>
    <span class="dnd-confirm-action__highlight" aria-hidden="true"></span>
    <span class="dnd-confirm-action__label" data-slot="action">CONFIRMAR</span>
  </button>`;
  dragWordBank.after(confirmMotion);
  const confirmButton = confirmMotion.querySelector("button");
  GameActionButton(confirmButton, "primary");
  const confirmAttention = CTAAttention(confirmButton, { delay: 700, repeat: 2000 });

  const resultFxLayer = document.createElement("div");
  resultFxLayer.className = "result-fx-layer success-celebration-layer";
  resultFxLayer.setAttribute("aria-hidden", "true");
  root.append(resultFxLayer);
  ResultFXLayer(resultFxLayer);

  const feedback = document.createElement("section");
  feedback.className = "feedback-ribbon dnd-multimedia-feedback";
  feedback.dataset.feedback = "";
  feedback.setAttribute("aria-live", "polite");
  feedback.setAttribute("aria-atomic", "true");
  feedback.hidden = true;
  feedback.innerHTML = `<img class="feedback-mascot" data-asset="feedback-mascot" alt="">
    <div class="feedback-copy"><h2 data-slot="feedback-title"></h2><p data-slot="feedback-detail"></p></div>
    <button class="feedback-action game-button" type="button"><span data-slot="feedback-action"></span></button>`;
  root.append(feedback);

  const allPlaced = () => round.canConfirm();
  const updateConfirmVisibility = () => {
    const state = round.snapshot();
    const visible = state.status === "editing" && allPlaced();
    const wasVisible = !confirmMotion.hidden;
    confirmMotion.hidden = !visible;
    if (!visible) confirmAttention.stop();
    else if (!wasVisible) confirmAttention.start();
  };
  const clearAudioPlayback = () => {
    const audio = activeContentAudio;
    const item = activeAudioItem;
    activeContentAudio = null;
    activeAudioItem = null;
    if (item) {
      item.removeAttribute("data-playing");
      item.querySelector(".dnd-multimedia-audio-item__play")?.setAudioState?.("idle");
    }
    if (audio === "canonical-audio-id") window.DuduQContentAudio?.stopVoice?.();
    else if (audio) {
      audio.pause();
      try { audio.currentTime = 0; } catch {}
    }
  };
  const clearTargetPresentation = slot => {
    slot.removeAttribute("data-occupied");
    slot.removeAttribute("data-state");
    slot.setAttribute("aria-label", "ARRASTE AQUI");
  };
  const refreshTargetPresentation = () => {
    const state = round.snapshot();
    const states = new Map(state.items.map(item => [item.id, item]));
    for (const itemState of state.items) {
      const removeButton = removeButtonsByItemId.get(itemState.id);
      if (removeButton) removeButton.hidden = !(state.status === "editing" && itemState.currentTargetId && !itemState.locked);
    }
    for (const target of targetConfig) {
      const occupyingItem = state.items.find(item => item.currentTargetId === target.id);
      if (!occupyingItem) {
        clearTargetPresentation(target.slot);
        target.element.removeAttribute("data-state");
        continue;
      }
      target.slot.dataset.occupied = "true";
      target.slot.dataset.state = occupyingItem.state;
      if (occupyingItem.state === "correct" || occupyingItem.state === "incorrect") target.element.dataset.state = occupyingItem.state;
      else target.element.removeAttribute("data-state");
      const itemDef = itemsById.get(occupyingItem.id);
      target.slot.setAttribute("aria-label", `${itemDef.type === "audio" ? "Áudio" : "Texto"} colocado na imagem. Estado ${occupyingItem.state}.`);
      itemDef.element.dataset.state = occupyingItem.state;
      itemDef.element.dataset.locked = String(occupyingItem.locked);
      itemDef.element.setAttribute("aria-disabled", String(occupyingItem.locked));
      itemDef.element.tabIndex = occupyingItem.locked ? -1 : 0;
    }
  };
  const restoreDragStyles = drag => {
    drag.element.style.cssText = drag.originalStyle;
    drag.element.removeAttribute("data-drag-state");
  };
  const animateToRect = (element, fromRect) => {
    if (reducedMotion.matches || typeof element.animate !== "function") return;
    const toRect = element.getBoundingClientRect();
    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    try {
      element.animate(
        [{ transform: `translate3d(${dx}px, ${dy}px, 0)`, composite: "add" }, { transform: "translate3d(0, 0, 0)", composite: "add" }],
        { duration: 180, easing: "cubic-bezier(.2,.75,.25,1)" }
      );
    } catch { /* The final slot position remains deterministic if additive transforms are unavailable. */ }
  };
  const insertInBankOrder = element => {
    const order = itemsById.get(element.dataset.itemId)?.homeOrder ?? itemConfig.length;
    const next = [...dragWordBank.querySelectorAll("[data-item-id]")]
      .find(candidate => (itemsById.get(candidate.dataset.itemId)?.homeOrder ?? itemConfig.length) > order);
    dragWordBank.insertBefore(element, next || null);
  };
  const removePlacedItem = itemId => {
    if (round.snapshot().status !== "editing") return false;
    const state = stateByItem().get(itemId);
    const item = itemsById.get(itemId);
    if (!state?.currentTargetId || state.locked || !item || !round.remove(itemId)) return false;
    const fromRect = item.element.getBoundingClientRect();
    item.element.dataset.state = "idle";
    item.element.removeAttribute("data-placement");
    item.element.removeAttribute("data-locked");
    item.element.removeAttribute("aria-disabled");
    item.element.setAttribute("aria-label", item.type === "audio" ? "Cartão de áudio para arrastar; botão para ouvir." : `Texto ${item.text || ""} para arrastar.`);
    item.element.tabIndex = 0;
    insertInBankOrder(item.element);
    refreshTargetPresentation();
    updateConfirmVisibility();
    animateToRect(item.element, fromRect);
    item.element.focus({ preventScroll: true });
    return true;
  };
  const syncRoundPlacement = (draggedItemId, targetId, fromRect) => {
    const result = round.place(draggedItemId, targetId);
    if (!result) return false;
    if (result.replacedItemId) {
      const replaced = itemsById.get(result.replacedItemId);
      if (replaced) {
        replaced.element.dataset.state = "idle";
        replaced.element.removeAttribute("data-placement");
        replaced.element.removeAttribute("data-locked");
        replaced.element.removeAttribute("aria-disabled");
        replaced.element.tabIndex = 0;
        insertInBankOrder(replaced.element);
      }
    }
    const item = itemsById.get(draggedItemId);
    const target = targetsById.get(targetId);
    if (!item || !target) return false;
    restoreDragStyles({ element: item.element, originalStyle: "" });
    item.element.dataset.state = "placed";
    item.element.dataset.placement = "slot";
    item.element.dataset.locked = "false";
    item.element.setAttribute("aria-disabled", "false");
    item.element.setAttribute("aria-label", item.type === "audio" ? "Cartão de áudio colocado. Pressione Enter para mover." : `Texto ${item.text || ""} colocado. Pressione Enter para mover.`);
    item.element.tabIndex = 0;
    target.slot.append(item.element);
    refreshTargetPresentation();
    updateConfirmVisibility();
    DuduqSound.play("snap");
    animateToRect(item.element, fromRect);
    return true;
  };
  const returnToOriginalParent = (drag, currentRect) => {
    restoreDragStyles(drag);
    drag.element.removeAttribute("data-placement");
    drag.element.dataset.state = drag.originalState;
    if (drag.originalNext?.parentElement === drag.originalParent) drag.originalParent.insertBefore(drag.element, drag.originalNext);
    else drag.originalParent.append(drag.element);
    refreshTargetPresentation();
    updateConfirmVisibility();
    animateToRect(drag.element, currentRect);
  };
  let successRecapGeneration = 0;
  const playSuccessRecap = async (result, generation) => {
    const contract = await window.DuduQProductionQuestionBootstrap?.ready;
    const plan = contract?.successRecap;
    if (plan?.mode !== "SEQUENTIAL_ITEM") return;
    root.dataset.successRecapState = "playing";
    const ordered = [...(plan.items || [])].sort((a, b) => itemConfig.findIndex(row => row.id === a.id) - itemConfig.findIndex(row => row.id === b.id));
    for (const recapItem of ordered) {
      if (generation !== successRecapGeneration || !root.isConnected) return;
      const itemState = result.state?.items?.find(row => row.id === recapItem.id);
      const item = itemsById.get(recapItem.id);
      const target = targetsById.get(itemState?.currentTargetId);
      if (item) item.element.dataset.successRecap = "active";
      if (target?.element) target.element.dataset.successRecap = "active";
      if (recapItem.audioId && window.DuduQContentAudio?.playVoice) {
        let timer;
        try {
          await Promise.race([window.DuduQContentAudio.playVoice(recapItem.audioId), new Promise(resolve => { timer = window.setTimeout(resolve, 8000); })]);
        } catch { /* a failed recap clip must never block the Continue state */ }
        finally { window.clearTimeout(timer); }
      }
      if (item) delete item.element.dataset.successRecap;
      if (target?.element) delete target.element.dataset.successRecap;
      if (generation !== successRecapGeneration) return;
      await new Promise(resolve => window.setTimeout(resolve, 180));
    }
    root.dataset.successRecapState = "complete";
  };

  const confirmAnswers = async () => {
    if (!round.canConfirm()) return;
    confirmAttention.stop();
    confirmMotion.hidden = true;
    clearAudioPlayback();
    DuduqSound.play("uiClick");
    const result = round.validate();
    if (!result) {
      updateConfirmVisibility();
      return;
    }
    refreshTargetPresentation();
    if (result.outcome === "incorrect") {
      DuduqSound.play("error");
      const pedagogy = window.DuduQPedagogicalAudioInteraction;
      const incorrectItems = result.state?.items?.filter(item => item.state === "incorrect") || [];
      const incorrectCount = incorrectItems.length;
      const incorrectItem = incorrectItems[0];
      const attemptedNumber = itemConfig.find(item => item.id === incorrectItem?.id)?.text || "";
      const incorrectStimulus = itemConfig.find(item => item.id === incorrectItem?.id && item.audioId);
      const retryPlanPromise = Promise.resolve().then(() => window.DuduQProductionQuestionBootstrap?.resolveRetryReminder?.({
        numberOfActiveRelations: itemConfig.length, incorrectRelationCount: incorrectCount,
        numberOfRemainingRelations: incorrectCount, activeStimulus: incorrectCount === 1 ? incorrectStimulus : null
      })).catch(() => null);
      // Feedback and Retry become available immediately while narration continues.
      Feedback(feedback, window.DuduQAssets?.assets, "incorrect", () => {
        void retryIncorrectItems(null, incorrectStimulus);
        void retryPlanPromise.then(plan => {
          if (plan?.mode === "GLOBAL" && pedagogy?.enabled) return pedagogy.speakRetryReminder?.(plan);
        }).catch(() => {});
      });
      feedback.querySelector('[data-slot="feedback-title"]').textContent = "Quase!";
      feedback.querySelector('[data-slot="feedback-detail"]').textContent = incorrectCount === 1
        ? "Uma combinação ainda não está correta."
        : "Algumas combinações ainda não estão corretas.";
      feedback.querySelector('[data-slot="feedback-action"]').textContent = "TENTAR DE NOVO";
      if (pedagogy?.enabled) {
        void Promise.resolve().then(() => pedagogy.isPilotForCurrentQuestion?.("drag-drop-multimedia")
          ? pedagogy.speakPilotWrong("drag-drop-multimedia", attemptedNumber, { incorrectCount })
          : pedagogy.speakFeedback("ERROR_SHORT", { mechanic: "drag-drop-multimedia", incorrectCount })).catch(() => {});
      } else window.setTimeout(() => DuduqSound.playVoice("error"), 140);
      root.dispatchEvent(new CustomEvent("dnd-multimedia:answer-validated", { bubbles: true, detail: { ...result, questionComplete: false } }));
      return;
    }

    DuduqSound.play("correct");
    resultFxLayer.dispatchEvent(new CustomEvent("activity-success", { bubbles: true, detail: { source: "drag-drop-multimedia" } }));
    // Continue is actionable before recap and narration; keep those enhancements asynchronous.
    Feedback(feedback, window.DuduQAssets?.assets, "correct", continueActivity);
    feedback.querySelector('[data-slot="feedback-title"]').textContent = "Mandou bem!";
    feedback.querySelector('[data-slot="feedback-detail"]').textContent = "Todas as combinações deram certo.";
    feedback.querySelector('[data-slot="feedback-action"]').textContent = "CONTINUAR";
    const generation = ++successRecapGeneration;
    // Narration is sequential in the background and aborts if Continue advances.
    void Promise.resolve().then(async () => {
      if (window.DuduQPedagogicalAudioInteraction?.enabled) {
        await window.DuduQPedagogicalAudioInteraction.speakFeedback("SUCCESS_SHORT", { mechanic: "drag-drop-multimedia" });
      } else window.setTimeout(() => DuduqSound.playVoice("correct"), 140);
      if (generation === successRecapGeneration) await playSuccessRecap(result, generation);
    }).catch(() => {});
    root.dispatchEvent(new CustomEvent("dnd-multimedia:question-complete", { bubbles: true, detail: { ...result, questionComplete: true } }));
  };
  async function retryIncorrectItems(retryPlan = null, incorrectStimulus = null) {
    if (round.snapshot().status !== "retry") return;
    DuduqSound.play("uiClick");
    if (retryPlan?.mode === "GLOBAL" && window.DuduQPedagogicalAudioInteraction?.enabled) {
      void Promise.resolve().then(() => window.DuduQPedagogicalAudioInteraction.speakRetryReminder(retryPlan)).catch(() => {});
    } else if (incorrectStimulus?.audioId && window.DuduQPedagogicalAudioInteraction?.enabled) {
      void Promise.resolve().then(() => window.DuduQPedagogicalAudioInteraction.speakRetryReminder({ mode: "TARGET", targetKind: "OBJECT", targetLabel: incorrectStimulus.label || incorrectStimulus.text || "", targetAudioId: incorrectStimulus.audioId, frameAudioId: "AUD-V11-3F-RETRY-OBJECT-PT" }, incorrectStimulus.audioId)).catch(() => {});
    }
    feedback.hidden = true;
    feedback.querySelector(".feedback-action")?._duduqAttention?.stop();
    const returnedIds = round.retry();
    for (const id of returnedIds) {
      const item = itemsById.get(id);
      if (!item) continue;
      item.element.removeAttribute("data-state");
      item.element.removeAttribute("data-locked");
      item.element.removeAttribute("data-placement");
      item.element.removeAttribute("aria-disabled");
      item.element.setAttribute("aria-label", item.type === "audio" ? "Cartão de áudio para arrastar; botão para ouvir." : `Texto ${item.text || ""} para arrastar.`);
      item.element.tabIndex = 0;
      insertInBankOrder(item.element);
    }
    refreshTargetPresentation();
    selectedKeyboardItem = null;
    updateConfirmVisibility();
    itemsById.get(returnedIds[0])?.element.focus();
  }
  function continueActivity() {
    if (!round.continueActivity()) return;
    successRecapGeneration++;
    window.DuduQContentAudio?.stopVoice?.();
    DuduqSound.play("uiClick");
    const button = feedback.querySelector(".feedback-action");
    if (button) button.disabled = true;
    root.dispatchEvent(new CustomEvent("dnd-multimedia:continue-requested", {
      bubbles: true,
      detail: { placedCount: round.snapshot().placedCount, totalItems: itemConfig.length, questionComplete: true }
    }));
  }

  confirmButton.addEventListener("click", confirmAnswers);
  confirmButton.addEventListener("pointerleave", () => { if (!confirmMotion.hidden) confirmAttention.start(); });
  confirmButton.addEventListener("blur", () => { if (!confirmMotion.hidden) confirmAttention.start(); });
  for (const item of itemConfig) {
    const removeButton = removeButtonsByItemId.get(item.id);
    removeButton?.addEventListener("pointerdown", event => { event.stopPropagation(); });
    removeButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      removePlacedItem(item.id);
    });
    if (item.type !== "audio") continue;
    const buttonPlaceholder = item.element.querySelector(".dnd-multimedia-audio-item__play");
    const playButton = DuduQCanonicalAudioButton({
      ariaLabel: buttonPlaceholder?.getAttribute("aria-label") || "Ouvir estímulo em inglês",
      className: "dnd-multimedia-audio-item__play",
      restartOnClick: true,
      onRestart: clearAudioPlayback
    });
    buttonPlaceholder?.replaceWith(playButton);
    const audioSource = item.audioSrc;
    const audioId = item.audioId || item.element.dataset.audioId;
    if (!audioSource && !audioId) {
      playButton?.setAttribute("disabled", "");
      playButton?.setAttribute("aria-disabled", "true");
      playButton?.setAttribute("title", "Áudio de conteúdo ainda não configurado");
      continue;
    }
    playButton?.addEventListener("pointerdown", event => { event.stopPropagation(); });
    playButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
    });
    playButton.setPlayHandler(() => {
      if (round.snapshot().status !== "editing" || round.snapshot().items.find(state => state.id === item.id)?.locked) return false;
      clearAudioPlayback();
      if (audioId) {
        activeContentAudio = "canonical-audio-id";
        activeAudioItem = item.element;
        const playbackIds = /^AUD-EN-LETTER-[A-Z]$/.test(audioId)
          ? new Set(["AUD-PT-LETTER-CUE-EARLY-Y2", audioId])
          : new Set([audioId]);
        const onVoiceState = event => {
          if (activeContentAudio !== "canonical-audio-id" || !playbackIds.has(event.detail?.audioId)) return;
          if (event.detail.state === "playing") {
            item.element.dataset.playing = "true";
            playButton.setAudioState("playing");
          }
          if (["ended", "stopped", "error"].includes(event.detail.state)) {
            item.element.removeAttribute("data-playing");
            playButton.setAudioState("idle");
          }
        };
        window.addEventListener("duduq:voice-state", onVoiceState);
        const playback = window.DuduQContentAudio.playEarlyYearsLetter
          ? window.DuduQContentAudio.playEarlyYearsLetter(audioId)
          : window.DuduQContentAudio.playVoice(audioId);
        return playback.finally(() => {
          window.removeEventListener("duduq:voice-state", onVoiceState);
          if (activeContentAudio === "canonical-audio-id" && activeAudioItem === item.element) {
            activeContentAudio = null; activeAudioItem = null; item.element.removeAttribute("data-playing");
            playButton.setAudioState("idle");
          }
        });
      }
      const audio = new Audio(audioSource);
      activeContentAudio = audio;
      activeAudioItem = item.element;
      const clearPlayingState = () => {
        if (activeContentAudio !== audio) return;
        if (activeAudioItem === item.element) activeAudioItem = null;
        activeContentAudio = null;
        item.element.removeAttribute("data-playing");
        playButton.setAudioState("idle");
      };
      audio.addEventListener("playing", () => {
        if (activeContentAudio === audio) {
          item.element.dataset.playing = "true";
          playButton.setAudioState("playing");
        }
      });
      audio.addEventListener("ended", clearPlayingState, { once: true });
      audio.addEventListener("pause", clearPlayingState, { once: true });
      audio.addEventListener("error", clearPlayingState, { once: true });
      return audio.play().then(() => new Promise(resolve => {
        audio.addEventListener("ended", () => resolve(true), { once: true });
        audio.addEventListener("error", () => resolve(false), { once: true });
        audio.addEventListener("pause", () => resolve(false), { once: true });
      })).catch(error => { clearPlayingState(); throw error; });
    });
  }

  const finishDrag = (event, cancelled = false) => {
    if (!activeDrag || (event && event.pointerId !== activeDrag.pointerId)) return;
    const drag = activeDrag;
    activeDrag = null;
    if (root.hasPointerCapture?.(drag.pointerId)) root.releasePointerCapture(drag.pointerId);
    if (!cancelled && event && drag.started) {
      drag.element.style.left = `${drag.rect.left + event.clientX - drag.startX}px`;
      drag.element.style.top = `${drag.rect.top + event.clientY - drag.startY}px`;
    }
    const currentRect = drag.element.getBoundingClientRect();
    const target = !cancelled && event
      ? targetConfig.find(candidate => {
          const rect = candidate.slot.getBoundingClientRect();
          return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        })
      : null;
    if (drag.started && target) {
      if (!syncRoundPlacement(drag.item.id, target.id, currentRect)) returnToOriginalParent(drag, currentRect);
    } else returnToOriginalParent(drag, currentRect);
  };

  root.addEventListener("pointerdown", event => {
    if (event.button > 0 || activeDrag || round.snapshot().status !== "editing") return;
    if (event.target.closest?.(".dnd-multimedia-audio-item__play, .dnd-multimedia-remove-option")) return;
    const element = event.target.closest?.("[data-item-id]");
    const item = element && itemsById.get(element.dataset.itemId);
    const itemState = item && stateByItem().get(item.id);
    if (!item || !itemState || itemState.locked || itemState.state === "correct") return;
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    activeDrag = {
      pointerId: event.pointerId,
      element,
      item,
      originalParent: element.parentElement,
      originalNext: element.nextElementSibling,
      originalStyle: element.style.cssText,
      originalState: itemState.state,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      started: false
    };
    const removeButton = removeButtonsByItemId.get(item.id);
    if (removeButton) removeButton.hidden = true;
    clearAudioPlayback();
    root.setPointerCapture(event.pointerId);
    element.dataset.dragState = "picked";
    element.dataset.state = "dragging";
    element.style.position = "fixed";
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    element.style.margin = "0";
    element.style.zIndex = "1000";
    element.style.pointerEvents = "none";
    element.style.transition = "none";
    root.append(element);
    element.dataset.dragState = "dragging";
  }, { passive: false });

  root.addEventListener("pointermove", event => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const drag = activeDrag;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.started && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!drag.started) {
      drag.started = true;
      DuduqSound.play("dragStart");
    }
    drag.element.style.left = `${drag.rect.left + dx}px`;
    drag.element.style.top = `${drag.rect.top + dy}px`;
  });
  root.addEventListener("pointerup", event => finishDrag(event));
  root.addEventListener("pointercancel", event => finishDrag(event, true));
  root.addEventListener("lostpointercapture", event => finishDrag(event, true));

  root.addEventListener("keydown", event => {
    if (event.target.closest?.(".dnd-multimedia-audio-item__play")) return;
    if (event.target.closest?.(".dnd-multimedia-remove-option")) return;
    const itemElement = event.target.closest?.("[data-item-id]");
    if (itemElement && (event.key === "Enter" || event.key === " ")) {
      const state = stateByItem().get(itemElement.dataset.itemId);
      if (!state || state.locked || round.snapshot().status !== "editing") return;
      event.preventDefault();
      selectedKeyboardItem = itemElement.dataset.itemId;
      const nextSlot = targetConfig.find(target => target.id !== state.currentTargetId) || targetConfig[0];
      nextSlot?.slot.focus();
      return;
    }
    const slot = event.target.closest?.("[data-drop-target-id]");
    const target = slot && targetsBySlot.get(slot);
    if (target && selectedKeyboardItem && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      const element = itemsById.get(selectedKeyboardItem)?.element;
      const rect = element?.getBoundingClientRect();
      if (element && rect) syncRoundPlacement(selectedKeyboardItem, target.id, rect);
      selectedKeyboardItem = null;
    }
  });

  window.DuduQDragDropMultimediaGame = Object.freeze({
    confirm: confirmAnswers,
    remove: removePlacedItem,
    getState: () => round.snapshot(),
    retry: retryIncorrectItems,
    get items() { return round.snapshot().items; },
    get targets() { return round.snapshot().targets; }
  });
  updateConfirmVisibility();
}

import { GameActionButton, CTAAttention } from "/core/ui/index.js";
import { DuduqSound } from "/core/audio/duduq-sound-system.js";
import { ResultFXLayer } from "/core/ui/result-fx.js";
import { Feedback } from "/test/matching/gold-master-candidate-v1/src/core-components.js";
import { createMultimediaRound } from "./drag-drop-multimedia-round.js";

const DRAG_THRESHOLD = 5;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initializeMultimediaDragDrop({ root, centralPanel, dragWordBank, targets, items: itemElements }) {
  const itemConfig = itemElements.map((element, order) => ({
    id: element.dataset.itemId,
    type: element.dataset.itemType,
    answerKey: element.dataset.answerKey,
    audioSrc: element.dataset.audioSrc || element.audioSrc || element.dataset.audio || "",
    element,
    homeOrder: order
  }));
  const targetConfig = targets.map(({ id, answerKey, slot, element }) => ({ id, answerKey, slot, element }));
  const round = createMultimediaRound({
    items: itemConfig.map(({ id, type, answerKey }) => ({ id, type, answerKey })),
    targets: targetConfig.map(({ id, answerKey }) => ({ id, answerKey }))
  });
  const itemsById = new Map(itemConfig.map(item => [item.id, item]));
  const targetsById = new Map(targetConfig.map(target => [target.id, target]));
  const removeButtonsByItemId = new Map();
  const stateByItem = () => new Map(round.snapshot().items.map(item => [item.id, item]));
  let activeDrag = null;
  let activeAudioItem = null;
  let activeContentAudio = null;
  let selectedKeyboardItem = null;
  let validationLocked = false;
  let completionSoundPlayed = false;
  let continueDispatched = false;

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
  confirmMotion.className = "dnd-multimedia-confirm-motion cta-attention-wrapper";
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
  const confirmAttention = CTAAttention(confirmButton, { delay: 700, repeat: 2000, target: confirmMotion });

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

  // The game root is a size container, so fixed descendants use it as their
  // containing block. Portal the same canonical footer to body only in the
  // enhanced fullscreen state so its fixed geometry is viewport-based.
  const syncFullscreenFeedbackOwner = () => {
    const fullscreen = root.dataset.duduqFullscreenEnhanced === "true";
    if (fullscreen && feedback.parentElement !== document.body) {
      document.body.append(feedback);
      feedback.dataset.fullscreenPortal = "true";
    } else if (!fullscreen && feedback.parentElement !== root) {
      delete feedback.dataset.fullscreenPortal;
      root.append(feedback);
    }
  };
  const fullscreenObserver = new MutationObserver(syncFullscreenFeedbackOwner);
  fullscreenObserver.observe(root, { attributes: true, attributeFilter: ["data-duduq-fullscreen-enhanced"] });
  syncFullscreenFeedbackOwner();

  const allPlaced = () => round.snapshot().placedCount === itemConfig.length;
  const updateConfirmVisibility = () => {
    const state = round.snapshot();
    const visible = state.status === "editing" && allPlaced() && !validationLocked;
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
    if (item) item.removeAttribute("data-playing");
    if (audio) {
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
    if (validationLocked || round.snapshot().status !== "editing") return false;
    const state = stateByItem().get(itemId);
    const item = itemsById.get(itemId);
    if (!state?.currentTargetId || state.locked || !item || !round.remove(itemId)) return false;
    const fromRect = item.element.getBoundingClientRect();
    item.element.dataset.state = "idle";
    item.element.removeAttribute("data-placement");
    item.element.removeAttribute("data-locked");
    item.element.removeAttribute("aria-disabled");
    item.element.setAttribute("aria-label", item.type === "audio" ? "Áudio FISH para arrastar; botão para ouvir." : "Texto FISH para arrastar.");
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
    item.element.setAttribute("aria-label", `${item.type === "audio" ? "Áudio" : "Texto"} FISH colocado. Pressione Enter para mover.`);
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
  const confirmAnswers = () => {
    if (validationLocked || round.snapshot().status !== "editing" || !allPlaced()) return;
    validationLocked = true;
    confirmAttention.stop();
    confirmMotion.hidden = true;
    clearAudioPlayback();
    DuduqSound.play("uiClick");
    const result = round.validate();
    validationLocked = false;
    if (!result) {
      updateConfirmVisibility();
      return;
    }
    refreshTargetPresentation();
    if (result.outcome === "incorrect") {
      DuduqSound.play("error");
      window.setTimeout(() => DuduqSound.playVoice("error"), 140);
      window.setTimeout(() => {
        Feedback(feedback, window.DuduQAssets?.assets, "incorrect", retryIncorrectItems);
        feedback.querySelector('[data-slot="feedback-title"]').textContent = "Ops!";
        feedback.querySelector('[data-slot="feedback-detail"]').textContent = "Revise os itens e tente novamente.";
        feedback.querySelector('[data-slot="feedback-action"]').textContent = "TENTAR DE NOVO";
      }, 180);
      root.dispatchEvent(new CustomEvent("dnd-multimedia:answer-validated", { bubbles: true, detail: { ...result, questionComplete: false } }));
      return;
    }

    DuduqSound.play("correct");
    resultFxLayer.dispatchEvent(new CustomEvent("activity-success", { bubbles: true, detail: { source: "drag-drop-multimedia" } }));
    window.setTimeout(() => {
      DuduqSound.playVoice("correct", { onEnded: completeQuestion }).then(started => { if (!started) completeQuestion(); });
    }, 140);
    window.setTimeout(() => {
      Feedback(feedback, window.DuduQAssets?.assets, "correct", continueActivity);
      feedback.querySelector('[data-slot="feedback-title"]').textContent = "Correto!";
      feedback.querySelector('[data-slot="feedback-detail"]').textContent = "Você associou os itens corretamente.";
      feedback.querySelector('[data-slot="feedback-action"]').textContent = "CONTINUAR";
    }, 180);
    root.dispatchEvent(new CustomEvent("dnd-multimedia:question-complete", { bubbles: true, detail: { ...result, questionComplete: true } }));
  };
  function completeQuestion() {
    if (completionSoundPlayed) return;
    completionSoundPlayed = true;
    DuduqSound.play("complete");
  }
  function retryIncorrectItems() {
    if (round.snapshot().status !== "retry") return;
    DuduqSound.play("uiClick");
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
      item.element.setAttribute("aria-label", item.type === "audio" ? "Áudio FISH para arrastar; botão para ouvir." : "Texto FISH para arrastar.");
      item.element.tabIndex = 0;
      insertInBankOrder(item.element);
    }
    refreshTargetPresentation();
    selectedKeyboardItem = null;
    updateConfirmVisibility();
    itemsById.get(returnedIds[0])?.element.focus();
  }
  function continueActivity() {
    if (continueDispatched || !round.continueActivity()) return;
    continueDispatched = true;
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
    const playButton = item.element.querySelector(".dnd-multimedia-audio-item__play");
    const audioSource = item.audioSrc;
    if (!audioSource) {
      playButton?.setAttribute("disabled", "");
      playButton?.setAttribute("aria-disabled", "true");
      playButton?.setAttribute("title", "Áudio de conteúdo ainda não configurado");
      continue;
    }
    playButton?.addEventListener("pointerdown", event => { event.stopPropagation(); });
    playButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (round.snapshot().status !== "editing" || round.snapshot().items.find(state => state.id === item.id)?.locked) return;
      clearAudioPlayback();
      const audio = new Audio(audioSource);
      activeContentAudio = audio;
      activeAudioItem = item.element;
      const clearPlayingState = () => {
        if (activeContentAudio !== audio) return;
        if (activeAudioItem === item.element) activeAudioItem = null;
        activeContentAudio = null;
        item.element.removeAttribute("data-playing");
      };
      audio.addEventListener("playing", () => {
        if (activeContentAudio === audio) item.element.dataset.playing = "true";
      });
      audio.addEventListener("ended", clearPlayingState, { once: true });
      audio.addEventListener("pause", clearPlayingState, { once: true });
      audio.addEventListener("error", clearPlayingState, { once: true });
      audio.play().catch(clearPlayingState);
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
    if (event.button > 0 || activeDrag || validationLocked || round.snapshot().status !== "editing") return;
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
    if (slot && selectedKeyboardItem && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      const element = itemsById.get(selectedKeyboardItem)?.element;
      const rect = element?.getBoundingClientRect();
      if (element && rect) syncRoundPlacement(selectedKeyboardItem, slot.dataset.dropTargetId, rect);
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

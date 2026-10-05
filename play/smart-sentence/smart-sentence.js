import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD, ResultFX } from "/core/ui/index.js";
import { DuduqSound } from "/core/audio/duduq-sound-system.js";
import "/core/duduq-transition.js";
import { DuduQSmartSentenceEngine } from "/core/duduq-smart-sentence-engine.js";
import { Feedback, PrimaryAction } from "/test/matching/gold-master-candidate-v1/src/core-components.js";

const root = document.querySelector("#game");
if (!root) throw new Error("Smart Sentence root was not found.");
const mode = new URLSearchParams(window.location.search).get("mode")?.trim().toLowerCase() || "combined";

function playCanonicalResult(outcome, resultFx) {
  resultFx.trigger(outcome);
  DuduqSound.play(outcome === "correct" ? "correct" : "error");
  window.setTimeout(() => DuduqSound.playVoice(outcome === "correct" ? "correct" : "error"), 140);
}

const activity = Object.freeze({
  id: "smart-sentence-complete-dog",
  mechanic: "smart-sentence",
  rounds: Object.freeze([Object.freeze({
    id: "complete-dog",
    mode: "complete",
    prompt: Object.freeze({ eyebrow: "CHOOSE THE MISSING WORD", question: "COMPLETE THE SENTENCE.", audio: "Complete the sentence." }),
    sentence: Object.freeze([
      Object.freeze({ type: "text", value: "THE" }),
      Object.freeze({ type: "slot", id: "missing-word", answerKey: "dog" }),
      Object.freeze({ type: "text", value: "IS ON THE BED." })
    ]),
    options: Object.freeze([
      Object.freeze({ id: "dog", label: "DOG", answerKey: "dog", asset: "smart-sentence-new-component.png" }),
      Object.freeze({ id: "fish-1", label: "FISH", answerKey: "fish", asset: "smart-sentence-next-card.png" }),
      Object.freeze({ id: "cat", label: "CAT", answerKey: "cat", asset: "smart-sentence-card-cat.png" }),
      Object.freeze({ id: "fish-2", label: "FISH", answerKey: "fish", asset: "smart-sentence-card-fish-2.png" })
    ]),
    answer: Object.freeze(["dog"])
  })])
});

const orderPrompt = Object.freeze({
  eyebrow: "PUT THE WORDS IN ORDER",
  question: "BUILD THE CORRECT SENTENCE.",
  audio: "Build the correct sentence."
});
const orderRound = Object.freeze({
  id: "order-words-01",
  mode: "order",
  prompt: orderPrompt,
  options: Object.freeze([
    Object.freeze({ id: "eu", label: "EU", answerKey: "eu" }),
    Object.freeze({ id: "cachorro", label: "CACHORRO", answerKey: "cachorro" }),
    Object.freeze({ id: "gosto", label: "GOSTO", answerKey: "gosto" }),
    Object.freeze({ id: "de", label: "DE", answerKey: "de" })
  ]),
  answer: Object.freeze(["eu", "gosto", "de", "cachorro"])
});
const combinedActivity = Object.freeze({
  id: "smart-sentence-complete-and-order-v1",
  mechanic: "smart-sentence",
  rounds: Object.freeze([activity.rounds[0], orderRound])
});
const SMART_SENTENCE_TRANSITION_TIMING = Object.freeze({ cover: 190, reveal: 230, preparation: 380, cardHold: 520 });

if (mode === "combined") {
  root.className = "game-screen target-shooter-screen duduq-shared-gold-shell smart-sentence-screen";
  root.innerHTML = `<div class="world-backdrop" aria-hidden="true"></div><div class="readability-veil" aria-hidden="true"></div><section class="game-shell smart-sentence-shell" aria-label="Smart Sentence activity"><div data-header-slot></div><div data-question-slot></div><div class="smart-sentence-combined-round" data-round-area></div></section><div class="result-fx-layer success-celebration-layer" aria-hidden="true"></div><section class="feedback-ribbon" data-feedback="" aria-live="polite" aria-atomic="true" hidden><img class="feedback-mascot" data-asset="feedback-mascot" alt=""><div class="feedback-copy"><h2 data-slot="feedback-title"></h2><p data-slot="feedback-detail"></p></div><button class="feedback-action game-button" type="button"><span data-slot="feedback-action"></span></button></section><main class="official-transition smart-sentence-official-transition" aria-live="polite" aria-label="Transição para a próxima etapa" hidden><header class="transition-hud" aria-label="Progresso da atividade"><div class="transition-hud-brand"><img class="transition-hud-mascot" data-asset="transition-hud-mascot" alt=""><div><strong>SMART SENTENCE</strong><span>Complete a frase e organize as palavras.</span></div></div><div class="transition-hud-meter" role="progressbar" aria-label="Progresso da atividade" aria-valuemin="0" aria-valuemax="2" aria-valuenow="2"><i></i></div><b class="transition-hud-count">2 / 2</b><span class="transition-hud-fullscreen" aria-hidden="true">⌗</span></header><section class="official-transition-card"><div class="transition-mascot-scale"><img class="official-transition-mascot" data-asset="transition-mascot" alt="DuduQ celebrando"></div><h1 class="official-transition-title">Muito bem!</h1><p class="official-transition-copy">Preparando a próxima etapa...</p><div class="official-transition-progress" aria-label="Carregando a próxima etapa"><span></span></div><p class="official-transition-next">Sua próxima etapa está chegando!</p><div class="official-transition-dots" aria-hidden="true"><i></i><i></i><i></i></div></section></main>`;
  root.querySelector(".world-backdrop").style.backgroundImage = `url("${window.DuduQAssets?.assets?.backgrounds?.["1"] || ""}")`;

  const engine = new DuduQSmartSentenceEngine(combinedActivity);
  const header = DuduQCanonicalHeaderHUD({ title: "SMART SENTENCE", progressCurrent: 1, progressTotal: combinedActivity.rounds.length, progressArtwork: "penpot-official-board", mascot: "/core/assets/duduq-hud-mascot.png" });
  header.dataset.mechanic = "matching";
  root.querySelector("[data-header-slot]").replaceWith(header);
  const questionHud = DuduQCanonicalQuestionHUD(combinedActivity.rounds[0].prompt);
  root.querySelector("[data-question-slot]").replaceWith(questionHud);

  const roundArea = root.querySelector("[data-round-area]");
  const feedback = root.querySelector(".feedback-ribbon");
  const officialTransition = root.querySelector(".smart-sentence-official-transition");
  const resultFx = ResultFX(root.querySelector(".success-celebration-layer"));
  let mountedRound = "";
  let activeUi = null;

  function placeRoundElements() {
    if (activeUi?.mode !== "order") return;
    const { panel, targets, cards, confirmButton } = activeUi;
    const assetScale = panel.getBoundingClientRect().width / 1276;
    const panelTop = questionHud.getBoundingClientRect().bottom + 29;
    const panelRect = panel.getBoundingClientRect();
    const shellRect = root.querySelector(".smart-sentence-shell").getBoundingClientRect();
    panel.style.top = `${panelTop - shellRect.top - 27 * assetScale}px`;
    for (const [index, target] of targets.entries()) {
      const x = [149, 419, 693, 965][index];
      const y = [392, 392, 392, 393][index];
      target.style.left = `${panelRect.left + 27 * assetScale - shellRect.left + (x - 79) * assetScale}px`;
      target.style.top = `${panelTop - shellRect.top + (y - 256) * assetScale}px`;
      target.style.width = `${246 * assetScale}px`;
      target.style.height = `${87 * assetScale}px`;
    }
    for (const [index, card] of cards.entries()) {
      const x = [90, 392, 694, 996][index];
      card.style.left = `${panelRect.left + 27 * assetScale - shellRect.left + (x - 79 - 11) * assetScale}px`;
      card.style.top = `${panelTop - shellRect.top + ([659, 659, 659, 659][index] - 256 - 15) * assetScale}px`;
      card.style.width = `${306 * assetScale}px`;
      card.style.height = `${125 * assetScale}px`;
    }
    const confirmHeight = 94 * assetScale;
    confirmButton.style.top = `${Math.max(0, Math.min(panelRect.bottom - shellRect.top + 16, root.clientHeight - confirmHeight - 16))}px`;
    confirmButton.style.left = "50%";
    confirmButton.style.transform = "translateX(-50%)";
    confirmButton.style.width = `${Math.min(315, 315 * assetScale)}px`;
    confirmButton.style.height = `${Math.min(94, 94 * assetScale)}px`;
  }

  function createCompleteRound(round) {
    roundArea.hidden = false;
    roundArea.innerHTML = `<section class="smart-sentence-panel" aria-label="Complete the sentence"><img class="smart-sentence-panel-full" src="./assets/smart-sentence-component.png" alt=""><img class="smart-sentence-image-card" src="./assets/smart-sentence-image-card.png" alt="A dog"><div class="smart-sentence-answer-slot" data-answer-slot aria-label="Answer space"><span class="smart-sentence-drop-slot-backing" aria-hidden="true"></span><img class="smart-sentence-drop-slot-visual" src="./assets/smart-sentence-drop-slot-official.png" alt=""><img class="smart-sentence-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden><button class="smart-sentence-remove-option" type="button" aria-label="Remove selected word and choose another" title="Remove selected word"><img src="./assets/smart-sentence-remove-option-official.png" alt=""></button></div><div class="smart-sentence-options" data-option-bank aria-label="Word options"></div><button class="primary-action smart-sentence-confirm-action" type="button" aria-label="Confirmar" hidden disabled><img class="smart-sentence-confirm-visual" src="./assets/smart-sentence-confirm-button-penpot.png" alt="" aria-hidden="true"><span class="smart-sentence-confirm-label" data-slot="action"></span></button></section>`;
    const panel = roundArea.querySelector(".smart-sentence-panel");
    const bank = roundArea.querySelector("[data-option-bank]");
    const slot = roundArea.querySelector("[data-answer-slot]");
    const slotVisual = slot.querySelector(".smart-sentence-drop-slot-visual");
    const incorrectIcon = slot.querySelector(".smart-sentence-incorrect-icon");
    const removeButton = slot.querySelector(".smart-sentence-remove-option");
    const confirmButton = roundArea.querySelector(".smart-sentence-confirm-action");
    const answerText = document.createElement("span");
    answerText.className = "smart-sentence-answer-text";
    answerText.setAttribute("aria-hidden", "true");
    slot.append(answerText);
    const buttons = new Map();
    const gestures = new Map();
    for (const option of round.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "smart-sentence-option";
      button.setAttribute("aria-label", `Choose ${option.label}`);
      button.setAttribute("aria-pressed", "false");
      const image = document.createElement("img");
      image.src = `./assets/${option.asset}`;
      image.alt = "";
      image.draggable = false;
      button.append(image);
      bank.append(button);
      buttons.set(option.id, button);
    }
    const choose = (id) => engine.status === "playing" ? engine.select(id) : null;
    removeButton.addEventListener("click", () => {
      const selected = engine.snapshot().selected[0];
      if (selected && engine.status === "playing") engine.remove(selected.id);
    });
    PrimaryAction(confirmButton, "CONFIRMAR", confirmCurrentRound);
    for (const [optionId, button] of buttons) {
      button.addEventListener("pointerdown", (event) => {
        if (button.disabled || event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        gestures.set(event.pointerId, { optionId, button, startX: event.clientX, startY: event.clientY, moved: false });
        button.setPointerCapture?.(event.pointerId);
      });
      button.addEventListener("pointermove", (event) => {
        const gesture = gestures.get(event.pointerId);
        if (!gesture) return;
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        if (!gesture.moved && Math.hypot(dx, dy) >= 7) { gesture.moved = true; button.classList.add("is-dragging"); }
        if (gesture.moved) button.style.transform = `translate3d(${dx}px,${dy}px,0)`;
      });
      button.addEventListener("pointerup", (event) => {
        const gesture = gestures.get(event.pointerId);
        if (!gesture) return;
        gestures.delete(event.pointerId);
        button.releasePointerCapture?.(event.pointerId);
        const rect = slot.getBoundingClientRect();
        const droppedInside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        button.classList.remove("is-dragging");
        button.style.removeProperty("transform");
        if (!gesture.moved) choose(optionId);
        else if (droppedInside && choose(optionId)) DuduqSound.play("snap");
      });
      button.addEventListener("pointercancel", (event) => {
        gestures.delete(event.pointerId);
        button.classList.remove("is-dragging");
        button.style.removeProperty("transform");
      });
      button.addEventListener("click", (event) => { if (event.detail === 0) choose(optionId); });
    }
    return {
      mode: "complete",
      render(snapshot) {
        const selected = snapshot.selected[0] || null;
        bank.hidden = Boolean(selected) || snapshot.status === "correct" || snapshot.status === "incorrect" || snapshot.status === "completed";
        for (const option of round.options) {
          const button = buttons.get(option.id);
          const selectedOption = option.id === selected?.id;
          button.hidden = selectedOption;
          button.disabled = snapshot.status !== "playing";
          button.classList.toggle("is-selected", selectedOption);
          button.setAttribute("aria-pressed", String(selectedOption));
        }
        answerText.textContent = selected?.label || "";
        const visualState = snapshot.status === "correct" ? "correct" : snapshot.status === "incorrect" ? "incorrect" : selected ? "selected" : "empty";
        slotVisual.src = `./assets/${({ correct: "smart-sentence-slot-correct-penpot-official.png", incorrect: "smart-sentence-slot-incorrect-penpot-official.png", selected: "smart-sentence-slot-selected-official.png", empty: "smart-sentence-drop-slot-official.png" })[visualState]}`;
        slot.dataset.visualState = visualState;
        incorrectIcon.hidden = visualState !== "incorrect";
        removeButton.hidden = !selected || snapshot.status !== "playing";
        removeButton.disabled = !selected || snapshot.status !== "playing";
        confirmButton.hidden = !selected || snapshot.status !== "playing";
        confirmButton.disabled = !selected || !snapshot.canConfirm;
      }
    };
  }

  function createOrderRound(round) {
    roundArea.hidden = false;
    const targetsMarkup = ["", "-02", "-03", "-04"].map((suffix, index) => `<div class="smart-sentence-order-drop-target-official" data-index="${index}"><img src="./assets/smart-sentence-order-drop-target${suffix}-official.svg" alt="" aria-hidden="true"><span>ARRASTE AQUI</span><span class="smart-sentence-order-placed-word" hidden></span><button class="smart-sentence-remove-option smart-sentence-order-remove-option" type="button" aria-label="Remover palavra desta posição" title="Remover palavra"><img src="./assets/smart-sentence-remove-option-official.png" alt=""></button><img class="smart-sentence-order-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden></div>`).join("");
    roundArea.innerHTML = `<img class="smart-sentence-order-panel-component" src="./assets/smart-sentence-order-panel-penpot-official.svg" alt="" aria-hidden="true">${targetsMarkup}<div class="smart-sentence-order-card-bank"></div><button class="primary-action smart-sentence-order-confirm-action" type="button" aria-label="Confirmar" hidden disabled><img class="smart-sentence-confirm-visual" src="./assets/smart-sentence-confirm-button-penpot.png" alt="" aria-hidden="true"><span class="smart-sentence-confirm-label" data-slot="action"></span></button>`;
    const panel = roundArea.querySelector(".smart-sentence-order-panel-component");
    const targets = [...roundArea.querySelectorAll(".smart-sentence-order-drop-target-official")];
    const cards = round.options.map((option, index) => {
      const card = document.createElement("div");
      card.className = "smart-sentence-order-drag-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Arrastar ou selecionar ${option.label}`);
      card.dataset.optionId = option.id;
      const image = document.createElement("img");
      image.className = "smart-sentence-order-drag-card-visual";
      image.src = `./assets/smart-sentence-order-drag-card-question${["", "-02", "-03", "-04"][index]}-official.svg`;
      image.alt = "";
      const label = document.createElement("span");
      label.textContent = option.label;
      card.append(image, label);
      roundArea.querySelector(".smart-sentence-order-card-bank").append(card);
      return card;
    });
    const confirmButton = roundArea.querySelector(".smart-sentence-order-confirm-action");
    const orderNodes = [...roundArea.children];
    root.querySelector(".smart-sentence-shell").append(...orderNodes);
    roundArea.hidden = true;
    const slotForPoint = (x, y) => targets.findIndex((target) => { const rect = target.getBoundingClientRect(); return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; });
    const firstEmpty = () => engine.snapshot().selected.findIndex((item) => !item);
    const removeButtons = targets.map((target) => target.querySelector(".smart-sentence-remove-option"));
    removeButtons.forEach((button, index) => button.addEventListener("click", (event) => {
      event.preventDefault(); event.stopPropagation();
      const option = engine.snapshot().selected[index];
      if (option && engine.status === "playing") engine.remove(option.id);
    }));
    const placedLabels = targets.map((target) => target.querySelector(".smart-sentence-order-placed-word"));
    placedLabels.forEach((label) => {
      label.addEventListener("click", () => { const id = label.dataset.optionId; if (id && engine.status === "playing") engine.remove(id); });
      label.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const id = label.dataset.optionId; if (id && engine.status === "playing") engine.remove(id); } });
    });
    PrimaryAction(confirmButton, "CONFIRMAR", confirmCurrentRound);
    for (const card of cards) {
      card.addEventListener("pointerdown", (event) => {
        if (engine.status !== "playing" || event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        card.setPointerCapture?.(event.pointerId);
        card.dataset.startX = String(event.clientX); card.dataset.startY = String(event.clientY); card.dataset.moved = "false";
      });
      card.addEventListener("pointermove", (event) => {
        if (!card.hasPointerCapture?.(event.pointerId)) return;
        const dx = event.clientX - Number(card.dataset.startX); const dy = event.clientY - Number(card.dataset.startY);
        if (Math.hypot(dx, dy) > 6) card.dataset.moved = "true";
        if (card.dataset.moved === "true") { card.classList.add("is-dragging"); card.style.transform = `translate3d(${dx}px,${dy}px,0)`; }
      });
      card.addEventListener("pointerup", (event) => {
        if (!card.hasPointerCapture?.(event.pointerId)) return;
        const moved = card.dataset.moved === "true"; const targetIndex = slotForPoint(event.clientX, event.clientY);
        card.releasePointerCapture?.(event.pointerId); card.classList.remove("is-dragging"); card.style.removeProperty("transform");
        card.dataset.suppressClick = "true"; window.setTimeout(() => { delete card.dataset.suppressClick; }, 0);
        if (moved && targetIndex >= 0 && engine.place(card.dataset.optionId, targetIndex)) DuduqSound.play("snap");
        else if (!moved) { const index = firstEmpty(); if (index >= 0) engine.place(card.dataset.optionId, index); }
      });
      card.addEventListener("pointercancel", (event) => { if (card.hasPointerCapture?.(event.pointerId)) card.releasePointerCapture(event.pointerId); card.classList.remove("is-dragging"); card.style.removeProperty("transform"); });
      card.addEventListener("click", () => { if (card.dataset.suppressClick === "true" || engine.status !== "playing") return; const index = firstEmpty(); if (index >= 0) engine.place(card.dataset.optionId, index); });
      card.addEventListener("keydown", (event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); const index = firstEmpty(); if (index >= 0) engine.place(card.dataset.optionId, index); });
    }
    window.addEventListener("resize", placeRoundElements, { passive: true });
    return {
      mode: "order",
      panel,
      targets,
      cards,
      confirmButton,
      destroy() { orderNodes.forEach((node) => node.remove()); roundArea.hidden = false; },
      render(snapshot) {
        const selected = snapshot.selected;
        targets.forEach((target, index) => {
          const option = selected[index];
          const isIncorrect = snapshot.status === "incorrect" && option && option.answerKey !== round.answer[index];
          const isCorrect = snapshot.status === "correct" || snapshot.status === "incorrect" && option && option.answerKey === round.answer[index];
          const visual = isIncorrect ? "incorrect" : isCorrect ? "correct" : option ? "selected" : "empty";
          target.dataset.visualState = visual;
          target.querySelector(":scope > img:first-child").src = `./assets/${visual === "empty" ? `smart-sentence-order-drop-target${["", "-02", "-03", "-04"][index]}-official.svg` : `smart-sentence-slot-${visual === "selected" ? "selected-official.png" : `${visual}-penpot-official.png`}`}`;
          const placeholder = target.querySelector(":scope > span:first-of-type");
          const label = placedLabels[index];
          placeholder.hidden = Boolean(option); label.hidden = !option; label.textContent = option?.label || ""; label.dataset.optionId = option?.id || "";
          label.setAttribute("role", option && snapshot.status === "playing" ? "button" : "img");
          label.setAttribute("tabindex", option && snapshot.status === "playing" ? "0" : "-1");
          target.querySelector(".smart-sentence-order-incorrect-icon").hidden = !isIncorrect;
          removeButtons[index].hidden = !option || snapshot.status !== "playing";
          removeButtons[index].disabled = !option || snapshot.status !== "playing";
        });
        cards.forEach((card) => { card.hidden = selected.some((option) => option?.id === card.dataset.optionId) || snapshot.status === "correct" || snapshot.status === "completed"; });
        confirmButton.hidden = !snapshot.canConfirm || snapshot.status !== "playing";
        confirmButton.disabled = !snapshot.canConfirm || snapshot.status !== "playing";
        placeRoundElements();
      }
    };
  }

  function confirmCurrentRound() {
    const result = engine.confirm();
    if (!result) return;
    const outcome = result.correct ? "correct" : "incorrect";
    playCanonicalResult(outcome, resultFx);
    const snapshot = engine.snapshot();
    Feedback(feedback, window.DuduQAssets?.assets, outcome, () => {
      feedback.hidden = true;
      if (outcome === "incorrect") {
        engine.retry();
        const current = engine.snapshot();
        if (current.round.mode === "complete") current.selected.forEach((option) => engine.remove(option.id));
        else current.selected.forEach((option, index) => { if (option && option.answerKey !== current.round.answer[index]) engine.remove(option.id); });
      } else if (snapshot.roundIndex < snapshot.totalRounds - 1) {
        void advanceToNextRound();
      } else engine.continue();
    });
    feedback.querySelector('[data-slot="feedback-title"]').textContent = outcome === "correct" ? "Correto!" : "Ops!";
    feedback.querySelector('[data-slot="feedback-detail"]').textContent = outcome === "correct"
      ? snapshot.round.mode === "complete" ? "A frase está completa." : "As palavras estão na ordem correta."
      : snapshot.round.mode === "complete" ? "Escolha outra palavra e tente novamente." : "Reorganize as palavras e tente novamente.";
    feedback.querySelector('[data-slot="feedback-action"]').textContent = outcome === "correct" ? "CONTINUAR" : "TENTAR NOVAMENTE";
  }

  async function advanceToNextRound() {
    const transition = window.DuduQTransition;
    if (typeof transition?.swap !== "function") throw new Error("DuduQ canonical transition is unavailable.");
    const options = {
      target: root,
      coverDurationMs: SMART_SENTENCE_TRANSITION_TIMING.cover,
      revealDurationMs: SMART_SENTENCE_TRANSITION_TIMING.reveal,
      soundEnabled: false
    };
    const transitionMascot = officialTransition.querySelector('[data-asset="transition-mascot"]');
    const hudMascot = officialTransition.querySelector('[data-asset="transition-hud-mascot"]');
    const progress = officialTransition.querySelector(".official-transition-progress span");
    officialTransition.style.backgroundImage = `url("${window.DuduQAssets?.assets?.backgrounds?.["1"] || ""}")`;
    transitionMascot.src = window.DuduQAssets?.assets?.mascots?.correct || "";
    hudMascot.src = window.DuduQAssets?.assets?.mascots?.hud || window.DuduQAssets?.assets?.mascots?.correct || "";
    progress.style.animation = "none";
    progress.getBoundingClientRect();
    progress.style.removeProperty("animation");

    await transition.swap(async () => {
      officialTransition.hidden = false;
      await Promise.all([
        transitionMascot.decode?.().catch(() => {}),
        hudMascot.decode?.().catch(() => {}),
        new Promise((resolve) => window.setTimeout(resolve, SMART_SENTENCE_TRANSITION_TIMING.preparation))
      ]);
    }, options);
    await new Promise((resolve) => window.setTimeout(resolve, SMART_SENTENCE_TRANSITION_TIMING.cardHold));
    return transition.swap(() => {
      officialTransition.hidden = true;
      engine.continue();
    }, options);
  }

  function renderCombined(snapshot = engine.snapshot()) {
    header.setProgress(snapshot.roundNumber, snapshot.totalRounds);
    DuduQCanonicalQuestionHUD({ root: questionHud, ...snapshot.round.prompt });
    roundArea.dataset.mode = snapshot.round.mode;
    const key = `${snapshot.roundIndex}:${snapshot.round.mode}`;
    if (key !== mountedRound) {
      if (activeUi?.mode === "order") window.removeEventListener("resize", placeRoundElements);
      activeUi?.destroy?.();
      mountedRound = key;
      const roundConfig = combinedActivity.rounds[snapshot.roundIndex];
      activeUi = snapshot.round.mode === "complete" ? createCompleteRound(roundConfig) : createOrderRound(roundConfig);
    }
    activeUi.render(snapshot);
    root.dataset.smartSentenceStatus = snapshot.status;
    root.dataset.smartSentenceMode = snapshot.round.mode;
  }
  engine.onStateChange(renderCombined);
  if ("ResizeObserver" in window) {
    const combinedLayoutObserver = new ResizeObserver(placeRoundElements);
    combinedLayoutObserver.observe(root);
    combinedLayoutObserver.observe(questionHud);
  }
  engine.start();
  window.DuduQSmartSentenceShell = Object.freeze({ header, mode, engine, activity: combinedActivity });
} else if (mode === "order") {
  const prompt = Object.freeze({
    eyebrow: "PUT THE WORDS IN ORDER",
    question: "BUILD THE CORRECT SENTENCE.",
    audio: "Build the correct sentence."
  });

  root.className = "game-screen target-shooter-screen duduq-shared-gold-shell smart-sentence-screen";
  const orderActivity = Object.freeze({ id: "smart-sentence-order-demo", mechanic: "smart-sentence", rounds: Object.freeze([Object.freeze({
    id: "order-words-01", mode: "order", prompt,
    options: Object.freeze([
      Object.freeze({ id: "eu", label: "EU", answerKey: "eu" }),
      Object.freeze({ id: "cachorro", label: "CACHORRO", answerKey: "cachorro" }),
      Object.freeze({ id: "gosto", label: "GOSTO", answerKey: "gosto" }),
      Object.freeze({ id: "de", label: "DE", answerKey: "de" })
    ]),
    answer: Object.freeze(["eu", "gosto", "de", "cachorro"])
  })]) });
  const engine = new DuduQSmartSentenceEngine(orderActivity);
  root.innerHTML = `<div class="world-backdrop" aria-hidden="true"></div><div class="readability-veil" aria-hidden="true"></div><section class="game-shell smart-sentence-shell" aria-label="Smart Sentence activity"><div data-header-slot></div><div data-question-slot></div><img class="smart-sentence-order-panel-component" src="./assets/smart-sentence-order-panel-penpot-official.svg" alt="" aria-hidden="true"><div class="smart-sentence-order-drop-target-official" data-layout-x="149" data-layout-y="392"><img src="./assets/smart-sentence-order-drop-target-official.svg" alt="" aria-hidden="true"><span>ARRASTE AQUI</span><span class="smart-sentence-order-placed-word" hidden></span><img class="smart-sentence-order-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden></div><div class="smart-sentence-order-drop-target-official" data-layout-x="419" data-layout-y="392"><img src="./assets/smart-sentence-order-drop-target-02-official.svg" alt="" aria-hidden="true"><span>ARRASTE AQUI</span><span class="smart-sentence-order-placed-word" hidden></span><img class="smart-sentence-order-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden></div><div class="smart-sentence-order-drop-target-official" data-layout-x="693" data-layout-y="392"><img src="./assets/smart-sentence-order-drop-target-03-official.svg" alt="" aria-hidden="true"><span>ARRASTE AQUI</span><span class="smart-sentence-order-placed-word" hidden></span><img class="smart-sentence-order-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden></div><div class="smart-sentence-order-drop-target-official" data-layout-x="965" data-layout-y="393"><img src="./assets/smart-sentence-order-drop-target-04-official.svg" alt="" aria-hidden="true"><span>ARRASTE AQUI</span><span class="smart-sentence-order-placed-word" hidden></span><img class="smart-sentence-order-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden></div><img class="smart-sentence-order-drag-card" src="./assets/smart-sentence-order-drag-card-question-official.svg" data-layout-x="90" data-layout-y="659" alt="" aria-hidden="true"><img class="smart-sentence-order-drag-card" src="./assets/smart-sentence-order-drag-card-question-02-official.svg" data-layout-x="392" data-layout-y="659" alt="" aria-hidden="true"><img class="smart-sentence-order-drag-card" src="./assets/smart-sentence-order-drag-card-question-03-official.svg" data-layout-x="694" data-layout-y="659" alt="" aria-hidden="true"><img class="smart-sentence-order-drag-card" src="./assets/smart-sentence-order-drag-card-question-04-official.svg" data-layout-x="996" data-layout-y="659" alt="" aria-hidden="true"><button class="primary-action smart-sentence-order-confirm-action" type="button" aria-label="Confirmar" hidden disabled><img class="smart-sentence-confirm-visual" src="./assets/smart-sentence-confirm-button-penpot.png" alt="" aria-hidden="true"><span class="smart-sentence-confirm-label" data-slot="action"></span></button></section><div class="result-fx-layer success-celebration-layer" aria-hidden="true"></div><section class="feedback-ribbon" data-feedback="" aria-live="polite" aria-atomic="true" hidden><img class="feedback-mascot" data-asset="feedback-mascot" alt=""><div class="feedback-copy"><h2 data-slot="feedback-title"></h2><p data-slot="feedback-detail"></p></div><button class="feedback-action game-button" type="button"><span data-slot="feedback-action"></span></button></section>`;
  root.querySelector(".world-backdrop").style.backgroundImage = `url("${window.DuduQAssets?.assets?.backgrounds?.["1"] || ""}")`;

  const header = DuduQCanonicalHeaderHUD({ title: "SMART SENTENCE", progressCurrent: 1, progressTotal: 3, progressArtwork: "penpot-official-board", mascot: "/core/assets/duduq-hud-mascot.png" });
  header.dataset.mechanic = "matching";
  root.querySelector("[data-header-slot]").replaceWith(header);
  const questionHud = DuduQCanonicalQuestionHUD(prompt);
  root.querySelector("[data-question-slot]").replaceWith(questionHud);

  const orderPanel = root.querySelector(".smart-sentence-order-panel-component");
  const dropTargets = [...root.querySelectorAll(".smart-sentence-order-drop-target-official")];
  const feedback = root.querySelector(".feedback-ribbon");
  const resultFx = ResultFX(root.querySelector(".success-celebration-layer"));
  const confirmButton = root.querySelector(".smart-sentence-order-confirm-action");
  const targetImages = dropTargets.map((target) => target.querySelector(":scope > img"));
  const placeholderLabels = dropTargets.map((target) => target.querySelector(":scope > span:first-of-type"));
  const placedLabels = dropTargets.map((target) => target.querySelector(".smart-sentence-order-placed-word"));
  const incorrectIcons = dropTargets.map((target) => target.querySelector(".smart-sentence-order-incorrect-icon"));
  const removeButtons = dropTargets.map((target) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "smart-sentence-remove-option smart-sentence-order-remove-option";
    button.setAttribute("aria-label", "Remover palavra desta posição");
    button.title = "Remover palavra";
    const icon = document.createElement("img");
    icon.src = "./assets/smart-sentence-remove-option-official.png";
    icon.alt = "";
    button.append(icon);
    target.append(button);
    return button;
  });
  const targetBaseAssets = ["smart-sentence-order-drop-target-official.svg", "smart-sentence-order-drop-target-02-official.svg", "smart-sentence-order-drop-target-03-official.svg", "smart-sentence-order-drop-target-04-official.svg"];
  const stateAssets = { selected: "smart-sentence-slot-selected-official.png", correct: "smart-sentence-slot-correct-penpot-official.png", incorrect: "smart-sentence-slot-incorrect-penpot-official.png" };
  const dragCardLabels = orderActivity.rounds[0].options.map((option) => option.label);
  const dragCards = [...root.querySelectorAll("img.smart-sentence-order-drag-card")].map((image, index) => {
    const card = document.createElement("div");
    card.className = "smart-sentence-order-drag-card";
    card.dataset.layoutX = image.dataset.layoutX;
    card.dataset.layoutY = image.dataset.layoutY;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.dataset.optionId = orderActivity.rounds[0].options[index].id;
    card.setAttribute("aria-label", `Arrastar ou selecionar ${dragCardLabels[index]}`);
    image.className = "smart-sentence-order-drag-card-visual";
    const label = document.createElement("span");
    label.textContent = dragCardLabels[index];
    image.replaceWith(card);
    card.append(image, label);
    return card;
  });
  const positionOrderElements = () => {
    const shell = root.querySelector(".smart-sentence-shell");
    const shellRect = shell.getBoundingClientRect();
    const compactLayout = window.matchMedia("(max-width: 700px)").matches;
    const shellStyle = getComputedStyle(shell);
    const shellContentWidth = shell.clientWidth - Number.parseFloat(shellStyle.paddingLeft) - Number.parseFloat(shellStyle.paddingRight);
    const completePanelWidth = Math.max(0, Math.min(1210, shellContentWidth - (compactLayout ? 24 : 48)));
    const assetScale = completePanelWidth / 1210;
    orderPanel.style.width = `${1276 * assetScale}px`;
    orderPanel.style.transform = `translateX(calc(-50% + ${completePanelWidth * (6 / 1210)}px))`;
    const hudGap = Number.parseFloat(getComputedStyle(root).getPropertyValue("--smart-sentence-panel-question-gap")) || 25;
    const panelArtboardTop = questionHud.getBoundingClientRect().bottom + hudGap;
    const panelRect = orderPanel.getBoundingClientRect();
    orderPanel.style.top = `${panelArtboardTop - 27 * assetScale}px`;
    for (const dropTarget of dropTargets) {
      const x = Number(dropTarget.dataset.layoutX);
      const y = Number(dropTarget.dataset.layoutY);
      dropTarget.style.left = `${panelRect.left + 27 * assetScale - shellRect.left + (x - 79) * assetScale}px`;
      dropTarget.style.top = `${panelArtboardTop - shellRect.top + (y - 256) * assetScale}px`;
      dropTarget.style.width = `${246 * assetScale}px`;
      dropTarget.style.height = `${87 * assetScale}px`;
    }
    for (const dragCard of dragCards) {
      const cardX = Number(dragCard.dataset.layoutX);
      const cardY = Number(dragCard.dataset.layoutY);
      dragCard.style.left = `${panelRect.left + 27 * assetScale - shellRect.left + (cardX - 79 - 11) * assetScale}px`;
      dragCard.style.top = `${panelArtboardTop - shellRect.top + (cardY - 256 - 15) * assetScale}px`;
      dragCard.style.width = `${306 * assetScale}px`;
      dragCard.style.height = `${125 * assetScale}px`;
    }
    const confirmHeight = 94 * assetScale;
    const buttonTop = Math.min(panelRect.bottom - shellRect.top + 16, root.clientHeight - confirmHeight - 16);
    confirmButton.style.top = `${Math.max(0, buttonTop)}px`;
    confirmButton.style.left = "50%";
    confirmButton.style.transform = "translateX(-50%)";
    confirmButton.style.width = `${Math.min(315, 315 * assetScale)}px`;
    confirmButton.style.height = `${Math.min(94, 94 * assetScale)}px`;
  };
  positionOrderElements();
  window.addEventListener("resize", positionOrderElements, { passive: true });
  if ("ResizeObserver" in window) {
    const orderLayoutObserver = new ResizeObserver(positionOrderElements);
    orderLayoutObserver.observe(root);
    orderLayoutObserver.observe(questionHud);
  }

  function renderOrder(snapshot = engine.snapshot()) {
    snapshot.selected.forEach((option, index) => {
      const target = dropTargets[index];
      if (!target) return;
      const isIncorrect = snapshot.status === "incorrect" && option && option.answerKey !== snapshot.round.answer[index];
      const isCorrect = snapshot.status === "correct" || snapshot.status === "incorrect" && option && option.answerKey === snapshot.round.answer[index];
      const visual = isIncorrect ? "incorrect" : isCorrect ? "correct" : option ? "selected" : "empty";
      target.dataset.visualState = visual;
      targetImages[index].src = visual === "empty" ? `./assets/${targetBaseAssets[index]}` : `./assets/${stateAssets[visual]}`;
      placeholderLabels[index].hidden = Boolean(option);
      placedLabels[index].hidden = !option;
      placedLabels[index].textContent = option?.label || "";
      placedLabels[index].dataset.optionId = option?.id || "";
      placedLabels[index].setAttribute("role", option && snapshot.status === "playing" ? "button" : "img");
      placedLabels[index].setAttribute("tabindex", option && snapshot.status === "playing" ? "0" : "-1");
      placedLabels[index].setAttribute("aria-label", option ? `${option.label}, posição ${index + 1}${snapshot.status === "playing" ? ". Selecione para remover ou arraste para outra posição." : ""}` : "");
      incorrectIcons[index].hidden = !isIncorrect;
      removeButtons[index].hidden = !option || snapshot.status !== "playing";
      removeButtons[index].disabled = !option || snapshot.status !== "playing";
      target.setAttribute("aria-label", option ? `Posição ${index + 1}: ${option.label}` : `Posição ${index + 1}, arraste ou selecione uma palavra`);
    });
    orderActivity.rounds[0].options.forEach((option) => {
      const card = dragCards.find((item) => item.dataset.optionId === option.id);
      const placed = snapshot.selected.some((item) => item?.id === option.id);
      card.hidden = placed || snapshot.status === "correct" || snapshot.status === "completed";
      card.classList.toggle("is-locked", snapshot.status === "correct" || snapshot.status === "completed");
      card.setAttribute("aria-hidden", String(card.hidden));
      card.setAttribute("aria-label", `Arrastar ou selecionar ${option.label}`);
    });
    confirmButton.hidden = !snapshot.canConfirm || snapshot.status !== "playing";
    confirmButton.disabled = !snapshot.canConfirm || snapshot.status !== "playing";
    root.dataset.smartSentenceOrderStatus = snapshot.status;
  }
  function slotAtPoint(x, y) {
    return dropTargets.findIndex((target) => { const rect = target.getBoundingClientRect(); return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; });
  }
  function selectFirstEmpty(id) {
    const firstEmpty = engine.snapshot().selected.findIndex((value) => !value);
    if (firstEmpty >= 0) engine.place(id, firstEmpty);
  }
  function confirmOrder() {
    const result = engine.confirm();
    if (!result) return;
    const outcome = result.correct ? "correct" : "incorrect";
    playCanonicalResult(outcome, resultFx);
    Feedback(feedback, window.DuduQAssets?.assets, outcome, () => {
      const reviewed = engine.snapshot();
      feedback.hidden = true;
      if (outcome === "incorrect") {
        engine.retry();
        reviewed.selected.forEach((option, index) => {
          if (option && option.answerKey !== reviewed.round.answer[index]) engine.remove(option.id);
        });
      }
      else engine.continue();
    });
    feedback.querySelector('[data-slot="feedback-title"]').textContent = outcome === "correct" ? "Correto!" : "Ops!";
    feedback.querySelector('[data-slot="feedback-detail"]').textContent = outcome === "correct" ? "As palavras estão na ordem correta." : "Reorganize as palavras e tente novamente.";
    feedback.querySelector('[data-slot="feedback-action"]').textContent = outcome === "correct" ? "CONTINUAR" : "TENTAR NOVAMENTE";
  }
  PrimaryAction(confirmButton, "CONFIRMAR", confirmOrder);
  for (const card of dragCards) {
    card.addEventListener("pointerdown", (event) => {
      if (engine.status !== "playing" || event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      const rect = card.getBoundingClientRect();
      card.setPointerCapture?.(event.pointerId);
      card.dataset.pointerStartX = String(event.clientX);
      card.dataset.pointerStartY = String(event.clientY);
      card.dataset.pointerMoved = "false";
      card.dataset.pointerDx = "0";
      card.dataset.pointerDy = "0";
      card.dataset.pointerId = String(event.pointerId);
      card.dataset.restLeft = card.style.left;
      card.dataset.restTop = card.style.top;
      card.dataset.dragWidth = String(rect.width);
    });
    card.addEventListener("pointermove", (event) => {
      if (card.dataset.pointerId !== String(event.pointerId)) return;
      const dx = event.clientX - Number(card.dataset.pointerStartX);
      const dy = event.clientY - Number(card.dataset.pointerStartY);
      card.dataset.pointerDx = String(dx); card.dataset.pointerDy = String(dy);
      if (card.dataset.pointerMoved !== "true" && Math.hypot(dx, dy) > 6) { card.dataset.pointerMoved = "true"; card.classList.add("is-dragging"); }
      if (card.dataset.pointerMoved === "true") card.style.transform = `translate3d(${dx}px,${dy}px,0)`;
    });
    card.addEventListener("pointerup", (event) => {
      if (card.dataset.pointerId !== String(event.pointerId)) return;
      const moved = card.dataset.pointerMoved === "true";
      const targetIndex = slotAtPoint(event.clientX, event.clientY);
      card.releasePointerCapture?.(event.pointerId);
      delete card.dataset.pointerId;
      card.classList.remove("is-dragging");
      card.style.removeProperty("transform");
      card.dataset.handledPointerClick = "true";
      window.setTimeout(() => { delete card.dataset.handledPointerClick; }, 0);
      if (moved && targetIndex >= 0 && engine.place(card.dataset.optionId, targetIndex)) DuduqSound.play("snap");
      else if (!moved) selectFirstEmpty(card.dataset.optionId);
    });
    card.addEventListener("pointercancel", (event) => {
      if (card.dataset.pointerId !== String(event.pointerId)) return;
      delete card.dataset.pointerId; card.classList.remove("is-dragging"); card.style.removeProperty("transform");
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault(); selectFirstEmpty(card.dataset.optionId);
    });
    card.addEventListener("click", () => {
      if (card.dataset.handledPointerClick === "true") { delete card.dataset.handledPointerClick; return; }
      if (engine.status === "playing") selectFirstEmpty(card.dataset.optionId);
    });
  }
  placedLabels.forEach((label) => {
    const removePlaced = () => { if (label.dataset.suppressClick === "true") { delete label.dataset.suppressClick; return; } if (engine.status === "playing" && label.dataset.optionId) engine.remove(label.dataset.optionId); };
    label.addEventListener("click", removePlaced);
    label.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); removePlaced(); } });
    label.addEventListener("pointerdown", (event) => {
      const id = label.dataset.optionId;
      if (!id || engine.status !== "playing") return;
      const target = label.closest(".smart-sentence-order-drop-target-official");
      const sourceIndex = dropTargets.indexOf(target);
      label.setPointerCapture?.(event.pointerId);
      label.dataset.pointerStartX = String(event.clientX); label.dataset.pointerStartY = String(event.clientY); label.dataset.pointerMoved = "false"; label.dataset.optionId = id; label.dataset.sourceIndex = String(sourceIndex);
    });
    label.addEventListener("pointermove", (event) => {
      if (!label.hasPointerCapture?.(event.pointerId)) return;
      const dx = event.clientX - Number(label.dataset.pointerStartX); const dy = event.clientY - Number(label.dataset.pointerStartY);
      if (Math.hypot(dx, dy) > 6) label.dataset.pointerMoved = "true";
      if (label.dataset.pointerMoved === "true") label.style.transform = `translate(${dx}px,${dy}px)`;
    });
    label.addEventListener("pointerup", (event) => {
      if (!label.hasPointerCapture?.(event.pointerId)) return;
      const moved = label.dataset.pointerMoved === "true"; const index = slotAtPoint(event.clientX, event.clientY); const id = label.dataset.optionId;
      label.releasePointerCapture?.(event.pointerId); label.style.removeProperty("transform");
      if (moved) label.dataset.suppressClick = "true";
      if (moved && index >= 0 && engine.place(id, index)) DuduqSound.play("snap");
      else if (!moved) engine.remove(id);
    });
    label.addEventListener("pointercancel", () => label.style.removeProperty("transform"));
  });
  removeButtons.forEach((button, index) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const option = engine.snapshot().selected[index];
      if (option && engine.status === "playing") engine.remove(option.id);
    });
  });
  engine.onStateChange(renderOrder);
  engine.start();

  window.DuduQSmartSentenceShell = Object.freeze({ header, prompt, mode, engine, activity: orderActivity });
} else if (mode === "complete") {
const engine = new DuduQSmartSentenceEngine(activity);
const preview = Object.freeze({ title: "SMART SENTENCE", progress: Object.freeze({ current: 1, total: 3 }), prompt: activity.rounds[0].prompt });

root.className = "game-screen target-shooter-screen duduq-shared-gold-shell smart-sentence-screen";
root.innerHTML = `<div class="world-backdrop" aria-hidden="true"></div><div class="readability-veil" aria-hidden="true"></div><section class="game-shell smart-sentence-shell" aria-label="Smart Sentence activity"><div data-header-slot></div><div data-question-slot></div><section class="smart-sentence-panel" aria-label="Complete the sentence"><img class="smart-sentence-panel-full" src="./assets/smart-sentence-component.png" alt=""><img class="smart-sentence-image-card" src="./assets/smart-sentence-image-card.png" alt=""><div class="smart-sentence-answer-slot" data-answer-slot aria-label="Answer space"><span class="smart-sentence-drop-slot-backing" aria-hidden="true"></span><img class="smart-sentence-drop-slot-visual" src="./assets/smart-sentence-drop-slot-official.png" alt=""><img class="smart-sentence-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden><button class="smart-sentence-remove-option" type="button" aria-label="Remove selected word and choose another" title="Remove selected word"><img src="./assets/smart-sentence-remove-option-official.png" alt=""></button></div><div class="smart-sentence-options" data-option-bank aria-label="Word options"></div><button class="primary-action smart-sentence-confirm-action" type="button" aria-label="Confirmar" hidden disabled><img class="smart-sentence-confirm-visual" src="./assets/smart-sentence-confirm-button-penpot.png" alt="" aria-hidden="true"><span class="smart-sentence-confirm-label" data-slot="action"></span></button><span class="smart-sentence-announcement" aria-live="polite" aria-atomic="true"></span></section></section><div class="result-fx-layer success-celebration-layer" aria-hidden="true"></div><section class="feedback-ribbon" data-feedback="" aria-live="polite" aria-atomic="true" hidden><img class="feedback-mascot" data-asset="feedback-mascot" alt=""><div class="feedback-copy"><h2 data-slot="feedback-title"></h2><p data-slot="feedback-detail"></p></div><button class="feedback-action game-button" type="button"><span data-slot="feedback-action"></span></button></section>`;
root.querySelector(".world-backdrop").style.backgroundImage = `url("${window.DuduQAssets?.assets?.backgrounds?.["1"] || ""}")`;

const header = DuduQCanonicalHeaderHUD({ title: preview.title, progressCurrent: preview.progress.current, progressTotal: preview.progress.total, progressArtwork: "penpot-official-board", mascot: "/core/assets/duduq-hud-mascot.png" });
header.dataset.mechanic = "matching";
root.querySelector("[data-header-slot]").replaceWith(header);
root.querySelector("[data-question-slot]").replaceWith(DuduQCanonicalQuestionHUD(preview.prompt));

const panel = root.querySelector(".smart-sentence-panel");
const bank = root.querySelector("[data-option-bank]");
const slot = root.querySelector("[data-answer-slot]");
const slotVisual = slot.querySelector(".smart-sentence-drop-slot-visual");
const incorrectIcon = slot.querySelector(".smart-sentence-incorrect-icon");
const removeButton = root.querySelector(".smart-sentence-remove-option");
const confirmButton = root.querySelector(".smart-sentence-confirm-action");
const feedback = root.querySelector(".feedback-ribbon");
const resultFx = ResultFX(root.querySelector(".success-celebration-layer"));
const announcement = root.querySelector(".smart-sentence-announcement");
const buttons = new Map();
const gestures = new Map();

for (const option of activity.rounds[0].options) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "smart-sentence-option";
  button.dataset.optionId = option.id;
  button.setAttribute("aria-label", `Choose ${option.label}`);
  button.setAttribute("aria-pressed", "false");
  const image = document.createElement("img");
  image.src = `./assets/${option.asset}`;
  image.alt = "";
  image.draggable = false;
  button.append(image);
  bank.append(button);
  buttons.set(option.id, button);
}
const answerText = document.createElement("span");
answerText.className = "smart-sentence-answer-text";
answerText.dataset.selectedWord = "";
answerText.setAttribute("aria-hidden", "true");
slot.append(answerText);

function announce(snapshot) {
  if (snapshot.status === "correct") announcement.textContent = "Correct. The sentence is complete.";
  else if (snapshot.status === "incorrect") announcement.textContent = "Try another word.";
  else if (snapshot.selected.length) announcement.textContent = `${snapshot.selected[0].label} placed in the answer space.`;
  else announcement.textContent = "Choose or drag a word into the answer space.";
}

function render(snapshot = engine.snapshot()) {
  const selected = snapshot.selected[0] || null;
  bank.hidden = Boolean(selected) || snapshot.status === "correct" || snapshot.status === "incorrect" || snapshot.status === "completed";
  for (const option of activity.rounds[0].options) {
    const button = buttons.get(option.id);
    const inSlot = option.id === selected?.id;
    bank.append(button);
    button.hidden = inSlot;
    button.classList.toggle("is-selected", inSlot);
    button.disabled = snapshot.status === "correct" || snapshot.status === "completed";
    button.setAttribute("aria-pressed", String(inSlot));
    button.setAttribute("aria-label", inSlot ? `${option.label} in answer space` : `Choose ${option.label}`);
  }
  answerText.textContent = selected?.label || "";
  const visualState = snapshot.status === "correct"
    ? "correct"
    : snapshot.status === "incorrect"
      ? "incorrect"
      : selected
        ? "selected"
        : "empty";
  slotVisual.src = {
    correct: "./assets/smart-sentence-slot-correct-penpot-official.png",
    incorrect: "./assets/smart-sentence-slot-incorrect-penpot-official.png",
    selected: "./assets/smart-sentence-slot-selected-official.png",
    empty: "./assets/smart-sentence-drop-slot-official.png"
  }[visualState];
  slot.dataset.visualState = visualState;
  incorrectIcon.hidden = visualState !== "incorrect";
  removeButton.hidden = !selected || snapshot.status !== "playing";
  removeButton.disabled = !selected || snapshot.status !== "playing";
  confirmButton.hidden = !selected || snapshot.status !== "playing";
  confirmButton.disabled = !selected || !snapshot.canConfirm;
  slot.dataset.status = snapshot.status;
  slot.dataset.filled = String(Boolean(selected));
  slot.setAttribute("aria-label", selected ? `Answer space: ${selected.label}` : "Empty answer space. Choose or drag a word here.");
  announce(snapshot);
}

removeButton.addEventListener("click", () => {
  const snapshot = engine.snapshot();
  const selected = snapshot.selected[0];
  if (!selected || snapshot.status === "correct" || snapshot.status === "completed") return;
  if (snapshot.status === "incorrect") engine.retry();
  engine.remove(selected.id);
});

PrimaryAction(confirmButton, "CONFIRMAR", confirmSelection);

function chooseOption(optionId) {
  const current = engine.snapshot();
  if (current.status !== "playing") return null;
  return engine.select(optionId);
}

function confirmSelection() {
  if (!engine.canConfirm()) return;
  const result = engine.confirm();
  if (!result) return;
  const outcome = result.correct ? "correct" : "incorrect";
  playCanonicalResult(outcome, resultFx);
  Feedback(feedback, window.DuduQAssets?.assets, outcome, () => {
    const current = engine.snapshot();
    feedback.hidden = true;
    if (outcome === "incorrect") {
      const selectedId = current.selected[0]?.id;
      engine.retry();
      if (selectedId) engine.remove(selectedId);
      return;
    }
    engine.continue();
  });
  feedback.querySelector('[data-slot="feedback-title"]').textContent = outcome === "correct" ? "Correto!" : "Ops!";
  feedback.querySelector('[data-slot="feedback-detail"]').textContent = outcome === "correct"
    ? "A frase está completa."
    : "Escolha outra palavra e tente novamente.";
  feedback.querySelector('[data-slot="feedback-action"]').textContent = outcome === "correct" ? "CONTINUAR" : "TENTAR NOVAMENTE";
}

function pointIsInsideSlot(x, y) {
  const rect = slot.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function returnToRest(button, animate = true) {
  button.classList.remove("is-dragging");
  if (!animate) {
    button.style.removeProperty("transform");
    button.style.removeProperty("transition");
    return;
  }
  button.style.transition = "transform 170ms cubic-bezier(.2,.8,.25,1)";
  button.style.transform = "translate3d(0,0,0)";
  window.setTimeout(() => {
    button.style.removeProperty("transform");
    button.style.removeProperty("transition");
  }, 190);
}

for (const [optionId, button] of buttons) {
  button.addEventListener("pointerdown", (event) => {
    if (button.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    const rect = button.getBoundingClientRect();
    gestures.set(event.pointerId, { optionId, button, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false });
    button.setPointerCapture?.(event.pointerId);
    button.dataset.dragOriginWidth = String(rect.width);
  });

  button.addEventListener("pointermove", (event) => {
    const gesture = gestures.get(event.pointerId);
    if (!gesture) return;
    gesture.dx = event.clientX - gesture.startX;
    gesture.dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(gesture.dx, gesture.dy) >= 7) {
      gesture.moved = true;
      button.classList.add("is-dragging");
    }
    if (gesture.moved) button.style.transform = `translate3d(${gesture.dx}px,${gesture.dy}px,0)`;
  });

  button.addEventListener("pointerup", (event) => {
    const gesture = gestures.get(event.pointerId);
    if (!gesture) return;
    gestures.delete(event.pointerId);
    button.releasePointerCapture?.(event.pointerId);
    button.style.removeProperty("width");
    if (!gesture.moved) {
      returnToRest(button, false);
      chooseOption(optionId);
      return;
    }
    if (pointIsInsideSlot(event.clientX, event.clientY) && chooseOption(optionId)) DuduqSound.play("snap");
    returnToRest(button, true);
  });

  button.addEventListener("pointercancel", (event) => {
    const gesture = gestures.get(event.pointerId);
    if (!gesture) return;
    gestures.delete(event.pointerId);
    returnToRest(button, true);
  });

  button.addEventListener("click", (event) => {
    if (event.detail !== 0 || button.disabled) return;
    chooseOption(optionId);
  });
}

engine.onStateChange(render);
engine.start();
window.DuduQSmartSentenceShell = Object.freeze({ header, prompt: preview.prompt, engine, activity });
} else {
  throw new Error(`Unsupported Smart Sentence mode: ${mode}`);
}

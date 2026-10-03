import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD } from "/core/ui/index.js";
import { DuduQSmartSentenceEngine } from "/core/duduq-smart-sentence-engine.js";
import { Feedback, PrimaryAction } from "/test/matching/gold-master-candidate-v1/src/core-components.js";

const root = document.querySelector("#game");
if (!root) throw new Error("Smart Sentence root was not found.");

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

const engine = new DuduQSmartSentenceEngine(activity);
const preview = Object.freeze({ title: "SMART SENTENCE", progress: Object.freeze({ current: 1, total: 3 }), prompt: activity.rounds[0].prompt });

root.className = "game-screen target-shooter-screen duduq-shared-gold-shell smart-sentence-screen";
root.innerHTML = `<div class="world-backdrop" aria-hidden="true"></div><div class="readability-veil" aria-hidden="true"></div><section class="game-shell smart-sentence-shell" aria-label="Smart Sentence activity"><div data-header-slot></div><div data-question-slot></div><section class="smart-sentence-panel" aria-label="Complete the sentence"><img class="smart-sentence-panel-full" src="./assets/smart-sentence-component.png" alt=""><img class="smart-sentence-image-card" src="./assets/smart-sentence-image-card.png" alt=""><div class="smart-sentence-answer-slot" data-answer-slot aria-label="Answer space"><span class="smart-sentence-drop-slot-backing" aria-hidden="true"></span><img class="smart-sentence-drop-slot-visual" src="./assets/smart-sentence-drop-slot-official.png" alt=""><img class="smart-sentence-incorrect-icon" src="./assets/smart-sentence-slot-incorrect-icon-penpot-official.png" alt="" aria-hidden="true" hidden><button class="smart-sentence-remove-option" type="button" aria-label="Remove selected word and choose another" title="Remove selected word"><img src="./assets/smart-sentence-remove-option-official.png" alt=""></button></div><div class="smart-sentence-options" data-option-bank aria-label="Word options"></div><button class="primary-action smart-sentence-confirm-action" type="button" aria-label="Confirmar" hidden disabled><img class="smart-sentence-confirm-visual" src="./assets/smart-sentence-confirm-button-penpot.png" alt="" aria-hidden="true"><span class="smart-sentence-confirm-label" data-slot="action"></span></button><span class="smart-sentence-announcement" aria-live="polite" aria-atomic="true"></span></section></section><section class="feedback-ribbon" data-feedback="" aria-live="polite" aria-atomic="true" hidden><img class="feedback-mascot" data-asset="feedback-mascot" alt=""><div class="feedback-copy"><h2 data-slot="feedback-title"></h2><p data-slot="feedback-detail"></p></div><button class="feedback-action game-button" type="button"><span data-slot="feedback-action"></span></button></section>`;
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
  if (current.status !== "playing") return;
  engine.select(optionId);
}

function confirmSelection() {
  if (!engine.canConfirm()) return;
  const result = engine.confirm();
  if (!result) return;
  const outcome = result.correct ? "correct" : "incorrect";
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
    if (!gesture.moved || pointIsInsideSlot(event.clientX, event.clientY)) {
      returnToRest(button, false);
      chooseOption(optionId);
      return;
    }
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

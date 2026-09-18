/* DuduQ Core UI — shared visual roles consumed by every mechanic. */
export function markComponent(element, name, variant = "") {
  if (!element) return element;
  element.dataset.component = name;
  if (variant) element.dataset.variant = variant;
  return element;
}

function addRole(element, role) {
  if (element) element.classList.add(role);
  return element;
}

export function HeaderControlButton(button, variant = "audio") {
  if (!button) return button;
  const safeVariant = variant === "fullscreen" ? "fullscreen" : "audio";
  button.classList.add("header-control-button", `header-control-button--${safeVariant}`);
  return addRole(markComponent(button, "header-control-button", safeVariant), `game-${safeVariant}-button`);
}
export function GameAudioButton(button) { return HeaderControlButton(button, "audio"); }
export function GameFullscreenButton(button) {
  return HeaderControlButton(button, "fullscreen");
}
export function AudioButton(button) { return GameAudioButton(button); }
export function FullscreenButton(button) { return GameFullscreenButton(button); }
export function GameActionButton(button, variant = "primary") {
  const safeVariant = ["primary", "success", "danger"].includes(variant) ? variant : "primary";
  addRole(markComponent(button, "action-button", safeVariant), "game-action-button");
  button?.classList.add(`game-action-button--${safeVariant}`);
  return button;
}
export function GameButton(button, variant = "primary") { return GameActionButton(button, variant); }
export function PrimaryActionButton(button) { return GameActionButton(button, "primary"); }
export function SuccessActionButton(button) { return GameActionButton(button, "success"); }
export function ErrorActionButton(button) { return GameActionButton(button, "danger"); }
export function CTAAttention(button, { delay = 700, repeat = 5000, target = button } = {}) {
  if (!button) return Object.freeze({ start() {}, stop() {} });
  let timer = 0;
  let active = false;
  const stop = () => {
    active = false;
    window.clearTimeout(timer);
    target.dataset.attention = "";
  };
  const pulse = () => {
    if (!active || button.hidden || button.disabled) return stop();
    target.dataset.attention = "";
    requestAnimationFrame(() => { if (active) target.dataset.attention = "cta-attention-shake"; });
    timer = window.setTimeout(pulse, repeat);
  };
  const start = () => {
    stop();
    if (button.hidden || button.disabled) return;
    active = true;
    timer = window.setTimeout(pulse, delay);
  };
  ["pointerenter", "focus", "pointerdown", "click"].forEach((eventName) => button.addEventListener(eventName, stop));
  return Object.freeze({ start, stop });
}
export function StatusBadge(element, status = "idle") { return addRole(markComponent(element, "status-badge", status), "game-status-badge"); }
export function CorrectBadge(element) { return StatusBadge(element, "correct"); }
export function IncorrectBadge(element) { return StatusBadge(element, "incorrect"); }
export function DuduQMascot(image, state = "idle") { return addRole(markComponent(image, "duduq-mascot", state), "duduq-mascot"); }
export function MascotHUD(image) {
  if (!image) return image;
  DuduQMascot(image, "hud");
  image.classList.add("duduq-mascot--hud");
  return image;
}
export function MascotFeedback(image, state = "correct") {
  if (!image) return image;
  DuduQMascot(image, state);
  image.classList.add("duduq-mascot--feedback");
  return image;
}
export function DuduQHudMascot(image) { return DuduQMascot(image, "idle"); }
export function DuduQHud(root) { return markComponent(root, "duduq-hud"); }
export function ProgressBadge(element, { completed = 0, total = 1 } = {}) {
  if (!element) return element;
  element.dataset.component = "progress-badge";
  element.setAttribute("aria-label", `Questão ${completed} de ${total}`);
  return element;
}
export function ProgressBar(element, { completed = 0, total = 1 } = {}) {
  if (!element) return element;
  element.dataset.component = "progress-bar";
  element.setAttribute("aria-valuemin", "0");
  element.setAttribute("aria-valuemax", String(Math.max(1, total)));
  element.setAttribute("aria-valuenow", String(Math.max(0, completed)));
  return element;
}
export function QuestionPanel(root, variant = "standard") {
  const safeVariant = variant === "wide" ? "wide" : "standard";
  if (!root) return root;
  root.dataset.duduqQuestionVariant = safeVariant;
  return markComponent(root, "question-panel", safeVariant);
}
export function FeedbackHUD(root, outcome = "correct") { return markComponent(root, "feedback-hud", outcome); }
export function LoadingState(root, state = "loading") { return markComponent(root, "loading-state", state); }
export function MatchingCard(card, { state = "idle", connectorSide = "right", status = "idle" } = {}) {
  if (!card) return card;
  markComponent(card, "matching-card", state);
  card.dataset.connectorSide = connectorSide;
  card.dataset.status = status;
  return card;
}
export { ResultFX, DuduQFX } from "./result-fx.js";
// Canonical HUDs remain Core-owned. This candidate bridge exposes the official
// Core exports without implementing a mechanic-local HUD.
export { DuduQCanonicalHeaderHUD } from "../../../../../../core/ui/duduq-canonical-header-hud.js";
export { DuduQCanonicalQuestionHUD } from "../../../../../../core/ui/duduq-canonical-question-hud.js";

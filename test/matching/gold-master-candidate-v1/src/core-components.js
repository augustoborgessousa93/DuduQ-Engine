import { GameAudioButton, GameFullscreenButton, GameActionButton, ProgressBadge, ProgressBar as CoreProgressBar, QuestionPanel, FeedbackHUD, LoadingState as CoreLoadingState, DuduQHud, DuduQMascot as CoreDuduQMascot, MascotHUD, MascotFeedback, SuccessActionButton, ErrorActionButton, CTAAttention, DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD } from "./core/ui/index.js";

export function LoadingState(root, state = "loading") { return CoreLoadingState(root, state); }

export function DuduQMascot(image, source) {
  CoreDuduQMascot(image, "idle");
  image.src = source || "";
  image.alt = "DuduQ";
}

export function calculateProgress(completed, total) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
  return safeCompleted / safeTotal;
}

export function ProgressBar(element, { completed, total }) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
  element.setAttribute("aria-valuemin", "0");
  element.setAttribute("aria-valuemax", String(safeTotal));
  element.setAttribute("aria-valuenow", String(safeCompleted));
  element.setAttribute("aria-valuetext", `${safeCompleted} de ${safeTotal} etapas concluídas`);
  element.querySelector(".hud-progress-fill").style.width = `${calculateProgress(safeCompleted, safeTotal) * 100}%`;
  CoreProgressBar(element, { completed: safeCompleted, total: safeTotal });
}

export function GameHUD(root, content, assetSources, progress) {
  let existing = root.querySelector(".game-hud");
  if (!existing) { existing = DuduQCanonicalHeaderHUD({ title: content.topic, subtitle: content.subtitle, progressCurrent: progress.completed, progressTotal: progress.total, mascot: "assets/duduq-hud-mascot.png" }); root.querySelector("[data-canonical-header-slot]").replaceWith(existing); return existing; }
  DuduQCanonicalHeaderHUD({ root: existing, title: content.topic, subtitle: content.subtitle, progressCurrent: progress.completed, progressTotal: progress.total, mascot: "assets/duduq-hud-mascot.png" });
  DuduQHud(root.querySelector(".game-hud"));
  root.querySelector('[data-slot="topic"]').textContent = content.topic;
  root.querySelector('[data-slot="subtitle"]').textContent = content.subtitle;
  root.querySelector('[data-slot="counter"]').textContent = `${progress.completed} / ${progress.total}`;
  root.querySelector(".hud-counter").setAttribute("aria-label", `Questão ${progress.completed} de ${progress.total}`);
  ProgressBadge(root.querySelector(".hud-counter"), progress);
  const mascot = root.querySelector('[data-asset="mascot-idle"]');
  MascotHUD(mascot);
  // Official DuduQ idle art cropped from the approved source: avoids its 3840px transparent canvas.
  mascot.src = "assets/duduq-hud-mascot.png";
  mascot.alt = "DuduQ";
  ProgressBar(root.querySelector(".hud-progress"), progress);
}

export function GameQuestionPanel(root, question) {
  let existing = root.querySelector(".question-panel");
  if (!existing) { existing = DuduQCanonicalQuestionHUD({ eyebrow: question.label, question: question.prompt, audio: question.audioText }); root.querySelector("[data-canonical-question-slot]").replaceWith(existing); return existing; }
  DuduQCanonicalQuestionHUD({ root: existing, eyebrow: question.label, question: question.prompt, audio: question.audioText });
  QuestionPanel(root.querySelector(".question-panel"));
  root.querySelector('[data-slot="question-label"]').textContent = question.label;
  root.querySelector('[data-slot="prompt"]').textContent = question.prompt;
}

export function PrimaryAction(button, label, onConfirm) {
  GameActionButton(button, "primary");
  button.querySelector("[data-slot='action']").textContent = label;
  button.disabled = false;
  button.onclick = onConfirm;
}

export function Feedback(root, assets, outcome, onAction) {
  const isCorrect = outcome === "correct";
  root.dataset.feedback = outcome;
  FeedbackHUD(root, outcome);
  root.hidden = false;
  const mascot = root.querySelector('[data-asset="feedback-mascot"]');
  MascotFeedback(mascot, outcome);
  // Feedback variants use local crops of the official source art, not full transparent canvases.
  mascot.src = isCorrect ? "assets/duduq-feedback-correct.png" : "assets/duduq-feedback-error.png";
  mascot.alt = isCorrect ? "DuduQ comemorando o acerto" : "DuduQ incentivando nova tentativa";
  root.querySelector('[data-slot="feedback-title"]').textContent = isCorrect ? "Correto!" : "Ops!";
  root.querySelector('[data-slot="feedback-detail"]').textContent = isCorrect ? "Você ligou corretamente." : "Revise as ligações e tente novamente.";
  root.querySelector('[data-slot="feedback-action"]').textContent = isCorrect ? "CONTINUAR" : "TENTAR DE NOVO";
  if (!isCorrect) root.querySelector('[data-slot="feedback-detail"]').textContent = `Resposta correta: ${root.dataset.correctAnswer || "DOG"}`;
  const button = root.querySelector(".feedback-action");
  if (isCorrect) SuccessActionButton(button);
  else ErrorActionButton(button);
  button.className = `feedback-action game-button ${isCorrect ? "is-correct" : "is-incorrect"}`;
  if (isCorrect) SuccessActionButton(button);
  else ErrorActionButton(button);
  button._duduqAttention ??= CTAAttention(button);
  button._duduqAttention.stop();
  button._duduqAttention.start();
  button.onclick = () => { button._duduqAttention.stop(); onAction(); };
}

// Target Shooter composes the approved shared Core; only the arena is local.
import { GameShell } from "../../../../core/ui/game-shell.js";
import { DuduQHud, MascotHUD, ProgressBadge, ProgressBar, QuestionPanel, GameAudioButton, GameFullscreenButton, FeedbackHUD, MascotFeedback, GameButton, CTAAttention, DuduQFX, DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD } from "../../../../core/ui/index.js";
import { TargetShooterGameplay } from "./target-shooter-gameplay.js";

const game = document.querySelector("#game");
const headerSlot = document.querySelector("[data-canonical-header-slot]");
headerSlot.replaceWith(DuduQCanonicalHeaderHUD({ title: "TARGET SHOOTER", subtitle: "Acerte o alvo correto", progressCurrent: 4, progressTotal: 10, mascot: "../../../../core/assets/duduq-hud-mascot.png" }));
const questionSlot = document.querySelector("[data-canonical-question-slot]");
questionSlot.replaceWith(DuduQCanonicalQuestionHUD({ eyebrow: "OUÇA E ACERTE O ALVO CORRETO", question: "WHICH ONE IS ‘DOG’?", audio: "Which one is dog?" }));
const aimTrajectory = document.querySelector(".aim-trajectory");
// Gameplay owns target states; clear any presentation-only classes from static markup.
document.querySelectorAll(".target-shooter-target").forEach((target) => {
  let ring = target.querySelector(".target-state-ring");
  if (!ring) { ring = document.createElement("span"); ring.className = "target-state-ring"; target.append(ring); }
  ring.textContent = "";
  target.classList.remove("is-selected", "is-hovered", "is-correct", "is-incorrect", "is-subdued");
});
while (aimTrajectory.children.length < 9) aimTrajectory.append(document.createElement("i"));
function DuduQMagicSlingshot(root) {
  const trajectory = root.querySelector(".aim-trajectory");
  const layer = (className, text = "") => {
    const element = document.createElement(text ? "span" : "i");
    element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  root.replaceChildren(
    layer("slingshot-pedestal"),
    layer("slingshot-arm slingshot-arm-left"),
    layer("slingshot-arm slingshot-arm-right"),
    layer("slingshot-elastic slingshot-elastic-left"),
    layer("slingshot-elastic slingshot-elastic-right"),
    layer("slingshot-pocket"),
    layer("slingshot-orb-aura"),
    layer("slingshot-orb"),
    layer("slingshot-orb-highlight"),
    layer("slingshot-orb-star", "✦"),
    trajectory,
  );
  root.dataset.penpotMain = "107ad71b-024b-804f-8008-a77136d678a2";
  root.dataset.component = "DuduQMagicSlingshot";
  return root;
}
const legacySlingshot = document.querySelector(".duduq-magic-slingshot");
function DuduQMagicLauncher(root) {
  const img = (file, className) => { const el = document.createElement("img"); el.src = `assets/magic-launcher-front/${file}.png`; el.className = className; el.alt = ""; el.draggable = false; return el; };
  const base = document.createElement("div"); base.className = "launcher-base"; base.append(img("launcher-base-front", "launcher-base-front__art"));
  const support = document.createElement("div"); support.className = "launcher-support"; support.append(img("launcher-support-front", "launcher-support-front__art"));
  const aim = document.createElement("div"); aim.className = "launcher-aim-system launcher-state-center";
  const recoil = document.createElement("div"); recoil.className = "launcher-recoil-system";
  const muzzleMarker = document.createElement("span"); muzzleMarker.className = "launcher-muzzle-point"; muzzleMarker.setAttribute("aria-hidden", "true");
  const aura = img("launcher-portal-front", "launcher-portal-front");
  const barrel = img("launcher-barrel-front", "launcher-barrel-front");
  const core = img("launcher-core-front", "launcher-core-front");
  const muzzle = img("launcher-muzzle-front", "launcher-muzzle-front");
  // Front barrel artwork includes its crystal and upper portal; keep duplicate modules ready but hidden.
  core.hidden = true;
  muzzle.hidden = true;
  aura.hidden = true;
  recoil.append(aura, barrel, core, muzzle, muzzleMarker);
  aim.append(recoil);
  const fx = document.createElement("div"); fx.className = "launcher-fx";
  ["projectile", "trail", "impact", "particles"].forEach((name) => { const el = img(`launcher-${name}-front`, `launcher-${name}-front`); el.hidden = true; fx.append(el); });
  root.replaceChildren(base, support, aim, fx);
  root.dataset.component = "DuduQMagicLauncher";
  root.dataset.kit = "front";
  root.dataset.launcherPivot = "180 126";
  root.dataset.muzzlePoint = "180 16";
  root.dataset.artZeroAngle = "0";
  root.dataset.neutralAimAngle = "1.409";
  root.dataset.state = "CENTER";
  root.setLauncherState = (state) => { const s = String(state).toLowerCase(); aim.classList.remove("launcher-state-left", "launcher-state-center", "launcher-state-right"); aim.classList.add(`launcher-state-${s}`); root.dataset.state = s.toUpperCase(); };
  return root;
}
const launcherHost = document.createElement("div");
launcherHost.className = "duduq-magic-launcher";
launcherHost.setAttribute("aria-label", "Magic Launcher");
legacySlingshot.parentElement.append(aimTrajectory);
legacySlingshot.replaceWith(launcherHost);
const launcher = DuduQMagicLauncher(launcherHost);
aimTrajectory.hidden = true;
document.querySelectorAll(".target-shooter-target").forEach((target) => {
  if (target.querySelector(".target-status-badge")) return;
  const badge = document.createElement("span");
  badge.className = "target-status-badge";
  badge.setAttribute("role", "img");
  badge.setAttribute("aria-label", "Indicador de resposta");
  badge.textContent = "×";
  target.append(badge);
});
// Keep badges at one measured gap from each target's actual ring, including per-target ring offsets.
const alignStatusBadges = () => document.querySelectorAll(".target-shooter-target").forEach((target) => {
  const ring = target.querySelector(".target-state-ring"); const badge = target.querySelector(".target-status-badge");
  if (!ring || !badge) return;
  const ringStyle = getComputedStyle(ring); const badgeStyle = getComputedStyle(badge);
  const badgeSize = parseFloat(badgeStyle.width) || 44;
  // Place the badge center on the ring circumference at the balanced -45° upper-right anchor.
  const ringLeft = parseFloat(ringStyle.left); const ringTop = parseFloat(ringStyle.top);
  const ringWidth = parseFloat(ringStyle.width); const ringHeight = parseFloat(ringStyle.height);
  const radiusX = ringWidth / 2; const radiusY = ringHeight / 2; const diagonal = Math.SQRT1_2;
  badge.style.left = `${ringLeft + radiusX + radiusX * diagonal - badgeSize / 2}px`;
  badge.style.top = `${ringTop + radiusY - radiusY * diagonal - badgeSize / 2}px`;
  badge.style.right = "auto";
});
alignStatusBadges();
requestAnimationFrame(alignStatusBadges);
window.addEventListener("resize", alignStatusBadges, { passive: true });
const shell = new GameShell(game);
const progress = { completed: 4, total: 10 };
const canonical = (element, main, target) => {
  element.dataset.penpotMain = main;
  element.dataset.targetInstance = target;
  return element;
};
const header = canonical(document.querySelector(".game-hud"), "0fa9ab83-e084-8008-8008-a72966dce0d0", "Target Header");
DuduQHud(header);
MascotHUD(canonical(document.querySelector(".hud-mascot"), "002497e5-f2c0-8002-8008-a2b93c432866", "Target Header Mascot"));
ProgressBadge(canonical(document.querySelector(".hud-counter"), "002497e5-f2c0-8002-8008-a2b058765f88", "Target Header Progress Badge"), progress);
ProgressBar(canonical(document.querySelector(".hud-progress"), "002497e5-f2c0-8002-8008-a2b014d23579", "Target Header Progress"), progress);
const question = canonical(document.querySelector(".question-panel"), "0fa9ab83-e084-8008-8008-a72f17332bed", "Target Question HUD");
QuestionPanel(question, "wide");
const feedback = document.querySelector(".feedback-ribbon");
const feedbackAction = feedback.querySelector(".feedback-action");
const attention = CTAAttention(feedbackAction, { delay: 5000, repeat: 5000 });
feedbackAction.addEventListener("click", () => attention.stop());
function showFeedback(outcome = "correct", onAction = () => {}) {
  const correct = outcome === "correct";
  feedback.hidden = false;
  feedback.dataset.feedback = correct ? "correct" : "incorrect";
  FeedbackHUD(feedback, feedback.dataset.feedback);
  const mascot = feedback.querySelector(".feedback-mascot");
  MascotFeedback(mascot, feedback.dataset.feedback);
  mascot.src = correct ? "../../../core/assets/duduq-feedback-correct.png" : "../../../core/assets/duduq-feedback-error.png";
  feedback.querySelector("h2").textContent = correct ? "Correto!" : "Quase!";
  feedback.querySelector("p").textContent = correct ? "Você acertou o alvo correto." : "Tente mais uma vez.";
  feedbackAction.textContent = correct ? "CONTINUAR" : "TENTAR DE NOVO";
  GameButton(feedbackAction, correct ? "success" : "danger");
  feedbackAction.onclick = () => { attention.stop(); onAction(); };
  attention.start();
}
const celebration = DuduQFX(document.querySelector(".success-celebration-layer"));
const activitySuccess = () => game.dispatchEvent(new CustomEvent("activity-success", { bubbles: true, detail: { source: "target-shooter" } }));
game.addEventListener("activity-success", () => celebration.play("success"));
const gameplay = TargetShooterGameplay({ game, arena: document.querySelector(".target-shooter-arena"), launcher, feedback, showFeedback, activitySuccess });
window.DuduQTargetShooterStatic = Object.freeze({ shell, launcher, gameplay, celebration, showFeedback, activitySuccess });

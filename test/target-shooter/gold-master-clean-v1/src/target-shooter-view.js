import { GameButton, GameAudioButton, GameFullscreenButton, FeedbackHUD, MascotFeedback, MascotHUD, QuestionPanel, DuduQHud, CTAAttention } from "../../matching/gold-master-candidate-v1/src/core/ui/index.js";

export function setupCore(assetApi, shell) {
  DuduQHud(document.querySelector(".game-hud")); QuestionPanel(document.querySelector(".question-panel"));
  const hudMascot = document.querySelector('[data-asset="header-mascot"]'); MascotHUD(hudMascot); hudMascot.src = assetApi.assets.mascots.idle;
  const audio = document.querySelector(".audio-button"); GameAudioButton(audio); audio.onclick = () => { const u = new SpeechSynthesisUtterance('Which one is dog?'); u.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u); };
  const full = document.querySelector(".fullscreen-button"); GameFullscreenButton(full); full.onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
}
export function TargetShooterTarget(item, imageUrl) {
  const button = document.createElement("button"); button.type = "button"; button.className = `target target--${item.position}`; button.dataset.id = item.id; button.dataset.state = "idle"; button.setAttribute("aria-label", `Alvo ${item.label}`);
  button.innerHTML = `<span class="target-rings"><span></span><span></span><span></span></span><img src="${imageUrl}" alt="${item.label}"><b class="target-mark" aria-hidden="true"></b>`;
  // The concentric target comes from the approved, shared target artwork; state rings remain a single overlay geometry.
  button.querySelector(".target-rings").style.backgroundImage = "url('../../../asset-alvo.png')";
  return button;
}
export function renderTargets(items, assets, onSelect) { const root = document.querySelector("[data-targets]"); root.replaceChildren(...items.map(item => { const el = TargetShooterTarget(item, assets.resolveImage(item.image)); el.onclick = () => onSelect(item.id); return el; })); }
export function paintTargets(snapshot) { document.querySelectorAll(".target").forEach(el => { el.dataset.state = el.dataset.id === snapshot.selectedId ? snapshot.status : "idle"; }); }
export function showFeedback(assetApi, status, onAction) { const panel = document.querySelector(".feedback-ribbon"), correct = status === "correct"; panel.hidden = false; FeedbackHUD(panel, status); const mascot = panel.querySelector("img"); MascotFeedback(mascot, status); mascot.src = correct ? assetApi.assets.mascots.correct : assetApi.assets.mascots.error; mascot.alt = "DuduQ"; panel.querySelector("h2").textContent = correct ? "MUITO BEM!" : "QUASE LÁ!"; panel.querySelector("p").textContent = correct ? "Você acertou o alvo correto." : "Esse não é o cachorro. Tente novamente!"; const button = panel.querySelector("button"); button.textContent = correct ? "CONTINUAR" : "TENTAR DE NOVO"; GameButton(button, correct ? "success" : "danger"); button._attention ??= CTAAttention(button, { delay: 5000, repeat: 5000 }); button._attention.start(); button.onclick = () => { button._attention.stop(); panel.hidden = true; onAction(); }; }

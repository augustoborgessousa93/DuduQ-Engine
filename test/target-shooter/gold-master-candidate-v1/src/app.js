import { GameShell, BackgroundLayer, PlayfieldOverlay } from "../../../matching/gold-master-candidate-v1/src/game-shell.js";
import { GameAudioButton, GameFullscreenButton, GameButton, MascotHUD, MascotFeedback, ProgressBadge, ProgressBar, QuestionPanel, FeedbackHUD, CTAAttention } from "../../../matching/gold-master-candidate-v1/src/core/ui/index.js";
import { ResultFXLayer } from "../../../matching/gold-master-candidate-v1/src/core/ui/result-fx.js";
import { createTargetShooterEngine, TargetShooterState } from "./target-shooter-engine.js";

const root = document.querySelector(".game-screen");
const shell = new GameShell(root);
const assets = window.DuduQAssets?.assets;
const targetAsset = new URL("../../../../asset-alvo.png", import.meta.url).href;
BackgroundLayer(shell, assets?.backgrounds?.["1"] || "");
PlayfieldOverlay(shell);
const question = { title: "NUMBERS", subtitle: "English • 1º ano", eyebrow: "OUÇA E ACERTE", instruction: "Ouça e toque na imagem correta.", audioText: "one", feedback: { correct: "Muito bem! ONE!", incorrect: "Ouça novamente e tente outra vez." }, metadata: { targetShooter: { correctIds: ["one"], requiredCorrect: 1, items: [{ id: "one", label: "ONE", image: "1" }, { id: "two", label: "TWO", image: "2" }, { id: "three", label: "THREE", image: "3" }] } } };
const engine = createTargetShooterEngine(question);
const arena = document.querySelector(".target-arena"), feedback = document.querySelector(".feedback-hud"), live = document.querySelector("[data-live]");
const fxLayer = document.querySelector(".result-fx-layer"); fxLayer.dataset.quality = "medium"; const fx = ResultFXLayer(fxLayer);
const continueButton = document.querySelector(".feedback-action"); continueButton.textContent = "CONTINUAR"; const attention = CTAAttention(continueButton, { delay: 5000, repeat: 5000 });
QuestionPanel(document.querySelector(".question-panel")); FeedbackHUD(feedback); ProgressBadge(document.querySelector(".hud-counter"), { completed: 0, total: 1 }); ProgressBar(document.querySelector(".hud-progress"), { completed: 0, total: 1 });
document.querySelector(".hud-mascot").src = assets?.mascots?.idle || "";
MascotHUD(document.querySelector(".hud-mascot")); MascotFeedback(document.querySelector(".feedback-mascot")); GameButton(continueButton, "primary");
GameAudioButton(document.querySelector(".audio-button")).addEventListener("click", () => { live.textContent = `Áudio: ${question.audioText}`; });
GameFullscreenButton(document.querySelector(".fullscreen-button")).addEventListener("click", async () => { if (!document.fullscreenElement) await root.requestFullscreen?.(); else await document.exitFullscreen?.(); });
function target(item) { const button = document.createElement("button"); button.type = "button"; button.className = "target-shooter-target"; button.dataset.state = "idle"; button.dataset.id = item.id; button.setAttribute("aria-label", `Alvo ${item.label}`); button.innerHTML = `<img src="${targetAsset}" alt="" class="target-visual"><span class="target-content">${item.image}</span><span class="target-label">${item.label}</span><span class="target-status" aria-hidden="true"></span>`; button.addEventListener("click", () => aim(button, item.id)); return button; }
question.metadata.targetShooter.items.forEach((item) => arena.querySelector(".targets").append(target(item)));
function paint(state) { arena.dataset.state = state.state; document.querySelectorAll(".target-shooter-target").forEach((node) => { const id = node.dataset.id; node.dataset.state = state.selectedId === id ? (state.state === TargetShooterState.CORRECT || state.state === TargetShooterState.COMPLETE ? "correct" : state.state === TargetShooterState.INCORRECT ? "incorrect" : "selected") : "idle"; node.disabled = ![TargetShooterState.READY, TargetShooterState.AIMING].includes(state.state); }); }
function aim(node, id) { const state = engine.select(id); if (state.state !== TargetShooterState.AIMING) return; paint(state); arena.dataset.aim = id; live.textContent = `${node.getAttribute("aria-label")} selecionado. Tiro lançado.`; window.setTimeout(fire, 220); }
function fire() { const result = engine.shoot(); paint(result); arena.dataset.shot = "true"; window.setTimeout(() => { arena.dataset.shot = ""; showFeedback(result); }, 330); }
function showFeedback(result) { const correct = result.result === "correct"; engine.feedback(); feedback.hidden = false; feedback.dataset.outcome = correct ? "correct" : "incorrect"; feedback.querySelector(".feedback-title").textContent = correct ? "ACERTOU!" : "TENTE DE NOVO"; feedback.querySelector(".feedback-copy").textContent = correct ? question.feedback.correct : question.feedback.incorrect; feedback.querySelector(".feedback-mascot").src = correct ? assets?.mascots?.correct || "" : assets?.mascots?.error || ""; continueButton.textContent = correct ? "CONTINUAR" : "TENTAR DE NOVO"; attention.start(); if (correct) fxLayer.dispatchEvent(new CustomEvent("activity-success", { bubbles: true, detail: { source: "target-shooter" } })); else fx.trigger("incorrect"); }
continueButton.addEventListener("click", () => { attention.stop(); feedback.hidden = true; fx.clear(); engine.reset(); paint(engine.snapshot()); live.textContent = "Escolha um alvo."; });
paint(engine.snapshot()); window.DUDUQTargetShooterCandidate = Object.freeze({ engine, shell });

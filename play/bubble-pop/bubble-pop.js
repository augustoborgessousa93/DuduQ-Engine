import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD, FeedbackHUD, MascotFeedback, SuccessActionButton, ErrorActionButton, CTAAttention, ResultFX } from "/core/ui/index.js";
import { DuduQBubblePopEngine, BUBBLE_POP_ROUND_STATE } from "/core/duduq-bubble-pop-engine.js";
import { DuduqSound } from "/core/audio/duduq-sound-system.js";

const root = document.querySelector("#game");
if (!root) throw new Error("Bubble Pop root was not found.");

const activity = Object.freeze({
  title: "BUBBLE POP",
  progress: Object.freeze({ completed: 0, total: 1 }),
  prompt: Object.freeze({ eyebrow: "FIND THE ANIMALS", question: "POP ALL THE ANIMALS.", audio: "Pop all the animals." }),
  targetsToFind: Object.freeze([Object.freeze({ id: "cow", type: "text", value: "COW" }), Object.freeze({ id: "lion", type: "text", value: "LION" }), Object.freeze({ id: "rabbit", type: "text", value: "RABBIT" }), Object.freeze({ id: "cat", type: "image", imageSrc: "/core/assets/drag-drop/answer-cat-official.png", alt: "CAT" })]),
  incorrectPool: Object.freeze([Object.freeze({ id: "apple", type: "text", value: "APPLE" }), Object.freeze({ id: "book", type: "text", value: "BOOK" }), Object.freeze({ id: "ball", type: "text", value: "BALL" }), Object.freeze({ id: "car", type: "text", value: "CAR" })]),
  spawn: Object.freeze({ minIncorrectBeforeCorrect: 2, correctSpawnDelayMs: 1300, correctEvery: 2, completionMode: "all-targets-found" })
});

export const BUBBLE_POP_TUNING = Object.freeze({
  interactiveSpawnIntervalMs: 650,
  firstInteractiveSpawnMs: 280,
  interactiveMax: 4,
  floatDurationMs: 8200,
  driftAmplitudePx: 28,
  correctSpawnDelayMs: activity.spawn.correctSpawnDelayMs,
  decorativeSpawnIntervalMs: 1550,
  decorativeMax: 6,
  decorativeSizeMinPx: 34,
  decorativeSizeMaxPx: 62
});
export const BUBBLE_POP_TIMING = Object.freeze({ ring: 220, result: 650 });
export const BUBBLE_POP_RING_MOTION = Object.freeze({ startScale: .82, peakScale: 1.1, endScale: 1.2, startOpacity: 1, endOpacity: 0 });
export const POP_FRAME_OFFSETS = Object.freeze({ idle: Object.freeze({ x: 1.5, y: 0 }), ring: Object.freeze({ x: .5, y: 3 }), correct: Object.freeze({ x: 1, y: 1 }), incorrect: Object.freeze({ x: -10, y: -10 }) });
const BUBBLE_POP_SFX = Object.freeze({
  pop: Object.freeze({ src: "./assets/sound-bubble-pop.mp3", volume: .4 }),
  correct: Object.freeze({ src: "./assets/sound-bubble-pop-correct.mp3", volume: .45 }),
  incorrect: Object.freeze({ src: "./assets/sound-bubble-pop-error.mp3", volume: .45 })
});

const FRAME_ASSET = Object.freeze({
  idle: Object.freeze({ src: "./assets/bubble-idle.png", width: 200, height: 200 }),
  ring: Object.freeze({ src: "./assets/bubble-pop-ring.png", width: 200, height: 200 }),
  correct: Object.freeze({ src: "./assets/bubble-result-correct.png", width: 180, height: 156 }),
  incorrect: Object.freeze({ src: "./assets/bubble-result-incorrect.png", width: 146, height: 121 })
});

const background = window.DuduQAssets?.assets?.backgrounds?.["1"] || "";
root.className = "game-screen target-shooter-screen duduq-shared-gold-shell bubble-pop-screen";
root.innerHTML = `
  <div class="world-backdrop" aria-hidden="true"></div><div class="readability-veil" aria-hidden="true"></div><section class="bubble-pop-movement-layer" data-component="BUBBLE_ARENA" aria-label="Bubble Pop play area"></section>
  <section class="game-shell bubble-pop-shell" aria-label="Bubble Pop activity"><div data-canonical-header-slot></div><div data-canonical-question-slot></div><section class="bubble-pop-arena" data-component="BUBBLE_ARENA" aria-label="Bubble Pop play area"></section></section>
  <div class="result-fx-layer success-celebration-layer" aria-hidden="true"></div>
  <section class="feedback-ribbon" data-feedback="" aria-live="polite" aria-atomic="true" hidden><span class="feedback-status-badge" aria-hidden="true"><span class="feedback-status-icon"></span></span><img class="feedback-mascot" data-asset="feedback-mascot" alt=""><div class="feedback-copy"><h2 data-slot="feedback-title"></h2><p data-slot="feedback-detail"></p></div><button class="feedback-action game-button" type="button"><span data-slot="feedback-action"></span></button></section>`;
root.querySelector(".world-backdrop").style.backgroundImage = `url("${background}")`;

const header = DuduQCanonicalHeaderHUD({ title: activity.title, progressCurrent: 0, progressTotal: activity.progress.total, progressArtwork: "penpot-official-board", mascot: "/core/assets/duduq-hud-mascot.png" });
header.dataset.mechanic = "matching";
root.querySelector("[data-canonical-header-slot]").replaceWith(header);
const questionHud = DuduQCanonicalQuestionHUD(activity.prompt);
root.querySelector("[data-canonical-question-slot]").replaceWith(questionHud);
const arena = root.querySelector(".bubble-pop-movement-layer");
const feedback = root.querySelector(".feedback-ribbon");
const resultFx = ResultFX(root.querySelector(".success-celebration-layer"));
FeedbackHUD(feedback, "correct");

const engine = new DuduQBubblePopEngine({ targetsToFind: activity.targetsToFind, incorrectPool: activity.incorrectPool, ...activity.spawn });
const interactive = new Map();
const decorative = new Map();
const bubblePopSfxTemplates = Object.freeze(Object.fromEntries(Object.entries(BUBBLE_POP_SFX).map(([kind, sound]) => {
  const player = new Audio(sound.src); player.preload = "auto";
  return [kind, player];
})));
let lastInteractiveSpawn = -Infinity;
let lastDecorativeSpawn = -Infinity;
let animationFrame = 0;
let roundStartedAt = 0;

const random = (min, max) => min + Math.random() * (max - min);
const now = () => performance.now();
const playBubbleSfx = (kind) => {
  const sound = BUBBLE_POP_SFX[kind]; const template = bubblePopSfxTemplates[kind];
  if (!sound || !template) return;
  const player = template.cloneNode();
  player.volume = sound.volume;
  player.addEventListener("ended", () => player.remove(), { once: true });
  player.play().catch(() => player.remove());
};
const setFrame = (visual, frame) => {
  const asset = FRAME_ASSET[frame]; const offset = POP_FRAME_OFFSETS[frame];
  const image = visual.querySelector("img"); image.src = asset.src;
  visual.style.setProperty("--bubble-image-width", `${asset.width}px`); visual.style.setProperty("--bubble-image-height", `${asset.height}px`);
  visual.style.setProperty("--bubble-offset-x", `${offset.x}px`); visual.style.setProperty("--bubble-offset-y", `${offset.y}px`); visual.dataset.frame = frame;
};
const prepareVisual = (visual) => {
  Object.entries(BUBBLE_POP_RING_MOTION).forEach(([key, value]) => visual.style.setProperty(`--bubble-ring-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, String(value)));
  visual.style.setProperty("--bubble-pop-ring-duration", `${BUBBLE_POP_TIMING.ring}ms`); visual.style.setProperty("--bubble-result-duration", `${BUBBLE_POP_TIMING.result}ms`);
};

function trajectory(size, kind) {
  const width = Math.max(1, arena.clientWidth); const height = Math.max(1, arena.clientHeight);
  const side = ["bottom", "left", "right"][Math.floor(Math.random() * 3)];
  const x = side === "left" ? -size : side === "right" ? width + size : random(size, Math.max(size, width - size));
  const y = side === "bottom" ? height + size : random(height * .34, height + size);
  return Object.freeze({ x, y, endX: side === "bottom" ? x + random(-width * .16, width * .16) : random(width * .16, width * .84), endY: -size * 1.4, duration: kind === "decorative" ? random(9000, 14500) : BUBBLE_POP_TUNING.floatDurationMs, drift: kind === "decorative" ? random(8, 16) : BUBBLE_POP_TUNING.driftAmplitudePx, phase: random(0, Math.PI * 2) });
}

function move(record, stamp) {
  const age = (stamp - record.bornAt) / record.path.duration;
  if (age >= 1) { record.element.remove(); return true; }
  const wave = Math.sin(age * Math.PI * 2 + record.path.phase) * record.path.drift;
  const x = record.path.x + (record.path.endX - record.path.x) * age + wave;
  const y = record.path.y + (record.path.endY - record.path.y) * age;
  record.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  return false;
}

function spawnDecorative(stamp) {
  if (decorative.size >= BUBBLE_POP_TUNING.decorativeMax) return;
  const size = random(BUBBLE_POP_TUNING.decorativeSizeMinPx, BUBBLE_POP_TUNING.decorativeSizeMaxPx);
  const element = document.createElement("span"); element.className = "bubble-pop-decorative"; element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--bubble-decorative-size", `${size}px`); element.innerHTML = `<img src="./assets/bubble-idle.png" alt="">`; arena.append(element);
  decorative.set(Symbol("decorative"), { element, bornAt: stamp, path: trajectory(size, "decorative") });
}

function spawnInteractive(stamp) {
  const bubble = engine.nextInteractiveBubble(stamp); if (!bubble) return;
  const element = document.createElement("button"); element.type = "button"; element.className = "bubble-pop-playable"; element.dataset.bubbleId = bubble.id;
  element.setAttribute("aria-label", `Pop ${bubble.content.alt || bubble.content.value}`);
  element.innerHTML = `<span class="bubble-pop-visual" aria-hidden="true"><img draggable="false" alt=""></span><span class="bubble-pop-content"></span>`;
  const visual = element.querySelector(".bubble-pop-visual"); const content = element.querySelector(".bubble-pop-content"); prepareVisual(visual); setFrame(visual, "idle");
  if (bubble.content.type === "image") { content.classList.add("bubble-pop-content--image"); const image = document.createElement("img"); image.src = bubble.content.src; image.alt = bubble.content.alt; image.draggable = false; content.replaceChildren(image); } else content.textContent = bubble.content.value;
  element.addEventListener("pointerdown", (event) => { event.preventDefault(); popInteractive(bubble.id); });
  arena.append(element); interactive.set(bubble.id, { element, visual, bornAt: stamp, path: trajectory(200, "interactive") });
}

function removeRoundBubbles() { interactive.forEach((record) => record.element.remove()); interactive.clear(); }

function showFooter(outcome) {
  const correct = outcome === "correct"; feedback.hidden = false; feedback.dataset.feedback = outcome; FeedbackHUD(feedback, outcome);
  const mascot = feedback.querySelector(".feedback-mascot"); MascotFeedback(mascot, outcome); mascot.src = correct ? "/core/assets/duduq-feedback-correct.png" : "/core/assets/duduq-feedback-error.png";
  feedback.querySelector('[data-slot="feedback-title"]').textContent = correct ? "Correto!" : "Ops!";
  feedback.querySelector('[data-slot="feedback-detail"]').textContent = correct ? "Você encontrou a palavra correta." : "Essa bolha não é a resposta. Tente novamente!";
  feedback.querySelector('[data-slot="feedback-action"]').textContent = correct ? "CONTINUAR" : "TENTAR DE NOVO";
  const action = feedback.querySelector(".feedback-action"); action.className = `feedback-action game-button ${correct ? "is-correct" : "is-incorrect"}`;
  if (correct) SuccessActionButton(action); else ErrorActionButton(action);
  action._duduqAttention ??= CTAAttention(action); action._duduqAttention.stop(); action._duduqAttention.start();
  action.onclick = () => {
    action._duduqAttention.stop(); feedback.hidden = true;
    if (correct && engine.continueActivity(now())) { roundStartedAt = now(); header.setProgress(0, activity.targetsToFind.length); removeRoundBubbles(); lastInteractiveSpawn = -Infinity; }
  };
}

function popInteractive(id) {
  const hit = engine.beginPop(id); if (!hit) return;
  const record = interactive.get(id); if (!record) return;
  record.element.disabled = true; record.element.style.pointerEvents = "none"; playBubbleSfx("pop"); record.element.querySelector(".bubble-pop-content")?.remove(); setFrame(record.visual, "ring");
  window.setTimeout(() => { setFrame(record.visual, hit.result); playBubbleSfx(hit.result); window.setTimeout(() => { record.element.remove(); interactive.delete(id); const completed = engine.completePop(id); if (!completed) return; const state = engine.snapshot(); header.setProgress(state.foundTargetIds.length, activity.targetsToFind.length); if (completed.activityComplete) { removeRoundBubbles(); resultFx.trigger("correct"); DuduqSound.playVoice("correct"); showFooter("correct"); } }, BUBBLE_POP_TIMING.result); }, BUBBLE_POP_TIMING.ring);
}

function tick(stamp) {
  if (engine.status === BUBBLE_POP_ROUND_STATE.PLAYING) {
    if (interactive.size < BUBBLE_POP_TUNING.interactiveMax && stamp - lastInteractiveSpawn >= BUBBLE_POP_TUNING.interactiveSpawnIntervalMs && stamp - roundStartedAt >= BUBBLE_POP_TUNING.firstInteractiveSpawnMs) { spawnInteractive(stamp); lastInteractiveSpawn = stamp; }
    if (stamp - lastDecorativeSpawn >= BUBBLE_POP_TUNING.decorativeSpawnIntervalMs) { spawnDecorative(stamp); lastDecorativeSpawn = stamp; }
  }
  interactive.forEach((record, id) => { if (move(record, stamp)) interactive.delete(id); });
  decorative.forEach((record, id) => { if (move(record, stamp)) decorative.delete(id); });
  animationFrame = requestAnimationFrame(tick);
}

header.setProgress(0, activity.targetsToFind.length); roundStartedAt = now(); engine.start(roundStartedAt); animationFrame = requestAnimationFrame(tick);
window.DuduQBubblePopShell = Object.freeze({ activity, header, questionHud, arena, feedback, resultFx, engine, destroy: () => { resultFx.clear(); cancelAnimationFrame(animationFrame); } });

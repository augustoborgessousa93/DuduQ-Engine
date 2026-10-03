export const BUBBLE_POP_STATE = Object.freeze({ AVAILABLE: "AVAILABLE", POPPING: "POPPING", POPPED: "POPPED" });
export const BUBBLE_POP_ROUND_STATE = Object.freeze({ PLAYING: "PLAYING", COMPLETED: "COMPLETED" });
const normalizeBubbleContent = (item) => {
  const type = item?.type === "image" ? "image" : "text";
  const id = String(item?.id || "");
  if (!id) throw new Error("Bubble Pop content requires an id.");
  if (type === "image") {
    const src = String(item?.src || item?.imageSrc || "");
    if (!src) throw new Error(`Bubble Pop image content '${id}' requires src or imageSrc.`);
    return Object.freeze({ ...item, id, type, src, alt: String(item?.alt || item?.label || item?.value || "") });
  }
  const value = String(item?.value || item?.label || "");
  if (!value) throw new Error(`Bubble Pop text content '${id}' requires value.`);
  return Object.freeze({ ...item, id, type, value });
};

// Owns serializable activity state only: target queue, pedagogical release,
// hit result and full-activity completion. DOM positions remain renderer-owned.
export class DuduQBubblePopEngine {
  #config; #listeners = new Set(); #round = 0; #status = BUBBLE_POP_ROUND_STATE.PLAYING; #startedAt = 0;
  #incorrectSpawned = 0; #correctSpawned = 0; #incorrectHits = 0; #targetCursor = 0; #sequence = 0;
  #found = new Set(); #entities = new Map();
  constructor(config) {
    const targets = config?.targetsToFind || (config?.correct ? [config.correct] : []);
    if (!targets.length || !config?.incorrectPool?.length) throw new Error("Bubble Pop requires targetsToFind and incorrectPool.");
    this.#config = Object.freeze({ targets: Object.freeze(targets.map(normalizeBubbleContent)), incorrect: Object.freeze(config.incorrectPool.map(normalizeBubbleContent)), minIncorrectBeforeCorrect: Math.max(1, Number(config.minIncorrectBeforeCorrect) || 1), correctSpawnDelayMs: Math.max(0, Number(config.correctSpawnDelayMs) || 0), correctEvery: Math.max(2, Number(config.correctEvery) || 2), completionMode: config.completionMode || "all-targets-found" });
  }
  get status() { return this.#status; }
  get round() { return this.#round; }
  onStateChange(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  start(now = 0) { this.#round++; this.#status = BUBBLE_POP_ROUND_STATE.PLAYING; this.#startedAt = now; this.#incorrectSpawned = 0; this.#correctSpawned = 0; this.#incorrectHits = 0; this.#targetCursor = 0; this.#sequence = 0; this.#found.clear(); this.#entities.clear(); this.#emit(); return this.snapshot(); }
  nextInteractiveBubble(now = 0) {
    if (this.#status !== BUBBLE_POP_ROUND_STATE.PLAYING) return null;
    const elapsed = Number(now) - this.#startedAt; const pending = this.#config.targets.filter((target) => !this.#found.has(target.id));
    const eligible = pending.length && elapsed >= this.#config.correctSpawnDelayMs && this.#incorrectSpawned >= this.#config.minIncorrectBeforeCorrect;
    const correct = Boolean(eligible && this.#sequence % this.#config.correctEvery === 0);
    const content = correct ? pending[this.#targetCursor++ % pending.length] : this.#config.incorrect[this.#incorrectSpawned++ % this.#config.incorrect.length];
    if (correct) this.#correctSpawned++; this.#sequence++;
    const id = `round-${this.#round}-${correct ? "target" : "incorrect"}-${this.#sequence}`;
    const entity = { id, correct, content: Object.freeze({ ...content }), state: BUBBLE_POP_STATE.AVAILABLE }; this.#entities.set(id, entity); this.#emit(); return Object.freeze({ id, correct, content: entity.content });
  }
  beginPop(id) { const entity = this.#entities.get(id); if (this.#status !== BUBBLE_POP_ROUND_STATE.PLAYING || !entity || entity.state !== BUBBLE_POP_STATE.AVAILABLE) return null; entity.state = BUBBLE_POP_STATE.POPPING; this.#emit(); return Object.freeze({ id, result: entity.correct ? "correct" : "incorrect" }); }
  completePop(id) { const entity = this.#entities.get(id); if (!entity || entity.state !== BUBBLE_POP_STATE.POPPING) return null; entity.state = BUBBLE_POP_STATE.POPPED; if (entity.correct) this.#found.add(entity.content.id); else this.#incorrectHits++; const complete = this.#found.size === this.#config.targets.length; if (complete) this.#status = BUBBLE_POP_ROUND_STATE.COMPLETED; this.#emit(); return Object.freeze({ id, result: entity.correct ? "correct" : "incorrect", activityComplete: complete }); }
  continueActivity(now = 0) { if (this.#status !== BUBBLE_POP_ROUND_STATE.COMPLETED) return false; this.start(now); return true; }
  snapshot() { return Object.freeze({ round: this.#round, status: this.#status, foundTargetIds: Object.freeze([...this.#found]), pendingTargetIds: Object.freeze(this.#config.targets.filter((target) => !this.#found.has(target.id)).map((target) => target.id)), incorrectHits: this.#incorrectHits, entities: Object.freeze([...this.#entities.values()].map((item) => Object.freeze({ id: item.id, correct: item.correct, state: item.state, content: item.content }))) }); }
  #emit() { this.#listeners.forEach((listener) => listener(this.snapshot())); }
}

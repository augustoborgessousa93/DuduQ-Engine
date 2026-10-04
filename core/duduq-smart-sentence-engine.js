export const SMART_SENTENCE_MODE = Object.freeze({ COMPLETE: "complete", ORDER: "order", UNSCRAMBLE: "unscramble" });
export const SMART_SENTENCE_STATUS = Object.freeze({ PLAYING: "playing", INCORRECT: "incorrect", CORRECT: "correct", COMPLETED: "completed" });

const modes = new Set(Object.values(SMART_SENTENCE_MODE));
const freeze = (value) => Object.freeze(value);
const normalizePrompt = (prompt = {}) => freeze({ eyebrow: String(prompt.eyebrow || "BUILD THE SENTENCE"), question: String(prompt.question || prompt.title || ""), audio: String(prompt.audio || prompt.question || prompt.title || "") });
const normalizeToken = (item, index) => {
  const id = String(item?.id || `token-${index + 1}`);
  const label = String(item?.label || item?.value || "");
  const answerKey = String(item?.answerKey || item?.value || "").trim().toLowerCase();
  if (!label || !answerKey) throw new Error(`Smart Sentence token '${id}' requires label and answerKey.`);
  return freeze({ id, label, answerKey });
};
const normalizeRound = (round, index) => {
  const mode = String(round?.mode || "").toLowerCase();
  if (!modes.has(mode)) throw new Error(`Smart Sentence round ${index + 1} has an unsupported mode.`);
  const options = (round.options || round.tokens || []).map(normalizeToken);
  if (!options.length) throw new Error(`Smart Sentence round ${index + 1} requires options.`);
  const answer = (round.answer || round.sentence?.filter((part) => part.type === "slot").map((part) => part.answerKey) || []).map((key) => String(key).trim().toLowerCase());
  if (!answer.length) throw new Error(`Smart Sentence round ${index + 1} requires an answer.`);
  return freeze({ id: String(round.id || `round-${index + 1}`), mode, prompt: normalizePrompt(round.prompt), sentence: freeze((round.sentence || []).map((part) => freeze({ ...part }))), options: freeze(options), answer: freeze(answer), tokenKind: round.tokenKind === "letters" ? "letters" : "words" });
};

export class DuduQSmartSentenceEngine {
  #activity; #roundIndex = 0; #status = SMART_SENTENCE_STATUS.PLAYING; #selected = []; #listeners = new Set();
  constructor(activity) {
    const rounds = (activity?.rounds || []).map(normalizeRound);
    if (!rounds.length) throw new Error("Smart Sentence requires at least one round.");
    this.#activity = freeze({ id: String(activity?.id || "smart-sentence"), mechanic: "smart-sentence", rounds: freeze(rounds) });
  }
  get status() { return this.#status; }
  get activity() { return this.#activity; }
  onStateChange(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  start() { this.#roundIndex = 0; this.#status = SMART_SENTENCE_STATUS.PLAYING; this.#selected = this.#round().mode === SMART_SENTENCE_MODE.ORDER ? Array(this.#round().answer.length).fill(null) : []; return this.#emit(); }
  select(id) {
    if (this.#status !== SMART_SENTENCE_STATUS.PLAYING) return null;
    const round = this.#round(); const token = round.options.find((item) => item.id === id);
    if (!token || this.#selected.includes(id)) return null;
    if (round.mode === SMART_SENTENCE_MODE.COMPLETE) this.#selected = [id];
    else if (round.mode === SMART_SENTENCE_MODE.ORDER) {
      const firstEmpty = this.#selected.findIndex((selectedId) => !selectedId);
      if (firstEmpty < 0) return null;
      this.#selected[firstEmpty] = id;
    } else this.#selected = [...this.#selected, id];
    return this.#emit();
  }
  place(id, index) {
    if (this.#status !== SMART_SENTENCE_STATUS.PLAYING || this.#round().mode !== SMART_SENTENCE_MODE.ORDER) return null;
    const round = this.#round(); const targetIndex = Number(index);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= round.answer.length || !round.options.some((item) => item.id === id)) return null;
    const sourceIndex = this.#selected.indexOf(id);
    if (sourceIndex === targetIndex) return null;
    const displacedId = this.#selected[targetIndex] || null;
    if (sourceIndex >= 0) this.#selected[sourceIndex] = displacedId;
    this.#selected[targetIndex] = id;
    return this.#emit();
  }
  remove(id) {
    if (this.#status !== SMART_SENTENCE_STATUS.PLAYING || !this.#selected.includes(id)) return null;
    if (this.#round().mode === SMART_SENTENCE_MODE.ORDER) this.#selected[this.#selected.indexOf(id)] = null;
    else this.#selected = this.#selected.filter((selectedId) => selectedId !== id);
    return this.#emit();
  }
  retry() { if (this.#status !== SMART_SENTENCE_STATUS.INCORRECT) return null; this.#status = SMART_SENTENCE_STATUS.PLAYING; return this.#emit(); }
  confirm() {
    if (this.#status !== SMART_SENTENCE_STATUS.PLAYING || !this.canConfirm()) return null;
    const answer = this.#selected.map((id) => id ? this.#round().options.find((token) => token.id === id)?.answerKey : null);
    const expected = this.#round().answer; const correct = answer.length === expected.length && answer.every((key, index) => key === expected[index]);
    this.#status = correct ? SMART_SENTENCE_STATUS.CORRECT : SMART_SENTENCE_STATUS.INCORRECT;
    return freeze({ correct, snapshot: this.#emit() });
  }
  continue() {
    if (this.#status !== SMART_SENTENCE_STATUS.CORRECT) return null;
    if (this.#roundIndex >= this.#activity.rounds.length - 1) { this.#status = SMART_SENTENCE_STATUS.COMPLETED; return this.#emit(); }
    this.#roundIndex += 1; this.#selected = this.#round().mode === SMART_SENTENCE_MODE.ORDER ? Array(this.#round().answer.length).fill(null) : []; this.#status = SMART_SENTENCE_STATUS.PLAYING; return this.#emit();
  }
  canConfirm() { return this.#status === SMART_SENTENCE_STATUS.PLAYING && this.#selected.length === this.#round().answer.length && this.#selected.every(Boolean); }
  snapshot() {
    const round = this.#round(); const mapped = this.#selected.map((id) => id ? round.options.find((option) => option.id === id) || null : null);
    const selected = round.mode === SMART_SENTENCE_MODE.ORDER ? mapped : mapped.filter(Boolean);
    return freeze({ activityId: this.#activity.id, status: this.#status, roundIndex: this.#roundIndex, roundNumber: this.#roundIndex + 1, totalRounds: this.#activity.rounds.length, round, selected: freeze(selected), available: freeze(round.options.filter((option) => !this.#selected.includes(option.id))), canConfirm: this.canConfirm(), complete: this.#status === SMART_SENTENCE_STATUS.COMPLETED });
  }
  #round() { return this.#activity.rounds[this.#roundIndex]; }
  #emit() { const snapshot = this.snapshot(); this.#listeners.forEach((listener) => listener(snapshot)); return snapshot; }
}

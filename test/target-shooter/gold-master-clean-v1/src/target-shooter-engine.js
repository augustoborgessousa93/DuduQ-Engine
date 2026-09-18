export class TargetShooterEngine extends EventTarget {
  constructor(options) { super(); this.options = options; this.state = { status: "idle", selectedId: null, complete: false }; }
  init() { this.state = { status: "idle", selectedId: null, complete: false }; return this.snapshot(); }
  selectTarget(id) { if (this.state.complete || !this.options.items.some(item => item.id === id)) return this.snapshot(); this.state = { ...this.state, status: "selected", selectedId: id }; return this.emit(); }
  evaluateTarget() { const selected = this.state.selectedId; if (!selected) return this.snapshot(); const correct = selected === this.options.correctId; this.state = { ...this.state, status: correct ? "correct" : "incorrect" }; const snapshot = this.emit(); if (correct) this.complete(); return snapshot; }
  correct() { this.state = { ...this.state, status: "correct" }; return this.emit(); }
  incorrect() { this.state = { ...this.state, status: "incorrect" }; return this.emit(); }
  reset() { return this.init(); }
  complete() { this.state = { ...this.state, status: "correct", complete: true }; this.dispatchEvent(new CustomEvent("complete", { detail: this.snapshot() })); return this.snapshot(); }
  snapshot() { return Object.freeze({ ...this.state }); }
  emit() { const snapshot = this.snapshot(); this.dispatchEvent(new CustomEvent("change", { detail: snapshot })); return snapshot; }
}

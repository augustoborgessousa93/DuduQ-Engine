export const TargetShooterState = Object.freeze({ READY: "READY", AIMING: "AIMING", SHOOTING: "SHOOTING", EVALUATING: "EVALUATING", CORRECT: "CORRECT", INCORRECT: "INCORRECT", FEEDBACK: "FEEDBACK", COMPLETE: "COMPLETE" });

export function createTargetShooterEngine(question) {
  const correctIds = new Set(question.metadata.targetShooter.correctIds);
  const total = question.metadata.targetShooter.requiredCorrect || 1;
  let state = TargetShooterState.READY;
  let selectedId = null;
  let completed = 0;
  const snapshot = () => Object.freeze({ state, selectedId, completed, total, complete: state === TargetShooterState.COMPLETE });
  const select = (id) => {
    if (state !== TargetShooterState.READY || !question.metadata.targetShooter.items.some((item) => item.id === id)) return snapshot();
    selectedId = id; state = TargetShooterState.AIMING; return snapshot();
  };
  const shoot = () => {
    if (state !== TargetShooterState.AIMING || !selectedId) return { ...snapshot(), result: null };
    state = TargetShooterState.SHOOTING;
    const correct = correctIds.has(selectedId);
    state = TargetShooterState.EVALUATING;
    if (correct) { completed += 1; state = completed >= total ? TargetShooterState.COMPLETE : TargetShooterState.CORRECT; }
    else state = TargetShooterState.INCORRECT;
    return { ...snapshot(), result: correct ? "correct" : "incorrect", semantic: state === TargetShooterState.COMPLETE ? "activity-success" : null };
  };
  const feedback = () => { if ([TargetShooterState.CORRECT, TargetShooterState.INCORRECT].includes(state)) state = TargetShooterState.FEEDBACK; return snapshot(); };
  const retry = () => { if ([TargetShooterState.INCORRECT, TargetShooterState.FEEDBACK].includes(state)) { selectedId = null; state = TargetShooterState.READY; } return snapshot(); };
  const reset = () => { state = TargetShooterState.READY; selectedId = null; completed = 0; return snapshot(); };
  return Object.freeze({ snapshot, select, shoot, feedback, retry, reset });
}

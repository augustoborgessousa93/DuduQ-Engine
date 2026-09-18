const STATES = Object.freeze({
  IDLE: "IDLE",
  TARGET_SELECTED: "TARGET_SELECTED",
  AIMING: "AIMING",
  CHARGING: "CHARGING",
  FIRING: "FIRING",
  FLIGHT: "FLIGHT",
  IMPACT: "IMPACT",
  EVALUATING: "EVALUATING",
  CORRECT_FEEDBACK: "CORRECT_FEEDBACK",
  INCORRECT_FEEDBACK: "INCORRECT_FEEDBACK",
  READY_NEXT: "READY_NEXT",
  RESETTING: "RESETTING",
});

const TUNING = Object.freeze({
  AIM_DURATION: 260,
  CHARGE_DURATION: 360,
  RECOIL_DISTANCE: 8,
  RECOIL_DURATION: 150,
  PROJECTILE_DURATION: 420,
  IMPACT_DURATION: 520,
  AIM_MIN_DEG: -62,
  AIM_MAX_DEG: 62,
});

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, reducedMotion() ? Math.min(80, ms) : ms));

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

export { STATES as TargetShooterGameplayState, TUNING as TargetShooterGameplayTuning };

export function TargetShooterGameplay({ game, arena, launcher, feedback, showFeedback, activitySuccess }) {
  const targetNodes = [...arena.querySelectorAll(".target-shooter-target")];
  const aimSystem = launcher.querySelector(".launcher-aim-system");
  const recoilSystem = launcher.querySelector(".launcher-recoil-system");
  const portal = launcher.querySelector(".launcher-portal-front");
  const muzzleMarker = launcher.querySelector(".launcher-muzzle-point");
  const neutralAim = Number(launcher.dataset.neutralAimAngle || 0);
  const worldFx = document.createElement("div");
  worldFx.className = "launcher-gameplay-fx";
  worldFx.setAttribute("aria-hidden", "true");
  arena.append(worldFx);
  const projectile = launcher.querySelector(".launcher-projectile-front");
  const trail = launcher.querySelector(".launcher-trail-front");
  const impact = launcher.querySelector(".launcher-impact-front");
  const particles = launcher.querySelector(".launcher-particles-front");
  [projectile, trail, impact, particles].forEach((node) => { if (node) worldFx.append(node); });

  let state = STATES.IDLE;
  let selected = null;
  let timer = 0;
  let flightFrame = 0;
  let sequence = 0;
  const answerModel = Object.freeze({ correctIds: new Set(["dog"]) });

  const setState = (next) => { state = next; arena.dataset.gameplayState = next; game.dataset.gameplayState = next; };
  const clearTimer = () => { window.clearTimeout(timer); timer = 0; if (flightFrame) cancelAnimationFrame(flightFrame); flightFrame = 0; };
  const setTargetVisuals = (active) => targetNodes.forEach((node) => {
    node.classList.remove("is-selected", "is-hovered", "is-correct", "is-incorrect", "is-subdued", "target-feedback-shake", "target-feedback-pulse");
    node.classList.toggle("is-selected", Boolean(active && node === active));
    node.dataset.gameplayState = active && node === active ? "selected" : "idle";
    node.setAttribute("aria-disabled", active && node !== active ? "true" : "false");
    node.disabled = false;
  });
  const getArenaScale = () => { const rect = arena.getBoundingClientRect(); return rect.width / 1366; };
  const toArenaPoint = ({ x, y }) => { const rect = arena.getBoundingClientRect(); const scale = getArenaScale() || 1; return { x: (x - rect.left) / scale, y: (y - rect.top) / scale }; };
  const getMuzzleWorldPoint = () => { const rect = muzzleMarker.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; };
  // Use the circular ring as the effective visual/hit center; target roots include decorative stand overflow.
  const getTargetCenter = (node) => { const root = node.getBoundingClientRect(); const anchor = node.querySelector(".target-state-ring") || node; const rect = anchor.getBoundingClientRect(); return { x: root.left + root.width / 2, y: rect.top + rect.height / 2 }; };
  const aimAngleFor = (node) => {
    const muzzle = getMuzzleWorldPoint(); const target = getTargetCenter(node);
    const worldAngle = Math.atan2(target.y - muzzle.y, target.x - muzzle.x) * 180 / Math.PI;
    return clamp(worldAngle + 90 - Number(launcher.dataset.artZeroAngle || 0), TUNING.AIM_MIN_DEG, TUNING.AIM_MAX_DEG);
  };
  const setAim = (angle) => { aimSystem.style.transform = `rotate(${angle}deg)`; launcher.dataset.aimAngle = String(Number(angle.toFixed(3))); };
  const setChargeFx = (active) => {
    if (portal) { portal.hidden = !active; portal.classList.toggle("is-charging", active); }
    if (particles) { particles.hidden = !active; particles.classList.toggle("is-charging", active); }
  };
  const setProjectileFx = (active) => { if (projectile) projectile.hidden = !active; if (trail) trail.hidden = !active; };
  const resetFx = () => { setChargeFx(false); setProjectileFx(false); if (impact) { impact.hidden = true; impact.classList.remove("is-impacting"); } recoilSystem.style.transform = "translate3d(0,0,0)"; };
  const placeWorld = (node, point, width, height) => { const p = toArenaPoint(point); node.style.left = `${p.x - width / 2}px`; node.style.top = `${p.y - height / 2}px`; node.style.width = `${width}px`; node.style.height = `${height}px`; };
  const animateProjectile = (from, to, token) => new Promise((resolve) => {
    if (!projectile) return resolve();
    const start = performance.now(); const duration = reducedMotion() ? 90 : TUNING.PROJECTILE_DURATION;
    const tick = (now) => {
      if (token !== sequence) return resolve();
      const t = Math.min(1, (now - start) / duration); const eased = 1 - (1 - t) ** 3;
      const arc = Math.sin(t * Math.PI) * -18; const point = { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased + arc };
      placeWorld(projectile, point, 58, 58); placeWorld(trail, { x: point.x - (to.x - from.x) * .08, y: point.y - (to.y - from.y) * .08 }, 150, 50);
      if (t < 1) flightFrame = requestAnimationFrame(tick); else { flightFrame = 0; resolve(); }
    };
    flightFrame = requestAnimationFrame(tick);
  });
  const finishFeedback = () => { if (!feedback.hidden) feedback.hidden = true; resetFx(); setTargetVisuals(null); selected = null; setAim(neutralAim); setState(STATES.IDLE); };
  const showResult = async (result, node, token) => {
    if (token !== sequence) return;
    setState(STATES.EVALUATING);
    node.classList.remove("is-selected");
    const badge = node.querySelector(".target-status-badge");
    if (badge) { badge.textContent = result === "correct" ? "✓" : "×"; badge.setAttribute("aria-label", result === "correct" ? "Resposta correta" : "Resposta incorreta"); }
    node.classList.add(result === "correct" ? "is-correct" : "is-incorrect", result === "correct" ? "target-feedback-pulse" : "target-feedback-shake");
    if (result === "correct") targetNodes.forEach((other) => other.classList.toggle("is-subdued", other !== node));
    node.dataset.gameplayState = result;
    setState(result === "correct" ? STATES.CORRECT_FEEDBACK : STATES.INCORRECT_FEEDBACK);
    showFeedback(result, () => { if (result === "correct") setState(STATES.READY_NEXT); finishFeedback(); });
    if (result === "correct") activitySuccess();
  };
  const runSequence = async (node, token) => {
    const angle = aimAngleFor(node); setState(STATES.AIMING); setAim(angle); await wait(TUNING.AIM_DURATION);
    if (token !== sequence) return; setState(STATES.CHARGING); setChargeFx(true); await wait(TUNING.CHARGE_DURATION);
    if (token !== sequence) return; setState(STATES.FIRING); setChargeFx(false); setProjectileFx(true);
    recoilSystem.style.transform = `translate3d(${-Math.cos((angle - 90) * Math.PI / 180) * TUNING.RECOIL_DISTANCE}px,${-Math.sin((angle - 90) * Math.PI / 180) * TUNING.RECOIL_DISTANCE}px,0)`;
    timer = window.setTimeout(() => { recoilSystem.style.transform = "translate3d(0,0,0)"; }, reducedMotion() ? 40 : TUNING.RECOIL_DURATION);
    setState(STATES.FLIGHT); const from = getMuzzleWorldPoint(); const to = getTargetCenter(node); await animateProjectile(from, to, token);
    if (token !== sequence) return; setProjectileFx(false); setState(STATES.IMPACT);
    if (impact) { impact.hidden = false; impact.classList.add("is-impacting"); placeWorld(impact, to, 150, 150); }
    await wait(TUNING.IMPACT_DURATION); if (impact) { impact.hidden = true; impact.classList.remove("is-impacting"); }
    if (token !== sequence) return; await showResult(answerModel.correctIds.has(node.dataset.targetId) ? "correct" : "incorrect", node, token);
  };
  const select = (node) => {
    if (![STATES.IDLE, STATES.TARGET_HOVER].includes(state) || !node?.dataset.targetId) return;
    sequence += 1; clearTimer(); selected = node; setTargetVisuals(node); setState(STATES.TARGET_SELECTED); runSequence(node, sequence);
  };
  targetNodes.forEach((node) => {
    const id = node.className.match(/target-shooter-target--([\w-]+)/)?.[1] || ""; node.dataset.targetId = id; node.setAttribute("role", "button"); node.tabIndex = 0; node.setAttribute("aria-label", `Alvo ${id}`);
    node.addEventListener("pointerenter", () => { if (state === STATES.IDLE) { targetNodes.forEach((other) => other.classList.toggle("is-hovered", other === node)); setState(STATES.TARGET_HOVER); } });
    node.addEventListener("pointerleave", () => { node.classList.remove("is-hovered"); if (state === STATES.TARGET_HOVER) setState(STATES.IDLE); });
    node.addEventListener("click", () => select(node)); node.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(node); } });
  });
  arena.addEventListener("pointermove", (event) => {
    if (![STATES.IDLE, STATES.TARGET_HOVER].includes(state)) return;
    const muzzle = getMuzzleWorldPoint(); const worldAngle = Math.atan2(event.clientY - muzzle.y, event.clientX - muzzle.x) * 180 / Math.PI;
    setAim(clamp(worldAngle + 90 - Number(launcher.dataset.artZeroAngle || 0), TUNING.AIM_MIN_DEG, TUNING.AIM_MAX_DEG));
  }, { passive: true });
  arena.addEventListener("pointerleave", () => { if (state === STATES.IDLE || state === STATES.TARGET_HOVER) setAim(neutralAim); }, { passive: true });
  setState(STATES.IDLE); resetFx(); setTargetVisuals(null);
  return Object.freeze({ getMuzzleWorldPoint, getTargetCenter, aimAngleFor, snapshot: () => Object.freeze({ state, selectedId: selected?.dataset.targetId || null }), reset: finishFeedback, tuning: TUNING });
}

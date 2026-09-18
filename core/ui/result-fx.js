const DUDUQ_CELEBRATION_PALETTE = ["#FFD447", "#FFE66D", "#4CAEFF", "#73D8FF", "#71E3BA", "#68D391", "#FF8C7A", "#FFFFFF"];
const PALETTE = DUDUQ_CELEBRATION_PALETTE;
const TYPES = ["paper", "paper", "paper", "paper", "paper", "paper", "paper", "paper", "paper", "paper", "paper", "small-strip", "small-strip", "circle", "capsule", "star", "sparkle"];
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const quality = (layer) => reducedMotion() ? "reduced" : (layer.dataset.quality || "medium");
const budget = (layer) => ({ high: 64, medium: 48, low: 28, reduced: 10 }[quality(layer)] || 48);
const rand = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
function pickCelebrationColor(bag) { if (!bag.length) bag.push(...DUDUQ_CELEBRATION_PALETTE.slice().sort(() => Math.random() - .5)); return bag.pop(); }
function getCelebrationColor(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value) || /^#0{3,6}$/i.test(value)) return pickCelebrationColor(DUDUQ_CELEBRATION_PALETTE.slice());
  return value;
}

function resizeCanvas(canvas, layer) {
  const rect = layer.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
  canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`; return { width: rect.width, height: rect.height, dpr };
}
function drawShape(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.scale(Math.min(.9, p.scale), Math.min(.9, p.scale)); const color = getCelebrationColor(p.color); ctx.globalAlpha = p.opacity; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1;
  if (p.type === "ribbon" || p.type === "curl") { const half = p.width * .5; const length = p.height; const wave = Math.sin(p.flutterPhase) * p.wobble * .18; ctx.beginPath(); ctx.moveTo(-half, -length); ctx.quadraticCurveTo(wave, -length * .35, half, 0); ctx.quadraticCurveTo(-wave, length * .35, half, length); ctx.lineTo(-half, length); ctx.quadraticCurveTo(wave, length * .35, -half, 0); ctx.quadraticCurveTo(-wave, -length * .35, -half, -length); ctx.closePath(); ctx.fill(); ctx.globalAlpha = p.opacity * .32; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-half * .35, -length * .78, Math.max(1, half * .32), length * 1.55); }
  else if (p.type === "small-strip") { const flutter = Math.abs(Math.cos(p.flutterPhase)) * .8 + .2; ctx.scale(flutter, 1); ctx.fillStyle = color; ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height); ctx.globalAlpha = p.opacity * .3; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-p.width * .15, -p.height * .35, Math.max(1, p.width * .18), p.height * .6); }
  else if (p.type === "diamond") { ctx.rotate(Math.PI / 4); ctx.fillRect(-p.width / 2, -p.width / 2, p.width, p.width); }
  else if (p.type === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2); ctx.fill(); }
  else if (p.type === "star" || p.type === "sparkle") { const points = p.type === "star" ? 5 : 4; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.beginPath(); for (let i = 0; i < points * 2; i += 1) { const r = i % 2 ? p.width * .28 : p.width * .7; const a = i * Math.PI / points - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.shadowColor = color; ctx.shadowBlur = p.type === "sparkle" ? 8 : 4; ctx.fill(); }
  else { ctx.scale(Math.abs(Math.cos(p.flutterPhase)) * .85 + .15, 1); ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height); }
  ctx.restore();
}
function spawnParticles(layer, width, height) {
  const count = budget(layer); const particles = []; const seed = Date.now() % 997;
  for (let i = 0; i < count; i += 1) { const depth = i < count * .25 ? 0 : i < count * .75 ? .55 : 1; const type = TYPES[(i + seed) % TYPES.length]; const front = depth > .8;
    particles.push({ type, depth, x: width * (-.05 + rand(i + seed + 1) * 1.1), y: -height * (.05 + rand(i + seed) * .13), vx: (rand(i + seed + 2) - .5) * (front ? 1.8 : .8), vy: (front ? 95 : 55) + rand(i + seed + 3) * 80, gravity: 45 + rand(i + seed + 4) * 65, drift: (rand(i + seed + 5) - .5) * (front ? 160 : 90), wobble: (8 + rand(i + seed + 6) * 26) * (1 + depth), flutterPhase: rand(i + seed + 7) * 6, flutterSpeed: 4 + rand(i + seed + 8) * 7, rotation: rand(i + seed + 9) * 6, rotationSpeed: (rand(i + seed + 10) - .5) * (2 + depth * 8), scale: (.65 + rand(i + seed + 11) * .55) * (front ? 1.5 : depth ? 1 : .75), width: type === "ribbon" || type === "curl" ? 3 + rand(i) * 3 : 6 + rand(i + 1) * 10, height: type === "ribbon" || type === "curl" ? 22 + rand(i + 2) * 25 : 7 + rand(i + 3) * 12, opacity: .45 + depth * .5, delay: (i % 4) * .18 + rand(i + seed + 12) * .55, age: 0 }); }
  const colorBag = DUDUQ_CELEBRATION_PALETTE.slice().sort(() => rand(seed + Math.random()) - .5);
  particles.forEach((particle) => { particle.color = pickCelebrationColor(colorBag); });
  return particles;
}
function drawImpact(ctx, width, height, elapsed) { const t = Math.min(1, elapsed / 700); const cx = width * .5; const cy = height * .68; ctx.save(); ctx.globalCompositeOperation = "lighter"; if (t < .45) { ctx.fillStyle = `rgba(255,220,110,${(1 - t / .45) * .16})`; ctx.fillRect(0, 0, width, height); } const ring = Math.min(1, elapsed / 560); ctx.strokeStyle = `rgba(113,227,186,${(1 - ring) * .35})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 20 + ring * 150, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
function drawBurst(ctx, burst, elapsed) { const t = Math.min(1, Math.max(0, (elapsed - burst.delay) / 700)); if (t >= 1) return; const ease = 1 - (1 - t) * (1 - t); const color = getCelebrationColor(burst.color); ctx.save(); ctx.translate(burst.x + Math.cos(burst.angle) * burst.distance * ease, burst.y + Math.sin(burst.angle) * burst.distance * ease); ctx.rotate(burst.angle + t * 5); ctx.globalAlpha = (1 - t) * .95; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.beginPath(); for (let i = 0; i < 8; i += 1) { const r = i % 2 ? burst.size * .3 : burst.size; const a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }

export function ResultFXLayer(layer) {
  const canvas = document.createElement("canvas"); canvas.className = "duduq-celebration-canvas"; canvas.setAttribute("aria-hidden", "true"); layer.replaceChildren(canvas); let ctx = canvas.getContext("2d"); let frame = 0; let start = 0; let bounds = { width: 1, height: 1, dpr: 1 }; let particles = []; let bursts = []; let active = false;
  const resize = () => { bounds = resizeCanvas(canvas, layer); ctx = canvas.getContext("2d"); };
  const stop = () => { active = false; if (frame) cancelAnimationFrame(frame); frame = 0; particles = []; bursts = []; ctx.clearRect(0, 0, canvas.width, canvas.height); layer.dataset.effect = ""; layer.dataset.pulse = ""; };
  const loop = (now) => { if (!active) return; const elapsed = now - start; const dt = Math.min(.034, (now - (loop.last || now)) / 1000); loop.last = now; const w = bounds.width; const h = bounds.height; ctx.setTransform(bounds.dpr, 0, 0, bounds.dpr, 0, 0); ctx.clearRect(0, 0, w, h); drawImpact(ctx, w, h, elapsed); ctx.save(); ctx.globalCompositeOperation = "lighter"; bursts.forEach((burst) => drawBurst(ctx, burst, elapsed)); particles.forEach((p) => { p.age += dt; if (p.age < p.delay) return; const t = p.age - p.delay; p.vy += p.gravity * dt; p.y += p.vy * dt; const drift = Math.max(-75, Math.min(75, p.drift)); p.x += p.vx * dt + Math.sin(t * .8) * drift * dt * .08; p.rotation += p.rotationSpeed * dt; p.flutterPhase += p.flutterSpeed * dt; if (p.y < h + 40) drawShape(ctx, p); }); ctx.restore(); if (elapsed > (reducedMotion() ? 1200 : 4600)) { stop(); return; } frame = requestAnimationFrame(loop); };
  const trigger = (effect) => { if (!["correct", "incorrect"].includes(effect)) return; stop(); layer.dataset.effect = effect; if (effect !== "correct") { layer.dispatchEvent(new CustomEvent("duduq:fx", { bubbles: true, detail: { effect } })); return; } resize(); particles = spawnParticles(layer, bounds.width, bounds.height); const cx = bounds.width * .5; const cy = bounds.height * .68; const burstCount = reducedMotion() ? 4 : 16; bursts = Array.from({ length: burstCount }, (_, i) => ({ x: cx, y: cy, angle: i * Math.PI * 2 / burstCount, distance: 70 + (i % 4) * 18, size: 5 + (i % 3) * 2, delay: 100 + (i % 4) * 24, color: PALETTE[i % PALETTE.length] })); active = true; start = performance.now(); loop.last = start; frame = requestAnimationFrame(loop); layer.dispatchEvent(new CustomEvent("duduq:fx", { bubbles: true, detail: { effect, preset: "celebration.success.canvas.aaa" } })); };
  const semanticSuccess = () => trigger("correct");
  layer.addEventListener("activity-success", semanticSuccess);
  window.addEventListener("resize", resize, { passive: true }); resize(); return Object.freeze({ trigger, play: (name) => name === "success" ? trigger("correct") : trigger(name), clear: stop });
}
export const ResultFX = ResultFXLayer;
export const DuduQFX = ResultFXLayer;

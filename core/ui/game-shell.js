export function calculateUIScale(viewport, designViewport = { width: 1366, height: 768 }) {
  const width = Math.max(1, Number(viewport?.width) || 1);
  const height = Math.max(1, Number(viewport?.height) || 1);
  const raw = Math.min(width / designViewport.width, height / designViewport.height);
  return Math.min(1.2, Math.max(.82, raw));
}

export class GameShell {
  constructor(root) {
    if (!(root instanceof HTMLElement)) throw new TypeError("GameShell precisa de um elemento raiz.");
    this.root = root;
    this.root.dataset.gameCore = "gold-master-candidate-v1";
    this.designViewport = Object.freeze({ width: 1366, height: 768 });
    this.updateScale = this.updateScale.bind(this);
    this.onFullscreenChange = this.onFullscreenChange.bind(this);
    window.addEventListener("resize", this.updateScale, { passive: true });
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    this.updateScale();
  }

  updateScale() {
    const bounds = this.root.getBoundingClientRect();
    // A short viewport must never inflate UI from width alone.
    const scale = calculateUIScale({ width: bounds.width || window.innerWidth, height: bounds.height || window.innerHeight }, this.designViewport);
    this.root.style.setProperty("--duduq-ui-scale", scale.toFixed(3));
    this.root.dataset.fullscreen = String(document.fullscreenElement === document.documentElement);
  }

  onFullscreenChange() { requestAnimationFrame(this.updateScale); }

  destroy() {
    window.removeEventListener("resize", this.updateScale);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
  }
}

export function BackgroundLayer(shell, imageUrl) {
  shell.root.style.setProperty("--duduq-world-image", imageUrl ? `url("${imageUrl}")` : "none");
}

export function PlayfieldOverlay(shell) {
  // Overlay Soft é um layer de leitura independente, sem filtros sobre assets.
  shell.root.dataset.playfieldOverlay = "soft";
}

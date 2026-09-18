import { DuduQHud, MascotHUD, ProgressBadge, ProgressBar } from "./index.js";
import { DuduQCanonicalFullscreenButton } from "./duduq-canonical-fullscreen-button.js";

/** The only runtime constructor for a DuduQ activity header. */
export function DuduQCanonicalHeaderHUD({ root, title = "", progressCurrent = 0, progressTotal = 1, mascot = "", onFullscreen } = {}) {
  const header = root || document.createElement("header");
  if (!root) header.innerHTML = `<div class="hud-brand"><span class="duduq-canonical-mascot-motion"><img class="hud-mascot" alt="DuduQ"></span><div class="hud-title-group"><h1 class="hud-title"></h1></div></div><div class="duduq-canonical-progress-region"><div class="hud-progress" role="progressbar" aria-label="Progresso da atividade"><span class="hud-progress-fill" aria-hidden="true"></span></div></div><div class="hud-counter"><span></span></div>`;
  header.classList.add("duduq-canonical-header-hud", "game-hud");
  header.setAttribute("aria-label", "Cabeçalho do jogo");
  DuduQHud(header);
  header.dataset.component = "DUDUQ_CANONICAL_HEADER_HUD";
  header.querySelector(".hud-subtitle")?.remove();
  const progress = header.querySelector(".hud-progress");
  const counter = header.querySelector(".hud-counter");
  let region = header.querySelector(".duduq-canonical-progress-region");
  if (!region) { region = document.createElement("div"); region.className = "duduq-canonical-progress-region"; progress?.replaceWith(region); if (progress) region.append(progress); }
  if (counter) header.append(counter);
  header.querySelector(".duduq-canonical-progress-system")?.remove();
  header.querySelector(".duduq-canonical-header-controls")?.remove();
  const image = header.querySelector(".hud-mascot");
  // Hydrated legacy roots receive the same Core-owned motion layer as fresh mounts.
  if (image && !image.parentElement?.classList.contains("duduq-canonical-mascot-motion")) {
    const motion = document.createElement("span");
    motion.className = "duduq-canonical-mascot-motion";
    image.replaceWith(motion); motion.append(image);
  }
  if (mascot) image.src = mascot;
  MascotHUD(image);
  header.querySelector(".hud-title").textContent = title;
  const setProgress = (completed = progressCurrent, total = progressTotal) => {
    const safeTotal = Math.max(1, Number(total) || 1);
    const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
    const counter = header.querySelector(".hud-counter");
    (counter.firstElementChild || counter).textContent = `${safeCompleted} / ${safeTotal}`;
    ProgressBadge(counter, { completed: safeCompleted, total: safeTotal });
    const bar = header.querySelector(".hud-progress");
    bar.querySelector(".hud-progress-fill").style.width = `${safeCompleted / safeTotal * 100}%`;
    bar.setAttribute("aria-valuetext", `${safeCompleted} de ${safeTotal} etapas concluídas`);
    ProgressBar(bar, { completed: safeCompleted, total: safeTotal });
  };
  setProgress();
  header.querySelector(".fullscreen-button")?.remove();
  header.append(DuduQCanonicalFullscreenButton({ onChange: onFullscreen }));
  header.setProgress = setProgress;
  return header;
}

const icon = `<img src="/fullscreen-official.svg" alt="" aria-hidden="true">`;
const fullscreenStateKey = Symbol.for("duduq.fullscreen-enhanced-listener");

function syncEnhancedFullscreenMode() {
  const active = Boolean(document.fullscreenElement);
  document.documentElement?.classList.toggle("duduq-fullscreen-enhanced", active);
  document.body?.classList.toggle("duduq-fullscreen-enhanced", active);
  document.querySelectorAll("#game").forEach((game) => {
    game.dataset.duduqFullscreenEnhanced = String(active);
  });
}

if (typeof document !== "undefined" && !document[fullscreenStateKey]) {
  document.addEventListener("fullscreenchange", syncEnhancedFullscreenMode);
  document[fullscreenStateKey] = true;
  syncEnhancedFullscreenMode();
}

/** Core-owned fullscreen control used exclusively by the canonical Header HUD. */
export function DuduQCanonicalFullscreenButton({ target = document.documentElement, onChange, ariaLabel = "Ativar tela cheia", disabled = false } = {}) {
  const button = document.createElement("button");
  button.className = "fullscreen-button";
  button.type = "button";
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-label", ariaLabel);
  button.title = "Tela cheia";
  button.innerHTML = icon;
  button.dataset.component = "DUDUQ_CANONICAL_FULLSCREEN_BUTTON";
  const sync = () => {
    const active = Boolean(document.fullscreenElement);
    syncEnhancedFullscreenMode();
    button.dataset.fullscreen = String(active);
    button.setAttribute("aria-label", active ? "Sair da tela cheia" : ariaLabel);
    onChange?.(active);
  };
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await target?.requestFullscreen?.(); }
    catch (error) { console.error("[DUDUQ FULLSCREEN]", error); }
  });
  document.addEventListener("fullscreenchange", sync);
  sync();
  return button;
}

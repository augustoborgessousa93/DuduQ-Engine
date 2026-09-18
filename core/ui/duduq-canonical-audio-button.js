const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path class="audio-wave" d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/></svg>`;

/** Core-owned audio control used exclusively by the canonical Question HUD. */
export function DuduQCanonicalAudioButton({ onPlay, ariaLabel = "Ouvir instrução", disabled = false, state = "idle" } = {}) {
  const button = document.createElement("button");
  button.className = "audio-button";
  button.type = "button";
  button.disabled = Boolean(disabled);
  button.dataset.audioState = state;
  button.setAttribute("aria-label", ariaLabel);
  button.title = ariaLabel;
  button.innerHTML = icon;
  button.dataset.component = "DUDUQ_CANONICAL_AUDIO_BUTTON";
  button.addEventListener("click", async () => {
    if (button.disabled || button.dataset.audioState === "playing") return;
    button.dataset.audioState = "playing";
    try { await onPlay?.(); }
    catch (error) { console.error("[DUDUQ AUDIO]", error); }
    finally { window.setTimeout(() => { if (button.isConnected) button.dataset.audioState = "idle"; }, 180); }
  });
  return button;
}

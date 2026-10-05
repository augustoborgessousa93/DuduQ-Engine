const icon = `<span class="duduq-audio-icon-content" aria-hidden="true"><span class="duduq-audio-icon"><svg viewBox="0 0 23.5 18" preserveAspectRatio="xMidYMid meet"><path d="M0 6L5 6L12 0L12 18L5 12L0 12Z" fill="#ffffff" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/><path class="audio-wave" d="M16 4C19.333984375 7.333984375 19.333984375 10.66796875 16 14M19 0C25 6 25 12 19 18" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg></span></span>`;

/** Core-owned audio control used exclusively by the canonical Question HUD. */
export function DuduQCanonicalAudioButton({ onPlay, ariaLabel = "Ouvir instrução", disabled = false, state = "idle" } = {}) {
  const button = document.createElement("button");
  button.className = "audio-button";
  button.type = "button";
  button.disabled = Boolean(disabled);
  button.dataset.audioState = state;
  button.setAttribute("aria-label", ariaLabel);
  button.title = ariaLabel;
  button.innerHTML = `<span class="duduq-audio-depth" aria-hidden="true"></span><span class="duduq-audio-surface" aria-hidden="true"></span><span class="duduq-audio-highlight" aria-hidden="true"></span>${icon}`;
  button.dataset.component = "DUDUQ_CANONICAL_AUDIO_BUTTON";
  let activePlayback = null;
  let playHandler = onPlay;
  button.setPlayHandler = handler => { playHandler = handler; };
  button.playAudio = () => {
    if (button.disabled || typeof playHandler !== "function") return Promise.resolve(false);
    if (activePlayback) return activePlayback;
    button.dataset.audioState = "playing";
    button.setAttribute("aria-busy", "true");
    const playback = Promise.resolve().then(() => playHandler()).then(result => result !== false).finally(() => {
      if (button.isConnected && activePlayback === playback) {
        button.dataset.audioState = "idle";
        button.setAttribute("aria-busy", "false");
      }
      if (activePlayback === playback) activePlayback = null;
    });
    activePlayback = playback;
    return playback;
  };
  button.setAttribute("aria-busy", state === "playing" ? "true" : "false");
  button.addEventListener("click", () => {
    button.playAudio().catch(error => console.error("[DUDUQ AUDIO]", error));
  });
  return button;
}

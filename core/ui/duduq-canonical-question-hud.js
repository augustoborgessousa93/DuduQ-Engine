import { QuestionPanel } from "./index.js";
import { DuduQCanonicalAudioButton } from "./duduq-canonical-audio-button.js";

/** The only runtime constructor for a DuduQ activity question/instruction HUD. */
export function DuduQCanonicalQuestionHUD({ root, eyebrow = "", question = "", audio = "", onAudio, audioDisabled = false } = {}) {
  const panel = root || document.createElement("section");
  if (!root) panel.innerHTML = `<div class="question-copy"><p class="question-label"></p><h2 class="question-prompt"></h2></div>`;
  panel.classList.add("duduq-canonical-question-hud", "question-panel");
  const prompt = panel.querySelector(".question-prompt");
  prompt.id = `duduq-question-${Math.random().toString(36).slice(2)}`;
  panel.setAttribute("aria-labelledby", prompt.id);
  panel.dataset.component = "DUDUQ_CANONICAL_QUESTION_HUD";
  QuestionPanel(panel);
  let visualShadow = panel.querySelector(":scope > .duduq-question-panel-shadow");
  if (!visualShadow) {
    visualShadow = document.createElement("div");
    visualShadow.className = "duduq-question-panel-shadow";
    visualShadow.setAttribute("aria-hidden", "true");
    panel.prepend(visualShadow);
  }
  panel.querySelector(".question-label").textContent = eyebrow;
  prompt.textContent = question;
  const spokenPrompt = String(audio || question || "").trim();
  const play = typeof onAudio === "function" ? onAudio : spokenPrompt ? () => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(spokenPrompt);
      utterance.lang = "en-US";
      utterance.onend = () => resolve(true);
      utterance.onerror = event => {
        if (["canceled", "interrupted"].includes(event.error)) resolve(false);
        else {
          const error = new Error(`Question speech failed: ${event.error || "unknown"}`);
          error.name = event.error === "not-allowed" ? "NotAllowedError" : "SpeechSynthesisError";
          reject(error);
        }
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  } : undefined;
  const autoPlayKey = JSON.stringify([String(eyebrow || "").trim(), String(question || "").trim(), spokenPrompt]);
  const priorButton = panel.querySelector(".audio-button");
  const samePrompt = panel.dataset.questionAudioPrompt === autoPlayKey;
  if (priorButton && !samePrompt && priorButton.dataset.audioState === "playing" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  let audioButton = priorButton;
  if (audioButton && samePrompt) {
    audioButton.setPlayHandler?.(play);
    audioButton.disabled = Boolean(audioDisabled);
  } else {
    audioButton?.remove();
    audioButton = DuduQCanonicalAudioButton({ onPlay: play, disabled: audioDisabled });
    panel.append(audioButton);
    panel.dataset.questionAudioPrompt = autoPlayKey;
  }

  if (play && !audioDisabled && autoPlayKey && panel.dataset.questionAudioAutoPlayed !== autoPlayKey) {
    panel.dataset.questionAudioAutoPlayed = autoPlayKey;
    panel.dataset.questionAudioAutoplayState = "waiting-for-mount";
    const waitForFrames = count => new Promise(resolve => {
      const next = () => count-- > 0 ? window.requestAnimationFrame(next) : resolve();
      next();
    });
    const waitForHUDReady = async () => {
      while (!audioButton.isConnected || !panel.isConnected || panel.getBoundingClientRect().width === 0 || panel.getBoundingClientRect().height === 0) {
        if (panel.dataset.questionAudioPrompt !== autoPlayKey) return false;
        if (!panel.__duduqQuestionAudioMountWaitStartedAt) panel.__duduqQuestionAudioMountWaitStartedAt = performance.now();
        if (performance.now() - panel.__duduqQuestionAudioMountWaitStartedAt > 5000) return false;
        await waitForFrames(1);
      }
      delete panel.__duduqQuestionAudioMountWaitStartedAt;
      if (document.visibilityState === "hidden") {
        panel.dataset.questionAudioAutoplayState = "waiting-for-visible";
        await new Promise(resolve => document.addEventListener("visibilitychange", resolve, { once: true }));
      }
      panel.dataset.questionAudioAutoplayState = "waiting-for-paint";
      await waitForFrames(2);
      return panel.dataset.questionAudioPrompt === autoPlayKey && audioButton.isConnected;
    };
    waitForHUDReady().then(ready => {
      if (!ready) {
        if (panel.dataset.questionAudioAutoPlayed === autoPlayKey) delete panel.dataset.questionAudioAutoPlayed;
        return false;
      }
      panel.dataset.questionAudioAutoplayState = "playing";
      return audioButton.playAudio();
    }).then(played => {
      if (played) {
        panel.dataset.questionAudioAutoplayState = "played";
        return;
      }
      panel.dataset.questionAudioAutoplayState = "blocked";
      installGestureRetry();
    }).catch(error => {
      panel.dataset.questionAudioAutoplayState = "blocked";
      if (error?.name !== "NotAllowedError") console.error("[DUDUQ QUESTION AUDIO]", error);
      installGestureRetry();
    });
    function installGestureRetry() {
      const resumeOnGesture = () => {
        window.removeEventListener("pointerdown", resumeOnGesture, true);
        window.removeEventListener("keydown", resumeOnGesture, true);
        if (audioButton.isConnected) audioButton.playAudio().catch(() => {});
      };
      window.addEventListener("pointerdown", resumeOnGesture, { once: true, capture: true });
      window.addEventListener("keydown", resumeOnGesture, { once: true, capture: true });
    }
  }
  return panel;
}

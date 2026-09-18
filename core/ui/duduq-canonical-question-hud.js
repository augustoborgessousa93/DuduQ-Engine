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
  panel.querySelector(".question-label").textContent = eyebrow;
  prompt.textContent = question;
  panel.querySelector(".audio-button")?.remove();
  const play = typeof onAudio === "function" ? onAudio : audio ? () => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(audio); utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } : undefined;
  panel.append(DuduQCanonicalAudioButton({ onPlay: play, disabled: audioDisabled }));
  return panel;
}

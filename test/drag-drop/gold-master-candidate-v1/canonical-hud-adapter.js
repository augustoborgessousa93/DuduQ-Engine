import { DuduQCanonicalHeaderHUD, DuduQCanonicalQuestionHUD } from "../../../core/ui/index.js";

const speak = (text) => () => {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "pt-BR";
  window.speechSynthesis.speak(utterance);
};

function mountCanonicalHud() {
  const header = document.querySelector(".duduq-engine-header");
  const question = document.querySelector(".duduq-dd-instruction, .duduq-udd-instruction");
  if (!header || !question || document.querySelector(".duduq-canonical-header-hud")) return false;
  header.replaceWith(DuduQCanonicalHeaderHUD({ title: "DRAG & DROP", subtitle: "Arraste a palavra correta até a imagem", progressCurrent: 1, progressTotal: 1, mascot: "../../../core/assets/duduq-hud-mascot.png" }));
  question.replaceWith(DuduQCanonicalQuestionHUD({ eyebrow: "QUAL PALAVRA REPRESENTA A IMAGEM?", question: "OUÇA E ARRASTE A PALAVRA CORRETA", onAudio: speak("Ouça e arraste a palavra correta") }));
  document.dispatchEvent(new CustomEvent("duduq:canonical-hud-ready", { detail: { mechanic: "drag-drop" } }));
  return true;
}

const observer = new MutationObserver(() => { if (mountCanonicalHud()) observer.disconnect(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
mountCanonicalHud();

/* =========================================================
   DUDUQ MECHANIC — WORD SLASH
   Candidate Release 1.0.8 — Audio Functional Parity + Exact Typography

   Homologação isolada:
   - reaproveita o adapter funcional 1.0.7 já carregado antes desta camada;
   - usa exatamente a tipografia final do Target Shooter 1.0.21;
   - corrige o clique manual do áudio do enunciado com speechSynthesis;
   - mantém estado visual verde durante reprodução e ícone verde-escuro;
   - não altera corte, física, spawn, score, progressão ou completion flow.
   ========================================================= */
(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Word Slash 1.0.8] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const BASE = window.DuduQ.getMechanic?.("word-slash");
  const VERSION = "1.0.8";

  if (!BASE || BASE.version !== "1.0.7") {
    console.error("[DuduQ Word Slash 1.0.8] Base 1.0.7 não registrada antes da camada de homologação.");
    return;
  }

  function asText(value) {
    return value == null ? "" : String(value).trim();
  }

  function questionsFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.items)) return payload.items;
    return [payload];
  }

  function normalized(value) {
    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function resolveSpeech(payload, doc) {
    const questions = questionsFromPayload(payload);
    const visibleInstruction = asText(doc?.querySelector?.(".duduq-ws-instruction h2")?.textContent);
    const visibleKey = normalized(visibleInstruction);
    const question =
      questions.find((item) => normalized(item?.instruction) === visibleKey) ||
      questions[0] ||
      {};
    const config = question?.metadata?.wordSlash || {};
    const text = asText(
      question?.audio?.text ||
      question?.media?.audio?.text ||
      config.audioText ||
      config.target?.spokenText ||
      question?.instruction ||
      visibleInstruction
    );
    const lang = asText(
      question?.audio?.language ||
      question?.media?.audio?.language ||
      "en-US"
    ) || "en-US";
    return { text, lang };
  }

  function installParity(doc, payload) {
    if (!doc?.documentElement) return function () {};

    const styleId = "duduq-word-slash-1-0-8-exact-parity";
    if (!doc.getElementById(styleId)) {
      const style = doc.createElement("style");
      style.id = styleId;
      style.textContent = `
html body #root .duduq-engine-stage .duduq-ws-instruction h2 {
  font-family: Fredoka, Nunito, ui-rounded, system-ui, sans-serif !important;
  font-size: clamp(18px, 2vw, 28px) !important;
  font-weight: 800 !important;
  line-height: 1.16 !important;
}
html body #root .duduq-engine-stage .duduq-ws-root[data-duduq-manual-audio-playing="true"] .duduq-ws-audio {
  border-color: #359500 !important;
  background: linear-gradient(180deg, #70E90E 0%, #58CC02 62%, #49B900 100%) !important;
  color: #1B5E20 !important;
  box-shadow: 0 5px 0 #2F8A00, 0 10px 20px rgba(57,156,0,.22), inset 0 2px 0 rgba(255,255,255,.38) !important;
  filter: none !important;
  transform: translateY(-1px) !important;
}
@media (max-width: 640px) {
  html body #root .duduq-engine-stage .duduq-ws-instruction h2 {
    font-size: clamp(18px, 5vw, 22px) !important;
  }
}
`;
      (doc.head || doc.documentElement).appendChild(style);
    }

    const win = doc.defaultView;
    const synth = win?.speechSynthesis;
    const Utterance = win?.SpeechSynthesisUtterance;
    let currentUtterance = null;
    let fallbackTimer = null;
    let destroyed = false;

    function root() {
      return doc.querySelector(".duduq-ws-root");
    }

    function setPlaying(value) {
      const shell = root();
      if (shell) {
        if (value) shell.setAttribute("data-duduq-manual-audio-playing", "true");
        else shell.removeAttribute("data-duduq-manual-audio-playing");
      }
      const button = doc.querySelector(".duduq-ws-audio");
      if (button) {
        button.setAttribute("aria-label", value ? "Áudio em reprodução" : "Ouvir instrução");
      }
    }

    function clearFallback() {
      if (fallbackTimer !== null) {
        win?.clearTimeout?.(fallbackTimer);
        fallbackTimer = null;
      }
    }

    function finish() {
      clearFallback();
      currentUtterance = null;
      setPlaying(false);
    }

    function stopSpeech() {
      clearFallback();
      try { synth?.cancel?.(); } catch (_) {}
      currentUtterance = null;
      setPlaying(false);
    }

    function handleAudioClick(event) {
      const target = event.target instanceof win.Element ? event.target : null;
      const button = target?.closest?.(".duduq-ws-audio");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const speech = resolveSpeech(payload, doc);
      if (!speech.text) return;
      if (!synth || typeof Utterance !== "function") {
        console.warn("[DuduQ Word Slash 1.0.8] speechSynthesis indisponível neste navegador.");
        return;
      }

      stopSpeech();
      try {
        const utterance = new Utterance(speech.text);
        utterance.lang = speech.lang;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onend = finish;
        utterance.onerror = finish;
        currentUtterance = utterance;
        setPlaying(true);
        synth.speak(utterance);
        fallbackTimer = win.setTimeout(function () {
          if (!destroyed && currentUtterance === utterance) finish();
        }, Math.min(12000, Math.max(2400, speech.text.length * 140 + 1200)));
      } catch (error) {
        console.error("[DuduQ Word Slash 1.0.8] Falha ao reproduzir instrução.", error);
        finish();
      }
    }

    doc.addEventListener("click", handleAudioClick, true);

    return function cleanup() {
      destroyed = true;
      doc.removeEventListener("click", handleAudioClick, true);
      stopSpeech();
      try { doc.getElementById(styleId)?.remove(); } catch (_) {}
    };
  }

  function mount(args) {
    const destroyBase = BASE.mount(args);
    let cleanupParity = null;
    let timer = null;
    let attempts = 0;

    function probe() {
      if (cleanupParity) return true;
      const iframe = args?.container?.querySelector?.("iframe");
      const doc = iframe?.contentDocument;
      if (!doc?.body || !doc.querySelector(".duduq-ws-root")) return false;
      cleanupParity = installParity(doc, args.payload);
      return true;
    }

    timer = window.setInterval(function () {
      attempts += 1;
      if (probe() || attempts > 400) {
        window.clearInterval(timer);
        timer = null;
      }
    }, 25);
    probe();

    return function destroy() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      cleanupParity?.();
      cleanupParity = null;
      if (typeof destroyBase === "function") destroyBase();
    };
  }

  window.DuduQ.registerMechanic({
    id: "word-slash",
    version: VERSION,
    validate: BASE.validate,
    mount,
    metadata: {
      ...(BASE.metadata || {}),
      homologationBase: "1.0.7",
      shellReference: "target-shooter-1.0.21",
      exactInstructionTypography: true,
      manualAudioParity: true
    }
  });
})();
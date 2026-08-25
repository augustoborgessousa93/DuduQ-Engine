/* DUDUQ Year2 M01-12 — homologation-only first-listen gate */
(function () {
  "use strict";

  const STEP_ID = "en2-m1-12-drag-drop";
  const GATE_ATTR = "data-duduq-m1-12-first-listen";
  const FRAME_ATTR = "data-duduq-m1-12-gated-frame";
  const OVERLAY_ID = "duduq-m1-12-first-listen-overlay";
  const STIMULUS = "L. E. O.";

  let active = false;
  let frame = null;
  let overlay = null;
  let speechTimeout = null;
  let childCancelTimer = null;
  let restoreChildSpeak = null;

  function setState(value) {
    document.documentElement.setAttribute(GATE_ATTR, value);
  }

  function clearSpeechTimeout() {
    if (speechTimeout !== null) {
      window.clearTimeout(speechTimeout);
      speechTimeout = null;
    }
  }

  function stopChildCancelLoop() {
    if (childCancelTimer !== null) {
      window.clearInterval(childCancelTimer);
      childCancelTimer = null;
    }
  }

  function cancelChildSpeech() {
    try {
      frame?.contentWindow?.speechSynthesis?.cancel?.();
    } catch (_) {}
  }

  function suppressChildAutoplay(targetFrame) {
    frame = targetFrame;

    const patch = function () {
      if (!active || !frame) return;

      try {
        const synth = frame.contentWindow?.speechSynthesis;
        if (!synth || synth.__DUDUQ_M1_12_GATE_PATCHED__) return;

        const originalSpeak = synth.speak;
        if (typeof originalSpeak !== "function") return;

        synth.__DUDUQ_M1_12_GATE_PATCHED__ = true;
        synth.speak = function (utterance) {
          if (active) return;
          return originalSpeak.call(synth, utterance);
        };

        restoreChildSpeak = function () {
          try {
            synth.speak = originalSpeak;
            delete synth.__DUDUQ_M1_12_GATE_PATCHED__;
          } catch (_) {}
        };

        synth.cancel?.();
      } catch (_) {}
    };

    try {
      targetFrame.addEventListener("load", patch, { once: true });
    } catch (_) {}

    patch();

    stopChildCancelLoop();
    childCancelTimer = window.setInterval(function () {
      if (!active) {
        stopChildCancelLoop();
        return;
      }
      cancelChildSpeech();
      patch();
    }, 40);
  }

  function hideFrame(targetFrame) {
    targetFrame.setAttribute(FRAME_ATTR, "true");
    targetFrame.setAttribute("aria-hidden", "true");
    targetFrame.style.setProperty("visibility", "hidden", "important");
    targetFrame.style.setProperty("opacity", "0", "important");
    targetFrame.style.setProperty("pointer-events", "none", "important");
    suppressChildAutoplay(targetFrame);
  }

  function revealFrame() {
    if (!frame) return;

    stopChildCancelLoop();
    cancelChildSpeech();
    active = false;

    if (typeof restoreChildSpeak === "function") {
      restoreChildSpeak();
      restoreChildSpeak = null;
    }

    if (frame.hasAttribute(FRAME_ATTR)) {
      frame.removeAttribute(FRAME_ATTR);
      frame.removeAttribute("aria-hidden");
      frame.style.removeProperty("visibility");
      frame.style.removeProperty("opacity");
      frame.style.removeProperty("pointer-events");
    }

    overlay?.remove?.();
    overlay = null;
    setState("revealed");

    try {
      window.dispatchEvent(new CustomEvent("duduq:m1-12-first-listen-revealed", {
        detail: { stepId: STEP_ID }
      }));
    } catch (_) {}
  }

  function failPlayback(message) {
    clearSpeechTimeout();
    setState("error");

    const status = overlay?.querySelector?.("[data-gate-status]");
    const button = overlay?.querySelector?.("button");

    if (status) status.textContent = message;
    if (button) {
      button.disabled = false;
      button.textContent = "TENTAR O ÁUDIO NOVAMENTE";
    }
  }

  function playFirstListen(button, status) {
    if (!active) return;

    stopChildCancelLoop();
    cancelChildSpeech();

    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      failPlayback("Áudio indisponível neste navegador. As letras continuam ocultas.");
      return;
    }

    try { window.speechSynthesis.cancel(); } catch (_) {}

    button.disabled = true;
    button.textContent = "OUVINDO...";
    status.textContent = "Escute até o final. Depois as letras serão liberadas.";
    setState("playing");

    const utterance = new window.SpeechSynthesisUtterance(STIMULUS);
    utterance.lang = "en-US";
    utterance.rate = 0.72;
    utterance.pitch = 1;

    let settled = false;
    const finish = function () {
      if (settled) return;
      settled = true;
      clearSpeechTimeout();
      window.setTimeout(revealFrame, 180);
    };

    utterance.onend = finish;
    utterance.onerror = function () {
      if (settled) return;
      settled = true;
      failPlayback("Não foi possível concluir o áudio. Tente novamente; as letras permanecem ocultas.");
    };

    speechTimeout = window.setTimeout(function () {
      if (settled) return;
      settled = true;
      try { window.speechSynthesis.cancel(); } catch (_) {}
      failPlayback("O áudio não terminou corretamente. Tente novamente; as letras permanecem ocultas.");
    }, 8000);

    try {
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      if (!settled) {
        settled = true;
        failPlayback("Não foi possível iniciar o áudio. Tente novamente; as letras permanecem ocultas.");
      }
    }
  }

  function createOverlay() {
    const root = document.getElementById("root");
    if (!root || overlay || !active) return;

    try {
      const computed = window.getComputedStyle(root);
      if (computed.position === "static") root.style.position = "relative";
    } catch (_) {}

    overlay = document.createElement("section");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Primeira escuta");
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0",
      zIndex: "2147483000",
      minHeight: "min(620px, 76vh)",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      boxSizing: "border-box",
      background: "linear-gradient(180deg, rgba(240,248,255,.99), rgba(255,255,255,.99))"
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      width: "min(560px, 92vw)",
      padding: "clamp(24px, 5vw, 42px)",
      borderRadius: "30px",
      boxSizing: "border-box",
      background: "#fff",
      color: "#173b64",
      textAlign: "center",
      fontFamily: "Nunito, system-ui, sans-serif",
      boxShadow: "0 18px 48px rgba(38,86,125,.16)",
      border: "2px solid #d9e9f7"
    });

    const icon = document.createElement("div");
    icon.textContent = "🔊";
    icon.setAttribute("aria-hidden", "true");
    icon.style.fontSize = "clamp(48px, 10vw, 76px)";

    const title = document.createElement("h2");
    title.textContent = "OUÇA PRIMEIRO";
    Object.assign(title.style, {
      margin: "10px 0 8px",
      fontSize: "clamp(24px, 6vw, 36px)",
      lineHeight: "1.08",
      color: "#0c6fc7"
    });

    const copy = document.createElement("p");
    copy.textContent = "Primeiro, ouça a soletração com atenção. As letras móveis aparecerão somente depois do áudio.";
    Object.assign(copy.style, {
      margin: "0 auto 22px",
      maxWidth: "440px",
      fontSize: "clamp(16px, 4vw, 20px)",
      lineHeight: "1.45"
    });

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "OUVIR SOLETRAÇÃO";
    Object.assign(button.style, {
      minWidth: "min(330px, 86vw)",
      minHeight: "56px",
      padding: "14px 24px",
      border: "0",
      borderRadius: "18px",
      background: "#117bd1",
      color: "#fff",
      font: "800 clamp(16px, 4vw, 19px)/1.1 Nunito, system-ui, sans-serif",
      cursor: "pointer",
      boxShadow: "0 5px 0 #075ca3"
    });

    const status = document.createElement("p");
    status.setAttribute("data-gate-status", "true");
    status.setAttribute("aria-live", "polite");
    status.textContent = "Nenhuma letra é mostrada antes desta primeira escuta.";
    Object.assign(status.style, {
      margin: "18px 0 0",
      fontSize: "14px",
      lineHeight: "1.35",
      color: "#526a80"
    });

    button.addEventListener("click", function () {
      playFirstListen(button, status);
    });

    card.append(icon, title, copy, button, status);
    overlay.appendChild(card);
    root.appendChild(overlay);

    try {
      window.dispatchEvent(new CustomEvent("duduq:m1-12-first-listen-ready", {
        detail: { stepId: STEP_ID }
      }));
    } catch (_) {}
  }

  function attachToFrame(targetFrame) {
    if (!active || frame === targetFrame) return;
    hideFrame(targetFrame);
    createOverlay();
  }

  function scan() {
    if (!active) return;
    const targetFrame = document.querySelector("#root iframe");
    if (targetFrame) attachToFrame(targetFrame);
  }

  function cleanup(options = {}) {
    clearSpeechTimeout();
    stopChildCancelLoop();

    try { window.speechSynthesis?.cancel?.(); } catch (_) {}
    cancelChildSpeech();

    active = false;
    if (typeof restoreChildSpeak === "function") {
      restoreChildSpeak();
      restoreChildSpeak = null;
    }

    if (frame?.hasAttribute?.(FRAME_ATTR)) {
      frame.removeAttribute(FRAME_ATTR);
      frame.removeAttribute("aria-hidden");
      frame.style.removeProperty("visibility");
      frame.style.removeProperty("opacity");
      frame.style.removeProperty("pointer-events");
    }

    overlay?.remove?.();
    overlay = null;
    frame = null;

    if (options.keepState !== true) {
      document.documentElement.removeAttribute(GATE_ATTR);
    }
  }

  window.addEventListener("duduq:step-start", function (event) {
    const stepId = String(event?.detail?.stepId || "");

    if (stepId !== STEP_ID) {
      if (active || overlay) cleanup();
      return;
    }

    cleanup();
    active = true;
    setState("waiting");
    scan();
  });

  window.addEventListener("duduq:step-complete", function (event) {
    if (String(event?.detail?.stepId || "") === STEP_ID) cleanup();
  });

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("beforeunload", function () {
    observer.disconnect();
    cleanup();
  }, { once: true });
})();

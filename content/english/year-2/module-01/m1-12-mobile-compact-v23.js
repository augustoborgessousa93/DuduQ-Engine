/* DUDUQ Year2 v2.3 — M01-12 image-group responsive + audio bridge
   Presentation-only layer for EN2-M1-12.
   Keeps Drag & Drop 2.0.22 untouched while arranging three initial-letter groups,
   six image cards and one independent audio control per image.
*/
(function () {
  "use strict";

  const STEP_ID = "en2-m1-12-drag-drop-alphabet";
  const STYLE_ID = "duduq-m1-12-v23-image-group-layout";
  const AUDIO_OBSERVER = "__DUDUQ_M1_12_IMAGE_AUDIO_OBSERVER__";
  const WORDS = Object.freeze({
    "image-lion": "lion",
    "image-lemon": "lemon",
    "image-elephant": "elephant",
    "image-egg": "egg",
    "image-orange": "orange",
    "image-owl": "owl"
  });

  let active = false;
  let currentFrame = null;

  function speak(doc, word, button) {
    const view = doc?.defaultView;
    const speech = view?.speechSynthesis || window.speechSynthesis;
    const Utterance = view?.SpeechSynthesisUtterance || window.SpeechSynthesisUtterance;
    if (!speech || typeof Utterance !== "function") return;

    try { speech.cancel(); } catch (_) {}
    const utterance = new Utterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1;

    button?.setAttribute("data-m1-12-speaking", "true");
    const clear = function () {
      button?.removeAttribute("data-m1-12-speaking");
    };
    utterance.onend = clear;
    utterance.onerror = clear;
    try { speech.speak(utterance); } catch (_) { clear(); }
  }

  function ensureImageAudio(doc) {
    if (!active || !doc?.querySelectorAll) return;
    doc.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id]").forEach(function (item) {
      const id = String(item.getAttribute("data-dd2-item-id") || "");
      const word = WORDS[id];
      if (!word) return;
      const shell = item.parentElement;
      if (!shell || shell.querySelector(`.duduq-m1-12-image-audio[data-item-id="${id}"]`)) return;

      shell.classList.add("duduq-m1-12-image-card-shell");
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "duduq-dd2-item-audio duduq-m1-12-image-audio";
      button.setAttribute("data-item-id", id);
      button.setAttribute("aria-label", `Ouvir ${word}`);
      button.title = `Ouvir ${word}`;
      button.innerHTML = '<span aria-hidden="true">🔊</span>';
      button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        event.stopPropagation();
      }, true);
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        speak(doc, word, button);
      }, true);
      shell.appendChild(button);
    });
  }

  function wireImageAudio(doc) {
    if (!doc?.documentElement) return;
    ensureImageAudio(doc);
    if (doc[AUDIO_OBSERVER]) return;
    const observer = new MutationObserver(function () {
      ensureImageAudio(doc);
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
    try {
      Object.defineProperty(doc, AUDIO_OBSERVER, { value: observer, configurable: true });
    } catch (_) {
      doc[AUDIO_OBSERVER] = observer;
    }
  }

  function inject(targetFrame) {
    if (!active || !targetFrame) return;
    currentFrame = targetFrame;

    const apply = function () {
      if (!active || !currentFrame) return;
      try {
        const doc = currentFrame.contentDocument;
        if (!doc || !doc.head) return;

        if (!doc.getElementById(STYLE_ID)) {
          const style = doc.createElement("style");
          style.id = STYLE_ID;
          style.textContent = `
            html, body { overflow-x: hidden !important; }

            .duduq-dd2-target-grid,
            .duduq-dd-target-grid {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              width: min(100%, 590px) !important;
              max-width: 590px !important;
              gap: 12px !important;
              margin-inline: auto !important;
              align-items: stretch !important;
            }

            .duduq-dd2-target,
            .duduq-dd-target {
              box-sizing: border-box !important;
              min-width: 0 !important;
              min-height: 126px !important;
              padding: 10px 8px !important;
            }

            .duduq-dd2-target > :first-child,
            .duduq-dd-target > :first-child {
              font-size: clamp(22px, 2.1vw, 30px) !important;
              font-weight: 900 !important;
            }

            .duduq-dd2-bank-items,
            .duduq-dd-pool-items {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(92px, 1fr)) !important;
              width: min(100%, 560px) !important;
              max-width: 560px !important;
              gap: 12px !important;
              margin-inline: auto !important;
              align-items: start !important;
            }

            .duduq-dd2-bank-items > .duduq-dd2-item-shell,
            .duduq-dd-pool-items > * {
              min-width: 0 !important;
              width: 100% !important;
              margin: 0 !important;
            }

            .duduq-m1-12-image-card-shell {
              display: grid !important;
              grid-template-columns: 1fr !important;
              grid-template-rows: auto auto !important;
              justify-items: center !important;
              align-items: start !important;
              gap: 10px !important;
            }

            .duduq-m1-12-image-card-shell > .duduq-dd2-item {
              grid-row: 1 !important;
            }

            .duduq-m1-12-image-audio {
              grid-row: 2 !important;
              display: grid !important;
              place-items: center !important;
              box-sizing: border-box !important;
              width: 38px !important;
              height: 38px !important;
              min-width: 38px !important;
              min-height: 38px !important;
              padding: 0 !important;
              margin: 0 !important;
              border: 2px solid #68a7dc !important;
              border-radius: 999px !important;
              background: #ffffff !important;
              color: #116fc4 !important;
              cursor: pointer !important;
              line-height: 1 !important;
              touch-action: manipulation !important;
            }

            .duduq-m1-12-image-audio > span {
              font-size: 17px !important;
              line-height: 1 !important;
            }

            .duduq-m1-12-image-audio[data-m1-12-speaking="true"] {
              border-color: #1a80d1 !important;
              background: #eaf6ff !important;
            }

            .duduq-dd2-item,
            .duduq-dd-item {
              box-sizing: border-box !important;
              min-width: 0 !important;
              width: 100% !important;
              min-height: 94px !important;
              padding: 8px !important;
            }

            .duduq-dd2-item img,
            .duduq-dd-item img {
              display: block !important;
              width: auto !important;
              max-width: 82px !important;
              height: 68px !important;
              max-height: 68px !important;
              object-fit: contain !important;
              margin-inline: auto !important;
            }

            .duduq-dd2-target .duduq-dd2-item,
            .duduq-dd-target .duduq-dd-item {
              min-height: 52px !important;
              padding: 4px !important;
            }

            .duduq-dd2-target .duduq-dd2-item img,
            .duduq-dd-target .duduq-dd-item img {
              max-width: 54px !important;
              height: 44px !important;
              max-height: 44px !important;
            }

            @media (min-width: 641px) and (max-height: 700px) {
              .duduq-dd2-target-grid,
              .duduq-dd-target-grid { gap: 8px !important; }
              .duduq-dd2-target,
              .duduq-dd-target { min-height: 108px !important; padding: 7px 6px !important; }
              .duduq-dd2-bank-items,
              .duduq-dd-pool-items { gap: 8px !important; }
              .duduq-m1-12-image-card-shell { gap: 7px !important; }
              .duduq-dd2-item,
              .duduq-dd-item { min-height: 78px !important; padding: 5px !important; }
              .duduq-dd2-item img,
              .duduq-dd-item img { height: 56px !important; max-height: 56px !important; }
              .duduq-m1-12-image-audio { width: 34px !important; height: 34px !important; min-width: 34px !important; min-height: 34px !important; }
            }

            @media (max-width: 640px) {
              .duduq-dd2-target-grid,
              .duduq-dd-target-grid {
                width: 100% !important;
                gap: 6px !important;
              }

              .duduq-dd2-target,
              .duduq-dd-target {
                min-height: 104px !important;
                padding: 7px 4px !important;
              }

              .duduq-dd2-bank-items,
              .duduq-dd-pool-items {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                width: 100% !important;
                gap: 7px !important;
              }

              .duduq-m1-12-image-card-shell { gap: 6px !important; }

              .duduq-dd2-item,
              .duduq-dd-item {
                min-height: 76px !important;
                padding: 5px 3px !important;
              }

              .duduq-dd2-item img,
              .duduq-dd-item img {
                max-width: 58px !important;
                height: 50px !important;
                max-height: 50px !important;
              }

              .duduq-m1-12-image-audio {
                width: 32px !important;
                height: 32px !important;
                min-width: 32px !important;
                min-height: 32px !important;
              }

              .duduq-m1-12-image-audio > span { font-size: 15px !important; }

              .duduq-dd2-target .duduq-dd2-item img,
              .duduq-dd-target .duduq-dd-item img {
                max-width: 42px !important;
                height: 36px !important;
                max-height: 36px !important;
              }
            }
          `;
          doc.head.appendChild(style);
        }

        wireImageAudio(doc);
      } catch (_) {}
    };

    try {
      targetFrame.addEventListener("load", apply, { once: true });
    } catch (_) {}
    apply();
  }

  function scan() {
    if (!active) return;
    const frame = document.querySelector("#root iframe");
    if (frame) inject(frame);
  }

  function cleanup() {
    try {
      const doc = currentFrame?.contentDocument;
      doc?.getElementById(STYLE_ID)?.remove?.();
      doc?.querySelectorAll?.(".duduq-m1-12-image-audio")?.forEach?.((button) => button.remove());
      const observer = doc?.[AUDIO_OBSERVER];
      observer?.disconnect?.();
      try { delete doc[AUDIO_OBSERVER]; } catch (_) {}
    } catch (_) {}
    currentFrame = null;
    active = false;
  }

  window.addEventListener("duduq:step-start", function (event) {
    const stepId = String(event?.detail?.stepId || "");
    if (stepId !== STEP_ID) {
      if (active) cleanup();
      return;
    }
    active = true;
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

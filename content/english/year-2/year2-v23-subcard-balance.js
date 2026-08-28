/* DUDUQ English Year 2 — mechanic subcard balance
   Year-2-only presentation bridge.
   Keeps Bubble Pop physics/content intact and only aligns its usable board width
   with the wide Target Shooter presentation approved for the same host stage.
   Also keeps the visible choice labels A/B/C/D in canonical order while preserving
   the randomized answer/audio mapping behind those labels.
   For single-target Drag & Drop, the interaction is staged: choices first; once a
   choice is placed, the choice bank is hidden and CONFIRMAR appears alone. On retry,
   the runtime returns the wrong card to the bank and the choices reappear.
*/
(function () {
  "use strict";

  const STYLE_ID = "duduq-year2-subcard-balance-v4";
  const WIRED = "data-duduq-year2-subcard-balance-wired";
  const INNER_OBSERVER = "__DUDUQ_YEAR2_CHOICE_ORDER_OBSERVER__";
  const AUDIO_HINT_WIRED = "__DUDUQ_YEAR2_AUDIO_HINT_WIRED__";

  const CSS = `
    html body #root .duduq-engine-stage .duduq-bp-root,
    html body #root .duduq-engine-stage .duduq-bp-surface {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    html body #root .duduq-engine-stage .duduq-bp-board {
      width: calc(100% - 16px) !important;
      max-width: none !important;
      min-width: 0 !important;
      margin-inline: auto !important;
      align-self: stretch !important;
      box-sizing: border-box !important;
    }

    html body #root .duduq-engine-stage .duduq-bp-arena,
    html body #root .duduq-engine-stage .duduq-bp-arena[data-mode="dynamic-stream"] {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin-inline: 0 !important;
      box-sizing: border-box !important;
    }

    /*
      Single-target listening choices keep a stable visual alphabetic order.
      Only presentation order is fixed here. The item id, audio, correctness and
      randomized answer mapping remain attached to the original item object.
    */
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice[data-choice-letter="A"] { order: 1 !important; }
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice[data-choice-letter="B"] { order: 2 !important; }
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice[data-choice-letter="C"] { order: 3 !important; }
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice[data-choice-letter="D"] { order: 4 !important; }

    /*
      Listening-bank hierarchy: the answer card is the primary object and its
      replay button sits directly below it. This visually groups each sound with
      its own A/B/C/D choice instead of creating an A-audio-B-audio horizontal run.
    */
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-bank-items {
      align-items: flex-start !important;
      justify-content: center !important;
      column-gap: clamp(18px,2.2vw,30px) !important;
      row-gap: 10px !important;
    }

    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice {
      display: grid !important;
      grid-template-columns: auto !important;
      grid-template-rows: auto auto !important;
      justify-items: center !important;
      align-items: center !important;
      gap: 7px !important;
      width: auto !important;
      min-width: 54px !important;
      margin: 0 !important;
    }

    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-item-shell-audio-choice > .duduq-dd2-item {
      grid-row: 1 !important;
      justify-self: center !important;
    }

    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-item-shell-audio-choice > .duduq-dd2-item-audio {
      grid-row: 2 !important;
      justify-self: center !important;
      width: 34px !important;
      height: 34px !important;
      min-width: 34px !important;
      min-height: 34px !important;
      margin: 0 !important;
    }

    /* Gentle first-use cue: sound waves/pulse invite listening without shaking
       the answer card. The cue stops for the whole question after the first audio
       interaction and respects reduced-motion preferences. */
    @keyframes duduqYear2ListeningCue {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 2px 0 rgba(57,103,149,.18), 0 0 0 0 rgba(30,123,224,.20);
      }
      52% {
        transform: scale(1.055);
        box-shadow: 0 2px 0 rgba(57,103,149,.18), 0 0 0 8px rgba(30,123,224,0);
      }
    }

    html body #root .duduq-dd2-root:not([data-audio-hint-dismissed="true"]):has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-item-shell-audio-choice > .duduq-dd2-item-audio:not([data-playing="true"]) {
      animation: duduqYear2ListeningCue 1.8s ease-in-out infinite !important;
      transform-origin: center !important;
    }

    @media (prefers-reduced-motion: reduce) {
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-item-shell-audio-choice > .duduq-dd2-item-audio {
        animation: none !important;
      }
    }

    /*
      Progressive single-target flow:
      1) before a choice: A-D are visible; CONFIRMAR stays in the DOM for the
         existing runtime/test contract, but is visually hidden and non-interactive;
      2) after a choice is placed: hide the bank and reveal CONFIRMAR by itself;
      3) on a wrong answer, the runtime keeps the card red briefly, then clears the
         target; as soon as it returns to the bank, A-D reappear automatically.
    */
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-dd2-actions,
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
      .duduq-matching-action-slot.duduq-dd2-actions {
      display: grid !important;
      box-sizing: border-box !important;
      min-height: 70px !important;
      padding: 0 0 14px !important;
      margin-top: 8px !important;
      place-items: start center !important;
      overflow: visible !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-placed="true"])
      .duduq-dd2-bank {
      display: none !important;
      min-height: 0 !important;
      height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      overflow: hidden !important;
    }

    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-placed="true"])
      .duduq-dd2-actions,
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-placed="true"])
      .duduq-matching-action-slot.duduq-dd2-actions {
      opacity: 1 !important;
      pointer-events: auto !important;
      min-height: 82px !important;
      padding: 0 0 18px !important;
      margin-top: 12px !important;
    }

    @media (min-width: 641px) and (max-height: 700px) {
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-bank-items {
        column-gap: clamp(15px,1.8vw,24px) !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice {
        gap: 5px !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-item-shell-audio-choice > .duduq-dd2-item-audio {
        width: 31px !important;
        height: 31px !important;
        min-width: 31px !important;
        min-height: 31px !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-actions,
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 66px !important;
        padding: 0 0 12px !important;
        margin-top: 6px !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-placed="true"])
        .duduq-dd2-actions,
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-placed="true"])
        .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 80px !important;
        padding: 0 0 18px !important;
        margin-top: 10px !important;
      }
    }

    @media (max-width: 640px) {
      html body #root .duduq-engine-stage .duduq-bp-board {
        width: 100% !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-bank-items {
        column-gap: 12px !important;
        row-gap: 8px !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice {
        min-width: 48px !important;
        gap: 5px !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-item-shell-audio-choice > .duduq-dd2-item-audio {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-dd2-actions,
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
        .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 60px !important;
        padding: 0 0 10px !important;
        margin-top: 4px !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-placed="true"])
        .duduq-dd2-actions,
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-placed="true"])
        .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 74px !important;
        padding: 0 0 14px !important;
        margin-top: 8px !important;
      }
    }
  `;

  function markChoiceOrder(doc) {
    if (!doc?.querySelectorAll) return;
    const roots = doc.querySelectorAll(".duduq-dd2-root");
    roots.forEach(function (root) {
      if (!root.querySelector('.duduq-dd2-target[data-single-target-choice="true"]')) return;
      root.querySelectorAll(".duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice").forEach(function (shell) {
        const item = shell.querySelector(".duduq-dd2-item");
        const text = String(item?.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
        const letter = /^[A-D]$/.test(text) ? text : "";
        if (letter) shell.setAttribute("data-choice-letter", letter);
        else shell.removeAttribute("data-choice-letter");
      });
    });
  }

  function wireAudioHint(doc) {
    if (!doc?.documentElement || doc[AUDIO_HINT_WIRED]) return;
    const dismiss = function (event) {
      const control = event.target?.closest?.(".duduq-dd2-item-audio");
      if (!control) return;
      const root = control.closest(".duduq-dd2-root");
      if (root?.querySelector('.duduq-dd2-target[data-single-target-choice="true"]')) {
        root.setAttribute("data-audio-hint-dismissed", "true");
      }
    };
    doc.addEventListener("pointerdown", dismiss, true);
    doc.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") dismiss(event);
    }, true);
    try {
      Object.defineProperty(doc, AUDIO_HINT_WIRED, { value: true, configurable: true });
    } catch (_) {
      doc[AUDIO_HINT_WIRED] = true;
    }
  }

  function wireInnerObserver(doc) {
    if (!doc?.documentElement) return;
    markChoiceOrder(doc);
    wireAudioHint(doc);
    if (doc[INNER_OBSERVER]) return;
    const observer = new MutationObserver(function () {
      markChoiceOrder(doc);
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true, characterData: true });
    try {
      Object.defineProperty(doc, INNER_OBSERVER, { value: observer, configurable: true });
    } catch (_) {
      doc[INNER_OBSERVER] = observer;
    }
  }

  function inject(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.head) return;
      [
        "duduq-year2-subcard-balance-v1",
        "duduq-year2-subcard-balance-v2",
        "duduq-year2-subcard-balance-v3"
      ].forEach(function (id) {
        const stale = doc.getElementById(id);
        if (stale) stale.remove();
      });
      if (!doc.getElementById(STYLE_ID)) {
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        doc.head.appendChild(style);
      }
      wireInnerObserver(doc);
    } catch (_) {}
  }

  function wire(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    inject(frame);
    if (frame.hasAttribute(WIRED)) return;
    frame.setAttribute(WIRED, "true");
    frame.addEventListener("load", function () {
      inject(frame);
    });
  }

  function apply() {
    document.querySelectorAll("#root iframe").forEach(wire);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      apply();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("duduq:engine-ready", schedule);
  window.addEventListener("duduq:step-start", schedule);
  window.addEventListener("resize", schedule, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();

/* DUDUQ English Year 2 — mechanic subcard balance
   Year-2-only presentation bridge.
   Keeps Bubble Pop physics/content intact and only aligns its usable board width
   with the wide Target Shooter presentation approved for the same host stage.
   Also reserves a safe vertical action area for the Year-2 single-target Drag & Drop
   and keeps the visible choice labels A/B/C/D in canonical order while preserving
   the already-randomized answer/audio mapping behind those labels.
*/
(function () {
  "use strict";

  const STYLE_ID = "duduq-year2-subcard-balance-v3";
  const WIRED = "data-duduq-year2-subcard-balance-wired";
  const INNER_OBSERVER = "__DUDUQ_YEAR2_CHOICE_ORDER_OBSERVER__";

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
      Drag & Drop single-target safe action area.
      The enabled button has a lower 3D shadow. The action slot is pulled upward
      without shrinking the button, while keeping enough internal bottom room for
      the shadow so short notebook viewports do not clip the active state.
    */
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-actions,
    html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-matching-action-slot.duduq-dd2-actions {
      box-sizing: border-box !important;
      min-height: 76px !important;
      padding: 0 0 16px !important;
      margin-top: -8px !important;
      place-items: start center !important;
      overflow: visible !important;
    }

    @media (min-width: 641px) and (max-height: 700px) {
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-actions,
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 78px !important;
        padding: 0 0 18px !important;
        margin-top: -10px !important;
      }
    }

    @media (max-width: 640px) {
      html body #root .duduq-engine-stage .duduq-bp-board {
        width: 100% !important;
      }

      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-actions,
      html body #root .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 72px !important;
        padding: 2px 0 14px !important;
        margin-top: -4px !important;
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

  function wireInnerObserver(doc) {
    if (!doc?.documentElement) return;
    markChoiceOrder(doc);
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
        "duduq-year2-subcard-balance-v2"
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

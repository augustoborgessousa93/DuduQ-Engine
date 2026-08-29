/* DUDUQ Year2 v2.3 — M01-12 visual polish
   Presentation-only layer for EN2-M1-12.
   Keeps Drag & Drop 2.0.22 untouched.
*/
(function () {
  "use strict";

  const STEP_ID = "en2-m1-12-drag-drop-alphabet";
  const STYLE_ID = "duduq-m1-12-v23-visual-polish";
  let active = false;
  let currentFrame = null;

  const CSS = `
    html, body { overflow-x: hidden !important; }

    .duduq-dd2-arena {
      padding-top: 2px !important;
      padding-bottom: 6px !important;
    }

    .duduq-dd2-targets,
    .duduq-dd2-target-grid,
    .duduq-dd-target-grid {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      width: min(100%, 700px) !important;
      max-width: 700px !important;
      gap: 14px !important;
      margin: 0 auto 10px !important;
      align-items: stretch !important;
    }

    .duduq-dd2-target,
    .duduq-dd-target {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 34px 10px 10px !important;
      box-sizing: border-box !important;
    }

    .duduq-dd2-target-head {
      width: 100% !important;
      min-height: 42px !important;
      height: auto !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      margin: 0 0 4px !important;
    }

    .duduq-dd2-target-head > span {
      font-size: clamp(28px, 2.5vw, 36px) !important;
      line-height: 1 !important;
      font-weight: 900 !important;
      color: #17385e !important;
    }

    .duduq-dd2-zone {
      min-height: 72px !important;
      padding: 6px !important;
      gap: 8px !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .duduq-dd2-bank {
      margin-top: 4px !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }

    .duduq-dd2-bank-items,
    .duduq-dd-pool-items {
      display: grid !important;
      grid-template-columns: repeat(6, minmax(82px, 1fr)) !important;
      width: min(100%, 780px) !important;
      max-width: 780px !important;
      gap: 10px !important;
      margin: 0 auto !important;
      align-items: start !important;
      justify-content: center !important;
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
      gap: 8px !important;
    }

    .duduq-m1-12-image-card-shell > .duduq-dd2-item {
      grid-row: 1 !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      min-height: 82px !important;
      padding: 7px !important;
    }

    /* The card already has a separate explicit audio button below it.
       Hide the decorative/internal speaker so the child sees one clear control. */
    .duduq-m1-12-image-card-shell > .duduq-dd2-item .duduq-dd2-audio-mark {
      display: none !important;
    }

    .duduq-m1-12-image-card-shell > .duduq-dd2-item img,
    .duduq-m1-12-image-card-shell > .duduq-dd2-item .duduq-dd2-item-media {
      display: block !important;
      width: auto !important;
      max-width: 68px !important;
      height: 56px !important;
      max-height: 56px !important;
      object-fit: contain !important;
      margin: 0 auto !important;
    }

    .duduq-m1-12-image-audio {
      grid-row: 2 !important;
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      margin: 0 !important;
    }

    .duduq-dd2-actions,
    .duduq-matching-action-slot.duduq-dd2-actions {
      position: relative !important;
      z-index: 2 !important;
      min-height: 60px !important;
      margin-top: 8px !important;
      padding: 6px 0 4px !important;
      place-items: start center !important;
      overflow: visible !important;
    }

    .duduq-dd2-zone .duduq-dd2-item-shell {
      width: 58px !important;
      max-width: 58px !important;
      flex: 0 1 58px !important;
    }

    .duduq-dd2-target .duduq-dd2-item,
    .duduq-dd-target .duduq-dd-item {
      min-height: 56px !important;
      padding: 4px !important;
    }

    .duduq-dd2-target .duduq-dd2-item img,
    .duduq-dd-target .duduq-dd-item img {
      max-width: 48px !important;
      height: 42px !important;
      max-height: 42px !important;
    }

    @media (min-width: 641px) and (max-height: 700px) {
      .duduq-dd2-targets,
      .duduq-dd2-target-grid,
      .duduq-dd-target-grid {
        width: min(100%, 650px) !important;
        gap: 10px !important;
        margin-bottom: 7px !important;
      }

      .duduq-dd2-target,
      .duduq-dd-target {
        padding: 30px 8px 8px !important;
      }

      .duduq-dd2-target-head {
        min-height: 32px !important;
        margin-bottom: 2px !important;
      }

      .duduq-dd2-target-head > span {
        font-size: 28px !important;
      }

      .duduq-dd2-zone {
        min-height: 60px !important;
        padding: 4px !important;
      }

      .duduq-dd2-bank-items,
      .duduq-dd-pool-items {
        width: min(100%, 720px) !important;
        gap: 8px !important;
      }

      .duduq-m1-12-image-card-shell { gap: 6px !important; }
      .duduq-m1-12-image-card-shell > .duduq-dd2-item {
        min-height: 70px !important;
        padding: 5px !important;
      }
      .duduq-m1-12-image-card-shell > .duduq-dd2-item img,
      .duduq-m1-12-image-card-shell > .duduq-dd2-item .duduq-dd2-item-media {
        max-width: 58px !important;
        height: 48px !important;
        max-height: 48px !important;
      }
      .duduq-m1-12-image-audio {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        min-height: 32px !important;
      }
      .duduq-dd2-actions,
      .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 52px !important;
        margin-top: 5px !important;
        padding: 4px 0 2px !important;
      }
    }

    @media (max-width: 640px) {
      .duduq-dd2-targets,
      .duduq-dd2-target-grid,
      .duduq-dd-target-grid {
        width: 100% !important;
        gap: 6px !important;
        margin-bottom: 7px !important;
      }
      .duduq-dd2-target,
      .duduq-dd-target {
        padding: 28px 4px 6px !important;
      }
      .duduq-dd2-target-head {
        min-height: 28px !important;
        margin-bottom: 2px !important;
      }
      .duduq-dd2-target-head > span {
        font-size: 23px !important;
      }
      .duduq-dd2-zone {
        min-height: 54px !important;
        padding: 3px !important;
      }
      .duduq-dd2-bank-items,
      .duduq-dd-pool-items {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        width: 100% !important;
        gap: 7px 8px !important;
      }
      .duduq-m1-12-image-card-shell { gap: 5px !important; }
      .duduq-m1-12-image-card-shell > .duduq-dd2-item {
        min-height: 66px !important;
        padding: 4px !important;
      }
      .duduq-m1-12-image-card-shell > .duduq-dd2-item img,
      .duduq-m1-12-image-card-shell > .duduq-dd2-item .duduq-dd2-item-media {
        max-width: 52px !important;
        height: 44px !important;
        max-height: 44px !important;
      }
      .duduq-m1-12-image-audio {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
      }
      .duduq-dd2-actions,
      .duduq-matching-action-slot.duduq-dd2-actions {
        min-height: 48px !important;
        margin-top: 4px !important;
        padding: 3px 0 2px !important;
      }
    }
  `;

  function apply(frame) {
    if (!active || !frame) return;
    currentFrame = frame;
    try {
      const doc = frame.contentDocument;
      if (!doc?.head) return;
      let style = doc.getElementById(STYLE_ID);
      if (!style) {
        style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        doc.head.appendChild(style);
      }
    } catch (_) {}
  }

  function scan() {
    if (!active) return;
    const frame = document.querySelector("#root iframe");
    if (!frame) return;
    try { frame.addEventListener("load", function () { apply(frame); }, { once: true }); } catch (_) {}
    apply(frame);
  }

  function cleanup() {
    try { currentFrame?.contentDocument?.getElementById(STYLE_ID)?.remove?.(); } catch (_) {}
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

/* DUDUQ English Year 2 — mechanic subcard balance
   Year-2-only presentation bridge.
   Keeps Bubble Pop physics/content intact and only aligns its usable board width
   with the wide Target Shooter presentation approved for the same host stage.
*/
(function () {
  "use strict";

  const STYLE_ID = "duduq-year2-subcard-balance-v1";
  const WIRED = "data-duduq-year2-subcard-balance-wired";

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

    @media (max-width: 640px) {
      html body #root .duduq-engine-stage .duduq-bp-board {
        width: 100% !important;
      }
    }
  `;

  function inject(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.head || doc.getElementById(STYLE_ID)) return;
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      doc.head.appendChild(style);
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

/* DUDUQ Year2 v2.3 — M01-12 compact mobile bridge
   Homologation-only visual bridge. Keeps the immutable Drag & Drop release untouched.
   Applies only while EN2-M1-12 is the active v2.3 activity.
*/
(function () {
  "use strict";

  const STEP_ID = "en2-m1-12-drag-drop-alphabet";
  const STYLE_ID = "duduq-m1-12-v23-mobile-compact";
  let active = false;
  let currentFrame = null;

  function inject(targetFrame) {
    if (!active || !targetFrame) return;
    currentFrame = targetFrame;

    const apply = function () {
      if (!active || !currentFrame) return;
      try {
        const doc = currentFrame.contentDocument;
        if (!doc || !doc.head || doc.getElementById(STYLE_ID)) return;

        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
          @media (max-width: 640px) {
            html, body { overflow-x: hidden !important; }

            .duduq-dd-target-grid {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              grid-auto-flow: row !important;
              align-items: stretch !important;
              width: 100% !important;
              max-width: 100% !important;
              gap: 6px !important;
              margin-inline: 0 !important;
            }

            .duduq-dd-pool-items {
              display: grid !important;
              grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              grid-auto-flow: row !important;
              align-items: stretch !important;
              width: 100% !important;
              max-width: 100% !important;
              gap: 6px !important;
              margin-inline: 0 !important;
            }

            .duduq-dd-target,
            .duduq-dd2-target,
            .duduq-dd-item,
            .duduq-dd2-item {
              box-sizing: border-box !important;
              min-width: 0 !important;
              width: 100% !important;
              max-width: none !important;
              min-height: 48px !important;
              padding: 7px 3px !important;
              margin: 0 !important;
              font-size: clamp(18px, 5.1vw, 22px) !important;
              line-height: 1.05 !important;
            }

            .duduq-dd-board {
              gap: 8px !important;
              padding-inline: 8px !important;
            }
          }
        `;
        doc.head.appendChild(style);
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
      currentFrame?.contentDocument?.getElementById(STYLE_ID)?.remove?.();
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

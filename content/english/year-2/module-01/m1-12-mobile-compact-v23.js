/* DUDUQ Year2 v2.3 — M01-12 image-group responsive bridge
   Presentation-only layer for EN2-M1-12.
   Keeps the active Drag & Drop release untouched while arranging three initial-
   letter groups and six image cards cleanly on desktop, short notebook and mobile.
*/
(function () {
  "use strict";

  const STEP_ID = "en2-m1-12-drag-drop-alphabet";
  const STYLE_ID = "duduq-m1-12-v23-image-group-layout";
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
            align-items: stretch !important;
          }

          .duduq-dd2-bank-items > .duduq-dd2-item-shell,
          .duduq-dd-pool-items > * {
            min-width: 0 !important;
            width: 100% !important;
            margin: 0 !important;
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
            .duduq-dd2-item,
            .duduq-dd-item { min-height: 78px !important; padding: 5px !important; }
            .duduq-dd2-item img,
            .duduq-dd-item img { height: 56px !important; max-height: 56px !important; }
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

            .duduq-dd2-target .duduq-dd2-item img,
            .duduq-dd-target .duduq-dd-item img {
              max-width: 42px !important;
              height: 36px !important;
              max-height: 36px !important;
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

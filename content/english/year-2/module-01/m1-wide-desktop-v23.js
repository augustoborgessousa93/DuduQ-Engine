/* DUDUQ English Year 2 — M01 wide-screen balance
   Module-01-only visual bridge.
   Enlarges the single-target listening card on desktop/fullscreen while keeping
   mobile and the special M01-12 multi-target image-group activity unchanged.
*/
(function () {
  "use strict";

  const VERSION = "1.0.1-m01-wide-single-target-observed-frame";
  const STYLE_ID = "duduq-year2-m01-wide-single-target";
  let currentFrame = null;

  if (window.__DUDUQ_YEAR2_M01_WIDE_DESKTOP__) return;

  function applyToFrame(frame) {
    if (!frame || frame.tagName !== "IFRAME") return false;
    currentFrame = frame;

    const apply = function () {
      try {
        const doc = frame.contentDocument;
        if (!doc?.head) return false;
        if (doc.getElementById(STYLE_ID)) return true;

        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.dataset.duduqYear2M01Wide = VERSION;
        style.textContent = `
          @media (min-width: 900px) and (min-height: 620px) {
            .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
              .duduq-dd2-targets {
              grid-template-columns: repeat(auto-fit, minmax(300px, 350px)) !important;
              gap: 26px !important;
            }

            .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
              .duduq-dd2-target {
              width: clamp(300px, 24vw, 350px) !important;
              padding: 18px 18px 20px !important;
              border-radius: 24px !important;
            }

            .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
              .duduq-dd2-target-head {
              min-height: clamp(176px, 24vh, 218px) !important;
            }

            .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
              .duduq-dd2-target-media {
              height: clamp(160px, 21vh, 198px) !important;
              max-height: 198px !important;
              object-fit: contain !important;
            }

            .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
              .duduq-dd2-zone {
              min-height: 64px !important;
              border-radius: 16px !important;
            }

            .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
              .duduq-dd2-bank-items {
              margin-top: 10px !important;
              column-gap: clamp(20px, 2.5vw, 34px) !important;
            }

            .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"])
              .duduq-dd2-item-shell-audio-choice > .duduq-dd2-item {
              min-width: 96px !important;
              min-height: 56px !important;
              font-size: 18px !important;
              border-radius: 16px !important;
            }
          }
        `;
        doc.head.appendChild(style);
        return true;
      } catch (_) {
        return false;
      }
    };

    try { frame.addEventListener("load", apply, { once: true }); } catch (_) {}
    return apply();
  }

  function scan() {
    const frame = document.querySelector("#root iframe");
    if (!frame) return;
    if (frame !== currentFrame) applyToFrame(frame);
    else {
      try {
        if (!frame.contentDocument?.getElementById(STYLE_ID)) applyToFrame(frame);
      } catch (_) {}
    }
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();

  window.addEventListener("beforeunload", function () {
    observer.disconnect();
    currentFrame = null;
  }, { once: true });

  window.__DUDUQ_YEAR2_M01_WIDE_DESKTOP__ = Object.freeze({
    version: VERSION,
    module: 1,
    mobileChanged: false,
    multiTargetChanged: false,
    releaseModified: false,
    observedFrameInjection: true
  });
})();

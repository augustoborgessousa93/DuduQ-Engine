/* DUDUQ English Year 2 — M01 wide-screen balance
   Module-01-only visual bridge.
   Enlarges the single-target listening card on desktop/fullscreen while keeping
   mobile and the special M01-12 multi-target image-group activity unchanged.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-m01-wide-single-target";
  const STYLE_ID = "duduq-year2-m01-wide-single-target";

  if (window.__DUDUQ_YEAR2_M01_WIDE_DESKTOP__) return;

  function patchFrame(frame) {
    if (!frame || frame.tagName !== "IFRAME") return false;
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
    } catch (error) {
      console.warn("[DuduQ Year2 M01 Wide] Não foi possível aplicar o balanceamento.", error);
      return false;
    }
  }

  document.addEventListener("load", function m01WideFrameLoad(event) {
    const frame = event.target;
    if (!frame || frame.tagName !== "IFRAME") return;
    const src = String(frame.getAttribute("src") || frame.src || "");
    if (!/\/DUDUQ_DRAG_DROP\.html(?:\?|$)/i.test(src)) return;
    patchFrame(frame);
  }, true);

  window.__DUDUQ_YEAR2_M01_WIDE_DESKTOP__ = Object.freeze({
    version: VERSION,
    module: 1,
    mobileChanged: false,
    multiTargetChanged: false,
    releaseModified: false
  });
})();

/* DUDUQ Year2 M03 — SINGLE_TARGET_CHOICE visual homologation polish
   Scoped to the M03 iframe only. This is intentionally a homologation layer:
   once approved visually, the rules should be consolidated into the immutable
   Drag & Drop candidate instead of becoming a permanent content-side dependency.
*/
(function () {
  "use strict";

  const STYLE_ID = "duduq-m03-single-target-choice-visual-polish";
  const VERSION = "1.0.0-homolog";
  const FRAME_SELECTOR = 'iframe[title="DuduQ — Drag & Drop"]';

  const CSS = `
/* Desktop/tablet: give the audiovisual stimulus priority and make every choice
   a genuine large target rather than a small pill floating in an empty column. */
@media (min-width: 761px) {
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) {
    grid-template-columns: minmax(360px, 1fr) minmax(280px, 320px) !important;
    align-items: start !important;
    gap: clamp(22px, 2.5vw, 36px) !important;
  }

  .duduq-dd2-target[data-single-target-choice="true"] {
    width: min(100%, 540px) !important;
    min-height: clamp(270px, 38vh, 340px) !important;
  }

  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head {
    min-height: clamp(150px, 23vh, 205px) !important;
    flex: 1 1 auto !important;
    padding: 8px 14px !important;
  }

  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head img,
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head .duduq-dd2-item-media {
    width: min(78%, 230px) !important;
    max-width: 78% !important;
    height: min(23vh, 190px) !important;
    max-height: 190px !important;
    object-fit: contain !important;
  }

  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone {
    flex: 0 0 clamp(92px, 15vh, 112px) !important;
    min-height: clamp(92px, 15vh, 112px) !important;
    padding: 10px 14px !important;
  }

  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank {
    width: 100% !important;
    max-width: 320px !important;
    min-width: 0 !important;
    justify-self: stretch !important;
  }

  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank-items {
    width: 100% !important;
    max-width: none !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 12px !important;
  }

  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item-shell {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
  }

  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item {
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    min-height: 68px !important;
    padding: 10px 14px !important;
  }
}

/* Preserve the already-approved mobile composition: stimulus -> destination ->
   two-column choices -> confirm. Only guard against tiny controls. */
@media (max-width: 760px) {
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item {
    min-height: 58px !important;
  }
}
`;

  function inject(iframe) {
    try {
      const doc = iframe.contentDocument;
      if (!doc || !doc.head) return false;
      if (doc.getElementById(STYLE_ID)) return true;
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      doc.head.appendChild(style);
      return true;
    } catch (_) {
      return false;
    }
  }

  function watchFrame(iframe) {
    if (!iframe || iframe.dataset.duduqM03VisualPolishWatched === "true") return;
    iframe.dataset.duduqM03VisualPolishWatched = "true";
    iframe.addEventListener("load", () => {
      window.setTimeout(() => inject(iframe), 0);
    });
    inject(iframe);
  }

  function scan() {
    document.querySelectorAll(FRAME_SELECTOR).forEach(watchFrame);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();

  window.DuduQYear2M03SingleTargetVisualPolish = Object.freeze({
    version: VERSION,
    homologationOnly: true,
    styleId: STYLE_ID,
    ready: true
  });
})();

/* DUDUQ / EduQ Play — editorial attribution (V23)
 * Non-interfering, viewport-anchored footer. Never edits Gold Master game UI.
 * The link is interactive, but the surrounding overlay cannot block game inputs.
 */
(() => {
  "use strict";
  if (window.__DUDUQ_EBC_ATTRIBUTION_ACTIVE__) return;
  window.__DUDUQ_EBC_ATTRIBUTION_ACTIVE__ = true;

  const style = document.createElement("style");
  style.id = "duduq-ebc-attribution-style";
  style.textContent = [
    ".duduq-ebc-attribution {",
    "position:fixed !important;left:50% !important;bottom:calc(4px + env(safe-area-inset-bottom, 0px)) !important;",
    "transform:translateX(-50%) !important;z-index:2147483000 !important;box-sizing:border-box !important;",
    "width:max-content !important;max-width:calc(100% - 16px) !important;padding:3px 9px !important;",
    "margin:0 !important;border-radius:99px !important;background:rgba(255,255,255,.50) !important;",
    "box-shadow:0 1px 5px rgba(8,39,49,.08) !important;color:#253b44 !important;",
    "font:700 clamp(9px,.8vw,11px)/1.25 'Nunito','Segoe UI',Arial,sans-serif !important;",
    "letter-spacing:.05px !important;text-align:center !important;opacity:.70 !important;",
    "pointer-events:none !important;user-select:none !important;-webkit-user-select:none !important;",
    "white-space:normal !important;transition:opacity .15s ease !important;}",
    ".duduq-ebc-attribution:hover,.duduq-ebc-attribution:focus-within {opacity:1 !important;}",
    ".duduq-ebc-attribution a {color:inherit !important;font:inherit !important;",
    "text-decoration:none !important;pointer-events:auto !important;cursor:pointer !important;}",
    ".duduq-ebc-attribution a:hover,.duduq-ebc-attribution a:focus-visible {text-decoration:underline !important;}",
    ".duduq-ebc-attribution a:focus-visible {outline:2px solid #1876af !important;outline-offset:2px !important;}",
    "@media(max-width:480px){.duduq-ebc-attribution {bottom:calc(3px + env(safe-area-inset-bottom, 0px)) !important;",
    "padding:2px 6px !important;font-size:9px !important;}}",
    "@media print {.duduq-ebc-attribution {display:none !important;}}"
  ].join("\n");

  const footer = document.createElement("div");
  footer.className = "duduq-ebc-attribution";
  footer.dataset.duduqAttribution = "ebc-2026";
  footer.setAttribute("role", "contentinfo");
  footer.setAttribute("aria-label", "Créditos de desenvolvimento do DUDUQ");
  footer.appendChild(document.createTextNode("\u00a9 2026 Copyright | Desenvolvido por "));

  const link = document.createElement("a");
  link.href = "https://brasilcultural.com.br/";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Editora Brasil Cultural";
  footer.appendChild(link);

  // Fullscreen on #game hides nodes outside that element; move only this footer.
  function positionFooter() {
    const host = document.fullscreenElement || document.body;
    if (host && footer.parentNode !== host) host.appendChild(footer);
  }

  (document.head || document.documentElement).appendChild(style);
  positionFooter();
  document.addEventListener("fullscreenchange", positionFooter);
  window.addEventListener("pageshow", positionFooter);
})();
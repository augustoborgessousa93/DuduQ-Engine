/* DUDUQ V24 — keep topic labels readable within the approved HUD title lane.
 * Presentation only: original module title remains in title/aria-label.
 * Never changes curriculum content, gameplay, Gold Masters or header geometry.
 */
(() => {
  "use strict";
  if (window.__DUDUQ_HEADER_TITLE_FIT_V24__) return;
  window.__DUDUQ_HEADER_TITLE_FIT_V24__ = true;

  const style = document.createElement("style");
  style.id = "duduq-header-title-fit-v24-style";
  style.textContent = [
    "#game .duduq-canonical-header-hud .hud-title-group:has(.hud-title[data-duduq-title-fit]){",
    "top:22px!important;height:56px!important;min-height:56px!important;max-height:56px!important;}",
    "#game .duduq-canonical-header-hud .hud-title[data-duduq-title-fit]{",
    "position:absolute!important;left:0!important;top:50%!important;transform:translateY(-50%)!important;",
    "box-sizing:border-box!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:3;",
    "width:100%!important;max-width:160px!important;height:auto!important;min-height:0!important;max-height:56px!important;",
    "margin:0!important;overflow:hidden!important;text-overflow:ellipsis!important;",
    "white-space:normal!important;overflow-wrap:normal!important;word-break:normal!important;text-wrap:balance!important;",
    "align-items:initial!important;justify-content:initial!important;text-align:left!important;",
    "font-size:var(--duduq-title-fit-size,16px)!important;line-height:1.12!important;}",
    "#game .duduq-canonical-header-hud .hud-title[data-duduq-title-fit='compact']{-webkit-line-clamp:3;}"
  ].join("\n");
  (document.head || document.documentElement).appendChild(style);

  const processed = new WeakMap();
  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  function fitHeaderTopic() {
    const heading = document.querySelector("#game .duduq-canonical-header-hud .hud-title");
    if (!heading) return;
    const visible = normalize(heading.textContent);
    const previous = processed.get(heading);
    if (previous && visible === previous.display) return;
    const original = visible;
    if (!original) return;

    if (original.length <= 28) {
      if (previous) {
        heading.removeAttribute("data-duduq-title-fit");
        heading.style.removeProperty("--duduq-title-fit-size");
        heading.removeAttribute("aria-label");
        heading.removeAttribute("title");
      }
      processed.set(heading, { display: original });
      return;
    }

    const colon = original.indexOf(":");
    const prefix = colon > -1 ? normalize(original.slice(0, colon)) : "";
    const compact = prefix.length >= 8 && prefix.length <= 25;
    const display = compact ? prefix : original;
    const fontSize = compact
      ? (display.length <= 16 ? 20 : display.length <= 21 ? 18 : 16)
      : (original.length <= 36 ? 16 : original.length <= 48 ? 14 : 12.5);

    heading.setAttribute("title", original);
    heading.setAttribute("aria-label", original);
    heading.setAttribute("data-duduq-title-fit", compact ? "compact" : "dense");
    heading.style.setProperty("--duduq-title-fit-size", fontSize + "px");
    processed.set(heading, { display });
    if (visible !== display) heading.textContent = display;
  }

  // Handles asynchronously loaded production questions and subsequent header changes.
  const observer = new MutationObserver(fitHeaderTopic);
  observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  fitHeaderTopic();
  document.addEventListener("DOMContentLoaded", fitHeaderTopic);
  window.addEventListener("pageshow", fitHeaderTopic);
})();

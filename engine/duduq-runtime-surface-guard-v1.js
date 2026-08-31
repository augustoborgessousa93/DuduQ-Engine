/* =========================================================
   DUDUQ RUNTIME SURFACE GUARD v1.0.1

   Guarantees an opaque fallback surface behind the same-origin
   Target Shooter scene without changing its arena, assets, physics,
   feedback, timing, or shared visual layers.

   The guard identifies the Target Shooter iframe from the title set
   by its adapter, so the fallback is applied as soon as srcdoc loads
   instead of depending on the React root already being mounted.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.1";
  const FLAG = "__DUDUQ_RUNTIME_SURFACE_GUARD_V1__";
  const FALLBACK = "#f7fbff";

  if (window[FLAG]) return;
  window[FLAG] = VERSION;

  function isTargetShooterFrame(iframe) {
    return /target\s*shooter/i.test(String(iframe?.title || ""));
  }

  function isTransparent(value) {
    const color = String(value || "").replace(/\s+/g, "").toLowerCase();
    return !color || color === "transparent" || color === "rgba(0,0,0,0)" || color === "hsla(0,0%,0%,0)";
  }

  function apply(iframe) {
    if (!isTargetShooterFrame(iframe)) return;

    try {
      const doc = iframe?.contentDocument;
      if (!doc?.documentElement || !doc?.body) return;

      const htmlColor = iframe.contentWindow?.getComputedStyle
        ? iframe.contentWindow.getComputedStyle(doc.documentElement).backgroundColor
        : getComputedStyle(doc.documentElement).backgroundColor;
      const bodyColor = iframe.contentWindow?.getComputedStyle
        ? iframe.contentWindow.getComputedStyle(doc.body).backgroundColor
        : getComputedStyle(doc.body).backgroundColor;

      if (isTransparent(htmlColor)) {
        doc.documentElement.style.setProperty("background-color", FALLBACK, "important");
      }

      if (isTransparent(bodyColor)) {
        doc.body.style.setProperty("background-color", FALLBACK, "important");
      }
    } catch (_) {
      /* Same-origin DuduQ runtimes are expected; fail silently otherwise. */
    }
  }

  function watchIframe(iframe) {
    if (!iframe || iframe.dataset.duduqSurfaceGuard === VERSION) return;
    iframe.dataset.duduqSurfaceGuard = VERSION;
    iframe.addEventListener("load", function () { apply(iframe); });
    apply(iframe);
  }

  function scan(root) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll("iframe").forEach(watchIframe);
  }

  const root = document.getElementById("root") || document.body || document.documentElement;
  scan(root);

  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes || []) {
        if (node?.tagName === "IFRAME") watchIframe(node);
        scan(node);
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });
})();

/* =========================================================
   DUDUQ CORE â€” WORLD FUSION
   Integra o fundo do ano Ã s mecÃ¢nicas sem perder nitidez.
   VersÃ£o 1.0.0
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQWorldFusion?.version === VERSION) return;

  const scriptUrl =
    document.currentScript?.src ||
    new URL("./duduq-world-fusion.js", window.location.href).href;

  const stylesheetUrl = new URL(
    "./duduq-world-fusion.css?v=100",
    scriptUrl
  ).href;

  const managedDocuments = new WeakSet();
  const managedFrames = new WeakSet();

  function getInlineWorldImage(doc) {
    const body = doc.body;
    if (!body) return "";

    const inline = String(body.style.backgroundImage || "").trim();
    if (inline && inline !== "none") return inline;

    try {
      const current =
        doc.documentElement.style.getPropertyValue("--duduq-world-image").trim() ||
        doc.defaultView?.getComputedStyle(body).backgroundImage ||
        "";

      return current !== "none" ? current : "";
    } catch (_) {
      return "";
    }
  }

  function detectMechanic(doc, frame) {
    const source = String(frame?.getAttribute("src") || "").toLowerCase();
    const matches = [
      ["bubble-pop", ".duduq-bp-root"],
      ["drag-drop", ".duduq-dd-root, .duduq-udd-root"],
      ["memory-quest", ".duduq-mq-root"],
      ["matching", ".duduq-matching-root"],
      ["flash-cards", ".duduq-fc-root"],
      ["color-fusion", ".duduq-cf-root"],
      ["word-search", ".duduq-ws-root"],
      ["target-shooter", ".duduq-ts-root"]
    ];

    for (const [name, selector] of matches) {
      if (source.includes(name) || doc.querySelector(selector)) return name;
    }

    return "universal";
  }

  function syncDocument(doc, frame) {
    if (!doc?.documentElement || !doc.body) return false;

    const image = getInlineWorldImage(doc);
    if (image) {
      doc.documentElement.style.setProperty("--duduq-world-image", image);
    }

    doc.documentElement.classList.add("duduq-world-fusion");
    doc.documentElement.setAttribute(
      "data-duduq-world-fusion-version",
      VERSION
    );
    doc.documentElement.setAttribute(
      "data-duduq-mechanic",
      detectMechanic(doc, frame)
    );

    return true;
  }

  function ensureStylesheet(doc) {
    if (doc === document || doc.getElementById("duduq-world-fusion-style")) {
      return;
    }

    const link = doc.createElement("link");
    link.id = "duduq-world-fusion-style";
    link.rel = "stylesheet";
    link.href = stylesheetUrl;
    (doc.head || doc.documentElement).appendChild(link);
  }

  function manageDocument(doc, frame) {
    if (!doc) return false;

    ensureStylesheet(doc);
    syncDocument(doc, frame);

    if (managedDocuments.has(doc)) return true;
    managedDocuments.add(doc);

    let refreshQueued = false;
    function queueRefresh() {
      if (refreshQueued) return;
      refreshQueued = true;
      window.requestAnimationFrame(function () {
        refreshQueued = false;
        syncDocument(doc, frame);
      });
    }

    const contentObserver = new MutationObserver(queueRefresh);
    const worldObserver = new MutationObserver(queueRefresh);

    if (doc.body) {
      contentObserver.observe(doc.body, {
        childList: true,
        subtree: true
      });

      worldObserver.observe(doc.body, {
        attributes: true,
        attributeFilter: ["style"],
        subtree: false
      });
    }

    return true;
  }

  function manageFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;

    function connect() {
      try {
        manageDocument(frame.contentDocument, frame);
      } catch (_) {
        /* Iframes externos continuam funcionando sem a camada visual. */
      }
    }

    if (!managedFrames.has(frame)) {
      managedFrames.add(frame);
      frame.addEventListener("load", connect);
    }

    connect();
  }

  function scanFrames() {
    document.querySelectorAll("iframe").forEach(manageFrame);
  }

  function start() {
    manageDocument(document, null);
    scanFrames();

    const observer = new MutationObserver(function (records) {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node instanceof HTMLIFrameElement) manageFrame(node);
          node.querySelectorAll?.("iframe").forEach(manageFrame);
        }
      }

      syncDocument(document, null);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  window.DuduQWorldFusion = Object.freeze({
    version: VERSION,
    refresh: function () {
      syncDocument(document, null);
      scanFrames();
      return true;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("duduq:assets-ready", function () {
    window.DuduQWorldFusion.refresh();
  });
})();

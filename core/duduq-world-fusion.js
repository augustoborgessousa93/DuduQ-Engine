/* =========================================================
   DUDUQ CORE — WORLD FUSION
   Integra o fundo do ano às mecânicas sem perder nitidez.
   Versão 1.2.3
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.2.3";
  if (window.DuduQWorldFusion?.version === VERSION) return;

  const scriptUrl =
    document.currentScript?.src ||
    new URL("./duduq-world-fusion.js", window.location.href).href;

  const stylesheetUrl = new URL(
    "./duduq-world-fusion.css?v=124",
    scriptUrl
  ).href;

  const managedDocuments = new WeakSet();
  const managedFrames = new WeakSet();
  const fullscreenBridgeDocuments = new WeakSet();

  function getStableFullscreenDocument(doc) {
    let currentWindow = doc?.defaultView;
    let stableDocument = doc;

    try {
      while (currentWindow?.parent && currentWindow.parent !== currentWindow) {
        currentWindow = currentWindow.parent;
        stableDocument = currentWindow.document;
      }
    } catch (_) {
      /* Em origem diferente, preserva o documento mais alto acessível. */
    }

    return stableDocument || doc;
  }

  function isFullscreen(doc) {
    return Boolean(doc?.fullscreenElement || doc?.webkitFullscreenElement);
  }

  function syncFullscreenControls(doc) {
    if (!doc?.documentElement) return;

    const hostDocument = getStableFullscreenDocument(doc);
    const active = isFullscreen(hostDocument);

    doc.documentElement.toggleAttribute(
      "data-duduq-parent-fullscreen",
      active
    );

    doc.querySelectorAll(".duduq-engine-fullscreen-button").forEach(
      function (button) {
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute(
          "aria-label",
          active ? "Sair da tela cheia" : "Abrir em tela cheia"
        );

        const label = button.querySelector(".duduq-engine-fullscreen-label");
        const icon = button.querySelector(".duduq-engine-fullscreen-icon");

        const nextLabel = active ? "Sair" : "Tela cheia";
        const nextIcon = active ? "🗗" : "⛶";

        if (label && label.textContent !== nextLabel) {
          label.textContent = nextLabel;
        }

        if (icon && icon.textContent !== nextIcon) {
          icon.textContent = nextIcon;
        }
      }
    );
  }

  function installFullscreenBridge(doc) {
    if (!doc || fullscreenBridgeDocuments.has(doc)) {
      syncFullscreenControls(doc);
      return;
    }

    fullscreenBridgeDocuments.add(doc);

    const hostDocument = getStableFullscreenDocument(doc);

    doc.addEventListener(
      "click",
      function (event) {
        const button = event.target?.closest?.(
          ".duduq-engine-fullscreen-button"
        );

        if (!button) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        try {
          const hostApi = doc.defaultView?.parent?.DuduQFullscreen;
          const operation = hostApi?.toggle
            ? hostApi.toggle()
            : isFullscreen(hostDocument)
              ? (hostDocument.exitFullscreen?.() ||
                hostDocument.webkitExitFullscreen?.())
              : (hostDocument.documentElement.requestFullscreen?.({
                  navigationUI: "hide"
                }) || hostDocument.documentElement.webkitRequestFullscreen?.());

          Promise.resolve(operation)
            .catch(function () {})
            .finally(function () {
              syncFullscreenControls(doc);
            });
        } catch (_) {
          syncFullscreenControls(doc);
        }
      },
      true
    );

    const refresh = function () {
      syncFullscreenControls(doc);
      if (hostDocument !== doc) syncFullscreenControls(hostDocument);
    };

    hostDocument.addEventListener("fullscreenchange", refresh);
    hostDocument.addEventListener("webkitfullscreenchange", refresh);
    syncFullscreenControls(doc);
  }

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

    syncFullscreenControls(doc);

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
    installFullscreenBridge(doc);

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

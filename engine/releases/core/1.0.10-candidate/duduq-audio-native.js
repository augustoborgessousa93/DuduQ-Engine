/* =========================================================
   DUDUQ CORE — NATIVE AUDIO VISUAL STANDARD (CANDIDATE)
   Versão candidata: 1.0.0

   Responsabilidade única:
   - propagar o stylesheet visual do áudio para o documento host
     e para os iframes same-origin das mecânicas;
   - usar exclusivamente o data-playing emitido pela própria mecânica.

   NÃO dispara áudio.
   NÃO altera speechSynthesis.
   NÃO altera data-playing.
   NÃO altera mecânica, conteúdo, pontuação ou progressão.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.0-candidate";
  const STYLE_ID = "duduq-audio-native-standard-style";
  const SCRIPT_URL = document.currentScript?.src || new URL("./duduq-audio-native.js", window.location.href).href;
  const STYLE_URL = new URL("./duduq-audio-native.css?v=1", SCRIPT_URL).href;
  const installedDocuments = new WeakSet();
  const wiredFrames = new WeakSet();

  function installDocument(doc) {
    if (!doc?.documentElement) return false;
    if (installedDocuments.has(doc)) return true;

    try {
      if (!doc.getElementById(STYLE_ID)) {
        const link = doc.createElement("link");
        link.id = STYLE_ID;
        link.rel = "stylesheet";
        link.href = STYLE_URL;
        (doc.head || doc.documentElement).appendChild(link);
      }
      installedDocuments.add(doc);
      return true;
    } catch (_) {
      return false;
    }
  }

  function installFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;

    const apply = function () {
      try {
        installDocument(frame.contentDocument);
      } catch (_) {}
    };

    if (!wiredFrames.has(frame)) {
      wiredFrames.add(frame);
      frame.addEventListener("load", apply);
    }

    apply();
  }

  function scan(root) {
    installDocument(document);

    try {
      if (root instanceof HTMLIFrameElement) installFrame(root);
      root?.querySelectorAll?.("iframe").forEach(installFrame);
    } catch (_) {}
  }

  const observer = new MutationObserver(function (records) {
    for (const record of records) {
      record.addedNodes.forEach(function (node) {
        if (!(node instanceof Element)) return;
        scan(node);
      });
    }
  });

  installDocument(document);
  scan(document);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.DuduQAudioNativeStandard = Object.freeze({
    version: VERSION,
    installDocument,
    scan
  });
})();

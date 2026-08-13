/* =========================================================
   DUDUQ CORE — WORLD FUSION
   Integra o fundo do ano às mecânicas sem perder nitidez.
   Versão 1.3.5
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.3.5";
  if (window.DuduQWorldFusion?.version === VERSION) return;

  const scriptUrl =
    document.currentScript?.src ||
    new URL("./duduq-world-fusion.js", window.location.href).href;

  const stylesheetUrl = new URL(
    "./duduq-world-fusion.css?v=135",
    scriptUrl
  ).href;

  const managedDocuments = new WeakSet();
  const managedFrames = new WeakSet();
  const fullscreenBridgeDocuments = new WeakSet();
  const literacySpeechDocuments = new WeakSet();
  const literacyFitDocuments = new WeakSet();
  const speechWarmDocuments = new WeakSet();

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
              ? (
                  hostDocument.exitFullscreen?.() ||
                  hostDocument.webkitExitFullscreen?.()
                )
              : (
                  hostDocument.documentElement.requestFullscreen?.({
                    navigationUI: "hide"
                  }) ||
                  hostDocument.documentElement.webkitRequestFullscreen?.()
                );

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
        doc.documentElement.style
          .getPropertyValue("--duduq-world-image")
          .trim() ||
        doc.defaultView?.getComputedStyle(body).backgroundImage ||
        "";

      return current !== "none" ? current : "";
    } catch (_) {
      return "";
    }
  }

  function detectMechanic(doc, frame) {
    const source = String(
      frame?.getAttribute("src") || ""
    ).toLowerCase();

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
      if (source.includes(name) || doc.querySelector(selector)) {
        return name;
      }
    }

    return "universal";
  }

  /* =======================================================
     PERFIL DE ALFABETIZAÇÃO — EI / 1º / 2º ANO

     A faixa é detectada pela query ?ano= enviada pelos
     adaptadores das mecânicas. Não alteramos conteúdo:
     apenas adicionamos um atributo semântico ao <html>.
     ======================================================= */

  /* =======================================================
     SPEECH SYNTHESIS — PRÉ-AQUECIMENTO

     O autoplay das mecânicas usa Web Speech API. Em alguns
     navegadores, a primeira chamada a speechSynthesis.speak()
     pode esperar o carregamento das vozes do sistema.

     Como o World Fusion é carregado ainda durante a Intro,
     preparamos as vozes antes de a primeira atividade nascer.
     Também repetimos a preparação dentro de cada iframe.
     ======================================================= */

  function touchSpeechEngine(doc) {
    const view =
      doc?.defaultView;

    const synth =
      view?.speechSynthesis;

    if (!synth) {
      return [];
    }

    try {
      synth.resume?.();
    } catch (_) {}

    try {
      return Array.from(
        synth.getVoices?.() || []
      );
    } catch (_) {
      return [];
    }
  }

  function installSpeechWarmup(doc) {
    if (!doc) return;

    touchSpeechEngine(doc);

    if (
      speechWarmDocuments.has(doc)
    ) {
      return;
    }

    speechWarmDocuments.add(doc);

    const view =
      doc.defaultView;

    const synth =
      view?.speechSynthesis;

    if (!synth) return;

    const refresh =
      function () {
        touchSpeechEngine(doc);
      };

    /*
     * Chrome/Edge podem popular a lista de vozes alguns
     * milissegundos depois do carregamento do documento.
     */
    try {
      synth.addEventListener?.(
        "voiceschanged",
        refresh
      );
    } catch (_) {}

    view?.setTimeout?.(
      refresh,
      40
    );

    view?.setTimeout?.(
      refresh,
      140
    );

    /*
     * A primeira interação do aluno também reabre/resume
     * o mecanismo de fala. Não produz som.
     */
    doc.addEventListener(
      "pointerdown",
      refresh,
      {
        capture: true,
        passive: true
      }
    );

    doc.addEventListener(
      "keydown",
      refresh,
      true
    );
  }

  function normalizeProfileText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function getDocumentParams(doc) {
    try {
      return new URLSearchParams(
        doc?.defaultView?.location?.search || ""
      );
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function isEarlyLiteracyProfile(doc) {
    const params =
      getDocumentParams(doc);

    const rawYear =
      params.get("ano") ||
      params.get("year") ||
      params.get("serie") ||
      params.get("série") ||
      doc?.documentElement?.getAttribute(
        "data-duduq-ano-ativo"
      ) ||
      "";

    const normalized =
      normalizeProfileText(rawYear);

    if (
      /(^|[^0-9])1([^0-9]|$)/.test(normalized) ||
      /(^|[^0-9])2([^0-9]|$)/.test(normalized)
    ) {
      return true;
    }

    return /educacao infantil|infantil|maternal|creche|pre[- ]?escola|pre[- ]?i|pre[- ]?ii/.test(
      normalized
    );
  }

  function syncLiteracyProfile(doc) {
    if (!doc?.documentElement) return false;

    const early =
      isEarlyLiteracyProfile(doc);

    doc.documentElement.setAttribute(
      "data-duduq-literacy-early",
      early ? "true" : "false"
    );

    return early;
  }

  function syncBubbleLabelSemantics(doc) {
    if (!doc?.querySelectorAll) return;

    doc
      .querySelectorAll(
        ".duduq-bp-label"
      )
      .forEach(
        function (label) {
          const text =
            String(
              label.textContent || ""
            ).trim();

          if (!text) {
            label.removeAttribute(
              "data-duduq-label-kind"
            );
            return;
          }

          label.setAttribute(
            "data-duduq-label-kind",
            /\s/.test(text)
              ? "phrase"
              : "word"
          );
        }
      );
  }

  /* =======================================================
     BUBBLE POP — FIT DINÂMICO PARA PALAVRA ÚNICA

     O tamanho base permanece confortável. Só reduzimos a
     palavra específica que realmente ultrapassa a largura
     útil da bolha. O limite inferior de 20px evita texto
     pequeno demais para alfabetização.
     ======================================================= */

  function fitEarlyLiteracyBubbleWords(doc) {
    if (
      !doc?.documentElement ||
      doc.documentElement.getAttribute(
        "data-duduq-literacy-early"
      ) !== "true"
    ) {
      return;
    }

    const view =
      doc.defaultView;

    if (!view) return;

    view.requestAnimationFrame(
      function () {
        doc
          .querySelectorAll(
            '.duduq-bp-label[data-duduq-label-kind="word"]'
          )
          .forEach(
            function (label) {
              const bubble =
                label.closest(
                  ".duduq-bp-bubble"
                );

              if (!bubble) return;

              let size = 27;

              label.style.setProperty(
                "--duduq-bp-word-fit-size",
                `${size}px`
              );

              const fits = function () {
                return (
                  label.scrollWidth <=
                  label.clientWidth + 1
                );
              };

              while (
                !fits() &&
                size > 20
              ) {
                size -= 1;

                label.style.setProperty(
                  "--duduq-bp-word-fit-size",
                  `${size}px`
                );
              }
            }
          );
      }
    );
  }

  /* =======================================================
     BUBBLE POP — FIT DINÂMICO PARA FRASES CURTAS

     Frases continuam podendo quebrar SOMENTE entre palavras.
     O ajuste mede overflow horizontal e vertical e reduz
     apenas a frase específica até o mínimo pedagógico de 18px.
     Assim GOOD AFTERNOON não perde letras nem obriga a reduzir
     HELLO, BOY, GIRL e demais alvos curtos.
     ======================================================= */

  function fitEarlyLiteracyBubblePhrases(doc) {
    if (
      !doc?.documentElement ||
      doc.documentElement.getAttribute(
        "data-duduq-literacy-early"
      ) !== "true"
    ) {
      return;
    }

    const view = doc.defaultView;
    if (!view) return;

    view.requestAnimationFrame(
      function () {
        doc
          .querySelectorAll(
            '.duduq-bp-label[data-duduq-label-kind="phrase"]'
          )
          .forEach(
            function (label) {
              const bubble = label.closest(".duduq-bp-bubble");
              if (!bubble) return;

              let size = 25;
              const minSize = 18;

              label.style.setProperty(
                "--duduq-bp-phrase-fit-size",
                `${size}px`
              );

              const fits = function () {
                const horizontal =
                  label.scrollWidth <= label.clientWidth + 1;

                const maxHeight = Math.max(
                  58,
                  bubble.clientHeight * .72
                );

                const vertical =
                  label.scrollHeight <= maxHeight + 1;

                return horizontal && vertical;
              };

              while (!fits() && size > minSize) {
                size -= 1;
                label.style.setProperty(
                  "--duduq-bp-phrase-fit-size",
                  `${size}px`
                );
              }
            }
          );
      }
    );
  }

  function installEarlyLiteracyFit(doc) {
    if (
      !doc ||
      literacyFitDocuments.has(doc)
    ) {
      fitEarlyLiteracyBubbleWords(doc);
      fitEarlyLiteracyBubblePhrases(doc);
      return;
    }

    literacyFitDocuments.add(doc);

    const view =
      doc.defaultView;

    view?.addEventListener?.(
      "resize",
      function () {
        fitEarlyLiteracyBubbleWords(doc);
        fitEarlyLiteracyBubblePhrases(doc);
      },
      { passive: true }
    );

    fitEarlyLiteracyBubbleWords(doc);
    fitEarlyLiteracyBubblePhrases(doc);
  }

  function resolveBubbleSpeechLocale(doc) {
    const params =
      getDocumentParams(doc);

    const explicit =
      params.get("speechLocale") ||
      params.get("speechLang") ||
      params.get("contentLanguage");

    if (explicit) {
      return String(explicit);
    }

    const moduleId =
      normalizeProfileText(
        params.get("module") || ""
      );

    const source =
      [
        moduleId,
        normalizeProfileText(
          doc?.title || ""
        )
      ].join(" ");

    if (
      /english|ingles/.test(source)
    ) {
      return "en-US";
    }

    if (
      /spanish|espanhol/.test(source)
    ) {
      return "es-ES";
    }

    return "pt-BR";
  }

  function speakBubbleLabel(doc, text) {
    const value =
      String(text || "").trim();

    if (!value) return;

    const view =
      doc?.defaultView;

    const synth =
      view?.speechSynthesis ||
      window.speechSynthesis;

    const Utterance =
      view?.SpeechSynthesisUtterance ||
      window.SpeechSynthesisUtterance;

    if (
      !synth ||
      !Utterance
    ) {
      return;
    }

    try {
      const locale =
        resolveBubbleSpeechLocale(doc);

      installSpeechWarmup(doc);

      const hadActiveSpeech =
        Boolean(
          synth.speaking ||
          synth.pending
        );

      if (hadActiveSpeech) {
        synth.cancel();
      }

      const utterance =
        new Utterance(value);

      utterance.lang =
        locale;

      /*
       * Se as vozes já estiverem disponíveis, fixamos uma
       * voz do mesmo idioma para reduzir o tempo de seleção
       * automática do navegador.
       */
      const voices =
        touchSpeechEngine(doc);

      const exactVoice =
        voices.find(
          function (voice) {
            return (
              String(
                voice.lang || ""
              ).toLowerCase() ===
              String(locale)
                .toLowerCase()
            );
          }
        );

      const languageRoot =
        String(locale)
          .toLowerCase()
          .split("-")[0];

      const languageVoice =
        voices.find(
          function (voice) {
            return String(
              voice.lang || ""
            )
              .toLowerCase()
              .startsWith(
                languageRoot
              );
          }
        );

      utterance.voice =
        exactVoice ||
        languageVoice ||
        null;

      utterance.rate = .88;
      utterance.pitch = 1.02;
      utterance.volume = 1;

      const speak =
        function () {
          try {
            synth.resume?.();
            synth.speak(
              utterance
            );
          } catch (_) {}
        };

      /*
       * Só esperamos alguns milissegundos quando realmente
       * houve uma fala anterior a ser cancelada. O atraso
       * fixo de 90ms foi removido para não competir com a
       * transição para o próximo enunciado.
       */
      if (hadActiveSpeech) {
        view?.setTimeout?.(
          speak,
          28
        );
      } else {
        speak();
      }
    } catch (_) {}
  }

  function installEarlyLiteracySpeech(doc) {
    if (
      !doc ||
      literacySpeechDocuments.has(doc)
    ) {
      return;
    }

    literacySpeechDocuments.add(doc);

    doc.addEventListener(
      "click",
      function (event) {
        if (
          doc.documentElement
            ?.getAttribute(
              "data-duduq-literacy-early"
            ) !== "true"
        ) {
          return;
        }

        const target =
          event.target instanceof
          doc.defaultView.Element
            ? event.target
            : null;

        const bubble =
          target
            ?.closest
            ?.(".duduq-bp-bubble");

        if (
          !bubble ||
          bubble.disabled ||
          bubble.getAttribute(
            "aria-disabled"
          ) === "true"
        ) {
          return;
        }

        const label =
          bubble
            .querySelector(
              ".duduq-bp-label"
            )
            ?.textContent
            ?.trim();

        if (!label) return;

        speakBubbleLabel(
          doc,
          label
        );
      },
      true
    );
  }


  function syncDocument(doc, frame) {
    if (!doc?.documentElement || !doc.body) return false;

    const image = getInlineWorldImage(doc);

    if (image) {
      doc.documentElement.style.setProperty(
        "--duduq-world-image",
        image
      );
    }

    doc.documentElement.classList.add("duduq-world-fusion");
    syncLiteracyProfile(doc);
    syncBubbleLabelSemantics(doc);
    fitEarlyLiteracyBubbleWords(doc);
    fitEarlyLiteracyBubblePhrases(doc);

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
    if (doc === document) {
      return;
    }

    const existing = doc.getElementById("duduq-world-fusion-style");

    if (existing) {
      if (existing.getAttribute("href") !== stylesheetUrl) {
        existing.setAttribute("href", stylesheetUrl);
      }
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
    installSpeechWarmup(doc);
    syncDocument(doc, frame);
    installFullscreenBridge(doc);
    installEarlyLiteracySpeech(doc);
    installEarlyLiteracyFit(doc);

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

          if (node instanceof HTMLIFrameElement) {
            manageFrame(node);
          }

          node.querySelectorAll?.("iframe").forEach(manageFrame);
        }
      }

      syncDocument(document, null);
    });

    observer.observe(
      document.body || document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );
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
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

  window.addEventListener(
    "duduq:assets-ready",
    function () {
      installSpeechWarmup(document);
      window.DuduQWorldFusion.refresh();
    }
  );
})();


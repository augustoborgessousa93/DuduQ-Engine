/* =========================================================
   DUDUQ CORE — WORLD FUSION
   Integra o fundo do ano às mecânicas sem perder nitidez.
   Versão 1.4.8
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.4.8";
  if (window.DuduQWorldFusion?.version === VERSION) return;

  const scriptUrl =
    document.currentScript?.src ||
    new URL("./duduq-world-fusion.js", window.location.href).href;

  const stylesheetUrl = new URL(
    "./duduq-world-fusion.css?v=147",
    scriptUrl
  ).href;

  const managedDocuments = new WeakSet();
  const managedFrames = new WeakSet();
  const fullscreenBridgeDocuments = new WeakSet();
  const literacySpeechDocuments = new WeakSet();
  const literacyFitDocuments = new WeakSet();
  const speechWarmDocuments = new WeakSet();
  const feedbackScrollGuardDocuments = new WeakSet();
  const initialSpeechGateDocuments = new WeakSet();
  const audioVisualStateDocuments = new WeakSet();
  const memoryQuestPedagogyDocuments = new WeakSet();
  const dragDropDropAudioDocuments = new WeakSet();
  const feedbackVoiceDocuments = new WeakSet();
  const headerMascotSnapshots = new WeakMap();
  const mascotTrimPromises = new Map();
  const mascotTrimSources = new Map();

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
      /(^|[^0-9])2([^0-9]|$)/.test(normalized) ||
      /(^|[^0-9])3([^0-9]|$)/.test(normalized)
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


  /* =======================================================
     TARGET SHOOTER — CENTRALIZAÇÃO GEOMÉTRICA

     Mede o conjunto visível uma vez por largura de arena e
     calcula o deslocamento horizontal necessário para que o
     grupo fique centralizado, sem alterar os slots pedagógicos
     nem as animações próprias da mecânica.
     ======================================================= */

  function syncTargetShooterCentering(doc) {
    const arena =
      doc?.querySelector?.(".duduq-ts-arena");

    if (!arena) return;

    const view = doc.defaultView;
    if (!view) return;

    view.requestAnimationFrame(function () {
      const targets = Array.from(
        arena.querySelectorAll(".duduq-ts-target")
      ).filter(function (target) {
        const style = view.getComputedStyle(target);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          target.getClientRects().length > 0
        );
      });

      if (!targets.length) {
        arena.style.removeProperty(
          "--duduq-ts-center-offset"
        );
        arena.removeAttribute(
          "data-duduq-center-width"
        );
        return;
      }

      const arenaRect = arena.getBoundingClientRect();
      const widthKey = String(
        Math.round(arenaRect.width)
      );

      if (
        arena.getAttribute(
          "data-duduq-center-width"
        ) === widthKey &&
        arena.style.getPropertyValue(
          "--duduq-ts-center-offset"
        )
      ) {
        return;
      }

      /* Mede a geometria original, sem acumular offsets. */
      arena.style.setProperty(
        "--duduq-ts-center-offset",
        "0px"
      );

      const boxes = targets.map(function (target) {
        return target.getBoundingClientRect();
      });

      const minLeft = Math.min(
        ...boxes.map((box) => box.left)
      );
      const maxRight = Math.max(
        ...boxes.map((box) => box.right)
      );

      const groupCenter =
        (minLeft + maxRight) / 2;
      const arenaCenter =
        arenaRect.left + arenaRect.width / 2;

      const desired =
        arenaCenter - groupCenter;

      const safeInset = 18;
      const minAllowed =
        arenaRect.left + safeInset - minLeft;
      const maxAllowed =
        arenaRect.right - safeInset - maxRight;

      const delta = Math.round(
        Math.max(
          minAllowed,
          Math.min(maxAllowed, desired)
        )
      );

      arena.style.setProperty(
        "--duduq-ts-center-offset",
        `${delta}px`
      );
      arena.setAttribute(
        "data-duduq-center-width",
        widthKey
      );
    });
  }

  /* =======================================================
     FEEDBACK SEM SALTO DE VIEWPORT

     O Lesson Engine embutido nas mecânicas chama
     feedbackRef.current.scrollIntoView() quando feedbackState
     muda. Em um módulo encaixado na viewport, essa rolagem é
     indesejada: o feedback já possui uma faixa reservada e o
     movimento acaba cortando o topo do cabeçalho.

     Interceptamos SOMENTE scrollIntoView chamado no bloco
     .duduq-engine-feedback. Qualquer outro scrollIntoView do
     documento continua funcionando normalmente.
     ======================================================= */

  function installFeedbackScrollGuard(doc) {
    if (
      !doc?.defaultView ||
      feedbackScrollGuardDocuments.has(doc)
    ) {

      return;
    }

    const ElementCtor = doc.defaultView.Element;
    const prototype = ElementCtor?.prototype;
    const original = prototype?.scrollIntoView;

    if (
      !prototype ||
      typeof original !== "function"
    ) {
      return;
    }

    try {
      const guardFlag = "__duduqFeedbackScrollGuard140";

      if (!prototype[guardFlag]) {
        Object.defineProperty(
          prototype,
          "scrollIntoView",
          {
            configurable: true,
            writable: true,
            value: function (...args) {
              try {
                if (
                  this?.classList?.contains(
                    "duduq-engine-feedback"
                  )
                ) {
                  return;
                }
              } catch (_) {}

              return original.apply(this, args);
            }
          }
        );

        Object.defineProperty(
          prototype,
          guardFlag,
          {
            configurable: true,
            value: true
          }
        );
      }

      feedbackScrollGuardDocuments.add(doc);
    } catch (_) {
      /* Navegadores que bloqueiem patch de prototype seguem sem falhar. */
    }
  }



  /* =======================================================
     MASCOTE PERSISTENTE — CLONE DO COMPONENTE NATIVO

     O Lesson Engine remove o DuduQ React durante retry/success.
     Em vez de tentar reconstruir o enquadramento do PNG manualmente,
     guardamos uma cópia do próprio componente nativo enquanto ele
     está visível e reutilizamos a mesma estrutura quando o slot fica
     vazio. Assim tamanho, crop, animação e proporção permanecem
     idênticos em todas as mecânicas que usam o Lesson Engine.
     ======================================================= */

  function resolveHeaderMascotSource(doc) {
    const view = doc?.defaultView;

    try {
      return (
        view?.DUDUQ_ASSETS?.mascots?.idle ||
        view?.DuduQAssets?.assets?.mascots?.idle ||
        view?.parent?.DUDUQ_ASSETS?.mascots?.idle ||
        view?.parent?.DuduQAssets?.assets?.mascots?.idle ||
        window.DUDUQ_ASSETS?.mascots?.idle ||
        window.DuduQAssets?.assets?.mascots?.idle ||
        "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/DUDUQ_IDLE.png"
      );
    } catch (_) {
      return (
        window.DUDUQ_ASSETS?.mascots?.idle ||
        "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/DUDUQ_IDLE.png"
      );
    }
  }

  function sanitizeMascotSnapshot(node) {
    const clone = node?.cloneNode?.(true);
    if (!clone) return null;

    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("aria-label");
    clone.classList.add("duduq-world-header-mascot-clone");

    clone.querySelectorAll?.("[id]").forEach(
      function (element) {
        element.removeAttribute("id");
      }
    );

    clone.querySelectorAll?.("img").forEach(
      function (image) {
        image.alt = "";
        image.draggable = false;
      }
    );

    return clone;
  }

  function createEmergencyHeaderMascot(doc, source) {

    const figure = doc.createElement("figure");
    figure.className =
      "duduq-mascot duduq-world-header-emergency-mascot";
    figure.setAttribute("data-state", "idle");
    figure.setAttribute("data-size", "idle");
    figure.setAttribute("data-placeholder", "false");
    figure.setAttribute("data-reduced-motion", "false");
    figure.setAttribute("aria-hidden", "true");

    const body = doc.createElement("div");
    body.className = "duduq-mascot-body";

    const image = doc.createElement("img");
    image.src = source;
    image.alt = "";
    image.draggable = false;

    body.appendChild(image);
    figure.appendChild(body);
    return figure;
  }

  function findDirectNativeMascot(slot) {
    return Array.from(slot?.children || []).find(
      function (child) {
        return child?.classList?.contains("duduq-mascot");
      }
    ) || null;
  }

  function syncHeaderMascotFallback(doc) {
    if (!doc?.querySelectorAll) return;

    const source = resolveHeaderMascotSource(doc);

    doc.querySelectorAll(
      ".duduq-engine-header-mascot-slot"
    ).forEach(function (slot) {
      const nativeMascot =
        findDirectNativeMascot(slot);

      let fallback = Array.from(slot.children).find(
        function (child) {
          return child?.classList?.contains(
            "duduq-world-header-mascot-fallback"
          );
        }
      ) || null;

      const nativeVisible =
        slot.getAttribute("data-visible") === "true" &&
        Boolean(nativeMascot);

      if (nativeVisible) {
        const snapshot =
          sanitizeMascotSnapshot(nativeMascot);

        if (snapshot) {
          headerMascotSnapshots.set(slot, snapshot);
        }

        fallback?.remove();
        return;
      }

      if (!fallback) {
        fallback = doc.createElement("div");
        fallback.className =
          "duduq-world-header-mascot-fallback";
        fallback.setAttribute("aria-hidden", "true");
        slot.appendChild(fallback);
      }

      if (!fallback.firstElementChild) {
        const stored = headerMascotSnapshots.get(slot);
        const visual = stored
          ? stored.cloneNode(true)
          : createEmergencyHeaderMascot(doc, source);

        fallback.replaceChildren(visual);
      }
    });
  }


  /* =======================================================
     MASCOTE — RECORTE AUTOMÁTICO DE TRANSPARÊNCIA

     O asset DUDUQ_IDLE.png possui uma tela transparente bem maior
     que o personagem. Para superfícies que não contam com o CSS
     interno do componente React (ex.: ponte global entre mecânicas),
     geramos uma cópia em memória recortada pela área alfa real.

     A leitura é feita em canvas reduzido para ser leve e é cacheada
     por URL. Se CORS/canvas não estiver disponível, a interface usa
     o asset original com um fallback de escala via CSS.
     ======================================================= */

  function trimTransparentMascotSource(source) {
    if (!source) return Promise.resolve("");

    if (mascotTrimSources.has(source)) {
      return Promise.resolve(
        mascotTrimSources.get(source)
      );
    }

    if (mascotTrimPromises.has(source)) {
      return mascotTrimPromises.get(source);
    }

    const promise = new Promise(function (resolve) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";


      function fallback() {
        mascotTrimSources.set(source, source);
        resolve(source);
      }

      image.onerror = fallback;

      image.onload = function () {
        try {
          const naturalWidth = image.naturalWidth || image.width;
          const naturalHeight = image.naturalHeight || image.height;

          if (!naturalWidth || !naturalHeight) {
            fallback();
            return;
          }

          const maxSampleSide = 512;
          const sampleScale = Math.min(
            1,
            maxSampleSide / Math.max(naturalWidth, naturalHeight)
          );
          const sampleWidth = Math.max(
            1,
            Math.round(naturalWidth * sampleScale)
          );
          const sampleHeight = Math.max(
            1,
            Math.round(naturalHeight * sampleScale)
          );

          const sample = document.createElement("canvas");
          sample.width = sampleWidth;
          sample.height = sampleHeight;

          const sampleContext = sample.getContext(
            "2d",
            { willReadFrequently: true }
          );

          if (!sampleContext) {
            fallback();
            return;
          }

          sampleContext.clearRect(
            0,
            0,
            sampleWidth,
            sampleHeight
          );
          sampleContext.drawImage(
            image,
            0,
            0,
            sampleWidth,
            sampleHeight
          );

          const pixels = sampleContext.getImageData(
            0,
            0,
            sampleWidth,
            sampleHeight
          ).data;

          let minX = sampleWidth;
          let minY = sampleHeight;
          let maxX = -1;
          let maxY = -1;

          for (let y = 0; y < sampleHeight; y += 1) {
            for (let x = 0; x < sampleWidth; x += 1) {
              const alpha = pixels[
                (y * sampleWidth + x) * 4 + 3
              ];

              if (alpha <= 6) continue;

              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }

          if (maxX < minX || maxY < minY) {
            fallback();
            return;
          }

          const invScale = 1 / sampleScale;
          let sourceX = Math.floor(minX * invScale);
          let sourceY = Math.floor(minY * invScale);
          let sourceWidth = Math.ceil(
            (maxX - minX + 1) * invScale
          );
          let sourceHeight = Math.ceil(
            (maxY - minY + 1) * invScale
          );

          const padding = Math.max(
            4,
            Math.round(
              Math.max(sourceWidth, sourceHeight) * .045
            )
          );

          sourceX = Math.max(0, sourceX - padding);
          sourceY = Math.max(0, sourceY - padding);
          sourceWidth = Math.min(
            naturalWidth - sourceX,
            sourceWidth + padding * 2
          );

          sourceHeight = Math.min(
            naturalHeight - sourceY,
            sourceHeight + padding * 2
          );

          const crop = document.createElement("canvas");
          crop.width = sourceWidth;
          crop.height = sourceHeight;

          const cropContext = crop.getContext("2d");
          if (!cropContext) {
            fallback();
            return;
          }

          cropContext.clearRect(
            0,
            0,
            sourceWidth,
            sourceHeight
          );
          cropContext.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            sourceWidth,
            sourceHeight
          );

          const cropped = crop.toDataURL("image/png");
          mascotTrimSources.set(source, cropped);
          resolve(cropped);
        } catch (_) {
          fallback();
        }
      };

      image.src = source;
    });

    mascotTrimPromises.set(source, promise);
    promise.finally(function () {
      mascotTrimPromises.delete(source);
    });

    return promise;
  }

  /* =======================================================
     PRIMEIRO ÁUDIO — GATE DE ENTRADA APÓS A INTRO

     O Lesson Engine agenda o autoplay do enunciado muito cedo.
     O index bloqueia a fala apenas no primeiro handoff. Enquanto o
     atributo data-duduq-initial-speech-gate="locked" existir no
     documento principal, guardamos a última fala solicitada e a
     liberamos assim que a tela terminar de abrir.
     ======================================================= */

  function installInitialSpeechGate(doc) {
    if (
      !doc?.defaultView ||
      initialSpeechGateDocuments.has(doc)
    ) {
      return;
    }

    const view = doc.defaultView;
    const synth = view.speechSynthesis;

    if (
      !synth ||
      typeof synth.speak !== "function" ||
      typeof synth.cancel !== "function"
    ) {
      initialSpeechGateDocuments.add(doc);
      return;
    }

    const originalSpeak = synth.speak.bind(synth);
    const originalCancel = synth.cancel.bind(synth);
    let pendingUtterance = null;
    let releaseTimer = null;

    function gateIsLocked() {
      try {
        const hostDocument =
          getStableFullscreenDocument(doc);

        return (
          hostDocument?.documentElement?.getAttribute(
            "data-duduq-initial-speech-gate"
          ) === "locked"
        );
      } catch (_) {
        return false;
      }
    }

    function clearReleaseTimer() {
      if (releaseTimer !== null) {
        view.clearTimeout(releaseTimer);
        releaseTimer = null;
      }
    }

    function releaseWhenReady() {
      clearReleaseTimer();

      if (!pendingUtterance) return;

      if (gateIsLocked()) {

        releaseTimer = view.setTimeout(
          releaseWhenReady,
          36
        );
        return;
      }

      const utterance = pendingUtterance;
      pendingUtterance = null;

      try {
        originalSpeak(utterance);
      } catch (_) {}
    }

    const guardedSpeak = function (utterance) {
      if (gateIsLocked()) {
        pendingUtterance = utterance || null;
        releaseWhenReady();
        return;
      }

      return originalSpeak(utterance);
    };

    const guardedCancel = function () {
      pendingUtterance = null;
      clearReleaseTimer();
      return originalCancel();
    };

    try {
      synth.speak = guardedSpeak;
      synth.cancel = guardedCancel;
    } catch (_) {
      try {
        Object.defineProperty(synth, "speak", {
          configurable: true,
          value: guardedSpeak
        });
        Object.defineProperty(synth, "cancel", {
          configurable: true,
          value: guardedCancel
        });
      } catch (_) {}
    }

    initialSpeechGateDocuments.add(doc);
  }


  /* =======================================================
     PRÓXIMA MISSÃO — PONTE ENTRE MECÂNICAS DO HOST

     Questão -> questão já possui StepTransition no runtime.
     Mecânica -> mecânica usa o DuduQTransition do Host, que não
     possuía o cartão central. Escutamos os eventos oficiais do Host
     e adicionamos o cartão somente quando existe uma próxima etapa.
     ======================================================= */

  let missionBridgeElement = null;
  let missionBridgePending = null;
  let missionBridgeShownAt = 0;
  let missionBridgeHideTimer = null;
  let missionBridgeInstalled = false;

  function ensureMissionBridge() {
    if (missionBridgeElement?.isConnected) {
      return missionBridgeElement;
    }

    const bridge = document.createElement("div");
    bridge.className = "duduq-world-mission-bridge";
    bridge.setAttribute("role", "status");
    bridge.setAttribute("aria-live", "polite");
    bridge.setAttribute("aria-atomic", "true");

    const mascot =
      window.DUDUQ_ASSETS?.mascots?.transition ||
      window.DUDUQ_ASSETS?.mascots?.idle ||
      window.DuduQAssets?.assets?.mascots?.transition ||
      window.DuduQAssets?.assets?.mascots?.idle ||
      "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/DUDUQ_IDLE.png";

    bridge.innerHTML = [
      '<section class="duduq-world-mission-card">',
      '  <div class="duduq-world-mission-mascot-frame" aria-hidden="true">',
      '    <img class="duduq-world-mission-mascot" alt="" draggable="false" data-cropped="pending">',
      '  </div>',
      '  <span class="duduq-world-mission-kicker">PRÓXIMA MISSÃO</span>',
      '  <strong class="duduq-world-mission-copy">Preparando a próxima etapa…</strong>',
      '  <div class="duduq-world-mission-track" aria-hidden="true">',
      '    <span class="duduq-world-mission-fill"></span>',
      '    <span class="duduq-world-mission-star">★</span>',
      '  </div>',
      '</section>'
    ].join("");

    const mascotImage = bridge.querySelector(
      ".duduq-world-mission-mascot"
    );

    if (mascotImage) {
      mascotImage.setAttribute("src", mascot);
      mascotImage.setAttribute("data-cropped", "false");

      trimTransparentMascotSource(mascot).then(
        function (cropped) {
          if (!mascotImage.isConnected) return;
          mascotImage.setAttribute("src", cropped || mascot);
          mascotImage.setAttribute(
            "data-cropped",
            cropped && cropped !== mascot ? "true" : "false"
          );
        }

      );
    }

    (document.body || document.documentElement)
      .appendChild(bridge);

    missionBridgeElement = bridge;
    return bridge;
  }

  function clearMissionBridgeTimer() {
    if (missionBridgeHideTimer !== null) {
      window.clearTimeout(missionBridgeHideTimer);
      missionBridgeHideTimer = null;
    }
  }

  function showMissionBridge(meta) {
    if (!meta) return;

    const bridge = ensureMissionBridge();
    const copy = bridge.querySelector(
      ".duduq-world-mission-copy"
    );

    if (copy) {
      copy.textContent =
        `Preparando a etapa ${meta.nextStep} de ${meta.totalSteps}…`;
    }

    clearMissionBridgeTimer();
    bridge.classList.remove("is-visible");

    /* Reinicia a animação da barra mesmo em trocas consecutivas. */
    void bridge.offsetWidth;

    missionBridgeShownAt = performance.now();
    bridge.classList.add("is-visible");
  }

  function hideMissionBridge(options = {}) {
    if (!missionBridgeElement) return;

    clearMissionBridgeTimer();

    const immediate = options.immediate === true;
    const minimumVisibleMs = 1050;
    const elapsed =
      performance.now() - missionBridgeShownAt;
    const delay = immediate
      ? 0
      : Math.max(0, minimumVisibleMs - elapsed);

    missionBridgeHideTimer = window.setTimeout(
      function () {
        missionBridgeElement?.classList.remove(
          "is-visible"
        );
        missionBridgeHideTimer = null;
      },
      delay
    );
  }

  function installMissionBridge() {
    if (missionBridgeInstalled) return;
    missionBridgeInstalled = true;

    const missionMascotSource =
      window.DUDUQ_ASSETS?.mascots?.transition ||
      window.DUDUQ_ASSETS?.mascots?.idle ||
      window.DuduQAssets?.assets?.mascots?.transition ||
      window.DuduQAssets?.assets?.mascots?.idle ||
      "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/DUDUQ_IDLE.png";

    /* Prepara o recorte antes da primeira troca de mecânica. */
    trimTransparentMascotSource(missionMascotSource).catch(
      function () {}
    );

    window.addEventListener(
      "duduq:step-complete",
      function (event) {
        const detail = event.detail || {};
        const totalSteps = Number(
          detail.progress?.totalSteps
        );
        const currentIndex = Number(detail.stepIndex);
        const nextStep = currentIndex + 2;

        missionBridgePending =
          Number.isFinite(totalSteps) &&
          Number.isFinite(currentIndex) &&
          nextStep <= totalSteps
            ? { nextStep, totalSteps }
            : null;
      }
    );

    window.addEventListener(
      "duduq:transition-cover-start",
      function () {
        if (missionBridgePending) {
          showMissionBridge(missionBridgePending);
        }
      }
    );

    window.addEventListener(
      "duduq:transition-complete",
      function () {
        if (missionBridgePending) {
          hideMissionBridge();
          missionBridgePending = null;
        }

      }
    );

    window.addEventListener(
      "duduq:module-complete",
      function () {
        missionBridgePending = null;
        hideMissionBridge({ immediate: true });
      }
    );

    window.addEventListener(
      "duduq:module-restart",
      function () {
        missionBridgePending = null;
        hideMissionBridge({ immediate: true });
      }
    );
  }


  /* =======================================================
     ÁUDIO — ESTADO VISUAL UNIVERSAL

     Algumas mecânicas já possuíam estado visual próprio e outras
     apenas reproduziam o som. A partir da 1.4.4, o World Fusion
     observa tanto speechSynthesis quanto HTMLMediaElement e marca
     somente o controle associado à reprodução atual.

     Contrato visual (CSS):
       data-duduq-audio-playing="true"
         -> verde + ondas
       fim / pause / erro / cancel
         -> atributo removido e aparência azul nativa restaurada
     ======================================================= */

  const UNIVERSAL_AUDIO_CONTROL_SELECTOR = [
    'button[class*="audio" i]',
    '[role="button"][class*="audio" i]',
    'button[class*="sound" i]',
    '[role="button"][class*="sound" i]',
    'button[class*="speaker" i]',
    '[role="button"][class*="speaker" i]',
    'button[aria-label*="áudio" i]',
    'button[aria-label*="audio" i]',
    'button[aria-label*="ouvir" i]',
    'button[aria-label*="escutar" i]',
    'button[aria-label*="som" i]',
    '[role="button"][aria-label*="áudio" i]',
    '[role="button"][aria-label*="audio" i]',
    '[role="button"][aria-label*="ouvir" i]',
    '[role="button"][aria-label*="escutar" i]',
    '[role="button"][aria-label*="som" i]',
    '[data-audio]',
    '[data-sound]'
  ].join(",");

  const UNIVERSAL_INSTRUCTION_SELECTOR = [
    ".duduq-dd-instruction",
    ".duduq-udd-instruction",
    ".duduq-bp-instruction",
    ".duduq-mq-instruction",
    ".duduq-matching-instruction",
    ".duduq-fc-instruction",
    ".duduq-cf-instruction",
    ".duduq-ws-instruction",
    ".duduq-ts-instruction",
    ".duduq-ss-instruction"
  ].join(",");

  function ensureAudioWaveDecoration(control) {
    if (!control?.querySelector) return;

    if (
      control.querySelector(
        ":scope > .duduq-world-audio-waves"
      )
    ) {
      return;
    }

    const waves = control.ownerDocument.createElement("span");
    waves.className = "duduq-world-audio-waves";
    waves.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 3; index += 1) {
      waves.appendChild(
        control.ownerDocument.createElement("span")
      );
    }

    control.appendChild(waves);
  }

  function setAudioControlPlaying(control, playing) {
    if (!control?.setAttribute) return;

    if (playing) {
      ensureAudioWaveDecoration(control);
      control.setAttribute(
        "data-duduq-audio-playing",
        "true"
      );
      return;
    }

    control.removeAttribute(
      "data-duduq-audio-playing"
    );
  }

  function clearAudioPlayingState(doc, except = null) {
    if (!doc?.querySelectorAll) return;

    doc

      .querySelectorAll(
        '[data-duduq-audio-playing="true"]'
      )
      .forEach(function (control) {
        if (control !== except) {
          setAudioControlPlaying(control, false);
        }
      });
  }

  function isLikelyAudioControl(element) {
    if (!element?.matches) return false;

    try {
      return element.matches(
        UNIVERSAL_AUDIO_CONTROL_SELECTOR
      );
    } catch (_) {
      return false;
    }
  }

  function resolveAudioTriggerFromEventTarget(target) {
    const element =
      target?.nodeType === 1
        ? target
        : target?.parentElement;

    if (!element?.closest) return null;

    const memoryAudioCard =
      element.closest(
        ".duduq-mq-card"
      );

    if (
      memoryAudioCard &&
      memoryAudioCard.querySelector(
        ".duduq-mq-audio-main, .duduq-mq-sound-badge"
      )
    ) {
      return memoryAudioCard;
    }

    const direct =
      element.closest(
        UNIVERSAL_AUDIO_CONTROL_SELECTOR
      );

    if (direct) return direct;

    /*
     * Drag & Drop permite reproduzir áudio tocando no card inteiro,
     * não apenas no pequeno ícone. Registramos também o próprio card
     * para que um áudio de opção nunca faça o botão do ENUNCIADO
     * parecer ativo por engano.
     */
    const multimodalDragDropCard =
      element.closest(
        [
          '.duduq-dd-item[data-has-audio="true"]',
          '.duduq-udd-item[data-has-audio="true"]',
          '.duduq-dd-target[data-has-audio="true"]',
          '.duduq-udd-target[data-has-audio="true"]'
        ].join(",")
      );

    if (multimodalDragDropCard) {
      return multimodalDragDropCard;
    }

    const clickable =
      element.closest(
        'button, [role="button"]'
      );

    if (
      clickable &&
      clickable.closest(
        UNIVERSAL_INSTRUCTION_SELECTOR
      )
    ) {
      return clickable;
    }

    return null;
  }

  function findPrimaryInstructionAudioControl(doc) {
    const instruction =
      doc?.querySelector?.(
        UNIVERSAL_INSTRUCTION_SELECTOR
      );

    if (!instruction) return null;

    const explicit =
      instruction.querySelector(
        UNIVERSAL_AUDIO_CONTROL_SELECTOR
      );

    if (explicit) return explicit;

    /*
     * Nos cards de enunciado existe um único CTA circular. Mesmo
     * quando a classe interna muda entre runtimes, ele continua
     * sendo o único button/role=button dentro do instruction.
     */
    const controls = Array.from(
      instruction.querySelectorAll(
        'button, [role="button"]'
      )
    );

    /*

     * Não descartamos o CTA apenas porque ele ficou disabled durante
     * a reprodução. Drag & Drop (e outros runtimes) desabilitam o
     * próprio botão enquanto o autoplay está falando; ele continua
     * sendo o controle visual correto e deve ficar verde nesse período.
     */
    return controls.length === 1
      ? controls[0]
      : controls.find(isLikelyAudioControl) || null;
  }

  function installUniversalAudioVisualState(doc) {
    if (
      !doc?.defaultView ||
      audioVisualStateDocuments.has(doc)
    ) {
      return;
    }

    audioVisualStateDocuments.add(doc);

    const view = doc.defaultView;
    let lastTrigger = null;
    let lastTriggerAt = 0;
    let activeControl = null;

    function rememberTrigger(event) {
      const trigger =
        resolveAudioTriggerFromEventTarget(
          event.target
        );

      if (!trigger) return;

      lastTrigger = trigger;
      lastTriggerAt =
        view.performance?.now?.() ||
        Date.now();
    }

    function chooseControl() {
      const now =
        view.performance?.now?.() ||
        Date.now();

      const recent =
        lastTrigger?.isConnected &&
        now - lastTriggerAt <= 1800
          ? lastTrigger
          : null;

      return (
        recent ||
        findPrimaryInstructionAudioControl(doc)
      );
    }

    function resolveVisualControl(control) {
      if (!control?.matches) return control;

      if (
        control.matches(
          ".duduq-mq-card"
        )
      ) {
        return (
          control.querySelector(
            ".duduq-mq-audio-main, .duduq-mq-sound-badge"
          ) ||
          control
        );
      }

      return control;
    }

    function begin(control) {
      const logicalControl =
        control || chooseControl();
      const next =
        resolveVisualControl(
          logicalControl
        );

      if (!next) return;

      clearAudioPlayingState(doc, next);

      if (
        activeControl &&
        activeControl !== next
      ) {
        setAudioControlPlaying(
          activeControl,
          false
        );
      }

      activeControl = next;
      setAudioControlPlaying(next, true);
    }

    function finish(control = null) {
      const target =
        control
          ? resolveVisualControl(control)
          : activeControl;

      if (target) {
        setAudioControlPlaying(target, false);
      }

      if (
        !control ||
        target === activeControl
      ) {

        activeControl = null;
      }
    }

    doc.addEventListener(
      "pointerdown",
      rememberTrigger,
      true
    );

    doc.addEventListener(
      "click",
      rememberTrigger,
      true
    );

    /* SPEECH SYNTHESIS ----------------------------------- */
    const synth = view.speechSynthesis;

    if (
      synth &&
      typeof synth.speak === "function"
    ) {
      const previousSpeak =
        synth.speak.bind(synth);
      const previousCancel =
        typeof synth.cancel === "function"
          ? synth.cancel.bind(synth)
          : null;

      const visualSpeak = function (utterance) {
        const control = chooseControl();

        if (
          control?.matches?.(
            ".duduq-mq-card"
          )
        ) {
          const spoken =
            String(
              utterance?.text || ""
            ).trim();

          if (spoken) {
            control.dataset.duduqMqSpoken =
              spoken;
            control.dataset.duduqMqLocale =
              String(
                utterance?.lang ||
                "en-US"
              );
          }
        }

        let settled = false;

        function startVisual() {
          if (settled) return;
          begin(control);
        }

        function stopVisual() {
          if (settled) return;
          settled = true;
          finish(control);
        }

        try {
          utterance?.addEventListener?.(
            "start",
            startVisual,
            { once: true }
          );
          utterance?.addEventListener?.(
            "end",
            stopVisual,
            { once: true }
          );
          utterance?.addEventListener?.(
            "error",
            stopVisual,
            { once: true }
          );
        } catch (_) {}

        const result = previousSpeak(utterance);

        /*
         * Safari/WebKit nem sempre dispara start de modo uniforme.
         * Se a síntese já estiver efetivamente falando no paint
         * seguinte, iniciamos o estado sem antecipar o primeiro áudio.
         */
        view.requestAnimationFrame(function () {
          if (
            !settled &&
            synth.speaking
          ) {
            startVisual();
          }
        });

        return result;
      };

      try {
        synth.speak = visualSpeak;
      } catch (_) {
        try {
          Object.defineProperty(
            synth,
            "speak",
            {
              configurable: true,
              value: visualSpeak
            }

          );
        } catch (_) {}
      }

      if (previousCancel) {
        const visualCancel = function () {
          finish();
          clearAudioPlayingState(doc);
          return previousCancel();
        };

        try {
          synth.cancel = visualCancel;
        } catch (_) {
          try {
            Object.defineProperty(
              synth,
              "cancel",
              {
                configurable: true,
                value: visualCancel
              }
            );
          } catch (_) {}
        }
      }
    }

    /* =====================================================
       DRAG & DROP — FALLBACK DE ESTADO VISUAL DO ENUNCIADO

       Alguns browsers mantêm speechSynthesis como objeto nativo
       não substituível. Nesses casos o áudio toca normalmente,
       porém a interceptação de speak() pode não receber o evento.

       Esta camada NÃO dispara áudio. Ela apenas observa:
       - speechSynthesis.speaking;
       - aria-label/data-playing/disabled do CTA de enunciado;
       - o último controle de áudio realmente acionado.

       Resultado:
       autoplay do Drag & Drop -> verde + ondas -> azul ao terminar,
       mesmo quando o navegador impede monkey-patch de speechSynthesis.
       ===================================================== */

    function isDragDropInstructionControl(control) {
      return Boolean(
        control?.closest?.(
          ".duduq-dd-instruction, .duduq-udd-instruction"
        )
      );
    }

    function hasRecentNonInstructionAudioTrigger() {
      const now =
        view.performance?.now?.() ||
        Date.now();

      if (
        !lastTrigger?.isConnected ||
        now - lastTriggerAt > 1900
      ) {
        return false;
      }

      return !isDragDropInstructionControl(
        lastTrigger
      );
    }

    function nativeInstructionStateSaysPlaying(control) {
      if (!control) return false;

      const aria =
        String(
          control.getAttribute?.(
            "aria-label"
          ) || ""
        )
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

      const dataPlaying =
        String(
          control.getAttribute?.(
            "data-playing"
          ) || ""
        ).toLowerCase() === "true";

      /*
       * Os runtimes Drag & Drop desabilitam o CTA enquanto
       * audio.isPlaying=true. O aria-label também muda para
       * "Instruction is playing" / "A instrução está sendo reproduzida".
       */
      const semanticPlaying =
        /instruction is playing|instrucao esta sendo reproduzida|reproduzindo|ouvindo|playing/.test(
          aria
        );

      return (
        dataPlaying ||
        semanticPlaying ||
        (
          control.disabled === true &&
          Boolean(
            synth?.speaking
          )
        )
      );
    }

    function syncDragDropInstructionAudioState() {
      const control =
        findPrimaryInstructionAudioControl(

          doc
        );

      if (
        !control ||
        !isDragDropInstructionControl(
          control
        )
      ) {
        return;
      }

      const speechPlaying =
        Boolean(
          synth?.speaking
        );

      const nativePlaying =
        nativeInstructionStateSaysPlaying(
          control
        );

      const otherAudioWasChosen =
        hasRecentNonInstructionAudioTrigger();

      if (
        (speechPlaying || nativePlaying) &&
        !otherAudioWasChosen
      ) {
        begin(control);
        return;
      }

      if (
        activeControl ===
          resolveVisualControl(control) &&
        !speechPlaying &&
        !nativePlaying
      ) {
        finish(control);
      }
    }

    /*
     * Poll curto e barato. O estado speechSynthesis.speaking não
     * emite evento DOM universal, portanto MutationObserver sozinho
     * não cobre Chrome/Edge/Safari de forma homogênea.
     */
    const dragDropSpeechStateTimer =
      view.setInterval(
        syncDragDropInstructionAudioState,
        80
      );

    const instructionStateObserver =
      typeof view.MutationObserver === "function"
        ? new view.MutationObserver(
            syncDragDropInstructionAudioState
          )
        : null;

    const dragDropInstruction =
      doc.querySelector(
        ".duduq-dd-instruction, .duduq-udd-instruction"
      );

    if (
      instructionStateObserver &&
      dragDropInstruction
    ) {
      instructionStateObserver.observe(
        dragDropInstruction,
        {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: [
            "disabled",
            "aria-label",
            "data-playing",
            "data-highlight"
          ]
        }
      );
    }

    const stopDragDropSpeechStateMonitor =
      function () {
        try {
          view.clearInterval(
            dragDropSpeechStateTimer
          );
        } catch (_) {}

        try {
          instructionStateObserver?.disconnect?.();
        } catch (_) {}
      };

    view.addEventListener?.(
      "pagehide",
      stopDragDropSpeechStateMonitor,
      { once: true }
    );

    syncDragDropInstructionAudioState();

    /* HTML AUDIO / MEDIA -------------------------------- */
    const mediaControls = new WeakMap();

    doc.addEventListener(
      "play",
      function (event) {
        const media = event.target;

        if (
          !(
            media instanceof
            view.HTMLMediaElement
          )
        ) {
          return;
        }

        const control = chooseControl();

        if (
          control?.matches?.(
            ".duduq-mq-card"
          )
        ) {
          const source =
            String(
              media.currentSrc ||
              media.src ||
              ""
            ).trim();

          if (source) {
            control.dataset.duduqMqMedia =
              source;
          }
        }

        mediaControls.set(media, control || null);
        begin(control);
      },
      true
    );

    [
      "pause",
      "ended",
      "error",
      "emptied",
      "abort"
    ].forEach(function (eventName) {
      doc.addEventListener(
        eventName,
        function (event) {
          const media = event.target;

          if (
            !(
              media instanceof
              view.HTMLMediaElement
            )
          ) {
            return;
          }

          const control =
            mediaControls.get(media) ||
            null;

          finish(control);
          mediaControls.delete(media);
        },
        true
      );
    });

    /* Segurança: quando a aba perde contexto, nenhum botão fica verde. */
    doc.addEventListener(
      "visibilitychange",
      function () {
        if (doc.hidden) {
          finish();
          clearAudioPlayingState(doc);
        }
      }
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
    syncTargetShooterCentering(doc);
    syncHeaderMascotFallback(doc);

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


  /* =======================================================
     MEMORY QUEST — CONSOLIDAÇÃO PEDAGÓGICA

     Regras universais:
     - cada par correto recebe a mesma identidade cromática;
     - pares diferentes recebem identidades diferentes;
     - a cor só aparece DEPOIS do acerto, nunca vira pista prévia;
     - cartas de áudio já acertadas podem ser ouvidas novamente;
     - a repetição sonora não altera contagem, estado nem avaliação.
     ======================================================= */

  function installMemoryQuestPedagogy(doc) {
    if (
      !doc?.defaultView ||
      memoryQuestPedagogyDocuments.has(doc)
    ) {
      return;
    }

    memoryQuestPedagogyDocuments.add(doc);

    const view = doc.defaultView;
    let pairTone = 0;
    let refreshQueued = false;
    let pendingMatchedCard = null;

    function queueRefresh() {
      if (refreshQueued) return;

      refreshQueued = true;

      view.requestAnimationFrame(function () {
        refreshQueued = false;
        decorate();
      });
    }

    function makeReplayable(card) {
      if (
        !card?.matches?.(
          '.duduq-mq-card[data-matched="true"]'
        )
      ) {
        return;
      }

      const hasAudioVisual =
        Boolean(
          card.querySelector(
            ".duduq-mq-audio-main, .duduq-mq-sound-badge"
          )
        );

      const hasReplaySource =
        Boolean(
          String(
            card.dataset.duduqMqSpoken || ""
          ).trim() ||
          String(
            card.dataset.duduqMqMedia || ""
          ).trim()
        );

      if (
        !hasAudioVisual ||
        !hasReplaySource
      ) {
        return;
      }

      card.dataset.duduqMqReplayable =
        "true";

      /*
       * O runtime desabilita todo par concluído. Para a carta sonora
       * removemos o disabled SOMENTE para permitir a revisão auditiva.
       * O clique é capturado abaixo e não volta à lógica de jogo.
       */
      if (card.disabled) {
        card.disabled = false;
      }

      card.setAttribute(
        "aria-disabled",
        "false"
      );

      card.style.pointerEvents =
        "auto";

      if (
        !card.hasAttribute(
          "tabindex"
        )
      ) {
        card.tabIndex = 0;
      }

      const currentLabel =
        String(
          card.getAttribute(
            "aria-label"
          ) || ""
        );

      if (
        !/ouvir novamente/i.test(
          currentLabel
        )
      ) {
        card.setAttribute(
          "aria-label",
          (
            currentLabel +
            " Toque para ouvir novamente."

          ).trim()
        );
      }
    }

    function decorate() {
      const freshMatched =
        Array.from(
          doc.querySelectorAll(
            '.duduq-mq-card[data-matched="true"]:not([data-duduq-mq-pair-tone])'
          )
        );

      /*
       * O Memory Quest conclui exatamente duas cartas por acerto.
       * Normalmente o React publica as duas no mesmo commit. Ainda assim,
       * guardamos uma carta pendente para suportar commits fracionados sem
       * deixar um par correto sem identidade cromática.
       */
      const queue = [];

      if (
        pendingMatchedCard?.isConnected &&
        pendingMatchedCard.matches(
          '.duduq-mq-card[data-matched="true"]:not([data-duduq-mq-pair-tone])'
        )
      ) {
        queue.push(
          pendingMatchedCard
        );
      }

      pendingMatchedCard = null;

      freshMatched.forEach(function (card) {
        if (!queue.includes(card)) {
          queue.push(card);
        }
      });

      for (
        let index = 0;
        index + 1 < queue.length;
        index += 2
      ) {
        pairTone =
          (pairTone % 6) + 1;

        const tone =
          String(pairTone);

        queue[index].setAttribute(
          "data-duduq-mq-pair-tone",
          tone
        );

        queue[index + 1].setAttribute(
          "data-duduq-mq-pair-tone",
          tone
        );
      }

      if (queue.length % 2 === 1) {
        pendingMatchedCard =
          queue[queue.length - 1];
      }

      doc
        .querySelectorAll(
          '.duduq-mq-card[data-matched="true"]'
        )
        .forEach(
          makeReplayable
        );
    }

    function replayMatchedAudio(event) {
      const target =
        event.target?.nodeType === 1
          ? event.target
          : event.target?.parentElement;

      const card =
        target?.closest?.(
          '.duduq-mq-card[data-matched="true"][data-duduq-mq-replayable="true"]'
        );

      if (!card) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const mediaSource =
        String(
          card.dataset.duduqMqMedia || ""
        ).trim();

      const spoken =
        String(
          card.dataset.duduqMqSpoken || ""
        ).trim();

      if (mediaSource) {
        const visual =
          card.querySelector(
            ".duduq-mq-audio-main, .duduq-mq-sound-badge"
          );

        try {
          clearAudioPlayingState(
            doc,
            visual
          );
          setAudioControlPlaying(

            visual,
            true
          );

          const media =
            new view.Audio(
              mediaSource
            );

          const settle = function () {
            setAudioControlPlaying(
              visual,
              false
            );
          };

          media.addEventListener(
            "ended",
            settle,
            { once: true }
          );
          media.addEventListener(
            "error",
            settle,
            { once: true }
          );
          media.addEventListener(
            "abort",
            settle,
            { once: true }
          );

          const playback =
            media.play();

          playback?.catch?.(
            settle
          );
        } catch (_) {
          setAudioControlPlaying(
            visual,
            false
          );
        }

        return;
      }

      if (
        !spoken ||
        !view.speechSynthesis ||
        typeof view.SpeechSynthesisUtterance ===
          "undefined"
      ) {
        return;
      }

      try {
        view.speechSynthesis.cancel();

        const utterance =
          new view.SpeechSynthesisUtterance(
            spoken
          );

        utterance.lang =
          String(
            card.dataset.duduqMqLocale ||
            "en-US"
          );

        utterance.rate = .92;
        utterance.pitch = 1;

        view.speechSynthesis.speak(
          utterance
        );
      } catch (_) {}
    }

    doc.addEventListener(
      "click",
      replayMatchedAudio,
      true
    );

    const observer =
      new view.MutationObserver(
        queueRefresh
      );

    const root =
      doc.body ||
      doc.documentElement;

    if (root) {
      observer.observe(
        root,
        {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: [
            "data-matched",
            "disabled",
            "aria-label",
            "data-duduq-mq-media",
            "data-duduq-mq-spoken"
          ]
        }
      );
    }

    decorate();
  }



  /* =======================================================
     DRAG & DROP — ÁUDIO NO DROP

     Se o item possui áudio, concluir um arraste até uma zona
     válida também reproduz o estímulo. O clique é feito no
     próprio controle nativo do runtime, portanto Content Audio
     continua escolhendo MP3 oficial e TTS apenas como fallback.
     ======================================================= */

  function installDragDropDropAudio(doc) {
    if (
      !doc?.defaultView ||
      dragDropDropAudioDocuments.has(doc)
    ) {
      return;
    }

    dragDropDropAudioDocuments.add(doc);

    const view = doc.defaultView;
    let dragState = null;

    function findItem(target) {
      return target?.closest?.(
        ".duduq-udd-item, .duduq-dd-item"
      ) || null;
    }

    function itemId(item) {
      return String(
        item?.dataset?.ddItemId ||
        item?.dataset?.itemId ||
        ""
      ).trim();
    }

    function containingTarget(item) {
      return (
        item
          ?.closest?.(
            "[data-dd-target-id]"
          )
          ?.getAttribute?.(
            "data-dd-target-id"
          ) ||
        ""
      );
    }

    function begin(event) {
      if (
        event.button !== undefined &&
        event.button !== 0
      ) {
        return;
      }

      const item = findItem(
        event.target
      );

      if (!item) return;

      const id = itemId(item);

      if (!id) return;

      dragState = {
        id,
        x: Number(event.clientX) || 0,
        y: Number(event.clientY) || 0,
        initialTarget:
          containingTarget(item)
      };
    }

    function finish(event) {
      const state = dragState;
      dragState = null;

      if (!state) return;

      const dx =
        (Number(event.clientX) || 0) -
        state.x;

      const dy =
        (Number(event.clientY) || 0) -
        state.y;

      if (
        Math.hypot(dx, dy) < 7
      ) {
        return;
      }

      view.setTimeout(
        function () {
          const escaped =
            typeof CSS !== "undefined" &&
            CSS.escape
              ? CSS.escape(state.id)
              : state.id.replace(
                  /["\\]/g,
                  "\\$&"
                );

          const item =
            doc.querySelector(
              `[data-dd-item-id="${escaped}"],` +
              `[data-item-id="${escaped}"]`
            );

          if (!item) return;

          const finalTarget =
            containingTarget(item);

          if (
            !finalTarget ||
            finalTarget ===
              state.initialTarget
          ) {
            return;
          }

          const shell =
            item.closest(
              ".duduq-udd-item-shell, .duduq-dd-item-shell"
            ) ||
            item.parentElement;

          const audioControl =
            shell?.querySelector?.(
              ".duduq-udd-item-audio, .duduq-dd-item-audio"
            );

          if (
            !audioControl ||
            audioControl.disabled
          ) {
            return;
          }

          try {
            audioControl.click();
          } catch (_) {}
        },
        90
      );
    }

    doc.addEventListener(
      "pointerdown",
      begin,
      true
    );

    doc.addEventListener(
      "pointerup",
      finish,
      true
    );

    doc.addEventListener(
      "pointercancel",
      function () {
        dragState = null;
      },
      true
    );
  }


  /* =======================================================
     FEEDBACK DE VOZ — PADRÃO UNIVERSAL

     Mantém os SFX existentes e acrescenta uma voz breve,
     simpática e consistente em todas as mecânicas:
       success -> feedback_correto.mp3
       retry   -> Ops_feedback_erro.mp3

     A voz dispara somente na transição de estado, evitando
     repetição causada por re-render ou MutationObserver.
     ======================================================= */

  function installFeedbackVoice(doc) {
    if (
      !doc?.defaultView ||
      feedbackVoiceDocuments.has(doc)
    ) {
      return;
    }

    feedbackVoiceDocuments.add(doc);

    const view = doc.defaultView;
    let lastState = "";
    let lastFeedback = null;

    function topView() {
      let current = view;

      try {
        while (
          current.parent &&
          current.parent !== current
        ) {
          current = current.parent;
        }
      } catch (_) {}

      return current || view;
    }

    function sourceFor(state) {
      const rootView = topView();

      const sounds =
        rootView.DuduQAssets
          ?.assets
          ?.sounds ||
        rootView.DUDUQ_ASSETS
          ?.sounds ||
        {};

      if (state === "success") {
        return (

          sounds[
            "feedback-correct-voice"
          ] ||
          "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/feedback_correto.mp3"
        );
      }

      return (
        sounds[
          "feedback-error-voice"
        ] ||
        "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Ops_feedback_erro.mp3"
      );
    }

    function playVoice(state) {
      const rootView = topView();

      const now =
        rootView.performance
          ?.now?.() ||
        Date.now();

      const previous =
        rootView.__DUDUQ_FEEDBACK_VOICE_LAST ||
        {
          state: "",
          at: 0
        };

      if (
        previous.state === state &&
        now - previous.at < 420
      ) {
        return;
      }

      rootView.__DUDUQ_FEEDBACK_VOICE_LAST = {
        state,
        at: now
      };

      try {
        rootView
          .__DUDUQ_FEEDBACK_VOICE_AUDIO
          ?.pause?.();
      } catch (_) {}

      try {
        const audio =
          new rootView.Audio(
            sourceFor(state)
          );

        audio.preload = "auto";
        audio.volume = 0.82;

        rootView
          .__DUDUQ_FEEDBACK_VOICE_AUDIO =
          audio;

        audio.play()
          ?.catch?.(
            function () {}
          );
      } catch (_) {}
    }

    function sync() {
      const feedback =
        doc.querySelector(
          ".duduq-engine-feedback[data-state]"
        );

      if (!feedback) {
        lastFeedback = null;
        lastState = "";
        return;
      }

      const state =
        String(
          feedback.dataset.state || ""
        ).toLowerCase();

      const changedElement =
        feedback !== lastFeedback;

      const changedState =
        state !== lastState;

      if (
        (
          changedElement ||
          changedState
        ) &&
        (
          state === "success" ||
          state === "retry"
        )
      ) {
        playVoice(state);
      }

      lastFeedback = feedback;
      lastState = state;
    }

    const observer =
      new view.MutationObserver(
        sync
      );

    const root =
      doc.body ||

      doc.documentElement;

    if (root) {
      observer.observe(
        root,
        {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: [
            "data-state"
          ]
        }
      );
    }

    sync();
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
    installFeedbackScrollGuard(doc);
    installInitialSpeechGate(doc);
    installUniversalAudioVisualState(doc);
    installMemoryQuestPedagogy(doc);
    installDragDropDropAudio(doc);
    installFeedbackVoice(doc);
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
    installMissionBridge();
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

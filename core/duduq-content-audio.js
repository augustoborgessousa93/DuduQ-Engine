   DUDUQ CORE — CONTENT AUDIO
   MP3 editorial como fonte prioritária + TTS como fallback.
   Versão 1.0.2

   CONTRATO
   - Cada módulo pode expor moduleDefinition.audioCatalog.
   - O catálogo é organizado por ID de questão.
   - Cada entrada informa mechanic, instruction e stimuli.
   - Os runtimes continuam chamando seus controladores de fala.
   - Esta camada substitui somente a etapa final de reprodução:
       MP3 oficial -> prioridade
       Speech Synthesis -> fallback
   - Não altera gabarito, mecânica, layout ou progressão.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.0.2";

  if (
    window.DuduQContentAudio &&
    window.DuduQContentAudio.version === VERSION
  ) {
    return;
  }

  const nativeFetch =
    typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : null;

  const RUNTIMES = Object.freeze({
    "duduq_target_shooter.html": "target-shooter",
    "duduq_matching.html": "matching",
    "duduq_drag_drop.html": "drag-drop",
    "duduq_memory_quest.html": "memory-quest",
    "duduq_smart_sentence.html": "smart-sentence"
  });

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function asString(value, fallback = "") {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    const text = String(value).trim();
    return text || fallback;
  }

  function getRequestUrl(input) {
    try {
      if (typeof input === "string") {
        return new URL(input, window.location.href);
      }

      if (input instanceof URL) {
        return input;
      }

      if (input?.url) {
        return new URL(input.url, window.location.href);
      }
    } catch (_) {}

    return null;
  }

  function runtimeMechanic(url) {
    const pathname =
      asString(url?.pathname)
        .split("/")
        .pop()
        ?.toLowerCase() || "";

    return RUNTIMES[pathname] || null;
  }

  function collectModuleAudioCatalogs() {
    const result = [];
    const visited = new WeakSet();

    function visit(value) {
      if (!isObject(value)) return;
      if (visited.has(value)) return;
      visited.add(value);

      if (
        isObject(value.audioCatalog) &&
        Array.isArray(value.activities)
      ) {
        Object.entries(value.audioCatalog)
          .forEach(
            function ([questionId, entry]) {
              if (!isObject(entry)) return;

              const instruction =
                isObject(entry.instruction)
                  ? entry.instruction
                  : {};

              const stimuli =
                Array.isArray(entry.stimuli)
                  ? entry.stimuli
                  : [];

              result.push({
                id: asString(questionId),
                mechanic: asString(entry.mechanic),
                moduleId: asString(value.id),
                moduleVersion: asString(value.version),
                instruction: {
                  text: asString(instruction.text),
                  language: asString(
                    instruction.language,
                    "pt-BR"
                  ),
                  src: asString(instruction.src)
                },
                stimuli: stimuli
                  .filter(isObject)
                  .map(
                    function (item) {
                      return {
                        text: asString(item.text),
                        language: asString(
                          item.language,
                          "en-US"
                        ),
                        src: asString(item.src)
                      };
                    }
                  )
                  .filter(
                    function (item) {
                      return item.text && item.src;
                    }
                  )
              });
            }
          );

      }

      Object.values(value)
        .forEach(visit);
    }

    visit(window.DUDUQ_CONTENT || {});

    return result.filter(
      function (entry) {
        return (
          entry.id &&
          entry.mechanic &&
          (
            entry.instruction.src ||
            entry.stimuli.length > 0
          )
        );
      }
    );
  }

  function runtimeInstaller(payload) {
    "use strict";

    const VERSION = "1.0.2";

    if (
      window.DuduQOfficialAudioRuntime &&
      window.DuduQOfficialAudioRuntime.version === VERSION
    ) {
      return;
    }

    const mechanic =
      String(payload?.mechanic || "").trim();

    const catalog =
      Array.isArray(payload?.catalog)
        ? payload.catalog.filter(
            function (entry) {
              return (
                entry &&
                entry.mechanic === mechanic
              );
            }
          )
        : [];

    const synth =
      window.speechSynthesis ||
      null;

    const nativeSpeak =
      synth &&
      typeof synth.speak === "function"
        ? synth.speak.bind(synth)
        : null;

    const nativeCancel =
      synth &&
      typeof synth.cancel === "function"
        ? synth.cancel.bind(synth)
        : null;

    let currentAudio = null;
    let currentToken = 0;
    let activeQuestionId = "";
    let pendingUtterance = null;
    let gateListenerInstalled = false;

    const introducedTargets =
      new Set();

    function normalize(value) {
      return String(value ?? "")

        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’‘`´]/g, "'")
        .replace(/[.!?]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    function stopMedia() {
      currentToken += 1;

      const audio = currentAudio;
      currentAudio = null;

      if (!audio) return;

      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {}
    }

    function nativeFallback(utterance) {
      stopMedia();

      if (!nativeSpeak || !utterance) {
        try {
          utterance?.onerror?.({
            type: "error",
            error: "audio-unavailable",
            utterance
          });
        } catch (_) {}

        return;
      }

      try {
        nativeSpeak(utterance);
      } catch (_) {
        try {
          utterance?.onerror?.({
            type: "error",
            error: "speech-unavailable",
            utterance
          });
        } catch (_) {}
      }
    }

    function emitStart(utterance) {
      try {
        utterance?.onstart?.({
          type: "start",
          utterance
        });
      } catch (_) {}
    }

    function emitEnd(utterance) {
      try {
        utterance?.onend?.({
          type: "end",
          utterance
        });
      } catch (_) {}
    }

    function playSingleSource(src, token) {
      return new Promise(
        function (resolve, reject) {
          if (!src || token !== currentToken) {
            reject(new Error("audio-cancelled"));
            return;
          }


          const audio =
            new Audio(src);

          currentAudio = audio;
          audio.preload = "auto";
          audio.volume = 1;

          let settled = false;

          function cleanup() {
            audio.removeEventListener(
              "ended",
              handleEnded
            );

            audio.removeEventListener(
              "error",
              handleError
            );
          }

          function finish(ok) {
            if (settled) return;
            settled = true;
            cleanup();

            if (currentAudio === audio) {
              currentAudio = null;
            }

            if (ok) resolve(true);
            else reject(new Error("audio-load-failed"));
          }

          function handleEnded() {
            finish(true);
          }

          function handleError() {
            finish(false);
          }

          audio.addEventListener(
            "ended",
            handleEnded,
            { once: true }
          );

          audio.addEventListener(
            "error",
            handleError,
            { once: true }
          );

          try {
            const operation =
              audio.play();

            if (
              operation &&
              typeof operation.catch === "function"
            ) {
              operation.catch(
                function () {
                  finish(false);
                }
              );
            }
          } catch (_) {
            finish(false);
          }
        }
      );
    }

    function wait(milliseconds, token) {
      return new Promise(
        function (resolve) {
          window.setTimeout(
            function () {
              resolve(token === currentToken);
            },
            Math.max(0, Number(milliseconds) || 0)
          );
        }
      );
    }

    async function playSequence(
      sources,
      utterance,
      options = {}
    ) {
      const list =
        sources.filter(Boolean);

      if (!list.length) {
        nativeFallback(utterance);
        return;
      }

      stopMedia();
      const token = currentToken;
      emitStart(utterance);

      let playedAnything = false;

      for (
        let index = 0;
        index < list.length;
        index += 1
      ) {
        if (token !== currentToken) {
          return;
        }

        try {
          await playSingleSource(
            list[index],
            token
          );

          playedAnything = true;
        } catch (_) {
          /*
           * A orientação PT-BR do Target pode falhar sem
           * impedir o estímulo principal de ser tentado.
           */
          if (
            options.allowPreludeFailure &&
            index < list.length - 1
          ) {
            continue;
          }

          nativeFallback(utterance);
          return;
        }

        if (
          index < list.length - 1 &&
          token === currentToken
        ) {
          await wait(
            options.gapMs ?? 180,
            token
          );
        }
      }

      if (

        token === currentToken &&
        playedAnything
      ) {
        emitEnd(utterance);
      }
    }

    function findInstruction(text) {
      const normalized = normalize(text);
      if (!normalized) return null;

      return catalog.find(
        function (entry) {
          return (
            normalize(
              entry?.instruction?.text
            ) === normalized &&
            entry?.instruction?.src
          );
        }
      ) || null;
    }

    function findStimulus(text) {
      const normalized = normalize(text);
      if (!normalized) return null;

      const active =
        catalog.find(
          function (entry) {
            return entry.id === activeQuestionId;
          }
        );

      if (active) {
        const item =
          active.stimuli?.find(
            function (stimulus) {
              return normalize(stimulus.text) === normalized;
            }
          );

        if (item?.src) {
          return {
            question: active,
            stimulus: item
          };
        }
      }

      const candidates = [];

      catalog.forEach(
        function (entry) {
          entry.stimuli?.forEach(
            function (stimulus) {
              if (
                stimulus?.src &&
                normalize(stimulus.text) === normalized
              ) {
                candidates.push({
                  question: entry,
                  stimulus
                });
              }
            }
          );
        }
      );

      if (!candidates.length) return null;

      /*
       * No Target Shooter o próprio estímulo identifica a
       * questão. Nas demais mecânicas o autoplay do enunciado
       * normalmente já definiu activeQuestionId.

       */
      return candidates[0];
    }

    function gateLocked() {
      try {
        return (
          window.parent &&
          window.parent !== window &&
          window.parent.document
            ?.documentElement
            ?.getAttribute(
              "data-duduq-initial-speech-gate"
            ) === "locked"
        );
      } catch (_) {
        return false;
      }
    }

    function installGateListener() {
      if (gateListenerInstalled) return;
      gateListenerInstalled = true;

      let parentWindow = null;

      try {
        parentWindow =
          window.parent !== window
            ? window.parent
            : null;
      } catch (_) {}

      if (!parentWindow) {
        gateListenerInstalled = false;
        return;
      }

      const release =
        function () {
          gateListenerInstalled = false;

          try {
            parentWindow.removeEventListener(
              "duduq:initial-speech-release",
              release
            );
          } catch (_) {}

          const utterance =
            pendingUtterance;

          pendingUtterance = null;

          if (utterance) {
            handleUtterance(
              utterance,
              true
            );
          }
        };

      try {
        parentWindow.addEventListener(
          "duduq:initial-speech-release",
          release,
          { once: true }
        );
      } catch (_) {
        gateListenerInstalled = false;
        return;
      }

      /* Segurança em ambientes onde o evento externo falhe. */
      window.setTimeout(
        function () {

          if (
            gateListenerInstalled &&
            pendingUtterance
          ) {
            release();
          }
        },
        4200
      );
    }

    function handleUtterance(
      utterance,
      bypassGate = false
    ) {
      if (!utterance) return;

      if (
        !bypassGate &&
        gateLocked()
      ) {
        pendingUtterance = utterance;
        installGateListener();
        return;
      }

      const text =
        String(
          utterance.text || ""
        );

      const instruction =
        findInstruction(text);

      if (instruction) {
        activeQuestionId =
          instruction.id;

        playSequence(
          [instruction.instruction.src],
          utterance
        );

        return;
      }

      const resolved =
        findStimulus(text);

      if (!resolved?.stimulus?.src) {
        nativeFallback(utterance);
        return;
      }

      activeQuestionId =
        resolved.question.id;

      if (
        mechanic === "target-shooter"
      ) {
        const firstPresentation =
          !introducedTargets.has(
            resolved.question.id
          );

        introducedTargets.add(
          resolved.question.id
        );

        const sequence = [];

        if (
          firstPresentation &&
          resolved.question
            ?.instruction
            ?.src

        ) {
          sequence.push(
            resolved.question
              .instruction
              .src
          );
        }

        sequence.push(
          resolved.stimulus.src
        );

        playSequence(
          sequence,
          utterance,
          {
            allowPreludeFailure:
              firstPresentation,
            gapMs: 220
          }
        );

        return;
      }

      playSequence(
        [resolved.stimulus.src],
        utterance
      );
    }

    function cancel() {
      pendingUtterance = null;
      stopMedia();

      try {
        nativeCancel?.();
      } catch (_) {}
    }

    const api = {
      version: VERSION,
      mechanic,
      handleUtterance,
      cancel,
      getActiveQuestionId:
        function () {
          return activeQuestionId || null;
        }
    };

    window.DuduQOfficialAudioRuntime =
      Object.freeze(api);

    /*
     * O patch nativo cobre chamadas externas ao bundle, como
     * o pronunciador de opções do Smart Sentence. Os bundles
     * principais também são reescritos pelo Core para chamar
     * handleUtterance diretamente, oferecendo redundância.
     */
    if (synth) {
      const wrappedSpeak =
        function (utterance) {
          handleUtterance(utterance);
        };

      const wrappedCancel =
        function () {
          cancel();
        };

      try {
        Object.defineProperty(
          synth,
          "speak",
          {

            configurable: true,
            writable: true,
            value: wrappedSpeak
          }
        );
      } catch (_) {
        try {
          synth.speak = wrappedSpeak;
        } catch (_) {}
      }

      try {
        Object.defineProperty(
          synth,
          "cancel",
          {
            configurable: true,
            writable: true,
            value: wrappedCancel
          }
        );
      } catch (_) {
        try {
          synth.cancel = wrappedCancel;
        } catch (_) {}
      }

      /*
       * Fallback adicional para navegadores que não permitem
       * sombrear os métodos diretamente na instância nativa.
       * O prototype pertence somente ao documento do runtime.
       */
      try {
        if (synth.speak !== wrappedSpeak) {
          const prototype =
            Object.getPrototypeOf(synth);

          if (prototype) {
            Object.defineProperty(
              prototype,
              "speak",
              {
                configurable: true,
                writable: true,
                value: wrappedSpeak
              }
            );
          }
        }
      } catch (_) {}

      try {
        if (synth.cancel !== wrappedCancel) {
          const prototype =
            Object.getPrototypeOf(synth);

          if (prototype) {
            Object.defineProperty(
              prototype,
              "cancel",
              {
                configurable: true,
                writable: true,
                value: wrappedCancel
              }
            );
          }
        }
      } catch (_) {}
    }

    window.addEventListener(
      "pagehide",
      cancel,
      { once: true }
    );

  }

  /* =======================================================
     IFRAMES DIRETOS

     Algumas mecânicas, como o Drag & Drop, carregam o runtime
     diretamente em iframe.src em vez de passar pelo fetch()
     do documento principal. Nesses casos instalamos a mesma
     ponte de MP3 dentro do iframe antes do schema externo ser
     enviado para a mecânica.
     ======================================================= */

  const preparedFrames = new WeakMap();

  function findFrameBySource(sourceWindow) {
    if (!sourceWindow) return null;

    return Array.from(
      document.querySelectorAll("iframe")
    ).find(
      function (iframe) {
        try {
          return iframe.contentWindow === sourceWindow;
        } catch (_) {
          return false;
        }
      }
    ) || null;
  }

  function frameMechanic(iframe, hint = "") {
    const explicit = asString(hint);
    if (explicit) return explicit;

    try {
      return runtimeMechanic(
        getRequestUrl(iframe?.src)
      );
    } catch (_) {
      return null;
    }
  }

  function makeRuntimeBootstrap(mechanic, catalog) {
    const safePayload =
      JSON.stringify({
        mechanic,
        catalog
      })
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");

    return (
      `(${runtimeInstaller.toString()})(${safePayload});`
    );
  }

  function installIntoFrame(iframe, mechanicHint = "") {
    if (!iframe) return false;

    const mechanic =
      frameMechanic(
        iframe,
        mechanicHint
      );

    if (!mechanic) return false;

    const catalog =
      collectModuleAudioCatalogs();

    if (
      !catalog.some(
        function (entry) {
          return entry.mechanic === mechanic;

        }
      )
    ) {
      return false;
    }

    let frameWindow = null;
    let frameDocument = null;

    try {
      frameWindow = iframe.contentWindow;
      frameDocument = iframe.contentDocument;
    } catch (_) {
      return false;
    }

    if (!frameWindow || !frameDocument) {
      return false;
    }

    try {
      const current =
        frameWindow.DuduQOfficialAudioRuntime;

      if (
        current?.version === VERSION &&
        current?.mechanic === mechanic
      ) {
        preparedFrames.set(
          iframe,
          mechanic
        );
        return true;
      }
    } catch (_) {}

    const previous =
      preparedFrames.get(iframe);

    if (previous === mechanic) {
      try {
        return Boolean(
          frameWindow.DuduQOfficialAudioRuntime
        );
      } catch (_) {
        return false;
      }
    }

    try {
      const existing =
        frameDocument.getElementById(
          "duduq-official-content-audio-runtime"
        );

      existing?.remove?.();

      const script =
        frameDocument.createElement("script");

      script.id =
        "duduq-official-content-audio-runtime";

      script.textContent =
        makeRuntimeBootstrap(
          mechanic,
          catalog
        );

      (
        frameDocument.head ||
        frameDocument.documentElement ||
        frameDocument.body
      )?.appendChild(script);

      /* O código já foi executado; removemos apenas a tag. */

      script.remove();

      const installed =
        Boolean(
          frameWindow.DuduQOfficialAudioRuntime
        );

      if (installed) {
        preparedFrames.set(
          iframe,
          mechanic
        );
      }

      return installed;
    } catch (error) {
      console.warn(
        "[DuduQ Content Audio] Não foi possível instalar MP3 oficial no iframe direto; o runtime seguirá com TTS.",
        error
      );

      return false;
    }
  }

  /*
   * O Drag & Drop anuncia duduq:mechanic:ready antes de receber
   * o schema. O listener de captura do Core é registrado antes
   * dos adaptadores e instala a ponte de áudio sincronamente,
   * garantindo que enunciado e estímulos já usem MP3 quando o
   * adaptador responder ao mesmo evento com o conteúdo.
   */
  window.addEventListener(
    "message",
    function (event) {
      const data = event.data;

      if (
        !data ||
        typeof data !== "object" ||
        data.type !== "duduq:mechanic:ready"
      ) {
        return;
      }

      const iframe =
        findFrameBySource(event.source);

      if (!iframe) return;

      installIntoFrame(
        iframe,
        asString(data.mechanicId)
      );
    },
    true
  );

  /* Fallback para iframes diretos que não emitam ready. */
  function watchDirectFrame(iframe) {
    if (!iframe || iframe.dataset.duduqContentAudioWatch === "1") {
      return;
    }

    iframe.dataset.duduqContentAudioWatch = "1";

    iframe.addEventListener(
      "load",
      function () {
        const mechanic =
          frameMechanic(iframe);

        if (!mechanic) return;

        installIntoFrame(
          iframe,

          mechanic
        );
      },
      true
    );
  }

  const frameObserver =
    new MutationObserver(
      function (mutations) {
        mutations.forEach(
          function (mutation) {
            mutation.addedNodes.forEach(
              function (node) {
                if (!(node instanceof Element)) {
                  return;
                }

                if (node.tagName === "IFRAME") {
                  watchDirectFrame(node);
                }

                node.querySelectorAll?.("iframe")
                  ?.forEach(watchDirectFrame);
              }
            );
          }
        );
      }
    );

  if (document.documentElement) {
    frameObserver.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );
  }

  document.querySelectorAll("iframe")
    .forEach(watchDirectFrame);

  function patchSpeechCalls(html) {
    let result = html;

    result = result.replace(
      /window\.speechSynthesis\.speak\(utterance\);/g,
      "window.DuduQOfficialAudioRuntime.handleUtterance(utterance);"
    );

    result = result.replace(
      /speechSynthesis\.speak\(u\);/g,
      "window.DuduQOfficialAudioRuntime.handleUtterance(u);"
    );

    result = result.replace(
      /window\.speechSynthesis\.cancel\(\);/g,
      "window.DuduQOfficialAudioRuntime.cancel();"
    );

    result = result.replace(
      /speechSynthesis\.cancel\(\);/g,
      "window.DuduQOfficialAudioRuntime.cancel();"
    );

    return result;
  }

  function injectRuntimeHelper(
    html,
    mechanic,
    catalog
  ) {
    const safePayload =

      JSON.stringify({
        mechanic,
        catalog
      })
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");

    const bootstrap =
      `<script id="duduq-official-content-audio-runtime">(${runtimeInstaller.toString()})(${safePayload});<\/script>`;

    if (/<body[^>]*>/i.test(html)) {
      return html.replace(
        /<body([^>]*)>/i,
        function (match) {
          return match + "\n" + bootstrap;
        }
      );
    }

    return bootstrap + "\n" + html;
  }

  function patchRuntimeHTML(
    html,
    mechanic,
    catalog
  ) {
    const relevant =
      catalog.filter(
        function (entry) {
          return entry.mechanic === mechanic;
        }
      );

    if (!relevant.length) {
      return html;
    }

    return injectRuntimeHelper(
      patchSpeechCalls(html),
      mechanic,
      relevant
    );
  }

  async function patchedFetch(input, init) {
    const response =
      await nativeFetch(input, init);

    try {
      const url =
        getRequestUrl(input) ||
        getRequestUrl(response.url);

      const mechanic =
        runtimeMechanic(url);

      if (
        !mechanic ||
        !response.ok ||
        response.bodyUsed
      ) {
        return response;
      }

      const catalog =
        collectModuleAudioCatalogs();

      if (
        !catalog.some(
          function (entry) {
            return entry.mechanic === mechanic;
          }
        )
      ) {

        return response;
      }

      const original =
        await response.clone().text();

      const patched =
        patchRuntimeHTML(
          original,
          mechanic,
          catalog
        );

      const headers =
        new Headers(response.headers);

      headers.delete("content-length");
      headers.delete("content-encoding");

      return new Response(
        patched,
        {
          status: response.status,
          statusText: response.statusText,
          headers
        }
      );
    } catch (error) {
      console.warn(
        "[DuduQ Content Audio] Não foi possível preparar o MP3 oficial; o runtime seguirá com TTS.",
        error
      );

      return response;
    }
  }

  if (nativeFetch) {
    window.fetch = patchedFetch;
  }

  window.DuduQContentAudio =
    Object.freeze({
      version: VERSION,
      collectCatalog:
        collectModuleAudioCatalogs,
      patchRuntimeHTML,
      installFrame:
        installIntoFrame
    });

})();

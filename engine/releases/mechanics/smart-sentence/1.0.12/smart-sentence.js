/* =========================================================
   DUDUQ MECHANIC — SMART SENTENCE
   Adaptador do Smart Sentence 1.0.1 para o Host DuduQ.
   Versão 1.0.1

   PERFIL PARA 1º ANO
   - uma única lacuna;
   - somente duas opções;
   - imagem de contexto;
   - toque nas opções também pronuncia a palavra em inglês.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Smart Sentence] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "smart-sentence";
  const VERSION = "1.0.12";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) {
      return String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "");
    }
    return ".";
  }

  function extractQuestions(payload) {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];
    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.items)) return payload.items;
    return [payload];
  }

  function normalizeQuestion(raw, index) {
    if (window.DuduQSchema?.normalizeQuestion) {
      return window.DuduQSchema.normalizeQuestion(raw, index, {});
    }
    return raw;
  }

  function normalizeSentenceConfig(question) {
    const config = question?.metadata?.smartSentence;

    if (!isObject(config)) {
      throw new Error(
        `[DuduQ Smart Sentence] Questão ${question?.id || "sem-id"} não possui metadata.smartSentence.`
      );
    }

    if (!asString(config.answer)) {
      throw new Error(
        `[DuduQ Smart Sentence] Questão ${question.id}: answer é obrigatório.`
      );
    }

    if (
      !Array.isArray(config.options) ||
      config.options.length < 2
    ) {
      throw new Error(
        `[DuduQ Smart Sentence] Questão ${question.id}: informe ao menos duas opções.`
      );
    }

    return config;
  }

  function stageFromQuestion(question, index) {
    const config = normalizeSentenceConfig(question);
    const gapId = `gap-${index + 1}`;

    const segments = [];

    if (config.imageKey) {
      segments.push({
        type: "image",
        assetKey: config.imageKey,
        src: asString(config.imageSrc),
        alt: asString(
          config.imageAlt,
          "Imagem de apoio para a frase."
        )
      });
    }

    segments.push(
      {
        type: "text",
        text: asString(config.prefix, "I'M A")
      },
      {
        type: "gap",
        id: gapId
      },
      {
        type: "text",
        text: asString(config.suffix, ".")
      }
    );

    return {
      id: asString(question.id, `sentence-stage-${index + 1}`),
      mode: config.imageKey ? "complete-image" : "complete",
      instruction: asString(
        config.instruction ||
        question.instruction,
        "Observe e complete a frase."
      ),
      instructionSpoken: asString(
        config.instructionSpoken ||
        question?.media?.audio?.text ||
        question?.audio?.text ||
        question.instruction
      ),
      segments,
      gaps: [
        {
          id: gapId,
          answer: asString(config.answer),
          alternatives: [asString(config.answer)],
          options: config.options.map(String),
          validation: {
            caseSensitive: false,
            punctuationSensitive: false,
            trimSpaces: true,
            collapseSpaces: true
          }
        }
      ],
      interaction: {
        type: "tap",
        allowRemove: true,
        shuffleOptions: config.shuffleOptions !== false
      },
      feedback: {
        success: asString(
          question.feedback?.correct,
          "Muito bem!"
        ),
        retry: asString(
          question.feedback?.incorrect,
          "Observe a imagem e tente novamente."
        )
      }
    };
  }

  function collectMedia(questions) {
    const media = {};

    questions.forEach((question) => {
      const config = normalizeSentenceConfig(question);

      if (
        config.imageKey &&
        asString(config.imageSrc)
      ) {
        media[config.imageKey] =
          asString(config.imageSrc);
      }
    });

    return media;
  }

  function buildRuntimeConfig(payload, questions) {
    return {
      schemaVersion: 1,
      id: `${asString(payload?.id, "smart-sentence")}-runtime`,
      version: VERSION,
      title: asString(payload?.title, "I'm a..."),
      language: "en-US",
      uiLanguage: "pt-BR",
      autoAdvanceAfterCorrectMs: 1150,
      retryFeedbackDurationMs: 850,
      inactivityAttentionMs: 9000,
      progress: {
        show: true,
        continuous: true
      },
      stages: questions.map(stageFromQuestion)
    };
  }

  function replaceConfig(html, config) {
    const startTag =
      '<script type="application/json" id="duduq-smart-sentence-config">';
    const start = html.indexOf(startTag);

    if (start < 0) {
      throw new Error(
        "[DuduQ Smart Sentence] JSON de configuração não encontrado."
      );
    }

    const contentStart =
      start + startTag.length;
    const end =
      html.indexOf("</script>", contentStart);

    if (end < 0) {
      throw new Error(
        "[DuduQ Smart Sentence] Fechamento do JSON não encontrado."
      );
    }

    const json =
      JSON.stringify(config, null, 2)
        .replace(/</g, "\\u003c");

    return (
      html.slice(0, contentStart) +
      "\n" +
      json +
      "\n  " +
      html.slice(end)
    );
  }

  function injectMedia(html, media) {
    const entries = Object.entries(media);
    if (!entries.length) return html;

    const assetsStart =
      html.indexOf("const Assets = {");

    if (assetsStart < 0) {
      throw new Error(
        "[DuduQ Smart Sentence] Objeto Assets não encontrado."
      );
    }

    const mediaStart =
      html.indexOf("media: {", assetsStart);

    if (mediaStart < 0) {
      throw new Error(
        "[DuduQ Smart Sentence] Assets.media não encontrado."
      );
    }

    const mediaEnd =
      html.indexOf("\n    }\n  };", mediaStart);

    if (mediaEnd < 0) {
      throw new Error(
        "[DuduQ Smart Sentence] Final de Assets.media não encontrado."
      );
    }

    const addition =
      entries
        .map(
          ([key, value]) =>
            `,\n      ${JSON.stringify(key)}: ${JSON.stringify(value)}`
        )
        .join("");

    return (
      html.slice(0, mediaEnd) +
      addition +
      html.slice(mediaEnd)
    );
  }

  function stampYear(html, year) {
    if (year == null) return html;

    return html.replace(
      /<html([^>]*)>/i,
      function (_, attrs) {
        return (
          `<html${attrs} data-duduq-ano="${String(year)}"` +
          ` data-duduq-ano-ativo="${String(year)}">`
        );
      }
    );
  }

  function syncGlobalChrome(doc, context, title) {
    if (!doc?.documentElement) return;

    if (context?.year != null) {
      doc.documentElement.setAttribute(
        "data-duduq-ano-ativo",
        String(context.year)
      );
      doc.documentElement.setAttribute(
        "data-duduq-ano",
        String(context.year)
      );
    }

    const heading = doc.querySelector(".duduq-engine-heading h1");
    if (heading && heading.textContent !== title) {
      heading.textContent = title;
    }

    const stepIndex = Number.isFinite(context?.stepIndex)
      ? context.stepIndex
      : 0;
    const totalSteps = Number.isFinite(context?.totalSteps)
      ? Math.max(1, context.totalSteps)
      : 1;
    const current = Math.min(stepIndex + 1, totalSteps);
    const label = `Etapa ${current} de ${totalSteps}`;

    const strong = doc.querySelector(".duduq-progress-copy strong");
    if (strong && strong.textContent !== label) {
      strong.textContent = label;
    }

    const trail = doc.querySelector(".duduq-progress-trail");
    if (trail) {
      const completedBefore = Math.max(
        0,
        Math.min(stepIndex, totalSteps)
      );
      trail.style.setProperty(
        "--lesson-progress",
        String(completedBefore / totalSteps)
      );
      trail.setAttribute("aria-valuemax", String(totalSteps));
      trail.setAttribute("aria-valuenow", String(completedBefore));
      trail.setAttribute(
        "aria-valuetext",
        `${completedBefore} de ${totalSteps} etapas concluídas`
      );
    }
  }

  function installChromeSync(doc, context, title) {
    syncGlobalChrome(doc, context, title);

    const observer = new MutationObserver(() => {
      syncGlobalChrome(doc, context, title);
    });

    if (doc.body) {
      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    return () => observer.disconnect();
  }

  function installOptionSpeech(doc) {
    function speak(value) {
      const text = asString(value);
      if (
        !text ||
        !doc.defaultView?.speechSynthesis ||
        !doc.defaultView?.SpeechSynthesisUtterance
      ) {
        return;
      }

      try {
        const synth = doc.defaultView.speechSynthesis;
        synth.cancel();

        const utterance =
          new doc.defaultView.SpeechSynthesisUtterance(text);

        utterance.lang = "en-US";
        utterance.rate = 0.86;
        utterance.pitch = 1.02;
        synth.speak(utterance);
      } catch (_) {}
    }

    function handlePointer(event) {
      const element =
        event.target instanceof doc.defaultView.Element
          ? event.target.closest(".duduq-ss-token")
          : null;

      if (!element || element.disabled) return;

      const word =
        element.dataset.word ||
        element.textContent;

      speak(word);
    }

    doc.addEventListener(
      "pointerdown",
      handlePointer,
      true
    );

    return () => {
      doc.removeEventListener(
        "pointerdown",
        handlePointer,
        true
      );
    };
  }

  function validate(payload) {
    const list = extractQuestions(payload);
    if (!list.length) return false;

    try {
      list
        .map(normalizeQuestion)
        .forEach(normalizeSentenceConfig);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function mount({
    container,
    payload,
    context = {},
    onComplete
  }) {
    if (!container) {
      throw new Error("[DuduQ Smart Sentence] Container não informado.");
    }

    const questions = extractQuestions(payload).map(normalizeQuestion);
    if (!questions.length) {
      throw new Error("[DuduQ Smart Sentence] Nenhuma questão recebida.");
    }

    questions.forEach(normalizeSentenceConfig);

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.minHeight = "0";
    wrapper.style.overflow = "hidden";
    wrapper.style.position = "relative";

    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Smart Sentence";
    iframe.setAttribute("allow", "autoplay; fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.minHeight = "0";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "transparent";

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    let destroyed = false;
    let completed = false;
    let stopChromeSync = null;
    let stopOptionSpeech = null;
    let answerHandler = null;
    let answerEvents = null;
    let completionTimer = null;
    let runtimePrepared = false;
    let runtimeConnected = false;

    const title = asString(payload?.title, "I'm a...");
    const lastStageId =
      asString(questions[questions.length - 1]?.id);

    function finish() {
      if (destroyed || completed) return;
      completed = true;

      if (typeof onComplete === "function") {
        onComplete({
          type: "complete",
          completed: true,
          mechanic: MECHANIC_ID
        });
      }
    }

    iframe.addEventListener("load", function () {
      // O iframe dispara um primeiro load para about:blank assim que é anexado.
      // Só conectamos quando o srcdoc real do Smart Sentence já foi preparado.
      if (destroyed || !runtimePrepared || runtimeConnected) return;

      try {
        const doc = iframe.contentDocument;
        const api =
          iframe.contentWindow?.DUDUQ_SMART_SENTENCE;

        if (!api?.Events) {
          throw new Error(
            "Runtime Smart Sentence não expôs DUDUQ_SMART_SENTENCE.Events."
          );
        }

        if (api.initError) {
          throw new Error(
            "Runtime Smart Sentence falhou ao iniciar: " +
            asString(api.initError)
          );
        }

        if (api.ready !== true) {
          throw new Error(
            "Runtime Smart Sentence carregou, mas não concluiu a inicialização."
          );
        }

        stopChromeSync = installChromeSync(
          doc,
          context,
          title
        );

        stopOptionSpeech =
          installOptionSpeech(doc);

        answerEvents = api.Events;

        answerHandler = function (event) {
          const result = event?.detail || {};

          if (
            result.isCorrect === true &&
            asString(result.stageId) === lastStageId
          ) {
            if (completionTimer !== null) {
              window.clearTimeout(completionTimer);
            }

            completionTimer = window.setTimeout(
              finish,
              920
            );
          }
        };

        answerEvents.addEventListener(
          "answer",
          answerHandler
        );

        runtimeConnected = true;
        syncGlobalChrome(doc, context, title);
      } catch (error) {
        console.error(
          "[DuduQ Smart Sentence] Falha ao conectar runtime:",
          error
        );

        const detail = asString(
          error?.message,
          "Erro desconhecido no runtime Smart Sentence."
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao iniciar a atividade Smart Sentence: " +
            detail;
        }
      }
    });

    const runtimeUrl =
      getEngineBase() +
      "/engine/releases/mechanics/smart-sentence/1.0.12/DUDUQ_SMART_SENTENCE.html?engineAdapter=" +
      encodeURIComponent(VERSION);

    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ao carregar Smart Sentence.`
          );
        }
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;

        const config =
          buildRuntimeConfig(payload, questions);

        /*
         * Release 1.0.1:
         * A imagem segue dentro do proprio segmento.
         * O preparo nao depende mais de recortar Assets.media
         * por espacamento ou indentacao do HTML.
         */
        let prepared =
          replaceConfig(html, config);

        prepared =
          stampYear(prepared, context.year);

        runtimePrepared = true;
        iframe.srcdoc = prepared;
      })
      .catch((error) => {
        console.error(
          "[DuduQ Smart Sentence] Falha ao preparar runtime:",
          error
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao preparar a atividade Smart Sentence: " +
            asString(error?.message, "falha desconhecida.");
        }
      });

    return function destroy() {
      destroyed = true;
      runtimePrepared = false;
      runtimeConnected = false;
      stopChromeSync?.();
      stopOptionSpeech?.();

      if (
        answerEvents &&
        answerHandler
      ) {
        answerEvents.removeEventListener(
          "answer",
          answerHandler
        );
      }

      if (completionTimer !== null) {
        window.clearTimeout(completionTimer);
      }

      iframe.remove();
      wrapper.remove();
    };
  }

  window.DuduQ.registerMechanic({
    id: MECHANIC_ID,
    version: VERSION,
    validate,
    mount,
    metadata: {
      name: "Smart Sentence",
      category: "completar-estrutura",
      active: true,
      acceptsSchema: "1.0.0",
      globalProgress: true,
      literacyFriendly: true,
      routerProfile: {
        name: "Smart Sentence",
        active: true,
        baseScore: 69,
        answerTypes: ["single"],
        answerTypeWeights: {
          single: 31
        },
        minAlternatives: 2,
        maxAlternatives: 5,
        supports: {
          questionImage: true,
          optionImageUrl: true,
          optionImageAssetKey: true,
          questionAudio: true,
          optionAudio: true
        },
        metadata: {
          category: "completar-estrutura",
          earlyLiteracy: true,
          recommendedMaxGapsEarlyYears: 1
        }
      }
    }
  });

  console.info("[DuduQ] Smart Sentence registrado:", VERSION);
})();

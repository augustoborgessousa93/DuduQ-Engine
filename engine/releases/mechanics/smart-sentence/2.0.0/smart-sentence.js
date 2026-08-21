/* =========================================================
   DUDUQ MECHANIC — SMART SENTENCE 2.0.0
   CLEAN REBUILD

   Escopo:
   - preserva metadata.smartSentence do conteúdo existente;
   - preserva integração com DuduQ Host;
   - runtime próprio, sem CSS/DOM legado da série 1.0.x;
   - não depende de Matching/Target Shooter em tempo de execução.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Smart Sentence 2] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "smart-sentence";
  const VERSION = "2.0.0";
  const ADAPTER_URL = document.currentScript?.src || "";

  function asString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function getEngineBase() {
    return window.DUDUQ_ENGINE_BASE
      ? String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "")
      : ".";
  }

  function resolveRuntimeUrl() {
    if (ADAPTER_URL) {
      try {
        return new URL("DUDUQ_SMART_SENTENCE.html", ADAPTER_URL).href;
      } catch (_) {}
    }

    return (
      getEngineBase() +
      "/engine/releases/mechanics/smart-sentence/" +
      VERSION +
      "/DUDUQ_SMART_SENTENCE.html"
    );
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

  function smartConfig(question) {
    const config = question?.metadata?.smartSentence;

    if (!isObject(config)) {
      throw new Error(
        `[DuduQ Smart Sentence 2] Questão ${question?.id || "sem-id"} não possui metadata.smartSentence.`
      );
    }

    if (!asString(config.answer)) {
      throw new Error(
        `[DuduQ Smart Sentence 2] Questão ${question?.id || "sem-id"}: answer é obrigatório.`
      );
    }

    if (!Array.isArray(config.options) || config.options.length < 2) {
      throw new Error(
        `[DuduQ Smart Sentence 2] Questão ${question?.id || "sem-id"}: informe ao menos duas opções.`
      );
    }

    return config;
  }

  function stageFromQuestion(question, index) {
    const config = smartConfig(question);

    return {
      id: asString(question.id, `smart-stage-${index + 1}`),
      instruction: asString(
        config.instruction || question.instruction,
        "Observe e complete a frase."
      ),
      instructionSpoken: asString(
        config.instructionSpoken ||
          question?.media?.audio?.text ||
          question?.audio?.text ||
          question.instruction
      ),
      prefix: asString(config.prefix, "I'M A"),
      suffix: asString(config.suffix, "."),
      answer: asString(config.answer),
      options: config.options.map(String),
      image: {
        key: asString(config.imageKey),
        src: asString(config.imageSrc),
        alt: asString(config.imageAlt, "Imagem de apoio para a frase.")
      },
      feedback: {
        success: asString(question.feedback?.correct, "Muito bem!"),
        retry: asString(
          question.feedback?.incorrect,
          "Observe a imagem e tente novamente."
        )
      },
      validation: {
        caseSensitive: false,
        punctuationSensitive: false,
        trimSpaces: true,
        collapseSpaces: true
      }
    };
  }

  function buildRuntimeConfig(payload, questions, context) {
    const stepIndex = Number.isFinite(context?.stepIndex)
      ? Math.max(0, context.stepIndex)
      : 0;

    const totalSteps = Number.isFinite(context?.totalSteps)
      ? Math.max(1, context.totalSteps)
      : Math.max(1, questions.length);

    return {
      schemaVersion: 2,
      mechanic: MECHANIC_ID,
      version: VERSION,
      id: `${asString(payload?.id, "smart-sentence")}-runtime`,
      title: asString(payload?.title, "I'm a..."),
      language: "en-US",
      uiLanguage: "pt-BR",
      hostedByDuduQ: true,
      year: context?.year ?? null,
      hostProgress: {
        stepIndex,
        totalSteps
      },
      autoAdvanceAfterCorrectMs: 5200,
      retryFeedbackDurationMs: 850,
      stages: questions.map(stageFromQuestion)
    };
  }

  function replaceConfig(html, config) {
    const marker = '<script type="application/json" id="duduq-smart-sentence-config">';
    const start = html.indexOf(marker);

    if (start < 0) {
      throw new Error("[DuduQ Smart Sentence 2] Marcador de configuração ausente no runtime.");
    }

    const contentStart = start + marker.length;
    const end = html.indexOf("</script>", contentStart);

    if (end < 0) {
      throw new Error("[DuduQ Smart Sentence 2] Fechamento da configuração ausente no runtime.");
    }

    const safeJson = JSON.stringify(config, null, 2).replace(/</g, "\\u003c");

    return (
      html.slice(0, contentStart) +
      "\n" +
      safeJson +
      "\n" +
      html.slice(end)
    );
  }

  function validate(payload) {
    const questions = extractQuestions(payload);
    if (!questions.length) return false;

    try {
      questions.map(normalizeQuestion).forEach(smartConfig);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function mount({ container, payload, context = {}, onComplete }) {
    if (!container) {
      throw new Error("[DuduQ Smart Sentence 2] Container não informado.");
    }

    const questions = extractQuestions(payload).map(normalizeQuestion);

    if (!questions.length) {
      throw new Error("[DuduQ Smart Sentence 2] Nenhuma questão recebida.");
    }

    questions.forEach(smartConfig);

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    Object.assign(wrapper.style, {
      width: "100%",
      height: "100%",
      minHeight: "0",
      overflow: "hidden",
      position: "relative"
    });

    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Smart Sentence";
    iframe.setAttribute("allow", "autoplay; fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    Object.assign(iframe.style, {
      width: "100%",
      height: "100%",
      minHeight: "0",
      border: "0",
      display: "block",
      background: "transparent"
    });

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    let destroyed = false;
    let completed = false;
    let prepared = false;

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

    function onMessage(event) {
      if (destroyed || completed) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== "DUDUQ_SMART_SENTENCE_COMPLETE") return;
      finish();
    }

    window.addEventListener("message", onMessage);

    iframe.addEventListener("load", function () {
      if (destroyed || !prepared) return;

      try {
        const api = iframe.contentWindow?.DUDUQ_SMART_SENTENCE;

        if (!api || api.ready !== true) {
          throw new Error("Runtime Smart Sentence 2 não concluiu a inicialização.");
        }

        if (api.initError) {
          throw new Error(api.initError);
        }
      } catch (error) {
        console.error("[DuduQ Smart Sentence 2] Falha ao conectar runtime:", error);

        if (!destroyed) {
          container.textContent =
            "Erro ao iniciar a atividade Smart Sentence: " +
            asString(error?.message, "falha desconhecida.");
        }
      }
    });

    const runtimeUrl = resolveRuntimeUrl();

    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ao carregar Smart Sentence 2.`);
        }
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;

        const config = buildRuntimeConfig(payload, questions, context);
        const documentHtml = replaceConfig(html, config);

        prepared = true;
        iframe.srcdoc = documentHtml;
      })
      .catch((error) => {
        console.error("[DuduQ Smart Sentence 2] Falha ao preparar runtime:", error);

        if (!destroyed) {
          container.textContent =
            "Erro ao preparar a atividade Smart Sentence: " +
            asString(error?.message, "falha desconhecida.");
        }
      });

    return function destroy() {
      destroyed = true;
      prepared = false;
      window.removeEventListener("message", onMessage);

      try {
        iframe.contentWindow?.speechSynthesis?.cancel?.();
      } catch (_) {}

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
        answerTypeWeights: { single: 31 },
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

  console.info("[DuduQ] Smart Sentence CLEAN registrado:", VERSION);
})();

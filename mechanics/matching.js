
/* =========================================================
   DUDUQ MECHANIC — MATCHING
   Adaptador do Smart Matching 1.2.0 para o Host DuduQ.
   Versão 1.0.1

   OBJETIVO
   - Integrar Matching ao Host sem alterar o runtime HTML.
   - Suportar atividades com uma ou mais questões.
   - Preservar o progresso GLOBAL da atividade no cabeçalho.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Matching] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "matching";
  const VERSION = "1.0.1";
  const RUNTIME_VERSION = "1.2.0";

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

  function getAudioText(question) {
    return asString(
      question?.media?.audio?.text ||
      question?.audio?.text ||
      question?.instruction
    );
  }

  function activityTitle(payload, questions) {
    return asString(
      payload?.title ||
      questions?.[0]?.metadata?.activityTitle ||
      questions?.[0]?.metadata?.title ||
      questions?.[0]?.statement,
      "Matching"
    );
  }

  function normalizeMatchingConfig(question) {
    const config = question?.metadata?.matching;

    if (!isObject(config)) {
      throw new Error(
        `[DuduQ Matching] Questão ${question?.id || "sem-id"} não possui metadata.matching.`
      );
    }

    if (
      !Array.isArray(config.leftItems) ||
      !Array.isArray(config.rightItems) ||
      !Array.isArray(config.pairs)
    ) {
      throw new Error(
        `[DuduQ Matching] Questão ${question.id}: leftItems, rightItems e pairs são obrigatórios.`
      );
    }

    return config;
  }

  function normalizeInteractionMode(value) {
    const normalized = asString(value, "smart").toLowerCase();

    // O runtime Matching 1.2.0 aceita somente:
    // "click", "touch" ou "smart".
    // "tap" era usado no conteúdo editorial, mas não é um valor válido
    // para o runtime. Para manter compatibilidade com módulos já criados,
    // tratamos "tap" como "smart".
    if (normalized === "tap") return "smart";

    if (
      normalized === "click" ||
      normalized === "touch" ||
      normalized === "smart"
    ) {
      return normalized;
    }

    return "smart";
  }

  function contentFromQuestion(question, index) {
    const config = normalizeMatchingConfig(question);

    return {
      id: asString(question.id, `matching-question-${index + 1}`),
      version: "1.0.0",
      schemaVersion: 1,
      enabled: true,
      editorialStatus: "approved",
      title: asString(
        question.metadata?.screenTitle ||
        question.metadata?.title ||
        question.statement,
        "Matching"
      ),
      instruction: asString(
        question.instruction,
        "Relacione os itens correspondentes."
      ),
      audioText: getAudioText(question),
      difficulty:
        question.difficulty === "hard"
          ? 3
          : question.difficulty === "medium"
            ? 2
            : 1,
      cognitivePhase: "association",
      gradeRange: { minimum: 1, maximum: 5 },
      estimatedSeconds: Number(question.metadata?.estimatedSeconds) || 45,
      masterMechanic: "smart-matching",
      renderer: "matching",
      mechanicVersion: RUNTIME_VERSION,
      payload: {
        mode: asString(config.mode, "audio-image"),
        leftTitle: asString(config.leftTitle, "Ouça"),
        rightTitle: asString(config.rightTitle, "Relacione"),
        leftItems: config.leftItems,
        rightItems: config.rightItems,
        pairs: config.pairs,
        behavior: {
          ...config.behavior,
          shuffleLeft: config.behavior?.shuffleLeft !== false,
          shuffleRight: config.behavior?.shuffleRight !== false,
          connectionMode: asString(
            config.behavior?.connectionMode,
            "1x1"
          ),
          interactionMode: normalizeInteractionMode(
            config.behavior?.interactionMode
          ),
          lockCorrectPairsOnRetry:
            config.behavior?.lockCorrectPairsOnRetry !== false
        }
      },
      feedback: {
        success: asString(
          question.feedback?.correct,
          "Muito bem! As relações estão corretas."
        ),
        retry: asString(
          question.feedback?.incorrect,
          "Ouça e observe novamente."
        )
      }
    };
  }

  function mergeAssets(questions) {
    const assets = {};

    questions.forEach((question) => {
      const config = question?.metadata?.matching;
      if (isObject(config?.assets)) {
        Object.assign(assets, config.assets);
      }
    });

    return assets;
  }

  function createLesson(payload, contents) {
    const list = Object.values(contents);
    const title = activityTitle(payload, list);

    return {
      schemaVersion: 1,
      id: `${asString(payload?.id, "matching-activity")}-runtime`,
      version: VERSION,
      title,
      description: "Atividade Matching integrada ao DuduQ Host.",
      enabled: true,
      status: "approved",
      masterMechanic: "smart-matching",
      themeId: "whispering-woods",
      themeVersion: "1.0.0",
      language: {
        interfaceLocale: "pt-BR",
        learningLanguage: "en-US",
        speechLocale: "en-US"
      },
      learningObjectives: [],
      totalStages: list.length,
      steps: list.map((content, index) => ({
        id: `step-${content.id}`,
        order: index + 1,
        mechanicId: "matching",
        mechanicVersion: RUNTIME_VERSION,
        masterMechanic: "smart-matching",
        contentId: content.id,
        contentVersion: content.version,
        enabled: true,
        optional: false
      })),
      progressPolicy: {
        enabled: false,
        storage: "none",
        resumeMode: "restart",
        saveWhen: "step-completed",
        resetCompletedLesson: true
      },
      feedbackPolicy: {
        allowRetry: true,
        advanceAfterCorrectMs: 1100,
        retryFeedbackDurationMs: 900,
        showHintAfterErrors: 2,
        revealAnswerAfterErrors: 4,
        playSuccessSound: true,
        playRetrySound: true,
        celebrateLessonCompletion: false
      },
      navigationPolicy: {
        allowPreviousStep: false,
        allowStepSkipping: false,
        advanceMode: "automatic",
        showStepCounter: true
      },
      inactivityPolicy: {
        enabled: true,
        delayMs: 11000,
        action: "replay-instruction",
        maximumAutomaticReplays: 1
      }
    };
  }

  function syncGlobalChrome(doc, context, title) {
    if (!doc?.documentElement) return;

    const year = context?.year;
    if (year !== null && year !== undefined) {
      doc.documentElement.setAttribute(
        "data-duduq-ano-ativo",
        String(year)
      );
      doc.documentElement.setAttribute(
        "data-duduq-ano",
        String(year)
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
    const progressLabel = `Etapa ${current} de ${totalSteps}`;
    const progressStrong = doc.querySelector(
      ".duduq-progress-copy strong"
    );

    if (
      progressStrong &&
      progressStrong.textContent !== progressLabel
    ) {
      progressStrong.textContent = progressLabel;
    }

    const trail = doc.querySelector(".duduq-progress-trail");
    if (trail) {
      const completedBefore = Math.max(
        0,
        Math.min(stepIndex, totalSteps)
      );
      const ratio = completedBefore / totalSteps;

      trail.style.setProperty(
        "--lesson-progress",
        String(ratio)
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

  function replaceRuntimeRoot(doc) {
    const current = doc.getElementById("root");
    if (!current) {
      throw new Error("[DuduQ Matching] #root não encontrado no runtime.");
    }

    const fresh = doc.createElement("div");
    fresh.id = "root";
    current.replaceWith(fresh);

    const boot = doc.getElementById("duduq-boot");
    if (boot) boot.hidden = true;

    return fresh;
  }

  function suppressDefaultMount(html) {
    const pattern = /\(function mountDuduQMatching\(\) \{[\s\S]*?\}\)\(\);/;

    if (!pattern.test(html)) {
      throw new Error(
        "[DuduQ Matching] Inicialização automática do runtime não encontrada."
      );
    }

    return html.replace(
      pattern,
      "(function mountDuduQMatching(){ var boot=document.getElementById('duduq-boot'); if(boot) boot.hidden=true; })();"
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

  function validate(payload) {
    const list = extractQuestions(payload);
    if (!list.length) return false;

    try {
      list
        .map(normalizeQuestion)
        .forEach(normalizeMatchingConfig);
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
      throw new Error("[DuduQ Matching] Container não informado.");
    }

    const questions = extractQuestions(payload).map(normalizeQuestion);
    if (!questions.length) {
      throw new Error("[DuduQ Matching] Nenhuma questão recebida.");
    }

    questions.forEach(normalizeMatchingConfig);

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    wrapper.style.width = "100%";
    wrapper.style.minHeight = "100vh";
    wrapper.style.position = "relative";

    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Matching";
    iframe.setAttribute("allow", "autoplay; fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    iframe.style.width = "100%";
    iframe.style.height = "100vh";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "transparent";

    const params = new URLSearchParams();
    if (context.year != null) params.set("ano", String(context.year));
    if (context.moduleId) params.set("module", String(context.moduleId));
    params.set("engineAdapter", VERSION);

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    let destroyed = false;
    let reactRoot = null;
    let stopChromeSync = null;
    let completed = false;

    function finish(result = {}) {
      if (destroyed || completed) return;
      completed = true;

      if (typeof onComplete === "function") {
        onComplete({
          type: "complete",
          completed: true,
          mechanic: MECHANIC_ID,
          ...result
        });
      }
    }

    const handleLoad = function () {
      if (destroyed) return;

      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        const api = win?.DuduQMatching;
        const React = win?.React;
        const ReactDOM = win?.ReactDOM;

        if (
          !api?.DuduQLessonEnginePreviewHost ||
          !api?.MATCHING_RUNTIME_REGISTRY ||
          !React ||
          !ReactDOM
        ) {
          throw new Error(
            "Runtime Matching não expôs a API universal esperada."
          );
        }

        const contentList = questions.map(contentFromQuestion);
        const contents = Object.fromEntries(
          contentList.map((content) => [content.id, content])
        );
        const assets = mergeAssets(questions);
        const lesson = createLesson(payload, contents);
        const root = replaceRuntimeRoot(doc);
        const title = activityTitle(payload, questions);

        stopChromeSync = installChromeSync(
          doc,
          context,
          title
        );

        const mascotAssets = {
          idle: win.DUDUQ_ASSETS?.mascots?.idle || "",
          success: win.DUDUQ_ASSETS?.mascots?.correct || "",
          retry: win.DUDUQ_ASSETS?.mascots?.error || "",
          transition: win.DUDUQ_ASSETS?.mascots?.transition || "",
          complete: win.DUDUQ_ASSETS?.mascots?.complete || ""
        };

        const app = React.createElement(
          api.DuduQLessonEnginePreviewHost,
          {
            lesson,
            contents,
            mechanics: api.MATCHING_RUNTIME_REGISTRY,
            assets,
            mascotAssets,
            autoPlayInstruction: true,
            onLessonComplete: () => finish(),
            onStepChange: () =>
              syncGlobalChrome(doc, context, title),
            onMechanicResult: () =>
              syncGlobalChrome(doc, context, title),
            gamificationPolicy: {
              progressStyle: "duolingo",
              showProgressLabel: true,
              showTransition: true,
              transitionDurationMs: 520,
              showMascotDuringTransition: true,
              completionBurst: "none"
            }
          }
        );

        if (ReactDOM.createRoot) {
          reactRoot = ReactDOM.createRoot(root);
          reactRoot.render(app);
        } else {
          ReactDOM.render(app, root);
        }

        window.setTimeout(
          () => syncGlobalChrome(doc, context, title),
          80
        );
      } catch (error) {
        console.error("[DuduQ Matching] Falha ao montar runtime:", error);
        container.textContent =
          "Erro ao iniciar a atividade Matching.";
      }
    };

    iframe.addEventListener("load", handleLoad);

    const runtimeUrl =
      getEngineBase() +
      "/DUDUQ_MATCHING.html?" +
      params.toString();

    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ao carregar Matching.`
          );
        }
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;
        const prepared = stampYear(
          suppressDefaultMount(html),
          context.year
        );
        iframe.srcdoc = prepared;
      })
      .catch((error) => {
        console.error(
          "[DuduQ Matching] Falha ao preparar runtime:",
          error
        );
        if (!destroyed) {
          container.textContent =
            "Erro ao preparar a atividade Matching.";
        }
      });

    return function destroy() {
      destroyed = true;
      stopChromeSync?.();
      iframe.removeEventListener("load", handleLoad);

      try {
        reactRoot?.unmount?.();
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
      name: "Matching",
      category: "associacao-um-a-um",
      active: true,
      acceptsSchema: "1.0.0",
      globalProgress: true,
      literacyFriendly: true,
      routerProfile: {
        name: "Matching",
        active: true,
        baseScore: 70,
        answerTypes: ["single", "pairs"],
        answerTypeWeights: {
          single: 30,
          pairs: 34
        },
        minAlternatives: 1,
        maxAlternatives: 8,
        supports: {
          questionImage: true,
          optionImageUrl: true,
          optionImageAssetKey: true,
          questionAudio: true,
          optionAudio: true
        },
        metadata: {
          category: "associacao-um-a-um",
          earlyLiteracy: true
        }
      }
    }
  });

  console.info("[DuduQ] Matching registrado:", VERSION);
})();


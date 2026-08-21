/* =========================================================
   DUDUQ MECHANIC — MEMORY QUEST
   Adaptador do Memory Quest para o Host DuduQ.
   Versão 1.0.1
 
   REGRA PEDAGÓGICA
   - Memory Quest é usado como consolidação/revisão.
   - Áudio e imagem podem formar pares sem exigir leitura.
   ========================================================= */
 
(function () {
  "use strict";
 
  if (!window.DuduQ) {
    console.error("[DuduQ Memory Quest] duduq-host.js precisa ser carregado antes.");
    return;
  }
 
  const MECHANIC_ID = "memory-quest";
  const VERSION = "1.0.13";
  const RUNTIME_VERSION = "1.0.1";
 
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
 
  function activityTitle(payload, questions) {
    return asString(
      payload?.title ||
      questions?.[0]?.metadata?.activityTitle ||
      questions?.[0]?.metadata?.title,
      "Memory Quest"
    );
  }
 
  function normalizeMemoryConfig(question) {
    const config = question?.metadata?.memoryQuest;
 
    if (!isObject(config)) {
      throw new Error(
        `[DuduQ Memory Quest] Questão ${question?.id || "sem-id"} não possui metadata.memoryQuest.`
      );
    }
 
    if (!Array.isArray(config.cards) || config.cards.length < 4) {
      throw new Error(
        `[DuduQ Memory Quest] Questão ${question.id}: informe ao menos quatro cartas.`
      );
    }
 
    return config;
  }
 
  /* CANARY 026 — ordem das cartas persistente e anti-memorizacao. */
  function smartMemoryCards(cards, questionKey) {
    const source = [...cards];
    if (source.length < 2) return source;

    const indices = source.map((_, index) => index);
    const storageKey =
      "duduq:presentation:v3:memory-quest:" + questionKey + ":" + source.length;
    let previous = indices;

    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (
        Array.isArray(parsed) &&
        parsed.length === indices.length &&
        [...parsed].sort((a,b)=>a-b).join(",") === indices.join(",")
      ) previous = parsed;
    } catch (_) {}

    function random() {
      try {
        if (globalThis.crypto?.getRandomValues) {
          const data = new Uint32Array(1);
          globalThis.crypto.getRandomValues(data);
          return data[0] / 4294967296;
        }
      } catch (_) {}
      return Math.random();
    }

    function shuffled() {
      const out = [...indices];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    const score = (candidate) => candidate.reduce(
      (total, value, index) => total + (value !== previous[index] ? 1 : 0), 0
    );

    let best = indices;
    let bestScore = -1;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = shuffled();
      const candidateScore = score(candidate);
      if (candidateScore > bestScore) {
        best = candidate;
        bestScore = candidateScore;
      }
      if (candidateScore === indices.length) break;
    }

    if (bestScore < indices.length) {
      const shift = 1 + Math.floor(random() * (indices.length - 1));
      best = previous.map((_, index) => previous[(index + shift) % previous.length]);
    }

    try { localStorage.setItem(storageKey, JSON.stringify(best)); } catch (_) {}
    return best.map((index) => source[index]);
  }

  function contentFromQuestion(question, index) {
    const config = normalizeMemoryConfig(question);
 
    return {
      id: asString(question.id, `memory-question-${index + 1}`),
      version: "1.0.0",
      schemaVersion: 1,
      enabled: true,
      editorialStatus: "approved",
      title: asString(
        question.metadata?.screenTitle ||
        question.metadata?.title ||
        question.statement,
        "Memory Quest"
      ),
      instruction: asString(
        question.instruction,
        "Encontre os pares correspondentes."
      ),
      audioText: asString(
        question?.media?.audio?.text ||
        question?.audio?.text ||
        question?.instruction
      ),
      difficulty:
        question.difficulty === "hard"
          ? 3
          : question.difficulty === "medium"
            ? 2
            : 1,
      cognitivePhase: "memory-association",
      gradeRange: { minimum: 1, maximum: 5 },
      estimatedSeconds: Number(question.metadata?.estimatedSeconds) || 65,
      masterMechanic: "pair-memory",
      renderer: "memory-quest",
      mechanicVersion: RUNTIME_VERSION,
      learningObjective: asString(
        question.skill?.description,
        "Consolidar associações já trabalhadas."
      ),
      tags: ["memory", "review", question.id],
      payload: {
        cards: smartMemoryCards(
          config.cards,
          asString(question.id, `memory-question-${index + 1}`)
        ),
        behavior: {
          matchDelayMs: Number(config.behavior?.matchDelayMs) || 420,
          mismatchDelayMs: Number(config.behavior?.mismatchDelayMs) || 760,
          ...config.behavior,
          shuffleCards: false
        }
      },
      feedback: {
        success: asString(
          question.feedback?.correct,
          "Muito bem! Você encontrou todos os pares."
        ),
        retry: asString(
          question.feedback?.incorrect,
          "Observe, ouça e tente novamente."
        )
      }
    };
  }
 
  function mergeAssets(questions) {
    const assets = {};
 
    questions.forEach((question) => {
      const config = question?.metadata?.memoryQuest;
      if (isObject(config?.assets)) {
        Object.assign(assets, config.assets);
      }
    });
 
    return assets;
  }
 
  function createLesson(payload, contents) {
    const list = Object.values(contents);
 
    return {
      schemaVersion: 1,
      id: `${asString(payload?.id, "memory-activity")}-runtime`,
      version: VERSION,
      title: asString(payload?.title, "Memory Quest"),
      description: "Revisão multimodal integrada ao DuduQ Host.",
      enabled: true,
      status: "approved",
      masterMechanic: "pair-memory",
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
        mechanicId: "memory-quest",
        mechanicVersion: RUNTIME_VERSION,
        masterMechanic: "pair-memory",
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
        enabled: false,
        delayMs: 0,
        action: "none",
        maximumAutomaticReplays: 0
      }
    };
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
 
  function replaceRuntimeRoot(doc) {
    const current = doc.getElementById("root");
    if (!current) {
      throw new Error("[DuduQ Memory Quest] #root não encontrado.");
    }
 
    const fresh = doc.createElement("div");
    fresh.id = "root";
    current.replaceWith(fresh);
 
    const boot = doc.getElementById("duduq-boot");
    if (boot) boot.hidden = true;
 
    return fresh;
  }
 
  function exposeMemoryRegistry(html) {
    const pattern =
      /DuduQLessonEnginePreviewHost:\s*\(\)\s*=>\s*DuduQLessonEnginePreviewHost,\s*default:\s*\(\)\s*=>\s*MemoryQuestApp/;
 
    if (!pattern.test(html)) {
      throw new Error(
        "[DuduQ Memory Quest] Ponto de exportação do runtime não encontrado."
      );
    }
 
    return html.replace(
      pattern,
      [
        "DuduQLessonEnginePreviewHost: () => DuduQLessonEnginePreviewHost,",
        "    MEMORY_QUEST_REGISTRY: () => MEMORY_QUEST_REGISTRY,",
        "    MEMORY_QUEST_VERSION: () => MEMORY_QUEST_VERSION,",
        "    default: () => MemoryQuestApp"
      ].join("\n")
    );
  }
 
  function suppressDefaultMount(html) {
    const pattern = /\(function\(\)\{var host=document\.getElementById\('root'\);if\(!host\)throw new Error\('Elemento #root não encontrado\.'\);var app=React\.createElement\(DuduQMemoryQuest\.default\);if\(ReactDOM\.createRoot\)ReactDOM\.createRoot\(host\)\.render\(app\);else ReactDOM\.render\(app,host\);var boot=document\.getElementById\('duduq-boot'\);if\(boot\)boot\.hidden=true\}\)\(\)/;
 
    if (!pattern.test(html)) {
      throw new Error(
        "[DuduQ Memory Quest] Inicialização automática do runtime não encontrada."
      );
    }
 
    return html.replace(
      pattern,
      "(function(){var boot=document.getElementById('duduq-boot');if(boot)boot.hidden=true})()"
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
        .forEach(normalizeMemoryConfig);
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
      throw new Error("[DuduQ Memory Quest] Container não informado.");
    }
 
    const questions = extractQuestions(payload).map(normalizeQuestion);
    if (!questions.length) {
      throw new Error("[DuduQ Memory Quest] Nenhuma questão recebida.");
    }
 
    questions.forEach(normalizeMemoryConfig);
 
    container.innerHTML = "";
 
    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.minHeight = "0";
    wrapper.style.overflow = "hidden";
    wrapper.style.position = "relative";
 
    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Memory Quest";
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
    let reactRoot = null;
    let stopChromeSync = null;
    let completed = false;
    let loadHandler = null;
    let runtimePrepared = false;
    let runtimeConnected = false;
 
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
 
    loadHandler = function () {
      // Ignora o load inicial de about:blank. O runtime só pode ser montado
      // depois que o srcdoc preparado do Memory Quest estiver carregado.
      if (destroyed || !runtimePrepared || runtimeConnected) return;
 
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        const api = win?.DuduQMemoryQuest;
        const React = win?.React;
        const ReactDOM = win?.ReactDOM;
 
        if (
          !api?.DuduQLessonEnginePreviewHost ||
          !api?.MEMORY_QUEST_REGISTRY ||
          !React ||
          !ReactDOM
        ) {
          throw new Error(
            "Runtime Memory Quest não expôs a API integrada esperada."
          );
        }
 
        const contentList = questions.map(contentFromQuestion);
        const contents = Object.fromEntries(
          contentList.map((content) => [content.id, content])
        );
        const assets = mergeAssets(questions);
        const lesson = createLesson(payload, contents);
        const title = activityTitle(payload, questions);
        const root = replaceRuntimeRoot(doc);
 
        stopChromeSync = installChromeSync(
          doc,
          context,
          title
        );
 
        function mascotAsset(src, alt) {
          return src ? { src, alt } : undefined;
        }
 
        const mascotAssets = {
          idle: mascotAsset(
            win.DUDUQ_ASSETS?.mascots?.idle,
            "Mascote DuduQ pronto para ajudar."
          ),
          success: mascotAsset(
            win.DUDUQ_ASSETS?.mascots?.correct,
            "Mascote DuduQ comemorando o acerto."
          ),
          retry: mascotAsset(
            win.DUDUQ_ASSETS?.mascots?.error,
            "Mascote DuduQ incentivando uma nova tentativa."
          ),
          transition: mascotAsset(
            win.DUDUQ_ASSETS?.mascots?.transition ||
              win.DUDUQ_ASSETS?.mascots?.idle,
            "Mascote DuduQ preparando a próxima missão."
          ),
          complete: mascotAsset(
            win.DUDUQ_ASSETS?.mascots?.complete,
            "Mascote DuduQ celebrando a conclusão."
          )
        };
 
        const app = React.createElement(
          api.DuduQLessonEnginePreviewHost,
          {
            lesson,
            contents,
            mechanics: api.MEMORY_QUEST_REGISTRY,
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
              transitionDurationMs: 480,
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
 
        runtimeConnected = true;
      } catch (error) {
        console.error(
          "[DuduQ Memory Quest] Falha ao montar runtime:",
          error
        );
        const detail = asString(
          error?.message,
          "Erro desconhecido no runtime Memory Quest."
        );
        if (!destroyed) {
          container.textContent =
            "Erro ao iniciar a atividade Memory Quest: " +
            detail;
        }
      }
    };
 
    iframe.addEventListener("load", loadHandler);
 
    const runtimeUrl =
      getEngineBase() +
      "/engine/releases/mechanics/memory-quest/1.0.13/DUDUQ_MEMORY_QUEST.html?engineAdapter=" +
      encodeURIComponent(VERSION);
 
    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ao carregar Memory Quest.`
          );
        }
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;
        const exposed = exposeMemoryRegistry(html);
        const prepared = suppressDefaultMount(exposed);
        runtimePrepared = true;
        iframe.srcdoc = stampYear(prepared, context.year);
      })
      .catch((error) => {
        console.error(
          "[DuduQ Memory Quest] Falha ao preparar runtime:",
          error
        );
 
        if (!destroyed) {
          container.textContent =
            "Erro ao preparar a atividade Memory Quest.";
        }
      });
 
    return function destroy() {
      destroyed = true;
      runtimePrepared = false;
      runtimeConnected = false;
      stopChromeSync?.();
 
      if (loadHandler) {
        iframe.removeEventListener("load", loadHandler);
      }
 
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
      name: "Memory Quest",
      category: "memoria-consolidacao",
      active: true,
      acceptsSchema: "1.0.0",
      globalProgress: true,
      literacyFriendly: true,
      teachingPolicy: "review-only",
      routerProfile: {
        name: "Memory Quest",
        active: true,
        baseScore: 64,
        answerTypes: ["single"],
        answerTypeWeights: {
          single: 18
        },
        minAlternatives: 2,
        maxAlternatives: 8,
        supports: {
          questionImage: true,
          optionImageUrl: true,
          optionImageAssetKey: true,
          questionAudio: true,
          optionAudio: true
        },
        metadata: {
          category: "memoria-consolidacao",
          earlyLiteracy: true,
          newContent: false
        }
      }
    }
  });
 
  console.info("[DuduQ] Memory Quest registrado:", VERSION);
})();

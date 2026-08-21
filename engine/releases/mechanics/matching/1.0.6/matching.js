/* =========================================================
   DUDUQ MECHANIC — MATCHING
   Canary Release 1.0.6
   Runtime canônico preservado: Matching 1.0.5 / Smart Matching 1.2.0

   AJUSTE 1.0.6
   - embaralhamento anti-repetição por questão;
   - em pares 2x2, mantém o lado esquerdo estável e alterna o lado
     direito para evitar que ambas as colunas invertam juntas;
   - o runtime 1.0.5 não é sobrescrito.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error(
      "[DuduQ Matching] duduq-host.js precisa ser carregado antes."
    );
    return;
  }

  const MECHANIC_ID = "matching";
  const VERSION = "1.0.6";
  const RUNTIME_VERSION = "1.2.0";
  const RUNTIME_RELEASE_PATH =
    "/engine/releases/mechanics/matching/1.0.5/DUDUQ_MATCHING.html";

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) {
      return fallback;
    }

    const text = String(value).trim();
    return text || fallback;
  }

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) {
      return String(window.DUDUQ_ENGINE_BASE)
        .replace(/\/$/, "");
    }

    return ".";
  }

  function liveRandom() {
    try {
      if (
        globalThis.crypto &&
        typeof globalThis.crypto.getRandomValues === "function"
      ) {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return buffer[0] / 4294967296;
      }
    } catch (_) {}

    return Math.random();
  }

  function shuffle(values) {
    const out = [...values];

    for (
      let index = out.length - 1;
      index > 0;
      index -= 1
    ) {
      const swapIndex =
        Math.floor(
          liveRandom() * (index + 1)
        );

      [out[index], out[swapIndex]] =
        [out[swapIndex], out[index]];
    }

    return out;
  }

  function sameOrder(a, b) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every(
        (value, index) =>
          value === b[index]
      )
    );
  }

  function readPreviousOrder(key, ids) {
    const storages = [];

    try {
      storages.push(localStorage);
    } catch (_) {}

    try {
      storages.push(sessionStorage);
    } catch (_) {}

    for (const storage of storages) {
      try {
        const raw =
          storage.getItem(key);

        if (!raw) continue;

        const parsed =
          JSON.parse(raw);

        if (
          !Array.isArray(parsed) ||
          parsed.length !== ids.length
        ) {
          continue;
        }

        if (
          [...parsed].sort().join("\u0001") ===
          [...ids].sort().join("\u0001")
        ) {
          return parsed;
        }
      } catch (_) {}
    }

    return null;
  }

  function writeOrder(key, order) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(order)
      );
      return;
    } catch (_) {}

    try {
      sessionStorage.setItem(
        key,
        JSON.stringify(order)
      );
    } catch (_) {}
  }

  function antiRepeatIds(ids, key) {
    const source = [...ids];

    if (source.length < 2) {
      return source;
    }

    const storageKey =
      "duduq:presentation:v1:matching:" +
      key;

    const previous =
      readPreviousOrder(
        storageKey,
        source
      ) ||
      source;

    let candidate = source;

    for (
      let attempt = 0;
      attempt < 8;
      attempt += 1
    ) {
      candidate =
        shuffle(source);

      if (
        !sameOrder(
          candidate,
          previous
        )
      ) {
        break;
      }
    }

    if (
      sameOrder(
        candidate,
        previous
      )
    ) {
      candidate = [
        ...previous.slice(1),
        previous[0]
      ];
    }

    writeOrder(
      storageKey,
      candidate
    );

    return candidate;
  }

  function reorderObjects(
    values,
    orderedIds
  ) {
    const map =
      new Map(
        values.map(
          (value) =>
            [value.id, value]
        )
      );

    return orderedIds
      .map(
        (id) => map.get(id)
      )
      .filter(Boolean);
  }

  function extractQuestions(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!isObject(payload)) {
      return [];
    }

    if (
      Array.isArray(
        payload.questions
      )
    ) {
      return payload.questions;
    }

    if (
      Array.isArray(
        payload.items
      )
    ) {
      return payload.items;
    }

    return [payload];
  }

  function normalizeQuestion(
    raw,
    index
  ) {
    if (
      window.DuduQSchema
        ?.normalizeQuestion
    ) {
      return (
        window.DuduQSchema
          .normalizeQuestion(
            raw,
            index,
            {}
          )
      );
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

  function activityTitle(
    payload,
    questions
  ) {
    return asString(
      payload?.title ||
      questions?.[0]
        ?.metadata
        ?.activityTitle ||
      questions?.[0]
        ?.metadata
        ?.title ||
      questions?.[0]
        ?.statement,
      "Matching"
    );
  }

  function normalizeMatchingConfig(
    question
  ) {
    const config =
      question
        ?.metadata
        ?.matching;

    if (!isObject(config)) {
      throw new Error(
        `[DuduQ Matching] Questão ${
          question?.id ||
          "sem-id"
        } não possui metadata.matching.`
      );
    }

    if (
      !Array.isArray(
        config.leftItems
      ) ||
      !Array.isArray(
        config.rightItems
      ) ||
      !Array.isArray(
        config.pairs
      )
    ) {
      throw new Error(
        `[DuduQ Matching] Questão ${
          question.id
        }: leftItems, rightItems e pairs são obrigatórios.`
      );
    }

    return config;
  }

  function normalizeInteractionMode(
    value
  ) {
    const normalized =
      asString(
        value,
        "smart"
      ).toLowerCase();

    if (normalized === "tap") {
      return "smart";
    }

    if (
      normalized === "click" ||
      normalized === "touch" ||
      normalized === "smart"
    ) {
      return normalized;
    }

    return "smart";
  }

  function prepareMatchingSides(
    question,
    config
  ) {
    const leftSource =
      [...config.leftItems];

    const rightSource =
      [...config.rightItems];

    const shuffleLeft =
      config.behavior
        ?.shuffleLeft !== false;

    const shuffleRight =
      config.behavior
        ?.shuffleRight !== false;

    /*
      Em 2x2, se as duas colunas forem invertidas ao mesmo tempo,
      a relação espacial pode continuar idêntica. Por isso o lado
      esquerdo funciona como âncora e o direito muda de posição.
    */
    const twoByTwo =
      leftSource.length === 2 &&
      rightSource.length === 2 &&
      shuffleLeft &&
      shuffleRight;

    const leftIds =
      twoByTwo
        ? leftSource.map(
            (item) => item.id
          )
        : shuffleLeft
          ? antiRepeatIds(
              leftSource.map(
                (item) => item.id
              ),
              `${
                question.id ||
                "question"
              }::left`
            )
          : leftSource.map(
              (item) => item.id
            );

    const rightIds =
      shuffleRight
        ? antiRepeatIds(
            rightSource.map(
              (item) => item.id
            ),
            `${
              question.id ||
              "question"
            }::right`
          )
        : rightSource.map(
            (item) => item.id
          );

    return {
      leftItems:
        reorderObjects(
          leftSource,
          leftIds
        ),
      rightItems:
        reorderObjects(
          rightSource,
          rightIds
        )
    };
  }

  function contentFromQuestion(
    question,
    index
  ) {
    const config =
      normalizeMatchingConfig(
        question
      );

    const prepared =
      prepareMatchingSides(
        question,
        config
      );

    return {
      id:
        asString(
          question.id,
          `matching-question-${
            index + 1
          }`
        ),
      version: "1.0.0",
      schemaVersion: 1,
      enabled: true,
      editorialStatus:
        "approved",
      title:
        asString(
          question
            .metadata
            ?.screenTitle ||
          question
            .metadata
            ?.title ||
          question
            .statement,
          "Matching"
        ),
      instruction:
        asString(
          question
            .instruction,
          "Relacione os itens correspondentes."
        ),
      audioText:
        getAudioText(
          question
        ),
      difficulty:
        question.difficulty ===
        "hard"
          ? 3
          : question
              .difficulty ===
              "medium"
            ? 2
            : 1,
      cognitivePhase:
        "association",
      gradeRange: {
        minimum: 1,
        maximum: 5
      },
      estimatedSeconds:
        Number(
          question
            .metadata
            ?.estimatedSeconds
        ) || 45,
      masterMechanic:
        "smart-matching",
      renderer:
        "matching",
      mechanicVersion:
        RUNTIME_VERSION,
      payload: {
        mode:
          asString(
            config.mode,
            "audio-image"
          ),
        leftTitle:
          asString(
            config.leftTitle,
            "Ouça"
          ),
        rightTitle:
          asString(
            config.rightTitle,
            "Relacione"
          ),
        leftItems:
          prepared.leftItems,
        rightItems:
          prepared.rightItems,
        pairs:
          config.pairs,
        behavior: {
          ...(
            config.behavior ||
            {}
          ),

          /*
            O adapter já realizou a apresentação aleatória.
            Desligamos o shuffle interno para impedir dupla
            randomização ou retorno à ordem anterior.
          */
          shuffleLeft:
            false,
          shuffleRight:
            false,
          connectionMode:
            asString(
              config.behavior
                ?.connectionMode,
              "1x1"
            ),
          interactionMode:
            normalizeInteractionMode(
              config.behavior
                ?.interactionMode
            ),
          lockCorrectPairsOnRetry:
            config.behavior
              ?.lockCorrectPairsOnRetry !==
            false
        }
      },
      feedback: {
        success:
          asString(
            question
              .feedback
              ?.correct,
            "Muito bem! As relações estão corretas."
          ),
        retry:
          asString(
            question
              .feedback
              ?.incorrect,
            "Ouça e observe novamente."
          )
      }
    };
  }

  function mergeAssets(
    questions
  ) {
    const assets = {};

    questions.forEach(
      (question) => {
        const config =
          question
            ?.metadata
            ?.matching;

        if (
          isObject(
            config?.assets
          )
        ) {
          Object.assign(
            assets,
            config.assets
          );
        }
      }
    );

    return assets;
  }

  function createLesson(
    payload,
    contents
  ) {
    const list =
      Object.values(
        contents
      );

    const title =
      activityTitle(
        payload,
        list
      );

    return {
      schemaVersion: 1,
      id:
        `${asString(
          payload?.id,
          "matching-activity"
        )}-runtime`,
      version:
        VERSION,
      title,
      description:
        "Atividade Matching integrada ao DuduQ Host.",
      enabled: true,
      status:
        "approved",
      masterMechanic:
        "smart-matching",
      themeId:
        "whispering-woods",
      themeVersion:
        "1.0.0",
      language: {
        interfaceLocale:
          "pt-BR",
        learningLanguage:
          "en-US",
        speechLocale:
          "en-US"
      },
      learningObjectives: [],
      totalStages:
        list.length,
      steps:
        list.map(
          (
            content,
            index
          ) => ({
            id:
              `step-${content.id}`,
            order:
              index + 1,
            mechanicId:
              "matching",
            mechanicVersion:
              RUNTIME_VERSION,
            masterMechanic:
              "smart-matching",
            contentId:
              content.id,
            contentVersion:
              content.version,
            enabled: true,
            optional: false
          })
        ),
      progressPolicy: {
        enabled: false,
        storage: "none",
        resumeMode:
          "restart",
        saveWhen:
          "step-completed",
        resetCompletedLesson:
          true
      },
      feedbackPolicy: {
        allowRetry: true,
        advanceAfterCorrectMs:
          1100,
        retryFeedbackDurationMs:
          900,
        showHintAfterErrors:
          2,
        revealAnswerAfterErrors:
          4,
        playSuccessSound:
          true,
        playRetrySound:
          true,
        celebrateLessonCompletion:
          false
      },
      navigationPolicy: {
        allowPreviousStep:
          false,
        allowStepSkipping:
          false,
        advanceMode:
          "automatic",
        showStepCounter:
          true
      },
      inactivityPolicy: {
        enabled: true,
        delayMs: 11000,
        action:
          "replay-instruction",
        maximumAutomaticReplays:
          1
      }
    };
  }

  function suppressDefaultMount(
    html
  ) {
    const pattern =
      /\(function mountDuduQMatching\(\) \{[\s\S]*?\}\)\(\);/;

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

  function stampYear(
    html,
    year
  ) {
    if (year == null) {
      return html;
    }

    return html.replace(
      /<html([^>]*)>/i,
      function (
        _,
        attrs
      ) {
        return (
          `<html${attrs} data-duduq-ano="${
            String(year)
          }"` +
          ` data-duduq-ano-ativo="${
            String(year)
          }">`
        );
      }
    );
  }

  function escapeScriptJson(
    value
  ) {
    return (
      JSON.stringify(
        value
      )
        .replace(
          /</g,
          "\\u003c"
        )
        .replace(
          /\u2028/g,
          "\\u2028"
        )
        .replace(
          /\u2029/g,
          "\\u2029"
        )
    );
  }

  function injectIntegratedBootstrap(
    html,
    bundle
  ) {
    const closingBody =
      html.lastIndexOf(
        "</body>"
      );

    if (
      closingBody < 0
    ) {
      throw new Error(
        "[DuduQ Matching] Fechamento </body> não encontrado no runtime."
      );
    }

    const serializedBundle =
      escapeScriptJson(
        bundle
      );

    const bootstrap = `
<script id="duduq-matching-engine-bootstrap-1-0-6">
(function () {
  "use strict";

  const COMPLETE_MESSAGE =
    "DUDUQ_MATCHING_COMPLETE";

  const ERROR_MESSAGE =
    "DUDUQ_MATCHING_ERROR";

  const bundle =
    ${serializedBundle};

  function post(type, detail) {
    try {
      window.parent.postMessage(
        Object.assign(
          { type: type },
          detail || {}
        ),
        "*"
      );
    } catch (_) {}
  }

  function mascotAsset(
    source,
    alt
  ) {
    return source
      ? {
          src: source,
          alt: alt
        }
      : undefined;
  }

  function syncGlobalChrome() {
    const context =
      bundle.context || {};

    const title =
      bundle.title ||
      "Matching";

    if (
      context.year != null
    ) {
      document.documentElement
        .setAttribute(
          "data-duduq-ano-ativo",
          String(context.year)
        );

      document.documentElement
        .setAttribute(
          "data-duduq-ano",
          String(context.year)
        );
    }

    const heading =
      document.querySelector(
        ".duduq-engine-heading h1"
      );

    if (
      heading &&
      heading.textContent !==
        title
    ) {
      heading.textContent =
        title;
    }

    const stepIndex =
      Number.isFinite(
        context.stepIndex
      )
        ? context.stepIndex
        : 0;

    const totalSteps =
      Number.isFinite(
        context.totalSteps
      )
        ? Math.max(
            1,
            context.totalSteps
          )
        : 1;

    const completedBefore =
      Math.max(
        0,
        Math.min(
          stepIndex,
          totalSteps
        )
      );

    const current =
      Math.min(
        stepIndex + 1,
        totalSteps
      );

    const label =
      "Etapa " +
      current +
      " de " +
      totalSteps;

    const strong =
      document.querySelector(
        ".duduq-progress-copy strong"
      );

    if (
      strong &&
      strong.textContent !==
        label
    ) {
      strong.textContent =
        label;
    }

    const trail =
      document.querySelector(
        ".duduq-progress-trail"
      );

    if (trail) {
      trail.style.setProperty(
        "--lesson-progress",
        String(
          completedBefore /
          totalSteps
        )
      );

      trail.setAttribute(
        "aria-valuemax",
        String(totalSteps)
      );

      trail.setAttribute(
        "aria-valuenow",
        String(completedBefore)
      );

      trail.setAttribute(
        "aria-valuetext",
        completedBefore +
          " de " +
          totalSteps +
          " etapas concluídas"
      );
    }
  }

  try {
    const api =
      window.DuduQMatching;

    const React =
      window.React;

    const ReactDOM =
      window.ReactDOM;

    if (
      !api ||
      !api.DuduQLessonEnginePreviewHost ||
      !api.MATCHING_RUNTIME_REGISTRY
    ) {
      throw new Error(
        "Runtime Matching não expôs a API universal esperada."
      );
    }

    if (
      !React ||
      !ReactDOM
    ) {
      throw new Error(
        "React/ReactDOM não estão disponíveis no runtime Matching."
      );
    }

    const root =
      document.getElementById(
        "root"
      );

    if (!root) {
      throw new Error(
        "Elemento #root não encontrado no runtime Matching."
      );
    }

    root.replaceChildren();

    const boot =
      document.getElementById(
        "duduq-boot"
      );

    if (boot) {
      boot.hidden = true;
    }

    const mascotSources =
      window.DUDUQ_ASSETS &&
      window.DUDUQ_ASSETS.mascots
        ? window
            .DUDUQ_ASSETS
            .mascots
        : {};

    const mascotAssets = {
      idle:
        mascotAsset(
          mascotSources.idle,
          "Mascote DuduQ pronto para ajudar."
        ),
      success:
        mascotAsset(
          mascotSources.correct,
          "Mascote DuduQ comemorando o acerto."
        ),
      retry:
        mascotAsset(
          mascotSources.error,
          "Mascote DuduQ incentivando uma nova tentativa."
        ),
      transition:
        mascotAsset(
          mascotSources.transition ||
          mascotSources.idle,
          "Mascote DuduQ preparando a próxima missão."
        ),
      complete:
        mascotAsset(
          mascotSources.complete,
          "Mascote DuduQ celebrando a conclusão."
        )
    };

    const app =
      React.createElement(
        api
          .DuduQLessonEnginePreviewHost,
        {
          lesson:
            bundle.lesson,
          contents:
            bundle.contents,
          mechanics:
            api
              .MATCHING_RUNTIME_REGISTRY,
          assets:
            bundle.assets ||
            {},
          mascotAssets:
            mascotAssets,
          autoPlayInstruction:
            true,
          onLessonComplete:
            function () {
              post(
                COMPLETE_MESSAGE
              );
            },
          onStepChange:
            syncGlobalChrome,
          onMechanicResult:
            syncGlobalChrome,
          gamificationPolicy: {
            progressStyle:
              "duolingo",
            showProgressLabel:
              true,
            showTransition:
              true,
            transitionDurationMs:
              520,
            showMascotDuringTransition:
              true,
            completionBurst:
              "none"
          }
        }
      );

    if (
      ReactDOM.createRoot
    ) {
      window
        .__DUDUQ_MATCHING_REACT_ROOT__ =
        ReactDOM.createRoot(
          root
        );

      window
        .__DUDUQ_MATCHING_REACT_ROOT__
        .render(app);
    } else {
      ReactDOM.render(
        app,
        root
      );
    }

    syncGlobalChrome();

    const observer =
      new MutationObserver(
        syncGlobalChrome
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        characterData:
          true
      }
    );

    window
      .__DUDUQ_MATCHING_CHROME_OBSERVER__ =
      observer;
  } catch (error) {
    const message =
      error &&
      error.message
        ? error.message
        : String(
            error ||
            "Erro desconhecido"
          );

    console.error(
      "[DuduQ Matching] Falha no bootstrap integrado:",
      error
    );

    const boot =
      document.getElementById(
        "duduq-boot"
      );

    if (boot) {
      boot.hidden = false;

      boot.innerHTML =
        '<div id="duduq-runtime-error">' +
        "<strong>Não foi possível iniciar a atividade Matching.</strong>" +
        "<br><br>" +
        message +
        "</div>";
    }

    post(
      ERROR_MESSAGE,
      {
        message:
          message
      }
    );
  }
})();
</script>
`;

    return (
      html.slice(
        0,
        closingBody
      ) +
      bootstrap +
      html.slice(
        closingBody
      )
    );
  }

  function validate(payload) {
    const list =
      extractQuestions(
        payload
      );

    if (!list.length) {
      return false;
    }

    try {
      list
        .map(
          normalizeQuestion
        )
        .forEach(
          normalizeMatchingConfig
        );

      return true;
    } catch (error) {
      console.error(
        error
      );

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
      throw new Error(
        "[DuduQ Matching] Container não informado."
      );
    }

    const questions =
      extractQuestions(
        payload
      ).map(
        normalizeQuestion
      );

    if (!questions.length) {
      throw new Error(
        "[DuduQ Matching] Nenhuma questão recebida."
      );
    }

    questions.forEach(
      normalizeMatchingConfig
    );

    const contentList =
      questions.map(
        contentFromQuestion
      );

    const contents =
      Object.fromEntries(
        contentList.map(
          (content) => [
            content.id,
            content
          ]
        )
      );

    const bundle = {
      title:
        activityTitle(
          payload,
          questions
        ),
      lesson:
        createLesson(
          payload,
          contents
        ),
      contents,
      assets:
        mergeAssets(
          questions
        ),
      context: {
        year:
          context.year == null
            ? null
            : context.year,
        moduleId:
          context.moduleId == null
            ? null
            : context.moduleId,
        stepIndex:
          Number.isFinite(
            context.stepIndex
          )
            ? context.stepIndex
            : 0,
        totalSteps:
          Number.isFinite(
            context.totalSteps
          )
            ? context.totalSteps
            : 1
      }
    };

    container.innerHTML =
      "";

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "duduq-mechanic-frame";

    wrapper.style.width =
      "100%";

    wrapper.style.height =
      "100%";

    wrapper.style.minHeight =
      "0";

    wrapper.style.overflow =
      "hidden";

    wrapper.style.position =
      "relative";

    const iframe =
      document.createElement(
        "iframe"
      );

    iframe.title =
      "DuduQ — Matching";

    iframe.setAttribute(
      "allow",
      "autoplay; fullscreen"
    );

    iframe.setAttribute(
      "allowfullscreen",
      ""
    );

    iframe.style.width =
      "100%";

    iframe.style.height =
      "100%";

    iframe.style.minHeight =
      "0";

    iframe.style.border =
      "0";

    iframe.style.display =
      "block";

    iframe.style.background =
      "transparent";

    wrapper.appendChild(
      iframe
    );

    container.appendChild(
      wrapper
    );

    let destroyed =
      false;

    let completed =
      false;

    function finish(
      result = {}
    ) {
      if (
        destroyed ||
        completed
      ) {
        return;
      }

      completed =
        true;

      if (
        typeof onComplete ===
        "function"
      ) {
        onComplete({
          type:
            "complete",
          completed:
            true,
          mechanic:
            MECHANIC_ID,
          ...result
        });
      }
    }

    function handleMessage(
      event
    ) {
      if (
        event.source !==
          iframe.contentWindow ||
        !event.data
      ) {
        return;
      }

      if (
        event.data.type ===
        "DUDUQ_MATCHING_COMPLETE"
      ) {
        finish();
        return;
      }

      if (
        event.data.type ===
        "DUDUQ_MATCHING_ERROR"
      ) {
        const detail =
          asString(
            event.data
              .message,
            "Erro desconhecido no runtime Matching."
          );

        console.error(
          "[DuduQ Matching] Runtime informou erro:",
          detail
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao iniciar a atividade Matching: " +
            detail;
        }
      }
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    const params =
      new URLSearchParams();

    if (
      context.year != null
    ) {
      params.set(
        "ano",
        String(
          context.year
        )
      );
    }

    if (
      context.moduleId
    ) {
      params.set(
        "module",
        String(
          context.moduleId
        )
      );
    }

    params.set(
      "engineAdapter",
      VERSION
    );

    const runtimeUrl =
      getEngineBase() +
      RUNTIME_RELEASE_PATH +
      "?" +
      params.toString();

    fetch(
      runtimeUrl
    )
      .then(
        (response) => {
          if (
            !response.ok
          ) {
            throw new Error(
              `HTTP ${
                response.status
              } ao carregar Matching.`
            );
          }

          return (
            response.text()
          );
        }
      )
      .then(
        (html) => {
          if (
            destroyed
          ) {
            return;
          }

          let prepared =
            suppressDefaultMount(
              html
            );

          prepared =
            injectIntegratedBootstrap(
              prepared,
              bundle
            );

          prepared =
            stampYear(
              prepared,
              context.year
            );

          iframe.srcdoc =
            prepared;
        }
      )
      .catch(
        (error) => {
          console.error(
            "[DuduQ Matching] Falha ao preparar runtime:",
            error
          );

          if (
            !destroyed
          ) {
            container.textContent =
              "Erro ao preparar a atividade Matching: " +
              asString(
                error
                  ?.message,
                "Erro desconhecido."
              );
          }
        }
      );

    return function destroy() {
      destroyed =
        true;

      window.removeEventListener(
        "message",
        handleMessage
      );

      try {
        iframe.src =
          "about:blank";
      } catch (_) {}

      iframe.remove();
      wrapper.remove();
    };
  }

  window.DuduQ.registerMechanic({
    id:
      MECHANIC_ID,
    version:
      VERSION,
    validate,
    mount,
    metadata: {
      name:
        "Matching",
      category:
        "associacao-um-a-um",
      active:
        true,
      acceptsSchema:
        "1.0.0",
      globalProgress:
        true,
      literacyFriendly:
        true,
      routerProfile: {
        name:
          "Matching",
        active:
          true,
        baseScore:
          70,
        answerTypes: [
          "single",
          "pairs"
        ],
        answerTypeWeights: {
          single: 30,
          pairs: 34
        },
        minAlternatives:
          1,
        maxAlternatives:
          8,
        supports: {
          questionImage:
            true,
          optionImageUrl:
            true,
          optionImageAssetKey:
            true,
          questionAudio:
            true,
          optionAudio:
            true
        },
        metadata: {
          category:
            "associacao-um-a-um",
          earlyLiteracy:
            true
        }
      }
    }
  });

  console.info(
    "[DuduQ] Matching registrado:",
    VERSION
  );
})();

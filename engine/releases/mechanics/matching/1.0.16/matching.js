/* =========================================================
   DUDUQ MECHANIC — MATCHING
   Canary Release 1.0.16
   Runtime canônico preservado: Matching 1.0.5 / Smart Matching 1.2.0

   AJUSTE 1.0.16
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
  const VERSION = "1.0.16";
  const RUNTIME_VERSION = "1.2.0";
  const RUNTIME_RELEASE_PATH =
    "/engine/releases/mechanics/matching/1.0.16/DUDUQ_MATCHING.html";

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

  function presentationStore() {
    const candidates = [];

    try {
      if (window.parent && window.parent !== window) {
        candidates.push(window.parent);
      }
    } catch (_) {}

    candidates.push(window);

    for (const host of candidates) {
      try {
        if (!host.__DUDUQ_PRESENTATION_ORDERS_V2__) {
          Object.defineProperty(
            host,
            "__DUDUQ_PRESENTATION_ORDERS_V2__",
            {
              value: Object.create(null),
              configurable: true
            }
          );
        }

        return host.__DUDUQ_PRESENTATION_ORDERS_V2__;
      } catch (_) {}
    }

    return null;
  }

  function readPreviousOrder(key, ids) {
    const shared = presentationStore();

    try {
      const stored = shared?.[key];

      if (
        Array.isArray(stored) &&
        stored.length === ids.length &&
        [...stored].sort().join("\u0001") ===
          [...ids].sort().join("\u0001")
      ) {
        return [...stored];
      }
    } catch (_) {}

    const storages = [];
    try { storages.push(localStorage); } catch (_) {}
    try { storages.push(sessionStorage); } catch (_) {}

    for (const storage of storages) {
      try {
        const raw = storage.getItem(key);
        if (!raw) continue;

        const parsed = JSON.parse(raw);

        if (
          Array.isArray(parsed) &&
          parsed.length === ids.length &&
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
    const shared = presentationStore();

    try {
      if (shared) shared[key] = [...order];
    } catch (_) {}

    try {
      localStorage.setItem(key, JSON.stringify(order));
    } catch (_) {}

    try {
      sessionStorage.setItem(key, JSON.stringify(order));
    } catch (_) {}
  }

  function antiRepeatIds(
    ids,
    key
  ) {
    const source = [...ids];

    if (source.length < 2) {
      return source;
    }

    const storageKey =
      "duduq:presentation:v3:matching:" +
      key;

    const previous =
      readPreviousOrder(storageKey, source) ||
      source;

    const score = (candidate) =>
      candidate.reduce(
        (total, value, index) =>
          total + (value !== previous[index] ? 1 : 0),
        0
      );

    let best = source;
    let bestScore = -1;

    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = shuffle(source);
      const candidateScore = score(candidate);

      if (candidateScore > bestScore) {
        best = candidate;
        bestScore = candidateScore;
      }

      if (candidateScore === source.length) {
        break;
      }
    }

    if (bestScore < source.length) {
      const shift =
        1 + Math.floor(liveRandom() * (source.length - 1));
      best = previous.map(
        (_, index) => previous[(index + shift) % previous.length]
      );
    }

    writeOrder(storageKey, best);
    return best;
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
      leftSource.length > 2 &&
      config.behavior
        ?.lockLeftOrder !== true;

    const shuffleRight =
      rightSource.length > 1 &&
      config.behavior
        ?.lockRightOrder !== true;

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
            prepared.leftItems.length > 2 &&
            config.behavior?.lockLeftOrder !== true,
          shuffleRight:
            prepared.rightItems.length > 1 &&
            config.behavior?.lockRightOrder !== true,
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
<style id="duduq-canary-036-completion-font-lock">
/* =====================================================================
   DUDUQ CANARY 036 â€” COMPLETION TYPOGRAPHY LOCK
   Mesma tipografia/peso em todas as telas de conclusao.
   ===================================================================== */
html body #root .duduq-engine-complete,
html body #root .duduq-engine-complete h1,
html body #root .duduq-engine-complete h2,
html body #root .duduq-engine-complete h3,
html body #root .duduq-engine-complete p,
html body #root .duduq-engine-complete span,
html body #root .duduq-engine-complete strong,
html body #root .duduq-engine-complete button,
html body #root .duduq-engine-complete-action,
html body #root .duduq-engine-complete-reward,
html body #root .duduq-engine-complete-eyebrow {
  font-family: Nunito, "Arial Rounded MT Bold", "Segoe UI", system-ui, sans-serif !important;
  font-optical-sizing: auto !important;
  font-kerning: normal !important;
  font-synthesis: weight !important;
}
html body #root .duduq-engine-complete h1,
html body #root .duduq-engine-complete h2,
html body #root .duduq-engine-complete h3,
html body #root .duduq-engine-complete strong,
html body #root .duduq-engine-complete-action,
html body #root .duduq-engine-complete-reward,
html body #root .duduq-engine-complete-eyebrow {
  font-weight: 900 !important;
}
html body #root .duduq-engine-complete p,
html body #root .duduq-engine-complete span:not(.duduq-engine-complete-eyebrow):not(.duduq-engine-complete-reward) {
  font-weight: 800 !important;
}
</style>
<style id="duduq-canary-035-adaptive-space">
/* =====================================================================
   DUDUQ CANARY 035 â€” ADAPTIVE SPACE V1
   Ocupacao inteligente da area util sem escalar cegamente a interface.
   ===================================================================== */

html body #root .duduq-engine-stage {
  min-height: 0 !important;
}

html body #root .duduq-engine-stage .duduq-dd-root,
html body #root .duduq-engine-stage .duduq-mq-root,
html body #root .duduq-engine-stage .duduq-matching-root,
html body #root .duduq-engine-stage .duduq-ss-root,
html body #root .duduq-engine-stage .duduq-bp-root,
html body #root .duduq-engine-stage .duduq-ts-root {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
}

html body #root .duduq-engine-stage .duduq-dd-surface,
html body #root .duduq-engine-stage .duduq-mq-surface,
html body #root .duduq-engine-stage .duduq-matching-surface,
html body #root .duduq-engine-stage .duduq-ss-surface,
html body #root .duduq-engine-stage .duduq-bp-surface,
html body #root .duduq-engine-stage .duduq-ts-surface {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
}

/* ---------------- DRAG & DROP ---------------- */
html body #root .duduq-engine-stage .duduq-dd-surface {
  display: flex !important;
  flex-direction: column !important;
}
html body #root .duduq-engine-stage .duduq-dd-instruction {
  flex: 0 0 auto !important;
}
html body #root .duduq-engine-stage .duduq-dd-board {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
}
html body #root .duduq-engine-stage .duduq-dd-target-grid {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  align-items: stretch !important;
  align-content: stretch !important;
  grid-auto-rows: minmax(clamp(196px, 27vh, 246px), 1fr) !important;
}
html body #root .duduq-engine-stage .duduq-dd-target,
html body #root .duduq-engine-stage .duduq-dd-target[data-valid-target="true"] {
  height: auto !important;
  min-height: 0 !important;
  max-height: 286px !important;
  display: flex !important;
  flex-direction: column !important;
}
html body #root .duduq-engine-stage .duduq-dd-target[data-has-media="true"] .duduq-dd-target-head {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding-top: 4px !important;
}
html body #root .duduq-engine-stage .duduq-dd-target-media {
  width: clamp(148px, 12vw, 178px) !important;
  height: clamp(148px, 12vw, 178px) !important;
  max-width: 58% !important;
  max-height: 178px !important;
}
html body #root .duduq-engine-stage .duduq-dd-target-items {
  width: min(154px, 54%) !important;
  min-width: 132px !important;
  max-width: 154px !important;
  min-height: 48px !important;
  height: 48px !important;
  flex: 0 0 48px !important;
  margin: 0 auto 9px !important;
  padding: 1px 4px !important;
}
html body #root .duduq-engine-stage .duduq-dd-target-items .duduq-dd-item {
  min-height: 44px !important;
  height: 44px !important;
  padding: 2px 6px !important;
}
html body #root .duduq-engine-stage .duduq-dd-target-items .duduq-dd-audio-shell,
html body #root .duduq-engine-stage .duduq-dd-target-items .duduq-dd-audio-shell > button {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
}
html body #root .duduq-engine-stage .duduq-dd-action-slot {
  flex: 0 0 auto !important;
  padding-top: 10px !important;
  padding-bottom: 4px !important;
}

/* ---------------- MEMORY QUEST ---------------- */
html body #root .duduq-engine-stage .duduq-mq-surface {
  display: grid !important;
  grid-template-rows: max-content minmax(0, 1fr) !important;
  gap: clamp(10px, 1.6vh, 16px) !important;
  overflow: hidden !important;
}
html body #root .duduq-engine-stage .duduq-mq-board {
  box-sizing: border-box !important;
  width: min(1040px, calc(100% - 20px)) !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden !important;
  padding: clamp(8px, 1.3vh, 14px) clamp(14px, 1.8vw, 24px) !important;
}
html body #root .duduq-engine-stage .duduq-mq-meta {
  flex: 0 0 auto !important;
  margin: 0 auto clamp(10px, 1.4vh, 14px) !important;
}
html body #root .duduq-engine-stage .duduq-mq-grid {
  box-sizing: border-box !important;
  width: min(calc(var(--mq-grid-max, 820px) + 120px), 94%) !important;
  max-width: 940px !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 auto !important;
  padding: 0 !important;
  gap: clamp(14px, 1.25vw, 20px) !important;
  align-content: center !important;
  align-items: stretch !important;
}
html body #root .duduq-engine-stage .duduq-mq-card {
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  aspect-ratio: 1.58 / 1 !important;
  border: 0 !important;
  border-radius: 20px !important;
  background: transparent !important;
  box-shadow: none !important;
  filter: none !important;
  overflow: visible !important;
}
html body #root .duduq-engine-stage .duduq-mq-card-inner {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  border-radius: 20px !important;
  background: transparent !important;
  box-shadow: none !important;
  outline: 0 !important;
}
html body #root .duduq-engine-stage .duduq-mq-face {
  box-sizing: border-box !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border-width: 2px !important;
  border-radius: 20px !important;
  overflow: hidden !important;
}
html body #root .duduq-engine-stage .duduq-mq-front::before,
html body #root .duduq-engine-stage .duduq-mq-front::after,
html body #root .duduq-engine-stage .duduq-mq-back::after {
  content: none !important;
  display: none !important;
}
html body #root .duduq-engine-stage .duduq-mq-front {
  border-color: #235fc8 !important;
  background:
    radial-gradient(circle at 18% 15%, rgba(255,255,255,.22) 0 7%, transparent 8%),
    linear-gradient(135deg, rgba(151,88,255,.86) 0%, rgba(72,80,232,.96) 48%, rgba(20,116,220,.96) 100%) !important;
  box-shadow:
    0 5px 0 #173d88,
    0 11px 18px rgba(22,65,135,.18),
    inset 0 1px 0 rgba(255,255,255,.34) !important;
}
html body #root .duduq-engine-stage .duduq-mq-back {
  border-color: #A9BED2 !important;
  background: linear-gradient(180deg,#FFFFFF 0%,#F5F9FD 100%) !important;
  box-shadow:
    0 5px 0 #93A9BE,
    0 11px 18px rgba(31,65,99,.14),
    inset 0 1px 0 rgba(255,255,255,.96) !important;
}
html body #root .duduq-engine-stage .duduq-mq-media {
  width: min(82%, 170px) !important;
  height: min(76%, 150px) !important;
  object-fit: contain !important;
}
html body #root .duduq-engine-stage .duduq-mq-status {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  margin: -1px !important;
  padding: 0 !important;
  border: 0 !important;
  clip: rect(0 0 0 0) !important;
  clip-path: inset(50%) !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

/* ---------------- MATCHING ---------------- */
html body #root .duduq-engine-stage .duduq-matching-surface {
  display: grid !important;
  grid-template-rows: max-content minmax(0, 1fr) max-content !important;
  align-content: stretch !important;
}
html body #root .duduq-engine-stage .duduq-matching-board {
  height: 100% !important;
  min-height: 0 !important;
  align-self: stretch !important;
}
html body #root .duduq-engine-stage .duduq-matching-column {
  height: 100% !important;
  justify-content: center !important;
}
/* ---------------- SMART SENTENCE ---------------- */
html body #root .duduq-engine-stage .duduq-ss-surface {
  display: flex !important;
  flex-direction: column !important;
}
html body #root .duduq-engine-stage .duduq-ss-board {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  max-height: none !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
}
html body #root .duduq-engine-stage .duduq-ss-sentence-card {
  min-height: clamp(132px, 21vh, 184px) !important;
}
html body #root .duduq-engine-stage .duduq-ss-context img {
  width: clamp(112px, 12vw, 154px) !important;
  height: clamp(112px, 12vw, 154px) !important;
}

/* ---------------- BUBBLE POP ---------------- */
html body #root .duduq-engine-stage .duduq-bp-surface {
  display: flex !important;
  flex-direction: column !important;
}
html body #root .duduq-engine-stage .duduq-bp-board {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}
html body #root .duduq-engine-stage .duduq-bp-arena {
  flex: 1 1 auto !important;
  min-height: clamp(280px, 47vh, 430px) !important;
  max-height: none !important;
}

/* ---------------- TARGET SHOOTER ---------------- */
html body #root .duduq-engine-stage .duduq-ts-surface {
  display: flex !important;
  flex-direction: column !important;
}
html body #root .duduq-engine-stage .duduq-ts-arena {
  flex: 1 1 auto !important;
  min-height: clamp(280px, 47vh, 430px) !important;
  max-height: none !important;
}

/* O modo compacto reduz novamente quando a area real e curta. */
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-dd-target-grid {
  grid-auto-rows: minmax(158px, auto) !important;
}
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-dd-target,
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-dd-target[data-valid-target="true"] {
  max-height: 220px !important;
}
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-dd-target-media {
  width: clamp(112px, 10vw, 140px) !important;
  height: clamp(112px, 10vw, 140px) !important;
}
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-mq-grid {
  width: min(var(--mq-grid-max, 820px), 92%) !important;
  gap: 10px !important;
}
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-mq-card {
  aspect-ratio: 1.62 / 1 !important;
}
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-bp-arena,
html body #root .duduq-engine-stage[data-duduq-fit="compact"] .duduq-ts-arena {
  min-height: 230px !important;
}

@media (max-width: 720px) {
  html body #root .duduq-engine-stage .duduq-dd-target-grid {
    grid-auto-rows: minmax(154px, auto) !important;
  }
  html body #root .duduq-engine-stage .duduq-mq-grid {
    width: 96% !important;
    gap: 9px !important;
  }
  html body #root .duduq-engine-stage .duduq-mq-card,
  html body #root .duduq-engine-stage .duduq-mq-card-inner,
  html body #root .duduq-engine-stage .duduq-mq-face {
    border-radius: 15px !important;
  }
}
</style>
<script id="duduq-canary-035-adaptive-space-script">
(function () {
  "use strict";
  let attempts = 0;
  let observer = null;

  function classify(stage) {
    const height = Math.round(stage.getBoundingClientRect().height || stage.clientHeight || 0);
    const width = Math.round(stage.getBoundingClientRect().width || stage.clientWidth || 0);
    let mode = "balanced";
    if (height > 0 && (height < 370 || width < 700)) mode = "compact";
    else if (height >= 455 && width >= 900) mode = "roomy";
    stage.setAttribute("data-duduq-fit", mode);
    stage.style.setProperty("--duduq-available-height", height + "px");
    stage.style.setProperty("--duduq-available-width", width + "px");
  }

  function bind() {
    const stage = document.querySelector(".duduq-engine-stage");
    if (!stage) {
      attempts += 1;
      if (attempts < 240) window.requestAnimationFrame(bind);
      return;
    }
    classify(stage);
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(function () { classify(stage); });
      observer.observe(stage);
    } else {
      window.addEventListener("resize", function () { classify(stage); }, { passive: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
</script>
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

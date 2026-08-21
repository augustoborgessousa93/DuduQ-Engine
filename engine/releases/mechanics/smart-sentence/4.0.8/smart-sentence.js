/* =========================================================
   DUDUQ MECHANIC — SMART SENTENCE 4.0.8
   TARGET SHOOTER SHELL / STANDARD FEEDBACK + MASCOT / MODULAR LANGUAGE ENGINE

   CONTRATO ABSOLUTO
   ---------------------------------------------------------
   - Shell congelada: Target Shooter release 1.0.16
   - Runtime visual: Target Shooter 2.0.2
   - A Smart NÃO recria Header, Mascot, Progress, Feedback,
     Completion, Toolbar, Instruction, Status ou Arena.
   - A Smart só renderiza dinâmica própria DENTRO da arena
     .duduq-ts-arena.
   - Nenhum arquivo do Target Shooter é alterado.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error(
      "[DuduQ Smart Sentence 4] duduq-host.js precisa ser carregado antes."
    );
    return;
  }

  const MECHANIC_ID = "smart-sentence";
  const VERSION = "4.0.8";
  const TARGET_SHELL_RELEASE = "1.0.16";
  const TARGET_RUNTIME_VERSION = "2.0.2";
  const TARGET_RUNTIME_PATH =
    "/engine/releases/mechanics/target-shooter/1.0.16/DUDUQ_TARGET_SHOOTER.html";

  /* =======================================================
     CORE HELPERS
     ======================================================= */

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  function getEngineBase() {
    return window.DUDUQ_ENGINE_BASE
      ? String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "")
      : ".";
  }

  function extractQuestions(payload) {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];
    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.stages)) return payload.stages;
    return [payload];
  }

  function normalizeQuestion(raw, index) {
    if (window.DuduQSchema?.normalizeQuestion) {
      return window.DuduQSchema.normalizeQuestion(raw, index, {});
    }
    return raw;
  }

  function slug(value, fallback = "item") {
    const text = asString(value, fallback)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return text || fallback;
  }

  function normalizeComparable(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.,!?;:'"“”‘’…()[\]{}]/g, "")
      .toLocaleLowerCase("pt-BR");
  }

  /* =======================================================
     CONFIGURATION / JSON NORMALIZATION
     ======================================================= */

  const MODE_ALIASES = Object.freeze({
    "complete_sentence": "complete-sentence",
    "complete-sentence": "complete-sentence",
    "complete": "complete-sentence",

    "build_sentence": "build-sentence",
    "build-sentence": "build-sentence",
    "build": "build-sentence",

    "unscramble": "unscramble",
    "word_order": "word-order",
    "word-order": "word-order",
    "order": "word-order",

    "listen_build": "listen-build",
    "listen-build": "listen-build",
    "listen_complete": "listen-complete",
    "listen-complete": "listen-complete",

    "image_sentence": "image-sentence",
    "image-sentence": "image-sentence",

    "dialogue": "dialogue",
    "dialog": "dialogue",

    "syllables": "syllables",
    "syllable_order": "syllables",
    "syllable-order": "syllables",

    "word_build": "word-build",
    "word-build": "word-build",

    "paragraph": "text-order",
    "text_order": "text-order",
    "text-order": "text-order"
  });

  function normalizeMode(value, source) {
    const key = asString(value, "")
      .toLowerCase()
      .replace(/\s+/g, "_");

    if (MODE_ALIASES[key]) return MODE_ALIASES[key];

    if (Array.isArray(source?.answer) && source.answer.length > 1) {
      return "build-sentence";
    }

    return "complete-sentence";
  }

  function normalizeMedia(value, alt = "") {
    if (!value) return null;

    if (typeof value === "string") {
      return { src: value, alt };
    }

    if (!isObject(value)) return null;

    return {
      src: asString(value.src || value.url),
      assetKey: asString(value.assetKey || value.key),
      alt: asString(value.alt || value.description, alt),
      text: asString(value.text || value.spokenText),
      locale: asString(value.locale || value.language)
    };
  }

  function normalizeToken(raw, index) {
    if (typeof raw === "string" || typeof raw === "number") {
      const value = String(raw);
      return {
        uid: `token-${index + 1}`,
        value,
        label: value,
        spokenText: value,
        audio: null,
        image: null
      };
    }

    const value = asString(
      raw?.value || raw?.label || raw?.text || raw?.word || raw?.syllable
    );

    return {
      uid: asString(raw?.id, `token-${index + 1}`),
      value,
      label: asString(
        raw?.label || raw?.text || raw?.word || raw?.syllable,
        value
      ),
      spokenText: asString(
        raw?.spokenText || raw?.speak || raw?.pronunciation,
        value
      ),
      audio: normalizeMedia(raw?.audio || raw?.audioSrc),
      image: normalizeMedia(raw?.image || raw?.imageSrc),
      locked: raw?.locked === true
    };
  }

  function normalizeHints(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((hint, index) => {
        if (typeof hint === "string") {
          return {
            afterErrors: index + 1,
            text: hint
          };
        }

        return {
          afterErrors: Math.max(
            1,
            Number(hint?.afterErrors || hint?.after || index + 1)
          ),
          text: asString(hint?.text || hint?.message)
        };
      })
      .filter((hint) => hint.text);
  }

  function normalizeDialogue(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((line, index) => {
        if (typeof line === "string") {
          return {
            id: `line-${index + 1}`,
            speaker: "",
            text: line
          };
        }

        return {
          id: asString(line?.id, `line-${index + 1}`),
          speaker: asString(line?.speaker || line?.role),
          text: asString(line?.text || line?.sentence)
        };
      })
      .filter((line) => line.text);
  }

  function activitySource(question) {
    const candidates = [
      question?.activity,
      question?.metadata?.activity,
      question?.metadata?.smartSentence
    ];

    return candidates.find(isObject) || null;
  }

  function normalizeSmartConfig(question, index) {
    const source = activitySource(question);

    if (!source) {
      throw new Error(
        `[DuduQ Smart Sentence 4] Questão ${
          question?.id || "sem-id"
        } não possui activity, metadata.activity ou metadata.smartSentence.`
      );
    }

    const mode = normalizeMode(
      source.mode || source.type || source.activityMode,
      source
    );

    const rawTokens =
      source.words ||
      source.tokens ||
      source.items ||
      source.options ||
      source.bank ||
      source.syllables ||
      [];

    const tokens = Array.isArray(rawTokens)
      ? rawTokens.map(normalizeToken)
      : [];

    const rawAnswer = source.answer;
    const answer = Array.isArray(rawAnswer)
      ? rawAnswer.map(String)
      : rawAnswer == null
        ? []
        : [String(rawAnswer)];

    let sentence = asString(
      source.sentence || source.templateText || source.prompt
    );

    const prefix = asString(source.prefix);
    const suffix = asString(source.suffix);

    if (!sentence && (prefix || suffix)) {
      sentence = `${prefix} ____ ${suffix}`.trim();
    }

    const instructionAudio =
      normalizeMedia(source.instructionAudio) ||
      normalizeMedia(source.audio) ||
      normalizeMedia(question?.media?.audio) ||
      normalizeMedia(question?.audio);

    const config = {
      id: asString(question.id, `smart-question-${index + 1}`),
      mode,

      instruction: asString(
        source.instruction || question.instruction,
        "Organize os elementos para responder."
      ),

      audioText: asString(
        source.instructionSpoken ||
        instructionAudio?.text ||
        question?.media?.audio?.text ||
        question?.audio?.text ||
        source.instruction ||
        question.instruction
      ),

      instructionImage:
        normalizeMedia(source.instructionImage)?.src ||
        asString(source.instructionImageSrc),

      language: asString(
        source.language || source.locale || source.speechLocale,
        "en-US"
      ),

      sentence,
      prefix,
      suffix,
      tokens,
      answer,

      image:
        normalizeMedia(source.image) ||
        (
          source.imageSrc || source.imageKey
            ? {
                src: asString(source.imageSrc),
                assetKey: asString(source.imageKey),
                alt: asString(source.imageAlt)
              }
            : null
        ),

      phraseAudio:
        normalizeMedia(source.phraseAudio || source.correctAudio),

      dialogue: normalizeDialogue(source.dialogue),

      hints: normalizeHints(source.hints || source.tips),

      helperText: asString(
        source.helperText ||
        source.helper ||
        "Toque ou arraste para construir a resposta."
      ),

      interaction: {
        tap: source.interaction?.tap !== false,
        drag: source.interaction?.drag !== false,
        reorder: source.interaction?.reorder !== false,
        remove: source.interaction?.remove !== false,
        shuffle: source.interaction?.shuffle !== false
      },

      feedback: {
        success: asString(
          source.feedback?.correct ||
          source.feedback?.success ||
          question.feedback?.correct,
          "Muito bem!"
        ),
        retry: asString(
          source.feedback?.incorrect ||
          source.feedback?.retry ||
          question.feedback?.incorrect,
          "Observe novamente e tente outra vez."
        )
      },

      difficulty: {
        level: Math.max(1, Math.min(5, Number(source.difficulty?.level || 1))),
        hintAfterErrors: Math.max(
          1,
          Number(source.difficulty?.hintAfterErrors || 1)
        )
      }
    };

    if (!config.tokens.length) {
      throw new Error(
        `[DuduQ Smart Sentence 4] Questão ${config.id}: informe words/tokens/items/options/bank.`
      );
    }

    if (!config.answer.length) {
      throw new Error(
        `[DuduQ Smart Sentence 4] Questão ${config.id}: answer é obrigatório.`
      );
    }

    return config;
  }

  /* =======================================================
     ASSET REGISTRY
     ======================================================= */

  function collectAssets(configs) {
    const assets = {};

    function register(media) {
      if (!media?.assetKey || !media?.src) return;
      assets[media.assetKey] = media.src;
    }

    configs.forEach((config) => {
      register(config.image);
      config.tokens.forEach((token) => {
        register(token.image);
        register(token.audio);
      });
    });

    return assets;
  }

  /* =======================================================
     LESSON CONTENT CONTRACT
     ======================================================= */

  function contentFromConfig(config) {
    return {
      id: config.id,
      version: VERSION,
      schemaVersion: 1,
      enabled: true,
      editorialStatus: "approved",
      title: config.instruction,
      instruction: config.instruction,
      audioText: config.audioText,
      difficulty: config.difficulty.level,
      cognitivePhase: "language-construction",
      gradeRange: {
        minimum: 1,
        maximum: 9
      },
      estimatedSeconds: 60,
      masterMechanic: "smart-sentence",
      renderer: "smart-sentence",
      mechanicVersion: VERSION,
      payload: config,
      feedback: {
        success: config.feedback.success,
        retry: config.feedback.retry
      }
    };
  }

  function activityTitle(payload, questions) {
    return asString(
      payload?.title ||
      questions?.[0]?.metadata?.activityTitle ||
      questions?.[0]?.metadata?.title ||
      questions?.[0]?.statement,
      "Smart Sentence"
    );
  }

  function createLesson(payload, contents) {
    const list = Object.values(contents);

    return {
      schemaVersion: 1,
      id: `${asString(payload?.id, "smart-sentence")}-runtime`,
      version: VERSION,
      title: activityTitle(payload, list),
      description:
        "Smart Sentence modular dentro da casca congelada Target Shooter 1.0.16.",
      enabled: true,
      status: "approved",
      masterMechanic: "smart-sentence",
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
        mechanicId: MECHANIC_ID,
        mechanicVersion: VERSION,
        masterMechanic: "smart-sentence",
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
        advanceAfterCorrectMs: 1450,
        retryFeedbackDurationMs: 1000,
        showHintAfterErrors: 1,
        revealAnswerAfterErrors: 99,
        playSuccessSound: true,
        playRetrySound: true,
        celebrateLessonCompletion: true
      },

      navigationPolicy: {
        allowPreviousStep: false,
        allowStepSkipping: false,
        advanceMode: "automatic",
        showStepCounter: true
      },

      inactivityPolicy: {
        enabled: true,
        delayMs: 10000,
        action: "replay-instruction",
        maximumAutomaticReplays: 1
      }
    };
  }

  /* =======================================================
     TARGET SHOOTER RUNTIME EXTRACTION
     ======================================================= */

  function suppressTargetDefaultMount(html) {
    const pattern =
      /\(function\(\)\{var host=document\.getElementById\('root'\);if\(!host\)throw new Error\('Elemento #root não encontrado\.'\);var app=React\.createElement\(DuduQDragDrop\.default\);if\(ReactDOM\.createRoot\)ReactDOM\.createRoot\(host\)\.render\(app\);else ReactDOM\.render\(app,host\);var boot=document\.getElementById\('duduq-boot'\);if\(boot\)boot\.hidden=true\}\)\(\)/;

    if (!pattern.test(html)) {
      throw new Error(
        "[DuduQ Smart Sentence 4] Mount padrão do Target Shooter não encontrado."
      );
    }

    return html.replace(
      pattern,
      "(function(){var boot=document.getElementById('duduq-boot');if(boot)boot.hidden=true})()"
    );
  }

  function extractTargetShooterStyles(html) {
    const marker = "var TARGET_SHOOTER_STYLES = `";
    const start = html.indexOf(marker);

    if (start < 0) {
      throw new Error(
        "[DuduQ Smart Sentence 4] TARGET_SHOOTER_STYLES não encontrado."
      );
    }

    const contentStart = start + marker.length;
    const endMarker = "`;\n  function tsConfig";
    const end = html.indexOf(endMarker, contentStart);

    if (end < 0) {
      throw new Error(
        "[DuduQ Smart Sentence 4] Final de TARGET_SHOOTER_STYLES não encontrado."
      );
    }

    return html.slice(contentStart, end);
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

  function escapeScriptJson(value) {
    return JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }

  function escapeStyleText(value) {
    return String(value).replace(/<\/style/gi, "<\\/style");
  }

  /* =======================================================
     SMART BOOTSTRAP — TARGET SHELL + SMART INNER ARENA
     ======================================================= */

  function injectSmartBootstrap(html, bundle, targetStyles) {
    const closingBody = html.lastIndexOf("</body>");

    if (closingBody < 0) {
      throw new Error(
        "[DuduQ Smart Sentence 4] Fechamento </body> não encontrado."
      );
    }

    const serializedBundle = escapeScriptJson(bundle);
    const targetCss = escapeStyleText(targetStyles);

    const bootstrap = `
<style id="duduq-smart-target-exact-styles">
${targetCss}
</style>

<style id="duduq-smart-sentence-4-inner-only">
/* ============================================================
   SMART SENTENCE 4.0.8
   SOMENTE CONTEUDO INTERNO DA ARENA TARGET SHOOTER.
   Nenhuma regra abaixo altera:
   Header / Progress / Mascot / Toolbar / Instruction /
   Status / Arena geometry / Feedback / Completion.
   ============================================================ */

/* USER-REQUESTED SMART-ONLY ARENA EXCEPTION:
   Target Shooter geometry is preserved, but the green ground pseudo-element
   is disabled only for the Smart Sentence instance. */
.duduq-ts-arena[data-smart-sentence-shell="true"]::after {
  display: none !important;
}

.duduq-smart-ts-stage {
  position: absolute;
  z-index: 4;
  inset: clamp(12px, 2vh, 20px) clamp(14px, 2vw, 24px) clamp(16px, 2.4vh, 24px);
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: clamp(6px, .85vh, 9px);
  padding-top: clamp(4px, .6vh, 8px);
  padding-bottom: clamp(16px, 2vh, 22px);
  overflow: hidden;
  overscroll-behavior: none;
  scrollbar-width: none;
  touch-action: manipulation;
  color: #16375B;
  font-family: Nunito, ui-rounded, system-ui, sans-serif;
}

.duduq-smart-ts-stage * {
  box-sizing: border-box;
}

.duduq-smart-ts-stage::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.duduq-ts-audio-shell[data-playing="true"] {
  border-radius: 999px !important;
  background: linear-gradient(180deg,#8FEA3B 0%,#6BCB1F 64%,#58A700 100%) !important;
  box-shadow:
    0 4px 0 #58A700,
    0 0 0 4px rgba(88,167,0,.16),
    inset 0 2px 0 rgba(255,255,255,.26) !important;
}

.duduq-ts-audio-shell[data-playing="true"] .duduq-ts-audio-button,
.duduq-ts-audio-shell[data-playing="true"] .duduq-ts-audio-button:disabled {
  border-color: transparent !important;
  background: transparent !important;
  color: #FFFFFF !important;
  box-shadow: none !important;
  filter: none;
}

.duduq-ts-audio-shell[data-playing="true"] .duduq-ts-audio-waves .duduq-ts-audio-wave {
  background: rgba(255,255,255,.96) !important;
}

.duduq-smart-ts-stimulus {
  flex: 0 0 auto;
  width: min(940px, 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.duduq-smart-ts-stimulus[hidden] {
  display: none;
}

.duduq-smart-ts-image {
  display: block;
  width: clamp(78px, 8.4vw, 108px);
  height: clamp(78px, 8.4vw, 108px);
  object-fit: contain;
  filter: drop-shadow(0 5px 7px rgba(31,65,99,.10));
}

.duduq-smart-ts-dialogue {
  width: min(760px, 100%);
  display: grid;
  gap: 5px;
}

.duduq-smart-ts-dialogue-line {
  display: grid;
  grid-template-columns: auto minmax(0,1fr);
  gap: 8px;
  align-items: baseline;
  padding: 7px 11px;
  border: 2px solid rgba(169,210,238,.74);
  border-radius: 14px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 3px 0 rgba(180,202,219,.62);
  color: #16375B;
  font-size: clamp(14px,1.5vw,18px);
  font-weight: 800;
}

.duduq-smart-ts-dialogue-speaker {
  color: #075AB8;
  font-weight: 900;
}

.duduq-smart-ts-workspace {
  flex: 0 0 auto;
  width: min(900px, 100%);
  min-height: clamp(84px, 11vh, 110px);
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: clamp(9px,1.05vw,12px);
  border: 2px solid #A9D2EE;
  border-radius: 22px;
  background: rgba(255,255,255,.93);
  box-shadow:
    0 5px 0 #B4CADB,
    0 12px 22px rgba(55,99,140,.10),
    inset 0 1px 0 rgba(255,255,255,.96);
}

.duduq-smart-ts-workspace[data-drag-active="true"] {
  border-color: #0B73D1;
  box-shadow:
    0 5px 0 #07549F,
    0 0 0 4px rgba(11,115,209,.12),
    0 12px 22px rgba(55,99,140,.10);
}

.duduq-smart-ts-template {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #16375B;
  font-family: Fredoka, Nunito, ui-rounded, system-ui, sans-serif;
  font-size: clamp(24px,3vw,38px);
  font-weight: 800;
  line-height: 1.18;
  text-align: center;
}

.duduq-smart-ts-slot {
  min-width: clamp(114px,14vw,176px);
  min-height: 54px;
  font-family: inherit;
  font-size: 1em;
  font-weight: 800;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 13px;
  border: 2px dashed #88A8C3;
  border-radius: 16px;
  background: linear-gradient(180deg,#FFFFFF 0%,#F0F8FF 100%);
  color: #075AB8;
  box-shadow: inset 0 1px 0 #fff;
  cursor: pointer;
}

.duduq-smart-ts-slot[data-filled="true"] {
  border-style: solid;
  border-color: #0B73D1;
  background: #EFF7FF;
  box-shadow:
    0 4px 0 #8DB6D5,
    0 0 0 4px rgba(11,115,209,.10);
}

.duduq-smart-ts-sequence {
  width: 100%;
  min-height: 50px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.duduq-smart-ts-empty {
  color: #526D84;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

.duduq-smart-ts-bank-wrap {
  flex: 0 0 auto;
  width: min(900px, 100%);
  display: grid;
  gap: 7px;
}

.duduq-smart-ts-bank-title {
  margin: 0;
  color: #526D84;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.1;
  text-align: center;
}

.duduq-smart-ts-bank {
  width: 100%;
  min-height: 48px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.duduq-smart-ts-token {
  position: relative;
  min-width: 88px;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 12px;
  border: 2px solid #A9D2EE;
  border-radius: 17px;
  background: linear-gradient(180deg,#FFFFFF 0%,#F7FBFF 100%);
  color: #16375B;
  box-shadow:
    0 4px 0 #B4CADB,
    0 8px 15px rgba(55,99,140,.09),
    inset 0 1px 0 #fff;
  font-family: Fredoka,Nunito,ui-rounded,system-ui,sans-serif;
  font-size: clamp(16px,1.9vw,22px);
  font-weight: 900;
  line-height: 1.08;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  transition:
    transform 110ms ease,
    border-color 150ms ease,
    background 150ms ease,
    box-shadow 120ms ease;
}

.duduq-smart-ts-token:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #6CB4E3;
  filter: brightness(1.015);
}

.duduq-smart-ts-token:active:not(:disabled),
.duduq-smart-ts-token[data-dragging="true"] {
  transform: translateY(3px) scale(.992);
  box-shadow: 0 1px 0 #B4CADB;
}

.duduq-smart-ts-token[data-selected="true"] {
  border-color: #0B73D1;
  background: #EFF7FF;
  color: #075AB8;
  box-shadow:
    0 4px 0 #07549F,
    0 0 0 4px rgba(11,115,209,.12);
}

.duduq-smart-ts-token[data-correct="true"] {
  border-color: #58CC02;
  background: #EFFFE7;
  color: #1B5E20;
  box-shadow: 0 4px 0 #359500;
}

.duduq-smart-ts-token[data-retry="true"] {
  border-color: #F08A68;
  background: #FFF4EF;
  color: #9D3823;
  box-shadow: 0 4px 0 #C46343;
}

.duduq-smart-ts-token-media {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.duduq-smart-ts-actions {
  flex: 0 0 auto;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 4px;
  padding-bottom: 8px;
  transform: translateY(-2px);
  overflow: visible;
}

.duduq-smart-ts-confirm,
.duduq-smart-ts-clear {
  min-height: 42px;
  padding: 0 18px;
  border: 2px solid #07549F;
  border-radius: 17px;
  font-family: Fredoka,Nunito,ui-rounded,system-ui,sans-serif;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: .02em;
  text-transform: uppercase;
  cursor: pointer;
}

.duduq-smart-ts-confirm {
  min-width: 164px;
  background: linear-gradient(180deg,#42B6FF 0%,#0B73D1 72%,#07549F 100%);
  color: #fff;
  box-shadow:
    0 2px 0 #07549F,
    0 6px 10px rgba(7,84,159,.12),
    inset 0 2px 0 rgba(255,255,255,.32);
}

.duduq-smart-ts-confirm:disabled {
  border-color: #B8C8D7;
  background: #E3EBF2;
  color: #73869A;
  box-shadow: 0 3px 0 #B4C1CD;
  cursor: default;
}

.duduq-smart-ts-clear {
  border-color: #A9D2EE;
  background: #fff;
  color: #526D84;
  box-shadow: 0 2px 0 #B4CADB;
}

.duduq-smart-ts-clear:disabled {
  opacity: .55;
  cursor: default;
}

.duduq-smart-ts-hint-card {
  flex: 0 0 auto;
  width: min(760px, 100%);
  min-height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 9px;
  margin: 0;
  border: 1px solid rgba(211,171,51,.55);
  border-radius: 12px;
  background: rgba(255,248,219,.88);
  color: #735B13;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
}

.duduq-smart-ts-hint-card[hidden] {
  display: none;
}

.duduq-smart-ts-choice-grid {
  width: min(780px, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(min(220px,100%),1fr));
  gap: 12px;
}

.duduq-smart-ts-choice {
  min-height: 54px;
  padding: 8px 12px;
  border: 2px solid #A9D2EE;
  border-radius: 17px;
  background: linear-gradient(180deg,#FFFFFF 0%,#F7FBFF 100%);
  color: #16375B;
  box-shadow:
    0 4px 0 #B4CADB,
    0 8px 15px rgba(55,99,140,.09);
  font-family: Fredoka,Nunito,ui-rounded,system-ui,sans-serif;
  font-size: clamp(15px,1.8vw,22px);
  font-weight: 900;
  cursor: pointer;
}

.duduq-smart-ts-choice[data-selected="true"] {
  border-color: #0B73D1;
  background: #EFF7FF;
  color: #075AB8;
  box-shadow:
    0 4px 0 #07549F,
    0 0 0 4px rgba(11,115,209,.12);
}

.duduq-smart-ts-drag-ghost {
  position: fixed;
  z-index: 2147480000;
  pointer-events: none;
  opacity: .90;
  transform: translate(-50%,-50%) rotate(-1deg) scale(1.03);
}

@media (max-width: 640px) {
  .duduq-smart-ts-stage {
    inset: 8px 7px 10px;
    gap: 6px;
    padding-top: 4px;
    padding-bottom: 18px;
  }

  .duduq-smart-ts-image {
    width: clamp(70px,17vw,92px);
    height: clamp(70px,17vw,92px);
  }

  .duduq-smart-ts-workspace {
    min-height: 84px;
    padding: 7px 7px;
    border-radius: 18px;
  }

  .duduq-smart-ts-template {
    font-size: clamp(21px,6vw,30px);
  }

  .duduq-smart-ts-token {
    min-width: 74px;
    min-height: 46px;
    padding: 7px 10px;
    font-size: clamp(15px,4.2vw,18px);
  }

  .duduq-smart-ts-bank {
    gap: 8px;
  }

  .duduq-smart-ts-confirm,
  .duduq-smart-ts-clear {
    min-height: 42px;
    padding-inline: 14px;
    font-size: 14px;
  }

  .duduq-smart-ts-confirm {
    min-width: 146px;
  }

  .duduq-smart-ts-actions {
    min-height: 46px;
    padding-bottom: 10px;
    transform: translateY(-5px);
  }
}

@media (max-width: 380px) {
  .duduq-smart-ts-stage {
    inset-inline: 6px;
  }

  .duduq-smart-ts-actions {
    width: 100%;
  }

  .duduq-smart-ts-confirm,
  .duduq-smart-ts-clear {
    min-width: 0;
    flex: 1 1 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .duduq-smart-ts-token {
    transition: none;
  }
}
</style>

<script id="duduq-smart-sentence-4-bootstrap">
(function () {
  "use strict";

  var bundle = ${serializedBundle};
  var COMPLETE_MESSAGE = "DUDUQ_SMART_SENTENCE_COMPLETE";
  var ERROR_MESSAGE = "DUDUQ_SMART_SENTENCE_ERROR";

  function post(type, detail) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          Object.assign(
            { type: type, version: "4.0.8" },
            detail || {}
          ),
          "*"
        );
      }
    } catch (_) {}
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .trim()
      .replace(/\\s+/g, " ")
      .replace(/[.,!?;:'"“”‘’…()[\\]{}]/g, "")
      .toLocaleLowerCase("pt-BR");
  }

  function sameSequence(values, answer) {
    if (!Array.isArray(values) || !Array.isArray(answer)) return false;
    if (values.length !== answer.length) return false;

    return values.every(function (value, index) {
      return normalizeText(value) === normalizeText(answer[index]);
    });
  }

  function shuffle(values, random) {
    var out = values.slice();

    for (var index = out.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor((random || Math.random)() * (index + 1));
      var temp = out[index];
      out[index] = out[swapIndex];
      out[swapIndex] = temp;
    }

    return out;
  }

  function resolveMedia(media, assets) {
    if (!media) return "";
    if (media.assetKey && assets && assets[media.assetKey]) {
      return assets[media.assetKey];
    }
    return media.src || "";
  }

  function speakOrPlay(media, fallbackText, locale) {
    if (media && media.src) {
      try {
        var audioElement = new Audio(media.src);
        audioElement.volume = .72;
        audioElement.play().catch(function () {});
        return;
      } catch (_) {}
    }

    var text =
      (media && media.text) ||
      fallbackText ||
      "";

    if (
      !text ||
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        (media && media.locale) ||
        locale ||
        "en-US";
      utterance.rate = .9;
      utterance.pitch = 1;

      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function adaptContent(content) {
    if (content.renderer !== "smart-sentence") {
      throw new Error(
        "Conteúdo " + content.id +
        " usa renderer " + content.renderer +
        "; esperado smart-sentence."
      );
    }

    if (content.mechanicVersion !== "4.0.8") {
      throw new Error(
        "Conteúdo " + content.id +
        " usa smart-sentence@" + content.mechanicVersion +
        "; runtime disponível: 4.0.8."
      );
    }

    return Object.assign(
      {},
      content.payload || {},
      {
        id: content.id,
        instruction: content.instruction,
        audioText: content.audioText,
        feedback: content.feedback
      }
    );
  }

  function preparePresentation(question, random) {
    var ids = question.tokens.map(function (token) {
      return token.uid;
    });

    if (question.interaction && question.interaction.shuffle !== false) {
      ids = shuffle(ids, random || Math.random);

      var values = ids.map(function (uid) {
        var token = question.tokens.find(function (entry) {
          return entry.uid === uid;
        });

        return token ? token.value : "";
      });

      if (
        ids.length > 1 &&
        question.answer &&
        question.answer.length > 1 &&
        sameSequence(values, question.answer)
      ) {
        ids = ids.slice(1).concat(ids[0]);
      }
    }

    return {
      tokenOrder: ids
    };
  }

  function AudioIcon(React) {
    return React.createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: "23",
        height: "23",
        fill: "none",
        "aria-hidden": "true"
      },
      React.createElement("path", {
        d: "M11 5 6.5 9H3v6h3.5L11 19V5Z",
        fill: "currentColor"
      }),
      React.createElement("path", {
        d: "M15 8.5c1.3 1.8 1.3 5.2 0 7",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round"
      }),
      React.createElement("path", {
        d: "M18 6c2.7 3.4 2.7 8.6 0 12",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round"
      })
    );
  }

  /* EXACT TARGET AMBIENT — same internal decorative nodes. */
  function TargetAmbient(React) {
    return React.createElement(
      "span",
      {
        className: "duduq-ts-ambient",
        "aria-hidden": "true"
      },
      React.createElement("span", {
        className: "duduq-ts-cloud",
        "data-cloud": "a"
      }),
      React.createElement("span", {
        className: "duduq-ts-cloud",
        "data-cloud": "b"
      }),
      React.createElement(
        "span",
        { className: "duduq-ts-sparkle" },
        "✦"
      ),
      React.createElement(
        "span",
        { className: "duduq-ts-sparkle" },
        "✦"
      ),
      React.createElement(
        "span",
        { className: "duduq-ts-sparkle" },
        "★"
      )
    );
  }

  function SmartSentenceTargetShell(props) {
    var React = window.React;

    var useState = React.useState;
    var useMemo = React.useMemo;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useCallback = React.useCallback;

    var question = props.question;
    var presentation = props.presentation;
    var disabled = props.disabled;
    var feedbackState = props.feedbackState;
    var accessibility = props.accessibility || {};
    var audio = props.audio || {};
    var audioActive = Boolean(audio.isPlaying || audio.highlight);
    var assets = props.assets || {};
    var onAnswer = props.onAnswer;
    var onInteraction = props.onInteraction;

    var tokenMap = useMemo(function () {
      return Object.fromEntries(
        question.tokens.map(function (token) {
          return [token.uid, token];
        })
      );
    }, [question.tokens]);

    var orderedTokens = useMemo(function () {
      return presentation.tokenOrder
        .map(function (id) {
          return tokenMap[id];
        })
        .filter(Boolean);
    }, [presentation.tokenOrder, tokenMap]);

    var sequenceModes = new Set([
      "build-sentence",
      "unscramble",
      "listen-build",
      "word-order",
      "syllables",
      "word-build",
      "text-order",
      "dialogue"
    ]);

    var selectionMode =
      question.mode === "image-sentence" &&
      question.answer.length === 1 &&
      question.tokens.some(function (token) {
        return token.value && token.value.split(/\\s+/).length > 2;
      });

    var sequenceMode = sequenceModes.has(question.mode);

    var initialSlots =
      !sequenceMode && !selectionMode
        ? new Array(Math.max(1, question.answer.length)).fill(null)
        : [];

    var stateSequence = useState([]);
    var sequence = stateSequence[0];
    var setSequence = stateSequence[1];

    var stateSlots = useState(initialSlots);
    var slots = stateSlots[0];
    var setSlots = stateSlots[1];

    var stateSelected = useState("");
    var selectedUid = stateSelected[0];
    var setSelectedUid = stateSelected[1];

    var stateErrors = useState(0);
    var errors = stateErrors[0];
    var setErrors = stateErrors[1];

    var stateAnnouncement = useState("");
    var announcement = stateAnnouncement[0];
    var setAnnouncement = stateAnnouncement[1];

    var stateDrag = useState(null);
    var dragging = stateDrag[0];
    var setDragging = stateDrag[1];

    var dragRef = useRef(null);
    var previousFeedbackRef = useRef("idle");
    var submissionLockedRef = useRef(false);

    var presentationKey =
      question.id + "::" + presentation.tokenOrder.join("|");

    useEffect(function () {
      setSequence([]);
      setSlots(initialSlots);
      setSelectedUid("");
      setErrors(0);
      setAnnouncement("");
      setDragging(null);

      dragRef.current = null;
      previousFeedbackRef.current = "idle";
      submissionLockedRef.current = false;
    }, [presentationKey]);

    useEffect(function () {
      var previous = previousFeedbackRef.current;
      previousFeedbackRef.current = feedbackState;

      if (feedbackState === "idle") {
        submissionLockedRef.current = false;
        return;
      }

      if (feedbackState === "success") {
        submissionLockedRef.current = true;
        return;
      }

      if (feedbackState === "retry" && previous !== "retry") {
        submissionLockedRef.current = false;
        setErrors(function (value) {
          return value + 1;
        });
        }
    }, [feedbackState]);

    var placedUids = useMemo(function () {
      var result = sequence.slice();

      slots.forEach(function (uid) {
        if (uid) result.push(uid);
      });

      if (selectedUid) result.push(selectedUid);

      return new Set(result);
    }, [sequence, slots, selectedUid]);

    var availableTokens = useMemo(function () {
      return orderedTokens.filter(function (token) {
        return !placedUids.has(token.uid);
      });
    }, [orderedTokens, placedUids]);

    var answerValues = useMemo(function () {
      if (selectionMode) {
        var selected = tokenMap[selectedUid];
        return selected ? [selected.value] : [];
      }

      if (sequenceMode) {
        return sequence
          .map(function (uid) {
            return tokenMap[uid];
          })
          .filter(Boolean)
          .map(function (token) {
            return token.value;
          });
      }

      return slots
        .map(function (uid) {
          return uid ? tokenMap[uid] : null;
        })
        .filter(Boolean)
        .map(function (token) {
          return token.value;
        });
    }, [
      selectionMode,
      sequenceMode,
      selectedUid,
      sequence,
      slots,
      tokenMap
    ]);

    var ready = selectionMode
      ? Boolean(selectedUid)
      : sequenceMode
        ? answerValues.length === question.answer.length
        : slots.length > 0 && slots.every(Boolean);

    var currentHint = useMemo(function () {
      if (
        !question.hints ||
        !question.hints.length ||
        errors < question.difficulty.hintAfterErrors
      ) {
        return "";
      }

      var eligible = question.hints
        .filter(function (hint) {
          return errors >= Number(hint.afterErrors || 1);
        })
        .sort(function (a, b) {
          return Number(a.afterErrors || 1) -
            Number(b.afterErrors || 1);
        });

      return eligible.length
        ? eligible[eligible.length - 1].text
        : "";
    }, [
      errors,
      question.hints,
      question.difficulty.hintAfterErrors
    ]);

    var interact = useCallback(function () {
      if (typeof onInteraction === "function") {
        onInteraction();
      }
    }, [onInteraction]);

    var speakToken = useCallback(function (token) {
      if (!token) return;

      speakOrPlay(
        token.audio,
        token.spokenText || token.value,
        question.language
      );
    }, [question.language]);

    var addToken = useCallback(function (uid) {
      if (disabled || feedbackState === "success") return;

      var token = tokenMap[uid];
      if (!token) return;

      interact();

      if (selectionMode) {
        setSelectedUid(function (current) {
          return current === uid ? "" : uid;
        });

        speakToken(token);
        setAnnouncement(token.label + " selecionado.");
        return;
      }

      if (sequenceMode) {
        setSequence(function (current) {
          if (current.includes(uid)) return current;
          if (current.length >= question.answer.length) return current;
          return current.concat(uid);
        });

        speakToken(token);
        setAnnouncement(token.label + " adicionado.");
        return;
      }

      setSlots(function (current) {
        if (current.includes(uid)) return current;

        var next = current.slice();
        var slotIndex = next.findIndex(function (value) {
          return !value;
        });

        if (slotIndex < 0) return current;

        next[slotIndex] = uid;
        return next;
      });

      speakToken(token);
      setAnnouncement(token.label + " adicionado.");
    }, [
      disabled,
      feedbackState,
      interact,
      question.answer.length,
      selectionMode,
      sequenceMode,
      speakToken,
      tokenMap
    ]);

    var removeToken = useCallback(function (uid) {
      if (
        disabled ||
        feedbackState === "success" ||
        question.interaction.remove === false
      ) {
        return;
      }

      interact();

      if (selectionMode) {
        if (selectedUid === uid) {
          setSelectedUid("");
        }
        return;
      }

      if (sequenceMode) {
        setSequence(function (current) {
          return current.filter(function (value) {
            return value !== uid;
          });
        });
        return;
      }

      setSlots(function (current) {
        return current.map(function (value) {
          return value === uid ? null : value;
        });
      });
    }, [
      disabled,
      feedbackState,
      interact,
      question.interaction.remove,
      selectedUid,
      selectionMode,
      sequenceMode
    ]);

    var clearAnswer = useCallback(function () {
      if (
        disabled ||
        feedbackState === "success" ||
        question.interaction.remove === false
      ) {
        return;
      }

      interact();

      setSequence([]);
      setSlots(initialSlots);
      setSelectedUid("");
      setAnnouncement("Resposta limpa.");
    }, [
      disabled,
      feedbackState,
      initialSlots,
      interact,
      question.interaction.remove
    ]);

    var moveSequence = useCallback(function (fromIndex, toIndex) {
      if (
        disabled ||
        feedbackState === "success" ||
        question.interaction.reorder === false ||
        fromIndex === toIndex
      ) {
        return;
      }

      interact();

      setSequence(function (current) {
        if (
          fromIndex < 0 ||
          fromIndex >= current.length ||
          toIndex < 0 ||
          toIndex >= current.length
        ) {
          return current;
        }

        var next = current.slice();
        var value = next.splice(fromIndex, 1)[0];
        next.splice(toIndex, 0, value);
        return next;
      });
    }, [
      disabled,
      feedbackState,
      interact,
      question.interaction.reorder
    ]);

    var pointerDown = useCallback(function (
      event,
      uid,
      source,
      index
    ) {
      if (
        disabled ||
        feedbackState === "success" ||
        question.interaction.drag === false
      ) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) return;

      dragRef.current = {
        pointerId: event.pointerId,
        uid: uid,
        source: source,
        index: index,
        overIndex: index,
        startX: event.clientX,
        startY: event.clientY,
        active: false
      };

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (_) {}
    }, [
      disabled,
      feedbackState,
      question.interaction.drag
    ]);

    var pointerMove = useCallback(function (event) {
      var drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      var distance = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY
      );

      if (!drag.active && distance < 7) return;

      if (!drag.active) {
        drag.active = true;
        interact();
      }

      setDragging({
        uid: drag.uid,
        x: event.clientX,
        y: event.clientY
      });

      if (
        drag.source === "sequence" &&
        question.interaction.reorder !== false
      ) {
        var elements =
          document.elementsFromPoint(event.clientX, event.clientY);

        var target = elements.find(function (element) {
          return element &&
            element.getAttribute &&
            element.getAttribute("data-smart-sequence-index") != null;
        });

        if (target) {
          drag.overIndex =
            Number(target.getAttribute("data-smart-sequence-index"));
        }
      }

      event.preventDefault();
    }, [
      interact,
      question.interaction.reorder
    ]);

    var pointerUp = useCallback(function (event) {
      var drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (_) {}

      if (drag.active) {
        if (drag.source === "sequence") {
          moveSequence(drag.index, drag.overIndex);
        } else if (drag.source === "bank") {
          var elements =
            document.elementsFromPoint(event.clientX, event.clientY);

          var overWorkspace =
            elements.some(function (element) {
              return element &&
                element.getAttribute &&
                element.getAttribute("data-smart-workspace") === "true";
            });

          if (overWorkspace) {
            addToken(drag.uid);
          }
        }
      }

      dragRef.current = null;
      setDragging(null);
    }, [addToken, moveSequence]);

    var submit = useCallback(function (event) {
      if (
        !ready ||
        disabled ||
        feedbackState !== "idle" ||
        submissionLockedRef.current
      ) {
        return;
      }

      submissionLockedRef.current = true;

      var isCorrect =
        sameSequence(answerValues, question.answer);

      setAnnouncement(
        isCorrect
          ? "Resposta correta."
          : "Ainda não está correto. Observe e tente novamente."
      );

      onAnswer({
        isCorrect: isCorrect,
        answer: {
          values: answerValues.slice(),
          mode: question.mode
        },
        eventCoords: {
          x: event.clientX,
          y: event.clientY
        },
        metadata: {
          mechanic: "smart-sentence",
          mechanicVersion: "4.0.8",
          shellReference: "target-shooter@1.0.16",
          mode: question.mode,
          errorsBeforeAttempt: errors
        }
      });

      if (isCorrect && question.phraseAudio) {
        window.setTimeout(function () {
          speakOrPlay(
            question.phraseAudio,
            question.answer.join(" "),
            question.language
          );
        }, 260);
      }
    }, [
      answerValues,
      disabled,
      errors,
      feedbackState,
      onAnswer,
      question.answer,
      question.language,
      question.mode,
      question.phraseAudio,
      ready
    ]);

    function renderToken(token, location, index) {
      var selected =
        selectedUid === token.uid ||
        sequence.includes(token.uid) ||
        slots.includes(token.uid);

      var imageSrc = resolveMedia(token.image, assets);

      return React.createElement(
        "button",
        {
          key: location + "::" + token.uid,
          type: "button",
          className: "duduq-smart-ts-token",
          "data-selected": selected ? "true" : "false",
          "data-correct":
            feedbackState === "success" && selected
              ? "true"
              : "false",
          "data-retry":
            feedbackState === "retry" && selected
              ? "true"
              : "false",
          "data-dragging":
            dragging && dragging.uid === token.uid
              ? "true"
              : "false",
          "data-smart-sequence-index":
            location === "sequence"
              ? String(index)
              : undefined,
          disabled:
            disabled ||
            feedbackState === "success",
          onClick: function () {
            if (location === "bank") {
              addToken(token.uid);
            } else {
              removeToken(token.uid);
            }
          },
          onPointerDown: function (event) {
            pointerDown(
              event,
              token.uid,
              location,
              index
            );
          },
          onPointerMove: pointerMove,
          onPointerUp: pointerUp,
          onPointerCancel: pointerUp,
          "aria-label":
            token.label +
            (
              location === "bank"
                ? ". Toque para adicionar."
                : ". Toque para remover."
            )
        },
        imageSrc
          ? React.createElement("img", {
              className: "duduq-smart-ts-token-media",
              src: imageSrc,
              alt: token.image?.alt || "",
              draggable: false
            })
          : null,
        React.createElement(
          "span",
          null,
          token.label
        )
      );
    }

    function renderSentenceWorkspace() {
      var parts =
        String(question.sentence || "")
          .split("____");

      if (parts.length <= 1) {
        parts = [
          question.prefix || "",
          question.suffix || ""
        ];
      }

      var children = [];
      var maxParts =
        Math.max(parts.length, slots.length + 1);

      for (
        var index = 0;
        index < maxParts;
        index += 1
      ) {
        if (
          index < parts.length &&
          parts[index]
        ) {
          children.push(
            React.createElement(
              "span",
              {
                key: "text-" + index
              },
              parts[index]
            )
          );
        }

        if (index < slots.length) {
          var uid = slots[index];
          var token =
            uid ? tokenMap[uid] : null;

          children.push(
            React.createElement(
              "button",
              {
                key: "slot-" + index,
                type: "button",
                className: "duduq-smart-ts-slot",
                "data-filled": token ? "true" : "false",
                "data-smart-workspace": "true",
                disabled:
                  disabled ||
                  feedbackState === "success",
                onClick: function (slotIndex) {
                  return function () {
                    var currentUid =
                      slots[slotIndex];

                    if (currentUid) {
                      removeToken(currentUid);
                    }
                  };
                }(index),
                "aria-label":
                  token
                    ? "Resposta " + token.label + ". Toque para remover."
                    : "Lacuna vazia."
              },
              token ? token.label : "..."
            )
          );
        }
      }

      return React.createElement(
        "div",
        {
          className: "duduq-smart-ts-template",
          "data-smart-workspace": "true"
        },
        children
      );
    }

    function renderSequenceWorkspace() {
      return React.createElement(
        "div",
        {
          className: "duduq-smart-ts-sequence",
          "data-smart-workspace": "true"
        },
        sequence.length
          ? sequence.map(function (uid, index) {
              var token = tokenMap[uid];

              return token
                ? renderToken(
                    token,
                    "sequence",
                    index
                  )
                : null;
            })
          : React.createElement(
              "span",
              {
                className: "duduq-smart-ts-empty"
              },
              question.helperText
            )
      );
    }

    function renderSelectionWorkspace() {
      return React.createElement(
        "div",
        {
          className: "duduq-smart-ts-choice-grid",
          "data-smart-workspace": "true"
        },
        orderedTokens.map(function (token) {
          return React.createElement(
            "button",
            {
              key: token.uid,
              type: "button",
              className: "duduq-smart-ts-choice",
              "data-selected":
                selectedUid === token.uid
                  ? "true"
                  : "false",
              disabled:
                disabled ||
                feedbackState === "success",
              onClick: function () {
                interact();

                setSelectedUid(function (current) {
                  return current === token.uid
                    ? ""
                    : token.uid;
                });

                speakToken(token);
              }
            },
            token.label
          );
        })
      );
    }

    function renderStimulus() {
      var imageSrc =
        resolveMedia(question.image, assets);

      var hasImage = Boolean(imageSrc);
      var hasDialogue =
        question.dialogue &&
        question.dialogue.length;

      if (!hasImage && !hasDialogue) {
        return null;
      }

      return React.createElement(
        "div",
        {
          className: "duduq-smart-ts-stimulus"
        },
        hasImage
          ? React.createElement("img", {
              className: "duduq-smart-ts-image",
              src: imageSrc,
              alt: question.image?.alt || "",
              draggable: false
            })
          : null,
        hasDialogue
          ? React.createElement(
              "div",
              {
                className: "duduq-smart-ts-dialogue"
              },
              question.dialogue.map(function (line) {
                return React.createElement(
                  "div",
                  {
                    key: line.id,
                    className:
                      "duduq-smart-ts-dialogue-line"
                  },
                  React.createElement(
                    "span",
                    {
                      className:
                        "duduq-smart-ts-dialogue-speaker"
                    },
                    line.speaker
                      ? line.speaker + ":"
                      : ""
                  ),
                  React.createElement(
                    "span",
                    null,
                    line.text
                  )
                );
              })
            )
          : null
      );
    }

    var workspaceContent =
      selectionMode
        ? renderSelectionWorkspace()
        : sequenceMode
          ? renderSequenceWorkspace()
          : renderSentenceWorkspace();

    var bankNode =
      selectionMode
        ? null
        : React.createElement(
            "div",
            {
              className: "duduq-smart-ts-bank-wrap"
            },
            React.createElement(
              "p",
              {
                className: "duduq-smart-ts-bank-title"
              },
              question.helperText
            ),
            React.createElement(
              "div",
              {
                className: "duduq-smart-ts-bank"
              },
              availableTokens.map(function (token, index) {
                return renderToken(
                  token,
                  "bank",
                  index
                );
              })
            )
          );

    var ghost =
      dragging && tokenMap[dragging.uid]
        ? React.createElement(
            "div",
            {
              className: "duduq-smart-ts-drag-ghost",
              style: {
                left: dragging.x + "px",
                top: dragging.y + "px"
              },
              "aria-hidden": "true"
            },
            React.createElement(
              "div",
              {
                className: "duduq-smart-ts-token"
              },
              tokenMap[dragging.uid].label
            )
          )
        : null;

    var hasAnswer =
      answerValues.length > 0;

    /* =====================================================
       EXTERNAL TARGET SHOOTER SHELL — EXACT CLASS CONTRACT
       ===================================================== */

    return React.createElement(
      "section",
      {
        className: "duduq-ts-root",
        "data-reduced-motion":
          accessibility.reducedMotion
            ? "true"
            : "false",
        "aria-label":
          "Jogo educativo Smart Sentence"
      },

      React.createElement(
        "div",
        {
          className: "duduq-ts-surface"
        },

        /* EXACT TARGET SHOOTER INSTRUCTION */
        React.createElement(
          "section",
          {
            className: "duduq-ts-instruction",
            "data-has-image":
              question.instructionImage
                ? "true"
                : "false",
            "aria-label": "Instrução"
          },
          question.instructionImage
            ? React.createElement("img", {
                src: question.instructionImage,
                alt: "",
                className:
                  "duduq-ts-instruction-image",
                draggable: false
              })
            : null,
          React.createElement(
            "h2",
            null,
            question.instruction
          ),
          React.createElement(
            "span",
            {
              className: "duduq-ts-audio-shell",
              "data-playing": audioActive ? "true" : "false"
            },
            audioActive
              ? React.createElement(
                  "span",
                  {
                    key: audio.waveKey || 0,
                    className:
                      "duduq-ts-audio-waves",
                    "aria-hidden": "true"
                  },
                  React.createElement("span", {
                    className:
                      "duduq-ts-audio-wave"
                  }),
                  React.createElement("span", {
                    className:
                      "duduq-ts-audio-wave"
                  })
                )
              : null,
            React.createElement(
              "button",
              {
                ref: audio.buttonRef,
                type: "button",
                className:
                  "duduq-ts-audio-button",
                "data-playing": audioActive ? "true" : "false",
                disabled: audio.isPlaying,
                onClick: function () {
                  audio.playInstruction(true);
                },
                "aria-label":
                  audioActive
                    ? "Áudio em reprodução"
                    : "Ouvir instrução"
              },
              AudioIcon(React)
            )
          )
        ),
        /* EXACT TARGET SHOOTER MAIN CARD / ARENA
           ONLY ITS INTERNAL CHILDREN CHANGE. */
        React.createElement(
          "div",
          {
            className: "duduq-ts-arena",
            "data-smart-sentence-shell": "true",
            role: "group",
            "aria-label":
              "Área interativa Smart Sentence",
            "data-disabled":
              disabled ||
              feedbackState === "success"
                ? "true"
                : "false",
            "data-pulse": "idle"
          },

          TargetAmbient(React),

          React.createElement(
            "div",
            {
              className: "duduq-smart-ts-stage",
              "data-mode": question.mode
            },

            renderStimulus(),

            React.createElement(
              "div",
              {
                className:
                  "duduq-smart-ts-workspace",
                "data-smart-workspace": "true",
                "data-drag-active":
                  dragging ? "true" : "false"
              },
              workspaceContent
            ),

            bankNode,

            React.createElement(
              "div",
              {
                className:
                  "duduq-smart-ts-actions"
              },
              React.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "duduq-smart-ts-clear",
                  disabled:
                    !hasAnswer ||
                    disabled ||
                    feedbackState === "success" ||
                    question.interaction.remove === false,
                  onClick: clearAnswer
                },
                "Limpar"
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "duduq-smart-ts-confirm",
                  disabled:
                    !ready ||
                    disabled ||
                    feedbackState !== "idle",
                  onClick: submit
                },
                "Confirmar"
              )
            ),

            React.createElement(
              "p",
              {
                className:
                  "duduq-smart-ts-hint-card",
                hidden: !currentHint
              },
              currentHint
                ? "💡 " + currentHint
                : ""
            )
          ),

          React.createElement(
            "span",
            {
              className: "duduq-ts-sr",
              role: "status",
              "aria-live": "polite"
            },
            announcement
          )
        )
      ),

      ghost
    );
  }

  try {
    var api = window.DuduQDragDrop;
    var React = window.React;
    var ReactDOM = window.ReactDOM;

    if (
      !api ||
      !api.DuduQLessonEnginePreviewHost
    ) {
      throw new Error(
        "Runtime Target Shooter não expôs o DuduQLessonEnginePreviewHost esperado."
      );
    }

    if (!React || !ReactDOM) {
      throw new Error(
        "React/ReactDOM não disponíveis no runtime Target Shooter."
      );
    }

    var root = document.getElementById("root");

    if (!root) {
      throw new Error(
        "Elemento #root não encontrado no runtime Target Shooter."
      );
    }

    var boot =
      document.getElementById("duduq-boot");

    if (boot) boot.hidden = true;

    var registration = {
      id: "smart-sentence",
      version: "4.0.8",

      adaptContent: adaptContent,
      preparePresentation: preparePresentation,

      getInstructionText: function (question) {
        return question.audioText || question.instruction;
      },

      render: function (props) {
        return React.createElement(
          SmartSentenceTargetShell,
          {
            key: props.renderKey,
            question: props.question,
            presentation: props.presentation,
            disabled: props.disabled,
            feedbackState: props.feedbackState,
            accessibility: props.accessibility,
            audio: props.audio,
            assets: props.assets,
            onAnswer: function (result) {
              props.onAnswer(result);
            },
            onInteraction: props.onInteraction
          }
        );
      }
    };

    /*
      Registry mínimo e explícito:
      o Host recebe somente a mecânica Smart Sentence desta release.
      Nenhum registry interno legado do bundle Target é necessário.
    */
    var mechanics = {
      "smart-sentence@4.0.8": registration
    };
    var mascotAssets = {
      idle: {
        src: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/DUDUQ_IDLE.png",
        alt: "Mascote DuduQ aguardando e pronto para ajudar."
      },
      success: {
        src: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/DUDUQ_ACERTO.png",
        alt: "Mascote DuduQ comemorando uma resposta correta."
      },
      retry: {
        src: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/DUDUQ_ERRO.png",
        alt: "Mascote DuduQ incentivando uma nova tentativa."
      },
      transition: {
        src: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/DUDUQ_IDLE.png",
        alt: "Mascote DuduQ preparando a próxima missão."
      },
      complete: {
        src: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Duduq_Li%C3%A7%C3%A3o%20concluida.png",
        alt: "Mascote DuduQ celebrando a conclusão da lição."
      }
    };

    root.replaceChildren();

    var app = React.createElement(
      api.DuduQLessonEnginePreviewHost,
      {
        lesson: bundle.lesson,
        contents: bundle.contents,
        mechanics: mechanics,
        assets: bundle.assets || {},
        mascotAssets: mascotAssets,
        autoPlayInstruction: true,

        onLessonComplete: function () {
          post(COMPLETE_MESSAGE);
        },

        gamificationPolicy: {
          progressStyle: "duolingo",
          showProgressLabel: true,
          showTransition: true,
          transitionDurationMs: 760,
          showMascotDuringTransition: true,
          completionBurst: "subtle"
        }
      }
    );

    if (ReactDOM.createRoot) {
      window.__DUDUQ_SMART_SENTENCE_TARGET_ROOT__ =
        ReactDOM.createRoot(root);

      window.__DUDUQ_SMART_SENTENCE_TARGET_ROOT__
        .render(app);
    } else {
      ReactDOM.render(app, root);
    }

    window.DUDUQ_SMART_SENTENCE = {
      version: "4.0.8",
      ready: true,
      initError: null,
      shellReference: "target-shooter@1.0.16",
      shellRuntime: "2.0.2"
    };
  } catch (error) {
    var message =
      error && error.message
        ? error.message
        : String(error || "Erro desconhecido");

    console.error(
      "[DuduQ Smart Sentence 4] Bootstrap falhou:",
      error
    );

    var boot =
      document.getElementById("duduq-boot");

    if (boot) {
      boot.hidden = false;
      boot.innerHTML =
        '<div id="duduq-runtime-error">' +
        "<strong>Não foi possível iniciar a Smart Sentence.</strong>" +
        "<br><br>" +
        message +
        "</div>";
    }

    window.DUDUQ_SMART_SENTENCE = {
      version: "4.0.8",
      ready: false,
      initError: message,
      shellReference: "target-shooter@1.0.16"
    };

    post(ERROR_MESSAGE, {
      message: message
    });
  }
})();
</script>
`;

    return (
      html.slice(0, closingBody) +
      bootstrap +
      html.slice(closingBody)
    );
  }

  /* =======================================================
     ADAPTER VALIDATION / MOUNT
     ======================================================= */

  function validate(payload) {
    const questions = extractQuestions(payload);

    if (!questions.length) return false;

    try {
      questions
        .map(normalizeQuestion)
        .map(normalizeSmartConfig);

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
      throw new Error(
        "[DuduQ Smart Sentence 4] Container não informado."
      );
    }

    const questions =
      extractQuestions(payload)
        .map(normalizeQuestion);

    if (!questions.length) {
      throw new Error(
        "[DuduQ Smart Sentence 4] Nenhuma questão recebida."
      );
    }

    const configs =
      questions.map(normalizeSmartConfig);

    const contentList =
      configs.map(contentFromConfig);

    const contents =
      Object.fromEntries(
        contentList.map((content) => [
          content.id,
          content
        ])
      );

    const bundle = {
      title: activityTitle(
        payload,
        questions
      ),

      lesson: createLesson(
        payload,
        contents
      ),

      contents,

      assets: collectAssets(
        configs
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
          Number.isFinite(context.stepIndex)
            ? context.stepIndex
            : 0,

        totalSteps:
          Number.isFinite(context.totalSteps)
            ? context.totalSteps
            : 1
      }
    };

    container.innerHTML = "";

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "duduq-mechanic-frame";

    Object.assign(
      wrapper.style,
      {
        width: "100%",
        height: "100%",
        minHeight: "0",
        overflow: "hidden",
        position: "relative"
      }
    );

    const iframe =
      document.createElement("iframe");

    iframe.title =
      "DuduQ — Smart Sentence";

    iframe.setAttribute(
      "allow",
      "autoplay; fullscreen"
    );

    iframe.setAttribute(
      "allowfullscreen",
      ""
    );

    Object.assign(
      iframe.style,
      {
        width: "100%",
        height: "100%",
        minHeight: "0",
        border: "0",
        display: "block",
        background: "transparent"
      }
    );

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    let destroyed = false;
    let completed = false;

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

    function handleMessage(event) {
      if (
        event.source !== iframe.contentWindow ||
        !event.data
      ) {
        return;
      }

      if (
        event.data.type ===
        "DUDUQ_SMART_SENTENCE_COMPLETE"
      ) {
        finish();
        return;
      }

      if (
        event.data.type ===
        "DUDUQ_SMART_SENTENCE_ERROR"
      ) {
        const detail =
          asString(
            event.data.message,
            "Erro desconhecido."
          );

        console.error(
          "[DuduQ Smart Sentence 4] Runtime informou erro:",
          detail
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao iniciar a Smart Sentence: " +
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

    if (context.year != null) {
      params.set(
        "ano",
        String(context.year)
      );
    }

    if (context.moduleId) {
      params.set(
        "module",
        String(context.moduleId)
      );
    }

    params.set(
      "engineAdapter",
      VERSION
    );

    params.set(
      "shellReference",
      TARGET_SHELL_RELEASE
    );

    const runtimeUrl =
      getEngineBase() +
      TARGET_RUNTIME_PATH +
      "?" +
      params.toString();

    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${
              response.status
            } ao carregar Target Shooter.`
          );
        }

        return response.text();
      })
      .then((html) => {
        if (destroyed) return;

        const targetStyles =
          extractTargetShooterStyles(html);

        let prepared =
          suppressTargetDefaultMount(html);

        prepared =
          injectSmartBootstrap(
            prepared,
            bundle,
            targetStyles
          );

        prepared =
          stampYear(
            prepared,
            context.year
          );

        iframe.srcdoc =
          prepared;
      })
      .catch((error) => {
        console.error(
          "[DuduQ Smart Sentence 4] Falha ao preparar Target Shooter shell:",
          error
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao preparar a Smart Sentence: " +
            asString(
              error?.message,
              "falha desconhecida."
            );
        }
      });

    return function destroy() {
      destroyed = true;

      window.removeEventListener(
        "message",
        handleMessage
      );

      try {
        iframe.contentWindow
          ?.speechSynthesis
          ?.cancel?.();
      } catch (_) {}

      try {
        iframe.src =
          "about:blank";
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
      name:
        "Smart Sentence Modular",

      category:
        "language-construction",

      active:
        true,

      acceptsSchema:
        "1.0.0",

      globalProgress:
        true,

      literacyFriendly:
        true,

      shellReference:
        "target-shooter@1.0.16",

      shellRuntime:
        TARGET_RUNTIME_VERSION,

      supportedModes: [
        "complete-sentence",
        "build-sentence",
        "unscramble",
        "word-order",
        "listen-build",
        "listen-complete",
        "image-sentence",
        "dialogue",
        "syllables",
        "word-build",
        "text-order"
      ],

      routerProfile: {
        name:
          "Smart Sentence",

        active:
          true,

        baseScore:
          69,

        answerTypes: [
          "single",
          "sequence"
        ],

        answerTypeWeights: {
          single: 31,
          sequence: 34
        },

        minAlternatives:
          2,

        maxAlternatives:
          40,

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
            "language-construction",
          earlyLiteracy:
            true,
          modular:
            true,
          frozenShell:
            "target-shooter@1.0.16"
        }
      }
    }
  });

  console.info(
    "[DuduQ] Smart Sentence registrado (fine tuning):",
    VERSION,
    "shell:",
    "target-shooter@1.0.16"
  );
})();

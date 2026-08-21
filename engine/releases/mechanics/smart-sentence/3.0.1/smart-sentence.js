/* =========================================================
   DUDUQ MECHANIC — SMART SENTENCE 3.0.1
   MATCHING SHELL / GEOMETRY LOCK / MODULAR LANGUAGE ENGINE

   REGRA ABSOLUTA:
   - a casca visual/funcional vem do Matching 1.0.23;
   - este adapter NAO recria Header, Progress, Mascot, Feedback,
     Completion, Toolbar, Instruction Card ou Confirm;
   - somente registra um renderer novo dentro do Host do Matching;
   - nenhum arquivo do Matching e alterado.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Smart Sentence 3] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "smart-sentence";
  const VERSION = "3.0.1";
  const MATCHING_REFERENCE_RELEASE = "1.0.23";
  const MATCHING_RUNTIME_PATH =
    "/engine/releases/mechanics/matching/1.0.23/DUDUQ_MATCHING.html";

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

  const MODE_ALIASES = Object.freeze({
    "complete_sentence": "complete-sentence",
    "complete-sentence": "complete-sentence",
    "complete": "complete-sentence",
    "build_sentence": "build-sentence",
    "build-sentence": "build-sentence",
    "build": "build-sentence",
    "unscramble": "unscramble",
    "listen_build": "listen-build",
    "listen-build": "listen-build",
    "listen_complete": "listen-complete",
    "listen-complete": "listen-complete",
    "image_sentence": "image-sentence",
    "image-sentence": "image-sentence",
    "word_order": "word-order",
    "word-order": "word-order",
    "dialogue": "dialogue",
    "syllables": "word-order",
    "syllable-order": "word-order",
    "paragraph": "word-order",
    "text-order": "word-order"
  });

  function normalizeMode(value, config) {
    const raw = asString(value, "").toLowerCase().replace(/\s+/g, "_");
    if (MODE_ALIASES[raw]) return MODE_ALIASES[raw];

    if (Array.isArray(config?.words) && Array.isArray(config?.answer)) {
      return "build-sentence";
    }

    return "complete-sentence";
  }

  function normalizeMedia(value) {
    if (!value) return null;

    if (typeof value === "string") {
      return { src: value };
    }

    if (!isObject(value)) return null;

    return {
      src: asString(value.src || value.url),
      assetKey: asString(value.assetKey || value.key),
      alt: asString(value.alt || value.description),
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

    const value = asString(raw?.value || raw?.label || raw?.text || raw?.word);

    return {
      uid: asString(raw?.id, `token-${index + 1}`),
      value,
      label: asString(raw?.label || raw?.text || raw?.word, value),
      spokenText: asString(raw?.spokenText || raw?.speak || raw?.pronunciation, value),
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
          afterErrors: Math.max(1, Number(hint?.afterErrors || hint?.after || index + 1)),
          text: asString(hint?.text || hint?.message)
        };
      })
      .filter((hint) => hint.text);
  }

  function inferGenericConfig(question) {
    const candidates = [
      question?.activity,
      question?.metadata?.activity,
      question?.metadata?.smartSentence
    ];

    for (const candidate of candidates) {
      if (isObject(candidate)) return candidate;
    }

    return null;
  }

  function normalizeSmartConfig(question, index) {
    const source = inferGenericConfig(question);

    if (!source) {
      throw new Error(
        `[DuduQ Smart Sentence 3] Questão ${question?.id || "sem-id"} não possui objeto de atividade linguística.`
      );
    }

    const mode = normalizeMode(
      source.mode || source.type || source.activityMode,
      source
    );

    const rawWords =
      source.words ||
      source.items ||
      source.options ||
      source.bank ||
      [];

    const tokens = Array.isArray(rawWords)
      ? rawWords.map(normalizeToken)
      : [];

    const legacyAnswer = source.answer;
    const answer = Array.isArray(legacyAnswer)
      ? legacyAnswer.map(String)
      : legacyAnswer == null
        ? []
        : [String(legacyAnswer)];

    const prefix = asString(source.prefix);
    const suffix = asString(source.suffix);

    let sentence = asString(source.sentence || source.templateText);

    if (!sentence && (prefix || suffix)) {
      sentence = `${prefix} ____ ${suffix}`.trim();
    }

    const image =
      normalizeMedia(source.image) ||
      (source.imageSrc || source.imageKey
        ? {
            src: asString(source.imageSrc),
            assetKey: asString(source.imageKey),
            alt: asString(source.imageAlt)
          }
        : null);

    const instructionAudio =
      normalizeMedia(source.instructionAudio) ||
      normalizeMedia(source.audio) ||
      normalizeMedia(question?.media?.audio) ||
      normalizeMedia(question?.audio);

    const phraseAudio =
      normalizeMedia(source.phraseAudio || source.correctAudio);

    const dialogue = Array.isArray(source.dialogue)
      ? source.dialogue.map((line, lineIndex) => {
          if (typeof line === "string") {
            return {
              id: `line-${lineIndex + 1}`,
              speaker: "",
              text: line
            };
          }

          return {
            id: asString(line?.id, `line-${lineIndex + 1}`),
            speaker: asString(line?.speaker || line?.role),
            text: asString(line?.text || line?.sentence)
          };
        })
      : [];

    const interaction = {
      tap: source.interaction?.tap !== false,
      drag: source.interaction?.drag !== false,
      reorder: source.interaction?.reorder !== false,
      remove: source.interaction?.remove !== false,
      shuffle: source.interaction?.shuffle !== false
    };

    const normalized = {
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
        question.instruction
      ),
      instructionAudio,
      phraseAudio,
      language: asString(source.language || source.locale, "en-US"),
      sentence,
      prefix,
      suffix,
      tokens,
      answer,
      image,
      dialogue,
      hints: normalizeHints(source.hints || source.tips),
      interaction,
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
      helperText: asString(source.helperText || source.helper),
      selectionMode: asString(source.selectionMode || source.variant)
    };

    if (!normalized.tokens.length) {
      throw new Error(
        `[DuduQ Smart Sentence 3] Questão ${normalized.id}: informe words/items/options/bank.`
      );
    }

    if (!normalized.answer.length) {
      throw new Error(
        `[DuduQ Smart Sentence 3] Questão ${normalized.id}: answer é obrigatório.`
      );
    }

    return normalized;
  }

  function collectAssets(configs) {
    const assets = {};

    configs.forEach((config) => {
      const register = (media) => {
        if (!media?.assetKey || !media?.src) return;
        assets[media.assetKey] = media.src;
      };

      register(config.image);

      config.tokens.forEach((token) => {
        register(token.image);
        register(token.audio);
      });
    });

    return assets;
  }

  function contentFromConfig(config) {
    return {
      id: config.id,
      version: "1.0.0",
      schemaVersion: 1,
      enabled: true,
      editorialStatus: "approved",
      title: config.instruction,
      instruction: config.instruction,
      audioText: config.audioText,
      difficulty: 1,
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
      id: `${asString(payload?.id, "smart-sentence-activity")}-runtime`,
      version: VERSION,
      title: activityTitle(payload, list),
      description: "Smart Sentence modular usando a casca congelada do Matching 1.0.23.",
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
        advanceAfterCorrectMs: 1350,
        retryFeedbackDurationMs: 1050,
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
        delayMs: 12000,
        action: "replay-instruction",
        maximumAutomaticReplays: 1
      }
    };
  }

  function suppressDefaultMount(html) {
    const pattern =
      /\(function mountDuduQMatching\(\) \{[\s\S]*?\}\)\(\);/;

    if (!pattern.test(html)) {
      throw new Error(
        "[DuduQ Smart Sentence 3] Inicialização automática do Matching não encontrada."
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

  function escapeScriptJson(value) {
    return JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }

  function injectSmartBootstrap(html, bundle) {
    const closingBody = html.lastIndexOf("</body>");

    if (closingBody < 0) {
      throw new Error(
        "[DuduQ Smart Sentence 3] Fechamento </body> não encontrado no runtime Matching."
      );
    }

    const serializedBundle = escapeScriptJson(bundle);

    const bootstrap = `
<style id="duduq-smart-sentence-3-panel-only">
/* ============================================================
   SMART SENTENCE 3.0.1 — SOMENTE CONTEUDO DO CARD PRINCIPAL
   PROIBIDO estilizar Header, Instruction, Feedback, Progress,
   Mascot, Toolbar, Completion ou Action Button.
   ============================================================ */


/* ============================================================
   GEOMETRY LOCK — REFERENCIA VISUAL MATCHING CANONICA
   Enunciado: 760px
   Board principal: 980px
   Somente a instancia Smart recebe o lock de board.
   ============================================================ */

/* O card de enunciado mantém a estrutura/classes do Matching,
   mas volta à largura canônica da referência homologada. */
html body #root .duduq-engine-stage .duduq-matching-instruction {
  width: min(760px, calc(100% - 24px)) !important;
  max-width: 760px !important;
}

/* O board continua sendo o componente Matching.
   data-smart-sentence-shell limita somente esta instância. */
html body #root .duduq-engine-stage
.duduq-matching-board[data-smart-sentence-shell="true"] {
  box-sizing: border-box !important;
  width: min(980px, calc(100% - 24px)) !important;
  max-width: 980px !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  align-self: center !important;
  align-content: center !important;
  padding: clamp(14px, 2vh, 18px) clamp(16px, 2vw, 22px) !important;
}

/* Evita que o conteúdo linguístico esvazie visualmente o board
   ou recrie um segundo "card gigante" dentro dele. */
.duduq-matching-board[data-smart-sentence-shell="true"]
> .duduq-smart-stage {
  min-height: 0 !important;
}

.duduq-matching-board[data-smart-sentence-shell="true"]
.duduq-smart-stimulus-image {
  width: clamp(88px, 9.5vw, 124px);
  height: clamp(88px, 9.5vw, 124px);
}

.duduq-matching-board[data-smart-sentence-shell="true"]
.duduq-smart-workspace {
  width: min(840px, 100%);
  min-height: clamp(96px, 15vh, 142px);
  padding: clamp(10px, 1.4vw, 15px);
}

.duduq-matching-board[data-smart-sentence-shell="true"]
.duduq-smart-bank-wrap {
  width: min(840px, 100%);
}

@media (min-width: 900px) and (max-height: 720px) {
  html body #root .duduq-engine-stage .duduq-matching-instruction {
    min-height: 54px !important;
  }

  html body #root .duduq-engine-stage
  .duduq-matching-board[data-smart-sentence-shell="true"] {
    padding-block: 12px !important;
  }

  .duduq-matching-board[data-smart-sentence-shell="true"]
  .duduq-smart-stimulus-image {
    width: 82px;
    height: 82px;
  }

  .duduq-matching-board[data-smart-sentence-shell="true"]
  .duduq-smart-workspace {
    min-height: 90px;
  }
}

@media (max-width: 720px) {
  html body #root .duduq-engine-stage .duduq-matching-instruction {
    width: calc(100% - 16px) !important;
    max-width: none !important;
  }

  html body #root .duduq-engine-stage
  .duduq-matching-board[data-smart-sentence-shell="true"] {
    width: calc(100% - 16px) !important;
    max-width: none !important;
    padding: 10px 9px 12px !important;
  }
}

.duduq-matching-board > .duduq-smart-stage {
  grid-column: 1 / -1;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.5vh, 16px);
  padding: clamp(4px, .8vw, 10px);
  color: var(--dq-text);
  font-family: Nunito, ui-rounded, system-ui, sans-serif;
  touch-action: manipulation;
}

.duduq-smart-stage * {
  box-sizing: border-box;
}

.duduq-smart-stimulus {
  width: min(900px, 100%);
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.duduq-smart-stimulus[hidden] {
  display: none;
}

.duduq-smart-stimulus-image {
  display: block;
  width: clamp(92px, 11vw, 142px);
  height: clamp(92px, 11vw, 142px);
  object-fit: contain;
  filter: drop-shadow(0 4px 7px rgba(31,65,99,.08));
}

.duduq-smart-dialogue {
  width: min(780px, 100%);
  display: grid;
  gap: 7px;
}

.duduq-smart-dialogue-line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  padding: 7px 11px;
  border-radius: 14px;
  background: rgba(255,255,255,.68);
  color: var(--dq-heading);
  font-size: clamp(14px, 1.5vw, 18px);
  font-weight: 800;
}

.duduq-smart-dialogue-speaker {
  color: var(--dq-primary);
  font-weight: 900;
}

.duduq-smart-workspace {
  width: min(940px, 100%);
  min-height: clamp(118px, 20vh, 190px);
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: clamp(12px, 1.6vw, 18px);
  border: 2px solid var(--dq-border-strong);
  border-radius: 20px;
  background: linear-gradient(180deg,#FFFFFF 0%,#FAFCFE 100%);
  box-shadow:
    0 4px 0 var(--dq-depth),
    0 10px 18px rgba(31,65,99,.075),
    inset 0 1px 0 #fff;
}

.duduq-smart-workspace[data-drop-active="true"] {
  border-color: var(--dq-primary);
  box-shadow:
    0 4px 0 var(--dq-primary-depth),
    0 0 0 4px rgba(0,86,179,.12),
    0 11px 20px rgba(0,86,179,.10);
}

.duduq-smart-sentence-template {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--dq-heading);
  font-family: Fredoka, Nunito, sans-serif;
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
}

.duduq-smart-slot {
  min-width: clamp(118px, 15vw, 180px);
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 13px;
  border: 2px dashed #8CA2B8;
  border-radius: 16px;
  background: linear-gradient(180deg,#FBFDFF,#F0F6FC);
  color: var(--dq-primary);
  box-shadow: inset 0 1px 0 #fff;
}

.duduq-smart-slot[data-filled="true"] {
  border-style: solid;
  border-color: var(--dq-primary);
  background: var(--dq-selected-bg);
  box-shadow:
    0 4px 0 #89ADD2,
    0 0 0 4px rgba(0,86,179,.10);
}

.duduq-smart-sequence {
  width: 100%;
  min-height: 68px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.duduq-smart-empty {
  color: var(--dq-muted);
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

.duduq-smart-bank-wrap {
  width: min(940px, 100%);
  display: grid;
  gap: 7px;
}

.duduq-smart-bank-title {
  margin: 0;
  color: var(--dq-muted);
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
}

.duduq-smart-bank {
  width: 100%;
  min-height: 62px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.duduq-smart-token {
  position: relative;
  min-width: 96px;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 15px;
  border: 2px solid var(--dq-border-strong);
  border-radius: 17px;
  background: linear-gradient(180deg,#FFFFFF 0%,#FAFCFE 100%);
  color: var(--dq-text);
  box-shadow:
    0 4px 0 var(--dq-depth),
    0 8px 15px rgba(31,65,99,.07),
    inset 0 1px 0 #fff;
  font-family: Nunito, ui-rounded, system-ui, sans-serif;
  font-size: clamp(16px, 1.7vw, 21px);
  font-weight: 900;
  line-height: 1.08;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  transition:
    transform 110ms ease,
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 120ms ease,
    opacity 120ms ease;
}

.duduq-smart-token:hover:not(:disabled) {
  border-color: #91ABC3;
  transform: translateY(-2px);
  filter: brightness(1.015);
}

.duduq-smart-token:active:not(:disabled),
.duduq-smart-token[data-dragging="true"] {
  transform: translateY(3px) scale(.992);
  box-shadow:
    0 1px 0 var(--dq-depth),
    0 4px 8px rgba(31,65,99,.06);
}

.duduq-smart-token[data-selected="true"] {
  border-color: var(--dq-primary);
  background: var(--dq-selected-bg);
  color: var(--dq-primary);
  box-shadow:
    0 4px 0 var(--dq-primary-depth),
    0 0 0 4px rgba(0,86,179,.12);
}

.duduq-smart-token[data-correct="true"] {
  border-color: var(--dq-success-border);
  background: var(--dq-success-bg);
  color: var(--dq-success-text);
  box-shadow:
    0 4px 0 var(--dq-success-depth),
    0 10px 18px rgba(70,163,2,.10);
}

.duduq-smart-token[data-retry="true"] {
  border-color: var(--dq-retry-border);
  background: var(--dq-retry-bg);
  color: var(--dq-retry-text);
  box-shadow:
    0 4px 0 var(--dq-retry-depth),
    0 10px 18px rgba(183,28,28,.08);
}

.duduq-smart-token-media {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.duduq-smart-hint {
  width: min(820px, 100%);
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 0;
  padding: 5px 10px;
  border-radius: 12px;
  background: rgba(255,248,219,.72);
  color: #735B13;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
}

.duduq-smart-hint[hidden] {
  display: none;
}

.duduq-smart-mini-audio {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 2px solid var(--dq-primary-depth);
  border-radius: 999px;
  background: linear-gradient(180deg,#1471CF,var(--dq-primary));
  color: #fff;
  box-shadow: 0 3px 0 var(--dq-primary-depth);
  cursor: pointer;
}

.duduq-smart-mini-audio svg {
  width: 18px;
  height: 18px;
}

.duduq-smart-selection-list {
  width: min(840px, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: 12px;
}

.duduq-smart-selection-choice {
  min-height: 64px;
  padding: 10px 14px;
  border: 2px solid var(--dq-border-strong);
  border-radius: 17px;
  background: linear-gradient(180deg,#FFFFFF 0%,#FAFCFE 100%);
  color: var(--dq-text);
  box-shadow:
    0 4px 0 var(--dq-depth),
    0 8px 15px rgba(31,65,99,.07),
    inset 0 1px 0 #fff;
  font-size: clamp(15px,1.5vw,19px);
  font-weight: 900;
  cursor: pointer;
}

.duduq-smart-selection-choice[data-selected="true"] {
  border-color: var(--dq-primary);
  background: var(--dq-selected-bg);
  color: var(--dq-primary);
  box-shadow:
    0 4px 0 var(--dq-primary-depth),
    0 0 0 4px rgba(0,86,179,.12);
}

.duduq-smart-drag-ghost {
  position: fixed;
  z-index: 2147480000;
  pointer-events: none;
  opacity: .88;
  transform: translate(-50%,-50%) rotate(-1deg) scale(1.03);
}

@media (max-width: 720px) {
  .duduq-matching-board > .duduq-smart-stage {
    gap: 8px;
    padding: 3px;
  }

  .duduq-smart-stimulus-image {
    width: clamp(82px, 24vw, 110px);
    height: clamp(82px, 24vw, 110px);
  }

  .duduq-smart-workspace {
    min-height: 104px;
    padding: 10px 8px;
    border-radius: 17px;
  }

  .duduq-smart-sentence-template {
    font-size: clamp(21px, 6vw, 30px);
  }

  .duduq-smart-token {
    min-width: 78px;
    min-height: 48px;
    padding: 7px 10px;
    font-size: clamp(15px, 4.3vw, 18px);
  }

  .duduq-smart-bank {
    gap: 8px;
  }
}

@media (min-width: 900px) and (max-height: 700px) {
  .duduq-matching-board > .duduq-smart-stage {
    gap: 7px;
    padding-block: 2px;
  }

  .duduq-smart-stimulus-image {
    width: 88px;
    height: 88px;
  }

  .duduq-smart-workspace {
    min-height: 94px;
    padding-block: 8px;
  }

  .duduq-smart-token {
    min-height: 46px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .duduq-smart-token {
    transition: none;
  }
}
</style>

<script id="duduq-smart-sentence-3-bootstrap">
(function () {
  "use strict";

  var bundle = ${serializedBundle};
  var COMPLETE_MESSAGE = "DUDUQ_SMART_SENTENCE_COMPLETE";
  var ERROR_MESSAGE = "DUDUQ_SMART_SENTENCE_ERROR";

  function post(type, detail) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          Object.assign({ type: type, version: "3.0.1" }, detail || {}),
          "*"
        );
      }
    } catch (_) {}
  }

  function mascotAsset(value, fallbackAlt) {
    if (!value) return { src: "", alt: fallbackAlt };
    if (typeof value === "string") return { src: value, alt: fallbackAlt };
    return {
      src: value.src || "",
      alt: value.alt || fallbackAlt
    };
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/\\s+/g, " ")
      .replace(/[.,!?;:'"“”‘’…()[\\]{}]/g, "")
      .toLocaleLowerCase("en-US");
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
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor((random || Math.random)() * (i + 1));
      var temp = out[i];
      out[i] = out[j];
      out[j] = temp;
    }
    return out;
  }

  function audioIcon(React) {
    return React.createElement(
      "svg",
      { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
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

  function playMedia(media, fallbackText, locale) {
    if (media && media.src) {
      try {
        var element = new Audio(media.src);
        element.play().catch(function () {});
        return;
      } catch (_) {}
    }

    var text =
      (media && media.text) ||
      fallbackText ||
      "";

    if (!text || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = (media && media.locale) || locale || "en-US";
      utterance.rate = .9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function resolveMediaSource(media, assets) {
    if (!media) return "";
    if (media.assetKey && assets && assets[media.assetKey]) return assets[media.assetKey];
    return media.src || "";
  }

  function adaptContent(content) {
    if (content.renderer !== "smart-sentence") {
      throw new Error(
        "Conteudo " + content.id +
        " usa renderer " + content.renderer +
        "; esperado smart-sentence."
      );
    }

    if (content.mechanicVersion !== "3.0.1") {
      throw new Error(
        "Conteudo " + content.id +
        " usa smart-sentence@" + content.mechanicVersion +
        "; runtime disponivel: smart-sentence@3.0.1."
      );
    }

    return Object.assign({}, content.payload, {
      id: content.id,
      instruction: content.instruction,
      audioText: content.audioText,
      feedback: content.feedback
    });
  }

  function preparePresentation(question, random) {
    var order = question.tokens.map(function (token) { return token.uid; });

    if (question.interaction && question.interaction.shuffle !== false) {
      order = shuffle(order, random || Math.random);

      if (
        question.answer &&
        question.answer.length > 1 &&
        sameSequence(
          order.map(function (uid) {
            var token = question.tokens.find(function (item) { return item.uid === uid; });
            return token ? token.value : "";
          }),
          question.answer
        )
      ) {
        order = order.slice(1).concat(order[0]);
      }
    }

    return {
      tokenOrder: order
    };
  }

  function SmartSentenceMechanic(props) {
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
        .map(function (id) { return tokenMap[id]; })
        .filter(Boolean);
    }, [presentation.tokenOrder, tokenMap]);

    var sequenceModes = new Set([
      "build-sentence",
      "unscramble",
      "listen-build",
      "word-order"
    ]);

    var selectionMode =
      question.mode === "image-sentence" &&
      question.answer.length === 1 &&
      question.tokens.some(function (token) {
        return token.value && token.value.split(/\\s+/).length > 2;
      });

    var sequenceMode = sequenceModes.has(question.mode) || question.mode === "dialogue";

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

    var stateSelection = useState("");
    var selectedUid = stateSelection[0];
    var setSelectedUid = stateSelection[1];

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
    var workspaceRef = useRef(null);

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
      submissionLockedRef.current = false;
      previousFeedbackRef.current = "idle";
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
        setErrors(function (value) { return value + 1; });
      }
    }, [feedbackState]);

    var placedUids = useMemo(function () {
      var all = sequence.slice();
      slots.forEach(function (uid) {
        if (uid) all.push(uid);
      });
      if (selectedUid) all.push(selectedUid);
      return new Set(all);
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
          .map(function (uid) { return tokenMap[uid]; })
          .filter(Boolean)
          .map(function (token) { return token.value; });
      }

      return slots
        .map(function (uid) { return uid ? tokenMap[uid] : null; })
        .filter(Boolean)
        .map(function (token) { return token.value; });
    }, [selectionMode, sequenceMode, selectedUid, sequence, slots, tokenMap]);

    var ready = selectionMode
      ? Boolean(selectedUid)
      : sequenceMode
        ? answerValues.length === question.answer.length
        : slots.length > 0 && slots.every(Boolean);

    var currentHint = useMemo(function () {
      if (!question.hints || !question.hints.length || errors < 1) return "";

      var eligible = question.hints
        .filter(function (hint) {
          return errors >= Number(hint.afterErrors || 1);
        })
        .sort(function (a, b) {
          return Number(a.afterErrors || 1) - Number(b.afterErrors || 1);
        });

      return eligible.length
        ? eligible[eligible.length - 1].text
        : "";
    }, [errors, question.hints]);

    var touch = useCallback(function () {
      if (typeof onInteraction === "function") onInteraction();
    }, [onInteraction]);

    var speakToken = useCallback(function (token) {
      if (!token) return;
      playMedia(token.audio, token.spokenText || token.value, question.language);
    }, [question.language]);

    var addToken = useCallback(function (uid) {
      if (disabled || feedbackState === "success") return;

      var token = tokenMap[uid];
      if (!token) return;

      touch();

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
        var index = next.findIndex(function (value) { return !value; });
        if (index < 0) return current;
        next[index] = uid;
        return next;
      });

      speakToken(token);
      setAnnouncement(token.label + " adicionado.");
    }, [
      disabled,
      feedbackState,
      question.answer.length,
      selectionMode,
      sequenceMode,
      speakToken,
      tokenMap,
      touch
    ]);

    var removeToken = useCallback(function (uid) {
      if (disabled || feedbackState === "success" || question.interaction.remove === false) {
        return;
      }

      touch();

      if (selectionMode) {
        if (selectedUid === uid) setSelectedUid("");
        return;
      }

      if (sequenceMode) {
        setSequence(function (current) {
          return current.filter(function (value) { return value !== uid; });
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
      question.interaction.remove,
      selectedUid,
      selectionMode,
      sequenceMode,
      touch
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

      touch();

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
        var item = next.splice(fromIndex, 1)[0];
        next.splice(toIndex, 0, item);
        return next;
      });
    }, [
      disabled,
      feedbackState,
      question.interaction.reorder,
      touch
    ]);

    var onPointerDownToken = useCallback(function (event, uid, source, index) {
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
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        overIndex: index
      };

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (_) {}
    }, [
      disabled,
      feedbackState,
      question.interaction.drag
    ]);

    var onPointerMoveToken = useCallback(function (event) {
      var drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      var distance = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY
      );

      if (!drag.active && distance < 7) return;

      if (!drag.active) {
        drag.active = true;
        touch();
        setDragging({
          uid: drag.uid,
          x: event.clientX,
          y: event.clientY
        });
      } else {
        setDragging({
          uid: drag.uid,
          x: event.clientX,
          y: event.clientY
        });
      }

      if (drag.source === "sequence" && question.interaction.reorder !== false) {
        var elements = document.elementsFromPoint(event.clientX, event.clientY);
        var target = elements.find(function (element) {
          return element &&
            element.getAttribute &&
            element.getAttribute("data-smart-sequence-index") != null;
        });

        if (target) {
          drag.overIndex = Number(target.getAttribute("data-smart-sequence-index"));
        }
      }

      event.preventDefault();
    }, [
      question.interaction.reorder,
      touch
    ]);

    var onPointerUpToken = useCallback(function (event) {
      var drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (_) {}

      if (drag.active) {
        if (drag.source === "sequence") {
          moveSequence(drag.index, drag.overIndex);
        } else if (drag.source === "bank") {
          var elements = document.elementsFromPoint(event.clientX, event.clientY);
          var overWorkspace = elements.some(function (element) {
            return element &&
              element.getAttribute &&
              element.getAttribute("data-smart-workspace") === "true";
          });

          if (overWorkspace) addToken(drag.uid);
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

      var isCorrect = sameSequence(answerValues, question.answer);

      setAnnouncement(
        isCorrect
          ? "Resposta correta."
          : "Ainda não está correto. Observe a organização e tente novamente."
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
          mechanicVersion: "3.0.1",
          mode: question.mode,
          errorsBeforeAttempt: errors
        }
      });
    }, [
      answerValues,
      disabled,
      errors,
      feedbackState,
      onAnswer,
      question.answer,
      question.mode,
      ready
    ]);

    function renderToken(token, location, index) {
      var selectedNow =
        selectedUid === token.uid ||
        sequence.includes(token.uid) ||
        slots.includes(token.uid);

      var correctVisual = feedbackState === "success" && selectedNow;
      var retryVisual = feedbackState === "retry" && selectedNow;
      var imageSrc = resolveMediaSource(token.image, assets);

      return React.createElement(
        "button",
        {
          key: location + "::" + token.uid,
          type: "button",
          className: "duduq-smart-token",
          "data-selected": selectedNow ? "true" : "false",
          "data-correct": correctVisual ? "true" : "false",
          "data-retry": retryVisual ? "true" : "false",
          "data-dragging":
            dragging && dragging.uid === token.uid ? "true" : "false",
          "data-smart-sequence-index":
            location === "sequence" ? String(index) : undefined,
          disabled: disabled || feedbackState === "success",
          onClick: function () {
            if (location === "bank") addToken(token.uid);
            else removeToken(token.uid);
          },
          onPointerDown: function (event) {
            onPointerDownToken(event, token.uid, location, index);
          },
          onPointerMove: onPointerMoveToken,
          onPointerUp: onPointerUpToken,
          onPointerCancel: onPointerUpToken,
          "aria-label":
            token.label +
            (location === "bank"
              ? ". Toque para adicionar."
              : ". Toque para remover.")
        },
        imageSrc
          ? React.createElement("img", {
              className: "duduq-smart-token-media",
              src: imageSrc,
              alt: token.image?.alt || ""
            })
          : null,
        React.createElement("span", null, token.label)
      );
    }

    function renderSentenceWorkspace() {
      var parts = String(question.sentence || "")
        .split("____");

      if (parts.length <= 1) {
        parts = [
          question.prefix || "",
          question.suffix || ""
        ];
      }

      var children = [];

      for (var index = 0; index < Math.max(parts.length, slots.length + 1); index += 1) {
        if (index < parts.length && parts[index]) {
          children.push(
            React.createElement(
              "span",
              { key: "text-" + index },
              parts[index]
            )
          );
        }

        if (index < slots.length) {
          var uid = slots[index];
          var token = uid ? tokenMap[uid] : null;

          children.push(
            React.createElement(
              "span",
              {
                key: "slot-" + index,
                className: "duduq-smart-slot",
                "data-filled": token ? "true" : "false",
                "data-smart-workspace": "true",
                onClick: function (slotIndex) {
                  return function () {
                    var currentUid = slots[slotIndex];
                    if (currentUid) removeToken(currentUid);
                  };
                }(index)
              },
              token ? token.label : "..."
            )
          );
        }
      }

      return React.createElement(
        "div",
        {
          className: "duduq-smart-sentence-template",
          "data-smart-workspace": "true"
        },
        children
      );
    }

    function renderSequenceWorkspace() {
      return React.createElement(
        "div",
        {
          className: "duduq-smart-sequence",
          "data-smart-workspace": "true"
        },
        sequence.length
          ? sequence.map(function (uid, index) {
              var token = tokenMap[uid];
              return token
                ? renderToken(token, "sequence", index)
                : null;
            })
          : React.createElement(
              "span",
              { className: "duduq-smart-empty" },
              question.helperText ||
                "Toque ou arraste as palavras para montar a resposta."
            )
      );
    }

    function renderSelectionWorkspace() {
      return React.createElement(
        "div",
        {
          className: "duduq-smart-selection-list",
          "data-smart-workspace": "true"
        },
        orderedTokens.map(function (token) {
          return React.createElement(
            "button",
            {
              key: token.uid,
              type: "button",
              className: "duduq-smart-selection-choice",
              "data-selected": selectedUid === token.uid ? "true" : "false",
              disabled: disabled || feedbackState === "success",
              onClick: function () {
                touch();
                setSelectedUid(function (current) {
                  return current === token.uid ? "" : token.uid;
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
      var imageSrc = resolveMediaSource(question.image, assets);
      var hasImage = Boolean(imageSrc);
      var hasDialogue = question.dialogue && question.dialogue.length;

      if (!hasImage && !hasDialogue) return null;

      return React.createElement(
        "div",
        {
          className: "duduq-smart-stimulus"
        },
        hasImage
          ? React.createElement("img", {
              className: "duduq-smart-stimulus-image",
              src: imageSrc,
              alt: question.image?.alt || ""
            })
          : null,
        hasDialogue
          ? React.createElement(
              "div",
              { className: "duduq-smart-dialogue" },
              question.dialogue.map(function (line) {
                return React.createElement(
                  "div",
                  {
                    key: line.id,
                    className: "duduq-smart-dialogue-line"
                  },
                  React.createElement(
                    "span",
                    { className: "duduq-smart-dialogue-speaker" },
                    line.speaker ? line.speaker + ":" : ""
                  ),
                  React.createElement("span", null, line.text)
                );
              })
            )
          : null
      );
    }

    var hintNode = React.createElement(
      "p",
      {
        className: "duduq-smart-hint",
        hidden: !currentHint
      },
      currentHint ? "💡 " + currentHint : ""
    );

    var bankNode = selectionMode
      ? null
      : React.createElement(
          "div",
          { className: "duduq-smart-bank-wrap" },
          React.createElement(
            "p",
            { className: "duduq-smart-bank-title" },
            question.helperText || "Escolha, arraste ou reorganize os elementos."
          ),
          React.createElement(
            "div",
            { className: "duduq-smart-bank" },
            availableTokens.map(function (token, index) {
              return renderToken(token, "bank", index);
            })
          )
        );

    var workspaceContent = selectionMode
      ? renderSelectionWorkspace()
      : sequenceMode
        ? renderSequenceWorkspace()
        : renderSentenceWorkspace();

    var ghostToken =
      dragging && tokenMap[dragging.uid]
        ? React.createElement(
            "div",
            {
              className: "duduq-smart-drag-ghost",
              style: {
                left: dragging.x + "px",
                top: dragging.y + "px"
              },
              "aria-hidden": "true"
            },
            React.createElement(
              "div",
              { className: "duduq-smart-token" },
              tokenMap[dragging.uid].label
            )
          )
        : null;

    return React.createElement(
      "section",
      {
        className: "duduq-matching-root",
        "data-reduced-motion":
          accessibility.reducedMotion ? "true" : "false",
        "aria-label": "Atividade Smart Sentence"
      },
      React.createElement(
        "div",
        { className: "duduq-matching-surface" },

        /* CARD DE ENUNCIADO — ESTRUTURA EXATA DO MATCHING */
        React.createElement(
          "header",
          { className: "duduq-matching-instruction" },
          React.createElement("span", {
            className: "duduq-matching-instruction-spacer",
            "aria-hidden": "true"
          }),
          React.createElement(
            "h2",
            { className: "duduq-matching-display" },
            question.instruction
          ),
          React.createElement(
            "span",
            {
              className: "duduq-matching-audio-shell",
              "data-highlight": audio.highlight ? "true" : "false"
            },
            React.createElement(
              "span",
              {
                key: audio.waveKey,
                className: "duduq-matching-audio-waves",
                "aria-hidden": "true"
              },
              React.createElement("span", {
                className: "duduq-matching-audio-wave"
              }),
              React.createElement("span", {
                className: "duduq-matching-audio-wave"
              })
            ),
            React.createElement(
              "button",
              {
                ref: audio.buttonRef,
                type: "button",
                className: "duduq-matching-audio",
                "data-playing":
                  audio.isPlaying && !audio.activeAudioKey
                    ? "true"
                    : "false",
                "aria-label":
                  audio.isPlaying && !audio.activeAudioKey
                    ? "Instrução em reprodução"
                    : "Ouvir instrução",
                disabled:
                  disabled ||
                  audio.isPlaying ||
                  !question.audioText,
                onClick: function () {
                  audio.playInstruction(true);
                }
              },
              audioIcon(React)
            )
          )
        ),

        /* CARD PRINCIPAL DO MATCHING — SOMENTE O INTERIOR MUDA */
        React.createElement(
          "div",
          {
            ref: workspaceRef,
            className: "duduq-matching-board",
            "data-smart-sentence-shell": "true",
            "data-has-visual":
              question.image ? "true" : "false",
            "data-density": "comfortable",
            "data-pair-count": "2"
          },
          React.createElement(
            "div",
            {
              className: "duduq-smart-stage",
              "data-mode": question.mode
            },
            renderStimulus(),
            React.createElement(
              "div",
              {
                className: "duduq-smart-workspace",
                "data-smart-workspace": "true",
                "data-drop-active":
                  dragging ? "true" : "false"
              },
              workspaceContent
            ),
            bankNode,
            hintNode
          )
        ),

        /* BOTAO CONFIRMAR — COMPONENTE EXATO DO MATCHING */
        React.createElement(
          "div",
          {
            className: "duduq-matching-action-slot",
            "data-feedback-state": feedbackState
          },
          feedbackState === "idle"
            ? React.createElement(
                "button",
                {
                  type: "button",
                  className: "duduq-matching-primary",
                  disabled: !ready || disabled,
                  onClick: submit,
                  "aria-label": "Confirmar resposta"
                },
                "CONFIRMAR"
              )
            : null
        )
      ),
      React.createElement(
        "output",
        {
          className: "duduq-matching-live",
          "aria-live": "polite",
          "aria-atomic": "true"
        },
        accessibility.announceResults === false
          ? ""
          : announcement
      ),
      ghostToken
    );
  }

  try {
    var api = window.DuduQMatching;
    var React = window.React;
    var ReactDOM = window.ReactDOM;

    if (
      !api ||
      !api.DuduQLessonEnginePreviewHost ||
      !api.MATCHING_RUNTIME_REGISTRY
    ) {
      throw new Error(
        "Runtime Matching não expôs a API universal esperada."
      );
    }

    if (!React || !ReactDOM) {
      throw new Error(
        "React/ReactDOM não estão disponíveis no runtime Matching."
      );
    }

    var root = document.getElementById("root");
    if (!root) {
      throw new Error("Elemento #root não encontrado no runtime Matching.");
    }

    var boot = document.getElementById("duduq-boot");
    if (boot) boot.hidden = true;

    var registration = {
      id: "smart-sentence",
      version: "3.0.1",
      adaptContent: adaptContent,
      preparePresentation: preparePresentation,
      getInstructionText: function (question) {
        return question.audioText || question.instruction;
      },
      render: function (props) {
        return React.createElement(SmartSentenceMechanic, {
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
        });
      }
    };

    var mechanics = Object.assign(
      {},
      api.MATCHING_RUNTIME_REGISTRY,
      {
        "smart-sentence@3.0.1": registration
      }
    );

    root.replaceChildren();

    var mascotSources =
      window.DUDUQ_ASSETS &&
      window.DUDUQ_ASSETS.mascots
        ? window.DUDUQ_ASSETS.mascots
        : {};

    var mascotAssets = {
      idle: mascotAsset(
        mascotSources.idle,
        "Mascote DuduQ pronto para ajudar."
      ),
      success: mascotAsset(
        mascotSources.correct,
        "Mascote DuduQ comemorando o acerto."
      ),
      retry: mascotAsset(
        mascotSources.error,
        "Mascote DuduQ incentivando uma nova tentativa."
      ),
      transition: mascotAsset(
        mascotSources.transition || mascotSources.idle,
        "Mascote DuduQ preparando a próxima missão."
      ),
      complete: mascotAsset(
        mascotSources.complete,
        "Mascote DuduQ celebrando a conclusão."
      )
    };

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
          transitionDurationMs: 520,
          showMascotDuringTransition: true,
          completionBurst: "none"
        }
      }
    );

    if (ReactDOM.createRoot) {
      window.__DUDUQ_SMART_SENTENCE_REACT_ROOT__ =
        ReactDOM.createRoot(root);

      window.__DUDUQ_SMART_SENTENCE_REACT_ROOT__.render(app);
    } else {
      ReactDOM.render(app, root);
    }

    window.DUDUQ_SMART_SENTENCE = {
      version: "3.0.1",
      ready: true,
      initError: null,
      shellReference: "matching@1.0.23"
    };
  } catch (error) {
    var message =
      error && error.message
        ? error.message
        : String(error || "Erro desconhecido");

    console.error(
      "[DuduQ Smart Sentence 3] Falha no bootstrap:",
      error
    );

    var boot = document.getElementById("duduq-boot");

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
      version: "3.0.1",
      ready: false,
      initError: message,
      shellReference: "matching@1.0.23"
    };

    post(ERROR_MESSAGE, { message: message });
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

  function validate(payload) {
    const list = extractQuestions(payload);
    if (!list.length) return false;

    try {
      list
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
        "[DuduQ Smart Sentence 3] Container não informado."
      );
    }

    const questions =
      extractQuestions(payload)
        .map(normalizeQuestion);

    if (!questions.length) {
      throw new Error(
        "[DuduQ Smart Sentence 3] Nenhuma questão recebida."
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
      title: activityTitle(payload, questions),
      lesson: createLesson(payload, contents),
      contents,
      assets: collectAssets(configs),
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
            "Erro desconhecido no runtime Smart Sentence."
          );

        console.error(
          "[DuduQ Smart Sentence 3] Runtime informou erro:",
          detail
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao iniciar a atividade Smart Sentence: " +
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
      MATCHING_REFERENCE_RELEASE
    );

    const runtimeUrl =
      getEngineBase() +
      MATCHING_RUNTIME_PATH +
      "?" +
      params.toString();

    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ao carregar a casca Matching.`
          );
        }

        return response.text();
      })
      .then((html) => {
        if (destroyed) return;

        let prepared =
          suppressDefaultMount(html);

        prepared =
          injectSmartBootstrap(
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
      })
      .catch((error) => {
        console.error(
          "[DuduQ Smart Sentence 3] Falha ao preparar runtime:",
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
        "matching@1.0.23",
      supportedModes: [
        "complete-sentence",
        "build-sentence",
        "unscramble",
        "listen-build",
        "listen-complete",
        "image-sentence",
        "word-order",
        "dialogue"
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
          30,
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
            true
        }
      }
    }
  });

  console.info(
    "[DuduQ] Smart Sentence registrado:",
    VERSION,
    "shell:",
    "matching@1.0.23"
  );
})();

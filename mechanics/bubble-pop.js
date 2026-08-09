/* =========================================================
   DUDUQ MECHANIC — BUBBLE POP
   Adaptador da mecânica Bubble Pop para o Schema DuduQ.
   Versão 1.2.0
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Bubble Pop] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "bubble-pop";
  const VERSION = "1.2.0";
  const TONES = ["blue", "pink", "green", "yellow", "purple", "orange", "aqua"];

  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const result = String(value).trim();
    return result || fallback;
  }

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) {
      return String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "");
    }
    return ".";
  }

  function makeSerializable(value) {
    if (value == null) return value;

    try {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }
    } catch (_) {}

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
  }

  /* =======================================================
     CONTEXTO SEGURO PARA POSTMESSAGE
     ======================================================= */

  function createSafeContext(context = {}) {
    const progress = makeSerializable(
      context.progress ||
      context.globalProgress ||
      null
    );

    return {
      engineVersion: context.engineVersion ?? null,
      moduleId: context.moduleId ?? null,
      year: context.year ?? null,
      subject: context.subject ?? null,
      module: context.module ?? null,
      stepId: context.stepId ?? null,
      stepIndex: context.stepIndex ?? null,
      totalSteps: context.totalSteps ?? null,

      // Progresso global calculado pelo DuduQ Host 1.2.0.
      progress,

      // Alias temporário durante a migração das mecânicas.
      globalProgress: progress
    };
  }

  /* =======================================================
     LEITURA DO PAYLOAD
     ======================================================= */

  function extractQuestionList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];

    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.catalog)) return payload.catalog;
    if (Array.isArray(payload.entries)) return payload.entries;

    return [payload];
  }

  /* =======================================================
     DETECÇÃO DO FORMATO ANTIGO
     ======================================================= */

  function isLegacyBubbleQuestion(question) {
    if (!isObject(question)) return false;

    const nested = isObject(question.payload) ? question.payload : {};
    const bubbles = question.bubbles ?? nested.bubbles;
    const targetIds = question.targetIds ?? nested.targetIds;

    return (
      Array.isArray(bubbles) &&
      bubbles.length > 0 &&
      Array.isArray(targetIds) &&
      targetIds.length > 0
    );
  }

  function normalizeLegacyQuestion(question, index) {
    const nested = isObject(question.payload) ? question.payload : {};

    return {
      ...question,
      id: asString(question.id, `legacy-bubble-${index + 1}`),
      title: asString(question.title, `Questão ${index + 1}`),
      instruction: asString(
        question.instruction || question.prompt,
        "Estoure a bolha correta."
      ),
      learningObjective: asString(
        question.learningObjective || question.objective,
        "Reconhecer e selecionar a resposta correta."
      ),
      mode: question.mode ?? nested.mode ?? "single-target",
      bubbles: question.bubbles ?? nested.bubbles ?? [],
      targetIds: question.targetIds ?? nested.targetIds ?? [],
      behavior: question.behavior ?? nested.behavior ?? {},
      tags: Array.isArray(question.tags) ? question.tags : ["legacy"]
    };
  }

  /* =======================================================
     DIFICULDADE
     ======================================================= */

  function difficultyToNumber(value) {
    if (typeof value === "number") {
      return Math.max(1, Math.min(3, Math.round(value)));
    }

    switch (String(value || "").toLowerCase()) {
      case "medium":
        return 2;
      case "hard":
        return 3;
      case "easy":
      default:
        return 1;
    }
  }

  /* =======================================================
     GABARITO UNIVERSAL → TARGET IDS
     ======================================================= */

  function resolveAnswerIds(question) {
    const alternatives = Array.isArray(question.alternatives)
      ? question.alternatives
      : [];

    const answer = question.answer || {};
    let values = answer.value;

    if (values === null || values === undefined) return [];
    if (!Array.isArray(values)) values = [values];

    const result = [];

    values.forEach((rawValue) => {
      const value = String(rawValue);

      let match = alternatives.find(
        (alternative) => String(alternative.id) === value
      );

      if (!match) {
        const normalizedValue = value.trim().toLowerCase();

        match = alternatives.find(
          (alternative) =>
            String(alternative.text || "").trim().toLowerCase() ===
            normalizedValue
        );
      }

      if (match && !result.includes(match.id)) {
        result.push(match.id);
      }
    });

    return result;
  }

  /* =======================================================
     ALTERNATIVA UNIVERSAL → BOLHA
     ======================================================= */

  function alternativeToBubble(alternative, index) {
    const metadata = isObject(alternative.metadata)
      ? alternative.metadata
      : {};

    const image = isObject(alternative.image)
      ? alternative.image
      : {};

    const label = asString(
      alternative.text ||
      image.alt ||
      alternative.id,
      `Opção ${index + 1}`
    );

    const bubble = {
      id: asString(alternative.id, `option-${index + 1}`),
      label,
      alt: asString(image.alt, label),
      tone: asString(metadata.tone, TONES[index % TONES.length])
    };

    if (metadata.imageAssetKey) {
      bubble.imageAssetKey = metadata.imageAssetKey;
    }

    return bubble;
  }

  /* =======================================================
     QUESTÃO UNIVERSAL → BUBBLE POP
     ======================================================= */

  function adaptUniversalQuestion(rawQuestion, index, context = {}) {
    if (!window.DuduQSchema) {
      console.error("[DuduQ Bubble Pop] DuduQSchema não está carregado.");
      return null;
    }

    const question = window.DuduQSchema.normalizeQuestion(
      rawQuestion,
      index,
      {
        subject: context.subject,
        year: context.year,
        module: context.module
      }
    );

    const validation = window.DuduQSchema.validateQuestion(question);

    if (!validation.valid) {
      console.error(
        "[DuduQ Bubble Pop] Questão inválida:",
        question.id,
        validation.errors
      );
      return null;
    }

    if (validation.warnings?.length) {
      console.warn(
        "[DuduQ Bubble Pop] Avisos da questão:",
        question.id,
        validation.warnings
      );
    }

    const alternatives = Array.isArray(question.alternatives)
      ? question.alternatives
      : [];

    if (alternatives.length < 2) {
      console.error(
        "[DuduQ Bubble Pop] Bubble Pop precisa de pelo menos duas alternativas:",
        question.id
      );
      return null;
    }

    const targetIds = resolveAnswerIds(question);

    if (targetIds.length === 0) {
      console.error(
        "[DuduQ Bubble Pop] Não foi possível localizar o gabarito entre as alternativas:",
        question.id
      );
      return null;
    }

    const bubbles = alternatives.map(alternativeToBubble);
    const metadata = isObject(question.metadata) ? question.metadata : {};

    const skillDescription =
      question.skill?.description
        ? question.skill.description
        : "";

    const tags = [];

    if (question.subject) {
      tags.push(String(question.subject));
    }

    if (question.skill?.code) {
      tags.push(String(question.skill.code));
    }

    if (Array.isArray(metadata.tags)) {
      metadata.tags.forEach((tag) => {
        if (tag && !tags.includes(String(tag))) {
          tags.push(String(tag));
        }
      });
    }

    const instruction = asString(
      question.instruction || question.statement,
      "Estoure a bolha correta."
    );

    const audioText =
      question.media?.audio?.enabled &&
      question.media.audio.text
        ? question.media.audio.text
        : instruction;

    const multipleTargets =
      targetIds.length > 1 ||
      question.answer.type === "multiple";

    return {
      id: question.id,

      title: asString(
        metadata.title || question.statement,
        `Questão ${index + 1}`
      ),

      instruction,

      audioText,

      learningObjective: asString(
        skillDescription || metadata.learningObjective,
        "Reconhecer e selecionar a resposta correta."
      ),

      difficulty:
        difficultyToNumber(
          question.difficulty
        ),

      mode:
        multipleTargets
          ? "multiple-targets"
          : "single-target",

      tags,

      targetIds,

      bubbles,

      behavior:
        isObject(metadata.behavior)
          ? { ...metadata.behavior }
          : {},

      success:
        question.feedback?.correct
          ? question.feedback.correct
          : "Muito bem! Resposta correta.",

      retry:
        question.feedback?.incorrect
          ? question.feedback.incorrect
          : "Observe com atenção e tente novamente.",

      schemaQuestionId:
        question.id,

      schemaVersion:
        question.schemaVersion
    };
  }

  /* =======================================================
     ADAPTAÇÃO DO PAYLOAD COMPLETO
     ======================================================= */

  function adaptPayload(payload, context = {}) {
    const source =
      isObject(payload)
        ? payload
        : {};

    const list =
      extractQuestionList(
        payload
      );

    if (
      list.length === 0
    ) {
      return null;
    }

    const questions =
      list
        .map(
          (question, index) => {
            if (
              isLegacyBubbleQuestion(
                question
              )
            ) {
              return normalizeLegacyQuestion(
                question,
                index
              );
            }

            return adaptUniversalQuestion(
              question,
              index,
              context
            );
          }
        )
        .filter(Boolean);

    if (
      questions.length === 0
    ) {
      return null;
    }

    return {
      lessonId:
        source.lessonId ||
        source.id ||
        `bubble-pop-${Date.now()}`,

      lessonTitle:
        source.lessonTitle ||
        source.title ||
        "Bubble Pop",

      title:
        source.title ||
        source.lessonTitle ||
        "Bubble Pop",

      description:
        source.description ||
        "Conteúdo carregado pelo DuduQ Engine.",

      version:
        source.version ||
        "1.0.0",

      grade:
        context.year ??
        source.grade ??
        source.year ??
        null,

      year:
        context.year ??
        source.year ??
        source.grade ??
        null,

      unitId:
        context.moduleId ??
        source.unitId ??
        null,

      questions
    };
  }

  /* =======================================================
     VALIDAÇÃO DA MECÂNICA
     ======================================================= */

  function validate(payload) {
    if (
      payload == null
    ) {
      return false;
    }

    const list =
      extractQuestionList(
        payload
      );

    if (
      list.length === 0
    ) {
      return false;
    }

    if (
      list.every(
        isLegacyBubbleQuestion
      )
    ) {
      return true;
    }

    if (
      !window.DuduQSchema
    ) {
      console.error(
        "[DuduQ Bubble Pop] Questões universais exigem core/duduq-schema.js."
      );

      return false;
    }

    return true;
  }

  /* =======================================================
     MONTAGEM
     ======================================================= */

  function mount({
    container,
    payload,
    options = {},
    context = {},
    onComplete
  }) {
    if (
      !container
    ) {
      throw new Error(
        "[DuduQ Bubble Pop] Container não informado."
      );
    }

    const adaptedPayload =
      adaptPayload(
        payload,
        context
      );

    if (
      !adaptedPayload
    ) {
      throw new Error(
        "[DuduQ Bubble Pop] Nenhuma questão válida pôde ser adaptada."
      );
    }

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

    wrapper.style.minHeight =
      "100vh";

    wrapper.style.position =
      "relative";

    const iframe =
      document.createElement(
        "iframe"
      );

    iframe.title =
      "DuduQ — Bubble Pop";

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
      "100vh";

    iframe.style.border =
      "0";

    iframe.style.display =
      "block";

    iframe.style.background =
      "transparent";

    /* =====================================================
       URL
       ===================================================== */

    const engineBase =
      getEngineBase();

    const params =
      new URLSearchParams();

    if (
      context.year
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

    /*
     * Fallback simples.
     * O dado principal continua sendo context.progress.
     */
    if (
      Number.isFinite(
        context.stepIndex
      )
    ) {
      params.set(
        "hostStep",
        String(
          context.stepIndex + 1
        )
      );
    }

    if (
      Number.isFinite(
        context.totalSteps
      )
    ) {
      params.set(
        "hostTotalSteps",
        String(
          context.totalSteps
        )
      );
    }

    params.set(
      "engineAdapter",
      VERSION
    );

    iframe.src =
      engineBase +
      "/DUDUQ_BUBBLE_POP.html?" +
      params.toString();

    /* =====================================================
       DADOS SERIALIZÁVEIS
       ===================================================== */

    const messagePayload =
      makeSerializable(
        adaptedPayload
      );

    const messageOptions =
      makeSerializable(
        options
      ) || {};

    const messageContext =
      createSafeContext(
        context
      );

    /* =====================================================
       ENVIO
       ===================================================== */

    function sendContent() {
      if (
        !iframe.contentWindow
      ) {
        return;
      }

      try {
        iframe.contentWindow.postMessage(
          {
            type:
              "DUDUQ_LOAD_CONTENT",

            mechanic:
              MECHANIC_ID,

            version:
              VERSION,

            payload:
              messagePayload,

            options:
              messageOptions,

            context:
              messageContext
          },
          "*"
        );

        console.info(
          "[DuduQ Bubble Pop] Conteúdo adaptado e enviado.",
          {
            adapterVersion:
              VERSION,

            questions:
              adaptedPayload
                .questions
                .length,

            progress:
              messageContext
                .progress ||
              null
          }
        );
      } catch (error) {
        console.error(
          "[DuduQ Bubble Pop] Falha ao enviar conteúdo:",
          error
        );
      }
    }

    /* =====================================================
       MENSAGENS DA MECÂNICA
       ===================================================== */

    function handleMessage(
      event
    ) {
      if (
        event.source !==
        iframe.contentWindow
      ) {
        return;
      }

      const data =
        event.data;

      if (
        !data ||
        typeof data !==
          "object"
      ) {
        return;
      }

      if (
        data.type ===
        "DUDUQ_MECHANIC_READY"
      ) {
        console.info(
          "[DuduQ Bubble Pop] Mecânica pronta."
        );

        sendContent();

        return;
      }

      if (
        data.type ===
        "DUDUQ_MECHANIC_COMPLETE"
      ) {
        console.info(
          "[DuduQ Bubble Pop] Mecânica concluída.",
          data.result
        );

        if (
          typeof onComplete ===
          "function"
        ) {
          onComplete(
            data.result ||
            null
          );
        }

        return;
      }

      if (
        data.type ===
        "DUDUQ_MECHANIC_ERROR"
      ) {
        console.error(
          "[DuduQ Bubble Pop] Erro recebido da mecânica:",
          data
        );
      }
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    /*
     * READY é o envio principal.
     * load continua apenas como fallback.
     */
    iframe.addEventListener(
      "load",
      function () {
        window.setTimeout(
          sendContent,
          250
        );
      }
    );

    wrapper.appendChild(
      iframe
    );

    container.appendChild(
      wrapper
    );

    /* =====================================================
       DESTRUIÇÃO
       ===================================================== */

    return function destroy() {
      window.removeEventListener(
        "message",
        handleMessage
      );

      iframe.remove();

      wrapper.remove();
    };
  }

  /* =======================================================
     REGISTRO
     ======================================================= */

  window.DuduQ.registerMechanic({
    id:
      MECHANIC_ID,

    version:
      VERSION,

    validate,

    mount,

    metadata: {
      name:
        "Bubble Pop",

      category:
        "reconhecimento-rapido",

      active:
        true,

      acceptsSchema:
        "1.0.0",

      /*
       * A partir da versão 1.2.0 o adaptador
       * transporta o progresso global do Host.
       */
      globalProgress:
        true,

      legacyPayload:
        true
    }
  });

  console.info(
    "[DuduQ] Bubble Pop registrado:",
    VERSION
  );
})();

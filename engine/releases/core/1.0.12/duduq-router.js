/* =========================================================
   DUDUQ CORE — ROUTER
   Seletor inteligente de mecânicas para o Schema DuduQ.
   Versão 1.0.0
   ========================================================= */

(function () {
  "use strict";

  if (window.DuduQRouter?.version === "1.0.0") return;

  const VERSION = "1.0.0";
  const profiles = new Map();

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

  function mechanicId(value) {
    return asString(value)
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  }

  function strings(value) {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return Array.from(new Set(list.map(asString).filter(Boolean)));
  }

  function clone(value) {
    if (value == null) return value;

    try {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }
    } catch (_) {}

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function isRegistered(id) {
    if (!window.DuduQ?.hasMechanic) return false;

    try {
      return window.DuduQ.hasMechanic(id);
    } catch (_) {
      return false;
    }
  }

  /* =======================================================
     PERFIS DE CAPACIDADE
     ======================================================= */

  function normalizeProfile(input) {
    if (!isObject(input)) {
      throw new Error(
        "[DuduQ Router] Perfil inválido."
      );
    }

    const id = mechanicId(input.id);

    if (!id) {
      throw new Error(
        "[DuduQ Router] O perfil precisa de um id."
      );
    }

    return Object.freeze({
      id,

      name:
        asString(
          input.name,
          id
        ),

      active:
        input.active !== false,

      baseScore:
        Number.isFinite(
          input.baseScore
        )
          ? input.baseScore
          : 50,

      answerTypes:
        Object.freeze(
          strings(
            input.answerTypes
          ).map(
            (item) =>
              item.toLowerCase()
          )
        ),

      answerTypeWeights:
        Object.freeze(
          isObject(
            input.answerTypeWeights
          )
            ? {
                ...input.answerTypeWeights
              }
            : {}
        ),

      minAlternatives:
        Number.isFinite(
          input.minAlternatives
        )
          ? Math.max(
              0,
              Math.round(
                input.minAlternatives
              )
            )
          : 0,

      maxAlternatives:
        Number.isFinite(
          input.maxAlternatives
        )
          ? Math.max(
              0,
              Math.round(
                input.maxAlternatives
              )
            )
          : null,

      supports:
        Object.freeze({

          questionImage:
            input.supports
              ?.questionImage === true,

          optionImageUrl:
            input.supports
              ?.optionImageUrl === true,

          optionImageAssetKey:
            input.supports
              ?.optionImageAssetKey === true,

          questionAudio:
            input.supports
              ?.questionAudio !== false,

          optionAudio:
            input.supports
              ?.optionAudio === true
        }),

      metadata:
        Object.freeze(
          isObject(
            input.metadata
          )
            ? {
                ...input.metadata
              }
            : {}
        )
    });
  }

  function registerProfile(input) {
    const profile =
      normalizeProfile(input);

    profiles.set(
      profile.id,
      profile
    );

    return profile;
  }

  function unregisterProfile(id) {
    return profiles.delete(
      mechanicId(id)
    );
  }

  function getProfile(id) {
    return (
      profiles.get(
        mechanicId(id)
      ) || null
    );
  }

  function listProfiles() {
    return Array.from(
      profiles.values()
    ).map(clone);
  }

  /* =======================================================
     PERFIS INICIAIS
     ======================================================= */

  function registerDefaults() {

    registerProfile({

      id:
        "bubble-pop",

      name:
        "Bubble Pop",

      baseScore:
        58,

      answerTypes: [
        "single",
        "multiple"
      ],

      answerTypeWeights: {
        single: 28,
        multiple: 18
      },

      minAlternatives:
        2,

      maxAlternatives:
        8,

      supports: {

        questionImage:
          false,

        optionImageUrl:
          false,

        optionImageAssetKey:
          true,

        questionAudio:
          true,

        optionAudio:
          false
      },

      metadata: {

        category:
          "reconhecimento-rapido"
      }
    });

    registerProfile({

      id:
        "drag-drop",

      name:
        "Drag & Drop",

      baseScore:
        62,

      answerTypes: [
        "pairs",
        "sequence"
      ],

      answerTypeWeights: {
        pairs: 30,
        sequence: 34
      },

      minAlternatives:
        2,

      supports: {

        questionImage:
          false,

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
          "associacao-classificacao-ordenacao"
      }
    });
  }

  /* =======================================================
     PERFIS DECLARADOS PELAS MECÂNICAS
     ======================================================= */

  function syncFromHost() {

    if (
      !window.DuduQ
        ?.listMechanics
    ) {
      return 0;
    }

    let imported = 0;

    window.DuduQ
      .listMechanics()
      .forEach(
        (mechanic) => {

          const declared =
            mechanic
              ?.metadata
              ?.routerProfile;

          if (
            !isObject(
              declared
            )
          ) {
            return;
          }

          registerProfile({

            ...declared,

            id:
              mechanic.id,

            name:
              declared.name ||
              mechanic
                .metadata
                ?.name ||
              mechanic.id
          });

          imported += 1;
        }
      );

    return imported;
  }

  /* =======================================================
     NORMALIZAÇÃO / ANÁLISE
     ======================================================= */

  function normalizeQuestion(
    rawQuestion,
    index = 0,
    defaults = {}
  ) {

    if (
      window.DuduQSchema
        ?.normalizeQuestion
    ) {

      return window
        .DuduQSchema
        .normalizeQuestion(
          rawQuestion,
          index,
          defaults
        );
    }

    if (
      !isObject(
        rawQuestion
      )
    ) {

      throw new Error(
        "[DuduQ Router] Questão inválida."
      );
    }

    return rawQuestion;
  }

  function analyzeQuestion(
    rawQuestion,
    index = 0,
    defaults = {}
  ) {

    const question =
      normalizeQuestion(
        rawQuestion,
        index,
        defaults
      );

    const alternatives =
      Array.isArray(
        question.alternatives
      )
        ? question.alternatives
        : [];

    let optionImageUrlCount =
      0;

    let optionImageAssetKeyCount =
      0;

    let optionAudioCount =
      0;

    alternatives.forEach(
      (alternative) => {

        if (
          alternative
            ?.image
            ?.enabled &&
          alternative
            .image
            .src
        ) {

          optionImageUrlCount +=
            1;
        }

        if (
          alternative
            ?.metadata
            ?.imageAssetKey
        ) {

          optionImageAssetKeyCount +=
            1;
        }

        if (
          alternative
            ?.audio
            ?.enabled &&
          (
            alternative
              .audio
              .src ||
            alternative
              .audio
              .text
          )
        ) {

          optionAudioCount +=
            1;
        }
      }
    );

    const delivery =
      isObject(
        question.delivery
      )
        ? question.delivery
        : {};

    return {

      question,

      id:
        asString(
          question.id,
          `question-${index + 1}`
        ),

      answerType:
        asString(
          question
            .answer
            ?.type,
          "single"
        ).toLowerCase(),

      alternativeCount:
        alternatives.length,

      difficulty:
        question.difficulty ||
        null,

      requestedMechanic:
        mechanicId(
          delivery.mechanic ||
          "auto"
        ) ||
        "auto",

      preferred:
        strings(
          delivery.preferred
        ).map(
          mechanicId
        ),

      blocked:
        strings(
          delivery.blocked
        ).map(
          mechanicId
        ),

      hasQuestionImage:
        Boolean(
          question
            .media
            ?.image
            ?.enabled &&
          question
            .media
            .image
            .src
        ),

      hasQuestionAudio:
        Boolean(
          question
            .media
            ?.audio
            ?.enabled &&
          (
            question
              .media
              .audio
              .src ||
            question
              .media
              .audio
              .text
          )
        ),

      hasOptionImageUrl:
        optionImageUrlCount >
        0,

      hasOptionImageAssetKey:
        optionImageAssetKeyCount >
        0,

      hasOptionAudio:
        optionAudioCount >
        0,

      metadata:
        isObject(
          question.metadata
        )
          ? question.metadata
          : {}
    };
  }

  /* =======================================================
     AVALIAÇÃO DE UMA MECÂNICA
     ======================================================= */

  function evaluate(
    profile,
    analysis,
    options = {}
  ) {

    const state = {

      mechanicId:
        profile.id,

      name:
        profile.name,

      registered:
        isRegistered(
          profile.id
        ),

      eligible:
        true,

      score:
        profile.baseScore,

      reasons: [
        {
          amount:
            profile.baseScore,

          reason:
            "pontuação-base"
        }
      ],

      rejections: [],

      warnings: []
    };

    function add(
      amount,
      reason
    ) {

      state.score +=
        amount;

      state.reasons.push({
        amount,
        reason
      });
    }

    function reject(
      reason
    ) {

      state.eligible =
        false;

      state.rejections.push(
        reason
      );
    }

    if (
      !profile.active
    ) {

      reject(
        "mecânica inativa"
      );
    }

    if (
      options.requireRegistered !==
        false &&
      !state.registered
    ) {

      reject(
        "mecânica não registrada no Host"
      );
    }

    if (
      analysis.blocked.includes(
        profile.id
      )
    ) {

      reject(
        "bloqueada por delivery.blocked"
      );
    }

    if (
      analysis.requestedMechanic !==
        "auto" &&
      analysis.requestedMechanic !==
        profile.id
    ) {

      reject(
        `delivery.mechanic solicita ${analysis.requestedMechanic}`
      );
    }

    if (
      !profile
        .answerTypes
        .includes(
          analysis.answerType
        )
    ) {

      reject(
        `answer.type "${analysis.answerType}" não suportado`
      );

    } else {

      add(

        Number(
          profile
            .answerTypeWeights[
              analysis.answerType
            ] ||
          0
        ),

        `adequação ao answer.type "${analysis.answerType}"`
      );
    }

    if (
      analysis.alternativeCount <
      profile.minAlternatives
    ) {

      reject(
        `precisa de pelo menos ${profile.minAlternatives} alternativas`
      );
    }

    if (
      profile.maxAlternatives !==
        null &&
      analysis.alternativeCount >
        profile.maxAlternatives
    ) {

      reject(
        `excede ${profile.maxAlternatives} alternativas`
      );
    }

    if (
      analysis.hasQuestionImage &&
      !profile
        .supports
        .questionImage
    ) {

      reject(
        "imagem principal ainda não suportada"
      );
    }

    if (
      analysis.hasOptionImageUrl &&
      !profile
        .supports
        .optionImageUrl
    ) {

      reject(
        "URLs de imagem nas alternativas ainda não suportadas"
      );
    }

    if (
      analysis.hasOptionImageAssetKey &&
      !profile
        .supports
        .optionImageAssetKey
    ) {

      reject(
        "imageAssetKey nas alternativas não suportado"
      );
    }

    if (
      analysis.hasQuestionAudio &&
      !profile
        .supports
        .questionAudio
    ) {

      reject(
        "áudio da questão não suportado"
      );
    }

    if (
      analysis.hasOptionAudio &&
      !profile
        .supports
        .optionAudio
    ) {

      reject(
        "áudio individual nas alternativas não suportado"
      );
    }

    if (
      analysis.requestedMechanic ===
      profile.id
    ) {

      add(
        100,
        "mecânica explicitamente solicitada"
      );
    }

    if (
      analysis.preferred.includes(
        profile.id
      )
    ) {

      add(
        30,
        "indicada em delivery.preferred"
      );
    }

    /* -----------------------------------------------------
       HEURÍSTICAS LEVES
       Compatibilidade pesa mais que preferência.
       ----------------------------------------------------- */

    if (
      profile.id ===
      "bubble-pop"
    ) {

      if (
        analysis.answerType ===
          "single" &&
        analysis.alternativeCount >=
          2 &&
        analysis.alternativeCount <=
          6
      ) {

        add(
          10,
          "boa densidade para reconhecimento rápido"
        );
      }

      if (
        analysis.difficulty ===
        "hard"
      ) {

        add(
          -4,
          "leve penalidade para questão difícil"
        );
      }

      if (
        analysis.hasQuestionAudio
      ) {

        add(
          3,
          "áudio de instrução compatível"
        );
      }

      if (
        analysis.hasOptionImageAssetKey
      ) {

        add(
          4,
          "assets visuais do catálogo compatíveis"
        );
      }
    }

    if (
      profile.id ===
      "drag-drop"
    ) {

      if (
        analysis.answerType ===
        "pairs"
      ) {

        add(
          12,
          "pareamento combina naturalmente com arraste"
        );
      }

      if (
        analysis.answerType ===
        "sequence"
      ) {

        add(
          14,
          "ordenação combina naturalmente com arraste"
        );
      }

      if (
        Array.isArray(
          analysis
            .metadata
            .targets
        )
      ) {

        add(
          6,
          "destinos semânticos explícitos favorecem Drag & Drop"
        );
      }

      if (
        analysis.hasOptionImageUrl ||
        analysis.hasOptionImageAssetKey
      ) {

        add(
          6,
          "itens visuais são suportados"
        );
      }

      if (
        analysis.hasOptionAudio
      ) {

        add(
          5,
          "áudio individual é suportado"
        );
      }
    }

    state.score =
      Math.round(
        state.score * 100
      ) /
      100;

    return state;
  }

  /* =======================================================
     RANKING / SELEÇÃO
     ======================================================= */

  function rank(
    rawQuestion,
    options = {}
  ) {

    const analysis =
      analyzeQuestion(
        rawQuestion,
        options.index || 0,
        options.defaults || {}
      );

    const candidates =
      Array.from(
        profiles.values()
      )
        .map(
          (profile) =>
            evaluate(
              profile,
              analysis,
              options
            )
        )
        .sort(
          (a, b) => {

            if (
              a.eligible !==
              b.eligible
            ) {

              return a.eligible
                ? -1
                : 1;
            }

            if (
              b.score !==
              a.score
            ) {

              return (
                b.score -
                a.score
              );
            }

            return a
              .mechanicId
              .localeCompare(
                b.mechanicId
              );
          }
        );

    return {

      routerVersion:
        VERSION,

      questionId:
        analysis.id,

      analysis:
        clone(
          analysis
        ),

      candidates
    };
  }

  function select(
    rawQuestion,
    options = {}
  ) {

    const ranking =
      rank(
        rawQuestion,
        options
      );

    const selected =
      ranking
        .candidates
        .find(
          (item) =>
            item.eligible
        ) ||
      null;

    return {
      ...ranking,
      selected
    };
  }

  function explain(
    rawQuestion,
    options = {}
  ) {

    const result =
      select(
        rawQuestion,
        options
      );

    return {

      questionId:
        result.questionId,

      selected:
        result.selected
          ? {

              mechanicId:
                result
                  .selected
                  .mechanicId,

              name:
                result
                  .selected
                  .name,

              score:
                result
                  .selected
                  .score,

              reasons:
                result
                  .selected
                  .reasons
            }
          : null,

      rejected:
        result
          .candidates
          .filter(
            (item) =>
              !item.eligible
          )
          .map(
            (item) => ({

              mechanicId:
                item.mechanicId,

              name:
                item.name,

              rejections:
                item.rejections
            })
          )
    };
  }

  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  registerDefaults();

  syncFromHost();

  window.DuduQRouter =
    Object.freeze({

      version:
        VERSION,

      registerProfile,

      unregisterProfile,

      getProfile,

      listProfiles,

      syncFromHost,

      analyzeQuestion,

      rank,

      select,

      explain
    });

  try {

    window.dispatchEvent(

      new CustomEvent(
        "duduq:router-ready",
        {

          detail: {

            version:
              VERSION,

            profiles:
              listProfiles()
          }
        }
      )
    );

  } catch (_) {}

  console.info(
    "[DuduQ] Router carregado:",
    VERSION,
    listProfiles().map(
      (profile) =>
        profile.id
    )
  );
})();

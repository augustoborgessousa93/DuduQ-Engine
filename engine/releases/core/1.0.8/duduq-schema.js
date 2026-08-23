/* =========================================================
   DUDUQ CORE — SCHEMA
   Contrato canônico de questões do ecossistema DuduQ.
   Versão 1.0.0
   ========================================================= */

(function () {
  "use strict";

  if (
    window.DuduQSchema &&
    window.DuduQSchema.version === "1.0.0"
  ) {
    return;
  }

  const VERSION = "1.0.0";

  /* =======================================================
     CONSTANTES
     ======================================================= */

  const DIFFICULTIES = Object.freeze([
    "easy",
    "medium",
    "hard"
  ]);

  const ANSWER_TYPES = Object.freeze([
    "single",
    "multiple",
    "text",
    "sequence",
    "pairs"
  ]);

  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function asString(
    value,
    fallback = ""
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    return String(value).trim();
  }

  function asNullableNumber(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(
      number
    )
      ? number
      : null;
  }

  /* =======================================================
     DIFICULDADE
     ======================================================= */

  function normalizeDifficulty(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    if (
      typeof value ===
      "number"
    ) {
      if (value <= 1) {
        return "easy";
      }

      if (value === 2) {
        return "medium";
      }

      return "hard";
    }

    const normalized =
      String(value)
        .trim()
        .toLowerCase();

    const aliases = {
      easy: "easy",
      facil: "easy",
      "fácil": "easy",
      baixa: "easy",
      low: "easy",

      medium: "medium",
      medio: "medium",
      "médio": "medium",
      media: "medium",
      "média": "medium",

      hard: "hard",
      dificil: "hard",
      "difícil": "hard",
      alta: "hard",
      high: "hard"
    };

    return (
      aliases[normalized] ||
      null
    );
  }

  /* =======================================================
     HABILIDADE
     ======================================================= */

  function normalizeSkill(
    value
  ) {
    if (!value) {
      return {
        code: null,
        description: ""
      };
    }

    if (
      typeof value ===
      "string"
    ) {
      return {
        code: null,
        description:
          value.trim()
      };
    }

    if (
      isObject(value)
    ) {
      return {
        code:
          asString(
            value.code ||
            value.codigo ||
            value.id
          ) || null,

        description:
          asString(
            value.description ||
            value.descricao ||
            value.habilidade ||
            value.text
          )
      };
    }

    return {
      code: null,
      description: ""
    };
  }

  /* =======================================================
     IMAGEM
     ======================================================= */

  function normalizeImage(
    value
  ) {
    if (!value) {
      return {
        enabled: false,
        src: null,
        alt: ""
      };
    }

    if (
      typeof value ===
      "string"
    ) {
      return {
        enabled: true,
        src: value,
        alt: ""
      };
    }

    if (
      isObject(value)
    ) {
      const src =
        asString(
          value.src ||
          value.url ||
          value.path
        ) || null;

      return {
        enabled:
          value.enabled !==
            false &&
          Boolean(src),

        src,

        alt:
          asString(
            value.alt ||
            value.description ||
            value.descricao
          )
      };
    }

    return {
      enabled: false,
      src: null,
      alt: ""
    };
  }

  /* =======================================================
     ÁUDIO
     ======================================================= */

  function normalizeAudio(
    value,
    defaults = {}
  ) {
    if (!value) {
      return {
        enabled: false,
        src: null,
        text: "",

        language:
          defaults.language ||
          "en",

        role:
          defaults.role ||
          "instruction"
      };
    }

    if (
      typeof value ===
      "string"
    ) {
      return {
        enabled: true,
        src: value,
        text: "",

        language:
          defaults.language ||
          "en",

        role:
          defaults.role ||
          "instruction"
      };
    }

    if (value === true) {
      return {
        enabled: true,
        src: null,
        text: "",

        language:
          defaults.language ||
          "en",

        role:
          defaults.role ||
          "instruction"
      };
    }

    if (
      isObject(value)
    ) {
      const src =
        asString(
          value.src ||
          value.url ||
          value.path
        ) || null;

      const text =
        asString(
          value.text ||
          value.script ||
          value.fala
        );

      return {
        enabled:
          value.enabled !==
            false &&
          Boolean(
            src ||
            text ||
            value.enabled === true
          ),

        src,

        text,

        language:
          asString(
            value.language ||
            value.lang ||
            value.idioma,
            defaults.language ||
            "en"
          ),

        role:
          asString(
            value.role,
            defaults.role ||
            "instruction"
          )
      };
    }

    return {
      enabled: false,
      src: null,
      text: "",

      language:
        defaults.language ||
        "en",

      role:
        defaults.role ||
        "instruction"
    };
  }

  /* =======================================================
     ALTERNATIVAS
     ======================================================= */

  function normalizeAlternative(
    value,
    index
  ) {
    if (
      typeof value ===
      "string"
    ) {
      return {
        id:
          `option-${index + 1}`,

        text:
          value,

        image:
          normalizeImage(null),

        audio:
          normalizeAudio(null),

        metadata: {}
      };
    }

    const source =
      isObject(value)
        ? value
        : {};

    return {
      id:
        asString(
          source.id ||
          source.key ||
          source.value,
          `option-${index + 1}`
        ),

      text:
        asString(
          source.text ||
          source.label ||
          source.answer ||
          source.resposta
        ),

      image:
        normalizeImage(
          source.image ||
          source.imagem
        ),

      audio:
        normalizeAudio(
          source.audio,
          {
            role: "option"
          }
        ),

      metadata:
        isObject(
          source.metadata
        )
          ? {
              ...source.metadata
            }
          : {}
    };
  }

  function normalizeAlternatives(
    value
  ) {
    if (
      !Array.isArray(value)
    ) {
      return [];
    }

    return value.map(
      normalizeAlternative
    );
  }

  /* =======================================================
     RESPOSTA / GABARITO
     ======================================================= */

  function normalizeAnswer(
    value,
    alternatives
  ) {
    if (
      isObject(value)
    ) {
      const requestedType =
        asString(
          value.type ||
          value.tipo
        ).toLowerCase();

      const type =
        ANSWER_TYPES.includes(
          requestedType
        )
          ? requestedType
          : "single";

      return {
        type,

        value:
          value.value ??
          value.answer ??
          value.resposta ??
          null
      };
    }

    if (
      Array.isArray(value)
    ) {
      return {
        type:
          "multiple",

        value:
          value.slice()
      };
    }

    if (
      typeof value ===
        "string" ||
      typeof value ===
        "number"
    ) {
      const candidate =
        String(value);

      const matchesId =
        alternatives.some(
          (item) =>
            item.id ===
            candidate
        );

      return {
        type:
          "single",

        value:
          matchesId
            ? candidate
            : value
      };
    }

    return {
      type:
        "single",

      value:
        null
    };
  }

  /* =======================================================
     FEEDBACK
     ======================================================= */

  function normalizeFeedback(
    value,
    fallbackLanguage
  ) {
    const source =
      isObject(value)
        ? value
        : {};

    return {
      correct:
        asString(
          source.correct ||
          source.correto
        ),

      incorrect:
        asString(
          source.incorrect ||
          source.incorreto ||
          source.error ||
          source.erro
        ),

      language:
        asString(
          source.language ||
          source.lang ||
          source.idioma,
          fallbackLanguage
        )
    };
  }

  /* =======================================================
     PREFERÊNCIA DE MECÂNICA
     ======================================================= */

  function normalizeDelivery(
    value
  ) {
    const source =
      isObject(value)
        ? value
        : {};

    const preferred =
      Array.isArray(
        source.preferred
      )
        ? source.preferred
        : source.preferred
          ? [
              source.preferred
            ]
          : [];

    const blocked =
      Array.isArray(
        source.blocked
      )
        ? source.blocked
        : source.blocked
          ? [
              source.blocked
            ]
          : [];

    return {
      /*
       * "auto" significa que futuramente
       * o Engine poderá escolher a mecânica.
       */
      mechanic:
        asString(
          source.mechanic ||
          source.mecanica,
          "auto"
        ) || "auto",

      preferred:
        preferred
          .map(
            (item) =>
              asString(item)
          )
          .filter(Boolean),

      blocked:
        blocked
          .map(
            (item) =>
              asString(item)
          )
          .filter(Boolean),

      allowImage:
        source.allowImage !==
        false,

      allowAudio:
        source.allowAudio !==
        false
    };
  }

  /* =======================================================
     NORMALIZAÇÃO DA QUESTÃO
     ======================================================= */

  function normalizeQuestion(
    input,
    index = 0,
    defaults = {}
  ) {
    const source =
      isObject(input)
        ? input
        : {};

    const languages = {
      /*
       * Idioma principal do conteúdo.
       * Em inglês, normalmente "en".
       */
      content:
        asString(
          source.contentLanguage ||
          source.language ||
          source.lang ||
          defaults.contentLanguage,
          "en"
        ),

      /*
       * Idioma da instrução.
       * Pode ser alterado por questão.
       */
      instruction:
        asString(
          source.instructionLanguage ||
          defaults.instructionLanguage,
          "pt-BR"
        ),

      /*
       * Feedback padrão em português,
       * mas configurável.
       */
      feedback:
        asString(
          source.feedbackLanguage ||
          defaults.feedbackLanguage,
          "pt-BR"
        )
    };

    const alternatives =
      normalizeAlternatives(
        source.alternatives ||
        source.alternativas ||
        source.options ||
        source.opcoes
      );

    return {
      /* ---------------------------------------------------
         IDENTIFICAÇÃO
         --------------------------------------------------- */

      schemaVersion:
        VERSION,

      id:
        asString(
          source.id,
          `question-${index + 1}`
        ),

      /* ---------------------------------------------------
         CONTEXTO PEDAGÓGICO
         --------------------------------------------------- */

      subject:
        asString(
          source.subject ||
          source.discipline ||
          source.disciplina ||
          defaults.subject ||
          defaults.discipline ||
          defaults.disciplina
        ),

      year:
        asNullableNumber(
          source.year ??
          source.ano ??
          source.grade ??
          defaults.year ??
          defaults.ano ??
          defaults.grade
        ),

      module:
        asNullableNumber(
          source.module ??
          source.modulo ??
          defaults.module ??
          defaults.modulo
        ),

      skill:
        normalizeSkill(
          source.skill ||
          source.habilidade ||
          defaults.skill ||
          defaults.habilidade
        ),

      difficulty:
        normalizeDifficulty(
          source.difficulty ??
          source.dificuldade ??
          defaults.difficulty ??
          defaults.dificuldade
        ),

      /* ---------------------------------------------------
         CONTEÚDO
         --------------------------------------------------- */

      statement:
        asString(
          source.statement ||
          source.enunciado ||
          source.prompt ||
          source.question
        ),

      instruction:
        asString(
          source.instruction ||
          source.instrucao ||
          source.instrução
        ),

      languages,

      /* ---------------------------------------------------
         MÍDIA
         --------------------------------------------------- */

      media: {
        image:
          normalizeImage(
            source.image ||
            source.imagem
          ),

        audio:
          normalizeAudio(
            source.audio,
            {
              language:
                languages.content,

              role:
                "instruction"
            }
          )
      },

      /* ---------------------------------------------------
         ALTERNATIVAS
         --------------------------------------------------- */

      alternatives,

      /* ---------------------------------------------------
         GABARITO
         --------------------------------------------------- */

      answer:
        normalizeAnswer(
          source.answer ??
          source.resposta ??
          source.correctAnswer ??
          source.gabarito,
          alternatives
        ),

      /* ---------------------------------------------------
         FEEDBACK
         --------------------------------------------------- */

      feedback:
        normalizeFeedback(
          source.feedback,
          languages.feedback
        ),

      /* ---------------------------------------------------
         MECÂNICAS
         --------------------------------------------------- */

      delivery:
        normalizeDelivery(
          source.delivery ||
          source.entrega
        ),

      /* ---------------------------------------------------
         EXTENSÕES
         --------------------------------------------------- */

      metadata:
        isObject(
          source.metadata
        )
          ? {
              ...source.metadata
            }
          : {}
    };
  }

  /* =======================================================
     CONJUNTO DE QUESTÕES
     ======================================================= */

  function normalizeQuestionSet(
    payload,
    defaults = {}
  ) {
    const source =
      isObject(payload)
        ? payload
        : {};

    const list =
      Array.isArray(payload)
        ? payload
        : Array.isArray(
            source.questions
          )
          ? source.questions
          : Array.isArray(
              source.items
            )
            ? source.items
            : [];

    const inheritedDefaults = {
      ...defaults,

      subject:
        source.subject ||
        source.discipline ||
        source.disciplina ||
        defaults.subject,

      year:
        source.year ??
        source.ano ??
        source.grade ??
        defaults.year,

      module:
        source.module ??
        source.modulo ??
        defaults.module,

      contentLanguage:
        source.contentLanguage ||
        defaults.contentLanguage,

      instructionLanguage:
        source.instructionLanguage ||
        defaults.instructionLanguage,

      feedbackLanguage:
        source.feedbackLanguage ||
        defaults.feedbackLanguage
    };

    return list.map(
      (
        item,
        index
      ) =>
        normalizeQuestion(
          item,
          index,
          inheritedDefaults
        )
    );
  }

  /* =======================================================
     VALIDAÇÃO DE UMA QUESTÃO
     ======================================================= */

  function validateQuestion(
    question
  ) {
    const errors = [];
    const warnings = [];

    if (
      !isObject(question)
    ) {
      return {
        valid: false,

        errors: [
          "A questão precisa ser um objeto."
        ],

        warnings
      };
    }

    if (
      !asString(
        question.id
      )
    ) {
      errors.push(
        "A questão precisa possuir id."
      );
    }

    if (
      !asString(
        question.statement
      ) &&
      !asString(
        question.instruction
      )
    ) {
      errors.push(
        "A questão precisa possuir enunciado ou instrução."
      );
    }

    if (
      question.difficulty !==
        null &&
      !DIFFICULTIES.includes(
        question.difficulty
      )
    ) {
      errors.push(
        "Dificuldade inválida. Use easy, medium, hard ou null."
      );
    }

    if (
      !isObject(
        question.answer
      ) ||
      !ANSWER_TYPES.includes(
        question.answer.type
      )
    ) {
      errors.push(
        "Formato de resposta inválido."
      );
    }

    if (
      question.answer &&
      question.answer.value ===
        null
    ) {
      warnings.push(
        "A questão ainda não possui gabarito definido."
      );
    }

    if (
      Array.isArray(
        question.alternatives
      ) &&
      question.alternatives
        .length === 1
    ) {
      warnings.push(
        "Questões com alternativas normalmente precisam de pelo menos duas opções."
      );
    }

    return {
      valid:
        errors.length === 0,

      errors,
      warnings
    };
  }

  /* =======================================================
     VALIDAÇÃO DE CONJUNTO
     ======================================================= */

  function validateQuestionSet(
    questions
  ) {
    if (
      !Array.isArray(
        questions
      )
    ) {
      return {
        valid: false,

        errors: [
          "O conjunto de questões precisa ser um array."
        ],

        items: []
      };
    }

    const items =
      questions.map(
        validateQuestion
      );

    return {
      valid:
        items.every(
          (item) =>
            item.valid
        ),

      errors:
        items.flatMap(
          (
            item,
            index
          ) =>
            item.errors.map(
              (error) =>
                `Questão ${index + 1}: ${error}`
            )
        ),

      items
    };
  }

  /* =======================================================
     SERIALIZAÇÃO
     ======================================================= */

  function toSerializable(
    value
  ) {
    try {
      if (
        typeof structuredClone ===
        "function"
      ) {
        return structuredClone(
          value
        );
      }
    } catch (_) {}

    try {
      return JSON.parse(
        JSON.stringify(
          value
        )
      );
    } catch (_) {
      return null;
    }
  }

  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.DuduQSchema =
    Object.freeze({
      version:
        VERSION,

      difficulties:
        DIFFICULTIES,

      answerTypes:
        ANSWER_TYPES,

      normalizeQuestion,

      normalizeQuestionSet,

      validateQuestion,

      validateQuestionSet,

      toSerializable
    });

  window.dispatchEvent(
    new CustomEvent(
      "duduq:schema-ready",
      {
        detail: {
          version:
            VERSION
        }
      }
    )
  );

  console.info(
    "[DuduQ] Schema carregado:",
    VERSION
  );
})();

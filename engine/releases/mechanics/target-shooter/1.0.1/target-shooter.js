/* =========================================================
   DUDUQ MECHANIC — TARGET SHOOTER
   Adaptador do Target Shooter 2.0.2 para o Host DuduQ.
   Versão 1.0.0

   PERFIL PARA ALFABETIZAÇÃO
   - alvos grandes;
   - movimento lento;
   - sem cronômetro;
   - estímulo auditivo + resposta visual sempre que possível.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Target Shooter] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "target-shooter";
  const VERSION = "1.0.0";
  const RUNTIME_VERSION = "2.0.2";

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

  function normalizeTargetConfig(question) {
    const config = question?.metadata?.targetShooter;

    if (!isObject(config)) {
      throw new Error(
        `[DuduQ Target Shooter] Questão ${question?.id || "sem-id"} não possui metadata.targetShooter.`
      );
    }

    if (!Array.isArray(config.items) || config.items.length < 2) {
      throw new Error(
        `[DuduQ Target Shooter] Questão ${question.id}: informe ao menos dois alvos.`
      );
    }

    const correctIds = Array.isArray(config.correctIds)
      ? config.correctIds
      : [];

    if (!correctIds.length) {
      throw new Error(
        `[DuduQ Target Shooter] Questão ${question.id}: correctIds é obrigatório.`
      );
    }

    return config;
  }

  function stageFromQuestion(question, index) {
    const config = normalizeTargetConfig(question);

    return {
      id: asString(question.id, `target-stage-${index + 1}`),
      title: asString(
        question.metadata?.screenTitle ||
        question.metadata?.title ||
        question.statement,
        "Listen & Choose"
      ),
      instruction: asString(
        question.instruction,
        "Ouça e acerte a cena correta."
      ),
      audioText: asString(
        config.audioText ||
        question?.media?.audio?.text ||
        question?.audio?.text
      ),
      mode: asString(config.mode, "audio-to-image"),
      shape: asString(config.shape, "balloon"),
      rule: {
        type: "ids",
        values: config.correctIds
      },
      difficulty: {
        speed: Number(config.difficulty?.speed) || 0.48,
        objectCount:
          Number(config.difficulty?.objectCount) ||
          config.items.length,
        spawnIntervalMs:
          Number(config.difficulty?.spawnIntervalMs) || 170,
        requiredCorrect:
          config.difficulty?.requiredCorrect ?? 1,
        targetSize:
          Number(config.difficulty?.targetSize) || 150,
        timeLimitMs: 0,
        timerMode: "none",
        ...config.difficulty,
        timeLimitMs: 0,
        timerMode: "none"
      },
      items: config.items,
      feedback: {
        success: asString(
          question.feedback?.correct,
          "Muito bem!"
        ),
        retry: asString(
          question.feedback?.incorrect,
          "Ouça novamente e observe as imagens."
        )
      }
    };
  }

  function buildRuntimeConfig(payload, questions) {
    return {
      schemaVersion: 1,
      mechanic: "target-shooter",
      version: RUNTIME_VERSION,
      title: asString(payload?.title, "Listen & Choose"),
      interfaceLocale: "pt-BR",
      learningLanguage: "en-US",
      sounds: {
        launch: null,
        hit: null,
        miss: null,
        complete: null
      },
      stages: questions.map(stageFromQuestion)
    };
  }

  function replaceConfig(html, config) {
    const startTag =
      '<script id="targetShooterConfig" type="application/json">';
    const start = html.indexOf(startTag);

    if (start < 0) {
      throw new Error(
        "[DuduQ Target Shooter] JSON de configuração não encontrado."
      );
    }

    const contentStart = start + startTag.length;
    const end = html.indexOf("</script>", contentStart);

    if (end < 0) {
      throw new Error(
        "[DuduQ Target Shooter] Fechamento do JSON não encontrado."
      );
    }

    const json = JSON.stringify(config)
      .replace(/</g, "\\u003c");

    return (
      html.slice(0, contentStart) +
      json +
      html.slice(end)
    );
  }

  function installCompletionBridge(html) {
    const pattern =
      /autoPlayInstruction:true,gamificationPolicy:/;

    if (!pattern.test(html)) {
      throw new Error(
        "[DuduQ Target Shooter] Ponto de integração do Lesson Host não encontrado."
      );
    }

    return html.replace(
      pattern,
      [
        'autoPlayInstruction:true,',
        'onLessonComplete:()=>window.parent.postMessage({',
        'type:"DUDUQ_TARGET_SHOOTER_COMPLETE"',
        '},"*"),',
        'gamificationPolicy:'
      ].join("")
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

  function validate(payload) {
    const list = extractQuestions(payload);
    if (!list.length) return false;

    try {
      list
        .map(normalizeQuestion)
        .forEach(normalizeTargetConfig);
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
      throw new Error("[DuduQ Target Shooter] Container não informado.");
    }

    const questions = extractQuestions(payload).map(normalizeQuestion);
    if (!questions.length) {
      throw new Error("[DuduQ Target Shooter] Nenhuma questão recebida.");
    }

    questions.forEach(normalizeTargetConfig);

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.minHeight = "0";
    wrapper.style.overflow = "hidden";
    wrapper.style.position = "relative";

    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Target Shooter";
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
    let completed = false;
    let stopChromeSync = null;

    const title = asString(payload?.title, "Listen & Choose");

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
        event.data?.type !==
          "DUDUQ_TARGET_SHOOTER_COMPLETE"
      ) {
        return;
      }

      finish();
    }

    window.addEventListener("message", handleMessage);

    iframe.addEventListener("load", function () {
      if (destroyed) return;

      try {
        stopChromeSync = installChromeSync(
          iframe.contentDocument,
          context,
          title
        );
      } catch (error) {
        console.warn(
          "[DuduQ Target Shooter] Chrome global não pôde ser sincronizado.",
          error
        );
      }
    });

    const runtimeUrl =
      getEngineBase() +
      "/engine/releases/mechanics/target-shooter/1.0.1/DUDUQ_TARGET_SHOOTER.html?engineAdapter=" +
      encodeURIComponent(VERSION);

    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ao carregar Target Shooter.`
          );
        }
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;

        const config = buildRuntimeConfig(payload, questions);
        let prepared = replaceConfig(html, config);
        prepared = installCompletionBridge(prepared);
        prepared = stampYear(prepared, context.year);
        iframe.srcdoc = prepared;
      })
      .catch((error) => {
        console.error(
          "[DuduQ Target Shooter] Falha ao preparar runtime:",
          error
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao preparar a atividade Target Shooter.";
        }
      });

    return function destroy() {
      destroyed = true;
      stopChromeSync?.();
      window.removeEventListener("message", handleMessage);
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
      name: "Target Shooter",
      category: "selecao-rapida-audiovisual",
      active: true,
      acceptsSchema: "1.0.0",
      globalProgress: true,
      literacyFriendly: true,
      routerProfile: {
        name: "Target Shooter",
        active: true,
        baseScore: 68,
        answerTypes: ["single"],
        answerTypeWeights: {
          single: 30
        },
        minAlternatives: 2,
        maxAlternatives: 8,
        supports: {
          questionImage: true,
          optionImageUrl: true,
          optionImageAssetKey: true,
          questionAudio: true,
          optionAudio: false
        },
        metadata: {
          category: "selecao-rapida-audiovisual",
          earlyLiteracy: true,
          timerRequired: false
        }
      }
    }
  });

  console.info("[DuduQ] Target Shooter registrado:", VERSION);
})();

/* DUDUQ English Year 2 — mechanics regression post-hotfix Router compatibility
   Keeps smart Bubble visuals in metadata.imageAssetKey (supported by Router),
   restores canonical Word Slash 1.0.17 fetch semantics, and quarantines active
   Year 2 Word Slash delivery while the frozen runtime has a confirmed object-spawn lock.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Mechanics Router Compat] Factory v2.3 indisponível.");
  }
  if (factory.__mechanicsRegressionRouterCompatApplied) return;

  const VERSION = "1.0.5-mechanics-regression-bubble-renderer-bridge";
  const WORD_SLASH_QUARANTINE_REASON = "WORD_SLASH_1_0_17_OBJECT_SPAWN_RUNTIME_LOCK";
  const originalBuild = factory.buildModule.bind(factory);

  function questions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/[.!?]/g, "")
      .replace(/\s+/g, " ");
  }

  function sourceAlternatives(question) {
    const source = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(source) && source.length) return source.map(String);
    return (question?.alternatives || []).map((alternative) =>
      String(
        alternative?.metadata?.sourceWrittenLabel ??
        alternative?.audio?.text ??
        alternative?.text ??
        ""
      )
    );
  }

  function sourceAnswer(question) {
    return String(
      question?.metadata?.sourceAnswerV23 ??
      question?.metadata?.sourceAnswer ??
      question?.metadata?.correctAnswerReinforcement?.writtenText ??
      ""
    );
  }

  function sourceAnswerIndex(question, labels) {
    const answer = normalize(sourceAnswer(question));
    const exact = labels.findIndex((label) => normalize(label) === answer);
    if (exact >= 0) return exact;
    const current = String(question?.answer?.value ?? "");
    const match = current.match(/(?:opt-|option-)(\d+)$/i);
    return match ? Math.max(0, Number(match[1]) - 1) : -1;
  }

  function disableMainImage(question) {
    question.image = { ...(question.image || {}), enabled: false, src: null, alt: "" };
    question.media = question.media || {};
    question.media.image = { ...(question.media.image || {}), enabled: false, src: null, alt: "" };
    if (question?.stimulus?.image) {
      question.stimulus.image = { ...question.stimulus.image, enabled: false, src: null, alt: "" };
    }
  }

  function normalizeBubble(question) {
    if (question?.delivery?.mechanic !== "bubble-pop") return false;

    disableMainImage(question);
    for (const alternative of question.alternatives || []) {
      if (!alternative || typeof alternative !== "object") continue;
      alternative.image = {
        ...(alternative.image || {}),
        enabled: false,
        src: null,
        alt: alternative?.image?.alt || ""
      };
      if (alternative?.audio) {
        alternative.audio = {
          ...alternative.audio,
          enabled: false,
          src: null,
          text: ""
        };
      }
    }
    question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
    question.metadata = question.metadata || {};
    question.metadata.mechanicsRegressionRouterCompatibility = {
      version: VERSION,
      mechanic: "bubble-pop",
      questionImageDisabled: true,
      optionImageUrlDisabled: true,
      optionImageAssetKeyPreserved: true,
      optionAudioDisabled: true,
      sourceAnswerPreserved: true,
      contentChanged: false
    };
    return true;
  }

  function quarantineWordSlash(question) {
    if (question?.delivery?.mechanic !== "word-slash") return false;

    const labels = sourceAlternatives(question);
    const correctIndex = sourceAnswerIndex(question, labels);
    if (labels.length < 2 || correctIndex < 0 || correctIndex >= labels.length) {
      throw new Error(`${question?.id || "sem-id"}: Word Slash não pode ser colocado em quarentena sem preservar o gabarito.`);
    }

    const answerText = sourceAnswer(question) || labels[correctIndex];
    const originalWordSlash = question?.metadata?.wordSlash
      ? JSON.parse(JSON.stringify(question.metadata.wordSlash))
      : null;

    question.delivery = {
      ...(question.delivery || {}),
      mechanic: "target-shooter",
      allowImage: false,
      allowAudio: true
    };
    question.alternatives = labels.map((label, index) => ({
      id: `opt-${index + 1}`,
      text: String(label),
      metadata: {
        sourceWrittenLabel: String(label),
        sourceMechanic: "word-slash"
      }
    }));
    question.answer = {
      type: "single",
      value: `opt-${correctIndex + 1}`
    };
    question.audio = {
      enabled: true,
      text: answerText,
      language: "en-US",
      role: "stimulus"
    };
    question.media = question.media || {};
    question.media.audio = {
      enabled: true,
      src: null,
      text: answerText,
      language: "en-US",
      role: "stimulus"
    };
    question.metadata = question.metadata || {};
    question.metadata.stimulusAudio = {
      enabled: true,
      text: answerText,
      language: "en-US",
      repeatable: true
    };
    question.metadata.targetShooter = {
      audioText: answerText,
      mode: "audio-to-word",
      shape: "balloon",
      correctIds: [`opt-${correctIndex + 1}`],
      difficulty: {
        speed: 0.24,
        objectCount: Math.min(4, labels.length),
        spawnIntervalMs: 320,
        requiredCorrect: 1,
        targetSize: 184
      },
      items: labels.map((label, index) => ({
        id: `opt-${index + 1}`,
        label: String(label),
        display: "text"
      }))
    };
    question.metadata.wordSlashRuntimeQuarantine = {
      version: VERSION,
      runtime: "1.0.17",
      reason: WORD_SLASH_QUARANTINE_REASON,
      sourceMechanic: "word-slash",
      fallbackMechanic: "target-shooter",
      sourceAnswerPreserved: true,
      originalWordSlash
    };
    question.metadata.mechanicsRegressionFallback = {
      version: VERSION,
      from: "word-slash",
      to: "target-shooter",
      reason: WORD_SLASH_QUARANTINE_REASON,
      sourceAnswerPreserved: true,
      reversible: true
    };
    delete question.metadata.wordSlash;
    disableMainImage(question);
    question.statement = "OUÇA E ATINJA A OPÇÃO";
    question.instruction = question.statement;
    return true;
  }

  /*
   * Activities are the unit validated by the public Player. If a post-build
   * compatibility layer changes a question mechanic, the containing activity
   * must declare that same final mechanic. We only synchronize homogeneous
   * activities; a mixed final activity is an integrity error and must never be
   * silently published.
   */
  function synchronizeActivityMechanics(module) {
    let synchronized = 0;
    for (const activity of module?.activities || []) {
      const activityQuestions = Array.isArray(activity?.questions) ? activity.questions : [];
      if (!activityQuestions.length) continue;
      const finalMechanics = [...new Set(
        activityQuestions
          .map((question) => String(question?.delivery?.mechanic || activity.mechanic || "").trim())
          .filter(Boolean)
      )];
      if (finalMechanics.length !== 1) {
        throw new Error(
          `[DuduQ Year2 Mechanics Router Compat] Atividade ${activity?.id || "sem-id"} ficou mista após pós-processamento: ${finalMechanics.join(", ") || "sem mecânica"}.`
        );
      }
      const finalMechanic = finalMechanics[0];
      if (activity.mechanic !== finalMechanic) {
        activity.mechanic = finalMechanic;
        synchronized += 1;
      }
    }
    return synchronized;
  }

  /*
   * Bubble Pop 1.0.31 keeps BUBBLE_POP_ASSETS inside the bundle closure. Browser
   * diagnostics proved that official Year 2 imageAssetKey URLs reach the iframe,
   * but that lexical asset map cannot be extended from the parent document.
   *
   * Load a Year-2-only renderer bridge instead. The bridge runs before the
   * public adapter sends DUDUQ_LOAD_CONTENT and intercepts only BubblePopMedia
   * when imageAssetKey is an approved Assets-DuduQ URL (or deterministic data
   * image fallback). No immutable release file or Canary manifest is modified.
   */
  function installBubbleSmartRendererBridgeScript() {
    if (window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_BRIDGE_REQUESTED__) return;

    const existing = document.querySelector('script[data-duduq-year2-bubble-smart-renderer="true"]');
    if (existing) {
      window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_BRIDGE_REQUESTED__ = VERSION;
      return;
    }

    const currentSrc = String(document.currentScript?.src || location.href);
    const script = document.createElement("script");
    script.src = new URL(
      `./year2-v23-bubble-smart-renderer-bridge.js?v=${encodeURIComponent(VERSION)}`,
      currentSrc
    ).href;
    script.async = false;
    script.dataset.duduqYear2BubbleSmartRenderer = "true";
    script.onerror = () => console.error("[DuduQ Year2 Mechanics Router Compat] Falha ao carregar a ponte visual do Bubble Pop.");
    (document.head || document.documentElement).appendChild(script);
    window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_BRIDGE_REQUESTED__ = VERSION;
  }

  /*
   * RC1 temporarily changed the fetched Word Slash launch trajectory and first
   * spawn delay. Diagnostics RC3/RC4 showed that the 1.0.17 runtime locks when
   * the first object enters React/DOM even without World Fusion. This guard keeps
   * the immutable 1.0.17 HTML semantically canonical for any diagnostic fetch;
   * active Year 2 delivery is quarantined separately above.
   */
  function installCanonicalWordSlashRuntimeGuard() {
    if (window.__DUDUQ_YEAR2_WORD_SLASH_CANONICAL_PHYSICS_GUARD__) return;
    if (typeof window.fetch !== "function" || typeof window.Response !== "function") return;

    const upstreamFetch = window.fetch.bind(window);
    window.fetch = function year2CanonicalWordSlashFetch(input, init) {
      return upstreamFetch(input, init).then(async (response) => {
        const url = typeof input === "string" ? input : (input?.url || response.url || "");
        if (!/\/DUDUQ_WORD_SLASH\.html(?:\?|$)/i.test(String(url))) return response;

        let html = await response.text();
        html = html.replace(
          "const startY = Math.max(8, arenaHeight - metrics.height - 10);",
          "const startY = arenaHeight + metrics.height + 12;"
        );
        html = html.replace(
          'const initialIds = presentation.initialObjectIds || []; if (initialIds.length) initialIds.forEach((id, index) => timers.push(schedule(() => spawnObject(id), 90 + index * 220))); else timers.push(schedule(() => spawnObject(), 90));',
          '(presentation.initialObjectIds || []).forEach((id, index) => timers.push(schedule(() => spawnObject(id), 180 + index * 300)));'
        );

        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      });
    };

    window.__DUDUQ_YEAR2_WORD_SLASH_CANONICAL_PHYSICS_GUARD__ = VERSION;
  }

  function postProcess(module) {
    let bubbleItems = 0;
    let quarantinedWordSlashItems = 0;

    for (const question of questions(module)) {
      if (normalizeBubble(question)) bubbleItems += 1;
      if (quarantineWordSlash(question)) quarantinedWordSlashItems += 1;
    }

    const synchronizedActivities = synchronizeActivityMechanics(module);
    installBubbleSmartRendererBridgeScript();
    installCanonicalWordSlashRuntimeGuard();

    const audit = Object.freeze({
      version: VERSION,
      patchedBubbleItems: bubbleItems,
      bubbleSmartRendererBridgeRequested: true,
      quarantinedWordSlashItems,
      synchronizedActivities,
      activityMechanicsHomogeneous: true,
      wordSlashRuntime: "1.0.17",
      wordSlashRuntimeBlocked: quarantinedWordSlashItems > 0,
      wordSlashQuarantineReason: quarantinedWordSlashItems > 0 ? WORD_SLASH_QUARANTINE_REASON : null,
      optionImageAssetKeyPreserved: true,
      canonicalWordSlashPhysicsRestored: true,
      wordSlashReleaseModified: false,
      bubblePopReleaseModified: false,
      canaryModified: false,
      contentChanged: false,
      sourceAnswersPreserved: true
    });
    return Object.freeze({
      ...module,
      mechanicsRegressionRouterCompatibilityAudit: audit,
      audit: { ...(module.audit || {}), mechanicsRegressionRouterCompatibility: audit }
    });
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __mechanicsRegressionRouterCompatApplied: true,
    mechanicsRegressionRouterCompatVersion: VERSION
  });
})();

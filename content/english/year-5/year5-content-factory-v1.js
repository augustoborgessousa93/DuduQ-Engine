/* DUDUQ English Year 5 — integrated functional content factory v1.0.0
   Source contract: DUDUQ English pedagogical revision v2.3.
   CONTENT-only helper. No mechanic release, scoring or runtime-layout patch.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQYear5Factory?.version === VERSION) return;

  function text(value, fallback = "") {
    const out = String(value == null ? "" : value).trim();
    return out || fallback;
  }

  function difficulty(value) {
    const raw = text(value).toLowerCase();
    if (raw.includes("dif") || raw === "hard") return "hard";
    if (raw.includes("méd") || raw.includes("med") || raw === "medium") return "medium";
    return "easy";
  }

  function esc(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function svgData(svg) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function contextCard(label, icon = "🔎", sublabel = "") {
    const safeLabel = esc(label);
    const safeSub = esc(sublabel);
    return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="460" viewBox="0 0 760 460" role="img" aria-label="${safeLabel}">
      <rect width="760" height="460" rx="44" fill="#ffffff"/>
      <rect x="28" y="28" width="704" height="404" rx="36" fill="#f7fbff" stroke="#9dbdd7" stroke-width="7"/>
      <circle cx="380" cy="172" r="104" fill="#4a90c2" opacity=".14"/>
      <text x="380" y="215" text-anchor="middle" font-family="Arial,sans-serif" font-size="105">${esc(icon)}</text>
      <text x="380" y="340" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" font-weight="900" fill="#173f67">${safeLabel}</text>
      ${safeSub ? `<text x="380" y="390" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#58738b">${safeSub}</text>` : ""}
    </svg>`);
  }

  function semanticCard(query) {
    const raw = text(query);
    if (!raw || !raw.includes(":")) return null;
    const parts = raw.split(":");
    const kind = text(parts[0]).toLowerCase();
    const value = parts.slice(1).join(":").replace(/-/g, " ");

    if (kind === "profile") return {src:contextCard(value || "profile","👤","perfil fictício"),status:"semantic-context",visualKey:raw};
    if (kind === "map") return {src:contextCard(value || "map","🗺️","mapa como apoio contextual"),status:"semantic-context",visualKey:raw};
    if (kind === "time") return {src:contextCard(value || "time","🕒","rotina e horário"),status:"semantic-context",visualKey:raw};
    if (kind === "routine") return {src:contextCard(value || "routine","⏰","daily routine"),status:"semantic-context",visualKey:raw};
    if (kind === "preference") return {src:contextCard(value || "preference","⭐","preference card"),status:"semantic-context",visualKey:raw};
    if (kind === "scene") return {src:contextCard(value || "scene","🖼️","cena contextual"),status:"semantic-context",visualKey:raw};
    return null;
  }

  function resolveVisual(query, expression) {
    const semantic = semanticCard(query);
    if (semantic?.src) return semantic;
    try {
      const result = window.DuduQSmartVisual?.resolve?.(query, { expression });
      if (result?.src) return result;
    } catch (_) {}
    try {
      const src = window.DuduQAssets?.resolveImage?.(query);
      if (src) return { src, status: "official", visualKey: "official:" + query };
    } catch (_) {}
    return { src: null, status: "asset-gap", visualKey: "gap:" + text(query).toLowerCase() };
  }

  function alternativeRecord(alternative) {
    const out = { id: alternative.id, text: text(alternative.text) };
    const spoken = text(alternative.audioText, alternative.text);
    if (spoken) {
      out.audio = { enabled: true, text: spoken, language: "en-US", role: "option" };
      out.metadata = {
        speechText: spoken,
        speechLanguage: "en-US",
        textOptional: false,
        readingScaffold: true
      };
    }
    if (alternative.imageQuery) {
      const visual = resolveVisual(alternative.imageQuery, alternative.expression);
      if (visual.src) out.image = { enabled: true, src: visual.src, alt: text(alternative.imageAlt, alternative.text) };
      out.metadata = {
        ...(out.metadata || {}),
        visualResolution: { status: visual.status, visualKey: visual.visualKey, requested: alternative.imageQuery }
      };
    }
    return out;
  }

  function questionFor(item, moduleSpec) {
    const question = {
      id: item.id,
      subject: "english",
      year: 5,
      module: moduleSpec.module,
      skill: { code: null, description: item.skill },
      difficulty: difficulty(item.difficulty),
      statement: item.prompt,
      instruction: item.instruction || "Leia, observe o contexto e arraste a resposta correta. Use o áudio quando precisar.",
      contentLanguage: "en",
      instructionLanguage: "pt-BR",
      feedbackLanguage: "pt-BR",
      alternatives: item.alternatives.map(alternativeRecord),
      feedback: {
        correct: "Muito bem!",
        incorrect: "Releia, observe a pista ou ouça novamente e tente outra vez."
      },
      delivery: { mechanic: "drag-drop", preferred: ["drag-drop"], blocked: [] },
      metadata: {
        sourceStatus: item.status,
        sourceSkill: item.skill,
        sourceAbility: item.ability,
        sourceStatement: item.prompt,
        sourceMedia: item.media,
        sourceFormat: item.format,
        sourceMechanic: item.sourceMechanic,
        sourceReading: item.reading,
        sourceAnswer: item.answer,
        literacyProfile: "Y5_INTEGRATED_FUNCTIONAL",
        readingMode: "FUNCIONAL",
        functionalReading: true,
        contextualReading: true,
        fourSkillsIntegration: true,
        sourceVersion: "DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3",
        assetStatus: "smart-resolver-first"
      }
    };

    if (item.listenText) {
      question.audio = { enabled: true, text: item.listenText, language: "en-US", role: "content" };
    }

    const visualQuery = text(item.visualQuery);
    const visual = visualQuery ? resolveVisual(visualQuery, item.expression) : null;
    const target = { id: "answer-target", label: "Observe, leia e ouça", capacity: 1, kind: "box" };
    if (visual?.src) {
      target.image = { src: visual.src, alt: text(item.visualAlt, visualQuery) };
      target.alt = text(item.visualAlt, visualQuery);
    }
    if (item.listenText) {
      target.audio = { text: item.listenText, language: "en-US", description: "Ouvir pista em inglês" };
    }

    question.answer = { type: "pairs", value: [[item.answer.id, "answer-target"]] };
    question.metadata.targets = [target];
    question.metadata.visualResolution = visual
      ? { status: visual.status, visualKey: visual.visualKey, requested: visualQuery }
      : { status: "not-required", visualKey: "", requested: "" };

    return question;
  }

  function buildModule(spec) {
    const activities = spec.items.map(function (item, index) {
      return {
        id: `y5-m${String(spec.module).padStart(2, "0")}-a${String(index + 1).padStart(2, "0")}`,
        title: item.topic || spec.title,
        topic: item.topic || spec.title,
        mechanic: "drag-drop",
        questions: [questionFor(item, spec)]
      };
    });

    return {
      id: `duduq-english-y5-module-${String(spec.module).padStart(2, "0")}`,
      version: spec.version || "1.0.0-v23-integrated-functional",
      subject: "english",
      year: 5,
      module: spec.module,
      title: spec.title,
      description: spec.objective,
      estimatedMinutes: 16,
      pedagogyPolicy: {
        specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.1",
        profile: "Y5_INTEGRATED_FUNCTIONAL",
        priority: "integrate-four-skills-functional-context-transfer",
        readingMode: "FUNCIONAL",
        functionalReading: true,
        contextualReading: true,
        fourSkillsIntegration: true,
        transferToNewSituations: true,
        multimodalityPriority: true
      },
      factory: {
        source: "DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3.docx",
        sourceRevision: "Revisão Pedagógica Integral v2.3",
        scaleChannel: "scale-v1",
        thinContent: true,
        yearSpecificMechanicPatch: false,
        routingContract: "activity.mechanic === question.delivery.mechanic"
      },
      activities
    };
  }

  function publish(spec) {
    window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
    window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
    window.DUDUQ_CONTENT.english.year5 = window.DUDUQ_CONTENT.english.year5 || {};
    const key = `module${String(spec.module).padStart(2, "0")}`;
    window.DUDUQ_CONTENT.english.year5[key] = buildModule(spec);
    return window.DUDUQ_CONTENT.english.year5[key];
  }

  window.DuduQYear5Factory = Object.freeze({ version: VERSION, buildModule, publish, resolveVisual });
})();

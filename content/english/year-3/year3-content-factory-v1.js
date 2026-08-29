/* DUDUQ English Year 3 — multimodal content factory v1.1.0
   Source contract: DUDUQ English pedagogical revision v2.3.
   CONTENT-only helper. It does not patch mechanic releases, layout runtimes or scoring.
*/
(function () {
  "use strict";
  const VERSION = "1.1.0";
  if (window.DuduQYear3Factory?.version === VERSION) return;

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

  function semanticCard(query) {
    const raw = text(query);
    if (!raw) return null;
    const parts = raw.split(":");
    const kind = parts[0].toLowerCase();

    if (kind === "calendar" && parts.length >= 3) {
      const month = text(parts[1]);
      const day = text(parts[2]);
      const label = month.charAt(0).toUpperCase() + month.slice(1);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
        <rect width="640" height="420" rx="42" fill="#ffffff"/>
        <rect x="36" y="42" width="568" height="336" rx="34" fill="#f6f9fd" stroke="#89a8c7" stroke-width="8"/>
        <rect x="36" y="42" width="568" height="92" rx="34" fill="#dfeefa"/>
        <circle cx="145" cy="74" r="15" fill="#3d6f9e"/><circle cx="495" cy="74" r="15" fill="#3d6f9e"/>
        <text x="320" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="54" font-weight="800" fill="#234b72">${esc(label)}</text>
        <text x="320" y="312" text-anchor="middle" font-family="Arial,sans-serif" font-size="170" font-weight="900" fill="#173f67">${esc(day)}</text>
      </svg>`;
      return { src: svgData(svg), status: "semantic-context", visualKey: `calendar:${month}:${day}` };
    }

    if (kind === "profile") {
      const name = text(parts[1], "Maya");
      let age = text(parts[2]);
      if (name.toLowerCase() === "maya" && !age) age = "9";
      const isFullMaya = name.toLowerCase() === "maya" && (age === "9" || !parts[2]);
      const birthday = isFullMaya ? "May 12" : "";
      const animal = isFullMaya ? "dog" : "";
      const initial = name.charAt(0).toUpperCase();
      const rows = [
        ["NAME", name],
        age ? ["AGE", age] : null,
        birthday ? ["BIRTHDAY", birthday] : null,
        animal ? ["FAVORITE ANIMAL", animal] : null
      ].filter(Boolean);
      const rowSvg = rows.map((row, index) => {
        const y = 155 + index * 66;
        return `<text x="220" y="${y}" font-family="Arial,sans-serif" font-size="25" font-weight="800" fill="#526b82">${esc(row[0])}</text>
          <text x="220" y="${y + 30}" font-family="Arial,sans-serif" font-size="34" font-weight="900" fill="#173f67">${esc(row[1])}</text>`;
      }).join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="520" viewBox="0 0 760 520">
        <rect width="760" height="520" rx="44" fill="#ffffff"/>
        <rect x="28" y="28" width="704" height="464" rx="36" fill="#f8fbfe" stroke="#93b4d2" stroke-width="7"/>
        <circle cx="126" cy="174" r="76" fill="#dceefa" stroke="#5d8eb8" stroke-width="7"/>
        <text x="126" y="198" text-anchor="middle" font-family="Arial,sans-serif" font-size="72" font-weight="900" fill="#2d648f">${esc(initial)}</text>
        <path d="M68 312c0-55 37-92 58-92s58 37 58 92v76H68z" fill="#8fc2e8"/>
        ${rowSvg}
      </svg>`;
      return { src: svgData(svg), status: "semantic-context", visualKey: `profile:${name.toLowerCase()}:${age || "na"}` };
    }

    if (kind === "duo" && parts.length >= 3) {
      const left = text(parts[1]);
      const right = text(parts[2]);
      const avatar = (cx, label, fill) => `<circle cx="${cx}" cy="190" r="86" fill="${fill}" stroke="#5c86aa" stroke-width="7"/>
        <text x="${cx}" y="214" text-anchor="middle" font-family="Arial,sans-serif" font-size="76" font-weight="900" fill="#234b72">${esc(label.charAt(0).toUpperCase())}</text>
        <text x="${cx}" y="340" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="900" fill="#173f67">${esc(label.charAt(0).toUpperCase()+label.slice(1))}</text>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="430" viewBox="0 0 760 430">
        <rect width="760" height="430" rx="44" fill="#ffffff"/>
        <rect x="28" y="28" width="704" height="374" rx="36" fill="#f8fbfe" stroke="#93b4d2" stroke-width="7"/>
        ${avatar(245,left,"#dceefa")}${avatar(515,right,"#f6e0ef")}
      </svg>`;
      return { src: svgData(svg), status: "semantic-context", visualKey: `duo:${left.toLowerCase()}:${right.toLowerCase()}` };
    }

    if (kind === "math" && parts.length >= 2) {
      const expression = text(parts[1]);
      const operator = text(parts[2]);
      const highlighted = esc(expression).replace(esc(operator), `<tspan fill="#d44343">${esc(operator)}</tspan>`);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="400" viewBox="0 0 760 400">
        <rect width="760" height="400" rx="44" fill="#ffffff"/>
        <rect x="34" y="34" width="692" height="332" rx="34" fill="#f8fbfe" stroke="#93b4d2" stroke-width="7"/>
        <text x="380" y="235" text-anchor="middle" font-family="Arial,sans-serif" font-size="92" font-weight="900" fill="#173f67">${highlighted}</text>
      </svg>`;
      return { src: svgData(svg), status: "semantic-context", visualKey: `math:${expression}:${operator}` };
    }

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
        textOptional: alternative.textOptional !== false
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

  function baseQuestion(item, moduleSpec) {
    const declaredMechanic = text(item.mechanic, "drag-drop");
    const question = {
      id: item.id,
      subject: "english",
      year: 3,
      module: moduleSpec.module,
      skill: { code: null, description: item.skill },
      difficulty: difficulty(item.difficulty),
      statement: item.prompt,
      instruction: item.instruction || (declaredMechanic === "drag-drop"
        ? "Observe o apoio visual, ouça as opções e arraste a resposta correta."
        : "Ouça com atenção e toque na resposta correta."),
      contentLanguage: "en",
      instructionLanguage: "pt-BR",
      feedbackLanguage: "pt-BR",
      alternatives: item.alternatives.map(alternativeRecord),
      feedback: {
        correct: "Muito bem!",
        incorrect: "Ouça novamente, observe a pista e tente outra vez."
      },
      delivery: {
        mechanic: declaredMechanic,
        preferred: [declaredMechanic],
        blocked: []
      },
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
        literacyProfile: "Y3_LITERACY_TRANSITION",
        readingAutonomyRequired: false,
        spellingRole: "supported-exposure",
        sourceVersion: "DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3",
        assetStatus: "smart-resolver-first"
      }
    };
    if (item.listenText) {
      question.audio = { enabled: true, text: item.listenText, language: "en-US", role: "content" };
    }
    return question;
  }

  function dragDropQuestion(item, moduleSpec) {
    const question = baseQuestion(item, moduleSpec);
    const visualQuery = text(item.visualQuery);
    const visual = visualQuery ? resolveVisual(visualQuery, item.expression) : null;
    const target = {
      id: "answer-target",
      label: item.targetLabel || "Observe e ouça",
      capacity: 1,
      kind: "box"
    };
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

  function targetShooterQuestion(item, moduleSpec) {
    const question = baseQuestion(item, moduleSpec);
    question.answer = { type: "single", value: item.answer.id };
    question.audio = { enabled: true, text: item.listenText || item.answer.text, language: "en-US", role: "content" };
    question.metadata.targetShooter = {
      audioText: item.listenText || item.answer.text,
      mode: "audio-to-choice",
      shape: "balloon",
      correctIds: [item.answer.id],
      difficulty: {
        speed: question.difficulty === "hard" ? 0.42 : question.difficulty === "medium" ? 0.34 : 0.28,
        objectCount: item.alternatives.length,
        spawnIntervalMs: 900,
        requiredCorrect: 1,
        targetSize: 172,
        timeLimitMs: 0,
        timerMode: "none"
      },
      items: item.alternatives.map(function (alternative) {
        return {
          id: alternative.id,
          label: alternative.text,
          alt: alternative.text,
          spokenText: alternative.audioText || alternative.text,
          speechLocale: "en-US"
        };
      })
    };
    return question;
  }

  function questionFor(item, moduleSpec) {
    if (item.mechanic === "target-shooter") return targetShooterQuestion(item, moduleSpec);
    return dragDropQuestion(item, moduleSpec);
  }

  function buildModule(spec) {
    const activities = spec.items.map(function (item, index) {
      const mechanic = item.mechanic || "drag-drop";
      return {
        id: `y3-m${String(spec.module).padStart(2, "0")}-a${String(index + 1).padStart(2, "0")}`,
        title: item.topic || spec.title,
        topic: item.topic || spec.title,
        mechanic,
        questions: [questionFor(item, spec)]
      };
    });

    return {
      id: `duduq-english-y3-module-${String(spec.module).padStart(2, "0")}`,
      version: spec.version || "1.1.0-v23-multimodal",
      subject: "english",
      year: 3,
      module: spec.module,
      title: spec.title,
      description: spec.objective,
      estimatedMinutes: 12,
      pedagogyPolicy: {
        specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.1",
        profile: "Y3_LITERACY_TRANSITION",
        priority: "listen-associate-supported-writing",
        audioRepeatable: true,
        autonomousReadingRequired: false,
        longAutonomousReading: false,
        fictitiousProfilesOnly: true,
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
    window.DUDUQ_CONTENT.english.year3 = window.DUDUQ_CONTENT.english.year3 || {};
    const key = `module${String(spec.module).padStart(2, "0")}`;
    window.DUDUQ_CONTENT.english.year3[key] = buildModule(spec);
    return window.DUDUQ_CONTENT.english.year3[key];
  }

  window.DuduQYear3Factory = Object.freeze({ version: VERSION, buildModule, publish, resolveVisual });
})();

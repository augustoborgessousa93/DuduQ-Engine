/* DUDUQ English Year 2 — Gamification Diversity v1
   HOMOLOGATION ONLY.

   This overlay receives the already-built v2.3 multimodal module and changes
   only the gamification representation of selected stable question IDs.

   Canonical pedagogical truth remains in v2.3 metadata:
   - sourcePromptV23
   - sourceAlternativesV23
   - sourceAnswerV23
   - skill / topic / difficulty / source IDs

   No vocabulary, source alternative, source answer or question ID is created,
   removed or replaced by this layer.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-homolog";

  const PLAN = Object.freeze({
    /* M01 — keep the already diverse alphabet section; break the five-shot greeting streak. */
    "EN2-M1-01": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M1-03": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M1-05": { mechanic:"bubble-pop", presentation:"audio-to-visual" },

    /* M02 — Numbers & Family. */
    "EN2-M2-01": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M2-02": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M2-03": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M2-05": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M2-06": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M2-07": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M2-08": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M2-09": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M2-11": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M2-12": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M2-14": { mechanic:"bubble-pop", presentation:"audio-to-visual" },

    /* M03 — Toys, Colors & Favorites. */
    "EN2-M3-01": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M3-02": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M3-03": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M3-05": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M3-06": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M3-07": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M3-08": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M3-10": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M3-11": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M3-12": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M3-14": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M3-15": { mechanic:"target-shooter", presentation:"audio-to-visual" },

    /* M04 — Animals & Shapes. */
    "EN2-M4-01": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M4-02": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M4-03": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M4-05": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M4-06": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M4-07": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M4-08": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M4-10": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M4-11": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M4-12": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M4-14": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M4-15": { mechanic:"target-shooter", presentation:"audio-to-visual" },

    /* M05 — Human Body. */
    "EN2-M5-01": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M5-02": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M5-03": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M5-05": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M5-06": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M5-07": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M5-08": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M5-10": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M5-11": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M5-12": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M5-13": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M5-15": { mechanic:"target-shooter", presentation:"audio-to-visual" },

    /* M06 — Food, Colors, Numbers & Size. Keep existing audio→image TS items 11/12. */
    "EN2-M6-01": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M6-02": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M6-03": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M6-05": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M6-06": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M6-07": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M6-08": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M6-09": { mechanic:"bubble-pop", presentation:"audio-to-visual" },
    "EN2-M6-10": { mechanic:"target-shooter", presentation:"audio-to-visual" },
    "EN2-M6-13": { mechanic:"matching", presentation:"audio-to-visual" },
    "EN2-M6-14": { mechanic:"bubble-pop", presentation:"audio-to-visual" }
  });

  const NUMBER = Object.freeze({
    one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",ten:"10",
    eleven:"11",twelve:"12",thirteen:"13",fourteen:"14",fifteen:"15",sixteen:"16",seventeen:"17",eighteen:"18",nineteen:"19",twenty:"20"
  });
  const COLOR = Object.freeze({ red:"🔴", blue:"🔵", green:"🟢", yellow:"🟡", brown:"🟤", white:"⚪", orange:"🟠", purple:"🟣" });
  const ICON = Object.freeze({
    hi:"👋", hello:"🤝", "good morning":"🌅", "good afternoon":"☀️", "good night":"🌙", bye:"🚪👋", "see you":"👋", "see you later":"🕒👋",
    family:"👨‍👩‍👧‍👦", mother:"👩", father:"👨", brother:"👦", sister:"👧", grandfather:"👴", grandmother:"👵",
    doll:"🪆", ball:"⚽", train:"🚂", plane:"✈️", "teddy bear":"🧸", "video game":"🎮", kite:"🪁", boat:"⛵",
    duck:"🦆", horse:"🐴", cow:"🐄", pig:"🐷", sheep:"🐑", dog:"🐕",
    triangle:"🔺", square:"◼️", rectangle:"▭", star:"⭐", circle:"⚪",
    head:"🙂", eye:"👁️", ear:"👂", nose:"👃", mouth:"👄", knee:"🦵", leg:"🦵", legs:"🦵🦵", shoulder:"🧍", shoulders:"🧍", hand:"✋", hands:"👐", finger:"☝️", foot:"🦶", feet:"🦶🦶", arm:"💪", arms:"💪💪",
    apple:"🍎", pear:"🍐", banana:"🍌", orange:"🍊", grape:"🍇", grapes:"🍇", papaya:"🥭", melon:"🍈", carrot:"🥕", tomato:"🍅", potato:"🥔"
  });

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function cleanSourceText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[.!?]/g, "")
      .replace(/[’']/g, "'")
      .replace(/^it's\s+(?:a|an)\s+/, "")
      .replace(/^this is my\s+/, "")
      .replace(/^a\s+/, "")
      .trim();
  }

  function tokenIcon(token) {
    const singular = token.replace(/s$/, "");
    return ICON[token] || ICON[singular] || "";
  }

  function visualLabel(value) {
    const original = String(value || "").trim();
    const normalized = cleanSourceText(original);
    if (!normalized) return "●";

    if (/^this is my family/i.test(original)) return ICON.family;
    if (/^see you later/i.test(normalized)) return ICON["see you later"];
    if (/^see you/i.test(normalized)) return ICON["see you"];
    if (ICON[normalized]) return ICON[normalized];
    if (NUMBER[normalized]) return NUMBER[normalized];

    const tokens = normalized.split(/\s+/).filter(Boolean);
    const number = tokens.map((token) => NUMBER[token]).find(Boolean) || "";
    const color = tokens.map((token) => COLOR[token]).find(Boolean) || "";
    const objectToken = [...tokens].reverse().find((token) => tokenIcon(token));
    const object = objectToken ? tokenIcon(objectToken) : "";

    const big = tokens.includes("big") ? "⬆️" : "";
    const small = tokens.includes("small") ? "⬇️" : "";
    const pluralOnly = !number && objectToken && /s$/.test(objectToken) && !["hands","legs","arms","feet","shoulders","grapes"].includes(objectToken);
    const repeated = pluralOnly && object ? object + object : object;
    const composed = [number, color, big || small, repeated].filter(Boolean).join(" ");
    if (composed) return composed;

    /* Isolated alphabet symbols are visual symbols, not autonomous word reading. */
    if (/^[a-z]$/i.test(original)) return original.toUpperCase();

    /* Last-resort non-reading marker. The canonical source text is still kept
       in metadata and audio; this marker never becomes pedagogical content. */
    return "◉";
  }

  function canonical(question) {
    const metadata = question.metadata || {};
    const alternatives = clone(metadata.sourceAlternativesV23 || []);
    const answerText = String(metadata.sourceAnswerV23 || "");
    if (!question.id || !alternatives.length || !answerText) {
      throw new Error(`[Year2 Gamification Diversity] Fonte v2.3 incompleta em ${question.id || "sem-id"}.`);
    }
    const current = Array.isArray(question.alternatives) ? question.alternatives : [];
    if (current.length !== alternatives.length) {
      throw new Error(`[Year2 Gamification Diversity] Quantidade de alternativas divergiu em ${question.id}.`);
    }
    const answerIndex = alternatives.findIndex((value) => String(value) === answerText);
    if (answerIndex < 0) {
      throw new Error(`[Year2 Gamification Diversity] Resposta canônica não pertence às alternativas em ${question.id}.`);
    }
    const optionIds = current.map((alt, index) => String(alt?.id || `opt-${index + 1}`));
    return { alternatives, answerText, answerIndex, optionIds, correctId:optionIds[answerIndex] };
  }

  function setEnglishStimulus(question, text) {
    question.audio = { enabled:true, text, language:"en-US", role:"stimulus" };
    question.media = { ...(question.media || {}), audio:{ enabled:true, text, language:"en-US", role:"stimulus" } };
    question.metadata.stimulusAudio = { enabled:true, text, language:"en-US", repeatable:true };
  }

  function visualOptions(question, source) {
    question.alternatives = source.alternatives.map((sourceText, index) => ({
      id:source.optionIds[index],
      text:visualLabel(sourceText),
      metadata:{
        sourceWrittenLabel:String(sourceText),
        writtenLabelVisibleBeforeAnswer:false,
        speechText:String(sourceText),
        gamificationVisualOnly:true
      }
    }));
  }

  function transformMatching(question, source) {
    question.delivery = { ...(question.delivery || {}), mechanic:"matching", allowAudio:true, allowImage:true };
    question.answer = { type:"single", value:source.correctId };
    setEnglishStimulus(question, source.answerText);
    question.statement = "OUÇA E CONECTE";
    question.instruction = question.statement;
    question.metadata.optionPresentation = "AUDIO_TO_VISUAL_MATCHING";
    question.metadata.matching = {
      mode:"audio-image",
      leftTitle:"Ouça",
      rightTitle:"Conecte",
      leftItems:[{
        id:"stimulus-audio",
        spokenText:source.answerText,
        speechLocale:"en-US",
        audioDescription:"Ouvir novamente"
      }],
      rightItems:source.alternatives.map((sourceText, index) => ({
        id:`right-${source.optionIds[index]}`,
        label:visualLabel(sourceText),
        alt:`Representação visual da alternativa ${index + 1}`,
        sourceWrittenLabel:String(sourceText)
      })),
      pairs:[{ leftId:"stimulus-audio", rightId:`right-${source.correctId}` }],
      behavior:{
        lockLeftOrder:true,
        shuffleRight:true,
        connectionMode:"1x1",
        interactionMode:"smart",
        allowRightDistractors:true,
        lockCorrectPairsOnRetry:true
      }
    };
  }

  function transformBubble(question, source) {
    question.delivery = { ...(question.delivery || {}), mechanic:"bubble-pop", allowAudio:true, allowImage:true };
    question.answer = { type:"single", value:source.correctId };
    setEnglishStimulus(question, source.answerText);
    visualOptions(question, source);
    question.statement = "OUÇA E ESTOURE";
    question.instruction = question.statement;
    question.metadata.optionPresentation = "AUDIO_TO_VISUAL_BUBBLES";
    question.metadata.behavior = { ...(question.metadata.behavior || {}), shuffleBubbles:true };
  }

  function transformTarget(question, source) {
    question.delivery = { ...(question.delivery || {}), mechanic:"target-shooter", allowAudio:true, allowImage:true };
    question.answer = { type:"single", value:source.correctId };
    setEnglishStimulus(question, source.answerText);
    question.statement = "OUÇA E ATINJA";
    question.instruction = question.statement;
    question.metadata.optionPresentation = "AUDIO_TO_VISUAL_TARGETS";
    question.metadata.targetShooter = {
      audioText:source.answerText,
      mode:"audio-to-image",
      shape:"balloon",
      correctIds:[source.correctId],
      difficulty:{ speed:.28, objectCount:source.optionIds.length, spawnIntervalMs:260, requiredCorrect:1, targetSize:176, timeLimitMs:0, timerMode:"none" },
      items:source.alternatives.map((sourceText, index) => ({
        id:source.optionIds[index],
        label:visualLabel(sourceText),
        alt:`Representação visual da alternativa ${index + 1}`,
        display:"text",
        sourceWrittenLabel:String(sourceText)
      }))
    };
  }

  function originalMechanicMap(module) {
    const map = new Map();
    for (const activity of module.activities || []) {
      for (const question of activity.questions || []) map.set(question.id, activity.mechanic || question.delivery?.mechanic || "");
    }
    return map;
  }

  function regroup(module, questions) {
    const activities = [];
    let current = null;
    for (const question of questions) {
      const mechanic = question.delivery?.mechanic || question.metadata?.gamificationReview?.newMechanic || "drag-drop";
      const topic = String(question.metadata?.topic || module.title || "").toUpperCase();
      const forceOwn = question.metadata?.forceOwnActivity === true;
      if (forceOwn || !current || current.mechanic !== mechanic || current.topic !== topic || current.questions.length >= 4) {
        current = {
          id:`${question.id.toLowerCase()}-${String(mechanic).replace(/[^a-z0-9-]/gi,"-")}-${topic.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
          title:topic || module.title,
          topic:topic || module.title,
          mechanic,
          skill:question.skill,
          questions:[]
        };
        activities.push(current);
      }
      current.questions.push(question);
      if (forceOwn) current = null;
    }
    return activities;
  }

  function distribution(activities) {
    const out = {};
    for (const activity of activities || []) {
      for (const _question of activity.questions || []) out[activity.mechanic] = (out[activity.mechanic] || 0) + 1;
    }
    return out;
  }

  function apply(sourceModule) {
    if (!sourceModule || !Array.isArray(sourceModule.activities)) {
      throw new Error("[Year2 Gamification Diversity] Módulo v2.3 inválido.");
    }
    const module = clone(sourceModule);
    const beforeMap = originalMechanicMap(module);
    const flat = module.activities.flatMap((activity) => activity.questions || []);

    for (const question of flat) {
      question.metadata = question.metadata || {};
      const source = canonical(question);
      const change = PLAN[question.id] || null;
      const before = beforeMap.get(question.id) || question.delivery?.mechanic || "";

      question.metadata.gamificationReview = {
        version:VERSION,
        contentAltered:false,
        canonicalPrompt:question.metadata.sourcePromptV23,
        canonicalAlternatives:clone(source.alternatives),
        canonicalAnswer:source.answerText,
        previousMechanic:before,
        newMechanic:change?.mechanic || before,
        presentation:change?.presentation || "preserved",
        readingDemandIncreased:false
      };

      if (!change) continue;
      if (change.mechanic === "matching") transformMatching(question, source);
      else if (change.mechanic === "bubble-pop") transformBubble(question, source);
      else if (change.mechanic === "target-shooter") transformTarget(question, source);
      else throw new Error(`[Year2 Gamification Diversity] Mecânica não implementada em ${question.id}: ${change.mechanic}`);
    }

    const activities = regroup(module, flat);
    const beforeDistribution = distribution(sourceModule.activities);
    const afterDistribution = distribution(activities);
    const changed = flat.filter((question) => Boolean(PLAN[question.id]));

    return Object.freeze({
      ...module,
      id:`${sourceModule.id}-gamification-diversity-v1`,
      version:`${sourceModule.version}+gamification-diversity-v1`,
      description:`${sourceModule.description || sourceModule.title} — homologação de diversidade de gamificação sem alteração de conteúdo.`,
      activities,
      mechanicDistribution:afterDistribution,
      gamificationAudit:{
        version:VERSION,
        contentAltered:false,
        sourceQuestionCount:flat.length,
        changedQuestionCount:changed.length,
        unchangedQuestionCount:flat.length - changed.length,
        beforeDistribution,
        afterDistribution,
        changedIds:changed.map((question) => question.id),
        invariant:"IDs, conteúdo, habilidade, objetivo, vocabulário e resposta semântica permanecem ancorados na fonte v2.3."
      }
    });
  }

  window.DuduQYear2GamificationDiversity = Object.freeze({
    version:VERSION,
    plan:PLAN,
    visualLabel,
    apply
  });
})();

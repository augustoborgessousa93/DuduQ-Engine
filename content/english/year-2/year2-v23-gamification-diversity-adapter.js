/* DUDUQ English Year 2 — Gamification Diversity Homolog Adapter v1
   IMPORTANT:
   - homologation-only;
   - preserves canonical v2.3 content fields;
   - changes mechanic/presentation only;
   - does not touch Canary or immutable mechanic releases.
*/
(function(){
  "use strict";

  const upstream = window.DuduQYear2V23Factory;
  if(!upstream || typeof upstream.buildModule !== "function"){
    throw new Error("[DuduQ Y2 Gamification Diversity] DuduQYear2V23Factory indisponível.");
  }

  const VERSION = "1.0.0-homolog-a";
  const SENTINEL = "matching-single-choice-homolog";
  const MATCHING_IDS = new Set([
    "EN2-M1-11", "EN2-M1-13",
    "EN2-M2-01", "EN2-M2-02", "EN2-M2-03", "EN2-M2-07", "EN2-M2-08", "EN2-M2-09", "EN2-M2-13", "EN2-M2-15",
    "EN2-M3-01", "EN2-M3-02", "EN2-M3-03", "EN2-M3-07", "EN2-M3-09", "EN2-M3-11", "EN2-M3-13", "EN2-M3-15",
    "EN2-M4-01", "EN2-M4-02", "EN2-M4-06", "EN2-M4-07", "EN2-M4-08", "EN2-M4-11", "EN2-M4-13", "EN2-M4-15",
    "EN2-M5-01", "EN2-M5-02", "EN2-M5-03", "EN2-M5-07", "EN2-M5-08", "EN2-M5-09", "EN2-M5-12", "EN2-M5-14",
    "EN2-M6-01", "EN2-M6-02", "EN2-M6-03", "EN2-M6-07", "EN2-M6-09", "EN2-M6-13", "EN2-M6-15"
  ]);

  function clone(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function canonicalItem(item){
    return {
      id: item.id,
      prompt: item.prompt,
      alternatives: clone(item.alternatives || []),
      answer: item.answer
    };
  }

  function canonicalSnapshot(items){
    return JSON.stringify((items || []).map(canonicalItem));
  }

  function prepareConfig(config){
    const before = canonicalSnapshot(config.items);
    const cfg = {
      ...config,
      items: (config.items || []).map(item => ({
        ...item,
        alternatives: clone(item.alternatives || []),
        alternativeTypes: clone(item.alternativeTypes || [])
      })),
      plan: {}
    };

    for(const [id, raw] of Object.entries(config.plan || {})){
      const entry = {...raw};
      if(MATCHING_IDS.has(id)){
        if(entry.mode !== "image-choice" && entry.mode !== "audio-choice"){
          throw new Error(`[DuduQ Y2 Gamification Diversity] ${id}: modo ${entry.mode} não pode usar Matching single-choice.`);
        }
        entry.mechanic = SENTINEL;
        entry.gamificationDiversity = {
          targetMechanic: "matching",
          subtype: "single-choice-with-distractors",
          rationale: "Preserva um único gabarito e três distratores; usa áudio individual nos cards sem exigir leitura autônoma."
        };
      }
      cfg.plan[id] = entry;
    }

    const after = canonicalSnapshot(cfg.items);
    if(before !== after){
      throw new Error("[DuduQ Y2 Gamification Diversity] CONTENT_LOCK_VIOLATION durante prepareConfig.");
    }

    return cfg;
  }

  function optionLetter(index){
    return String.fromCharCode(65 + index);
  }

  function normalizeMatchingQuestion(question){
    const matching = question?.metadata?.matching;
    if(!matching || !Array.isArray(matching.leftItems) || !Array.isArray(matching.rightItems) || !Array.isArray(matching.pairs)){
      throw new Error(`[DuduQ Y2 Gamification Diversity] ${question?.id || "sem-id"}: metadata.matching ausente.`);
    }
    if(matching.pairs.length !== 1){
      throw new Error(`[DuduQ Y2 Gamification Diversity] ${question.id}: esperado exatamente 1 par correto; recebido ${matching.pairs.length}.`);
    }
    if(matching.leftItems.length !== 1){
      throw new Error(`[DuduQ Y2 Gamification Diversity] ${question.id}: esperado exatamente 1 estímulo no lado esquerdo.`);
    }
    if(matching.rightItems.length < 2 || matching.rightItems.length > 4){
      throw new Error(`[DuduQ Y2 Gamification Diversity] ${question.id}: esperado de 2 a 4 alternativas no lado direito.`);
    }

    matching.behavior = {
      ...(matching.behavior || {}),
      allowDistractors: true,
      distractorSide: "right",
      lockLeftOrder: true,
      shuffleRight: true,
      connectionMode: "1x1",
      interactionMode: "smart",
      playAudioOnCardSelect: true,
      lockCorrectPairsOnRetry: true
    };

    matching.leftTitle = question?.metadata?.stimulusAudio ? "OUÇA" : "OBSERVE";
    matching.rightTitle = "OUÇA E RELACIONE";

    matching.rightItems = matching.rightItems.map((item, index) => {
      const spokenText = String(item.spokenText || item.label || "");
      const letter = optionLetter(index);
      return {
        ...item,
        label: letter,
        spokenText,
        speechLocale: item.speechLocale || "en-US",
        audioDescription: `Ouvir opção ${letter}`,
        metadata: {
          ...(item.metadata || {}),
          sourceWrittenLabel: spokenText,
          writtenLabelVisibleBeforeAnswer: false,
          audioPrimary: true
        }
      };
    });

    question.delivery = {
      ...(question.delivery || {}),
      mechanic: "matching",
      allowAudio: true
    };
    question.metadata = {
      ...(question.metadata || {}),
      gamificationDiversity: {
        version: VERSION,
        sourceMechanic: question?.delivery?.mechanic === "matching" ? SENTINEL : question?.delivery?.mechanic,
        targetMechanic: "matching",
        subtype: "single-choice-with-distractors",
        contentChanged: false,
        scoringChanged: false,
        readingDependencyAdded: false
      }
    };

    return question;
  }

  function regroup(module){
    const flat = [];
    for(const activity of module.activities || []){
      for(const question of activity.questions || []) flat.push(question);
    }

    const activities = [];
    let current = null;
    for(const question of flat){
      const mechanic = question?.delivery?.mechanic || "drag-drop";
      const topic = String(question?.metadata?.topic || module.title || "").toUpperCase();
      const own = question?.metadata?.forceOwnActivity === true;
      if(own || !current || current.mechanic !== mechanic || current.topic !== topic || current.questions.length >= 4){
        current = {
          id: `${String(question.id).toLowerCase()}-${String(mechanic).replace(/[^a-z0-9-]/gi,"-")}-${topic.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
          title: topic || module.title,
          topic: topic || module.title,
          mechanic,
          skill: question.skill,
          questions: []
        };
        activities.push(current);
      }
      current.questions.push(question);
      if(own) current = null;
    }
    return activities;
  }

  function distribution(activities){
    const out = {};
    for(const activity of activities || []){
      for(const _question of activity.questions || []){
        out[activity.mechanic] = (out[activity.mechanic] || 0) + 1;
      }
    }
    return out;
  }

  function finalizeModule(sourceModule, originalConfig){
    const module = clone(sourceModule);
    const expectedCanonical = canonicalSnapshot(originalConfig.items);

    let selected = 0;
    for(const activity of module.activities || []){
      for(const question of activity.questions || []){
        if(MATCHING_IDS.has(question.id)){
          normalizeMatchingQuestion(question);
          selected += 1;
        }else if(question?.delivery?.mechanic === SENTINEL){
          throw new Error(`[DuduQ Y2 Gamification Diversity] ${question.id}: sentinel residual fora da seleção.`);
        }
      }
    }

    const expectedForModule = (originalConfig.items || []).filter(item => MATCHING_IDS.has(item.id)).length;
    if(selected !== expectedForModule){
      throw new Error(`[DuduQ Y2 Gamification Diversity] M${originalConfig.module}: selecionados ${selected}; esperado ${expectedForModule}.`);
    }

    module.activities = regroup(module);
    module.mechanicDistribution = distribution(module.activities);
    module.id = `${sourceModule.id}-gamification-diversity-v1`;
    module.version = `${sourceModule.version}+gamification-diversity-${VERSION}`;
    module.description = `${sourceModule.description} Camada de diversidade gamificada em homologação; conteúdo v2.3 preservado.`;
    module.audit = {
      ...(module.audit || {}),
      gamificationDiversity: {
        version: VERSION,
        status: "HOMOLOGATION_ONLY",
        selectedMatchingItems: selected,
        contentLock: "PASS_BY_CONSTRUCTION",
        canonicalSnapshotLength: expectedCanonical.length,
        canaryUntouched: true,
        matchingRuntimeRequirement: "allowDistractors=true on right side"
      }
    };

    return Object.freeze(module);
  }

  function buildModule(config){
    const sourceBefore = canonicalSnapshot(config.items);
    const prepared = prepareConfig(config);
    const built = upstream.buildModule(prepared);
    const sourceAfter = canonicalSnapshot(config.items);
    if(sourceBefore !== sourceAfter){
      throw new Error("[DuduQ Y2 Gamification Diversity] CONTENT_LOCK_VIOLATION no config original.");
    }
    return finalizeModule(built, config);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...upstream,
    buildModule,
    gamificationDiversityVersion: VERSION,
    matchingQuestionIds: Object.freeze([...MATCHING_IDS])
  });

  window.DuduQYear2GamificationDiversity = Object.freeze({
    version: VERSION,
    matchingQuestionIds: Object.freeze([...MATCHING_IDS]),
    canonicalFields: Object.freeze(["id", "prompt", "alternatives", "answer"]),
    status: "HOMOLOGATION_ONLY"
  });
})();

/* DUDUQ YEAR 1 — MODULE 02
 * Official homologation build derived from:
 * - DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3
 * - DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2
 * Runtime target: Canary R146 / Core 1.0.11
 */
(function () {
  "use strict";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
  window.DUDUQ_CONTENT.english.year1 = window.DUDUQ_CONTENT.english.year1 || {};

  const TOPIC = "NUMBERS";
  const PROFILE = "Y1_EARLY_LITERACY";

  const NUMBER_ASSETS = Object.freeze({
    one: "number 01 one um",
    two: "number 02 two dois",
    three: "number 03 three tres",
    four: "number 04 four quatro",
    five: "number 05 five cinco",
    six: "number 06 six seis",
    seven: "number 07 seven sete",
    eight: "number 08 eight oito",
    nine: "number 09 nine nove",
    ten: "number 10 ten dez"
  });

  function canonicalImage(key) {
    const details = window.DuduQAssets?.resolveImageDetails?.(key);
    const url = details?.url || window.DuduQAssets?.resolveImage?.(key) || "";
    if (!url) throw new Error(`[DuduQ Y1 M02] Asset canônico não resolvido: ${key}`);
    return url;
  }

  function numberImageItem(id, numberWord, numeral) {
    const key = NUMBER_ASSETS[numberWord];
    return {
      id,
      alt: `Cartão visual do numeral ${numeral}`,
      imageAsset: key,
      imageAssetKey: key,
      imageUrl: canonicalImage(key),
      image: canonicalImage(key)
    };
  }

  function audioItem(id, spokenText, description) {
    return {
      id,
      spokenText,
      speechLocale: "en-US",
      audioDescription: description || `Ouvir: ${spokenText}`,
      alt: description || `Opção de áudio: ${spokenText}`
    };
  }

  function commonQuestion({
    id, difficulty, skill, statement, instruction, alternatives, answer,
    sourceStatus, sourceSkill, sourceMedia, audio
  }) {
    return {
      id,
      subject: "english",
      year: 1,
      module: 2,
      skill: { code: null, description: skill },
      difficulty,
      statement,
      instruction,
      contentLanguage: "en",
      instructionLanguage: "pt-BR",
      feedbackLanguage: "pt-BR",
      ...(audio ? {
        audio: {
          enabled: true,
          text: audio.text,
          language: audio.language || "en-US",
          role: audio.role || "stimulus"
        }
      } : {}),
      alternatives: alternatives.map((entry) => ({ id: entry.id, text: entry.text })),
      answer: { type: "single", value: answer },
      feedback: {
        correct: "Muito bem! Você reconheceu o número.",
        incorrect: "Ouça ou observe novamente a pista e tente outra vez.",
        language: "pt-BR"
      },
      metadata: {
        screenTitle: TOPIC,
        activityTitle: TOPIC,
        sourceStatus,
        sourceSkill,
        sourceStatement: statement,
        sourceAlternatives: alternatives.map((entry) => ({ id: entry.id, text: entry.text })),
        sourceAnswer: {
          id: answer,
          text: alternatives.find((entry) => entry.id === answer)?.text || answer
        },
        sourceMedia,
        sourceSpecification: "DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3",
        pedagogySpecification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2",
        literacyDemand: "R0",
        readingEssential: false,
        yearProfile: PROFILE,
        instructionAudioFallback: {
          enabled: true,
          language: "pt-BR",
          text: instruction,
          mode: "speech-synthesis-or-recorded"
        },
        modalityAdaptation: "R0 multimodal; conteúdo, ordem, alternativas, resposta e habilidade oficiais preservados",
        canonicalAssetsRequired: true
      }
    };
  }

  function targetQuestion(spec, items) {
    const question = commonQuestion(spec);
    question.delivery = {
      mechanic: "target-shooter",
      preferred: ["target-shooter"],
      blocked: ["smart-sentence"],
      allowImage: true,
      allowAudio: true
    };
    question.metadata.targetShooter = {
      audioText: spec.audio?.text || "",
      mode: "audio-to-image",
      shape: "balloon",
      correctIds: [spec.answer],
      difficulty: {
        speed: 0.26,
        objectCount: items.length,
        spawnIntervalMs: 950,
        requiredCorrect: 1,
        targetSize: 190,
        timeLimitMs: 0,
        timerMode: "none"
      },
      items
    };
    return question;
  }

  function quantityGlyphs(count) {
    return Array.from({ length: count }, () => "●").join(" ");
  }

  function audioChoiceDragQuestion(spec, context, optionAudios) {
    const question = commonQuestion(spec);
    const targetId = `${spec.id}-answer-target`;
    question.delivery = {
      mechanic: "drag-drop",
      preferred: ["drag-drop"],
      blocked: ["smart-sentence"],
      allowImage: Boolean(context.imageAsset),
      allowAudio: true
    };
    question.payload = {
      mode: "single-choice",
      strategy: "association",
      items: optionAudios.map((item, index) => ({
        id: item.id,
        label: String(index + 1),
        spokenText: item.spokenText,
        speechLocale: item.speechLocale,
        audioDescription: item.audioDescription,
        required: item.id === spec.answer,
        ...(item.id === spec.answer ? { targetId } : {})
      })),
      targets: [{
        id: targetId,
        label: context.label || "",
        ...(context.imageAsset ? {
          imageAsset: context.imageAsset,
          image: { src: canonicalImage(context.imageAsset), alt: context.alt },
          alt: context.alt
        } : { alt: context.alt }),
        capacity: 1,
        kind: "box"
      }]
    };
    question.metadata.dragDropChoice = {
      singleEditorialAnswer: spec.answer,
      visibleLabels: "numeric-only",
      optionAudioRequired: true,
      correctTargetId: targetId,
      contextType: context.type,
      contextQuantity: context.quantity || null,
      visualSet: context.label || "",
      noProceduralAsset: true
    };
    return question;
  }

  function visualChoiceDragQuestion(spec, context, choices) {
    const question = commonQuestion(spec);
    const targetId = `${spec.id}-answer-target`;
    question.delivery = {
      mechanic: "drag-drop",
      preferred: ["drag-drop"],
      blocked: ["smart-sentence"],
      allowImage: false,
      allowAudio: true
    };
    question.payload = {
      mode: "single-choice",
      strategy: "association",
      items: choices.map((item) => ({
        id: item.id,
        label: item.label,
        required: item.id === spec.answer,
        ...(item.id === spec.answer ? { targetId } : {})
      })),
      targets: [{
        id: targetId,
        label: context.label || "🔊",
        alt: context.alt,
        capacity: 1,
        kind: "box"
      }]
    };
    question.metadata.dragDropChoice = {
      singleEditorialAnswer: spec.answer,
      visibleLabels: "numerals-only",
      optionAudioRequired: false,
      correctTargetId: targetId,
      contextType: context.type,
      noProceduralAsset: true
    };
    return question;
  }

  const q01 = targetQuestion({
    id: "EN1-M2-01", difficulty: "easy",
    skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Ouça o número e observe as alternativas visuais e toque na que corresponde ao áudio.",
    instruction: "Ouça e toque no cartão visual correto.",
    alternatives: [{ id: "A", text: "one" }, { id: "B", text: "two" }, { id: "C", text: "three" }],
    answer: "A", sourceStatus: "Ajustar — Fácil", sourceSkill: "Escuta",
    sourceMedia: "Áudio EN obrigatório: one. Áudio repetível. Áudio → imagem/cena; leitura não necessária.",
    audio: { text: "one" }
  }, [numberImageItem("A", "one", 1), numberImageItem("B", "two", 2), numberImageItem("C", "three", 3)]);

  const q02 = audioChoiceDragQuestion({
    id: "EN1-M2-02", difficulty: "easy",
    skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Conte os elementos e escolha a quantidade em inglês. Ouça as opções antes de responder.",
    instruction: "Conte os pontos, toque nos cards para ouvir e arraste o áudio correto para a quantidade.",
    alternatives: [{ id: "A", text: "one" }, { id: "B", text: "two" }, { id: "C", text: "three" }],
    answer: "B", sourceStatus: "Ajustar — Fácil", sourceSkill: "Compreensão multimodal",
    sourceMedia: "Conjunto visual claro com 2 elementos, sem numeral; contexto → áudio; leitura não necessária."
  }, { type: "visual-quantity-set", quantity: 2, label: quantityGlyphs(2), alt: "Conjunto visual com dois elementos" }, [audioItem("A", "one"), audioItem("B", "two"), audioItem("C", "three")]);

  const q03 = targetQuestion({
    id: "EN1-M2-03", difficulty: "easy",
    skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Escute com atenção. Qual cartão visual corresponde ao número que você ouviu?",
    instruction: "Ouça e toque no cartão visual correto.",
    alternatives: [{ id: "A", text: "two" }, { id: "B", text: "three" }, { id: "C", text: "four" }],
    answer: "B", sourceStatus: "Ajustar — Fácil", sourceSkill: "Escuta",
    sourceMedia: "Áudio EN obrigatório: three. Áudio repetível. Áudio → imagem/cena; leitura não necessária.",
    audio: { text: "three" }
  }, [numberImageItem("A", "two", 2), numberImageItem("B", "three", 3), numberImageItem("C", "four", 4)]);

  const q04 = audioChoiceDragQuestion({
    id: "EN1-M2-04", difficulty: "easy",
    skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Quantos elementos há? Ouça as opções em inglês e toque no áudio correspondente.",
    instruction: "Conte os pontos, ouça os cards e arraste a opção correta.",
    alternatives: [{ id: "A", text: "three" }, { id: "B", text: "four" }, { id: "C", text: "five" }],
    answer: "B", sourceStatus: "Ajustar — Fácil", sourceSkill: "Compreensão multimodal",
    sourceMedia: "Conjunto visual claro com 4 elementos, sem numeral; contexto → áudio; leitura não necessária."
  }, { type: "visual-quantity-set", quantity: 4, label: quantityGlyphs(4), alt: "Conjunto visual com quatro elementos" }, [audioItem("A", "three"), audioItem("B", "four"), audioItem("C", "five")]);

  const q05 = targetQuestion({
    id: "EN1-M2-05", difficulty: "easy",
    skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Toque no cartão com o número em inglês que você ouviu.", instruction: "Ouça e toque no cartão visual correto.",
    alternatives: [{ id: "A", text: "four" }, { id: "B", text: "five" }, { id: "C", text: "six" }],
    answer: "B", sourceStatus: "Ajustar — Fácil", sourceSkill: "Escuta",
    sourceMedia: "Áudio EN obrigatório: five. Áudio repetível. Áudio → imagem/cena; leitura não necessária.", audio: { text: "five" }
  }, [numberImageItem("A", "four", 4), numberImageItem("B", "five", 5), numberImageItem("C", "six", 6)]);

  const q06 = audioChoiceDragQuestion({
    id: "EN1-M2-06", difficulty: "easy",
    skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Observe a quantidade e ouça as opções. Toque no áudio que corresponde à quantidade mostrada.",
    instruction: "Conte os pontos, ouça os cards e arraste a opção correta.",
    alternatives: [{ id: "A", text: "five" }, { id: "B", text: "six" }, { id: "C", text: "seven" }],
    answer: "B", sourceStatus: "Ajustar — Fácil", sourceSkill: "Compreensão multimodal",
    sourceMedia: "Conjunto visual claro com 6 elementos, sem numeral; contexto → áudio; leitura não necessária."
  }, { type: "visual-quantity-set", quantity: 6, label: quantityGlyphs(6), alt: "Conjunto visual com seis elementos" }, [audioItem("A", "five"), audioItem("B", "six"), audioItem("C", "seven")]);

  const q07 = targetQuestion({
    id: "EN1-M2-07", difficulty: "medium", skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Qual cartão visual corresponde ao número que você ouviu?", instruction: "Ouça e toque no cartão visual correto.",
    alternatives: [{ id: "A", text: "six" }, { id: "B", text: "seven" }, { id: "C", text: "eight" }], answer: "B",
    sourceStatus: "Ajustar — Média", sourceSkill: "Escuta", sourceMedia: "Áudio EN obrigatório: seven. Áudio repetível. Áudio → imagem/cena; leitura não necessária.", audio: { text: "seven" }
  }, [numberImageItem("A", "six", 6), numberImageItem("B", "seven", 7), numberImageItem("C", "eight", 8)]);

  const q08 = audioChoiceDragQuestion({
    id: "EN1-M2-08", difficulty: "medium", skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Conte a imagem. Ouça as opções e toque no áudio do número correspondente.", instruction: "Conte os pontos, ouça os cards e arraste a opção correta.",
    alternatives: [{ id: "A", text: "seven" }, { id: "B", text: "eight" }, { id: "C", text: "nine" }], answer: "B",
    sourceStatus: "Ajustar — Média", sourceSkill: "Compreensão multimodal", sourceMedia: "Conjunto visual claro com 8 elementos, sem numeral; contexto → áudio; leitura não necessária."
  }, { type: "visual-quantity-set", quantity: 8, label: quantityGlyphs(8), alt: "Conjunto visual com oito elementos" }, [audioItem("A", "seven"), audioItem("B", "eight"), audioItem("C", "nine")]);

  const q09 = targetQuestion({
    id: "EN1-M2-09", difficulty: "medium", skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "Ouça novamente e selecione o cartão visual correspondente.", instruction: "Ouça e toque no cartão visual correto.",
    alternatives: [{ id: "A", text: "eight" }, { id: "B", text: "nine" }, { id: "C", text: "ten" }], answer: "B",
    sourceStatus: "Ajustar — Média", sourceSkill: "Escuta", sourceMedia: "Áudio EN obrigatório: nine. Áudio repetível. Áudio → imagem/cena; leitura não necessária.", audio: { text: "nine" }
  }, [numberImageItem("A", "eight", 8), numberImageItem("B", "nine", 9), numberImageItem("C", "ten", 10)]);

  const q10 = audioChoiceDragQuestion({
    id: "EN1-M2-10", difficulty: "medium", skill: "Relacionar a forma oral do número em inglês à quantidade ou ao estímulo ouvido.",
    statement: "A imagem mostra uma quantidade. Ouça as opções em inglês e toque no áudio que nomeia corretamente o que você vê.", instruction: "Conte os pontos, ouça os cards e arraste a opção correta.",
    alternatives: [{ id: "A", text: "eight" }, { id: "B", text: "nine" }, { id: "C", text: "ten" }], answer: "C",
    sourceStatus: "Ajustar — Média", sourceSkill: "Compreensão multimodal", sourceMedia: "Conjunto visual claro com 10 elementos, sem numeral; contexto → áudio; leitura não necessária."
  }, { type: "visual-quantity-set", quantity: 10, label: quantityGlyphs(10), alt: "Conjunto visual com dez elementos" }, [audioItem("A", "eight"), audioItem("B", "nine"), audioItem("C", "ten")]);

  const q11 = audioChoiceDragQuestion({
    id: "EN1-M2-11", difficulty: "medium", skill: "Compreender uma sequência oral curta de números já estudados.",
    statement: "Ouça: “six, seven, eight”. Qual sequência aparece na mesma ordem?", instruction: "Ouça a sequência e os três cards. Arraste para o alto-falante a sequência que repete a mesma ordem.",
    alternatives: [{ id: "A", text: "six – seven – eight" }, { id: "B", text: "six – eight – seven" }, { id: "C", text: "seven – six – eight" }], answer: "A",
    sourceStatus: "Reescrever — Média", sourceSkill: "Escuta", sourceMedia: "Áudio EN obrigatório: six, seven, eight, com pausas naturais. Alternativas auditivas sem texto antes da resposta.", audio: { text: "six, seven, eight" }
  }, { type: "neutral-audio-context", label: "🔊", alt: "Destino para a sequência de áudio" }, [audioItem("A", "six, seven, eight"), audioItem("B", "six, eight, seven"), audioItem("C", "seven, six, eight")]);

  const q12 = visualChoiceDragQuestion({
    id: "EN1-M2-12", difficulty: "hard", skill: "Discriminar dois números em inglês e manter a ordem em que foram ouvidos.",
    statement: "Ouça: “three, ten”. Qual cartão mostra os dois números na ordem ouvida?", instruction: "Ouça e arraste a sequência de numerais correta para o alto-falante.",
    alternatives: [{ id: "A", text: "3 – 10" }, { id: "B", text: "10 – 3" }, { id: "C", text: "3 – 9" }], answer: "A",
    sourceStatus: "Reescrever — Difícil", sourceSkill: "Escuta + associação", sourceMedia: "Áudio EN obrigatório: three, ten. Áudio repetível. Escuta → numerais; leitura em inglês não necessária.", audio: { text: "three, ten" }
  }, { type: "audio-to-numeral-sequence", label: "🔊", alt: "Destino para a sequência de numerais ouvida" }, [{ id: "A", label: "3 – 10" }, { id: "B", label: "10 – 3" }, { id: "C", label: "3 – 9" }]);

  const questions = [q01,q02,q03,q04,q05,q06,q07,q08,q09,q10,q11,q12];
  const moduleDefinition = {
    id: "duduq-english-y1-module-02", version: "2.3.0-homolog-r146", subject: "english", year: 1, module: 2,
    title: "Numbers 1 to 10", description: "Year 1 early-literacy homologation build aligned to official v2.3 content.", estimatedMinutes: 5,
    intro: {
      companyKicker: "UMA CRIAÇÃO DE", companyLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/LOGO%20DA%20EMPRESA_COLORIDO.png",
      companyAlt: "Editora Brasil Cultural", companyName: "Editora Brasil Cultural", companyWidth: 820,
      collectionLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Logo%20EduQ%20Play.png", collectionName: "EduQ Play", collectionAlt: "EduQ Play", collectionWidth: 760,
      loadingLabel: "PREPARANDO SUA MISSÃO", readyLabel: "MISSÃO PRONTA", startLabel: "INICIAR MISSÃO", hint: "Tudo pronto para começar!", minDurationMs: 2200, brandingDurationMs: 3000, switchingDurationMs: 760, missionMinDurationMs: 1200, sparkCount: 14
    },
    pedagogyPolicy: {
      specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2", contentSpecification: "DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3",
      profile: PROFILE, readingDefault: "R0", readingMax: "R1_NONESSENTIAL_ONLY", smartSentenceScored: false, audioRepeatable: true, imagesLargeUnambiguous: true, autonomousEnglishReadingRequired: false
    },
    factory: {
      tag: "official-y1-m02-v2.3-r146", cleanBuild: true, artifactReuse: false, stalePayloadReuse: false, engine: "Canary R146", core: "1.0.11",
      integration: "Universal Loader / Player / canonical Assets resolver", assetCatalog: "Assets-DuduQ canonical schema 2 @ f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f"
    },
    activities: questions.map((question, index) => ({
      id: `Y1-M02-A${String(index + 1).padStart(2, "0")}`, title: TOPIC, mechanic: question.delivery.mechanic,
      skill: { description: question.skill.description }, questions: [question]
    })),
    extension: { scored: false, type: "modeled-speaking-and-matching", instruction: "Ouça um número, repita e depois selecione a quantidade correspondente.", targetChunk: "one, two, three ... ten" }
  };

  window.DUDUQ_CONTENT.english.year1.module02 = Object.freeze(moduleDefinition);
})();
/* DUDUQ YEAR 1 — MODULE 01
 * Official homologation build derived from:
 * - DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3
 * - DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2
 * Runtime target: Canary R145 / Core 1.0.11
 */
(function () {
  "use strict";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
  window.DUDUQ_CONTENT.english.year1 = window.DUDUQ_CONTENT.english.year1 || {};

  const TOPIC = "GREETINGS";
  const PROFILE = "Y1_EARLY_LITERACY";

  function canonicalImage(key) {
    const details = window.DuduQAssets?.resolveImageDetails?.(key);
    const url = details?.url || window.DuduQAssets?.resolveImage?.(key) || "";
    if (!url) {
      throw new Error(`[DuduQ Y1 M01] Asset canônico não resolvido: ${key}`);
    }
    return url;
  }

  function imageItem(id, key, alt) {
    return {
      id,
      alt,
      imageAsset: key,
      imageAssetKey: key,
      imageUrl: canonicalImage(key),
      image: canonicalImage(key)
    };
  }

  function audioItem(id, spokenText, speechLocale, description) {
    return {
      id,
      spokenText,
      speechLocale,
      audioDescription: description || `Ouvir: ${spokenText}`,
      alt: description || `Opção de áudio: ${spokenText}`
    };
  }

  function commonQuestion({
    id,
    difficulty,
    skill,
    statement,
    instruction,
    alternatives,
    answer,
    sourceStatus,
    sourceSkill,
    sourceMedia,
    audio
  }) {
    return {
      id,
      subject: "english",
      year: 1,
      module: 1,
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
        correct: "Muito bem! Agora ouça novamente a expressão.",
        incorrect: "Ouça novamente, observe a pista e tente outra vez.",
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
        modalityAdaptation: "R0 multimodal; conteúdo e habilidade oficiais preservados",
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

  function audioChoiceDragQuestion(spec, target, optionAudios) {
    const question = commonQuestion(spec);
    const targetId = `${spec.id}-answer-target`;
    question.delivery = {
      mechanic: "drag-drop",
      preferred: ["drag-drop"],
      blocked: ["smart-sentence"],
      allowImage: true,
      allowAudio: true
    };
    question.payload = {
      mode: "association",
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
        label: "",
        imageAsset: target.imageAsset,
        image: { src: target.imageUrl, alt: target.alt },
        alt: target.alt,
        capacity: 1,
        kind: "box"
      }]
    };
    question.metadata.dragDropChoice = {
      singleEditorialAnswer: spec.answer,
      visibleLabels: "numeric-only",
      optionAudioRequired: true,
      correctTargetId: targetId,
      targetImageAsset: target.imageAsset
    };
    return question;
  }

  const q01 = targetQuestion({
    id: "EN1-M1-01",
    difficulty: "easy",
    skill: "Identificar cumprimentos básicos usados no dia a dia.",
    statement: "Ouça a saudação e escolha o que foi dito.",
    instruction: "Ouça e toque na imagem correta.",
    alternatives: [
      { id: "A", text: "Goodbye" },
      { id: "B", text: "Hello" },
      { id: "C", text: "Good morning" }
    ],
    answer: "B",
    sourceStatus: "Ajustar — Fácil",
    sourceSkill: "Escuta",
    sourceMedia: "Áudio EN obrigatório: Hello. Áudio → imagem/cena; leitura não necessária.",
    audio: { text: "Hello", language: "en-US" }
  }, [
    imageItem("A", "greeting goodbye tchau", "Cena de despedida e saída"),
    imageItem("B", "boy crianca chegando child arriving arrival", "Cena de chegada e cumprimento"),
    imageItem("C", "greeting good morning bom dia", "Cena de cumprimento pela manhã")
  ]);

  const q02 = audioChoiceDragQuestion({
    id: "EN1-M1-02",
    difficulty: "easy",
    skill: "Relacionar cumprimentos a situações cotidianas.",
    statement: "É de manhã. Qual saudação combina com esse momento? Ouça as opções antes de responder.",
    instruction: "Observe a manhã, toque nos cards para ouvir e arraste a opção correta para a cena.",
    alternatives: [
      { id: "A", text: "Good afternoon" },
      { id: "B", text: "Goodbye" },
      { id: "C", text: "Good morning" }
    ],
    answer: "C",
    sourceStatus: "Ajustar — Fácil",
    sourceSkill: "Compreensão multimodal",
    sourceMedia: "Imagem de manhã/sol nascendo. Contexto → áudio; leitura não necessária."
  }, imageItem("context-morning", "chegada escola manha arriving at school morning", "Manhã com chegada à escola"), [
    audioItem("A", "Good afternoon", "en-US", "Ouvir Good afternoon"),
    audioItem("B", "Goodbye", "en-US", "Ouvir Goodbye"),
    audioItem("C", "Good morning", "en-US", "Ouvir Good morning")
  ]);

  const q03 = audioChoiceDragQuestion({
    id: "EN1-M1-03",
    difficulty: "easy",
    skill: "Relacionar cumprimentos a situações cotidianas.",
    statement: "É de tarde. Qual saudação combina com esse momento? Ouça as opções antes de responder.",
    instruction: "Observe a tarde, toque nos cards para ouvir e arraste a opção correta para a cena.",
    alternatives: [
      { id: "A", text: "Good afternoon" },
      { id: "B", text: "Good morning" },
      { id: "C", text: "Goodbye" }
    ],
    answer: "A",
    sourceStatus: "Ajustar — Fácil",
    sourceSkill: "Compreensão multimodal",
    sourceMedia: "Imagem do período da tarde. Contexto → áudio; leitura não necessária."
  }, imageItem("context-afternoon", "greeting good afternoon boa tarde", "Cena de período da tarde"), [
    audioItem("A", "Good afternoon", "en-US", "Ouvir Good afternoon"),
    audioItem("B", "Good morning", "en-US", "Ouvir Good morning"),
    audioItem("C", "Goodbye", "en-US", "Ouvir Goodbye")
  ]);

  const q04 = targetQuestion({
    id: "EN1-M1-04",
    difficulty: "easy",
    skill: "Compreender uma expressão de despedida em contexto.",
    statement: "Ouça “Goodbye”. Em qual situação essa palavra combina?",
    instruction: "Ouça e toque na situação correta.",
    alternatives: [
      { id: "A", text: "ao chegar" },
      { id: "B", text: "ao se despedir" },
      { id: "C", text: "ao dizer a idade" }
    ],
    answer: "B",
    sourceStatus: "Ajustar — Fácil",
    sourceSkill: "Escuta + compreensão multimodal",
    sourceMedia: "Áudio EN obrigatório: Goodbye; três pistas visuais simples.",
    audio: { text: "Goodbye", language: "en-US" }
  }, [
    imageItem("A", "boy crianca chegando child arriving arrival", "Pessoa chegando"),
    imageItem("B", "saida da escola leaving school school exit", "Pessoa se despedindo e saindo da escola"),
    imageItem("C", "number 05 five cinco", "Numeral 5 como pista visual para dizer a idade")
  ]);

  const q05 = targetQuestion({
    id: "EN1-M1-05",
    difficulty: "easy",
    skill: "Reconhecer uma apresentação pessoal muito simples com “I’m + name”.",
    statement: "Ouça: “I’m Leo.” Qual fala apresenta o nome do personagem?",
    instruction: "Ouça e toque na imagem que representa uma apresentação de nome.",
    alternatives: [
      { id: "A", text: "Goodbye!" },
      { id: "B", text: "Good afternoon!" },
      { id: "C", text: "I’m Leo." }
    ],
    answer: "C",
    sourceStatus: "Ajustar — Fácil",
    sourceSkill: "Escuta",
    sourceMedia: "Áudio EN obrigatório: I’m Leo. Personagem fictício; leitura não necessária.",
    audio: { text: "I’m Leo.", language: "en-US" }
  }, [
    imageItem("A", "greeting goodbye tchau", "Cena de despedida"),
    imageItem("B", "greeting good afternoon boa tarde", "Cena de cumprimento à tarde"),
    imageItem("C", "introduction my name meu nome", "Personagem apresentando o próprio nome")
  ]);

  const q06 = audioChoiceDragQuestion({
    id: "EN1-M1-06",
    difficulty: "easy",
    skill: "Reconhecer o vocabulário boy/girl com apoio visual.",
    statement: "Observe o personagem indicado como “boy”. Ouça as opções e toque no áudio que corresponde à imagem.",
    instruction: "Observe o personagem, toque nos cards para ouvir e arraste o áudio correto para a imagem.",
    alternatives: [
      { id: "A", text: "boy" },
      { id: "B", text: "girl" },
      { id: "C", text: "hello" }
    ],
    answer: "A",
    sourceStatus: "Ajustar — Fácil",
    sourceSkill: "Compreensão multimodal",
    sourceMedia: "Personagem fictício não estereotipado. Imagem/contexto → áudio."
  }, imageItem("context-boy", "person boy menino", "Personagem fictício indicado como boy"), [
    audioItem("A", "boy", "en-US", "Ouvir boy"),
    audioItem("B", "girl", "en-US", "Ouvir girl"),
    audioItem("C", "hello", "en-US", "Ouvir hello")
  ]);

  const q07 = audioChoiceDragQuestion({
    id: "EN1-M1-07",
    difficulty: "easy",
    skill: "Reconhecer o vocabulário boy/girl com apoio visual.",
    statement: "Observe a personagem indicada como “girl”. Ouça as opções e toque no áudio que corresponde à imagem.",
    instruction: "Observe a personagem, toque nos cards para ouvir e arraste o áudio correto para a imagem.",
    alternatives: [
      { id: "A", text: "boy" },
      { id: "B", text: "girl" },
      { id: "C", text: "goodbye" }
    ],
    answer: "B",
    sourceStatus: "Ajustar — Fácil",
    sourceSkill: "Compreensão multimodal",
    sourceMedia: "Personagem fictícia não estereotipada. Imagem/contexto → áudio."
  }, imageItem("context-girl", "person girl menina", "Personagem fictícia indicada como girl"), [
    audioItem("A", "boy", "en-US", "Ouvir boy"),
    audioItem("B", "girl", "en-US", "Ouvir girl"),
    audioItem("C", "goodbye", "en-US", "Ouvir goodbye")
  ]);

  const q08 = targetQuestion({
    id: "EN1-M1-08",
    difficulty: "medium",
    skill: "Selecionar uma resposta adequada a um cumprimento simples.",
    statement: "Ouça: “Hello!” Qual resposta também é um cumprimento?",
    instruction: "Ouça e toque na cena que também mostra um cumprimento.",
    alternatives: [
      { id: "A", text: "Goodbye!" },
      { id: "B", text: "Good night!" },
      { id: "C", text: "Hi!" }
    ],
    answer: "C",
    sourceStatus: "Ajustar — Média",
    sourceSkill: "Escuta / compreensão pragmática",
    sourceMedia: "Áudio EN obrigatório: Hello. Áudio → imagem/cena; leitura não necessária.",
    audio: { text: "Hello!", language: "en-US" }
  }, [
    imageItem("A", "greeting goodbye tchau", "Cena de despedida"),
    imageItem("B", "greeting good night boa noite", "Cena de despedida antes de dormir"),
    imageItem("C", "criancas se cumprimentando children greeting hello", "Crianças se cumprimentando informalmente")
  ]);

  const q09 = audioChoiceDragQuestion({
    id: "EN1-M1-09",
    difficulty: "medium",
    skill: "Identificar apresentação pessoal simples.",
    statement: "Ouça: “I’m Ana.” O que a pessoa está fazendo?",
    instruction: "Ouça a fala, toque nos cards para ouvir as opções e arraste a resposta correta para a cena.",
    alternatives: [
      { id: "A", text: "Dizendo o próprio nome" },
      { id: "B", text: "Despedindo-se" },
      { id: "C", text: "Dizendo boa tarde" }
    ],
    answer: "A",
    sourceStatus: "Ajustar — Média",
    sourceSkill: "Escuta",
    sourceMedia: "Áudio EN obrigatório: I’m Ana. Opções auditivas em português; não exibir texto antes da resposta.",
    audio: { text: "I’m Ana.", language: "en-US" }
  }, imageItem("context-selfintro", "introduction my name meu nome", "Cena de apresentação pessoal"), [
    audioItem("A", "Dizendo o próprio nome", "pt-BR", "Ouvir: dizendo o próprio nome"),
    audioItem("B", "Despedindo-se", "pt-BR", "Ouvir: despedindo-se"),
    audioItem("C", "Dizendo boa tarde", "pt-BR", "Ouvir: dizendo boa tarde")
  ]);

  const q10 = targetQuestion({
    id: "EN1-M1-10",
    difficulty: "medium",
    skill: "Reconhecer uma despedida curta e frequente em contexto escolar.",
    statement: "A aula terminou. Ouça: “Bye!”. Qual cartão mostra a expressão ouvida?",
    instruction: "Ouça e toque na cena correta.",
    alternatives: [
      { id: "A", text: "Hello!" },
      { id: "B", text: "Bye!" },
      { id: "C", text: "Good morning!" }
    ],
    answer: "B",
    sourceStatus: "Reescrever — Média",
    sourceSkill: "Escuta / compreensão pragmática",
    sourceMedia: "Áudio EN obrigatório: Bye. Cena simples de fim da aula.",
    audio: { text: "Bye!", language: "en-US" }
  }, [
    imageItem("A", "boy crianca chegando child arriving arrival", "Cena de chegada e cumprimento"),
    imageItem("B", "fim da aula end of class class finished", "Cena de fim da aula e despedida"),
    imageItem("C", "greeting good morning bom dia", "Cena de cumprimento pela manhã")
  ]);

  const q11 = targetQuestion({
    id: "EN1-M1-11",
    difficulty: "medium",
    skill: "Reconhecer uma despedida frequente e amigável em contexto.",
    statement: "Leo está indo embora. Ouça: “See you!”. Qual expressão você ouviu?",
    instruction: "Ouça e toque na cena de despedida correspondente.",
    alternatives: [
      { id: "A", text: "See you!" },
      { id: "B", text: "Good afternoon!" },
      { id: "C", text: "Hi!" }
    ],
    answer: "A",
    sourceStatus: "Reescrever — Média",
    sourceSkill: "Escuta / compreensão pragmática",
    sourceMedia: "Áudio EN obrigatório: See you. Cena de despedida; leitura não necessária.",
    audio: { text: "See you!", language: "en-US" }
  }, [
    imageItem("A", "saida da escola leaving school school exit", "Leo indo embora e se despedindo"),
    imageItem("B", "greeting good afternoon boa tarde", "Cena de cumprimento à tarde"),
    imageItem("C", "criancas se cumprimentando children greeting hello", "Cena de cumprimento informal")
  ]);

  const q12 = audioChoiceDragQuestion({
    id: "EN1-M1-12",
    difficulty: "hard",
    skill: "Selecionar uma resposta simples que mantém uma interação de cumprimento.",
    statement: "Mia diz: “Hello! I’m Mia.” Qual resposta também é um cumprimento e mantém a conversa? Ouça as opções antes de responder.",
    instruction: "Ouça Mia, toque nos cards para ouvir as respostas e arraste a opção que mantém o cumprimento para Mia.",
    alternatives: [
      { id: "A", text: "Hi, Mia!" },
      { id: "B", text: "Bye, Mia!" },
      { id: "C", text: "See you, Mia!" }
    ],
    answer: "A",
    sourceStatus: "Reescrever — Difícil",
    sourceSkill: "Escuta + interação guiada",
    sourceMedia: "Mini diálogo em áudio com personagens fictícios. Contexto → áudio; leitura não necessária.",
    audio: { text: "Hello! I’m Mia.", language: "en-US" }
  }, imageItem("context-mia", "mia", "Personagem fictícia Mia se apresentando"), [
    audioItem("A", "Hi, Mia!", "en-US", "Ouvir Hi, Mia!"),
    audioItem("B", "Bye, Mia!", "en-US", "Ouvir Bye, Mia!"),
    audioItem("C", "See you, Mia!", "en-US", "Ouvir See you, Mia!")
  ]);

  const moduleDefinition = {
    id: "duduq-english-y1-module-01",
    version: "2.3.0-homolog-r145",
    subject: "english",
    year: 1,
    module: 1,
    title: "Hello! Greetings & Introductions",
    description: "Year 1 early-literacy homologation build aligned to official v2.3 content.",
    estimatedMinutes: 4,
    intro: {
      companyKicker: "UMA CRIAÇÃO DE",
      companyLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/LOGO%20DA%20EMPRESA_COLORIDO.png",
      companyAlt: "Editora Brasil Cultural",
      companyName: "Editora Brasil Cultural",
      companyWidth: 820,
      collectionLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Logo%20EduQ%20Play.png",
      collectionName: "EduQ Play",
      collectionAlt: "EduQ Play",
      collectionWidth: 760,
      loadingLabel: "PREPARANDO SUA MISSÃO",
      readyLabel: "MISSÃO PRONTA",
      startLabel: "INICIAR MISSÃO",
      hint: "Tudo pronto para começar!",
      minDurationMs: 2200,
      brandingDurationMs: 3000,
      switchingDurationMs: 760,
      missionMinDurationMs: 1200,
      sparkCount: 14
    },
    pedagogyPolicy: {
      specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2",
      contentSpecification: "DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3",
      profile: PROFILE,
      readingDefault: "R0",
      readingMax: "R1_NONESSENTIAL_ONLY",
      smartSentenceScored: false,
      audioRepeatable: true,
      imagesLargeUnambiguous: true,
      autonomousEnglishReadingRequired: false
    },
    factory: {
      tag: "official-y1-m01-v2.3-r145",
      cleanBuild: true,
      artifactReuse: false,
      stalePayloadReuse: false,
      engine: "Canary R145",
      core: "1.0.11",
      integration: "Universal Loader / Player / canonical Assets resolver",
      assetCatalog: "Assets-DuduQ canonical schema 2 @ f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f"
    },
    activities: [
      {
        id: "Y1-M01-A01",
        title: TOPIC,
        mechanic: "target-shooter",
        skill: { description: "Escuta e compreensão multimodal" },
        questions: [q01]
      },
      {
        id: "Y1-M01-A02",
        title: TOPIC,
        mechanic: "drag-drop",
        skill: { description: "Contexto visual e escolha auditiva" },
        questions: [q02, q03]
      },
      {
        id: "Y1-M01-A03",
        title: TOPIC,
        mechanic: "target-shooter",
        skill: { description: "Escuta e associação a contexto visual" },
        questions: [q04, q05]
      },
      {
        id: "Y1-M01-A04",
        title: TOPIC,
        mechanic: "drag-drop",
        skill: { description: "Vocabulário receptivo com apoio visual" },
        questions: [q06, q07]
      },
      {
        id: "Y1-M01-A05",
        title: TOPIC,
        mechanic: "target-shooter",
        skill: { description: "Cumprimentos e despedidas em contexto" },
        questions: [q08]
      },
      {
        id: "Y1-M01-A06",
        title: TOPIC,
        mechanic: "drag-drop",
        skill: { description: "Compreensão auditiva guiada" },
        questions: [q09]
      },
      {
        id: "Y1-M01-A07",
        title: TOPIC,
        mechanic: "target-shooter",
        skill: { description: "Despedidas em contexto" },
        questions: [q10, q11]
      },
      {
        id: "Y1-M01-A08",
        title: TOPIC,
        mechanic: "drag-drop",
        skill: { description: "Interação guiada de cumprimento" },
        questions: [q12]
      }
    ],
    extension: {
      scored: false,
      type: "modeled-speaking",
      instruction: "Escolha um avatar fictício e repita: Hello! I’m [name].",
      targetChunk: "Hello! I’m [name]."
    }
  };

  window.DUDUQ_CONTENT.english.year1.module01 = Object.freeze(moduleDefinition);
})();

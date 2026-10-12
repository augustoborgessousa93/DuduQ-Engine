#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const readJson = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const writeJson = async (file, value) => {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ids = (values, n = 4, offset = 0) => Array.from({ length: n }, (_, i) => values[(offset + i) % values.length]);
const vocab = {
  Y1M02: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
  Y1M03: ["red", "blue", "yellow", "green", "black", "white", "orange", "purple", "gray", "brown"],
  Y1M04: ["eraser", "pencil", "pencil case", "crayon", "ruler", "pen", "backpack"],
  Y1M05: ["head", "hands", "legs", "arms", "feet", "sit down", "stand up", "come in", "silence, please", "thank you"],
  Y1M06: ["dog", "cat", "fish", "rabbit", "bird", "turtle", "hamster", "spider", "big", "small"]
};
const pt = {
  Y1M02: "Ouça com atenção e escolha a quantidade correspondente.",
  Y1M03: "Observe as opções e escolha a que corresponde à pista.",
  Y1M04: "Observe as opções e escolha o objeto ou lugar correspondente.",
  Y1M05: "Observe as opções e escolha a parte do corpo ou ação correspondente.",
  Y1M06: "Observe as opções e escolha o animal ou atributo correspondente."
};
const titleById = {
  Y1M02: ["Numbers 1–10", "How many?"],
  Y1M03: ["Colors around us", "Color words"],
  Y1M04: ["My school things", "Where is it?"],
  Y1M05: ["Body and classroom actions", "Listen and act"],
  Y1M06: ["Pets and their features", "Animals around us"]
};
const instruction = (mechanic, topic) => {
  const en = {
    "target-shooter": `Listen to the clue and shoot the matching ${topic} picture.`,
    "bubble-pop": `Listen to the clue and pop the matching ${topic} bubble.`,
    "drag-drop-multimedia": `Listen to each ${topic} word and drag it to the matching picture.`,
    "drag-drop": `Drag each ${topic} card to the group that matches it.`,
    matching: `Match each ${topic} card to its pair.`,
    "smart-sentence-complete": `Choose the ${topic} word that completes the sentence.`,
    "smart-sentence-order": `Put the ${topic} words in the correct order.`,
    "memory-quest": `Listen to each ${topic} word and find its matching picture.`
  }[mechanic];
  const support = {
    "target-shooter": "Ouça a pista e acerte a imagem correspondente.",
    "bubble-pop": "Ouça a pista e estoure a bolha correspondente.",
    "drag-drop-multimedia": "Ouça cada palavra e arraste o áudio até a imagem correspondente.",
    "drag-drop": "Arraste cada cartão para o grupo que corresponde a ele.",
    matching: "Combine cada cartão com seu par.",
    "smart-sentence-complete": "Escolha a palavra que completa a frase.",
    "smart-sentence-order": "Organize as palavras na ordem correta.",
    "memory-quest": "Ouça cada palavra e encontre a imagem correspondente."
  }[mechanic];
  return { en, pt: support };
};
const imageSlot = (moduleId, questionId, semanticTarget, role = "stimulus") => ({
  assetId: `IMG-${questionId}-${slug(semanticTarget).toUpperCase()}`,
  role, semanticTarget, mustInclude: semanticTarget,
  mustNotInclude: "unrelated object, written answer cue, or extra countable targets",
  answerLeakRisk: "LOW_WITH_CONTEXT", status: "IMAGE_REFINEMENT_PENDING"
});
const makeAudioId = (moduleId, text, locale) => `AUD-${moduleId}-${locale === "en-US" ? "EN" : "PT"}-${slug(text).toUpperCase()}`;
const inputManifest = { schemaVersion: "1.0", entries: [] };
const audioByKey = new Map();
function addAudio(moduleId, itemId, transcript, locale, role) {
  const audioId = makeAudioId(moduleId, transcript, locale);
  const key = `${audioId}|${locale}`;
  if (!audioByKey.has(key)) {
    audioByKey.set(key, {
      audioId, moduleId, transcript, locale, role, voiceVersion: "DUDUQ_GOLD_VOICE_v1",
      engine: "chatterbox-multilingual-v3", status: "PENDING_OFFICIAL_GOLD_VOICE_GENERATION",
      outputPath: `content/english/assets/audio/versions/YEAR1_WAVE1/${moduleId.toLowerCase()}/${locale}/${slug(transcript)}.mp3`,
      masterAudioPath: `content/english/assets/audio/master/versions/YEAR1_WAVE1/${moduleId.toLowerCase()}/${locale}/${slug(transcript)}.wav`,
      usedByItems: []
    });
  }
  const entry = audioByKey.get(key);
  if (!entry.usedByItems.includes(itemId)) entry.usedByItems.push(itemId);
  return audioId;
}

function answerContract(moduleId, question, index, words) {
  const id = `${moduleId}-${question.activityId}`;
  const mode = question.answerContract?.mode || (question.mechanicId === "memory-quest" ? "AUDIO_IMAGE" : null);
  if (question.mechanicId === "memory-quest") {
    const targets = question.answerContract.targetSet;
    const pairs = targets.map((word, pairIndex) => ({
      pairId: `${id}-${slug(word)}`, semanticTarget: word,
      cards: [
        { cardId: `${id}-${pairIndex + 1}-audio`, modality: "audio", audioId: addAudio(moduleId, id, word, "en-US", "CONTENT_STIMULUS") },
        { cardId: `${id}-${pairIndex + 1}-image`, modality: "image", media: imageSlot(moduleId, id, word, "MEMORY_CARD") }
      ]
    }));
    return { mechanicMode: mode, pairs, answerKey: pairs.map(pair => pair.pairId), audioBindings: pairs.map(pair => pair.cards[0]) };
  }
  const mechanic = question.mechanicId;
  const focus = String(question.languageTargets?.[0] || "").toLowerCase();
  const curriculumWords = moduleId === "Y1M03" ? ["red", "blue", "yellow", "green", "black", "white", "orange", "purple", "gray", "brown"]
    : moduleId === "Y1M04" && /color/.test(focus) ? ["red", "blue", "yellow", "green", "black", "white"]
      : moduleId === "Y1M06" && /color/.test(focus) ? ["red", "blue", "yellow", "green"] : words;
  const explicitFocus = curriculumWords.find(word => focus === word || focus.startsWith(`${word} `) || focus.includes(` ${word} `));
  const target = explicitFocus || curriculumWords[Math.floor(index * curriculumWords.length / 20) % curriculumWords.length];
  const choiceWords = ids(curriculumWords, 4, curriculumWords.indexOf(target));
  if (mechanic === "target-shooter") {
    const options = choiceWords.map((word, i) => ({ optionId: `${id}-O${i + 1}`, answerKey: slug(word), label: word, semanticTarget: word, media: imageSlot(moduleId, id, word, "TARGET") }));
    return { mechanicMode: "single-target-choice", stimulus: { type: "visible-clue", target, audioId: addAudio(moduleId, id, target, "en-US", "CONTENT_STIMULUS") }, options, answerKey: slug(target), audioBindings: [{ role: "content-stimulus", audioId: addAudio(moduleId, id, target, "en-US", "CONTENT_STIMULUS") }] };
  }
  if (mechanic === "bubble-pop") {
    const petColorScenes = moduleId === "Y1M06" && /color/.test(focus)
      ? ["red dog", "blue cat", "yellow fish", "green rabbit", "red bird", "blue turtle", "yellow hamster", "green spider"] : null;
    const bubbleTarget = petColorScenes ? petColorScenes[index % petColorScenes.length] : target;
    const distractorWords = petColorScenes ? petColorScenes.filter(word => word !== bubbleTarget) : curriculumWords.filter(word => word !== target);
    const pool = ids(distractorWords, Math.min(distractorWords.length, 6), index % distractorWords.length);
    return { mechanicMode: "single-target-find", stimulus: { type: "content-audio", target: bubbleTarget, audioId: addAudio(moduleId, id, bubbleTarget, "en-US", "CONTENT_STIMULUS") }, targetsToFind: [{ id: `${id}-correct`, semanticTarget: bubbleTarget, media: imageSlot(moduleId, id, bubbleTarget, "CORRECT_BUBBLE") }], bubbleDistractorPool: pool.map((word, i) => ({ id: `${id}-D${i + 1}`, semanticTarget: word, media: imageSlot(moduleId, id, word, "DISTRACTOR_BUBBLE") })), answerKey: slug(bubbleTarget), audioBindings: [{ role: "content-stimulus", audioId: addAudio(moduleId, id, bubbleTarget, "en-US", "CONTENT_STIMULUS") }] };
  }
  if (mechanic === "drag-drop-multimedia") {
    const set = ids(curriculumWords, 4, Math.floor(index * curriculumWords.length / 20));
    const pairs = set.map((word, i) => ({ itemId: `${id}-A${i + 1}`, targetId: `${id}-T${i + 1}`, answerKey: slug(word), semanticTarget: word }));
    return { mechanicMode: "audio-4-to-visual-4-multimatch", dragDropContract: { mode: "multi-match" }, stimulus: { type: "four-audio-card-match" }, items: pairs.map(pair => ({ id: pair.itemId, modality: "audio", semanticTarget: pair.semanticTarget, audioId: addAudio(moduleId, id, pair.semanticTarget, "en-US", "CONTENT_STIMULUS"), answerKey: pair.answerKey })), targets: pairs.map(pair => ({ id: pair.targetId, semanticTarget: pair.semanticTarget, media: imageSlot(moduleId, id, pair.semanticTarget, "DESTINATION"), answerKey: pair.answerKey })), mappings: pairs.map(({ itemId, targetId, answerKey }) => ({ itemId, targetId, answerKey })), answerKey: Object.fromEntries(pairs.map(({ itemId, targetId }) => [itemId, targetId])) };
  }
  if (mechanic === "matching") {
    const set = ids(curriculumWords, 4, Math.floor(index * curriculumWords.length / 20));
    const pairs = set.map((word, i) => ({ pairId: `${id}-P${i + 1}`, semanticTarget: word, a: { id: `${id}-A${i + 1}`, modality: "text", value: word }, b: { id: `${id}-B${i + 1}`, modality: "image", media: imageSlot(moduleId, id, word, "PAIR_IMAGE") } }));
    return { mechanicMode: "semantic-pair", stimulus: { type: "word-image-match" }, pairs, answerKey: Object.fromEntries(pairs.map(pair => [pair.a.id, pair.b.id])) };
  }
  if (mechanic === "drag-drop") {
    const numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    const isNumberGrouping = moduleId === "Y1M02" || (moduleId === "Y1M04" && /number|quantity/.test(focus));
    const groups = isNumberGrouping ? [{ id: "one-to-five", label: "1–5" }, { id: "six-to-ten", label: "6–10" }]
      : moduleId === "Y1M03" ? [{ id: "active-colors", label: "CORE COLORS" }, { id: "additional-colors", label: "MORE COLOR WORDS" }]
        : moduleId === "Y1M04" ? [{ id: "use-to-write", label: "USE TO WRITE" }, { id: "carry-or-store", label: "CARRY OR STORE" }]
      : moduleId === "Y1M06" ? [{ id: "small", label: "SMALL" }, { id: "big", label: "BIG" }]
        : [{ id: "body-parts", label: "BODY PARTS" }, { id: "actions", label: "ACTIONS" }];
    const groupItems = moduleId === "Y1M06" ? [
      ["dog", "big"], ["cat", "small"], ["fish", "small"], ["rabbit", "small"], ["bird", "small"], ["turtle", "small"]
    ].map(([animal, size]) => ({ semanticTarget: animal, label: animal, groupId: size }))
      : isNumberGrouping ? numbers.map((word, i) => ({ semanticTarget: word, label: word, groupId: i < 5 ? "one-to-five" : "six-to-ten" }))
        : moduleId === "Y1M03" ? ["red", "blue", "yellow", "green", "black", "white", "orange", "purple"].map((word, i) => ({ semanticTarget: word, label: word, groupId: i < 6 ? "active-colors" : "additional-colors" }))
          : moduleId === "Y1M04" ? words.slice(0, 7).map(word => ({ semanticTarget: word, label: word, groupId: ["eraser", "pencil", "crayon", "ruler", "pen"].includes(word) ? "use-to-write" : "carry-or-store" }))
        : moduleId === "Y1M05" ? words.slice(0, 8).map((word, i) => ({ semanticTarget: word, label: word, groupId: i < 5 ? "body-parts" : "actions" }))
          : ids(words, 6, Math.floor(index * words.length / 20)).map((word, i) => ({ semanticTarget: word, label: word, groupId: groups[i % groups.length].id }));
    const items = groupItems.map((entry, i) => ({ id: `${id}-I${i + 1}`, ...entry }));
    return { mechanicMode: "grouping", stimulus: { type: "explicit-grouping" }, groups, items, answerKey: Object.fromEntries(items.map(item => [item.id, item.groupId])) };
  }
  if (mechanic === "smart-sentence-complete") {
    const sentence = moduleId === "Y1M03" ? ["It's", { slot: true }, "."]
      : moduleId === "Y1M06" ? ["The", { slot: true }, "is my pet."]
        : moduleId === "Y1M04" ? ["It's a", { slot: true }, "."] : ["Count to", { slot: true }, "."];
    const options = ids(words, 4, words.indexOf(target)).map(word => ({ optionId: `${id}-${slug(word)}`, label: word, answerKey: slug(word) }));
    return { mechanicMode: "complete", stimulus: { type: "short-supported-sentence", sentence }, sentence, options, answerKey: slug(target) };
  }
  if (mechanic === "smart-sentence-order") {
    const tokens = ["I", "see", target];
    const shuffled = [tokens[2], tokens[0], tokens[1]];
    return { mechanicMode: "order", stimulus: { type: "modeled-three-token-chunk" }, tokens: shuffled, orderedTokens: tokens, answerKey: tokens };
  }
  throw new Error(`UNSUPPORTED_MECHANIC:${mechanic}`);
}

for (let n = 2; n <= 6; n += 1) {
  const moduleId = `Y1M0${n}`;
  const plan = await readJson(`content/english/planning/year-1/module-0${n}.json`);
  const words = vocab[moduleId];
  const items = plan.activitySequence.map((question, index) => {
    const copy = instruction(question.mechanicId, plan.centralTheme.toLowerCase());
    const enId = addAudio(moduleId, question.activityId, copy.en, "en-US", "INSTRUCTION");
    const ptId = addAudio(moduleId, question.activityId, copy.pt, "pt-BR", "INSTRUCTION");
    const logic = answerContract(moduleId, question, index, words);
    const topicEn = titleById[moduleId][index % titleById[moduleId].length];
    return {
      item_id: `${moduleId}-${question.activityId}`, moduleId, questionId: question.activityId,
      activityId: `${moduleId}-${question.activityId}`, sequencePosition: index + 1,
      topicEn, mechanicId: question.mechanicId, mechanicMode: logic.mechanicMode,
      pedagogicalPhase: question.pedagogicalPhase, learningTarget: question.learningTarget,
      primaryInstructionEn: copy.en, supportInstructionPt: copy.pt,
      instruction: { version: "1.2", titleEn: topicEn, titlePt: plan.title, instructionEn: copy.en, instructionPt: copy.pt,
        instructionAudioEnId: enId, instructionAudioPtId: ptId, audioOrder: ["en", "pt"], languageEn: "English", languagePt: "pt-BR", standard: "DUDUQ_ENGLISH_MASTER_INSTRUCTION_STANDARD_V1_2" },
      stimulus: logic.stimulus || null, options: logic.options || [], targetsToFind: logic.targetsToFind || [],
      items: logic.items || [], targets: logic.targets || [], groups: logic.groups || [], pairs: logic.pairs || [],
      sentence: logic.sentence || null, tokens: logic.tokens || [], orderedTokens: logic.orderedTokens || [],
      answerKey: logic.answerKey, mappings: logic.mappings || [], dragDropContract: logic.dragDropContract || null,
      bubbleDistractorPool: logic.bubbleDistractorPool || [],
      audioBindings: logic.audioBindings || (logic.items || []).filter(item => item.audioId).map(item => ({
        role: "content-stimulus", audioId: item.audioId, itemId: item.id
      })),
      mediaBindings: [imageSlot(moduleId, question.activityId, logic.stimulus?.target || words[index % words.length])],
      feedback_acerto: "Great work!", feedback_erro: "Try again. Look and listen carefully.",
      feedbackContract: { correct: "activity-success", incorrect: "retry-without-progression", finalWinSfx: false },
      productionStatus: "CONTENT_AUTHORED_AUDIO_GENERATION_REQUIRED",
      planningReference: { file: `content/english/planning/year-1/module-0${n}.json`, activityId: question.activityId }
    };
  });
  const metadata = {
    schemaVersion: "duduq-year1-module-production-v1", moduleId, year: 1, moduleNumber: n,
    title: plan.title, topic: plan.centralTheme, subtitle: "Listen, look and play!",
    intro: { required: true, moduleLabel: `MÓDULO ${n}`, gradeLabel: "1º ANO", subjectLabel: "LÍNGUA INGLESA", route: "/play/intro-module/" },
    allowedMechanics: [...new Set(items.map(item => item.mechanicId))], blockedMechanics: ["smart-sentence-unscramble"],
    lifecycle: "DUDUQ_SHARED_MODULE_RUNTIME_ROUTE_V1", finalContract: "MODULE_FINAL_CANONICAL_LOCKED",
    sourceBlueprint: `content/english/planning/year-1/module-0${n}.json`, productionStatus: "CONTRACT_AUTHORED_AUDIO_AND_RUNTIME_QA_REQUIRED"
  };
  await writeJson(`content/english/year-1/module-0${n}/module.json`, metadata);
  await writeJson(`content/english/year-1/module-0${n}/questions.json`, { schemaVersion: "duduq-year1-question-contract-v1", moduleId, itemCount: 20, items });
}
await writeJson("content/english/year-1/wave-1-audio-generation-manifest.json", {
  schemaVersion: "duduq-gold-voice-generation-manifest-v1", voiceVersion: "DUDUQ_GOLD_VOICE_v1",
  status: "PENDING_OFFICIAL_GENERATION", entries: [...audioByKey.values()]
});
console.log(JSON.stringify({ modules: 5, activities: 100, uniqueAudioContracts: audioByKey.size, status: "CONTENT_CONTRACTS_AUTHORED_AUDIO_AND_MECHANIC_RUNTIME_VALIDATION_PENDING" }, null, 2));

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const readJson = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const writeJson = async (file, value) => {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const moduleId = "Y2M01";
const base = "content/english/year-2/module-01";
const planPath = "content/english/planning/year-2/module-01.json";
const plan = await readJson(planPath);
// Human-approved content/mechanic compatibility decisions. The plan remains
// the curricular authority; only these two frozen-mechanic bindings differ.
const humanApprovedMechanicOverrides = Object.freeze({ Q011: "memory-quest", Q014: "drag-drop-multimedia" });
const master = await readJson("content/english/master/curricular-master-v3.json");
const module = master.modules.find(row => row.id === moduleId);
if (!module || plan.moduleId !== moduleId || plan.activitySequence?.length !== 20) throw new Error("Y2M01_SOURCE_BLUEPRINT_INVALID");

const audioManifest = await readJson("duduq-audio/manifests/AUDIO_MANIFEST.json");
const approvedAudio = new Map(audioManifest.items.filter(row => row.status === "APPROVED").map(row => [row.id, row]));
const mediaRegistry = await readJson("content/english/media/media-registry.json");
const mediaById = new Map(mediaRegistry.entries.filter(row => row.status === "APPROVED").map(row => [row.mediaId, row]));
const audioIdFor = (text, locale = "en-US") => {
  const normalized = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
  const found = audioManifest.items.find(row => row.status === "APPROVED" && row.voiceVersion === "DUDUQ_GOLD_VOICE_v1" && row.locale === locale && normalized(row.speechText) === normalized(text));
  if (found) return found.id;
  const productionIds = new Map([
    ["en-US|Good night.", "AUD-Y2M01-LEX-GOOD-NIGHT"],
    ["en-US|See you.", "AUD-Y2M01-LEX-SEE-YOU"],
    ["en-US|F, G, H, I, J.", "AUD-Y2M01-SSC-Q008-EN"],
    ["pt-BR|A sequência de letras é F, G, H, I, J.", "AUD-Y2M01-SSC-Q008-PT"],
    ["en-US|L - U - C - A - S.", "AUD-Y2M01-SSC-Q018-EN"],
    ["pt-BR|O nome Lucas é soletrado L - U - C - A - S.", "AUD-Y2M01-SSC-Q018-PT"]
  ]);
  const planned = productionIds.get(`${locale}|${text}`);
  if (!planned) throw new Error(`Y2M01_AUDIO_NOT_REGISTERED:${locale}:${text}`);
  return planned;
};
const letterAudio = letter => {
  const id = `AUD-EN-LETTER-${letter}`;
  if (!approvedAudio.has(id)) throw new Error(`CANONICAL_LETTER_AUDIO_MISSING:${letter}`);
  return id;
};
const letterMedia = letter => {
  const id = `MEDIA-LETTER-${letter}`;
  if (!mediaById.has(id)) throw new Error(`CANONICAL_LETTER_MEDIA_MISSING:${letter}`);
  return id;
};
const commonMedia = {
  hello: "IMG-Y1M01-GREETING-INFORMAL-001", morning: "IMG-Y1M01-GREETING-MORNING-001",
  afternoon: "IMG-Y1M01-GREETING-AFTERNOON-001", goodbye: "IMG-Y1M01-FAREWELL-GENERIC-001",
  seeYou: "IMG-Y2M01-SEE-YOU-001",
  night: "Y1M01-EMOJI-NIGHT-001", leo: "IMG-Y1M01-NAME-LEO-001", mia: "IMG-Y1M01-NAME-MIA-001",
  ana: "IMG-Y1M01-NAME-TAGS-001", ben: "IMG-Y1M01-NAME-QUESTION-ANSWER-001"
};
for (const id of Object.values(commonMedia)) if (!mediaById.has(id)) throw new Error(`Y2M01_REUSED_MEDIA_MISSING:${id}`);

const instructionPairs = {
  "target-shooter": ["AUD-Y1M01-INSTRUCTION-V2-EN-001", "AUD-Y1M01-INSTRUCTION-V2-PT-016", "Listen and shoot the matching picture.", "Ouça e acerte a figura correspondente."],
  "bubble-pop": ["AUD-Y1M01-INSTRUCTION-V2-EN-002", "AUD-Y1M01-INSTRUCTION-V2-PT-002", "Listen and pop the matching bubble.", "Ouça e estoure a bolha correspondente."],
  "drag-drop-multimedia": ["AUD-Y1M02-Q001-INSTRUCTION-EN-V72", "AUD-Y1M02-Q001-INSTRUCTION-PT-V72", "Listen and drag each audio to its picture.", "Escute e arraste cada áudio para a imagem correspondente."],
  "drag-drop": ["AUD-Y1-UX-EN-721DC4006A5B", "AUD-Y1-UX-PT-860E2978BC37", "Drag each card to the correct group.", "Arraste cada cartão para o grupo certo."],
  matching: ["AUD-Y1-UX-EN-D11F7CD7F5F1", "AUD-Y1-UX-PT-DB0EC4998C9F", "Match each card to its pair.", "Combine os pares."],
  "memory-quest": ["AUD-MQ-V72-AUDIO-TEXT-EN", "AUD-MQ-V72-AUDIO-TEXT-PT", "Match each audio to the correct word.", "Combine cada áudio com a palavra correta."],
  "smart-sentence-complete": ["AUD-Y1-UX-EN-8FD32A2E6DE6", "AUD-Y1-UX-PT-DE494B05B06A", "Complete the sentence.", "Complete a frase."]
};
for (const [mechanic, pair] of Object.entries(instructionPairs)) for (const id of pair.slice(0, 2)) if (!approvedAudio.has(id)) throw new Error(`Y2M01_INSTRUCTION_AUDIO_MISSING:${mechanic}:${id}`);
const slug = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const image = (target, mediaId, role = "semantic-target") => ({ assetId: mediaId, role, semanticTarget: target, mustInclude: target, mustNotInclude: "unrelated labels or a written answer cue beyond the intended target", answerLeakRisk: "LOW_WITH_CONTEXT", status: mediaRegistry.entries.find(row => row.mediaId === mediaId)?.integrationStatus || "APPROVED" });
const qid = n => `Q${String(n).padStart(3, "0")}`;
const canonicalFeedbackProfile = mechanicId => ({
  "target-shooter": "DUDUQ_CANONICAL_FEEDBACK_TARGET_SHOOTER_V1",
  "bubble-pop": "DUDUQ_CANONICAL_FEEDBACK_BUBBLE_POP_V1",
  "drag-drop-multimedia": "DUDUQ_CANONICAL_FEEDBACK_DDM_V1",
  "drag-drop": "DUDUQ_CANONICAL_FEEDBACK_GROUPING_V1",
  matching: "DUDUQ_CANONICAL_FEEDBACK_MATCHING_V1",
  "memory-quest": "DUDUQ_CANONICAL_FEEDBACK_MEMORY_QUEST_V1",
  "smart-sentence-complete": "DUDUQ_CANONICAL_FEEDBACK_SMART_SENTENCE_V1",
  "smart-sentence-order": "DUDUQ_CANONICAL_FEEDBACK_SMART_SENTENCE_V1"
}[mechanicId] || null);
const contentPresentation = {
  Q001: ["GREETING_FORMULAS", "VISIBLE_PAIR_DISCOVERY_NO_PREREAD"],
  Q002: ["LETTER_NAMES", "ON_DEMAND_AUDIO_CARD_ONLY"],
  Q003: ["FAREWELL_FORMULA", "ENGLISH_TARGET_AUDIO_ONCE_NO_PT_ANSWER"],
  Q004: ["LETTER_NAMES", "VISIBLE_ITEMS_CLASSIFIED_INTO_TAUGHT_RANGES"],
  Q005: ["LETTER_NAMES", "AUDIO_TEXT_CARD_ACTIVATION_ONLY"],
  Q006: ["GREETING_FAREWELL_FORMULAS", "ON_DEMAND_AUDIO_CARD_ONLY"],
  Q007: ["SOCIAL_FORMULAS", "WORD_SIDE_SELECTION_IMAGE_FIRST_SILENT"],
  Q008: ["LETTER_SEQUENCE", "ONE_BLANK_SEQUENCE_WITH_POST_SUCCESS_REINFORCEMENT"],
  Q009: ["NAME_EXCHANGE", "ENGLISH_TARGET_AUDIO_ONCE_NO_PT_ANSWER"],
  Q010: ["LETTER_NAMES", "VISIBLE_ITEMS_CLASSIFIED_INTO_TAUGHT_RANGES"],
  Q011: ["LETTER_NAMES", "AUDIO_TO_WRITTEN_LETTER_MEMORY_RETRIEVAL"],
  Q012: ["GREETING_FAREWELL_FORMULAS", "ON_DEMAND_AUDIO_CARD_ONLY"],
  Q013: ["FAREWELL_FORMULA", "ENGLISH_TARGET_AUDIO_ONCE_NO_PT_ANSWER"],
  Q014: ["LETTER_NAMES", "ON_DEMAND_AUDIO_CARD_TO_WRITTEN_LETTER"],
  Q015: ["LETTER_NAMES", "AUDIO_TEXT_CARD_ACTIVATION_ONLY"],
  Q016: ["LETTER_NAMES", "ON_DEMAND_AUDIO_CARD_ONLY"],
  Q017: ["NAME_EXCHANGE", "VISIBLE_PAIR_DISCOVERY_NO_PREREAD"],
  Q018: ["SPELLING", "ONE_BLANK_SPELLING_WITH_POST_SUCCESS_REINFORCEMENT"],
  Q019: ["SOCIAL_FORMULAS", "VISIBLE_ITEMS_CLASSIFIED_INTO_GREETINGS_OR_FAREWELLS"],
  Q020: ["LETTER_NAMES", "ON_DEMAND_AUDIO_CARD_ONLY"]
};
const activityVoicePlans = {
  Q001: { semantic: "GREETING_FORMULAS", task: "MATCH", target: "GREETING_OR_FAREWELL_PHRASE", relation: "PHRASE_TO_ILLUSTRATION_PAIR", en: "Match each greeting or farewell to its picture.", pt: "Combine cada cumprimento ou despedida com a imagem correspondente.", reinforcement: "PAIR_DISCOVERY" },
  Q002: { semantic: "LETTER", task: "LISTEN_AND_DRAG_MATCH", target: "LETTER_NAME_AND_WRITTEN_FORM", relation: "AUDIO_LETTER_NAME_TO_WRITTEN_LETTER", en: "Listen to each letter name and drag it to its matching letter.", pt: "Ouça o nome de cada letra e arraste até a letra correspondente.", reinforcement: "LETTER_NAME_NO_TRANSLATION" },
  Q003: { semantic: "FAREWELL_FORMULA", task: "POP", target: "FAREWELL_PHRASE", relation: "ENGLISH_STIMULUS_TO_MATCHING_BUBBLE", en: "Listen and pop the matching farewell bubble.", pt: "Ouça e estoure a bolha com a despedida correspondente.", reinforcement: "BUBBLE_SUCCESS_THEN_OPTIONAL_MEANING" },
  Q004: { semantic: "LETTER", task: "GROUP", target: "LETTER", relation: "LETTER_TO_ALPHABET_RANGE", en: "Drag each letter to the correct group.", pt: "Arraste cada letra para o grupo certo.", reinforcement: "GROUPING_SUCCESS" },
  Q005: { semantic: "LETTER", task: "RETRIEVE", target: "LETTER_NAME_AND_WRITTEN_FORM", relation: "AUDIO_LETTER_NAME_TO_TEXT_LETTER_PAIR", en: "Listen to each letter and find its written pair.", pt: "Ouça cada letra e encontre seu par escrito.", reinforcement: "MEMORY_PAIR_SUCCESS_NO_HIDDEN_ENUMERATION" },
  Q006: { semantic: "GREETING_FAREWELL_FORMULAS", task: "LISTEN_AND_DRAG_MATCH", target: "SOCIAL_PHRASE", relation: "AUDIO_PHRASE_TO_ILLUSTRATION", en: "Listen and drag each greeting or farewell to its picture.", pt: "Ouça e arraste cada cumprimento ou despedida até a imagem correspondente.", reinforcement: "DDM_COMBINATION_SUCCESS" },
  Q007: { semantic: "SOCIAL_FORMULAS", task: "MATCH", target: "SOCIAL_PHRASE", relation: "PHRASE_TO_ILLUSTRATION_PAIR", en: "Match each greeting or farewell to its picture.", pt: "Combine cada cumprimento ou despedida com a imagem correspondente.", reinforcement: "PAIR_DISCOVERY" },
  Q008: { semantic: "LETTER_SEQUENCE", task: "COMPLETE_SEQUENCE", target: "MISSING_LETTER", relation: "LETTER_SEQUENCE_WITH_ONE_MISSING_POSITION", en: "Complete the letter sequence.", pt: "Complete a sequência de letras.", reinforcement: "COMPLETED_SEQUENCE_EN_THEN_PT_MEANING" },
  Q009: { semantic: "NAME_EXCHANGE", task: "SHOOT", target: "PERSON_NAME", relation: "SPOKEN_NAME_EXCHANGE_TO_PERSON_IMAGE", en: "Listen and shoot the picture with the matching name.", pt: "Ouça e acerte a figura com o nome correspondente.", reinforcement: "TARGET_SHOOTER_SUCCESS_THEN_CONTEXTUAL_MEANING" },
  Q010: { semantic: "LETTER", task: "GROUP", target: "LETTER", relation: "LETTER_TO_TAUGHT_ALPHABET_BATCH", en: "Drag each letter to the correct group.", pt: "Arraste cada letra para o grupo certo.", reinforcement: "GROUPING_SUCCESS" },
  Q011: { semantic: "LETTER", task: "LISTEN_AND_MATCH", target: "LETTER_NAME_AND_WRITTEN_FORM", relation: "AUDIO_TO_WRITTEN_LETTER", en: "Listen to each letter and find its written pair.", pt: "Ouça cada letra e encontre seu par escrito.", reinforcement: "MEMORY_PAIR_SUCCESS_NO_HIDDEN_ENUMERATION" },
  Q012: { semantic: "FAREWELL_FORMULAS", task: "LISTEN_AND_DRAG_MATCH", target: "FAREWELL_PHRASE", relation: "AUDIO_FAREWELL_TO_ILLUSTRATION", en: "Listen and drag each farewell to its picture.", pt: "Ouça e arraste cada despedida até a imagem correspondente.", reinforcement: "DDM_COMBINATION_SUCCESS" },
  Q013: { semantic: "FAREWELL_FORMULA", task: "SHOOT", target: "TIME_OF_DAY_FAREWELL", relation: "SPOKEN_FAREWELL_TO_MATCHING_IMAGE", en: "Listen and shoot the matching farewell.", pt: "Ouça e acerte a despedida correspondente.", reinforcement: "TARGET_SHOOTER_SUCCESS_THEN_CONTEXTUAL_MEANING" },
  Q014: { semantic: "LETTER", task: "LISTEN_AND_DRAG_MATCH", target: "LETTER_NAME_AND_WRITTEN_FORM", relation: "AUDIO_TO_WRITTEN_LETTER", en: "Listen to each letter name and drag it to its matching letter.", pt: "Ouça o nome de cada letra e arraste até a letra correspondente.", reinforcement: "DDM_COMBINATION_SUCCESS" },
  Q015: { semantic: "LETTER", task: "RETRIEVE", target: "LETTER_NAME_AND_WRITTEN_FORM", relation: "AUDIO_LETTER_NAME_TO_TEXT_LETTER_PAIR", en: "Listen to each letter and find its written pair.", pt: "Ouça cada letra e encontre seu par escrito.", reinforcement: "MEMORY_PAIR_SUCCESS_NO_HIDDEN_ENUMERATION" },
  Q016: { semantic: "LETTER", task: "LISTEN_AND_DRAG_MATCH", target: "LETTER_NAME_AND_WRITTEN_FORM", relation: "AUDIO_LETTER_NAME_TO_WRITTEN_LETTER", en: "Listen to each letter name and drag it to its matching letter.", pt: "Ouça o nome de cada letra e arraste até a letra correspondente.", reinforcement: "LETTER_NAME_NO_TRANSLATION" },
  Q017: { semantic: "NAME_EXCHANGE", task: "MATCH", target: "PERSON_NAME", relation: "WRITTEN_NAME_RESPONSE_TO_PERSON_IMAGE", en: "Match each name to the person.", pt: "Combine cada nome com a pessoa correspondente.", reinforcement: "PAIR_DISCOVERY_NO_BULK_READ" },
  Q018: { semantic: "SPELLING", task: "COMPLETE_SPELLING", target: "FAMILIAR_NAME", relation: "MODELED_NAME_SPELLING_WITH_ONE_MISSING_LETTER", en: "Finish spelling the name.", pt: "Termine de soletrar o nome.", reinforcement: "COMPLETED_NAME_SPELLING_EN_THEN_PT" },
  Q019: { semantic: "SOCIAL_FORMULAS", task: "CLASSIFY", target: "GREETING_OR_FAREWELL_PHRASE", relation: "SOCIAL_PHRASE_TO_GREETING_OR_FAREWELL_GROUP", en: "Sort each greeting or farewell into the right group.", pt: "Organize cada cumprimento ou despedida no grupo certo.", reinforcement: "GROUPING_SUCCESS" },
  Q020: { semantic: "LETTER", task: "LISTEN_AND_DRAG_MATCH", target: "LETTER_NAME_AND_WRITTEN_FORM", relation: "AUDIO_LETTER_NAME_TO_WRITTEN_LETTER", en: "Listen to each letter name and drag it to its matching letter.", pt: "Ouça o nome de cada letra e arraste até a letra correspondente.", reinforcement: "LETTER_NAME_NO_TRANSLATION" }
};
const instructionAudioIdFor = (text, locale) => {
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
  const match = audioManifest.items.find(row => row.status === "APPROVED" && row.voiceVersion === "DUDUQ_GOLD_VOICE_v1" && row.locale === locale && normalize(row.speechText) === normalize(text));
  if (match) return match.id;
  const suffix = createHash("sha256").update(`${locale}|${text}`).digest("hex").slice(0, 12).toUpperCase();
  return `AUD-Y2M01-INSTRUCTION-${locale === "en-US" ? "EN" : "PT"}-${suffix}`;
};
const letterSet = value => value.split("");
const baseQuestion = (row, index) => {
  const questionId = row.activityId;
  const voicePlan = activityVoicePlans[questionId];
  if (!voicePlan) throw new Error(`Y2M01_VOICE_PLAN_MISSING:${questionId}`);
  const mechanicId = humanApprovedMechanicOverrides[questionId] || row.mechanicId;
  const moduleTitlePt = "Saudações, nomes e alfabeto";
  const rowCopy = {
    "target-shooter": ["Listen and shoot the matching picture.", "Ouça e acerte a figura correspondente."],
    "bubble-pop": ["Listen and pop the matching bubble.", "Ouça e estoure a bolha correspondente."],
    "drag-drop-multimedia": ["Listen and drag each audio to its picture.", "Escute e arraste cada áudio para a imagem correspondente."],
    "drag-drop": ["Drag each card to the correct group.", "Arraste cada cartão para o grupo certo."],
    matching: ["Match each card to its pair.", "Combine os pares."],
    "memory-quest": ["Match each audio to the correct word.", "Combine cada áudio com a palavra correta."],
    "smart-sentence-complete": ["Complete the sentence.", "Complete a frase."]
  }[mechanicId];
  const actualInstructionEn = voicePlan.en;
  const actualInstructionPt = voicePlan.pt;
  const instructionAudioEnId = instructionAudioIdFor(actualInstructionEn, "en-US");
  const instructionAudioPtId = instructionAudioIdFor(actualInstructionPt, "pt-BR");
  const title = row.contentFamily || plan.centralTheme;
  return {
    item_id: `${moduleId}-${questionId}`, moduleId, questionId, activityId: `${moduleId}-${questionId}`,
    sequencePosition: index + 1, topicEn: title, mechanicId, mechanicMode: null,
    ...(humanApprovedMechanicOverrides[questionId] ? { humanApprovedMechanicOverride: {
      authority: "AUGUSTO", feature: "DUDUQ_PEDAGOGICAL_MECHANIC_RECONCILIATION_V10_11",
      previousMechanicId: row.mechanicId, approvedMechanicId: mechanicId
    } } : {}),
    pedagogicalPhase: row.pedagogicalPhase, learningTarget: row.learningTarget,
    primaryInstructionEn: actualInstructionEn, supportInstructionPt: actualInstructionPt,
    instruction: { version: "1.2", titleEn: plan.title, titlePt: moduleTitlePt, instructionEn: actualInstructionEn, instructionPt: actualInstructionPt,
      instructionAudioEnId, instructionAudioPtId, audioOrder: ["en", "pt"], languageEn: "English", languagePt: "pt-BR", standard: "DUDUQ_ENGLISH_MASTER_INSTRUCTION_STANDARD_V1_2" },
    stimulus: null, options: [], targetsToFind: [], items: [], targets: [], groups: [], pairs: [], sentence: null,
    tokens: [], orderedTokens: [], answerKey: null, mappings: [], dragDropContract: null, bubbleDistractorPool: [],
    audioBindings: [], mediaBindings: [],
    semanticTargetType: voicePlan.semantic,
    taskType: voicePlan.task,
    targetType: voicePlan.target,
    interactionRelation: voicePlan.relation,
    pedagogicalVoicePlan: {
      semanticProfileId: `DUDUQ_SEMANTIC_${voicePlan.semantic}_V1`,
      taskProfileId: `DUDUQ_TASK_${voicePlan.task}_V1`,
      semanticInstruction: { en: actualInstructionEn, pt: actualInstructionPt, setupAudioId: null, targetAudioId: null },
      mechanicPersonalityProfileId: canonicalFeedbackProfile(mechanicId),
      wrongFeedbackProfileId: canonicalFeedbackProfile(mechanicId),
      successFeedbackProfileId: canonicalFeedbackProfile(mechanicId),
      retryPersonalityProfileId: canonicalFeedbackProfile(mechanicId),
      postSuccessReinforcement: voicePlan.reinforcement
    },
    targetPresentation: { policy: contentPresentation[questionId.slice(-4)]?.[1] || "CANONICAL_MECHANIC_DEFAULT", setupAudioId: null, targetAudioId: null },
    canonicalFeedbackProfileId: canonicalFeedbackProfile(mechanicId),
    feedbackContract: { lifecycle: "CANONICAL_MECHANIC_PROFILE", finalWinSfx: false },
    productionStatus: "PRODUCTION_READY",
    planningReference: { file: planPath, activityId: questionId, authority: "CURRICULAR_MASTER_V3" }
  };
};

const audioCard = (id, word, letter = false) => ({ id, modality: "audio", semanticTarget: word, audioId: letter ? letterAudio(word) : audioIdFor(word), answerKey: slug(word) });
const imageTarget = (id, word, mediaId, answerKey = slug(word)) => ({ id, semanticTarget: word, media: image(word, mediaId, "DESTINATION"), answerKey });
const mediaBinding = (word, mediaId, role = "supporting-image") => ({ ...image(word, mediaId, role), mediaId });
const mapping = (item, target, key) => ({ itemId: item, targetId: target, answerKey: key });
const qItems = [];

for (let index = 0; index < plan.activitySequence.length; index += 1) {
  const row = plan.activitySequence[index];
  const n = index + 1;
  const item = baseQuestion(row, index);
  const id = item.item_id;
  const addMedia = (word, mediaId, role) => item.mediaBindings.push(mediaBinding(word, mediaId, role));
  if (n === 1) {
    item.mechanicMode = "semantic-pair";
    const entries = [["Hello!", commonMedia.hello], ["Good morning!", commonMedia.morning], ["Good afternoon!", commonMedia.afternoon], ["Goodbye!", commonMedia.goodbye]];
    item.pairs = entries.map(([word, mediaId], i) => ({ pairId: `${id}-P${i + 1}`, semanticTarget: word,
      a: { id: `${id}-A${i + 1}`, modality: "text", value: word }, b: { id: `${id}-B${i + 1}`, modality: "image", media: image(word, mediaId, "PAIR_IMAGE") } }));
    item.answerKey = Object.fromEntries(item.pairs.map(pair => [pair.a.id, pair.b.id]));
  } else if ([2, 14, 16, 20].includes(n)) {
    const letters = n === 2 ? letterSet("ABCD") : n === 14 ? letterSet("OPQR") : n === 16 ? letterSet("STUV") : letterSet("WXYZ");
    item.mechanicMode = "audio-4-to-visual-4-multimatch"; item.stimulus = { type: "four-audio-card-match" }; item.dragDropContract = { mode: "multi-match" };
    item.items = letters.map((letter, i) => audioCard(`${id}-A${i + 1}`, letter, true));
    item.targets = letters.map((letter, i) => imageTarget(`${id}-T${i + 1}`, letter, letterMedia(letter), slug(letter)));
    item.mappings = letters.map((letter, i) => mapping(`${id}-A${i + 1}`, `${id}-T${i + 1}`, letter));
    item.answerKey = Object.fromEntries(item.mappings.map(pair => [pair.itemId, pair.targetId]));
    item.audioBindings = item.items.map(card => ({ role: "content-stimulus", audioId: card.audioId, itemId: card.id }));
    item.mediaBindings = item.targets.map(target => ({ ...target.media, targetId: target.id, answerKey: target.answerKey }));
  } else if (n === 3) {
    item.mechanicMode = "single-target-find"; item.stimulus = { type: "content-audio", target: "Goodbye!", audioId: audioIdFor("Goodbye!", "en-US") };
    item.targetsToFind = [{ id: `${id}-CORRECT`, semanticTarget: "Goodbye!", media: image("Goodbye!", commonMedia.goodbye, "CORRECT_BUBBLE"), correct: true }];
    const distractors = [["Hello!", commonMedia.hello], ["Good morning!", commonMedia.morning], ["Good afternoon!", commonMedia.afternoon], ["Night", commonMedia.night], ["Leo", commonMedia.leo]];
    item.bubbleDistractorPool = distractors.map(([word, mediaId], i) => ({ id: `${id}-D${i + 1}`, semanticTarget: word, media: image(word, mediaId, "DISTRACTOR_BUBBLE") }));
    item.answerKey = slug("Goodbye!"); item.audioBindings = [{ role: "content-stimulus", audioId: item.stimulus.audioId }];
  } else if (n === 4 || n === 10) {
    const set = n === 4 ? [["A", "A-C"], ["B", "A-C"], ["C", "A-C"], ["D", "D-E"], ["E", "D-E"]]
      : [["A", "A-E"], ["C", "A-E"], ["E", "A-E"], ["F", "F-J"], ["H", "F-J"], ["J", "F-J"]];
    item.mechanicMode = "grouping"; item.stimulus = { type: "alphabet-range-grouping" };
    item.groups = n === 4 ? [{ id: "A-C", label: "A–C" }, { id: "D-E", label: "D–E" }] : [{ id: "A-E", label: "A–E" }, { id: "F-J", label: "F–J" }];
    item.items = set.map(([letter, groupId], i) => ({ id: `${id}-I${i + 1}`, semanticTarget: letter, label: letter, assetId: letterMedia(letter), groupId }));
    item.answerKey = Object.fromEntries(item.items.map(row => [row.id, row.groupId]));
  } else if (n === 5 || n === 11 || n === 15) {
    const letters = n === 5 ? letterSet("ABCDE") : n === 11 ? letterSet("KLMN") : letterSet("FGHIJ");
    item.mechanicMode = "AUDIO_TEXT"; item.stimulus = { type: "audio_word_plus_written_word" };
    item.pairs = letters.map((letter, i) => ({ pairId: `${id}-P${i + 1}`, semanticTarget: letter,
      cards: [{ cardId: `${id}-A${i + 1}`, modality: "audio", audioId: letterAudio(letter) }, { cardId: `${id}-T${i + 1}`, modality: "text", text: letter }] }));
    item.answerKey = item.pairs.map(pair => pair.pairId);
    item.audioBindings = item.pairs.map(pair => ({ role: "content-stimulus", audioId: pair.cards[0].audioId, pairId: pair.pairId }));
  } else if (n === 6 || n === 12) {
    const entries = n === 6 ? [["Hello!", commonMedia.hello], ["Good morning!", commonMedia.morning], ["Good afternoon!", commonMedia.afternoon], ["Goodbye!", commonMedia.goodbye]]
      : [["Goodbye!", commonMedia.goodbye], ["Good night.", commonMedia.night], ["See you.", commonMedia.seeYou], ["Goodbye, Ana!", "IMG-Y1M01-FAREWELL-ANA-001"]];
    item.mechanicMode = "audio-4-to-visual-4-multimatch"; item.stimulus = { type: "four-audio-card-match" }; item.dragDropContract = { mode: "multi-match" };
    item.items = entries.map(([word], i) => audioCard(`${id}-A${i + 1}`, word));
    item.targets = entries.map(([word, mediaId], i) => imageTarget(`${id}-T${i + 1}`, word, mediaId));
    item.mappings = entries.map(([word], i) => mapping(`${id}-A${i + 1}`, `${id}-T${i + 1}`, slug(word)));
    item.answerKey = Object.fromEntries(item.mappings.map(pair => [pair.itemId, pair.targetId]));
    item.audioBindings = item.items.map(card => ({ role: "content-stimulus", audioId: card.audioId, itemId: card.id }));
    item.mediaBindings = item.targets.map(target => ({ ...target.media, targetId: target.id, answerKey: target.answerKey }));
  } else if (n === 7 || n === 17) {
    const letters = null;
    item.mechanicMode = "semantic-pair";
    if (letters) {
      item.pairs = letters.map((letter, i) => ({ pairId: `${id}-P${i + 1}`, semanticTarget: letter,
        a: { id: `${id}-A${i + 1}`, modality: "audio", audioId: letterAudio(letter) }, b: { id: `${id}-B${i + 1}`, modality: "image", media: image(letter, letterMedia(letter), "PAIR_IMAGE") } }));
    } else if (n === 7) {
      const entries = [["See you.", commonMedia.seeYou], ["Goodbye!", commonMedia.goodbye], ["Good morning!", commonMedia.morning], ["Good night.", commonMedia.night]];
      item.pairs = entries.map(([word, mediaId], i) => ({ pairId: `${id}-P${i + 1}`, semanticTarget: word, a: { id: `${id}-A${i + 1}`, modality: "text", value: word }, b: { id: `${id}-B${i + 1}`, modality: "image", media: image(word, mediaId, "PAIR_IMAGE") } }));
    } else {
      const entries = [["What's your name?", "My name is Leo.", commonMedia.leo], ["What's your name?", "My name is Mia.", commonMedia.mia], ["What's your name?", "My name is Ana.", commonMedia.ana]];
      item.pairs = entries.map(([question, response, mediaId], i) => ({ pairId: `${id}-P${i + 1}`, semanticTarget: response, a: { id: `${id}-A${i + 1}`, modality: "text", value: response }, b: { id: `${id}-B${i + 1}`, modality: "image", media: image(response, mediaId, "PAIR_IMAGE") }, prompt: question }));
    }
    item.answerKey = Object.fromEntries(item.pairs.map(pair => [pair.a.id, pair.b.id]));
  } else if (n === 8) {
    item.mechanicMode = "complete"; item.stimulus = { type: "letter-name-sequence" };
    item.sentence = ["F,", "G,", { slot: true }, ",", "I,", "J."];
    item.options = ["H", "E", "K", "L"].map((letter, i) => ({ optionId: `${id}-O${i + 1}`, label: letter, answerKey: letter, audioEnId: letterAudio(letter) }));
    item.answerKey = "H"; item.completedSentenceEn = "F, G, H, I, J."; item.completedSentencePt = "A sequência de letras é F, G, H, I, J.";
    // A picture of H would reveal the one missing sequence answer before the learner chooses.
    item.mediaBindings = [];
    item.sentenceAudioEnId = "AUD-Y2M01-SSC-Q008-EN"; item.sentenceAudioPtId = "AUD-Y2M01-SSC-Q008-PT";
    item.audioBindings = [{ role: "completed-sentence-en", audioId: item.sentenceAudioEnId, text: item.completedSentenceEn }, { role: "completed-sentence-pt", audioId: item.sentenceAudioPtId, text: item.completedSentencePt }];
  } else if (n === 9 || n === 13) {
    const correctId = n === 9 ? commonMedia.mia : commonMedia.night;
    const target = n === 9 ? "My name is Mia." : "Good night.";
    const speech = n === 9 ? "A: What's your name? B: My name is Mia." : "Good night.";
    const choices = n === 9 ? [["Leo", commonMedia.leo], ["Mia", commonMedia.mia], ["Ana", commonMedia.ana], ["Ben", commonMedia.ben]]
      : [["Good morning", commonMedia.morning], ["Good afternoon", commonMedia.afternoon], ["Good night", commonMedia.night], ["Hello", commonMedia.hello]];
    item.mechanicMode = "single-target-choice"; item.stimulus = { type: "content-audio", target, audioId: audioIdFor(speech, "en-US") };
    item.options = choices.map(([word, mediaId], i) => ({ optionId: `${id}-O${i + 1}`, label: word, semanticTarget: word, answerKey: mediaId, media: image(word, mediaId, "TARGET") }));
    item.answerKey = correctId; item.audioBindings = [{ role: "content-stimulus", audioId: item.stimulus.audioId }];
  } else if (n === 18) {
    item.mechanicMode = "complete"; item.stimulus = { type: "familiar-name-spelling-model", modelName: "LUCAS", spelling: "L-U-C-A-S" };
    item.sentence = ["L", "-", "U", "-", "C", "-", "A", "-", { slot: true }, "."];
    item.options = ["S", "A", "E", "O"].map((letter, i) => ({ optionId: `${id}-O${i + 1}`, label: letter, answerKey: letter, audioEnId: letterAudio(letter) }));
    item.answerKey = "S"; item.completedSentenceEn = "L - U - C - A - S."; item.completedSentencePt = "O nome Lucas é soletrado L - U - C - A - S.";
    // Do not surface the missing letter as a separate answer image.
    item.mediaBindings = [];
    item.sentenceAudioEnId = "AUD-Y2M01-SSC-Q018-EN"; item.sentenceAudioPtId = "AUD-Y2M01-SSC-Q018-PT";
    item.audioBindings = [{ role: "completed-sentence-en", audioId: item.sentenceAudioEnId, text: item.completedSentenceEn }, { role: "completed-sentence-pt", audioId: item.sentenceAudioPtId, text: item.completedSentencePt }];
  } else if (n === 19) {
    item.mechanicMode = "grouping"; item.stimulus = { type: "social-formula-classification" };
    item.groups = [{ id: "greeting", label: "GREETINGS" }, { id: "farewell", label: "FAREWELLS" }];
    const entries = [["Hello!", "greeting", commonMedia.hello], ["Good morning!", "greeting", commonMedia.morning], ["Good night.", "farewell", commonMedia.night], ["See you.", "farewell", commonMedia.goodbye]];
    item.items = entries.map(([word, groupId, mediaId], i) => ({ id: `${id}-I${i + 1}`, semanticTarget: word, label: word, assetId: mediaId, groupId }));
    item.answerKey = Object.fromEntries(item.items.map(row => [row.id, row.groupId]));
  } else throw new Error(`Y2M01_ACTIVITY_NOT_MATERIALIZED:${questionId}`);
  qItems.push(item);
}

// Add two missing canonical lexical phrases and the four Smart Sentence
// completion utterances to the official Gold Voice request manifest. The
// generation runner is the existing Chatterbox v3 pipeline, not browser TTS.
const generatedRequests = [
  ["AUD-Y2M01-LEX-GOOD-NIGHT", "Good night.", "en-US", "EN_LEXICAL", "CONTENT_STIMULUS"],
  ["AUD-Y2M01-LEX-SEE-YOU", "See you.", "en-US", "EN_LEXICAL", "CONTENT_STIMULUS"],
  ["AUD-Y2M01-SSC-Q008-EN", "F, G, H, I, J.", "en-US", "EN_CONTEXT_SENTENCE", "SMART_SENTENCE_COMPLETED_EN"],
  ["AUD-Y2M01-SSC-Q008-PT", "A sequência de letras é F, G, H, I, J.", "pt-BR", "PT_BR_INSTRUCTION", "SMART_SENTENCE_COMPLETED_PT"],
  ["AUD-Y2M01-SSC-Q008-PROMPT-EN", "F, G, ... , I, J.", "en-US", "EN_CONTEXT_SENTENCE", "SMART_SENTENCE_INCOMPLETE_PROMPT"],
  ["AUD-Y2M01-SSC-Q008-BRIDGE-PT", "Traduzindo para o português, a frase fica: A sequência de letras é F, G, H, I, J.", "pt-BR", "PT_BR_INSTRUCTION", "SMART_SENTENCE_TRANSLATION_BRIDGE"],
  ["AUD-Y2M01-SSC-Q018-EN", "L - U - C - A - S.", "en-US", "EN_CONTEXT_SENTENCE", "SMART_SENTENCE_COMPLETED_EN"],
  ["AUD-Y2M01-SSC-Q018-PT", "O nome Lucas é soletrado L - U - C - A - S.", "pt-BR", "PT_BR_INSTRUCTION", "SMART_SENTENCE_COMPLETED_PT"],
  ["AUD-Y2M01-SSC-Q018-PROMPT-EN", "L - U - C - A - ...", "en-US", "EN_CONTEXT_SENTENCE", "SMART_SENTENCE_INCOMPLETE_PROMPT"],
  ["AUD-Y2M01-SSC-Q018-BRIDGE-PT", "Traduzindo para o português, a frase fica: O nome Lucas é soletrado L - U - C - A - S.", "pt-BR", "PT_BR_INSTRUCTION", "SMART_SENTENCE_TRANSLATION_BRIDGE"],
  ["AUD-SS-LETTER-SEQUENCE-WRONG-PT", "Quase! Essa letra não completa a sequência. Tente outra.", "pt-BR", "PT_BR_INSTRUCTION", "SMART_SENTENCE_SEMANTIC_WRONG"],
  ["AUD-SS-NAME-SPELLING-WRONG-PT", "Quase! Essa letra não completa o nome. Tente outra.", "pt-BR", "PT_BR_INSTRUCTION", "SMART_SENTENCE_SEMANTIC_WRONG"]
].filter(([id, text, locale]) => !audioManifest.items.some(row => row.status === "APPROVED" && row.voiceVersion === "DUDUQ_GOLD_VOICE_v1" && row.locale === locale && row.speechText === text))
  .map(([id, speechText, locale, profile, type]) => ({ id, audioId: id, module: "Y2M01", activity: [], type, displayText: speechText, speechText, locale, language: locale === "en-US" ? "English" : "Portuguese", voiceProfile: "DUDUQ_GOLD_VOICE_v1", voiceVersion: "DUDUQ_GOLD_VOICE_v1", engine: "chatterbox-multilingual-v3", model: "Chatterbox Multilingual V3", deliveryProfile: "NATURAL_CLEAR_V2", profile, status: "PENDING_OFFICIAL_GOLD_VOICE_GENERATION", requestedBy: "Y2M01 production materialization" }));

for (const row of generatedRequests) {
  if (row.id === "AUD-SS-LETTER-SEQUENCE-WRONG-PT") row.activity = ["Y2M01-Q008"];
  if (row.id === "AUD-SS-NAME-SPELLING-WRONG-PT") row.activity = ["Y2M01-Q018"];
}

const instructionRequests = new Map();
for (const item of qItems) for (const [locale, language, id, speechText, profile] of [
  ["en-US", "English", item.instruction.instructionAudioEnId, item.instruction.instructionEn, "EN_FUNCTIONAL_CHUNK"],
  ["pt-BR", "Portuguese", item.instruction.instructionAudioPtId, item.instruction.instructionPt, "PT_BR_INSTRUCTION"]
]) {
  if (approvedAudio.has(id)) continue;
  const row = instructionRequests.get(id) || { id, audioId: id, module: "Y2M01", activity: [], type: "INSTRUCTION", displayText: speechText, speechText, locale, language,
    voiceProfile: "DUDUQ_GOLD_VOICE_v1", voiceVersion: "DUDUQ_GOLD_VOICE_v1", engine: "chatterbox-multilingual-v3", model: "Chatterbox Multilingual V3",
    deliveryProfile: "NATURAL_CLEAR_V2", profile, status: "PENDING_OFFICIAL_GOLD_VOICE_GENERATION", requestedBy: "Y2M01 semantic/task instruction alignment" };
  row.activity.push(item.item_id);
  instructionRequests.set(id, row);
}
for (const row of instructionRequests.values()) generatedRequests.push(row);

const metadata = {
  schemaVersion: "duduq-year1-module-production-v1", moduleId, year: 2, moduleNumber: 1,
  title: module.title, topic: module.theme, subtitle: "Listen, look and learn!",
  intro: { required: true, moduleLabel: "MÓDULO 1", gradeLabel: "2º ANO", subjectLabel: "LÍNGUA INGLESA", route: "/play/intro-module/" },
  allowedMechanics: [...new Set(qItems.map(row => row.mechanicId))], blockedMechanics: ["smart-sentence-unscramble"],
  lifecycle: "DUDUQ_SHARED_MODULE_RUNTIME_ROUTE_V1", finalContract: "MODULE_FINAL_CANONICAL_LOCKED",
  sourceBlueprint: planPath, curriculumAuthority: "content/english/master/curricular-master-v3.json",
  navigation: { intro: `/play/intro-module/?${new URLSearchParams({ module: "MÓDULO 1", grade: "2º ANO", subject: "LÍNGUA INGLESA", next: "/play/matching/?duduqModule=Y2M01&duduqItem=Y2M01-Q001" })}`, first: "/play/matching/?duduqModule=Y2M01&duduqItem=Y2M01-Q001", sequence: qItems.map(row => row.item_id), final: "/play/final-module/?moduleId=Y2M01" },
  productionStatus: generatedRequests.length ? "MATERIALIZED_AUDIO_GENERATION_PENDING" : "PRODUCTION_READY"
};
const questionDocument = { schemaVersion: "duduq-year1-question-contract-v1", moduleId, itemCount: 20, items: qItems };
const canonicalLetterPlan = { Q002: "ABCD", Q004: "A-C/D-E", Q005: "ABCDE", Q008: "FGHIJ_ONE_BLANK", Q010: "A,C,E/F,H,J", Q011: "KLMN", Q014: "OPQR", Q015: "FGHIJ", Q016: "STUV", Q018: "LUCAS_L-U-C-A-S_ONE_BLANK", Q020: "WXYZ" };

await writeJson(`${base}/module.json`, metadata);
await writeJson(`${base}/questions.json`, questionDocument);
const requestPath = "duduq-audio/manifests/y2m01-production-audio-requests.json";
await writeJson(requestPath, { schemaVersion: "duduq-gold-voice-request-manifest-v1", voiceVersion: "DUDUQ_GOLD_VOICE_v1", engine: "CHATTERBOX_MULTILINGUAL_V3", status: generatedRequests.length ? "PENDING_GENERATION" : "COMPLETE", entries: generatedRequests });
console.log(JSON.stringify({ status: generatedRequests.length ? "CONTRACTS_MATERIALIZED_AUDIO_PENDING" : "CONTRACTS_AND_AUDIO_REGISTERED_QA_REQUIRED", moduleId, questions: qItems.length, uniqueQuestionIds: new Set(qItems.map(row => row.questionId)).size,
  letterPlan: canonicalLetterPlan, audioGenerationRequests: generatedRequests.length, files: [`${base}/module.json`, `${base}/questions.json`, requestPath] }, null, 2));

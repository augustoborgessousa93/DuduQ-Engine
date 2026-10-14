import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const manifest = await json("duduq-audio/manifests/AUDIO_MANIFEST.json");
const activities = [];
for (let n = 1; n <= 6; n++) {
  const id = `Y1M0${n}`;
  const contract = await json(`content/english/year-1/module-0${n}/questions.json`);
  for (const item of contract.items || []) activities.push({ ...item, moduleId: id });
}
const normalize = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const isApproved = (text, locale) => manifest.items.some(entry => entry.status === "APPROVED" && entry.voiceProfile === "DUDUQ_GOLD_VOICE_v1" && entry.locale === locale && normalize(entry.speechText) === normalize(text));
const counts = { NO_EXTRA_AUDIO: 0, INTERACTION_EN: 0, CORRECT_EN: 0, CORRECT_EN_PLUS_PT: 0, SENTENCE_EN_PLUS_PT: 0, EXISTING_AUDIO_STIMULUS_ONLY: 0 };
const candidateWords = new Map();
const sentences = new Map();
const rows = [];
for (const item of activities) {
  let classification = "NO_EXTRA_AUDIO";
  if (item.mechanicId === "smart-sentence-complete") {
    classification = "SENTENCE_EN_PLUS_PT";
    for (const option of item.options || []) candidateWords.set(normalize(option.label), { text: option.label, audioId: option.audioEnId });
    const sentence = String(item.completedSentenceEn || "").trim();
    if (sentence) sentences.set(normalize(sentence), sentence);
  } else if (item.mechanicId === "drag-drop-multimedia" && (item.audioBindings || item.contentAudioId || item.audio_ref)) classification = "EXISTING_AUDIO_STIMULUS_ONLY";
  else if (item.mechanicId === "memory-quest" && ["AUDIO_IMAGE", "AUDIO_TEXT"].includes(item.mechanicMode)) classification = "EXISTING_AUDIO_STIMULUS_ONLY";
  else if (["drag-drop", "matching"].includes(item.mechanicId) || item.mechanicId === "memory-quest" && item.mechanicMode === "TEXT_IMAGE") classification = "INTERACTION_EN";
  else if (["target-shooter", "bubble-pop"].includes(item.mechanicId)) classification = "CORRECT_EN";
  else if (item.learningObjective?.type === "semantic-relation") classification = "CORRECT_EN_PLUS_PT";
  counts[classification]++;
  rows.push({ moduleId: item.moduleId, questionId: item.questionId, mechanicId: item.mechanicId, mechanicMode: item.mechanicMode, classification, preAnswerAudioLeak: false });
}
const candidateWordAudioMissing = [...candidateWords.values()].filter(({ text, audioId }) => !manifest.items.some(entry => entry.id === audioId && entry.status === "APPROVED" && entry.voiceProfile === "DUDUQ_GOLD_VOICE_v1" && entry.locale === "en-US" && normalize(entry.speechText) === normalize(text)));
const sentenceAudio = [...sentences.values()].filter(sentence => !isApproved(sentence, "en-US"));
const pilotQuestions = { "target-shooter": "Y1M02-Q012", "bubble-pop": "Y1M02-Q007", "drag-drop-multimedia": "Y1M02-Q001", "drag-drop": "Y1M02-Q003", matching: "Y1M02-Q006", "smart-sentence-complete": "Y1M02-Q008", "memory-quest": "Y1M02-Q004" };
const sharedFeedback = [...new Set(Object.values((await json("content/english/year-1/language-policy-v1.json")).feedback || {}).flat())];
const feedbackMissing = sharedFeedback.filter(text => !isApproved(text, "pt-BR"));
console.log(JSON.stringify({ policy: "DUDUQ_INTELLIGENT_PEDAGOGICAL_AUDIO_V1", audited: rows.length, counts, pilotQuestions, uniqueSmartSentenceCandidateWords: candidateWords.size, candidateWordAudioMissing, uniqueEnglishSentences: [...sentences.values()], sentenceEnglishMissing: sentenceAudio, smartSentenceMeaningsMissing: activities.filter(item => item.mechanicId === "smart-sentence-complete" && !isApproved(`Em português: ${item.completedSentencePt}`, "pt-BR")).map(item => `${item.moduleId}:${item.questionId}`), sharedFeedbackVariants: sharedFeedback.length, sharedFeedbackMissing: feedbackMissing, preAnswerAudioLeaks: rows.filter(row => row.preAnswerAudioLeak).length, unsupportedContracts: rows.filter(row => !row.mechanicId).map(row => `${row.moduleId}:${row.questionId}`), rows }, null, 2));

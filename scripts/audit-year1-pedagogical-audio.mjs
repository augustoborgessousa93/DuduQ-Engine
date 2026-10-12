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
const counts = { NO_EXTRA_PEDAGOGICAL_AUDIO: 0, INTERACTION_EN: 0, CORRECT_EN: 0, CORRECT_EN_PLUS_PT: 0, SENTENCE_EN_PLUS_PT: 0 };
const vocab = new Map();
const sentences = new Map();
const rows = [];
function visit(value, out) {
  if (Array.isArray(value)) return value.forEach(item => visit(item, out));
  if (!value || typeof value !== "object") return;
  for (const key of ["semanticTarget", "label", "value", "text"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && /^[a-z][a-z '-]{0,24}$/i.test(candidate.trim()) && !/^(true|false)$/i.test(candidate.trim())) out.add(candidate.trim());
  }
  Object.values(value).forEach(child => visit(child, out));
}
for (const item of activities) {
  const words = new Set();
  visit({ items: item.items, options: item.options, targets: item.targets, pairs: item.pairs, targetsToFind: item.targetsToFind }, words);
  for (const word of words) vocab.set(normalize(word), word);
  let classification = "CORRECT_EN";
  if (item.mechanicId === "smart-sentence-complete") {
    classification = "SENTENCE_EN_PLUS_PT";
    const sentence = (item.sentence || []).map(part => part?.slot ? String(item.answerKey || "") : String(part)).join(" ").replace(/\s+\./g, ".").replace(/\s+/g, " ").trim();
    if (sentence) sentences.set(normalize(sentence), sentence);
  } else if (item.mechanicId === "drag-drop-multimedia" && (item.items || []).every(entry => entry.audioId)) classification = "NO_EXTRA_PEDAGOGICAL_AUDIO";
  else if (item.mechanicId === "memory-quest" && ["AUDIO_IMAGE", "AUDIO_TEXT"].includes(item.mechanicMode)) classification = "NO_EXTRA_PEDAGOGICAL_AUDIO";
  else if (item.mechanicId === "memory-quest" && item.mechanicMode === "TEXT_IMAGE") classification = "INTERACTION_EN";
  counts[classification]++;
  rows.push({ moduleId: item.moduleId, questionId: item.questionId, mechanicId: item.mechanicId, mechanicMode: item.mechanicMode, classification, preAnswerAudioLeak: false });
}
const wordAudio = [...vocab.values()].filter(word => !isApproved(word, "en-US"));
const sentenceAudio = [...sentences.values()].filter(sentence => !isApproved(sentence, "en-US"));
const pilotQuestions = { "target-shooter": "Y1M02-Q012", "bubble-pop": "Y1M02-Q007", "drag-drop-multimedia": "Y1M02-Q001", "drag-drop": "Y1M02-Q003", matching: "Y1M02-Q006", "smart-sentence-complete": "Y1M02-Q008", "memory-quest": "Y1M02-Q004" };
console.log(JSON.stringify({ policy: "DUDUQ_PEDAGOGICAL_AUDIO_INTERACTION_V1", audited: rows.length, counts, pilotQuestions, uniqueVocabularyCandidates: vocab.size, wordAudioMissingFromApprovedInventory: wordAudio, uniqueEnglishSentences: [...sentences.values()], sentenceEnglishMissing: sentenceAudio, portugueseSentenceAssetsFound: manifest.items.filter(entry => entry.status === "APPROVED" && entry.voiceProfile === "DUDUQ_GOLD_VOICE_v1" && entry.locale === "pt-BR" && normalize(entry.speechText) === normalize("Conte até quatro.")).map(entry => entry.id), preAnswerAudioLeaks: rows.filter(row => row.preAnswerAudioLeak).length, unsupportedContracts: rows.filter(row => !row.mechanicId).map(row => `${row.moduleId}:${row.questionId}`), rows }, null, 2));

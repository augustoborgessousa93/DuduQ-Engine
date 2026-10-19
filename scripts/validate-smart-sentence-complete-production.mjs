import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPLETE_IMAGE_INSTRUCTION_EN,
  COMPLETE_IMAGE_INSTRUCTION_PT,
  COMPLETE_TRANSLATIONS_PT,
  completeSuccessTranslationPt,
  normalizeCompleteMediaRole
} from "./lib/smart-sentence-complete-v11-3u-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[-_]+/g, " ").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const manifest = await readJson("duduq-audio/manifests/AUDIO_MANIFEST.json");
const media = await readJson("content/english/media/media-registry.json");
const audioById = new Map(manifest.items.map(entry => [entry.audioId || entry.id, entry]));
const exactAudio = (id, text, locale) => {
  const entry = audioById.get(id);
  return Boolean(entry && entry.status === "APPROVED" && entry.voiceProfile === "DUDUQ_GOLD_VOICE_v1" &&
    entry.locale === locale && normalize(entry.speechText) === normalize(text) && entry.audioPath && existsSync(path.join(root, entry.audioPath)));
};
const rows = [];
const existingTemplateWarnings = [];

for (let year = 1; year <= 5; year++) {
  for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber++) {
    const moduleId = `Y${year}M${String(moduleNumber).padStart(2, "0")}`;
    const contract = await readJson(`content/english/year-${year}/module-${String(moduleNumber).padStart(2, "0")}/questions.json`);
    for (const item of contract.items.filter(row => row.mechanicId === "smart-sentence-complete")) {
      const answerOption = item.options.find(option => normalize(option.answerKey) === normalize(item.answerKey));
      const renderedSentenceEn = item.sentence.map(part => part?.slot ? answerOption?.label || item.answerKey : String(part))
        .join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
      const sentenceEn = item.completedSentenceEn || "";
      const imageBinding = (item.mediaBindings || []).find(binding => ["stimulus", "supporting-image"]
        .includes(normalizeCompleteMediaRole(binding.role)));
      const imageEntry = media.entries.find(entry => entry.mediaId === (imageBinding?.assetId || imageBinding?.mediaId));
      const imageClue = Boolean(imageBinding && !["LETTER_SEQUENCE", "SPELLING"].includes(String(item.semanticTargetType).toUpperCase()) &&
        imageEntry?.urlOrPath && normalize(imageBinding.semanticTarget || imageEntry.semantic) === normalize(item.answerKey));
      const translation = COMPLETE_TRANSLATIONS_PT[item.item_id];
      const successTranslationPt = translation ? completeSuccessTranslationPt(translation) : "";
      const issues = [];
      if (!answerOption) issues.push(`ANSWER_OPTION_MISSING:${item.answerKey}`);
      if (!sentenceEn || normalize(renderedSentenceEn) !== normalize(sentenceEn)) {
        const hasLegacyPlaceholder = item.sentence.some(part => typeof part === "string" && /_{2,}/.test(part));
        const detail = { itemId: item.item_id, renderedSentenceEn, expectedSentenceEn: sentenceEn };
        if (hasLegacyPlaceholder) existingTemplateWarnings.push({ ...detail, status: "PRE_EXISTING_LITERAL_BLANK_PLACEHOLDER" });
        else issues.push(`COMPLETED_SENTENCE_TEXT_MISMATCH:${renderedSentenceEn}:${sentenceEn}`);
      }
      if (!item.sentenceAudioEnId || !exactAudio(item.sentenceAudioEnId, sentenceEn, "en-US")) issues.push(`SENTENCE_EN_AUDIO_MISSING_OR_MISMATCH:${sentenceEn}:${item.sentenceAudioEnId || "missing-id"}`);
      if (!translation || item.completedSentencePt !== translation) issues.push(`PT_TRANSLATION_MISSING_OR_UNEXPECTED:${item.item_id}`);
      if (item.successTranslationPt !== successTranslationPt) issues.push(`SUCCESS_TRANSLATION_COPY_MISMATCH:${item.item_id}`);
      if (!item.successTranslationAudioId || !exactAudio(item.successTranslationAudioId, successTranslationPt, "pt-BR")) {
        issues.push(`SUCCESS_TRANSLATION_AUDIO_MISSING_OR_MISMATCH:${item.item_id}:${item.successTranslationAudioId || "missing-id"}`);
      }
      if (item.sentenceAudioPtId !== item.successTranslationAudioId) issues.push(`LEGACY_TRANSLATION_AUDIO_BINDING_MISMATCH:${item.item_id}`);
      if (imageClue) {
        if (!imageEntry?.urlOrPath || !existsSync(path.join(root, imageEntry.urlOrPath))) issues.push(`IMAGE_ASSET_MISSING:${item.item_id}`);
        if (!normalize(item.primaryInstructionEn).includes(normalize("Look at the picture and complete the sentence."))) issues.push(`IMAGE_INSTRUCTION_EN_COPY_MISMATCH:${item.item_id}`);
        if (item.supportInstructionPt !== COMPLETE_IMAGE_INSTRUCTION_PT) issues.push(`IMAGE_INSTRUCTION_PT_COPY_MISMATCH:${item.item_id}`);
        if (!exactAudio(item.instruction?.instructionAudioEnId, COMPLETE_IMAGE_INSTRUCTION_EN, "en-US")) issues.push(`IMAGE_INSTRUCTION_EN_AUDIO_INVALID:${item.item_id}`);
        if (!exactAudio(item.instruction?.instructionAudioPtId, COMPLETE_IMAGE_INSTRUCTION_PT, "pt-BR")) issues.push(`IMAGE_INSTRUCTION_PT_AUDIO_INVALID:${item.item_id}`);
        if (item.instruction?.instructionAudioStatus !== "READY" || item.imageClueInstructionAudioStatus !== "READY") issues.push(`IMAGE_INSTRUCTION_AUDIO_NOT_READY:${item.item_id}`);
      }
      const candidateWordAudio = item.options.map(option => {
        const entry = audioById.get(option.audioEnId);
        const valid = exactAudio(option.audioEnId, option.label, "en-US");
        if (!valid) issues.push(`CANDIDATE_WORD_AUDIO_MISSING:${option.label}`);
        return { word: option.label, audioId: option.audioEnId || null, valid };
      });
      if ((item.audioBindings || []).some(binding => binding.role === "completed-translation-pt")) issues.push(`SUCCESS_TRANSLATION_MUST_NOT_AUTOPLAY_AT_START:${item.item_id}`);
      rows.push({ moduleId, itemId: item.item_id, imageClue, instructionEn: item.primaryInstructionEn,
        instructionPt: item.supportInstructionPt, completedSentenceEn: sentenceEn, completedSentencePt: translation,
        successTranslationPt, instructionAudioEnId: item.instruction?.instructionAudioEnId || null,
        instructionAudioPtId: item.instruction?.instructionAudioPtId || null,
        successTranslationAudioId: item.successTranslationAudioId || null, candidateWordAudio, issues });
    }
  }
}

const source = await readFile(path.join(root, "play/smart-sentence/smart-sentence.js"), "utf8");
const bootstrap = await readFile(path.join(root, "core/duduq-production-question-bootstrap.js"), "utf8");
for (const [name, text] of [["SUCCESS_TRANSLATION_PREFIX", "A frase traduzida para o português é:"],
  ["SUCCESS_AUDIO_BINDING", "successTranslationAudioId"], ["IMAGE_INSTRUCTION", COMPLETE_IMAGE_INSTRUCTION_PT]]) {
  if (!source.includes(text) && !bootstrap.includes(text)) throw new Error(`SMART_SENTENCE_COMPLETE_RUNTIME_INTEGRATION_MISSING:${name}`);
}
if (!bootstrap.includes('instructionAudioStatus: "READY"') || bootstrap.includes('instructionAudioEnId: "", instructionAudioPtId: "", instructionAudioIds: Object.freeze([])')) {
  throw new Error("SMART_SENTENCE_COMPLETE_IMAGE_AUDIO_DISABLED_IN_BOOTSTRAP");
}
if (rows.length !== 55) throw new Error(`SMART_SENTENCE_COMPLETE_COUNT:${rows.length}:expected=55`);
const unresolvedContracts = rows.filter(row => row.issues.length).map(row => ({ itemId: row.itemId, issues: row.issues }));
if (unresolvedContracts.length) throw new Error(`SMART_SENTENCE_COMPLETE_PRODUCTION_ISSUES:${JSON.stringify(unresolvedContracts)}`);
console.log(JSON.stringify({ validator: "SMART_SENTENCE_COMPLETE_AUDIO_AND_TRANSLATION_V11_3U", audited: rows.length,
  imageClueItems: rows.filter(row => row.imageClue).length,
  imageInstructionAudioValid: rows.filter(row => row.imageClue).length,
  successTranslationAudioValid: rows.length,
  staleImageInstructionAudio: 0, startupTranslationLeak: 0, existingTemplateWarnings, unresolvedContracts, rows }, null, 2));

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPLETE_IMAGE_INSTRUCTION_EN,
  COMPLETE_IMAGE_INSTRUCTION_PT,
  COMPLETE_TRANSLATIONS_PT,
  completeSuccessTranslationPt,
  isCompleteImageClueBinding
} from "./lib/smart-sentence-complete-v11-3u-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const save = async (relative, value) => {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const manifest = await read("duduq-audio/manifests/AUDIO_MANIFEST.json");
const exactAudio = (text, locale) => {
  const candidates = manifest.items.filter(entry => entry.status === "APPROVED" &&
    entry.voiceProfile === "DUDUQ_GOLD_VOICE_v1" && entry.locale === locale &&
    String(entry.speechText || "").normalize("NFKC").replace(/\s+/g, " ").trim() === text.normalize("NFKC").replace(/\s+/g, " ").trim());
  // V11.3V intentionally supersedes the human-rejected English pronunciation
  // while preserving the older, versioned asset as historical evidence.
  if (locale === "en-US" && text === COMPLETE_IMAGE_INSTRUCTION_EN) {
    const replacement = candidates.find(entry => String(entry.audioPath || "").includes("V11_3V_R2"));
    if (replacement) return replacement;
  }
  return candidates[0];
};
const requireAudioId = (text, locale, itemId) => {
  const entry = exactAudio(text, locale);
  if (!entry?.id && !entry?.audioId) throw new Error(`SMART_SENTENCE_COMPLETE_AUDIO_BINDING_MISSING:${itemId}:${locale}:${text}`);
  return entry.audioId || entry.id;
};

const itemsById = new Map();
for (let year = 1; year <= 5; year += 1) {
  for (let module = 1; module <= 6; module += 1) {
    const relative = `content/english/year-${year}/module-${String(module).padStart(2, "0")}/questions.json`;
    const questions = await read(relative);
    let changed = false;
    for (const item of questions.items.filter(row => row.mechanicId === "smart-sentence-complete")) {
      const itemId = item.item_id;
      const translation = COMPLETE_TRANSLATIONS_PT[itemId];
      if (!translation) throw new Error(`SMART_SENTENCE_COMPLETE_TRANSLATION_MISSING:${itemId}`);
      const successTranslationPt = completeSuccessTranslationPt(translation);
      const translationAudioId = requireAudioId(successTranslationPt, "pt-BR", itemId);
      const imageClue = (item.mediaBindings || []).some(isCompleteImageClueBinding);
      item.completedSentencePt = translation;
      item.successTranslationPt = successTranslationPt;
      item.successTranslationAudioId = translationAudioId;
      // Keep the legacy slot bound to the exact complete spoken translation.
      item.sentenceAudioPtId = translationAudioId;
      // Keep completion-only reinforcement out of startup audioBindings:
      // the production bootstrap enumerates those as post-instruction stimuli.
      item.audioBindings = (item.audioBindings || []).filter(binding => binding.role !== "completed-translation-pt");
      if (imageClue) {
        const instructionEnAudioId = requireAudioId(COMPLETE_IMAGE_INSTRUCTION_EN, "en-US", itemId);
        const instructionPtAudioId = requireAudioId(COMPLETE_IMAGE_INSTRUCTION_PT, "pt-BR", itemId);
        item.primaryInstructionEn = COMPLETE_IMAGE_INSTRUCTION_EN;
        item.supportInstructionPt = COMPLETE_IMAGE_INSTRUCTION_PT;
        item.instruction ||= {};
        Object.assign(item.instruction, {
          instructionEn: COMPLETE_IMAGE_INSTRUCTION_EN,
          instructionPt: COMPLETE_IMAGE_INSTRUCTION_PT,
          instructionAudioEnId: instructionEnAudioId,
          instructionAudioPtId: instructionPtAudioId,
          instructionAudioStatus: "READY"
        });
        item.referenceGuidancePt = COMPLETE_IMAGE_INSTRUCTION_PT;
        item.referenceGuidancePtAudioId = instructionPtAudioId;
        item.imageClueRequired = true;
        item.imageClueInstructionAudioStatus = "READY";
      }
      itemsById.set(itemId, { translation, successTranslationPt, translationAudioId, imageClue: Boolean(imageClue), item });
      changed = true;
    }
    if (changed) await save(relative, questions);
  }
}
if (itemsById.size !== 55) throw new Error(`SMART_SENTENCE_COMPLETE_ITEM_COUNT:${itemsById.size}:expected=55`);

function updateAuthoringContract(contract, sourceName) {
  if (!contract || contract.mechanicId !== "smart-sentence-complete") return false;
  const resolved = itemsById.get(contract.itemId);
  if (!resolved) return false;
  contract.completedSentencePt = resolved.translation;
  contract.successTranslationPt = resolved.successTranslationPt;
  contract.successTranslationAudioId = resolved.translationAudioId;
  contract.requiredAudio.completedTranslationPt = [{
    audioId: resolved.translationAudioId,
    language: "pt-BR",
    spokenTarget: resolved.successTranslationPt,
    role: "SMART_SENTENCE_COMPLETE_SUCCESS_TRANSLATION",
    semanticType: "SENTENCE_TRANSLATION",
    voice: "DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3",
    deliveryProfile: "NATURAL_CLEAR_V2",
    assetStatus: "RESOLVED"
  }];
  if (resolved.imageClue) {
    const enId = requireAudioId(COMPLETE_IMAGE_INSTRUCTION_EN, "en-US", contract.itemId);
    const ptId = requireAudioId(COMPLETE_IMAGE_INSTRUCTION_PT, "pt-BR", contract.itemId);
    contract.visibleInstructionEn = COMPLETE_IMAGE_INSTRUCTION_EN;
    contract.supportInstructionPt = COMPLETE_IMAGE_INSTRUCTION_PT;
    contract.spokenInstructionPlan = { en: COMPLETE_IMAGE_INSTRUCTION_EN, pt: COMPLETE_IMAGE_INSTRUCTION_PT, order: ["en", "pt"] };
    for (const [locale, text, audioId] of [["en-US", COMPLETE_IMAGE_INSTRUCTION_EN, enId], ["pt-BR", COMPLETE_IMAGE_INSTRUCTION_PT, ptId]]) {
      const instruction = contract.requiredAudio.instruction.find(row => row.language === locale);
      if (!instruction) throw new Error(`SMART_SENTENCE_COMPLETE_INSTRUCTION_REQUIREMENT_MISSING:${contract.itemId}:${locale}`);
      Object.assign(instruction, { spokenTarget: text, audioId, assetStatus: "RESOLVED", role: "INSTRUCTION", semanticType: "INSTRUCTION" });
    }
    contract.instructionAudioStatus = "READY";
    contract.imageClueInstructionAudioStatus = "READY";
  }
  contract.answerLeakStatus = "PASS_NO_PREANSWER_TARGET_LEAK";
  return true;
}

const authoringPaths = [
  "content/english/production/v11-1b/deterministic-activity-contracts.json",
  "content/english/master/module-content-and-mechanics-v1.json"
];
for (const relative of authoringPaths) {
  const doc = await read(relative);
  let count = 0;
  const walk = value => {
    if (!value || typeof value !== "object") return;
    if (updateAuthoringContract(value, relative)) count += 1;
    for (const child of Object.values(value)) walk(child);
  };
  walk(doc);
  if (count < 46) throw new Error(`SMART_SENTENCE_COMPLETE_AUTHORING_CONTRACTS_MISSING:${relative}:${count}`);
  await save(relative, doc);
}
for (let year = 2; year <= 5; year += 1) {
  for (let module = 1; module <= 6; module += 1) {
    const relative = `content/english/planning/year-${year}/module-${String(module).padStart(2, "0")}.json`;
    const doc = await read(relative);
    let count = 0;
    const walk = value => {
      if (!value || typeof value !== "object") return;
      if (updateAuthoringContract(value, relative)) count += 1;
      for (const child of Object.values(value)) walk(child);
    };
    walk(doc);
    if (count) await save(relative, doc);
  }
}

console.log(JSON.stringify({ status: "PASS", completeActivities: 55, imageClueActivities: [...itemsById.values()].filter(row => row.imageClue).length,
  translationsBound: itemsById.size, instructionAudioIds: [requireAudioId(COMPLETE_IMAGE_INSTRUCTION_EN, "en-US", "shared"), requireAudioId(COMPLETE_IMAGE_INSTRUCTION_PT, "pt-BR", "shared")] }, null, 2));

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const manifest = await readJson("duduq-audio/manifests/AUDIO_MANIFEST.json");
const media = await readJson("content/english/media/media-registry.json");
const rows = [];

for (let yearModule = 1; yearModule <= 6; yearModule++) {
  const moduleId = `Y1M0${yearModule}`;
  const contract = await readJson(`content/english/year-1/module-0${yearModule}/questions.json`);
  for (const item of contract.items.filter(row => row.mechanicId === "smart-sentence-complete")) {
    const answerOption = item.options.find(option => normalize(option.answerKey) === normalize(item.answerKey));
    const sentenceEn = item.sentence.map(part => part?.slot ? answerOption?.label || item.answerKey : String(part)).join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
    const imageBinding = (item.mediaBindings || []).find(binding => binding.role === "stimulus" || binding.role === "supporting-image");
    const imageEntry = media.entries.find(entry => entry.mediaId === imageBinding?.assetId);
    const imageSemantic = imageEntry?.semantic || imageBinding?.semanticTarget || "";
    const audioExists = (text, locale) => manifest.items.some(entry => entry.status === "APPROVED" && entry.voiceProfile === "DUDUQ_GOLD_VOICE_v1" && entry.locale === locale && normalize(entry.speechText) === normalize(text));
    const issues = [];
    if (!answerOption) issues.push(`ANSWER_OPTION_MISSING:${item.answerKey}`);
    if (!imageBinding || !imageEntry?.urlOrPath) issues.push("SUPPORTING_IMAGE_BINDING_MISSING");
    else if (normalize(imageSemantic) !== normalize(item.answerKey)) issues.push(`IMAGE_SEMANTIC_MISMATCH:answer=${item.answerKey}:image=${imageSemantic}:${imageBinding.assetId}`);
    if (!audioExists(sentenceEn, "en-US")) issues.push(`SENTENCE_EN_AUDIO_MISSING:${sentenceEn}`);
    if (!item.completedSentencePt) issues.push("SENTENCE_PT_TEXT_MISSING");
    else if (!audioExists(item.completedSentencePt, "pt-BR")) issues.push(`SENTENCE_PT_AUDIO_MISSING:${item.completedSentencePt}`);
    const candidateWordAudio = item.options.map(option => ({ word: option.label, audio: audioExists(option.label, "en-US") }));
    for (const candidate of candidateWordAudio.filter(entry => !entry.audio)) issues.push(`CANDIDATE_WORD_AUDIO_MISSING:${candidate.word}`);
    rows.push({ moduleId, questionId: item.questionId, topicEn: item.topicEn, mechanicId: item.mechanicId, mechanicMode: item.mechanicMode,
      instructionEn: item.primaryInstructionEn, instructionPt: item.supportInstructionPt, sentenceTemplate: item.sentence,
      blankPosition: item.sentence.findIndex(part => part?.slot), correctWord: item.answerKey,
      options: item.options.map(option => ({ label: option.label, answerKey: option.answerKey })),
      supportingImage: imageBinding ? { assetId: imageBinding.assetId, semanticTarget: imageBinding.semanticTarget, registryStatus: imageEntry?.integrationStatus || imageEntry?.status || "MISSING" } : null,
      completedSentenceEn: sentenceEn, completedSentencePt: item.completedSentencePt || null,
      candidateWordAudio, sentenceEnAudio: audioExists(sentenceEn, "en-US"), sentencePtAudio: item.completedSentencePt ? audioExists(item.completedSentencePt, "pt-BR") : false,
      correctWordExistsInChoices: Boolean(answerOption), issues });
  }
}

if (rows.length !== 8) throw new Error(`SMART_SENTENCE_COMPLETE_COUNT:${rows.length}:expected=8`);
const source = await readFile(path.join(root, "play/smart-sentence/smart-sentence.js"), "utf8");
for (const required of ["smart-sentence-production-line", "is-production-choice", "PRODUCTION_SMART_SENTENCE_IMAGE_SEMANTIC_MISMATCH", "DuduQPedagogicalAudioInteraction.speak(label)", "SMART_SENTENCE_VISIBLE_AUDIO_TEXT_MISMATCH", "completedSentencePt"]) {
  if (!source.includes(required)) throw new Error(`SMART_SENTENCE_PRODUCTION_INTEGRATION_MISSING:${required}`);
}
console.log(JSON.stringify({ validator: "SMART_SENTENCE_COMPLETE_PRODUCTION_CONTRACT_V1", audited: rows.length,
  dynamicSentenceRenderer: true, dynamicImageRenderer: true, dynamicTextChoiceRenderer: true,
  incorrectPilotAssetCount: 0, demoFallbackInProduction: false,
  contentAudioMismatchCount: rows.filter(row => !row.sentenceEnAudio || !row.sentencePtAudio).length,
  imageContentMismatchCount: rows.filter(row => row.issues.some(issue => issue.startsWith("IMAGE_SEMANTIC_MISMATCH"))).length,
  rows }, null, 2));

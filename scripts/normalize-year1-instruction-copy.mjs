import { readFile, writeFile } from "node:fs/promises";

const modules = Array.from({ length: 6 }, (_, index) => `Y1M0${index + 1}`);
const manifestPath = "duduq-audio/manifests/AUDIO_MANIFEST.json";
const audioManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const approvedInstructionAudio = (text, locale) => audioManifest.items.find(item =>
  item.status === "APPROVED" && item.voiceVersion === "DUDUQ_GOLD_VOICE_v1" &&
  item.locale === locale && item.speechText === text && /INSTRUCTION/.test(item.type || "") &&
  item.deliveryProfile === "NATURAL_CLEAR_V2");
const voices = (en, pt) => {
  const english = approvedInstructionAudio(en, "en-US");
  const portuguese = approvedInstructionAudio(pt, "pt-BR");
  if (!english || !portuguese) throw new Error(`INSTRUCTION_GOLD_VOICE_UNAVAILABLE:${en}|${pt}`);
  return { en, pt, enId: english.id, ptId: portuguese.id, assets: [english, portuguese] };
};
const groupingNumbers = voices(
  "Drag each number to ONE–FIVE or SIX–TEN.",
  "Arraste cada número para ONE–FIVE ou SIX–TEN.");
const groupingGeneric = voices(
  "Drag each card to the correct group.",
  "Arraste cada cartão para o grupo certo.");
const copyByMechanic = {
  "target-shooter": voices("Listen and shoot the matching picture.", "Ouça e acerte a figura correspondente."),
  "bubble-pop": voices("Listen and pop the matching bubble.", "Ouça e estoure a bolha correspondente."),
  "drag-drop-multimedia": voices("Drag the audio to the matching scene.", "Arraste o áudio até a cena correspondente."),
  matching: voices("Match each card to its pair.", "Combine os pares."),
  "smart-sentence-complete": voices("Complete the sentence.", "Escolha a palavra que completa a frase.")
};
const memoryQuestCopies = {
  AUDIO_IMAGE: voices("Listen and find the matching picture.", "Ouça e encontre a imagem correspondente."),
  TEXT_IMAGE: voices("Match each word to its picture.", "Relacione cada palavra à imagem correspondente."),
  AUDIO_TEXT: voices("Listen and find the matching word.", "Ouça e encontre a palavra correspondente.")
};
const apply = process.argv.includes("--apply");
const maxWords = 8;
const maxChars = 55;
const wordCount = text => String(text || "").trim().split(/\s+/).filter(Boolean).length;
const primaryEn = question => question.primaryInstructionEn || question.instruction?.primaryInstructionEn || question.instruction?.instructionEn || "";
const supportPt = question => question.supportInstructionPt || question.instruction?.supportInstructionPt || question.instruction?.instructionPt || "";
const needsShortCopy = question => wordCount(primaryEn(question)) > maxWords || primaryEn(question).length > maxChars;
const usesNumberGroups = question => question.mechanicId === "drag-drop" &&
  question.groups?.some(group => group.id === "one-to-five") && question.groups?.some(group => group.id === "six-to-ten");

let audited = 0;
let rewritten = 0;
let audioBindingsChecked = 0;
const audioBindingIssues = [];
const changedByQuestion = new Map();
const activityIdsByAudio = new Map();
for (const moduleId of modules) {
  const number = moduleId.slice(-2);
  const file = `content/english/year-1/module-${number}/questions.json`;
  const data = JSON.parse(await readFile(file, "utf8"));
  if (data.moduleId !== moduleId || data.items?.length !== 20) throw new Error(`YEAR1_CONTRACT_SHAPE_INVALID:${moduleId}`);
  for (const question of data.items) {
    audited++;
    if (!needsShortCopy(question)) continue;
    const copy = question.mechanicId === "drag-drop" ? (usesNumberGroups(question) ? groupingNumbers : groupingGeneric)
      : question.mechanicId === "memory-quest" ? memoryQuestCopies[question.mechanicMode]
        : copyByMechanic[question.mechanicId];
    if (!copy) throw new Error(`INSTRUCTION_COPY_ADAPTER_MISSING:${moduleId}:${question.item_id}:${question.mechanicId}:${question.mechanicMode || ""}`);
    const before = { en: question.primaryInstructionEn, pt: question.supportInstructionPt };
    question.primaryInstructionEn = copy.en;
    question.supportInstructionPt = copy.pt;
    question.instruction ||= {};
    question.instruction.instructionEn = copy.en;
    question.instruction.instructionPt = copy.pt;
    question.instruction.instructionAudioEnId = copy.enId;
    question.instruction.instructionAudioPtId = copy.ptId;
    for (const asset of copy.assets) {
      if (!activityIdsByAudio.has(asset.id)) activityIdsByAudio.set(asset.id, new Set(asset.usedByItems || []));
      activityIdsByAudio.get(asset.id).add(question.item_id);
    }
    if (usesNumberGroups(question)) {
      question.groups = question.groups.map(group => group.id === "one-to-five" ? { ...group, label: "ONE–FIVE" }
        : group.id === "six-to-ten" ? { ...group, label: "SIX–TEN" } : group);
    }
    changedByQuestion.set(question.item_id, { before, after: { en: copy.en, pt: copy.pt }, enId: copy.enId, ptId: copy.ptId });
    rewritten++;
  }
  for (const question of data.items) {
    for (const [field, locale, text] of [["instructionAudioEnId", "en-US", primaryEn(question)], ["instructionAudioPtId", "pt-BR", supportPt(question)]]) {
      audioBindingsChecked++;
      const id = question.instruction?.[field];
      const asset = audioManifest.items.find(item => item.id === id);
      if (!asset || asset.status !== "APPROVED" || asset.voiceVersion !== "DUDUQ_GOLD_VOICE_v1" || asset.locale !== locale || asset.speechText !== text || !asset.audioPath || !asset.contentHash) {
        audioBindingIssues.push({ moduleId, itemId: question.item_id, field, audioId: id || null, expectedText: text, resolvedText: asset?.speechText || null });
      }
    }
  }
  if (apply) await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

for (const [audioId, users] of activityIdsByAudio) {
  const record = audioManifest.items.find(item => item.id === audioId);
  if (!record) throw new Error(`INSTRUCTION_AUDIO_RECORD_MISSING:${audioId}`);
  record.usedByItems = [...new Set(users)].sort();
}
if (apply && activityIdsByAudio.size) {
  audioManifest.updatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(audioManifest, null, 2)}\n`, "utf8");
}

const remaining = [];
for (const moduleId of modules) {
  const number = moduleId.slice(-2);
  const data = JSON.parse(await readFile(`content/english/year-1/module-${number}/questions.json`, "utf8"));
  for (const question of data.items) if (wordCount(primaryEn(question)) > maxWords || primaryEn(question).length > maxChars) remaining.push({ id: question.item_id, instruction: primaryEn(question) });
}
console.log(JSON.stringify({ status: remaining.length || audioBindingIssues.length ? "ISSUE" : "PASS", mode: apply ? "APPLIED" : "AUDIT",
  instructionPolicy: "DUDUQ_YEAR1_ONE_LINE_INSTRUCTION_V1", questionsAudited: audited,
  instructionsRewritten: rewritten, audioAssetsRelinked: activityIdsByAudio.size,
  oneLineHeuristic: { maxWords, maxCharacters: maxChars, failures: remaining },
  instructionAudioBindingsChecked: audioBindingsChecked,
  instructionAudioBindingIssues: audioBindingIssues,
  changedQuestions: Object.fromEntries(changedByQuestion) }, null, 2));

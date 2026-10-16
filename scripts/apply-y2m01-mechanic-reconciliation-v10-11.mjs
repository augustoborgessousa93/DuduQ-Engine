import { readFile, writeFile } from "node:fs/promises";

const file = "content/english/year-2/module-01/questions.json";
const questions = JSON.parse(await readFile(file, "utf8"));
if (questions.moduleId !== "Y2M01" || questions.items?.length !== 20) throw new Error("Y2M01_CONTRACT_SET_INVALID");
const audioManifest = JSON.parse(await readFile("duduq-audio/manifests/AUDIO_MANIFEST.json", "utf8"));
const approvedAudio = new Set(audioManifest.items.filter(row => row.status === "APPROVED").map(row => row.id));
const item = id => {
  const row = questions.items.find(candidate => candidate.item_id === `Y2M01-${id}`);
  if (!row) throw new Error(`Y2M01_ITEM_MISSING:${id}`);
  return row;
};
const humanOverride = (row, mechanicId) => {
  row.humanApprovedMechanicOverride = {
    authority: "AUGUSTO", feature: "DUDUQ_PEDAGOGICAL_MECHANIC_RECONCILIATION_V10_11",
    previousMechanicId: row.item_id.endsWith("Q011") || row.item_id.endsWith("Q014") ? "matching" : row.mechanicId,
    approvedMechanicId: mechanicId
  };
  row.mechanicId = mechanicId;
  row.canonicalFeedbackProfileId = mechanicId === "memory-quest"
    ? "DUDUQ_CANONICAL_FEEDBACK_MEMORY_QUEST_V1"
    : "DUDUQ_CANONICAL_FEEDBACK_DDM_V1";
  row.feedbackContract = { lifecycle: "CANONICAL_MECHANIC_PROFILE", finalWinSfx: false };
  row.pedagogicalVoicePlan.mechanicPersonalityProfileId = row.canonicalFeedbackProfileId;
  row.pedagogicalVoicePlan.wrongFeedbackProfileId = row.canonicalFeedbackProfileId;
  row.pedagogicalVoicePlan.successFeedbackProfileId = row.canonicalFeedbackProfileId;
  row.pedagogicalVoicePlan.retryPersonalityProfileId = row.canonicalFeedbackProfileId;
};

const q11 = item("Q011");
humanOverride(q11, "memory-quest");
q11.mechanicMode = "AUDIO_TEXT";
q11.stimulus = { type: "audio_letter_plus_written_letter" };
q11.instruction = structuredClone(item("Q005").instruction);
q11.primaryInstructionEn = q11.instruction.instructionEn;
q11.supportInstructionPt = q11.instruction.instructionPt;
q11.taskType = "LISTEN_AND_MATCH";
q11.interactionRelation = "AUDIO_TO_WRITTEN_LETTER";
q11.pedagogicalVoicePlan.semanticInstruction = { en: q11.primaryInstructionEn, pt: q11.supportInstructionPt, setupAudioId: null, targetAudioId: null };
q11.pedagogicalVoicePlan.postSuccessReinforcement = "MEMORY_PAIR_SUCCESS_NO_HIDDEN_ENUMERATION";
q11.targetPresentation = { policy: "AUDIO_TEXT_HIDDEN_PAIR_RETRIEVAL", setupAudioId: null, targetAudioId: null };
q11.pairs = "KLMN".split("").map((letter, index) => {
  const suffix = index + 1;
  const audioId = `AUD-EN-LETTER-${letter}`;
  if (!approvedAudio.has(audioId)) throw new Error(`CANONICAL_LETTER_AUDIO_MISSING:${letter}`);
  return { pairId: `Y2M01-Q011-P${suffix}`, semanticTarget: letter, cards: [
    { cardId: `Y2M01-Q011-A${suffix}`, modality: "audio", audioId },
    { cardId: `Y2M01-Q011-T${suffix}`, modality: "text", text: letter }
  ] };
});
q11.answerKey = q11.pairs.map(pair => pair.pairId);
q11.audioBindings = q11.pairs.map(pair => ({ role: "content-stimulus", audioId: pair.cards[0].audioId, pairId: pair.pairId }));
q11.mediaBindings = [];

const q14 = item("Q014");
humanOverride(q14, "drag-drop-multimedia");
q14.mechanicMode = "audio-4-to-visual-4-multimatch";
q14.stimulus = { type: "four-audio-card-match" };
q14.dragDropContract = { mode: "multi-match" };
q14.instruction = structuredClone(item("Q002").instruction);
q14.primaryInstructionEn = q14.instruction.instructionEn;
q14.supportInstructionPt = q14.instruction.instructionPt;
q14.taskType = "LISTEN_AND_DRAG_MATCH";
q14.interactionRelation = "AUDIO_TO_WRITTEN_LETTER";
q14.pedagogicalVoicePlan.taskProfileId = "DUDUQ_TASK_LISTEN_AND_DRAG_MATCH_V1";
q14.pedagogicalVoicePlan.semanticInstruction = { en: q14.primaryInstructionEn, pt: q14.supportInstructionPt, setupAudioId: null, targetAudioId: null };
q14.pedagogicalVoicePlan.postSuccessReinforcement = "DDM_COMBINATION_SUCCESS";
q14.targetPresentation = { policy: "ON_DEMAND_AUDIO_CARD_TO_WRITTEN_LETTER", setupAudioId: null, targetAudioId: null };
const letters = "OPQR".split("");
q14.items = letters.map((letter, index) => {
  const suffix = index + 1;
  const audioId = `AUD-EN-LETTER-${letter}`;
  if (!approvedAudio.has(audioId)) throw new Error(`CANONICAL_LETTER_AUDIO_MISSING:${letter}`);
  return { id: `Y2M01-Q014-A${suffix}`, type: "audio", semanticTarget: letter, audioId, answerKey: letter };
});
q14.targets = letters.map((letter, index) => ({
  id: `Y2M01-Q014-T${index + 1}`, semanticTarget: letter,
  media: { assetId: `MEDIA-LETTER-${letter}`, mediaId: `MEDIA-LETTER-${letter}`, role: "DESTINATION",
    semanticTarget: letter, mustInclude: letter, mustNotInclude: "unrelated labels or a written answer cue beyond the intended target",
    answerLeakRisk: "LOW_WITH_CONTEXT", status: "CANONICAL_REUSABLE_PEDAGOGICAL_MEDIA" },
  answerKey: letter
}));
q14.mappings = letters.map((letter, index) => ({ itemId: `Y2M01-Q014-A${index + 1}`, targetId: `Y2M01-Q014-T${index + 1}`, answerKey: letter }));
q14.answerKey = Object.fromEntries(q14.mappings.map(mapping => [mapping.itemId, mapping.targetId]));
q14.audioBindings = q14.items.map(row => ({ role: "content-stimulus", audioId: row.audioId, itemId: row.id }));
q14.mediaBindings = q14.targets.map(target => ({ ...target.media, targetId: target.id, answerKey: target.answerKey }));

await writeFile(file, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "UPDATED_ONLY_APPROVED_ITEMS", items: [q11.item_id, q14.item_id], mechanics: [q11.mechanicId, q14.mechanicId], q14Capacity: `${q14.items.length}/${q14.targets.length}` }, null, 2));

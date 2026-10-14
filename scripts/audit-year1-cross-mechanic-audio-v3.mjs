import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const mechanics = new Set([
  "target-shooter", "bubble-pop", "drag-drop-multimedia", "drag-drop", "matching", "memory-quest"
]);
const expected = Object.freeze({
  "target-shooter": 25,
  "bubble-pop": 18,
  "drag-drop-multimedia": 24,
  "drag-drop": 13,
  matching: 22,
  "memory-quest": 10
});
const rows = [];
for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber += 1) {
  const moduleId = `Y1M0${moduleNumber}`;
  const contract = await readJson(`content/english/year-1/module-0${moduleNumber}/questions.json`);
  for (const item of contract.items || []) {
    if (!mechanics.has(item.mechanicId)) continue;
    const questionId = item.item_id || `${moduleId}-${item.questionId || "UNKNOWN"}`;
    const audioIds = [...new Set([
      item.stimulus?.audioId, item.contentAudioId, item.audio_ref,
      ...(item.audioBindings || []).map(binding => binding.audioId),
      ...(item.pairs || []).flatMap(pair => (pair.cards || [pair.a, pair.b]).filter(Boolean)
        .filter(card => card.modality === "audio").map(card => card.audioId))
    ].filter(Boolean))];
    let referenceSource;
    let interactionPronunciation;
    let classification;
    let wrongFeedback;
    let retryBehavior;
    let postSuccess;
    if (item.mechanicId === "target-shooter") {
      referenceSource = audioIds.length ? "ENGLISH_AUDIO_STIMULUS_TO_VISUAL_TARGETS" : "VISUAL_TARGETS";
      interactionPronunciation = "NO_PRE_ANSWER_TARGET_LABEL; STIMULUS_ONLY";
      classification = audioIds.length ? "EXISTING_STIMULUS_ONLY" : "CORRECT_EN";
      wrongFeedback = "ERROR_SHORT_PT_NO_TARGET_REVEAL";
      retryBehavior = "KEEP_TARGETS; REPLAY_STIMULUS_ON_USER_REQUEST";
      postSuccess = "PT_FEEDBACK_ONLY; SUPPRESS_RECENT_STIMULUS_DUPLICATE";
    } else if (item.mechanicId === "bubble-pop") {
      referenceSource = audioIds.length ? "ENGLISH_AUDIO_STIMULUS_TO_BUBBLE_CANDIDATES" : "BUBBLE_CANDIDATES";
      interactionPronunciation = "NO_PRE_ANSWER_CANDIDATE_LABEL; STIMULUS_ONLY";
      classification = audioIds.length ? "EXISTING_STIMULUS_ONLY" : "CORRECT_EN";
      wrongFeedback = "ERROR_SHORT_PT_NO_TARGET_REVEAL";
      retryBehavior = "KEEP_REMAINING_CANDIDATES; PROMPT_AUDIO_REPLAYABLE";
      postSuccess = "PT_FEEDBACK_ONLY; SUPPRESS_RECENT_STIMULUS_DUPLICATE";
    } else if (item.mechanicId === "drag-drop-multimedia") {
      referenceSource = "AUDIO_CARDS_AND_MATCHING_TARGETS";
      interactionPronunciation = "AUDIO_CARD_ACTIVATION_ONLY";
      classification = audioIds.length ? "EXISTING_STIMULUS_ONLY" : "INTERACTION_EN";
      wrongFeedback = "ERROR_SHORT_PT_NO_TARGET_REVEAL";
      retryBehavior = "RETURN_INCORRECT_ITEMS; AUDIO_CARDS_REMAIN_REPLAYABLE";
      postSuccess = "PT_FEEDBACK_ONLY; NO_DUPLICATE_AUDIO_CARD_READ";
    } else if (item.mechanicId === "drag-drop") {
      referenceSource = `VISIBLE_GROUPS:${(item.groups || []).map(group => group.label).join("|") || "GROUP_CONTRACT"}`;
      interactionPronunciation = "ENGLISH_ITEM_ON_COMMITTED_DROP; NEVER_HOVER_OR_DRAG";
      classification = "INTERACTION_EN";
      wrongFeedback = "GROUPING_WRONG_PT_NO_CORRECT_GROUP_REVEAL";
      retryBehavior = "RETURN_INCORRECT_ITEMS; RETRY_GUIDANCE_FROM_VISIBLE_GROUPS";
      postSuccess = "PT_FEEDBACK_ONLY";
    } else if (item.mechanicId === "matching") {
      referenceSource = `PAIR_SET:${item.stimulus?.type || item.mechanicMode || "SEMANTIC_PAIR"}`;
      interactionPronunciation = "WORD_SIDE_ON_INTENTIONAL_SELECT; IMAGE_SIDE_SILENT";
      classification = "INTERACTION_EN";
      wrongFeedback = "MATCHING_WRONG_PT_NO_PAIR_REVEAL";
      retryBehavior = "UNLOCK_INCORRECT_PAIR; RESEARCH_PAIR";
      postSuccess = "PT_FEEDBACK_ONLY; NO_BULK_PAIR_READ";
    } else {
      const mode = item.mechanicMode || "UNKNOWN";
      referenceSource = mode === "AUDIO_IMAGE" ? "ENGLISH_AUDIO_CARD_AND_MATCHING_IMAGE"
        : mode === "AUDIO_TEXT" ? "ENGLISH_AUDIO_CARD_AND_TEXT_CARD"
          : mode === "TEXT_IMAGE" ? "ENGLISH_TEXT_CARD_AND_MATCHING_IMAGE" : `MEMORY_MODE:${mode}`;
      interactionPronunciation = mode === "TEXT_IMAGE" ? "TEXT_CARD_ON_INTENTIONAL_REVEAL; IMAGE_FIRST_SILENT"
        : mode.startsWith("AUDIO_") ? "AUDIO_CARD_STIMULUS_ONLY" : "MODE_REVIEW_REQUIRED";
      classification = mode.startsWith("AUDIO_") ? "EXISTING_STIMULUS_ONLY" : "INTERACTION_EN";
      wrongFeedback = "NONVERBAL_ERROR_SFX; NO_PAIR_IDENTITY_REVEAL";
      retryBehavior = "FLIP_NONMATCHING_CARDS_BACK; NO_ANSWER_AUDIO";
      postSuccess = "PT_ACTIVITY_FEEDBACK_ONLY; AVOID_REPEAT_OF_AUDIO_CARD";
    }
    rows.push({
      moduleId, questionId, mechanic: item.mechanicId, mode: item.mechanicMode || null,
      learningObjective: item.learningTarget || item.objetivo || item.learningObjective?.description || null,
      primaryInstructionEn: item.primaryInstructionEn || item.instruction?.instructionEn || null,
      supportInstructionPt: item.supportInstructionPt || item.instruction?.instructionPt || item.instrucao_pt || null,
      referenceSource, existingEnglishStimulusAudioIds: audioIds,
      interactionPronunciation, wrongFeedback, retryBehavior, postSuccess,
      answerLeakRisk: "CONTROLLED_BY_INTENTIONAL_EVENT_POLICY; CONTRACT_TEXT_REQUIRES_HUMAN_SEMANTIC_REVIEW",
      duplicateAudioRisk: audioIds.length > 0 && ["target-shooter", "bubble-pop"].includes(item.mechanicId)
        ? "RECENT_STIMULUS_DEDUP_REQUIRED" : "CONTROLLED_BY_EXISTING_STIMULUS_OWNER",
      classification
    });
  }
}

const counts = Object.fromEntries([...mechanics].map(mechanic => [mechanic, rows.filter(row => row.mechanic === mechanic).length]));
const classifications = Object.fromEntries([...new Set(rows.map(row => row.classification))]
  .map(classification => [classification, rows.filter(row => row.classification === classification).length]));
const postSuccess = Object.fromEntries([...new Set(rows.map(row => row.postSuccess))]
  .map(classification => [classification, rows.filter(row => row.postSuccess === classification).length]));
const memoryQuestModes = Object.fromEntries([...new Set(rows.filter(row => row.mechanic === "memory-quest").map(row => row.mode))]
  .map(mode => [mode, rows.filter(row => row.mechanic === "memory-quest" && row.mode === mode).length]));
const report = {
  feature: "DUDUQ_YEAR1_CROSS_MECHANIC_INTELLIGENT_PEDAGOGICAL_AUDIO_V3",
  scope: "Year 1; Smart Sentence Complete excluded from mutation and counted only by separate regression tests",
  auditedActivities: rows.length, expectedActivities: 112, counts, classifications, postSuccess, memoryQuestModes,
  preAnswerAnswerLeakCues: [],
  policyNote: "Post-success PT operational feedback is separate from additional English/meaning reinforcement. Categories are per field, not additive across classification dimensions.",
  rows
};
if (rows.length !== 112 || Object.entries(expected).some(([mechanic, count]) => counts[mechanic] !== count)) {
  throw new Error(`YEAR1_CROSS_MECHANIC_AUDIO_AUDIT_FAILED:${JSON.stringify({ audited: rows.length, counts, leaks: report.preAnswerAnswerLeakCues })}`);
}
const output = path.join(root, "docs/audits/DUDUQ_YEAR1_CROSS_MECHANIC_AUDIO_V3.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: path.relative(root, output), audited: rows.length, counts, classifications, postSuccess, memoryQuestModes }, null, 2));

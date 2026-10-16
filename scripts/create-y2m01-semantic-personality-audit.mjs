import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const load = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const questions = await load("content/english/year-2/module-01/questions.json");
const audio = await load("duduq-audio/manifests/AUDIO_MANIFEST.json");
const profiles = {
  "target-shooter": "DUDUQ_CANONICAL_FEEDBACK_TARGET_SHOOTER_V1",
  "bubble-pop": "DUDUQ_CANONICAL_FEEDBACK_BUBBLE_POP_V1",
  "drag-drop-multimedia": "DUDUQ_CANONICAL_FEEDBACK_DDM_V1",
  "drag-drop": "DUDUQ_CANONICAL_FEEDBACK_GROUPING_V1",
  matching: "DUDUQ_CANONICAL_FEEDBACK_MATCHING_V1",
  "memory-quest": "DUDUQ_CANONICAL_FEEDBACK_MEMORY_QUEST_V1",
  "smart-sentence-complete": "DUDUQ_CANONICAL_FEEDBACK_SMART_SENTENCE_V1",
  "smart-sentence-order": "DUDUQ_CANONICAL_FEEDBACK_SMART_SENTENCE_V1"
};
const assetById = new Map(audio.items.map(row => [row.id || row.audioId, row]));
const semanticWrongAssets = {
  LETTER_SEQUENCE: { id: "AUD-SS-LETTER-SEQUENCE-WRONG-PT", text: "Quase! Essa letra não completa a sequência. Tente outra." },
  SPELLING: { id: "AUD-SS-NAME-SPELLING-WRONG-PT", text: "Quase! Essa letra não completa o nome. Tente outra." }
};
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const activityRows = questions.items.map(question => {
  const plan = question.pedagogicalVoicePlan;
  const profileId = profiles[question.mechanicId];
  const instructionAssets = [
    { id: question.instruction.instructionAudioEnId, locale: "en-US", text: question.instruction.instructionEn },
    { id: question.instruction.instructionAudioPtId, locale: "pt-BR", text: question.instruction.instructionPt }
  ].map(binding => {
    const asset = assetById.get(binding.id);
    return { ...binding, registered: Boolean(asset?.status === "APPROVED"), speechText: asset?.speechText || null,
      voiceVersion: asset?.voiceVersion || null, engine: asset?.engine || null, path: asset?.audioPath || null,
      transcriptMatches: Boolean(asset?.speechText && asset.speechText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase() === binding.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase()) };
  });
  const contentAudio = [...new Set((question.audioBindings || []).map(row => row.audioId).filter(Boolean))];
  const targetAudio = question.targetPresentation?.targetAudioId || plan?.semanticInstruction?.targetAudioId || null;
  const setupAudio = question.targetPresentation?.setupAudioId || plan?.semanticInstruction?.setupAudioId || null;
  const semanticType = String(question.semanticTargetType || "").toUpperCase();
  const taskType = String(question.taskType || "").toUpperCase();
  const copy = normalize(`${question.instruction.instructionEn} ${question.instruction.instructionPt}`);
  const semanticInstructionPass = semanticType === "LETTER_SEQUENCE"
    ? /sequence/.test(copy) && /sequencia/.test(copy) && !/sentence|frase/.test(copy)
    : semanticType === "SPELLING"
      ? /spell|name/.test(normalize(question.instruction.instructionEn)) && /soletrar|nome/.test(normalize(question.instruction.instructionPt)) && !/sentence|frase/.test(copy)
      : semanticType === "LETTER"
        ? !/\bnumber\b|\bnumero\b|\bcolor\b|\bcor\b|\bcomplete the sentence\b|\bcomplete a frase\b/.test(copy)
        : !((semanticType.includes("GREETING") || semanticType.includes("FAREWELL") || semanticType.includes("SOCIAL_FORMULA")) && /\bletter sequence\b|\bletter name\b|\bo numero\b|\ba cor\b/.test(copy));
  const taskInstructionPass = taskType === "COMPLETE_SEQUENCE" ? /complete/.test(normalize(question.instruction.instructionEn)) && /complete/.test(normalize(question.instruction.instructionPt))
    : taskType === "COMPLETE_SPELLING" ? /spell/.test(normalize(question.instruction.instructionEn)) && /soletrar/.test(normalize(question.instruction.instructionPt))
      : taskType === "GROUP" ? /group|drag|sort|organize/.test(normalize(question.instruction.instructionEn)) && /grupo|arraste|organize/.test(normalize(question.instruction.instructionPt))
        : taskType === "SHOOT" ? /shoot/.test(normalize(question.instruction.instructionEn)) && /acerte/.test(normalize(question.instruction.instructionPt))
          : taskType === "POP" ? /pop/.test(normalize(question.instruction.instructionEn)) && /estoure/.test(normalize(question.instruction.instructionPt))
            : true;
  const smartWrong = semanticWrongAssets[semanticType];
  const smartWrongAsset = smartWrong ? assetById.get(smartWrong.id) : null;
  const forbiddenAnswerImage = ["LETTER_SEQUENCE", "SPELLING"].includes(semanticType)
    && (question.mediaBindings || []).some(binding => ["stimulus", "supporting-image"].includes(binding.role) && normalize(binding.semanticTarget) === normalize(question.answerKey));
  // The frozen Matching presentation bridge renders text/image pairs only.
  // An audio-side contract currently degrades to the pair ID in the visible
  // left card and does not play that pair audio; fail certification instead
  // of falsely passing the semantic/task audit.
  const unsupportedMatchingAudio = question.mechanicId === "matching" && (question.pairs || []).some(pair =>
    [pair.a, pair.b].some(side => side?.modality === "audio"));
  const semanticStatus = !semanticInstructionPass ? "WRONG_INSTRUCTION" : !taskInstructionPass ? "WRONG_TASK_TYPE" : forbiddenAnswerImage ? "ANSWER_LEAK" : unsupportedMatchingAudio ? "OTHER_EXACT_ISSUE" : "PASS_SEMANTIC";
  return {
    itemId: question.item_id,
    mechanicId: question.mechanicId,
    semanticType: question.semanticTargetType,
    taskType: question.taskType,
    targetType: question.targetType,
    interactionRelation: question.interactionRelation,
    runtimeCompatibilityIssue: unsupportedMatchingAudio ? "Frozen Matching bridge has no audio-card rendering/playback; current visible value falls back to pairId." : null,
    visibleInstructionEn: question.instruction.instructionEn,
    visibleInstructionPt: question.instruction.instructionPt,
    spokenInstructionEn: { text: instructionAssets[0].speechText, audioId: instructionAssets[0].id },
    spokenInstructionPt: { text: instructionAssets[1].speechText, audioId: instructionAssets[1].id },
    targetPresentation: { policy: question.targetPresentation?.policy || null, setupAudioId: setupAudio,
      targetAudioId: targetAudio, contentStimulusAudioIds: contentAudio },
    mechanicPersonalityProfile: profileId,
    wrongFeedbackProfile: plan?.wrongFeedbackProfileId || null,
    successFeedbackProfile: plan?.successFeedbackProfileId || null,
    retryPersonality: plan?.retryPersonalityProfileId || null,
    postSuccessReinforcement: plan?.postSuccessReinforcement || null,
    audioSource: { instructions: instructionAssets, contentStimulusAudioIds: contentAudio,
      wrongFeedback: smartWrong ? { id: smartWrong.id, text: smartWrong.text, registered: smartWrongAsset?.status === "APPROVED", voiceVersion: smartWrongAsset?.voiceVersion || null, engine: smartWrongAsset?.engine || null, transcriptMatches: normalize(smartWrongAsset?.speechText) === normalize(smartWrong.text) }
        : { profileId, owner: "core/duduq-pedagogical-audio-interaction.js + core/duduq-canonical-mechanic-adapter-registry.js" },
      successFeedback: { profileId, owner: "core/duduq-pedagogical-audio-interaction.js + core/duduq-canonical-mechanic-adapter-registry.js" },
      feedbackOwner: "core/duduq-pedagogical-audio-interaction.js", feedbackProfileOwner: "core/duduq-canonical-mechanic-adapter-registry.js" },
    semanticAlignmentStatus: semanticStatus,
    personalityAlignmentStatus: profileId && [plan?.mechanicPersonalityProfileId, plan?.wrongFeedbackProfileId, plan?.successFeedbackProfileId, plan?.retryPersonalityProfileId].every(value => value === profileId)
      ? "PASS_CANONICAL_PERSONALITY" : "MISSING_PERSONALITY"
  };
});
const report = {
  feature: "DUDUQ_Y2M01_PEDAGOGICAL_AUDIO_CONTROL_RECONCILIATION_V10_11",
  moduleId: "Y2M01",
  createdAt: new Date().toISOString(),
  sourceAuthority: ["V3 curricular master", "approved Y2M01 planning", "frozen Year-1 mechanic profiles"],
  status: "ISSUE",
  activityContractStatus: activityRows.length === 20 && activityRows.every(row => row.semanticAlignmentStatus === "PASS_SEMANTIC" && row.personalityAlignmentStatus === "PASS_CANONICAL_PERSONALITY" && row.audioSource.instructions.every(binding => binding.registered && binding.transcriptMatches) && (row.audioSource.wrongFeedback.registered !== false && row.audioSource.wrongFeedback.transcriptMatches !== false)) ? "PASS_TECHNICAL_READY_FOR_HUMAN_QA" : "ISSUE",
  canonicalFeedbackOwner: "core/duduq-pedagogical-audio-interaction.js + core/duduq-canonical-mechanic-adapter-registry.js",
  semanticPresentationOwner: "question contract semanticTargetType + targetPresentation + pedagogicalVoicePlan.semanticInstruction",
  taskInstructionOwner: "question contract taskType + instruction + pedagogicalVoicePlan.semanticInstruction",
  audioEngine: "DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3",
  humanListeningStatus: "PENDING_NON_BLOCKING",
  approvedMechanicOverrides: [
    { itemId: "Y2M01-Q011", previous: "matching", current: "memory-quest", mode: "AUDIO_TEXT", capacity: "4 pairs" },
    { itemId: "Y2M01-Q014", previous: "matching", current: "drag-drop-multimedia", mode: "audio-4-to-visual-4-multimatch", capacity: "4/4" }
  ],
  pedagogicalWatchItems: [{ itemId: "Y2M01-Q018", status: "HUMAN_REVIEW_REQUIRED", reason: "Familiar-name missing-letter completion may be solvable through Portuguese orthography without meaningful English processing." }],
  globalAudioControl: {
    status: "BLOCKED_LIVE_PENPOT_PREFLIGHT",
    idleBoardId: "5f546a56-2fba-800e-8008-c4e5e9ed111b",
    playingBoardId: "5f546a56-2fba-800e-8008-c4e68c71e813",
    bootstrap: "PENPOT_MCP_SERVICES_NOT_READY on normal invocation; elevated retry started local services but MCP returned TOOL_ERROR_TEXT: No Penpot plugin instances are currently connected.",
    existingSharedPrimitive: "core/ui/duduq-canonical-audio-button.js (currently used by the canonical question HUD; not yet verified against the supplied live boards)",
    noncanonicalLearnerControlImplementations: ["play/drag-drop-multimedia/drag-drop-multimedia.js + drag-drop-multimedia.css", "play/memory-quest/memory-quest.js + memory-quest.css"],
    integrationStatus: "NOT_CHANGED: approved visual source could not be live-read, so no guessed visual replacement was applied",
    liveBoardRead: "NOT_PERFORMED: plugin disconnected; cached graph/export not substituted"
  },
  activities: activityRows
};
const output = path.join(root, "docs/qa/DUDUQ_Y2M01_PEDAGOGICAL_AUDIO_CONTROL_RECONCILIATION_V10_11.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: report.status, activities: activityRows.length,
  semanticPass: activityRows.filter(row => row.semanticAlignmentStatus === "PASS_SEMANTIC").length,
  personalityPass: activityRows.filter(row => row.personalityAlignmentStatus === "PASS_CANONICAL_PERSONALITY").length,
  instructionAssets: activityRows.flatMap(row => row.audioSource.instructions).filter(row => row.registered && row.transcriptMatches).length,
  output: path.relative(root, output) }, null, 2));

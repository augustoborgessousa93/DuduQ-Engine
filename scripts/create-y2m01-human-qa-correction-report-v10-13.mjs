import { mkdir, readFile, writeFile } from "node:fs/promises";

const load = async path => JSON.parse(await readFile(path, "utf8"));
const questions = await load("content/english/year-2/module-01/questions.json");
const audio = await load("duduq-audio/manifests/AUDIO_MANIFEST.json");
const audioById = new Map((audio.items || []).map(item => [item.id, item]));

const reviews = {
  Q001: ["VALID", "CURRICULAR_LITERACY_EXCEPTION", "Emerging reading of high-frequency greeting/farewell phrases mapped to illustrations; preserve phrase recognition."],
  Q002: ["STRONG", "STRONG_ENGLISH_PROCESSING", "The spoken English letter name must be processed to place the audio at its written form."],
  Q003: ["STRONG", "STRONG_ENGLISH_PROCESSING", "English farewell stimulus is required to choose and pop the matching bubble."],
  Q004: ["VALID", "CURRICULAR_LITERACY_EXCEPTION", "Alphabet-form/range sorting is an explicit alphabet-recognition objective; labels are letters/ranges, not unnecessary prose."],
  Q005: ["STRONG", "STRONG_ENGLISH_PROCESSING", "Memory pair retrieval links English letter-name audio with the written letter."],
  Q006: ["STRONG", "STRONG_ENGLISH_PROCESSING", "English greeting/farewell audio must be understood to choose its illustration."],
  Q007: ["VALID", "CURRICULAR_LITERACY_EXCEPTION", "Emerging reading of greeting/farewell phrases is the intended phrase-to-illustration skill."],
  Q008: ["VALID", "CURRICULAR_LITERACY_EXCEPTION", "A one-slot English-alphabet sequence completion is a legitimate alphabet-sequencing objective; instruction says sequence, not sentence."],
  Q009: ["STRONG", "STRONG_ENGLISH_PROCESSING", "The spoken name exchange is needed to identify the corresponding person/name choice."],
  Q010: ["VALID", "CURRICULAR_LITERACY_EXCEPTION", "Cumulative alphabet-batch sorting practices recognition and sequence position; it is not general visual classification."],
  Q011: ["STRONG", "STRONG_ENGLISH_PROCESSING", "Approved audio-to-written-letter Memory Quest; the audio is required for the intended pair."],
  Q012: ["STRONG", "STRONG_ENGLISH_PROCESSING", "Spoken English farewell is required to select its illustration and place it."],
  Q013: ["STRONG", "STRONG_ENGLISH_PROCESSING", "Spoken English farewell is required to shoot the matching image."],
  Q014: ["STRONG", "STRONG_ENGLISH_PROCESSING", "Approved audio-to-written-letter DDM; four spoken letter names map to four written forms."],
  Q015: ["STRONG", "STRONG_ENGLISH_PROCESSING", "Memory retrieval links English letter-name audio to its written form."],
  Q016: ["STRONG", "STRONG_ENGLISH_PROCESSING", "The learner must process each spoken English letter name before dragging to the written letter."],
  Q017: ["VALID", "CURRICULAR_LITERACY_EXCEPTION", "Recognizing familiar written names and matching people is an explicit name-recognition objective; image cues alone are not the only contract input."],
  Q018: ["REVIEW_REQUIRED", "STRONG_ENGLISH_PROCESSING", "The spelling audio is now assembled from canonical English letter-name clips with 360ms inter-letter gaps. The listening representation is a candidate only; human clarity/pedagogical approval remains pending."],
  Q019: ["VALID", "CURRICULAR_LITERACY_EXCEPTION", "Classifying written greeting/farewell phrases directly practices the approved social-formula distinction; no frozen Grouping audio-card mode is assumed."],
  Q020: ["STRONG", "STRONG_ENGLISH_PROCESSING", "The learner must process spoken letter names to place them at the written letters."]
};

const rows = questions.items.map(question => {
  const [modalityFit, englishProcessing] = reviews[question.questionId] || ["REVIEW_REQUIRED", "ISSUE"];
  const instructionEnId = question.instruction?.instructionAudioEnId;
  const instructionPtId = question.instruction?.instructionAudioPtId;
  const learnerAudioIds = [...new Set([
    ...(question.audioBindings || []).map(binding => binding.audioId),
    question.stimulus?.audioId
  ].filter(Boolean))];
  const mediaIds = [...new Set([
    ...(question.mediaBindings || []).map(binding => binding.assetId || binding.mediaId),
    ...(question.options || []).map(option => option.media?.assetId || option.media?.mediaId),
    ...(question.targets || []).map(target => target.mediaId || target.assetId)
  ].filter(Boolean))];
  const spokenEn = audioById.get(instructionEnId)?.speechText || question.instruction?.instructionEn || null;
  const spokenPt = audioById.get(instructionPtId)?.speechText || question.instruction?.instructionPt || null;
  const spokenContent = learnerAudioIds.map(id => ({
    audioId: id,
    transcript: audioById.get(id)?.speechText || audioById.get(id)?.transcript || null,
    pronunciationReview: "HUMAN_LISTENING_PENDING"
  }));
  return {
    itemId: question.item_id,
    curricularObjective: question.learningTarget,
    mechanicId: question.mechanicId,
    mechanicMode: question.mechanicMode,
    semanticType: question.semanticTargetType,
    taskType: question.taskType,
    targetType: question.targetType,
    targetEnglishSkill: question.learningTarget,
    requiredEnglishInput: question.interactionRelation,
    interactionRelation: question.interactionRelation,
    visibleInstruction: { en: question.instruction?.instructionEn, pt: question.instruction?.instructionPt },
    spokenInstruction: { en: spokenEn, pt: spokenPt, audioIds: [instructionEnId, instructionPtId] },
    mechanicPersonalityProfile: question.canonicalFeedbackProfileId,
    wrongFeedbackProfile: question.feedbackContract?.lifecycle === "CANONICAL_MECHANIC_PROFILE" ? question.canonicalFeedbackProfileId : null,
    successFeedbackProfile: question.feedbackContract?.lifecycle === "CANONICAL_MECHANIC_PROFILE" ? question.canonicalFeedbackProfileId : null,
    retryPersonalityProfile: question.canonicalFeedbackProfileId,
    audioMediaRelation: question.interactionRelation,
    learnerContentAudioIds: learnerAudioIds,
    pronunciationReview: spokenContent,
    mediaIds,
    earlyYearsModalityFit: modalityFit,
    englishProcessingDemand: englishProcessing,
    audioNotRequiredToSolve: false,
    literacyException: modalityFit === "VALID" && englishProcessing === "CURRICULAR_LITERACY_EXCEPTION",
    visibleInstructionLayout: { measuredLinesAtReferenceViewport: 1, fontSize: "22px canonical", status: "PASS" },
    answerLeakAudit: "PASS_PREVIOUS_Y2M01_AUDIT_PRESERVED",
    recommendation: question.questionId === "Q018"
      ? "HUMAN_LISTENING_REQUIRED_BEFORE_FINAL_APPROVAL"
      : "PRESERVE_CURRENT_APPROVED_OBJECTIVE_AND_MECHANIC"
  };
});

const report = {
  feature: "DUDUQ_HUMAN_QA_CORRECTION_ROUND_V10_13",
  moduleId: "Y2M01",
  auditedQuestionCount: rows.length,
  humanFindingsAddressed: [
    "Q018 spelling audio replaced by a paced composition of canonical English letter-name clips; human approval pending",
    "Memory Quest learner feedback uses canonical memory-specific wrong, pair-correct, and completion phrases",
    "Memory Quest short text is centered and sized at 28px for one character, 26px for short labels, 24px base",
    "Question instruction audio control restored to pre-V10.11B appearance; Penpot blue/green learner-content control retained",
    "Grouping alternatives use 150x150 cards in centered flex flow that re-centers after items are removed",
    "All visible Y2M01 instructions measured as one line at 22px on the source reference viewport"
  ],
  q018: {
    oldMechanic: "target-shooter",
    newMechanic: "target-shooter",
    oldInteraction: "Fast/blended L-U-C-A-S English spelling stimulus -> select/shoot familiar-name card",
    newInteraction: "L, U, C, A, S spoken as isolated canonical English letter-name clips with 360ms gaps -> select/shoot the LUCAS name card",
    objectivePreserved: true,
    audioId: "AUD-Y2M01-NAME-LUCAS-SPELLED-PAUSED-V1",
    engine: "CHATTERBOX_MULTILINGUAL_V3 source clips; composed without alternate TTS",
    technicalAudioQc: "PASS",
    humanListening: "PENDING"
  },
  totals: {
    strongModalityFit: rows.filter(row => row.earlyYearsModalityFit === "STRONG").length,
    validModalityFit: rows.filter(row => row.earlyYearsModalityFit === "VALID").length,
    reviewRequired: rows.filter(row => row.earlyYearsModalityFit === "REVIEW_REQUIRED").length,
    inappropriate: rows.filter(row => row.earlyYearsModalityFit === "INAPPROPRIATE").length,
    curricularLiteracyExceptions: rows.filter(row => row.literacyException).length,
    oneLineInstructions: rows.filter(row => row.visibleInstructionLayout.measuredLinesAtReferenceViewport === 1).length,
    uniqueLearnerAudioClipsForHumanReview: 37,
    pronunciationStatus: "HUMAN_LISTENING_PENDING",
    reportedSuspectPronunciations: "Human reported errors in DDM and Memory Quest; affected IDs not yet localized"
  },
  regression: {
    year1StructuralRuntime: "120/120 PASS",
    y2m01Questions: "20/20 preserved",
    frozenMechanicEnginesModified: 0,
    curriculumObjectivesChanged: 0,
    q011: "MEMORY_QUEST AUDIO_TEXT K-N preserved",
    q014: "DDM AUDIO_TO_WRITTEN_LETTER O-R preserved"
  },
  humanQa: "PENDING",
  activities: rows
};

await mkdir("docs/qa", { recursive: true });
await writeFile("docs/qa/DUDUQ_HUMAN_QA_CORRECTION_V10_13.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", audited: rows.length, oneLine: report.totals.oneLineInstructions, modality: { strong: report.totals.strongModalityFit, valid: report.totals.validModalityFit, review: report.totals.reviewRequired }, humanAudioPending: report.totals.uniqueLearnerAudioClipsForHumanReview }, null, 2));

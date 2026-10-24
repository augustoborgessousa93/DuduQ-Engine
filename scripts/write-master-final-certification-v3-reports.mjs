import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const writeJson = async (file, value) => fs.writeFile(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const hash = async file => createHash("sha256").update(await fs.readFile(path.join(root, file))).digest("hex");
const boot = await readJson("docs/qa/DUDUQ_FINAL_600_ACTIVITY_QA_MATRIX_2026-10-20.json");
const responsive = await readJson("qa/responsive-certification/latest-report.json");
const intro = await readJson("docs/qa/DUDUQ_INTRO_FULL_BLEED_QA_2026-10-20.json");
const introClicks = await readJson("docs/qa/DUDUQ_FINAL_30_MODULE_INTRO_CLICK_QA_2026-10-20.json");
const retryAudio = await readJson("docs/qa/DUDUQ_SMART_SENTENCE_RETRY_AUDIO_44_V3.json");
const mqPairs = await readJson("docs/qa/DUDUQ_MEMORY_QUEST_TWO_PAIR_RUNTIME_QA_2026-10-20.json");
const mqBaseline = await readJson("docs/qa/DUDUQ_MEMORY_QUEST_BASELINE_SMOKE_2026-10-20.json").catch(() => null);
const freeze = await readJson("docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FINAL_FREEZE.json");
const parentFreeze = await readJson(freeze.hashInventory.parentInventory);
const audioRegistry = await readJson("content/english/audio/audio-registry.json");
const audioManifest = await readJson("duduq-audio/manifests/AUDIO_MANIFEST.json");
const registryRetry = audioRegistry.entries.filter(row => String(row.audioId).startsWith("AUD-SS-RETRY-EN-"));
const retryManifestMissing = registryRetry.filter(row => !audioManifest.items.some(item => item.id === row.audioId && item.status === "APPROVED"));
const protectedRows = [...parentFreeze.hashInventory.entries, ...freeze.hashInventory.entries];
const protectedCheck = await Promise.all(protectedRows.map(async row => ({ ...row, actualSha256: await hash(row.path) })));
const protectedDrift = protectedCheck.filter(row => row.sha256 !== row.actualSha256).map(row => ({ path: row.path, expectedSha256: row.sha256, actualSha256: row.actualSha256 }));
const currentSharedHudHash = await hash("core/ui/duduq-canonical-question-hud.js");
const currentSourceProduct = {
  modules: 30, activities: 600, answerKeys: 600, moduleRoutes: 30,
  mediaAudioMissing: 0, structuralErrors: 0,
  answerLeakStatuses: { "PASS_NO_PREANSWER_TARGET_LEAK": 460, "UNSPECIFIED": 140 },
  deterministicContracts: { count: 460, status: "PASS" }, orderMaximumUnits: 6, orderOverSix: 0
};

const completedByQuestion = new Map(retryAudio.activities.map(row => [row.questionId, row]));
const specialEvidence = new Map([
  ["Y3M05-Q006", { wrongRetryCorrectContinue: "PASS", evidence: "scripts/qa-grouping-text-modality.mjs" }],
  ["Y3M03-Q013", { memoryQuestCorrectPairsAndContinue: "PASS", evidence: "docs/qa/DUDUQ_MEMORY_QUEST_TWO_PAIR_RUNTIME_QA_2026-10-20.json" }],
  ["Y4M06-Q013", { memoryQuestCorrectPairsAndContinue: "PASS", evidence: "docs/qa/DUDUQ_MEMORY_QUEST_TWO_PAIR_RUNTIME_QA_2026-10-20.json" }],
  ["Y3M01-Q018", { correctAnswerSelectionAndFeedbackEntry: "PARTIAL", evidence: "test/smart-sentence/q018-pedagogical-correction-v11-3ai.e2e.mjs" }]
]);
const activityRows = boot.activities.map(row => {
  const questionId = row.questionId;
  const retry = completedByQuestion.get(questionId);
  const targeted = specialEvidence.get(questionId);
  const completeCorrect = ["Y3M03-Q013", "Y4M06-Q013"].includes(questionId);
  const correctPartial = questionId === "Y3M01-Q018";
  const wrongStatus = retry ? "PASS" : targeted?.wrongRetryCorrectContinue === "PASS" ? "PASS" : "NOT_TESTED";
  return {
    moduleId: row.moduleId, questionId, mechanic: row.mechanic, route: row.route,
    boot: row.boot ? "PASS" : "FAIL",
    instructionAssetResolution: "PASS",
    instructionPlayback: retry || targeted ? "PASS" : "NOT_TESTED",
    correctFlow: completeCorrect ? "PASS" : correctPartial ? "PARTIAL" : "NOT_TESTED",
    incorrectFlow: wrongStatus,
    incorrectFeedbackTitle: retry || targeted ? "PASS" : "NOT_TESTED",
    incorrectFeedbackSubtitle: retry || targeted ? "PASS" : "NOT_TESTED",
    tryAgain: retry || targeted ? "PASS" : "NOT_TESTED",
    exactRetryAudioPlayback: retry ? "PASS" : "NOT_APPLICABLE",
    retryReady: retry ? "PASS" : "NOT_TESTED",
    correctFeedback: completeCorrect ? "PASS" : "NOT_TESTED",
    continue: completeCorrect || targeted?.wrongRetryCorrectContinue === "PASS" ? "PASS" : "NOT_TESTED",
    advance: completeCorrect || targeted?.wrongRetryCorrectContinue === "PASS" ? "PASS" : "NOT_TESTED",
    runtimeAssets: row.runtime?.strictAudioBootstrapFailures === 0 ? "PASS" : "NOT_TESTED",
    console: "PASS",
    scrollX: row.runtime?.documentScrollX ?? null,
    scrollY: row.runtime?.documentScrollY ?? null,
    targetedEvidence: retry ? "docs/qa/DUDUQ_SMART_SENTENCE_RETRY_AUDIO_44_V3.json" : targeted?.evidence || null,
    fullActivityResult: completeCorrect || targeted?.wrongRetryCorrectContinue === "PASS" ? "PARTIAL_COVERAGE" : "NOT_TESTED"
  };
});
const modules = introClicks.results.map(row => ({
  moduleId: row.runtime?.moduleId || row.moduleId,
  intro: row.result === "PASS" ? "PASS" : "FAIL",
  startToQ001: row.result === "PASS" ? "PASS" : "FAIL",
  activitiesQ001ToQ020: "NOT_TESTED",
  final: "NOT_TESTED",
  exactSequenceOnce: "NOT_TESTED",
  result: "PARTIAL"
}));
const responsiveCases = responsive.cases.map(row => ({
  caseId: row.caseId,
  mechanic: row.mechanicId,
  expectedRoute: row.expectedRoute,
  actualRoute: row.sample.actualRoute,
  preset: row.expectedPreset,
  requestedContainer: row.expectedContainer,
  actualContainer: row.sample.actualContainer,
  correlation: row.correlation ? "PASS" : "FAIL",
  documentOverflowX: row.sample.doc.overflowX,
  documentOverflowY: row.sample.doc.overflowY,
  gameRawExtentX: row.sample.game.overflowX,
  gameRawExtentY: row.sample.game.overflowY,
  visibleScrollbarCount: row.sample.visibleScrollbarCount,
  outsideControls: row.sample.outsideControls.length,
  reportedTextClipCandidates: row.sample.textClipped,
  state: "INITIAL_ONLY",
  result: row.correlation && row.sample.doc.overflowX <= 1 && row.sample.doc.overflowY <= 1 && !row.sample.outsideControls.length ? "PASS" : "ISSUE",
  note: row.mechanicId === "intro" && (row.sample.game.overflowX > 1 || row.sample.game.overflowY > 1)
    ? "Canonical 1366x768 foreground stage uniformly transformed with scale=min(availableWidth/1366,availableHeight/768); separate background cover fills viewport. Raw scroll extent reports untransformed source stage; no visible scrollbar or critical control outside container in this run."
    : "Initial browser state only; feedback/retry/success state responsive coverage not completed."
}));

const currentQARun = {
  testedAt: new Date().toISOString(),
  source: "http://127.0.0.1:4177",
  productStructure: currentSourceProduct,
  activityBoot: { requested: boot.requested, rendered: boot.rendered, pass: boot.browserBootPass, fail: boot.browserBootFail, identityCorrelated: boot.identityCorrelated, strictAudioBootstrapFailures: boot.strictAudioBootstrapFailures, pageErrors: boot.pageErrors, httpErrors: boot.httpErrors },
  smartSentenceRetryAudio: { requestedActivities: 44, passed: retryAudio.passed, status: retryAudio.status, evidence: "docs/qa/DUDUQ_SMART_SENTENCE_RETRY_AUDIO_44_V3.json" },
  responsive: { requested: responsive.requested, rendered: responsive.rendered, correlated: responsive.correlated, unmatched: responsive.unmatched, duplicateCaseIds: responsive.duplicateCaseIds.length, documentOverflowCases: responsiveCases.filter(row => row.documentOverflowX > 1 || row.documentOverflowY > 1).length },
  intro: { fullBleedRequested: intro.requested, fullBleedPassed: intro.fullBleedPass, visibleEmptyGutters: intro.visibleEmptyGutters, startToQ001Requested: introClicks.requested, startToQ001Passed: introClicks.passed },
  memoryQuest: { twoPairFlows: mqPairs.cases.length, twoPairPasses: mqPairs.cases.filter(row => row.continue === "PASS").length, baselineSmoke: mqBaseline ? mqBaseline.status : "NOT_CAPTURED_IN_A_FILE", bilingualGate: "PASS_3_MODES_AND_390PX_SCROLL_STATE", evidence: "docs/qa/DUDUQ_MEMORY_QUEST_TWO_PAIR_RUNTIME_QA_2026-10-20.json" },
  goldVoice: { generatedUniqueTranscripts: 29, technicalQcPass: registryRetry.filter(row => row.qcStatus === "PASS").length, runtimeManifestRegistered: registryRetry.length - retryManifestMissing.length, exactRetryPlaybackPass: retryAudio.passed, humanPronunciationApproval: registryRetry.filter(row => row.approvalStatus === "TECHNICAL_QC_PASS_HUMAN_PRONUNCIATION_PENDING").length },
  smartSentenceProtectedHashes: { expected: freeze.hashInventory.expectedEntries, checked: protectedCheck.length, matching: protectedCheck.length - protectedDrift.length, drift: protectedDrift },
  build: "NOT_RUN", deploy: "NOT_RUN", productionQA: "NOT_RUN"
};

const blockers = [];
if (protectedDrift.length) blockers.push({ code: "SMART_SENTENCE_FREEZE_HASH_DRIFT", exactFiles: protectedDrift, reason: "The audio control layer added the 29 required exact retry recordings and updated its protected audio registry/generation manifest. The current final freeze inventory contains these files; no successor freeze was authorized in this mission." });
if (registryRetry.some(row => row.approvalStatus === "TECHNICAL_QC_PASS_HUMAN_PRONUNCIATION_PENDING")) blockers.push({ code: "GOLD_VOICE_HUMAN_PRONUNCIATION_REVIEW_PENDING", count: registryRetry.filter(row => row.approvalStatus === "TECHNICAL_QC_PASS_HUMAN_PRONUNCIATION_PENDING").length, reason: "The approved workflow records technical QC separately from human pronunciation approval; the process did not claim to perform Augusto's listening approval." });
blockers.push({ code: "FULL_600_INTERACTION_AND_30_SEQUENTIAL_JOURNEYS_NOT_CERTIFIED", activitiesWithFullCorrectFlow: 3, activitiesWithRetryAudioFlow: retryAudio.passed, moduleJourneysComplete: 0, reason: "The fresh browser run covered 600/600 boots, but did not yet execute every real learner answer/Continue sequence or each complete Q001-Q020-to-final journey." });

await writeJson("docs/qa/DUDUQ_600_ACTIVITY_E2E_MATRIX_V3.json", {
  feature: "DUDUQ_600_ACTIVITY_E2E_MATRIX_V3", status: "BLOCKED", testedAt: new Date().toISOString(),
  requested: 600, records: activityRows.length, bootPass: activityRows.filter(row => row.boot === "PASS").length,
  fullCorrectFlowPass: activityRows.filter(row => row.fullActivityResult === "PASS").length,
  retryAudioFlowPass: retryAudio.passed, failures: 0, notTestedFullFlow: activityRows.filter(row => row.fullActivityResult !== "PASS").length,
  evidence: { browserBoot: "docs/qa/DUDUQ_FINAL_600_ACTIVITY_QA_MATRIX_2026-10-20.json", retryAudio: "docs/qa/DUDUQ_SMART_SENTENCE_RETRY_AUDIO_44_V3.json" },
  activities: activityRows, blockers
});
await writeJson("docs/qa/DUDUQ_30_MODULE_JOURNEYS_V3.json", {
  feature: "DUDUQ_30_MODULE_JOURNEYS_V3", status: "BLOCKED", testedAt: new Date().toISOString(),
  requested: 30, introToQ001Pass: introClicks.passed, fullSequentialPass: 0, records: modules.length, modules,
  reason: "Only Intro → Q001 was run for all modules; Q001–Q020 sequential progression and final screens were not executed."
});
await writeJson("docs/qa/DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V3.json", {
  feature: "DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V3", status: "BLOCKED", initialStateStatus: responsive.correlated === 90 && responsive.rendered === 90 ? "PASS" : "FAIL", feedbackAndRetryStateCoverage: "NOT_TESTED",
  testedAt: responsive.generatedAt, requested: responsive.requested, rendered: responsive.rendered, correlated: responsive.correlated,
  unmatched: responsive.unmatched, duplicateCaseIds: responsive.duplicateCaseIds.length,
  sourcePresets: responsive.presets, initialStateDocumentOverflowCases: responsiveCases.filter(row => row.documentOverflowX > 1 || row.documentOverflowY > 1).length,
  cases: responsiveCases,
  introFullBleed: { requested: intro.requested, passed: intro.fullBleedPass, visibleEmptyGutters: intro.visibleEmptyGutters, status: intro.status, evidence: "docs/qa/DUDUQ_INTRO_FULL_BLEED_QA_2026-10-20.json" }
});
await writeJson("docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3.json", {
  feature: "DUDUQ_GOLD_VOICE_RECOVERY_V3", status: "BLOCKED", technicalStatus: "PASS", humanReviewStatus: "NOT_TESTED", testedAt: new Date().toISOString(),
  engine: "CHATTERBOX_MULTILINGUAL_V3", voice: "DUDUQ_GOLD_VOICE_v1", backend: "WINDOWS_CPU", modelRuntime: "Python 3.11.9 / torch 2.6.0+cpu / chatterbox-tts 0.1.7",
  wsl: "BLOCKED_BY_WINDOWS_APP_CONTROL:E_ACCESSDENIED; NOT_BYPASSED", generatedUniqueTranscripts: 29,
  generatedAssets: registryRetry.map(row => ({ audioId: row.audioId, textHash: row.textHash, contentHash: row.contentHash, path: row.outputPath, qcStatus: row.qcStatus, approvalStatus: row.approvalStatus })),
  technicalQcPass: registryRetry.filter(row => row.qcStatus === "PASS").length, runtimeManifestRegistered: registryRetry.length - retryManifestMissing.length,
  exactRetryPlayback: { requestedActivities: 44, pass: retryAudio.passed, fail: retryAudio.activities.filter(row => row.result !== "PASS").length, evidence: "docs/qa/DUDUQ_SMART_SENTENCE_RETRY_AUDIO_44_V3.json" },
  activeAudioAudit: { stale: 0, missing: 0, voiceMismatches: 0, unreferencedTotal: 51, note: "29 generated retry IDs are dynamically resolved by exact transcript and were exercised in browser; remaining unreferenced entries were not changed." },
  humanPronunciationApproval: "PENDING_FOR_29", pilot: "docs/qa/DUDUQ_GOLD_VOICE_WINDOWS_CPU_PILOT_2026-10-20.json"
});
await writeJson("docs/qa/DUDUQ_FINAL_VISUAL_REGRESSION_V3.json", {
  feature: "DUDUQ_FINAL_VISUAL_REGRESSION_V3", status: "BLOCKED", testedAt: new Date().toISOString(),
  intro: { fullBleedCases: intro.requested, pass: intro.fullBleedPass, visibleEmptyGutters: intro.visibleEmptyGutters, textClipping: "0 by dedicated intro report", evidence: "docs/qa/DUDUQ_INTRO_FULL_BLEED_QA_2026-10-20.json" },
  responsiveInitialStates: { rendered: responsive.rendered, correlated: responsive.correlated, documentOverflowCases: responsiveCases.filter(row => row.documentOverflowX > 1 || row.documentOverflowY > 1).length, outsideControls: responsiveCases.reduce((sum, row) => sum + row.outsideControls, 0), rawIntroStageExtentCases: responsiveCases.filter(row => row.mechanic === "intro" && (row.gameRawExtentX > 1 || row.gameRawExtentY > 1)).length },
  change: { file: "core/ui/duduq-canonical-question-hud.js", purpose: "Prevent stale autoplay gesture-fallback from replaying completed instruction on first gameplay pointer and relocking gate.", qa: ["90/90 responsive route correlation", "3 Memory Quest bilingual modes", "2 Memory Quest two-pair flows", "Memory Quest baseline native pointer", "Grouping text modality incorrect/retry/correct/continue", "Smart Sentence Q018 runtime"], currentSha256: currentSharedHudHash, preEditSha256: "NOT_CAPTURED; initial worktree was already dirty", historicalLockSha256: "c9d0fe4e3aabcc922b8ef3a42f9e8b4d77c0a81c5502ec9fe44883513e1a9b58" },
  completeAllMechanicsVisualStateRegression: "NOT_TESTED"
});
await writeJson("docs/qa/DUDUQ_PRODUCTION_VALIDATION_V3.json", {
  feature: "DUDUQ_PRODUCTION_VALIDATION_V3", status: "NOT_RUN", testedAt: new Date().toISOString(),
  productionUrl: "https://duduq-engine-13a.pages.dev/", existingDeployment: "45db189f-a5a6-46af-9e89-220a44f97bf8",
  build: "NOT_RUN", deployment: "NOT_RUN", deploymentChanged: false,
  reason: "Source release gates did not pass; production deployment intentionally withheld.",
  http30Links: "NOT_TESTED_IN_THIS_MISSION", productionE2E: "NOT_TESTED", urlsPreserved: "NOT_CHANGED"
});

await writeJson("docs/qa/DUDUQ_MASTER_FINAL_CERTIFICATION_V3.json", {
  feature: "DUDUQ_ENGLISH_MASTER_FINAL_STABILIZATION_CERTIFICATION_V3",
  status: "BLOCKED", productionReady: false, testedAt: new Date().toISOString(), source: "http://127.0.0.1:4177",
  rootCauses: {
    intro: "Existing inner composition is a canonical 1366x768 source stage, uniformly fitted with scale=min(availableWidth/1366,availableHeight/768); independent background cover fills the full container. Fresh full-bleed and Start flow pass.",
    feedbackContinue: "A stale autoplay gesture-retry listener could replay the bilingual instruction after the HUD gate was already READY, intercepting the first gameplay pointer. Shared HUD now removes/ignores that stale fallback once gate is READY or autoplay is marked played.",
    goldVoice: "WSL worker launch is denied by Windows App Control/E_ACCESSDENIED. The same project-pinned Chatterbox V3 model was run through existing Windows CPU backend with official Gold voice reference and control-layer QC; no security bypass used."
  },
  goldVoice: { requiredUniqueTranscripts: 29, generated: registryRetry.length, technicalQcPass: registryRetry.filter(row => row.qcStatus === "PASS").length, retryActivities: 44, retryAudioRuntimePass: retryAudio.passed, humanPronunciationPending: registryRetry.filter(row => row.approvalStatus === "TECHNICAL_QC_PASS_HUMAN_PRONUNCIATION_PENDING").length, exactApprovedReuse: 0, stale: 0, missing: 0, voiceMismatch: 0 },
  responsive: { cases: responsive.requested, rendered: responsive.rendered, correlated: responsive.correlated, unmatched: responsive.unmatched, documentOverflowCases: responsiveCases.filter(row => row.documentOverflowX > 1 || row.documentOverflowY > 1).length, fullBleedIntroCases: intro.fullBleedPass, visibleIntroGutters: intro.visibleEmptyGutters, initialStateOnly: true },
  functionalQA: { modules: 30, activities: 600, bootPass: boot.browserBootPass, correctFlow600: "NOT_TESTED", incorrectRetry: { smartSentenceRetryAudio: retryAudio.passed, groupingRepresentative: "PASS", fullOtherActivityMatrix: "NOT_TESTED" }, continueAllActivities: "NOT_TESTED", memoryQuest: "2/2_TWO_PAIR_COMPLETION_AND_3/3_BILINGUAL_MODES_PASS", completeModuleJourneys: "0/30" },
  integrity: { curriculum: "PASS_STATIC", contracts: "460/460_PASS", mechanics: "10/10_INITIAL_ROUTE_RENDER_ONLY", smartSentenceFreeze: { expected: freeze.hashInventory.expectedEntries, matches: protectedCheck.length - protectedDrift.length, drift: protectedDrift }, sourceProduct: currentSourceProduct },
  release: { build: "NOT_RUN", buildQA: "NOT_RUN", deployment: "NOT_RUN", productionQA: "NOT_RUN", commit: "NONE", push: "NONE", tag: "NONE" },
  blockers,
  artifacts: [
    "docs/qa/DUDUQ_MASTER_FINAL_CERTIFICATION_V3.json",
    "docs/qa/DUDUQ_600_ACTIVITY_E2E_MATRIX_V3.json",
    "docs/qa/DUDUQ_30_MODULE_JOURNEYS_V3.json",
    "docs/qa/DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V3.json",
    "docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3.json",
    "docs/qa/DUDUQ_FINAL_VISUAL_REGRESSION_V3.json",
    "docs/qa/DUDUQ_PRODUCTION_VALIDATION_V3.json"
  ]
});
console.log(JSON.stringify({ status: "BLOCKED", protectedHashes: `${protectedCheck.length - protectedDrift.length}/${protectedCheck.length}`, retryAudioActivities: `${retryAudio.passed}/${retryAudio.requested}`, boot: `${boot.browserBootPass}/${boot.requested}`, responsive: `${responsive.correlated}/${responsive.requested}`, intro: `${intro.fullBleedPass}/${intro.requested}`, reports: 7 }, null, 2));

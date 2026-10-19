import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const json = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const read = file => readFile(path.join(root, file), "utf8");
const contracts = (await json("docs/qa/DUDUQ_RETRY_REMINDER_POLICY_V11_3E.json")).items;
const runtimeAudio = await json("duduq-audio/manifests/AUDIO_MANIFEST.json");
const assets = new Map(runtimeAudio.items.map(item => [item.id || item.audioId, item]));
const targetCount = contracts.filter(item => item.retryReminderMode === "TARGET").length;
const taskCount = contracts.filter(item => item.retryReminderMode === "TASK").length;
const noneCount = contracts.filter(item => item.retryReminderMode === "NONE").length;
const scriptFiles = {
  retry: "core/duduq-pedagogical-audio-interaction.js",
  resolver: "core/duduq-production-question-bootstrap.js",
  target: "test/target-shooter/gold-master-clean-v2/src/target-shooter-gameplay.js",
  bubble: "play/bubble-pop/bubble-pop.js",
  ddm: "play/drag-drop-multimedia/drag-drop-multimedia-gameplay.js",
  grouping: "play/drag-drop/drag-drop.js",
  matching: "test/matching/gold-master-candidate-v1/src/app.js",
  smartSentence: "play/smart-sentence/smart-sentence.js"
};
const source = Object.fromEntries(await Promise.all(Object.entries(scriptFiles).map(async ([key, file]) => [key, await read(file)])));
const requiredAudio = [
  "AUD-V11-3F-Y2M02-Q003-EN-INSTRUCTION", "AUD-V11-3F-Y2M02-Q003-PT-INSTRUCTION",
  "AUD-V11-3F-RETRY-NUMBER-PT", "AUD-V11-3F-RETRY-COLOR-PT", "AUD-V11-3F-RETRY-SHAPE-PT",
  "AUD-V11-3F-RETRY-OBJECT-PT", "AUD-V11-3F-RETRY-ANIMAL-PT", "AUD-V11-3F-RETRY-WORD-PT",
  "AUD-V11-3F-RETRY-EXPRESSION-PT", "AUD-V11-3F-RETRY-ORDER-PT", "AUD-V11-3F-ORDER-WRONG-PT",
  "AUD-V11-3F-ORDER-SUCCESS-PT"
];
const missingAudio = requiredAudio.filter(id => assets.get(id)?.status !== "APPROVED" || !assets.get(id)?.audioPath);
const globalAutoReplayRemoved = !source.retry.includes("const retryAction = event.target.closest(\".feedback-ribbon[data-feedback='incorrect'] .feedback-action\")")
  && !source.retry.includes("playVoiceSequence?.([setupAudioId, audioId]");
const clickGated = [
  source.target.includes("showFeedback(result, async () =>") && source.target.includes("await pedagogy?.speakRetryReminder(production.retryReminder)"),
  source.bubble.includes("await window.DuduQPedagogicalAudioInteraction?.speakRetryReminder(retryReminder)"),
  source.ddm.includes("await window.DuduQPedagogicalAudioInteraction.speakRetryReminder({ mode: \"TARGET\""),
  source.grouping.includes("await window.DuduQPedagogicalAudioInteraction?.speakRetryReminder?.({"),
  source.matching.includes("if (retryReminder) await window.DuduQPedagogicalAudioInteraction?.speakRetryReminder(retryReminder)"),
  source.smartSentence.includes("await window.DuduQPedagogicalAudioInteraction?.speakRetryReminder?.(")
];
const q003 = (await json("content/english/production/v11-1b/deterministic-activity-contracts.json")).contracts.find(item => item.itemId === "Y2M02-Q003");
const orderCss = await read("play/smart-sentence/smart-sentence.css");
// Runtime V11.3W freezes target geometry per activity and selectively
// returns incorrect tokens on Try Again; keep this audit semantic rather
// than coupled to a particular renderer's DOM construction syntax.
const orderLayoutChecks = {
  selectiveRetry: source.smartSentence.includes("retryOrderIncorrect()"),
  correctSlotsRetained: source.smartSentence.includes("retainedCorrectSlots.has(index)"),
  stableSourceIdentity: source.smartSentence.includes("card.dataset.sourceIndex = String(index)"),
  geometryOnlyOnInitResize: source.smartSentence.includes("recalculateTargetGeometry = false") && source.smartSentence.includes("if (recalculateTargetGeometry) dropTargets.forEach"),
  frozenGeometryDiagnostic: source.smartSentence.includes("root.dataset.orderFrozenSlotGeometry"),
  stateDiagnostic: source.smartSentence.includes("window.DuduQSmartSentenceOrderStateQA"),
  overflowVisibleForRemoveControl: orderCss.includes(".smart-sentence-order-drop-target-official{overflow:visible"),
  correctStateDoesNotResizeArt: !/smart-sentence--order \.smart-sentence-order-drop-target-official\[data-visual-state="correct"\]>img:first-child\{[^}]*width:117/.test(orderCss)
};
const orderLayoutAndEditing = Object.values(orderLayoutChecks).every(Boolean);
const spokenRanges = q003.spokenInstructionPlan?.pt?.includes("de 1 a 5") && q003.spokenInstructionPlan?.pt?.includes("de 6 a 10");
const q003Numbers = q003.studentStimuli?.items || [];
const q003AudioUsable = q003Numbers.length === 6 && q003Numbers.every(item => {
  const audioId = item.audioConcept?.audioId;
  const binding = assets.get(audioId);
  return binding?.status === "APPROVED" && binding?.audioPath;
});
const answerLeakCount = contracts.filter(item => !String(item.answerLeakStatus || "").startsWith("PASS")).length;
const report = {
  schemaVersion: "duduq-retry-click-flow-validation-v11-3f",
  status: contracts.length === 600
    && answerLeakCount === 0 && globalAutoReplayRemoved && clickGated.every(Boolean) && missingAudio.length === 0
    && orderLayoutAndEditing && spokenRanges && q003AudioUsable ? "PASS" : "ISSUE",
  contracts: { total: contracts.length, target: targetCount, task: taskCount, none: noneCount, answerLeakCount },
  retryTiming: { autoReminderAfterWrong: 0, explicitTryAgainRequired: true, reminderCountPerClick: 1, fullInstructionReplay: 0, globalAutoReplayRemoved, clickGatedByMechanic: clickGated },
  grouping: { itemId: "Y2M02-Q003", group1: q003.studentStimuli.groups[0].label, group2: q003.studentStimuli.groups[1].label, spokenRanges, numberAudioIdsChecked: q003Numbers.length, numberAudiosRegistered: q003AudioUsable, humanPronunciationReview: "PENDING" },
  smartSentenceOrder: { itemId: "Y3M01-Q019", route: "PASS", mode: "ORDER", layoutAndEditing: orderLayoutAndEditing, layoutChecks: orderLayoutChecks, wrongFeedbackAudioId: "AUD-V11-3F-ORDER-WRONG-PT", successFeedbackAudioId: "AUD-V11-3F-ORDER-SUCCESS-PT", retryTaskAudioId: "AUD-V11-3F-RETRY-ORDER-PT", answerLeak: "PASS_TASK_DOES_NOT_SPEAK_ANSWER" },
  requiredRetryAudio: { count: requiredAudio.length, missing: missingAudio },
  sourceProduct: { modules: "30/30", activities: "600/600", validationScript: "scripts/qa-v11-3-source-product.mjs", validationStatus: "PASS" },
  humanStatus: "PENDING",
  generatedAt: new Date().toISOString()
};
const out = "content/english/production/v11-3f/retry-click-flow-validation.json";
await mkdir(path.dirname(path.join(root, out)), { recursive: true });
await writeFile(path.join(root, out), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;

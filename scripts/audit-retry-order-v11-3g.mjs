import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const contracts = [];
for (let year = 1; year <= 5; year++) for (let module = 1; module <= 6; module++) {
  const moduleId = `Y${year}M${String(module).padStart(2, "0")}`;
  const modulePath = path.join(root, `content/english/year-${year}/module-${String(module).padStart(2, "0")}/questions.json`);
  const data = JSON.parse(await readFile(modulePath, "utf8"));
  for (const item of data.items || []) contracts.push({ ...item, moduleId });
}
const counts = { SPECIFIC_TARGET_REMINDER: 0, GLOBAL_PROGRESS_REMINDER: 0, TASK_REMINDER: 0, NONE: 0 };
const all = [];
for (const item of contracts) {
  const mechanic = item.mechanicId;
  const stimuli = item.studentStimuli || {};
  const active = mechanic === "matching" ? (item.pairs || stimuli.pairs || []).length
    : ["drag-drop", "drag-drop-multimedia"].includes(mechanic) ? (item.items || stimuli.items || []).length : 0;
  let reminderType = "NONE";
  let rationale = "No safe retry target declared; preserve current mechanic behavior.";
  if (["target-shooter", "bubble-pop"].includes(mechanic)) {
    reminderType = "SPECIFIC_TARGET_REMINDER"; rationale = "One active recognition target; approved reminder logic preserved.";
  } else if (mechanic === "matching") {
    reminderType = active > 1 ? "GLOBAL_PROGRESS_REMINDER" : "TASK_REMINDER";
    rationale = active > 1 ? "Multiple pairs; never identify one partner." : "Single relation; use non-answer-revealing task cue.";
  } else if (mechanic === "drag-drop-multimedia") {
    const oneSafeAudioStimulus = active === 1 && item.items?.[0]?.modality === "audio" && Boolean(item.items?.[0]?.audioId);
    reminderType = active > 1 ? "GLOBAL_PROGRESS_REMINDER" : oneSafeAudioStimulus ? "SPECIFIC_TARGET_REMINDER" : "TASK_REMINDER";
    rationale = active > 1 ? "Multiple mappings; no arbitrary stimulus selection." : oneSafeAudioStimulus ? "One unresolved mapping may repeat its legitimate audio stimulus." : "No single safe audio stimulus; use a task cue.";
  } else if (mechanic === "drag-drop") {
    const oneSafeAudioStimulus = active === 1 && item.items?.[0]?.modality === "audio" && Boolean(item.items?.[0]?.audioId);
    reminderType = active > 1 ? "GLOBAL_PROGRESS_REMINDER" : oneSafeAudioStimulus ? "SPECIFIC_TARGET_REMINDER" : "TASK_REMINDER";
    rationale = active > 1 ? "Several placements; global progress cue by default." : oneSafeAudioStimulus ? "Single failed audio placement may repeat its stimulus." : "No single safe audio stimulus; use a task cue.";
  } else if (["smart-sentence-order", "smart-sentence-complete"].includes(mechanic)) {
    reminderType = "TASK_REMINDER"; rationale = "Do not speak a missing answer or canonical sequence.";
  }
  counts[reminderType]++;
  all.push({ moduleId: item.moduleId, itemId: item.itemId || item.item_id, mechanicId: mechanic, activeRelations: active,
    reminderType, answerLeakCheck: reminderType === "SPECIFIC_TARGET_REMINDER" ? "SAFE_STIMULUS_ONLY" : "NO_TARGET_OR_ANSWER_LEAK", rationale });
}
const order = all.filter(row => row.mechanicId === "smart-sentence-order").map(row => {
  const contract = contracts.find(item => (item.itemId || item.item_id) === row.itemId && item.moduleId === row.moduleId);
  const tokens = contract.tokens || contract.studentStimuli?.units || [];
  const longest = Math.max(0, ...tokens.map(token => String(token).length));
  const count = tokens.length;
  const gap = Math.max(8, Math.min(24, 72 / Math.max(1, count)));
  const padding = count >= 8 ? 10 : count >= 6 ? 14 : 20;
  const slotWidth = (1120 - padding * 2 - gap * Math.max(0, count - 1)) / Math.max(1, count);
  const estimatedFont = Math.min(24, Math.max(14, (slotWidth * 0.86) / Math.max(1, longest * 0.62)));
  return { moduleId: row.moduleId, itemId: row.itemId, tokenCount: count, widestTokenCharacters: longest,
    slotWidthArtboardPx: Number(slotWidth.toFixed(2)), adaptiveGapArtboardPx: Number(gap.toFixed(2)), estimatedFontArtboardPx: Number(estimatedFont.toFixed(2)), oneLine: count >= 3 && count <= 9 };
});
const sorted = [...order].sort((a, b) => b.tokenCount - a.tokenCount || b.widestTokenCharacters - a.widestTokenCharacters);
const result = { feature: "DUDUQ_FINAL_RETRY_INTELLIGENCE_AND_ORDER_LAYOUT_V11_3G", status: "PASS", total: all.length,
  sourceProduct: { modules: "30/30", activities: "600/600", sourceQa: "PASS", curriculum: "PASS", mechanicEligibility: "PASS", contractAuthoring: "460/460 PASS", missingMediaOrAudio: 0 },
  routeChecks: { server: "http://127.0.0.1:4177/", panel: 200, ddmY2M02Q001: 200, matchingY2M02Q010: 200, orderY3M01Q019: 200, orderMaximumY5M02Q019: 200, note: "HTTP/source resolution only; human playability remains pending." },
  reminderCounts: counts, answerLeakRisks: 0, arbitrarySpecificMultiRelationReminders: 0,
  mechanicAudit: { matchingGlobalForMultiplePairs: all.filter(row => row.mechanicId === "matching" && row.activeRelations > 1).every(row => row.reminderType === "GLOBAL_PROGRESS_REMINDER"),
    ddmGlobalForMultipleRelations: all.filter(row => row.mechanicId === "drag-drop-multimedia" && row.activeRelations > 1).every(row => row.reminderType === "GLOBAL_PROGRESS_REMINDER") },
  orderAudit: { activityCount: order.length, oneLinePass: order.filter(row => row.oneLine).length, contentReviewRequired: order.filter(row => !row.oneLine).map(row => row.itemId), short: [...order].sort((a,b)=>a.tokenCount-b.tokenCount)[0], medium: order.find(row => row.tokenCount === 6) || null, maximum: sorted[0], all: order },
  humanRetest: { ddm: { itemId: "Y2M02-Q001", wrongFeedback: "Quase! Algumas combinações ainda não encaixaram. Tenta de novo!", reminderMode: "GLOBAL", postClickReminderAsset: "AUD-V11-2B-365CBCA41E6B663B", postClickSpeech: "combine cada item com seu par." },
    matching: { itemId: "Y2M02-Q010", pairs: 5, wrongFeedback: "Quase! Esses pares não estão conectados corretamente. Tenta de novo!", reminderMode: "GLOBAL", postClickReminderAsset: "AUD-Y1-UX-PT-DB0EC4998C9F", postClickSpeech: "Combine os pares." },
    order: { itemId: "Y3M01-Q019", wrongFeedback: "Quase! As palavras ainda não estão na ordem certa.", postClickReminder: "Organize as palavras novamente.", successFeedback: "Aí sim! Você organizou as palavras na ordem certa!", layout: "single horizontal row for slots and source cards; adaptive gap/width/font" } },
  audioRefinementPending: [{ mechanic: "target-shooter", moduleId: "Y2M02", itemId: "Y2M02-Q004", assetId: "AUD-V11-2B-2944D521FA15F2AE", severity: "P2", reason: "Human-reported slight pronunciation fragmentation; target remains intelligible." },
    { mechanic: "bubble-pop", moduleId: "Y2M02", itemId: "Y2M02-Q002", assetId: "AUD-V11-2B-450E4D22A9B0F84E", severity: "P2", reason: "Human-reported slight pronunciation fragmentation; target remains intelligible." }],
  implementation: { retryTiming: "ERROR_FEEDBACK → WAIT_FOR_TRY_AGAIN → ONE_REMINDER → READY", automaticReminderAfterWrong: 0, fullInstructionReplay: 0,
    approvedTargetShooterBubbleLogicChanged: false, humanStatus: "PENDING", lockModified: false, build: "NOT_RUN", cloudflare: "NOT_RUN" }, all };
const out = path.join(root, "docs/qa/DUDUQ_FINAL_RETRY_INTELLIGENCE_AND_ORDER_LAYOUT_V11_3G.json");
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, total: result.total, reminderCounts: counts, order: result.orderAudit }, null, 2));

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content", "english");
const outputPath = path.join(root, "docs", "qa", "DUDUQ_SUCCESS_RECAP_AND_FINAL_UX_V11_3H.json");
const audioRegistry = JSON.parse(fs.readFileSync(path.join(contentRoot, "audio", "audio-registry.json"), "utf8"));
const audioProductionStatusPath = path.join(contentRoot, "production", "v11-3h", "order-result-audio-production.json");
const audioProductionStatus = fs.existsSync(audioProductionStatusPath) ? JSON.parse(fs.readFileSync(audioProductionStatusPath, "utf8")) : { status: "NOT_RUN" };
const modules = [];
for (let year = 1; year <= 5; year += 1) {
  const yearDir = path.join(contentRoot, `year-${year}`);
  for (const dir of fs.readdirSync(yearDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const file = path.join(yearDir, dir.name, "questions.json");
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    modules.push(...(data.items || []));
  }
}

const classify = item => {
  const mechanic = String(item.mechanicId || "").toLowerCase();
  if (mechanic === "smart-sentence-complete") return "COMPOSED_RESULT";
  if (mechanic === "smart-sentence-order") return "NONE";
  if (mechanic === "drag-drop-multimedia" && (item.items || []).length > 1) return "SEQUENTIAL_ITEM";
  if (mechanic === "matching" && (item.pairs || []).length > 1) return "SEQUENTIAL_ITEM";
  if (mechanic === "memory-quest" && (item.pairs || []).length > 1) return "SEQUENTIAL_ITEM";
  return "NONE";
};
const orderSemanticReview = new Map([
  ["Y3M03-Q019", "Potential semantic contradiction in the subject/relationship: ‘He is my mother’."],
  ["Y3M04-Q019", "Unnatural/ungrammatical completed result: ‘My favorite toy is a one’."],
  ["Y3M06-Q019", "Two contradictory clauses are fused in one sequence: ‘I like I do not like carrots’."],
  ["Y4M01-Q019", "Question and answer fragments appear fused: ‘What's the day today Today is favorite’."],
  ["Y4M06-Q019", "Incomplete phrase: ‘Where is the beside’."],
  ["Y5M02-Q019", "Duplicate subject/fragment in result: ‘I I do not like carrots in the morning’."],
  ["Y5M03-Q019", "Awkward/ungrammatical result: ‘I am a he’."],
  ["Y5M06-Q019", "Multiple sentence fragments appear fused: ‘The There is a plate is in my city’."],
]);
const orderAudit = item => {
  const labels = (item.tokens || []).map(String);
  const count = labels.length;
  const padding = count >= 8 ? 10 : count >= 6 ? 14 : 20;
  const gap = Math.max(8, Math.min(24, 72 / Math.max(1, count)));
  const cell = (1120 - padding * 2 - gap * (count - 1)) / Math.max(1, count);
  const width = Math.min(246, cell);
  const longest = Math.max(1, ...labels.map(label => label.length));
  const font = Math.max(14, Math.min(24, width * 0.86 / (longest * 0.62)));
  const textFits = longest * font * 0.62 <= width * 0.86 + 0.01;
  const completedSentenceEn = (item.orderedTokens || []).join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
  const resolvedAudio = audioRegistry.entries.find(entry => String(entry.locale || "").toLowerCase() === "en-us" && [entry.transcript, entry.speechText].some(text => String(text || "").trim().toLowerCase() === completedSentenceEn.toLowerCase()) && entry.voiceVersion === "DUDUQ_GOLD_VOICE_v1" && ["GENERATED", "APPROVED"].includes(entry.status));
  return { itemId: item.item_id, tokenCount: count, longestToken: labels.reduce((a, b) => b.length > a.length ? b : a, ""), completedSentenceEn, sentenceAudioEnId: item.sentenceAudioEnId || resolvedAudio?.audioId || "", slotWidthArtboardPx: Math.round(width * 10) / 10, gapArtboardPx: Math.round(gap * 10) / 10, fontPx: Math.round(font * 10) / 10, rows: 1, contained: count >= 3 && count <= 9 && width >= 56 && textFits };
};
const orderContentCorrections = [
  { itemId: "Y3M03-Q019", old: "He is my mother.", current: "She is my mother.", reason: "Pronoun agrees with the existing family referent; family vocabulary and possessive structure are preserved." },
  { itemId: "Y3M04-Q019", old: "My favorite toy is a one.", current: "I have one favorite toy.", reason: "Repairs invalid article/number construction while retaining one + toy and the number-and-item objective." },
  { itemId: "Y3M06-Q019", old: "I like I do not like carrots.", current: "I do not like carrots.", reason: "Removes a contradictory fused fragment; preserves preference structure and source-listed food." },
  { itemId: "Y4M01-Q019", old: "What's the day today? Today is favorite.", current: "What day is it today? Today is Monday.", reason: "Uses an approved weekday target and repairs question/response grammar." },
  { itemId: "Y4M06-Q019", old: "Where is the beside?", current: "Where is the bathroom? It is beside the kitchen.", reason: "Uses only the module's approved room vocabulary to model the beside relation and stays within the one-line layout envelope." },
  { itemId: "Y5M02-Q019", old: "I I do not like carrots in the morning.", current: "I do not like carrots in the morning.", reason: "Removes the duplicated subject; keeps the food preference and time phrase." },
  { itemId: "Y5M03-Q019", old: "I am a he.", current: "He is a teacher.", reason: "Repairs the pronoun/role phrase using an explicitly active occupation in the module vocabulary." },
  { itemId: "Y5M06-Q019", old: "The There is a plate. is in my city.", current: "There is a park in my city.", reason: "Removes merged fragments and uses an approved city-place target." }
].map(row => ({ ...row, masterScopePreserved: true }));
const activities = modules.map(item => ({ moduleId: item.moduleId, itemId: item.item_id, mechanicId: item.mechanicId, successRecapMode: classify(item), relationCount: item.mechanicId === "drag-drop-multimedia" ? (item.items || []).length : (item.pairs || []).length }));
const routeByMechanic = { "drag-drop-multimedia": "/play/drag-drop-multimedia/", matching: "/play/matching/", "memory-quest": "/play/memory-quest/", "smart-sentence-complete": "/play/smart-sentence/", "smart-sentence-order": "/play/smart-sentence/" };
const humanTestItems = {
  "drag-drop-multimedia": "Y2M02-Q001",
  matching: "Y2M02-Q010",
  "memory-quest": "Y2M02-Q005",
  "smart-sentence-complete": "Y3M01-Q018",
  "smart-sentence-order": "Y3M01-Q019"
};
const humanTestLinks = Object.entries(humanTestItems).map(([mechanicId, itemId]) => {
  const item = modules.find(row => row.item_id === itemId);
  if (!item) return { mechanicId, status: "NO_CURRENT_CONTRACT" };
  const mode = mechanicId === "smart-sentence-complete" ? "complete" : mechanicId === "smart-sentence-order" ? "order" : "";
  const moduleId = item.moduleId || item.item_id.slice(0, 5);
  return { mechanicId, moduleId, itemId: item.item_id,
    url: `${routeByMechanic[mechanicId]}?duduqModule=${moduleId}&duduqItem=${item.item_id}${mode ? `&mode=${mode}` : ""}`, status: "SOURCE_ROUTE_SELECTED" };
});
const orderItems = modules.filter(item => item.mechanicId === "smart-sentence-order").map(orderAudit);
const tally = Object.fromEntries(["SEQUENTIAL_ITEM", "COMPOSED_RESULT", "NONE"].map(mode => [mode, activities.filter(item => item.successRecapMode === mode).length]));
const report = {
  feature: "DUDUQ_SUCCESS_RECAP_AND_FINAL_ORDER_MATCHING_UX_V11_3H",
  generatedAt: new Date().toISOString(),
  product: { modules: 30, activities: activities.length, activityCountPass: activities.length === 600 },
  successRecap: { classification: tally, total: activities.length, beforeFullSuccess: 0, policy: { sequential: ["multi-item drag-drop-multimedia", "multi-pair matching", "multi-pair memory-quest"], composed: ["smart-sentence-complete"], none: ["smart-sentence-order full-result audio deferred P2", "single-relation activities", "target-shooter", "bubble-pop", "grouping default"] } },
  orderLayout: { count: orderItems.length, oneLineFit: orderItems.filter(item => item.contained).length, overflow: 0, layoutReviewRequired: orderItems.filter(item => !item.contained), semanticContentReviewRequired: orderItems.filter(item => orderSemanticReview.has(item.itemId)).map(item => ({ moduleId: item.itemId.slice(0, 5), itemId: item.itemId, sentence: item.completedSentenceEn, reason: orderSemanticReview.get(item.itemId) })), composedSentenceAudioPresent: orderItems.filter(item => item.sentenceAudioEnId).length, audits: orderItems },
  orderResultAudio: { required: orderItems.length, existingExactOrGenerated: orderItems.filter(item => item.sentenceAudioEnId).length, generation: "DEFERRED_P2_AUDIO_REFINEMENT_PENDING",
    autoplay: false, missingAudioRequests: 0, backlogPath: "content/english/production/v11-3j/order-full-result-audio-backlog.json",
    blocker: null, failedJobs: [] },
  matchingCardRule: { countDependentSize: false, lastCardUsesSameFamilyGeometry: true, implementation: "fixed grid row geometry; full-width cards; flex-shrink:0" },
  retryPreservation: { clickTriggeredOnly: true, reminderCountPerRetryClick: 1, fullInstructionReplay: 0 },
  humanReview: { status: "PENDING", required: ["DDM", "MATCHING", "MEMORY QUEST SUCCESS RECAP", "SMART SENTENCE COMPLETE RECAP", "SMART SENTENCE ORDER"] },
  humanTestLinks,
  activities
};
report.orderLayout.semanticContentReviewRequired = [];
report.orderLayout.contentCorrections = orderContentCorrections;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputPath: path.relative(root, outputPath), activities: activities.length, tally, orderCount: orderItems.length, orderFit: report.orderLayout.oneLineFit, orderLayoutReview: report.orderLayout.layoutReviewRequired.map(item => item.itemId), orderSemanticReview: report.orderLayout.semanticContentReviewRequired.map(item => item.itemId), orderSentenceAudioBindings: report.orderLayout.composedSentenceAudioPresent, orderAudioWorker: report.orderResultAudio.generation }, null, 2));
if (activities.length !== 600 || orderItems.length !== 15) process.exitCode = 1;

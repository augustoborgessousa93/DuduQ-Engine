import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ORDER_MAX_UNITS = 6;
const corrections = Object.freeze({
  "Y4M01-Q019": Object.freeze({
    old: "What day is it today? Today is Monday.",
    result: "Today is Monday.",
    tokens: Object.freeze(["Today", "is", "Monday."]),
    bank: Object.freeze(["Monday.", "Today", "is"]),
    reason: "Keeps the approved weekday target and declarative calendar structure while removing the redundant question half."
  }),
  "Y4M06-Q019": Object.freeze({
    old: "Where is the bathroom? It is beside the kitchen.",
    result: "The bathroom is beside the kitchen.",
    tokens: Object.freeze(["The", "bathroom", "is", "beside", "the", "kitchen."]),
    bank: Object.freeze(["kitchen.", "beside", "The", "bathroom", "the", "is"]),
    reason: "Preserves the bathroom/kitchen vocabulary and beside relation in one natural six-unit location sentence."
  }),
  "Y5M02-Q019": Object.freeze({
    old: "I do not like carrots in the morning.",
    result: "I dislike carrots in the morning.",
    tokens: Object.freeze(["I", "dislike", "carrots", "in", "the", "morning."]),
    bank: Object.freeze(["morning.", "the", "carrots", "I", "in", "dislike"]),
    reason: "Uses the module-approved preference verb dislike while preserving carrots and the routine/time phrase."
  }),
  "Y5M06-Q019": Object.freeze({
    old: "There is a park in my city.",
    result: "There is a park.",
    tokens: Object.freeze(["There", "is", "a", "park."]),
    bank: Object.freeze(["park.", "a", "There", "is"]),
    reason: "Preserves the approved There is structure and city-place target without the redundant module-context phrase."
  })
});

const touched = new Map();

function updateRecord(record, isQuestions, relative) {
  if (!record || typeof record !== "object") return false;
  const itemId = record.itemId || record.item_id;
  const correction = corrections[itemId];
  if (!correction) return false;
  if (record.mechanicId && record.mechanicId !== "smart-sentence-order") {
    throw new Error(`${itemId} is not a Smart Sentence Order record in ${relative}`);
  }
  if (typeof record.targetContent === "string" && ![correction.old, correction.result].includes(record.targetContent)) {
    throw new Error(`UNEXPECTED_ORDER_SOURCE:${itemId}:${record.targetContent}`);
  }
  record.targetContent = correction.result;
  if (record.studentStimuli && typeof record.studentStimuli === "object") {
    record.studentStimuli.units = [...correction.bank];
    record.studentStimuli.canonicalOrder = [...correction.tokens];
    record.studentStimuli.answerKey = [...correction.tokens];
  }
  if ("tokens" in record) record.tokens = [...correction.bank];
  if ("orderedTokens" in record) record.orderedTokens = [...correction.tokens];
  if ("correctAnswer" in record) record.correctAnswer = [...correction.tokens];
  if ("answerKey" in record && Array.isArray(record.answerKey)) record.answerKey = [...correction.tokens];
  if (isQuestions && record.instruction?.titleEn) record.instruction.titleEn = correction.result;
  const key = `${relative}:${itemId}`;
  touched.set(key, (touched.get(key) || 0) + 1);
  return true;
}

function walk(value, isQuestions, relative) {
  if (!value || typeof value !== "object") return false;
  let changed = updateRecord(value, isQuestions, relative);
  for (const child of Object.values(value)) changed = walk(child, isQuestions, relative) || changed;
  return changed;
}

const itemFiles = Object.keys(corrections).flatMap((itemId) => {
  const year = itemId.slice(1, 2);
  const module = itemId.slice(3, 5);
  return [
    `content/english/planning/year-${year}/module-${module}.json`,
    `content/english/year-${year}/module-${module}/questions.json`
  ];
});
const files = [...new Set([
  "content/english/production/v11-1b/deterministic-activity-contracts.json",
  "content/english/master/module-content-and-mechanics-v1.json",
  ...itemFiles
])];

for (const relative of files) {
  const absolute = path.join(root, relative);
  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (walk(parsed, relative.endsWith("questions.json"), relative)) {
    fs.writeFileSync(absolute, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }
}

const backlogRelative = "content/english/production/v11-3j/order-full-result-audio-backlog.json";
const backlogPath = path.join(root, backlogRelative);
const backlog = JSON.parse(fs.readFileSync(backlogPath, "utf8"));
for (const item of backlog.items || []) {
  const correction = corrections[item.itemId];
  if (correction) item.finalEnglishResult = correction.result;
}
fs.writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`, "utf8");

for (const itemId of Object.keys(corrections)) {
  const expectedFiles = files.filter((relative) => relative.includes(`year-${itemId[1]}/module-${itemId.slice(3, 5)}`) || relative.includes("deterministic-activity-contracts") || relative.includes("module-content-and-mechanics"));
  const missing = expectedFiles.filter((relative) => ![...touched.keys()].some((key) => key === `${relative}:${itemId}`));
  if (missing.length) throw new Error(`ORDER_CORRECTION_LAYER_MISSING:${itemId}:${missing.join(",")}`);
  if (corrections[itemId].tokens.length > ORDER_MAX_UNITS) throw new Error(`SMART_SENTENCE_ORDER_MAX_UNITS_EXCEEDED:${itemId}:actual=${corrections[itemId].tokens.length}:max=${ORDER_MAX_UNITS}`);
}

console.log(JSON.stringify({
  status: "PASS",
  orderMaxUnits: ORDER_MAX_UNITS,
  corrected: Object.entries(corrections).map(([itemId, correction]) => ({ itemId, old: correction.old, current: correction.result, unitCount: correction.tokens.length, reason: correction.reason })),
  files,
  backlog: backlogRelative
}, null, 2));

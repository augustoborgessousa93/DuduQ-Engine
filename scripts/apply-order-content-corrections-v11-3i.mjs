import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corrections = {
  "Y3M03-Q019": { result: "She is my mother.", tokens: ["She", "is", "my", "mother."], bank: ["mother.", "my", "is", "She"], audioId: "AUD-V11-2B-172C0B69B5EB0378" },
  "Y3M04-Q019": { result: "I have one favorite toy.", tokens: ["I", "have", "one", "favorite", "toy."], bank: ["toy.", "one", "I", "favorite", "have"] },
  "Y3M06-Q019": { result: "I do not like carrots.", tokens: ["I", "do", "not", "like", "carrots."], bank: ["carrots.", "not", "I", "like", "do"] },
  "Y4M01-Q019": { result: "Today is Monday.", tokens: ["Today", "is", "Monday."], bank: ["Monday.", "Today", "is"] },
  "Y4M06-Q019": { result: "The bathroom is beside the kitchen.", tokens: ["The", "bathroom", "is", "beside", "the", "kitchen."], bank: ["kitchen.", "beside", "The", "bathroom", "the", "is"] },
  "Y5M02-Q019": { result: "I dislike carrots in the morning.", tokens: ["I", "dislike", "carrots", "in", "the", "morning."], bank: ["morning.", "the", "carrots", "I", "in", "dislike"] },
  "Y5M03-Q019": { result: "He is a teacher.", tokens: ["He", "is", "a", "teacher."], bank: ["teacher.", "a", "is", "He"] },
  "Y5M06-Q019": { result: "There is a park.", tokens: ["There", "is", "a", "park."], bank: ["park.", "a", "There", "is"] }
};
const touched = new Set();
let changedInFile = false;

function updateRecord(record, itemId, isQuestions) {
  if (!record || typeof record !== "object") return false;
  const id = record.itemId || record.item_id;
  const correction = corrections[id];
  if (!correction) return false;
  if (record.mechanicId && !String(record.mechanicId).includes("smart-sentence-order")) {
    throw new Error(`${id} is not a Smart Sentence ORDER record`);
  }
  record.targetContent = correction.result;
  if (record.studentStimuli && typeof record.studentStimuli === "object") {
    record.studentStimuli.units = [...correction.bank];
    record.studentStimuli.canonicalOrder = [...correction.tokens];
    record.studentStimuli.answerKey = [...correction.tokens];
  }
  record.tokens = [...correction.bank];
  record.orderedTokens = [...correction.tokens];
  record.correctAnswer = [...correction.tokens];
  record.answerKey = [...correction.tokens];
  if (correction.audioId) {
    record.successRecapResultAudioId = correction.audioId;
    if (isQuestions) record.sentenceAudioEnId = correction.audioId;
  }
  if (record.instruction && isQuestions) record.instruction.titleEn = correction.result;
  touched.add(id);
  changedInFile = true;
  return true;
}

function walk(value, isQuestions) {
  if (!value || typeof value !== "object") return;
  updateRecord(value, "", isQuestions);
  for (const child of Object.values(value)) walk(child, isQuestions);
}

const files = [
  "content/english/production/v11-1b/deterministic-activity-contracts.json",
  "content/english/master/module-content-and-mechanics-v1.json",
  ...Object.keys(corrections).flatMap(id => {
    const year = id.slice(1, 2);
    const module = id.slice(3, 5);
    return [
      `content/english/planning/year-${year}/module-${module}.json`,
      `content/english/year-${year}/module-${module}/questions.json`
    ];
  })
];

for (const relative of [...new Set(files)]) {
  const absolute = path.join(root, relative);
  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  const isQuestions = relative.endsWith("questions.json");
  changedInFile = false;
  walk(parsed, isQuestions);
  if (changedInFile) fs.writeFileSync(absolute, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

for (const id of Object.keys(corrections)) {
  if (!touched.has(id)) throw new Error(`No source record updated for ${id}`);
}
const audioId = corrections["Y3M03-Q019"].audioId;
const registryPath = path.join(root, "content/english/audio/audio-registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const registryEntry = registry.entries.find(entry => entry.audioId === audioId);
if (!registryEntry || registryEntry.qcStatus !== "PASS" || registryEntry.status !== "APPROVED" ||
    String(registryEntry.transcript || "").trim().toLowerCase() !== "she is my mother." ||
    !fs.existsSync(path.join(root, registryEntry.urlOrPath))) throw new Error(`EXACT_RECAP_AUDIO_NOT_QC_READY:${audioId}`);
registryEntry.usedByItems ||= [];
if (!registryEntry.usedByItems.includes("Y3M03-Q019")) registryEntry.usedByItems.push("Y3M03-Q019");
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
const runtimeManifestPath = path.join(root, "duduq-audio/manifests/AUDIO_MANIFEST.json");
const runtimeManifest = JSON.parse(fs.readFileSync(runtimeManifestPath, "utf8"));
const runtimeEntry = runtimeManifest.items.find(entry => (entry.audioId || entry.id) === audioId);
if (runtimeEntry) {
  runtimeEntry.activity ||= [];
  if (!runtimeEntry.activity.includes("Y3M03-Q019")) runtimeEntry.activity.push("Y3M03-Q019");
  fs.writeFileSync(runtimeManifestPath, `${JSON.stringify(runtimeManifest, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify({ status: "PASS", correctedIds: [...touched], files: [...new Set(files)] }, null, 2));

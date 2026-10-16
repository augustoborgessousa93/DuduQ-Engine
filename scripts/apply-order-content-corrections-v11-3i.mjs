import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corrections = {
  "Y3M03-Q019": { result: "She is my mother.", tokens: ["She", "is", "my", "mother."], bank: ["mother.", "my", "is", "She"] },
  "Y3M04-Q019": { result: "I have one favorite toy.", tokens: ["I", "have", "one", "favorite", "toy."], bank: ["toy.", "one", "I", "favorite", "have"] },
  "Y3M06-Q019": { result: "I do not like carrots.", tokens: ["I", "do", "not", "like", "carrots."], bank: ["carrots.", "not", "I", "like", "do"] },
  "Y4M01-Q019": { result: "What day is it today? Today is Monday.", tokens: ["What", "day", "is", "it", "today?", "Today", "is", "Monday."], bank: ["Monday.", "today?", "What", "is", "Today", "day", "it", "is"] },
  "Y4M06-Q019": { result: "Where is the TV? It is beside the sofa.", tokens: ["Where", "is", "the", "TV?", "It", "is", "beside", "the", "sofa."], bank: ["sofa.", "beside", "the", "TV?", "Where", "is", "It", "the", "is"] },
  "Y5M02-Q019": { result: "I do not like carrots in the morning.", tokens: ["I", "do", "not", "like", "carrots", "in", "the", "morning."], bank: ["morning.", "the", "in", "carrots", "not", "I", "like", "do"] },
  "Y5M03-Q019": { result: "He is a boy.", tokens: ["He", "is", "a", "boy."], bank: ["boy.", "a", "is", "He"] },
  "Y5M06-Q019": { result: "There is a park in my city.", tokens: ["There", "is", "a", "park", "in", "my", "city."], bank: ["city.", "my", "in", "park", "a", "There", "is"] }
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
console.log(JSON.stringify({ status: "PASS", correctedIds: [...touched], files: [...new Set(files)] }, null, 2));

import { readFile, writeFile } from "node:fs/promises";

const path = "duduq-audio/manifests/AUDIO_MANIFEST.json";
const manifest = JSON.parse(await readFile(path, "utf8"));
const obsoleteId = "AUD-Y1-SSC-V2-EN-1B6495967EC5";
const entry = manifest.items.find(item => item.id === obsoleteId);
if (!entry || entry.speechText !== "That's not the missing word. Try again.") {
  throw new Error(`OBSOLETE_SMART_SENTENCE_ERROR_ASSET_NOT_FOUND:${obsoleteId}`);
}
const oldActivity = [...new Set([...(entry.activity || []), ...(entry.usedByItems || [])])];
const year1SmartSentenceIds = new Set();
for (const moduleNumber of ["02", "03", "04", "06"]) {
  const contract = JSON.parse(await readFile(`content/english/year-1/module-${moduleNumber}/questions.json`, "utf8"));
  for (const item of contract.items.filter(question => question.mechanicId === "smart-sentence-complete")) {
    year1SmartSentenceIds.add(item.item_id);
  }
}
if (oldActivity.some(itemId => !year1SmartSentenceIds.has(itemId))) {
  throw new Error(`UNEXPECTED_OBSOLETE_AUDIO_REFERENCES:${oldActivity.filter(itemId => !year1SmartSentenceIds.has(itemId)).join(",")}`);
}
entry.activity = [];
entry.usedByItems = [];
await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", assetPreserved: true, activityReferencesBefore: oldActivity.length, activityReferencesAfter: entry.activity.length, id: obsoleteId }, null, 2));

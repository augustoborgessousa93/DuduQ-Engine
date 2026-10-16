import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const statusPath = "content/english/production/v11-3h/order-result-audio-production.json";
const registry = JSON.parse(fs.readFileSync(path.join(root, "content/english/audio/audio-registry.json"), "utf8"));
const norm = text => String(text || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const items = [];
for (let year = 1; year <= 5; year += 1) {
  const yearRoot = path.join(root, "content/english", `year-${year}`);
  for (const dir of fs.readdirSync(yearRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const file = path.join(yearRoot, dir.name, "questions.json");
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const item of data.items || []) if (item.mechanicId === "smart-sentence-order") {
      const sentence = (item.orderedTokens || []).join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
      if (!sentence || !item.answerKey?.length || item.answerKey.join(" ") !== item.orderedTokens.join(" ")) throw new Error(`INVALID_ORDER_RESULT:${item.item_id}`);
      const audio = registry.entries.find(entry => entry.voiceVersion === "DUDUQ_GOLD_VOICE_v1" && String(entry.locale).toLowerCase() === "en-us" && norm(entry.transcript || entry.speechText) === norm(sentence) && ["APPROVED", "GENERATED", "TECHNICAL_PASS_HUMAN_PENDING"].includes(entry.status));
      items.push({ itemId: item.item_id, moduleId: item.moduleId, sentence, audioId: item.sentenceAudioEnId || audio?.audioId || "" });
    }
  }
}
const unique = new Map(items.filter(item => !item.audioId).map(item => [norm(item.sentence), item]));
const jobs = [...unique.values()].map(item => {
  const id = `AUD-V11-3H-SSO-${createHash("sha256").update(norm(item.sentence)).digest("hex").slice(0, 12).toUpperCase()}`;
  return { audioId: id, sentence: item.sentence, itemIds: items.filter(other => norm(other.sentence) === norm(item.sentence)).map(other => other.itemId), status: "PENDING_GOLD_VOICE_SMOKE" };
});
let previous = {};
if (fs.existsSync(path.join(root, statusPath))) previous = JSON.parse(fs.readFileSync(path.join(root, statusPath), "utf8"));
const status = {
  feature: "DUDUQ_FINAL_ORDER_AUDIO_AND_LIVE_QA_RECOVERY_V11_3I",
  voice: "DUDUQ_GOLD_VOICE_v1",
  engine: "chatterbox-multilingual-v3",
  model: "Chatterbox Multilingual V3",
  status: "BLOCKED_WSL_RECOVERY",
  blocker: "Gold Voice smoke was not run because wsl.exe returned Wsl/Service/E_ACCESSDENIED and authorized WslService restart returned CouldNotStopService/Access denied.",
  priorAttempt: { status: previous.status, blocker: previous.blocker, failedJobs: previous.failedJobs || [] },
  orderActivityCount: items.length,
  validFinalResultCount: items.length,
  contentReviewRequired: [],
  alreadyBoundCount: items.length - jobs.reduce((count, job) => count + job.itemIds.length, 0),
  pendingUniqueAudioCount: jobs.length,
  sourceOrderItems: items,
  jobs,
  updatedAt: new Date().toISOString()
};
if (items.length !== 15) throw new Error(`EXPECTED_15_ORDER_ITEMS_GOT_${items.length}`);
fs.writeFileSync(path.join(root, statusPath), `${JSON.stringify(status, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: status.status, orderItems: items.length, validResults: status.validFinalResultCount, pendingAudioJobs: jobs.length, contentReviewRequired: 0 }, null, 2));

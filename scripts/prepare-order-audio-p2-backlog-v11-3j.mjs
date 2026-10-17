import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content/english");
const registry = JSON.parse(fs.readFileSync(path.join(contentRoot, "audio/audio-registry.json"), "utf8"));
const items = [];
for (let year = 1; year <= 5; year += 1) {
  const yearRoot = path.join(contentRoot, `year-${year}`);
  for (const dir of fs.readdirSync(yearRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const file = path.join(yearRoot, dir.name, "questions.json");
    if (!fs.existsSync(file)) continue;
    const questions = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const item of questions.items || []) {
      if (item.mechanicId !== "smart-sentence-order") continue;
      const result = (item.orderedTokens || []).join(" ").replace(/\s+([.,!?])/g, "$1").replace(/\s+/g, " ").trim();
      const audioId = item.sentenceAudioEnId || item.successRecapResultAudioId || "";
      const registered = audioId ? registry.entries.find(entry => entry.audioId === audioId) : null;
      items.push({
        moduleId: item.moduleId || item.item_id.slice(0, 5),
        itemId: item.item_id,
        finalEnglishResult: result,
        desiredFutureAudioRole: "SMART_SENTENCE_ORDER_SUCCESS_RESULT",
        existingAssetIdPreserved: registered ? audioId : null,
        status: "P2_AUDIO_REFINEMENT_PENDING",
        reason: "GOLD_VOICE_WSL_ACCESS_DEFERRED",
        futureAction: "GENERATE_DUDUQ_GOLD_VOICE_FULL_RESULT"
      });
    }
  }
}
items.sort((a, b) => a.itemId.localeCompare(b.itemId));
if (items.length !== 15) throw new Error(`ORDER_ITEM_COUNT:${items.length}`);
const backlog = {
  feature: "DUDUQ_ORDER_AUDIO_SAFE_FALLBACK_V11_3J",
  status: "P2_AUDIO_REFINEMENT_PENDING",
  autoplay: false,
  missingAudioRequests: 0,
  preservedExistingAssets: items.filter(item => item.existingAssetIdPreserved).length,
  deferredMissingAssets: items.filter(item => !item.existingAssetIdPreserved).length,
  items
};
const backlogPath = path.join(contentRoot, "production/v11-3j/order-full-result-audio-backlog.json");
fs.mkdirSync(path.dirname(backlogPath), { recursive: true });
fs.writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);

const statusPath = path.join(contentRoot, "production/v11-3h/order-result-audio-production.json");
const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
status.priorGenerationStatus ??= status.status;
status.status = "DEFERRED_P2_AUDIO_REFINEMENT_PENDING";
status.blocker = null;
status.autoplay = false;
status.missingAudioRequests = 0;
status.preservedExistingAssetCount = backlog.preservedExistingAssets;
status.deferredMissingAssetCount = backlog.deferredMissingAssets;
status.backlogPath = "content/english/production/v11-3j/order-full-result-audio-backlog.json";
status.sourceOrderItems = items.map(item => ({ itemId: item.itemId, moduleId: item.moduleId, sentence: item.finalEnglishResult, audioId: item.existingAssetIdPreserved || "", status: "P2_AUDIO_REFINEMENT_PENDING" }));
status.pendingUniqueAudioCount = backlog.deferredMissingAssets;
status.alreadyBoundCount = backlog.preservedExistingAssets;
status.updatedAt = new Date().toISOString();
fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
console.log(JSON.stringify({ backlogPath: path.relative(root, backlogPath), orderItems: items.length,
  existingPreserved: backlog.preservedExistingAssets, deferred: backlog.deferredMissingAssets, status: status.status }, null, 2));

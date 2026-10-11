import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(root, "content/english/master/drag-drop-multimedia-contract-v2.json");
const registryPath = path.join(root, "content/english/media/media-registry.json");
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const audioManifest = JSON.parse(await readFile(path.join(root, "duduq-audio/manifests/AUDIO_MANIFEST.json"), "utf8"));
const mediaById = new Map(registry.entries.map(entry => [entry.mediaId, entry]));
const audioById = new Map(audioManifest.items.map(entry => [entry.audioId || entry.id, entry]));
const errors = [];
const checkedItems = [];
const sha = data => createHash("sha256").update(data).digest("hex");

async function loadModuleFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await loadModuleFiles(full));
    else if (entry.isFile() && entry.name === "questions.json") out.push(full);
  }
  return out;
}

async function mediaReady(id, index = 0, visited = new Set()) {
  const entry = mediaById.get(id);
  if (!entry || entry.status !== "APPROVED" || visited.has(id)) return false;
  visited.add(id);
  if (entry.components?.length) {
    for (const childId of entry.components) if (!await mediaReady(childId, 0, new Set(visited))) return false;
  }
  const assets = entry.assets || [];
  if (!assets.length) return false;
  const asset = assets[index];
  if (!asset?.path || !asset?.sha256) return false;
  const bytes = await readFile(path.join(root, asset.path)).catch(() => null);
  return Boolean(bytes?.length && sha(bytes) === asset.sha256);
}

const supplied = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
const questionFiles = supplied.length
  ? supplied.map(file => path.resolve(root, file))
  : await loadModuleFiles(path.join(root, "content/english"));

for (const file of questionFiles) {
  const data = await readFile(file, "utf8").then(JSON.parse);
  const moduleName = data.moduleId || path.basename(path.dirname(file));
  for (const item of data.items || []) {
    const mechanic = item.runtimeMechanic || item.mecanica_preferida || item.mechanic;
    if (mechanic !== "drag-drop-multimedia") continue;
    const id = item.item_id || item.itemId || item.id || "UNKNOWN_ITEM";
    const spec = item.dragDropContract;
    const mode = spec?.mode;
    const destinations = item.mediaBindings || [];
    const targetIds = destinations.map(target => target.targetId);
    const answerKeys = destinations.map(target => target.answerKey);
    const assetKeys = destinations.map(target => `${target.mediaId}:${target.assetIndex ?? 0}`);
    if (spec?.version !== "DUDUQ_DRAG_DROP_MULTIMEDIA_CONTENT_CONTRACT_V2") errors.push(`${id}:CONTRACT_VERSION`);
    if (mode !== "multi-match") errors.push(`${id}:OFFICIAL_MODE_MUST_BE_MULTI_MATCH:${mode}`);
    if (spec?.destinationCount !== contract.requiredStructure.visualDestinations.exactCount || destinations.length !== contract.requiredStructure.visualDestinations.exactCount) errors.push(`${id}:DESTINATION_COUNT:${destinations.length}`);
    if (destinations.some(target => !target.targetId || !target.answerKey || !target.mediaId || !target.label?.trim())) errors.push(`${id}:EMPTY_DESTINATION_FIELD`);
    if (new Set(targetIds).size !== 4) errors.push(`${id}:DUPLICATE_OR_MISSING_TARGET_ID`);
    if (new Set(answerKeys).size !== 4) errors.push(`${id}:DUPLICATE_OR_MISSING_SEMANTIC_TARGET`);
    if (new Set(assetKeys).size !== 4) errors.push(`${id}:DUPLICATE_RESOLVED_MEDIA_ASSET`);
    for (const target of destinations) {
      if (!await mediaReady(target.mediaId, target.assetIndex || 0)) errors.push(`${id}:UNRESOLVED_OR_INVALID_MEDIA:${target.targetId}:${target.mediaId}`);
    }

    const items = item.audioBindings || [];
    if (spec.draggableCount !== 4 || items.length !== 4 || new Set(items.map(entry => entry.itemId)).size !== 4 ||
        new Set(items.map(entry => entry.audioId)).size !== 4 || new Set(items.map(entry => entry.answerKey)).size !== 4) errors.push(`${id}:FOUR_AUDIO_CARDS_REQUIRED`);
    if (items.some(entry => !entry.itemId || !entry.audioId || !entry.targetId || !entry.answerKey ||
        !destinations.some(target => target.targetId === entry.targetId && target.answerKey === entry.answerKey))) errors.push(`${id}:MULTI_MATCH_INCOMPLETE_MAPPING`);
    if (spec?.mapping?.length !== 4 || items.some(entry => !spec.mapping.some(mapping => mapping.itemId === entry.itemId && mapping.targetId === entry.targetId && mapping.answerKey === entry.answerKey))) errors.push(`${id}:CONTRACT_MAPPING_MISMATCH`);
    for (const entry of items) {
      const audio = audioById.get(entry.audioId);
      if (!audio || audio.status !== "APPROVED" || !audio.audioPath?.endsWith(".mp3") ||
          !await readFile(path.join(root, audio.audioPath)).catch(() => null)) errors.push(`${id}:UNRESOLVED_AUDIO:${entry.itemId}:${entry.audioId}`);
    }

    checkedItems.push({ moduleId: moduleName, itemId: id, mode, draggables: (item.audioBindings || []).length, destinations: destinations.length });
  }
}

console.log(JSON.stringify({ status: errors.length ? "ISSUE" : "PASS", contract: contract.contractId, questionFiles: questionFiles.map(file => path.relative(root, file)), checkedItems, errors }, null, 2));
if (errors.length) process.exitCode = 1;

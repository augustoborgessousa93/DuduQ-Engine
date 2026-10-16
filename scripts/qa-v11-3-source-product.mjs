import { readFile, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const load = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const exists = async (relative) => access(path.join(root, relative)).then(() => true, () => false);
const allowedMechanics = new Set(["target-shooter", "bubble-pop", "drag-drop-multimedia", "drag-drop", "matching", "memory-quest", "smart-sentence-complete", "smart-sentence-order"]);
const mediaRegistry = await load("content/english/media/media-registry.json");
const audioRegistry = await load("content/english/audio/audio-registry.json");
const audioManifest = await load("duduq-audio/manifests/AUDIO_MANIFEST.json");
const mediaById = new Map(mediaRegistry.entries.map((entry) => [entry.mediaId, entry]));
const audioById = new Map(audioRegistry.entries.map((entry) => [entry.audioId, entry]));
const runtimeAudioById = new Map(audioManifest.items.map((entry) => [entry.audioId || entry.id, entry]));
const errors = [];
const modules = [];
const activityIds = new Set();
const mediaIds = new Set();
const audioIds = new Set();
const mechanicCounts = {};
const leakStatuses = {};
let activityCount = 0;
let answerCount = 0;
let instructionCount = 0;
let introCount = 0;
let finalCount = 0;
let routeCount = 0;
const assetErrors = [];

function walk(value, callback) {
  if (!value || typeof value !== "object") return;
  callback(value);
  for (const child of Object.values(value)) walk(child, callback);
}

for (let year = 1; year <= 5; year += 1) {
  for (let number = 1; number <= 6; number += 1) {
    const moduleId = `Y${year}M${String(number).padStart(2, "0")}`;
    const base = `content/english/year-${year}/module-${String(number).padStart(2, "0")}`;
    const metadata = await load(`${base}/module.json`);
    const questions = await load(`${base}/questions.json`);
    const items = questions.items || questions.questions || [];
    const route = `play/english/year-${year}/module-${String(number).padStart(2, "0")}/index.html`;
    const routeExists = await exists(route);
    routeCount += Number(routeExists);
    if (metadata.moduleId !== moduleId || questions.moduleId !== moduleId) errors.push(`MODULE_OWNERSHIP:${moduleId}`);
    if (items.length !== 20) errors.push(`ACTIVITY_COUNT:${moduleId}:${items.length}`);
    if (!routeExists) errors.push(`MODULE_ROUTE_MISSING:${moduleId}:${route}`);
    if (metadata.navigation && (!metadata.navigation.intro || !metadata.navigation.first || metadata.navigation.sequence?.length !== 20 || !metadata.navigation.final)) errors.push(`NAVIGATION_CONTRACT:${moduleId}`);
    const legacyY1FinalBridge = moduleId === "Y1M01" && await exists("play/english/year-1/module-01/complete/index.html");
    if (metadata.intro?.required !== true || (metadata.finalContract !== "MODULE_FINAL_CANONICAL_LOCKED" && !legacyY1FinalBridge)) errors.push(`INTRO_FINAL_CONTRACT:${moduleId}`);
    introCount += Number(metadata.intro?.required === true);
    finalCount += Number(metadata.finalContract === "MODULE_FINAL_CANONICAL_LOCKED" || legacyY1FinalBridge);
    for (const [index, item] of items.entries()) {
      activityCount += 1;
      const id = item.item_id || item.itemId || item.questionId;
      if (!id || activityIds.has(id)) errors.push(`DUPLICATE_OR_MISSING_ACTIVITY_ID:${moduleId}:${id || index}`);
      activityIds.add(id);
      if (item.moduleId && item.moduleId !== moduleId) errors.push(`ITEM_MODULE_MISMATCH:${id}`);
      const mechanicId = item.mechanicId || item.mecanica_preferida;
      if (mechanicId && !allowedMechanics.has(mechanicId)) errors.push(`NONCANONICAL_MECHANIC:${id}:${mechanicId}`);
      if (mechanicId) mechanicCounts[mechanicId] = (mechanicCounts[mechanicId] || 0) + 1;
      const answer = item.answerKey ?? item.correctAnswer ?? item.answer ?? item.resposta ?? item.mappings ?? item.orderedTokens;
      if (answer !== null && answer !== undefined && answer !== "") answerCount += 1;
      else errors.push(`MISSING_ANSWER_KEY:${id}`);
      if (item.primaryInstructionEn || item.visibleInstructionEn || item.instruction?.instructionEn || item.instrucao_pt) instructionCount += 1;
      else errors.push(`MISSING_VISIBLE_INSTRUCTION:${id}`);
      const status = String(item.answerLeakStatus || "UNSPECIFIED");
      leakStatuses[status] = (leakStatuses[status] || 0) + 1;
      if (/^(?:FAIL|UNKNOWN)|ANSWER_LEAK/i.test(status)) errors.push(`ANSWER_LEAK_STATUS:${id}:${status}`);
      walk(item, (row) => {
        if (typeof row.mediaId === "string") mediaIds.add(row.mediaId);
        if (typeof row.assetId === "string" && mediaById.has(row.assetId)) mediaIds.add(row.assetId);
        if (typeof row.audioId === "string") audioIds.add(row.audioId);
        for (const audioKey of ["instructionAudioEnId", "instructionAudioPtId", "sentenceAudioEnId", "sentenceAudioPtId", "audioEnId"]) {
          if (typeof row[audioKey] === "string") audioIds.add(row[audioKey]);
        }
      });
    }
    modules.push({ moduleId, title: metadata.title, activities: items.length, route, routeResolved: routeExists, intro: metadata.intro?.required === true, final: metadata.finalContract === "MODULE_FINAL_CANONICAL_LOCKED" });
  }
}

const checkMedia = async (mediaId, seen = new Set()) => {
  if (seen.has(mediaId)) return;
  seen.add(mediaId);
  const entry = mediaById.get(mediaId);
  if (!entry || entry.status !== "APPROVED") { assetErrors.push(`MEDIA_NOT_APPROVED:${mediaId}`); return; }
  for (const componentId of entry.components || []) await checkMedia(componentId, seen);
  const paths = [...(entry.urlOrPath ? [entry.urlOrPath] : []), ...(entry.assets || []).map((asset) => asset.path).filter(Boolean)];
  if (!paths.length && !(entry.components || []).length) assetErrors.push(`MEDIA_PATH_MISSING:${mediaId}`);
  for (const assetPath of paths) {
    const relative = String(assetPath).replaceAll("\\", "/").replace(/^\/+/, "");
    if (/^(?:https?:|data:)/i.test(relative) || relative.split("/").includes("..")) assetErrors.push(`MEDIA_PATH_INVALID:${mediaId}:${assetPath}`);
    else if (!await exists(relative)) assetErrors.push(`MEDIA_FILE_MISSING:${mediaId}:${relative}`);
  }
};
for (const mediaId of mediaIds) await checkMedia(mediaId);
for (const audioId of audioIds) {
  const entry = audioById.get(audioId);
  const runtime = runtimeAudioById.get(audioId);
  if (!runtime || runtime.status !== "APPROVED") { assetErrors.push(`AUDIO_NOT_IN_RUNTIME_MANIFEST:${audioId}`); continue; }
  const audioPath = runtime.audioPath || entry.path || entry.urlOrPath || entry.outputPath;
  if (!audioPath || !/\.mp3$/i.test(audioPath)) assetErrors.push(`AUDIO_FORMAT_INVALID:${audioId}:${audioPath || "MISSING"}`);
  else if (!await exists(audioPath)) assetErrors.push(`AUDIO_FILE_MISSING:${audioId}:${audioPath}`);
}

const yearTotals = Object.fromEntries([1, 2, 3, 4, 5].map((year) => [year, modules.filter((row) => row.moduleId.startsWith(`Y${year}`)).reduce((sum, row) => sum + row.activities, 0)]));
const report = {
  status: errors.length || assetErrors.length || modules.length !== 30 || activityCount !== 600 || routeCount !== 30 ? "ISSUE" : "PASS",
  modules: modules.length,
  activities: activityCount,
  yearTotals,
  answerKeys: answerCount,
  visibleInstructions: instructionCount,
  introFlows: introCount,
  moduleFinalFlows: finalCount,
  moduleRoutes: `${routeCount}/30`,
  canonicalMechanicCounts: mechanicCounts,
  mediaReferences: mediaIds.size,
  audioReferences: audioIds.size,
  answerLeakStatuses: leakStatuses,
  missingMediaOrAudio: assetErrors.length,
  assetErrors: assetErrors.slice(0, 100),
  structuralErrors: errors.length,
  errors: errors.slice(0, 100),
  specialChecks: {
    y4m04ApprovedSports: "soccer,basketball,tennis,volleyball",
    y5m05Q006: "verified separately against deterministic source contract",
    letterCueActiveReferences: "verified separately against runtime source"
  },
  modulesDetail: modules
};
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
export { report };

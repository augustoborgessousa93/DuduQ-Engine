#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const load = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const normalize = (value) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
const audioKey = ({ transcript, language, speakerRole, voiceProfile, prosodyProfile }) => createHash("sha256").update([normalize(transcript), normalize(language), normalize(speakerRole), normalize(voiceProfile), normalize(prosodyProfile)].join("|"), "utf8").digest("hex");
const fail = (message) => { throw new Error(message); };

const index = await load("content/english/master/modules-index.json");
const moduleSpec = await load("content/english/year-1/module-01/module.json");
const questions = await load("content/english/year-1/module-01/questions.json");
const policy = await load("content/english/audio/audio-policy.json");
const audioRegistry = await load("content/english/audio/audio-registry.json");
const audioProduction = await load("content/english/year-1/module-01/audio-production-manifest.json");
const mediaRegistry = await load("content/english/media/media-registry.json");

if (index.moduleCount !== 30 || index.modules.length !== 30) fail("MODULE_COUNT_INVALID");
if (moduleSpec.moduleId !== "Y1M01" || questions.moduleId !== "Y1M01" || questions.items.length !== 20) fail("Y1M01_ITEM_COUNT_INVALID");
if (policy.principle !== "ONE_AUDIO_PER_UNIQUE_UTTERANCE_NOT_PER_ITEM") fail("AUDIO_POLICY_INVALID");
const allowed = new Set(moduleSpec.allowedMechanics);
const blocked = new Set(moduleSpec.blockedMechanics);
const registryByKey = new Map(audioRegistry.entries.map((entry) => [audioKey(entry), entry]));
const registryById = new Map(audioRegistry.entries.map((entry) => [entry.audioId, entry]));
const utterances = new Map();
const mechanics = {};
const missingMedia = [];
const missingAudio = [];
const mediaById = new Map(mediaRegistry.entries.map(entry => [entry.mediaId, entry]));
const mediaExists = async (mediaId, seen = new Set()) => {
  if (!mediaId || seen.has(mediaId)) return false;
  seen.add(mediaId);
  const entry = mediaById.get(mediaId);
  if (!entry || entry.status !== "APPROVED") return false;
  const components = entry.components || [];
  const assets = entry.assets || [];
  for (const childId of components) if (!await mediaExists(childId, new Set(seen))) return false;
  for (const asset of assets) {
    if (!asset.path || asset.path.split(/[\\/]/).includes("..")) return false;
    await readFile(path.join(root, asset.path)).catch(() => fail(`MEDIA_ASSET_MISSING:${asset.path}`));
  }
  if (entry.urlOrPath && !assets.length && !components.length) await readFile(path.join(root, entry.urlOrPath)).catch(() => fail(`MEDIA_ASSET_MISSING:${entry.urlOrPath}`));
  return Boolean(components.length || assets.length || entry.urlOrPath);
};
for (const item of questions.items) {
  if (!allowed.has(item.mecanica_preferida) || blocked.has(item.mecanica_preferida)) fail(`MECHANIC_REJECTED:${item.item_id}`);
  if (moduleSpec.year <= 2 && item.requires_reading === "YES") fail(`YEAR_RULE_REJECTED:${item.item_id}`);
  mechanics[item.item_id] = item.mecanica_preferida;
  if (!item.image_ref || !await mediaExists(item.image_ref)) missingMedia.push(item.item_id);
  const key = audioKey({ transcript: item.audio_transcript, language: "en", speakerRole: item.audio_transcript.includes("A:") ? "multi" : "single", voiceProfile: "EN_CHILD_FRIENDLY_CLEAR", prosodyProfile: "neutral_natural" });
  utterances.set(key, item.audio_transcript);
  const multiBindings = audioProduction.items?.[item.item_id];
  if (multiBindings?.length) {
    if (multiBindings.some((binding) => {
      const entry = registryById.get(binding.audioId);
      return !entry || entry.status !== "APPROVED" || !entry.urlOrPath;
    })) missingAudio.push(item.item_id);
  } else {
    const found = registryByKey.get(key);
    if (!found || found.status !== "APPROVED" || !found.urlOrPath) missingAudio.push(item.item_id);
  }
}
const report = { moduleId: moduleSpec.moduleId, items: questions.items.length, uniqueEnglishUtterances: utterances.size, globalUiAudioPrompts: audioRegistry.entries.filter((entry) => entry.type === "ui_instruction").length, mediaResolved: 0, mediaMissing: missingMedia.length, audioResolved: 0, audioMissing: missingAudio.length, mechanics, missingMedia, missingAudio, deterministic: true };
report.audioResolved = questions.items.length - missingAudio.length;
report.mediaResolved = questions.items.length - missingMedia.length;
try {
  const mediaManifest = await load("content/english/media/image-generation-manifest.json");
  const audioManifest = await load("content/english/audio/audio-generation-manifest.json");
  const all = [...mediaManifest.entries, ...audioManifest.entries];
  const ids = all.map((entry) => entry.mediaId || entry.audioId);
  const paths = all.map((entry) => entry.outputPath);
  if (new Set(ids).size !== ids.length || new Set(paths).size !== paths.length) fail("DUPLICATE_MEDIA_OR_AUDIO_ID_OR_PATH");
  if (new Set(audioManifest.entries.map((entry) => entry.dedupeKey)).size !== audioManifest.entries.length) fail("DUPLICATE_AUDIO_DEDUPE_KEY");
  if (audioManifest.entries.some((entry) => !Array.isArray(entry.usedByItems) || entry.usedByItems.length === 0)) fail("AUDIO_USED_BY_ITEMS_MISSING");
  if (audioManifest.entries.some((entry) => /Good morning! \/ Good afternoon! \/ Goodbye!|1: What's your name\? 2: My name is Ben\./.test(entry.transcript))) fail("INVALID_COMBINED_AUDIO_PRESENT");
  const q009 = audioProduction.items?.["Y1M01-Q009"] ?? [];
  const q015 = audioProduction.items?.["Y1M01-Q015"] ?? [];
  if (q009.length !== 3 || new Set(q009.map((binding) => binding.audioId)).size !== 3) fail("Q009_MULTI_AUDIO_INVALID");
  if (q015.length !== 2 || new Set(q015.map((binding) => binding.audioId)).size !== 2) fail("Q015_MULTI_AUDIO_INVALID");
  if (mediaManifest.entries.some((entry) => !/^IMG-Y1M01-[A-Z0-9-]+$/.test(entry.mediaId))) fail("SEMANTIC_IMAGE_ID_INVALID");
  const runtimeMediaReady = mediaManifest.entries.every(entry => mediaById.get(entry.mediaId)?.status === "APPROVED");
  const runtimeAudioReady = audioManifest.entries.every(entry => entry.status === "APPROVED");
  report.runtimeReady = runtimeMediaReady && runtimeAudioReady && missingMedia.length === 0 && missingAudio.length === 0;
} catch (error) { if (/DUPLICATE_|AUDIO_USED_BY_ITEMS_MISSING|INVALID_COMBINED_AUDIO_PRESENT|Q009_MULTI_AUDIO_INVALID|Q015_MULTI_AUDIO_INVALID|SEMANTIC_IMAGE_ID_INVALID/.test(String(error?.message || error))) throw error; report.runtimeReady = false; }
console.log(JSON.stringify(report, null, 2));

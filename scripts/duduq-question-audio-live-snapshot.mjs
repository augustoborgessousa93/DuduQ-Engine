import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const liveDir = path.join(root, "design-system", "penpot-sync", "live");
const read = (name) => JSON.parse(fs.readFileSync(path.join(liveDir, name), "utf8"));
const contract = (snapshot) => ({
  componentId: snapshot.componentId,
  semanticId: snapshot.semanticId,
  dimensions: snapshot.dimensions,
  surface: snapshot.surface,
  icon: snapshot.icon,
  hierarchy: snapshot.hierarchy,
  source: snapshot.source
});

export function normalizeLiveSnapshot(snapshot) {
  const normalized = contract(snapshot);
  if (normalized.componentId !== "QUESTION_AUDIO" || normalized.semanticId !== "question-audio") throw Error("INVALID_QUESTION_AUDIO_LIVE_SNAPSHOT");
  if (!normalized.source?.isComponentInstance || !normalized.surface?.fills?.length) throw Error("UNSAFE_LIVE_SOURCE");
  return normalized;
}

export function semanticDiff(current, previous) {
  const now = normalizeLiveSnapshot(current);
  const then = normalizeLiveSnapshot(previous);
  const fields = ["dimensions", "surface", "icon", "hierarchy", "source"];
  const changed = fields.filter((field) => JSON.stringify(now[field]) !== JSON.stringify(then[field]));
  return { state: changed.length ? "CHANGE_DETECTED" : "NO_CHANGES", changed };
}

export function run() {
  return semanticDiff(read("question-audio-current-live.json"), read("question-audio-last-successful.json"));
}

if (process.argv[1]?.endsWith("duduq-question-audio-live-snapshot.mjs")) console.log(JSON.stringify(run(), null, 2));

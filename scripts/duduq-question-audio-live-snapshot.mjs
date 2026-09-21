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
  const authorized = normalized.source?.resolution === "AUTHORIZED_AUTHORING_SOURCE" && normalized.source?.authorizedControlPanel === true;
  if ((!normalized.source?.isComponentInstance && !authorized) || !normalized.surface?.fills?.length) throw Error("UNSAFE_LIVE_SOURCE");
  return normalized;
}

export function semanticDiff(current, previous) {
  const now = normalizeLiveSnapshot(current);
  const then = normalizeLiveSnapshot(previous);
  const fields = ["dimensions", "surface", "icon"];
  const changed = fields.filter((field) => JSON.stringify(now[field]) !== JSON.stringify(then[field]));
  return { state: changed.length ? "CHANGE_DETECTED" : "NO_CHANGES", changed };
}

export function run() {
  return semanticDiff(read("question-audio-current-live.json"), read("question-audio-last-successful.json"));
}

export function markSuccessful() {
  const current = read("question-audio-current-live.json");
  current.successfulSnapshot = { checkpoint: "B", capturedAt: new Date().toISOString(), bridgeResult: "APPLIED", semanticDiff: "CHANGE_DETECTED" };
  fs.writeFileSync(path.join(liveDir, "question-audio-last-successful.json"), `${JSON.stringify(current, null, 2)}\n`);
  return current.successfulSnapshot;
}

if (process.argv[1]?.endsWith("duduq-question-audio-live-snapshot.mjs")) {
  const result = process.argv.includes("--mark-success") ? markSuccessful() : run();
  console.log(JSON.stringify(result, null, 2));
}

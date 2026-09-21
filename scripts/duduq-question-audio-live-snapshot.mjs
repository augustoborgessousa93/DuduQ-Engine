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

export function captureAuthoringFill(fill) {
  if (typeof fill !== "string" || !/^#[0-9A-F]{6}$/.test(fill)) throw Error("INVALID_LIVE_AUTHORING_FILL");
  const current = read("question-audio-current-live.json");
  if (current.source?.resolution !== "AUTHORIZED_AUTHORING_SOURCE" || current.source?.authorizedControlPanel !== true) throw Error("UNAUTHORIZED_AUTHORING_SOURCE");
  current.surface.fills[0].color = fill;
  fs.writeFileSync(path.join(liveDir, "question-audio-current-live.json"), `${JSON.stringify(current, null, 2)}\n`);
  return trace();
}

export function trace() {
  const current = read("question-audio-current-live.json");
  const previous = read("question-audio-last-successful.json");
  const normalizedCurrent = normalizeLiveSnapshot(current);
  const normalizedPrevious = normalizeLiveSnapshot(previous);
  return { component: current.semanticId, authoringNodeId: current.source.surfaceId, current: normalizedCurrent.surface.fills[0].color, previous: normalizedPrevious.surface.fills[0].color, normalizedCurrent: normalizedCurrent.surface.fills[0].color, normalizedPrevious: normalizedPrevious.surface.fills[0].color, diff: semanticDiff(current, previous) };
}

export function markSuccessful() {
  const current = read("question-audio-current-live.json");
  current.successfulSnapshot = { checkpoint: "B", capturedAt: new Date().toISOString(), bridgeResult: "APPLIED", semanticDiff: "CHANGE_DETECTED" };
  fs.writeFileSync(path.join(liveDir, "question-audio-last-successful.json"), `${JSON.stringify(current, null, 2)}\n`);
  return current.successfulSnapshot;
}

if (process.argv[1]?.endsWith("duduq-question-audio-live-snapshot.mjs")) {
  const fillIndex = process.argv.indexOf("--capture-fill");
  const result = process.argv.includes("--mark-success") ? markSuccessful() : fillIndex >= 0 ? captureAuthoringFill(process.argv[fillIndex + 1]) : process.argv.includes("--trace") ? trace() : run();
  console.log(JSON.stringify(result, null, 2));
}

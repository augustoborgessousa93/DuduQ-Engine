import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { capture } from "./capture-penpot-graph.mjs";
import { diff } from "./duduq-design-graph-v2.mjs";
import { compile, screens } from "./compile-penpot-screen.mjs";

const root = path.resolve(import.meta.dirname, "..");
const graphDir = path.join(root, "design-system/penpot-sync/graph");
const currentPath = path.join(graphDir, "current-live.json");
const successfulPath = path.join(graphDir, "last-successful.json");
const packageRoot = path.join(root, "design-system/runtime/screens");
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const nodes = (items, out = []) => { for (const item of items || []) { out.push(item); nodes(item.children, out); } return out; };

function verify(graph) {
  const list = nodes(graph.pages);
  const ids = new Set(list.map((node) => node.penpotId));
  if (!graph.metadata?.capturedAt || !graph.metadata?.nodeCount || ids.size !== list.length || !list.some((node) => node.penpotId === "50f514fe-4a8a-804d-8008-aa3b16cea7b7")) throw new Error("LIVE_GRAPH_INCOMPLETE");
  return list;
}

function screenChanges(changes) {
  const result = [];
  for (const [packageName, screen] of Object.entries(screens)) {
    const marker = packageName.replace(/-master$/, "");
    const relevant = changes.filter((change) => String(change.path || change.semanticPath || "").toLowerCase().includes(marker));
    if (relevant.length) result.push({ packageName, screenId: screen.id, changes: relevant.length });
  }
  return result;
}

function validatePackage(dir) {
  const required = ["manifest.json", "visual.svg", "styles.css", "fonts.css", "bindings.json"];
  for (const file of required) if (!fs.existsSync(path.join(dir, file))) throw new Error(`VISUAL_PACKAGE_INVALID:${file}`);
  const manifest = read(path.join(dir, "manifest.json"));
  if (!manifest.screenId || !manifest.hashes?.markup || !manifest.hashes?.styles) throw new Error("VISUAL_PACKAGE_INVALID:manifest");
  return manifest;
}

function promote(graph, packageHashes, metadata = {}) {
  const staged = { ...graph, metadata: { ...graph.metadata, graphHash: hash(graph) }, successfulSnapshot: { ...metadata, packageHashes, promotedAt: new Date().toISOString() } };
  const temp = `${successfulPath}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(staged, null, 2)}\n`);
  JSON.parse(fs.readFileSync(temp, "utf8"));
  fs.renameSync(temp, successfulPath);
  return staged;
}

export async function runLiveGraph({ dryRun = false } = {}) {
  const started = Date.now();
  const captureResult = await capture();
  const current = read(currentPath);
  const currentNodes = verify(current);
  const previous = fs.existsSync(successfulPath) ? read(successfulPath) : null;
  if (!previous) return { result: dryRun ? "BOOTSTRAP_READY" : "BOOTSTRAP_REQUIRED", capture: "PASS", nodes: currentNodes.length, promoted: false };
  const changes = diff(previous, current);
  const changedScreens = screenChanges(changes);
  const currentHash = hash(current);
  const previousHash = hash(previous);
  const base = { capture: "PASS", currentGraphHash: currentHash, successfulGraphHash: previousHash, changedScreens, changesDetected: changes.length, captureDurationMs: captureResult?.durationMs ?? Date.now() - started, promoted: false };
  if (dryRun) return { ...base, result: changes.length ? "CHANGE_DETECTED" : "NO_CHANGES", promotion: "SKIPPED" };
  if (!changes.length) return { ...base, result: "NO_CHANGES" };

  const stageRoot = path.join(root, `.duduq-runtime-stage-${process.pid}`);
  const backups = [];
  const packageHashes = {};
  try {
    fs.rmSync(stageRoot, { recursive: true, force: true });
    fs.mkdirSync(stageRoot, { recursive: true });
    for (const entry of changedScreens) {
      const finalDir = path.join(packageRoot, entry.packageName);
      const stageDir = path.join(stageRoot, entry.packageName);
      fs.cpSync(finalDir, stageDir, { recursive: true });
      await compile(entry.packageName, { outputRoot: stageRoot });
      const manifest = validatePackage(stageDir);
      packageHashes[entry.packageName] = manifest.hashes.markup;
    }
    for (const entry of changedScreens) {
      const finalDir = path.join(packageRoot, entry.packageName);
      const stageDir = path.join(stageRoot, entry.packageName);
      const backupDir = `${finalDir}.checkpoint5-backup`;
      fs.rmSync(backupDir, { recursive: true, force: true });
      fs.renameSync(finalDir, backupDir); backups.push({ finalDir, backupDir });
      fs.renameSync(stageDir, finalDir);
    }
    for (const entry of changedScreens) validatePackage(path.join(packageRoot, entry.packageName));
    const manifests = { ...((previous.successfulSnapshot || {}).packageHashes || {}), ...packageHashes };
    const promoted = promote(current, manifests, { source: "PENPOT_LIVE", changedScreens: changedScreens.map((entry) => entry.packageName) });
    for (const { backupDir } of backups) fs.rmSync(backupDir, { recursive: true, force: true });
    fs.rmSync(stageRoot, { recursive: true, force: true });
    return { ...base, result: "APPLIED", packageHashes: manifests, promoted: true, runtimeValidation: "PACKAGE_VALIDATED", elapsedMs: Date.now() - started, successfulGraphHash: hash(promoted) };
  } catch (error) {
    for (const { finalDir, backupDir } of backups.reverse()) {
      fs.rmSync(finalDir, { recursive: true, force: true });
      if (fs.existsSync(backupDir)) fs.renameSync(backupDir, finalDir);
    }
    fs.rmSync(stageRoot, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1]?.endsWith("duduq-live-graph-runner.mjs")) runLiveGraph({ dryRun: process.argv.includes("--dry-run") }).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 2; });

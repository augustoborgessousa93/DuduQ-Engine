import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { capture } from "./capture-penpot-graph.mjs";
import { diff } from "./duduq-design-graph-v2.mjs";
import { compile, screens } from "./compile-penpot-screen.mjs";
import { resolveVerificationUrls } from "./duduq-verification-links.mjs";

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

function visualDeltaReport(changes) {
  const report = { changedNodes: [], addedNodes: [], removedNodes: [], reorderedNodes: [], assetChanges: [], typographyChanges: [], geometryChanges: [], styleChanges: [] };
  for (const change of changes) {
    const entry = { nodeId: change.nodeId, path: change.path || change.semanticPath, kind: change.kind };
    if (change.kind === "NODE_ADDED") report.addedNodes.push(entry);
    else if (change.kind === "NODE_REMOVED") report.removedNodes.push(entry);
    else if (change.kind === "NODE_REPARENTED") report.reorderedNodes.push(entry);
    else report.changedNodes.push(entry);
    const path = String(entry.path || "").toLowerCase();
    if (/asset|image|href|svg|vector/.test(path)) report.assetChanges.push(entry);
    if (/typography|font|letterspacing|lineheight|align/.test(path)) report.typographyChanges.push(entry);
    if (/geometry|\.x$|\.y$|width|height|rotation/.test(path)) report.geometryChanges.push(entry);
    if (/appearance|fills|strokes|radius|opacity|effects|shadow|blur|visible/.test(path)) report.styleChanges.push(entry);
  }
  return report;
}

  function validatePackage(dir) {
    const required = ["manifest.json", "visual.svg", "styles.css", "fonts.css", "bindings.json", "visual-reference.png"];
    for (const file of required) if (!fs.existsSync(path.join(dir, file))) throw new Error(`VISUAL_PACKAGE_INVALID:${file}`);
    const manifest = read(path.join(dir, "manifest.json"));
    if (!manifest.screenId || !manifest.hashes?.markup || !manifest.hashes?.styles || !manifest.hashes?.reference) throw new Error("VISUAL_PACKAGE_INVALID:manifest");
    const visual = fs.readFileSync(path.join(dir, "visual.svg"), "utf8");
    const refs = [...visual.matchAll(/(?:href|xlink:href)=["']([^"']+)["']/g)].map((match) => match[1]).filter((ref) => !/^(data:|https?:|#|mailto:|javascript:)/i.test(ref));
    for (const ref of refs) if (!fs.existsSync(path.resolve(dir, ref))) throw new Error(`VISUAL_PACKAGE_INVALID:asset:${ref}`);
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
  if (!previous) return { result: dryRun ? "BOOTSTRAP_READY" : "BOOTSTRAP_REQUIRED", capture: "PASS", nodes: currentNodes.length, promoted: false, verification: { urls: await resolveVerificationUrls({ noChanges: true }) } };
  const changes = diff(previous, current);
  const changedScreens = screenChanges(changes);
  const currentHash = hash(current);
  const previousHash = hash(previous);
  const base = { capture: "PASS", currentGraphHash: currentHash, successfulGraphHash: previousHash, changedScreens, changesDetected: changes.length, visualDeltaReport: visualDeltaReport(changes), captureDurationMs: captureResult?.durationMs ?? Date.now() - started, promoted: false };
  if (dryRun) return { ...base, result: changes.length ? "CHANGE_DETECTED" : "NO_CHANGES", promotion: "SKIPPED", verification: { urls: await resolveVerificationUrls({ changedScreens, noChanges: !changes.length || !changedScreens.length }) } };
  if (!changes.length) return { ...base, result: "NO_CHANGES", verification: { urls: await resolveVerificationUrls({ noChanges: true, packageHashes: previous.successfulSnapshot?.packageHashes || {} }) } };

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
    return { ...base, result: "APPLIED", packageHashes: manifests, promoted: true, runtimeValidation: "PACKAGE_VALIDATED", verification: { urls: await resolveVerificationUrls({ changedScreens, packageHashes: manifests }) }, elapsedMs: Date.now() - started, successfulGraphHash: hash(promoted) };
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

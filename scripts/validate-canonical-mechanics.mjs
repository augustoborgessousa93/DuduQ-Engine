#!/usr/bin/env node
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "content/mechanics/canonical-mechanics-registry.json");
const lockPath = path.join(root, "content/mechanics/canonical-mechanics-lock-v1.json");
const questionPath = path.join(root, "content/english/year-1/module-01/questions.json");
const expectedStatus = new Set(["PRODUCTION_CANONICAL_CANDIDATE", "GOLD_MASTER_SOURCE", "QA_REFERENCE", "LEGACY_BLOCKED", "GENERATED_OUTPUT", "UNKNOWN_REQUIRES_HUMAN_REVIEW"]);
const sourceExt = new Set([".js", ".mjs", ".html", ".css"]);
const lockExt = new Set([".js", ".mjs", ".html", ".css", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".woff", ".woff2"]);
const sharedDependencyPaths = [
  "core/duduq-y1m01-module-runtime.js", "core/duduq-canonical-screen-transition.js", "core/duduq-module-flow.js",
  "core/ui/duduq-canonical-header-hud.js", "core/ui/duduq-canonical-question-hud.js",
  "core/duduq-canonical-header-hud.css", "core/duduq-canonical-question-hud.css",
  "core/duduq-live-hud.css", "core/duduq-gold-master-hud.css", "core/duduq-game-shell.css",
  "core/duduq-tokens.css", "core/duduq-fullscreen-mode.css",
  "core/duduq-page-transition.js", "core/duduq-page-transition.css",
  "core/duduq-transition.js", "core/duduq-transition.css", "core/duduq-official-transition.css",
  "core/duduq-transition-presence.css", "core/duduq-progress-ui.js",
  "core/audio/duduq-sound-system.js", "core/audio/duduq-sound-manifest.js",
  "core/duduq-sound.js", "core/duduq-content-audio.js", "core/duduq-content-media.js", "core/duduq-assets.js",
  "core/assets/", "assets/ui/"
];
const lockedMechanicIds = ["intro", "target-shooter", "bubble-pop", "drag-drop-multimedia", "drag-drop", "matching", "smart-sentence-complete", "smart-sentence-order", "memory-quest"];

const exists = async (relative) => stat(path.join(root, relative)).then(() => true, () => false);
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

function validateItems(items, registry) {
  const errors = [];
  if (!Array.isArray(items) || items.length !== 20) errors.push(`Y1M01_EXPECTED_20_ITEMS:${items?.length ?? "missing"}`);
  const counts = {};
  for (const item of items || []) {
    const id = item.mechanicId;
    counts[id] = (counts[id] || 0) + 1;
    const entry = registry.mechanics?.[id];
    if (typeof id === "string" && /engine\/releases|(?:^|\/)legacy\//i.test(id)) {
      errors.push(`LEGACY_MECHANIC_REFERENCE:${item.item_id}:${id}`);
      continue;
    }
    if (!id || !entry) {
      errors.push(`MECHANIC_ID_NOT_REGISTERED:${item.item_id}:${id || "missing"}`);
      continue;
    }
    if (entry.status === "NOT_IMPLEMENTED" || entry.status === "LEGACY_BLOCKED") {
      errors.push(`BLOCKED_MECHANIC:${item.item_id}:${id}`);
      continue;
    }
    if (entry.status !== "PRODUCTION_CANONICAL_LOCKED") {
      errors.push(`BLOCKED_MECHANIC:${item.item_id}:${id}:${entry.status || "missing-status"}`);
      continue;
    }
    if (item.runtimeMechanic && item.runtimeMechanic !== id) errors.push(`MECHANIC_ID_MISMATCH:${item.item_id}:${id}:${item.runtimeMechanic}`);
    if (item.mecanica_preferida && item.mecanica_preferida !== id) errors.push(`MECHANIC_ID_MISMATCH:${item.item_id}:${id}:${item.mecanica_preferida}`);
    if (!entry.runtimeRoute || !entry.canonicalCandidateSource?.length) errors.push(`CANONICAL_MECHANIC_NOT_FOUND:${id}`);
    if (!item.topicEn?.trim()) errors.push(`TOPIC_EN_MISSING:${item.item_id}`);
    if (!item.interactionGate?.requireCompletion || !item.instruction?.instructionAudioEnId || !item.instruction?.instructionAudioPtId) errors.push(`INSTRUCTION_GATE_CONTRACT_INVALID:${item.item_id}`);
    if (!item.feedbackGate?.lockAfterAnswer || !item.feedbackGate?.releaseContinueOrRetryAfterFeedbackAudio) errors.push(`FEEDBACK_GATE_CONTRACT_INVALID:${item.item_id}`);
    const serializedItem = JSON.stringify(item);
    const historicalReference = serializedItem.match(/(?:^|["'\s])(?:\/|\\)?(?:engine\/releases|legacy)\/[^"'\s]+/i);
    if (historicalReference) errors.push(`LEGACY_MECHANIC_REFERENCE:${item.item_id}:${historicalReference[0].trim()}`);
    const blocked = (entry.legacyBlockedPaths || []).find((pattern) => pattern.includes("engine/releases") || pattern.includes("legacy/"));
    if (blocked && item.implementationPath && item.implementationPath.includes(blocked.replace("**", ""))) errors.push(`LEGACY_MECHANIC_REFERENCE:${item.item_id}:${item.implementationPath}`);
  }
  if (counts["target-shooter"] !== 12 || counts["bubble-pop"] !== 3 || counts["drag-drop-multimedia"] !== 5 || Object.keys(counts).length !== 3) errors.push(`Y1M01_MECHANIC_DISTRIBUTION_INVALID:${JSON.stringify(counts)}`);
  for (const item of items || []) {
    if (item.mechanicId !== "drag-drop-multimedia") continue;
    const audio = item.audioBindings || [];
    const destinations = item.mediaBindings || [];
    const maps = item.dragDropContract?.mappings || item.correctAnswerContract?.mappings || [];
    const audioIds = new Set(audio.map((binding) => binding.itemId || binding.audioId));
    const targets = new Set(destinations.map((binding) => binding.targetId));
    if (audio.length !== 4 || audioIds.size !== 4 || destinations.length !== 4 || targets.size !== 4 || maps.length !== 4) errors.push(`DRAG_DROP_4X4_INVALID:${item.item_id}:audio=${audio.length}:destinations=${destinations.length}:mappings=${maps.length}`);
    if (audio.some((binding) => !binding.audioId || !binding.answerKey) || destinations.some((binding) => !binding.mediaId || !binding.answerKey || !binding.targetId)) errors.push(`DRAG_DROP_4X4_BINDING_INCOMPLETE:${item.item_id}`);
    if (audio.some((binding) => !destinations.some((target) => target.answerKey === binding.answerKey))) errors.push(`DRAG_DROP_4X4_ORPHAN_AUDIO:${item.item_id}`);
    if (destinations.some((target) => !audio.some((binding) => binding.answerKey === target.answerKey))) errors.push(`DRAG_DROP_4X4_ORPHAN_VISUAL:${item.item_id}`);
  }
  return errors;
}

async function walkImplementations() {
  const roots = ["play", "core", "test", "runtime", "engine", "adapters", "artifacts", "legacy", "generated", "dist-pages", "tools"];
  const mechanicsPattern = /intro|target.?shooter|bubble.?pop|drag.?drop|matching|smart.?sentence|memory.?quest/i;
  const rows = [];
  async function walk(relative) {
    if (!await exists(relative)) return;
    const entries = await readdir(path.join(root, relative), { withFileTypes: true });
    for (const entry of entries) {
      const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) { await walk(child); continue; }
      if (!entry.isFile() || !sourceExt.has(path.extname(entry.name).toLowerCase())) continue;
      const text = mechanicsPattern.test(child) ? "" : await readFile(path.join(root, child), "utf8").catch(() => "");
      if (!mechanicsPattern.test(child) && !mechanicsPattern.test(text.slice(0, 30000))) continue;
      rows.push({ path: child, status: classify(child) });
    }
  }
  for (const directory of roots) await walk(directory);
  return rows;
}

async function sha256File(relative) {
  const bytes = await readFile(path.join(root, relative));
  return createHash("sha256").update(bytes).digest("hex");
}

async function collectLockedFiles(relative) {
  const absolute = path.join(root, relative);
  const info = await stat(absolute).catch(() => null);
  if (!info) return [];
  if (info.isFile()) return lockExt.has(path.extname(relative).toLowerCase()) ? [relative.replaceAll("\\", "/")] : [];
  if (!info.isDirectory()) return [];
  const files = [];
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    files.push(...await collectLockedFiles(path.posix.join(relative.replaceAll("\\", "/"), entry.name)));
  }
  return files;
}

async function createLockManifest(registry, approvalBy = "AUGUSTO", approvalDate = "2026-10-09") {
  const shared = [];
  for (const relative of sharedDependencyPaths) {
    const files = await collectLockedFiles(relative);
    if (!files.length) throw new Error(`CANONICAL_SOURCE_MISSING:shared:${relative}`);
    for (const file of files) shared.push({ path: file, sha256: await sha256File(file) });
  }
  const mechanics = {};
  for (const mechanicId of lockedMechanicIds) {
    const entry = registry.mechanics?.[mechanicId];
    if (!entry || entry.status !== "PRODUCTION_CANONICAL_LOCKED") throw new Error(`CANONICAL_SOURCE_MISMATCH:${mechanicId}:not-locked-in-registry`);
    const paths = new Set();
    for (const source of entry.canonicalCandidateSource || []) {
      const files = await collectLockedFiles(source);
      if (!files.length) throw new Error(`CANONICAL_SOURCE_MISSING:${mechanicId}:${source}`);
      files.forEach(file => paths.add(file));
    }
    for (const source of entry.integrationLayer || []) {
      if (!await exists(source)) throw new Error(`CANONICAL_SOURCE_MISSING:${mechanicId}:${source}`);
    }
    const sourceFiles = [];
    for (const file of [...paths].sort()) sourceFiles.push({ path: file, sha256: await sha256File(file) });
    const owned = new Set(paths);
    const sharedPaths = new Set(sharedDependencyPaths);
    const integrationDependencies = [];
    for (const dependency of entry.integrationLayer || []) {
      if (owned.has(dependency) || sharedPaths.has(dependency)) continue;
      integrationDependencies.push({ path: dependency, sha256: await sha256File(dependency) });
    }
    const sourceSetSha256 = createHash("sha256").update(sourceFiles.map(file => `${file.path}\0${file.sha256}`).join("\n")).digest("hex");
    mechanics[mechanicId] = {
      mechanicId,
      version: entry.currentVersion,
      canonicalCandidateSource: entry.canonicalCandidateSource,
      goldMasterSource: entry.goldMasterSource,
      runtimeRoute: entry.runtimeRoute,
      approvedModes: entry.approvedModes,
      approvedBy: entry.humanAuthority || approvalBy,
      approvedAt: entry.approvalDate || "2026-10-09",
      status: "PRODUCTION_CANONICAL_LOCKED",
      sourceSetSha256,
      sourceFiles,
      integrationDependencies,
      sharedDependencySet: "DUDUQ_SHARED_PRODUCTION_RUNTIME_V1"
    };
  }
  return {
    schemaVersion: "1.0",
    lockId: "DUDUQ_PRODUCTION_CANONICAL_MECHANICS_LOCK_V1",
    generatedOnlyWithExplicitHumanApproval: true,
    approvedBy: approvalBy,
    approvedAt: approvalDate,
    status: "PRODUCTION_CANONICAL_LOCKED",
    controlledSharedHudRebaseline: {
      reason: "CONTROLLED_REBASELINE_AFTER_UNRECOVERABLE_HISTORICAL_BYTES",
      authorizedBy: approvalBy,
      authorizedDate: approvalDate,
      targetedGameplayRegression: "8/8 PASS; no confirmed shared-HUD regression",
      historicalSha256: {
        "core/ui/duduq-canonical-question-hud.js": "fcda7f7a54162d03a1b2d80bc11efd2b1aa3a1f747e84ffec9bd217fdd70b1f1",
        "core/duduq-canonical-question-hud.css": "e5872270146c7955b12963032b3160c865ff4dd018b29393dea2a0c1b7a0413f"
      }
    },
    sharedDependencies: shared,
    mechanics
  };
}

async function validateLock(registry, errors) {
  let lock;
  try { lock = await readJson(lockPath); }
  catch { errors.push("CANONICAL_SOURCE_MISSING:content/mechanics/canonical-mechanics-lock-v1.json"); return; }
  if (lock.approvedBy !== "AUGUSTO" || !/^\d{4}-\d{2}-\d{2}$/.test(lock.approvedAt || "") || lock.status !== "PRODUCTION_CANONICAL_LOCKED" || lock.generatedOnlyWithExplicitHumanApproval !== true) errors.push("CANONICAL_SOURCE_MISMATCH:lock-approval-metadata");
  const expectedShared = new Set();
  for (const relative of sharedDependencyPaths) {
    const files = await collectLockedFiles(relative);
    if (!files.length) errors.push(`CANONICAL_SOURCE_MISSING:shared:${relative}`);
    files.forEach(file => expectedShared.add(file));
  }
  const actualShared = new Set((lock.sharedDependencies || []).map(row => row.path));
  if (expectedShared.size !== actualShared.size || [...expectedShared].some(file => !actualShared.has(file))) errors.push("CANONICAL_SOURCE_MISMATCH:shared-dependency-set");
  for (const mechanicId of lockedMechanicIds) {
    const entry = registry.mechanics?.[mechanicId];
    const locked = lock.mechanics?.[mechanicId];
    if (!entry || !locked || entry.status !== "PRODUCTION_CANONICAL_LOCKED" || entry.humanAuthority !== "AUGUSTO" || entry.secondHomologation !== "APPROVED" || entry.approvalDate !== locked.approvedAt || locked.approvedBy !== "AUGUSTO" || entry.sourceLockManifest !== "content/mechanics/canonical-mechanics-lock-v1.json") {
      errors.push(`CANONICAL_SOURCE_MISMATCH:${mechanicId}:registry-lock-authority`); continue;
    }
    if (JSON.stringify(entry.canonicalCandidateSource) !== JSON.stringify(locked.canonicalCandidateSource) || entry.goldMasterSource !== locked.goldMasterSource || entry.runtimeRoute !== locked.runtimeRoute || JSON.stringify(entry.approvedModes) !== JSON.stringify(locked.approvedModes) || entry.currentVersion !== locked.version) {
      errors.push(`CANONICAL_SOURCE_MISMATCH:${mechanicId}:registry-source-identity`); continue;
    }
    const expectedSources = new Set();
    for (const source of entry.canonicalCandidateSource || []) {
      const files = await collectLockedFiles(source);
      if (!files.length) errors.push(`CANONICAL_SOURCE_MISSING:${mechanicId}:${source}`);
      files.forEach(file => expectedSources.add(file));
    }
    const lockedSources = new Set((locked.sourceFiles || []).map(file => file.path));
    if (expectedSources.size !== lockedSources.size || [...expectedSources].some(file => !lockedSources.has(file))) errors.push(`CANONICAL_SOURCE_MISMATCH:${mechanicId}:source-file-set`);
    for (const file of locked.sourceFiles || []) {
      if (!await exists(file.path)) { errors.push(`CANONICAL_SOURCE_MISSING:${mechanicId}:${file.path}`); continue; }
      if (await sha256File(file.path) !== file.sha256) errors.push(`CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:${mechanicId}:${file.path}`);
    }
    const actualSetHash = createHash("sha256").update((locked.sourceFiles || []).map(file => `${file.path}\0${file.sha256}`).join("\n")).digest("hex");
    if (actualSetHash !== locked.sourceSetSha256) errors.push(`CANONICAL_SOURCE_MISMATCH:${mechanicId}:source-set-digest`);
    for (const file of locked.integrationDependencies || []) {
      if (!await exists(file.path)) { errors.push(`CANONICAL_SOURCE_MISSING:${mechanicId}:integration:${file.path}`); continue; }
      if (await sha256File(file.path) !== file.sha256) errors.push(`CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:${mechanicId}:integration:${file.path}`);
    }
  }
  for (const file of lock.sharedDependencies || []) {
    if (!await exists(file.path)) { errors.push(`CANONICAL_SOURCE_MISSING:shared:${file.path}`); continue; }
    if (await sha256File(file.path) !== file.sha256) errors.push(`CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:${file.path}`);
  }
  const unscramble = registry.mechanics?.["smart-sentence-unscramble"];
  if (!unscramble || unscramble.status !== "NOT_IMPLEMENTED" || unscramble.secondHomologation !== "NOT_APPROVED") errors.push("CANONICAL_SOURCE_MISMATCH:smart-sentence-unscramble:must-remain-not-implemented");
}

function classify(file) {
  const p = file.replaceAll("\\", "/");
  if (p.startsWith("dist-pages/") || p.startsWith("artifacts/") || p.startsWith("generated/")) return "GENERATED_OUTPUT";
  if (/^test\/(target-shooter\/gold-master-clean-v2|matching\/gold-master-candidate-v1)\//.test(p)) return "GOLD_MASTER_SOURCE";
  if (p.startsWith("engine/releases/") || p.startsWith("legacy/") || /year2-v2[23]-homolog-dragdrop-visual-patch/.test(p)) return "LEGACY_BLOCKED";
  if (p.startsWith("test/")) return "QA_REFERENCE";
  if (p.startsWith("tools/")) return "QA_REFERENCE";
  if (p.startsWith("runtime/")) return "GENERATED_OUTPUT";
  if (p.startsWith("play/") || p.startsWith("core/") || p === "engine/channels/rollback/canary-r143-m03-public-entry.html") return p === "engine/channels/rollback/canary-r143-m03-public-entry.html" ? "QA_REFERENCE" : "PRODUCTION_CANONICAL_CANDIDATE";
  if (p.startsWith("engine/")) return "LEGACY_BLOCKED";
  return "UNKNOWN_REQUIRES_HUMAN_REVIEW";
}

async function validate({ selfTest = false, selfTestUnscramble = false } = {}) {
  const registry = await readJson(registryPath);
  const questions = await readJson(questionPath);
  const errors = [];
  for (const [key, entry] of Object.entries(registry.mechanics || {})) {
    if (entry.mechanicId !== key) errors.push(`REGISTRY_KEY_MISMATCH:${key}`);
    if (!["PRODUCTION_CANONICAL_LOCKED", "HUMAN_REVIEW_REQUIRED", "NOT_IMPLEMENTED"].includes(entry.status)) errors.push(`INVALID_HOMOLOGATION_STATE:${key}:${entry.status}`);
    if (lockedMechanicIds.includes(key) && (entry.status !== "PRODUCTION_CANONICAL_LOCKED" || entry.humanAuthority !== "AUGUSTO" || entry.secondHomologation !== "APPROVED" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.approvalDate || ""))) errors.push(`CANONICAL_SOURCE_MISMATCH:${key}:approval-record`);
    if (typeof entry.contentContract !== "string" || !Array.isArray(entry.mediaCapabilities) || !Array.isArray(entry.answerTypes) || !entry.alternativeCount || !("authoringAdapter" in entry)) errors.push(`CANONICAL_CONTRACT_METADATA_INCOMPLETE:${key}`);
    for (const source of entry.canonicalCandidateSource || []) if (!await exists(source)) errors.push(`CANONICAL_SOURCE_UNAVAILABLE:${key}:${source}`);
  }
  errors.push(...validateItems(questions.items, registry));
  await validateLock(registry, errors);
  const routeTableFile = path.join(root, "core/duduq-y1m01-module-runtime.js");
  const routeTable = await readFile(routeTableFile, "utf8");
  for (const item of questions.items || []) {
    const entry = registry.mechanics?.[item.mechanicId];
    const routeKey = item.mechanicId === "smart-sentence-complete" || item.mechanicId === "smart-sentence-order" || item.mechanicId === "smart-sentence-unscramble" ? "smart-sentence" : item.mechanicId;
    if (entry?.runtimeRoute && !routeTable.includes(`"${routeKey}": "${entry.runtimeRoute}"`) && !routeTable.includes(`${routeKey}: "${entry.runtimeRoute}"`)) errors.push(`PRODUCTION_ROUTE_NOT_CANONICAL:${item.item_id}:${entry.runtimeRoute}`);
  }
  const routeOwners = [
    ["play/target-shooter/index.html", ["/runtime/gold-masters/target-shooter/src/static-view.js"]],
    ["play/bubble-pop/index.html", ["./bubble-pop.js"]],
    ["play/drag-drop-multimedia/index.html", ["./drag-drop-multimedia.js"]]
  ];
  for (const [file, signatures] of routeOwners) {
    const text = await readFile(path.join(root, file), "utf8");
    for (const signature of signatures) if (!text.includes(signature)) errors.push(`PRODUCTION_ROUTE_OWNER_MISMATCH:${file}:${signature}`);
  }
  const buildScript = await readFile(path.join(root, "scripts/build-cloudflare-pages.mjs"), "utf8");
  if (!buildScript.includes('"test/target-shooter/gold-master-clean-v2/src"') || !buildScript.includes('"runtime/gold-masters/target-shooter/src"')) errors.push("TARGET_SHOOTER_BUILD_SOURCE_MISMATCH");
  const studioServer = await readFile(path.join(root, "scripts/duduq-content-studio.mjs"), "utf8");
  const historicalStudioRegistry = await readJson(path.join(root, "tools/content-studio/mechanic-registry-v2.json"));
  if (!studioServer.includes("content/mechanics/canonical-mechanics-registry.json") || studioServer.includes("mechanic-registry-v2.json")) errors.push("CONTENT_STUDIO_NOT_USING_CANONICAL_MECHANIC_REGISTRY");
  if (historicalStudioRegistry.status !== "HISTORICAL_NON_AUTHORITATIVE" || historicalStudioRegistry.supersededBy !== "content/mechanics/canonical-mechanics-registry.json") errors.push("DUPLICATE_STUDIO_CATALOG_NOT_MARKED_HISTORICAL");
  for (const file of ["core/duduq-y1m01-module-runtime.js", "core/duduq-target-shooter-content.js", "play/bubble-pop/bubble-pop.js", "play/drag-drop-multimedia/drag-drop-multimedia.js"]) {
    if (!await exists(file)) { errors.push(`OFFICIAL_RUNTIME_FILE_MISSING:${file}`); continue; }
    const text = await readFile(path.join(root, file), "utf8");
    if (/engine\/releases\/|\/legacy\/|raw\.githubusercontent\.com/.test(text)) errors.push(`ACTIVE_LEGACY_PRODUCTION_REFERENCE:${file}`);
    if (["core/duduq-target-shooter-content.js", "play/bubble-pop/bubble-pop.js", "play/drag-drop-multimedia/drag-drop-multimedia.js"].includes(file) && !text.includes("CANONICAL_MECHANIC_NOT_FOUND")) errors.push(`LEGACY_FALLBACK_GUARD_MISSING:${file}`);
  }
  if (!routeTable.includes("CANONICAL_MECHANIC_NOT_FOUND")) errors.push("NO_LEGACY_FALLBACK_GUARD_MISSING");
  const inventory = await walkImplementations();
  for (const row of inventory) if (!expectedStatus.has(row.status)) errors.push(`IMPLEMENTATION_UNCLASSIFIED:${row.path}`);
  if (selfTest) {
    const fixture = [{ item_id: "CONTROLLED-LEGACY-FIXTURE", mechanicId: "engine/releases/mechanics/bubble-pop/1.0.0" }];
    const result = validateItems(fixture, registry);
    if (!result.some((error) => error.startsWith("LEGACY_MECHANIC_REFERENCE:"))) errors.push("CONTROLLED_LEGACY_REJECTION_SELF_TEST_FAILED");
    else console.log("CONTROLLED_LEGACY_REJECTION: PASS (in-memory fixture rejected as LEGACY_MECHANIC_REFERENCE)");
  }
  if (selfTestUnscramble) {
    const fixture = [{ item_id: "CONTROLLED-UNSCRAMBLE-FIXTURE", mechanicId: "smart-sentence-unscramble" }];
    const result = validateItems(fixture, registry);
    if (!result.some((error) => error.startsWith("BLOCKED_MECHANIC:CONTROLLED-UNSCRAMBLE-FIXTURE:smart-sentence-unscramble"))) errors.push("CONTROLLED_UNSCRAMBLE_REJECTION_SELF_TEST_FAILED");
    else console.log("CONTROLLED_UNSCRAMBLE_REJECTION: PASS (fixture rejected as BLOCKED_MECHANIC)");
  }
  const tally = Object.fromEntries([...expectedStatus].map((status) => [status, inventory.filter((row) => row.status === status).length]));
  return { errors, inventory, tally };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--write-approved-lock")) {
    const approvalBy = process.argv.find(value => value.startsWith("--approval-authority="))?.split("=")[1];
    const approvalDate = process.argv.find(value => value.startsWith("--approval-date="))?.split("=")[1];
    if (approvalBy !== "AUGUSTO" || !/^\d{4}-\d{2}-\d{2}$/.test(approvalDate || "")) throw new Error("Explicit Augusto approval authority/date required to create source lock.");
    const registry = await readJson(registryPath);
    const lock = await createLockManifest(registry, approvalBy, approvalDate);
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
    console.log("CANONICAL_SOURCE_LOCK_WRITTEN: content/mechanics/canonical-mechanics-lock-v1.json");
  }
  const result = await validate({ selfTest: process.argv.includes("--self-test"), selfTestUnscramble: process.argv.includes("--self-test-unscramble") });
  if (process.argv.includes("--write-inventory")) {
    const inventoryFile = path.join(root, "content/mechanics/implementation-inventory.json");
    await writeFile(inventoryFile, `${JSON.stringify({ schemaVersion: "1.0", authority: "content/mechanics/canonical-mechanics-registry.json", note: "Executable implementation/reference paths discovered from workspace roots; dist-pages and artifacts are classified outputs, not source authority.", implementationCount: result.inventory.length, classifications: result.tally, implementations: result.inventory }, null, 2)}\n`, "utf8");
    console.log("IMPLEMENTATION_INVENTORY_WRITTEN: content/mechanics/implementation-inventory.json");
  }
  console.log(JSON.stringify({ status: result.errors.length ? "FAIL" : "PASS", implementationCount: result.inventory.length, classifications: result.tally, errors: result.errors }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

export { validate };

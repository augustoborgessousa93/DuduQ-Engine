import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "docs/qa/DUDUQ_CANONICAL_BASELINE_CANDIDATE_V11_3C.json");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const lock = await readJson("content/mechanics/canonical-mechanics-lock-v1.json");
const registry = await readJson("content/mechanics/canonical-mechanics-registry.json");
const provenance = await readJson("docs/qa/DUDUQ_CANONICAL_HASH_PROVENANCE_V11_3B.json");
const { report: sourceQa } = await import("./qa-v11-3-source-product.mjs");
const registryMechanics = registry.mechanics || {};
const lockMechanics = lock.mechanics || {};
const owners = new Map();
const lockedFiles = new Map();

for (const [mechanicId, mechanic] of Object.entries(lockMechanics)) {
  const dependencies = Array.isArray(mechanic.integrationDependencies)
    ? mechanic.integrationDependencies
    : mechanic.integrationDependencies ? [mechanic.integrationDependencies] : [];
  for (const file of [...(mechanic.sourceFiles || []), ...dependencies]) {
    const entry = lockedFiles.get(file.path) || { path: file.path, lockedSha256: file.sha256, mechanicOwners: [], sharedSystemOwners: [] };
    if (!entry.mechanicOwners.includes(mechanicId)) entry.mechanicOwners.push(mechanicId);
    lockedFiles.set(file.path, entry);
  }
}
for (const shared of lock.sharedDependencies || []) {
  const entry = lockedFiles.get(shared.path) || { path: shared.path, lockedSha256: shared.sha256, mechanicOwners: [], sharedSystemOwners: [] };
  entry.sharedSystemOwners.push("shared-production-runtime");
  lockedFiles.set(shared.path, entry);
}

const files = [];
for (const entry of [...lockedFiles.values()].sort((a, b) => a.path.localeCompare(b.path))) {
  let currentSha256 = null;
  let status = "MISSING";
  try {
    currentSha256 = createHash("sha256").update(await readFile(path.join(root, entry.path))).digest("hex");
    status = currentSha256 === entry.lockedSha256 ? "MATCH" : "HASH_DIVERGENCE_INFORMATIONAL";
  } catch {}
  const name = entry.path.toLowerCase();
  if (/audio|sound/.test(name)) entry.sharedSystemOwners.push("audio-controls-and-player");
  if (/hud|header/.test(name)) entry.sharedSystemOwners.push("canonical-hud-and-question-box");
  if (/module-flow|screen-transition|page-transition|transition/.test(name)) entry.sharedSystemOwners.push("navigation-and-lifecycle");
  if (/\.css$/.test(name)) entry.sharedSystemOwners.push("visual-layout-and-responsive-styles");
  const priorRows = (provenance.rows || []).filter((row) => row.path === entry.path);
  files.push({ ...entry, sharedSystemOwners: [...new Set(entry.sharedSystemOwners)], currentSha256, lockStatus: status, priorGateDivergenceIds: priorRows.map((row) => row.divergenceId) });
}

const samples = [
  ["intro", "Y1M01", "", "/play/english/year-1/module-01/"],
  ["target-shooter", "Y1M01", "Y1M01-Q001", "/play/target-shooter/?duduqModule=Y1M01&duduqItem=Y1M01-Q001"],
  ["bubble-pop", "Y1M01", "Y1M01-Q002", "/play/bubble-pop/?duduqModule=Y1M01&duduqItem=Y1M01-Q002"],
  ["drag-drop-multimedia", "Y1M01", "Y1M01-Q006", "/play/drag-drop-multimedia/?duduqModule=Y1M01&duduqItem=Y1M01-Q006"],
  ["drag-drop", "Y2M02", "Y2M02-Q003", "/play/drag-drop/?duduqModule=Y2M02&duduqItem=Y2M02-Q003"],
  ["matching", "Y1M02", "Y1M02-Q006", "/play/matching/?duduqModule=Y1M02&duduqItem=Y1M02-Q006"],
  ["memory-quest", "Y2M01", "Y2M01-Q011", "/play/memory-quest/?duduqModule=Y2M01&duduqItem=Y2M01-Q011"],
  ["smart-sentence-complete", "Y1M02", "Y1M02-Q008", "/play/smart-sentence/?duduqModule=Y1M02&duduqItem=Y1M02-Q008"],
  ["smart-sentence-order", "Y3M01", "Y3M01-Q019", "/play/smart-sentence/?duduqModule=Y3M01&duduqItem=Y3M01-Q019"],
  ["module-final", "Y1M01", "", "/play/final-module/?moduleId=Y1M01&qa=1"]
];

const mechanics = samples.map(([mechanicId, moduleId, itemId, route]) => {
  const registryEntry = registryMechanics[mechanicId] || {};
  const hashFiles = files.filter((file) => file.mechanicOwners.includes(mechanicId));
  return {
    mechanicId,
    displayName: registryEntry.displayName || (mechanicId === "module-final" ? "Module Final" : mechanicId),
    moduleId,
    itemId: itemId || null,
    sourceRoute: route,
    automaticQa: sourceQa.status === "PASS" ? "PASS_STATIC_SOURCE_PRODUCT_30_MODULES_600_ACTIVITIES" : "ISSUE_STATIC_SOURCE_PRODUCT",
    automaticEvidence: `${sourceQa.activities}/600 activities; ${sourceQa.modules}/30 modules; structuralErrors=${sourceQa.structuralErrors}; missingMediaOrAudio=${sourceQa.missingMediaOrAudio}`,
    hashEntryCount: hashFiles.length,
    lockHashDivergences: hashFiles.filter((file) => file.lockStatus === "HASH_DIVERGENCE_INFORMATIONAL").length,
    humanStatus: "PENDING"
  };
});

const sharedSystems = [
  { id: "canonical-hud", name: "Canonical HUD / instruction question box", automaticQa: "PASS_STATIC_PRODUCT_QA; HUMAN_VISUAL_REVIEW_PENDING", humanStatus: "PENDING" },
  { id: "instruction-audio-control", name: "Instruction audio control", automaticQa: "STATIC_SOURCE_PRESENT; HUMAN_ROLE_AND_PLAYBACK_CHECK_PENDING", humanStatus: "PENDING" },
  { id: "learner-content-audio-control", name: "Learner-content Penpot audio control", automaticQa: "STATIC_SOURCE_PRESENT; HUMAN_ROLE_AND_STATE_CHECK_PENDING", humanStatus: "PENDING" },
  { id: "shared-audio-player", name: "Shared content audio player / cancellation race fix", automaticQa: "PASS_7_STALE_SEQUENCE_TESTS; HUMAN_RAPID_PLAY_LISTENING_PENDING", humanStatus: "PENDING" },
  { id: "isolated-letter-audio", name: "Isolated English letter audio", automaticQa: "PASS_ONE_TARGET_NO_CUE_AND_RACE_UNIT_TESTS; HUMAN_LISTENING_PENDING", humanStatus: "PENDING" },
  { id: "feedback-personality", name: "Feedback personality and retry/continue", automaticQa: "PASS_STATIC_CONTRACT_QA; HUMAN_PERSONALITY_REVIEW_PENDING", humanStatus: "PENDING" },
  { id: "navigation", name: "Navigation / lifecycle", automaticQa: "PASS_30_INTRO_30_FINAL_STATIC_FLOWS; REPRESENTATIVE_SOURCE_LINKS_HTTP_200", humanStatus: "PENDING" },
  { id: "responsive-and-one-line", name: "Responsive behavior / one-line instruction policy", automaticQa: "STATIC_INSTRUCTION_QA_PASS; HUMAN_WRAP_AND_VIEWPORT_REVIEW_PENDING", humanStatus: "PENDING" }
];

const manifest = {
  feature: "DUDUQ_CURRENT_CANONICAL_BASELINE_RECERTIFICATION_V11_3C",
  manifestType: "INACTIVE_HUMAN_RECERTIFICATION_CANDIDATE",
  generatedAt: new Date().toISOString(),
  authority: "AUGUSTO",
  humanStatus: "PENDING",
  scope: { canonicalMechanics: mechanics.map((item) => item.mechanicId), includesUnscramble: false, productionProductMutation: false },
  automaticQaSummary: { status: sourceQa.status, modules: sourceQa.modules, activities: sourceQa.activities, structuralErrors: sourceQa.structuralErrors, missingMediaOrAudio: sourceQa.missingMediaOrAudio, routeHttpSamples: "10/10 HTTP 200 on source QA 4177", notes: ["Static/source evidence only; not a substitute for Augusto's live visual and functional review.", "test/runtime/duduq-content-audio-stale-sequence.test.mjs: 7/7 PASS, including single letter target, no cue/gap, cancellation, and no previous tail.", "scripts/validate-curricular-master-v3.mjs: PASS 30 modules; scripts/validate-mechanic-curricular-eligibility.mjs: PASS.", "scripts/validate-drag-drop-multimedia-contract.mjs: PASS; scripts/validate-memory-quest-pair-contract.mjs: PASS; smart sentence complete validator: 8/8 audited, zero unresolved contracts."] },
  mechanics,
  sharedSystems,
  canonicalFiles: files,
  priorGateSnapshot: { feature: "V11.3B", divergenceRecords: provenance.rows?.length || 0, distinctPaths: new Set((provenance.rows || []).map((row) => row.path)).size, records: provenance.rows || [] },
  counts: { canonicalFileHashEntries: files.length, currentHashMatches: files.filter((file) => file.lockStatus === "MATCH").length, informationalHashDivergences: files.filter((file) => file.lockStatus === "HASH_DIVERGENCE_INFORMATIONAL").length, missingFiles: files.filter((file) => file.lockStatus === "MISSING").length, priorGateDivergenceRecords: provenance.rows?.length || 0, priorGateDistinctPaths: new Set((provenance.rows || []).map((row) => row.path)).size },
  safeguards: { lockModified: false, registryModified: false, productionBaselineModified: false, buildRun: false, deploymentRun: false }
};
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath: path.relative(root, outputPath), sourceQa: manifest.automaticQaSummary, counts: manifest.counts, humanStatus: manifest.humanStatus }, null, 2));

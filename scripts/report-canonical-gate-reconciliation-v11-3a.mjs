import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = "content/mechanics/canonical-mechanics-lock-v1.json";
const lock = JSON.parse(await readFile(path.join(root, lockPath), "utf8"));
const rows = [];

async function addHashRow(mechanic, file, authorityType) {
  const bytes = await readFile(path.join(root, file.path));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual === file.sha256) return;
  rows.push({
    divergenceId: `HASH-${String(rows.length + 1).padStart(2, "0")}`,
    mechanic,
    route: mechanic === "shared" ? "shared-dependency" : `/${mechanic}/`,
    moduleId: null,
    itemId: null,
    gateExpectation: `sha256:${file.sha256}`,
    actualValue: `sha256:${actual}`,
    sourceFile: file.path,
    authorityFile: lockPath,
    authorityType,
    classification: "CANONICAL_REGISTRY_DRIFT",
    rootCause: "Current source bytes differ from the dated lock hash. The lock proves the byte mismatch, but does not encode the change origin or item-level human approval; the referenced file diff must not be auto-approved by hash refresh.",
    requiredCorrection: "Preserve source unchanged pending per-file approval/provenance reconciliation; then either retain approved bytes with documented invariant evidence and update only this lock row, or surgically restore only proven unapproved drift.",
    engineChangeRequired: false,
    approvalStatus: "UNRESOLVED_FROM_AVAILABLE_AUTHORITY",
    gateBehavior: "Exact SHA-256 comparison; no behavioral diff analysis."
  });
}

for (const [mechanic, entry] of Object.entries(lock.mechanics || {})) {
  for (const file of entry.sourceFiles || []) await addHashRow(mechanic, file, "sourceFiles");
  for (const file of entry.integrationDependencies || []) await addHashRow(mechanic, file, "integrationDependencies");
}
for (const file of lock.sharedDependencies || []) await addHashRow("shared", file, "sharedDependencies");

rows.push({
  divergenceId: "ROUTE-OWNER-01",
  mechanic: "target-shooter",
  route: "/play/target-shooter/",
  moduleId: null,
  itemId: null,
  gateExpectation: "Source HTML contains /runtime/gold-masters/target-shooter/src/static-view.js",
  actualValue: "Source HTML imports /test/target-shooter/gold-master-clean-v2/src/static-view.js; the official build copies this Gold Master tree under /runtime/gold-masters/target-shooter/ and rewrites the path.",
  sourceFile: "play/target-shooter/index.html",
  authorityFile: "docs/qa/DUDUQ_CANONICAL_MECHANICS_PRODUCTION_BASELINE_V1.json; scripts/build-cloudflare-pages.mjs",
  authorityType: "source-route plus staged-build mapping",
  classification: "FALSE_POSITIVE_GATE_DRIFT",
  rootCause: "The validator expected the build-only runtime URL in the source HTML, although the approved source route deliberately imports the repository Gold Master path and the build owns the path rewrite.",
  requiredCorrection: "Check the source Gold Master path and verify the build copy/rewrite mapping separately.",
  engineChangeRequired: false,
  approvalStatus: "SUPPORTED_BY_BASELINE_V11_3A_V8_3_VERIFICATION_AND_CURRENT_SOURCE_BUILD_MAPPING",
  gateBehavior: "Literal substring check in play/target-shooter/index.html."
});

const report = {
  feature: "DUDUQ_CANONICAL_GATE_RECONCILIATION_V11_3A",
  generatedAt: new Date().toISOString(),
  initialDivergences: 46,
  currentGateDivergencesBeforeRouteFix: 46,
  currentGateDivergencesAfterRouteFix: 45,
  classes: rows.reduce((counts, row) => (counts[row.classification] = (counts[row.classification] || 0) + 1, counts), {}),
  gateMechanism: "scripts/validate-canonical-mechanics.mjs: exact SHA-256 source/integration/shared dependency hashes plus literal route owner checks; no diff semantics or approval provenance inferred.",
  frozenEngineFilesModifiedByThisReconciliation: 0,
  lockRegistryBaselineChanges: 0,
  rows
};

if (rows.length !== 46) throw new Error(`EXPECTED_46_DIVERGENCE_ROWS_GOT_${rows.length}`);
const output = path.join(root, "docs/qa/DUDUQ_CANONICAL_GATE_RECONCILIATION_V11_3A.json");
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(root, output), rows: rows.length, classifications: report.classes }, null, 2));

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), "utf8");
}

async function listFiles(relativeDir) {
  const root = path.join(ROOT, relativeDir);
  const out = [];
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else out.push(path.relative(ROOT, absolute).replaceAll(path.sep, "/"));
    }
  }
  if (await exists(relativeDir)) await walk(root);
  return out.sort();
}

const report = {
  contract: "DUDUQ_SYSTEMIC_FOUNDATION_BASELINE_V1",
  status: "PASS",
  knownDebt: {},
  guards: []
};

// 1) Canary remains the current rollback-safe public baseline. This audit does
// not promote releases; it only proves the manifest is internally coherent.
const canary = JSON.parse(await read("engine/channels/canary-v1.json"));
assert(canary.policy?.releasesImmutable === true, "Canary must keep immutable releases enabled.");
assert(canary.policy?.rollbackViaManifest === true, "Canary must keep manifest rollback enabled.");
for (const [mechanic, spec] of Object.entries(canary.mechanics || {})) {
  assert(spec?.release, `Canary mechanic ${mechanic} has no release.`);
  assert(await exists(spec.adapter.replace(/^\//, "")), `Missing Canary adapter: ${spec.adapter}`);
  assert(await exists(spec.runtime.replace(/^\//, "")), `Missing Canary runtime: ${spec.runtime}`);
}
report.guards.push("canary-release-paths");

// 2) Year 1 currently has a split architecture: M01 uses the versioned Loader,
// while M02-M06 still load legacy /core and /mechanics directly. Freeze the
// current exception set so migration can only reduce it, never expand it.
const year1Entries = (await listFiles("content/english/year-1"))
  .filter((file) => /\/index\.html$/.test(file));
const year1LegacyEntries = [];
for (const file of year1Entries) {
  const html = await read(file);
  if (/\.\.\/\.\.\/\.\.\/\.\.\/core\//.test(html) || /\.\.\/\.\.\/\.\.\/\.\.\/mechanics\//.test(html)) {
    year1LegacyEntries.push(file);
  }
}
const YEAR1_LEGACY_BASELINE = [2, 3, 4, 5, 6].map(
  (module) => `content/english/year-1/module-${String(module).padStart(2, "0")}/index.html`
);
assert(
  year1LegacyEntries.every((file) => YEAR1_LEGACY_BASELINE.includes(file)),
  `New Year 1 legacy entrypoint detected: ${year1LegacyEntries.filter((file) => !YEAR1_LEGACY_BASELINE.includes(file)).join(", ")}`
);
assert(
  year1LegacyEntries.length <= YEAR1_LEGACY_BASELINE.length,
  `Year 1 legacy entrypoint debt increased (${year1LegacyEntries.length}).`
);
report.knownDebt.year1LegacyEntrypoints = year1LegacyEntries;
report.guards.push("year1-no-new-legacy-entrypoints");

// 3) Behavioral patches inside content are transitional debt. Track the exact
// current Year 2 set and reject any new patch/bridge/hotfix/compat file.
const year2Files = await listFiles("content/english/year-2");
const debtName = /(?:hotfix|patch|bridge|router-compat)/i;
const year2BehaviorDebt = year2Files.filter((file) => debtName.test(path.basename(file)));
const YEAR2_BEHAVIOR_BASELINE = [
  "content/english/year-2/year2-v22-homolog-dragdrop-visual-patch.js",
  "content/english/year-2/year2-v23-bubble-smart-renderer-bridge.js",
  "content/english/year-2/year2-v23-dragdrop-visual-patch.js",
  "content/english/year-2/year2-v23-gamification-router-compat.js",
  "content/english/year-2/year2-v23-manual-review-hotfix-v2.js",
  "content/english/year-2/year2-v23-manual-review-hotfix.js",
  "content/english/year-2/year2-v23-manual-review-router-compat.js",
  "content/english/year-2/year2-v23-mechanics-regression-hotfix.js",
  "content/english/year-2/year2-v23-mechanics-regression-router-compat.js"
];
const unexpectedYear2Debt = year2BehaviorDebt.filter((file) => !YEAR2_BEHAVIOR_BASELINE.includes(file));
assert(unexpectedYear2Debt.length === 0, `New Year 2 behavior patch detected: ${unexpectedYear2Debt.join(", ")}`);
report.knownDebt.year2BehaviorFiles = year2BehaviorDebt;
report.guards.push("year2-no-new-behavior-patches");

// 4) Runtime rewriting from content is especially dangerous: the current
// mechanics-regression hotfix mutates fetched mechanic HTML. Allow only that
// known debt until it is replaced by proper immutable mechanic releases.
const runtimeRewriteFiles = [];
for (const file of year2Files.filter((file) => file.endsWith(".js"))) {
  const source = await read(file);
  const rewritesRuntime = /window\.fetch\s*=/.test(source) && /DUDUQ_(?:MATCHING|WORD_SLASH|BUBBLE_POP)\.html/.test(source);
  if (rewritesRuntime) runtimeRewriteFiles.push(file);
}
const RUNTIME_REWRITE_BASELINE = ["content/english/year-2/year2-v23-mechanics-regression-hotfix.js"];
assert(
  runtimeRewriteFiles.every((file) => RUNTIME_REWRITE_BASELINE.includes(file)),
  `New content-owned mechanic runtime rewrite detected: ${runtimeRewriteFiles.filter((file) => !RUNTIME_REWRITE_BASELINE.includes(file)).join(", ")}`
);
assert(runtimeRewriteFiles.length <= RUNTIME_REWRITE_BASELINE.length, "Runtime rewrite debt increased.");
report.knownDebt.contentOwnedRuntimeRewrites = runtimeRewriteFiles;
report.guards.push("no-new-content-runtime-rewrites");

// 5) Core 1.0.9 currently duplicates an intelligent asset catalog manually.
// That is known debt, but no future Core release may copy it: future releases
// must consume/sync the canonical Assets-DuduQ catalog instead.
const coreReleaseRoot = "engine/releases/core";
const coreReleaseDirs = (await fs.readdir(path.join(ROOT, coreReleaseRoot), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const duplicatedAssetCatalogReleases = [];
for (const release of coreReleaseDirs) {
  const assetFile = `${coreReleaseRoot}/${release}/duduq-assets.js`;
  if (!(await exists(assetFile))) continue;
  const source = await read(assetFile);
  if (/INTELLIGENT_IMAGE_CATALOG/.test(source)) duplicatedAssetCatalogReleases.push(release);
}
const forbiddenFutureCopies = duplicatedAssetCatalogReleases.filter((release) => {
  const parts = release.split(".").map(Number);
  const baseline = [1, 0, 9];
  for (let i = 0; i < 3; i += 1) {
    if ((parts[i] || 0) !== baseline[i]) return (parts[i] || 0) > baseline[i];
  }
  return false;
});
assert(forbiddenFutureCopies.length === 0, `Future Core release copied manual asset catalog: ${forbiddenFutureCopies.join(", ")}`);
report.knownDebt.coreReleasesWithManualAssetCatalog = duplicatedAssetCatalogReleases;
report.guards.push("future-core-must-not-copy-manual-asset-catalog");

// 6) Years 3-5 must not be added before the systemic foundation is promoted.
for (const year of [3, 4, 5]) {
  assert(!(await exists(`content/english/year-${year}`)), `Year ${year} was added before systemic foundation gate was retired.`);
}
report.guards.push("years3-5-blocked-during-foundation");

console.log(JSON.stringify(report, null, 2));

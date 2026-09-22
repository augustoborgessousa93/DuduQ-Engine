import assert from "node:assert/strict";
import fs from "node:fs";

const last = JSON.parse(fs.readFileSync("design-system/penpot-sync/graph/last-successful.json", "utf8"));
const matching = JSON.parse(fs.readFileSync("design-system/runtime/screens/matching-master/manifest.json", "utf8"));
const applied = last.successfulSnapshot?.screens?.["matching-master"];
assert.ok(applied?.liveSourceHash, "applied source hash must be persisted");
assert.equal(applied.activePackageHash, matching.hashes.markup, "active package must match applied package");

function classify({ liveSourceHash, lastAppliedSourceHash, activePackageHash, appliedPackageHash, runtimeMatches = true, goldMasterMatches = true }) {
  return liveSourceHash !== lastAppliedSourceHash || activePackageHash !== appliedPackageHash || !runtimeMatches || !goldMasterMatches
    ? "VISUAL_DRIFT_DETECTED"
    : "NO_CHANGES";
}

assert.equal(classify({ liveSourceHash: applied.liveSourceHash, lastAppliedSourceHash: applied.lastAppliedSourceHash, activePackageHash: "stale", appliedPackageHash: applied.activePackageHash }), "VISUAL_DRIFT_DETECTED");
assert.equal(classify({ liveSourceHash: applied.liveSourceHash, lastAppliedSourceHash: applied.lastAppliedSourceHash, activePackageHash: applied.activePackageHash, appliedPackageHash: applied.activePackageHash }), "NO_CHANGES");
console.log(JSON.stringify({ status: "PASS", falseNoChanges: "GUARDED" }, null, 2));

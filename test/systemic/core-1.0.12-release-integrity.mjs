import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "engine/releases/core/1.0.11");
const CANDIDATE = path.join(ROOT, "engine/releases/core/1.0.12");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function files(dir) {
  return (await fs.readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

async function bytes(file) {
  return fs.readFile(file);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

const baseFiles = await files(BASE);
const candidateFiles = await files(CANDIDATE);
assert(baseFiles.length === 16, `Core 1.0.11 expected 16 files, got ${baseFiles.length}.`);
assert(!baseFiles.includes("release.json"), "Core 1.0.11 unexpectedly contains release.json; update contract deliberately.");
assert(candidateFiles.length === 17, `Core 1.0.12 expected 17 files, got ${candidateFiles.length}.`);
assert(candidateFiles.includes("duduq-world-fusion-base.css"), "Core 1.0.12 is missing immutable World Fusion base copy.");
assert(!candidateFiles.includes("release.json"), "Core 1.0.12 must not invent release.json absent from official format.");

const parity = {};
for (const name of baseFiles) {
  if (name === "duduq-world-fusion.css") continue;
  const base = await bytes(path.join(BASE, name));
  const candidate = await bytes(path.join(CANDIDATE, name));
  const same = Buffer.compare(base, candidate) === 0;
  parity[name] = { same, sha256: sha256(candidate) };
  assert(same, `Core 1.0.12 changed unrelated canonical file ${name}.`);
}

const oldWorldFusion = await bytes(path.join(BASE, "duduq-world-fusion.css"));
const preservedWorldFusion = await bytes(path.join(CANDIDATE, "duduq-world-fusion-base.css"));
assert(Buffer.compare(oldWorldFusion, preservedWorldFusion) === 0, "Core 1.0.12 did not preserve Core 1.0.11 World Fusion byte-for-byte as its local base.");

const wrapper = await fs.readFile(path.join(CANDIDATE, "duduq-world-fusion.css"), "utf8");
assert(wrapper.startsWith('@import url("./duduq-world-fusion-base.css");'), "Candidate World Fusion must import only its local immutable base first.");
assert(wrapper.includes("SHARED COMPACT MECHANIC SURFACE"), "Candidate World Fusion fix marker missing.");
assert(wrapper.includes("@media (max-width: 900px)"), "Compact viewport scope missing.");
assert(wrapper.includes("body > #root:has(> .duduq-mechanic-frame)"), "Shared Host containing-block selector missing.");
assert(wrapper.includes("height: 100dvh !important"), "Definite compact block-size missing.");
assert(wrapper.includes("min-height: 100dvh !important"), "Compact minimum viewport guard missing.");
assert(!wrapper.includes("height: 600px") && !wrapper.includes("min-height: 600px"), "Magic 600px height is forbidden.");
assert(!/\.duduq-(?:ts|dd|dd2)-/.test(wrapper), "Candidate must not patch Target Shooter or Drag & Drop internals.");
assert(!/module-0[1-6]|M04VisualComposition|COME IN|LEGS/i.test(wrapper), "Candidate contains module/content-local coupling.");

console.log(JSON.stringify({
  contract: "CORE_1_0_12_RELEASE_INTEGRITY",
  status: "PASS",
  baseRelease: "1.0.11",
  candidateRelease: "1.0.12",
  baseFiles: baseFiles.length,
  candidateFiles: candidateFiles.length,
  preservedWorldFusionSha256: sha256(preservedWorldFusion),
  unchangedCanonicalFiles: Object.keys(parity).length,
  parity
}, null, 2));

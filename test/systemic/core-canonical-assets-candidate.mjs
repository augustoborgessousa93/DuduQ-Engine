import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_RELEASE = "engine/releases/core/1.0.9";
const CANDIDATE_RELEASE = "engine/releases/core/1.0.11-candidate";
const CHANNEL = "engine/channels/core-canonical-assets-candidate-v1.json";
const PIN = "f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f";

function assert(condition, message) { if (!condition) throw new Error(message); }
async function read(file) { return fs.readFile(path.join(ROOT, file)); }
async function text(file) { return fs.readFile(path.join(ROOT, file), "utf8"); }

const canary = JSON.parse(await text("engine/channels/canary-v1.json"));
const candidate = JSON.parse(await text(CHANNEL));
assert(canary.core?.release === "1.0.9", `Canary moved unexpectedly to ${canary.core?.release}.`);
assert(candidate.core?.release === "1.0.11-candidate", "Experimental channel must use Core 1.0.11-candidate.");
assert(candidate.policy?.productionPromotionAllowed === false, "Candidate must not allow production promotion.");
assert(candidate.policy?.canonicalAssetRuntimeCommit === PIN, "Candidate catalog provenance commit drifted.");
assert(candidate.core.preMechanicScripts?.[0]?.src === `https://cdn.jsdelivr.net/gh/augustoborgessousa93/Assets-DuduQ@${PIN}/asset-catalog/runtime-index.js`, "Canonical runtime must be pinned before duduq-assets.js.");
assert(candidate.core.preMechanicScripts?.[1]?.src === "/engine/releases/core/1.0.11-candidate/duduq-assets.js", "Candidate assets consumer must load immediately after canonical runtime.");

const baseFiles = (await fs.readdir(path.join(ROOT, BASE_RELEASE))).sort();
const candidateFiles = (await fs.readdir(path.join(ROOT, CANDIDATE_RELEASE))).sort();
assert(JSON.stringify(candidateFiles) === JSON.stringify(baseFiles), `Candidate Core file set differs from 1.0.9. Base=${baseFiles.join(",")} Candidate=${candidateFiles.join(",")}`);
for (const file of baseFiles) {
  if (file === "duduq-assets.js") continue;
  const [a, b] = await Promise.all([read(`${BASE_RELEASE}/${file}`), read(`${CANDIDATE_RELEASE}/${file}`)]);
  assert(a.equals(b), `Candidate changed non-assets Core file: ${file}`);
}

const assetSource = await text(`${CANDIDATE_RELEASE}/duduq-assets.js`);
assert(!/INTELLIGENT_IMAGE_CATALOG/.test(assetSource), "Candidate copied the forbidden manual intelligent image catalog.");
assert(/DUDUQ_CANONICAL_ASSET_CATALOG/.test(assetSource), "Candidate does not consume the canonical catalog runtime.");
assert(assetSource.includes(PIN), "Candidate assets consumer lost canonical runtime provenance.");

const releaseRoot = path.join(ROOT, "engine/releases/core");
const futureManualCopies = [];
for (const entry of await fs.readdir(releaseRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const match = entry.name.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) continue;
  const version = match.slice(1).map(Number);
  const newer = version[0] > 1 || (version[0] === 1 && (version[1] > 0 || (version[1] === 0 && version[2] > 9)));
  if (!newer) continue;
  try {
    const source = await text(`engine/releases/core/${entry.name}/duduq-assets.js`);
    if (/INTELLIGENT_IMAGE_CATALOG/.test(source)) futureManualCopies.push(entry.name);
  } catch {}
}
assert(futureManualCopies.length === 0, `Future Core release copied manual asset catalog: ${futureManualCopies.join(", ")}`);

console.log(JSON.stringify({
  contract: "DUDUQ_CORE_1_0_11_CANONICAL_ASSETS_CANDIDATE",
  status: "PASS",
  canaryCore: canary.core.release,
  candidateCore: candidate.core.release,
  inheritedFilesByteIdentical: baseFiles.length - 1,
  canonicalRuntimeCommit: PIN,
  productionPromotionAllowed: candidate.policy.productionPromotionAllowed,
  futureManualCopies
}, null, 2));

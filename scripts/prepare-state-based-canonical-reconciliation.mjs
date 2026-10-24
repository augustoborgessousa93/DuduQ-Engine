import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const history = path.join(root, "docs/qa/history/canonical-state-based-2026-10-20");
await mkdir(history, { recursive: true });
const lock = path.join(root, "content/mechanics/canonical-mechanics-lock-v1.json");
const baseline = path.join(root, "docs/qa/DUDUQ_CANONICAL_MECHANICS_PRODUCTION_BASELINE_V1.json");
await copyFile(lock, path.join(history, "canonical-mechanics-lock-v1.pre-rehomologation.json"));
await copyFile(baseline, path.join(history, "production-baseline-v1.pre-rehomologation.json"));
const registryPath = path.join(root, "content/mechanics/canonical-mechanics-registry.json");
const registry = JSON.parse(await readFile(registryPath, "utf8"));
for (const [id, entry] of Object.entries(registry.mechanics || {})) {
  if (entry.status !== "PRODUCTION_CANONICAL_LOCKED") continue;
  entry.humanAuthority = "AUGUSTO";
  entry.secondHomologation = "APPROVED";
  entry.approvalDate = "2026-10-20";
  entry.currentVersion = id.startsWith("smart-sentence-") ? "V11.3AI_R1_FINAL" : "state-certified-2026-10-20";
  entry.sourceLockManifest = "content/mechanics/canonical-mechanics-lock-v1.json";
}
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PREPARED", historicalLock: path.relative(root, path.join(history, "canonical-mechanics-lock-v1.pre-rehomologation.json")), historicalBaseline: path.relative(root, path.join(history, "production-baseline-v1.pre-rehomologation.json")), approvedMechanics: Object.values(registry.mechanics).filter(entry => entry.status === "PRODUCTION_CANONICAL_LOCKED").length }, null, 2));

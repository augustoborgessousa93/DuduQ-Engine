import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidence = path.join(root, "artifacts", "delivery", "perfect-flow");
const reference = path.join(root, "artifacts", "delivery", "final-flow", "penpot-transition-reference.png");
fs.mkdirSync(evidence, { recursive: true });

// A visual delivery cannot certify itself: this is intentionally checked before
// running gameplay so EXIT 0 never hides an absent independent visual authority.
if (!fs.existsSync(reference) || fs.statSync(reference).size === 0) {
  throw new Error("PENPOT_REFERENCE_REQUIRED: artifacts/delivery/final-flow/penpot-transition-reference.png");
}

execFileSync(process.execPath, ["test/runtime/certify-approved-flow.mjs"], { cwd: root, stdio: "inherit" });
const source = path.join(root, "artifacts", "delivery", "final-flow");
const files = {
  "matching-final.png": "matching-final.png",
  "transition-final.png": "transition-runtime.png",
  "target-final.png": "target-after-transition-final.png",
  "perfect-flow.webm": "approved-flow-final.webm",
  "perfect-flow-trace.zip": "matching-target-trace.zip",
  "asset-audit.json": "asset-audit.json",
  "font-audit.json": "font-audit.json",
  "geometry-audit.json": "geometry-audit.json",
  "gameplay-audit.json": "gameplay-regression.json",
  "responsive-audit.json": "geometry-audit.json",
  "adversarial-audit.json": "gameplay-regression.json"
};
for (const [to, from] of Object.entries(files)) fs.copyFileSync(path.join(source, from), path.join(evidence, to));
for (const file of Object.keys(files)) if (!fs.statSync(path.join(evidence, file)).size) throw new Error(`MISSING_EVIDENCE: ${file}`);
console.log(JSON.stringify({ status: "PASS", evidence }));

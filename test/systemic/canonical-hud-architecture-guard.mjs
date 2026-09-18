import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const targets = [
  ["Matching", "test/matching/gold-master-candidate-v1/src/core-components.js", "test/matching/gold-master-candidate-v1/styles"],
  ["Target Shooter", "test/target-shooter/gold-master-clean-v2/src/static-view.js", "test/target-shooter/gold-master-clean-v2/styles"],
  ["Drag & Drop", "test/drag-drop/gold-master-candidate-v1/canonical-hud-adapter.js", null],
];
const failures = [];
for (const [name, relative, styleDirectory] of targets) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const canonical = /DuduQCanonicalHeaderHUD|DUDUQ_CANONICAL_HEADER_HUD/.test(source) && /DuduQCanonicalQuestionHUD|DUDUQ_CANONICAL_QUESTION_HUD/.test(source);
  if (!canonical && name !== "Drag & Drop") failures.push(`${name}: missing canonical Core HUD imports`);
  const candidateHtml = path.join(root, name === "Matching" ? "test/matching/gold-master-candidate-v1/index.html" : name === "Target Shooter" ? "test/target-shooter/gold-master-clean-v2/index.html" : "test/drag-drop/gold-master-candidate-v1/index.html");
  const html = fs.readFileSync(candidateHtml, "utf8");
  if (/<header\s+class=["'][^"']*game-hud|<section\s+class=["'][^"']*question-panel|<iframe\b/i.test(html)) failures.push(`${name}: duplicated local HUD markup or iframe compatibility path`);
  if (styleDirectory) for (const file of fs.readdirSync(path.join(root, styleDirectory)).filter((file) => file.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(root, styleDirectory, file), "utf8");
    if (/\.(?:game-hud|question-panel|hud-progress|fullscreen-button|audio-button)\b/.test(css)) failures.push(`${name}: local HUD style override in ${file}`);
  }
}
const core = fs.readFileSync(path.join(root, "core/ui/index.js"), "utf8");
if (!/DuduQCanonicalHeaderHUD/.test(core) || !/DuduQCanonicalQuestionHUD/.test(core) || !/DuduQCanonicalFullscreenButton/.test(core) || !/DuduQCanonicalAudioButton/.test(core)) failures.push("Core: canonical HUD/control exports missing");
for (const [name, relative] of targets) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  if (/\.addEventListener\(["']click["']\s*,\s*async\s*\(\)\s*=>\s*\{[^}]*requestFullscreen/s.test(source) || /document\.exitFullscreen\s*\(/.test(source) && name !== "Drag & Drop") failures.push(`${name}: mechanic-local fullscreen handler`);
}
if (failures.length) throw new Error(`CanonicalHudArchitectureGuard failed:\n${failures.join("\n")}`);
console.log("CanonicalHudArchitectureGuard PASS — Matching, Target Shooter, and Drag & Drop use the Core HUD contract.");

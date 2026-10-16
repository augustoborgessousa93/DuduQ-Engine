import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rows = [];
const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
for (let year = 1; year <= 5; year++) for (let module = 1; module <= 6; module++) {
  const moduleId = `Y${year}M${String(module).padStart(2, "0")}`;
  const file = path.join(root, "content", "english", `year-${year}`, `module-${String(module).padStart(2, "0")}`, "questions.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const item of data.items || []) {
    let mode = "NONE", targets = [], task = "", rationale = "No safe retry reminder needed for this mechanic/content.";
    if (["smart-sentence-order", "smart-sentence-complete"].includes(item.mechanicId)) {
      mode = "TASK";
      task = item.mechanicId === "smart-sentence-order" ? "Organize as palavras novamente." : "Complete a frase novamente.";
      rationale = "The exact response is answer-bearing; remind of the action, not the solution.";
    } else if (item.mechanicId === "matching") {
      mode = "TASK"; task = "Procure o par correspondente.";
      rationale = "A pair/task reminder preserves correspondence without revealing a partner.";
    } else if (["drag-drop", "drag-drop-multimedia"].includes(item.mechanicId)) {
      targets = (item.items || []).filter(row => row.audioId && row.semanticTarget && (item.mechanicId !== "drag-drop" || row.modality === "audio"))
        .map(row => ({ itemId: row.id, audioId: row.audioId, semanticTarget: row.semanticTarget }));
      if (targets.length) { mode = "TARGET"; rationale = "Repeat only the learner's audio stimulus; never expose the destination."; }
    } else if (["target-shooter", "bubble-pop"].includes(item.mechanicId) && item.stimulus?.type === "content-audio" && item.stimulus.audioId && item.stimulus.target) {
      mode = "TARGET"; targets = [{ itemId: item.item_id, audioId: item.stimulus.audioId, semanticTarget: item.stimulus.target }];
      rationale = "Repeat the intended audio stimulus, not the selected option.";
    }
    const registeredStimulusIds = new Set([
      item.stimulus?.audioId,
      ...(item.audioBindings || []).filter(binding => /STIMULUS|TARGET/i.test(binding.role || "")).map(binding => binding.audioId),
      ...(item.items || []).filter(candidate => candidate.modality === "audio").map(candidate => candidate.audioId)
    ].filter(Boolean));
    const targetLeaksAnswer = mode === "TARGET" && targets.some(target => !registeredStimulusIds.has(target.audioId));
    rows.push({ moduleId, itemId: item.item_id, year, mechanicId: item.mechanicId, retryReminderMode: mode,
      ...(mode === "TARGET" ? { targets } : {}), ...(mode === "TASK" ? { task } : {}), rationale,
      answerLeakStatus: targetLeaksAnswer ? "FAIL_TARGET_NOT_DECLARED_AS_STIMULUS" : mode === "TARGET" ? "PASS_TARGET_IS_DECLARED_LEARNER_STIMULUS" : "PASS_NO_SOLUTION_SPOKEN" });
  }
}
const errors = rows.filter(row => !row.answerLeakStatus.startsWith("PASS_"));
const counts = Object.fromEntries(["TARGET", "TASK", "NONE"].map(mode => [mode, rows.filter(row => row.retryReminderMode === mode).length]));
const report = { schemaVersion: "duduq-retry-reminder-policy-v11-3e", status: rows.length === 600 && errors.length === 0 ? "PASS" : "ISSUE",
  totalActivities: rows.length, counts, targetAnswerLeaks: errors.length, items: rows, generatedAt: new Date().toISOString() };
const output = path.join(root, "docs", "qa", "DUDUQ_RETRY_REMINDER_POLICY_V11_3E.json");
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totalActivities: rows.length, counts, targetAnswerLeaks: errors.length, output }, null, 2));
if (report.status !== "PASS") process.exitCode = 1;

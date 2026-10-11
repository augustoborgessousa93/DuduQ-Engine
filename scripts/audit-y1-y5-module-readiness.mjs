import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const indexPath = path.join(root, "content/english/master/modules-index.json");
const index = JSON.parse(await readFile(indexPath, "utf8"));
const mechanics = [
  "target-shooter", "bubble-pop", "drag-drop-multimedia", "drag-drop",
  "matching", "memory-quest", "smart-sentence-complete", "smart-sentence-order",
  "smart-sentence-unscramble"
];
const scanMechanics = source => mechanics.filter(name => source.includes(name));
const results = [];

for (const entry of index.modules) {
  const moduleId = entry.module_id;
  const year = Number(moduleId.match(/^Y(\d)/)?.[1]);
  const number = Number(moduleId.match(/M(\d{2})$/)?.[1]);
  const dir = path.join(root, `content/english/year-${year}/module-${String(number).padStart(2, "0")}`);
  let files = [];
  try { files = await readdir(dir); } catch {}
  const html = files.filter(name => name.endsWith(".html"));
  const js = files.filter(name => /^module.*\.js$/i.test(name));
  const sourceCandidates = [...js, ...files.filter(name => /content-factory.*\.js$/i.test(name))];
  const source = (await Promise.all(sourceCandidates.map(name => readFile(path.join(dir, name), "utf8").catch(() => "")))).join("\n");
  const ids = [...new Set(source.match(new RegExp(`${moduleId}-Q\\d{3}`, "g")) || [])].sort();
  const declaredMechanics = scanMechanics(source);
  let canonical = { file: null, count: null, mechanics: [], contractErrors: [] };
  if (files.includes("questions.json")) {
    try {
      const data = JSON.parse(await readFile(path.join(dir, "questions.json"), "utf8"));
      const items = Array.isArray(data.items) ? data.items : Array.isArray(data.questions) ? data.questions : [];
      const itemMechanics = items.map(item => item.runtimeMechanic || item.mechanic || item.mecanica_preferida).filter(Boolean);
      const errors = [];
      const itemIds = new Set();
      for (const [i, item] of items.entries()) {
        const id = item.item_id || item.id || item.questionId;
        if (!id) errors.push(`ITEM_${i + 1}_MISSING_ID`);
        else if (itemIds.has(id)) errors.push(`DUPLICATE_ID:${id}`);
        else itemIds.add(id);
        const choices = item.options || item.alternatives || [];
        const key = item.answerKey || item.answer_key;
        if (key && choices.length) {
          const mechanic = item.runtimeMechanic || item.mechanic || item.mecanica_preferida;
          const choiceKeys = new Set(choices.flatMap(option => [option.id, option.optionId, option.answerKey].filter(Boolean)));
          const valid = mechanic === "drag-drop-multimedia" && item.dragDropContract?.mode === "multi-match" && item.dragDropContract?.mappingAuthority === "answerKey"
            ? String(key).split("+").every(part => choiceKeys.has(part) && item.dragDropContract.mapping?.some(row => row.answerKey === part))
            : choiceKeys.has(key);
          if (!valid) errors.push(`ANSWER_KEY_NOT_IN_CONTRACT:${id || i + 1}`);
        }
      }
      canonical = { file: "questions.json", count: items.length, mechanics: [...new Set(itemMechanics)].sort(), contractErrors: errors };
    } catch (error) {
      canonical = { file: "questions.json", count: null, mechanics: [], contractErrors: [`JSON_PARSE:${error.message}`] };
    }
  }
  const dependencies = [];
  for (const htmlName of html) {
    const htmlText = await readFile(path.join(dir, htmlName), "utf8").catch(() => "");
    for (const match of htmlText.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
      const value = match[1];
      if (/^(?:https?:|data:|#|\/)/i.test(value)) continue;
      dependencies.push({ from: htmlName, path: value, exists: await stat(path.join(dir, value.split(/[?#]/)[0])).then(() => true, () => false) });
    }
  }
  results.push({
    moduleId,
    title: entry.titulo,
    status: canonical.count !== null ? (canonical.contractErrors.length ? "CANONICAL_CONTRACT_ISSUES" : "CANONICAL_QUESTIONS_PRESENT") : sourceCandidates.length ? "SOURCE_ONLY_NOT_RUNTIME_CERTIFIED" : "NO_MODULE_SOURCE_FOUND",
    files: { html: html.length, moduleSources: sourceCandidates, questionsJson: canonical.file },
    canonicalQuestions: canonical,
    sourceQuestionIdTokens: ids.length,
    sourceQuestionIds: ids,
    sourceMechanicTokens: declaredMechanics,
    unresolvedLocalHtmlDependencies: dependencies.filter(item => !item.exists),
    note: canonical.count === null ? "Question counts/mechanics not inferred from curriculum plan or static token scans; execute module contract remains unvalidated by this inventory." : "Read-only structural check; gameplay/assets still require runtime verification."
  });
}

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "content/english/master/modules-index.json plus read-only module directory scan",
  moduleIndexCount: index.modules.length,
  scannedCount: results.length,
  canonicalQuestionFiles: results.filter(item => item.canonicalQuestions.file).length,
  canonicalQuestionsTotal: results.reduce((sum, item) => sum + (item.canonicalQuestions.count || 0), 0),
  canonicalContractIssues: results.filter(item => item.canonicalQuestions.contractErrors.length).flatMap(item => item.canonicalQuestions.contractErrors.map(error => `${item.moduleId}:${error}`)),
  sourceOnlyModules: results.filter(item => item.status === "SOURCE_ONLY_NOT_RUNTIME_CERTIFIED").map(item => item.moduleId),
  missingSourceModules: results.filter(item => item.status === "NO_MODULE_SOURCE_FOUND").map(item => item.moduleId),
  modules: results
};
const out = path.join(root, "artifacts/y1m01-operational-reference/module-readiness-v1.json");
await (await import("node:fs/promises")).mkdir(path.dirname(out), { recursive: true });
await (await import("node:fs/promises")).writeFile(out, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: path.relative(root, out), moduleIndexCount: summary.moduleIndexCount, scannedCount: summary.scannedCount, canonicalQuestionFiles: summary.canonicalQuestionFiles, canonicalQuestionsTotal: summary.canonicalQuestionsTotal, canonicalContractIssues: summary.canonicalContractIssues, sourceOnlyModules: summary.sourceOnlyModules.length, missingSourceModules: summary.missingSourceModules.length }, null, 2));

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const registryPath = "content/mechanics/canonical-mechanics-registry.json";
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const routeByMechanic = {
  "target-shooter": "/play/target-shooter/",
  "bubble-pop": "/play/bubble-pop/",
  "drag-drop-multimedia": "/play/drag-drop-multimedia/",
  "drag-drop": "/play/drag-drop/",
  matching: "/play/matching/",
  "smart-sentence-complete": "/play/smart-sentence/",
  "smart-sentence-order": "/play/smart-sentence/",
  "memory-quest": "/play/memory-quest/",
};
const activityFiles = [];
for (let year = 1; year <= 5; year += 1) for (let module = 1; module <= 6; module += 1) {
  const folder = `content/english/year-${year}/module-${String(module).padStart(2, "0")}`;
  try {
    const [moduleData, questionData] = await Promise.all([
      readFile(path.join(root, folder, "module.json"), "utf8").then(JSON.parse),
      readFile(path.join(root, folder, "questions.json"), "utf8").then(JSON.parse),
    ]);
    for (const item of questionData.items ?? []) activityFiles.push({ year, module, moduleId: moduleData.moduleId, title: moduleData.title, item, source: `${folder}/questions.json` });
  } catch {}
}
const byVariant = new Map();
for (const record of activityFiles) {
  const key = `${record.item.mechanicId}::${record.item.mechanicMode || "default"}`;
  const list = byVariant.get(key) ?? [];
  list.push(record);
  byVariant.set(key, list);
}
const walk = async rel => {
  const full = path.join(root, rel);
  const info = await stat(full).catch(() => null);
  if (!info) return [];
  if (info.isFile()) return [rel];
  const children = await readdir(full, { withFileTypes: true });
  return (await Promise.all(children.map(entry => walk(path.posix.join(rel.replaceAll("\\", "/"), entry.name))))).flat();
};
const registryMechanics = Object.entries(registry.mechanics);
const mechanics = [];
for (const [id, definition] of registryMechanics) {
  const variants = [...byVariant.entries()].filter(([key]) => key.startsWith(`${id}::`)).map(([key, records]) => {
    const [mechanicId, mode] = key.split("::");
    const representative = records[0];
    const routeBase = routeByMechanic[mechanicId];
    const variantRoute = routeBase && representative
      ? `${routeBase}?duduqModule=${encodeURIComponent(representative.moduleId)}&duduqItem=${encodeURIComponent(representative.item.item_id)}`
      : null;
    return { mechanicMode: mode, curricularActivityCount: records.length, route: variantRoute, moduleId: representative?.moduleId ?? null, activityId: representative?.item.item_id ?? null, questionSource: representative?.source ?? null,
      observedFields: representative ? { type: representative.item.type ?? null, answerType: representative.item.answerType ?? null, answerKeys: Object.keys(representative.item.answerKey ?? {}), hasAudio: Boolean((representative.item.audioBindings ?? []).length || representative.item.instruction?.instructionAudioEnId), hasImages: Boolean((representative.item.mediaBindings ?? []).length) } : null };
  });
  const sourceFiles = [];
  for (const source of definition.canonicalCandidateSource ?? []) {
    const normalized = source.endsWith("/") ? source.slice(0, -1) : source;
    const files = await walk(normalized);
    sourceFiles.push(...files.filter(file => /\.(css|js|mjs)$/.test(file) && !file.includes("/test/") && !file.includes("/candidate")));
  }
  mechanics.push({ mechanicId: id, displayName: definition.displayName, registryStatus: definition.status, secondHomologation: definition.secondHomologation ?? null, runtimeRoute: definition.runtimeRoute, approvedModes: definition.approvedModes ?? [], visualAuthority: definition.visualAuthority, goldMasterSource: definition.goldMasterSource, curricularActivityCount: variants.reduce((sum, variant) => sum + variant.curricularActivityCount, 0), variants, candidateSources: [...new Set(definition.canonicalCandidateSource ?? [])], sourceFiles: [...new Set(sourceFiles)], sharedHUD: Boolean(definition.sharedHUD), cssTestStatus: "NOT_TESTED", visualGoldMasterStatus: "NOT_TESTED", functionalResponsiveStatus: "NOT_TESTED" });
}
const syntheticFlowRoles = [
  { id: "module-intro", displayName: "Module Intro", route: "/play/english/year-1/module-01/", moduleId: "Y1M01", authority: registry.mechanics.intro.visualAuthority, status: "ROUTE_FLOW_ROLE" },
  { id: "module-final", displayName: "Module Final", route: "/play/final-module/?moduleId=Y1M01&qa=1", moduleId: "Y1M01", authority: "Core module final flow; not a separate question mechanic in this registry.", status: "ROUTE_FLOW_ROLE" },
];
const cssFiles = ["core/duduq-live-hud.css", ...mechanics.flatMap(mechanic => mechanic.sourceFiles.filter(file => file.endsWith(".css")))];
const cssIsolation = [];
for (const file of [...new Set(cssFiles)]) {
  const text = await readFile(path.join(root, file), "utf8").catch(() => "");
  const sharedTokens = ["target-shooter-screen", "drag-drop-multimedia-screen", "drag-drop-screen", "matching-screen", "bubble-pop-screen", "memory-quest-screen", "smart-sentence-screen"]
    .filter(token => text.includes(token));
  if (sharedTokens.length > 1 || file === "core/duduq-live-hud.css") cssIsolation.push({ file, mechanicsTokens: sharedTokens, audit: "SELECTOR_REVIEW_REQUIRED" });
}
const inventory = {
  schema: "DUDUQ_RESPONSIVE_COVERAGE_INVENTORY_V6_4",
  generatedAt: new Date().toISOString(),
  status: "INVENTORIED_NOT_CERTIFIED",
  sourceOfTruth: { registry: registryPath, curriculumRoot: "content/english/year-{1..5}/module-{01..06}/questions.json" },
  productCounts: { modules: 30, activitiesDiscovered: activityFiles.length, uniqueActivityIds: new Set(activityFiles.map(row => row.item.item_id)).size },
  registryMechanics: { entries: registryMechanics.length, productionLocked: registryMechanics.filter(([, value]) => value.status === "PRODUCTION_CANONICAL_LOCKED").length, notImplemented: registryMechanics.filter(([, value]) => value.status === "NOT_IMPLEMENTED").map(([id]) => id) },
  gameplayCoverageModel: { expectedRoles: 10, questionMechanics: mechanics.filter(mechanic => mechanic.curricularActivityCount > 0).map(mechanic => mechanic.mechanicId), flowRoles: syntheticFlowRoles.map(role => role.id), note: "The canonical registry contains the eight activity mechanic IDs present in curriculum plus intro, an unimplemented unscramble variant, and no separate final-screen entry; module intro and final are recorded as module-flow roles, not invented question mechanic IDs." },
  mechanics,
  flowRoles: syntheticFlowRoles,
  cssIsolationCandidates: cssIsolation,
  priorEvidence: { v6_3: "DDM static default route fixture only; retained as diagnostic evidence, not substituted for curricular tests.", v6_2: "90 render scenarios; render-only evidence and not treated as functional QA." },
  executionPlan: { targetContainers: [[1366,768],[900,600],[600,600],[1100,700],[768,600]], states: ["initial","audio","interaction","selected","correct","feedback-correct","continue","incorrect","feedback-incorrect","retry","resize-preserve-state"], currentCompletion: "NOT_STARTED" },
};
await mkdir(path.join(root, "docs/qa"), { recursive: true });
await writeFile(path.join(root, "docs/qa/DUDUQ_RESPONSIVE_COVERAGE_INVENTORY_V6_4.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ modules: 30, activities: inventory.productCounts.activitiesDiscovered, uniqueIds: inventory.productCounts.uniqueActivityIds, registry: inventory.registryMechanics, curricularMechanics: mechanics.filter(m => m.curricularActivityCount).map(m => ({ id:m.mechanicId, count:m.curricularActivityCount, variants:m.variants.length })), inventory: "docs/qa/DUDUQ_RESPONSIVE_COVERAGE_INVENTORY_V6_4.json" }, null, 2));

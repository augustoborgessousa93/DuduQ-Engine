import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async p => JSON.parse(await readFile(path.join(root, p), "utf8"));
const curriculum = await read("content/english/master/curricular-master-v3.json");
const registry = await read("content/mechanics/canonical-mechanics-registry.json");
const activities = [];
for (const module of curriculum.modules || []) {
  const year = Number(module.id.match(/^Y(\d)/)?.[1]);
  const moduleNumber = Number(module.id.match(/M(\d{2})$/)?.[1]);
  const questionsPath = `content/english/year-${year}/module-${String(moduleNumber).padStart(2, "0")}/questions.json`;
  const questions = await read(questionsPath);
  for (const item of questions.items || []) {
    const mechanic = item.mechanicId || item.mecanica_preferida;
    const runtimeRoute = registry.mechanics?.[mechanic]?.runtimeRoute;
    if (!runtimeRoute) throw new Error(`PRODUCTION_ROUTE_MISSING:${module.id}:${item.item_id}:${mechanic}`);
    const params = new URLSearchParams({ duduqModule: module.id, duduqItem: item.item_id });
    activities.push({
      year,
      module: module.id,
      activityId: item.item_id,
      mechanic,
      route: `${runtimeRoute}?${params}`,
      contentIds: [item.contentId, item.topicId, item.mediaSetId].filter(Boolean),
      mediaIds: (item.mediaBindings || []).map(value => value.mediaId).filter(Boolean),
      audioIds: [...new Set([item.instruction?.instructionAudioEnId, item.instruction?.instructionAudioPtId, ...(item.audioBindings || []).map(value => value.audioId)].filter(Boolean))]
    });
  }
}
if (activities.length !== 600 || new Set(activities.map(item => item.activityId)).size !== 600) throw new Error(`PRODUCTION_ROUTE_MANIFEST_COUNT:${activities.length}`);
const document = { feature: "DUDUQ_ENGLISH_600_ACTIVITY_PRODUCTION_ROUTES", generatedAt: new Date().toISOString(), productionBaseUrl: "https://duduq-engine-13a.pages.dev", activityCount: activities.length, modules: 30, activities };
const output = "docs/qa/DUDUQ_ENGLISH_600_ACTIVITY_PRODUCTION_ROUTES_2026-10-20.json";
await writeFile(path.join(root, output), `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", activities: activities.length, modules: curriculum.modules.length, output }, null, 2));

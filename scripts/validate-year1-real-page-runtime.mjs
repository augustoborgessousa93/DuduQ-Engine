import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import vm from "node:vm";

const readJson = async path => JSON.parse(await readFile(path, "utf8"));
const pageByMechanic = {
  "target-shooter": ["play/target-shooter/index.html", "core/duduq-target-shooter-content.js"],
  "bubble-pop": ["play/bubble-pop/index.html", "play/bubble-pop/bubble-pop.js"],
  "drag-drop-multimedia": ["play/drag-drop-multimedia/index.html", "play/drag-drop-multimedia/drag-drop-multimedia.js"],
  "drag-drop": ["play/drag-drop/index.html", "play/drag-drop/drag-drop.js"],
  matching: ["play/matching/index.html", "core/duduq-matching-production-bridge.js"],
  "smart-sentence-complete": ["play/smart-sentence/index.html", "play/smart-sentence/smart-sentence.js"],
  "memory-quest": ["play/memory-quest/index.html", "play/memory-quest/memory-quest.js"]
};
const runtimeRoute = {
  "target-shooter": "/play/target-shooter/", "bubble-pop": "/play/bubble-pop/",
  "drag-drop-multimedia": "/play/drag-drop-multimedia/", "drag-drop": "/play/drag-drop/",
  matching: "/play/matching/", "smart-sentence-complete": "/play/smart-sentence/", "memory-quest": "/play/memory-quest/"
};
const pageText = new Map();
for (const file of new Set(Object.values(pageByMechanic).flat())) pageText.set(file, await readFile(file, "utf8"));
const session = new Map();
const window = { location: { origin: "http://localhost" }, sessionStorage: {
  getItem: key => session.get(key) || null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key)
} };
const fetch = async url => {
  const relative = String(url).replace(/^\//, "");
  try { return { ok: true, json: async () => await readJson(relative) }; }
  catch { return { ok: false, status: 404, json: async () => ({}) }; }
};
const context = vm.createContext({ window, fetch, URL, URLSearchParams, Date, Promise, Map, Set, Object, Error, String, RegExp, JSON });
vm.runInContext(await readFile("core/duduq-canonical-mechanic-adapter-registry.js", "utf8"), context);
vm.runInContext(await readFile("core/duduq-shared-module-route-runtime.js", "utf8"), context);
const runtime = window.DuduQSharedModuleRouteRuntime;
const mediaRegistry = await readJson("content/english/media/media-registry.json");
const mediaById = new Map(mediaRegistry.entries.map(row => [row.mediaId, row]));
const audioManifest = await readJson("duduq-audio/manifests/AUDIO_MANIFEST.json");
const audioById = new Map((audioManifest.items || []).filter(row => row.status === "APPROVED").map(row => [row.id, row]));
const mediaIds = new Set(), audioIds = new Set(), mechanicCounts = new Map();
const requestedModule = process.env.DUDUQ_MODULE_CHECK;
const moduleNumbers = requestedModule
  ? [Number(String(requestedModule).replace("Y1M0", ""))]
  : [1, 2, 3, 4, 5, 6];
if (moduleNumbers.some(number => !Number.isInteger(number) || number < 1 || number > 6)) {
  throw new Error(`INVALID_DUDUQ_MODULE_CHECK:${requestedModule}`);
}
let resolvedCount = 0;
function inspectBindings(value, key = "") {
  if (typeof value === "string") {
    if (/audio/i.test(key) && value.startsWith("AUD-")) audioIds.add(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value.assetId && value.status === "IMAGE_REFINEMENT_PENDING") mediaIds.add(value.assetId);
  for (const [childKey, child] of Object.entries(value)) inspectBindings(child, childKey);
}
for (const number of moduleNumbers) {
  const moduleId = `Y1M0${number}`;
  const key = `module-0${number}`;
  const routeFile = `play/english/year-1/${key}/index.html`;
  await stat(routeFile);
  const entry = await readFile(routeFile, "utf8");
  if (number > 1) assert.match(entry, new RegExp(`data-duduq-module-entry="${moduleId}"`));
  const data = await runtime.load(moduleId);
  assert.equal(data.questions.length, 20);
  for (const question of data.questions) {
    const result = await runtime.resolve(moduleId, question.questionId);
    const [htmlPath, sourcePath] = pageByMechanic[question.mechanicId] || [];
    assert.ok(htmlPath && sourcePath, `No canonical page bridge for ${question.mechanicId}`);
    const html = pageText.get(htmlPath) || await readFile(htmlPath, "utf8");
    const source = pageText.get(sourcePath);
    assert.ok(html.includes("duduq-production-question-bootstrap") || source.includes("duduq-production-question-bootstrap"),
      `Bootstrap not reachable from ${question.mechanicId} page`);
    assert.equal(result.canonicalInput.route, questionRoute(question.mechanicId));
    mechanicCounts.set(question.mechanicId, (mechanicCounts.get(question.mechanicId) || 0) + 1);
    inspectBindings(question);
    resolvedCount += 1;
  }
}
function questionRoute(id) { return runtimeRoute[id]; }
let brokenMedia = 0;
for (const id of mediaIds) {
  const entry = mediaById.get(id);
  const asset = entry?.assets?.[0];
  if (!entry || entry.status !== "APPROVED" || !asset?.path || !await stat(asset.path).then(() => true, () => false)) brokenMedia += 1;
}
let brokenAudio = 0;
for (const id of audioIds) {
  const entry = audioById.get(id);
  if (!entry?.audioPath || !await stat(entry.audioPath).then(() => true, () => false)) brokenAudio += 1;
}
for (const number of moduleNumbers.filter(value => value >= 2)) {
  const contract = await readJson(`content/english/year-1/module-0${number}/questions.json`);
  for (const question of contract.items) inspectBindings(question);
}
assert.equal(resolvedCount, moduleNumbers.length * 20);
assert.equal(brokenMedia, 0, `broken semantic media bindings: ${brokenMedia}`);
assert.equal(brokenAudio, 0, `broken audio bindings: ${brokenAudio}`);
console.log(JSON.stringify({ status: "PASS", contracts: resolvedCount, routeSmoke: resolvedCount,
  moduleEntryRoutes: moduleNumbers.length, mechanicPageBridges: Object.keys(pageByMechanic).length,
  mechanicCounts: Object.fromEntries(mechanicCounts), semanticMediaIds: mediaIds.size,
  registeredSemanticMediaIds: mediaIds.size, brokenMedia, requiredAudioIds: audioIds.size, brokenAudio }, null, 2));

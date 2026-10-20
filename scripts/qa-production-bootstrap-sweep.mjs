import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bootstrapSource = fs.readFileSync(path.join(root, "core/duduq-production-question-bootstrap.js"), "utf8");
const audioManifest = JSON.parse(fs.readFileSync(path.join(root, "duduq-audio/manifests/AUDIO_MANIFEST.json"), "utf8"));
const mediaRegistry = JSON.parse(fs.readFileSync(path.join(root, "content/english/media/media-registry.json"), "utf8"));
const audioById = new Map(audioManifest.items.flatMap(entry => [[entry.id, entry], [entry.audioId, entry]]).filter(([id]) => id));
const mediaById = new Map(mediaRegistry.entries.flatMap(entry => [[entry.mediaId, entry], [entry.assetId, entry]]).filter(([id]) => id));
const expectedTotal = 600;
const legacyModuleId = "Y1M01";

async function bootActivity(moduleId, item, module, questions) {
  const year = moduleId[1];
  const number = moduleId.slice(3, 5);
  const files = new Map([
    [`/content/english/year-${year}/module-${number}/module.json`, module],
    [`/content/english/year-${year}/module-${number}/questions.json`, questions],
    ["/duduq-audio/manifests/AUDIO_MANIFEST.json", audioManifest],
    ["/content/english/media/media-registry.json", mediaRegistry]
  ]);
  const fetch = async url => ({
    ok: files.has(url),
    status: files.has(url) ? 200 : 404,
    json: async () => files.get(url)
  });
  const window = {
    location: { search: `?duduqModule=${moduleId}&duduqItem=${item.item_id}`, href: "http://localhost/" },
    addEventListener() {},
    DuduQSharedModuleRouteRuntime: {
      resolve: async (_moduleId, questionId) => ({ index: Number(questionId.slice(1)) - 1, canonicalInput: null }),
      next: async () => ({ url: "/" })
    },
    DuduQContentAudio: {
      resolveAudio: async audioId => {
        const entry = audioById.get(audioId);
        return entry?.status === "APPROVED" ? {
          status: "READY", audioId, voiceVersion: entry.voiceVersion, locale: entry.locale,
          url: `/${entry.audioPath}`, entry
        } : { status: "NOT_APPROVED_OR_MISSING", audioId };
      },
      setActiveQuestion() {}, stopVoice() {}, stopAll() {}
    },
    DuduQContentMedia: {
      resolveMedia: async mediaId => {
        const entry = mediaById.get(mediaId);
        const assetPaths = (entry?.assets || []).map(asset => asset.path).filter(assetPath =>
          assetPath && /\.(?:png|jpe?g|webp|gif|svg)$/i.test(assetPath) && !assetPath.split(/[\\/]/).includes(".."));
        if (!assetPaths.length && entry?.urlOrPath && !/^https?:/i.test(entry.urlOrPath) &&
          !entry.urlOrPath.split(/[\\/]/).includes("..")) assetPaths.push(entry.urlOrPath);
        return entry?.status === "APPROVED" && assetPaths.length
          ? { status: "READY", assets: assetPaths.map(assetPath => ({ url: `/${assetPath}`, alt: entry.altText || mediaId })) }
          : { status: "MISSING", assets: [] };
      }
    }
  };
  window.fetch = fetch;
  const context = { window, fetch, URL, URLSearchParams, console };
  vm.runInNewContext(bootstrapSource, context, { filename: "duduq-production-question-bootstrap.js" });
  return window.DuduQProductionQuestionBootstrap.ready;
}

const summary = {
  requested: expectedTotal,
  rendered: 0,
  correlated: 0,
  bootstrapTested: 0,
  legacyY1M01: 0,
  passed: 0,
  failed: []
};

for (let year = 1; year <= 5; year++) {
  for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber++) {
    const moduleId = `Y${year}M${String(moduleNumber).padStart(2, "0")}`;
    const moduleDir = path.join(root, "content/english", `year-${year}`, `module-${String(moduleNumber).padStart(2, "0")}`);
    const module = JSON.parse(fs.readFileSync(path.join(moduleDir, "module.json"), "utf8"));
    const questions = JSON.parse(fs.readFileSync(path.join(moduleDir, "questions.json"), "utf8"));
    assert.equal(questions.items?.length, 20, `${moduleId}: expected 20 activities`);
    for (const item of questions.items) {
      summary.rendered++;
      if (moduleId === legacyModuleId) {
        summary.legacyY1M01++;
        continue;
      }
      summary.bootstrapTested++;
      try {
        const ctx = await bootActivity(moduleId, item, module, questions);
        assert.equal(ctx?.moduleId, moduleId, `${item.item_id}: module correlation`);
        assert.equal(ctx?.item?.item_id, item.item_id, `${item.item_id}: activity correlation`);
        assert.equal(ctx?.mechanic, item.mechanicId, `${item.item_id}: mechanic correlation`);
        summary.correlated++;
        summary.passed++;
      } catch (error) {
        summary.failed.push({ itemId: item.item_id, mechanic: item.mechanicId, error: String(error?.message || error) });
      }
    }
  }
}

summary.unmatched = summary.requested - summary.correlated;
summary.status = summary.failed.length ? "ISSUE" : summary.legacyY1M01 ? "PARTIAL_LEGACY_RUNTIME_NOT_BROWSER_CERTIFIED" : "PASS";
console.log(JSON.stringify(summary, null, 2));
if (summary.failed.length) process.exitCode = 1;

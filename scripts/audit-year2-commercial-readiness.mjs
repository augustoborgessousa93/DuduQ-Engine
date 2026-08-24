import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "artifacts", "year2-readiness");
fs.mkdirSync(outDir, { recursive: true });

const sandbox = { console };
sandbox.window = {};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

function run(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
}
function questions(module) {
  return (module?.activities || []).flatMap((activity) => activity?.questions || []);
}
function hasRecordedRef(value) {
  return Boolean(value && typeof value === "object" && (value.src || value.path || value.url || value.asset || value.assetKey || value.audioAssetKey));
}
function collectImageRefs(question) {
  const refs = [];
  const add = (src, alt, origin) => src && refs.push({ src: String(src), alt: String(alt || ""), origin });
  add(question?.image?.src, question?.image?.alt, "question.image");
  for (const target of question?.metadata?.targets || []) add(target?.imageSrc || target?.image, target?.alt || target?.label, "metadata.targets");
  for (const item of question?.metadata?.targetShooter?.items || []) add(item?.image, item?.alt || item?.label, "targetShooter.items");
  for (const alternative of question?.alternatives || []) add(alternative?.image?.src, alternative?.image?.alt || alternative?.text, "alternatives.image");
  return refs;
}
function audioProfile(question) {
  const stimuli = [];
  const add = (value, origin, forcedLanguage = "") => {
    if (!value || typeof value !== "object") return;
    const text = String(value.text || value.spokenText || "").trim();
    if (!text && !hasRecordedRef(value)) return;
    stimuli.push({ origin, language: value.language || value.locale || value.speechLocale || forcedLanguage, recorded: hasRecordedRef(value) });
  };
  add(question?.audio, "question.audio");
  add(question?.metadata?.stimulusAudio, "metadata.stimulusAudio");
  if (question?.metadata?.targetShooter?.audioText) stimuli.push({ origin: "targetShooter.audioText", language: "en-US", recorded: false });
  if (question?.metadata?.wordSlash?.audioText) stimuli.push({ origin: "wordSlash.audioText", language: "en-US", recorded: false });
  const english = stimuli.filter((item) => /^en(?:-|$)/i.test(item.language));
  const optionAudios = (question?.alternatives || []).filter((alt) => alt?.audio && alt.audio.enabled !== false);
  return {
    englishStimulusConfigured: english.length > 0,
    englishStimulusRecorded: english.length > 0 && english.some((item) => item.recorded),
    optionAudioConfigured: optionAudios.length > 0,
    optionAudioRecordedAll: optionAudios.length > 0 && optionAudios.every((alt) => hasRecordedRef(alt.audio))
  };
}

run("content/english/year-2/year2-v22-homolog-core.js");
if (fs.existsSync(path.join(root, "content/english/year-2/year2-v22-homolog-dragdrop-visual-patch.js"))) {
  run("content/english/year-2/year2-v22-homolog-dragdrop-visual-patch.js");
}
run("content/english/year-2/module-01/module-01-v22-homolog.js");
for (let m = 2; m <= 6; m += 1) {
  const mm = String(m).padStart(2, "0");
  run(`content/english/year-2/module-${mm}/module-${mm}-v22-homolog.js`);
}

const y2 = sandbox.window.DUDUQ_CONTENT?.english?.year2 || {};
const modules = Array.from({ length: 6 }, (_, index) => y2[`module${String(index + 1).padStart(2, "0")}v22homolog`]);
if (!modules.every(Boolean)) throw new Error("M01-M06 não carregaram na auditoria comercial");
const all = modules.flatMap(questions);
if (all.length !== 90) throw new Error(`Esperados 90 itens; atual=${all.length}`);

async function getJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "DuduQ-Year2-Readiness-Audit" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

let assetIndex = null;
let audioRoot = null;
let remoteError = null;
try {
  [assetIndex, audioRoot] = await Promise.all([
    getJson("https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/asset-catalog/assets-index.json"),
    getJson("https://api.github.com/repos/augustoborgessousa93/Assets-DuduQ/contents/Audios?ref=main")
  ]);
} catch (error) {
  remoteError = String(error?.message || error);
}

const items = all.map((question) => {
  const images = collectImageRefs(question);
  const previewImages = images.filter((entry) => /^data:image\//i.test(entry.src));
  const repositoryImages = images.filter((entry) => !/^data:image\//i.test(entry.src));
  const audio = audioProfile(question);
  return {
    id: question.id,
    module: question.module,
    mechanic: question.delivery?.mechanic,
    visualRequired: images.length > 0,
    visualFinalAssetRequired: question.metadata?.finalAssetRequired === true || previewImages.length > 0,
    previewImageCount: previewImages.length,
    repositoryImageCount: repositoryImages.length,
    visualConcepts: Array.from(new Set(previewImages.map((entry) => entry.alt).filter(Boolean))),
    ...audio
  };
});

const visualRequired = items.filter((item) => item.visualRequired);
const visualPending = items.filter((item) => item.visualFinalAssetRequired);
const visualReady = visualRequired.filter((item) => !item.visualFinalAssetRequired && item.repositoryImageCount > 0);
const englishStimulus = items.filter((item) => item.englishStimulusConfigured);
const englishStimulusRecorded = englishStimulus.filter((item) => item.englishStimulusRecorded);
const optionAudio = items.filter((item) => item.optionAudioConfigured);
const optionAudioRecorded = optionAudio.filter((item) => item.optionAudioRecordedAll);
const pendingConcepts = Array.from(new Set(visualPending.flatMap((item) => item.visualConcepts))).sort((a, b) => a.localeCompare(b));
const audioEntries = Array.isArray(audioRoot) ? audioRoot : [];
const year2AudioDir = audioEntries.find((entry) => /^(?:2[_ -]?ANO|YEAR[_ -]?2)$/i.test(entry.name || ""));

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    engineBranch: "homolog/year2-word-slash-pedagogy",
    assetsRepository: "augustoborgessousa93/Assets-DuduQ@main",
    assetCatalogGeneratedAt: assetIndex?.generatedAt || null,
    assetCatalogStats: assetIndex?.stats || null,
    remoteError
  },
  summary: {
    editorialItems: items.length,
    visualRequiredItems: visualRequired.length,
    visualReadyRepositoryItems: visualReady.length,
    visualPendingPreviewItems: visualPending.length,
    uniquePendingVisualConcepts: pendingConcepts.length,
    englishStimulusItems: englishStimulus.length,
    englishStimulusRecordedItems: englishStimulusRecorded.length,
    optionAudioItems: optionAudio.length,
    optionAudioFullyRecordedItems: optionAudioRecorded.length,
    year2AudioDirectoryPresent: Boolean(year2AudioDir),
    commercialReady: !remoteError && visualPending.length === 0 && englishStimulusRecorded.length === englishStimulus.length && Boolean(year2AudioDir)
  },
  year2AudioDirectory: year2AudioDir ? { name: year2AudioDir.name, path: year2AudioDir.path, sha: year2AudioDir.sha } : null,
  pendingVisualConcepts: pendingConcepts,
  items
};

fs.writeFileSync(path.join(outDir, "year2-commercial-readiness.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, "README.md"), [
  "# DuduQ — 2º Ano — Readiness comercial",
  "",
  `Itens: **${report.summary.editorialItems}**`,
  `Imagens pendentes em preview/vetor: **${report.summary.visualPendingPreviewItems}**`,
  `Conceitos visuais únicos pendentes: **${report.summary.uniquePendingVisualConcepts}**`,
  `Estímulos em inglês: **${report.summary.englishStimulusItems}**`,
  `Estímulos em inglês já ligados a áudio gravado: **${report.summary.englishStimulusRecordedItems}**`,
  `Pasta Audios/2_ANO presente: **${report.summary.year2AudioDirectoryPresent ? "SIM" : "NÃO"}**`,
  `Pronto comercialmente: **${report.summary.commercialReady ? "SIM" : "NÃO"}**`,
  "",
  "TTS e vetores/data-URI continuam válidos apenas na homologação; esta auditoria não promove assets automaticamente."
].join("\n"));

console.log("DUDUQ YEAR2 COMMERCIAL READINESS AUDIT");
console.log(JSON.stringify(report.summary, null, 2));
if (remoteError) console.warn(`REMOTE AUDIT WARNING: ${remoteError}`);

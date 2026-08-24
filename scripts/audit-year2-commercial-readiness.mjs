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
function recorded(value) {
  return Boolean(value && typeof value === "object" && (value.src || value.path || value.url || value.asset || value.assetKey || value.audioAssetKey));
}
function images(question) {
  const out = [];
  const add = (src, alt, origin) => src && out.push({ src: String(src), alt: String(alt || ""), origin });
  add(question?.image?.src, question?.image?.alt, "question.image");
  for (const target of question?.metadata?.targets || []) add(target?.imageSrc || target?.image, target?.alt || target?.label, "metadata.targets");
  for (const item of question?.metadata?.targetShooter?.items || []) add(item?.image, item?.alt || item?.label, "targetShooter.items");
  for (const alt of question?.alternatives || []) add(alt?.image?.src, alt?.image?.alt || alt?.text, "alternatives.image");
  return out;
}
function audio(question) {
  const stimuli = [];
  const add = (value, origin, language = "") => {
    if (!value || typeof value !== "object") return;
    const text = String(value.text || value.spokenText || "").trim();
    if (!text && !recorded(value)) return;
    stimuli.push({ origin, language: value.language || value.locale || value.speechLocale || language, recorded: recorded(value) });
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
    optionAudioRecordedAll: optionAudios.length > 0 && optionAudios.every((alt) => recorded(alt.audio))
  };
}

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-dragdrop-visual-patch.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/year2-v22-homolog-semantic-vectors.js");
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

const itemAudit = all.map((question) => {
  const refs = images(question);
  const previews = refs.filter((entry) => /^data:image\//i.test(entry.src));
  const repository = refs.filter((entry) => !/^data:image\//i.test(entry.src));
  const semanticVectorFinal = question.metadata?.visualStatus === "final-semantic-vector";
  const explicitFinal = question.metadata?.finalAssetRequired === false;
  const requiresFinalAsset = question.metadata?.finalAssetRequired === true || (previews.length > 0 && !semanticVectorFinal && !explicitFinal);
  return {
    id: question.id,
    module: question.module,
    mechanic: question.delivery?.mechanic,
    visualRequired: refs.length > 0,
    visualFinalAssetRequired: requiresFinalAsset,
    semanticVectorFinal,
    previewImageCount: previews.length,
    repositoryImageCount: repository.length,
    repositoryImages: repository.map((entry) => ({ alt: entry.alt, src: entry.src, origin: entry.origin })),
    visualConcepts: requiresFinalAsset ? Array.from(new Set(previews.map((entry) => entry.alt).filter(Boolean))) : [],
    ...audio(question)
  };
});

const visualRequired = itemAudit.filter((item) => item.visualRequired);
const visualPending = itemAudit.filter((item) => item.visualFinalAssetRequired);
const visualReadyRepository = visualRequired.filter((item) => !item.visualFinalAssetRequired && item.repositoryImageCount > 0);
const semanticVectorFinal = itemAudit.filter((item) => item.semanticVectorFinal);
const visualReadyTotal = visualRequired.filter((item) => !item.visualFinalAssetRequired);
const englishStimulus = itemAudit.filter((item) => item.englishStimulusConfigured);
const englishRecorded = englishStimulus.filter((item) => item.englishStimulusRecorded);
const optionAudio = itemAudit.filter((item) => item.optionAudioConfigured);
const optionRecorded = optionAudio.filter((item) => item.optionAudioRecordedAll);
const pendingConcepts = Array.from(new Set(visualPending.flatMap((item) => item.visualConcepts))).sort((a, b) => a.localeCompare(b));
const audioEntries = Array.isArray(audioRoot) ? audioRoot : [];
const year2AudioDir = audioEntries.find((entry) => /^(?:2[_ -]?ANO|YEAR[_ -]?2)$/i.test(entry.name || ""));
const exactAssetItems = Array.from(sandbox.window.DuduQYear2V22Factory?.exactEditorialAssetItems || []);
const finalVectorIds = Array.from(sandbox.window.DuduQYear2V22Factory?.finalSemanticVectorIds || []);

const report = {
  schemaVersion: 3,
  generatedAt: new Date().toISOString(),
  source: {
    engineBranch: "homolog/year2-word-slash-pedagogy",
    assetsRepository: "augustoborgessousa93/Assets-DuduQ@main",
    assetCatalogGeneratedAt: assetIndex?.generatedAt || null,
    assetCatalogStats: assetIndex?.stats || null,
    remoteError
  },
  summary: {
    editorialItems: itemAudit.length,
    exactExistingAssetItemsWired: exactAssetItems.length,
    finalSemanticVectorItems: semanticVectorFinal.length,
    visualRequiredItems: visualRequired.length,
    visualReadyRepositoryItems: visualReadyRepository.length,
    visualReadyTotalItems: visualReadyTotal.length,
    visualPendingPreviewItems: visualPending.length,
    uniquePendingVisualConcepts: pendingConcepts.length,
    englishStimulusItems: englishStimulus.length,
    englishStimulusRecordedItems: englishRecorded.length,
    optionAudioItems: optionAudio.length,
    optionAudioFullyRecordedItems: optionRecorded.length,
    year2AudioDirectoryPresent: Boolean(year2AudioDir),
    commercialReady: !remoteError && visualPending.length === 0 && englishRecorded.length === englishStimulus.length && Boolean(year2AudioDir)
  },
  exactExistingAssetItems: exactAssetItems,
  finalSemanticVectorIds: finalVectorIds,
  year2AudioDirectory: year2AudioDir ? { name: year2AudioDir.name, path: year2AudioDir.path, sha: year2AudioDir.sha } : null,
  pendingVisualConcepts: pendingConcepts,
  items: itemAudit
};

fs.writeFileSync(path.join(outDir, "year2-commercial-readiness.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, "README.md"), [
  "# DuduQ — 2º Ano — Readiness comercial",
  "",
  `Itens editoriais: **${report.summary.editorialItems}**`,
  `Itens ligados a assets exatos já existentes: **${report.summary.exactExistingAssetItemsWired}**`,
  `Itens finalizados como vetor semântico determinístico: **${report.summary.finalSemanticVectorItems}**`,
  `Itens visualmente prontos no total: **${report.summary.visualReadyTotalItems}**`,
  `Itens ainda com preview ilustrativo: **${report.summary.visualPendingPreviewItems}**`,
  `Conceitos visuais únicos ainda pendentes: **${report.summary.uniquePendingVisualConcepts}**`,
  `Estímulos em inglês: **${report.summary.englishStimulusItems}**`,
  `Estímulos em inglês já ligados a áudio gravado: **${report.summary.englishStimulusRecordedItems}**`,
  `Pasta Audios/2_ANO presente: **${report.summary.year2AudioDirectoryPresent ? "SIM" : "NÃO"}**`,
  `Pronto comercialmente: **${report.summary.commercialReady ? "SIM" : "NÃO"}**`,
  "",
  "Numerais e formas geométricas simples podem ser finais como vetores semânticos determinísticos. Emojis, pessoas, família, brinquedos e partes do corpo continuam sendo apenas preview até receberem ilustração editorial adequada. TTS continua apenas fallback de homologação."
].join("\n"));

console.log("DUDUQ YEAR2 COMMERCIAL READINESS AUDIT V3");
console.log(JSON.stringify(report.summary, null, 2));
if (remoteError) console.warn(`REMOTE AUDIT WARNING: ${remoteError}`);

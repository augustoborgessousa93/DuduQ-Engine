import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "artifacts", "year2-production-plan");
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
function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function slug(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "clip";
}
function csv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
function check(condition, message) {
  if (!condition) throw new Error(message);
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
check(modules.every(Boolean), "M01-M06 não carregaram no plano de produção");
const all = modules.flatMap(questions);
check(all.length === 90, `Esperados 90 itens; atual=${all.length}`);

const audioUses = [];
function addAudio(question, value, role, origin, fallbackLocale = "") {
  if (!value || typeof value !== "object") return;
  const text = cleanText(value.text || value.spokenText);
  const locale = cleanText(value.language || value.locale || value.speechLocale || fallbackLocale);
  if (!text || !/^en(?:-|$)/i.test(locale)) return;
  audioUses.push({ itemId: question.id, module: question.module, text, locale, role, origin });
}
for (const question of all) {
  addAudio(question, question.audio, question.audio?.role || "question", "question.audio");
  addAudio(question, question.metadata?.stimulusAudio, "stimulus", "metadata.stimulusAudio");
  if (question.metadata?.targetShooter?.audioText) {
    audioUses.push({ itemId: question.id, module: question.module, text: cleanText(question.metadata.targetShooter.audioText), locale: "en-US", role: "stimulus", origin: "targetShooter.audioText" });
  }
  if (question.metadata?.wordSlash?.audioText) {
    audioUses.push({ itemId: question.id, module: question.module, text: cleanText(question.metadata.wordSlash.audioText), locale: "en-US", role: "stimulus", origin: "wordSlash.audioText" });
  }
  for (const alternative of question.alternatives || []) {
    addAudio(question, alternative?.audio, "option", `alternative:${alternative?.id || "unknown"}`);
  }
  for (const left of question.metadata?.matching?.leftItems || []) {
    if (left?.spokenText) addAudio(question, { spokenText: left.spokenText, speechLocale: left.speechLocale || "en-US" }, "matching-left", `matching.left:${left.id || "unknown"}`);
  }
  for (const right of question.metadata?.matching?.rightItems || []) {
    if (right?.spokenText) addAudio(question, { spokenText: right.spokenText, speechLocale: right.speechLocale || "en-US" }, "matching-right", `matching.right:${right.id || "unknown"}`);
  }
}

const clipMap = new Map();
for (const use of audioUses) {
  const key = `${use.locale.toLowerCase()}\u0000${use.text.toLowerCase()}`;
  if (!clipMap.has(key)) {
    clipMap.set(key, {
      clipId: `EN2-AUD-${String(clipMap.size + 1).padStart(3, "0")}`,
      locale: use.locale,
      text: use.text,
      itemIds: new Set(),
      modules: new Set(),
      roles: new Set(),
      origins: new Set()
    });
  }
  const clip = clipMap.get(key);
  clip.itemIds.add(use.itemId);
  clip.modules.add(use.module);
  clip.roles.add(use.role);
  clip.origins.add(use.origin);
}
const clips = Array.from(clipMap.values()).map((clip) => ({
  clipId: clip.clipId,
  locale: clip.locale,
  text: clip.text,
  filename: `Audios/2_ANO/${clip.clipId.toLowerCase()}__${slug(clip.text)}.mp3`,
  itemIds: Array.from(clip.itemIds).sort(),
  modules: Array.from(clip.modules).sort((a, b) => a - b),
  roles: Array.from(clip.roles).sort(),
  origins: Array.from(clip.origins).sort(),
  recordingStatus: "PENDING_FINAL_RECORDED_AUDIO",
  qa: {
    nativeOrFluentEnglishVoice: true,
    noLeadingOrTrailingSilence: true,
    normalizedLoudness: true,
    classroomClearPacing: true,
    noTtsInCommercialBuild: true
  }
}));

const assetPlan = {
  schemaVersion: 2,
  principle: "reuse-first-atomic-assets-plus-runtime-composition",
  rules: [
    "Não criar uma imagem diferente para cada questão quando a mesma unidade visual pode ser reutilizada.",
    "Quantidade deve preferir repetição do mesmo asset-base com espaçamento legível.",
    "Destaque de parte do corpo deve usar uma base corporal consistente e overlays, não dezenas de personagens distintos.",
    "Numerais e formas geométricas simples são vetores semânticos determinísticos e não exigem ilustração editorial externa.",
    "Cor, tamanho ou identidade só podem ser inferidos de um asset existente quando forem visualmente inequívocos."
  ],
  newAtomicAssets: [
    { key: "family-mother", filename: "family-mother-mae.png", purpose: "mother; composição de grupo familiar" },
    { key: "family-father", filename: "family-father-pai.png", purpose: "father; composição de grupo familiar" },
    { key: "family-brother", filename: "family-brother-irmao.png", purpose: "brother; composição de grupo familiar" },
    { key: "family-sister", filename: "family-sister-irma.png", purpose: "sister; composição de grupo familiar" },
    { key: "family-grandfather", filename: "family-grandfather-avo.png", purpose: "grandfather; composição de grupo familiar" },
    { key: "family-grandmother", filename: "family-grandmother-avo-feminino.png", purpose: "grandmother; composição de grupo familiar" },
    { key: "toy-doll", filename: "toy-doll-boneca.png", purpose: "doll; reutilizar também em quantidade 4" },
    { key: "toy-ball", filename: "toy-ball-blue-bola-azul.png", purpose: "ball; blue ball; reutilizar também em quantidade 3" },
    { key: "toy-teddy-bear", filename: "toy-teddy-bear-ursinho-pelucia.png", purpose: "teddy bear" },
    { key: "toy-video-game", filename: "toy-video-game-videogame.png", purpose: "video game" },
    { key: "toy-kite", filename: "toy-kite-pipa.png", purpose: "kite; composição com Mia" },
    { key: "toy-boat-red", filename: "toy-boat-red-barco-vermelho.png", purpose: "red boat; reutilizar em quantidade 2" },
    { key: "body-child-front", filename: "body-child-neutral-front-crianca-corpo-frente.png", purpose: "base única para highlights de head, eye, ear, nose, mouth, knee, shoulders, hands, legs e feet" },
    { key: "body-hand-closeup", filename: "body-hand-closeup-mao-detalhe.png", purpose: "finger com leitura visual inequívoca" },
    { key: "food-grape-single", filename: "food-grape-single-uva-unidade.png", purpose: "repetição exata para ten grapes" }
  ],
  verifyExistingBeforeCreate: [
    { itemId: "EN2-M3-14", existing: "Train - trem.png", requirement: "o trem precisa ser inequivocamente vermelho", fallbackFilename: "toy-train-red-trem-vermelho.png" },
    { itemId: "EN2-M4-11", existing: "Pato.png", requirement: "o pato precisa ser amarelo e manter leitura clara quando repetido 10 vezes", fallbackFilename: "animal-duck-yellow-pato-amarelo.png" },
    { itemId: "EN2-M4-14", existing: "Cachorro - dog.png", requirement: "o cachorro precisa ser marrom e manter leitura clara em composição plural", fallbackFilename: "animal-dog-brown-cachorro-marrom.png" },
    { itemId: "EN2-M6-07", existing: "Apple - maçã.png", requirement: "a maçã precisa ser inequivocamente vermelha", fallbackFilename: "food-apple-red-maca-vermelha.png" },
    { itemId: "EN2-M6-08", existing: "Banana.png", requirement: "a banana precisa ser inequivocamente amarela", fallbackFilename: "food-banana-yellow-banana-amarela.png" },
    { itemId: "EN2-M6-13", existing: "Tomato - tomate.png", requirement: "o tomate precisa ser inequivocamente vermelho", fallbackFilename: "food-tomato-red-tomate-vermelho.png" }
  ],
  compositionRecipes: [
    { itemIds: ["EN2-M2-07","EN2-M2-08","EN2-M2-09","EN2-M2-10","EN2-M2-11","EN2-M2-12","EN2-M2-13","EN2-M2-15"], recipe: "family-six-atomic-assets; highlight role when required; no separate family scene per question" },
    { itemIds: ["EN2-M3-08"], recipe: "repeat toy-doll x4" },
    { itemIds: ["EN2-M3-09"], recipe: "reuse existing Mia.png + toy-kite" },
    { itemIds: ["EN2-M3-10"], recipe: "repeat toy-boat-red x2" },
    { itemIds: ["EN2-M3-15"], recipe: "repeat toy-ball x3" },
    { itemIds: ["EN2-M5-01","EN2-M5-02","EN2-M5-03","EN2-M5-04","EN2-M5-05","EN2-M5-06","EN2-M5-07","EN2-M5-08","EN2-M5-10","EN2-M5-11","EN2-M5-13","EN2-M5-15"], recipe: "body-child-front + deterministic highlight overlay" },
    { itemIds: ["EN2-M5-12"], recipe: "body-hand-closeup + finger highlight" },
    { itemIds: ["EN2-M6-09"], recipe: "reuse Potato - batata.png at calibrated large scale" },
    { itemIds: ["EN2-M6-10"], recipe: "repeat food-grape-single x10 in countable grid" },
    { itemIds: ["EN2-M6-14"], recipe: "reuse Carrot - cenoura.png x4" },
    { itemIds: ["EN2-M6-15"], recipe: "reuse Apple - maçã.png twice with clearly distinct calibrated sizes" }
  ],
  alreadyFinalWithoutNewArtwork: {
    exactRepositoryAssetItemIds: Array.from(sandbox.window.DuduQYear2V22Factory?.exactEditorialAssetItems || []),
    semanticVectorItemIds: Array.from(sandbox.window.DuduQYear2V22Factory?.finalSemanticVectorIds || [])
  }
};

check(assetPlan.newAtomicAssets.length === 15, `Plano deve manter 15 assets-base garantidos; atual=${assetPlan.newAtomicAssets.length}`);
check(assetPlan.verifyExistingBeforeCreate.length === 6, `Plano deve manter 6 verificações condicionais; atual=${assetPlan.verifyExistingBeforeCreate.length}`);
check(assetPlan.alreadyFinalWithoutNewArtwork.exactRepositoryAssetItemIds.length === 10, `Esperados 10 itens já ligados a assets exatos; atual=${assetPlan.alreadyFinalWithoutNewArtwork.exactRepositoryAssetItemIds.length}`);
check(assetPlan.alreadyFinalWithoutNewArtwork.semanticVectorItemIds.length === 15, `Esperados 15 itens finais por vetor semântico; atual=${assetPlan.alreadyFinalWithoutNewArtwork.semanticVectorItemIds.length}`);
check(clips.length > 0, "Manifesto de áudio não pode ficar vazio");

const audioManifest = {
  schemaVersion: 1,
  language: "en-US",
  directory: "Audios/2_ANO",
  uniqueClips: clips.length,
  totalRuntimeUses: audioUses.length,
  clips
};

fs.writeFileSync(path.join(outDir, "audio-recording-manifest.json"), JSON.stringify(audioManifest, null, 2));
fs.writeFileSync(path.join(outDir, "asset-production-plan.json"), JSON.stringify(assetPlan, null, 2));

const audioCsv = [
  ["clip_id","locale","text","filename","item_ids","roles","status"].map(csv).join(","),
  ...clips.map((clip) => [
    clip.clipId,
    clip.locale,
    clip.text,
    clip.filename,
    clip.itemIds.join(";"),
    clip.roles.join(";"),
    clip.recordingStatus
  ].map(csv).join(","))
].join("\n");
fs.writeFileSync(path.join(outDir, "audio-recording-manifest.csv"), audioCsv);

const guaranteedNew = assetPlan.newAtomicAssets.length;
const conditionalNew = assetPlan.verifyExistingBeforeCreate.length;
fs.writeFileSync(path.join(outDir, "README.md"), [
  "# DuduQ — 2º Ano — Plano de produção",
  "",
  `Clipes únicos de áudio EN a gravar: **${clips.length}**`,
  `Usos de áudio EN no runtime: **${audioUses.length}**`,
  `Novos assets-base garantidos: **${guaranteedNew}**`,
  `Assets condicionais à inspeção dos arquivos existentes: **${conditionalNew}**`,
  `Itens já cobertos por asset exato existente: **${assetPlan.alreadyFinalWithoutNewArtwork.exactRepositoryAssetItemIds.length}**`,
  `Itens cobertos por vetor semântico final: **${assetPlan.alreadyFinalWithoutNewArtwork.semanticVectorItemIds.length}**`,
  "",
  "O plano evita criar dezenas de imagens redundantes: família, quantidades, partes do corpo e tamanhos são montados a partir de unidades visuais reutilizáveis."
].join("\n"));

console.log("DUDUQ YEAR2 PRODUCTION PLAN: PASS");
console.log(JSON.stringify({
  editorialItems: all.length,
  uniqueEnglishAudioClips: clips.length,
  englishAudioRuntimeUses: audioUses.length,
  newAtomicAssets: guaranteedNew,
  verifyExistingBeforeCreate: conditionalNew,
  exactRepositoryItems: assetPlan.alreadyFinalWithoutNewArtwork.exactRepositoryAssetItemIds.length,
  semanticVectorItems: assetPlan.alreadyFinalWithoutNewArtwork.semanticVectorItemIds.length
}, null, 2));

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...parts) => path.join(root, ...parts);
const readJson = async (...parts) => JSON.parse(await readFile(rel(...parts), "utf8"));
const writeJson = async (file, value) => writeFile(rel(file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const sha256 = async file => createHash("sha256").update(await readFile(file)).digest("hex");

const map = await readJson("content", "english", "year-1", "module-01", "image-resolution-map.json");
const questions = await readJson("content", "english", "year-1", "module-01", "questions.json");
const audio = await readJson("content", "english", "year-1", "module-01", "audio-production-manifest.json");
const requirementFile = await readJson("content", "english", "year-1", "module-01", "media-requirements.json");
const qaAssetRoot = rel("qa", "y1m01-image-bank", "assets");
const productAssetRoot = rel("content", "english", "assets", "images", "year-1", "module-01", "temporary");
await mkdir(productAssetRoot, { recursive: true });

const copiedBySha = new Map();
const localAssetFor = async source => {
  if (copiedBySha.has(source.sourceSHA)) return copiedBySha.get(source.sourceSHA);
  const extension = path.extname(source.sourceFilename).toLowerCase() || ".png";
  const sourcePreviewName = path.basename(source.qaPreviewPath || "");
  if (!sourcePreviewName) throw new Error(`QA_PREVIEW_MISSING:${source.sourcePath}`);
  const sourcePath = path.join(qaAssetRoot, sourcePreviewName);
  if (await sha256(sourcePath) !== source.sourceSHA) throw new Error(`SOURCE_SHA_MISMATCH:${source.sourcePath}`);
  const safeStem = source.sourceFilename.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${source.sourceSHA.slice(0, 12)}-${safeStem}${extension}`;
  const destination = path.join(productAssetRoot, filename);
  await copyFile(sourcePath, destination);
  if (await sha256(destination) !== source.sourceSHA) throw new Error(`COPIED_SHA_MISMATCH:${filename}`);
  const entry = { path: `content/english/assets/images/year-1/module-01/temporary/${filename}`, sha256: source.sourceSHA, sourceRepo: source.sourceRepo, sourceBranch: source.sourceBranch, sourcePath: source.sourcePath, sourceCommit: source.sourceCommit, sourceFilename: source.sourceFilename, temporary: true };
  copiedBySha.set(source.sourceSHA, entry);
  return entry;
};

const mediaEntries = [];
const requirementByMedia = new Map(requirementFile.requirements.map(r => [r.requirementId, r]));
for (const requirement of map.requirements) {
  const id = requirement.mediaId || requirement.proposedMediaId;
  if (!id) throw new Error(`MEDIA_ID_MISSING:${requirement.requirementId}`);
  let selected = (requirement.selectedSourceAssets || []).map(source => ({ ...requirement.candidateAssets?.find(candidate => candidate.sourceSHA === source.sourceSHA), ...source }));
  let temporaryAcceptance = false;
  if (requirement.requirementId === "Y1M01-MEDIA-03") {
    const candidate = requirement.candidateAssets?.find(asset => asset.matchType === "second_pass_candidate") || requirement.candidateAssets?.[0];
    if (!candidate) throw new Error("MEDIA_03_CANDIDATE_MISSING");
    selected = [candidate];
    temporaryAcceptance = true;
  }
  if (requirement.requirementId === "Y1M01-MEDIA-06") {
    mediaEntries.push({ mediaId: id, requirementId: requirement.requirementId, status: "APPROVED", urlOrPath: "", kind: "composite", components: ["IMG-Y1M01-GREETING-MORNING-001", "IMG-Y1M01-GREETING-AFTERNOON-001", "IMG-Y1M01-FAREWELL-GENERIC-001"], temporary: true, integrationStatus: "ACCEPTED_FOR_V1_REPLACE_LATER" });
    continue;
  }
  if (requirement.requirementId === "Y1M01-MEDIA-15") {
    mediaEntries.push({ mediaId: id, requirementId: requirement.requirementId, status: "APPROVED", urlOrPath: "", kind: "composite", components: ["IMG-Y1M01-GREETING-MORNING-001", "IMG-Y1M01-INTRODUCTION-MIA-001", "IMG-Y1M01-FAREWELL-ANA-001"], temporary: true, integrationStatus: "ACCEPTED_FOR_V1_REPLACE_LATER" });
    continue;
  }
  if (!selected.length) {
    const first = requirement.candidateAssets?.[0];
    if (first) selected = [first];
  }
  if (!selected.length) throw new Error(`NO_ASSET_SELECTED:${id}`);
  const assets = [];
  for (const source of selected) assets.push(await localAssetFor(source));
  mediaEntries.push({ mediaId: id, requirementId: requirement.requirementId, status: "APPROVED", urlOrPath: assets[0].path, kind: assets.length > 1 ? "composite" : "image", assets, temporary: true, integrationStatus: "ACCEPTED_FOR_V1_REPLACE_LATER", humanResolutionStatus: requirement.resolutionStatus, ...(temporaryAcceptance ? { humanResolutionStatus: "TEMPORARY_ACCEPTED_FOR_INTEGRATION" } : {}) });
}

const mediaRegistry = { schemaVersion: "1.0", source: "Y1M01 canonical media integration from Assets-DuduQ bank", entries: mediaEntries };
await writeJson("content/english/media/media-registry.json", mediaRegistry);

const reqByItem = new Map();
for (const requirement of map.requirements) for (const itemId of requirement.usedByItems || []) reqByItem.set(itemId, requirement.mediaId || requirement.proposedMediaId);
const boundQuestions = questions.items.map(item => {
  const copy = { ...item, image_ref: reqByItem.get(item.item_id) || item.image_ref };
  const bindings = audio.items?.[item.item_id] || [];
  if (bindings.length === 1) copy.audio_ref = bindings[0].audioId;
  else if (bindings.length > 1) {
    copy.audio_ref = null;
    copy.audioBindings = bindings.map((binding, index) => ({ ...binding, ...(item.item_id === "Y1M01-Q009" ? { mediaId: ["IMG-Y1M01-GREETING-MORNING-001", "IMG-Y1M01-GREETING-AFTERNOON-001", "IMG-Y1M01-FAREWELL-GENERIC-001"][index] } : {}) }));
  }
  if (item.item_id === "Y1M01-Q014") copy.mediaBindings = [
    { role: "option_a", label: item.opcao_a, mediaId: "IMG-Y1M01-NAME-TAGS-001", assetIndex: 0, answerKey: "ana" },
    { role: "option_b", label: item.opcao_b, mediaId: "IMG-Y1M01-NAME-TAGS-001", assetIndex: 1, answerKey: "mia" },
    { role: "option_c", label: item.opcao_c, mediaId: "IMG-Y1M01-NAME-TAGS-001", assetIndex: 2, answerKey: "leo" }
  ];

  const optionMedia = {
    "Y1M01-Q001": ["IMG-Y1M01-GREETING-GENERIC-001", "IMG-Y1M01-FAREWELL-GENERIC-001"],
    "Y1M01-Q002": ["IMG-Y1M01-GREETING-INFORMAL-001", "IMG-Y1M01-FAREWELL-GENERIC-001", "IMG-Y1M01-GREETING-AFTERNOON-001"],
    "Y1M01-Q003": ["IMG-Y1M01-GREETING-MORNING-001", "IMG-Y1M01-GREETING-AFTERNOON-001"],
    "Y1M01-Q004": ["IMG-Y1M01-GREETING-AFTERNOON-001", "IMG-Y1M01-GREETING-MORNING-001"],
    "Y1M01-Q005": ["IMG-Y1M01-FAREWELL-GENERIC-001", "IMG-Y1M01-GREETING-GENERIC-001"],
    "Y1M01-Q010": ["IMG-Y1M01-DIALOGUE-HELLO-HI-001", "IMG-Y1M01-FAREWELL-GENERIC-001"],
    "Y1M01-Q011": ["IMG-Y1M01-NAME-QUESTION-001", "IMG-Y1M01-FAREWELL-GENERIC-001", "IMG-Y1M01-GREETING-GENERIC-001"],
    "Y1M01-Q012": ["IMG-Y1M01-NAME-LEO-001", "IMG-Y1M01-NAME-MIA-001", "IMG-Y1M01-NAME-TAGS-001"],
    "Y1M01-Q013": null,
    "Y1M01-Q015": ["IMG-Y1M01-DIALOGUE-HELLO-HI-001", "IMG-Y1M01-FAREWELL-GENERIC-001", "IMG-Y1M01-GREETING-INFORMAL-001"],
    "Y1M01-Q016": ["IMG-Y1M01-BOY-GIRL-001", "IMG-Y1M01-BOY-GIRL-001"],
    "Y1M01-Q017": ["IMG-Y1M01-BOY-GIRL-001", "IMG-Y1M01-BOY-GIRL-001"],
    "Y1M01-Q018": ["IMG-Y1M01-INTRODUCTION-MIA-001", "IMG-Y1M01-NAME-LEO-001"],
    "Y1M01-Q019": ["IMG-Y1M01-NAME-LEO-001", "IMG-Y1M01-INTRODUCTION-MIA-001", "IMG-Y1M01-FAREWELL-ANA-001"],
    "Y1M01-Q020": ["IMG-Y1M01-FAREWELL-ANA-001", "IMG-Y1M01-GREETING-MORNING-001", "IMG-Y1M01-GREETING-INFORMAL-001"]
  }[item.item_id];
  if (item.item_id === "Y1M01-Q006" || item.item_id === "Y1M01-Q007" || item.item_id === "Y1M01-Q008") {
    const correctAudio = { "Y1M01-Q006": "AUD-Y1M01-685BAF0CD887", "Y1M01-Q007": "AUD-Y1M01-15C49EF914C3", "Y1M01-Q008": "AUD-Y1M01-CE305BA925A9" }[item.item_id];
    copy.audio_ref = correctAudio;
    copy.audioBindings = [{ role: "audio", audioId: correctAudio }];
    copy.instrucao_pt = "Ou\u00e7a e arraste para a cena correta.";
    copy.mediaBindings = [
      { role: "option_a", mediaId: "IMG-Y1M01-GREETING-MORNING-001", answerKey: "morning" },
      { role: "option_b", mediaId: "IMG-Y1M01-GREETING-AFTERNOON-001", answerKey: "afternoon" },
      { role: "option_c", mediaId: "IMG-Y1M01-FAREWELL-GENERIC-001", answerKey: "farewell" }
    ];
    copy.correctAnswerKey = { "Y1M01-Q006": "morning", "Y1M01-Q007": "afternoon", "Y1M01-Q008": "farewell" }[item.item_id];
  } else if (["Y1M01-Q009", "Y1M01-Q014"].includes(item.item_id)) {
    copy.runtimeMechanic = "drag-drop-multimedia";
  } else if (item.item_id === "Y1M01-Q012" || item.item_id === "Y1M01-Q015") {
    copy.mecanica_preferida = "target-shooter";
    copy.runtimeMechanic = "target-shooter";
  } else if (optionMedia) {
    copy.mediaBindings = optionMedia.flatMap((mediaId, index) => mediaId ? [{ role: `option_${String.fromCharCode(97 + index)}`, mediaId, ...(item.item_id === "Y1M01-Q012" ? { assetIndex: 0 } : {}) }] : []);
  }

  if (item.item_id === "Y1M01-Q009") copy.audioBindings = (copy.audioBindings || []).map((binding, index) => ({ ...binding, answerKey: ["morning", "afternoon", "farewell"][index] }));
  if (item.item_id === "Y1M01-Q014") copy.audioBindings = [{ role: "audio", audioId: item.audio_ref }];
  if (item.item_id === "Y1M01-Q015") copy.mediaBindings = [
    { role: "option_a", mediaId: "IMG-Y1M01-DIALOGUE-HELLO-HI-001" },
    { role: "option_b", mediaId: "IMG-Y1M01-FAREWELL-GENERIC-001" },
    { role: "option_c", mediaId: "IMG-Y1M01-GREETING-INFORMAL-001" }
  ];
  if (item.item_id === "Y1M01-Q015") {
    copy.instrucao_pt = "Ou\u00e7a os dois \u00e1udios e escolha a cena que representa uma pergunta e uma resposta.";
    copy.runtimePedagogicalNote = "V1 representation of question-and-answer turn-taking using single-answer audiovisual discrimination.";
  }
  if (item.item_id === "Y1M01-Q013") copy.runtimeMechanic = "target-shooter";
  if (item.item_id === "Y1M01-Q012") copy.opcao_c = "Ana";
  if (item.item_id === "Y1M01-Q012") copy.mediaBindings = [
    { role: "option_a", mediaId: "IMG-Y1M01-NAME-LEO-001" },
    { role: "option_b", mediaId: "IMG-Y1M01-NAME-MIA-001" },
    { role: "option_c", mediaId: "IMG-Y1M01-NAME-TAGS-001", assetIndex: 0 }
  ];
  if (item.item_id === "Y1M01-Q020") copy.mediaBindings = [
    { role: "option_a", mediaId: "IMG-Y1M01-FAREWELL-ANA-001", assetIndex: 1 },
    { role: "option_b", mediaId: "IMG-Y1M01-GREETING-MORNING-001" },
    { role: "option_c", mediaId: "IMG-Y1M01-GREETING-INFORMAL-001" }
  ];
  if (item.item_id === "Y1M01-Q016" || item.item_id === "Y1M01-Q017") copy.mediaBindings = [
    { role: "option_a", mediaId: "IMG-Y1M01-BOY-GIRL-001", assetIndex: item.item_id === "Y1M01-Q016" ? 0 : 1 },
    { role: "option_b", mediaId: "IMG-Y1M01-BOY-GIRL-001", assetIndex: item.item_id === "Y1M01-Q016" ? 1 : 0 }
  ];
  return copy;
});
await writeJson("content/english/year-1/module-01/questions.json", { ...questions, items: boundQuestions });

const reqFile = { ...requirementFile, requirements: requirementFile.requirements.map(requirement => {
  const mapItem = map.requirements.find(item => item.requirementId === requirement.requirementId);
  return { ...requirement, resolvedMediaId: mapItem?.mediaId || mapItem?.proposedMediaId || null, status: "ACCEPTED_FOR_V1_REPLACE_LATER" };
}) };
await writeJson("content/english/year-1/module-01/media-requirements.json", reqFile);

const updatedMap = { ...map, requirements: map.requirements.map(requirement => ({
  ...requirement,
  integrationResolution: requirement.requirementId === "Y1M01-MEDIA-03" ? "TEMPORARY_ACCEPTED_FOR_INTEGRATION" : requirement.requirementId === "Y1M01-MEDIA-06" ? "COMPOSITE_FROM_APPROVED_ASSETS" : requirement.resolutionStatus,
  integrationMediaId: requirement.mediaId || requirement.proposedMediaId,
  integrationAssetPaths: (mediaEntries.find(entry => entry.mediaId === (requirement.mediaId || requirement.proposedMediaId))?.assets || []).map(asset => asset.path)
})) };
await writeJson("content/english/year-1/module-01/image-resolution-map.json", updatedMap);

const backlog = map.requirements.filter(r => r.requirementId === "Y1M01-MEDIA-03").map(r => ({ mediaId: r.mediaId, currentAsset: mediaEntries.find(e => e.mediaId === r.mediaId)?.urlOrPath || "", reasonForFutureReplacement: "Best available morning scene has a weaker school-arrival cue than the original brief; accepted for V1 integration.", priority: "HIGH", status: "ACCEPTED_FOR_V1_REPLACE_LATER" }));
await writeJson("content/english/year-1/module-01/media-replacement-backlog.json", { schemaVersion: "1.0", moduleId: "Y1M01", items: backlog });
console.log(JSON.stringify({ mediaRequirements: mediaEntries.length, itemMediaBindings: boundQuestions.filter(q => q.image_ref).length, questionAudioBindings: boundQuestions.filter(q => q.audio_ref || q.audioBindings?.length).length, copiedUniqueAssets: copiedBySha.size, media03: mediaEntries.find(e => e.requirementId === "Y1M01-MEDIA-03")?.urlOrPath }, null, 2));

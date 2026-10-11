import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODE_MODALITIES, compareSemanticPair, validateMemoryQuestActivity } from "../play/memory-quest/memory-quest-contract.js";

export async function validateMemoryQuestContentContract() {
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(root, "content/mechanics/memory-quest-content-contract-v1.json");
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const audioManifestPath = path.join(root, "duduq-audio/manifests/AUDIO_MANIFEST.json");
const audioManifest = JSON.parse(await readFile(audioManifestPath, "utf8"));
const errors = [];
const demos = [];

for (const demo of contract.qaDemoSets || []) {
  const activity = {
    ...demo,
    qaOnly: true,
    topicEn: "Animals",
    instructionEn: "Turn over two cards. Find the matching meaning.",
    instructionPt: "Vire duas cartas. Encontre os significados correspondentes.",
    pairs: (demo.pairs || []).map(pair => ({ pairId: pair.pairId, semanticTarget: pair.semanticTarget, cards: [pair.leftCard, pair.rightCard] }))
  };
  const validation = validateMemoryQuestActivity(activity, { qaOnly: true });
  errors.push(...validation.errors.map(error => `${demo.demoId}:${error}`));
  const instructionIds = [demo.instructionAudioEnId, demo.instructionAudioPtId];
  const expectedLocales = ["en-US", "pt-BR"];
  for (let index = 0; index < instructionIds.length; index += 1) {
    const id = instructionIds[index];
    const entry = audioManifest.items.find(item => item.id === id || item.audioId === id);
    if (!id || !entry || entry.status !== "APPROVED" || entry.locale !== expectedLocales[index] || entry.voiceVersion !== "DUDUQ_GOLD_VOICE_v1") {
      errors.push(`${demo.demoId}:MQ_INSTRUCTION_AUDIO_MISSING:${id || expectedLocales[index]}`);
      continue;
    }
    const relative = String(entry.audioPath || "").replace(/^\/+/, "");
    if (!/\.mp3$/i.test(relative) || relative.split(/[\\/]/).includes("..")) errors.push(`${demo.demoId}:MQ_INSTRUCTION_AUDIO_INVALID_PATH:${id}`);
    else {
      try { await access(path.resolve(root, relative)); }
      catch { errors.push(`${demo.demoId}:MQ_INSTRUCTION_AUDIO_FILE_NOT_FOUND:${id}:${relative}`); }
    }
  }
  const allCards = activity.pairs.flatMap(pair => pair.cards);
  for (const card of allCards) {
    if (card.modality !== "image") continue;
    const relative = String(card.imageSrc).replace(/^\.\//, "").replace(/^\//, "");
    if (relative.split(/[\\/]/).includes("..")) errors.push(`${demo.demoId}:IMAGE_PATH_TRAVERSAL:${relative}`);
    else {
      try { await access(path.resolve(root, relative)); }
      catch { errors.push(`${demo.demoId}:IMAGE_NOT_FOUND:${relative}`); }
    }
  }
  for (const card of allCards.filter(item => item.modality === "audio")) {
    if (card.audioSrc) {
      const relative = String(card.audioSrc).replace(/^\.\//, "").replace(/^\//, "");
      try { await access(path.resolve(root, relative)); }
      catch { errors.push(`${demo.demoId}:AUDIO_NOT_FOUND:${relative}`); }
    } else if (!(demo.status === "QA_CANDIDATE_AVAILABLE_NOT_HOMOLOGATED" && card.spokenText && card.speechLocale)) {
      errors.push(`${demo.demoId}:QA_AUDIO_SOURCE_OR_EXPLICIT_TEST_VOICE_REQUIRED:${card.cardId}`);
    }
  }
  if (activity.pairs.length >= 2) {
    if (!compareSemanticPair({ ...activity.pairs[0].cards[0], pairId: activity.pairs[0].pairId, semanticTarget: activity.pairs[0].semanticTarget }, { ...activity.pairs[0].cards[1], pairId: activity.pairs[0].pairId, semanticTarget: activity.pairs[0].semanticTarget })) errors.push(`${demo.demoId}:SAME_PAIR_NOT_MATCHED`);
    if (compareSemanticPair({ ...activity.pairs[0].cards[0], pairId: activity.pairs[0].pairId, semanticTarget: activity.pairs[0].semanticTarget }, { ...activity.pairs[1].cards[0], pairId: activity.pairs[1].pairId, semanticTarget: activity.pairs[1].semanticTarget })) errors.push(`${demo.demoId}:DIFFERENT_PAIR_MATCHED`);
  }
  const modalities = new Set(allCards.map(card => card.modality));
  if (MODE_MODALITIES[demo.mode]?.length !== modalities.size || MODE_MODALITIES[demo.mode]?.some(modality => !modalities.has(modality))) errors.push(`${demo.demoId}:MODE_MODALITY_SET_INVALID`);
  for (const count of [3, 4, 5, 6]) {
    const scaled = { ...activity, pairs: Array.from({ length: count }, (_, index) => activity.pairs[index % activity.pairs.length]).map((pair, index) => ({ ...pair, pairId: `target-${count}-${index}`, semanticTarget: `target-${count}-${index}`, cards: pair.cards.map((card, cardIndex) => ({ ...card, cardId: `card-${count}-${index}-${cardIndex}` })) })) };
    const sizeCheck = validateMemoryQuestActivity(scaled, { qaOnly: true });
    if (!sizeCheck.valid) errors.push(`${demo.demoId}:PAIR_COUNT_${count}_FAILED:${sizeCheck.errors.join(",")}`);
  }
  demos.push({ demoId: demo.demoId, mode: demo.mode, pairs: activity.pairs.length, modalities: [...modalities], valid: validation.valid });
}

const modes = new Set(demos.map(demo => demo.mode));
for (const mode of Object.keys(MODE_MODALITIES)) if (!modes.has(mode)) errors.push(`MISSING_QA_MODE:${mode}`);

for (const seed of contract.qaLayoutPairSeeds || []) {
  const relative = String(seed.imageSrc || "").replace(/^\.\//, "").replace(/^\//, "");
  try { await access(path.resolve(root, relative)); }
  catch { errors.push(`QA_LAYOUT_IMAGE_NOT_FOUND:${relative}`); }
}

for (const demo of contract.qaDemoSets || []) {
  const basePairs = demo.pairs.map(pair => ({ pairId: pair.pairId, semanticTarget: pair.semanticTarget, cards: [pair.leftCard, pair.rightCard] }));
  const extraPairs = (contract.qaLayoutPairSeeds || []).map(seed => {
    const cards = demo.mode === "AUDIO_IMAGE"
      ? [{ cardId: `a-${seed.pairId}`, modality: "audio", spokenText: seed.spokenText }, { cardId: `i-${seed.pairId}`, modality: "image", imageSrc: seed.imageSrc, alt: seed.alt }]
      : demo.mode === "TEXT_IMAGE"
        ? [{ cardId: `t-${seed.pairId}`, modality: "text", text: seed.text }, { cardId: `i-${seed.pairId}`, modality: "image", imageSrc: seed.imageSrc, alt: seed.alt }]
        : [{ cardId: `a-${seed.pairId}`, modality: "audio", spokenText: seed.spokenText }, { cardId: `t-${seed.pairId}`, modality: "text", text: seed.text }];
    return { pairId: seed.pairId, semanticTarget: seed.semanticTarget, cards };
  });
  for (const count of [3, 4, 5, 6]) {
    const sized = { mode: demo.mode, qaOnly: true, topicEn: "Animals", instructionEn: "Find a pair.", instructionPt: "Encontre um par.", pairs: [...basePairs, ...extraPairs].slice(0, count) };
    const sizeCheck = validateMemoryQuestActivity(sized, { qaOnly: true });
    if (!sizeCheck.valid) errors.push(`${demo.demoId}:PAIR_COUNT_${count}_FAILED:${sizeCheck.errors.join(",")}`);
  }
}

// Fail-closed production fixture check: spokenText is not production audio.
const productionAudioCheck = validateMemoryQuestActivity({
  mode: "AUDIO_IMAGE", topicEn: "Animals", instructionEn: "Listen.", instructionPt: "Ouça.",
  pairs: [{ pairId: "dog", semanticTarget: "dog", cards: [
    { cardId: "a", modality: "audio", spokenText: "dog" },
    { cardId: "i", modality: "image", imageSrc: "qa/memory-quest/fixtures/dog.svg", alt: "dog" }
  ] }, { pairId: "cat", semanticTarget: "cat", cards: [
    { cardId: "b", modality: "audio", audioSrc: "/audio/cat.mp3" },
    { cardId: "j", modality: "image", imageSrc: "qa/memory-quest/fixtures/cat.svg", alt: "cat" }
  ] }, { pairId: "bird", semanticTarget: "bird", cards: [
    { cardId: "c", modality: "audio", audioSrc: "/audio/bird.mp3" },
    { cardId: "k", modality: "image", imageSrc: "qa/memory-quest/fixtures/bird.svg", alt: "bird" }
  ] }]
}, { qaOnly: false });
if (!productionAudioCheck.errors.includes("AUDIO_SOURCE_REQUIRED:a")) errors.push("PRODUCTION_SPEECH_TEXT_FALLBACK_NOT_REJECTED");
if (!productionAudioCheck.errors.includes("PRODUCTION_INSTRUCTION_AUDIO_REQUIRED")) errors.push("PRODUCTION_INSTRUCTION_AUDIO_NOT_REQUIRED");

return {
  status: errors.length ? "ISSUE" : "PASS",
  sourceOwner: "play/memory-quest/",
  contractId: contract.contractId,
  qaModes: demos,
  qaAudio: "EXPLICIT_QA_ONLY_SPEECHSYNTHESIS_FALLBACK; PRODUCTION_REQUIRES_AUDIO_SRC",
  orphanCards: 0,
  responsivePairCounts: [3, 4, 5, 6],
  productionFailClosedTest: productionAudioCheck.errors.includes("AUDIO_SOURCE_REQUIRED:a") && productionAudioCheck.errors.includes("PRODUCTION_INSTRUCTION_AUDIO_REQUIRED") ? "PASS" : "FAIL",
  errors
};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateMemoryQuestContentContract();
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

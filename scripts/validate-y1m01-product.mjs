import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const load = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const hash = value => createHash("sha256").update(value).digest("hex");
const [questions, requirements, registry, audioManifest, audioBindings] = await Promise.all([
  load("content/english/year-1/module-01/questions.json"),
  load("content/english/year-1/module-01/media-requirements.json"),
  load("content/english/media/media-registry.json"),
  load("duduq-audio/manifests/AUDIO_MANIFEST.json"),
  load("content/english/year-1/module-01/audio-production-manifest.json")
]);
const errors = [];
const mediaById = new Map(registry.entries.map(entry => [entry.mediaId, entry]));
const audioById = new Map(audioManifest.items.map(entry => [entry.audioId || entry.id, entry]));
const itemIds = new Set(questions.items.map(item => item.item_id));
const mechanics = Object.fromEntries(["target-shooter", "bubble-pop", "matching", "drag-drop-multimedia"].map(name => [name, 0]));
const hashValidMedia = async (entry, seen = new Set()) => {
  if (seen.has(entry.mediaId)) return false;
  seen.add(entry.mediaId);
  for (const componentId of entry.components || []) {
    const child = mediaById.get(componentId);
    if (!child || child.status !== "APPROVED" || !await hashValidMedia(child, new Set(seen))) return false;
  }
  for (const asset of entry.assets || []) {
    const absolute = path.join(root, asset.path);
    const bytes = await readFile(absolute).catch(() => null);
    if (!bytes || hash(bytes) !== asset.sha256) return false;
  }
  return Boolean((entry.components || []).length || (entry.assets || []).length);
};
const resolvedMedia = new Set(); const resolvedAudio = new Set();
let resolvedAudioContracts = 0; let spokenInstructions = 0; let completePedagogicalContracts = 0;
let englishInstructionContracts = 0; let portugueseInstructionContracts = 0;
const contentTooLong = [];
const targetCorrectPositions = new Set();
for (const item of questions.items) {
  if (!itemIds.has(item.item_id)) errors.push(`ITEM_ID:${item.item_id}`);
  const mechanic = item.runtimeMechanic || item.mecanica_preferida;
  if (!Object.hasOwn(mechanics, mechanic)) errors.push(`MECHANIC:${item.item_id}:${mechanic}`);
  else mechanics[mechanic] += 1;
  const media = mediaById.get(item.image_ref);
  if (!media || media.status !== "APPROVED" || !await hashValidMedia(media)) errors.push(`MEDIA:${item.item_id}:${item.image_ref}`);
  else resolvedMedia.add(item.image_ref);
  const ids = [...(item.audio_ref ? [item.audio_ref] : []), ...(item.audioBindings || []).map(binding => binding.audioId)];
  const instruction = item.instruction;
  const bilingualFields = [instruction?.titleEn, instruction?.titlePt, instruction?.instructionEn, instruction?.instructionPt];
  const completeBilingual = bilingualFields.every(value => String(value || '').trim()) &&
    instruction?.version === '2.0' && instruction?.audioOrder?.join(',') === 'en,pt' &&
    instruction?.instructionAudioEnId && instruction?.instructionAudioPtId &&
    instruction?.spokenTextEn?.trim() && instruction?.spokenTextPt?.trim();
  if (!completeBilingual) {
    errors.push(`INSTRUCTION_CONTRACT:${item.item_id}`);
  } else {
    completePedagogicalContracts += 1;
    const limits = [['titleEn', 4], ['titlePt', 5], ['instructionEn', 6], ['instructionPt', 7]];
    for (const [field, limit] of limits) {
      const count = String(instruction[field]).trim().split(/\s+/u).filter(Boolean).length;
      if (count > limit) contentTooLong.push({ itemId: item.item_id, field, count, limit, code: 'CONTENT_TOO_LONG' });
    }
    const en = audioById.get(instruction.instructionAudioEnId);
    const pt = audioById.get(instruction.instructionAudioPtId);
    const validEn = en?.status === 'APPROVED' && en.type === 'INSTRUCTION_AUDIO_EN' && en.locale === 'en-US' && en.speechText === instruction.spokenTextEn && en.audioPath?.endsWith('.mp3') && await readFile(path.join(root, en.audioPath)).catch(() => null);
    const validPt = pt?.status === 'APPROVED' && pt.type === 'INSTRUCTION_AUDIO_PT' && pt.locale === 'pt-BR' && pt.speechText === instruction.spokenTextPt && pt.audioPath?.endsWith('.mp3') && await readFile(path.join(root, pt.audioPath)).catch(() => null);
    if (!validEn) errors.push(`INSTRUCTION_AUDIO_EN:${item.item_id}:${instruction.instructionAudioEnId}`);
    else { englishInstructionContracts += 1; resolvedAudio.add(instruction.instructionAudioEnId); }
    if (!validPt) errors.push(`INSTRUCTION_AUDIO_PT:${item.item_id}:${instruction.instructionAudioPtId}`);
    else { portugueseInstructionContracts += 1; resolvedAudio.add(instruction.instructionAudioPtId); }
    if (validEn && validPt) spokenInstructions += 1;
  }
  if (!ids.length) errors.push(`AUDIO_BINDING:${item.item_id}`);
  resolvedAudioContracts += new Set(ids).size;
  for (const id of ids) {
    const audio = audioById.get(id);
    if (!audio || audio.status !== "APPROVED" || !audio.audioPath?.endsWith(".mp3")) errors.push(`AUDIO:${item.item_id}:${id}`);
    else {
      if (!await readFile(path.join(root, audio.audioPath)).catch(() => null)) errors.push(`AUDIO_FILE:${item.item_id}:${id}`);
      resolvedAudio.add(id);
    }
  }
  for (const binding of item.mediaBindings || []) {
    const entry = mediaById.get(binding.mediaId);
    if (!entry || entry.status !== "APPROVED" || !await hashValidMedia(entry)) errors.push(`OPTION_MEDIA:${item.item_id}:${binding.role}:${binding.mediaId}`);
    else if (Number.isInteger(binding.assetIndex) && binding.assetIndex >= (entry.assets || []).length) errors.push(`OPTION_MEDIA_INDEX:${item.item_id}:${binding.role}:${binding.assetIndex}`);
  }
  if (item.options) {
    const optionIds = item.options.map(option => option.optionId);
    if (optionIds.some((id, index) => !id || id !== item.options[index].answerKey || !item.options[index].label?.trim())) errors.push(`EMPTY_OR_INVALID_OPTION:${item.item_id}`);
    if (new Set(optionIds).size !== optionIds.length) errors.push(`DUPLICATE_OPTION:${item.item_id}`);
    if (item.answerKey && !optionIds.includes(item.answerKey) && item.runtimeMechanic !== "drag-drop-multimedia") errors.push(`ANSWER_KEY_NOT_IN_OPTIONS:${item.item_id}`);
    for (const option of item.options) {
      const entry = mediaById.get(option.mediaId);
      if (!option.mediaId || !entry || entry.status !== "APPROVED" || !await hashValidMedia(entry)) errors.push(`OPTION_ASSET:${item.item_id}:${option.optionId}`);
      else if (Number.isInteger(option.assetIndex) && option.assetIndex >= (entry.assets || []).length) errors.push(`OPTION_ASSET_INDEX:${item.item_id}:${option.optionId}`);
    }
  }
  if (mechanic === "target-shooter") {
    const options = item.options || [];
    if (options.length !== 4 || options.filter(option => option.correct).length !== 1 ||
        options.filter(option => !option.correct).length !== 3 || options.find(option => option.correct)?.optionId !== item.answerKey ||
        new Set(options.map(option => `${option.mediaId}:${option.assetIndex ?? 0}`)).size !== 4) errors.push(`TARGET_SHOOTER_4_TARGET_CONTRACT:${item.item_id}`);
    const correctIndex = options.findIndex(option => option.optionId === item.answerKey);
    if (correctIndex >= 0) targetCorrectPositions.add(correctIndex);
  }
  if (mechanic === "bubble-pop") {
    const pool = item.bubbleDistractorPool || [];
    if (!item.options?.some(option => option.correct && option.optionId === item.answerKey)) errors.push(`BUBBLE_ANSWER:${item.item_id}`);
    if (pool.length < 6 || new Set(pool.map(option => option.mediaId)).size !== pool.length || pool.some(option => !option.mediaId || !option.label?.trim())) errors.push(`BUBBLE_DISTRACTOR_POOL:${item.item_id}`);
  }
  if (mechanic === "drag-drop-multimedia") {
    const audioCount = item.audioBindings?.length || 0;
    const mediaCount = item.item_id === "Y1M01-Q009" ? new Set((item.audioBindings || []).map(binding => binding.mediaId).filter(Boolean)).size : item.mediaBindings?.length || 0;
    if (mediaCount !== 3 || ![1, 3].includes(audioCount)) errors.push(`DRAG_DROP_CAPACITY:${item.item_id}:${audioCount}:${mediaCount}`);
    if (item.item_id === "Y1M01-Q009" && (audioCount !== 3 || new Set(item.audioBindings.map(binding => binding.answerKey)).size !== 3)) errors.push("Q009_ONE_TO_ONE_AUDIO_MAPPING");
    if (item.item_id !== "Y1M01-Q009" && audioCount !== 1) errors.push(`DRAG_DROP_EXPECT_ONE_AUDIO:${item.item_id}`);
  }
  if (mechanic === "drag-drop-multimedia" && ["Y1M01-Q006", "Y1M01-Q007", "Y1M01-Q008"].includes(item.item_id)) {
    if (item.audioBindings?.length !== 1 || item.mediaBindings?.length !== 3 || !item.correctAnswerKey) errors.push(`SINGLE_AUDIO_THREE_SCENES:${item.item_id}`);
  }
}
if (questions.items.length !== 20) errors.push(`ITEM_COUNT:${questions.items.length}`);
if (requirements.requirements.length !== 16 || resolvedMedia.size !== 16) errors.push(`MEDIA_REQUIREMENTS:${requirements.requirements.length}:${resolvedMedia.size}`);
if (resolvedAudioContracts !== 23) errors.push(`CURRICULAR_AUDIO_CONTRACT_COUNT:${resolvedAudioContracts}`);
if (spokenInstructions !== 20 || completePedagogicalContracts !== 20 || englishInstructionContracts !== 20 || portugueseInstructionContracts !== 20) errors.push(`INSTRUCTION_COVERAGE:${spokenInstructions}:${englishInstructionContracts}:${portugueseInstructionContracts}:${completePedagogicalContracts}`);
if (contentTooLong.length) errors.push(...contentTooLong.map(entry => `${entry.code}:${entry.itemId}:${entry.field}:${entry.count}>${entry.limit}`));
if (targetCorrectPositions.size < 3) errors.push(`TARGET_CORRECT_POSITION_VARIATION:${targetCorrectPositions.size}`);
if (mechanics["target-shooter"] !== 12 || mechanics["bubble-pop"] !== 3 || mechanics.matching !== 0 || mechanics["drag-drop-multimedia"] !== 5) errors.push("MECHANIC_DISTRIBUTION");
const q009ContentAudio = (audioBindings.items["Y1M01-Q009"] || []).filter(binding => !binding.role.startsWith('instruction_'));
const q015ContentAudio = (audioBindings.items["Y1M01-Q015"] || []).filter(binding => !binding.role.startsWith('instruction_'));
if (q009ContentAudio.length !== 3 || new Set(q009ContentAudio.map(item => item.audioId)).size !== 3) errors.push("Q009_AUDIO");
if (q015ContentAudio.length !== 2 || new Set(q015ContentAudio.map(item => item.audioId)).size !== 2) errors.push("Q015_AUDIO");
const media03 = mediaById.get("IMG-Y1M01-GREETING-MORNING-001");
if (media03?.integrationStatus !== "ACCEPTED_FOR_V1_REPLACE_LATER") errors.push("MEDIA03_TEMPORARY_STATUS");
 console.log(JSON.stringify({ status: errors.length ? "ISSUE" : "PASS", standard: 'DUDUQ_BILINGUAL_PEDAGOGICAL_INSTRUCTION_V2', questions: questions.items.length, titleEnglish: questions.items.filter(item => item.instruction?.titleEn).length, titlePortuguese: questions.items.filter(item => item.instruction?.titlePt).length, instructionEnglish: questions.items.filter(item => item.instruction?.instructionEn).length, instructionPortuguese: questions.items.filter(item => item.instruction?.instructionPt).length, subtitlesRequired: 0, englishInstructionAudio: englishInstructionContracts, portugueseInstructionAudio: portugueseInstructionContracts, spokenInstructionPairs: spokenInstructions, contentTooLong, uniqueMediaRequirements: resolvedMedia.size, itemMediaBindings: questions.items.filter(item => item.image_ref).length, approvedCurricularAudioContracts: resolvedAudioContracts, completePedagogicalContracts, uniqueApprovedAudioAssets: resolvedAudio.size, targetShooterFourFilledTargets: questions.items.filter(item => (item.runtimeMechanic || item.mecanica_preferida) === "target-shooter").length, targetCorrectPositionCount: targetCorrectPositions.size, bubbleItemsWithSixDistinctDistractors: questions.items.filter(item => (item.runtimeMechanic || item.mecanica_preferida) === "bubble-pop" && item.bubbleDistractorPool?.length >= 6).length, dragDropThreeMediaContract: questions.items.filter(item => (item.runtimeMechanic || item.mecanica_preferida) === "drag-drop-multimedia" && ((item.mediaBindings?.length || 0) === 3 || (item.item_id === "Y1M01-Q009" && new Set((item.audioBindings || []).map(binding => binding.mediaId)).size === 3))).length, mechanics, q009: "3 independent IDs", q015: "2 independent IDs", temporaryMediaRequirements: registry.entries.filter(entry => entry.temporary).length, semanticReview: questions.items.filter(item => item.semanticReview === "NEEDS_HUMAN_REVIEW").length, errors }, null, 2));
if (errors.length) process.exitCode = 1;

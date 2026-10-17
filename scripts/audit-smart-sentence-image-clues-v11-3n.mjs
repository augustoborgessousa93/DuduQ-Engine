import { readFileSync } from "node:fs";
import { join } from "node:path";

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
const items = [];
for (let year = 1; year <= 5; year++) {
  for (let module = 1; module <= 6; module++) {
    const moduleId = `Y${year}M${String(module).padStart(2, "0")}`;
    const file = join("content", "english", `year-${year}`, `module-${String(module).padStart(2, "0")}`, "questions.json");
    const contract = JSON.parse(readFileSync(file, "utf8"));
    items.push(...contract.items.filter(item => item.mechanicId === "smart-sentence-complete").map(item => ({ moduleId, item })));
  }
}
const eligible = items.map(({ moduleId, item }) => {
  const optionalImage = ["LETTER_SEQUENCE", "SPELLING"].includes(String(item.semanticTargetType || "").toUpperCase());
  const binding = (item.mediaBindings || []).find(row => ["stimulus", "supporting-image"].includes(row.role));
  const answer = (item.options || []).find(option => normalize(option.answerKey) === normalize(item.answerKey));
  const semanticImageClue = Boolean(!optionalImage && binding?.assetId && answer && normalize(binding.semanticTarget) === normalize(answer.answerKey));
  const enMentionsImage = /\b(image|picture)\b/i.test(item.primaryInstructionEn || "");
  const ptMentionsImage = /\b(imagem|figura)\b/i.test(item.supportInstructionPt || "");
  return { moduleId, itemId: item.item_id, semanticImageClue, enMentionsImage, ptMentionsImage,
    needsImageCue: semanticImageClue && !(enMentionsImage && ptMentionsImage),
    wrongImageReference: !semanticImageClue && (enMentionsImage || ptMentionsImage) };
});
const summary = {
  status: eligible.some(row => row.wrongImageReference) ? "ISSUE" : "PASS",
  completeActivities: items.length,
  semanticImageClues: eligible.filter(row => row.semanticImageClue).length,
  explicitBilingualImageCue: eligible.filter(row => row.semanticImageClue && row.enMentionsImage && row.ptMentionsImage).length,
  resolverImageCueRequired: eligible.filter(row => row.needsImageCue).length,
  incorrectImageReference: eligible.filter(row => row.wrongImageReference).map(row => row.itemId),
  imageCueAudio: "P1_GOLD_VOICE_PENDING_WHERE_RESOLVER_REWRITES",
  itemsNeedingCue: eligible.filter(row => row.needsImageCue).map(({ moduleId, itemId }) => ({ moduleId, itemId }))
};
console.log(JSON.stringify(summary, null, 2));
if (summary.status !== "PASS") process.exitCode = 1;

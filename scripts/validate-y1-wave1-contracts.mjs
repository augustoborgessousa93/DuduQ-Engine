#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const json = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const errors = [];
const summary = [];
const contentHashes = new Map();
const banned = /\b(TODO|TBD|LOREM|DUMMY|PLACEHOLDER|SAMPLE)\b/i;
const requestedModule = process.env.DUDUQ_MODULE_CHECK;
const moduleNumbers = requestedModule
  ? [Number(String(requestedModule).replace("Y1M0", ""))]
  : [2, 3, 4, 5, 6];
if (moduleNumbers.some(number => !Number.isInteger(number) || number < 2 || number > 6)) {
  throw new Error(`INVALID_DUDUQ_MODULE_CHECK:${requestedModule}`);
}
for (const n of moduleNumbers) {
  const moduleId = `Y1M0${n}`;
  const rel = `content/english/year-1/module-0${n}`;
  const plan = await json(`content/english/planning/year-1/module-0${n}.json`);
  const module = await json(`${rel}/module.json`);
  const questions = await json(`${rel}/questions.json`);
  const source = plan.activitySequence;
  if (module.moduleId !== moduleId || questions.moduleId !== moduleId || questions.items?.length !== 20) errors.push(`${moduleId}:COUNT_OR_ID`);
  let mq = 0;
  for (let i = 0; i < Math.min(20, questions.items?.length || 0); i += 1) {
    const q = questions.items[i], blueprint = source[i];
    if (q.questionId !== `Q${String(i + 1).padStart(3, "0")}` || q.mechanicId !== blueprint.mechanicId) errors.push(`${moduleId}/${q.questionId}:SEQUENCE_OR_MECHANIC_DRIFT`);
    if (!q.primaryInstructionEn || !q.supportInstructionPt || !q.answerKey) errors.push(`${moduleId}/${q.questionId}:MISSING_REQUIRED_CONTRACT`);
    if (JSON.stringify(q).match(banned)) errors.push(`${moduleId}/${q.questionId}:PLACEHOLDER_TEXT`);
    if (q.mechanicId === "target-shooter" && (q.options.length !== 4 || q.options.filter(o => o.answerKey === q.answerKey).length !== 1)) errors.push(`${moduleId}/${q.questionId}:TARGET_CHOICES`);
    if (q.mechanicId === "bubble-pop" && (!q.targetsToFind.length || q.bubbleDistractorPool.length < 5 || new Set(q.bubbleDistractorPool.map(o => o.semanticTarget)).size !== q.bubbleDistractorPool.length)) errors.push(`${moduleId}/${q.questionId}:BUBBLE_POOL`);
    if (q.mechanicId === "drag-drop-multimedia") {
      if (q.items.length !== 4 || q.targets.length !== 4 || q.mappings.length !== 4 || new Set(q.items.map(x => x.id)).size !== 4 || new Set(q.targets.map(x => x.id)).size !== 4 || new Set(q.mappings.map(x => x.answerKey)).size !== 4 || q.mappings.some(x => !q.items.some(i => i.id === x.itemId) || !q.targets.some(t => t.id === x.targetId))) errors.push(`${moduleId}/${q.questionId}:DDM_MAPPING`);
    }
    if (q.mechanicId === "drag-drop" && (q.items.length < 4 || q.groups.length < 2 || q.items.some(item => !q.groups.some(group => group.id === item.groupId)))) errors.push(`${moduleId}/${q.questionId}:GROUP_MEMBERSHIP`);
    if (q.mechanicId === "matching" && (q.pairs.length < 3 || new Set(q.pairs.map(pair => pair.pairId)).size !== q.pairs.length || q.pairs.some(pair => !pair.a?.id || !pair.b?.id || pair.a.id === pair.b.id))) errors.push(`${moduleId}/${q.questionId}:PAIR_CONTRACT`);
    if (q.mechanicId === "smart-sentence-complete" && (!q.sentence?.some(part => part?.slot) || !q.options.some(option => option.answerKey === q.answerKey))) errors.push(`${moduleId}/${q.questionId}:SENTENCE_COMPLETE`);
    if (q.mechanicId === "smart-sentence-order" && (!q.tokens.length || new Set(q.tokens).size !== q.tokens.length || q.answerKey.length !== q.tokens.length)) errors.push(`${moduleId}/${q.questionId}:SENTENCE_ORDER`);
    if (q.mechanicId === "memory-quest") {
      mq += 1;
      if (!q.pairs.length || q.pairs.some(pair => pair.cards.length !== 2 || new Set(pair.cards.map(card => card.modality)).size !== 2 || pair.cards.some(card => !card.audioId && !card.media))) errors.push(`${moduleId}/${q.questionId}:MEMORY_PAIR`);
    }
    if (q.feedbackContract?.finalWinSfx !== false) errors.push(`${moduleId}/${q.questionId}:FINAL_WIN_ALLOWED_IN_ACTIVITY`);
    const key = `${q.mechanicId}|${JSON.stringify(q.answerKey)}|${JSON.stringify(q.stimulus)}|${JSON.stringify(q.options)}|${JSON.stringify(q.pairs)}`;
    if (contentHashes.has(key)) errors.push(`${moduleId}/${q.questionId}:EXACT_CONTENT_DUPLICATE_OF_${contentHashes.get(key)}`);
    else contentHashes.set(key, `${moduleId}/${q.questionId}`);
  }
  if (mq < 2) errors.push(`${moduleId}:MEMORY_QUEST_BELOW_MINIMUM`);
  summary.push({ moduleId, count: questions.items?.length || 0, memoryQuest: mq, status: errors.length ? "ISSUE" : "STRUCTURAL_CONTRACT_PASS" });
}
const report = { status: errors.length ? "ISSUE" : "PASS", modules: summary, activities: summary.reduce((sum, item) => sum + item.count, 0), exactDuplicateCount: Math.max(0, errors.filter(e => e.includes("EXACT_CONTENT_DUPLICATE")).length), errors };
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;

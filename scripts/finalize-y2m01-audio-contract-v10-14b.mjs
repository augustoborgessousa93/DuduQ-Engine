import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const save = async (relative, value) => {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temp, file);
};
const pathQuestions = 'content/english/year-2/module-01/questions.json';
const questions = await readJson(pathQuestions);
const items = questions.items ?? questions.questions ?? [];
const audio = await readJson('duduq-audio/manifests/AUDIO_MANIFEST.json');
const audioIds = new Set(audio.items.map(item => item.id ?? item.audioId));
const cueId = 'AUD-PT-LETTER-CUE-EARLY-Y2';
if (!audioIds.has(cueId)) throw new Error('EARLY_YEARS_LETTER_CUE_NOT_REGISTERED');
const instructionBindings = {
  'Y2M01-Q004': ['AUD-Y2M01-Q004-RANGE-INSTRUCTION-EN', 'AUD-Y2M01-Q004-RANGE-INSTRUCTION-PT'],
  'Y2M01-Q010': ['AUD-Y2M01-Q010-RANGE-INSTRUCTION-EN', 'AUD-Y2M01-Q010-RANGE-INSTRUCTION-PT'],
  'Y2M01-Q018': ['AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-EN', 'AUD-Y2M01-Q018-SHORT-SPELLING-INSTRUCTION-PT'],
  'Y2M01-Q019': ['AUD-Y2M01-Q019-AUDIO-GROUP-INSTRUCTION-EN', 'AUD-Y2M01-Q019-AUDIO-GROUP-INSTRUCTION-PT']
};
const letterActivities = ['Y2M01-Q002', 'Y2M01-Q004', 'Y2M01-Q005', 'Y2M01-Q010', 'Y2M01-Q011', 'Y2M01-Q014', 'Y2M01-Q015', 'Y2M01-Q016', 'Y2M01-Q020'];
for (const [questionId, pair] of Object.entries(instructionBindings)) {
  const question = items.find(item => item.item_id === questionId);
  if (!question?.instruction) throw new Error(`QUESTION_INSTRUCTION_MISSING:${questionId}`);
  if (pair.some(id => !audioIds.has(id))) throw new Error(`GENERATED_INSTRUCTION_NOT_REGISTERED:${questionId}`);
  question.instruction.instructionAudioEnId = pair[0];
  question.instruction.instructionAudioPtId = pair[1];
  question.instruction.audioOrder = ['en', 'pt'];
  question.instruction.instructionAudioStatus = 'TECHNICAL_PASS_HUMAN_PRONUNCIATION_PENDING';
  delete question.instruction.audioGenerationBlocker;
}
for (const questionId of letterActivities) {
  const question = items.find(item => item.item_id === questionId);
  if (!question) throw new Error(`LETTER_AUDIO_QUESTION_MISSING:${questionId}`);
  question.learnerAudioPresentationPlan = {
    semanticType: 'LETTER', yearBand: 'EARLY_YEARS', trigger: 'LEARNER_CLICK',
    cueAudioId: cueId, cueText: 'A letra é...', targetAudioPattern: 'AUD-EN-LETTER-{letter}',
    composition: 'PT_CUE_THEN_ONE_CANONICAL_ENGLISH_LETTER_NAME', pauseAfterCueMs: 260,
    expectedTargetPresentationsPerClick: 1, humanPronunciationStatus: 'PENDING'
  };
}
const q018 = items.find(item => item.item_id === 'Y2M01-Q018');
if (!q018) throw new Error('Q018_NOT_FOUND');
q018.learnerAudioPresentationPlan = {
  semanticType: 'NAME_SPELLING', yearBand: 'EARLY_YEARS', trigger: 'LEARNER_CLICK', target: 'LEO',
  sourceAudioIds: ['AUD-EN-LETTER-L', 'AUD-EN-LETTER-E', 'AUD-EN-LETTER-O'],
  composition: 'CANONICAL_ENGLISH_LETTER_NAMES_ONCE', interLetterGapMs: 360,
  expectedSequencePlaysPerClick: 1, humanPronunciationStatus: 'PENDING'
};
questions.updatedAt = new Date().toISOString();
await save(pathQuestions, questions);
console.log(JSON.stringify({ status: 'PASS', questionInstructionBindings: Object.keys(instructionBindings).length,
  letterAudioPlans: letterActivities.length, q018SpellingSequence: q018.learnerAudioPresentationPlan }, null, 2));

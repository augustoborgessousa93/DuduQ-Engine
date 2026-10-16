import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'content/english/production/v11-1b/deterministic-activity-contracts.json';
const logPath = 'content/english/production/v11-2b/materialization-content-corrections.json';
const source = JSON.parse(await readFile(path.join(root, sourcePath), 'utf8'));
const corrections = [
  ['Y2M03-Q018', { source: 'He is my grandfather.', sentence: 'He is my ____.', expected: 'grandfather', tokenIndex: 3 }, 'Correct pronoun agreement while preserving the family-vocabulary target.'],
  ['Y2M04-Q008', { source: 'The ball is on the box.', sentence: 'The ball is ____ the box.', expected: 'on', tokenIndex: 3 }, 'Restore a complete preposition example while preserving the spatial-relation target.'],
  ['Y2M06-Q018', { source: 'I see a big banana.', sentence: 'I see a ____ banana.', expected: 'big', tokenIndex: 3, options: ['big', 'small', 'red', 'green'] }, 'Complete the adjective-plus-food chunk; keep the approved big/small + food objective and replace category-mismatched body-part distractors with in-scope adjectives.'],
  ['Y3M01-Q018', { source: 'My name begins with B.', sentence: 'My name begins with ____.', expected: 'B', tokenIndex: 3 }, 'Replace the invalid month-initial sentence with supported identity/alphabet content; months are not active targets in this module.'],
  ['Y3M02-Q018', { source: 'There are nine apples.', sentence: 'There are ____ apples.', expected: 'nine', tokenIndex: 2 }, 'Supply the countable noun required by the quantity sentence without changing the number target.'],
  ['Y3M03-Q008', { source: 'She is my mother.', sentence: 'She is my ____.', expected: 'mother', tokenIndex: 3 }, 'Correct the gender/family contradiction; mother is already an approved option and module target.'],
  ['Y3M03-Q018', { source: 'This is my grandfather.', sentence: 'This is my ____.', expected: 'grandfather', tokenIndex: 3 }, 'Complete the possessive family sentence while preserving its target.'],
  ['Y3M04-Q008', { source: 'There are two objects.', sentence: 'There are ____ objects.', expected: 'two', tokenIndex: 2 }, 'Correct number agreement and remove duplicated number wording.'],
  ['Y3M04-Q018', { source: 'There are three objects.', sentence: 'There are ____ objects.', expected: 'three', tokenIndex: 2 }, 'Correct number agreement and remove duplicated number wording.'],
  ['Y4M05-Q008', { source: 'What color is it? It is red.', sentence: 'What color is it? It is ____.', expected: 'red', tokenIndex: 6, options: ['red', 'blue', 'green', 'yellow'] }, 'Align the prompt with its color answer and use parallel, in-scope color alternatives.'],
  ['Y4M06-Q008', { source: 'It is a train.', sentence: 'It is a ____.', expected: 'train', tokenIndex: 3 }, 'Add the required English article without changing the transport target.'],
  ['Y5M01-Q018', { source: 'My country is Brazil.', sentence: 'My country is ____.', expected: 'Brazil', tokenIndex: 3, options: ['Brazil', 'Brazilian', 'city', 'country'] }, 'Replace a category-word completion with an exact country response already in approved scope.'],
  ['Y5M03-Q008', { source: 'She is a sister.', sentence: 'She is a ____.', expected: 'sister', tokenIndex: 3 }, 'Correct the gender/family contradiction while preserving the approved family target.'],
  ['Y5M04-Q008', { source: 'The number is 58.', sentence: 'The number is ____.', expected: '58', tokenIndex: 3 }, 'Replace the impossible day-count claim with a direct numeral sentence.'],
  ['Y5M04-Q018', { source: 'The number is 68.', sentence: 'The number is ____.', expected: '68', tokenIndex: 3 }, 'Replace the impossible day-count claim with a direct numeral sentence.']
];
const items = new Map(source.contracts.map(contract => [contract.itemId, contract]));
const applied = [];
for (const [itemId, edit, reason] of corrections) {
  const contract = items.get(itemId);
  if (!contract || contract.studentStimuli?.mode !== 'sentence-completion') throw new Error(`CONTENT_CORRECTION_TARGET_INVALID:${itemId}`);
  const old = { targetContent: contract.targetContent, studentStimuli: structuredClone(contract.studentStimuli), correctAnswer: structuredClone(contract.correctAnswer), distractors: structuredClone(contract.distractors) };
  contract.studentStimuli.sourceSentence = edit.source;
  contract.studentStimuli.sentence = edit.sentence;
  contract.studentStimuli.blank = { ...contract.studentStimuli.blank, tokenIndex: edit.tokenIndex, tokenCount: 1, expected: edit.expected, tokenFound: true };
  contract.studentStimuli.answerKey = edit.expected;
  contract.correctAnswer = edit.expected;
  contract.targetContent = edit.source;
  if (edit.options) {
    contract.studentStimuli.options = edit.options;
    contract.distractors = edit.options.filter(option => option !== edit.expected);
  }
  applied.push({ itemId, reason, old, new: { targetContent: contract.targetContent, sentence: contract.studentStimuli.sentence, sourceSentence: contract.studentStimuli.sourceSentence, blank: contract.studentStimuli.blank, options: contract.studentStimuli.options, correctAnswer: contract.correctAnswer } });
}
source.materializationCorrections = { feature: 'DUDUQ_PHYSICAL_ASSET_FACTORY_EXECUTION_V11_2B', appliedAt: new Date().toISOString(), count: applied.length, corrections: applied };
await writeFile(path.join(root, sourcePath), `${JSON.stringify(source, null, 2)}\n`);
await mkdir(path.dirname(path.join(root, logPath)), { recursive: true });
await writeFile(path.join(root, logPath), `${JSON.stringify({ schemaVersion: 'duduq-v11-2b-content-corrections-v1', source: sourcePath, count: applied.length, corrections: applied }, null, 2)}\n`);
console.log(JSON.stringify({ corrected: applied.length, itemIds: applied.map(row => row.itemId), log: logPath }, null, 2));

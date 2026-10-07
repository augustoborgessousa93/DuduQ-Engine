import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const questionsPath = 'content/english/year-1/module-01/questions.json';
const sourcePath = 'content/english/year-1/module-01/bilingual-instructions-v2.json';
const bindingsPath = 'content/english/year-1/module-01/audio-production-manifest.json';
const read = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const save = async (file, value) => writeFile(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const questions = await read(questionsPath);
const source = await read(sourcePath);
const bindings = await read(bindingsPath);
if (source.standard !== 'DUDUQ_BILINGUAL_PEDAGOGICAL_INSTRUCTION_V2' || source.items.length !== 20 || questions.items.length !== 20) {
  throw new Error('Y1M01_BILINGUAL_INSTRUCTION_V2_EXPECTED_20');
}
const authored = new Map(source.items.map(item => [item.itemId, item]));
const words = text => String(text || '').trim().split(/\s+/u).filter(Boolean).length;
const errors = [];
for (const item of questions.items) {
  const copy = authored.get(item.item_id);
  if (!copy) { errors.push(`MISSING_BILINGUAL_COPY:${item.item_id}`); continue; }
  const limits = [['titleEn', 4], ['titlePt', 5], ['instructionEn', 6], ['instructionPt', 7]];
  for (const [field, limit] of limits) if (words(copy[field]) > limit) errors.push(`CONTENT_TOO_LONG:${item.item_id}:${field}:${words(copy[field])}>${limit}`);
  const suffix = item.item_id.match(/Q(\d{3})$/)?.[1];
  if (!suffix) { errors.push(`INVALID_ITEM_ID:${item.item_id}`); continue; }
  const spokenEn = `${copy.titleEn.replace(/[.!?]+$/u, '')}. ${copy.instructionEn}`;
  const spokenPt = `${copy.titlePt.replace(/[.!?]+$/u, '')}. ${copy.instructionPt}`;
  item.instruction = {
    version: '2.0',
    titleEn: copy.titleEn,
    titlePt: copy.titlePt,
    instructionEn: copy.instructionEn,
    instructionPt: copy.instructionPt,
    spokenTextEn: spokenEn,
    spokenTextPt: spokenPt,
    instructionAudioEnId: `AUD-Y1M01-INSTRUCTION-V2-EN-${suffix}`,
    instructionAudioPtId: `AUD-Y1M01-INSTRUCTION-V2-PT-${suffix}`,
    audioOrder: ['en', 'pt'],
    languageEn: 'English',
    languagePt: 'pt-BR',
    humanPedagogicalReview: 'NEEDS_HUMAN_REVIEW'
  };
  const current = bindings.items[item.item_id] || [];
  bindings.items[item.item_id] = [
    ...current.filter(binding => !['instruction_en', 'instruction_pt'].includes(binding.role)),
    { role: 'instruction_en', audioId: item.instruction.instructionAudioEnId },
    { role: 'instruction_pt', audioId: item.instruction.instructionAudioPtId }
  ];
}
if (errors.length) throw new Error(errors.join('\n'));
await save(questionsPath, questions);
await save(bindingsPath, bindings);
console.log(JSON.stringify({ status: 'PASS', standard: source.standard, questions: questions.items.length,
  titleEn: questions.items.filter(item => item.instruction?.titleEn).length,
  titlePt: questions.items.filter(item => item.instruction?.titlePt).length,
  instructionEn: questions.items.filter(item => item.instruction?.instructionEn).length,
  instructionPt: questions.items.filter(item => item.instruction?.instructionPt).length,
  subtitles: questions.items.filter(item => item.instruction?.subtitleEn || item.instruction?.subtitlePt).length,
  editorialLengthViolations: 0 }, null, 2));

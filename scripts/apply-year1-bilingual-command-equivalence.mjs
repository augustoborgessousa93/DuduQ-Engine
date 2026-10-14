import { readFile, writeFile } from "node:fs/promises";

const rewrites = new Map([
  ["Complete the sentence.|Escolha a palavra que completa a frase.", {
    en: "Complete the sentence.", pt: "Complete a frase.", enId: "AUD-Y1-UX-EN-8FD32A2E6DE6", ptId: "AUD-Y1-UX-PT-DE494B05B06A", expected: 8
  }],
  ["Listen and shoot the matching scene.|Ouça e acerte a cena que corresponde ao diálogo.", {
    en: "Listen and shoot the matching scene.", pt: "Ouça e acerte a cena correspondente.", ptId: "AUD-Y1-UX-PT-E7F467673808", expected: 2
  }],
  ["Find the child who answers.|Encontre a criança que responde à pergunta.", {
    en: "Find the child who answers.", pt: "Encontre a criança que responde.", ptId: "AUD-Y1-UX-PT-4F711EB27323", expected: 1
  }],
  ["Pop the scene that matches the audio.|Ouça e estoure a cena correspondente ao áudio.", {
    en: "Pop the scene that matches the audio.", pt: "Estoure a cena que corresponde ao áudio.", ptId: "AUD-Y1-UX-PT-523C44BEAC6D", expected: 1
  }]
]);

const seen = new Map([...rewrites.keys()].map(key => [key, 0]));
let total = 0;
for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber += 1) {
  const suffix = String(moduleNumber).padStart(2, "0");
  const file = `content/english/year-1/module-${suffix}/questions.json`;
  const contract = JSON.parse(await readFile(file, "utf8"));
  for (const item of contract.items) {
    const instruction = item.instruction || {};
    const en = String(item.primaryInstructionEn || instruction.instructionEn || "").trim();
    const pt = String(item.supportInstructionPt || instruction.instructionPt || item.instrucao_pt || "").trim();
    const key = `${en}|${pt}`;
    const replacement = rewrites.get(key);
    if (!replacement) continue;
    seen.set(key, seen.get(key) + 1);
    total += 1;
    if (item.primaryInstructionEn) item.primaryInstructionEn = replacement.en;
    if (item.supportInstructionPt) item.supportInstructionPt = replacement.pt;
    if (item.instrucao_pt) item.instrucao_pt = replacement.pt;
    instruction.instructionEn = replacement.en;
    instruction.instructionPt = replacement.pt;
    if (replacement.enId) instruction.instructionAudioEnId = replacement.enId;
    instruction.instructionAudioPtId = replacement.ptId;
    if (instruction.spokenTextEn) instruction.spokenTextEn = replacement.en;
    if (instruction.spokenTextPt) instruction.spokenTextPt = replacement.pt;
    if (instruction.primaryInstructionEn) instruction.primaryInstructionEn = replacement.en;
    if (instruction.supportInstructionPt) instruction.supportInstructionPt = replacement.pt;
    if (Array.isArray(instruction.supportInstructionPtSegments)) {
      instruction.supportInstructionPtSegments = instruction.supportInstructionPtSegments.map(segment => ({ ...segment, text: replacement.pt }));
    }
    item.instruction = instruction;
  }
  await writeFile(file, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
}
for (const [key, replacement] of rewrites) {
  if (seen.get(key) !== replacement.expected) throw new Error(`BILINGUAL_REWRITE_SOURCE_COUNT_MISMATCH:${key}:expected=${replacement.expected}:actual=${seen.get(key)}`);
}
if (total !== 12) throw new Error(`BILINGUAL_REWRITE_TOTAL_MISMATCH:${total}`);
console.log(JSON.stringify({ status: "PASS", activitiesRewritten: total, sources: Object.fromEntries(seen), audioIds: [...rewrites.values()].map(({ enId, ptId }) => ({ enId: enId || null, ptId })) }, null, 2));

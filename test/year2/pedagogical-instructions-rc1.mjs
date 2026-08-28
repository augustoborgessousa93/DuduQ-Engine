import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function moduleKey(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

const browser = await chromium.launch({ headless: true });
let total = 0;
const report = [];

try {
  for (let module = 1; module <= 6; module += 1) {
    const mm = String(module).padStart(2, "0");
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    try {
      await page.goto(`${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=pedagogical-instructions-rc1`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000
      });

      await page.waitForFunction(({ key, module }) => Boolean(
        window.__DUDUQ_YEAR2_PEDAGOGICAL_INSTRUCTIONS__ &&
        window.DUDUQ_CONTENT?.english?.year2?.[key]?.module === module
      ), { key: moduleKey(module), module }, { timeout: 30_000 });

      const data = await page.evaluate((key) => {
        const built = window.DUDUQ_CONTENT.english.year2[key];
        return {
          audit: built.audit?.pedagogicalInstructions || null,
          questions: (built.activities || []).flatMap((activity) =>
            (activity.questions || []).map((question) => ({
              id: question.id,
              mechanic: activity.mechanic || question.delivery?.mechanic || "",
              statement: question.statement || "",
              instruction: question.instruction || "",
              sourcePrompt: question.metadata?.sourcePromptV23 || "",
              instructionAudio: question.metadata?.instructionAudio || null,
              pedagogicalInstruction: question.metadata?.pedagogicalInstruction || null
            }))
          )
        };
      }, moduleKey(module));

      assert(data.questions.length === 15, `M${mm}: esperado 15 itens, encontrado ${data.questions.length}.`);
      assert(data.audit?.normalized === 15, `M${mm}: camada pedagógica não normalizou 15/15 itens.`);

      for (const question of data.questions) {
        total += 1;
        const display = String(question.statement || "").trim();
        const spoken = String(question.instructionAudio?.text || "").trim();
        const words = wordCount(display);

        assert(question.sourcePrompt, `${question.id}: sourcePromptV23 não foi preservado.`);
        assert(display, `${question.id}: enunciado final vazio.`);
        assert(question.instruction === question.statement, `${question.id}: statement/instruction divergentes.`);
        assert(words <= 9, `${question.id}: enunciado longo demais (${words} palavras): ${display}`);
        assert(!/[🔊🖼️✅❌]/u.test(display), `${question.id}: enunciado contém ícone decorativo: ${display}`);
        assert(!/OUÇA\s*,\s*OBSERVE|VEJA\s*,\s*OUÇA|OUÇA\s*,\s*VEJA/i.test(display), `${question.id}: comando acumula ações desnecessárias: ${display}`);
        assert(!/^OUÇA E ESCOLHA\.?$/i.test(display), `${question.id}: comando genérico demais: ${display}`);
        assert(question.instructionAudio?.enabled === true, `${question.id}: instrução não possui áudio em português.`);
        assert(question.instructionAudio?.repeatable === true, `${question.id}: áudio da instrução não é repetível.`);
        assert(/^pt-BR$/i.test(String(question.instructionAudio?.language || "")), `${question.id}: idioma da instrução não é pt-BR.`);
        assert(wordCount(spoken) <= 9, `${question.id}: narração longa demais: ${spoken}`);

        if (question.id !== "EN2-M1-12") {
          assert(question.pedagogicalInstruction?.display === display, `${question.id}: metadata pedagógica não corresponde ao comando visível.`);
          assert(question.pedagogicalInstruction?.principle === "SHORT_NARRABLE_MECHANIC_ALIGNED", `${question.id}: princípio pedagógico ausente.`);
        } else {
          assert(/^ARRASTE AS IMAGENS PARA A LETRA INICIAL CORRETA\.?$/i.test(display), `${question.id}: comando específico da classificação ficou inadequado: ${display}`);
        }

        const mechanic = String(question.mechanic || "").toLowerCase();
        if (mechanic === "target-shooter") assert(/^OUÇA E TOQUE/i.test(display), `${question.id}: Target Shooter sem comando de toque: ${display}`);
        if (mechanic === "bubble-pop") assert(/^OUÇA E ESTOURE/i.test(display), `${question.id}: Bubble Pop sem comando de estourar: ${display}`);
        if (mechanic === "matching") assert(/^OUÇA E JUNTE/i.test(display), `${question.id}: Matching sem comando de pareamento: ${display}`);
        if (mechanic === "memory-quest") assert(/^ENCONTRE/i.test(display), `${question.id}: Memory Quest sem comando de pares: ${display}`);
        if (mechanic === "smart-sentence") assert(/^OUÇA E MONTE/i.test(display), `${question.id}: Smart Sentence sem comando de montagem: ${display}`);
        if (mechanic === "drag-drop") assert(/^(OUÇA E ARRASTE|ARRASTE)/i.test(display), `${question.id}: Drag & Drop sem comando de arraste: ${display}`);

        report.push({ id: question.id, mechanic, display, spoken });
      }
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

assert(total === 90, `Esperados 90 itens auditados; encontrados ${total}.`);
console.log(JSON.stringify({ status: "PASS", total, contract: "SHORT_NARRABLE_MECHANIC_ALIGNED", report }, null, 2));

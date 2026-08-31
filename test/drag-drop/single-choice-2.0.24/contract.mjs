import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};
const hashObject = (relativePath) => execFileSync(
  "git",
  ["hash-object", relativePath],
  { cwd: root, encoding: "utf8" }
).trim();

const candidatePath = "engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js";
const basePath = "engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js";
const baseRuntimePath = "engine/releases/mechanics/drag-drop/2.0.22/DUDUQ_DRAG_DROP.html";
const priorCandidatePath = "engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js";
const priorRuntimePatchPath = "engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js";

const candidate = read(candidatePath);
const base = read(basePath);

// Releases anteriores são imutáveis nesta rodada.
expect(hashObject(basePath) === "cad13f3e972a41d5258db126446cb71ff1fe71ff", "Drag & Drop 2.0.22 adapter foi alterado.");
expect(hashObject(baseRuntimePath) === "7449c73cb2b321a4ff4af1b4ccdbcc97070ffd82", "Drag & Drop 2.0.22 runtime foi alterado.");
expect(hashObject(priorCandidatePath) === "785c15af8eeb4106a68799368000da349ba0005f", "Drag & Drop 2.0.23 adapter foi alterado.");
expect(hashObject(priorRuntimePatchPath) === "210d2fd90e1ba61497b1e063261dcd05574837ea", "Drag & Drop 2.0.23 runtime patch foi alterado.");

// Identidade e composição.
expect(candidate.includes('const VERSION = "2.0.24"'), "Identidade 2.0.24 ausente.");
expect(candidate.includes('const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js"'), "2.0.24 não compõe a base 2.0.22.");
expect(candidate.includes('const SINGLE_CHOICE_HOOK = "__DUDUQ_DD224_SINGLE_CHOICE_PATCH__"'), "Hook single-choice 2.0.24 ausente.");
expect(candidate.includes('payload.mode === "single-choice"'), "Contrato explícito payload.mode=single-choice ausente.");
expect(!candidate.includes('required === false) return "single-choice"'), "Heurística proibida por required=false encontrada.");

// Validação formal: 1 destino, >=2 alternativas, 1 correto, >=1 distrator, capacidade 1 e gabarito inequívoco.
for (const signature of [
  "single-choice exige exatamente um destino",
  "single-choice exige pelo menos duas alternativas",
  "single-choice exige exatamente uma alternativa editorial correta",
  "single-choice exige ao menos um distrator",
  "single-choice exige capacidade 1",
  "single-choice sem resposta inequívoca",
  "distrator single-choice não pode possuir targetId"
]) {
  expect(candidate.includes(signature), `Validação obrigatória ausente: ${signature}`);
}
expect(candidate.includes("buildRuntimeConfig(payload, {})"), "validate() não executa validação profunda para single-choice.");

// Comportamento: colocação é a resposta; não depende de CONFIRMAR.
expect(candidate.includes('question.mode === "single-choice"'), "Gate de execução single-choice ausente.");
expect(candidate.includes("singleChoiceCorrect = item.required !== false && item.targetId === targetId"), "Scoring single-choice não está ligado ao item editorial correto.");
expect(candidate.includes("onAnswer && onAnswer({"), "single-choice não emite resultado no momento da colocação.");
expect(candidate.includes("isCorrect: singleChoiceCorrect"), "Resultado imediato não propaga isCorrect.");
expect(candidate.includes('var ready = question.mode === "single-choice" ? false'), "Single-choice ainda depende do botão CONFIRMAR.");

// Retry: item errado é liberado sem progresso e a alternativa correta continua disponível.
expect(candidate.includes("setRetryAnimating(true)"), "Retry single-choice não bloqueia a janela de retorno.");
expect(candidate.includes("suppressClick.current = false"), "Retry não libera a próxima ativação após pointer drag.");
expect(candidate.includes("setPlacements(initialPlacements())"), "Retry não libera o destino single-choice.");
expect(candidate.includes("setWrongItemIds([])"), "Retry não limpa o estado visual incorreto.");
expect(candidate.includes("}, 850);"), "Janela de retorno/retry de 850ms ausente.");
expect(candidate.includes("Ouça novamente e tente outra vez."), "Anúncio acessível de retry ausente.");

// Áudio: o card continua sendo dono do replay; drop single-choice não dispara autoplay concorrente.
expect(candidate.includes('question.mode !== "single-choice" && source === "drop"'), "Drop single-choice ainda pode disparar áudio concorrente.");

// DOM estável para mouse/touch/teclado e sentinelas permanentes.
expect(candidate.includes('"data-dd2-item-id":item.id'), "Identidade DOM estável dos cards ausente.");
expect(candidate.includes('"data-single-choice":question.mode === "single-choice"'), "Destino não expõe estado single-choice no DOM.");

// Regressão arquitetural: a base 2.0.22 continua dona de association/classification/pairs/sequence.
expect(base.includes('const CANDIDATE_VERSION = "2.0.22";'), "Assinatura base 2.0.22 inesperada.");
expect(candidate.includes("compõe a base homologada 2.0.22"), "Escopo de composição não está documentado.");
expect(candidate.includes("association/classification/pairs/sequence permanecem no fluxo 2.0.22"), "Garantia explícita de regressão ausente.");

console.log("PASS — Drag & Drop 2.0.24 explicit SINGLE-CHOICE static contract");
console.log("Immutable guards: 2.0.22 + 2.0.23 unchanged");

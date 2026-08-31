import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE}/test/drag-drop/single-choice-2.0.24/index.html`;
const OUT = path.resolve("test-results/drag-drop-single-choice-2.0.24");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function singleChoicePayload(id = "single-choice-valid") {
  return {
    id,
    title: "SINGLE CHOICE",
    instruction: "Ouça as opções e leve uma resposta até a cena.",
    audio: { text: "Ouça as opções e escolha uma resposta.", language: "pt-BR" },
    behavior: { shuffleItems: false, shuffleTargets: false },
    payload: {
      mode: "single-choice",
      strategy: "association",
      items: [
        { id: "A", label: "1", spokenText: "Goodbye", speechLocale: "en-US", audioDescription: "Ouvir opção 1", required: false },
        { id: "B", label: "2", spokenText: "Good morning", speechLocale: "en-US", audioDescription: "Ouvir opção 2", required: true, targetId: "scene" },
        { id: "C", label: "3", spokenText: "Good afternoon", speechLocale: "en-US", audioDescription: "Ouvir opção 3", required: false }
      ],
      targets: [
        { id: "scene", label: "CENA", capacity: 1, kind: "box" }
      ]
    },
    feedback: { correct: "Muito bem!", incorrect: "Ouça novamente e tente outra vez." }
  };
}

function invalidPayload(kind) {
  const payload = singleChoicePayload(`invalid-${kind}`);
  if (kind === "zero-correct") {
    payload.payload.items = payload.payload.items.map((item) => ({ ...item, required: false, targetId: undefined }));
  } else if (kind === "two-correct") {
    payload.payload.items = payload.payload.items.map((item) => item.id === "C"
      ? { ...item, required: true, targetId: "scene" }
      : item);
  } else if (kind === "no-target") {
    payload.payload.targets = [];
    payload.payload.items = payload.payload.items.map((item) => ({ ...item, targetId: undefined }));
  }
  return payload;
}

function associationPayload() {
  return {
    id: "reg-association",
    title: "ASSOCIATION",
    instruction: "Associe.",
    behavior: { shuffleItems: false, shuffleTargets: false },
    payload: {
      mode: "association",
      strategy: "association",
      items: [{ id: "assoc-a", label: "A", targetId: "assoc-target", required: true }],
      targets: [{ id: "assoc-target", label: "ALVO A", capacity: 1, kind: "box" }]
    }
  };
}

function classificationPayload() {
  return {
    id: "reg-classification",
    title: "CLASSIFICATION",
    instruction: "Classifique.",
    behavior: { shuffleItems: false, shuffleTargets: false },
    payload: {
      mode: "classification",
      strategy: "classification",
      items: [
        { id: "class-a", label: "A", targetId: "class-left", required: true },
        { id: "class-b", label: "B", targetId: "class-right", required: true }
      ],
      targets: [
        { id: "class-left", label: "ESQUERDA", capacity: 1, kind: "category" },
        { id: "class-right", label: "DIREITA", capacity: 1, kind: "category" }
      ]
    }
  };
}

function pairsPayload() {
  return {
    id: "reg-pairs",
    title: "PAIRS",
    instruction: "Faça os pares.",
    behavior: { shuffleItems: false, shuffleTargets: false },
    alternatives: [
      { id: "pair-a", text: "A" },
      { id: "pair-b", text: "B" }
    ],
    answer: {
      type: "pairs",
      value: [
        { source: "pair-a", target: "pair-left" },
        { source: "pair-b", target: "pair-right" }
      ]
    },
    metadata: {
      targets: [
        { id: "pair-left", label: "PAR A", capacity: 1 },
        { id: "pair-right", label: "PAR B", capacity: 1 }
      ]
    }
  };
}

function sequencePayload() {
  return {
    id: "reg-sequence",
    title: "SEQUENCE",
    instruction: "Monte a sequência.",
    behavior: { shuffleItems: false, shuffleTargets: false },
    alternatives: [
      { id: "seq-a", text: "A" },
      { id: "seq-b", text: "B" }
    ],
    answer: { type: "sequence", value: ["seq-a", "seq-b"] },
    metadata: { sequenceTargetId: "sequence-target", sequenceTitle: "ORDEM" }
  };
}

async function waitRegistered(page) {
  await page.waitForFunction(() => {
    const mechanic = window.dd224Mechanic?.();
    return Boolean(mechanic && mechanic.version === "2.0.24");
  }, null, { timeout: 15_000 });
}

async function mount(page, payload) {
  await page.evaluate((value) => window.dd224Mount(value), payload);
  await page.waitForFunction(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    return Boolean(doc?.querySelector(".duduq-dd2-root"));
  }, null, { timeout: 15_000 });
  await page.waitForFunction(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    const items = [...(doc?.querySelectorAll(".duduq-dd2-item") || [])];
    return items.length > 0 && items.every((item) => !item.disabled);
  }, null, { timeout: 15_000 });
}

async function state(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("#mount iframe");
    const doc = frame?.contentDocument;
    const root = doc?.querySelector(".duduq-dd2-root");
    const feedback = doc?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "";
    const session = frame?.contentWindow?.DuduQ?.getSession?.() || null;
    const images = doc ? [...doc.images] : [];
    return {
      feedback,
      session,
      resultCount: window.__DD224_RESULTS__.length,
      results: window.__DD224_RESULTS__,
      completionCount: window.__DD224_COMPLETIONS__.length,
      errors: window.__DD224_ERRORS__.slice(),
      itemIds: doc ? [...doc.querySelectorAll(".duduq-dd2-item[data-dd2-item-id]")].map((node) => node.getAttribute("data-dd2-item-id")) : [],
      audioItemCount: doc ? doc.querySelectorAll('.duduq-dd2-item[data-has-audio="true"]').length : 0,
      audioMarks: doc ? doc.querySelectorAll(".duduq-dd2-audio-mark").length : 0,
      targetCount: doc ? doc.querySelectorAll('.duduq-dd2-target[data-single-choice="true"]').length : 0,
      confirmCount: doc ? doc.querySelectorAll(".duduq-dd2-confirm").length : 0,
      brokenImages: images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc),
      overflowX: doc ? Math.max(0, doc.body.scrollWidth - doc.documentElement.clientWidth) : 999,
      reducedMotion: root?.getAttribute("data-reduced-motion") || ""
    };
  });
}

async function placeByClick(frame, itemId, targetId) {
  const item = frame.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();
  const zone = frame.locator(`.duduq-dd2-target[data-dd2-target-id="${targetId}"] .duduq-dd2-zone`).first();
  await item.click({ force: true });
  await zone.click({ force: true });
}

async function placeByKeyboard(frame, itemId, targetId) {
  const item = frame.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();
  const zone = frame.locator(`.duduq-dd2-target[data-dd2-target-id="${targetId}"] .duduq-dd2-zone`).first();
  await item.focus();
  await item.press("Enter");
  await zone.focus();
  await zone.press("Enter");
}

async function placeByTap(frame, itemId, targetId) {
  const item = frame.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();
  const zone = frame.locator(`.duduq-dd2-target[data-dd2-target-id="${targetId}"] .duduq-dd2-zone`).first();
  await item.tap({ force: true });
  await zone.tap({ force: true });
}

async function waitResult(page, correct, previousCount = 0) {
  await page.waitForFunction(({ correct, previousCount }) => {
    const results = window.__DD224_RESULTS__ || [];
    return results.length > previousCount && results[results.length - 1]?.isCorrect === correct;
  }, { correct, previousCount }, { timeout: 5_000 });
}

async function runSingleChoiceViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.touch,
    isMobile: viewport.touch
  });
  const page = await context.newPage();
  if (viewport.touch) await page.emulateMedia({ reducedMotion: "reduce" });
  const pageErrors = [];
  const critical404 = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("response", (response) => {
    if (response.status() !== 404) return;
    const url = response.url();
    if (url.includes("/engine/") || url.includes("/test/drag-drop/")) critical404.push(url);
  });

  try {
    const response = await page.goto(`${URL}?viewport=${viewport.name}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert(response?.ok(), `${viewport.name}: harness HTTP ${response?.status()}.`);
    await waitRegistered(page);

    // Contratos A/F/G/H.
    const validation = await page.evaluate(({ valid, zero, two, none }) => ({
      valid: window.dd224Validate(valid),
      zero: window.dd224Validate(zero),
      two: window.dd224Validate(two),
      none: window.dd224Validate(none)
    }), {
      valid: singleChoicePayload(),
      zero: invalidPayload("zero-correct"),
      two: invalidPayload("two-correct"),
      none: invalidPayload("no-target")
    });
    assert(validation.valid === true, `${viewport.name}: contrato single-choice válido foi rejeitado.`);
    assert(validation.zero === false, `${viewport.name}: contrato com 0 corretas deveria falhar.`);
    assert(validation.two === false, `${viewport.name}: contrato com 2 corretas deveria falhar.`);
    assert(validation.none === false, `${viewport.name}: contrato sem destino deveria falhar.`);

    await mount(page, singleChoicePayload(`single-choice-${viewport.name}`));
    const frame = page.frameLocator("#mount iframe");
    const initial = await state(page);
    assert(initial.itemIds.length === 3 && ["A", "B", "C"].every((id) => initial.itemIds.includes(id)), `${viewport.name}: 3 alternativas não montaram.`);
    assert(initial.audioItemCount === 3 && initial.audioMarks === 3, `${viewport.name}: cards auditivos individuais ausentes.`);
    assert(initial.targetCount === 1, `${viewport.name}: destino single-choice explícito ausente.`);
    assert(initial.confirmCount === 0, `${viewport.name}: single-choice não deve exigir CONFIRMAR.`);
    assert(initial.brokenImages.length === 0, `${viewport.name}: imagem quebrada.`);
    assert(initial.overflowX <= 6, `${viewport.name}: overflow horizontal ${initial.overflowX}px.`);
    if (viewport.touch) assert(initial.reducedMotion === "true", `${viewport.name}: reduced-motion não propagou.`);

    // Áudio + replay: o card continua acionável e a reprodução não responde a questão.
    const audioCard = frame.locator('.duduq-dd2-item[data-dd2-item-id="C"]').first();
    await audioCard.click({ force: true });
    await page.waitForTimeout(80);
    await audioCard.click({ force: true });
    await page.waitForTimeout(80);
    await audioCard.click({ force: true });
    await page.waitForTimeout(80);
    assert(await audioCard.count() === 1, `${viewport.name}: card de áudio desapareceu após replay.`);
    assert((await state(page)).resultCount === 0, `${viewport.name}: ouvir alternativa não pode responder a questão.`);

    // Limpa seleção de áudio antes da tentativa por drag/touch.
    if ((await audioCard.getAttribute("data-selected")) === "true") await audioCard.click({ force: true });

    // B — Distrator: desktop usa drag real; mobile usa fluxo touch acessível.
    const wrongItem = frame.locator('.duduq-dd2-item[data-dd2-item-id="A"]').first();
    const targetZone = frame.locator('.duduq-dd2-target[data-dd2-target-id="scene"] .duduq-dd2-zone').first();
    if (viewport.touch) {
      await placeByTap(frame, "A", "scene");
    } else {
      await wrongItem.dragTo(targetZone, { force: true });
    }
    await waitResult(page, false, 0);
    await page.waitForFunction(() => document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === "retry", null, { timeout: 5_000 });
    const wrong = await state(page);
    assert(wrong.results.at(-1)?.isCorrect === false, `${viewport.name}: distrator não emitiu onAnswer(false).`);
    assert(wrong.feedback === "retry", `${viewport.name}: distrator não produziu retry.`);
    assert(wrong.completionCount === 0, `${viewport.name}: erro concluiu a stage.`);
    assert(!wrong.session?.completed, `${viewport.name}: erro marcou sessão como concluída.`);
    assert((wrong.session?.progress?.percent ?? 0) < 100, `${viewport.name}: erro avançou progresso.`);

    // C — Retry: destino libera e resposta correta continua disponível.
    await page.waitForFunction(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      const bankWrong = doc?.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="A"]');
      const zoneWrong = doc?.querySelector('.duduq-dd2-zone .duduq-dd2-item[data-dd2-item-id="A"]');
      const correct = doc?.querySelector('.duduq-dd2-item[data-dd2-item-id="B"]');
      return Boolean(bankWrong && !zoneWrong && correct && !correct.disabled);
    }, null, { timeout: 3_000 });

    // D — Correto após erro: desktop valida teclado; mobile valida touch.
    if (viewport.touch) await placeByTap(frame, "B", "scene");
    else await placeByKeyboard(frame, "B", "scene");
    await waitResult(page, true, 1);
    await page.waitForFunction(() => document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === "success", null, { timeout: 5_000 });
    await page.waitForFunction(() => (window.__DD224_COMPLETIONS__ || []).length === 1, null, { timeout: 5_000 });
    const recovered = await state(page);
    assert(recovered.results.length === 2 && recovered.results[0].isCorrect === false && recovered.results[1].isCorrect === true, `${viewport.name}: sequência distrator -> correto divergente.`);
    assert(recovered.completionCount === 1, `${viewport.name}: correto após retry não concluiu.`);

    await page.screenshot({ path: path.join(OUT, `${viewport.name}-wrong-then-correct.png`), fullPage: false });

    // E — Correto direto em uma montagem limpa.
    await mount(page, singleChoicePayload(`single-choice-direct-${viewport.name}`));
    const directFrame = page.frameLocator("#mount iframe");
    await placeByClick(directFrame, "B", "scene");
    await waitResult(page, true, 0);
    await page.waitForFunction(() => (window.__DD224_COMPLETIONS__ || []).length === 1, null, { timeout: 5_000 });
    const direct = await state(page);
    assert(direct.results.length === 1 && direct.results[0].isCorrect === true, `${viewport.name}: acerto direto falhou.`);
    assert(direct.completionCount === 1, `${viewport.name}: acerto direto não concluiu.`);
    assert(pageErrors.length === 0, `${viewport.name}: pageerror: ${pageErrors.join(" | ")}`);
    assert(critical404.length === 0, `${viewport.name}: 404 crítico: ${critical404.join(" | ")}`);

    return { viewport: viewport.name, status: "PASS", validation, overflowX: initial.overflowX };
  } finally {
    await context.close();
  }
}

async function runRegression(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const results = {};
  try {
    await page.goto(`${URL}?regression=1`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitRegistered(page);

    async function run(name, payload, placements) {
      assert(await page.evaluate((value) => window.dd224Validate(value), payload), `${name}: validate falhou.`);
      await mount(page, payload);
      const frame = page.frameLocator("#mount iframe");
      for (const [itemId, targetId] of placements) await placeByClick(frame, itemId, targetId);
      const confirm = frame.locator(".duduq-dd2-confirm").first();
      await confirm.waitFor({ state: "visible", timeout: 5_000 });
      assert(!(await confirm.isDisabled()), `${name}: CONFIRMAR ficou desabilitado.`);
      await confirm.click({ force: true });
      await waitResult(page, true, 0);
      await page.waitForFunction(() => document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === "success", null, { timeout: 5_000 });
      results[name] = "PASS";
    }

    await run("association", associationPayload(), [["assoc-a", "assoc-target"]]);
    await run("classification", classificationPayload(), [["class-a", "class-left"], ["class-b", "class-right"]]);
    await run("pairs", pairsPayload(), [["pair-a", "pair-left"], ["pair-b", "pair-right"]]);
    await run("sequence", sequencePayload(), [["seq-a", "sequence-target"], ["seq-b", "sequence-target"]]);
    return results;
  } finally {
    await page.close();
  }
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const viewports = [];
  for (const viewport of [
    { name: "desktop-1366x768", width: 1366, height: 768, touch: false },
    { name: "mobile-390x844", width: 390, height: 844, touch: true }
  ]) {
    viewports.push(await runSingleChoiceViewport(browser, viewport));
  }
  const regression = await runRegression(browser);
  const report = {
    contract: "DUDUQ_DRAG_DROP_2_0_24_EXPLICIT_SINGLE_CHOICE",
    status: "PASS",
    viewports,
    regression
  };
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

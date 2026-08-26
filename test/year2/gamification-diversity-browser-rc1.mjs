import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function moduleKey(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}

function moduleUrl(module) {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=gamification-diversity-rc1`;
}

async function preparePage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const messages = [];

  // O entrypoint público carrega player + loader. Para homologar questões isoladas,
  // neutralizamos somente o player automático no navegador de teste e preservamos
  // o loader, core, canal e adaptadores reais. Assim nenhum start paralelo pode
  // destruir o iframe da questão-probe.
  await page.route("**/engine/duduq-player-v1.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__ = true;"
    });
  });

  page.on("console", (msg) => {
    const text = msg.text();
    messages.push(`${msg.type()}: ${text}`);
  });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  return { page, messages };
}

async function openModule(page, module) {
  const key = moduleKey(module);
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: 30_000 });

  await page.waitForFunction(
    (expectedKey) => {
      const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
      const mechanics = window.DuduQ?.listMechanics?.() || [];
      return Boolean(
        built &&
        built.gamificationDiversityAudit &&
        window.DuduQ &&
        mechanics.some((entry) => entry.id === "matching") &&
        mechanics.some((entry) => entry.id === "bubble-pop") &&
        mechanics.some((entry) => entry.id === "target-shooter")
      );
    },
    key,
    { timeout: 30_000 }
  );

  const playerSuppressed = await page.evaluate(() => window.__DUDUQ_QA_PLAYER_SUPPRESSED__ === true);
  assert(playerSuppressed, "Browser RC não conseguiu isolar o player automático.");

  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-gamification-diversity" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
    document.documentElement.removeAttribute("data-duduq-initial-speech-gate");
  });
}

async function startQuestionProbe(page, module, questionId) {
  const key = moduleKey(module);
  return page.evaluate(({ expectedKey, expectedId }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    if (!built) throw new Error(`Módulo ${expectedKey} não encontrado.`);

    const activity = (built.activities || []).find((entry) =>
      (entry.questions || []).some((question) => question.id === expectedId)
    );
    if (!activity) throw new Error(`${expectedId}: atividade não encontrada.`);

    const source = (activity.questions || []).find((question) => question.id === expectedId);
    const question = JSON.parse(JSON.stringify(source));
    const diversity = question.metadata?.gamificationDiversity;
    if (!diversity) throw new Error(`${expectedId}: não recebeu transformação de diversidade.`);

    // O runtime Matching pode aplicar sua própria apresentação aleatória. O teste
    // não depende da ordem visual; mantém estes flags apenas como pedido editorial.
    if (question.metadata?.matching?.behavior) {
      question.metadata.matching.behavior.shuffleLeft = false;
      question.metadata.matching.behavior.shuffleRight = false;
    }

    const matching = question.metadata?.matching;
    const correctPairRightId = matching?.pairs?.[0]?.rightId || null;
    const matchingCorrectIndex = correctPairRightId && Array.isArray(matching?.rightItems)
      ? matching.rightItems.findIndex((entry) => entry.id === correctPairRightId)
      : -1;

    const answerValue = question.answer?.value;
    const universalCorrectIndex = typeof answerValue === "string" && /^opt-\d+$/.test(answerValue)
      ? Number(answerValue.slice(4)) - 1
      : null;

    const correctIndex = matchingCorrectIndex >= 0 ? matchingCorrectIndex : universalCorrectIndex;

    window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-question-probe" });
    window.DuduQTransition?.hideImmediate?.();
    window.DuduQ.destroy();

    const step = {
      id: `qa-${expectedId}`,
      mechanic: question.delivery?.mechanic || activity.mechanic,
      payload: {
        id: `qa-${expectedId}-payload`,
        title: activity.title || expectedId,
        subject: built.subject,
        year: built.year,
        module: built.module,
        questions: [question]
      },
      options: {
        contentVersion: built.version,
        skill: activity.skill || null
      }
    };

    const session = window.DuduQ.start({
      id: `qa-${expectedId}-module`,
      title: `QA ${expectedId}`,
      year: built.year,
      subject: built.subject,
      module: built.module,
      container: "#root",
      steps: [step]
    });

    return {
      id: expectedId,
      mechanic: step.mechanic,
      rule: diversity.rule,
      correctIndex,
      universalCorrectIndex,
      matchingCorrectIndex,
      correctPairRightId,
      matchingRightItems: matching?.rightItems || [],
      sourceAnswer: question.metadata?.sourceAnswerV23,
      optionTexts: (question.alternatives || []).map((entry) => String(entry.text || "")),
      matchingMode: matching?.mode || null,
      targetMode: question.metadata?.targetShooter?.mode || null,
      targetItems: question.metadata?.targetShooter?.items || [],
      session
    };
  }, { expectedKey: key, expectedId: questionId });
}

async function mechanicFrame(page, expectedMechanic) {
  const expectedTitles = {
    matching: /Matching/i,
    "bubble-pop": /Bubble Pop/i,
    "target-shooter": /Target Shooter/i
  };
  const titlePattern = expectedTitles[expectedMechanic];

  await page.locator("#root iframe").first().waitFor({ state: "attached", timeout: 15_000 });
  const frameElement = page.locator("#root iframe").first();
  const hostTitle = await frameElement.getAttribute("title");
  if (titlePattern) {
    assert(titlePattern.test(String(hostTitle || "")), `${expectedMechanic}: iframe inesperado: ${hostTitle}`);
  }

  const elementHandle = await frameElement.elementHandle();
  assert(elementHandle, `${expectedMechanic}: iframe não possui ElementHandle.`);
  const frame = await elementHandle.contentFrame();
  assert(frame, `${expectedMechanic}: não foi possível acessar o iframe.`);

  await frame.waitForFunction(() => {
    const body = document.body;
    if (!body) return false;
    const error = document.querySelector("#duduq-runtime-error");
    if (error && getComputedStyle(error).display !== "none") return true;
    return body.children.length > 0;
  }, null, { timeout: 20_000 });

  const runtimeError = await frame.locator("#duduq-runtime-error").count()
    ? await frame.locator("#duduq-runtime-error").first().innerText().catch(() => "")
    : "";
  assert(!runtimeError, `${expectedMechanic}: runtime error: ${runtimeError}`);

  return frame;
}

async function assertNoHorizontalOverflow(frame, label) {
  const dimensions = await frame.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
  }));
  assert(
    dimensions.scroll <= dimensions.viewport + 6,
    `${label}: overflow horizontal ${dimensions.scroll}px > ${dimensions.viewport}px.`
  );
}

async function matchingSnapshot(frame, delayMs) {
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (frame.isDetached()) return { delayMs, detached: true };
  return frame.evaluate((sampleDelay) => ({
    delayMs: sampleDelay,
    detached: false,
    bodyText: String(document.body?.innerText || "").slice(0, 1800),
    liveText: String(document.querySelector(".duduq-matching-live")?.textContent || ""),
    actionFeedbackState: document.querySelector(".duduq-matching-action-slot")?.getAttribute("data-feedback-state") || null,
    confirmDisabled: document.querySelector(".duduq-matching-primary")?.disabled ?? null,
    cards: Array.from(document.querySelectorAll(".duduq-matching-card")).map((card) => ({
      aria: card.getAttribute("aria-label"),
      selected: card.getAttribute("data-selected"),
      paired: card.getAttribute("data-paired"),
      feedback: card.getAttribute("data-feedback"),
      locked: card.getAttribute("data-locked"),
      imgAlt: card.querySelector("img")?.getAttribute("alt") || null
    }))
  }), delayMs);
}

async function renderedRightAlts(right) {
  return right.evaluateAll((cards) => cards.map((card) => card.querySelector("img")?.getAttribute("alt") || null));
}

async function verifyMatching(page, frame, probe, { exerciseRetry = false } = {}) {
  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });
  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const right = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
  const labels = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-label');
  const confirm = frame.locator(".duduq-matching-primary");

  assert(await left.count() === 1, `${probe.id}: Matching precisa de um estímulo à esquerda.`);
  assert(await right.count() === 4, `${probe.id}: Matching precisa preservar quatro alternativas.`);
  assert(await labels.count() === 0, `${probe.id}: Matching expôs texto inglês antes da resposta.`);
  assert(await confirm.count() === 1, `${probe.id}: botão CONFIRMAR não encontrado.`);

  const diagnostic = {
    probe: {
      correctIndex: probe.correctIndex,
      universalCorrectIndex: probe.universalCorrectIndex,
      matchingCorrectIndex: probe.matchingCorrectIndex,
      correctPairRightId: probe.correctPairRightId,
      matchingRightItems: probe.matchingRightItems
    },
    retrySamples: []
  };

  if (!exerciseRetry) return diagnostic;
  assert(Number.isInteger(probe.correctIndex) && probe.correctIndex >= 0 && probe.correctIndex < 4, `${probe.id}: gabarito não pôde ser convertido em índice.`);
  if (Number.isInteger(probe.universalCorrectIndex)) {
    assert(
      probe.universalCorrectIndex === probe.correctIndex,
      `${probe.id}: gabarito universal (${probe.universalCorrectIndex}) diverge do par Matching (${probe.correctIndex}).`
    );
  }

  const correctAlt = probe.matchingRightItems?.[probe.correctIndex]?.alt || null;
  assert(correctAlt, `${probe.id}: alternativa visual correta não possui alt para homologação.`);

  const beforeAlts = await renderedRightAlts(right);
  const correctDomIndex = beforeAlts.findIndex((alt) => alt === correctAlt);
  assert(correctDomIndex >= 0, `${probe.id}: imagem correta (${correctAlt}) não foi encontrada na ordem renderizada ${JSON.stringify(beforeAlts)}.`);
  const wrongDomIndex = beforeAlts.findIndex((_, index) => index !== correctDomIndex);
  assert(wrongDomIndex >= 0, `${probe.id}: não foi possível localizar um distrator visual.`);

  diagnostic.renderedRightAltsBeforeWrong = beforeAlts;
  diagnostic.correctDomIndexBeforeWrong = correctDomIndex;
  diagnostic.wrongDomIndex = wrongDomIndex;

  await left.first().click();
  await right.nth(wrongDomIndex).click();
  assert(!(await confirm.isDisabled()), `${probe.id}: CONFIRMAR permaneceu desabilitado após formar um par.`);

  const pairedAltBeforeSubmit = await right.nth(wrongDomIndex).locator("img").getAttribute("alt");
  assert(pairedAltBeforeSubmit !== correctAlt, `${probe.id}: teste de erro selecionou acidentalmente a resposta correta.`);
  diagnostic.wrongAlt = pairedAltBeforeSubmit;

  await confirm.click();

  let elapsed = 0;
  for (const increment of [0, 60, 140, 300, 700, 1100]) {
    const wait = increment === 0 ? 0 : increment - elapsed;
    elapsed = increment;
    diagnostic.retrySamples.push(await matchingSnapshot(frame, wait));
  }

  const sessionAfterWrong = await page.evaluate(() => window.DuduQ?.getSession?.() || null);
  diagnostic.sessionAfterWrong = sessionAfterWrong;

  assert(
    sessionAfterWrong && sessionAfterWrong.completed !== true,
    `${probe.id}: resposta errada concluiu indevidamente a atividade.`
  );

  const retryEvidence = diagnostic.retrySamples.some((sample) => {
    const text = `${sample.liveText || ""} ${sample.bodyText || ""}`;
    return (
      sample.actionFeedbackState === "retry" ||
      sample.cards?.some((card) => card.feedback === "retry") ||
      /0\s+de\s+1|tente\s+criar|tente\s+novamente|ouça\s+novamente|observe\s+novamente/i.test(text)
    );
  });
  diagnostic.retryEvidence = retryEvidence;

  assert(retryEvidence, `${probe.id}: resposta errada não apresentou evidência observável de feedback/pista para segunda tentativa.`);
  assert(!frame.isDetached(), `${probe.id}: Matching foi desmontado depois do erro.`);

  await frame.waitForFunction(() => {
    const slot = document.querySelector(".duduq-matching-action-slot");
    const paired = document.querySelectorAll('.duduq-matching-card[data-paired="true"]').length;
    const selected = document.querySelectorAll('.duduq-matching-card[data-selected="true"]').length;
    const leftCard = document.querySelector('.duduq-matching-column[data-side="left"] .duduq-matching-card');
    const rightCard = document.querySelector('.duduq-matching-column[data-side="right"] .duduq-matching-card');
    const interactive = [leftCard, rightCard].every((card) =>
      card && !card.disabled && card.getAttribute("data-locked") !== "true"
    );
    const state = slot?.getAttribute("data-feedback-state");
    return Boolean(paired === 0 && selected === 0 && interactive && (state === "retry" || state === "idle"));
  }, null, { timeout: 6_000 });

  diagnostic.retryReadyState = await matchingSnapshot(frame, 0);

  const afterRetryAlts = await renderedRightAlts(right);
  const correctDomIndexAfterRetry = afterRetryAlts.findIndex((alt) => alt === correctAlt);
  assert(correctDomIndexAfterRetry >= 0, `${probe.id}: resposta correta desapareceu depois da tentativa incorreta.`);
  diagnostic.renderedRightAltsAfterRetry = afterRetryAlts;
  diagnostic.correctDomIndexAfterRetry = correctDomIndexAfterRetry;

  await left.first().click();
  await right.nth(correctDomIndexAfterRetry).click();
  assert(!(await confirm.isDisabled()), `${probe.id}: CONFIRMAR não habilitou na segunda tentativa.`);
  await confirm.click();

  await page.waitForFunction(
    () => window.DuduQ?.getSession?.()?.completed === true,
    null,
    { timeout: 6_000 }
  );

  diagnostic.sessionAfterCorrect = await page.evaluate(() => window.DuduQ?.getSession?.() || null);
  assert(
    diagnostic.sessionAfterCorrect?.results?.length === 1,
    `${probe.id}: segunda tentativa correta não registrou a conclusão esperada.`
  );

  return diagnostic;
}

async function verifyBubble(frame, probe) {
  assert(
    probe.optionTexts.length === 4 && probe.optionTexts.every((text) => /^\d+$/.test(text)),
    `${probe.id}: Bubble Pop deveria usar somente numerais visíveis.`
  );

  await frame.locator(".duduq-bp-bubble").first().waitFor({ state: "visible", timeout: 20_000 });
  await frame.waitForFunction(() => {
    const arena = document.querySelector(".duduq-bp-arena")?.getBoundingClientRect();
    return Array.from(document.querySelectorAll(".duduq-bp-bubble-shell")).some((shell) => {
      const text = String(shell.textContent || "").trim();
      if (!/^\d+$/.test(text)) return false;
      const style = getComputedStyle(shell);
      const rect = shell.getBoundingClientRect();
      const opacity = Number.parseFloat(style.opacity || "1");
      const intersectsViewport = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      const intersectsArena = !arena || (rect.bottom > arena.top && rect.top < arena.bottom && rect.right > arena.left && rect.left < arena.right);
      return style.visibility !== "hidden" && style.display !== "none" && opacity > 0.15 && rect.width > 0 && rect.height > 0 && intersectsViewport && intersectsArena;
    });
  }, null, { timeout: 6_000 });

  const bubbleState = await frame.evaluate(() => {
    const arena = document.querySelector(".duduq-bp-arena")?.getBoundingClientRect();
    return Array.from(document.querySelectorAll(".duduq-bp-bubble-shell")).map((shell) => {
      const style = getComputedStyle(shell);
      const rect = shell.getBoundingClientRect();
      const text = String(shell.textContent || "").trim();
      const opacity = Number.parseFloat(style.opacity || "1");
      const onScreen = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      const inArena = !arena || (rect.bottom > arena.top && rect.top < arena.bottom && rect.right > arena.left && rect.left < arena.right);
      return { text, opacity, onScreen, inArena };
    });
  });
  const visibleTexts = bubbleState
    .filter((entry) => entry.opacity > 0.15 && entry.onScreen && entry.inArena && entry.text)
    .map((entry) => entry.text);
  assert(visibleTexts.length > 0, `${probe.id}: nenhuma bolha numérica ficou visível na arena em até 6s.`);
  assert(
    visibleTexts.every((text) => /^\d+$/.test(text)),
    `${probe.id}: Bubble Pop expôs conteúdo não numérico: ${JSON.stringify(visibleTexts)}`
  );
  return { bubbleState, visibleTexts };
}

async function verifyTarget(frame, probe) {
  assert(probe.targetMode === "audio-to-image", `${probe.id}: Target Shooter não está em audio-to-image.`);
  assert(probe.targetItems.length === 4, `${probe.id}: Target Shooter não preservou quatro alvos.`);
  assert(
    probe.targetItems.every((item) => item.display === "image" && item.image && !item.label),
    `${probe.id}: Target Shooter precisa usar alvos visuais sem leitura inglesa.`
  );

  await frame.locator(".duduq-ts-target").first().waitFor({ state: "visible", timeout: 20_000 });
  const targetCount = await frame.locator(".duduq-ts-target").count();
  assert(targetCount >= 1, `${probe.id}: nenhum alvo ativo foi renderizado.`);
  return { targetCount };
}

async function writeFailureEvidence(page, testCase, probe, messages, error, diagnostic = null) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const base = `${testCase.id}-${testCase.viewport.width}x${testCase.viewport.height}-FAIL`;
  const screenshot = path.join(OUTPUT_DIR, `${base}.png`);
  const json = path.join(OUTPUT_DIR, `${base}.json`);
  try { await page.screenshot({ path: screenshot, fullPage: true }); } catch (_) {}
  await fs.writeFile(json, JSON.stringify({
    id: testCase.id,
    viewport: testCase.viewport,
    probe,
    diagnostic,
    error: error?.stack || error?.message || String(error),
    messages
  }, null, 2));
}

async function runCase(browser, testCase) {
  const { page, messages } = await preparePage(browser, testCase.viewport);
  let probe = null;
  let diagnostic = null;
  try {
    await openModule(page, testCase.module);
    probe = await startQuestionProbe(page, testCase.module, testCase.id);
    assert(probe.mechanic === testCase.mechanic, `${testCase.id}: esperado ${testCase.mechanic}, recebeu ${probe.mechanic}.`);
    assert(probe.rule === testCase.rule, `${testCase.id}: regra inesperada ${probe.rule}.`);

    const frame = await mechanicFrame(page, probe.mechanic);

    if (probe.mechanic === "matching") {
      diagnostic = await verifyMatching(page, frame, probe, { exerciseRetry: testCase.exerciseRetry === true });
    } else if (probe.mechanic === "bubble-pop") {
      diagnostic = await verifyBubble(frame, probe);
    } else if (probe.mechanic === "target-shooter") {
      diagnostic = await verifyTarget(frame, probe);
    } else {
      throw new Error(`${testCase.id}: mecânica não prevista no browser RC: ${probe.mechanic}`);
    }

    if (!frame.isDetached()) {
      await assertNoHorizontalOverflow(frame, `${testCase.id} ${testCase.viewport.width}x${testCase.viewport.height}`);
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const screenshot = path.join(
      OUTPUT_DIR,
      `${testCase.id}-${testCase.viewport.width}x${testCase.viewport.height}.png`
    );
    await page.screenshot({ path: screenshot, fullPage: true });

    const fatalMessages = messages.filter((entry) =>
      /pageerror:|Runtime informou erro|Não foi possível iniciar|Integrity gate failed/i.test(entry)
    );
    assert(fatalMessages.length === 0, `${testCase.id}: erros no console: ${fatalMessages.join(" | ")}`);

    return {
      id: testCase.id,
      module: testCase.module,
      mechanic: probe.mechanic,
      rule: probe.rule,
      viewport: testCase.viewport,
      screenshot,
      diagnostic
    };
  } catch (error) {
    await writeFailureEvidence(page, testCase, probe, messages, error, diagnostic);
    throw error;
  } finally {
    await page.close();
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cases = [
  {
    module: 1,
    id: "EN2-M1-02",
    mechanic: "matching",
    rule: "matching-audio-image",
    exerciseRetry: true,
    viewport: { width: 1366, height: 768 }
  },
  {
    module: 1,
    id: "EN2-M1-13",
    mechanic: "matching",
    rule: "matching-audio-audio",
    viewport: { width: 1366, height: 768 }
  },
  {
    module: 2,
    id: "EN2-M2-01",
    mechanic: "bubble-pop",
    rule: "bubble-audio-numeral",
    viewport: { width: 1366, height: 768 }
  },
  {
    module: 2,
    id: "EN2-M2-03",
    mechanic: "target-shooter",
    rule: "target-audio-image",
    viewport: { width: 1366, height: 768 }
  },
  {
    module: 3,
    id: "EN2-M3-01",
    mechanic: "matching",
    rule: "matching-image-audio",
    viewport: { width: 390, height: 844 }
  },
  {
    module: 6,
    id: "EN2-M6-02",
    mechanic: "target-shooter",
    rule: "target-audio-image",
    viewport: { width: 390, height: 844 }
  }
];

const report = [];
try {
  for (const testCase of cases) {
    report.push(await runCase(browser, testCase));
  }
} finally {
  await browser.close();
}

await fs.writeFile(
  path.join(OUTPUT_DIR, "report.json"),
  JSON.stringify({ status: "PASS", cases: report }, null, 2)
);

console.log(JSON.stringify({ status: "PASS", cases: report }, null, 2));
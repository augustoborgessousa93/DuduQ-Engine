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

    // Ordem estável apenas para o teste de interação. Não altera o conteúdo publicado.
    if (question.metadata?.matching?.behavior) {
      question.metadata.matching.behavior.shuffleLeft = false;
      question.metadata.matching.behavior.shuffleRight = false;
    }

    const answerValue = question.answer?.value;
    const correctIndex = typeof answerValue === "string" && /^opt-\d+$/.test(answerValue)
      ? Number(answerValue.slice(4)) - 1
      : null;

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
      sourceAnswer: question.metadata?.sourceAnswerV23,
      optionTexts: (question.alternatives || []).map((entry) => String(entry.text || "")),
      matchingMode: question.metadata?.matching?.mode || null,
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

  const frame = await frameElement.contentFrame();
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

async function verifyMatching(frame, probe, { exerciseRetry = false } = {}) {
  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });
  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const right = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
  const labels = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-label');
  const confirm = frame.locator(".duduq-matching-primary");

  assert(await left.count() === 1, `${probe.id}: Matching precisa de um estímulo à esquerda.`);
  assert(await right.count() === 4, `${probe.id}: Matching precisa preservar quatro alternativas.`);
  assert(await labels.count() === 0, `${probe.id}: Matching expôs texto inglês antes da resposta.`);
  assert(await confirm.count() === 1, `${probe.id}: botão CONFIRMAR não encontrado.`);

  if (!exerciseRetry) return;
  assert(Number.isInteger(probe.correctIndex), `${probe.id}: gabarito não pôde ser convertido em índice.`);

  const wrongIndex = probe.correctIndex === 0 ? 1 : 0;
  await left.first().click();
  await right.nth(wrongIndex).click();
  await confirm.click();

  await frame.locator('.duduq-matching-card[data-feedback="retry"]').first()
    .waitFor({ state: "visible", timeout: 5_000 });

  await frame.waitForFunction(() =>
    document.querySelectorAll('.duduq-matching-card[data-feedback="retry"]').length === 0,
  null, { timeout: 5_000 });

  await left.first().click();
  await right.nth(probe.correctIndex).click();
  await confirm.click();

  await frame.locator('.duduq-matching-card[data-feedback="correct"]').first()
    .waitFor({ state: "visible", timeout: 5_000 });
}

async function verifyBubble(frame, probe) {
  assert(
    probe.optionTexts.length === 4 && probe.optionTexts.every((text) => /^\d+$/.test(text)),
    `${probe.id}: Bubble Pop deveria usar somente numerais visíveis.`
  );

  await frame.locator(".duduq-bp-bubble").first().waitFor({ state: "visible", timeout: 20_000 });
  const visibleTexts = await frame.locator(".duduq-bp-bubble").allInnerTexts();
  assert(visibleTexts.length > 0, `${probe.id}: nenhuma bolha foi renderizada.`);
  assert(
    visibleTexts.every((text) => /^\s*\d+\s*$/.test(text)),
    `${probe.id}: Bubble Pop expôs algo além de numeral: ${JSON.stringify(visibleTexts)}`
  );
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
}

async function runCase(browser, testCase) {
  const { page, messages } = await preparePage(browser, testCase.viewport);
  try {
    await openModule(page, testCase.module);
    const probe = await startQuestionProbe(page, testCase.module, testCase.id);
    assert(probe.mechanic === testCase.mechanic, `${testCase.id}: esperado ${testCase.mechanic}, recebeu ${probe.mechanic}.`);
    assert(probe.rule === testCase.rule, `${testCase.id}: regra inesperada ${probe.rule}.`);

    const frame = await mechanicFrame(page, probe.mechanic);

    if (probe.mechanic === "matching") {
      await verifyMatching(frame, probe, { exerciseRetry: testCase.exerciseRetry === true });
    } else if (probe.mechanic === "bubble-pop") {
      await verifyBubble(frame, probe);
    } else if (probe.mechanic === "target-shooter") {
      await verifyTarget(frame, probe);
    } else {
      throw new Error(`${testCase.id}: mecânica não prevista no browser RC: ${probe.mechanic}`);
    }

    await assertNoHorizontalOverflow(frame, `${testCase.id} ${testCase.viewport.width}x${testCase.viewport.height}`);

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
      screenshot
    };
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

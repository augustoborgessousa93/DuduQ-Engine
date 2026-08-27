import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-multimodal-consistency-rc1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function key(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}
function url(module) {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=multimodal-consistency-rc1`;
}

async function bootModule(page, module) {
  await page.goto(url(module), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(({ moduleKey, moduleNumber }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[moduleKey];
    return Boolean(built?.module === moduleNumber && built?.activities?.length && window.DuduQ && window.DuduQIntro);
  }, { moduleKey: key(module), moduleNumber: module }, { timeout: 30_000 });

  const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
  const started = await page.evaluate((moduleNumber) => window.DuduQ?.getSession?.()?.module === moduleNumber, module);
  if (!started) {
    await start.waitFor({ state: "visible", timeout: 20_000 });
    await start.click();
  }
  await page.waitForFunction((moduleNumber) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === moduleNumber && session.totalSteps > 0);
  }, module, { timeout: 25_000 });
}

async function currentFrame(page) {
  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "Iframe da mecânica não ficou acessível.");
  return { iframe, frame };
}

async function waitStep(page, expectedIndex) {
  await page.waitForFunction((index) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session && !session.transitioning && session.stepIndex === index);
  }, expectedIndex, { timeout: 12_000 });
  await page.waitForTimeout(80);
}

async function advance(page) {
  const before = await page.evaluate(() => window.DuduQ?.getSession?.()?.stepIndex ?? -1);
  const total = await page.evaluate(() => window.DuduQ?.getSession?.()?.totalSteps ?? 0);
  assert(before >= 0 && before < total, `Etapa inválida antes do avanço: ${before}/${total}.`);
  await page.evaluate(() => window.DuduQ.next({ qaSkip: true }));
  if (before + 1 >= total) return false;
  await waitStep(page, before + 1);
  return true;
}

async function activeActivityInfo(page, module) {
  return page.evaluate(({ moduleKey }) => {
    const built = window.DUDUQ_CONTENT.english.year2[moduleKey];
    const session = window.DuduQ.getSession();
    const activity = built.activities[session.stepIndex] || null;
    const single = activity?.questions?.find((question) => question?.metadata?.singleTargetChoice === true) || null;
    return {
      stepIndex: session.stepIndex,
      totalSteps: session.totalSteps,
      activityId: activity?.id || null,
      activityMechanic: activity?.mechanic || null,
      correctSource: single?.answer?.value?.[0]?.source || null,
      questionId: single?.id || null,
      optionPresentation: single?.metadata?.optionPresentation || null
    };
  }, { moduleKey: key(module) });
}

async function findSingleTarget(page, module) {
  const total = await page.evaluate(() => window.DuduQ.getSession().totalSteps);
  for (let attempt = 0; attempt < total; attempt += 1) {
    const info = await activeActivityInfo(page, module);
    const { frame } = await currentFrame(page);
    const target = frame.locator('.duduq-dd2-target[data-year2-single-target-choice="true"]').first();
    if (await target.isVisible().catch(() => false)) {
      assert(info.correctSource, `M${module}: runtime single-target ativo, mas gabarito estrutural não foi localizado na atividade ${info.activityId}.`);
      return { frame, target, info };
    }
    if (!(await advance(page))) break;
  }
  throw new Error(`M${module}: nenhum Drag & Drop single-target ativo foi encontrado no navegador.`);
}

async function assertSmartImagesLoaded(frame, selector, label) {
  const images = frame.locator(selector);
  const count = await images.count();
  assert(count >= 2, `${label}: esperado ao menos 2 imagens, encontrado ${count}.`);
  const state = await images.evaluateAll((nodes) => nodes.map((node) => ({
    src: node.currentSrc || node.src || "",
    complete: Boolean(node.complete),
    naturalWidth: Number(node.naturalWidth || 0),
    naturalHeight: Number(node.naturalHeight || 0),
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height
  })));
  assert(state.every((item) => item.complete && item.naturalWidth > 0 && item.naturalHeight > 0), `${label}: existe imagem não carregada.`);
  assert(state.every((item) => item.width > 20 && item.height > 20), `${label}: existe imagem carregada sem presença visual útil.`);
  assert(new Set(state.map((item) => item.src)).size === state.length, `${label}: existem imagens repetidas.`);
  return state;
}

async function exerciseSingleTarget(browser, viewport, name) {
  const context = await browser.newContext({
    viewport,
    isMobile: name === "mobile",
    hasTouch: name === "mobile"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await bootModule(page, 1);
    const { frame, target, info } = await findSingleTarget(page, 1);

    const bridge = await page.evaluate(() => ({
      declared: Boolean(window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__),
      captured: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_CAPTURED__ === true,
      mechanicVersion: window.DuduQ?.getMechanic?.("drag-drop")?.version || null
    }));
    assert(bridge.declared, `${name}: ponte confirm-any não foi declarada.`);
    assert(bridge.captured, `${name}: hook 2.0.22 não foi capturado antes do runtime build.`);
    assert(bridge.mechanicVersion === "2.0.22", `${name}: hotfix alterou release ativo do Drag & Drop (${bridge.mechanicVersion}).`);
    assert(info.optionPresentation === "IMAGE_PRIMARY_DRAG_DROP_CHOICE", `${name}/${info.questionId}: Drag & Drop não chegou como áudio→imagem.`);

    const bankItems = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
    const ids = await bankItems.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-dd2-item-id")).filter(Boolean));
    assert(ids.length >= 2, `${name}/${info.questionId}: bolsa sem alternativas suficientes.`);
    assert(ids.includes(info.correctSource), `${name}/${info.questionId}: alternativa correta ${info.correctSource} não está na bolsa.`);
    const wrongId = ids.find((id) => id !== info.correctSource);
    assert(wrongId, `${name}/${info.questionId}: não foi possível escolher alternativa errada.`);

    await assertSmartImagesLoaded(frame, ".duduq-dd2-bank .duduq-dd2-item img", `${name}/${info.questionId} imagens da bolsa`);

    const confirm = frame.locator(".duduq-dd2-confirm");
    await confirm.waitFor({ state: "visible", timeout: 8_000 });
    assert(await confirm.isDisabled(), `${name}/${info.questionId}: CONFIRMAR deveria iniciar desabilitado.`);

    const wrong = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).first();
    await wrong.click();
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "visible", timeout: 4_000 });
    assert(!(await confirm.isDisabled()), `${name}/${info.questionId}: CONFIRMAR não habilitou com alternativa errada colocada.`);

    await confirm.click();
    const wrongInTarget = target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"][data-wrong="true"]`).first();
    await wrongInTarget.waitFor({ state: "visible", timeout: 2_500 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-${info.questionId}-wrong-red.png`), fullPage: false });

    await frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "visible", timeout: 3_500 });
    await frame.waitForFunction((id) => !document.querySelector(`.duduq-dd2-target .duduq-dd2-item[data-dd2-item-id="${id}"]`), wrongId, { timeout: 3_500 });
    assert(await confirm.isDisabled(), `${name}/${info.questionId}: CONFIRMAR deveria voltar a desabilitar após erro e limpeza do alvo.`);

    const correct = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${info.correctSource}"]`).first();
    await correct.click();
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${info.correctSource}"]`).waitFor({ state: "visible", timeout: 4_000 });
    assert(!(await confirm.isDisabled()), `${name}/${info.questionId}: CONFIRMAR não habilitou com alternativa correta.`);
    await confirm.click();
    await frame.locator('.duduq-engine-feedback[data-state="success"]').first().waitFor({ state: "visible", timeout: 4_000 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-${info.questionId}-correct.png`), fullPage: false });

    assert(errors.length === 0, `${name}: erros de página: ${errors.join(" | ")}`);
    return { name, questionId: info.questionId, wrongId, correctId: info.correctSource, bridge };
  } finally {
    await context.close();
  }
}

async function visualSmokeAllModules(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const report = [];
  try {
    for (let module = 1; module <= 6; module += 1) {
      const page = await context.newPage();
      page.setDefaultTimeout(18_000);
      try {
        await bootModule(page, module);
        const total = await page.evaluate(() => window.DuduQ.getSession().totalSteps);
        for (let step = 0; step < total; step += 1) {
          const { frame } = await currentFrame(page);
          const mechanic = await page.evaluate(() => {
            const iframe = document.querySelector("#root iframe");
            return String(iframe?.title || iframe?.getAttribute("title") || "");
          });

          if (/Bubble Pop/i.test(mechanic)) {
            const images = frame.locator(".duduq-bp-media");
            if (await images.count()) {
              const state = await images.evaluateAll((nodes) => nodes.map((node) => ({ complete: node.complete, naturalWidth: node.naturalWidth, src: node.currentSrc || node.src || "" })));
              assert(state.every((item) => item.complete && item.naturalWidth > 0), `M${module}/step${step}: Bubble Pop com imagem quebrada.`);
              assert(new Set(state.map((item) => item.src)).size === state.length, `M${module}/step${step}: Bubble Pop com imagem repetida.`);
            }
          }
          if (/Target Shooter/i.test(mechanic)) {
            const images = frame.locator(".duduq-ts-target img");
            if (await images.count()) {
              const state = await images.evaluateAll((nodes) => nodes.map((node) => ({ complete: node.complete, naturalWidth: node.naturalWidth, src: node.currentSrc || node.src || "" })));
              assert(state.every((item) => item.complete && item.naturalWidth > 0), `M${module}/step${step}: Target Shooter com imagem quebrada.`);
              assert(new Set(state.map((item) => item.src)).size === state.length, `M${module}/step${step}: Target Shooter com imagem repetida.`);
            }
          }
          if (step + 1 < total) await advance(page);
        }
        report.push({ module, totalSteps: total });
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
  return report;
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await exerciseSingleTarget(browser, { width: 1366, height: 768 }, "desktop");
  const mobile = await exerciseSingleTarget(browser, { width: 390, height: 844 }, "mobile");
  const modules = await visualSmokeAllModules(browser);
  const report = {
    status: "PASS",
    contract: "YEAR2_CONFIRM_ANY_SELECTION_AND_SMART_VISUALS",
    desktop,
    mobile,
    modules
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

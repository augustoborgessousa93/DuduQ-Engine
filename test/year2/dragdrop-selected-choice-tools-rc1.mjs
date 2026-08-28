import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-dragdrop-selected-choice-tools-rc1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function boot(page) {
  await page.goto(`${BASE_URL}/content/english/year-2/module-01/index.html?qa=dd-selected-tools-rc2`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });

  await page.waitForFunction(() => Boolean(
    window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal?.activities?.length &&
    window.DuduQ && window.DuduQIntro
  ), null, { timeout: 30_000 });

  const started = await page.evaluate(() => window.DuduQ?.getSession?.()?.module === 1);
  if (!started) {
    const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
    await start.waitFor({ state: "visible", timeout: 20_000 });
    await start.click();
  }

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === 1 && session.totalSteps > 0 && !session.transitioning);
  }, null, { timeout: 25_000 });
}

async function currentFrame(page) {
  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "Iframe Drag & Drop não ficou acessível.");
  return frame;
}

async function advance(page) {
  const state = await page.evaluate(() => {
    const session = window.DuduQ?.getSession?.();
    return { index: session?.stepIndex ?? -1, total: session?.totalSteps ?? 0 };
  });
  if (state.index + 1 >= state.total) return false;
  await page.evaluate(() => window.DuduQ.next({ qaSkip: true }));
  await page.waitForFunction((expected) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session && !session.transitioning && session.stepIndex === expected);
  }, state.index + 1, { timeout: 12_000 });
  return true;
}

async function activeInfo(page) {
  return page.evaluate(() => {
    const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
    const session = window.DuduQ.getSession();
    const activity = built.activities[session.stepIndex] || null;
    const question = activity?.questions?.find((entry) => entry?.metadata?.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES") || null;
    return {
      questionId: question?.id || null,
      correctSource: question?.answer?.value?.[0]?.source || null,
      presentation: question?.metadata?.optionPresentation || null
    };
  });
}

async function findListening(page) {
  const total = await page.evaluate(() => window.DuduQ.getSession().totalSteps);
  for (let index = 0; index < total; index += 1) {
    const info = await activeInfo(page);
    const frame = await currentFrame(page);
    const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
    if (info.presentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES" && await target.isVisible().catch(() => false)) {
      assert(info.questionId && info.correctSource, "Listening association sem ID/gabarito.");
      return { frame, target, info };
    }
    if (!(await advance(page))) break;
  }
  throw new Error("Nenhum listening association single-target foi encontrado no M01.");
}

async function visualChoiceOrder(frame) {
  return frame.locator(".duduq-dd2-bank-items > .duduq-dd2-item-shell-audio-choice").evaluateAll((nodes) => {
    return nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        letter: node.getAttribute("data-choice-letter") || "",
        top: rect.top,
        left: rect.left
      };
    }).sort((a, b) => {
      if (Math.abs(a.top - b.top) > 4) return a.top - b.top;
      return a.left - b.left;
    }).map((entry) => entry.letter);
  });
}

async function bankDisplay(frame) {
  return frame.locator(".duduq-dd2-bank").first().evaluate((node) => getComputedStyle(node).display);
}

async function actionState(frame) {
  return frame.locator(".duduq-dd2-actions").first().evaluate((node) => ({
    display: getComputedStyle(node).display,
    opacity: Number(getComputedStyle(node).opacity || 0),
    pointerEvents: getComputedStyle(node).pointerEvents
  }));
}

async function placeByClick(frame, target, itemId) {
  const card = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();
  await card.waitFor({ state: "visible", timeout: 8_000 });
  await card.click();
  await target.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).waitFor({ state: "visible", timeout: 5_000 });
}

async function runScenario(browser, name, viewport, mobile) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await boot(page);
    const { frame, target, info } = await findListening(page);

    const bridge = await page.evaluate(() => ({
      selectedTools: window.__DUDUQ_YEAR2_DD_SELECTED_TOOLS_V2_BRIDGE__ || null,
      selectedToolsCaptured: window.__DUDUQ_YEAR2_DD_SELECTED_TOOLS_V2_CAPTURED__ === true,
      confirmAnyCaptured: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_CAPTURED__ === true,
      release: window.DuduQ?.getMechanic?.("drag-drop")?.version || null
    }));

    assert(bridge.selectedToolsCaptured, `${name}: bridge selected-tools V2 não capturou o runtime.`);
    assert(bridge.confirmAnyCaptured, `${name}: bridge confirm-any não capturou o runtime.`);
    assert(bridge.selectedTools?.selectedChoiceReplayEnabled === true, `${name}: replay selecionado não declarado.`);
    assert(bridge.selectedTools?.selectedChoiceReplayAvoidsGlobalButtonNormalizer === true, `${name}: replay não declara isolamento do normalizador global.`);
    assert(bridge.selectedTools?.selectedChoiceReplayKeyboardAccessible === true, `${name}: replay não declara acesso por teclado.`);
    assert(bridge.selectedTools?.selectedChoiceReplayNeutralAccessibleName === true, `${name}: replay não declara nome acessível neutro.`);
    assert(bridge.selectedTools?.selectedChoiceReplayNeutralClassName === true, `${name}: replay não declara classe neutra.`);
    assert(bridge.selectedTools?.selectedChoiceClearEnabled === true, `${name}: clear selecionado não declarado.`);
    assert(bridge.release === "2.0.22", `${name}: Drag Drop mudou para ${bridge.release}.`);

    await frame.waitForSelector("#duduq-year2-dd-selected-tools-v2", { state: "attached", timeout: 10_000 });
    await frame.waitForSelector("#duduq-year2-subcard-balance-v3", { state: "attached", timeout: 10_000 });

    const cards = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
    const ids = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-dd2-item-id")).filter(Boolean));
    assert(ids.length === 4, `${name}/${info.questionId}: esperado banco A-D com 4 itens; encontrado ${ids.length}.`);
    assert(ids.includes(info.correctSource), `${name}/${info.questionId}: gabarito ausente do banco.`);
    const wrongId = ids.find((id) => id !== info.correctSource);
    assert(wrongId, `${name}/${info.questionId}: distrator não encontrado.`);

    const initialOrder = await visualChoiceOrder(frame);
    assert(initialOrder.join("") === "ABCD", `${name}/${info.questionId}: ordem inicial não é A-B-C-D (${initialOrder.join("-")}).`);
    assert((await target.locator(".duduq-dd2-placed-replay").count()) === 0, `${name}: replay apareceu antes da escolha.`);
    assert((await target.locator(".duduq-dd2-placed-clear").count()) === 0, `${name}: X apareceu antes da escolha.`);

    await placeByClick(frame, target, wrongId);
    assert(await bankDisplay(frame) === "none", `${name}/${info.questionId}: banco não sumiu após escolha.`);

    const replay = target.locator(`.duduq-dd2-placed-replay[data-dd2-placed-replay-item-id="${wrongId}"]`).first();
    const clear = target.locator(`.duduq-dd2-placed-clear[data-dd2-clear-item-id="${wrongId}"]`).first();
    await replay.waitFor({ state: "visible", timeout: 5_000 });
    await clear.waitFor({ state: "visible", timeout: 5_000 });
    assert(await replay.evaluate((node) => node.tagName === "SPAN" && node.getAttribute("role") === "button" && node.tabIndex === 0), `${name}: replay perdeu acessibilidade.`);
    assert(!(await replay.evaluate((node) => node.classList.contains("duduq-audio-standard") || node.hasAttribute("data-duduq-native-audio"))), `${name}: replay foi capturado pelo normalizador global de áudio.`);
    assert(/Repetir alternativa escolhida|Parar repetição da alternativa escolhida/i.test(await replay.getAttribute("aria-label") || ""), `${name}: replay sem nome acessível correto.`);
    assert(/Remover alternativa escolhida/i.test(await clear.getAttribute("aria-label") || ""), `${name}: X sem nome acessível correto.`);

    const confirm = frame.locator(".duduq-dd2-confirm").first();
    await confirm.waitFor({ state: "visible", timeout: 5_000 });
    assert(!(await confirm.isDisabled()), `${name}/${info.questionId}: CONFIRMAR não habilitou.`);
    const visibleAction = await actionState(frame);
    assert(visibleAction.opacity >= 0.99 && visibleAction.pointerEvents !== "none", `${name}: CONFIRMAR não ficou visível/interativo (${JSON.stringify(visibleAction)}).`);

    await replay.click();
    await frame.waitForTimeout(120);
    assert((await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).count()) === 1, `${name}: replay removeu/moveu a alternativa selecionada.`);
    assert(!(await confirm.isDisabled()), `${name}: replay alterou o estado do CONFIRMAR.`);

    await replay.focus();
    await replay.press("Enter");
    await frame.waitForTimeout(80);
    assert((await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).count()) === 1, `${name}: replay via teclado alterou a resposta.`);

    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-${info.questionId}-selected-tools.png`), fullPage: false });

    await clear.click();
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "detached", timeout: 5_000 });
    await frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "visible", timeout: 5_000 });
    assert(await bankDisplay(frame) !== "none", `${name}: banco não reapareceu após X.`);
    const hiddenAction = await actionState(frame);
    assert(hiddenAction.opacity <= 0.01 && hiddenAction.pointerEvents === "none", `${name}: CONFIRMAR não ocultou após X (${JSON.stringify(hiddenAction)}).`);
    assert((await target.locator(".duduq-dd2-placed-replay").count()) === 0, `${name}: replay permaneceu após remover.`);
    assert((await target.locator(".duduq-dd2-placed-clear").count()) === 0, `${name}: X permaneceu após remover.`);

    const orderAfterClear = await visualChoiceOrder(frame);
    assert(orderAfterClear.join("") === "ABCD", `${name}: A-D não voltou à ordem original após X (${orderAfterClear.join("-")}).`);

    await placeByClick(frame, target, wrongId);
    await frame.locator(".duduq-dd2-confirm").first().click();
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"][data-wrong="true"]`).waitFor({ state: "visible", timeout: 2_500 });
    assert((await target.locator(".duduq-dd2-placed-replay").count()) === 0, `${name}: replay ficou ativo durante feedback vermelho.`);
    assert((await target.locator(".duduq-dd2-placed-clear").count()) === 0, `${name}: X ficou ativo durante feedback vermelho.`);

    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-${info.questionId}-wrong-feedback.png`), fullPage: false });

    await frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "visible", timeout: 5_000 });
    assert((await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).count()) === 0, `${name}: resposta errada não voltou ao banco.`);
    assert(await bankDisplay(frame) !== "none", `${name}: banco não reapareceu após erro.`);
    const orderAfterWrong = await visualChoiceOrder(frame);
    assert(orderAfterWrong.join("") === "ABCD", `${name}: A-D não voltou após erro (${orderAfterWrong.join("-")}).`);

    assert(pageErrors.length === 0, `${name}: erros de página: ${pageErrors.join(" | ")}`);

    return { name, viewport, questionId: info.questionId, wrongId, initialOrder, orderAfterClear, orderAfterWrong, bridge };
  } finally {
    await context.close();
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const shortNotebook = await runScenario(browser, "short-notebook", { width: 1366, height: 645 }, false);
  const mobile = await runScenario(browser, "mobile", { width: 390, height: 844 }, true);
  const report = { status: "PASS", contract: "YEAR2_DD_SELECTED_CHOICE_TOOLS_RC2", shortNotebook, mobile };
  await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

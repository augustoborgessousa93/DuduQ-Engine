import { chromium } from "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.BASE_URL || "http://localhost:4173/";
const outputDir = new URL("screenshots/", import.meta.url);
const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 }, { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x720", width: 1280, height: 720 }, { name: "640x360", width: 640, height: 360 },
  { name: "480x320", width: 480, height: 320 }, { name: "390x844", width: 390, height: 844 }
];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];
const shot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, outputDir)), fullPage: true });
async function shotButton(page, selector, name, padding = 16) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${name}: botão não está visível para screenshot`);
  const viewport = page.viewportSize();
  const x = Math.max(0, Math.floor(box.x - padding));
  const y = Math.max(0, Math.floor(box.y - padding));
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width + padding));
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + padding));
  return page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, outputDir)), clip: { x, y, width: right - x, height: bottom - y } });
}

async function newPage(viewport, mobile = false) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator(".matching-card").first().waitFor({ state: "visible" });
  return { context, page, errors };
}

async function link(page, leftId, rightId, touch = false) {
  const left = page.locator(`.matching-card[data-id="${leftId}"]`);
  const right = page.locator(`.matching-card[data-id="${rightId}"]`);
  if (touch) { await left.tap(); await right.tap(); } else { await left.click(); await right.click(); }
}

try {
  for (const viewport of viewports) {
    const { context, page, errors } = await newPage(viewport, viewport.name === "390x844");
    const metrics = await page.evaluate(() => {
      const game = document.querySelector(".game-screen");
      const board = document.querySelector(".matching-playfield");
      const cards = [...document.querySelectorAll(".matching-card")];
      const images = [...document.querySelectorAll(".matching-image")];
      const b = board.getBoundingClientRect();
      const cta = document.querySelector(".primary-action").getBoundingClientRect();
      return {
        clientWidth: game.clientWidth, scrollWidth: document.documentElement.scrollWidth,
        clientHeight: game.clientHeight, scrollHeight: document.documentElement.scrollHeight,
        leftCount: document.querySelectorAll('[data-list="left"] .matching-card').length,
        rightCount: document.querySelectorAll('[data-list="right"] .matching-card').length,
        cardRows: cards.map((card) => { const r = card.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) }; }),
        board: { top: Math.round(b.top), bottom: Math.round(b.bottom) }, cta: { top: Math.round(cta.top), bottom: Math.round(cta.bottom), hidden: cta.width === 0 || getComputedStyle(document.querySelector(".primary-action")).display === "none" },
        states: [...new Set(cards.map((card) => card.dataset.state))], progressWidth: Math.round(document.querySelector(".hud-progress-fill").getBoundingClientRect().width),
        progressTrackWidth: Math.round(document.querySelector(".hud-progress").getBoundingClientRect().width),
        imagesLoaded: images.filter((image) => image.complete && image.naturalWidth > 0).length,
        touchMinimum: Math.min(...[...document.querySelectorAll("button")].map((button) => ({ button, rect: button.getBoundingClientRect() })).filter(({ button, rect }) => getComputedStyle(button).display !== "none" && getComputedStyle(button).visibility !== "hidden" && rect.width > 0 && rect.height > 0).map(({ rect }) => Math.min(rect.width, rect.height)))
      };
    });
    assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${viewport.name}: overflow horizontal`);
    assert(metrics.scrollHeight <= metrics.clientHeight + 1, `${viewport.name}: overflow vertical`);
    assert(metrics.leftCount === 4 && metrics.rightCount === 4, `${viewport.name}: pares ausentes`);
    assert(metrics.states.length === 1 && metrics.states[0] === "idle", `${viewport.name}: estado inicial`);
    assert(metrics.cardRows.every((row) => row.top >= metrics.board.top - 1 && row.bottom <= metrics.board.bottom + 1), `${viewport.name}: cards fora do playfield`);
    assert(metrics.touchMinimum >= 44, `${viewport.name}: hit area abaixo de 44px (${metrics.touchMinimum}px)`);
    assert(metrics.progressWidth / metrics.progressTrackWidth > .37 && metrics.progressWidth / metrics.progressTrackWidth < .43, `${viewport.name}: progresso não representa 4/10`);
    assert(errors.length === 0, `${viewport.name}: erro JS — ${errors.join("; ")}`);
    if (viewport.name === "480x320") {
      assert(!metrics.cta.hidden, "480x320: CTA desapareceu");
      assert(metrics.cta.top >= Math.max(...metrics.cardRows.map((row) => row.bottom)) - 2, `480x320: CTA cobre os cards ${JSON.stringify({ cta: metrics.cta, rows: metrics.cardRows })}`);
    }
    await shot(page, viewport.name);
    results.push({ viewport: viewport.name, ...metrics, errors, status: "PASS" });
    if (viewport.name === "390x844") {
      await link(page, "word-dog", "picture-dog", true);
      assert(await page.locator(".matching-connection").count() === 1, "390x844: tap não conectou os cards");
      const phoneCurve = await page.locator(".connection-cable").getAttribute("d");
      const phoneControl = phoneCurve.match(/^M\s+([\d.-]+)\s+([\d.-]+)\s+C\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+)/);
      assert(phoneControl && Number(phoneControl[3]) < Number(phoneControl[5]), "curva do cabo retrocede no mobile");
      await page.waitForTimeout(390);
      await shot(page, "390x844-connected");
    }
    await context.close();
  }

  // Visual state screenshots at the approved Penpot target viewport.
  const { context, page, errors } = await newPage({ width: 1366, height: 768 });
  await page.locator('[data-id="word-dog"]').click();
  assert(await page.locator('[data-id="word-dog"]').getAttribute("data-state") === "selected", "seleção não aplicada");
  assert(await page.locator('[data-id="word-dog"] .matching-port').evaluate((el) => getComputedStyle(el, "::before").animationName) === "connector-anchor-pulse", "pulso do anchor selecionado não foi aplicado");
  await shot(page, "1366x768-selected");
  await page.locator('[data-id="picture-dog"]').click();
  assert(await page.locator(".connection-layer path.connection-cable").count() === 1, "conector SVG não desenhado");
  const pathBefore = await page.locator(".connection-layer path.connection-cable").getAttribute("d");
  assert(await page.locator(".connection-shadow").count() === 1, "camada de profundidade ausente");
  assert(await page.locator(".connection-core").count() === 1, "núcleo de energia ausente");
  assert(await page.locator(".connection-thread").count() === 1, "linha interna tracejada ausente");
  assert(await page.locator(".connection-node-core").count() === 2, "terminais de energia ausentes");
  const curveOrder = pathBefore.match(/^M\s+([\d.-]+)\s+([\d.-]+)\s+C\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+)/);
  assert(curveOrder && Number(curveOrder[3]) < Number(curveOrder[5]), "curva do cabo retrocede no viewport desktop");
  assert(await page.locator(".connection-thread").evaluate((el) => getComputedStyle(el).animationName) === "connector-energy-flow", "fluxo energético não está animado");
  assert(await page.locator(".connection-thread").evaluate((el) => getComputedStyle(el).strokeDasharray) === "5px, 7px", "tracejado interno perdeu o padrão de circuito");
  assert(await page.locator(".matching-connection").evaluate((el) => el.classList.contains("is-connecting")), "animação curta de transmissão não iniciou");
  await page.waitForTimeout(390);
  assert(!(await page.locator(".matching-connection").evaluate((el) => el.classList.contains("is-connecting"))), "estado de desenho não encerrou no final do cabo");
  await shot(page, "1366x768-connected");
  await page.setViewportSize({ width: 640, height: 360 });
  await page.waitForTimeout(120);
  const pathAfter = await page.locator(".connection-layer path.connection-cable").getAttribute("d");
  assert(pathBefore !== pathAfter, "conector não recalculou no resize");
  const mobileCurve = pathAfter.match(/^M\s+([\d.-]+)\s+([\d.-]+)\s+C\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+),\s+([\d.-]+)\s+([\d.-]+)/);
  assert(mobileCurve && Number(mobileCurve[3]) < Number(mobileCurve[5]), "curva do cabo retrocede no embed 640x360");
  const embedStroke = await page.locator(".connection-cable").evaluate((el) => getComputedStyle(el).strokeWidth);
  assert(Number.parseFloat(embedStroke) <= 7, `espessura do cabo não escalou no embed (${embedStroke})`);
  await page.waitForTimeout(390);
  await shot(page, "640x360-connected");
  await page.setViewportSize({ width: 1366, height: 768 });
  assert(await page.locator(".primary-action").isDisabled(), "CTA deve permanecer desabilitado com associações incompletas");
  assert(await page.locator(".feedback-ribbon:not([hidden])").count() === 0, "confirmação incompleta não deve abrir faixa de feedback");
  await context.close();

  const correctRun = await newPage({ width: 1366, height: 768 });
  await link(correctRun.page, "word-dog", "picture-dog");
  await link(correctRun.page, "word-cat", "picture-cat");
  await link(correctRun.page, "word-rabbit", "picture-rabbit");
  await link(correctRun.page, "word-fish", "picture-fish");
  assert(await correctRun.page.locator(".primary-action").isEnabled(), "CTA Confirmar não habilitou após todos os pares");
  await correctRun.page.locator(".primary-action").click();
  await correctRun.page.locator('.feedback-ribbon[data-feedback=correct]:not([hidden])').waitFor();
  assert(await correctRun.page.locator(".feedback-ribbon[data-feedback=correct]").count() === 1, "feedback correto ausente");
  assert(await correctRun.page.locator('[data-state="correct"]').count() === 8, "cards corretos não receberam o estado");
  assert(await correctRun.page.locator(".matching-connection.is-correct").first().evaluate((el) => getComputedStyle(el).color) === "rgb(53, 185, 112)", "conector não assumiu a cor de acerto premium");
  await correctRun.page.waitForFunction(() => { const image = document.querySelector(".feedback-mascot"); return image.complete && image.naturalWidth > 0; }, { timeout: 12000 });
  await shot(correctRun.page, "1366x768-correct");
  await shotButton(correctRun.page, ".feedback-action", "2.2a-button-default");
  await correctRun.page.locator(".feedback-action").hover();
  await correctRun.page.waitForTimeout(140);
  await shotButton(correctRun.page, ".feedback-action", "2.2a-button-hover");
  await correctRun.page.mouse.down();
  await correctRun.page.waitForTimeout(140);
  await shotButton(correctRun.page, ".feedback-action", "2.2a-button-pressed");
  await correctRun.page.mouse.move(12, 12);
  await correctRun.page.mouse.up();
  await correctRun.page.locator(".feedback-action").click();
  await correctRun.page.waitForTimeout(120);
  assert(await correctRun.page.locator(".loading-screen:not([hidden])").count() === 1, "tela loading não cobriu o conteúdo anterior");
  assert(await correctRun.page.locator(".matching-card:visible").count() === 0, "cards atravessaram a transição");
  await shot(correctRun.page, "1366x768-loading");
  await correctRun.page.waitForTimeout(700);
  assert(await correctRun.page.locator(".loading-screen[data-state=complete]").count() === 1, "fallback de conclusão não apareceu");
  assert(correctRun.errors.length === 0, `erro JS no fluxo correto: ${correctRun.errors.join("; ")}`);
  await correctRun.context.close();

  const buttonStates = await newPage({ width: 1366, height: 768 });
  await shotButton(buttonStates.page, ".primary-action:disabled", "2.2a-button-disabled");
  await buttonStates.page.evaluate(() => {
    const ribbon = document.querySelector(".feedback-ribbon");
    ribbon.hidden = false;
    ribbon.dataset.feedback = "correct";
    ribbon.querySelector(".feedback-action").className = "feedback-action is-correct";
    ribbon.querySelector('[data-slot="feedback-action"]').textContent = "CONTINUAR";
  });
  const focusButton = buttonStates.page.locator(".feedback-action");
  for (let attempt = 0; attempt < 20 && !(await focusButton.evaluate((element) => element.matches(":focus-visible"))); attempt += 1) {
    await buttonStates.page.keyboard.press("Tab");
  }
  assert(await focusButton.evaluate((element) => element.matches(":focus-visible")), "navegação por teclado não focou o botão para screenshot");
  await shotButton(buttonStates.page, ".feedback-action", "2.2a-button-focus");
  await buttonStates.context.close();

  const incorrectRun = await newPage({ width: 1366, height: 768 });
  await link(incorrectRun.page, "word-dog", "picture-cat");
  await link(incorrectRun.page, "word-cat", "picture-dog");
  await link(incorrectRun.page, "word-rabbit", "picture-rabbit");
  await link(incorrectRun.page, "word-fish", "picture-fish");
  await incorrectRun.page.locator(".primary-action").click();
  await incorrectRun.page.locator('.feedback-ribbon[data-feedback=incorrect]:not([hidden])').waitFor();
  assert(await incorrectRun.page.locator(".feedback-ribbon[data-feedback=incorrect]").count() === 1, "feedback incorreto ausente");
  assert(await incorrectRun.page.locator('[data-state="incorrect"]').count() === 4, "pares errados não destacados");
  assert(await incorrectRun.page.locator(".matching-connection.is-incorrect").first().evaluate((el) => getComputedStyle(el).color) === "rgb(223, 117, 109)", "conector não assumiu a cor coral de erro");
  await incorrectRun.page.waitForFunction(() => { const image = document.querySelector(".feedback-mascot"); return image.complete && image.naturalWidth > 0; }, { timeout: 12000 });
  await shot(incorrectRun.page, "1366x768-incorrect");
  await incorrectRun.page.locator(".feedback-action").click();
  assert(await incorrectRun.page.locator(".feedback-ribbon[hidden]").count() === 1, "retry não fechou feedback");
  assert(await incorrectRun.page.locator('[data-state="incorrect"]').count() === 0, "retry não limpou os pares incorretos");
  assert(incorrectRun.errors.length === 0, `erro JS no fluxo incorreto: ${incorrectRun.errors.join("; ")}`);
  await incorrectRun.context.close();

  for (const viewport of [{ name: "640x360" , width: 640, height: 360 }, { name: "390x844", width: 390, height: 844 }]) {
    for (const outcome of ["correct", "incorrect"]) {
      const run = await newPage(viewport, viewport.name === "390x844");
      const pairs = outcome === "correct"
        ? [["word-dog", "picture-dog"], ["word-cat", "picture-cat"], ["word-rabbit", "picture-rabbit"], ["word-fish", "picture-fish"]]
        : [["word-dog", "picture-cat"], ["word-cat", "picture-dog"], ["word-rabbit", "picture-rabbit"], ["word-fish", "picture-fish"]];
      for (const [left, right] of pairs) await link(run.page, left, right, viewport.name === "390x844");
      await run.page.locator(".primary-action").click();
      await run.page.locator(`.feedback-ribbon[data-feedback=${outcome}]:not([hidden])`).waitFor();
      const confirm = run.page.locator(".primary-action");
      assert(await confirm.isHidden(), `${viewport.name} ${outcome}: CONFIRMAR permaneceu visível`);
      await shot(run.page, `${viewport.name}-${outcome}`);
      assert(run.errors.length === 0, `${viewport.name} ${outcome}: erro JS ${run.errors.join("; ")}`);
      await run.context.close();
    }
  }

  // O host fornece a próxima questão sem acoplar a mecânica ao conteúdo pedagógico.
  const nextRun = await newPage({ width: 1366, height: 768 });
  await nextRun.page.evaluate(() => {
    const current = window.__MATCHING_ENGINE__;
    window.DUDUQ_MATCHING_HOST = { nextRound: async () => ({
      topic: "ANIMALS", subtitle: "Ligue cada palavra à imagem correta", counter: "5 / 10", completed: 5, total: 10,
      question: { ...current.question, id: "host-next", prompt: "HOST NEXT ROUND QA", audioText: "Host supplied next round" },
      leftTitle: "Palavras", rightTitle: "Imagens", leftItems: current.leftItems, rightItems: current.rightItems,
      pairs: current.pairs, actionLabel: "CONFIRMAR"
    }) };
  });
  await link(nextRun.page, "word-dog", "picture-dog");
  await link(nextRun.page, "word-cat", "picture-cat");
  await link(nextRun.page, "word-rabbit", "picture-rabbit");
  await link(nextRun.page, "word-fish", "picture-fish");
  await nextRun.page.locator(".primary-action").click();
  await nextRun.page.locator(".feedback-action").click();
  await nextRun.page.waitForTimeout(760);
  assert(await nextRun.page.locator("#question-prompt").textContent() === "HOST NEXT ROUND QA", "Host não injetou a próxima questão após loading");
  assert(await nextRun.page.locator(".hud-counter").textContent() === "5 / 10", "contador não avançou para o próximo conteúdo");
  assert(nextRun.errors.length === 0, `erro JS no fluxo host next: ${nextRun.errors.join("; ")}`);
  await nextRun.context.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
  await reducedPage.locator('[data-id="word-dog"]').click();
  const reducedAnimation = await reducedPage.locator(".matching-card[data-state=selected] .matching-port").evaluate((el) => getComputedStyle(el, "::before").animationName);
  assert(reducedAnimation === "none", "pulse do anchor não respeitou prefers-reduced-motion");
  await link(reducedPage, "word-cat", "picture-dog");
  const staticFlow = await reducedPage.locator(".connection-thread").evaluate((el) => getComputedStyle(el).animationName);
  assert(staticFlow === "none", "fluxo do conector não respeitou prefers-reduced-motion");
  await reducedContext.close();

  console.log(JSON.stringify({ status: "PASS", results, behavioral: ["mouse selection/swap", "touch selection", "SVG connector + resize", "correct", "incorrect + retry", "loading hides old content", "host next round", "40% progress"] }, null, 2));
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function boot(page) {
  await page.goto(`${BASE_URL}/content/english/year-2/module-01/index.html?qa=dd-target-visual-contract-rc1`, {
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

async function frame(page) {
  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const handle = await iframe.elementHandle();
  const current = await handle?.contentFrame();
  assert(current, "Iframe da mecânica não ficou acessível.");
  return current;
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

async function findListening(page) {
  const total = await page.evaluate(() => window.DuduQ.getSession().totalSteps);
  for (let index = 0; index < total; index += 1) {
    const active = await page.evaluate(() => {
      const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
      const session = window.DuduQ.getSession();
      const activity = built.activities[session.stepIndex] || null;
      const question = activity?.questions?.find((item) => item?.metadata?.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES") || null;
      return {
        id: question?.id || null,
        targetLabel: question?.metadata?.targets?.[0]?.label || null,
        targetInstructionConsistent: question?.metadata?.listeningAssociation?.targetInstructionConsistent === true
      };
    });
    const current = await frame(page);
    const target = current.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
    if (active.id && await target.isVisible().catch(() => false)) return { current, target, active };
    if (!(await advance(page))) break;
  }
  throw new Error("Nenhum single-target listening association foi encontrado.");
}

async function confirmSafeArea(current, name, questionId) {
  await current.waitForSelector("#duduq-year2-subcard-balance-v2", { state: "attached", timeout: 10_000 });
  const confirm = current.locator(".duduq-dd2-confirm").first();
  await confirm.waitFor({ state: "visible", timeout: 10_000 });

  const geometry = await confirm.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const action = node.closest(".duduq-dd2-actions");
    const actionStyle = action ? getComputedStyle(action) : null;
    const viewportHeight = document.documentElement.clientHeight;
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      viewportHeight,
      bottomClearance: viewportHeight - rect.bottom,
      actionMinHeight: actionStyle?.minHeight || null,
      actionPaddingTop: actionStyle?.paddingTop || null,
      actionPaddingBottom: actionStyle?.paddingBottom || null
    };
  });

  assert(geometry.height >= 48, `${name}/${questionId}: botão CONFIRMAR foi comprimido (${JSON.stringify(geometry)}).`);
  assert(geometry.top >= 0, `${name}/${questionId}: topo do CONFIRMAR saiu do viewport (${JSON.stringify(geometry)}).`);
  assert(geometry.bottomClearance >= 6, `${name}/${questionId}: CONFIRMAR está cortado/encostado no limite inferior (${JSON.stringify(geometry)}).`);
  return geometry;
}

async function run(browser, name, viewport) {
  const context = await browser.newContext({
    viewport,
    isMobile: name === "mobile",
    hasTouch: name === "mobile"
  });
  const page = await context.newPage();
  try {
    await boot(page);
    const { current, target, active } = await findListening(page);
    assert(active.targetLabel === "SOLTE A RESPOSTA AQUI", `${name}/${active.id}: label de conteúdo inesperado: ${active.targetLabel}`);
    assert(active.targetInstructionConsistent, `${name}/${active.id}: finalizador não declarou instrução consistente.`);

    const targetText = String(await target.innerText()).replace(/\s+/g, " ").trim();
    assert(targetText.includes("SOLTE A RESPOSTA AQUI"), `${name}/${active.id}: target não mostra a instrução final (${targetText}).`);
    assert(!/ARRASTE A IMAGEM/i.test(targetText), `${name}/${active.id}: instrução legada ARRASTE A IMAGEM ainda aparece.`);

    const capacity = target.locator(":scope > .duduq-dd2-capacity");
    assert(await capacity.count() === 1, `${name}/${active.id}: badge de capacidade esperado não existe no DOM base.`);
    const badgeState = await capacity.evaluate((node) => ({
      text: String(node.textContent || "").trim(),
      display: getComputedStyle(node).display,
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height
    }));
    assert(badgeState.display === "none", `${name}/${active.id}: badge ${badgeState.text} continua visível (${JSON.stringify(badgeState)}).`);
    assert(badgeState.width === 0 && badgeState.height === 0, `${name}/${active.id}: badge oculto ainda ocupa espaço.`);

    const confirmGeometry = await confirmSafeArea(current, name, active.id);

    const bridge = await page.evaluate(() => window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__ || null);
    assert(bridge?.singleTargetCapacityBadgeHidden === true, `${name}/${active.id}: bridge não declara limpeza do badge.`);

    return { name, questionId: active.id, targetText, badgeState, confirmGeometry, bridgeVersion: bridge.version };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await run(browser, "desktop", { width: 1366, height: 768 });
  const shortNotebook = await run(browser, "short-notebook", { width: 1366, height: 645 });
  const mobile = await run(browser, "mobile", { width: 390, height: 844 });
  console.log(JSON.stringify({
    status: "PASS",
    contract: "YEAR2_DD_LISTENING_TARGET_VISUAL_CONTRACT_RC1",
    desktop,
    shortNotebook,
    mobile
  }, null, 2));
} finally {
  await browser.close();
}

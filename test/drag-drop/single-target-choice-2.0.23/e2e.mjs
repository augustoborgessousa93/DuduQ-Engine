import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const M03_URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;
const RESULTS = "test-results/single-target-choice-2.0.23";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitUntilEnabled(locator, timeout = 6_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await locator.isEnabled().catch(() => false)) return Date.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Alternativa permaneceu desabilitada por mais de ${timeout}ms após o DD2 ficar visível.`);
}

async function bootM03(page, diagnosticName = "boot") {
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") browserErrors.push(`${msg.type()}: ${msg.text()}`);
  });

  await page.goto(M03_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(
    () => window.DuduQDD23SingleTargetRuntimePatch?.ready === true,
    null,
    { timeout: 20_000 }
  );

  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {
    // Some homolog hosts can enter directly; the active DD2 target below is authoritative.
  }

  const frame = page.frameLocator('iframe[title="DuduQ — Drag & Drop"]');
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]');
  try {
    await target.waitFor({ state: "visible", timeout: 35_000 });
  } catch (error) {
    const bodyText = await page.locator("body").innerText().catch(() => "<body indisponível>");
    const frames = page.frames().map((item) => `${item.name() || "<sem-nome>"} :: ${item.url()}`);
    await page.screenshot({ path: `${RESULTS}/${diagnosticName}-boot-failure.png`, fullPage: true }).catch(() => {});
    fs.writeFileSync(
      `${RESULTS}/${diagnosticName}-boot-diagnostic.txt`,
      [
        `URL: ${page.url()}`,
        "",
        "BODY:",
        bodyText,
        "",
        "FRAMES:",
        ...frames,
        "",
        "BROWSER MESSAGES:",
        ...(browserErrors.length ? browserErrors : ["<nenhuma mensagem capturada>"]),
        "",
        "ORIGINAL ERROR:",
        String(error?.stack || error)
      ].join("\n")
    );
    throw new Error(`Boot M03 falhou. Diagnóstico salvo em ${RESULTS}/${diagnosticName}-boot-diagnostic.txt. Mensagens: ${browserErrors.join(" | ") || "nenhuma"}`);
  }

  const firstChoice = frame.locator(".duduq-dd2-bank .duduq-dd2-item").first();
  await firstChoice.waitFor({ state: "visible", timeout: 5_000 });
  const interactiveWaitMs = await waitUntilEnabled(firstChoice);

  if (browserErrors.length) {
    const fatal = browserErrors.filter((message) => /Falha|Error|erro|failed/i.test(message));
    assert(fatal.length === 0, `Erros de browser durante boot: ${fatal.join(" | ")}`);
  }

  return { frame, target, interactiveWaitMs };
}

function bankChoice(frame, letter) {
  return frame.locator(".duduq-dd2-bank .duduq-dd2-item").filter({ hasText: letter }).first();
}

async function waitTargetFilled(target, expected = true) {
  await target.waitFor({ state: "visible", timeout: 3_000 });
  const wanted = expected ? "true" : "false";
  const deadline = Date.now() + 3_000;
  let lastValue = null;

  while (Date.now() < deadline) {
    lastValue = await target.getAttribute("data-filled").catch(() => null);
    if (lastValue === wanted) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`data-filled não chegou a ${wanted}; último valor=${lastValue}`);
}

async function dragChoice(page, choice, target) {
  await waitUntilEnabled(choice);
  await choice.hover({ timeout: 8_000 });
  const sourceBox = await choice.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, "Não foi possível obter coordenadas para o arraste.");

  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.72, { steps: 18 });
  await page.mouse.up();
}

async function assertLargeChoice(locator, label) {
  const box = await locator.boundingBox();
  assert(box, `${label}: alternativa sem bounding box.`);
  assert(box.width >= 210, `${label}: alternativa estreita demais (${Math.round(box.width)}px).`);
  assert(box.height >= 60, `${label}: alternativa baixa demais (${Math.round(box.height)}px).`);
}

async function desktopScenario(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const { frame, target, interactiveWaitMs } = await bootM03(page, "desktop");
  const bank = frame.locator(".duduq-dd2-bank");
  const confirm = frame.locator(".duduq-dd2-confirm");
  console.log(`DESKTOP interactive after ${interactiveWaitMs}ms`);

  const targetBox = await target.boundingBox();
  const bankBox = await bank.boundingBox();
  assert(targetBox && bankBox, "Layout desktop não produziu áreas mensuráveis.");
  assert(targetBox.x < bankBox.x, "Desktop: estímulo/destino deveria ficar à esquerda das alternativas.");
  assert(bankBox.x - targetBox.x > 180, "Desktop: separação horizontal insuficiente entre estímulo e alternativas.");

  const targetImage = target.locator(".duduq-dd2-target-head img").first();
  await targetImage.waitFor({ state: "visible", timeout: 5_000 });
  const targetImageBox = await targetImage.boundingBox();
  assert(targetImageBox && targetImageBox.width >= 130 && targetImageBox.height >= 100, `Desktop: estímulo visual pequeno demais (${Math.round(targetImageBox?.width || 0)}x${Math.round(targetImageBox?.height || 0)}).`);

  for (const letter of ["A", "B", "C", "D"]) {
    await assertLargeChoice(bankChoice(frame, letter), `Desktop ${letter}`);
  }

  assert(await confirm.isDisabled(), "CONFIRMAR deveria iniciar desabilitado sem escolha.");

  const capacity = target.locator(".duduq-dd2-capacity");
  if (await capacity.count()) {
    const display = await capacity.evaluate((element) => getComputedStyle(element).display);
    assert(display === "none", "Badge 0/1 continua visível no SINGLE_TARGET_CHOICE.");
  }

  // Primeiro gesto: arraste real de uma alternativa errada (A). A resposta correta da EN2-M3-01 é B.
  const choiceA = bankChoice(frame, "A");
  await dragChoice(page, choiceA, target);
  await waitTargetFilled(target, true);
  assert(await target.locator(".duduq-dd2-item").count() === 1, "Arraste de A não deixou exatamente uma alternativa no destino.");
  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou após alternativa A ser colocada.");

  // Prova que o arraste foi resolvido pelo owner nativo, não por click residual.
  const pointerProof = await frame.locator("body").evaluate(() => window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__ || null);
  assert(pointerProof?.placeCalls >= 1, "Arraste visual ocorreu sem prova de chamada place() pelo owner nativo.");
  assert(pointerProof?.targetResolved === "stimulus-target", `Owner nativo resolveu target inesperado: ${pointerProof?.targetResolved}.`);

  // O owner nativo bloqueia por 320 ms o click sintético que alguns browsers disparam
  // após um drag. O teste espera essa janela terminar antes de simular uma NOVA intenção
  // de toque/clique; isso evita confundir o anti-ghost-click com a troca A → C.
  await page.waitForTimeout(360);

  // Troca por toque/clique antes de confirmar. C também é incorreta e deve substituir A sem revelar gabarito.
  const choiceC = bankChoice(frame, "C");
  await choiceC.click();
  await waitTargetFilled(target, true);
  await bankChoice(frame, "A").waitFor({ state: "visible", timeout: 3_000 });
  assert(await target.locator(".duduq-dd2-item").count() === 1, "Troca A → C deixou mais de uma alternativa no destino.");
  assert(!(await confirm.isDisabled()), "CONFIRMAR não permaneceu habilitado após troca A → C.");

  const confirmBox = await confirm.boundingBox();
  assert(confirmBox && confirmBox.y + confirmBox.height <= 768, "Desktop 1366x768: CONFIRMAR ficou fora do primeiro viewport.");

  // Validação só acontece agora.
  await confirm.click();
  const retryCard = target.locator('.duduq-dd2-item[data-wrong="true"]');
  await retryCard.waitFor({ state: "visible", timeout: 2_500 });
  await page.screenshot({ path: `${RESULTS}/desktop-wrong-red.png`, fullPage: true });

  // O card incorreto deve permanecer visível brevemente e depois retornar ao banco.
  await bankChoice(frame, "C").waitFor({ state: "visible", timeout: 2_500 });
  await waitTargetFilled(target, false);
  assert(await target.locator(".duduq-dd2-item").count() === 0, "Após o feedback de erro, o card incorreto não retornou à origem.");

  // Nova tentativa por toque. B é a resposta correta da primeira questão.
  const choiceB = bankChoice(frame, "B");
  await choiceB.click();
  await waitTargetFilled(target, true);
  assert(await target.locator(".duduq-dd2-item").count() === 1, "Toque em B não colocou exatamente uma alternativa no destino.");
  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou na segunda tentativa correta.");
  await confirm.click();

  const success = frame.locator('.duduq-engine-feedback[data-state="success"] .duduq-engine-feedback-card');
  await success.waitFor({ state: "visible", timeout: 3_000 });
  await page.screenshot({ path: `${RESULTS}/desktop-correct.png`, fullPage: true });

  await context.close();
}

async function mobileScenario(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const { frame, target, interactiveWaitMs } = await bootM03(page, "mobile");
  const bank = frame.locator(".duduq-dd2-bank");
  console.log(`MOBILE interactive after ${interactiveWaitMs}ms`);

  const targetBox = await target.boundingBox();
  const bankBox = await bank.boundingBox();
  assert(targetBox && bankBox, "Layout mobile não produziu áreas mensuráveis.");
  assert(targetBox.y < bankBox.y, "Mobile: estímulo/destino deveria ficar acima das alternativas.");
  assert(targetBox.x >= -2 && targetBox.x + targetBox.width <= 392, "Mobile: target criou overflow horizontal.");

  const choices = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
  assert(await choices.count() === 4, `Mobile: esperado banco com 4 alternativas, encontrado ${await choices.count()}.`);
  const firstBox = await choices.nth(0).boundingBox();
  const secondBox = await choices.nth(1).boundingBox();
  assert(firstBox && secondBox, "Mobile: alternativas não possuem caixas mensuráveis.");
  assert(Math.abs(firstBox.y - secondBox.y) < 28, "Mobile: primeiras alternativas não estão em duas colunas.");
  assert(Math.abs(firstBox.x - secondBox.x) > 80, "Mobile: colunas de alternativas não estão visualmente separadas.");

  // Toque deve colocar qualquer alternativa e habilitar confirmar sem revelar se está correta.
  const choiceD = bankChoice(frame, "D");
  await choiceD.click();
  await waitTargetFilled(target, true);
  assert(await target.locator(".duduq-dd2-item").count() === 1, "Mobile: toque em D não colocou exatamente uma alternativa no destino.");
  const confirm = frame.locator(".duduq-dd2-confirm");
  assert(!(await confirm.isDisabled()), "Mobile: CONFIRMAR não habilitou após toque em alternativa D.");
  await page.screenshot({ path: `${RESULTS}/mobile-selected.png`, fullPage: true });
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await desktopScenario(browser);
  await mobileScenario(browser);
  console.log("PASS — E2E SINGLE_TARGET_CHOICE: active DD2 + desktop + mobile + drag + tap + retry + correct");
} finally {
  await browser.close();
}

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

async function bootM03(page) {
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") browserErrors.push(`console: ${msg.text()}`);
  });

  await page.goto(M03_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {
    // Some homolog hosts can enter directly; the mechanic wait below is authoritative.
  }

  const frame = page.frameLocator('iframe[title="DuduQ — Drag & Drop"]');
  const target = frame.locator('.duduq-dd-target[data-single-target-choice="true"]');
  await target.waitFor({ state: "visible", timeout: 35_000 });

  if (browserErrors.length) {
    const fatal = browserErrors.filter((message) => /Falha|Error|erro|failed/i.test(message));
    assert(fatal.length === 0, `Erros de browser durante boot: ${fatal.join(" | ")}`);
  }

  return { frame, target };
}

function poolChoice(frame, letter) {
  return frame.locator(".duduq-dd-pool .duduq-dd-item").filter({ hasText: `🔊 ${letter}` }).first();
}

async function dragChoice(page, choice, target) {
  const sourceBox = await choice.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, "Não foi possível obter coordenadas para o arraste.");

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.82, { steps: 14 });
  await page.mouse.up();
}

async function desktopScenario(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const { frame, target } = await bootM03(page);
  const pool = frame.locator(".duduq-dd-pool");
  const confirm = frame.locator(".duduq-dd-primary");

  const targetBox = await target.boundingBox();
  const poolBox = await pool.boundingBox();
  assert(targetBox && poolBox, "Layout desktop não produziu áreas mensuráveis.");
  assert(targetBox.x < poolBox.x, "Desktop: estímulo/destino deveria ficar à esquerda das alternativas.");
  assert(poolBox.x - targetBox.x > 180, "Desktop: separação horizontal insuficiente entre estímulo e alternativas.");

  assert(await confirm.isDisabled(), "CONFIRMAR deveria iniciar desabilitado sem escolha.");

  const capacity = target.locator(".duduq-dd-capacity-badge");
  if (await capacity.count()) {
    const display = await capacity.evaluate((element) => getComputedStyle(element).display);
    assert(display === "none", "Badge 0/1 continua visível no SINGLE_TARGET_CHOICE.");
  }

  // Primeiro gesto: arraste real de uma alternativa errada (A). A resposta correta da EN2-M3-01 é B.
  const choiceA = poolChoice(frame, "A");
  await choiceA.waitFor({ state: "visible", timeout: 5_000 });
  await dragChoice(page, choiceA, target);
  await target.locator(".duduq-dd-item").filter({ hasText: "🔊 A" }).waitFor({ state: "visible", timeout: 3_000 });
  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou após alternativa A ser colocada.");

  // Troca por toque/clique antes de confirmar. C também é incorreta e deve substituir A sem revelar gabarito.
  const choiceC = poolChoice(frame, "C");
  await choiceC.click();
  await target.locator(".duduq-dd-item").filter({ hasText: "🔊 C" }).waitFor({ state: "visible", timeout: 3_000 });
  await poolChoice(frame, "A").waitFor({ state: "visible", timeout: 3_000 });
  assert(!(await confirm.isDisabled()), "CONFIRMAR não permaneceu habilitado após troca A → C.");

  const confirmBox = await confirm.boundingBox();
  assert(confirmBox && confirmBox.y + confirmBox.height <= 768, "Desktop 1366x768: CONFIRMAR ficou fora do primeiro viewport.");

  // Validação só acontece agora.
  await confirm.click();
  const retryCard = target.locator('.duduq-dd-item[data-feedback="retry"]').filter({ hasText: "🔊 C" });
  await retryCard.waitFor({ state: "visible", timeout: 2_500 });
  await page.screenshot({ path: `${RESULTS}/desktop-wrong-red.png`, fullPage: true });

  // O card incorreto deve permanecer visível brevemente e depois retornar ao banco.
  await poolChoice(frame, "C").waitFor({ state: "visible", timeout: 2_500 });
  assert(await target.locator(".duduq-dd-item").count() === 0, "Após o feedback de erro, o card incorreto não retornou à origem.");

  // Nova tentativa por toque. B é a resposta correta da primeira questão.
  const choiceB = poolChoice(frame, "B");
  await choiceB.click();
  await target.locator(".duduq-dd-item").filter({ hasText: "🔊 B" }).waitFor({ state: "visible", timeout: 3_000 });
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
  const { frame, target } = await bootM03(page);
  const pool = frame.locator(".duduq-dd-pool");

  const targetBox = await target.boundingBox();
  const poolBox = await pool.boundingBox();
  assert(targetBox && poolBox, "Layout mobile não produziu áreas mensuráveis.");
  assert(targetBox.y < poolBox.y, "Mobile: estímulo/destino deveria ficar acima das alternativas.");
  assert(targetBox.x >= -2 && targetBox.x + targetBox.width <= 392, "Mobile: target criou overflow horizontal.");

  const choices = frame.locator(".duduq-dd-pool .duduq-dd-item");
  assert(await choices.count() === 4, `Mobile: esperado banco com 4 alternativas, encontrado ${await choices.count()}.`);
  const firstBox = await choices.nth(0).boundingBox();
  const secondBox = await choices.nth(1).boundingBox();
  assert(firstBox && secondBox, "Mobile: alternativas não possuem caixas mensuráveis.");
  assert(Math.abs(firstBox.y - secondBox.y) < 28, "Mobile: primeiras alternativas não estão em duas colunas.");
  assert(Math.abs(firstBox.x - secondBox.x) > 80, "Mobile: colunas de alternativas não estão visualmente separadas.");

  // Toque deve colocar qualquer alternativa e habilitar confirmar sem revelar se está correta.
  await poolChoice(frame, "D").click();
  await target.locator(".duduq-dd-item").filter({ hasText: "🔊 D" }).waitFor({ state: "visible", timeout: 3_000 });
  const confirm = frame.locator(".duduq-dd-primary");
  assert(!(await confirm.isDisabled()), "Mobile: CONFIRMAR não habilitou após toque em alternativa D.");

  await page.screenshot({ path: `${RESULTS}/mobile-selected.png`, fullPage: true });
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await desktopScenario(browser);
  await mobileScenario(browser);
  console.log("PASS — E2E SINGLE_TARGET_CHOICE: desktop + mobile + drag + tap + retry + correct");
} finally {
  await browser.close();
}

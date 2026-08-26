import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const PUBLIC_URL = process.env.PUBLIC_URL || "https://augustoborgessousa93.github.io/DuduQ-Engine/content/english/year-2/module-03/";
const TARGET_NAME = process.env.TARGET_NAME || "github-pages";
const RESULTS = "test-results/post-r144-full-game";
const FIRST_ACTIVITY_CORRECT_IDS = ["opt-2", "opt-3", "opt-4", "opt-1"];

fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFinalInteractive(page, frame, itemId, timeout = 12_000) {
  const choice = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();
  const started = Date.now();
  let stableSince = null;

  while (Date.now() - started < timeout) {
    const gate = await page.evaluate(() => document.documentElement.getAttribute("data-duduq-initial-speech-gate")).catch(() => "unknown");
    const enabled = await choice.isEnabled().catch(() => false);
    const visible = await choice.isVisible().catch(() => false);

    if (gate === null && enabled && visible) {
      if (stableSince === null) stableSince = Date.now();
      if (Date.now() - stableSince >= 350) return choice;
    } else {
      stableSince = null;
    }

    await page.waitForTimeout(50);
  }

  throw new Error(`Questão não atingiu estado interativo final estável para ${itemId}.`);
}

async function waitQuestionReset(frame, timeout = 7_000) {
  const feedback = frame.locator('.duduq-engine-feedback[data-state="success"]');
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
  const confirm = frame.locator(".duduq-dd2-confirm").first();
  const started = Date.now();

  while (Date.now() - started < timeout) {
    const feedbackVisible = await feedback.isVisible().catch(() => false);
    const filled = await target.getAttribute("data-filled").catch(() => null);
    const confirmDisabled = await confirm.isDisabled().catch(() => true);
    if (!feedbackVisible && filled === "false" && confirmDisabled) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  throw new Error("A questão não avançou/resetou após o feedback de sucesso.");
}

async function answerQuestion(page, frame, correctId, index) {
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
  await target.waitFor({ state: "visible", timeout: 12_000 });

  const correct = await waitFinalInteractive(page, frame, correctId);
  const confirm = frame.locator(".duduq-dd2-confirm").first();

  assert(await target.getAttribute("data-filled") !== "true", `Q${index + 1}: destino iniciou preenchido.`);
  assert(await confirm.isDisabled(), `Q${index + 1}: CONFIRMAR deveria iniciar desabilitado.`);

  await correct.click();
  await page.waitForFunction(
    () => {
      const iframe = document.querySelector('iframe[title="DuduQ — Drag & Drop"]');
      const doc = iframe?.contentDocument;
      return doc?.querySelector('.duduq-dd2-target[data-single-target-choice="true"]')?.getAttribute("data-filled") === "true";
    },
    null,
    { timeout: 4_000 }
  );

  assert(!(await confirm.isDisabled()), `Q${index + 1}: CONFIRMAR não habilitou após a seleção correta.`);
  assert(!(await frame.locator('.duduq-engine-feedback[data-state="success"]').isVisible().catch(() => false)), `Q${index + 1}: acerto foi revelado antes de CONFIRMAR.`);

  await confirm.click();
  await frame.locator('.duduq-engine-feedback[data-state="success"] .duduq-engine-feedback-card').waitFor({ state: "visible", timeout: 4_000 });

  const positionedId = await target.locator(".duduq-dd2-item").first().getAttribute("data-dd2-item-id").catch(() => null);
  assert(positionedId === correctId, `Q${index + 1}: item confirmado inesperado ${positionedId}; esperado ${correctId}.`);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const browserErrors = [];

  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") browserErrors.push(msg.text());
  });

  await page.addInitScript(() => {
    window.__DUDUQ_POST_R144_EVENTS__ = [];
    for (const name of ["duduq:module-start", "duduq:step-start", "duduq:step-complete", "duduq:module-complete"]) {
      window.addEventListener(name, (event) => {
        window.__DUDUQ_POST_R144_EVENTS__.push({
          name,
          detail: event.detail || null,
          at: Date.now()
        });
      });
    }
  });

  await page.goto(PUBLIC_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });

  await page.waitForFunction(
    () => window.DUDUQ_ENGINE_MANIFEST?.revision === 144 && window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release === "2.0.23",
    null,
    { timeout: 30_000 }
  );

  await page.waitForFunction(() => window.DuduQ?.getSession && window.DUDUQ_PUBLIC_ENTRY?.interactionPilot === "SINGLE_TARGET_CHOICE", null, { timeout: 30_000 });

  const introStart = page.locator(".duduq-intro-start-button");
  try {
    await introStart.waitFor({ state: "visible", timeout: 12_000 });
    await introStart.click();
  } catch (_) {
    // Public host may already be past the intro in warm-cache runs.
  }

  const frame = page.frameLocator('iframe[title="DuduQ — Drag & Drop"]');
  await frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first().waitFor({ state: "visible", timeout: 35_000 });

  const initialSession = await page.evaluate(() => window.DuduQ.getSession());
  assert(initialSession?.stepIndex === 0, `Sessão deveria iniciar na etapa 0; encontrado ${initialSession?.stepIndex}.`);
  assert(initialSession?.totalSteps >= 2, `M03 deveria possuir mais de uma etapa; encontrado ${initialSession?.totalSteps}.`);
  assert(initialSession?.progress?.source === "duduq-host", "Player/Host não é a fonte oficial do progresso.");
  assert(initialSession?.progress?.completedSteps === 0, "Progresso inicial deveria ter 0 etapas concluídas.");

  for (let index = 0; index < FIRST_ACTIVITY_CORRECT_IDS.length; index += 1) {
    await answerQuestion(page, frame, FIRST_ACTIVITY_CORRECT_IDS[index], index);
    if (index < FIRST_ACTIVITY_CORRECT_IDS.length - 1) {
      await waitQuestionReset(frame);
    }
  }

  await page.waitForFunction(
    () => window.__DUDUQ_POST_R144_EVENTS__.some((entry) => entry.name === "duduq:step-complete" && entry.detail?.stepIndex === 0),
    null,
    { timeout: 10_000 }
  );

  await page.waitForFunction(
    () => {
      const session = window.DuduQ?.getSession?.();
      return session?.stepIndex === 1 && session?.transitioning === false;
    },
    null,
    { timeout: 12_000 }
  );

  await page.waitForFunction(
    () => window.__DUDUQ_POST_R144_EVENTS__.some((entry) => entry.name === "duduq:step-start" && entry.detail?.stepIndex === 1),
    null,
    { timeout: 6_000 }
  );

  const nextTarget = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
  await nextTarget.waitFor({ state: "visible", timeout: 12_000 });
  await waitFinalInteractive(page, frame, "opt-2").catch(async () => {
    const anyChoice = frame.locator(".duduq-dd2-bank .duduq-dd2-item").first();
    await anyChoice.waitFor({ state: "visible", timeout: 6_000 });
    assert(await anyChoice.isEnabled(), "Segunda etapa montou, mas permaneceu desabilitada.");
  });

  const session = await page.evaluate(() => window.DuduQ.getSession());
  assert(session.stepIndex === 1, `Player não avançou para a etapa 1; encontrado ${session.stepIndex}.`);
  assert(session.results?.length === 1, `Host deveria registrar exatamente 1 etapa concluída; encontrou ${session.results?.length}.`);
  assert(session.progress?.completedSteps === 1, `Progresso global deveria marcar 1 etapa concluída; encontrou ${session.progress?.completedSteps}.`);
  assert(session.progress?.currentStep === 2, `Progresso global deveria estar na etapa visual 2; encontrou ${session.progress?.currentStep}.`);
  assert(session.progress?.fraction > 0 && session.progress?.fraction < 1, `Fração de progresso inválida: ${session.progress?.fraction}.`);

  const events = await page.evaluate(() => window.__DUDUQ_POST_R144_EVENTS__);
  const firstStepStart = events.find((entry) => entry.name === "duduq:step-start" && entry.detail?.stepIndex === 0);
  const firstStepComplete = events.find((entry) => entry.name === "duduq:step-complete" && entry.detail?.stepIndex === 0);
  const secondStepStart = events.find((entry) => entry.name === "duduq:step-start" && entry.detail?.stepIndex === 1);

  assert(firstStepStart, "Evento duduq:step-start da primeira etapa não foi observado.");
  assert(firstStepComplete, "Evento duduq:step-complete da primeira etapa não foi observado.");
  assert(secondStepStart, "Evento duduq:step-start da segunda etapa não foi observado.");
  assert(firstStepComplete.detail?.progress?.completedSteps === 1, "Evento step-complete não carregou progresso 1/N.");
  assert(secondStepStart.detail?.progress?.completedSteps === 1, "Segunda etapa não recebeu progresso global já atualizado.");

  const transitionStuck = await page.evaluate(() => {
    const root = document.querySelector(".duduq-transition-root");
    if (!root) return false;
    const style = getComputedStyle(root);
    return style.pointerEvents !== "none" && style.opacity !== "0" && !root.hasAttribute("hidden");
  });
  assert(!transitionStuck, "Camada de transição permaneceu bloqueando a interface após a troca de etapa.");

  const fatal = browserErrors.filter((message) => /error|erro|failed|falha/i.test(message));
  assert(fatal.length === 0, `Erros de browser no pós-deploy ${TARGET_NAME}: ${fatal.join(" | ")}`);

  await page.screenshot({ path: `${RESULTS}/${TARGET_NAME}-step-2-ready.png`, fullPage: true });
  fs.writeFileSync(`${RESULTS}/${TARGET_NAME}-events.json`, JSON.stringify({ publicUrl: PUBLIC_URL, session, events }, null, 2));

  console.log(`PASS — ${TARGET_NAME}: Canary R144 público + DD 2.0.23 + 4 questões reais + feedback + step complete + progress 1/N + transition + next step ready`);
  await context.close();
} finally {
  await browser.close();
}

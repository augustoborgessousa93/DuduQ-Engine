import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-m1-12-image-group-rc1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
page.setDefaultTimeout(20_000);

try {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await page.goto(`${BASE_URL}/content/english/year-2/module-01/index.html?qa=m1-12-image-group-rc1`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });

  await page.waitForFunction(() => {
    const module = window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal;
    return Boolean(module?.activities?.length && window.__DUDUQ_YEAR2_M1_12_IMAGE_GROUP__);
  }, null, { timeout: 30_000 });

  const contract = await page.evaluate(() => {
    const module = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
    const activities = module.activities || [];
    const activityIndex = activities.findIndex((activity) =>
      (activity.questions || []).some((question) => question?.id === "EN2-M1-12")
    );
    const activity = activities[activityIndex] || null;
    const question = activity?.questions?.find((entry) => entry?.id === "EN2-M1-12") || null;
    return {
      bridge: window.__DUDUQ_YEAR2_M1_12_IMAGE_GROUP__,
      activityIndex,
      activityId: activity?.id || null,
      mechanic: activity?.mechanic || null,
      statement: question?.statement || null,
      sourceAnswerV23: question?.metadata?.sourceAnswerV23 || null,
      optionPresentation: question?.metadata?.optionPresentation || null,
      hasFirstListenGate: Boolean(question?.metadata?.firstListenGate),
      groups: (question?.metadata?.targets || []).map((target) => ({
        id: target.id,
        label: target.label,
        capacity: target.capacity
      })),
      alternatives: (question?.alternatives || []).map((alternative) => ({
        id: alternative.id,
        text: alternative.text,
        imageSrc: alternative.image?.src || alternative.imageSrc || "",
        audioEnabled: alternative.audio?.enabled === true,
        audioText: alternative.audio?.text || alternative.spokenText || "",
        initialLetter: alternative.metadata?.initialLetter || null
      })),
      answerPairs: question?.answer?.value || []
    };
  });

  assert(contract.activityIndex >= 0, "EN2-M1-12 não foi encontrado no módulo construído.");
  assert(contract.mechanic === "drag-drop", `Mecânica inesperada: ${contract.mechanic}`);
  assert(contract.statement === "ARRASTE AS IMAGENS PARA A LETRA INICIAL CORRETA", `Enunciado inesperado: ${contract.statement}`);
  assert(contract.sourceAnswerV23 === "LEO", `sourceAnswerV23 foi alterado: ${contract.sourceAnswerV23}`);
  assert(contract.optionPresentation === "IMAGE_GROUPING_BY_INITIAL_LETTER", `Apresentação inesperada: ${contract.optionPresentation}`);
  assert(contract.hasFirstListenGate === false, "O antigo first-listen gate ainda está presente.");
  assert(contract.groups.length === 3, `Esperados 3 grupos, encontrados ${contract.groups.length}.`);
  assert(contract.groups.map((group) => group.label).join("") === "LEO", `Grupos devem ser L/E/O: ${JSON.stringify(contract.groups)}`);
  assert(contract.groups.every((group) => group.capacity === 2), `Cada grupo deve aceitar 2 imagens: ${JSON.stringify(contract.groups)}`);
  assert(contract.alternatives.length === 6, `Esperadas 6 imagens, encontradas ${contract.alternatives.length}.`);
  assert(contract.alternatives.every((alternative) => alternative.text === ""), "Há palavra escrita visível antes da resposta.");
  assert(contract.alternatives.every((alternative) => alternative.imageSrc), "Alguma alternativa não possui imagem.");
  assert(contract.alternatives.every((alternative) => alternative.audioEnabled && alternative.audioText), "Alguma imagem não possui áudio.");
  assert(contract.answerPairs.length === 6, `Esperados 6 pares de resposta, encontrados ${contract.answerPairs.length}.`);

  const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
  const started = await page.evaluate(() => Boolean(window.DuduQ?.getSession?.()?.module === 1));
  if (!started) {
    await start.waitFor({ state: "visible", timeout: 20_000 });
    await start.click();
  }

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === 1 && !session.transitioning);
  }, null, { timeout: 20_000 });

  for (let index = 0; index < contract.activityIndex; index += 1) {
    await page.evaluate(() => window.DuduQ.next({ qaSkip: true }));
    await page.waitForFunction((expected) => {
      const session = window.DuduQ?.getSession?.();
      return Boolean(session && !session.transitioning && session.stepIndex === expected);
    }, index + 1, { timeout: 12_000 });
  }

  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "Iframe da Etapa 12 não ficou acessível.");

  await frame.waitForSelector(".duduq-dd2-root", { timeout: 15_000 });
  const targets = frame.locator(".duduq-dd2-target");
  const bankItems = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
  await targets.first().waitFor({ state: "visible", timeout: 10_000 });
  await bankItems.first().waitFor({ state: "visible", timeout: 10_000 });

  assert(await targets.count() === 3, `Render: esperados 3 grupos, encontrados ${await targets.count()}.`);
  assert(await bankItems.count() === 6, `Render: esperadas 6 imagens, encontradas ${await bankItems.count()}.`);
  assert(await bankItems.locator("img").count() === 6, `Render: nem todos os seis cards exibem imagem.`);
  assert(await frame.locator(".duduq-dd2-bank .duduq-dd2-item-audio").count() === 6, `Render: nem todos os seis cards exibem controle de áudio.`);

  const targetText = (await targets.allInnerTexts()).join(" ");
  assert(/L/.test(targetText) && /E/.test(targetText) && /O/.test(targetText), `Render: letras L/E/O não estão visíveis nos grupos: ${targetText}`);
  assert(!/Solte aqui/i.test(targetText) || !/\b1\b.*\b2\b.*\b3\b/s.test(targetText), "Render antigo de montagem por posições ainda parece ativo.");

  await page.screenshot({ path: path.join(OUTPUT_DIR, "m1-12-image-groups-desktop.png"), fullPage: false });

  console.log("PASS — EN2-M1-12 usa 6 imagens com áudio organizadas em grupos L/E/O e preserva sourceAnswerV23=LEO.");
} finally {
  await context.close();
  await browser.close();
}

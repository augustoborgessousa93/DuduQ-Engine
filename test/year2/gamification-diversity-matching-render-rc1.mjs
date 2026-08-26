import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/matching-render");
const EXPECTED_MATCHING_TRANSFORMS = 34;
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function moduleKey(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}

function moduleUrl(module) {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=matching-render-rc1`;
}

async function preparePage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const messages = [];
  await page.route("**/engine/duduq-player-v1.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__ = true;"
    });
  });
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  return { page, messages };
}

async function openModule(page, module) {
  const key = moduleKey(module);
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(
    (expectedKey) => Boolean(
      window.DUDUQ_CONTENT?.english?.year2?.[expectedKey]?.gamificationDiversityAudit &&
      window.DuduQ?.hasMechanic?.("matching")
    ),
    key,
    { timeout: 30_000 }
  );
  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-matching-render" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
    document.documentElement.removeAttribute("data-duduq-initial-speech-gate");
  });
}

async function transformedMatchingQuestions(page, module) {
  const key = moduleKey(module);
  return page.evaluate((expectedKey) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    if (!built) throw new Error(`Módulo ${expectedKey} não encontrado.`);
    return (built.activities || []).flatMap((activity) =>
      (activity.questions || []).map((question) => ({
        id: question.id,
        rule: question.metadata?.gamificationDiversity?.rule || null,
        mechanic: question.delivery?.mechanic || activity.mechanic,
        matching: question.metadata?.matching || null
      }))
    ).filter((question) => String(question.rule || "").startsWith("matching-"));
  }, key);
}

async function startProbe(page, module, questionId) {
  const key = moduleKey(module);
  return page.evaluate(({ expectedKey, expectedId }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    const activity = (built.activities || []).find((entry) =>
      (entry.questions || []).some((question) => question.id === expectedId)
    );
    if (!activity) throw new Error(`${expectedId}: atividade não encontrada.`);
    const source = (activity.questions || []).find((question) => question.id === expectedId);
    const question = JSON.parse(JSON.stringify(source));
    const diversity = question.metadata?.gamificationDiversity;
    const matching = question.metadata?.matching;
    if (!diversity || !matching) throw new Error(`${expectedId}: metadados Matching ausentes.`);

    window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-matching-probe" });
    window.DuduQTransition?.hideImmediate?.();
    window.DuduQ.destroy();

    window.DuduQ.start({
      id: `qa-matching-${expectedId}`,
      title: `QA ${expectedId}`,
      year: built.year,
      subject: built.subject,
      module: built.module,
      container: "#root",
      steps: [{
        id: `qa-${expectedId}`,
        mechanic: "matching",
        payload: {
          id: `qa-${expectedId}-payload`,
          title: activity.title || expectedId,
          subject: built.subject,
          year: built.year,
          module: built.module,
          questions: [question]
        },
        options: { contentVersion: built.version, skill: activity.skill || null }
      }]
    });

    return {
      id: expectedId,
      rule: diversity.rule,
      mechanic: question.delivery?.mechanic || activity.mechanic,
      matching: {
        mode: matching.mode,
        leftItems: matching.leftItems,
        rightItems: matching.rightItems,
        pairs: matching.pairs,
        behavior: matching.behavior
      }
    };
  }, { expectedKey: key, expectedId: questionId });
}

async function matchingFrame(page) {
  await page.locator("#root iframe").first().waitFor({ state: "attached", timeout: 15_000 });
  const iframe = page.locator("#root iframe").first();
  const title = await iframe.getAttribute("title");
  assert(/Matching/i.test(String(title || "")), `iframe inesperado: ${title}`);
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "iframe Matching inacessível.");
  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });
  const runtimeError = await frame.locator("#duduq-runtime-error").count()
    ? await frame.locator("#duduq-runtime-error").first().innerText().catch(() => "")
    : "";
  assert(!runtimeError, `Matching runtime error: ${runtimeError}`);
  return frame;
}

async function verifyCardGeometry(frame, id) {
  const geometry = await frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-matching-card")).map((card) => {
    const rect = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const inViewport = cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight;
    const hit = inViewport ? document.elementFromPoint(cx, cy) : null;
    return {
      width: rect.width,
      height: rect.height,
      opacity: Number.parseFloat(style.opacity || "1"),
      display: style.display,
      visibility: style.visibility,
      inViewport,
      hitInside: Boolean(hit && (hit === card || card.contains(hit)))
    };
  }));
  assert(geometry.length === 5, `${id}: esperados 5 cartões Matching, encontrados ${geometry.length}.`);
  for (const [index, item] of geometry.entries()) {
    assert(item.display !== "none" && item.visibility !== "hidden" && item.opacity > 0.5, `${id}: cartão ${index} não está visível.`);
    assert(item.width >= 44 && item.height >= 44, `${id}: cartão ${index} abaixo do alvo mínimo de 44px (${item.width}x${item.height}).`);
    assert(item.inViewport && item.hitInside, `${id}: cartão ${index} não está plenamente acessível na viewport.`);
  }
  return geometry;
}

async function waitForImages(frame, expected, id) {
  if (expected === 0) {
    assert(await frame.locator(".duduq-matching-media").count() === 0, `${id}: imagens inesperadas foram renderizadas.`);
    return [];
  }
  await frame.waitForFunction((expectedCount) => {
    const images = Array.from(document.querySelectorAll("img.duduq-matching-media"));
    return images.length === expectedCount && images.every((img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }, expected, { timeout: 15_000 });
  const images = await frame.evaluate(() => Array.from(document.querySelectorAll("img.duduq-matching-media")).map((img) => ({
    alt: img.getAttribute("alt") || "",
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight
  })));
  assert(images.length === expected, `${id}: esperadas ${expected} imagens carregadas; encontradas ${images.length}.`);
  return images;
}

async function verifyMatchingRender(frame, probe) {
  assert(probe.mechanic === "matching", `${probe.id}: mecânica final não é Matching.`);
  assert(probe.matching?.leftItems?.length === 1, `${probe.id}: Matching precisa de 1 estímulo à esquerda.`);
  assert(probe.matching?.rightItems?.length === 4, `${probe.id}: Matching precisa de 4 alternativas à direita.`);
  assert(probe.matching?.pairs?.length === 1, `${probe.id}: Matching deve preservar 1 relação correta.`);
  assert(probe.matching?.behavior?.allowUnpairedDistractors === true, `${probe.id}: distractors explícitos não estão habilitados.`);

  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const right = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
  assert(await left.count() === 1, `${probe.id}: DOM não possui 1 cartão à esquerda.`);
  assert(await right.count() === 4, `${probe.id}: DOM não possui 4 cartões à direita.`);
  assert(await frame.locator(".duduq-matching-label").count() === 0, `${probe.id}: texto de alternativa foi exposto visualmente.`);

  const leftAudio = await frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-item-audio').count();
  const rightAudio = await frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-item-audio').count();
  const leftImages = await frame.locator('.duduq-matching-column[data-side="left"] img.duduq-matching-media').count();
  const rightImages = await frame.locator('.duduq-matching-column[data-side="right"] img.duduq-matching-media').count();

  let expectedImages = 0;
  if (probe.rule === "matching-image-audio") {
    assert(leftImages === 1 && rightImages === 0, `${probe.id}: image→audio deveria renderizar 1 imagem à esquerda e 0 à direita.`);
    assert(leftAudio === 0 && rightAudio === 4, `${probe.id}: image→audio deveria renderizar 4 controles de áudio à direita.`);
    expectedImages = 1;
  } else if (probe.rule === "matching-audio-image") {
    assert(leftImages === 0 && rightImages === 4, `${probe.id}: audio→image deveria renderizar 4 imagens à direita.`);
    assert(leftAudio === 1 && rightAudio === 0, `${probe.id}: audio→image deveria renderizar 1 controle de áudio à esquerda.`);
    expectedImages = 4;
  } else if (probe.rule === "matching-audio-audio") {
    assert(leftImages === 0 && rightImages === 0, `${probe.id}: audio→audio não deveria renderizar imagens.`);
    assert(leftAudio === 1 && rightAudio === 4, `${probe.id}: audio→audio deveria renderizar 1+4 controles de áudio.`);
    expectedImages = 0;
  } else {
    throw new Error(`${probe.id}: regra Matching inesperada: ${probe.rule}`);
  }

  const audioButtons = frame.locator(".duduq-matching-item-audio");
  for (let index = 0; index < await audioButtons.count(); index += 1) {
    assert(!(await audioButtons.nth(index).isDisabled()), `${probe.id}: controle de áudio ${index} iniciou desabilitado.`);
  }

  const images = await waitForImages(frame, expectedImages, probe.id);
  const geometry = await verifyCardGeometry(frame, probe.id);
  const dimensions = await frame.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
  }));
  assert(dimensions.scroll <= dimensions.viewport + 6, `${probe.id}: overflow horizontal ${dimensions.scroll}px > ${dimensions.viewport}px.`);

  return { leftAudio, rightAudio, leftImages, rightImages, images, geometry };
}

async function writeFailure(page, context, messages, error) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const base = `${context.id}-${context.viewport.name}-${context.viewport.width}x${context.viewport.height}-FAIL`;
  try { await page.screenshot({ path: path.join(OUTPUT_DIR, `${base}.png`), fullPage: true }); } catch (_) {}
  await fs.writeFile(path.join(OUTPUT_DIR, `${base}.json`), JSON.stringify({
    ...context,
    error: error?.stack || error?.message || String(error),
    messages
  }, null, 2));
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
let discoveredCount = 0;

try {
  for (const viewport of VIEWPORTS) {
    for (let module = 1; module <= 6; module += 1) {
      const { page, messages } = await preparePage(browser, viewport);
      try {
        await openModule(page, module);
        const questions = await transformedMatchingQuestions(page, module);
        if (viewport.name === "desktop") discoveredCount += questions.length;

        for (const question of questions) {
          const context = { module, id: question.id, rule: question.rule, viewport };
          const messageStart = messages.length;
          try {
            const probe = await startProbe(page, module, question.id);
            const frame = await matchingFrame(page);
            const render = await verifyMatchingRender(frame, probe);
            const fatalMessages = messages.slice(messageStart).filter((entry) =>
              /pageerror:|Runtime informou erro|Não foi possível iniciar|Integrity gate failed/i.test(entry)
            );
            assert(fatalMessages.length === 0, `${probe.id}: erro de runtime: ${fatalMessages.join(" | ")}`);
            report.push({ ...context, status: "PASS", render });
          } catch (error) {
            await writeFailure(page, context, messages.slice(messageStart), error);
            throw error;
          }
        }
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

assert(discoveredCount === EXPECTED_MATCHING_TRANSFORMS, `Esperados ${EXPECTED_MATCHING_TRANSFORMS} Matchings transformados; encontrados ${discoveredCount}.`);
assert(report.length === EXPECTED_MATCHING_TRANSFORMS * VIEWPORTS.length, `Esperados ${EXPECTED_MATCHING_TRANSFORMS * VIEWPORTS.length} cenários; executados ${report.length}.`);

const summary = {
  status: "PASS",
  transformedMatchingItems: discoveredCount,
  viewportScenarios: report.length,
  cases: report
};
await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

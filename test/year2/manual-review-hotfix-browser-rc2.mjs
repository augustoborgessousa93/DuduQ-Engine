import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/manual-review-rc2");
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];
const EXPECTED_ORIGIN_MATCHING_ITEMS = 34;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function moduleKey(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}
function moduleUrl(module, suffix = "manual-review-rc2") {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=${suffix}`;
}
async function evidence(page, name, data = null) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  try { await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}.png`), fullPage: true }); } catch (_) {}
  if (data) await fs.writeFile(path.join(OUTPUT_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}
async function noHorizontalOverflow(frame, label) {
  const dimensions = await frame.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
  }));
  assert(dimensions.scroll <= dimensions.viewport + 6, `${label}: overflow horizontal ${dimensions.scroll}px > ${dimensions.viewport}px.`);
}
function fatal(messages) {
  return messages.filter((entry) => /pageerror:|runtime informou erro|não foi possível iniciar|integrity gate failed|erro: .*não é compatível/i.test(entry));
}

async function verifyRealIntro(browser, module, viewport) {
  const page = await browser.newPage({ viewport });
  const messages = [];
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  const name = `intro-m${String(module).padStart(2, "0")}-${viewport.name}`;
  try {
    await page.goto(moduleUrl(module, `intro-${viewport.name}`), { waitUntil: "domcontentloaded", timeout: 30_000 });
    const logo = page.locator(".duduq-intro-collection-logo");
    await logo.waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForFunction(() => {
      const img = document.querySelector(".duduq-intro-collection-logo");
      return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    }, null, { timeout: 15_000 });
    const info = await logo.evaluate((img) => ({
      src: img.currentSrc || img.src || "",
      alt: img.getAttribute("alt") || "",
      width: img.naturalWidth,
      height: img.naturalHeight,
      visible: getComputedStyle(img).display !== "none" && getComputedStyle(img).visibility !== "hidden"
    }));
    assert(/Logo%20EduQ%20Play\.png/i.test(info.src), `M${module}: Intro não usa a logo oficial EduQ Play: ${info.src}`);
    assert(info.visible && info.width > 0 && info.height > 0, `M${module}: logo oficial não está visualmente carregada.`);
    const fallback = page.locator(".duduq-intro-collection-name");
    if (await fallback.count()) {
      const hidden = await fallback.first().evaluate((node) => node.hidden || getComputedStyle(node).display === "none");
      assert(hidden, `M${module}: wordmark textual apareceu junto da logo oficial.`);
    }
    const fatalMessages = fatal(messages);
    assert(fatalMessages.length === 0, `M${module}: erro na Intro: ${fatalMessages.join(" | ")}`);
    await evidence(page, name, { module, viewport, logo: info, messages });
    return { module, viewport: viewport.name, logo: info };
  } catch (error) {
    await evidence(page, `${name}-FAIL`, { module, viewport, error: error?.stack || String(error), messages });
    throw error;
  } finally {
    await page.close();
  }
}

async function prepareIsolatedPage(browser, module, viewport) {
  const page = await browser.newPage({ viewport });
  const messages = [];
  await page.route("**/engine/duduq-player-v1.js*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;" });
  });
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  await page.goto(moduleUrl(module, `pairs-${viewport.name}`), { waitUntil: "domcontentloaded", timeout: 30_000 });
  const key = moduleKey(module);
  await page.waitForFunction((expectedKey) => Boolean(
    window.DUDUQ_CONTENT?.english?.year2?.[expectedKey]?.manualReviewHotfix &&
    window.DuduQ?.hasMechanic?.("matching") &&
    window.DuduQ?.hasMechanic?.("drag-drop")
  ), key, { timeout: 30_000 });
  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-manual-review-rc2" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
    document.documentElement.removeAttribute("data-duduq-initial-speech-gate");
  });
  return { page, messages };
}

async function transformedOriginItems(page, module) {
  const key = moduleKey(module);
  return page.evaluate((expectedKey) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    return (built.activities || []).flatMap((activity) => (activity.questions || []).map((question) => ({
      id: question.id,
      rule: question.metadata?.gamificationDiversity?.rule || null,
      mechanic: question.delivery?.mechanic || activity.mechanic,
      pairCount: question.metadata?.matching?.pairs?.length || 0,
      fallback: question.metadata?.manualReviewFallback || null,
      sourceAnswer: question.metadata?.sourceAnswerV23 || null
    }))).filter((entry) => String(entry.rule || "").startsWith("matching-"));
  }, key);
}

async function startProbe(page, module, id) {
  const key = moduleKey(module);
  return page.evaluate(({ expectedKey, expectedId }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    const activity = (built.activities || []).find((entry) => (entry.questions || []).some((question) => question.id === expectedId));
    if (!activity) throw new Error(`${expectedId}: atividade não encontrada.`);
    const source = (activity.questions || []).find((question) => question.id === expectedId);
    const question = JSON.parse(JSON.stringify(source));
    const mechanic = question.delivery?.mechanic || activity.mechanic;
    if (question.metadata?.matching?.behavior) {
      question.metadata.matching.behavior.lockLeftOrder = true;
      question.metadata.matching.behavior.lockRightOrder = true;
      question.metadata.matching.behavior.shuffleLeft = false;
      question.metadata.matching.behavior.shuffleRight = false;
    }
    window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-manual-review-probe" });
    window.DuduQTransition?.hideImmediate?.();
    window.DuduQ.destroy();
    window.DuduQ.start({
      id: `qa-${expectedId}`,
      title: `QA ${expectedId}`,
      year: built.year,
      subject: built.subject,
      module: built.module,
      container: "#root",
      steps: [{
        id: `qa-step-${expectedId}`,
        mechanic,
        payload: { id:`qa-payload-${expectedId}`, title:activity.title || expectedId, subject:built.subject, year:built.year, module:built.module, questions:[question] },
        options: { contentVersion:built.version, skill:activity.skill || null }
      }]
    });
    return {
      id: expectedId,
      mechanic,
      rule: question.metadata?.gamificationDiversity?.rule || null,
      sourceAnswer: question.metadata?.sourceAnswerV23 || null,
      matching: question.metadata?.matching || null,
      fallback: question.metadata?.manualReviewFallback || null,
      alternativeCount: (question.alternatives || []).length
    };
  }, { expectedKey: key, expectedId: id });
}

async function getFrame(page, mechanic) {
  await page.locator("#root iframe").first().waitFor({ state: "attached", timeout: 15_000 });
  const iframe = page.locator("#root iframe").first();
  const title = await iframe.getAttribute("title");
  const expected = mechanic === "matching" ? /Matching/i : /Drag/i;
  assert(expected.test(String(title || "")), `${mechanic}: iframe inesperado: ${title}`);
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, `${mechanic}: iframe inacessível.`);
  await frame.waitForFunction(() => Boolean(document.body?.children.length), null, { timeout: 20_000 });
  const runtimeError = await frame.locator("#duduq-runtime-error").count()
    ? await frame.locator("#duduq-runtime-error").first().innerText().catch(() => "")
    : "";
  assert(!runtimeError, `${mechanic}: runtime error: ${runtimeError}`);
  return frame;
}

async function verifyMatching(page, frame, probe) {
  const config = probe.matching || {};
  const n = config.pairs?.length || 0;
  assert(n >= 2, `${probe.id}: Matching final tem menos de 2 pares.`);
  assert(config.leftItems?.length === n && config.rightItems?.length === n, `${probe.id}: Matching não é NxN.`);
  assert(probe.alternativeCount === n, `${probe.id}: alternativas não correspondem aos pares.`);
  assert(config.behavior?.allowUnpairedDistractors !== true, `${probe.id}: distratores soltos continuam habilitados.`);

  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });
  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const right = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
  assert(await left.count() === n, `${probe.id}: DOM esquerdo ${await left.count()} != ${n}.`);
  assert(await right.count() === n, `${probe.id}: DOM direito ${await right.count()} != ${n}.`);
  assert(await frame.locator(".duduq-matching-label").count() === 0, `${probe.id}: texto inglês apareceu antes da resposta.`);
  assert(await frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-item-audio').count() === n, `${probe.id}: cada par deve ter um áudio à esquerda.`);
  assert(await frame.locator('.duduq-matching-column[data-side="right"] img.duduq-matching-media').count() === n, `${probe.id}: cada par deve ter uma imagem à direita.`);

  await frame.waitForFunction((expected) => {
    const images = Array.from(document.querySelectorAll('.duduq-matching-column[data-side="right"] img.duduq-matching-media'));
    const cards = Array.from(document.querySelectorAll('.duduq-matching-card'));
    return images.length === expected && images.every((img) => img.complete && img.naturalWidth > 0) && cards.length === expected * 2 && cards.every((card) => !card.disabled);
  }, n, { timeout: 8_000 });

  const imageInfo = await right.evaluateAll((cards) => cards.map((card) => {
    const img = card.querySelector("img.duduq-matching-media");
    return { src: img?.currentSrc || img?.src || "", alt: img?.getAttribute("alt") || "", width: img?.naturalWidth || 0, height: img?.naturalHeight || 0 };
  }));
  assert(imageInfo.every((entry) => entry.src && entry.width > 0 && entry.height > 0), `${probe.id}: imagem de Matching ausente/quebrada.`);
  assert(imageInfo.every((entry) => !/Imagem%20generica\.svg/i.test(entry.src)), `${probe.id}: imagem genérica usada no Matching.`);

  for (let index = 0; index < n; index += 1) {
    await left.nth(index).click();
    await right.nth(index).click();
  }
  const confirm = frame.locator(".duduq-matching-primary");
  assert(await confirm.count() === 1, `${probe.id}: CONFIRMAR ausente.`);
  assert(!(await confirm.isDisabled()), `${probe.id}: CONFIRMAR não habilitou após ${n} pares.`);
  await confirm.click();
  await page.waitForFunction(() => window.DuduQ?.getSession?.()?.completed === true, null, { timeout: 8_000 });
  const session = await page.evaluate(() => window.DuduQ?.getSession?.() || null);
  assert(session?.results?.length === 1, `${probe.id}: pareamento correto não concluiu.`);
  await noHorizontalOverflow(frame, probe.id);
  return { pairCount:n, images:imageInfo };
}

async function verifyFallback(frame, probe) {
  assert(probe.mechanic === "drag-drop", `${probe.id}: fallback deveria ser Drag & Drop.`);
  assert(probe.fallback?.from === "matching" && probe.fallback?.to === "drag-drop", `${probe.id}: metadado de fallback inválido.`);
  await frame.locator(".duduq-dd2-item").first().waitFor({ state: "visible", timeout: 20_000 });
  const itemCount = await frame.locator(".duduq-dd2-item").count();
  const targetCount = await frame.locator(".duduq-dd2-target").count();
  assert(itemCount >= 2, `${probe.id}: fallback não preservou alternativas.`);
  assert(targetCount === 1, `${probe.id}: fallback deve ter um único destino de escolha.`);
  const audioItemCount = await frame.locator('.duduq-dd2-item[data-has-audio="true"]').count();
  assert(audioItemCount === itemCount, `${probe.id}: todas as alternativas do fallback precisam de áudio (${audioItemCount}/${itemCount}).`);
  const geometry = await frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-dd2-item")).map((item) => {
    const rect = item.getBoundingClientRect();
    const style = getComputedStyle(item);
    return { width:rect.width, height:rect.height, visible:style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > .5 };
  }));
  assert(geometry.every((item) => item.visible && item.width >= 44 && item.height >= 44), `${probe.id}: fallback possui card invisível/pequeno.`);
  await noHorizontalOverflow(frame, probe.id);
  return { itemCount, targetCount, audioItemCount, geometry };
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const introReport = [];
const cases = [];
let discoveredDesktop = 0;

try {
  // A Intro é testada com o player real para comprovar que a logo chega à tela,
  // não apenas aos metadados do módulo.
  for (const viewport of VIEWPORTS) {
    for (let module = 1; module <= 6; module += 1) {
      introReport.push(await verifyRealIntro(browser, module, viewport));
    }
  }

  for (const viewport of VIEWPORTS) {
    for (let module = 1; module <= 6; module += 1) {
      const { page, messages } = await prepareIsolatedPage(browser, module, viewport);
      try {
        const originItems = await transformedOriginItems(page, module);
        if (viewport.name === "desktop") discoveredDesktop += originItems.length;
        for (const item of originItems) {
          const messageStart = messages.length;
          const name = `${item.id}-${viewport.name}`;
          let probe = null;
          try {
            probe = await startProbe(page, module, item.id);
            assert(["matching", "drag-drop"].includes(probe.mechanic), `${probe.id}: mecânica final inesperada ${probe.mechanic}.`);
            const frame = await getFrame(page, probe.mechanic);
            const render = probe.mechanic === "matching"
              ? await verifyMatching(page, frame, probe)
              : await verifyFallback(frame, probe);
            const fatalMessages = fatal(messages.slice(messageStart));
            assert(fatalMessages.length === 0, `${probe.id}: erro de runtime: ${fatalMessages.join(" | ")}`);
            if (viewport.name === "desktop") await evidence(page, name, { module, viewport, probe:{ id:probe.id, mechanic:probe.mechanic, rule:probe.rule, sourceAnswer:probe.sourceAnswer }, render, messages:fatalMessages });
            cases.push({ module, viewport:viewport.name, id:probe.id, mechanic:probe.mechanic, rule:probe.rule, render });
          } catch (error) {
            await evidence(page, `${name}-FAIL`, { module, viewport, probe, error:error?.stack || String(error), messages:messages.slice(messageStart) });
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

assert(discoveredDesktop === EXPECTED_ORIGIN_MATCHING_ITEMS, `Esperados ${EXPECTED_ORIGIN_MATCHING_ITEMS} itens de origem Matching; encontrados ${discoveredDesktop}.`);
assert(cases.length === EXPECTED_ORIGIN_MATCHING_ITEMS * VIEWPORTS.length, `Esperados ${EXPECTED_ORIGIN_MATCHING_ITEMS * VIEWPORTS.length} cenários Matching/fallback; executados ${cases.length}.`);
const finalMatching = cases.filter((entry) => entry.mechanic === "matching");
const finalFallback = cases.filter((entry) => entry.mechanic === "drag-drop");
assert(finalMatching.length > 0 && finalFallback.length > 0, "RC2 precisa exercitar Matchings finais e fallbacks reais.");

const summary = {
  status:"PASS",
  contract:"VARIABLE_COMPLETE_MATCHING_PAIRS",
  introScenarios:introReport.length,
  originMatchingItems:discoveredDesktop,
  viewportScenarios:cases.length,
  finalMatchingScenarios:finalMatching.length,
  fallbackScenarios:finalFallback.length,
  pairCounts: finalMatching.reduce((acc, entry) => {
    const n = entry.render.pairCount;
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {}),
  intro:introReport,
  cases
};
await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

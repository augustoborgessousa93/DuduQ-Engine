import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mm(module) {
  return String(module).padStart(2, "0");
}

function key(module) {
  return `module${mm(module)}v23multimodal`;
}

async function preparePage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  await page.route("**/engine/duduq-player-v1.js*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;" });
  });
  return page;
}

async function openModule(page, module) {
  const moduleKey = key(module);
  await page.goto(`${BASE_URL}/content/english/year-2/module-${mm(module)}/index.html?qa=matching-rc2`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction((expectedKey) => Boolean(window.DUDUQ_CONTENT?.english?.year2?.[expectedKey] && window.DuduQ), moduleKey, { timeout: 30_000 });
  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-matching-rc2" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
  });
}

async function matchingIds(page, module) {
  const moduleKey = key(module);
  return page.evaluate((expectedKey) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    return (built.activities || []).flatMap((activity) =>
      (activity.questions || [])
        .filter((question) => (question.delivery?.mechanic || activity.mechanic) === "matching")
        .map((question) => question.id)
    );
  }, moduleKey);
}

async function startProbe(page, module, questionId) {
  const moduleKey = key(module);
  return page.evaluate(({ expectedKey, expectedId }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    const activity = (built.activities || []).find((entry) => (entry.questions || []).some((question) => question.id === expectedId));
    const question = JSON.parse(JSON.stringify((activity.questions || []).find((entry) => entry.id === expectedId)));
    const matching = question.metadata?.matching || {};
    window.DuduQ.destroy();
    window.DuduQ.start({
      id: `qa-${expectedId}-module`,
      title: `QA ${expectedId}`,
      year: built.year,
      subject: built.subject,
      module: built.module,
      container: "#root",
      steps: [{
        id: `qa-${expectedId}`,
        mechanic: "matching",
        payload: { id: `qa-${expectedId}-payload`, title: activity.title || expectedId, subject: built.subject, year: built.year, module: built.module, questions: [question] },
        options: { contentVersion: built.version, skill: activity.skill || null }
      }]
    });
    return {
      id: expectedId,
      pairs: Array.isArray(matching.pairs) ? matching.pairs : [],
      leftItems: Array.isArray(matching.leftItems) ? matching.leftItems : [],
      rightItems: Array.isArray(matching.rightItems) ? matching.rightItems : [],
      assets: matching.assets || {},
      sourceCorrectIncluded: question.metadata?.manualReviewMatching?.sourceCorrectIncluded === true
    };
  }, { expectedKey: moduleKey, expectedId: questionId });
}

async function validateRendered(page, probe, viewportName) {
  const n = probe.pairs.length;
  assert(n >= 2, `${probe.id}/${viewportName}: precisa de >=2 pares.`);
  assert(probe.leftItems.length === n && probe.rightItems.length === n, `${probe.id}/${viewportName}: metadata não é NxN.`);
  assert(probe.sourceCorrectIncluded, `${probe.id}/${viewportName}: conceito correto original não está nos pares.`);
  for (const item of probe.leftItems) assert(String(item?.spokenText || "").trim(), `${probe.id}/${viewportName}: áudio vazio.`);
  for (const item of probe.rightItems) assert(item?.imageAssetKey && probe.assets[item.imageAssetKey], `${probe.id}/${viewportName}: imagem sem asset.`);

  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 20_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle.contentFrame();
  assert(frame, `${probe.id}/${viewportName}: iframe inacessível.`);
  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });

  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const right = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
  const rightLabels = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-label');
  assert(await left.count() === n, `${probe.id}/${viewportName}: renderizou ${await left.count()} áudios, esperado ${n}.`);
  assert(await right.count() === n, `${probe.id}/${viewportName}: renderizou ${await right.count()} respostas, esperado ${n}.`);
  assert(await rightLabels.count() === 0, `${probe.id}/${viewportName}: texto inglês pré-resposta exposto.`);

  const imgCount = await right.locator("img").count();
  assert(imgCount === n, `${probe.id}/${viewportName}: esperado ${n} imagens; renderizou ${imgCount}.`);
  const dims = await frame.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) }));
  assert(dims.scroll <= dims.viewport + 6, `${probe.id}/${viewportName}: overflow horizontal ${dims.scroll} > ${dims.viewport}.`);

  const leftIds = probe.leftItems.map((item) => item.id);
  const rightIds = probe.rightItems.map((item) => item.id);
  const usedLeft = probe.pairs.map((pair) => pair.leftId);
  const usedRight = probe.pairs.map((pair) => pair.rightId);
  assert(new Set(usedLeft).size === n && new Set(usedRight).size === n, `${probe.id}/${viewportName}: relação não é 1↔1.`);
  assert(leftIds.every((id) => usedLeft.includes(id)) && rightIds.every((id) => usedRight.includes(id)), `${probe.id}/${viewportName}: existe item sem par.`);
}

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];
const cases = [];

try {
  for (const viewport of viewports) {
    for (let module = 1; module <= 6; module += 1) {
      const page = await preparePage(browser, viewport);
      try {
        await openModule(page, module);
        const ids = await matchingIds(page, module);
        for (const id of ids) {
          const probe = await startProbe(page, module, id);
          await validateRendered(page, probe, viewport.name);
          cases.push({ module, id, viewport: viewport.name, pairs: probe.pairs.length });
        }
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

assert(cases.length > 0, "Nenhum Matching final foi encontrado.");
console.log(JSON.stringify({ status: "PASS", contract: "VARIABLE_COMPLETE_MATCHING_PAIRS", scenarios: cases.length, cases }, null, 2));

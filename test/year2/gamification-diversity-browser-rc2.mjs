import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function moduleKey(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}

function moduleUrl(module) {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=manual-review-rc2`;
}

async function prepare(browser, viewport) {
  const page = await browser.newPage({ viewport });
  await page.route("**/engine/duduq-player-v1.js*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;" });
  });
  return page;
}

async function openModule(page, module) {
  const key = moduleKey(module);
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction((expectedKey) => Boolean(window.DUDUQ_CONTENT?.english?.year2?.[expectedKey] && window.DuduQ), key, { timeout: 30_000 });
  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-rc2" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
  });
}

async function startFirstMechanic(page, module, mechanic) {
  const key = moduleKey(module);
  return page.evaluate(({ expectedKey, mechanicId }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    const activity = (built.activities || []).find((entry) => entry.mechanic === mechanicId && (entry.questions || []).length);
    if (!activity) return null;
    const question = JSON.parse(JSON.stringify(activity.questions[0]));
    window.DuduQ.destroy();
    const step = {
      id: `qa-${question.id}`,
      mechanic: mechanicId,
      payload: {
        id: `qa-${question.id}-payload`,
        title: activity.title || question.id,
        subject: built.subject,
        year: built.year,
        module: built.module,
        questions: [question]
      },
      options: { contentVersion: built.version, skill: activity.skill || null }
    };
    window.DuduQ.start({
      id: `qa-${question.id}-module`,
      title: `QA ${question.id}`,
      year: built.year,
      subject: built.subject,
      module: built.module,
      container: "#root",
      steps: [step]
    });
    return {
      id: question.id,
      mechanic: mechanicId,
      matching: question.metadata?.matching || null,
      introLogo: built.intro?.collectionLogo || "",
      hotfix: built.manualReviewHotfix || null
    };
  }, { expectedKey: key, mechanicId: mechanic });
}

async function frameFor(page, mechanic) {
  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 20_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle.contentFrame();
  assert(frame, `${mechanic}: iframe inacessível.`);
  await frame.waitForFunction(() => Boolean(document.body && document.body.children.length), null, { timeout: 20_000 });
  const runtimeError = await frame.locator("#duduq-runtime-error").count()
    ? await frame.locator("#duduq-runtime-error").first().innerText().catch(() => "")
    : "";
  assert(!runtimeError, `${mechanic}: runtime error: ${runtimeError}`);
  const dims = await frame.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
  }));
  assert(dims.scroll <= dims.viewport + 6, `${mechanic}: overflow horizontal ${dims.scroll} > ${dims.viewport}.`);
  return frame;
}

async function validateMatching(frame, probe) {
  const matching = probe.matching || {};
  const expected = Array.isArray(matching.pairs) ? matching.pairs.length : 0;
  assert(expected >= 2, `${probe.id}: Matching precisa de pelo menos 2 pares completos.`);
  assert((matching.leftItems || []).length === expected, `${probe.id}: metadata leftItems != pares.`);
  assert((matching.rightItems || []).length === expected, `${probe.id}: metadata rightItems != pares.`);

  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });
  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const right = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
  const labels = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-label');
  assert(await left.count() === expected, `${probe.id}: esperado ${expected} áudios; renderizou ${await left.count()}.`);
  assert(await right.count() === expected, `${probe.id}: esperado ${expected} respostas; renderizou ${await right.count()}.`);
  assert(await labels.count() === 0, `${probe.id}: texto inglês foi exposto antes da resposta.`);

  const leftIds = (matching.leftItems || []).map((item) => item.id);
  const rightIds = (matching.rightItems || []).map((item) => item.id);
  const pairLeft = (matching.pairs || []).map((pair) => pair.leftId);
  const pairRight = (matching.pairs || []).map((pair) => pair.rightId);
  assert(new Set(pairLeft).size === expected && new Set(pairRight).size === expected, `${probe.id}: pares não são 1↔1.`);
  assert(leftIds.every((id) => pairLeft.includes(id)), `${probe.id}: áudio sem par.`);
  assert(rightIds.every((id) => pairRight.includes(id)), `${probe.id}: resposta sem par.`);
}

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

const report = [];
try {
  for (const viewport of viewports) {
    for (const mechanic of ["matching", "bubble-pop", "target-shooter"]) {
      let validated = false;
      for (let module = 1; module <= 6 && !validated; module += 1) {
        const page = await prepare(browser, viewport);
        try {
          await openModule(page, module);
          const probe = await startFirstMechanic(page, module, mechanic);
          if (!probe) continue;
          assert(String(probe.introLogo).includes("Logo%20EduQ%20Play.png"), `M${module}: logo oficial EduQ Play ausente.`);
          const frame = await frameFor(page, mechanic);
          if (mechanic === "matching") await validateMatching(frame, probe);
          report.push({ viewport: viewport.name, module, id: probe.id, mechanic, pairs: probe.matching?.pairs?.length || null });
          validated = true;
        } finally {
          await page.close();
        }
      }
      assert(validated, `${viewport.name}: nenhuma atividade ${mechanic} pôde ser homologada.`);
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ status: "PASS", contract: "VARIABLE_COMPLETE_MATCHING_PAIRS", report }, null, 2));

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-public-entry-visual-ready-rc2");
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
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=public-entry-visual-ready-rc2`;
}

function hasEmoji(value) {
  return /\p{Extended_Pictographic}/u.test(String(value || ""));
}

async function bootPublicModule(page, module) {
  const key = moduleKey(module);
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: 30_000 });

  await page.waitForFunction(({ expectedKey, expectedModule }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    return Boolean(built?.module === expectedModule && built?.activities?.length && window.DuduQIntro && window.DuduQ);
  }, { expectedKey: key, expectedModule: module }, { timeout: 30_000 });

  const startMission = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
  const alreadyStarted = await page.evaluate((expectedModule) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === expectedModule && session?.totalSteps > 0);
  }, module);

  if (!alreadyStarted) {
    await startMission.waitFor({ state: "visible", timeout: 25_000 });
    await startMission.click();
  }

  await page.waitForFunction((expectedModule) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === expectedModule && session?.totalSteps > 0 && session?.stepIndex === 0);
  }, module, { timeout: 30_000 });

  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 20_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, `M${module}: iframe inacessível.`);

  const model = await page.evaluate((expectedKey) => {
    const built = window.DUDUQ_CONTENT.english.year2[expectedKey];
    const first = built.activities[0];
    return {
      mechanic: first.mechanic,
      questions: (built.activities || []).flatMap((activity) => activity.questions || []).length,
      activities: built.activities.length
    };
  }, key);

  return { iframe, frame, model };
}

async function waitForActualMechanic(page, iframe, frame, module, mechanic) {
  const selectors = {
    "drag-drop": ".duduq-dd2-item",
    "bubble-pop": ".duduq-bp-media",
    matching: ".duduq-matching-card",
    "target-shooter": ".duduq-ts-target",
    "word-slash": ".duduq-ws-object",
    "memory-quest": "button, [role='button']",
    "smart-sentence": "button, [role='button']"
  };
  const selector = selectors[mechanic];
  assert(selector, `M${module}: mecânica sem probe visual: ${mechanic}.`);

  await frame.locator(selector).first().waitFor({ state: "visible", timeout: 25_000 });

  // O smoke antigo aceitava o placeholder "Preparando..." como conteúdo válido.
  // Este gate exige o runtime real e também espera o handoff visual do host terminar.
  await frame.waitForFunction(() => {
    const text = String(document.body?.innerText || "").trim();
    return text.length > 0 && !/^Preparando\b/i.test(text);
  }, null, { timeout: 25_000 });

  await page.waitForFunction(() => {
    const frameNode = document.querySelector("#root iframe");
    if (!frameNode) return false;
    const rect = frameNode.getBoundingClientRect();
    const style = getComputedStyle(frameNode);
    return rect.width > 100 && rect.height > 100 && style.display !== "none" &&
      style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > .85;
  }, null, { timeout: 20_000 });

  await page.waitForTimeout(350);

  const runtime = await frame.evaluate(({ mechanic, selector }) => {
    const nodes = Array.from(document.querySelectorAll(selector));
    const visible = nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 20 && rect.height > 20 && style.display !== "none" &&
        style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > .2;
    });
    const error = document.querySelector("#duduq-runtime-error");
    const heading = String(document.querySelector("h2")?.innerText || "").trim();
    const doc = document.documentElement;
    return {
      mechanic,
      heading,
      visibleCount: visible.length,
      bodyText: String(document.body?.innerText || "").slice(0, 1000),
      runtimeError: error && getComputedStyle(error).display !== "none" ? String(error.textContent || "").trim() : "",
      viewport: doc.clientWidth,
      scroll: Math.max(doc.scrollWidth, document.body?.scrollWidth || 0),
      bubbleImages: mechanic === "bubble-pop" ? nodes.map((node) => ({
        src: node.currentSrc || node.src || "",
        complete: Boolean(node.complete),
        naturalWidth: Number(node.naturalWidth || 0),
        naturalHeight: Number(node.naturalHeight || 0),
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height
      })) : []
    };
  }, { mechanic, selector });

  assert(!runtime.runtimeError, `M${module}: runtime error: ${runtime.runtimeError}`);
  assert(runtime.visibleCount > 0, `M${module}: ${mechanic} sem conteúdo interativo visível.`);
  assert(!/^Preparando\b/i.test(runtime.bodyText.trim()), `M${module}: screenshot ainda seria capturado no placeholder de boot.`);
  assert(!hasEmoji(runtime.heading), `M${module}: emoji/ícone decorativo permanece junto ao enunciado: ${runtime.heading}`);
  assert(runtime.scroll <= runtime.viewport + 6, `M${module}: overflow horizontal ${runtime.scroll} > ${runtime.viewport}.`);

  if (mechanic === "bubble-pop") {
    assert(runtime.bubbleImages.length >= 2, `M${module}: Bubble Pop sem imagens suficientes.`);
    assert(runtime.bubbleImages.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
      `M${module}: Bubble Pop possui imagem não carregada dentro de bolha.`);
    assert(runtime.bubbleImages.every((image) => image.width > 20 && image.height > 20),
      `M${module}: Bubble Pop possui imagem carregada, porém invisível/pequena.`);
    const identities = runtime.bubbleImages.map((image) => image.src);
    assert(new Set(identities).size === identities.length, `M${module}: Bubble Pop contém imagem repetida no primeiro round.`);
  }

  return runtime;
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    for (let module = 1; module <= 6; module += 1) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      page.setDefaultTimeout(25_000);
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      try {
        const { iframe, frame, model } = await bootPublicModule(page, module);
        assert(model.questions === 15, `M${module}: esperado 15 itens, obtido ${model.questions}.`);
        const runtime = await waitForActualMechanic(page, iframe, frame, module, model.mechanic);
        assert(pageErrors.length === 0, `M${module}: page errors: ${pageErrors.join(" | ")}`);

        const screenshot = path.join(
          OUTPUT_DIR,
          `M${String(module).padStart(2, "0")}-${viewport.name}-${model.mechanic}.png`
        );
        await page.screenshot({ path: screenshot, fullPage: false, timeout: 10_000 });
        report.push({ module, viewport, model, runtime, screenshot });
      } catch (error) {
        const failBase = `M${String(module).padStart(2, "0")}-${viewport.name}-FAIL`;
        try { await page.screenshot({ path: path.join(OUTPUT_DIR, `${failBase}.png`), fullPage: false }); } catch (_) {}
        await fs.writeFile(path.join(OUTPUT_DIR, `${failBase}.json`), JSON.stringify({
          module, viewport, pageErrors, error: error?.stack || String(error)
        }, null, 2));
        throw error;
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

assert(report.length === 12, `Esperados 12 cenários públicos reais; executados ${report.length}.`);
const summary = {
  status: "PASS",
  contract: "PUBLIC_ENTRY_ACTUAL_MECHANIC_VISIBILITY",
  scenarios: report.length,
  modules: 6,
  viewports: VIEWPORTS.map((entry) => entry.name),
  cases: report
};
await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  status: summary.status,
  contract: summary.contract,
  scenarios: summary.scenarios,
  cases: report.map((entry) => ({
    module: entry.module,
    viewport: entry.viewport.name,
    mechanic: entry.model.mechanic,
    visibleCount: entry.runtime.visibleCount,
    bubbleImages: entry.runtime.bubbleImages.length
  }))
}, null, 2));

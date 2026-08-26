import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "https://duduq-engine.pages.dev";
const OUTPUT_DIR = path.resolve("test-results/year2-live-production");
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];
const REMOTE_TIMEOUT = 60_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function moduleKey(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}

function moduleUrl(module) {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=live-production`;
}

function mechanicTitlePattern(mechanic) {
  const patterns = {
    matching: /Matching/i,
    "bubble-pop": /Bubble Pop/i,
    "target-shooter": /Target Shooter/i,
    "drag-drop": /Drag\s*&?\s*Drop|Drag Drop/i,
    "word-slash": /Word Slash/i,
    "memory-quest": /Memory Quest/i,
    "smart-sentence": /Smart Sentence/i
  };
  return patterns[mechanic] || new RegExp(String(mechanic || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

async function waitForPublicModule(page, module) {
  const key = moduleKey(module);
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: REMOTE_TIMEOUT });

  await page.waitForFunction(
    ({ expectedKey, expectedModule }) => {
      const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
      return Boolean(
        built?.gamificationDiversityAudit &&
        built?.module === expectedModule &&
        window.DUDUQ_GAME_CONFIG &&
        window.DUDUQ_PUBLIC_ENTRY
      );
    },
    { expectedKey: key, expectedModule: module },
    { timeout: REMOTE_TIMEOUT }
  );

  const alreadyStarted = await page.evaluate((expectedModule) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session && session.module === expectedModule && session.totalSteps > 0);
  }, module);

  if (!alreadyStarted) {
    const startMission = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
    await startMission.waitFor({ state: "visible", timeout: REMOTE_TIMEOUT });
    await startMission.click();
  }

  await page.waitForFunction(
    (expectedModule) => {
      const session = window.DuduQ?.getSession?.();
      return Boolean(session && session.module === expectedModule && session.totalSteps > 0);
    },
    module,
    { timeout: REMOTE_TIMEOUT }
  );

  await page.locator("#root iframe").first().waitFor({ state: "attached", timeout: REMOTE_TIMEOUT });
}

async function inspectPublicModule(page, module) {
  const key = moduleKey(module);
  const snapshot = await page.evaluate(({ expectedKey, expectedModule }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    const session = window.DuduQ?.getSession?.() || null;
    const activities = Array.isArray(built?.activities) ? built.activities : [];
    const questionIds = activities.flatMap((activity) =>
      (Array.isArray(activity.questions) ? activity.questions : []).map((question) => question.id)
    );
    const mechanics = activities.map((activity) => activity.mechanic);
    const root = document.querySelector("#root");
    const doc = document.documentElement;
    return {
      year: built?.year || null,
      module: built?.module || null,
      activities: activities.length,
      questions: questionIds.length,
      questionIds,
      mechanics,
      firstMechanic: mechanics[0] || null,
      audit: built?.gamificationDiversityAudit || null,
      gameConfig: window.DUDUQ_GAME_CONFIG || null,
      publicEntry: window.DUDUQ_PUBLIC_ENTRY || null,
      session,
      rootText: String(root?.innerText || "").slice(0, 1600),
      hostViewport: doc.clientWidth,
      hostScroll: Math.max(doc.scrollWidth, document.body?.scrollWidth || 0),
      expectedModule
    };
  }, { expectedKey: key, expectedModule: module });

  assert(snapshot.year === 2, `M${module}: ano inesperado ${snapshot.year}.`);
  assert(snapshot.module === module, `M${module}: módulo inesperado ${snapshot.module}.`);
  assert(snapshot.questions === 15, `M${module}: esperado banco de 15 questões; encontrado ${snapshot.questions}.`);
  assert(snapshot.questionIds.length === new Set(snapshot.questionIds).size, `M${module}: IDs duplicados.`);
  assert(snapshot.activities > 0, `M${module}: nenhuma atividade encontrada.`);
  assert(snapshot.activities <= snapshot.questions, `M${module}: mais atividades que questões.`);
  assert(snapshot.session?.totalSteps === snapshot.activities, `M${module}: Host iniciou ${snapshot.session?.totalSteps} etapas para ${snapshot.activities} atividades.`);
  assert(snapshot.session?.stepIndex === 0, `M${module}: não iniciou na primeira etapa.`);
  assert(snapshot.session?.completed !== true, `M${module}: apareceu concluído no carregamento inicial.`);
  assert(snapshot.session?.year === 2 && snapshot.session?.module === module, `M${module}: sessão divergente.`);
  assert(snapshot.publicEntry?.englishReadingRequired === false, `M${module}: perdeu a regra de não exigir leitura autônoma em inglês.`);
  assert(snapshot.publicEntry?.sourceVersion === "2.3", `M${module}: sourceVersion inesperada ${snapshot.publicEntry?.sourceVersion}.`);
  assert(snapshot.gameConfig?.channel === "canary-v1", `M${module}: canal inesperado ${snapshot.gameConfig?.channel}.`);
  assert(snapshot.audit, `M${module}: auditoria de diversidade ausente.`);
  assert(!/Erro:|Erro ao carregar|não foi carregado|não possui atividades/i.test(snapshot.rootText), `M${module}: shell exibiu erro.`);
  assert(snapshot.hostScroll <= snapshot.hostViewport + 6, `M${module}: overflow horizontal no shell.`);

  return snapshot;
}

async function inspectFirstMechanic(page, module, snapshot) {
  const iframe = page.locator("#root iframe").first();
  const title = await iframe.getAttribute("title");
  assert(mechanicTitlePattern(snapshot.firstMechanic).test(String(title || "")), `M${module}: iframe ${title} não corresponde a ${snapshot.firstMechanic}.`);

  // Em produção remota, o iframe pode navegar/recarregar enquanto assets CDN são resolvidos.
  // Inspecionar sempre o contentDocument atual evita prender o teste a um Frame antigo.
  await page.waitForFunction(() => {
    const iframeEl = document.querySelector("#root iframe");
    const doc = iframeEl?.contentDocument;
    if (!doc) return false;
    const error = doc.querySelector("#duduq-runtime-error");
    if (error && doc.defaultView?.getComputedStyle(error).display !== "none") return true;
    const text = String(doc.body?.innerText || "").trim();
    return Boolean(doc.body && doc.body.children.length > 0 && text.length > 0);
  }, null, { timeout: REMOTE_TIMEOUT });

  const runtime = await page.evaluate(() => {
    const iframeEl = document.querySelector("#root iframe");
    const doc = iframeEl?.contentDocument;
    if (!doc) return { inaccessible: true, runtimeError: "", bodyText: "", viewport: 0, scroll: 0 };
    const error = doc.querySelector("#duduq-runtime-error");
    const win = doc.defaultView;
    const html = doc.documentElement;
    return {
      inaccessible: false,
      runtimeError: error && win?.getComputedStyle(error).display !== "none" ? String(error.textContent || "") : "",
      bodyText: String(doc.body?.innerText || "").slice(0, 1800),
      viewport: html?.clientWidth || 0,
      scroll: Math.max(html?.scrollWidth || 0, doc.body?.scrollWidth || 0)
    };
  });

  assert(!runtime.inaccessible, `M${module}: iframe inacessível pelo documento pai.`);
  assert(!runtime.runtimeError, `M${module}: runtime falhou: ${runtime.runtimeError}`);
  assert(runtime.bodyText.trim().length > 0, `M${module}: primeira mecânica sem conteúdo observável.`);
  assert(runtime.scroll <= runtime.viewport + 6, `M${module}: primeira mecânica com overflow horizontal ${runtime.scroll}px > ${runtime.viewport}px.`);
  return { iframeTitle: title, ...runtime };
}

async function runScenario(browser, module, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const messages = [];
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

  try {
    await waitForPublicModule(page, module);
    const snapshot = await inspectPublicModule(page, module);
    const firstMechanic = await inspectFirstMechanic(page, module, snapshot);
    const fatalMessages = messages.filter((entry) => /pageerror:|Runtime informou erro|Não foi possível iniciar|Integrity gate failed|Atividade incompatível/i.test(entry));
    assert(fatalMessages.length === 0, `M${module}: erros fatais: ${fatalMessages.join(" | ")}`);

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const file = `M${String(module).padStart(2, "0")}-${viewport.name}-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: path.join(OUTPUT_DIR, file), fullPage: true });
    return {
      module,
      viewport,
      status: "PASS",
      activities: snapshot.activities,
      questions: snapshot.questions,
      firstMechanic: snapshot.firstMechanic,
      firstMechanicRuntime: firstMechanic.iframeTitle
    };
  } catch (error) {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const base = `M${String(module).padStart(2, "0")}-${viewport.name}-${viewport.width}x${viewport.height}-FAIL`;
    try { await page.screenshot({ path: path.join(OUTPUT_DIR, `${base}.png`), fullPage: true }); } catch (_) {}
    await fs.writeFile(path.join(OUTPUT_DIR, `${base}.json`), JSON.stringify({ module, viewport, error: error?.stack || String(error), messages }, null, 2));
    throw error;
  } finally {
    await page.close();
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const cases = [];
try {
  for (const viewport of VIEWPORTS) {
    for (let module = 1; module <= 6; module += 1) {
      cases.push(await runScenario(browser, module, viewport));
    }
  }
} finally {
  await browser.close();
}

const report = {
  status: "PASS",
  baseUrl: BASE_URL,
  modules: 6,
  viewportScenarios: cases.length,
  totalQuestionChecks: cases.reduce((sum, entry) => sum + entry.questions, 0),
  cases
};
await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

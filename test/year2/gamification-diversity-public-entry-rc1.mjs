import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/public-entry");
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
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=public-entry-rc1`;
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
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: 30_000 });

  // Primeiro valida que o entrypoint público carregou conteúdo/configuração. O Host só
  // cria a sessão depois do CTA real da Intro em builds que usam o handoff interativo.
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
    { timeout: 30_000 }
  );

  const alreadyStarted = await page.evaluate((expectedModule) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session && session.module === expectedModule && session.totalSteps > 0);
  }, module);

  if (!alreadyStarted) {
    const startMission = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
    await startMission.waitFor({ state: "visible", timeout: 20_000 });
    await startMission.click();
  }

  await page.waitForFunction(
    (expectedModule) => {
      const session = window.DuduQ?.getSession?.();
      return Boolean(session && session.module === expectedModule && session.totalSteps > 0);
    },
    module,
    { timeout: 30_000 }
  );

  await page.locator("#root iframe").first().waitFor({ state: "attached", timeout: 20_000 });
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
      moduleId: built?.id || null,
      version: built?.version || null,
      year: built?.year || null,
      module: built?.module || null,
      subject: built?.subject || null,
      activities: activities.length,
      questions: questionIds.length,
      questionIds,
      mechanics,
      firstMechanic: mechanics[0] || null,
      audit: built?.gamificationDiversityAudit || null,
      gameConfig: {
        modulePath: window.DUDUQ_GAME_CONFIG?.modulePath || null,
        channel: window.DUDUQ_GAME_CONFIG?.channel || null
      },
      publicEntry: window.DUDUQ_PUBLIC_ENTRY || null,
      session,
      rootText: String(root?.innerText || "").slice(0, 1200),
      hostViewport: doc.clientWidth,
      hostScroll: Math.max(doc.scrollWidth, document.body?.scrollWidth || 0),
      expectedModule
    };
  }, { expectedKey: key, expectedModule: module });

  assert(snapshot.year === 2, `M${module}: ano público inesperado ${snapshot.year}.`);
  assert(snapshot.module === module, `M${module}: módulo publicado inesperado ${snapshot.module}.`);
  assert(snapshot.questions === 15, `M${module}: esperado banco público de 15 questões; encontrado ${snapshot.questions}.`);
  assert(snapshot.questionIds.length === new Set(snapshot.questionIds).size, `M${module}: IDs duplicados no entrypoint público.`);
  assert(snapshot.activities > 0, `M${module}: nenhuma atividade pública encontrada.`);
  assert(snapshot.session?.totalSteps === snapshot.activities, `M${module}: Host iniciou ${snapshot.session?.totalSteps} etapas para ${snapshot.activities} atividades.`);
  assert(snapshot.session?.stepIndex === 0, `M${module}: entrypoint não iniciou na primeira etapa.`);
  assert(snapshot.session?.completed !== true, `M${module}: módulo apareceu concluído no primeiro carregamento.`);
  assert(snapshot.session?.year === 2 && snapshot.session?.module === module, `M${module}: sessão pública não corresponde ao conteúdo carregado.`);
  assert(snapshot.publicEntry?.englishReadingRequired === false, `M${module}: entrypoint perdeu a regra de não exigir leitura autônoma em inglês.`);
  assert(snapshot.publicEntry?.sourceVersion === "2.3", `M${module}: sourceVersion pública inesperada ${snapshot.publicEntry?.sourceVersion}.`);
  assert(snapshot.gameConfig?.channel === "canary-v1", `M${module}: canal público inesperado ${snapshot.gameConfig?.channel}.`);
  assert(
    JSON.stringify(snapshot.gameConfig?.modulePath) === JSON.stringify(["english", "year2", moduleKey(module)]),
    `M${module}: modulePath público divergente ${JSON.stringify(snapshot.gameConfig?.modulePath)}.`
  );
  assert(snapshot.audit, `M${module}: auditoria de diversidade não chegou ao entrypoint público.`);
  assert(!/Erro:|Erro ao carregar|não foi carregado|não possui atividades/i.test(snapshot.rootText), `M${module}: shell público exibiu erro: ${snapshot.rootText}`);
  assert(snapshot.hostScroll <= snapshot.hostViewport + 6, `M${module}: overflow horizontal no shell ${snapshot.hostScroll}px > ${snapshot.hostViewport}px.`);

  return snapshot;
}

async function inspectFirstMechanic(page, module, snapshot) {
  const iframe = page.locator("#root iframe").first();
  const title = await iframe.getAttribute("title");
  const expectedTitle = mechanicTitlePattern(snapshot.firstMechanic);
  assert(expectedTitle.test(String(title || "")), `M${module}: primeira mecânica esperada ${snapshot.firstMechanic}, iframe ${title}.`);

  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, `M${module}: iframe da primeira mecânica inacessível.`);

  await frame.waitForFunction(() => {
    const error = document.querySelector("#duduq-runtime-error");
    if (error && getComputedStyle(error).display !== "none") return true;
    return Boolean(document.body && document.body.children.length > 0);
  }, null, { timeout: 20_000 });

  const runtime = await frame.evaluate(() => {
    const error = document.querySelector("#duduq-runtime-error");
    const doc = document.documentElement;
    return {
      runtimeError: error && getComputedStyle(error).display !== "none" ? String(error.textContent || "") : "",
      bodyText: String(document.body?.innerText || "").slice(0, 1400),
      viewport: doc.clientWidth,
      scroll: Math.max(doc.scrollWidth, document.body?.scrollWidth || 0)
    };
  });

  assert(!runtime.runtimeError, `M${module}: runtime da primeira mecânica falhou: ${runtime.runtimeError}`);
  assert(runtime.bodyText.trim().length > 0, `M${module}: primeira mecânica renderizou sem conteúdo observável.`);
  assert(runtime.scroll <= runtime.viewport + 6, `M${module}: primeira mecânica com overflow horizontal ${runtime.scroll}px > ${runtime.viewport}px.`);

  return { iframeTitle: title, ...runtime };
}

async function runScenario(browser, module, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const messages = [];
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

  const context = { module, viewport };
  try {
    await waitForPublicModule(page, module);
    const snapshot = await inspectPublicModule(page, module);
    const firstMechanic = await inspectFirstMechanic(page, module, snapshot);

    const fatalMessages = messages.filter((entry) =>
      /pageerror:|Runtime informou erro|Não foi possível iniciar|Integrity gate failed|Atividade incompatível/i.test(entry)
    );
    assert(fatalMessages.length === 0, `M${module}: erros fatais no entrypoint: ${fatalMessages.join(" | ")}`);

    // Captura o estado público após o handoff real da Intro para a primeira mecânica.
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const screenshot = path.join(OUTPUT_DIR, `M${String(module).padStart(2, "0")}-${viewport.name}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    return {
      module,
      viewport,
      status: "PASS",
      screenshot,
      snapshot: {
        moduleId: snapshot.moduleId,
        version: snapshot.version,
        activities: snapshot.activities,
        questions: snapshot.questions,
        firstQuestionId: snapshot.questionIds[0] || null,
        lastQuestionId: snapshot.questionIds.at(-1) || null,
        firstMechanic: snapshot.firstMechanic,
        session: {
          totalSteps: snapshot.session?.totalSteps,
          stepIndex: snapshot.session?.stepIndex,
          completed: snapshot.session?.completed,
          progress: snapshot.session?.progress || null
        }
      },
      firstMechanic
    };
  } catch (error) {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const base = `M${String(module).padStart(2, "0")}-${viewport.name}-${viewport.width}x${viewport.height}-FAIL`;
    try { await page.screenshot({ path: path.join(OUTPUT_DIR, `${base}.png`), fullPage: true }); } catch (_) {}
    await fs.writeFile(path.join(OUTPUT_DIR, `${base}.json`), JSON.stringify({
      ...context,
      error: error?.stack || error?.message || String(error),
      messages
    }, null, 2));
    throw error;
  } finally {
    await page.close();
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    for (let module = 1; module <= 6; module += 1) {
      report.push(await runScenario(browser, module, viewport));
    }
  }
} finally {
  await browser.close();
}

const summary = {
  status: "PASS",
  modules: 6,
  viewportScenarios: report.length,
  totalQuestionChecks: report.reduce((sum, entry) => sum + entry.snapshot.questions, 0),
  cases: report
};

await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
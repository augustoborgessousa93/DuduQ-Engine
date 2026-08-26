import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/dynamic-visibility");
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];
const EXPECTED_DYNAMIC_TRANSFORMS = 19;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function moduleKey(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}

function moduleUrl(module) {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=dynamic-visibility-rc1`;
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
      window.DuduQ?.listMechanics?.().some((entry) => entry.id === "bubble-pop") &&
      window.DuduQ?.listMechanics?.().some((entry) => entry.id === "target-shooter")
    ),
    key,
    { timeout: 30_000 }
  );

  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-dynamic-visibility" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
    document.documentElement.removeAttribute("data-duduq-initial-speech-gate");
  });
}

async function transformedDynamicQuestions(page, module) {
  const key = moduleKey(module);
  return page.evaluate((expectedKey) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    if (!built) throw new Error(`Módulo ${expectedKey} ausente.`);
    return (built.activities || []).flatMap((activity) =>
      (activity.questions || []).map((question) => ({
        id: question.id,
        activityId: activity.id,
        mechanic: question.delivery?.mechanic || activity.mechanic,
        rule: question.metadata?.gamificationDiversity?.rule || null,
        optionTexts: (question.alternatives || []).map((entry) => String(entry.text || "")),
        targetMode: question.metadata?.targetShooter?.mode || null,
        targetItems: question.metadata?.targetShooter?.items || []
      }))
    ).filter((question) => question.rule === "bubble-audio-numeral" || question.rule === "target-audio-image");
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
    if (!diversity) throw new Error(`${expectedId}: transformação de diversidade ausente.`);

    window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-dynamic-probe" });
    window.DuduQTransition?.hideImmediate?.();
    window.DuduQ.destroy();

    const mechanic = question.delivery?.mechanic || activity.mechanic;
    window.DuduQ.start({
      id: `qa-dynamic-${expectedId}`,
      title: `QA ${expectedId}`,
      year: built.year,
      subject: built.subject,
      module: built.module,
      container: "#root",
      steps: [{
        id: `qa-${expectedId}`,
        mechanic,
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
      mechanic,
      rule: diversity.rule,
      optionTexts: (question.alternatives || []).map((entry) => String(entry.text || "")),
      targetMode: question.metadata?.targetShooter?.mode || null,
      targetItems: question.metadata?.targetShooter?.items || []
    };
  }, { expectedKey: key, expectedId: questionId });
}

async function mechanicFrame(page, mechanic) {
  const titlePattern = mechanic === "bubble-pop" ? /Bubble Pop/i : /Target Shooter/i;
  await page.locator("#root iframe").first().waitFor({ state: "attached", timeout: 15_000 });
  const iframe = page.locator("#root iframe").first();
  const title = await iframe.getAttribute("title");
  assert(titlePattern.test(String(title || "")), `${mechanic}: iframe inesperado: ${title}`);
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, `${mechanic}: iframe inacessível.`);

  await frame.waitForFunction(() => {
    const error = document.querySelector("#duduq-runtime-error");
    if (error && getComputedStyle(error).display !== "none") return true;
    return Boolean(document.body?.children.length);
  }, null, { timeout: 20_000 });

  const runtimeError = await frame.locator("#duduq-runtime-error").count()
    ? await frame.locator("#duduq-runtime-error").first().innerText().catch(() => "")
    : "";
  assert(!runtimeError, `${mechanic}: runtime error: ${runtimeError}`);
  return frame;
}

function hitTestExpression(selector, contentSelector = null) {
  return ({ selector: targetSelector, contentSelector: innerSelector }) => {
    const nodes = Array.from(document.querySelectorAll(targetSelector));
    return nodes.some((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const opacity = Number.parseFloat(style.opacity || "1");
      if (
        style.display === "none" || style.visibility === "hidden" || opacity <= 0.25 ||
        rect.width < 30 || rect.height < 30
      ) return false;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (cx < 0 || cx >= window.innerWidth || cy < 0 || cy >= window.innerHeight) return false;

      const hit = document.elementFromPoint(cx, cy);
      const hitInside = Boolean(hit && (hit === node || node.contains(hit)));
      if (!hitInside) return false;

      if (innerSelector) {
        const content = node.querySelector(innerSelector);
        if (!content) return false;
        const contentRect = content.getBoundingClientRect();
        const ccx = contentRect.left + contentRect.width / 2;
        const ccy = contentRect.top + contentRect.height / 2;
        if (ccx < 0 || ccx >= window.innerWidth || ccy < 0 || ccy >= window.innerHeight) return false;
        const contentHit = document.elementFromPoint(ccx, ccy);
        if (!(contentHit && (contentHit === content || content.contains(contentHit) || node.contains(contentHit)))) return false;
      }
      return true;
    });
  };
}

async function assertBubbleUsable(frame, probe) {
  assert(probe.mechanic === "bubble-pop", `${probe.id}: mecânica Bubble Pop esperada.`);
  assert(probe.rule === "bubble-audio-numeral", `${probe.id}: regra Bubble inesperada: ${probe.rule}`);
  assert(
    probe.optionTexts.length === 4 && probe.optionTexts.every((text) => /^\d+$/.test(text)),
    `${probe.id}: alternativas Bubble não são quatro numerais.`
  );

  const started = Date.now();
  await frame.locator(".duduq-bp-bubble-shell").first().waitFor({ state: "attached", timeout: 20_000 });
  await frame.waitForFunction(() => {
    const arena = document.querySelector(".duduq-bp-arena")?.getBoundingClientRect();
    if (!arena) return false;
    return Array.from(document.querySelectorAll(".duduq-bp-bubble-shell")).some((shell) => {
      const label = shell.querySelector(".duduq-bp-label");
      if (!label || !/^\d+$/.test(String(label.textContent || "").trim())) return false;
      const shellStyle = getComputedStyle(shell);
      const labelStyle = getComputedStyle(label);
      const shellRect = shell.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const opacity = Number.parseFloat(shellStyle.opacity || "1") * Number.parseFloat(labelStyle.opacity || "1");
      if (shellStyle.display === "none" || shellStyle.visibility === "hidden" || opacity <= 0.3) return false;

      const cx = labelRect.left + labelRect.width / 2;
      const cy = labelRect.top + labelRect.height / 2;
      const insideArena = cx >= arena.left + 8 && cx <= arena.right - 8 && cy >= arena.top + 8 && cy <= arena.bottom - 8;
      const insideViewport = cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight;
      const hit = insideViewport ? document.elementFromPoint(cx, cy) : null;
      const hitInside = Boolean(hit && (hit === label || label.contains(hit) || shell.contains(hit)));
      return insideArena && insideViewport && hitInside && shellRect.width >= 40 && shellRect.height >= 40;
    });
  }, null, { timeout: 5_000 });

  const usableMs = Date.now() - started;
  const visibleLabels = await frame.evaluate(() => {
    const arena = document.querySelector(".duduq-bp-arena")?.getBoundingClientRect();
    return Array.from(document.querySelectorAll(".duduq-bp-bubble-shell")).flatMap((shell) => {
      const label = shell.querySelector(".duduq-bp-label");
      if (!label || !arena) return [];
      const shellStyle = getComputedStyle(shell);
      const labelStyle = getComputedStyle(label);
      const rect = label.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const opacity = Number.parseFloat(shellStyle.opacity || "1") * Number.parseFloat(labelStyle.opacity || "1");
      const hit = cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight ? document.elementFromPoint(cx, cy) : null;
      const usable = opacity > 0.3 && cx >= arena.left + 8 && cx <= arena.right - 8 && cy >= arena.top + 8 && cy <= arena.bottom - 8 && Boolean(hit && (hit === label || label.contains(hit) || shell.contains(hit)));
      return usable ? [{ text: String(label.textContent || "").trim(), opacity }] : [];
    });
  });
  assert(visibleLabels.length > 0, `${probe.id}: Bubble Pop não apresentou numeral plenamente visível.`);
  assert(visibleLabels.every((entry) => /^\d+$/.test(entry.text)), `${probe.id}: Bubble Pop expôs rótulo não numérico.`);
  return { usableMs, visibleLabels };
}

async function assertTargetUsable(frame, probe) {
  assert(probe.mechanic === "target-shooter", `${probe.id}: mecânica Target Shooter esperada.`);
  assert(probe.rule === "target-audio-image", `${probe.id}: regra Target inesperada: ${probe.rule}`);
  assert(probe.targetMode === "audio-to-image", `${probe.id}: Target não está em audio-to-image.`);
  assert(probe.targetItems.length === 4, `${probe.id}: Target não preservou quatro alvos.`);
  assert(
    probe.targetItems.every((item) => item.display === "image" && item.image && !item.label),
    `${probe.id}: Target exige alvo visual sem leitura inglesa.`
  );

  const started = Date.now();
  await frame.locator(".duduq-ts-target").first().waitFor({ state: "attached", timeout: 20_000 });
  await frame.waitForFunction(
    hitTestExpression(".duduq-ts-target"),
    { selector: ".duduq-ts-target", contentSelector: null },
    { timeout: 5_000 }
  );
  const usableMs = Date.now() - started;

  const visibleTargets = await frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-ts-target")).flatMap((target) => {
    const style = getComputedStyle(target);
    const rect = target.getBoundingClientRect();
    const opacity = Number.parseFloat(style.opacity || "1");
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const hit = cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight ? document.elementFromPoint(cx, cy) : null;
    const usable = style.display !== "none" && style.visibility !== "hidden" && opacity > 0.25 && rect.width >= 30 && rect.height >= 30 && Boolean(hit && (hit === target || target.contains(hit)));
    return usable ? [{ text: String(target.textContent || "").trim().slice(0, 80), opacity, width: rect.width, height: rect.height }] : [];
  }));
  assert(visibleTargets.length > 0, `${probe.id}: nenhum alvo ficou realmente visível/clicável em até 5s.`);
  return { usableMs, visibleTargets };
}

async function assertNoHorizontalOverflow(frame, label) {
  const dimensions = await frame.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
  }));
  assert(dimensions.scroll <= dimensions.viewport + 6, `${label}: overflow horizontal ${dimensions.scroll}px > ${dimensions.viewport}px.`);
}

async function writeFailure(page, context, error, messages) {
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
let discoveredCount = null;

try {
  for (const viewport of VIEWPORTS) {
    for (let module = 1; module <= 6; module += 1) {
      const { page, messages } = await preparePage(browser, viewport);
      try {
        await openModule(page, module);
        const questions = await transformedDynamicQuestions(page, module);
        if (viewport.name === "desktop") {
          discoveredCount = (discoveredCount || 0) + questions.length;
        }

        for (const question of questions) {
          const context = { module, id: question.id, mechanic: question.mechanic, rule: question.rule, viewport };
          const messageStart = messages.length;
          try {
            const probe = await startProbe(page, module, question.id);
            const frame = await mechanicFrame(page, probe.mechanic);
            const visibility = probe.mechanic === "bubble-pop"
              ? await assertBubbleUsable(frame, probe)
              : await assertTargetUsable(frame, probe);
            if (!frame.isDetached()) await assertNoHorizontalOverflow(frame, `${probe.id} ${viewport.name}`);

            const fatalMessages = messages.slice(messageStart).filter((entry) =>
              /pageerror:|Runtime informou erro|Não foi possível iniciar|Integrity gate failed/i.test(entry)
            );
            assert(fatalMessages.length === 0, `${probe.id}: erro de runtime: ${fatalMessages.join(" | ")}`);
            report.push({ ...context, status: "PASS", visibility });
          } catch (error) {
            await writeFailure(page, context, error, messages.slice(messageStart));
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

assert(discoveredCount === EXPECTED_DYNAMIC_TRANSFORMS, `Esperados ${EXPECTED_DYNAMIC_TRANSFORMS} itens dinâmicos transformados; encontrados ${discoveredCount}.`);
assert(report.length === EXPECTED_DYNAMIC_TRANSFORMS * VIEWPORTS.length, `Esperados ${EXPECTED_DYNAMIC_TRANSFORMS * VIEWPORTS.length} cenários; executados ${report.length}.`);

const summary = {
  status: "PASS",
  transformedDynamicItems: discoveredCount,
  viewportScenarios: report.length,
  maxUsableMs: Math.max(...report.map((entry) => entry.visibility.usableMs)),
  cases: report
};
await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

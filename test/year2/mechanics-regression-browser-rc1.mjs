import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/mechanics-regression");
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "fullscreen", width: 1920, height: 1080 },
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
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=mechanics-regression-rc1`;
}
function hasEmoji(value) {
  return /\p{Extended_Pictographic}/u.test(String(value || ""));
}

async function preparePage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const messages = [];
  await page.route("**/engine/duduq-player-v1.js*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;" });
  });
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  return { page, messages };
}

async function openModule(page, module) {
  const key = moduleKey(module);
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction((expectedKey) => Boolean(
    window.DUDUQ_CONTENT?.english?.year2?.[expectedKey]?.mechanicsRegressionAudit && window.DuduQ
  ), key, { timeout: 30_000 });
  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-mechanics-regression" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    try { window.DuduQ?.destroy?.(); } catch (_) {}
    document.documentElement.removeAttribute("data-duduq-initial-speech-gate");
  });
}

async function moduleModel(page, module) {
  const key = moduleKey(module);
  return page.evaluate((expectedKey) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    return (built.activities || []).flatMap((activity) =>
      (activity.questions || []).map((question) => ({
        id: question.id,
        activityId: activity.id,
        mechanic: question.delivery?.mechanic || activity.mechanic,
        statement: question.statement || "",
        instruction: question.instruction || "",
        targetMode: question.metadata?.targetShooter?.mode || null,
        targetImages: (question.metadata?.targetShooter?.items || []).map((item) => item.image).filter(Boolean),
        bubbleImages: (question.alternatives || []).map((alternative) => alternative?.metadata?.imageAssetKey).filter(Boolean),
        matchingPairs: question.metadata?.matching?.pairs?.length || 0,
        matchingDensity: question.metadata?.matching?.layout?.density || null,
        wordSlashValid: question.metadata?.wordSlashPayloadAudit?.valid === true,
        fallback: question.metadata?.mechanicsRegressionFallback || null
      }))
    );
  }, key);
}

async function startQuestion(page, module, questionId) {
  const key = moduleKey(module);
  return page.evaluate(({ expectedKey, expectedId }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    const activity = (built.activities || []).find((entry) => (entry.questions || []).some((question) => question.id === expectedId));
    if (!activity) throw new Error(`${expectedId}: activity not found.`);
    const source = (activity.questions || []).find((question) => question.id === expectedId);
    const question = JSON.parse(JSON.stringify(source));
    const mechanic = question.delivery?.mechanic || activity.mechanic;
    window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-mechanics-probe" });
    window.DuduQTransition?.hideImmediate?.();
    window.DuduQ.destroy();
    window.DuduQ.start({
      id: `qa-mechanics-${expectedId}`,
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
      statement: question.statement || "",
      matchingPairs: question.metadata?.matching?.pairs?.length || 0
    };
  }, { expectedKey: key, expectedId: questionId });
}

async function mechanicFrame(page, expectedMechanic) {
  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 20_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, `${expectedMechanic}: iframe inaccessible.`);
  await frame.waitForFunction(() => Boolean(document.body && document.body.children.length), null, { timeout: 20_000 });
  const runtimeError = await frame.locator("#duduq-runtime-error").count()
    ? await frame.locator("#duduq-runtime-error").first().innerText().catch(() => "")
    : "";
  assert(!runtimeError, `${expectedMechanic}: runtime error: ${runtimeError}`);
  return frame;
}

async function assertInstructionClean(frame, id) {
  const heading = await frame.locator("h2").first().innerText().catch(() => "");
  assert(!hasEmoji(heading), `${id}: runtime instruction still contains emoji/icon: ${heading}`);
}

async function assertNoHorizontalOverflow(frame, id) {
  const dims = await frame.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
  }));
  assert(dims.scroll <= dims.viewport + 6, `${id}: horizontal overflow ${dims.scroll} > ${dims.viewport}.`);
}

async function assertWordSlash(frame, id) {
  const started = Date.now();
  await frame.locator(".duduq-ws-object").first().waitFor({ state: "visible", timeout: 1_600 });
  const visibleMs = Date.now() - started;
  const data = await frame.evaluate(() => {
    const arena = document.querySelector(".duduq-ws-arena")?.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll(".duduq-ws-object")).flatMap((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight ? document.elementFromPoint(cx, cy) : null;
      const inArena = arena && rect.bottom > arena.top && rect.top < arena.bottom;
      const usable = style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > .25 && rect.width > 25 && rect.height > 25 && inArena && Boolean(hit && (hit === node || node.contains(hit)));
      return usable ? [{ text: String(node.textContent || "").trim(), width: rect.width, height: rect.height }] : [];
    });
    return { arena: arena ? { top: arena.top, bottom: arena.bottom, height: arena.height } : null, items };
  });
  assert(data.items.length > 0, `${id}: Word Slash arena remained empty/unusable.`);
  return { visibleMs, visibleItems: data.items.length };
}

async function assertBubble(frame, id) {
  await frame.locator(".duduq-bp-media").first().waitFor({ state: "visible", timeout: 8_000 });
  const result = await frame.evaluate(() => {
    const media = Array.from(document.querySelectorAll(".duduq-bp-media"));
    return media.map((img) => {
      const rect = img.getBoundingClientRect();
      const shell = img.closest(".duduq-bp-bubble-shell");
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight ? document.elementFromPoint(cx, cy) : null;
      return {
        src: img.currentSrc || img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        visible: rect.width > 30 && rect.height > 30 && Boolean(hit && (hit === img || img.contains(hit) || shell?.contains(hit)))
      };
    });
  });
  assert(result.length > 0, `${id}: Bubble Pop rendered no images.`);
  assert(result.some((entry) => entry.complete && entry.naturalWidth > 0 && entry.visible), `${id}: Bubble Pop images were not loaded/visible inside bubbles.`);
  return { imageCount: result.length, loadedVisible: result.filter((entry) => entry.complete && entry.naturalWidth > 0 && entry.visible).length };
}

async function assertMatching(frame, id, pairCount) {
  assert(pairCount > 3, `${id}: dense Matching probe requires 4+ pairs.`);
  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });
  const result = await frame.evaluate(() => {
    const board = document.querySelector(".duduq-matching-board");
    const boardRect = board?.getBoundingClientRect();
    const cards = Array.from(document.querySelectorAll(".duduq-matching-card")).map((card) => {
      const rect = card.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    });
    return {
      pairCount: Number(board?.dataset?.pairCount || 0),
      density: board?.dataset?.density || "",
      viewport: { width: window.innerWidth, height: window.innerHeight },
      board: boardRect ? { top: boardRect.top, bottom: boardRect.bottom, height: boardRect.height } : null,
      cards,
      verticalScroll: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)
    };
  });
  assert(result.pairCount === pairCount, `${id}: runtime pair count mismatch.`);
  assert(result.density === "compact", `${id}: 4+ pair Matching runtime did not switch to compact density.`);
  assert(result.cards.length === pairCount * 2, `${id}: expected ${pairCount * 2} Matching cards, got ${result.cards.length}.`);
  assert(result.cards.every((card) => card.top >= -1 && card.bottom <= result.viewport.height + 1), `${id}: one or more Matching cards are clipped outside the viewport.`);
  assert(result.board && result.board.bottom <= result.viewport.height + 1, `${id}: Matching board extends below viewport.`);
  return { density: result.density, boardHeight: result.board?.height || 0, cardHeights: [...new Set(result.cards.map((card) => Math.round(card.height)))] };
}

async function writeEvidence(page, viewport, probe, details) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const base = `${probe.id}-${probe.mechanic}-${viewport.name}`;
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${base}.png`), fullPage: true });
  await fs.writeFile(path.join(OUTPUT_DIR, `${base}.json`), JSON.stringify({ viewport, probe, details }, null, 2));
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    const { page, messages } = await preparePage(browser, viewport);
    try {
      // Module 1 contains the reported Word Slash and Bubble Pop regressions.
      await openModule(page, 1);
      const m1 = await moduleModel(page, 1);
      assert(m1.every((question) => !hasEmoji(question.statement) && !hasEmoji(question.instruction)), `M01/${viewport.name}: visible prompt emoji remains.`);

      const word = m1.find((question) => question.id === "EN2-M1-08");
      assert(word?.mechanic === "word-slash" && word.wordSlashValid, `EN2-M1-08: valid Word Slash was not preserved.`);
      let probe = await startQuestion(page, 1, word.id);
      let frame = await mechanicFrame(page, "word-slash");
      await assertInstructionClean(frame, probe.id);
      await assertNoHorizontalOverflow(frame, probe.id);
      let details = await assertWordSlash(frame, probe.id);
      await writeEvidence(page, viewport, probe, details);
      report.push({ viewport: viewport.name, ...probe, ...details });

      await page.evaluate(() => window.DuduQ.destroy());
      const bubble = m1.find((question) => question.mechanic === "bubble-pop");
      assert(bubble && bubble.bubbleImages.length >= 2, `M01/${viewport.name}: Bubble Pop smart images missing in model.`);
      assert(new Set(bubble.bubbleImages).size === bubble.bubbleImages.length, `${bubble.id}: Bubble Pop model has repeated images.`);
      probe = await startQuestion(page, 1, bubble.id);
      frame = await mechanicFrame(page, "bubble-pop");
      await assertInstructionClean(frame, probe.id);
      await assertNoHorizontalOverflow(frame, probe.id);
      details = await assertBubble(frame, probe.id);
      await writeEvidence(page, viewport, probe, details);
      report.push({ viewport: viewport.name, ...probe, ...details });

      // Inspect every remaining Target Shooter model across M01–M06 for duplicate images.
      let targetChecked = 0;
      let targetFallbacks = 0;
      let denseMatching = null;
      for (let module = 1; module <= 6; module += 1) {
        if (module !== 1) await openModule(page, module);
        const model = await moduleModel(page, module);
        assert(model.every((question) => !hasEmoji(question.statement) && !hasEmoji(question.instruction)), `M${module}/${viewport.name}: visible prompt emoji remains.`);
        for (const question of model) {
          if (question.targetMode === "audio-to-image" && question.mechanic === "target-shooter") {
            assert(question.targetImages.length >= 2, `${question.id}: Target Shooter image set missing.`);
            assert(new Set(question.targetImages).size === question.targetImages.length, `${question.id}: Target Shooter repeated image remains.`);
            targetChecked += 1;
          }
          if (question.fallback?.from === "target-shooter") {
            assert(question.mechanic === "drag-drop", `${question.id}: duplicate Target Shooter did not fallback to safe choice mechanic.`);
            targetFallbacks += 1;
          }
          if (!denseMatching && question.mechanic === "matching" && question.matchingPairs > 3) {
            denseMatching = { module, ...question };
          }
        }
      }
      assert(targetChecked > 0, `${viewport.name}: no unique visual Target Shooter remained for audit.`);
      assert(denseMatching, `${viewport.name}: no 4+ pair Matching found.`);

      await openModule(page, denseMatching.module);
      probe = await startQuestion(page, denseMatching.module, denseMatching.id);
      frame = await mechanicFrame(page, "matching");
      await assertInstructionClean(frame, probe.id);
      await assertNoHorizontalOverflow(frame, probe.id);
      details = await assertMatching(frame, probe.id, denseMatching.matchingPairs);
      await writeEvidence(page, viewport, probe, { ...details, targetChecked, targetFallbacks });
      report.push({ viewport: viewport.name, ...probe, ...details, targetChecked, targetFallbacks });

      const criticalErrors = messages.filter((message) => /pageerror:|runtime error|uncaught|typeerror|referenceerror/i.test(message));
      assert(criticalErrors.length === 0, `${viewport.name}: browser errors: ${criticalErrors.join(" | ")}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify({ status: "PASS", report }, null, 2));
console.log(JSON.stringify({ status: "PASS", contract: "YEAR2_MECHANICS_REGRESSION_RC1", report }, null, 2));

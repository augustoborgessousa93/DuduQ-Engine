import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/mechanics-regression-rc2");
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
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=mechanics-regression-rc2`;
}

function hasEmoji(value) {
  return /\p{Extended_Pictographic}/u.test(String(value || ""));
}

async function preparePage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.setDefaultTimeout(12_000);
  page.setDefaultNavigationTimeout(20_000);
  await page.route("**/engine/duduq-player-v1.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;"
    });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { page, pageErrors };
}

async function openModule(page, module) {
  const key = moduleKey(module);
  await page.goto(moduleUrl(module), { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForFunction((expectedKey) => Boolean(
    window.DUDUQ_CONTENT?.english?.year2?.[expectedKey]?.mechanicsRegressionAudit && window.DuduQ
  ), key, { timeout: 20_000 });
  await page.evaluate(() => {
    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-mechanics-regression-rc2" }); } catch (_) {}
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

async function auditAllModules(browser) {
  console.log("[RC2] static audit: M01-M06");
  const { page, pageErrors } = await preparePage(browser, { width: 1366, height: 768 });
  const result = {
    word: null,
    bubble: null,
    target: null,
    denseMatching: null,
    targetChecked: 0,
    targetFallbacks: 0,
    questionCount: 0
  };

  try {
    for (let module = 1; module <= 6; module += 1) {
      console.log(`[RC2] static audit: M${String(module).padStart(2, "0")}`);
      await openModule(page, module);
      const model = await moduleModel(page, module);
      result.questionCount += model.length;

      for (const question of model) {
        assert(!hasEmoji(question.statement), `${question.id}: statement still contains emoji/icon.`);
        assert(!hasEmoji(question.instruction), `${question.id}: instruction still contains emoji/icon.`);

        if (question.id === "EN2-M1-08") {
          assert(question.mechanic === "word-slash", `${question.id}: valid Word Slash was not preserved.`);
          assert(question.wordSlashValid, `${question.id}: Word Slash payload audit is not valid.`);
          result.word = { module, ...question };
        }

        if (!result.bubble && question.mechanic === "bubble-pop" && question.bubbleImages.length >= 2) {
          assert(
            new Set(question.bubbleImages).size === question.bubbleImages.length,
            `${question.id}: Bubble Pop model contains repeated images.`
          );
          result.bubble = { module, ...question };
        }

        if (question.mechanic === "bubble-pop") {
          assert(question.bubbleImages.length >= 2, `${question.id}: Bubble Pop smart images missing.`);
          assert(
            new Set(question.bubbleImages).size === question.bubbleImages.length,
            `${question.id}: Bubble Pop model contains repeated images.`
          );
        }

        if (question.targetMode === "audio-to-image" && question.mechanic === "target-shooter") {
          assert(question.targetImages.length >= 2, `${question.id}: Target Shooter image set missing.`);
          assert(
            new Set(question.targetImages).size === question.targetImages.length,
            `${question.id}: Target Shooter repeated image remains.`
          );
          result.targetChecked += 1;
          if (!result.target) result.target = { module, ...question };
        }

        if (question.fallback?.from === "target-shooter") {
          assert(
            question.mechanic === "drag-drop",
            `${question.id}: non-unique Target Shooter did not fall back to Drag & Drop.`
          );
          result.targetFallbacks += 1;
        }

        if (
          question.mechanic === "matching" &&
          question.matchingPairs > 3 &&
          (!result.denseMatching || question.matchingPairs < result.denseMatching.matchingPairs)
        ) {
          result.denseMatching = { module, ...question };
        }
      }
    }

    assert(result.questionCount === 90, `Static audit expected 90 items; found ${result.questionCount}.`);
    assert(result.word, "EN2-M1-08 Word Slash probe not found.");
    assert(result.bubble, "No Bubble Pop image probe found.");
    assert(result.targetChecked + result.targetFallbacks > 0, "No Target Shooter/fallback item found for uniqueness audit.");
    assert(result.denseMatching, "No Matching item with 4+ pairs found.");
    assert(pageErrors.length === 0, `Static audit page errors: ${pageErrors.join(" | ")}`);
    return result;
  } finally {
    await page.close();
  }
}

async function startQuestion(page, module, questionId) {
  const key = moduleKey(module);
  return page.evaluate(({ expectedKey, expectedId }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[expectedKey];
    const activity = (built.activities || []).find((entry) =>
      (entry.questions || []).some((question) => question.id === expectedId)
    );
    if (!activity) throw new Error(`${expectedId}: activity not found.`);
    const source = (activity.questions || []).find((question) => question.id === expectedId);
    const question = JSON.parse(JSON.stringify(source));
    const mechanic = question.delivery?.mechanic || activity.mechanic;

    try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-mechanics-probe-rc2" }); } catch (_) {}
    try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    window.DuduQ.destroy();
    window.DuduQ.start({
      id: `qa-mechanics-rc2-${expectedId}`,
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
  await iframe.waitFor({ state: "attached", timeout: 12_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, `${expectedMechanic}: iframe inaccessible.`);
  await frame.waitForFunction(() => Boolean(document.body && document.body.children.length), null, { timeout: 12_000 });
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
  await frame.locator(".duduq-ws-object").first().waitFor({ state: "visible", timeout: 2_000 });
  const visibleMs = Date.now() - started;
  const usable = await frame.evaluate(() => {
    const arena = document.querySelector(".duduq-ws-arena")?.getBoundingClientRect();
    if (!arena) return 0;
    return Array.from(document.querySelectorAll(".duduq-ws-object")).filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > .25 && rect.width > 25 && rect.height > 25 &&
        rect.bottom > arena.top && rect.top < arena.bottom;
    }).length;
  });
  assert(usable > 0, `${id}: Word Slash arena remained empty/unusable.`);
  return { visibleMs, visibleItems: usable };
}

async function assertBubble(frame, id) {
  await frame.locator(".duduq-bp-media").first().waitFor({ state: "attached", timeout: 8_000 });
  await frame.waitForFunction(() => Array.from(document.querySelectorAll(".duduq-bp-media")).some((img) => {
    const rect = img.getBoundingClientRect();
    return img.complete && img.naturalWidth > 0 && rect.width > 24 && rect.height > 24;
  }), null, { timeout: 8_000 });

  const result = await frame.evaluate(() => Array.from(document.querySelectorAll(".duduq-bp-media")).map((img) => ({
    src: img.currentSrc || img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    width: img.getBoundingClientRect().width,
    height: img.getBoundingClientRect().height
  })));
  assert(result.length > 0, `${id}: Bubble Pop rendered no images.`);
  assert(
    result.some((entry) => entry.complete && entry.naturalWidth > 0 && entry.width > 24 && entry.height > 24),
    `${id}: Bubble Pop images did not load visibly inside bubbles.`
  );
  return {
    imageCount: result.length,
    loadedImages: result.filter((entry) => entry.complete && entry.naturalWidth > 0).length
  };
}

async function assertMatching(frame, id, pairCount) {
  assert(pairCount > 3, `${id}: dense Matching probe requires 4+ pairs.`);
  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 12_000 });
  const result = await frame.evaluate(() => {
    const board = document.querySelector(".duduq-matching-board");
    const boardRect = board?.getBoundingClientRect();
    const cards = Array.from(document.querySelectorAll(".duduq-matching-card")).map((card) => {
      const rect = card.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height };
    });
    return {
      pairCount: Number(board?.dataset?.pairCount || 0),
      density: board?.dataset?.density || "",
      viewportHeight: window.innerHeight,
      board: boardRect ? { top: boardRect.top, bottom: boardRect.bottom, height: boardRect.height } : null,
      boardClientHeight: board?.clientHeight || 0,
      boardScrollHeight: board?.scrollHeight || 0,
      cards
    };
  });

  assert(result.pairCount === pairCount, `${id}: runtime pair count mismatch.`);
  assert(result.density === "compact", `${id}: 4+ pair Matching did not use compact density.`);
  assert(result.cards.length === pairCount * 2, `${id}: expected ${pairCount * 2} cards; rendered ${result.cards.length}.`);
  assert(result.board, `${id}: Matching board missing.`);
  assert(
    result.cards.every((card) => card.top >= result.board.top - 2 && card.bottom <= result.board.bottom + 2),
    `${id}: Matching card escaped/clipped outside the board.`
  );
  if (pairCount < 7) {
    assert(result.board.bottom <= result.viewportHeight + 2, `${id}: ${pairCount}-pair Matching board extends below viewport.`);
    assert(result.boardScrollHeight <= result.boardClientHeight + 3, `${id}: ${pairCount}-pair Matching unexpectedly requires internal scroll.`);
  }
  return {
    density: result.density,
    boardHeight: Math.round(result.board.height),
    cardHeights: [...new Set(result.cards.map((card) => Math.round(card.height)))]
  };
}

async function writeEvidence(page, viewport, probe, details) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const base = `${probe.id}-${probe.mechanic}-${viewport.name}`;
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${base}.png`),
    fullPage: false,
    timeout: 8_000
  });
  await fs.writeFile(
    path.join(OUTPUT_DIR, `${base}.json`),
    JSON.stringify({ viewport, probe, details }, null, 2)
  );
}

async function runProbe(browser, viewport, candidate, kind) {
  console.log(`[RC2] ${viewport.name}: ${kind} ${candidate.id} (M${candidate.module})`);
  const { page, pageErrors } = await preparePage(browser, viewport);
  try {
    await openModule(page, candidate.module);
    const probe = await startQuestion(page, candidate.module, candidate.id);
    const frame = await mechanicFrame(page, probe.mechanic);
    await assertInstructionClean(frame, probe.id);
    await assertNoHorizontalOverflow(frame, probe.id);

    let details;
    if (kind === "word-slash") details = await assertWordSlash(frame, probe.id);
    else if (kind === "bubble-pop") details = await assertBubble(frame, probe.id);
    else if (kind === "matching") details = await assertMatching(frame, probe.id, candidate.matchingPairs);
    else throw new Error(`Unknown probe kind: ${kind}`);

    assert(pageErrors.length === 0, `${probe.id}/${viewport.name}: page errors: ${pageErrors.join(" | ")}`);
    await writeEvidence(page, viewport, probe, details);
    console.log(`[RC2] PASS ${viewport.name}: ${kind} ${candidate.id}`);
    return { viewport: viewport.name, kind, ...probe, ...details };
  } finally {
    await page.close();
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  const audit = await auditAllModules(browser);
  console.log(JSON.stringify({
    staticAudit: "PASS",
    questionCount: audit.questionCount,
    targetChecked: audit.targetChecked,
    targetFallbacks: audit.targetFallbacks,
    word: audit.word?.id,
    bubble: audit.bubble?.id,
    target: audit.target?.id || null,
    denseMatching: audit.denseMatching?.id,
    denseMatchingPairs: audit.denseMatching?.matchingPairs
  }));

  for (const viewport of VIEWPORTS) {
    report.push(await runProbe(browser, viewport, audit.word, "word-slash"));
    report.push(await runProbe(browser, viewport, audit.bubble, "bubble-pop"));
    report.push(await runProbe(browser, viewport, audit.denseMatching, "matching"));
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, "report.json"),
    JSON.stringify({
      status: "PASS",
      contract: "YEAR2_MECHANICS_REGRESSION_RC2",
      staticAudit: {
        questionCount: audit.questionCount,
        targetChecked: audit.targetChecked,
        targetFallbacks: audit.targetFallbacks,
        representativeTarget: audit.target?.id || null
      },
      report
    }, null, 2)
  );

  console.log(JSON.stringify({
    status: "PASS",
    contract: "YEAR2_MECHANICS_REGRESSION_RC2",
    targetChecked: audit.targetChecked,
    targetFallbacks: audit.targetFallbacks,
    viewportProbes: report.length
  }, null, 2));
} finally {
  await browser.close();
}

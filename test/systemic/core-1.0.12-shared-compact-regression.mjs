import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "fullhd-1920x1080", width: 1920, height: 1080 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function routeCandidateCore(page) {
  await page.route("**/engine/channels/canary-v1.json*", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json();
    manifest.core = JSON.parse(
      JSON.stringify(manifest.core)
        .replaceAll("/engine/releases/core/1.0.11/", "/engine/releases/core/1.0.12/")
        .replaceAll('"release":"1.0.11"', '"release":"1.0.12"')
    );
    manifest.status = "candidate-core-1.0.12-shared-compact-surface";
    await route.fulfill({ response, contentType: "application/json", body: JSON.stringify(manifest) });
  });
}

function installDiagnostics(page, modulePath) {
  const pageErrors = [];
  const critical404 = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("response", (response) => {
    if (response.status() !== 404) return;
    const url = response.url();
    if (url.includes("/engine/") || url.includes(modulePath) || url.includes("asset-catalog/runtime-index.js")) critical404.push(url);
  });
  return { pageErrors, critical404 };
}

async function openCandidate(browser, viewport, moduleNumber) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: Boolean(viewport.mobile),
    isMobile: Boolean(viewport.mobile)
  });
  if (viewport.mobile) await page.emulateMedia({ reducedMotion: "reduce" });
  const modulePath = `/content/english/year-1/module-${String(moduleNumber).padStart(2, "0")}/`;
  const diagnostics = installDiagnostics(page, modulePath);
  await routeCandidateCore(page);
  const response = await page.goto(`${BASE}${modulePath}?qa=core-1.0.12-consumer-${viewport.name}`, {
    waitUntil: "domcontentloaded",
    timeout: 35_000
  });
  assert(response?.ok(), `M${moduleNumber}/${viewport.name}: HTTP ${response?.status()}.`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });
  const manifest = await page.evaluate(() => window.DUDUQ_ENGINE_MANIFEST || {});
  assert(manifest.core?.release === "1.0.12", `M${moduleNumber}/${viewport.name}: candidate Core not active.`);
  assert(manifest.mechanics?.["target-shooter"]?.release === "1.0.21", `M${moduleNumber}/${viewport.name}: TS release changed.`);
  assert(manifest.mechanics?.["drag-drop"]?.release === "2.0.24", `M${moduleNumber}/${viewport.name}: DD release changed.`);
  return { page, ...diagnostics };
}

async function waitStep(page, expected, timeout = 20_000) {
  await page.waitForFunction((step) => {
    const session = window.DuduQ?.getSession?.();
    const wrapper = document.querySelector("#root > .duduq-mechanic-frame");
    const iframe = wrapper?.querySelector("iframe");
    return Boolean(
      session && !session.transitioning && !session.completed && session.stepIndex === step &&
      wrapper && iframe && (iframe.srcdoc || iframe.getAttribute("src")) &&
      window.DuduQTransition?.getState?.() === "idle"
    );
  }, expected, { timeout });
}

async function waitFeedback(page, state, timeout = 6_000) {
  await page.waitForFunction((expected) => {
    const iframe = document.querySelector("#root > .duduq-mechanic-frame iframe");
    return iframe?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === expected;
  }, state, { timeout });
}

async function measureSurface(page, kind) {
  return page.evaluate((mechanicKind) => {
    const wrapper = document.querySelector("#root > .duduq-mechanic-frame");
    const iframe = wrapper?.querySelector("iframe");
    const doc = iframe?.contentDocument;
    const view = doc?.defaultView;
    const round = (value) => Math.round(value * 10) / 10;
    const describe = (el) => {
      if (!el || !view) return null;
      const r = el.getBoundingClientRect();
      const left = Math.max(0, r.left);
      const top = Math.max(0, r.top);
      const right = Math.min(view.innerWidth, r.right);
      const bottom = Math.min(view.innerHeight, r.bottom);
      const visibleArea = Math.max(0, right - left) * Math.max(0, bottom - top);
      const area = Math.max(1, r.width * r.height);
      return {
        width: round(r.width),
        height: round(r.height),
        top: round(r.top),
        bottom: round(r.bottom),
        visibleRatio: round(visibleArea / area),
        disabled: Boolean(el.disabled)
      };
    };
    const targets = mechanicKind === "ts"
      ? [...(doc?.querySelectorAll(".duduq-ts-target") || [])]
      : [...(doc?.querySelectorAll(".duduq-dd2-target[data-dd2-target-id]") || [])];
    const alternatives = mechanicKind === "dd"
      ? [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])]
      : [];
    const audioControls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) =>
      /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || ""))
    );
    return {
      wrapperHeight: round(wrapper?.getBoundingClientRect().height || 0),
      iframeHeight: round(iframe?.getBoundingClientRect().height || 0),
      parentOverflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      runtimeOverflowX: Math.max(0, (doc?.body?.scrollWidth || 0) - (doc?.documentElement?.clientWidth || 0)),
      instruction: describe(doc?.querySelector(mechanicKind === "ts" ? ".duduq-ts-instruction" : ".duduq-dd2-instruction,.duduq-dd-instruction")),
      targets: targets.map(describe),
      alternatives: alternatives.map(describe),
      audioControls: audioControls.map((button) => ({ disabled: Boolean(button.disabled), label: String(button.getAttribute("aria-label") || button.textContent || "").trim() })),
      bodyHeight: round(doc?.body?.scrollHeight || 0),
      viewportHeight: round(view?.innerHeight || 0)
    };
  }, kind);
}

function assertCommonLayout(layout, viewport, label) {
  assert(layout.wrapperHeight > 150, `${label}: wrapper still collapsed at ${layout.wrapperHeight}px.`);
  assert(layout.iframeHeight > 150, `${label}: iframe still collapsed at ${layout.iframeHeight}px.`);
  assert(Math.abs(layout.wrapperHeight - layout.iframeHeight) <= 1, `${label}: wrapper/iframe chain diverged.`);
  assert(layout.parentOverflowX <= 6 && layout.runtimeOverflowX <= 6, `${label}: horizontal overflow parent=${layout.parentOverflowX}, runtime=${layout.runtimeOverflowX}.`);
  if (viewport.width <= 900) {
    assert(Math.abs(layout.iframeHeight - viewport.height) <= 2, `${label}: compact iframe ${layout.iframeHeight}px does not derive from ${viewport.height}px viewport.`);
  }
  assert(layout.instruction?.visibleRatio > 0.9, `${label}: instruction critically clipped.`);
}

async function exerciseM01TS(browser, viewport) {
  const { page, pageErrors, critical404 } = await openCandidate(browser, viewport, 1);
  try {
    const start = page.locator(".duduq-intro-start-button");
    await start.waitFor({ state: "visible", timeout: 30_000 });
    await start.click();
    await waitStep(page, 0, 35_000);
    await page.waitForFunction(() => {
      const doc = document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument;
      const targets = [...(doc?.querySelectorAll(".duduq-ts-target") || [])];
      return Boolean(doc?.querySelector(".duduq-ts-root") && targets.length === 3 && targets.every((target) => !target.disabled));
    }, null, { timeout: 20_000 });

    const layout = await measureSurface(page, "ts");
    assertCommonLayout(layout, viewport, `M01 TS/${viewport.name}`);
    assert(layout.targets.length === 3, `M01 TS/${viewport.name}: expected 3 targets.`);
    assert(layout.targets.every((target) => target.width >= 44 && target.height >= 44 && target.visibleRatio > 0.9), `M01 TS/${viewport.name}: target size/visibility failed.`);
    assert(layout.audioControls.length >= 1 && layout.audioControls.some((control) => !control.disabled), `M01 TS/${viewport.name}: instruction audio unavailable.`);

    const frame = page.frameLocator("#root > .duduq-mechanic-frame iframe");
    const wrong = frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]').first();
    await wrong.waitFor({ state: "visible", timeout: 10_000 });
    await wrong.click({ force: true });
    await waitFeedback(page, "retry", 4_000);
    const retry = await page.evaluate(() => window.DuduQ?.getSession?.());
    assert(retry?.stepIndex === 0 && retry?.completed === false, `M01 TS/${viewport.name}: wrong answer advanced Host.`);

    const correct = frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first();
    await correct.waitFor({ state: "visible", timeout: 10_000 });
    await correct.click({ force: true });
    await waitStep(page, 1, 20_000);

    const progress = [];
    let session = await page.evaluate(() => window.DuduQ?.getSession?.());
    progress.push(session?.progress?.percent ?? 0);
    while (session && !session.completed) {
      const current = session.stepIndex;
      const accepted = await page.evaluate((stepIndex) => window.DuduQ.next({ qa: "core-1.0.12-systemic", stepIndex }), current);
      assert(accepted === true, `M01 TS/${viewport.name}: Host refused progression at step ${current}.`);
      await page.waitForFunction(({ previous, total }) => {
        const state = window.DuduQ?.getSession?.();
        if (!state || state.transitioning) return false;
        if (state.completed) return state.progress?.percent === 100;
        const iframe = document.querySelector("#root > .duduq-mechanic-frame iframe");
        return Boolean(state.stepIndex > previous && state.stepIndex < total && iframe && (iframe.srcdoc || iframe.getAttribute("src")));
      }, { previous: current, total: session.totalSteps }, { timeout: 15_000 });
      session = await page.evaluate(() => window.DuduQ?.getSession?.());
      progress.push(session?.progress?.percent ?? -1);
    }
    assert(session?.completed === true && session?.progress?.percent === 100, `M01 TS/${viewport.name}: completion/progress failed.`);
    assert(progress.every((value, index) => index === 0 || value >= progress[index - 1]), `M01 TS/${viewport.name}: progress regressed.`);
    const completion = await page.evaluate(() => String(document.body?.innerText || "").replace(/\s+/g, " "));
    assert(/Missão concluída/i.test(completion), `M01 TS/${viewport.name}: Completion UI missing.`);
    assert(pageErrors.length === 0, `M01 TS/${viewport.name}: pageErrors ${pageErrors.join(" | ")}`);
    assert(critical404.length === 0, `M01 TS/${viewport.name}: critical404 ${critical404.join(" | ")}`);
    return { viewport: viewport.name, layout, progression: "PASS", completion: "PASS" };
  } finally {
    await page.close();
  }
}

async function latchCardAudio(page, itemId) {
  await page.evaluate((id) => {
    const doc = document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument;
    const card = doc?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`);
    if (!card) throw new Error(`DD card ${id} missing for audio latch.`);
    const latch = { seen: card.getAttribute("data-audio-playing") === "true", observer: null };
    const observer = new MutationObserver(() => { if (card.getAttribute("data-audio-playing") === "true") latch.seen = true; });
    observer.observe(card, { attributes: true, attributeFilter: ["data-audio-playing"] });
    latch.observer = observer;
    window.__DUDUQ_CORE_1012_AUDIO_LATCH__ = latch;
  }, itemId);
}

async function finishCardAudio(page) {
  await page.waitForFunction(() => window.__DUDUQ_CORE_1012_AUDIO_LATCH__?.seen === true, null, { timeout: 2_500 });
  await page.waitForFunction(() => !document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 7_000 });
  await page.evaluate(() => {
    window.__DUDUQ_CORE_1012_AUDIO_LATCH__?.observer?.disconnect?.();
    delete window.__DUDUQ_CORE_1012_AUDIO_LATCH__;
  });
}

async function waitDDReady(page, timeout = 15_000) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument;
    const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    return Boolean(doc?.querySelector(".duduq-dd2-root") && doc?.querySelector(".duduq-dd2-target[data-dd2-target-id]") && items.length === 3 && items.every((item) => !item.disabled));
  }, null, { timeout });
}

async function exerciseM03DD(browser, viewport) {
  const { page, pageErrors, critical404 } = await openCandidate(browser, viewport, 3);
  try {
    const start = page.locator(".duduq-intro-start-button");
    await start.waitFor({ state: "visible", timeout: 30_000 });
    await start.click();
    await waitStep(page, 0, 35_000);
    await waitDDReady(page, 20_000);

    const layout = await measureSurface(page, "dd");
    assertCommonLayout(layout, viewport, `M03 DD/${viewport.name}`);
    assert(layout.targets.length === 1 && layout.targets[0].visibleRatio > 0.9, `M03 DD/${viewport.name}: destination clipped/missing.`);
    assert(layout.alternatives.length === 3, `M03 DD/${viewport.name}: expected 3 alternatives.`);
    assert(layout.alternatives.every((item) => item.width >= 44 && item.height >= 44 && item.visibleRatio > 0.9), `M03 DD/${viewport.name}: alternatives size/visibility failed.`);
    assert(layout.audioControls.length >= 1, `M03 DD/${viewport.name}: replay/instruction audio control missing.`);

    const frame = page.frameLocator("#root > .duduq-mechanic-frame iframe");
    await latchCardAudio(page, "A");
    await frame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first().click({ force: true });
    await finishCardAudio(page);
    await frame.locator(".duduq-dd2-zone").first().click({ force: true });
    await waitFeedback(page, "retry", 5_000);
    const retry = await page.evaluate(() => window.DuduQ?.getSession?.());
    assert(retry?.stepIndex === 0 && retry?.completed === false, `M03 DD/${viewport.name}: distractor advanced Host.`);

    await waitDDReady(page, 8_000);
    const released = await page.evaluate(() => {
      const doc = document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument;
      const zoneCount = doc?.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item").length || 0;
      const bank = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
      return zoneCount === 0 && bank.length === 3 && bank.every((item) => !item.disabled);
    });
    assert(released, `M03 DD/${viewport.name}: destination was not released after retry.`);

    await latchCardAudio(page, "B");
    await frame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="B"]').first().click({ force: true });
    await finishCardAudio(page);
    await frame.locator(".duduq-dd2-zone").first().click({ force: true });
    await waitFeedback(page, "success", 6_000);
    await waitStep(page, 1, 20_000);
    const progressed = await page.evaluate(() => window.DuduQ?.getSession?.());
    assert(progressed?.stepIndex === 1 && (progressed?.progress?.percent ?? 0) > 0, `M03 DD/${viewport.name}: correct answer did not progress.`);
    assert(pageErrors.length === 0, `M03 DD/${viewport.name}: pageErrors ${pageErrors.join(" | ")}`);
    assert(critical404.length === 0, `M03 DD/${viewport.name}: critical404 ${critical404.join(" | ")}`);
    return { viewport: viewport.name, layout, retry: "PASS", destinationReleased: "PASS", progression: "PASS" };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
const report = { contract: "CORE_1_0_12_SHARED_COMPACT_CONSUMER_REGRESSION", status: "PASS", m01TargetShooter: [], m03DragDrop: [] };
try {
  for (const viewport of VIEWPORTS) report.m01TargetShooter.push(await exerciseM01TS(browser, viewport));
  for (const viewport of VIEWPORTS) report.m03DragDrop.push(await exerciseM03DD(browser, viewport));
  assert(report.m01TargetShooter.length === 4 && report.m03DragDrop.length === 4, "Expected 4/4 consumers per mechanic.");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

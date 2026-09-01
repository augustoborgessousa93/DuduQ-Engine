import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const VIEWPORTS = [
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true }
];

function assert(condition, message) { if (!condition) throw new Error(message); }

function diagnostics(page, modulePath) {
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

async function openModule(browser, viewport, moduleNumber) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: Boolean(viewport.mobile),
    isMobile: Boolean(viewport.mobile)
  });
  if (viewport.mobile) await page.emulateMedia({ reducedMotion: "reduce" });
  const modulePath = `/content/english/year-1/module-${String(moduleNumber).padStart(2, "0")}/`;
  const diag = diagnostics(page, modulePath);
  const response = await page.goto(`${BASE}${modulePath}?qa=canary-r147-core-1.0.12-${viewport.name}`, { waitUntil: "domcontentloaded", timeout: 35_000 });
  assert(response?.ok(), `M${moduleNumber}/${viewport.name}: HTTP ${response?.status()}.`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });
  const boot = await page.evaluate(() => ({
    revision: window.DUDUQ_ENGINE_MANIFEST?.revision,
    core: window.DUDUQ_ENGINE_MANIFEST?.core?.release,
    dd: window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,
    ts: window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["target-shooter"]?.release,
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
    transitionApi: typeof window.DuduQTransition?.getState === "function",
    playerApi: typeof window.DuduQ?.getSession === "function"
  }));
  assert(boot.revision === 147 && boot.core === "1.0.12", `M${moduleNumber}/${viewport.name}: Canary ${boot.revision}/Core ${boot.core}.`);
  assert(boot.dd === "2.0.24" && boot.ts === "1.0.21", `M${moduleNumber}/${viewport.name}: mechanics mudaram.`);
  assert(boot.scripts.some((src) => src.includes("/engine/duduq-loader-v1.js")), `M${moduleNumber}/${viewport.name}: Loader ausente.`);
  assert(boot.playerApi && boot.transitionApi, `M${moduleNumber}/${viewport.name}: Player/Transition API ausente.`);
  return { page, ...diag };
}

async function waitStep(page, expected, timeout = 20_000) {
  await page.waitForFunction((step) => {
    const session = window.DuduQ?.getSession?.();
    const wrapper = document.querySelector("#root > .duduq-mechanic-frame");
    const iframe = wrapper?.querySelector("iframe");
    return Boolean(session && !session.transitioning && !session.completed && session.stepIndex === step && wrapper && iframe && (iframe.srcdoc || iframe.getAttribute("src")) && window.DuduQTransition?.getState?.() === "idle");
  }, expected, { timeout });
}

async function waitFeedback(page, state, timeout = 6_000) {
  await page.waitForFunction((expected) => document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === expected, state, { timeout });
}

async function surface(page, kind) {
  return page.evaluate((mechanic) => {
    const wrapper = document.querySelector("#root > .duduq-mechanic-frame");
    const iframe = wrapper?.querySelector("iframe");
    const doc = iframe?.contentDocument;
    const view = doc?.defaultView;
    const visibleRatio = (el) => {
      if (!el || !view) return 0;
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.min(view.innerWidth, r.right) - Math.max(0, r.left));
      const h = Math.max(0, Math.min(view.innerHeight, r.bottom) - Math.max(0, r.top));
      return (w * h) / Math.max(1, r.width * r.height);
    };
    const targets = mechanic === "ts" ? [...(doc?.querySelectorAll(".duduq-ts-target") || [])] : [...(doc?.querySelectorAll(".duduq-dd2-target[data-dd2-target-id]") || [])];
    const items = mechanic === "dd" ? [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])] : [];
    return {
      wrapperHeight: wrapper?.getBoundingClientRect().height || 0,
      iframeHeight: iframe?.getBoundingClientRect().height || 0,
      parentOverflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      runtimeOverflowX: Math.max(0, (doc?.body?.scrollWidth || 0) - (doc?.documentElement?.clientWidth || 0)),
      instructionRatio: visibleRatio(doc?.querySelector(mechanic === "ts" ? ".duduq-ts-instruction" : ".duduq-dd2-instruction,.duduq-dd-instruction")),
      targets: targets.map((el) => { const r = el.getBoundingClientRect(); return { width:r.width, height:r.height, ratio:visibleRatio(el), disabled:Boolean(el.disabled) }; }),
      items: items.map((el) => { const r = el.getBoundingClientRect(); return { width:r.width, height:r.height, ratio:visibleRatio(el), disabled:Boolean(el.disabled) }; })
    };
  }, kind);
}

function assertCompact(layout, viewport, label) {
  assert(layout.wrapperHeight > 150 && layout.iframeHeight > 150, `${label}: superfície ainda colapsada.`);
  assert(Math.abs(layout.wrapperHeight - viewport.height) <= 2, `${label}: wrapper ${layout.wrapperHeight} != viewport ${viewport.height}.`);
  assert(Math.abs(layout.iframeHeight - viewport.height) <= 2, `${label}: iframe ${layout.iframeHeight} != viewport ${viewport.height}.`);
  assert(layout.parentOverflowX <= 6 && layout.runtimeOverflowX <= 6, `${label}: overflow horizontal.`);
  assert(layout.instructionRatio > 0.85, `${label}: instrução criticamente cortada.`);
}

async function waitInstructionAudioIdle(page) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument;
    const controls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) => /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || "")));
    return controls.length >= 1 && !controls.some((button) => button.disabled || /reprodução|playing/i.test(String(button.getAttribute("aria-label") || "")));
  }, null, { timeout: 8_000 });
}

async function m01(browser, viewport) {
  const { page, pageErrors, critical404 } = await openModule(browser, viewport, 1);
  try {
    await page.locator(".duduq-intro-start-button").click();
    await waitStep(page, 0, 35_000);
    await page.waitForFunction(() => document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument?.querySelectorAll(".duduq-ts-target").length === 3, null, { timeout: 15_000 });
    await waitInstructionAudioIdle(page);
    const layout = await surface(page, "ts");
    assertCompact(layout, viewport, `M01 TS/${viewport.name}`);
    assert(layout.targets.length === 3 && layout.targets.every((t) => t.width >= 44 && t.height >= 44 && t.ratio > 0.85), `M01 TS/${viewport.name}: targets inválidos.`);

    const frame = page.frameLocator("#root > .duduq-mechanic-frame iframe");
    await frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]').first().click({ force:true });
    await waitFeedback(page, "retry");
    let session = await page.evaluate(() => window.DuduQ.getSession());
    assert(session.stepIndex === 0 && !session.completed, `M01 TS/${viewport.name}: retry avançou.`);
    await frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first().click({ force:true });
    await waitStep(page, 1, 20_000);

    const progress = [];
    session = await page.evaluate(() => window.DuduQ.getSession());
    progress.push(session.progress?.percent ?? 0);
    while (!session.completed) {
      const previous = session.stepIndex;
      const accepted = await page.evaluate((stepIndex) => window.DuduQ.next({ qa:"canary-r147-core-1.0.12", stepIndex }), previous);
      assert(accepted === true, `M01/${viewport.name}: Host recusou next ${previous}.`);
      await page.waitForFunction(({ previous, total }) => {
        const state = window.DuduQ?.getSession?.();
        if (!state || state.transitioning) return false;
        if (state.completed) return state.progress?.percent === 100 && window.DuduQTransition?.getState?.() === "idle";
        return state.stepIndex > previous && state.stepIndex < total && window.DuduQTransition?.getState?.() === "idle";
      }, { previous, total:session.totalSteps }, { timeout:15_000 });
      session = await page.evaluate(() => window.DuduQ.getSession());
      progress.push(session.progress?.percent ?? -1);
    }
    assert(session.progress?.percent === 100, `M01/${viewport.name}: progresso final ${session.progress?.percent}.`);
    assert(progress.every((v,i) => i === 0 || v >= progress[i-1]), `M01/${viewport.name}: progresso regrediu.`);
    const completion = await page.evaluate(() => String(document.body?.innerText || "").replace(/\s+/g," "));
    assert(/Missão concluída/i.test(completion), `M01/${viewport.name}: Completion ausente.`);
    assert(pageErrors.length === 0 && critical404.length === 0, `M01/${viewport.name}: erros=${pageErrors.join(" | ")} 404=${critical404.join(" | ")}`);
    return { viewport:viewport.name, surface:"PASS", retry:"PASS", progress:"PASS", transition:"PASS", completion:"PASS" };
  } finally { await page.close(); }
}

async function waitDDReady(page) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument;
    const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    return Boolean(doc?.querySelector(".duduq-dd2-root") && doc?.querySelector(".duduq-dd2-target[data-dd2-target-id]") && items.length === 3 && items.every((item) => !item.disabled));
  }, null, { timeout:15_000 });
}

async function clickDD(page, id) {
  const frame = page.frameLocator("#root > .duduq-mechanic-frame iframe");
  await frame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`).first().click({ force:true });
  await page.waitForFunction(() => !document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout:7_000 }).catch(() => {});
  await frame.locator(".duduq-dd2-zone").first().click({ force:true });
}

async function m03(browser, viewport) {
  const { page, pageErrors, critical404 } = await openModule(browser, viewport, 3);
  try {
    await page.locator(".duduq-intro-start-button").click();
    await waitStep(page, 0, 35_000);
    await waitDDReady(page);
    const layout = await surface(page, "dd");
    assertCompact(layout, viewport, `M03 DD/${viewport.name}`);
    assert(layout.targets.length === 1 && layout.targets[0].ratio > 0.85, `M03 DD/${viewport.name}: destino inválido.`);
    assert(layout.items.length === 3 && layout.items.every((item) => item.width >= 44 && item.height >= 44 && item.ratio > 0.85), `M03 DD/${viewport.name}: alternativas inválidas.`);

    await clickDD(page, "A");
    await waitFeedback(page, "retry");
    let session = await page.evaluate(() => window.DuduQ.getSession());
    assert(session.stepIndex === 0 && !session.completed, `M03 DD/${viewport.name}: distrator avançou.`);
    await waitDDReady(page);
    const released = await page.evaluate(() => {
      const doc = document.querySelector("#root > .duduq-mechanic-frame iframe")?.contentDocument;
      return (doc?.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item").length || 0) === 0;
    });
    assert(released, `M03 DD/${viewport.name}: destino não liberado após retry.`);
    await clickDD(page, "B");
    await waitFeedback(page, "success");
    await waitStep(page, 1, 20_000);
    session = await page.evaluate(() => window.DuduQ.getSession());
    assert(session.stepIndex === 1 && (session.progress?.percent ?? 0) > 0, `M03 DD/${viewport.name}: success sem progressão.`);
    assert(pageErrors.length === 0 && critical404.length === 0, `M03/${viewport.name}: erros=${pageErrors.join(" | ")} 404=${critical404.join(" | ")}`);
    return { viewport:viewport.name, surface:"PASS", retry:"PASS", destinationReleased:"PASS", progression:"PASS" };
  } finally { await page.close(); }
}

const browser = await chromium.launch({ headless:true });
const report = { contract:"CANARY_R147_CORE_1_0_12_PROPORTIONAL_SMOKE", status:"PASS", m01:[], m03:[] };
try {
  for (const viewport of VIEWPORTS) report.m01.push(await m01(browser, viewport));
  for (const viewport of VIEWPORTS) report.m03.push(await m03(browser, viewport));
  assert(report.m01.length === 2 && report.m03.length === 2, "Smoke compacto incompleto.");
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const VIEWPORTS = [
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function routeCandidateCore(page) {
  await page.route("**/engine/channels/canary-v1.json*", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json();
    const core = JSON.parse(
      JSON.stringify(manifest.core)
        .replaceAll("/engine/releases/core/1.0.11/", "/engine/releases/core/1.0.12/")
        .replaceAll('"release":"1.0.11"', '"release":"1.0.12"')
    );
    manifest.core = core;
    manifest.status = "candidate-core-1.0.12-shared-compact-surface";
    await route.fulfill({
      response,
      contentType: "application/json",
      body: JSON.stringify(manifest)
    });
  });
}

async function openTargetShooter(browser, viewport, mode) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  const critical404 = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("response", (response) => {
    if (response.status() !== 404) return;
    const url = response.url();
    if (url.includes("/engine/") || url.includes("/content/english/year-1/module-01/")) critical404.push(url);
  });

  if (mode === "candidate") await routeCandidateCore(page);

  const response = await page.goto(
    `${BASE}/content/english/year-1/module-01/?qa=core-1.0.12-causal-${mode}-${viewport.name}`,
    { waitUntil: "domcontentloaded", timeout: 35_000 }
  );
  assert(response?.ok(), `${mode}/${viewport.name}: module HTTP ${response?.status()}.`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

  const expectedCore = mode === "candidate" ? "1.0.12" : "1.0.11";
  assert(
    await page.evaluate((core) => window.DUDUQ_ENGINE_MANIFEST?.core?.release === core, expectedCore),
    `${mode}/${viewport.name}: expected Core ${expectedCore}.`
  );

  const start = page.locator(".duduq-intro-start-button");
  await start.waitFor({ state: "visible", timeout: 30_000 });
  await start.click();
  await page.waitForFunction(() => {
    const mechanicFrame = document.querySelector("#root > .duduq-mechanic-frame");
    const iframe = mechanicFrame?.querySelector("iframe");
    const doc = iframe?.contentDocument;
    return Boolean(
      mechanicFrame && iframe &&
      doc?.querySelector(".duduq-engine-shell") &&
      doc?.querySelector(".duduq-ts-root") &&
      doc.querySelectorAll(".duduq-ts-target").length === 3
    );
  }, null, { timeout: 25_000 });

  const layout = await page.evaluate(() => {
    const round = (value) => Math.round(value * 10) / 10;
    const rectHeight = (el) => el ? round(el.getBoundingClientRect().height) : null;
    const parentRoot = document.querySelector("#root");
    const mechanicFrame = document.querySelector("#root > .duduq-mechanic-frame");
    const mechanicIframe = mechanicFrame?.querySelector("iframe");
    const runtimeDoc = mechanicIframe?.contentDocument;
    const innerRoot = runtimeDoc?.querySelector("#root") || runtimeDoc?.body;
    const engineRoot = runtimeDoc?.querySelector(".duduq-engine-root");
    const shell = runtimeDoc?.querySelector(".duduq-engine-shell");
    const stage = runtimeDoc?.querySelector(".duduq-engine-stage");
    const targets = [...(runtimeDoc?.querySelectorAll(".duduq-ts-target") || [])];
    const computed = (el) => el ? {
      height: getComputedStyle(el).height,
      minHeight: getComputedStyle(el).minHeight,
      overflow: getComputedStyle(el).overflow
    } : null;

    return {
      parent: {
        root: rectHeight(parentRoot),
        rootComputed: computed(parentRoot),
        mechanicFrame: rectHeight(mechanicFrame),
        mechanicFrameComputed: computed(mechanicFrame),
        iframe: rectHeight(mechanicIframe),
        iframeComputed: computed(mechanicIframe)
      },
      runtime: {
        root: rectHeight(innerRoot),
        engineRoot: rectHeight(engineRoot),
        shell: rectHeight(shell),
        stage: rectHeight(stage)
      },
      targets: targets.map((el) => {
        const r = el.getBoundingClientRect();
        return { width: round(r.width), height: round(r.height), visible: r.width > 0 && r.height > 0 };
      }),
      overflowX: Math.max(
        0,
        (runtimeDoc?.body?.scrollWidth || 0) - (runtimeDoc?.documentElement?.clientWidth || 0)
      )
    };
  });

  await page.close();
  return { mode, viewport, layout, pageErrors, critical404 };
}

const browser = await chromium.launch({ headless: true });
const evidence = [];
try {
  for (const viewport of VIEWPORTS) {
    const before = await openTargetShooter(browser, viewport, "baseline");
    const after = await openTargetShooter(browser, viewport, "candidate");

    assert(before.layout.parent.mechanicFrame === 150, `${viewport.name}: baseline mechanic frame expected 150px, got ${before.layout.parent.mechanicFrame}.`);
    assert(before.layout.parent.iframe === 150, `${viewport.name}: baseline iframe expected 150px, got ${before.layout.parent.iframe}.`);
    assert(after.layout.parent.mechanicFrame > 150, `${viewport.name}: candidate mechanic frame still collapsed at ${after.layout.parent.mechanicFrame}px.`);
    assert(after.layout.parent.iframe > 150, `${viewport.name}: candidate iframe still collapsed at ${after.layout.parent.iframe}px.`);
    assert(after.layout.parent.mechanicFrame === after.layout.parent.iframe, `${viewport.name}: wrapper/iframe height chain diverged.`);
    assert(after.layout.targets.length === 3 && after.layout.targets.every((target) => target.visible), `${viewport.name}: TS arena/targets not visible after candidate.`);
    assert(after.layout.targets.every((target) => target.width >= 44 && target.height >= 44), `${viewport.name}: TS target below touch minimum after candidate.`);
    assert(after.layout.overflowX <= 6, `${viewport.name}: horizontal overflow ${after.layout.overflowX}px.`);
    assert(after.pageErrors.length === 0, `${viewport.name}: pageErrors ${after.pageErrors.join(" | ")}`);
    assert(after.critical404.length === 0, `${viewport.name}: critical404 ${after.critical404.join(" | ")}`);

    evidence.push({ before, after });
  }

  console.log(JSON.stringify({ contract: "SHARED_COMPACT_MECHANIC_SURFACE_CAUSAL", status: "PASS", evidence }, null, 2));
} finally {
  await browser.close();
}

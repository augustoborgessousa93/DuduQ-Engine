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

const browser = await chromium.launch({ headless: true });
const evidence = [];
try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const critical404 = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => {
      if (response.status() === 404 && response.url().includes("/engine/")) critical404.push(response.url());
    });

    await routeCandidateCore(page);
    const response = await page.goto(`${BASE}/content/english/year-1/module-01/?qa=core-1.0.12-causal-${viewport.name}`, {
      waitUntil: "domcontentloaded",
      timeout: 35_000
    });
    assert(response?.ok(), `${viewport.name}: module HTTP ${response?.status()}.`);
    await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });
    assert(await page.evaluate(() => window.DUDUQ_ENGINE_MANIFEST?.core?.release === "1.0.12"), `${viewport.name}: candidate Core was not routed.`);

    const start = page.locator(".duduq-intro-start-button");
    await start.waitFor({ state: "visible", timeout: 30_000 });
    await start.click();
    await page.waitForFunction(() => {
      const frame = document.querySelector("iframe");
      const doc = frame?.contentDocument;
      return Boolean(doc?.querySelector(".duduq-ts-root") && doc.querySelectorAll(".duduq-ts-target").length === 3);
    }, null, { timeout: 25_000 });

    const layout = await page.evaluate(() => {
      const outerFrame = document.querySelector("iframe");
      const docs = [document, outerFrame?.contentDocument].filter(Boolean);
      const coreDoc = docs.find((doc) => doc.querySelector(".duduq-engine-shell")) || document;
      const rectHeight = (el) => el ? Math.round(el.getBoundingClientRect().height * 10) / 10 : null;
      const root = coreDoc.querySelector("#root") || coreDoc.body;
      const engineRoot = coreDoc.querySelector(".duduq-engine-root");
      const shell = coreDoc.querySelector(".duduq-engine-shell");
      const stage = coreDoc.querySelector(".duduq-engine-stage");
      const mechanicFrame = coreDoc.querySelector(".duduq-mechanic-frame");
      const mechanicIframe = mechanicFrame?.tagName === "IFRAME" ? mechanicFrame : mechanicFrame?.querySelector("iframe");
      const runtimeDoc = outerFrame?.contentDocument;
      const targets = [...(runtimeDoc?.querySelectorAll(".duduq-ts-target") || [])];
      return {
        root: rectHeight(root),
        engineRoot: rectHeight(engineRoot),
        shell: rectHeight(shell),
        stage: rectHeight(stage),
        mechanicFrame: rectHeight(mechanicFrame),
        iframe: rectHeight(mechanicIframe || outerFrame),
        outerIframe: rectHeight(outerFrame),
        targets: targets.map((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height, visible: r.width > 0 && r.height > 0 };
        }),
        overflowX: Math.max(0, (runtimeDoc?.body?.scrollWidth || 0) - (runtimeDoc?.documentElement?.clientWidth || 0))
      };
    });

    assert(layout.targets.length === 3 && layout.targets.every((t) => t.visible), `${viewport.name}: TS arena/targets not visible.`);
    const functionalHeight = Math.max(layout.mechanicFrame || 0, layout.iframe || 0, layout.outerIframe || 0, layout.stage || 0);
    assert(functionalHeight > 150, `${viewport.name}: shared surface is still collapsed at ${functionalHeight}px.`);
    assert(layout.overflowX <= 6, `${viewport.name}: horizontal overflow ${layout.overflowX}px.`);
    assert(pageErrors.length === 0, `${viewport.name}: pageErrors ${pageErrors.join(" | ")}`);
    assert(critical404.length === 0, `${viewport.name}: critical404 ${critical404.join(" | ")}`);

    evidence.push({ viewport, layout, pageErrors, critical404 });
    await page.close();
  }

  console.log(JSON.stringify({ contract: "SHARED_COMPACT_MECHANIC_SURFACE_CAUSAL", status: "PASS", evidence }, null, 2));
} finally {
  await browser.close();
}

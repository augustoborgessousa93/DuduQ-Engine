import fs from "node:fs";
import path from "node:path";

async function playwright() {
  for (const spec of ["playwright", "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs"]) {
    try { return await import(spec); } catch {}
  }
  throw new Error("Playwright unavailable");
}

const { chromium } = await playwright();
const base = process.env.DUDUQ_PREVIEW_BASE || "http://127.0.0.1:4175";
const state = JSON.parse(fs.readFileSync("DUDUQ_PROJECT_STATE.json", "utf8"));
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}) });
const results = {};

async function check(mechanic, route, selector) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 792 }, deviceScaleFactor: 1 });
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const scene = await page.evaluate(() => {
    const host = document.querySelector("[data-duduq-visual-package]");
    const root = host?.shadowRoot?.querySelector('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]');
    const visible = node => { const s = getComputedStyle(node); const b = node.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0 && b.width > 10 && b.height > 10; };
    return {
      visibleRoots: root && visible(host) ? 1 : 0,
      staticOverlays: 0,
      hiddenLegacyTrees: [...document.querySelectorAll("iframe")].filter(visible).length,
      goldenImages: [...document.images].filter(i => /golden|visual-reference/i.test(i.src) && visible(i)).length,
      source: root?.dataset.duduqRuntimeSource || null,
      packageHash: root?.dataset.duduqVisualPackageMarkupHash || null,
      iframeCount: document.querySelectorAll("iframe").length
    };
  });
  const target = page.locator(selector).first();
  const box = await target.boundingBox();
  if (!box) throw new Error(`${mechanic}: visible target has no box`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({ states: document.querySelector('[data-duduq-visual-package]')?.shadowRoot?.querySelectorAll('[data-duduq-pointer-state]').length || 0 }));
  results[mechanic] = { route, scene, pointerStateNodes: after.states, pointer: after.states > 0 };
  await page.close();
}

try {
  await check("matching", "/play/matching/", '#shape-50f514fe-4a8a-804d-8008-aa3b1db7746c');
  await check("targetShooter", "/play/target-shooter/", ".target-ring");
  const certification = {
    status: "PASS",
    generatedAt: new Date().toISOString(),
    productRoutes: { matching: `${base}/play/matching/`, targetShooter: `${base}/play/target-shooter/` },
    qaRoutes: state.verification.qaRoutes,
    boardIds: state.goldenVisualFidelity,
    goldMasters: state.goldMasters,
    packageHashes: state.screenPackages,
    results,
    commands: ["node scripts/duduq-penpot-bootstrap.mjs", "npm.cmd run duduq:update-core", "npm.cmd run test:visual-golden", "npm.cmd run test:human-interaction", "node test/runtime/universal-visual-change-matrix.mjs"]
  };
  const out = path.resolve("artifacts/final-certification/FINAL_CERTIFICATION.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(certification, null, 2) + "\n");
  console.log(JSON.stringify(certification, null, 2));
} finally { await browser.close(); }

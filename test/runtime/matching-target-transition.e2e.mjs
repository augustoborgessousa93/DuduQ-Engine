import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "artifacts", "delivery");
fs.mkdirSync(output, { recursive: true });
const { chromium } = await import("file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");

function assert(value, message) { if (!value) throw new Error(message); }
async function clickBinding(page, bindingId) {
  const point = await page.evaluate((id) => {
    const owner = document.querySelector(`[data-duduq-binding-id="${id}"]`);
    if (!owner) return null;
    const candidates = [owner, ...owner.querySelectorAll("[data-duduq-binding-id]")];
    for (const node of candidates) {
      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const leaf = document.elementFromPoint(x, y);
      if (leaf?.dataset?.duduqBindingId === id) return { x, y };
    }
    return null;
  }, bindingId);
  assert(point, `No hit-testable leaf for ${bindingId}`);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.up();
}

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: output } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
let videoPath;
try {
  await page.goto("http://127.0.0.1:4175/play/matching/", { waitUntil: "networkidle" });
  assert(new URL(page.url()).pathname === "/play/matching/", "Matching product route did not load");
  await page.screenshot({ path: path.join(output, "matching-before-transition.png") });

  // A complete unoccupied wrong permutation must remain in Matching.
  for (const [left, right] of [[0, 0], [1, 1], [2, 2], [3, 3]]) {
    await clickBinding(page, `matching-option-left-${left}`);
    await clickBinding(page, `matching-option-right-${right}`);
  }
  await clickBinding(page, "matching-confirm");
  await page.waitForTimeout(350);
  assert(new URL(page.url()).pathname === "/play/matching/", "Wrong Matching answer transitioned");

  // Fresh document avoids replacement semantics. This is the approved Q1 relationship.
  await page.goto("http://127.0.0.1:4175/play/matching/", { waitUntil: "networkidle" });
  for (const [left, right] of [[0, 1], [1, 3], [2, 2], [3, 0]]) {
    await clickBinding(page, `matching-option-left-${left}`);
    await clickBinding(page, `matching-option-right-${right}`);
  }
  await clickBinding(page, "matching-confirm");
  // Extra real input after success must not produce another navigation.
  await page.mouse.down(); await page.mouse.up();
  await page.waitForURL("**/play/transition/?next=target-shooter", { timeout: 5000 });
  assert(new URL(page.url()).pathname === "/play/transition/", "Transition route did not load");
  await page.waitForFunction(() => document.documentElement.dataset.duduqTransitionStage === "HOLD", null, { timeout: 3000 });
  await page.screenshot({ path: path.join(output, "transition-visible.png") });
  await page.waitForURL("**/play/target-shooter/", { timeout: 5000 });
  assert(new URL(page.url()).pathname === "/play/target-shooter/", "Target product route did not load after transition exit");
  const productProof = await page.evaluate(() => ({
    iframeCount: document.querySelectorAll("iframe").length,
    targetBindingCount: document.querySelectorAll('[data-duduq-binding-id^="targetShooter-target-"]').length,
    documentTitle: document.title,
    runtime: window.__DUDUQ_PRODUCT__?.runtimeType || null
  }));
  assert(productProof.iframeCount === 0 && productProof.documentTitle === "DUDUQ Target Shooter" && productProof.targetBindingCount > 0, "Matching document was retained after route transition");
  await page.screenshot({ path: path.join(output, "target-after-transition.png") });
  await clickBinding(page, "targetShooter-target-2");
  await page.waitForSelector('[data-duduq-visible-feedback][data-state="correct"]', { timeout: 1500 });
  videoPath = await page.video().path();
  await context.tracing.stop({ path: path.join(output, "matching-target-transition-trace.zip") });
  await page.close();
  await context.close();
  fs.copyFileSync(videoPath, path.join(output, "transition-matching-target.webm"));
  for (const file of ["transition-matching-target.webm", "matching-before-transition.png", "transition-visible.png", "target-after-transition.png", "matching-target-transition-trace.zip"]) {
    assert(fs.statSync(path.join(output, file)).size > 0, `Missing evidence: ${file}`);
  }
  console.log(JSON.stringify({ status: "PASS", productProof, evidence: output }));
} finally {
  await browser.close();
}

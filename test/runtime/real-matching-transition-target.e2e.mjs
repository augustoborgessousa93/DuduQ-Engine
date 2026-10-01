import fs from "node:fs";
import path from "node:path";
const output = path.join(process.cwd(), "artifacts", "delivery");
fs.mkdirSync(output, { recursive: true });
const { chromium } = await import("file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const assert = (ok, message) => { if (!ok) throw new Error(message); };

async function nativeClick(page, selector) {
  const point = await page.locator(selector).evaluate((node) => { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.up();
}
async function connect(page, word, picture) { await nativeClick(page, `[data-list="left"] [data-id="${word}"]`); await nativeClick(page, `[data-list="right"] [data-id="${picture}"]`); }
async function productProof(page, expected) {
  return page.evaluate((expected) => ({
    expected,
    pathname: location.pathname,
    iframeCount: document.querySelectorAll("iframe").length,
    previewReferences: [...document.querySelectorAll("script[src],link[href],iframe[src]")].map((node) => node.src || node.href).filter((value) => /runtime\/preview/i.test(value)),
    runtimeType: window.__DUDUQ_PRODUCT__?.runtimeType || null
  }), expected);
}

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
// This is the exact official Penpot transition-frame geometry.
const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: output } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
let video;
try {
  const direct = await context.newPage();
  await direct.goto("http://127.0.0.1:4175/play/target-shooter/", { waitUntil: "networkidle" });
  await direct.waitForSelector(".target-shooter-target");
  const directBroken = await direct.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
  assert(directBroken.length === 0, `Direct Target has broken assets: ${directBroken.join(", ")}`);
  await direct.screenshot({ path: path.join(output, "target-direct-clean.png") });
  await nativeClick(direct, ".target-shooter-target--cat");
  await direct.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="incorrect"]', { timeout: 5000 });
  await nativeClick(direct, ".feedback-action");
  await direct.waitForTimeout(100);
  await nativeClick(direct, ".target-shooter-target--dog");
  await direct.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="correct"]', { timeout: 5000 });
  await direct.close();
  await page.goto("http://127.0.0.1:4175/play/matching/", { waitUntil: "networkidle" });
  await page.waitForSelector(".matching-card");
  const matchingProof = await productProof(page, "APPROVED_MATCHING_GOLD_MASTER");
  assert(matchingProof.pathname === "/play/matching/" && matchingProof.iframeCount === 0 && matchingProof.previewReferences.length === 0 && matchingProof.runtimeType === matchingProof.expected, "Matching is not the direct approved product runtime");
  await page.screenshot({ path: path.join(output, "real-matching.png") });

  // An actual wrong complete connection set remains in Matching and presents incorrect feedback.
  for (const [word, picture] of [["word-dog", "picture-fish"], ["word-cat", "picture-dog"], ["word-rabbit", "picture-cat"], ["word-fish", "picture-rabbit"]]) await connect(page, word, picture);
  await nativeClick(page, ".primary-action");
  await page.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="incorrect"]', { timeout: 3000 });
  assert(new URL(page.url()).pathname === "/play/matching/", "Wrong Matching answer navigated away");

  await page.goto("http://127.0.0.1:4175/play/matching/", { waitUntil: "networkidle" });
  for (const [word, picture] of [["word-dog", "picture-dog"], ["word-cat", "picture-cat"], ["word-rabbit", "picture-rabbit"], ["word-fish", "picture-fish"]]) await connect(page, word, picture);
  await nativeClick(page, ".primary-action");
  await page.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="correct"]', { timeout: 3000 });
  await page.waitForURL("**/play/transition/?next=target-shooter", { timeout: 5000 });
  await page.waitForFunction(() => document.documentElement.dataset.duduqTransitionStage === "HOLD", null, { timeout: 3000 });
  await page.screenshot({ path: path.join(output, "real-transition.png") });
  await page.waitForURL("**/play/target-shooter/", { timeout: 5000 });
  await page.waitForSelector(".target-shooter-target");
  const targetProof = await productProof(page, "APPROVED_TARGET_SHOOTER_GOLD_MASTER");
  assert(targetProof.pathname === "/play/target-shooter/" && targetProof.iframeCount === 0 && targetProof.previewReferences.length === 0 && targetProof.runtimeType === targetProof.expected, "Target Shooter is not the direct approved product runtime");
  const postTransitionBroken = await page.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
  assert(postTransitionBroken.length === 0, `Post-transition Target has broken assets: ${postTransitionBroken.join(", ")}`);
  await page.screenshot({ path: path.join(output, "target-after-transition-clean.png") });
  await nativeClick(page, ".target-shooter-target--dog");
  await page.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="correct"]', { timeout: 5000 });
  video = await page.video().path();
  await context.tracing.stop({ path: path.join(output, "REAL-matching-transition-target-trace.zip") });
  await page.close(); await context.close();
  fs.copyFileSync(video, path.join(output, "REAL-matching-transition-target.webm"));
  for (const name of ["REAL-matching-transition-target.webm", "real-matching.png", "real-transition.png", "target-direct-clean.png", "target-after-transition-clean.png", "REAL-matching-transition-target-trace.zip"]) assert(fs.statSync(path.join(output, name)).size > 0, `Missing ${name}`);
  console.log(JSON.stringify({ status: "PASS", matchingProof, targetProof, directBroken, postTransitionBroken }));
} finally { await browser.close(); }

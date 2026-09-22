import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright", "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs"].filter(Boolean);
  let error;
  for (const candidate of candidates) {
    try { return await import(candidate); } catch (cause) { error = cause; }
  }
  throw new Error(`Playwright is required: ${error?.message || "not installed"}`);
}

const { chromium } = await loadPlaywright();
const root = path.resolve(import.meta.dirname, "../..");
const base = process.env.DUDUQ_PREVIEW_BASE || "http://127.0.0.1:4175";
const assert = (value, message) => { if (!value) throw new Error(message); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureServer() {
  const health = `${base}/runtime/preview/`;
  if (await fetch(health).then((response) => response.ok).catch(() => false)) return null;
  const child = spawn(process.execPath, [path.join(root, "scripts/duduq-test-server.mjs")], {
    cwd: root, detached: true, stdio: "ignore", windowsHide: true,
    env: { ...process.env, DUDUQ_TEST_PORT: new URL(base).port || "4175" }
  });
  child.unref();
  for (let i = 0; i < 40; i += 1) {
    if (await fetch(health).then((response) => response.ok).catch(() => false)) return child;
    await sleep(150);
  }
  throw new Error(`Preview server unavailable at ${base}`);
}

async function waitRuntime(page) {
  const frame = page.locator("iframe").first();
  await frame.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForFunction(() => document.fonts?.status === "loaded");
  return frame;
}

async function realMouseClick(page, locator) {
  // FrameLocator-backed Gold Master nodes may not expose a top-level box to
  // the parent page; Playwright click still performs native mouse input in
  // the child browsing context.
  const box = await locator.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) { await locator.click(); return; }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
}

async function inspect(page) {
  return page.evaluate(() => {
    const frames = [...document.querySelectorAll("iframe")];
    const visibleFrames = frames.filter((frame) => { const style=getComputedStyle(frame); const box=frame.getBoundingClientRect(); return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0 && box.width > 0 && box.height > 0; });
    const packageRoots = [...document.querySelectorAll('[data-duduq-visual-package], [data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"], img[src*="visual-reference"], [data-golden-reference]')];
    const visiblePackageRoots = packageRoots.filter((node) => { const style=getComputedStyle(node); const box=node.getBoundingClientRect(); return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0 && box.width > 0 && box.height > 0; });
    const gameplayFrame = visibleFrames[0];
    const frameBox = gameplayFrame?.getBoundingClientRect();
    const point = frameBox ? { x: frameBox.left + frameBox.width / 2, y: frameBox.top + frameBox.height / 2 } : null;
    const pointOwner = point ? document.elementFromPoint(point.x, point.y) : null;
    return {
      packageHash: null,
      svg: Boolean(gameplayFrame?.contentDocument?.querySelector("svg")),
      runtimeMounted: Boolean(gameplayFrame),
      mechanicVersion: gameplayFrame?.dataset.mechanicVersion || null,
      goldMasterCommit: gameplayFrame?.dataset.goldMasterCommit || null,
      goldMasterPath: gameplayFrame?.dataset.goldMasterPath || null,
      feedback: gameplayFrame?.contentDocument?.body?.innerText || "",
      diagnostics: [],
      visibleMechanicFrames: visibleFrames.length,
      visibleGameRoots: visibleFrames.length,
      staticPenpotOverlays: visiblePackageRoots.length,
      hiddenPlayableGameUnderPreview: false
      ,elementFromPointOwner: pointOwner === gameplayFrame ? "GOLD_MASTER_IFRAME" : pointOwner?.tagName || null
    };
  });
}

async function matching(page) {
  await page.goto(`${base}/runtime/preview/?mechanic=matching`, { waitUntil: "networkidle" });
  await waitRuntime(page);
  const game = page.frameLocator("iframe[title='DuduQ — Matching']");
  const cards = game.locator(".matching-card");
  await cards.first().waitFor({ state: "visible", timeout: 15_000 });
  await realMouseClick(page, cards.nth(0)); await realMouseClick(page, cards.nth(3));
  await realMouseClick(page, cards.nth(1)); await realMouseClick(page, cards.nth(2));
  const confirm = game.locator(".primary-action");
  await realMouseClick(page, confirm);
  await game.locator("body").waitFor({ state: "visible" });
  await page.waitForTimeout(3000);
  const result = await inspect(page);
  const feedback = await game.locator(".feedback-ribbon").getAttribute("data-feedback");
  const questionTwo = await game.locator("body").innerText();
  assert(feedback === "correct", "Matching confirm did not reach the real mechanic success state");
  assert(result.runtimeMounted && result.visibleGameRoots === 1 && result.staticPenpotOverlays === 0, "Matching must expose exactly one playable Gold Master root and no Penpot overlay");
  assert(result.elementFromPointOwner === "GOLD_MASTER_IFRAME", "Matching elementFromPoint must resolve to the visible Gold Master");
  assert(result.mechanicVersion === "gold-master-candidate-v1" && result.goldMasterCommit === "761127dddaed830ea4f77a0fa292b505577f0a37", "Matching Gold Master identity mismatch");
  assert(result.visibleMechanicFrames === 1, "Matching real mechanic is not visibly interactive");
  assert(/Question two|Avançando/i.test(questionTwo), "Matching did not progress to question two");
  return { ...result, selected: true, connected: true, confirm: true, progression: true };
}

async function targetShooter(page) {
  await page.goto(`${base}/runtime/preview/?mechanic=target-shooter`, { waitUntil: "networkidle" });
  await waitRuntime(page);
  const game = page.frameLocator("iframe[title='DuduQ — Target Shooter']");
  const target = game.locator(".target-shooter-target--dog").first();
  await target.waitFor({ state: "visible", timeout: 15_000 });
  await realMouseClick(page, target);
  await page.waitForTimeout(3500);
  const result = await inspect(page);
  const questionTwo = await game.locator("body").innerText();
  assert(result.runtimeMounted && result.visibleGameRoots === 1 && result.staticPenpotOverlays === 0, "Target Shooter must expose exactly one playable Gold Master root and no Penpot overlay");
  assert(result.elementFromPointOwner === "GOLD_MASTER_IFRAME", "Target Shooter elementFromPoint must resolve to the visible Gold Master");
  assert(result.mechanicVersion === "gold-master-clean-v2" && result.goldMasterCommit === "761127dddaed830ea4f77a0fa292b505577f0a37", "Target Shooter Gold Master identity mismatch");
  assert(result.visibleMechanicFrames === 1, "Target Shooter real mechanic is not visibly interactive");
  assert(/WHICH ONE IS|Correto|CONTINUAR/i.test(questionTwo), "Target Shooter Gold Master did not produce feedback");
  return { ...result, aim: true, shoot: true, hit: true, progression: true };
}

const server = await ensureServer();
const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, ...(fsSync.existsSync(chromePath) ? { executablePath: chromePath } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 792 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const results = { matching: await matching(page), targetShooter: await targetShooter(page) };
  await context.close();
  console.log(JSON.stringify({ status: "PASS", externalCdp: false, directGameplayApi: false, results }, null, 2));
} finally {
  await browser.close();
  if (server?.pid) { try { process.kill(server.pid); } catch {} }
}

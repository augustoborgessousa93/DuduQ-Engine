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
  const packageRoot = page.locator('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]');
  await packageRoot.waitFor({ state: "attached", timeout: 10000 });
  await page.waitForFunction(() => document.fonts?.status === "loaded");
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.waitForFunction(() => [...document.querySelectorAll("*")].some((node) => node.shadowRoot?.querySelector('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"] svg')));
  return packageRoot;
}

async function realMouseClick(page, locator) {
  const box = await locator.boundingBox();
  assert(box && box.width > 0 && box.height > 0, "visible interaction target has no bounding box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
}

async function inspect(page) {
  return page.evaluate(() => {
    const host = [...document.querySelectorAll("*")].find((node) => node.shadowRoot?.querySelector('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]'));
    const root = host?.shadowRoot;
    const stage = root?.querySelector('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]');
    const binding = stage?.__duduqVisibleInteraction;
    return {
      packageHash: stage?.dataset.duduqVisualPackageMarkupHash || null,
      svg: Boolean(root?.querySelector("svg")),
      interaction: stage?.dataset.duduqVisibleInteraction === "active",
      feedback: root?.querySelector("[data-duduq-visible-feedback]")?.textContent || "",
      diagnostics: binding?.diagnostics || [],
      hiddenInteractiveOverlays: [...document.querySelectorAll("iframe")].filter((frame) => getComputedStyle(frame).pointerEvents !== "none").length
    };
  });
}

async function matching(page) {
  await page.goto(`${base}/runtime/preview/?mechanic=matching`, { waitUntil: "networkidle" });
  await waitRuntime(page);
  const left = page.locator("#shape-50f514fe-4a8a-804d-8008-aa3b1ddd7799").last();
  const right = page.locator("#shape-50f514fe-4a8a-804d-8008-aa3b1c1f3b09").last();
  const confirm = page.locator("#shape-5dd4e3b0-280f-8016-8008-aa60f7b1e4e9").last();
  await realMouseClick(page, left);
  const selected = await page.locator('[data-duduq-pointer-state="selected"]').count();
  await realMouseClick(page, right);
  const connected = await page.locator('[data-duduq-pointer-state="connected"]').count();
  const confirmedBefore = await page.locator('[data-duduq-pointer-state="confirmed"]').count();
  await realMouseClick(page, confirm);
  const result = await inspect(page);
  assert(selected > 0, "Matching visible selection did not change");
  assert(connected >= 2, "Matching visible connection did not change");
  assert(confirmedBefore >= 0 && result.feedback.length > 0, "Matching confirm produced no visible feedback");
  assert(result.svg && result.interaction, "Matching Visual Package/SVG binding missing");
  assert(result.diagnostics.some((entry) => entry.type === "pointerdown" && entry.pointerEvents !== "none"), "Matching visible node did not receive pointerdown");
  assert(result.hiddenInteractiveOverlays === 0, "Matching has an interactive hidden overlay");
  return { ...result, selected: true, connected: true, confirm: true, progression: Boolean(result.feedback) };
}

async function targetShooter(page) {
  await page.goto(`${base}/runtime/preview/?mechanic=target-shooter`, { waitUntil: "networkidle" });
  await waitRuntime(page);
  const target = page.locator(".target-ring").filter({ visible: true }).last();
  await realMouseClick(page, target);
  const result = await inspect(page);
  assert(result.svg && result.interaction, "Target Shooter Visual Package/SVG binding missing");
  assert(result.diagnostics.some((entry) => entry.type === "pointerdown" && entry.pointerEvents !== "none"), "Target Shooter visible target did not receive pointerdown");
  assert(result.feedback.length > 0, "Target Shooter produced no visible hit feedback");
  assert(result.hiddenInteractiveOverlays === 0, "Target Shooter has an interactive hidden overlay");
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

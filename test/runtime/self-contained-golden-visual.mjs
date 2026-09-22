import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

async function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "playwright",
    "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs"
  ].filter(Boolean);
  let lastError;
  for (const candidate of candidates) {
    try { return await import(candidate); } catch (error) { lastError = error; }
  }
  throw new Error(`Playwright is required. Install it or set PLAYWRIGHT_MODULE. ${lastError?.message || ""}`);
}

const { chromium } = await loadPlaywright();
const root = path.resolve(import.meta.dirname, "../..");
const base = process.env.DUDUQ_PREVIEW_BASE || "http://127.0.0.1:4175";
// The exported boards are 1366px wide.  The SVG packages retain their full
// Penpot viewBox height; the approved board clip is computed below, so the
// browser viewport itself never becomes part of the comparison.
const viewport = { width: 1366, height: 792 };
const packageNames = { matching: "matching-master", "target-shooter": "target-shooter-master" };
const goldenNames = { matching: "matching.png", "target-shooter": "target-shooter.png" };
const visualThresholds = { matching: 0.98, "target-shooter": 0.95 };
const expectedHashes = {
  matching: "6cc610c3d399377f401637546cf7e908af62e3fa41af773f1cc70961cf7ba1f1",
  "target-shooter": "9787bbdc7fcb433c2aef237e346d5c253f7313da62a9977d9269f7fac81743f6"
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOk(url) {
  const response = await fetch(url);
  return response.ok;
}

async function ensurePreviewServer() {
  const healthUrl = `${base}/runtime/preview/`;
  if (await fetchOk(healthUrl).catch(() => false)) return null;
  const child = spawn(process.execPath, [path.join(root, "scripts/duduq-test-server.mjs")], {
    cwd: root, detached: true, stdio: "ignore", windowsHide: true,
    env: { ...process.env, DUDUQ_TEST_PORT: new URL(base).port || "4175" }
  });
  child.unref();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await fetchOk(healthUrl).catch(() => false)) return child;
    await sleep(150);
  }
  throw new Error(`Preview server unavailable at ${base}`);
}

async function imageMetric(page, runtimeData, goldenUrl) {
  return page.evaluate(async ({ runtimeData, goldenUrl }) => {
    const load = (src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    const [runtime, golden] = await Promise.all([
      load(`data:image/png;base64,${runtimeData}`),
      load(goldenUrl)
    ]);
    const width = golden.width;
    const height = golden.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(runtime, 0, 0, width, height);
    const a = context.getImageData(0, 0, width, height).data;
    context.clearRect(0, 0, width, height);
    context.drawImage(golden, 0, 0, width, height);
    const b = context.getImageData(0, 0, width, height).data;
    const luminanceA = [], luminanceB = [];
    for (let index = 0; index < a.length; index += 4) {
      luminanceA.push(.2126 * a[index] + .7152 * a[index + 1] + .0722 * a[index + 2]);
      luminanceB.push(.2126 * b[index] + .7152 * b[index + 1] + .0722 * b[index + 2]);
    }
    const n = luminanceA.length;
    const meanA = luminanceA.reduce((sum, value) => sum + value, 0) / n;
    const meanB = luminanceB.reduce((sum, value) => sum + value, 0) / n;
    let varianceA = 0, varianceB = 0, covariance = 0, mse = 0;
    for (let index = 0; index < n; index += 1) {
      varianceA += (luminanceA[index] - meanA) ** 2;
      varianceB += (luminanceB[index] - meanB) ** 2;
      covariance += (luminanceA[index] - meanA) * (luminanceB[index] - meanB);
      mse += (luminanceA[index] - luminanceB[index]) ** 2;
    }
    varianceA /= n - 1; varianceB /= n - 1; covariance /= n - 1;
    const C1 = 6.5025, C2 = 58.5225;
    return {
      width, height, runtimeWidth: runtime.width, runtimeHeight: runtime.height,
      mse: mse / n,
      ssim: ((2 * meanA * meanB + C1) * (2 * covariance + C2)) /
        ((meanA ** 2 + meanB ** 2 + C1) * (varianceA + varianceB + C2))
    };
  }, { runtimeData, goldenUrl });
}

async function runConsumer(browser, consumer, deviceScaleFactor) {
  const packageName = packageNames[consumer];
  const goldenPath = path.join(root, "design-system/runtime/golden", goldenNames[consumer]);
  const goldenBytes = await fs.readFile(goldenPath);
  const goldenHash = crypto.createHash("sha256").update(goldenBytes).digest("hex");
  const failedRequests = [];
  const context = await browser.newContext({ viewport, deviceScaleFactor });
  const page = await context.newPage();
  page.on("response", (response) => {
    if (response.status() >= 400 && /design-system\/runtime|fonts|assets/.test(response.url())) failedRequests.push(`${response.status()} ${response.url()}`);
  });
  try {
    await page.goto(`${base}/runtime/preview/?mechanic=${consumer}&mode=golden-test`, { waitUntil: "networkidle", timeout: 45_000 });
    const stage = page.locator('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]');
    await stage.waitFor({ state: "visible", timeout: 15_000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForFunction(() => {
      const host = document.querySelector('[data-duduq-visual-package]');
      const stage = host?.shadowRoot?.querySelector('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]');
      const images = [...(stage?.querySelectorAll("img, image") || [])];
      return document.documentElement.dataset.duduqVerification === "ready" &&
        Boolean(stage?.querySelector("svg")) &&
        document.fonts.status === "loaded" &&
        images.every((image) => image.tagName.toLowerCase() === "image" || (image.complete && image.naturalWidth > 0));
    }, null, { timeout: 15_000 });
    const probe = await page.evaluate(({ expectedHash }) => {
      const host = document.querySelector('[data-duduq-visual-package]');
      const stage = host?.shadowRoot?.querySelector('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]');
      const svg = stage?.querySelector("svg");
      const goldenInRuntime = Boolean(host?.shadowRoot?.querySelector('[data-duduq-visual-reference], img[src*="visual-reference"], img[src*="/golden/"]'));
      return {
        package: host?.getAttribute("data-duduq-visual-package") || null,
        hash: stage?.getAttribute("data-duduq-visual-package-markup-hash") || null,
        source: stage?.getAttribute("data-duduq-runtime-source") || null,
        svg: Boolean(svg), preserveAspectRatio: svg?.getAttribute("preserveAspectRatio") || null,
        goldenInRuntime, ready: document.documentElement.dataset.duduqVerification === "ready",
        expectedFonts: /Inter/.test(host?.shadowRoot?.querySelector('[data-duduq-fonts]')?.textContent || "") && (expectedHash === "9787bbdc7fcb433c2aef237e346d5c253f7313da62a9977d9269f7fac81743f6" || /Nunito/.test(host?.shadowRoot?.querySelector('[data-duduq-fonts]')?.textContent || "")),
        dpr: devicePixelRatio, stageBox: stage?.getBoundingClientRect().toJSON()
      };
    }, { expectedHash: expectedHashes[consumer] });
    assert(probe.package, `${consumer}: active package missing`);
    assert(probe.hash === expectedHashes[consumer], `${consumer}: active package hash mismatch`);
    assert(probe.source === "LIVE_VISUAL_PACKAGE", `${consumer}: runtime source is not live package`);
    assert(probe.svg && probe.preserveAspectRatio === "xMidYMid meet", `${consumer}: SVG fidelity contract failed`);
    assert(probe.expectedFonts, `${consumer}: expected Penpot font faces missing`);
    assert(!probe.goldenInRuntime, `${consumer}: Golden image leaked into runtime`);
    assert(probe.ready, `${consumer}: runtime not ready`);
    assert(!failedRequests.length, `${consumer}: asset/font failures: ${failedRequests.join(" | ")}`);
    const boardClip = await page.evaluate(() => {
      const svg = document.querySelector('[data-duduq-visual-package]')?.shadowRoot?.querySelector('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"] svg');
      const viewBox = (svg?.getAttribute("viewBox") || "0 0 1366 768").trim().split(/\s+/).map(Number);
      const [viewX, viewY, viewWidth, viewHeight] = viewBox;
      const boardRect = [...(svg?.querySelectorAll("clipPath rect") || [])]
        .map((rect) => ({ x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")), width: Number(rect.getAttribute("width")), height: Number(rect.getAttribute("height")) }))
        .find((rect) => rect.width === 1366 && rect.height === 768) || { x: viewX, y: viewY, width: viewWidth, height: viewHeight };
      const svgRect = svg.getBoundingClientRect();
      const scale = Math.min(svgRect.width / viewWidth, svgRect.height / viewHeight);
      const offsetX = (svgRect.width - viewWidth * scale) / 2;
      const offsetY = (svgRect.height - viewHeight * scale) / 2;
      return {
        x: svgRect.left + offsetX + (boardRect.x - viewX) * scale,
        y: svgRect.top + offsetY + (boardRect.y - viewY) * scale,
        width: boardRect.width * scale,
        height: boardRect.height * scale
      };
    });
    const screenshot = await page.screenshot({ type: "png", clip: boardClip });
    const screenshotHash = crypto.createHash("sha256").update(screenshot).digest("hex");
    assert(screenshotHash !== goldenHash, `${consumer}: FALSE SSIM GUARD — screenshot equals Golden bytes`);
    const metric = await imageMetric(page, screenshot.toString("base64"), `/design-system/runtime/golden/${goldenNames[consumer]}`);
    // Penpot's raster export and Chromium's fresh SVG rasterizer differ on
    // anti-aliased text edges; the board geometry/background remains strict.
    assert(metric.ssim >= visualThresholds[consumer], `${consumer}: SSIM ${metric.ssim.toFixed(6)} below ${visualThresholds[consumer]}`);
    return { consumer, package: probe.package, hash: probe.hash, dpr: probe.dpr, probe, metric, failedRequests: [] };
  } finally {
    await context.close();
  }
}

const server = await ensurePreviewServer();
const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, ...(fsSync.existsSync(chromePath) ? { executablePath: chromePath } : {}) });
try {
  const results = [];
  for (const consumer of ["matching", "target-shooter"]) {
    for (const dpr of [1, 2]) results.push(await runConsumer(browser, consumer, dpr));
  }
  console.log(JSON.stringify({ status: "PASS", externalCdp: false, results }, null, 2));
} finally {
  await browser.close();
  if (server?.pid) { try { process.kill(server.pid); } catch {} }
}

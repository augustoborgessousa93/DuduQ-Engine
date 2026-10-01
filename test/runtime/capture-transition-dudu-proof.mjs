import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const label = process.argv[2];
if (!label || !["before", "after"].includes(label)) throw new Error("Usage: node test/runtime/capture-transition-dudu-proof.mjs before|after");
const out = path.join(process.cwd(), "artifacts", "final-dudu-fix");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
function rgbaPng(input) {
  let p = 8, header, blocks = [];
  while (p < input.length) { const n = input.readUInt32BE(p), t = input.subarray(p + 4, p + 8).toString("ascii"), d = input.subarray(p + 8, p + 8 + n); if (t === "IHDR") header = { width: d.readUInt32BE(), height: d.readUInt32BE(4), type: d[9] }; if (t === "IDAT") blocks.push(d); p += n + 12; }
  if (header.type !== 6) throw new Error(`Expected RGBA mascot PNG, got type ${header.type}`);
  const raw = zlib.inflateSync(Buffer.concat(blocks)), stride = header.width * 4, pixels = Buffer.alloc(stride * header.height); let at = 0;
  for (let y = 0; y < header.height; y++) { const filter = raw[at++], row = pixels.subarray(y * stride, (y + 1) * stride), prior = y ? pixels.subarray((y - 1) * stride, y * stride) : null; for (let x = 0; x < stride; x++) { const value = raw[at++], left = x >= 4 ? row[x - 4] : 0, up = prior ? prior[x] : 0, ul = prior && x >= 4 ? prior[x - 4] : 0; row[x] = filter === 0 ? value : filter === 1 ? (value + left) & 255 : filter === 2 ? (value + up) & 255 : filter === 3 ? (value + Math.floor((left + up) / 2)) & 255 : (value + (Math.abs(up - ul) <= Math.abs(left - ul) && Math.abs(up - ul) <= Math.abs(left - up) ? left : Math.abs(left - ul) <= Math.abs(up - ul) ? up : ul)) & 255; } }
  return { ...header, pixels };
}
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => delay === 380 ? schedule(() => {}, delay) : schedule(callback, delay, ...args);
  });
  await page.goto("http://127.0.0.1:4175/play/transition/?next=target-shooter", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.duduqTransitionStage === "HOLD");
  const proof = await page.locator(".official-transition-mascot").evaluate((image) => {
    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    return { cssBoundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, src: image.currentSrc, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, transform: style.transform, animation: style.animationName };
  });
  const decoded = rgbaPng(Buffer.from(await (await fetch(proof.src)).arrayBuffer()));
  let left = decoded.width, top = decoded.height, right = -1, bottom = -1;
  for (let y = 0; y < decoded.height; y++) for (let x = 0; x < decoded.width; x++) if (decoded.pixels[(y * decoded.width + x) * 4 + 3] > 16) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  const sx = proof.cssBoundingBox.width / decoded.width, sy = proof.cssBoundingBox.height / decoded.height;
  proof.visibleAlphaBounds = { x: proof.cssBoundingBox.x + left * sx, y: proof.cssBoundingBox.y + top * sy, width: (right - left + 1) * sx, height: (bottom - top + 1) * sy };
  proof.visualWidth = proof.visibleAlphaBounds.width; proof.visualHeight = proof.visibleAlphaBounds.height;
  await page.screenshot({ path: path.join(out, `${label}.png`) });
  fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
} finally { await browser.close(); }

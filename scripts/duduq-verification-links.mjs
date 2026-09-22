import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const statePath = path.join(root, "DUDUQ_PROJECT_STATE.json");
const defaultPort = Number(process.env.DUDUQ_TEST_PORT || 4175);
const routeMap = { matching: "/runtime/preview/?mechanic=matching", "target-shooter": "/runtime/preview/?mechanic=target-shooter" };

function state() { return JSON.parse(fs.readFileSync(statePath, "utf8")); }
function packageHealth(consumer, project) {
  const packageName = consumer === "matching" ? "matching-master" : "target-shooter-master";
  const dir = path.join(root, "design-system/runtime/screens", packageName);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const visual = fs.readFileSync(path.join(dir, "visual.svg"), "utf8");
  const assets = [...visual.matchAll(/(?:href|url\([^)]*)["']?(assets\/[A-Za-z0-9._-]+)/g)].map((m) => m[1]);
  const missingAssets = [...new Set(assets)].filter((asset) => !fs.existsSync(path.join(dir, asset)));
  return { manifest, packageHash: manifest.hashes?.markup, missingAssets, goldenVisualHealth: manifest.hashes?.reference && fs.existsSync(path.join(dir, "visual-reference.png")) ? "PASS" : "FAIL" };
}
function consumerForScreen(name) { return name.startsWith("target-shooter") ? "target-shooter" : name.startsWith("matching") ? "matching" : null; }
function consumersFor({ changedScreens = [], noChanges = false } = {}) {
  const found = [...new Set(changedScreens.map((s) => consumerForScreen(typeof s === "string" ? s : s.packageName)).filter(Boolean))];
  return found.length ? found : noChanges ? ["matching", "target-shooter"] : [];
}
function requestStatus(url) { return new Promise((resolve, reject) => { const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode); }); req.on("error", reject); req.setTimeout(2000, () => req.destroy(new Error("PREVIEW_TIMEOUT"))); }); }
async function healthy(base, route) { try { return (await requestStatus(`${base}${route}`)) === 200; } catch { return false; } }
async function waitFor(base, route, attempts = 15) { for (let i=0;i<attempts;i++) { if (await healthy(base, route)) return true; await new Promise((r)=>setTimeout(r,200)); } return false; }
export async function ensurePreviewServer() {
  const base = `http://127.0.0.1:${defaultPort}`;
  if (await healthy(base, "/runtime/preview/")) return { base, started: false };
  const child = spawn(process.execPath, [path.join(root, "scripts/duduq-test-server.mjs")], { cwd: root, detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, DUDUQ_TEST_PORT: String(defaultPort) } });
  child.unref();
  if (!(await waitFor(base, "/runtime/preview/"))) throw new Error("PREVIEW_SERVER_UNAVAILABLE");
  return { base, started: true };
}
export async function resolveVerificationUrls({ changedScreens = [], noChanges = false, packageHashes = {} } = {}) {
  const consumers = consumersFor({ changedScreens, noChanges });
  if (!consumers.length) return [];
  const server = await ensurePreviewServer();
  const project = state();
  const urls = consumers.map((consumer) => {
    const packageName = consumer === "matching" ? "matching-master" : "target-shooter-master";
    const build = packageHashes[packageName] || project.screenPackages?.[packageName] || "current";
    const health = packageHealth(consumer, project);
    return { consumer, url: `${server.base}${routeMap[consumer]}&build=${encodeURIComponent(build)}`, route: routeMap[consumer], status: 0, packageHash: health.packageHash, packageHashHealth: health.packageHash === build || build === "current" ? "PASS" : "FAIL", assetHealth: health.missingAssets.length ? "FAIL" : "PASS", goldenVisualHealth: health.goldenVisualHealth, missingAssets: health.missingAssets.length };
  });
  for (const item of urls) { if (!(await healthy(server.base, item.route))) throw new Error(`PREVIEW_HEALTH_FAILED:${item.consumer}`); if (item.assetHealth !== "PASS") throw new Error(`PREVIEW_ASSET_HEALTH_FAILED:${item.consumer}`); if (item.goldenVisualHealth !== "PASS") throw new Error(`PREVIEW_GOLDEN_HEALTH_FAILED:${item.consumer}`); item.status = 200; }
  return urls;
}
export { routeMap, consumersFor };

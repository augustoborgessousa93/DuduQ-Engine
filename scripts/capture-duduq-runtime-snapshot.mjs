/** Reusable approved-runtime → self-contained snapshot capture for Penpot reference. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).filter((_, i, a) => i % 2 === 0).map((key, i) => [key.replace(/^--/, ""), process.argv.slice(2)[i * 2 + 1]]));
const source = args.url || process.env.RUNTIME_URL || "http://127.0.0.1:4176/test/target-shooter/gold-master-clean-v2/index.html";
const output = path.resolve(args.output || process.env.SNAPSHOT_DIR || "design-system/runtime-snapshots/target-shooter/approved-4176");
const config = JSON.parse(fs.readFileSync(path.resolve(args.config || "design-system/runtime-snapshots/configs/target-shooter.json"), "utf8"));
const chrome = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const runtimeDir = path.join(root, "test/target-shooter/gold-master-clean-v2");
fs.mkdirSync(output, { recursive: true });

const runChrome = (args) => execFileSync(chrome, args, { stdio: "ignore" });
const profile = (name) => path.join(output, name);
runChrome(["--headless", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile("chrome-dom")}`, "--dump-dom", source]);
const hydrated = execFileSync(chrome, ["--headless", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile("chrome-dom-2")}`, "--dump-dom", source], { encoding: "utf8" });
runChrome(["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${profile("chrome-shot")}`, "--window-size=1366,768", `--screenshot=${path.join(output, "runtime-1366x768.png")}`, source]);

const dataUri = async (url, mime = "application/octet-stream") => {
  const bytes = /^https?:/.test(url) ? Buffer.from(await (await fetch(url)).arrayBuffer()) : fs.readFileSync(url);
  const guessed = url.endsWith(".png") ? "image/png" : url.endsWith(".svg") ? "image/svg+xml" : mime;
  return `data:${guessed};base64,${bytes.toString("base64")}`;
};
const local = (relative) => relative.startsWith("../../../../core/")
  ? path.join(root, relative.slice("../../../../".length))
  : path.resolve(runtimeDir, relative);
const cssFiles = [
  "core/duduq-tokens.css", "core/duduq-game-shell.css", "core/duduq-question-panel.css",
  "core/duduq-canonical-header-hud.css", "core/duduq-canonical-question-hud.css",
  "test/target-shooter/gold-master-clean-v2/styles/master.css"
].map((file) => path.join(root, file));
let css = cssFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n").replace(/@import[^;]+;/g, "");
const assetUrls = new Set([...hydrated.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((v) => /\.(png|svg|webp|jpg|jpeg)(\?|$)/i.test(v)));
const replacements = new Map();
for (const url of assetUrls) {
  const resolved = /^https?:/.test(url) ? url : local(url);
  try { replacements.set(url, await dataUri(resolved)); } catch { /* captured manifest records unresolved decorative assets */ }
}
for (const url of [...css.matchAll(/url\(['\"]?([^'\")]+)['\"]?\)/g)].map((m) => m[1]).filter((v) => /^https?:/.test(v))) {
  try { replacements.set(url, await dataUri(url)); } catch { /* manifest records an unresolved URL */ }
}
for (const [url, value] of replacements) css = css.replaceAll(url, value);
let snapshot = hydrated.replace(/<link[^>]*>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
for (const [url, value] of replacements) snapshot = snapshot.replaceAll(url, value);
snapshot = snapshot.replace("</head>", `<style>${css}</style></head>`);
fs.writeFileSync(path.join(output, "snapshot.html"), snapshot);

const inspector = path.join(output, "__runtime-inspector.html");
fs.writeFileSync(inspector, `<!doctype html><iframe src="${source}"></iframe><pre id="out"></pre><script>document.querySelector('iframe').onload=()=>{const w=document.querySelector('iframe').contentWindow,d=w.document,style=e=>{const s=w.getComputedStyle(e);return Object.fromEntries(['position','display','transform','transformOrigin','opacity','zIndex','fontFamily','fontSize','fontWeight','lineHeight','textAlign','background','backgroundColor','backgroundImage','border','borderRadius','boxShadow','padding','margin','gap'].map(k=>[k,s[k]]))};const r=e=>{const x=e.getBoundingClientRect();return {x:x.x,y:x.y,left:x.left,top:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height,style:style(e)}};document.querySelector('#out').textContent=JSON.stringify({layers:Object.fromEntries(Object.entries(${JSON.stringify(config.elements)}).map(([n,s])=>[n,{selector:s,...r(d.querySelector(s))}]))})}</script>`);
const extracted = execFileSync(chrome, ["--headless", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile("chrome-inspector")}`, "--dump-dom", `http://127.0.0.1:4176/${path.relative(root, inspector).replaceAll("\\\\", "/")}`], { encoding: "utf8" });
fs.unlinkSync(inspector);
const encoded = extracted.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1]?.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
if (!encoded) throw new Error("Live runtime geometry extraction did not serialize.");
const geometry = { source, viewport: config.viewport, capturedAt: new Date().toISOString(), mechanic: config.mechanic, extractedFrom: "live getBoundingClientRect/getComputedStyle", ...JSON.parse(encoded) };
fs.writeFileSync(path.join(output, "geometry.json"), JSON.stringify(geometry, null, 2));
const unresolvedAssets = [...assetUrls].filter((u) => !replacements.has(u));
fs.writeFileSync(path.join(output, "manifest.json"), JSON.stringify({ schemaVersion: 1, source, selfContained: unresolvedAssets.length === 0 && !/https?:\/\//.test(snapshot), screenshot: "runtime-1366x768.png", snapshot: "snapshot.html", geometry: "geometry.json", editablePriorities: geometry.layers.map((l) => l.name), unresolvedAssets }, null, 2));
console.log(`PASS ${output}`);

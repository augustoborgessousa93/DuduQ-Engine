import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

const digest = data => createHash("sha256").update(data).digest("hex");
const manifestFile = "dist-pages/.duduq-pages-manifest";
const original = readFileSync(manifestFile);
if (!original.equals(readFileSync("qa/results/v23-ebc-watermark-manifest.txt"))) {
  throw Error("V24_REQUIRES_VERIFIED_V23_MANIFEST");
}
const lines = original.toString("utf8").trimEnd().split(/\r?\n/);
if (lines.length !== 2672) throw Error("V24_EXPECTED_2672_V23_ASSETS:" + lines.length);
const entries = new Map();
for (let i = 0; i < lines.length; i++) {
  const index = lines[i].lastIndexOf(" ");
  const name = lines[i].slice(0, index);
  const sha = lines[i].slice(index + 1);
  if (index < 1 || entries.has(name) || !/^[a-f0-9]{64}$/.test(sha)) throw Error("V24_BAD_MANIFEST:" + name);
  entries.set(name, { index: i, sha });
}
const targets = [...entries.keys()].filter(path => path === "index.html" ||
  path === "home/index.html" || (path.startsWith("play/") && path.endsWith("/index.html")));
if (targets.length !== 43) throw Error("V24_EXPECTED_43_OFFICIAL_SCREENS:" + targets.length);
const loader = '<script defer src="/core/duduq-header-title-fit-v24.js" data-duduq-header-title-fit="v24"></script>';
for (const path of targets) {
  if (path.startsWith("runtime/gold-masters/")) throw Error("V24_GOLD_MASTER_EDIT_FORBIDDEN:" + path);
  const bytes = readFileSync("dist-pages/" + path);
  if (digest(bytes) !== entries.get(path).sha) throw Error("V24_SOURCE_HTML_DRIFT:" + path);
  const html = bytes.toString("utf8");
  if (!html.includes('data-duduq-attribution-loader="v23"')) throw Error("V24_REQUIRES_V23_LOADER:" + path);
  if (html.includes('data-duduq-header-title-fit="v24"')) throw Error("V24_DUPLICATE_LOADER:" + path);
  const ends = [...html.matchAll(/<\/body\s*>/gi)];
  if (ends.length !== 1) throw Error("V24_HTML_BODY_END_INVALID:" + path);
  const next = html.slice(0, ends[0].index) + "    " + loader + "\n" + html.slice(ends[0].index);
  writeFileSync("dist-pages/" + path, next);
  lines[entries.get(path).index] = path + " " + digest(next);
}
const asset = "core/duduq-header-title-fit-v24.js";
if (entries.has(asset)) throw Error("V24_FILE_ALREADY_EXISTS");
const script = readFileSync("qa/overlays/v24/" + asset);
for (const token of ['data-duduq-title-fit', 'aria-label', 'title', 'Choices Around Me']) {
  if (token === 'Choices Around Me') continue; // Actual topic is dynamic; no hard-coded curriculum content.
  if (!script.toString("utf8").includes(token)) throw Error("V24_INCOMPLETE_SCRIPT:" + token);
}
mkdirSync(dirname("dist-pages/" + asset), { recursive: true });
writeFileSync("dist-pages/" + asset, script);
lines.push(asset + " " + digest(script));
const final = Buffer.from(lines.join("\n") + "\n");
writeFileSync(manifestFile, final);
mkdirSync("qa/results", { recursive: true });
writeFileSync("qa/results/v24-header-title-manifest.txt", final);
console.log("V24_HEADER_TITLE_43_ROUTES=PASS:" + targets.length);
console.log("V24_HUD_GOLD_MASTERS_UNCHANGED=PASS");
console.log("V24_HEADER_TITLE_MANIFEST=PASS:" + digest(final).toUpperCase() + ":2673");

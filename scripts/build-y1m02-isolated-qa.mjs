#!/usr/bin/env node
// Isolated, file-based QA assembler for English module entrypoints.
// Usage: node scripts/build-y1m02-isolated-qa.mjs --module Y1M02
//        node scripts/build-y1m02-isolated-qa.mjs --all
// It copies source and pinned runtime dependencies only; it never edits production routes.
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const args = process.argv.slice(2);
const all = args.includes("--all");
const requested = args.find((arg) => /^Y[1-5]M0[1-6]$/i.test(arg))?.toUpperCase();
if (!all && !requested) throw new Error("Specify --module Y1M02 (etc.) or --all.");
const outRoot = path.resolve(root, "artifacts/sprint-qa-20261009/modules");
const safeArtifacts = path.resolve(root, "artifacts/sprint-qa-20261009");
if (!outRoot.startsWith(`${safeArtifacts}${path.sep}`)) throw new Error("Unsafe QA output root.");
const channelPath = "engine/channels/canary-v1.json";
const channel = JSON.parse(await readFile(path.resolve(root, channelPath), "utf8"));
const sharedFiles = [
  "engine/duduq-runtime-surface-guard-v1.js",
  "engine/duduq-router-direct-payload-compat-v1.js",
  "engine/duduq-player-v1.js",
  "engine/duduq-loader-v1.js",
  channelPath,
  "content/english/media/media-registry.json"
];
const extensions = /\.(html|js|css|json|svg|png|jpe?g|webp|mp3|wav|woff2?)$/i;
const moduleIds = all
  ? Array.from({ length: 30 }, (_, i) => `Y${Math.floor(i / 6) + 1}M${String((i % 6) + 1).padStart(2, "0")}`)
  : [requested];

function sourceDir(id) {
  const [, year, mod] = id.match(/^Y([1-5])M(0[1-6])$/);
  return `content/english/year-${year}/module-${mod}`;
}
function routeDir(id) {
  const [, year, mod] = id.match(/^Y([1-5])M(0[1-6])$/);
  return `play/english/year-${year}/module-${mod}`;
}
async function filesUnder(relative) {
  const abs = path.resolve(root, relative);
  const entries = await readdir(abs, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const rel = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(rel));
    else if (entry.isFile() && extensions.test(entry.name)) result.push(rel);
  }
  return result;
}
async function build(id) {
  const source = sourceDir(id);
  const route = routeDir(id);
  const output = path.resolve(outRoot, id.toLowerCase());
  if (!output.startsWith(`${outRoot}${path.sep}`)) throw new Error(`Unsafe output for ${id}`);
  const marker = path.join(output, ".duduq-module-qa.json");
  const prior = await readFile(marker, "utf8").catch(() => null);
  if (prior && JSON.parse(prior).purpose !== "isolated English module QA build") {
    throw new Error(`Refusing to overwrite unowned output: ${output}`);
  }
  const records = new Map();
  await mkdir(output, { recursive: true });
  async function copyFile(sourcePath, targetPath = sourcePath) {
    const from = path.resolve(root, sourcePath);
    const to = path.resolve(output, targetPath);
    if (!from.startsWith(`${root}${path.sep}`) || !to.startsWith(`${output}${path.sep}`)) throw new Error(`Unsafe copy: ${sourcePath}`);
    await mkdir(path.dirname(to), { recursive: true });
    await cp(from, to, { force: true });
    const bytes = await readFile(to);
    records.set(targetPath.replaceAll("\\", "/"), { path: targetPath.replaceAll("\\", "/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  for (const file of await filesUnder(source)) {
    const rel = path.relative(source, file).replaceAll("\\", "/");
    await copyFile(file, path.posix.join(route, rel));
  }
  for (const file of sharedFiles) await copyFile(file);
  const htmlRel = path.posix.join(route, "index.html");
  const html = await readFile(path.resolve(output, htmlRel), "utf8").catch(() => "");
  const channelScripts = [...(channel.core?.preMechanicScripts || []).map((x) => x.src), channel.core?.router?.src]
    .filter((x) => typeof x === "string" && x.startsWith("/"));
  const channelStyles = (channel.core?.styles || []).map((x) => x.href).filter((x) => typeof x === "string" && x.startsWith("/"));
  const declared = new Set([...channelScripts, ...channelStyles]);
  const required = [...(html.match(/requiredMechanics:\s*\[([^\]]*)\]/)?.[1] || "").matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  const runtimeRoots = new Set([`/engine/releases/core/${channel.core.release}`]);
  const mechanics = {};
  for (const mechanicId of required) {
    const entry = channel.mechanics?.[mechanicId];
    if (!entry) continue;
    mechanics[mechanicId] = entry.release;
    for (const value of [entry.adapter, entry.runtime]) if (typeof value === "string" && value.startsWith("/")) declared.add(value);
    for (const value of [entry.adapter, entry.runtime]) {
      const match = typeof value === "string" && value.match(/^\/engine\/releases\/(.+)\/[^/]+$/);
      if (match) runtimeRoots.add(`/engine/releases/${match[1]}`);
    }
  }
  for (const src of declared) {
    const local = src.split("?")[0].replace(/^\//, "");
    try { await copyFile(local); } catch { /* report below; avoid substituting another release */ }
  }
  for (const runtimeRoot of runtimeRoots) {
    const relative = runtimeRoot.replace(/^\//, "");
    try {
      for (const file of await filesUnder(relative)) await copyFile(file);
    } catch { /* explicit missing-file diagnostics are emitted below */ }
  }
  // Release adapters may synchronously load a preceding immutable release
  // (DD 2.0.24 -> 2.0.22 -> 2.0.18). Follow those declared runtime references
  // instead of guessing a release or copying only the top-level adapter.
  const scanned = new Set();
  for (let pass = 0; pass < 8; pass += 1) {
    const pending = [...records.keys()].filter((file) => /\.(html|js|css)$/i.test(file) && !scanned.has(file));
    if (!pending.length) break;
    for (const file of pending) {
      scanned.add(file);
      const text = await readFile(path.resolve(output, file), "utf8").catch(() => "");
      const references = [...text.matchAll(/\/(engine\/releases\/(?:core|mechanics\/[a-z0-9-]+)\/[0-9.]+)\//gi)].map((match) => match[1]);
      for (const releaseRoot of new Set(references)) {
        try {
          for (const dependency of await filesUnder(releaseRoot)) {
            if (!records.has(dependency)) await copyFile(dependency);
          }
        } catch { /* reported as missing manifest/runtime files where explicit */ }
      }
    }
  }
  const missing = [];
  for (const src of declared) {
    const relative = src.split("?")[0].replace(/^\//, "");
    if (!records.has(relative)) missing.push(src);
  }
  const contentScript = html.match(/contentScript:\s*["']([^"']+)["']/)?.[1] || null;
  const contentVersion = html.match(/contentVersion:\s*["']([^"']+)["']/)?.[1] || null;
  const report = {
    schemaVersion: 2,
    purpose: "isolated English module QA build",
    moduleId: id,
    createdAt: new Date().toISOString(),
    sourceDirectory: source,
    route: `/${htmlRel.replaceAll("\\", "/").replace(/\/index\.html$/, "/")}`,
    entrypointPresent: Boolean(html),
    contentScript,
    contentVersion,
    runtimeAssessment: !html ? "ENTRYPOINT_MISSING" : (!contentScript || !required.length ? "ASSEMBLED_BUT_RUNTIME_CONTRACT_REQUIRES_REVIEW" : (missing.length ? "RUNTIME_DEPENDENCIES_MISSING" : "ASSEMBLED_REQUIRES_BROWSER_GAMEPLAY_QA")),
    channel: { id: channel.channel, revision: channel.revision, core: channel.core.release, mechanics },
    requiredMechanics: required,
    revisionCompatibility: contentVersion ? { contentVersion, channelRevision: channel.revision, status: /r(\d+)/i.exec(contentVersion)?.[1] === String(channel.revision) ? "REVISION_MATCH" : "MISMATCH_REQUIRES_GAMEPLAY_COMPATIBILITY_TEST" } : { status: "NO_CONTENT_VERSION_DECLARED" },
    missingRuntimeFiles: missing,
    files: [...records.values()],
    limitations: ["Isolated assembly only; not a production release or homologation.", "A successful route/build does not prove gameplay, audio audibility, visual fidelity, or completion.", "External media dependencies are not copied or modified; verify their runtime loading separately."]
  };
  await writeFile(marker, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { moduleId: id, output, route: report.route, entrypointPresent: report.entrypointPresent, contentScriptPresent: Boolean(contentScript), requiredMechanics: required, missingRuntimeFiles: missing.length, files: records.size, revisionCompatibility: report.revisionCompatibility.status, runtimeAssessment: report.runtimeAssessment };
}

const results = [];
for (const id of moduleIds) {
  try { results.push(await build(id)); }
  catch (error) { results.push({ moduleId: id, status: "BLOCKED", error: error.message }); }
}
const matrix = { schemaVersion: 1, generatedAt: new Date().toISOString(), purpose: "isolated QA assembly inventory; not release certification", modules: results };
await mkdir(outRoot, { recursive: true });
await writeFile(path.join(outRoot, "build-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputRoot: outRoot, builds: results }, null, 2));
if (results.every((result) => result.status === "BLOCKED")) process.exitCode = 1;

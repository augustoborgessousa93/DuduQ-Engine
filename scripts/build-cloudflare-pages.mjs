#!/usr/bin/env node
/**
 * Produces the only publishable Cloudflare Pages boundary for DuduQ.
 * It is intentionally an allowlist: no repository directory is copied wholesale.
 */
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const output = path.resolve(root, "dist-pages");
if (!output.startsWith(`${root}${path.sep}`)) throw new Error("Refusing unsafe output path.");

const routes = ["matching", "target-shooter", "drag-drop", "drag-drop-multimedia", "bubble-pop", "smart-sentence", "memory-quest", "intro-module", "transition", "english/year-1/module-01"];
const textExtensions = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg"]);
const allowedExtensions = new Set([...textExtensions, ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".mp3", ".wav", ".woff", ".woff2"]);
const forbiddenSegment = /(^|[\\/])(\.git|\.github|docs|test|tests|tools|artifacts|recovery|\.duduq)([\\/]|$)/i;
const forbiddenFile = /(^|[\\/])\.env(?:\..*)?$|(^|[\\/]).*(credential|api[_-]?token|backup|\.patch|\.log)$/i;

function sourcePath(relative) { return path.resolve(root, relative); }
function outputPath(relative) { return path.resolve(output, relative); }

async function copyFile(relative, target = relative) {
  const from = sourcePath(relative);
  const to = outputPath(target);
  const extension = path.extname(from).toLowerCase();
  if (!allowedExtensions.has(extension)) throw new Error(`Refusing non-runtime file: ${relative}`);
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { force: true });
  if (textExtensions.has(extension)) {
    const original = await readFile(to, "utf8");
    const migrated = original
      .replaceAll("/test/matching/gold-master-candidate-v1", "/runtime/gold-masters/matching")
      .replaceAll("/test/target-shooter/gold-master-clean-v2", "/runtime/gold-masters/target-shooter");
    if (migrated !== original) await writeFile(to, migrated, "utf8");
  }
}

async function copyRuntimeTree(relative, target = relative) {
  const directory = sourcePath(relative);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    const destination = path.posix.join(target.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) await copyRuntimeTree(child, destination);
    else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) await copyFile(child, destination);
  }
}

async function requireFile(relative) {
  try { await stat(outputPath(relative)); }
  catch { throw new Error(`Missing required public runtime file: ${relative}`); }
}

async function allFiles(directory = output, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await allFiles(full, files);
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function validate() {
  for (const route of routes) await requireFile(`play/${route}/index.html`);
  const files = await allFiles();
  for (const file of files) {
    const relative = path.relative(output, file).replaceAll("\\", "/");
    if (forbiddenSegment.test(relative) || forbiddenFile.test(relative)) throw new Error(`Forbidden public file: ${relative}`);
    if (textExtensions.has(path.extname(file).toLowerCase())) {
      const content = await readFile(file, "utf8");
      if (content.includes("/test/")) throw new Error(`Forbidden /test/ runtime reference: ${relative}`);
      if (/127\.0\.0\.1|localhost|file:\/\/|(?:^|["'`(\s])[A-Za-z]:[\\/]/.test(content)) throw new Error(`Local-only runtime reference: ${relative}`);
      const references = [...content.matchAll(/(?:src|href)\s*=\s*["']([^"']+)|(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)]
        .map((match) => match[1] || match[2])
        .filter(Boolean);
      for (const reference of references) {
        const clean = reference.split(/[?#]/, 1)[0];
        if (!clean || clean.includes("${") || /^(?:https?:|data:|#|\/\/)/i.test(clean)) continue;
        const target = clean.startsWith("/")
          ? outputPath(clean.slice(1))
          : path.resolve(path.dirname(file), clean);
        if (!target.startsWith(`${output}${path.sep}`) || !await stat(target).then(() => true, () => false)) {
          throw new Error(`Missing local runtime dependency: ${relative} -> ${reference}`);
        }
      }
    }
  }
  return files;
}

async function manifest(files) {
  const rows = [];
  for (const file of files.sort()) {
    const data = await readFile(file);
    rows.push(`${path.relative(output, file).replaceAll("\\", "/")} ${createHash("sha256").update(data).digest("hex")}`);
  }
  return rows.join("\n") + "\n";
}

await rm(output, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
await mkdir(output, { recursive: true });

for (const route of routes) await copyRuntimeTree(`play/${route}`);
await copyRuntimeTree("core");
await copyFile("asset-alvo.png");
await copyFile("fullscreen-official.svg");
await copyFile("core/assets/duduq-hud-mascot.png", "play/matching/assets/duduq-hud-mascot.png");

// Y1M01 ships only its public product contract, canonical media registry and approved runtime media.
await copyFile("content/english/year-1/module-01/module.json");
await copyFile("content/english/year-1/module-01/questions.json");
await copyFile("content/english/media/media-registry.json");
await copyRuntimeTree("content/english/assets/images/year-1/module-01/temporary");
await copyFile("duduq-audio/manifests/AUDIO_MANIFEST.json");
const audioManifest = JSON.parse(await readFile(sourcePath("duduq-audio/manifests/AUDIO_MANIFEST.json"), "utf8"));
for (const item of audioManifest.items || []) {
  if (item.status !== "APPROVED") continue;
  if (!/\.mp3$/i.test(String(item.audioPath || ""))) throw new Error(`Y1M01_RUNTIME_AUDIO_MUST_BE_MP3:${item.id}`);
  await copyFile(item.audioPath);
}

// Only the runtime-generated Penpot artifacts used by the product host are public.
await copyRuntimeTree("design-system/runtime/screens", "design-system/runtime/screens");
await copyFile("design-system/penpot-sync/generated/matching-primary-button.css");

// Gold Master source is deliberately copied as runtime-only files, excluding tests,
// documentation, preview tools, screenshots, and every original /test/ URL.
await copyRuntimeTree("test/matching/gold-master-candidate-v1/styles", "runtime/gold-masters/matching/styles");
await copyRuntimeTree("test/matching/gold-master-candidate-v1/src", "runtime/gold-masters/matching/src");
await copyRuntimeTree("test/matching/gold-master-candidate-v1/data", "runtime/gold-masters/matching/data");
await copyRuntimeTree("test/matching/gold-master-candidate-v1/assets", "runtime/gold-masters/matching/assets");
await copyFile("test/matching/gold-master-candidate-v1/index.html", "runtime/gold-masters/matching/index.html");
await copyRuntimeTree("test/target-shooter/gold-master-clean-v2/styles", "runtime/gold-masters/target-shooter/styles");
await copyRuntimeTree("test/target-shooter/gold-master-clean-v2/src", "runtime/gold-masters/target-shooter/src");
await copyRuntimeTree("test/target-shooter/gold-master-clean-v2/assets", "runtime/gold-masters/target-shooter/assets");
await copyFile("test/target-shooter/gold-master-clean-v2/index.html", "runtime/gold-masters/target-shooter/index.html");

const files = await validate();
const outputManifest = await manifest(files);
await writeFile(outputPath(".duduq-pages-manifest"), outputManifest, "utf8");
console.log(JSON.stringify({ status: "PASS", output: "dist-pages", fileCount: files.length, manifest: ".duduq-pages-manifest" }));

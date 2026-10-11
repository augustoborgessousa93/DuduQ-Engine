#!/usr/bin/env node
/**
 * Produces the only publishable Cloudflare Pages boundary for DuduQ.
 * It is intentionally an allowlist: no repository directory is copied wholesale.
 */
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { validate as validateCanonicalMechanics } from "./validate-canonical-mechanics.mjs";
import { validateY1M01DdmDiversity } from "./validate-y1m01-ddm-semantic-diversity.mjs";
import { validateMemoryQuestContentContract } from "./validate-memory-quest-pair-contract.mjs";

const root = process.cwd();
const canonicalOutput = path.resolve(root, "dist-pages");
const stagingOutput = path.resolve(root, "dist-pages.__build__");
const previousOutput = path.resolve(root, "dist-pages.__previous__");
let output = stagingOutput;
for (const target of [canonicalOutput, stagingOutput, previousOutput]) {
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Refusing unsafe output path.");
}

const mechanicValidation = await validateCanonicalMechanics();
if (mechanicValidation.errors.length) {
  throw new Error(`CANONICAL_MECHANICS_BUILD_GATE_FAILED:\n${mechanicValidation.errors.join("\n")}`);
}
console.log(`CANONICAL_MECHANICS_BUILD_GATE: PASS (${mechanicValidation.inventory.length} implementation files classified)`);

const ddmDiversityValidation = await validateY1M01DdmDiversity();
if (ddmDiversityValidation.errors.length) {
  throw new Error(`Y1M01_DDM_SEMANTIC_DIVERSITY_BUILD_GATE_FAILED:\n${ddmDiversityValidation.errors.join("\n")}`);
}
console.log("Y1M01_DDM_SEMANTIC_DIVERSITY_BUILD_GATE: PASS (five order-independent activity signatures)");
const memoryQuestValidation = await validateMemoryQuestContentContract();
if (memoryQuestValidation.errors.length) throw new Error(`MEMORY_QUEST_CONTENT_BUILD_GATE_FAILED:\n${memoryQuestValidation.errors.join("\n")}`);
console.log("MEMORY_QUEST_CONTENT_BUILD_GATE: PASS (three QA modes, semantic pairs, production fail-closed)");

// Memory Quest QA modes now run through the approved Penpot-baseline shell;
// the aborted experimental implementation is never included in public routes.
const routes = ["matching", "target-shooter", "drag-drop", "drag-drop-multimedia", "bubble-pop", "smart-sentence", "memory-quest", "intro-module", "transition", "final-module", "english/year-1/module-01"];
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
  for (const file of [
    "index.html", "home/home.js", "home/home.css", "home/modules.json",
    "design-system/runtime/screens/module-final/manifest.json",
    "design-system/runtime/screens/module-final/visual.svg",
    "design-system/runtime/screens/module-final/assets/module-final-background.png",
    "design-system/runtime/screens/module-final/assets/module-final-panel.png",
    "design-system/runtime/screens/module-final/assets/module-final-mascot.png",
    "design-system/runtime/screens/module-final/assets/module-final-trophy.png",
    "design-system/runtime/screens/module-final/assets/module-final-return-button.svg",
    "design-system/runtime/screens/module-final/assets/module-final-return-button-shape.svg"
  ]) await requireFile(file);
  const finalManifest = JSON.parse(await readFile(outputPath("design-system/runtime/screens/module-final/manifest.json"), "utf8"));
  if (finalManifest.presentation !== "PENPOT_NATIVE_LAYER_COMPOSITION" || finalManifest.assetPolicy?.runtimeUsesFlattenedBoard !== false) throw new Error("MODULE_FINAL_MUST_USE_INDIVIDUAL_PENPOT_ASSETS");
  for (const route of routes) await requireFile(`play/${route}/index.html`);
  await requireFile("play/memory-quest/memory-quest-contract.js");
  await requireFile("content/mechanics/memory-quest-content-contract-v1.json");
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

const previewBase = `http://127.0.0.1:${process.env.DUDUQ_TEST_PORT || 4175}`;
async function previewStatus() {
  try {
    const response = await fetch(`${previewBase}/__duduq/status`, { signal: AbortSignal.timeout(1000) });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}
async function stopDistPreview() {
  const status = await previewStatus();
  if (!status || path.resolve(status.root || "") !== canonicalOutput) return false;
  await fetch(`${previewBase}/__duduq/shutdown`, { method: "POST", signal: AbortSignal.timeout(1000) }).catch(() => {});
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let processAlive = false;
    try { process.kill(Number(status.pid), 0); processAlive = true; } catch {}
    if (!await previewStatus() && !processAlive) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`DUDUQ dist-pages preview PID ${status.pid} did not fully exit and release port ${status.port}.`);
}
async function startDistPreview() {
  const existing = await previewStatus();
  if (existing) {
    if (path.resolve(existing.root || "") === canonicalOutput) return;
    throw new Error(`Port ${process.env.DUDUQ_TEST_PORT || 4175} is occupied by a different preview root; refusing to replace it.`);
  }
  const child = spawn(process.execPath, [path.join(root, "scripts/duduq-test-server.mjs")], {
    cwd: canonicalOutput,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await previewStatus();
    if (status && path.resolve(status.root || "") === canonicalOutput) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Rebuilt dist-pages preview did not become ready after restart.");
}

// Build beside the canonical output so a failed copy/validation never destroys
// the last usable site. A previous directory is only cleaned when it carries
// the manifest produced by this builder; an interrupted promotion is rolled back.
const previousExists = await stat(previousOutput).then(() => true, () => false);
if (previousExists) {
  const canonicalExists = await stat(canonicalOutput).then(() => true, () => false);
  const previousManifestExists = await stat(path.join(previousOutput, ".duduq-pages-manifest")).then(() => true, () => false);
  if (!canonicalExists && previousManifestExists) await rename(previousOutput, canonicalOutput);
  else if (canonicalExists && previousManifestExists) await rm(previousOutput, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  else throw new Error("Unrecognized dist-pages.__previous__ directory; refusing to remove it.");
}
await rm(stagingOutput, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
await mkdir(stagingOutput, { recursive: true });

for (const route of routes) await copyRuntimeTree(`play/${route}`);
// Canonical local product home: module links are data-driven and point only to
// complete module journeys, never to mechanic/question QA routes.
await copyFile("play/home/index.html", "index.html");
await copyRuntimeTree("play/home", "home");
await copyRuntimeTree("core");
await copyFile("asset-alvo.png");
await copyFile("fullscreen-official.svg");
await copyFile("assets/ui/language-flags/brazil.png");
await copyFile("assets/ui/language-flags/united-states.png");
await copyFile("core/assets/duduq-hud-mascot.png", "play/matching/assets/duduq-hud-mascot.png");

// Y1M01 ships only its public product contract, canonical media registry and approved runtime media.
await copyFile("content/english/year-1/module-01/module.json");
await copyFile("content/english/year-1/module-01/questions.json");
await copyFile("content/mechanics/canonical-mechanics-registry.json");
await copyFile("content/mechanics/canonical-mechanics-lock-v1.json");
await copyFile("content/mechanics/memory-quest-content-contract-v1.json");
await copyFile("content/english/media/media-registry.json");
await copyRuntimeTree("content/english/assets/images/year-1/module-01/temporary");
await copyRuntimeTree("qa/memory-quest/fixtures", "qa/memory-quest/fixtures");
if (await stat(sourcePath("content/english/assets/images/year-1/module-01/generated")).then(() => true, () => false)) {
  await copyRuntimeTree("content/english/assets/images/year-1/module-01/generated");
}
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

let movedCanonical = false;
let previewStopped = false;
try {
  previewStopped = await stopDistPreview();
  if (await stat(canonicalOutput).then(() => true, () => false)) {
    await rename(canonicalOutput, previousOutput);
    movedCanonical = true;
  }
  await rename(stagingOutput, canonicalOutput);
  output = canonicalOutput;
  if (movedCanonical) await rm(previousOutput, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  if (previewStopped) await startDistPreview();
} catch (error) {
  if (movedCanonical && !await stat(canonicalOutput).then(() => true, () => false)) {
    await rename(previousOutput, canonicalOutput);
  }
  await rm(stagingOutput, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  if (previewStopped) await startDistPreview().catch((restartError) => { error.message += `; preview restart failed: ${restartError.message}`; });
  throw error;
}
console.log(JSON.stringify({ status: "PASS", output: "dist-pages", fileCount: files.length, manifest: ".duduq-pages-manifest" }));

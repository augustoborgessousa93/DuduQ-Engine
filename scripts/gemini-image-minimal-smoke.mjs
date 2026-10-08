#!/usr/bin/env node
/** Exactly-one-request Gemini JPEG -> local segmentation -> isolated DUDUQ PNG smoke. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { requestGeminiImage, DEFAULT_GEMINI_IMAGE_MODEL } from "./gemini-image-provider.mjs";
import { importGenerated, inspectPng, verifySmokeAssetHttp } from "./duduq-image-pipeline.mjs";

export const GEMINI_SMOKE_PROMPT = "Friendly school-age child waving hello, polished child-friendly educational game illustration, waist-up close framing, large centered subject, face clearly visible, eyes clearly visible, hair clearly visible, waving hand fully visible, other important hand visible when composition permits, friendly readable expression, clean silhouette, isolated subject, plain pure white studio background, strong separation between subject and background, no scenery, no furniture, no objects, no text, no letters, no labels, no captions, no border.";
export const GEMINI_SMOKE_SOURCE_PATH = "content/english/assets/images/test/provider-smoke/source/gemini-image-smoke-child-wave-source.jpg";
export const GEMINI_SMOKE_FINAL_PATH = "content/english/assets/images/test/provider-smoke/gemini-image-smoke-child-wave.png";
const REQUEST_ID = "TEST-GEMINI-IMAGE-SMOKE-001";
const REQUEST_PATH = "content/english/media/image-provider-smoke-request.json";
const REGISTRY_PATH = "test/fixtures/image-provider-smoke-registry.json";
const SHA = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function runGeminiTransparentSmoke({ root = process.cwd(), apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL, adapter = requestGeminiImage, python = null } = {}) {
  if (!apiKey) return { status: "NOT_CONFIGURED", requiredEnv: "GEMINI_API_KEY", provider: "gemini" };
  const absolute = (p) => path.resolve(root, p);
  const sourceFile = absolute(GEMINI_SMOKE_SOURCE_PATH), finalFile = absolute(GEMINI_SMOKE_FINAL_PATH);
  const reqFile = absolute(REQUEST_PATH), registryFile = absolute(REGISTRY_PATH);
  for (const file of [sourceFile, finalFile]) {
    try { await access(file); return { status: "ISSUE", error: "SMOKE_OUTPUT_ALREADY_EXISTS", sourcePath: GEMINI_SMOKE_SOURCE_PATH, finalPath: GEMINI_SMOKE_FINAL_PATH }; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const [requestDoc, registryDoc] = await Promise.all([readJson(reqFile), readJson(registryFile)]);
  const need = requestDoc.needs?.find((entry) => entry.generationRequest?.requestId === REQUEST_ID);
  if (!requestDoc.testOnly || !need?.generationRequest?.testOnly || need.generationRequest.outputPath !== GEMINI_SMOKE_FINAL_PATH || registryDoc.entries?.some((e) => e.mediaId === REQUEST_ID)) {
    return { status: "ISSUE", error: "SMOKE_TEST_REGISTRY_CONFLICT" };
  }
  const generationRequest = { ...need.generationRequest, prompt: GEMINI_SMOKE_PROMPT, transparentBackground: false };
  let generated;
  try {
    // The only provider invocation in this run. Non-2xx exits without retry/fallback.
    generated = await adapter(generationRequest, { apiKey, model, promptOverride: GEMINI_SMOKE_PROMPT });
  } catch (error) {
    return { status: "ISSUE", provider: "gemini", model, endpoint: "https://generativelanguage.googleapis.com/v1beta/interactions", httpStatus: error.status || null, attempts: 1, error: error.message || "GEMINI_REQUEST_FAILED", geminiError: error.geminiError || null, requestId: error.requestId || null };
  }
  const jpeg = generated?.imageBytes;
  if (generated?.status !== "GENERATED" || !Buffer.isBuffer(jpeg) || jpeg.length < 1024 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || (generated.providerMime || generated.mimeType) !== "image/jpeg") {
    return { status: "ISSUE", provider: "gemini", model: generated?.model || model, httpStatus: 200, attempts: 1, error: "GEMINI_RESPONSE_NOT_VALID_JPEG", sourceSaved: false };
  }
  const rembgHome = absolute("duduq-audio/.runtime/image-removal");
  const childEnv = { ...process.env, REMBG_HOME: rembgHome };
  delete childEnv.GEMINI_API_KEY; delete childEnv.OPENAI_API_KEY;
  const pythonPath = python || path.join(root, "duduq-audio", ".runtime", "image-removal", "venv", "Scripts", "python.exe");
  await mkdir(path.dirname(sourceFile), { recursive: true });
  await writeFile(sourceFile, jpeg, { flag: "wx" });
  const inputPath = path.relative(root, sourceFile), outputPath = path.relative(root, finalFile);
  const processResult = spawnSync(pythonPath, [path.join(root, "scripts", "remove-image-background.py"), inputPath, outputPath], { cwd: root, env: childEnv, encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  let removal;
  try { removal = processResult.stdout ? JSON.parse(processResult.stdout.trim().split(/\r?\n/).at(-1)) : null; } catch { removal = null; }
  if (processResult.status !== 0 || !removal?.status || removal.status !== "PASS") {
    return { status: "BACKGROUND_REMOVAL_ISSUE", provider: "gemini", model: generated.model || model, endpoint: "https://generativelanguage.googleapis.com/v1beta/interactions", httpStatus: 200, attempts: 1, sourceSaved: true, sourcePath: GEMINI_SMOKE_SOURCE_PATH, sourceBytes: jpeg.length, sourceSha256: SHA(jpeg), removalError: removal?.error || safeProcessError(processResult.stderr), sourceDimensions: removal?.sourceDimensions || "unavailable" };
  }
  const finalPng = await readFile(finalFile), pngQc = inspectPng(finalPng);
  if (!pngQc.valid || !pngQc.transparent || finalPng.readUInt32BE(16) !== 1024 || finalPng.readUInt32BE(20) !== 1024 || removal.mode !== "RGBA" || removal.subjectScaleQc !== "PASS") {
    return { status: "BACKGROUND_REMOVAL_ISSUE", provider: "gemini", model: generated.model || model, endpoint: "https://generativelanguage.googleapis.com/v1beta/interactions", httpStatus: 200, attempts: 1, sourceSaved: true, sourcePath: GEMINI_SMOKE_SOURCE_PATH, finalPath: GEMINI_SMOKE_FINAL_PATH, sourceSha256: SHA(jpeg), finalSha256: SHA(finalPng), sourceDimensions: removal.sourceDimensions, finalDimensions: `${finalPng.readUInt32BE(16)}x${finalPng.readUInt32BE(20)}`, pngQc, removal };
  }
  const sourceSha = SHA(jpeg), finalSha = SHA(finalPng);
  const imported = await importGenerated({ requestId: REQUEST_ID, bytes: finalPng, registryPath: REGISTRY_PATH, requestPath: REQUEST_PATH, provenance: {
    provider: "gemini", model: generated.model || model, providerMime: "image/jpeg", finalMime: "image/png", backgroundRemoval: "local:u2net_human_seg",
    sourceFile: GEMINI_SMOKE_SOURCE_PATH, sourceSha256: sourceSha, finalSha256: finalSha, requestId: generated.requestId || null,
    generationPrompt: GEMINI_SMOKE_PROMPT, generationMetadata: generated.generationMetadata || {}, createdAt: generated.generationMetadata?.createdAt || new Date().toISOString(), testOnly: true
  } });
  await verifySmokeAssetHttp(finalFile, finalSha, imported.path);
  return { status: "PASS", provider: "gemini", model: generated.model || model, endpoint: "https://generativelanguage.googleapis.com/v1beta/interactions", httpStatus: 200, attempts: 1,
    sourcePath: GEMINI_SMOKE_SOURCE_PATH, sourceBytes: jpeg.length, sourceDimensions: `${removal.sourceDimensions.width}x${removal.sourceDimensions.height}`, sourceSha256: sourceSha,
    finalPath: imported.path, finalDimensions: `${imported.width}x${imported.height}`, finalMode: removal.mode, finalSha256: finalSha,
    alpha: "PASS", subjectScaleQc: removal.subjectScaleQc, boundingBox: removal.boundingBox, imported, registryPath: REGISTRY_PATH, http: "200", visualSemanticQc: "NEEDS_HUMAN_REVIEW" };
}

async function readJson(file) { return JSON.parse(await readFile(file, "utf8")); }
function safeProcessError(value = "") { return String(value).replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]").replace(/GEMINI_API_KEY|OPENAI_API_KEY/gi, "[REDACTED]").slice(-1000); }

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await runGeminiTransparentSmoke();
  // Provider error objects have already been sanitized; never emit request headers/env.
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "PASS") process.exitCode = 1;
}

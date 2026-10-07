#!/usr/bin/env node
/** One-request Gemini API preflight. A non-2xx response stops the image pipeline. */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { requestGeminiImage } from "./gemini-image-provider.mjs";

export const GEMINI_MINIMAL_SMOKE_PROMPT = "Create a friendly educational illustration of a school-age child waving hello, centered, close framing, on a plain white background, no text.";
export const GEMINI_SMOKE_SOURCE_PATH = "content/english/assets/images/test/provider-smoke/source/gemini-image-smoke-child-wave-source.png";

export async function runGeminiMinimalSmoke({ adapter = requestGeminiImage, apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_IMAGE_MODEL, root = process.cwd(), outputPath = GEMINI_SMOKE_SOURCE_PATH } = {}) {
  if (!apiKey) return { status: "NOT_CONFIGURED", requiredEnv: "GEMINI_API_KEY", provider: "gemini" };
  const target = path.resolve(root, outputPath), workspace = path.resolve(root);
  if (!target.startsWith(`${workspace}${path.sep}`)) return { status: "ISSUE", error: "SMOKE_SOURCE_PATH_OUTSIDE_WORKSPACE" };
  try { await access(target); return { status: "ISSUE", error: "SMOKE_SOURCE_ALREADY_EXISTS" }; } catch { /* expected */ }
  const generationRequest = { requestId: "TEST-GEMINI-IMAGE-SMOKE-001", mediaId: "TEST-GEMINI-IMAGE-SMOKE-001", prompt: GEMINI_MINIMAL_SMOKE_PROMPT, transparentBackground: false };
  try {
    const generated = await adapter(generationRequest, { apiKey, model });
    if (generated.status === "NOT_CONFIGURED") return generated;
    const bytes = generated.imageBytes;
    if (!Buffer.isBuffer(bytes) || bytes.length < 64 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
      return { status: "ISSUE", provider: "gemini", model: generated.model || model || "gemini-nano-banana-2.1", attempts: 1, error: "GEMINI_RESPONSE_NOT_VALID_PNG", httpStatus: 200 };
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    return {
      status: "PASS", provider: "gemini", model: generated.model,
      endpoint: "https://generativelanguage.googleapis.com/v1beta/interactions",
      httpStatus: 200, attempts: 1, sourcePath: outputPath, sourceBytes: bytes.length,
      dimensions: `${width}x${height}`, mimeType: generated.mimeType,
      requestId: generated.requestId || null, prompt: GEMINI_MINIMAL_SMOKE_PROMPT,
      generationMetadata: generated.generationMetadata
    };
  } catch (error) {
    return {
      status: "ISSUE", provider: "gemini", model: model || process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/interactions",
      httpStatus: Number(error.status) || null, attempts: 1,
      error: error.message || "GEMINI_REQUEST_FAILED", geminiError: error.geminiError || null,
      requestId: error.requestId || null
    };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await runGeminiMinimalSmoke();
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "PASS") process.exitCode = 1;
}

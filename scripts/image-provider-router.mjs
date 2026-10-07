#!/usr/bin/env node
/** Provider selection and credential-free circuit state for the DUDUQ media pipeline. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_PROVIDER_HEALTH_PATH = "content/english/media/image-provider-health.json";
export const DEFAULT_PROVIDER_HEALTH = Object.freeze({
  schemaVersion: "1.0",
  manualReenable: "Set provider state to AVAILABLE in this file after a deliberate health check.",
  providers: {
    openai: { state: "UNAVAILABLE_429", reason: "PREVIOUS_HTTP_429", updatedAt: "2026-10-07T00:00:00.000Z" },
    gemini: { state: "CANDIDATE", reason: "AWAITING_FIRST_SMOKE", updatedAt: "2026-10-07T00:00:00.000Z" }
  }
});

export function providerMode(env = process.env) {
  const mode = String(env.DUDUQ_IMAGE_PROVIDER || "auto").toLowerCase();
  if (!["auto", "gemini", "openai"].includes(mode)) throw new Error("INVALID_DUDUQ_IMAGE_PROVIDER");
  return mode;
}

export function isProviderConfigured(provider, env = process.env) {
  return provider === "gemini" ? Boolean(env.GEMINI_API_KEY) : provider === "openai" ? Boolean(env.OPENAI_API_KEY) : false;
}

export function providerOrder({ mode = "auto", health = DEFAULT_PROVIDER_HEALTH, env = process.env } = {}) {
  const normalizedMode = String(mode).toLowerCase();
  if (!["auto", "gemini", "openai"].includes(normalizedMode)) throw new Error("INVALID_DUDUQ_IMAGE_PROVIDER");
  const candidates = normalizedMode === "auto" ? ["gemini", "openai"] : [normalizedMode];
  return candidates.filter((provider) => isProviderConfigured(provider, env) && (
    normalizedMode !== "auto" || !String(health.providers?.[provider]?.state || "UNKNOWN").startsWith("UNAVAILABLE")
  ));
}

export function circuitStateAfterFailure(provider, error, previous = {}) {
  const status = Number(error?.status || String(error?.message || "").match(/HTTP_(\d{3})/)?.[1] || 0);
  if (status === 429) return { state: "UNAVAILABLE_429", reason: "HTTP_429", updatedAt: new Date().toISOString() };
  if (status === 401 || status === 403) return { state: "UNAVAILABLE_AUTH", reason: `HTTP_${status}`, updatedAt: new Date().toISOString() };
  if (status >= 400 && status < 500) return { state: "UNAVAILABLE_ERROR", reason: `HTTP_${status}`, updatedAt: new Date().toISOString() };
  return previous.state ? previous : { state: "CANDIDATE", reason: "TRANSIENT_OR_UNKNOWN_ERROR", updatedAt: new Date().toISOString() };
}

export async function readProviderHealth(file = DEFAULT_PROVIDER_HEALTH_PATH, root = process.cwd()) {
  try { return JSON.parse(await readFile(path.resolve(root, file), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return structuredClone(DEFAULT_PROVIDER_HEALTH); throw new Error("IMAGE_PROVIDER_HEALTH_INVALID"); }
}

export async function writeProviderHealth(health, file = DEFAULT_PROVIDER_HEALTH_PATH, root = process.cwd()) {
  const target = path.resolve(root, file);
  const base = path.resolve(root);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) throw new Error("IMAGE_PROVIDER_HEALTH_PATH_OUTSIDE_WORKSPACE");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(health, null, 2)}\n`, "utf8");
}

export function normalizeProviderResult(result, dimensions = {}) {
  if (result?.status !== "GENERATED") return result;
  if (!Buffer.isBuffer(result.imageBytes) && !Buffer.isBuffer(result.bytes)) throw new Error("IMAGE_PROVIDER_BYTES_INVALID");
  return {
    provider: result.provider || result.metadata?.provider || "unknown",
    model: result.model || result.metadata?.model || "unknown",
    imageBytes: result.imageBytes || result.bytes,
    mimeType: result.mimeType || "image/png",
    width: dimensions.width ?? result.width ?? null,
    height: dimensions.height ?? result.height ?? null,
    prompt: result.prompt || result.metadata?.generationPrompt || "",
    requestId: result.requestId || null,
    generationMetadata: result.generationMetadata || result.metadata || {}
  };
}

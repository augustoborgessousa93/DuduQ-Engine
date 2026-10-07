#!/usr/bin/env node
/** Server-side Gemini Interactions image adapter. Credentials and raw API errors are never logged. */
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-nano-banana-2.1";
export const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export function buildGeminiImageRequest(generationRequest, model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL, promptOverride) {
  if (!generationRequest?.prompt || !generationRequest?.mediaId) throw new Error("INVALID_IMAGE_GENERATION_REQUEST");
  const prompt = promptOverride || generationRequest.prompt;
  return {
    url: GEMINI_INTERACTIONS_URL,
    model,
    prompt,
    body: {
      model,
      input: [{ type: "text", text: prompt }],
      response_format: { type: "image", mime_type: "image/png", aspect_ratio: "1:1", image_size: "1K" }
    }
  };
}

export async function requestGeminiImage(generationRequest, {
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL,
  fetchImpl = fetch,
  promptOverride,
  signal
} = {}) {
  if (!apiKey) return { status: "NOT_CONFIGURED", provider: "gemini", requiredEnv: "GEMINI_API_KEY" };
  const request = buildGeminiImageRequest(generationRequest, model, promptOverride);
  const response = await fetchImpl(request.url, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify(request.body),
    signal: signal || AbortSignal.timeout(180_000)
  });
  if (!response.ok) {
    let payload = null;
    try { payload = await response.json(); } catch { /* Do not echo unstructured provider body. */ }
    const apiError = payload?.error || {};
    const requestId = response.headers?.get?.("x-goog-request-id") || response.headers?.get?.("x-request-id") || apiError.requestId || null;
    const safeError = {
      httpStatus: response.status,
      message: sanitizeProviderText(apiError.message || "Provider returned a non-2xx response.", [apiKey, request.prompt]),
      code: sanitizeScalar(apiError.code),
      type: sanitizeScalar(apiError.status || apiError.type),
      details: sanitizeProviderDetails(apiError.details, [apiKey, request.prompt]),
      requestId: sanitizeScalar(requestId)
    };
    const error = new Error(`GEMINI_IMAGE_HTTP_${response.status}`);
    error.status = response.status;
    error.retryable = response.status >= 500;
    error.provider = "gemini";
    error.requestId = requestId;
    error.geminiError = safeError;
    throw error;
  }
  const interaction = await response.json();
  const image = extractImageBlock(interaction);
  if (image?.mime_type && image.mime_type !== "image/png") throw new Error("GEMINI_IMAGE_UNEXPECTED_MIME_TYPE");
  const encoded = image?.data;
  if (typeof encoded !== "string" || !encoded.length || encoded.length > 40 * 1024 * 1024) throw new Error("GEMINI_IMAGE_DATA_MISSING_OR_OVERSIZED");
  const imageBytes = Buffer.from(encoded, "base64");
  if (!imageBytes.length || imageBytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) throw new Error("GEMINI_IMAGE_BASE64_INVALID");
  return {
    status: "GENERATED",
    provider: "gemini",
    model,
    imageBytes,
    mimeType: image?.mime_type || "image/png",
    width: null,
    height: null,
    prompt: request.prompt,
    requestId: response.headers?.get?.("x-goog-request-id") || response.headers?.get?.("x-request-id") || null,
    generationMetadata: {
      provider: "gemini",
      model,
      interactionId: interaction?.id || null,
      createdAt: new Date().toISOString(),
      outputFormat: "png",
      requestedAspectRatio: "1:1",
      requestedImageSize: "1K",
      requestedTransparency: generationRequest.transparentBackground !== false
    }
  };
}

export function sanitizeProviderText(value, secrets = []) {
  let text = String(value ?? "");
  for (const secret of secrets.filter(Boolean)) text = text.split(String(secret)).join("[REDACTED]");
  return text.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}

function sanitizeScalar(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  return sanitizeProviderText(value).slice(0, 160);
}

function sanitizeProviderDetails(value, secrets) {
  if (!Array.isArray(value)) return value == null ? null : sanitizeProviderObject(value, secrets, 0);
  return value.slice(0, 8).map((entry) => sanitizeProviderObject(entry, secrets, 0));
}

function sanitizeProviderObject(value, secrets, depth) {
  if (depth > 3 || value == null || typeof value !== "object") return typeof value === "string" ? sanitizeProviderText(value, secrets) : value;
  if (Array.isArray(value)) return value.slice(0, 8).map((item) => sanitizeProviderObject(item, secrets, depth + 1));
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 20)) {
    if (/key|token|authorization|prompt|input|image|base64|data|request.?body/i.test(key)) continue;
    result[key] = sanitizeProviderObject(item, secrets, depth + 1);
  }
  return result;
}

function extractImageBlock(interaction) {
  if (interaction?.output_image?.data) return interaction.output_image;
  const blocks = [interaction?.output, interaction?.outputs, ...(interaction?.steps || []).flatMap((step) => step?.content || [])];
  for (const group of blocks) {
    const candidates = Array.isArray(group) ? group : [group];
    const image = candidates.find((item) => item && (item.type === "image" || item.type === "output_image") && (item.data || item.image?.data));
    if (image) return image.image || image;
  }
  return null;
}

export function normalizeGeminiResult(result, dimensions = {}) {
  if (result?.status !== "GENERATED") return result;
  return {
    provider: result.provider,
    model: result.model,
    imageBytes: result.imageBytes,
    mimeType: result.mimeType,
    width: dimensions.width ?? result.width,
    height: dimensions.height ?? result.height,
    prompt: result.prompt,
    requestId: result.requestId,
    generationMetadata: result.generationMetadata
  };
}

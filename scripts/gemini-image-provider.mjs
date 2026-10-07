#!/usr/bin/env node
/** Server-side Gemini Interactions image adapter. Credentials and raw API errors are never logged. */
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-nano-banana-2.1";
export const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export function buildGeminiImageRequest(generationRequest, model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL, promptOverride) {
  if (!generationRequest?.prompt || !generationRequest?.mediaId) throw new Error("INVALID_IMAGE_GENERATION_REQUEST");
  const prompt = promptOverride || generationRequest.prompt;
  const transparency = generationRequest.transparentBackground === false ? "" : " Isolated on a genuinely transparent background, no white backdrop, no colored backdrop, no environment; output must retain true transparent alpha pixels.";
  return {
    url: GEMINI_INTERACTIONS_URL,
    model,
    prompt: `${prompt}${transparency}`,
    body: {
      model,
      input: `${prompt}${transparency}`,
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
    const error = new Error(`GEMINI_IMAGE_HTTP_${response.status}`);
    error.status = response.status;
    error.retryable = response.status >= 500;
    error.provider = "gemini";
    error.requestId = response.headers?.get?.("x-goog-request-id") || response.headers?.get?.("x-request-id") || null;
    throw error;
  }
  const interaction = await response.json();
  const image = interaction?.output_image;
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

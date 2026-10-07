#!/usr/bin/env node
/** Server-side OpenAI image-generation adapter. Never logs credentials or raw response bodies. */
export const DEFAULT_IMAGE_MODEL = "gpt-image-2";
export const OPENAI_IMAGE_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";

export function buildImageRequest(generationRequest, model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL, promptOverride) {
  if (!generationRequest?.prompt || !generationRequest?.mediaId) throw new Error("INVALID_IMAGE_GENERATION_REQUEST");
  const prompt = promptOverride || generationRequest.prompt;
  return {
    url: OPENAI_IMAGE_GENERATIONS_URL,
    model,
    body: {
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
      background: "transparent",
      output_format: "png"
    }
  };
}

export async function requestImage(generationRequest, { apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL, fetchImpl = fetch, promptOverride, signal } = {}) {
  if (!apiKey) return { status: "NOT_CONFIGURED", requiredEnv: "OPENAI_API_KEY" };
  const request = buildImageRequest(generationRequest, model, promptOverride);
  const response = await fetchImpl(request.url, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(request.body),
    signal: signal || AbortSignal.timeout(180_000)
  });
  if (!response.ok) {
    const error = new Error(`OPENAI_IMAGE_HTTP_${response.status}`);
    error.status = response.status;
    // 429 trips the provider circuit; do not spend repeated attempts on a likely quota/limit response.
    error.retryable = response.status >= 500;
    error.provider = "openai";
    throw error;
  }
  const payload = await response.json();
  const encoded = payload?.data?.[0]?.b64_json;
  if (typeof encoded !== "string" || !encoded.length || encoded.length > 40 * 1024 * 1024) throw new Error("OPENAI_IMAGE_BASE64_MISSING_OR_OVERSIZED");
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) throw new Error("OPENAI_IMAGE_BASE64_INVALID");
  const metadata = { provider: "openai", model, createdAt: payload.created ? new Date(payload.created * 1000).toISOString() : new Date().toISOString(), outputFormat: "png", requestedQuality: "high", requestedSize: "1024x1024", requestedBackground: "transparent" };
  return {
    status: "GENERATED",
    bytes,
    provider: "openai", model, imageBytes: bytes, mimeType: "image/png", width: 1024, height: 1024,
    prompt: request.body.prompt, requestId: null, generationMetadata: metadata, metadata
  };
}

export async function generateWithRetry(generationRequest, { generate = requestImage, validate, maxAttempts = 3 } = {}) {
  let prompt = generationRequest.prompt;
  let lastError = null;
  const attempts = Math.min(3, Math.max(1, maxAttempts));
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const output = await generate(generationRequest, prompt);
      if (output.status === "NOT_CONFIGURED") return output;
      const quality = validate ? await validate(output.bytes) : { valid: true };
      if (quality?.valid === false) throw Object.assign(new Error(quality.reason || "IMAGE_QC_FAILED"), { retryable: true });
      output.metadata.generationPrompt = prompt;
      output.metadata.generationAttempt = attempt;
      output.technicalQc = quality;
      return output;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || error.retryable === false) break;
      prompt = retryPrompt(prompt, error.message || "IMAGE_QC_FAILED");
    }
  }
  throw Object.assign(new Error(lastError?.message || "IMAGE_GENERATION_FAILED"), {
    retryable: false, attempts, status: lastError?.status, provider: lastError?.provider, requestId: lastError?.requestId
  });
}

export function retryPrompt(basePrompt, reason) {
  const correction = String(reason).includes("TRANSPARENT") || String(reason).includes("ALPHA")
    ? "Retry requirement: true transparent alpha background, isolated cutout asset, no background pixels; no white backdrop, no colored backdrop, no environment."
    : String(reason).includes("FRAMING") || String(reason).includes("CLOSER")
      ? "Retry requirement: closer framing, subject occupying most of the canvas, centered and immediately recognizable."
      : String(reason).includes("TEXT")
        ? "Retry requirement: no text, no letters, no captions, no labels, no watermark."
        : "Retry the same approved semantic concept with a clean, technically valid transparent PNG.";
  return `${basePrompt}\n\n${correction}`;
}

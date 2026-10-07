#!/usr/bin/env node
/**
 * DuduQ missing-media workflow. Scans canonical content/registry contracts,
 * emits generation requests, and imports provider results without changing
 * Gold Master presentation. Semantic adequacy is never inferred from a name.
 */
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { inflateSync } from "node:zlib";
import { generateWithRetry } from "./openai-image-provider.mjs";

const ROOT = process.cwd();
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const DEFAULT_REGISTRY = "content/english/media/media-registry.json";
const INBOX = "content/english/assets/images/generated-inbox";
const OUTPUT_ROOT = "content/english/assets/images";
const DEFAULT_REQUESTS = "content/english/media/image-request-manifest.json";
const DEFAULT_SMOKE_REQUESTS = "content/english/media/image-provider-smoke-request.json";
const DEFAULT_SMOKE_REGISTRY = "test/fixtures/image-provider-smoke-registry.json";
const STYLE = "DUDUQ_ENGLISH_EDITORIAL_V1";

const abs = (relative) => path.resolve(ROOT, relative);
const isInside = (base, target) => target === base || target.startsWith(`${base}${path.sep}`);
const readJson = async (file) => JSON.parse(await readFile(abs(file), "utf8"));
const writeJson = async (file, value) => {
  const target = abs(file);
  if (!isInside(ROOT, target)) throw new Error(`PATH_OUTSIDE_WORKSPACE:${file}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exists = async (file) => access(file).then(() => true, () => false);
const relativePosix = (file) => path.relative(ROOT, file).replaceAll("\\", "/");
const cleanText = (value) => String(value ?? "").normalize("NFKC").toLowerCase();

function argsOf(argv) {
  const [command, ...rest] = argv;
  const args = { command, positional: [] };
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith("--")) args[rest[i].slice(2)] = rest[i + 1]?.startsWith("--") || rest[i + 1] === undefined ? true : rest[++i];
    else args.positional.push(rest[i]);
  }
  return args;
}

async function imageInfo(file) {
  let bytes;
  try { bytes = await readFile(file); } catch (error) { return { valid: false, reason: error.code || "READ_ERROR" }; }
  if (!bytes.length) return { valid: false, reason: "EMPTY_FILE" };
  const ext = path.extname(file).toLowerCase();
  let format = "unknown", width = 0, height = 0;
  let pngDetails = null;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    format = "png"; width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20); pngDetails = inspectPng(bytes);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) format = "jpeg";
  else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") format = "webp";
  else if (bytes.toString("ascii", 0, 6).startsWith("GIF8")) format = "gif";
  else if (ext === ".svg" && /^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(bytes.toString("utf8", 0, Math.min(bytes.length, 2048)))) format = "svg";
  if (!IMAGE_EXT.test(file) || format === "unknown") return { valid: false, reason: "INVALID_IMAGE_SIGNATURE" };
  if (format === "png" && (width < 1 || height < 1)) return { valid: false, reason: "INVALID_IMAGE_DIMENSIONS" };
  if (format === "png" && !pngDetails?.valid) return { valid: false, reason: pngDetails?.reason || "INVALID_PNG" };
  return { valid: true, format, width: width || null, height: height || null, bytes: bytes.length, sha256: sha256(bytes), ...(format === "png" ? pngDetails : {}), transparentCapable: format === "png" && [4, 6].includes(bytes[25]) };
}

function inspectPng(bytes) {
  try {
    if (bytes.length < 57 || bytes.toString("ascii", 12, 16) !== "IHDR") return { valid: false, reason: "INVALID_PNG_IHDR" };
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), bitDepth = bytes[24], colorType = bytes[25], interlace = bytes[28];
    if (!width || !height || width * height > 20_000_000 || bitDepth !== 8 || ![4, 6].includes(colorType) || interlace !== 0) return { valid: false, reason: "PNG_REQUIRES_BOUNDED_NONINTERLACED_8BIT_ALPHA" };
    const idat = [];
    let offset = 8, hasEnd = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset), type = bytes.toString("ascii", offset + 4, offset + 8), end = offset + 12 + length;
      if (end > bytes.length) return { valid: false, reason: "TRUNCATED_PNG_CHUNK" };
      if (type === "IDAT") idat.push(bytes.subarray(offset + 8, offset + 8 + length));
      if (type === "IEND") { hasEnd = true; break; }
      offset = end;
    }
    if (!hasEnd || !idat.length) return { valid: false, reason: "PNG_MISSING_IDAT_OR_IEND" };
    const channels = colorType === 6 ? 4 : 2, stride = width * channels;
    const raw = inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * height });
    if (raw.length !== (stride + 1) * height) return { valid: false, reason: "PNG_DECODE_LENGTH_MISMATCH" };
    let previous = Buffer.alloc(stride), alphaVisible = 0, alphaClear = 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y += 1) {
      const rowStart = y * (stride + 1), filter = raw[rowStart], row = Buffer.from(raw.subarray(rowStart + 1, rowStart + 1 + stride));
      for (let i = 0; i < stride; i += 1) {
        const left = i >= channels ? row[i - channels] : 0, up = previous[i], upLeft = i >= channels ? previous[i - channels] : 0;
        if (filter === 1) row[i] = (row[i] + left) & 255;
        else if (filter === 2) row[i] = (row[i] + up) & 255;
        else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
        else if (filter === 4) {
          const p = left + up - upLeft, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
          row[i] = (row[i] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
        } else if (filter !== 0) return { valid: false, reason: "INVALID_PNG_FILTER" };
      }
      for (let x = 0; x < width; x += 1) {
        const alpha = row[x * channels + channels - 1];
        if (alpha > 0) { alphaVisible += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        else alphaClear += 1;
      }
      previous = row;
    }
    if (!alphaVisible || !alphaClear) return { valid: false, reason: alphaVisible ? "PNG_BACKGROUND_NOT_TRANSPARENT" : "PNG_VISUALLY_EMPTY" };
    const coverage = ((maxX - minX + 1) * (maxY - minY + 1)) / (width * height);
    return { valid: true, transparent: true, alphaVisiblePixels: alphaVisible, alphaClearPixels: alphaClear, subjectBoundsCoverage: Number(coverage.toFixed(4)), subjectScaleQc: coverage >= 0.08 ? "PASS" : "NEEDS_CLOSER_FRAMING" };
  } catch { return { valid: false, reason: "PNG_DECODE_FAILED" }; }
}

async function walkImages(directory, output = []) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return output; }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkImages(full, output);
    else if (entry.isFile() && IMAGE_EXT.test(entry.name)) output.push(full);
  }
  return output;
}

function semanticTerms(requirement) {
  return [requirement.semanticDescription, requirement.productionBrief, requirement.concept,
    requirement.pedagogicalPurpose, ...(requirement.mustShow || []), ...(requirement.requiredAttributes || [])]
    .filter(Boolean).join(" ");
}

function generationPrompt(requirement, mechanic) {
  const required = (requirement.mustShow || requirement.requiredAttributes || []).join("; ") || requirement.semanticDescription;
  const forbidden = (requirement.mustNotShow || requirement.forbiddenAttributes || []).join("; ") || "no text, no logos, no answer labels";
  const framing = requirement.framingRequirement || requirement.composition || "centered, close or medium-close framing, subject large and immediately recognizable";
  return `Create one child-friendly DUDUQ English educational game asset for ${requirement.moduleId || "the specified learning module"}. Depict exactly: ${requirement.semanticDescription || requirement.productionBrief}. Required visible details: ${required}. Gameplay role: ${requirement.pedagogicalRole || "scene"}; mechanic: ${mechanic || requirement.mechanic || "content activity"}. ${framing}. Transparent background PNG, high resolution (at least 1024px on the longest side), centered composition, subject large and clear, face/hands/hair visible when relevant, clean silhouette, no clutter, no embedded text, no answer words, no watermark. DUDUQ friendly, inclusive, polished educational illustration style consistent with ${requirement.styleRequirement || STYLE}. Must not depict: ${forbidden}.`;
}

function requirementsForModule(moduleId, production, questions, registryIds) {
  const questionsById = new Map((questions.items || []).map((item) => [item.item_id, item]));
  const requirements = (production.assets || production.requirements || []).map((item) => {
    const usedByItems = item.usedByItems || [];
    const related = usedByItems.map((id) => questionsById.get(id)).filter(Boolean);
    const optionIds = [...new Set(related.flatMap((question) => (question.options || []).map((option) => option.mediaId).filter(Boolean)))];
    return {
      ...item,
      moduleId,
      mediaId: item.mediaId || item.proposedMediaId,
      semanticDescription: item.semanticDescription || item.productionBrief || item.altTextDraft,
      usedByItems,
      questionMediaIds: optionIds,
      mechanic: [...new Set(related.map((question) => question.mecanica_preferida).filter(Boolean))].join(", ") || item.mechanic || "unspecified",
      pedStatus: related.some((q) => q.mediaReviewStatus === "INADEQUATE" || q.imageAdequacy === "INADEQUATE") ? "INADEQUATE" : "UNASSESSED"
    };
  });
  const known = new Set(requirements.map((item) => item.mediaId));
  for (const question of questions.items || []) {
    const qid = question.item_id;
    const bound = new Set([
      question.image_ref,
      ...(question.mediaBindings || []).map((binding) => binding.mediaId),
      ...(question.options || []).map((option) => option.mediaId)
    ].filter(Boolean));
    for (const mediaId of bound) {
      if (known.has(mediaId)) continue;
      known.add(mediaId);
      if (registryIds.has(mediaId)) continue;
      const option = (question.options || []).find((item) => item.mediaId === mediaId);
      requirements.push({
        requirementId: `AUTO-${qid}-${mediaId}`, mediaId, moduleId, usedByItems: [qid],
        semanticDescription: option?.semanticDescription || option?.label || question.objetivo || mediaId,
        productionBrief: option?.label || question.objetivo || mediaId,
        mustShow: [option?.label || question.objetivo || mediaId], mustNotShow: ["embedded text", "ambiguous answer cue"],
        mechanic: question.mecanica_preferida || "unspecified", pedagogicalRole: option?.correct ? "correct" : "distractor",
        transparentBackground: true, status: "MISSING_CONTENT_BINDING"
      });
    }
  }
  return requirements;
}

async function scanModule(moduleDir, { registryPath = DEFAULT_REGISTRY, output = DEFAULT_REQUESTS } = {}) {
  const modulePath = moduleDir.replaceAll("\\", "/").replace(/\/$/, "");
  const moduleFile = `${modulePath}/module.json`;
  const questionFile = `${modulePath}/questions.json`;
  const productionFile = `${modulePath}/image-production-manifest.json`;
  const [questions, production, registry, resolution] = await Promise.all([
    readJson(questionFile), readJson(productionFile), readJson(registryPath),
    readJson(`${modulePath}/image-resolution-map.json`).catch(() => ({ requirements: [] }))
  ]);
  const moduleId = questions.moduleId || questions.module_id || path.basename(modulePath).toUpperCase();
  const mediaEntries = registry.entries || [];
  const mediaById = new Map(mediaEntries.map((entry) => [entry.mediaId, entry]));
  const questionBoundIds = new Set((questions.items || []).flatMap((question) => [question.image_ref, ...(question.mediaBindings || []).map((binding) => binding.mediaId), ...(question.options || []).map((option) => option.mediaId)]).filter(Boolean));
  const requirements = requirementsForModule(moduleId, production, questions, new Set(mediaById.keys()));
  const resolutionById = new Map((resolution.requirements || []).map((item) => [item.proposedMediaId || item.mediaId, item]));
  const imageRoots = [abs("content/english/assets/images"), abs("Assets-DuduQ"), abs("assets"), abs("public/assets")];
  const inventory = [...new Set((await Promise.all(imageRoots.map((root) => walkImages(root)))).flat())];
  const results = [];
  for (const requirement of requirements) {
    const entry = mediaById.get(requirement.mediaId);
    const resolutionEvidence = resolutionById.get(requirement.mediaId);
    const reason = [];
    const verifiedAssets = [];
    const refs = entry ? [...(entry.assets || []).map((a) => a.path), entry.urlOrPath].filter(Boolean) : [];
    for (const ref of refs) {
      if (/^https?:/i.test(ref)) { reason.push("REMOTE_RUNTIME_REFERENCE_NOT_LOCAL"); continue; }
      const target = path.resolve(ROOT, ref.replace(/^[/\\]+/, ""));
      if (!isInside(ROOT, target)) { reason.push("PATH_OUTSIDE_WORKSPACE"); continue; }
      const info = await imageInfo(target);
      if (info.valid) verifiedAssets.push({ path: relativePosix(target), ...info });
      else reason.push(`${relativePosix(target)}:${info.reason}`);
    }
    const components = entry?.components || [];
    const componentHealth = [];
    for (const componentId of components) {
      const child = mediaById.get(componentId);
      const childPaths = child ? [...(child.assets || []).map((a) => a.path), child.urlOrPath].filter(Boolean) : [];
      const valid = [];
      for (const ref of childPaths) {
        const target = path.resolve(ROOT, ref.replace(/^[/\\]+/, ""));
        if (isInside(ROOT, target)) { const info = await imageInfo(target); if (info.valid) valid.push({ path: relativePosix(target), ...info }); }
      }
      componentHealth.push({ mediaId: componentId, status: valid.length ? "READY" : "MISSING_OR_BROKEN", assets: valid });
    }
    const resolutionStatus = String(resolutionEvidence?.resolutionStatus || "").toUpperCase();
    const explicitInadequate = requirement.pedStatus === "INADEQUATE" || entry?.semanticReview === "INADEQUATE" || entry?.adequacyStatus === "INADEQUATE" || ["TO_GENERATE", "NEEDS_CHATGPT_IMAGE_GENERATION", "HUMAN_REJECTED"].includes(resolutionStatus) || entry?.status === "REJECTED";
    const idMissing = !requirement.mediaId;
    const fileMissing = (!verifiedAssets.length && (!components.length || componentHealth.some((item) => item.status !== "READY"))) || reason.some((entry) => entry.includes("ENOENT") || entry.includes("INVALID_IMAGE_SIGNATURE"));
    const registryUnresolved = !entry || !["APPROVED", "PENDING", "PENDING_HUMAN_REVIEW"].includes(entry.status);
    const status = explicitInadequate || idMissing || fileMissing || registryUnresolved ? "NEEDS_CHATGPT_IMAGE_GENERATION" : "RESOLVED_EXISTING_ASSET";
    const terms = cleanText(semanticTerms(requirement)).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3);
    const candidates = [];
    if (status !== "RESOLVED_EXISTING_ASSET") {
      for (const candidate of inventory) {
        const basename = cleanText(path.basename(candidate));
        const score = terms.filter((term) => basename.includes(term)).length;
        if (score) candidates.push({ path: relativePosix(candidate), score, matchType: "FILENAME_SEMANTIC_CANDIDATE_ONLY", visualReviewRequired: true });
      }
      candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    }
    const fileBase = (requirement.filename || `${requirement.mediaId || requirement.requirementId}.png`).replace(/\.(?:jpe?g|webp|gif|svg)$/i, ".png");
    const outPath = requirement.outputPath || `${OUTPUT_ROOT}/${modulePath.split("/").slice(-2).join("/")}/generated/${fileBase}`;
    results.push({
      requirementId: requirement.requirementId,
      mediaId: requirement.mediaId || null,
      moduleId,
      questionIds: requirement.usedByItems,
      referencedByQuestion: requirement.usedByItems.some((id) => questionBoundIds.has(requirement.mediaId)),
      mechanic: requirement.mechanic,
      semanticDescription: requirement.semanticDescription,
      pedagogicalRole: requirement.pedagogicalRole || "scene",
      status,
      resolutionEvidence: resolutionEvidence ? { resolutionStatus: resolutionEvidence.resolutionStatus, humanDecision: resolutionEvidence.humanDecision || null } : null,
      reasons: [...new Set(reason.concat(explicitInadequate ? ["SEMANTICALLY_MARKED_INADEQUATE"] : []))],
      currentMedia: entry ? { status: entry.status, paths: refs, components: componentHealth, resolvedAssets: verifiedAssets } : null,
      reuseCandidates: candidates.slice(0, 8),
      generationRequest: status === "NEEDS_CHATGPT_IMAGE_GENERATION" ? {
        requestId: requirement.mediaId || requirement.requirementId,
        mediaId: requirement.mediaId || requirement.requirementId,
        moduleId,
        questionId: requirement.usedByItems?.[0] || null,
        questionIds: requirement.usedByItems || [],
        mechanic: requirement.mechanic,
        semanticDescription: requirement.semanticDescription,
        pedagogicalRole: requirement.pedagogicalRole || "scene",
        visualPriority: requirement.visualPriority || "NORMAL",
        framingRequirement: requirement.framingRequirement || "centered close/medium-close framing; subject large, recognizable at gameplay size",
        transparentBackground: requirement.transparentBackground ?? true,
        styleRequirement: requirement.styleRequirement || STYLE,
        replacementStatus: "OFFICIAL_NEW_ASSET",
        canonicalFilename: path.basename(outPath),
        outputPath: outPath,
        prompt: generationPrompt(requirement, requirement.mechanic),
        provenance: { provider: "ChatGPT Image Generation", status: "AWAITING_GENERATION" },
        humanReview: "REQUIRED_FOR_SEMANTIC_APPROVAL"
      } : null
    });
  }
  const doc = { schemaVersion: "1.0", generatedAt: new Date().toISOString(), moduleId, source: { module: moduleFile, questions: questionFile, requirements: productionFile, registry: registryPath }, policy: { filenameMatchesAreCandidatesOnly: true, semanticAdequacyRequiresReviewOrExplicitMachineAssessment: true }, needs: results };
  await writeJson(output, doc);
  return { output, moduleId, total: results.length, resolved: results.filter((r) => r.status === "RESOLVED_EXISTING_ASSET").length, generationRequests: results.filter((r) => r.generationRequest).length, needs: results };
}

async function importGenerated({ requestId, bytes, registryPath = DEFAULT_REGISTRY, requestPath = DEFAULT_REQUESTS, provenance = {} }) {
  const requests = await readJson(requestPath);
  const need = requests.needs.find((item) => item.generationRequest?.requestId === requestId || item.generationRequest?.mediaId === requestId);
  if (!need?.generationRequest) throw new Error(`UNKNOWN_IMAGE_REQUEST:${requestId}`);
  const request = need.generationRequest;
  const signature = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!signature) throw new Error("GENERATED_IMAGE_MUST_BE_PNG");
  if (bytes.length < 1024) throw new Error("GENERATED_IMAGE_TOO_SMALL");
  const pngQc = inspectPng(bytes);
  if (!pngQc.valid) throw new Error(pngQc.reason);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width < 512 || height < 512) throw new Error(`GENERATED_IMAGE_RESOLUTION_TOO_LOW:${width}x${height}`);
  if (request.transparentBackground && !pngQc.transparent) throw new Error("PNG_BACKGROUND_NOT_TRANSPARENT");
  const destination = path.resolve(ROOT, request.outputPath);
  if (!isInside(abs(OUTPUT_ROOT), destination)) throw new Error(`UNSAFE_MEDIA_DESTINATION:${request.outputPath}`);
  if (path.basename(destination) !== request.canonicalFilename) throw new Error("CANONICAL_FILENAME_MISMATCH");
  const questionPath = `content/english/year-${String(request.moduleId).match(/^Y(\d+)/)?.[1] || "1"}/module-${String(request.moduleId).match(/M(\d+)/)?.[1]?.padStart(2, "0") || "01"}/questions.json`;
  let questionDoc = null, questionChanged = false;
  if (await exists(abs(questionPath))) {
    questionDoc = await readJson(questionPath);
    for (const itemId of request.questionIds || []) {
      const question = (questionDoc.items || []).find((item) => item.item_id === itemId);
      if (!question) continue;
      if (!question.image_ref) { question.image_ref = request.mediaId; questionChanged = true; }
      if (question.image_ref !== request.mediaId && !(question.mediaBindings || []).some((binding) => binding.mediaId === request.mediaId)) {
        throw new Error(`CONTENT_BINDING_CONFLICT:${itemId}:${question.image_ref}:${request.mediaId}`);
      }
    }
  }
  const registry = await readJson(registryPath);
  registry.entries ||= [];
  const existing = registry.entries.find((entry) => entry.mediaId === request.mediaId);
  const fileHash = sha256(bytes);
  await mkdir(path.dirname(destination), { recursive: true });
  if (await exists(destination)) {
    const currentHash = sha256(await readFile(destination));
    if (currentHash !== fileHash) throw new Error(`REFUSING_OVERWRITE_EXISTING_ASSET:${request.outputPath}`);
  } else await writeFile(destination, bytes);
  const asset = { path: relativePosix(destination), sha256: fileHash, mediaType: "image/png", width, height, transparent: true, visualQc: { subjectBoundsCoverage: pngQc.subjectBoundsCoverage, subjectScaleQc: pngQc.subjectScaleQc, semanticPresence: "NEEDS_HUMAN_PEDAGOGICAL_REVIEW", textDetection: "NOT_AUTOMATED" }, provenance: { provider: provenance.provider || "openai", requestId, generatedAt: provenance.generatedAt || new Date().toISOString(), generationPrompt: request.prompt, model: provenance.model || request.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", ...provenance } };
  const entry = {
    ...(existing || {}), mediaId: request.mediaId, requirementId: need.requirementId, status: "PENDING",
    kind: "image", urlOrPath: asset.path, assets: [asset], altText: request.semanticDescription,
    semanticDescription: request.semanticDescription, moduleId: request.moduleId, usedByItems: request.questionIds,
    assetHistory: [...(existing?.assetHistory || []), ...(existing?.assets || []).filter((old) => old.sha256 !== fileHash)],
    integrationStatus: "GENERATED_OFFICIAL_CANDIDATE", pedagogicalReview: "NEEDS_HUMAN_PEDAGOGICAL_REVIEW",
    generationRequestId: request.requestId, temporary: false
  };
  if (existing) Object.assign(existing, entry); else registry.entries.push(entry);
  if (!request.testOnly && questionDoc && questionChanged) await writeJson(questionPath, questionDoc);
  await writeJson(registryPath, registry);
  need.status = "GENERATED_IMPORTED_AWAITING_PEDAGOGICAL_REVIEW";
  need.currentMedia = { status: entry.status, paths: [asset.path], resolvedAssets: [{ path: asset.path, valid: true, format: "png", width, height, sha256: fileHash }], components: [] };
  need.importedAsset = asset;
  await writeJson(requestPath, requests);
  return { mediaId: entry.mediaId, path: asset.path, sha256: fileHash, width, height, status: entry.status, pedagogicalReview: entry.pedagogicalReview, visualQc: asset.visualQc };
}

async function validateRegistry(registryPath = DEFAULT_REGISTRY) {
  const registry = await readJson(registryPath);
  const byId = new Map((registry.entries || []).map((entry) => [entry.mediaId, entry]));
  const issues = [];
  const checked = new Set();
  async function checkEntry(entry, stack = new Set()) {
    if (stack.has(entry.mediaId)) { issues.push({ mediaId: entry.mediaId, issue: "CIRCULAR_COMPONENT_REFERENCE" }); return; }
    if (checked.has(entry.mediaId)) return;
    checked.add(entry.mediaId);
    const refs = [...(entry.assets || []).map((a) => a.path), entry.urlOrPath].filter(Boolean);
    if (!refs.length && !(entry.components || []).length) issues.push({ mediaId: entry.mediaId, issue: "NO_PATH_OR_COMPONENTS" });
    for (const ref of refs) {
      if (/^https?:/i.test(ref)) { issues.push({ mediaId: entry.mediaId, issue: "REMOTE_RUNTIME_PATH", path: ref }); continue; }
      const target = path.resolve(ROOT, ref.replace(/^[/\\]+/, ""));
      if (!isInside(ROOT, target)) { issues.push({ mediaId: entry.mediaId, issue: "PATH_OUTSIDE_WORKSPACE", path: ref }); continue; }
      const info = await imageInfo(target);
      if (!info.valid) issues.push({ mediaId: entry.mediaId, issue: info.reason, path: ref });
    }
    for (const componentId of entry.components || []) {
      const child = byId.get(componentId);
      if (!child) issues.push({ mediaId: entry.mediaId, issue: "MISSING_COMPONENT", componentId });
      else await checkEntry(child, new Set([...stack, entry.mediaId]));
    }
  }
  for (const entry of registry.entries || []) {
    await checkEntry(entry);
  }
  return { status: issues.length ? "ISSUE" : "PASS", entries: registry.entries?.length || 0, issues };
}

async function runBridge({ port = 4176, registryPath = DEFAULT_REGISTRY, requestPath = DEFAULT_REQUESTS }) {
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "null");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
    if (req.method !== "POST" || req.url !== "/api/generated-image") { res.writeHead(404).end(); return; }
    try {
      let raw = "";
      for await (const chunk of req) { raw += chunk; if (raw.length > 30 * 1024 * 1024) throw new Error("PAYLOAD_TOO_LARGE"); }
      const body = JSON.parse(raw);
      const bytes = Buffer.from(String(body.pngBase64 || ""), "base64");
      const result = await importGenerated({ requestId: String(body.requestId || ""), bytes, registryPath, requestPath, provenance: body.provenance || {} });
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ status: "IMPORTED", ...result }));
    } catch (error) { res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ status: "ISSUE", error: error.message })); }
  });
  server.listen(Number(port), "127.0.0.1");
  console.log(JSON.stringify({ status: "READY", bridge: `http://127.0.0.1:${port}/api/generated-image` }));
}

async function generateRequests({ requestPath = DEFAULT_REQUESTS, requestId = null, testOnly = false }) {
  const document = await readJson(requestPath);
  const needs = (document.needs || []).filter((need) => need.generationRequest &&
    (!requestId || need.generationRequest.requestId === requestId || need.generationRequest.mediaId === requestId) &&
    (testOnly ? need.generationRequest.testOnly === true : need.status === "NEEDS_CHATGPT_IMAGE_GENERATION" && need.generationRequest.testOnly !== true));
  if (!process.env.OPENAI_API_KEY) return { status: "NOT_CONFIGURED", provider: "openai", requiredEnv: "OPENAI_API_KEY", generated: 0 };
  if (!needs.length) return { status: "NO_PENDING_REQUESTS", provider: "openai", model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", generated: 0 };
  const completed = [], failures = [];
  for (const need of needs) {
    const request = need.generationRequest;
    let result = null, qc = null;
    try {
      result = await generateWithRetry(request, {
        validate: (bytes) => {
          qc = inspectPng(bytes);
          if (!qc.valid) return qc;
          const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
          if (bytes.length < 1024 || width !== 1024 || height !== 1024) return { valid: false, reason: "IMAGE_FILE_SIZE_OR_DIMENSIONS_INVALID" };
          if (qc.subjectScaleQc !== "PASS") return { valid: false, reason: "SUBJECT_NEEDS_CLOSER_FRAMING" };
          return qc;
        }
      });
      if (result.status === "NOT_CONFIGURED") return { status: "NOT_CONFIGURED", provider: "openai", requiredEnv: "OPENAI_API_KEY", generated: 0 };
      qc = result.technicalQc;
    } catch (error) {
      const safeCode = String(error.message || "GENERATION_ERROR").replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 90);
      failures.push({ requestId: request.requestId, error: safeCode, attempts: error.attempts || 3 });
    }
    if (!result) continue;
    try {
      const registryPath = request.testOnly ? (request.testRegistryPath || DEFAULT_SMOKE_REGISTRY) : DEFAULT_REGISTRY;
      const requestSnapshot = request.testOnly ? JSON.stringify(document) : null;
      const registrySnapshot = request.testOnly ? await readFile(abs(registryPath)).catch(() => Buffer.from('{"schemaVersion":"1.0","entries":[]}\n')) : null;
      const destination = path.resolve(ROOT, request.outputPath);
      if (request.testOnly && await exists(destination)) throw new Error("SMOKE_OUTPUT_ALREADY_EXISTS");
      const imported = await importGenerated({ requestId: request.requestId, bytes: result.bytes, registryPath, requestPath, provenance: result.metadata });
      completed.push({ requestId: request.requestId, ...imported });
      request.status = "GENERATED_OFFICIAL_CANDIDATE";
      request.provider = result.metadata.provider; request.model = result.metadata.model;
      request.createdAt = result.metadata.createdAt; request.generationPrompt = result.metadata.generationPrompt;
      request.generationAttempts = result.metadata.generationAttempt;
      await writeJson(requestPath, document);
      if (!request.testOnly) {
        const registryHealth = await validateRegistry(registryPath);
        if (registryHealth.status !== "PASS") throw new Error("MEDIA_REGISTRY_QC_FAILED");
        const moduleMediaHealth = await validateQuestionMediaBindings(`content/english/year-${String(request.moduleId).match(/^Y(\d+)/)?.[1] || "1"}/module-${String(request.moduleId).match(/M(\d+)/)?.[1]?.padStart(2, "0") || "01"}`);
        if (moduleMediaHealth.status !== "PASS") throw new Error("MODULE_MEDIA_BINDING_VALIDATION_FAILED");
        const { spawnSync } = await import("node:child_process");
        const build = spawnSync(process.execPath, ["scripts/build-cloudflare-pages.mjs"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
        if (build.status !== 0) throw new Error("PRODUCT_BUILD_FAILED");
        const assetPath = imported.path.replaceAll("\\", "/");
        const base = process.env.DUDUQ_RUNTIME_BASE_URL || "http://127.0.0.1:4175";
        const response = await fetch(`${base}/${assetPath}`);
        if (!response.ok) throw new Error(`RUNTIME_HTTP_${response.status}`);
        const served = Buffer.from(await response.arrayBuffer());
        if (sha256(served) !== imported.sha256) throw new Error("RUNTIME_ASSET_HASH_MISMATCH");
      } else {
        try { await verifySmokeAssetHttp(destination, imported.sha256, imported.path); }
        finally {
          if (await exists(destination) && sha256(await readFile(destination)) === imported.sha256) await rm(destination);
          await writeFile(abs(registryPath), registrySnapshot);
          await writeJson(requestPath, JSON.parse(requestSnapshot));
        }
        await writeJson("content/english/media/image-provider-smoke-report.json", {
          schemaVersion: "1.0", status: "PASS_AND_CLEANED", requestId: request.requestId, provider: result.metadata.provider,
          model: result.metadata.model, outputFormat: "png", requestedSize: "1024x1024", requestedQuality: "high",
          transparency: "PASS", technicalQc: imported.visualQc || "PASS", canonicalImport: imported.path,
          sha256: imported.sha256, runtimeHttp: "PASS", artifactRetained: false,
          visualQc: "NEEDS_HUMAN_PEDAGOGICAL_REVIEW", generatedAt: result.metadata.createdAt
        });
      }
    } catch (error) {
      failures.push({ requestId: request.requestId, error: String(error.message || "IMPORT_ERROR").replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 90), attempts: 1 });
    }
  }
  return { status: failures.length ? "ISSUE" : "PASS", provider: "openai", model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", generated: completed.length, completed, failures };
}

async function verifySmokeAssetHttp(file, expectedHash, routePath) {
  const { createReadStream } = await import("node:fs");
  const server = createServer((req, res) => {
    if (req.url !== `/${routePath.replaceAll("\\", "/")}`) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": "image/png" }); createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/${routePath.replaceAll("\\", "/")}`);
    if (!response.ok) throw new Error(`SMOKE_HTTP_${response.status}`);
    const served = Buffer.from(await response.arrayBuffer());
    if (sha256(served) !== expectedHash) throw new Error("SMOKE_HTTP_HASH_MISMATCH");
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

async function validateQuestionMediaBindings(moduleDir) {
  const questions = await readJson(`${moduleDir}/questions.json`);
  const registry = await readJson(DEFAULT_REGISTRY);
  const entries = new Map((registry.entries || []).map((entry) => [entry.mediaId, entry]));
  const ids = new Set((questions.items || []).flatMap((item) => [item.image_ref, ...(item.mediaBindings || []).map((entry) => entry.mediaId), ...(item.options || []).map((entry) => entry.mediaId)]).filter(Boolean));
  const missing = [...ids].filter((id) => !entries.has(id));
  return { status: missing.length ? "ISSUE" : "PASS", moduleId: questions.moduleId, boundMediaIds: ids.size, missing };
}

export { imageInfo, inspectPng, scanModule, importGenerated, validateRegistry, validateQuestionMediaBindings, generateRequests };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const cli = argsOf(process.argv.slice(2));
  try {
    if (cli.command === "scan") {
      const moduleDir = cli.module || "content/english/year-1/module-01";
      const result = await scanModule(moduleDir, { registryPath: cli.registry || DEFAULT_REGISTRY, output: cli.output || DEFAULT_REQUESTS });
      console.log(JSON.stringify({ status: "PASS", moduleId: result.moduleId, requirements: result.total, resolved: result.resolved, generationRequests: result.generationRequests, manifest: result.output }, null, 2));
    } else if (cli.command === "validate") console.log(JSON.stringify(await validateRegistry(cli.registry || DEFAULT_REGISTRY), null, 2));
    else if (cli.command === "import") {
      if (!cli.request || !cli.file) throw new Error("USAGE: import --request MEDIA_ID --file generated.png");
      const source = path.resolve(String(cli.file));
      const info = await imageInfo(source);
      if (!info.valid) throw new Error(`INVALID_GENERATED_IMAGE:${info.reason}`);
      console.log(JSON.stringify(await importGenerated({ requestId: cli.request, bytes: await readFile(source), registryPath: cli.registry || DEFAULT_REGISTRY, requestPath: cli.requests || DEFAULT_REQUESTS, provenance: { provider: "ChatGPT Image Generation", sourceFile: path.basename(source) } }), null, 2));
    } else if (cli.command === "bridge") await runBridge({ port: cli.port || 4176, registryPath: cli.registry || DEFAULT_REGISTRY, requestPath: cli.requests || DEFAULT_REQUESTS });
    else if (cli.command === "generate") {
      const result = await generateRequests({ requestPath: cli.requests || DEFAULT_REQUESTS, requestId: cli.request || null });
      console.log(JSON.stringify({ ...result, ...(result.status === "NOT_CONFIGURED" ? { IMAGE_PROVIDER: "NOT_CONFIGURED", REQUIRED_ENV: "OPENAI_API_KEY" } : {}) }, null, 2));
      if (result.status === "NOT_CONFIGURED") process.exitCode = 2;
      else if (result.status === "ISSUE") process.exitCode = 1;
    } else if (cli.command === "smoke") {
      const result = await generateRequests({ requestPath: cli.requests || DEFAULT_SMOKE_REQUESTS, requestId: "TEST-OPENAI-IMAGE-SMOKE-001", testOnly: true });
      console.log(JSON.stringify({ ...result, ...(result.status === "NOT_CONFIGURED" ? { IMAGE_PROVIDER: "NOT_CONFIGURED", REQUIRED_ENV: "OPENAI_API_KEY" } : {}) }, null, 2));
      if (result.status === "NOT_CONFIGURED") process.exitCode = 2;
      else if (result.status === "ISSUE") process.exitCode = 1;
    }
    else throw new Error("USAGE: node scripts/duduq-image-pipeline.mjs scan | validate | import --request ID --file image.png | bridge | generate | smoke");
  } catch (error) { console.error(JSON.stringify({ status: "ISSUE", error: error.message })); process.exitCode = 1; }
}

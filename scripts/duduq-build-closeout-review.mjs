import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const WORKSPACE = process.cwd();
const CANDIDATE = process.env.DUDUQ_CANDIDATE_ROOT || 'C:/Users/augus/AppData/Local/Temp/dqwt2';
const EXPECTED_SHA = '5EE292C8CD45C07689D9EB89AC8E80D8ACD2535A05AC75E5D588864FA30DA313';
const OUTPUT = path.join(WORKSPACE, 'artifacts', 'qa-final-closeout');
const PANEL = path.join(OUTPUT, 'visual-panel');
const EVIDENCE = path.join(PANEL, 'evidence');
const REPORT_DIR = path.join(CANDIDATE, 'docs', 'qa');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const safeText = value => typeof value === 'string' ? value.trim() : '';
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

await fs.mkdir(EVIDENCE, { recursive: true });

// Re-check the frozen candidate manifest without modifying it.
const manifestPath = path.join(CANDIDATE, 'dist-pages', '.duduq-pages-manifest');
const manifestBytes = await fs.readFile(manifestPath);
const actualCandidateSha = sha256(manifestBytes);
if (actualCandidateSha !== EXPECTED_SHA) {
  throw new Error(`Frozen candidate SHA mismatch: expected ${EXPECTED_SHA}, got ${actualCandidateSha}`);
}
const integrityEvidence = {
  expectedSha256: EXPECTED_SHA,
  actualSha256: actualCandidateSha,
  manifestBytes: manifestBytes.length,
  verificationReport: await readJson(path.join(REPORT_DIR, 'DUDUQ_AUTONOMOUS_FINAL_CERTIFICATION.json')),
};

const fullscreen = await readJson(path.join(REPORT_DIR, 'DUDUQ_FULLSCREEN_13_FINAL.json'));
const memoryTwoPair = await readJson(path.join(REPORT_DIR, 'DUDUQ_MEMORY_QUEST_TWO_PAIR_FIT_E2E.json'));
const q020 = await readJson(path.join(REPORT_DIR, 'DUDUQ_FINAL_SEQUENTIAL_FULLSCREEN_AND_Q020.json'));
const reportHashes = {};
for (const name of [
  'DUDUQ_AUTONOMOUS_FINAL_CERTIFICATION.json',
  'DUDUQ_FULLSCREEN_13_FINAL.json',
  'DUDUQ_MEMORY_QUEST_TWO_PAIR_FIT_E2E.json',
  'DUDUQ_FINAL_SEQUENTIAL_FULLSCREEN_AND_Q020.json',
  'DUDUQ_FULLSCREEN_MEMORY_AUDIO_TEXT_FINAL.json',
  'DUDUQ_FULLSCREEN_MEMORY_TEXT_IMAGE_FINAL.json',
  'DUDUQ_Y1M01_DEFAULT_VARIANTS_V6_7.json',
]) {
  const bytes = await fs.readFile(path.join(REPORT_DIR, name));
  reportHashes[name] = sha256(bytes);
}

const evidenceRecords = [];
const seenEvidenceSources = new Set();
async function addEvidence(sourceFile, group, activityId, state, viewport, sourceReport) {
  const ext = path.extname(sourceFile).toLowerCase();
  if (!imageExtensions.has(ext)) return;
  const sourceKey = path.resolve(sourceFile).toLowerCase();
  if (seenEvidenceSources.has(sourceKey)) return;
  seenEvidenceSources.add(sourceKey);
  const bytes = await fs.readFile(sourceFile);
  const basename = path.basename(sourceFile);
  const safeGroup = group.replace(/[^a-z0-9_-]+/gi, '-');
  const safeActivity = activityId.replace(/[^a-z0-9_-]+/gi, '-');
  const relative = path.join('evidence', safeGroup, safeActivity, basename);
  const destination = path.join(PANEL, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(sourceFile, destination);
  const copiedBytes = await fs.readFile(destination);
  if (sha256(copiedBytes) !== sha256(bytes)) throw new Error(`Evidence copy hash mismatch: ${relative}`);
  const pixels = bytes.length >= 24 && bytes.readUInt32BE(0) === 0x89504e47
    ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
    : null;
  evidenceRecords.push({
    group, activityId, state, viewport, file: relative.replaceAll(path.sep, '/'),
    source: path.relative(CANDIDATE, sourceFile).replaceAll(path.sep, '/'), pixels,
    sha256: sha256(bytes), bytes: bytes.length, sourceReport,
  });
}

const variantDir = path.join(CANDIDATE, 'artifacts', 'qa', 'fullscreen-interactive-13', 'final-all-13-isolated');
const screenshots = (await fs.readdir(variantDir, { withFileTypes: true }))
  .filter(entry => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
  .map(entry => entry.name).sort();
if (screenshots.length !== 78) throw new Error(`Expected 78 variant screenshots; found ${screenshots.length}`);
for (const name of screenshots) {
  const match = /^variant-(.+?)-(fullscreen-feedback|fullscreen-ready|ready-embed-1024x559|ready-embed-1366x768|restored-1024|restored-1366)\.(png|jpg|jpeg|webp)$/i.exec(name);
  const suffix = match?.[2] || 'unclassified';
  let group = 'other';
  if (name.startsWith('variant-memory-quest-')) group = 'Memory Quest';
  else if (name.startsWith('variant-bubble-pop-')) group = 'Bubble Pop';
  else if (name.startsWith('variant-target-shooter-')) group = 'Target Shooter';
  else if (name.startsWith('variant-drag-drop-multimedia-')) group = 'Drag & Drop Multimídia';
  else if (name.startsWith('variant-drag-drop-grouping-')) group = 'Grouping';
  else if (name.startsWith('variant-matching-')) group = 'Matching';
  else if (name.startsWith('variant-smart-sentence-complete-')) group = 'Smart Sentence Complete';
  else if (name.startsWith('variant-smart-sentence-order-')) group = 'Smart Sentence Order';
  const record = fullscreen.variants.find(v => name.includes(`variant-${v.mechanicId}-`) && name.includes(v.variant.toLowerCase().replaceAll('_', '-')))
    || fullscreen.variants.find(v => name.toLowerCase().includes(v.mechanicId) && name.toLowerCase().includes(v.variant.toLowerCase().replaceAll('_', '-')))
    || fullscreen.variants.find(v => name.toLowerCase().includes(v.mechanicId));
  const activityId = record?.activityId || 'UNMAPPED';
  const viewport = suffix.includes('1024') ? '1024×559 embed (captura 1024)' : suffix.includes('1366') ? '1366×768 embed/restored' : '1366×768 fullscreen';
  await addEvidence(path.join(variantDir, name), group, activityId, suffix, viewport, 'DUDUQ_FULLSCREEN_13_FINAL.json');
}

// Add the exact two special Memory Quest cases and the Q020/module-completion evidence.
for (const item of memoryTwoPair.cases || []) {
  for (const evidence of item.evidence || []) {
    const source = path.join(CANDIDATE, evidence);
    const basename = path.basename(evidence);
    const state = basename.replace(`${item.activityId}-`, '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
    await addEvidence(source, 'Memory Quest especiais', item.activityId, state, basename.includes('1024') ? '1024×559 embed' : '1366×768 fullscreen', 'DUDUQ_MEMORY_QUEST_TWO_PAIR_FIT_E2E.json');
  }
}
const q020Dir = path.join(CANDIDATE, 'artifacts', 'qa', 'final-sequential-fullscreen');
const q020Files = (await fs.readdir(q020Dir, { withFileTypes: true })).filter(entry => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()));
for (const entry of q020Files) {
  const name = entry.name;
  const activityId = name.includes('module-complete') ? 'Y1M01-COMPLETE' : 'Y1M01-Q020';
  const state = name.replace(/^Y1M01-(?:Q020-)?/, '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
  const viewport = /1920x1080/i.test(name) ? '1920×1080' : /1366x768/i.test(name) ? '1366×768' : /1024x559/i.test(name) ? '1024×559' : 'variável / legado';
  await addEvidence(path.join(q020Dir, name), 'Y1M01 Q020 e encerramento', activityId, state, viewport, 'DUDUQ_FINAL_SEQUENTIAL_FULLSCREEN_AND_Q020.json');
}

// Read-only geometric indicators: they are flags for review, not an aesthetic verdict.
function collectFlags(value, pathLabel, out) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((child, index) => collectFlags(child, `${pathLabel}[${index}]`, out)); return; }
  for (const [key, child] of Object.entries(value)) {
    const next = `${pathLabel}.${key}`;
    if (key === 'textClipped' && child === true) out.push({ type: 'textClippedFlag', path: next });
    if (['rootContained', 'visuallyContained', 'buttonWithin'].includes(key) && child === false) out.push({ type: `${key}False`, path: next });
    if (key === 'scroll' && Array.isArray(child) && Array.isArray(value.client) && (child[0] > value.client[0] + 1 || child[1] > value.client[1] + 1)) {
      out.push({ type: 'scrollExtentExceedsClient', path: next, client: value.client, scroll: child });
    }
    collectFlags(child, next, out);
  }
}
const geometry = (fullscreen.variants || []).map(variant => {
  const flags = [];
  collectFlags(variant.embed1024, 'embed1024', flags);
  collectFlags(variant.fullscreenReady, 'fullscreenReady', flags);
  collectFlags(variant.feedback, 'feedback', flags);
  collectFlags(variant.feedbackGeometry, 'feedbackGeometry', flags);
  return {
    mechanic: variant.mechanic,
    mechanicId: variant.mechanicId,
    variant: variant.variant,
    activityId: variant.activityId,
    reportStatus: variant.status,
    evidenceFreshness: variant.evidenceFreshness,
    testedContainers: variant.testedContainers,
    noCriticalClip: variant.noCriticalClip,
    feedbackVisible: variant.feedbackVisible,
    geometryFlags: flags,
  };
});

// Reconcile actual V3 media references against the frozen candidate's media registry.
const englishRoot = path.join(CANDIDATE, 'dist-pages', 'content', 'english');
const registryPath = path.join(englishRoot, 'media', 'media-registry.json');
const registry = await readJson(registryPath);
const registryById = new Map();
for (const entry of registry.entries || []) {
  const list = registryById.get(entry.mediaId) || [];
  list.push(entry);
  registryById.set(entry.mediaId, list);
}
const mediaUses = new Map();
const v3VisualBases = new Set();
const modules = [];
function promptFromItem(item) {
  const found = [];
  function walk(obj, keyPath = '') {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach((child, i) => walk(child, `${keyPath}[${i}]`)); return; }
    for (const [key, child] of Object.entries(obj)) {
      const isPrompt = /^(prompt|imageprompt|image_prompt|visualprompt|visual_prompt|generationprompt|generation_prompt|imagebrief|image_brief|visual_requirement|visualRequirement)$/i.test(key);
      if (isPrompt && typeof child === 'string' && child.trim()) found.push({ field: keyPath ? `${keyPath}.${key}` : key, value: child.trim() });
      else if (child && typeof child === 'object') walk(child, keyPath ? `${keyPath}.${key}` : key);
    }
  }
  walk(item);
  const unique = new Map(found.map(p => [`${p.field}\0${p.value}`, p]));
  return [...unique.values()];
}
function isImageMediaId(id, fieldName, entry) {
  if (entry?.kind) return entry.kind.toLowerCase() === 'image';
  if (/^aud[-_]/i.test(id)) return false;
  return /^(IMG|IMAGE|ILL|EMOJI|PIC)[-_]/i.test(id) || /image|illustration|picture/i.test(fieldName);
}
for (let year = 1; year <= 5; year++) {
  for (let module = 1; module <= 6; module++) {
    const moduleId = `Y${year}M${String(module).padStart(2, '0')}`;
    const rel = `year-${year}/module-${String(module).padStart(2, '0')}/questions.json`;
    const file = path.join(englishRoot, rel);
    const contract = await readJson(file);
    const items = contract.items || [];
    modules.push({ moduleId, count: items.length, source: `dist-pages/content/english/${rel}` });
    for (const item of items) {
      const activityId = item.item_id || item.activityId || item.questionId || 'UNKNOWN_ACTIVITY';
      const prompts = promptFromItem(item);
      for (const prompt of prompts) if (/visual|image|illustration/i.test(prompt.field) || prompt.field.toLowerCase() === 'prompt') v3VisualBases.add(prompt.value);
      function collect(obj, keyPath = '') {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach((child, index) => collect(child, `${keyPath}[${index}]`)); return; }
        for (const [key, value] of Object.entries(obj)) {
          const next = keyPath ? `${keyPath}.${key}` : key;
          if (typeof value === 'string' && (/^(mediaId|media_id|image_ref|imageRef|imageId|illustrationId)$/i.test(key))) {
            const entry = (registryById.get(value) || [])[0];
            if (isImageMediaId(value, next, entry)) {
              const use = { activityId, moduleId, year, role: next, prompt: prompts.map(p => p.value).join('\n') || null, semanticReview: obj.semanticReview || item.semanticReview || null };
              const uses = mediaUses.get(value) || [];
              uses.push(use);
              mediaUses.set(value, uses);
            }
          } else if (value && typeof value === 'object') collect(value, next);
        }
      }
      collect(item);
    }
  }
}
const physicalBySha = new Map();
const mediaManifest = [];
for (const [mediaId, uses] of [...mediaUses.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const entries = registryById.get(mediaId) || [];
  const entry = entries[0] || null;
  let assetRecords = [];
  const declaredAssets = entry?.assets?.length ? entry.assets : entry?.urlOrPath ? [{ path: entry.urlOrPath }] : [];
  for (const asset of declaredAssets) {
    const rel = asset.path || entry.urlOrPath;
    const file = rel ? path.resolve(CANDIDATE, 'dist-pages', rel.replace(/^\/+/, '')) : null;
    const exists = file ? await fs.access(file).then(() => true, () => false) : false;
    let actualSha = null;
    if (exists) actualSha = sha256(await fs.readFile(file));
    assetRecords.push({ path: rel || null, exists, declaredSha256: asset.sha256 || null, actualSha256: actualSha, shaMatches: asset.sha256 ? actualSha?.toLowerCase() === asset.sha256.toLowerCase() : null, temporary: asset.temporary ?? entry?.temporary ?? false });
    if (actualSha) {
      const group = physicalBySha.get(actualSha) || new Set();
      group.add(mediaId);
      physicalBySha.set(actualSha, group);
    }
  }
  let status;
  if (!entry) status = 'MISSING_FROM_MEDIA_REGISTRY';
  else if (entries.length > 1) status = 'DUPLICATE_MEDIA_ID_REGISTRY_ENTRIES';
  else if (assetRecords.length && assetRecords.some(asset => !asset.exists || asset.shaMatches === false)) status = 'ASSET_MISSING_OR_HASH_MISMATCH';
  else if (entry.status !== 'APPROVED') status = `REGISTRY_${entry.status || 'STATUS_UNSET'}`;
  else if (entry.temporary || (entry.assets || []).some(asset => asset.temporary) || /REPLACE_LATER|TEMPORARY_ACCEPTED/i.test(`${entry.integrationStatus || ''} ${entry.humanResolutionStatus || ''}`)) status = 'PROVISIONAL_TEMPORARY_ASSET';
  else status = 'APPROVED_ASSET';
  const reviewFlags = [];
  if (uses.some(use => /NEEDS_HUMAN_REVIEW/i.test(use.prompt || ''))) reviewFlags.push('V3_SEMANTIC_REVIEW_FLAG');
  if (uses.some(use => /NEEDS_HUMAN_REVIEW/i.test(use.semanticReview || ''))) reviewFlags.push('V3_ACTIVITY_SEMANTIC_REVIEW_PENDING');
  if (!entries.length || entries.length > 1 || status === 'ASSET_MISSING_OR_HASH_MISMATCH') reviewFlags.push('NEEDS_HUMAN_REVIEW');
  const activities = [...new Set(uses.map(use => use.activityId))].sort();
  mediaManifest.push({
    mediaId,
    kind: entry?.kind || 'unregistered-image-reference',
    status,
    priority: status === 'MISSING_FROM_MEDIA_REGISTRY' || status === 'ASSET_MISSING_OR_HASH_MISMATCH' ? 'P0_CONTENT_BLOCKER' : status === 'PROVISIONAL_TEMPORARY_ASSET' ? 'P1_OFFICIAL_MEDIA_REPLACEMENT' : reviewFlags.length ? 'HUMAN_REVIEW' : 'NORMAL',
    v2InventoryComparison: 'NOT_AVAILABLE_SOURCE_WORKBOOK_NOT_FOUND',
    prompt: [...new Set(uses.map(use => use.prompt).filter(Boolean))],
    activities,
    modules: [...new Set(uses.map(use => use.moduleId))].sort(),
    pedagogicalRoles: [...new Set(uses.map(use => use.role))].sort(),
    usageCount: uses.length,
    registry: entry ? { status: entry.status, requirementId: entry.requirementId || null, urlOrPath: entry.urlOrPath || null, temporary: entry.temporary ?? false, integrationStatus: entry.integrationStatus || null, humanResolutionStatus: entry.humanResolutionStatus || null, assets: assetRecords } : null,
    dependencies: activities,
    reviewFlags,
  });
}
const duplicatePhysicalAssets = [...physicalBySha.entries()]
  .filter(([, ids]) => ids.size > 1)
  .map(([assetSha256, ids]) => ({ assetSha256, mediaIds: [...ids].sort() }));
const imageRegistryEntries = (registry.entries || []).filter(entry => entry.kind?.toLowerCase() === 'image');
const mediaSummary = {
  schema: 'DUDUQ_OFFICIAL_MEDIA_RECONCILIATION_V1',
  candidateManifestSha256: actualCandidateSha,
  source: 'Frozen compiled V3 curriculum contracts (30 questions.json files) and compiled media-registry.json',
  v2InventoryWorkbook: {
    expectedFilename: 'DUDUQ_English_Inventario_Imagens_e_Prompts_IA.xlsx',
    status: 'NOT_FOUND_IN_WORKSPACE_OR_DOWNLOADS_INDEX',
    comparisonStatus: 'BLOCKED_NO_SUBSTITUTION_MADE',
    note: 'A separate V2 curricular master workbook is present, but it is not the named image/prompt inventory and was not substituted for it.',
  },
  coverage: { modules: modules.length, activities: modules.reduce((sum, module) => sum + module.count, 0), modulesDetail: modules },
  imageRequirements: {
    referenceOccurrences: [...mediaUses.values()].reduce((sum, uses) => sum + uses.length, 0),
    distinctReferencedMediaIds: mediaManifest.length,
    distinctPhysicalAssetsByVerifiedSha256: physicalBySha.size,
    distinctV3VisualRequirementBases: v3VisualBases.size,
    imageRegistryEntries: imageRegistryEntries.length,
    duplicateMediaIdsInRegistry: [...registryById.entries()].filter(([, entries]) => entries.length > 1).map(([mediaId, entries]) => ({ mediaId, count: entries.length })),
    duplicatePhysicalAssets,
  },
  classifications: Object.fromEntries([...new Set(mediaManifest.map(item => item.status))].sort().map(status => [status, mediaManifest.filter(item => item.status === status).length])),
  items: mediaManifest,
  limitations: [
    'The named V2 image/prompt inventory workbook was unavailable, so V2 prompt/status reconciliation is not asserted.',
    'No prompt was generated or inferred; only prompt/visual requirement text present in the V3 contract is included.',
    'Registry status does not itself certify visual-semantic correctness; existing semantic-review flags remain visible.',
  ],
};
await fs.writeFile(path.join(OUTPUT, 'DUDUQ_OFFICIAL_MEDIA_RECONCILIATION.json'), JSON.stringify(mediaSummary, null, 2) + '\n', 'utf8');

const visualManifest = {
  schema: 'DUDUQ_VISUAL_HOMOLOGATION_PANEL_V1',
  candidateSha256: actualCandidateSha,
  humanVisualApproval: 'PENDING',
  evidenceDirectory: 'artifacts/qa-final-closeout/visual-panel/evidence',
  sourceReports: Object.entries(reportHashes).map(([name, hash]) => ({ name, sha256: hash })),
  sourceIntegrity: { manifestSha256: actualCandidateSha, compiledFiles: integrityEvidence.verificationReport.candidateIntegrity.compiledFiles, manifestEntriesVerified: integrityEvidence.verificationReport.candidateIntegrity.manifestEntriesVerified, pagesRuntime: integrityEvidence.verificationReport.pagesRuntime.status },
  fullscreenVariantSummary: { expected: fullscreen.expectedVariants, passed: fullscreen.variantPass, failed: fullscreen.variantFail, screenshotsExpected: 78, screenshotsCopied: screenshots.length, status: fullscreen.status, reportCandidateSha256: fullscreen.candidateSha256 },
  memoryTwoPair: { status: memoryTwoPair.status, passed: memoryTwoPair.summary?.passed ?? memoryTwoPair.cases?.filter(item => item.result === 'PASS').length ?? 0, expected: memoryTwoPair.summary?.expected ?? 2, activities: (memoryTwoPair.cases || []).map(item => item.activityId) },
  q020: { status: q020.q020?.status || q020.q020?.result || 'see report', moduleCompletion: q020.moduleCompletion, activityId: 'Y1M01-Q020' },
  geometryIndicators: geometry,
  evidence: evidenceRecords,
  automatedInterpretation: 'Geometric indicators are a screening aid only. They do not equal human aesthetic approval.',
};
await fs.writeFile(path.join(PANEL, 'visual-review-manifest.json'), JSON.stringify(visualManifest, null, 2) + '\n', 'utf8');

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUDUQ English — Revisão visual final</title>
<style>
:root{color-scheme:dark;--bg:#10151d;--surface:#18212d;--surface2:#202c3a;--line:#344254;--ink:#eef4fa;--muted:#a6b5c4;--accent:#78d9bd;--warn:#ffc66d;--radius:14px;font:14px/1.45 system-ui,Segoe UI,Arial,sans-serif}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 5% 0%,#213442 0,transparent 33rem),var(--bg);color:var(--ink)}header{position:sticky;top:0;z-index:5;background:#10151deF;border-bottom:1px solid var(--line);backdrop-filter:blur(12px);padding:16px clamp(16px,3vw,38px)}h1{font-size:clamp(20px,2.2vw,28px);margin:0 0 4px}.meta{color:var(--muted);display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12px}.status{color:var(--warn);font-weight:700}main{max-width:1600px;margin:auto;padding:20px clamp(14px,3vw,40px) 80px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}.toolbar input,.toolbar select{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:9px;padding:10px 12px;font:inherit}.toolbar input{min-width:min(340px,100%);flex:1}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:16px 0 22px}.stat{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.stat b{display:block;font-size:20px}.stat span{color:var(--muted);font-size:12px}.group{margin:26px 0}.group h2{font-size:18px;margin:0 0 12px}.sub{color:var(--muted);font-size:12px;margin:-6px 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:12px}.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}.thumb{display:block;width:100%;aspect-ratio:16/9;background:#0b1118;object-fit:contain;cursor:zoom-in}.details{padding:10px 12px}.details strong{display:block;font-size:13px}.details small{display:block;color:var(--muted);margin-top:3px}.pill{display:inline-block;border:1px solid #456052;color:var(--accent);border-radius:999px;padding:2px 8px;font-size:11px;margin:7px 4px 0 0}.note{background:#352d1e;color:#ffe0a6;padding:12px 14px;border:1px solid #604d2e;border-radius:10px;margin:10px 0}.geometry{font-family:ui-monospace,Consolas,monospace;color:#cbd7e4;font-size:11px;white-space:pre-wrap;max-height:200px;overflow:auto}.empty{border:1px dashed var(--line);padding:20px;color:var(--muted);border-radius:10px}.modal{position:fixed;inset:0;background:#05080dee;display:none;place-items:center;z-index:20;padding:24px}.modal.open{display:grid}.modal img{max-width:95vw;max-height:88vh;object-fit:contain;box-shadow:0 16px 80px #000}.close{position:absolute;right:18px;top:14px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);padding:9px 14px;cursor:pointer}.footer{border-top:1px solid var(--line);margin-top:30px;padding-top:16px;color:var(--muted);font-size:12px}
</style></head><body><header><h1>DUDUQ English · painel de homologação visual</h1><div class="meta"><span>Artefato: <code>${actualCandidateSha}</code></span><span>78/78 capturas principais verificadas por hash</span><span class="status">HUMAN_VISUAL_APPROVAL: PENDING</span></div></header><main><div class="note">As capturas são evidências de QA e não Gold Masters. Indicadores geométricos automatizados ajudam a localizar possíveis problemas, mas não emitem aprovação estética humana.</div><div id="summary" class="summary"></div><div class="toolbar"><input id="search" type="search" placeholder="Buscar variante, questão ou estado"><select id="mechanic"><option value="">Todas as mecânicas</option></select><select id="viewport"><option value="">Todos os contêineres</option><option>1024×559</option><option>1366×768</option><option>1920×1080</option><option>variável / legado</option></select><select id="state"><option value="">Todos os estados</option></select></div><div id="content"></div><div class="footer">Fonte técnica: candidata congelada e relatórios QA vinculados ao mesmo SHA. A prancha inclui estados prontos, feedbacks e retorno de fullscreen quando disponíveis. Casos sem captura correspondente não são sintetizados.</div></main><div id="modal" class="modal" role="dialog" aria-modal="true" aria-label="Zoom da captura"><button class="close" id="close">Fechar ×</button><img id="zoom" alt="Captura ampliada"></div><script>
const data=${JSON.stringify(visualManifest)};const q=(s)=>document.querySelector(s);const ev=data.evidence;const groups=[...new Set(ev.map(x=>x.group))];const mechanic=q('#mechanic');groups.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;mechanic.append(o)});const states=[...new Set(ev.map(x=>x.state))].sort();states.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x; q('#state').append(o)});q('#summary').innerHTML=[['Variantes fullscreen',data.fullscreenVariantSummary.passed+'/'+data.fullscreenVariantSummary.expected],['Capturas principais',data.fullscreenVariantSummary.screenshotsCopied],['Memory Quest especiais',data.memoryTwoPair.passed+'/'+data.memoryTwoPair.expected],['Q020',data.q020.status],['Encerramento','Incluído'],['Aprovação visual humana','PENDENTE']].map(([a,b])=>'<div class="stat"><b>'+b+'</b><span>'+a+'</span></div>').join('');function render(){const term=q('#search').value.toLowerCase(),g=mechanic.value,v=q('#viewport').value,s=q('#state').value;const filtered=ev.filter(x=>(!g||x.group===g)&&(!v||x.viewport.includes(v))&&(!s||x.state===s)&&(!term||[x.group,x.activityId,x.state,x.file].join(' ').toLowerCase().includes(term)));const buckets=new Map();for(const e of filtered){const key=e.group+' · '+e.activityId;const arr=buckets.get(key)||[];arr.push(e);buckets.set(key,arr)}q('#content').innerHTML=[...buckets.entries()].map(([name,items])=>'<section class="group"><h2>'+name+'</h2><p class="sub">'+items.length+' captura(s) · '+items.map(x=>x.viewport).filter((x,i,a)=>a.indexOf(x)===i).join(' / ')+'</p><div class="grid">'+items.map(e=>'<article class="card"><img class="thumb" loading="lazy" src="'+e.file+'" alt="'+e.activityId+' — '+e.state+' — '+e.viewport+'" data-zoom="'+e.file+'"><div class="details"><strong>'+e.state.replaceAll('-',' ')+'</strong><small>'+e.viewport+'</small><small>SHA-256 da captura: '+e.sha256.slice(0,16)+'…</small><span class="pill">'+e.activityId+'</span><span class="pill">'+e.group+'</span></div></article>').join('')+'</div></section>').join('')||'<div class="empty">Nenhuma captura corresponde aos filtros.</div>';document.querySelectorAll('[data-zoom]').forEach(img=>img.onclick=()=>{q('#zoom').src=img.dataset.zoom;q('#modal').classList.add('open')})}['input','change'].forEach(ev=>{q('#search').addEventListener(ev,render);mechanic.addEventListener(ev,render);q('#viewport').addEventListener(ev,render);q('#state').addEventListener(ev,render)});function close(){q('#modal').classList.remove('open');q('#zoom').src=''}q('#close').onclick=close;q('#modal').onclick=e=>{if(e.target.id==='modal')close()};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});render();
</script></body></html>`;
await fs.writeFile(path.join(PANEL, 'index.html'), html, 'utf8');

const summary = {
  schema: 'DUDUQ_FINAL_QA_CLOSEOUT_SUMMARY_V1',
  candidateSha256: actualCandidateSha,
  candidateIntegrity: { status: integrityEvidence.verificationReport.candidateIntegrity.status, compiledFiles: integrityEvidence.verificationReport.candidateIntegrity.compiledFiles, manifestEntriesVerified: integrityEvidence.verificationReport.candidateIntegrity.manifestEntriesVerified },
  visualPanel: { path: path.join(PANEL, 'index.html'), screenshotCount: evidenceRecords.length, fullscreenVariantScreenshots: screenshots.length, humanVisualApproval: 'PENDING', reportSha256: reportHashes['DUDUQ_FULLSCREEN_13_FINAL.json'] },
  mediaManifest: { path: path.join(OUTPUT, 'DUDUQ_OFFICIAL_MEDIA_RECONCILIATION.json'), activities: mediaSummary.coverage.activities, modules: mediaSummary.coverage.modules, distinctReferencedMediaIds: mediaSummary.imageRequirements.distinctReferencedMediaIds, distinctPhysicalAssetsByVerifiedSha256: mediaSummary.imageRequirements.distinctPhysicalAssetsByVerifiedSha256, v3VisualRequirementBases: mediaSummary.imageRequirements.distinctV3VisualRequirementBases, classifications: mediaSummary.classifications, duplicatePhysicalHashGroups: mediaSummary.imageRequirements.duplicatePhysicalAssets.length, v2InventoryComparison: mediaSummary.v2InventoryWorkbook.status },
  geometricScreening: { variants: geometry.length, variantsWithFlags: geometry.filter(item => item.geometryFlags.length).length, flags: geometry.reduce((sum, item) => sum + item.geometryFlags.length, 0), countsByType: geometry.flatMap(item => item.geometryFlags).reduce((counts, flag) => { counts[flag.type] = (counts[flag.type] || 0) + 1; return counts; }, {}), note: 'Flags are locator indicators, not automatic visual failures.' },
  deployment: 'NOT_PERFORMED',
};
await fs.writeFile(path.join(OUTPUT, 'DUDUQ_FINAL_QA_CLOSEOUT_SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));

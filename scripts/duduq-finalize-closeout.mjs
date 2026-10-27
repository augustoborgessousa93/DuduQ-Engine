import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CANDIDATE = path.join(ROOT, 'rc');
const OUTPUT = path.join(ROOT, 'artifacts', 'qa-final-closeout');
const PANEL = path.join(OUTPUT, 'visual-panel');
const EXPECTED = '5EE292C8CD45C07689D9EB89AC8E80D8ACD2535A05AC75E5D588864FA30DA313';
const sha = b => createHash('sha256').update(b).digest('hex').toUpperCase();
const readJson = async p => JSON.parse(await fs.readFile(p, 'utf8'));

async function listFiles(root, base = root) {
  const out = [];
  for (const item of await fs.readdir(root, { withFileTypes: true })) {
    const full = path.join(root, item.name);
    if (item.isDirectory()) out.push(...await listFiles(full, base));
    else if (item.isFile()) out.push({ full, rel: path.relative(base, full).replaceAll(path.sep, '/') });
  }
  return out;
}

// Validate the persistent copy against the embedded Pages manifest.
const manifestPath = path.join(CANDIDATE, 'dist-pages', '.duduq-pages-manifest');
const manifestBytes = await fs.readFile(manifestPath);
const manifestSha = sha(manifestBytes);
if (manifestSha !== EXPECTED) throw new Error(`Candidate SHA mismatch: ${manifestSha}`);
const lines = manifestBytes.toString('utf8').trimEnd().split(/\r?\n/);
const parsed = lines.map((line, index) => {
  const m = /^(.*) ([a-f0-9]{64})$/i.exec(line);
  if (!m) throw new Error(`Bad manifest entry ${index + 1}`);
  return { rel: m[1].replaceAll('/', path.sep), hash: m[2].toUpperCase() };
});
const actualDistFiles = await listFiles(path.join(CANDIDATE, 'dist-pages'));
if (actualDistFiles.length !== 2671 || parsed.length !== 2670) throw new Error(`Unexpected compiled tree: files=${actualDistFiles.length}, entries=${parsed.length}`);
const expectedByPath = new Map(parsed.map(x => [path.resolve(CANDIDATE, 'dist-pages', x.rel), x.hash]));
const bad = [];
for (const f of actualDistFiles) {
  if (path.resolve(f.full) === path.resolve(manifestPath)) continue;
  const expected = expectedByPath.get(path.resolve(f.full));
  const actual = sha(await fs.readFile(f.full));
  if (!expected || expected !== actual) bad.push({ file: f.rel, expected, actual });
}
if (bad.length) throw new Error(`Persistent snapshot does not match candidate manifest: ${JSON.stringify(bad.slice(0, 5))}`);

const reportNames = [
  'DUDUQ_AUTONOMOUS_FINAL_CERTIFICATION.json',
  'DUDUQ_FULLSCREEN_13_FINAL.json',
  'DUDUQ_MEMORY_QUEST_TWO_PAIR_FIT_E2E.json',
  'DUDUQ_FINAL_SEQUENTIAL_FULLSCREEN_AND_Q020.json',
];
const reports = {};
const reportHashes = {};
for (const name of reportNames) {
  const file = path.join(CANDIDATE, 'docs', 'qa', name);
  const bytes = await fs.readFile(file);
  reports[name] = JSON.parse(bytes.toString('utf8'));
  reportHashes[name] = sha(bytes);
}
if (reports[reportNames[0]].finalCandidateManifestSha256 !== EXPECTED || reports[reportNames[1]].candidateSha256 !== EXPECTED || reports[reportNames[2]].candidateSha256 !== EXPECTED || reports[reportNames[3]].candidateSha256 !== EXPECTED) throw new Error('One or more certification reports do not bind to the frozen candidate hash');

const functionPath = path.join(CANDIDATE, 'functions', 'play', 'english', '_middleware.js');
const functionSha = sha(await fs.readFile(functionPath));
const snapshotFiles = await listFiles(CANDIDATE);
const snapshotHash = createHash('sha256');
for (const f of snapshotFiles.sort((a, b) => a.rel.localeCompare(b.rel))) {
  snapshotHash.update(f.rel).update('\0').update(sha(await fs.readFile(f.full))).update('\n');
}
const snapshotTreeSha = snapshotHash.digest('hex').toUpperCase();
const snapshotManifest = {
  schema: 'DUDUQ_PERSISTENT_RELEASE_SNAPSHOT_V1',
  candidateManifestSha256: EXPECTED,
  persistentPath: 'rc',
  snapshotTreeSha256: snapshotTreeSha,
  snapshotFileCount: snapshotFiles.length,
  compiledDist: { fileCount: actualDistFiles.length, verifiedManifestEntries: parsed.length, manifestBytes: manifestBytes.length, sha256: manifestSha },
  pagesFunction: { path: 'functions/play/english/_middleware.js', sha256: functionSha },
  sourceCertificationReports: reportNames.map(name => ({ path: `docs/qa/${name}`, sha256: reportHashes[name], candidateSha256: EXPECTED })),
  copiedAtUtc: new Date().toISOString(),
  immutability: 'The original TEMP candidate was not edited. This workspace copy is hash-identifiable; verification is repeatable with qa/verify-artifact.mjs.',
  deployment: 'NOT_PERFORMED',
};
await fs.writeFile(path.join(OUTPUT, 'DUDUQ_CANDIDATE_SNAPSHOT_MANIFEST.json'), JSON.stringify(snapshotManifest, null, 2) + '\n');

const visual = await readJson(path.join(PANEL, 'visual-review-manifest.json'));
if (visual.candidateSha256 !== EXPECTED || visual.evidence.length !== 132) throw new Error('Visual panel candidate binding or screenshot count mismatch');
const panelResponse = await fetch('http://127.0.0.1:8891/');
const panelHtml = await panelResponse.text();
if (!panelResponse.ok || !panelHtml.includes(EXPECTED) || !panelHtml.includes('const data=')) throw new Error(`Panel HTTP/content verification failed: ${panelResponse.status}`);
const evidenceFailures = [];
for (const item of visual.evidence) {
  const response = await fetch(`http://127.0.0.1:8891/${item.file}`);
  if (!response.ok) { evidenceFailures.push({ file: item.file, status: response.status }); continue; }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha(bytes) !== item.sha256) evidenceFailures.push({ file: item.file, hashMismatch: true });
}
if (evidenceFailures.length) throw new Error(`Panel evidence HTTP/hash verification failed: ${JSON.stringify(evidenceFailures.slice(0, 3))}`);

// Classify existing geometric signals without treating scrollHeight alone as a defect.
function atPath(obj, pathLabel) {
  const segments = pathLabel.match(/[^.\[\]]+|\[\d+\]/g) || [];
  let value = obj;
  for (const segment of segments) {
    const index = /^\[(\d+)\]$/.exec(segment);
    value = index ? value?.[Number(index[1])] : value?.[segment];
  }
  return value;
}
const fullReport = reports['DUDUQ_FULLSCREEN_13_FINAL.json'];
const alertRows = [];
const categoryCounts = {};
function pushAlert(variant, flag) {
  const nodePath = flag.path.replace(/\.(?:scroll|textClipped)$/, '');
  const node = atPath(variant, nodePath);
  let classification;
  let rationale;
  if (flag.type === 'textClippedFlag') {
    const cls = node?.className || '';
    const text = (node?.text || '').trim();
    if (!text || /panel-art|panel-component|bubble-pop-arena/i.test(cls)) {
      classification = 'AUTOMATION_FALSE_POSITIVE_NON_TEXT_OR_ACCESSIBLE_REGION';
      rationale = 'textRect sem glifo mensurável em arte decorativa/região nomeada; a métrica do retângulo vazio não prova corte.';
    } else if (/dnd-option-image-card--semantic/.test(cls)) {
      classification = 'NON_VISIBLE_CARD_ACCESSIBLE_NAME_HUMAN_CHECK';
      rationale = 'o texto medido é o aria-label do cartão semântico; a captura 1024×559 mostra cartões de imagem, não esse label como texto visível. É necessário revisar a composição, mas isto não comprova texto visual truncado.';
    } else {
      classification = 'POTENTIAL_VISIBLE_TEXT_CLIP_REVIEW';
      rationale = 'indicador de texto com conteúdo mensurável; a captura associada deve ser conferida antes de concluir.';
    }
  } else {
    const overflow = node?.overflow || [];
    const dx = (flag.scroll?.[0] ?? 0) - (flag.client?.[0] ?? 0);
    const dy = (flag.scroll?.[1] ?? 0) - (flag.client?.[1] ?? 0);
    const cls = node?.className || '';
    if (overflow.includes('visible')) {
      classification = 'NON_CLIPPING_SCROLL_EXTENT_SIGNAL';
      rationale = `overflow computado permite pintura fora da caixa; excedente ${dx}×${dy}px não significa scrollbar ou corte por si só.`;
    } else if (/dnd-option-image-card--semantic/.test(cls)) {
      classification = 'INTENTIONAL_IMAGE_CARD_MASK_ACCESSIBLE_LABEL';
      rationale = `overflow hidden pertence ao cartão de imagem semântico; texto medido corresponde ao nome acessível, não a um rótulo visual. Captura mostra arte contida; manter revisão estética humana pendente.`;
    } else if (!overflow.length) {
      classification = 'ROOT_OR_DOCUMENT_SCROLL_REVIEW';
      rationale = 'métrica do documento/root pode representar área pintada ou conteúdo além da viewport; screenshot fullscreen não mostra, isoladamente, scroll operacional.';
    } else {
      classification = 'SCROLL_OR_CLIP_REQUIRES_HUMAN_REVIEW';
      rationale = `overflow=${overflow.join('/')}; excedente ${dx}×${dy}px. Sinal conservado para revisão contextual, sem afirmar defeito.`;
    }
  }
  categoryCounts[classification] = (categoryCounts[classification] || 0) + 1;
  alertRows.push({ mechanicId: variant.mechanicId, variant: variant.variant, activityId: variant.activityId, status: variant.status, flagType: flag.type, path: flag.path, client: flag.client || node?.client || null, scroll: flag.scroll || node?.scroll || null, overflow: node?.overflow || null, className: node?.className || null, measuredText: (node?.text || '').slice(0, 100), classification, rationale });
}
for (const variantSummary of visual.geometryIndicators) {
  const v = fullReport.variants.find(x => x.mechanicId === variantSummary.mechanicId && x.variant === variantSummary.variant && x.activityId === variantSummary.activityId);
  if (!v) throw new Error(`Missing source variant for alert report: ${variantSummary.mechanicId}/${variantSummary.variant}`);
  for (const flag of variantSummary.geometryFlags) pushAlert(v, flag);
}
const alertReport = {
  schema: 'DUDUQ_GEOMETRY_ALERT_TRIAGE_V1',
  candidateSha256: EXPECTED,
  sourceReport: 'docs/qa/DUDUQ_FULLSCREEN_13_FINAL.json',
  sourceReportSha256: reportHashes['DUDUQ_FULLSCREEN_13_FINAL.json'],
  counts: { total: alertRows.length, byType: alertRows.reduce((a, x) => (a[x.flagType] = (a[x.flagType] || 0) + 1, a), {}), byClassification: categoryCounts },
  interpretation: 'Flags are measurements, not defect verdicts. PASS and noCriticalClip remain the reported E2E outcomes. Human visual approval remains pending.',
  alerts: alertRows,
};
await fs.writeFile(path.join(OUTPUT, 'DUDUQ_GEOMETRY_ALERT_CLASSIFICATION.json'), JSON.stringify(alertReport, null, 2) + '\n');
await fs.writeFile(path.join(PANEL, 'geometry-alert-classification.json'), JSON.stringify(alertReport, null, 2) + '\n');

// Audit the 30 official URLs read-only and bind each route to its V3 contract.
const base = 'https://duduq-engine-13a.pages.dev';
const routes = [];
for (let year = 1; year <= 5; year++) for (let module = 1; module <= 6; module++) {
  const id = `Y${year}M${String(module).padStart(2, '0')}`;
  const route = `/play/english/year-${year}/module-${String(module).padStart(2, '0')}/`;
  const contractPath = path.join(CANDIDATE, 'dist-pages', 'content', 'english', `year-${year}`, `module-${String(module).padStart(2, '0')}`, 'questions.json');
  const contract = await readJson(contractPath);
  routes.push({ moduleId: id, year, module, route, officialUrl: `${base}${route}`, candidateContract: `dist-pages/content/english/year-${year}/module-${String(module).padStart(2, '0')}/questions.json`, candidateContractExists: true, candidateActivityCount: (contract.items || []).length, official: { status: 'PENDING' } });
}
let cursor = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < routes.length) {
    const item = routes[cursor++];
    try {
      const response = await fetch(item.officialUrl, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
      const body = Buffer.from(await response.arrayBuffer());
      item.official = {
        status: response.status,
        finalUrl: response.url,
        contentType: response.headers.get('content-type'),
        cacheControl: response.headers.get('cache-control'),
        cfCacheStatus: response.headers.get('cf-cache-status'),
        age: response.headers.get('age'),
        fitHeader: response.headers.get('x-duduq-fit'),
        htmlBytes: body.length,
        responseSha256: sha(body),
        result: response.ok && response.headers.get('content-type')?.includes('text/html') ? 'HTTP_OK_ROUTE' : 'HTTP_OR_CONTENT_ISSUE',
      };
    } catch (error) {
      item.official = { status: null, result: 'NETWORK_FAILURE', error: `${error.name}: ${error.message}` };
    }
  }
}));
const cert = reports['DUDUQ_AUTONOMOUS_FINAL_CERTIFICATION.json'];
const linksReport = {
  schema: 'DUDUQ_OFFICIAL_LINKS_AND_PREVIEW_STATUS_V1',
  candidateSha256: EXPECTED,
  generatedAt: new Date().toISOString(),
  productionProject: 'duduq-engine',
  productionOrigin: base,
  urls: routes,
  summary: {
    total: routes.length,
    officialHttp200: routes.filter(x => x.official.status === 200).length,
    candidateContractsPresent: routes.filter(x => x.candidateContractExists && x.candidateActivityCount > 0).length,
    candidateActivityTotal: routes.reduce((a, x) => a + x.candidateActivityCount, 0),
    embeddedEduQPlayLinks: 'NOT_IN_WORKSPACE_SOURCE: platform registration/embed mapping was not available for read-only inspection',
    currentCandidatePagesRuntime: cert.pagesRuntime,
    currentLocalPagesPreview: 'NOT_RUNNING: Wrangler Pages dev attempted against persistent snapshot; Windows child process spawn returned EPERM. No substitute preview runtime was used.',
    previousExactHashPagesRuntimeEvidence: { status: cert.pagesRuntime.status, origin: cert.pagesRuntime.origin, fitHeader: cert.pagesRuntime.fitHeader, candidateSha256: EXPECTED, sourceReport: 'DUDUQ_AUTONOMOUS_FINAL_CERTIFICATION.json' },
    deployment: 'NOT_PERFORMED',
  },
  cacheNotes: 'Live response cache headers recorded per URL. Before any eventual promotion, use a distinct release/build identifier and verify CSS bytes after promotion; do not rely on stale browser cache.',
  rollbackPlan: [
    'Before a separately authorized deployment, record the currently active Cloudflare Pages deployment ID and preserve its immutable deployment URL.',
    'Promote only the approved frozen candidate in the existing project; keep all 30 route paths unchanged.',
    'Smoke all 30 official routes and representative mechanics, verify candidate CSS hashes and embed/fullscreen behavior.',
    'If a critical regression appears, restore the recorded prior deployment through the supported Pages rollback/promotion control and recheck the 30 routes.',
  ],
};
await fs.writeFile(path.join(OUTPUT, 'DUDUQ_OFFICIAL_30_LINKS_PREVIEW_MANIFEST.json'), JSON.stringify(linksReport, null, 2) + '\n');

const summary = {
  schema: 'DUDUQ_FINAL_HOMOLOGATION_CLOSEOUT_V1',
  candidateSha256: EXPECTED,
  candidateIntegrity: { status: 'PASS', persistentSnapshotPath: 'rc', snapshotTreeSha256: snapshotTreeSha, distFiles: actualDistFiles.length, distManifestEntriesVerified: parsed.length, pagesFunctionSha256: functionSha },
  evidence: { panelUrl: 'http://127.0.0.1:8891/', panelHttpStatus: panelResponse.status, screenshotCount: visual.evidence.length, screenshotHttpAndShaVerified: visual.evidence.length - evidenceFailures.length, humanVisualApproval: 'PENDING' },
  geometryAlerts: alertReport.counts,
  existingSameHashTechnicalCertification: { fullscreenVariants: `${reports[reportNames[1]].variantPass}/${reports[reportNames[1]].expectedVariants}`, memoryTwoPair: `${reports[reportNames[2]].summary.passed}/${reports[reportNames[2]].summary.total}`, q020: reports[reportNames[3]].q020.status, moduleCompletion: reports[reportNames[3]].moduleCompletion, boots: cert.preservedPreviousEvidence.activityBoots.count, moduleRoutes: cert.preservedPreviousEvidence.moduleRoutes.count, pagesRuntime: cert.pagesRuntime.status },
  officialLinks: { http200: linksReport.summary.officialHttp200, total: routes.length, candidateContracts: linksReport.summary.candidateContractsPresent, candidateActivities: linksReport.summary.candidateActivityTotal, embedMapping: linksReport.summary.embeddedEduQPlayLinks },
  localCandidateRuntime: linksReport.summary.currentLocalPagesPreview,
  imageProductionOrReconciliation: 'SUSPENDED_BY_OWNER; no image generation, replacement, or reconciliation performed in this closeout.',
  production: 'NOT_UPDATED',
  readyForDeploy: false,
  pending: ['Human visual approval', 'Owner authorization before production publication', 'Direct EduQ Play embed-registration mapping not present in workspace', 'Local Wrangler preview unavailable in this Windows process context (spawn EPERM); same-hash prior Pages runtime evidence retained'],
  deliverables: [
    'artifacts/qa-final-closeout/visual-panel/index.html',
    'artifacts/qa-final-closeout/HUMAN_VISUAL_APPROVAL_CHECKLIST.md',
    'artifacts/qa-final-closeout/DUDUQ_GEOMETRY_ALERT_CLASSIFICATION.json',
    'artifacts/qa-final-closeout/DUDUQ_OFFICIAL_30_LINKS_PREVIEW_MANIFEST.json',
    'artifacts/qa-final-closeout/DUDUQ_CANDIDATE_SNAPSHOT_MANIFEST.json',
  ],
  deployment: 'NOT_PERFORMED',
};
await fs.writeFile(path.join(OUTPUT, 'DUDUQ_FINAL_QA_CLOSEOUT_SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));

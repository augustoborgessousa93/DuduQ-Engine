import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const lockPath = 'content/mechanics/canonical-mechanics-lock-v1.json';
const provenancePath = 'docs/qa/DUDUQ_CANONICAL_HASH_PROVENANCE_V11_3B.json';
const successorPath = 'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FREEZE.json';
const outputPath = 'docs/qa/DUDUQ_CANONICAL_REHOMOLOGATION_AUDIT_2026-10-20.json';

const [lock, provenance, successor] = await Promise.all([
  readJson(lockPath), readJson(provenancePath), readJson(successorPath),
]);
const validationResult = { status: 'AUDITED_CANONICAL_FINDINGS', errors: [] };
const lockExt = new Set(['.js', '.mjs', '.html', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp3', '.wav', '.woff', '.woff2']);
const hashCache = new Map();
async function currentHash(file) {
  if (!hashCache.has(file)) {
    const bytes = await readFile(path.join(root, file));
    hashCache.set(file, createHash('sha256').update(bytes).digest('hex'));
  }
  return hashCache.get(file);
}
async function collectFiles(relative) {
  const absolute = path.join(root, relative);
  const info = await stat(absolute).catch(() => null);
  if (!info) return [];
  if (info.isFile()) return lockExt.has(path.extname(relative).toLowerCase()) ? [relative.replaceAll('\\', '/')] : [];
  if (!info.isDirectory()) return [];
  const files = [];
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    files.push(...await collectFiles(path.posix.join(relative.replaceAll('\\', '/'), entry.name)));
  }
  return files;
}

const protectedMechanics = ['intro', 'target-shooter', 'bubble-pop', 'drag-drop-multimedia', 'drag-drop', 'matching', 'smart-sentence-complete', 'smart-sentence-order', 'memory-quest'];
for (const mechanic of protectedMechanics) {
  const item = lock.mechanics?.[mechanic];
  if (!item) continue;
  const expected = new Set();
  for (const source of item.canonicalCandidateSource || []) for (const file of await collectFiles(source)) expected.add(file);
  const locked = new Set((item.sourceFiles || []).map(row => row.path));
  if (expected.size !== locked.size || [...expected].some(file => !locked.has(file))) {
    validationResult.errors.push(`CANONICAL_SOURCE_MISMATCH:${mechanic}:source-file-set`);
    validationResult.sourceSetDetails ||= {};
    validationResult.sourceSetDetails[mechanic] = {
      expectedSourceFiles: [...expected].sort(),
      lockedSourceFiles: [...locked].sort(),
      missingFromLock: [...expected].filter(file => !locked.has(file)).sort(),
      staleInLock: [...locked].filter(file => !expected.has(file)).sort(),
    };
  }
  for (const row of item.sourceFiles || []) {
    if (await currentHash(row.path) !== row.sha256) validationResult.errors.push(`CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:${mechanic}:${row.path}`);
  }
  for (const row of item.integrationDependencies || []) {
    if (await currentHash(row.path) !== row.sha256) validationResult.errors.push(`CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:${mechanic}:integration:${row.path}`);
  }
}
for (const row of lock.sharedDependencies || []) {
  if (await currentHash(row.path) !== row.sha256) validationResult.errors.push(`CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED:shared:${row.path}`);
}

const priorRows = new Map();
for (const row of provenance.rows || []) {
  const key = `${row.mechanic}\0${row.path}`;
  priorRows.set(key, row);
}
const freezeEntries = new Map((successor.hashInventory?.entries || []).map(entry => [entry.path, entry]));

const findings = [];
for (const error of validationResult.errors || []) {
  const parts = error.split(':');
  const kind = parts[0];
  const mechanic = parts[1];
  if (kind === 'CANONICAL_CHANGED_REHOMOLOGATION_REQUIRED') {
    const integration = parts[2] === 'integration';
    const shared = mechanic === 'shared';
    const file = parts.slice(integration ? 3 : 2).join(':');
    const locked = shared
      ? (lock.sharedDependencies || []).find(row => row.path === file)
      : integration
        ? lock.mechanics?.[mechanic]?.integrationDependencies?.find(row => row.path === file)
        : lock.mechanics?.[mechanic]?.sourceFiles?.find(row => row.path === file);
    const actual = await currentHash(file);
    const prior = priorRows.get(`${mechanic}\0${file}`)
      || priorRows.get(`shared\0${file}`)
      || priorRows.get(`${mechanic}\0${file.replace(/^integration:/, '')}`);
    const freezeEntry = freezeEntries.get(file);
    const r1Exact = ['smart-sentence-complete', 'smart-sentence-order'].includes(mechanic)
      && successor.status === 'FROZEN'
      && successor.humanApproval === true
      && successor.runtimeValidation?.browserBootstrap === 'PASS'
      && successor.runtimeValidation?.exactAudio === 'PASS'
      && freezeEntry?.sha256 === actual;
    findings.push({
      findingId: `${mechanic}:${file}`,
      validatorError: error,
      file,
      mechanic,
      oldHash: locked?.sha256 || null,
      currentHash: actual,
      priorLedgerHash: prior?.currentSha256 || null,
      priorLedgerClassification: prior?.classification || 'NOT_IN_PRIOR_LEDGER',
      priorLedgerStillDescribesCurrentBytes: prior?.currentSha256 === actual,
      diffSummaryFromPriorLedger: prior?.diffSummary || null,
      changedRegionsFromPriorLedger: prior?.exactChangedRegions || null,
      behaviorImpactFromPriorLedger: prior?.behaviorImpact || null,
      visualImpactFromPriorLedger: prior?.visualImpact || null,
      runtimeImpactFromPriorLedger: prior?.runtimeImpact || null,
      likelyOriginFromPriorLedger: prior?.likelyOrigin || null,
      approvalEvidenceFromPriorLedger: prior?.approvalEvidence || null,
      successorFreezeHash: freezeEntry?.sha256 || null,
      successorFreezeExactMatch: Boolean(r1Exact),
      classification: r1Exact ? 'EVIDENCE_SUPPORTED_NOT_RECONCILED' : 'CANONICAL_UNEXPLAINED_CHANGE',
      note: r1Exact
        ? 'Current bytes match the approved Smart Sentence R1 freeze and its validated scope; lock reconciliation remains gated by unrelated blockers.'
        : prior?.currentSha256 === actual
          ? 'Prior evidence class was not sufficient for acceptance; the exact current diff/origin is unapproved or mixed.'
          : 'Prior ledger does not describe the current bytes; a fresh exact diff and traceable approval are absent.'
    });
  } else {
    findings.push({
      findingId: error,
      validatorError: error,
      mechanic,
      file: null,
      oldHash: null,
      currentHash: null,
      priorLedgerClassification: 'NOT_APPLICABLE',
      classification: 'CANONICAL_UNEXPLAINED_CHANGE',
      sourceSetDetails: validationResult.sourceSetDetails?.[mechanic] || null,
      note: 'Structural source-set mismatch; no file hashes can be reconciled until the expected/locked file set is explained.'
    });
  }
}

const counts = Object.fromEntries(['EVIDENCE_SUPPORTED_NOT_RECONCILED', 'CANONICAL_UNEXPLAINED_CHANGE']
  .map(status => [status, findings.filter(row => row.classification === status).length]));
const uniqueFiles = [...new Set(findings.map(row => row.file).filter(Boolean))];
const report = {
  feature: 'DUDUQ_CANONICAL_CONTROLLED_REHOMOLOGATION',
  generatedAt: new Date().toISOString(),
  authority: 'Augusto',
  validator: 'scripts/validate-canonical-mechanics.mjs (canonical findings reproduced from current lock and source set)',
  validatorStatus: validationResult.status,
  validatorErrorOccurrences: (validationResult.errors || []).length,
  uniqueChangedFiles: uniqueFiles.length,
  noteOnCount: 'Validator error occurrences are not equivalent to unique files: mechanics may reference the same physical file and source-file-set findings are structural.',
  priorLedger: provenancePath,
  priorLedgerAuditedRows: provenance.hashDivergenceEntriesAudited,
  priorLedgerUniquePaths: provenance.uniquePathsAudited,
  priorLedgerClassificationCounts: provenance.classificationCounts,
  successorFreeze: successorPath,
  successorFreezeVersion: successor.version,
  classificationCounts: counts,
  lockUpdated: false,
  baselineUpdated: false,
  build: 'NOT_RUN',
  deployment: 'NOT_RUN',
  vcs: { commit: 'NONE', push: 'NONE', tag: 'NONE' },
  findings,
};
await writeFile(path.join(root, outputPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: 'AUDIT_COMPLETE', outputPath, validatorStatus: report.validatorStatus,
  errorOccurrences: report.validatorErrorOccurrences, uniqueChangedFiles: report.uniqueChangedFiles,
  classificationCounts: counts, lockUpdated: false,
}, null, 2));

async function readJson(file) {
  return JSON.parse(await readFile(path.join(root, file), 'utf8'));
}

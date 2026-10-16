import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const save = async (file, data) => writeFile(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`);
const canRead = async file => { try { await access(path.join(root, file)); return true; } catch { return false; } };
const contractsPath = 'content/english/production/v11-1b/deterministic-activity-contracts.json';
const mediaReqPath = 'content/english/production/v11-1b/media-requirements.json';
const contractsDoc = await read(contractsPath);
const reqDoc = await read(mediaReqPath);
const registry = await read('content/english/media/media-registry.json');
const bindingMapPath = 'content/english/production/v11-2/media-concept-binding-map.json';
const bindingMap = await read(bindingMapPath);
const auditPath = 'content/english/production/v11-2/media-dedup-and-reuse-audit.json';
const audit = await read(auditPath);
const entries = registry.entries.filter(entry => entry.status === 'APPROVED' && (entry.technicalStatus === undefined || entry.technicalStatus === 'PASS'));
const normalized = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
const generated = [];
const failures = [];

for (const contract of contractsDoc.contracts.filter(row => row.mechanicId === 'smart-sentence-complete')) {
  if (contract.requiredMedia.some(row => row.role === 'SUPPORTING_IMAGE')) continue;
  const answer = normalized(contract.correctAnswer);
  const candidates = entries.filter(row => normalized(row.semantic ?? row.semanticTarget ?? row.concept) === answer)
    .sort((a, b) => Number(String(b.mediaId).includes('V11-2B')) - Number(String(a.mediaId).includes('V11-2B')));
  const candidate = candidates.find(row => {
    const file = row.urlOrPath ?? row.assets?.[0]?.path;
    return file && canRead(file);
  });
  if (!candidate) { failures.push(`${contract.itemId}:${contract.correctAnswer}`); continue; }
  const assetPath = candidate.urlOrPath ?? candidate.assets?.[0]?.path;
  const conceptId = `IMG-${contract.itemId}-SUPPORT`;
  const requirement = {
    mediaConceptId: conceptId,
    semanticDescription: `Supporting visual for the sentence-completion target “${contract.correctAnswer}”; no written answer label; reused exact semantic asset.`,
    semanticTarget: contract.correctAnswer,
    role: 'SUPPORTING_IMAGE',
    answerLeakRisk: 'INTENDED_SEMANTIC_SUPPORT',
    assetStatus: 'RESOLVED',
    reuseCandidates: [candidate.mediaId],
    assetDisposition: 'REUSE_APPROVED',
    mediaId: candidate.mediaId,
    assetPath,
    technicalStatus: 'PASS',
    refinementStatus: candidate.refinementStatus ?? candidate.backlogStatus ?? 'HUMAN_REVIEW_PENDING'
  };
  contract.requiredMedia = contract.requiredMedia.filter(row => row.mediaConceptId !== 'NO_MEDIA');
  contract.requiredMedia.push(requirement);
  bindingMap.bindings[conceptId] = { mediaId: candidate.mediaId, assetPath, disposition: 'REUSE_RUNTIME_SUPPORT', semanticKey: candidate.semanticKey ?? null };
  candidate.usedByItems = [...new Set([...(candidate.usedByItems ?? []), contract.itemId])];
  generated.push({ itemId: contract.itemId, answer: contract.correctAnswer, mediaConceptId: conceptId, mediaId: candidate.mediaId, path: assetPath });
}
if (failures.length) throw new Error(`SMART_SENTENCE_SUPPORT_MEDIA_UNRESOLVED:${failures.join('|')}`);

reqDoc.requirements.push(...generated.map(row => ({
  mediaConceptId: row.mediaConceptId,
  semanticDescription: `Supporting visual for the sentence-completion target “${row.answer}”; no written answer label; reused exact semantic asset.`,
  semanticTarget: row.answer,
  role: 'SUPPORTING_IMAGE',
  answerLeakRisk: 'INTENDED_SEMANTIC_SUPPORT',
  assetStatus: 'RESOLVED',
  reuseCandidates: [row.mediaId],
  assetDisposition: 'REUSE_APPROVED',
  mediaId: row.mediaId,
  assetPath: row.path,
  technicalStatus: 'PASS',
  refinementStatus: 'HUMAN_REVIEW_PENDING'
})));
bindingMap.bindingCount = Object.keys(bindingMap.bindings).length;
bindingMap.updatedAt = new Date().toISOString();
registry.updatedAt = new Date().toISOString();
audit.runtimeCompatibilityRequirements = generated.map(row => ({
  itemId: row.itemId, mediaConceptId: row.mediaConceptId, mediaId: row.mediaId, disposition: 'REUSE_APPROVED', reason: 'Canonical Smart Sentence Complete runtime requires a supporting image whose semantic target matches the expected answer.'
}));
contractsDoc.assetFactoryCorrections = [...(contractsDoc.assetFactoryCorrections ?? []), {
  type: 'RUNTIME_COMPATIBILITY_MEDIA_BINDING',
  reason: 'The frozen Smart Sentence Complete production bootstrap requires one exact-semantic supporting image for non-letter content. Existing approved assets were reused; no mechanic or curricular objective changed.',
  count: generated.length,
  items: generated
}];
await save(contractsPath, contractsDoc);
await save(mediaReqPath, reqDoc);
await save(bindingMapPath, bindingMap);
await save('content/english/media/media-registry.json', registry);
await save(auditPath, audit);
console.log(JSON.stringify({ status: 'PASS', supportingImagesBound: generated.length, newPhysicalImages: 0,
  candidatesReused: generated.length, answerLeakDisposition: 'INTENDED_SEMANTIC_SUPPORT', unresolved: 0 }, null, 2));

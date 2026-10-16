import { createHash } from 'node:crypto';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const base = 'content/english/production/v11-2';
const input = 'content/english/production/v11-1b';
const read = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));
const save = async (p, data) => {
  const abs = path.join(root, p);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
const norm = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16).toUpperCase();
const exists = p => access(path.join(root, p)).then(() => true, () => false);

const [contractsDoc, mediaDoc, audioDoc, mediaRegistry, audioRegistry] = await Promise.all([
  read(`${input}/deterministic-activity-contracts.json`), read(`${input}/media-requirements.json`),
  read(`${input}/audio-requirements.json`), read('content/english/media/media-registry.json'),
  read('content/english/audio/audio-registry.json')
]);
const reqItemIds = new Map();
for (const c of contractsDoc.contracts) {
  for (const a of c.requiredMedia ?? []) (reqItemIds.get(a.mediaConceptId) ?? reqItemIds.set(a.mediaConceptId, new Set()).get(a.mediaConceptId)).add(c.itemId);
}
const audioItemIds = new Map();
for (const c of contractsDoc.contracts) {
  const req = c.requiredAudio ?? {};
  for (const a of [...(req.instruction ?? []), ...(req.learnerTargets ?? []), ...(req.feedback ?? [])])
    (audioItemIds.get(a.audioConceptId) ?? audioItemIds.set(a.audioConceptId, new Set()).get(a.audioConceptId)).add(c.itemId);
}

// Visual role/context are retained in the key: same target is not sufficient
// to reuse a scene, while equivalent illustration roles can share a concept.
const mediaKeyFor = r => JSON.stringify([
  norm(r.semanticTarget), norm(r.role), norm(r.semanticDescription), norm(r.context ?? r.requiredContext),
  norm(r.textRule ?? r.text), norm(r.orientation), norm(r.discriminationRequirement), norm(r.mechanicRequirement),
  norm(r.answerLeakRisk)
]);
const audioKeyFor = r => JSON.stringify([
  norm(r.language), norm(r.spokenTarget), norm(r.role), norm(r.semanticType), norm(r.voice), norm(r.deliveryProfile), norm(r.pronunciationMode)
]);
const mediaGroups = new Map();
for (const req of mediaDoc.requirements) {
  const key = mediaKeyFor(req);
  const group = mediaGroups.get(key) ?? { canonicalKey: `M-${hash(key)}`, semanticKey: JSON.parse(key), requirements: [], usedByItems: new Set() };
  group.requirements.push(req);
  for (const id of reqItemIds.get(req.mediaConceptId) ?? []) group.usedByItems.add(id);
  mediaGroups.set(key, group);
}
const mediaById = new Map(mediaRegistry.entries.map(e => [e.mediaId, e]));
const mediaAudit = [];
for (const group of mediaGroups.values()) {
  const members = group.requirements;
  const candidates = [...new Set(members.flatMap(r => r.reuseCandidates ?? []))];
  const evaluated = [];
  for (const id of candidates) {
    const entry = mediaById.get(id);
    const ref = entry?.urlOrPath ?? entry?.assets?.[0]?.path;
    const filePass = Boolean(entry && ref && await exists(ref));
    const sameTarget = members.some(r => norm(r.semanticTarget) === norm(entry?.semanticTarget ?? entry?.concept ?? entry?.altText ?? entry?.semantic));
    const needsSceneContext = members.some(r => /SCENE|CONTEXT|MAP|PREPOSITION|ACTION|DIALOGUE/i.test(`${r.role} ${r.semanticDescription}`));
    evaluated.push({ mediaId: id, registryPresent: Boolean(entry), status: entry?.status ?? null, path: ref ?? null, filePass, targetMetadataMatch: sameTarget,
      semantic: entry?.semantic ?? entry?.semanticTarget ?? entry?.concept ?? null,
      decision: !entry || !filePass ? 'REJECT' : !sameTarget ? 'NOT_COMPATIBLE' : needsSceneContext ? 'REVIEW_CONTEXT_AND_ANSWER_LEAK' : 'REUSE_SEMANTIC_PROVISIONAL' });
  }
  mediaAudit.push({ canonicalKey: group.canonicalKey, semanticKey: group.semanticKey, requirementIds: members.map(x => x.mediaConceptId),
    usedByItems: [...group.usedByItems].sort(), candidates: evaluated,
    disposition: evaluated.some(x => x.decision === 'REUSE_SEMANTIC_PROVISIONAL') ? 'REUSE_PROVISIONAL_IMAGE_REFINEMENT_PENDING' :
      evaluated.some(x => x.decision === 'REVIEW_CONTEXT_AND_ANSWER_LEAK') ? 'CANDIDATE_REQUIRES_SCENE_REVIEW' : 'NEW_ASSET_REQUIRED' });
}

const audioGroups = new Map();
for (const req of audioDoc.requirements) {
  const key = audioKeyFor(req);
  const group = audioGroups.get(key) ?? { canonicalKey: `A-${hash(key)}`, semanticKey: JSON.parse(key), requirements: [], usedByItems: new Set() };
  group.requirements.push(req);
  for (const id of audioItemIds.get(req.audioConceptId) ?? []) group.usedByItems.add(id);
  audioGroups.set(key, group);
}
const audioById = new Map(audioRegistry.entries.map(e => [e.audioId, e]));
const audioAudit = [];
for (const group of audioGroups.values()) {
  const members = group.requirements;
  const candidates = [...new Set(members.flatMap(r => r.reuseCandidates ?? []))];
  const evaluated = [];
  for (const id of candidates) {
    const entry = audioById.get(id);
    const ref = entry?.urlOrPath ?? entry?.audioPath;
    const filePass = Boolean(entry && ref && await exists(ref));
    const exactText = members.some(r => norm(r.spokenTarget) === norm(entry?.transcript ?? entry?.speechText));
    const lang = members.some(r => norm(r.language) === norm(entry?.locale ?? entry?.language) || (norm(r.language) === 'en-us' && norm(entry?.language) === 'en'));
    const roleClass = v => /INSTRUCTION/i.test(v ?? '') ? 'INSTRUCTION' : /FEEDBACK|PRAISE/i.test(v ?? '') ? 'FEEDBACK' : 'LEARNER_CONTENT';
    const exactRole = members.some(r => roleClass(r.role) === roleClass(entry?.semanticRole ?? entry?.type));
    const exactVoice = members.some(r => /DUDUQ_GOLD_VOICE_v1/i.test(r.voice ?? '') && /DUDUQ_GOLD_VOICE_v1/i.test(entry?.voiceVersion ?? entry?.voiceProfile ?? ''));
    const technicalQc = entry?.qcStatus === 'PASS' && entry?.qc?.pass === true && Boolean(entry?.contentHash ?? entry?.sha256);
    evaluated.push({ audioId: id, registryPresent: Boolean(entry), status: entry?.status ?? null, path: ref ?? null, filePass, exactText, languageMatch: lang, exactRole, exactVoice, technicalQc,
      decision: !entry || !filePass ? 'REJECT' : exactText && lang && exactRole && exactVoice && technicalQc ? 'REUSE_EXACT_QC_PASS' : exactText && lang && exactRole && exactVoice ? 'EXACT_CANDIDATE_QC_PENDING' : 'NOT_COMPATIBLE' });
  }
  audioAudit.push({ canonicalKey: group.canonicalKey, semanticKey: group.semanticKey, requirementIds: members.map(x => x.audioConceptId),
    usedByItems: [...group.usedByItems].sort(), candidates: evaluated,
    disposition: evaluated.some(x => x.decision === 'REUSE_EXACT_QC_PASS') ? 'REUSE_EXACT_AUDIO' :
      evaluated.some(x => x.decision === 'EXACT_CANDIDATE_QC_PENDING') ? 'EXACT_CANDIDATE_QC_PENDING' : 'NEW_AUDIO_REQUIRED' });
}

const mediaManifest = { schemaVersion: 'duduq-v11-2-media-dedup-audit-v1', input: `${input}/media-requirements.json`,
  sourceRequirementCount: mediaDoc.requirements.length, canonicalConceptCount: mediaGroups.size,
  duplicateRequirementCount: mediaDoc.requirements.length - mediaGroups.size, groups: mediaAudit };
const audioManifest = { schemaVersion: 'duduq-v11-2-audio-dedup-audit-v1', input: `${input}/audio-requirements.json`,
  sourceRequirementCount: audioDoc.requirements.length, canonicalConceptCount: audioGroups.size,
  duplicateRequirementCount: audioDoc.requirements.length - audioGroups.size, groups: audioAudit };
const report = { feature: 'DUDUQ_ASSET_FACTORY_AND_PRODUCTION_MATERIALIZATION_V11_2', status: 'ASSET_AUDIT_READY_GENERATION_AND_BINDING_PENDING',
  contracts: contractsDoc.contracts.length, media: { requirements: mediaDoc.requirements.length, canonical: mediaGroups.size,
    existingCandidates: new Set(mediaAudit.flatMap(g => g.candidates.map(c => c.mediaId))).size,
    reusableAfterTechnicalAudit: mediaAudit.filter(g => g.disposition === 'REUSE_PROVISIONAL_IMAGE_REFINEMENT_PENDING').length,
    candidatesNeedingVisualReview: mediaAudit.filter(g => g.disposition === 'CANDIDATE_REQUIRES_SCENE_REVIEW').length,
    newRequiredPending: mediaAudit.filter(g => g.disposition === 'NEW_ASSET_REQUIRED').length },
  audio: { requirements: audioDoc.requirements.length, canonical: audioGroups.size,
    exactCandidates: audioAudit.reduce((n, g) => n + g.candidates.filter(c => c.decision === 'REUSE_EXACT_QC_PASS').length, 0),
    newRequiredPending: audioAudit.filter(g => g.disposition === 'NEW_AUDIO_REQUIRED').length },
  materializedModules: 0, sourceReadyActivities: 0, blockers: ['Physical audio assets for unresolved concepts have not yet been generated/QC-bound.',
    'Existing image candidates require semantic and visual-context audit; file/name match alone is insufficient.',
    'No runtime module routes were activated because mandatory assets are not fully bound.'] };
await save(`${base}/media-dedup-and-reuse-audit.json`, mediaManifest);
await save(`${base}/audio-dedup-and-reuse-audit.json`, audioManifest);
await save(`${base}/asset-factory-status.json`, report);
console.log(JSON.stringify({ ...report, outputs: [`${base}/media-dedup-and-reuse-audit.json`, `${base}/audio-dedup-and-reuse-audit.json`, `${base}/asset-factory-status.json`] }, null, 2));

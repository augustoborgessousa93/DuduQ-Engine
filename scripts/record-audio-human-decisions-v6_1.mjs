import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const hashFile = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const humanFile = path.resolve(root, '../DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4_DECISIONS.json');
const registry = await readJson(path.join(root, 'content/english/audio/audio-registry.json'));
const recovery = await readJson(path.join(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3.json'));
const replacements = await readJson(path.join(root, 'docs/qa/DUDUQ_FOUR_AUDIO_REGENERATION_V6_1.json'));
const human = await readJson(humanFile);
if (human.schema !== 'DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4' || human.humanAuthority !== 'Augusto' || human.items.length !== 29)
  throw new Error('HUMAN_DECISION_SOURCE_INVALID');
if (human.items.filter(row => row.decision === 'APPROVED').length !== 25 || human.items.filter(row => row.decision === 'REJECTED').length !== 4)
  throw new Error('HUMAN_DECISION_COUNTS_MISMATCH');
const entries = new Map(registry.entries.map(row => [row.audioId, row]));
const originalAssets = new Map(recovery.generatedAssets.map(row => [row.audioId, row]));
const replacementById = new Map(replacements.candidates.map(row => [row.audioId, row]));
const items = [];
for (const decision of human.items) {
  const entry = entries.get(decision.audioId), original = originalAssets.get(decision.audioId);
  if (!entry || !original) throw new Error(`HUMAN_DECISION_ID_UNRESOLVED:${decision.audioId}`);
  if (decision.decision === 'APPROVED') {
    if (entry.urlOrPath !== original.path || await hashFile(path.resolve(root, entry.urlOrPath)) !== decision.audioSha256 || entry.contentHash !== decision.audioSha256)
      throw new Error(`APPROVED_HASH_NOT_CURRENT:${decision.audioId}`);
    items.push({ audioId: decision.audioId, transcript: entry.speechText || entry.transcript, currentSha256: decision.audioSha256,
      decision: 'APPROVED', reviewer: decision.reviewer, reviewedAt: decision.reviewedAt, notes: String(decision.notes || ''),
      source: 'V4_HUMAN_REVIEW_HASH_VERIFIED', preservedWithoutRegeneration: true });
  } else {
    const replacement = replacementById.get(decision.audioId);
    if (!replacement || replacement.rejectedSha256 !== decision.audioSha256 || replacement.transcript !== (entry.speechText || entry.transcript))
      throw new Error(`REPLACEMENT_CANDIDATE_NOT_CORRELATED:${decision.audioId}`);
    if (await hashFile(path.resolve(root, replacement.replacementRelativePath)) !== replacement.replacementSha256)
      throw new Error(`REPLACEMENT_CANDIDATE_HASH_MISMATCH:${decision.audioId}`);
    items.push({ audioId: decision.audioId, transcript: replacement.transcript, currentSha256: replacement.replacementSha256,
      decision: 'PENDING_HUMAN_APPROVAL', reviewer: null, reviewedAt: null, notes: '',
      source: 'V6_1_REPLACEMENT_CANDIDATE', technicalQc: 'PASS', humanReviewRequired: true,
      previousDecision: { decision: 'REJECTED', reviewer: decision.reviewer, reviewedAt: decision.reviewedAt,
        sha256: decision.audioSha256, notes: String(decision.notes || '') },
      audioPath: replacement.replacementRelativePath });
  }
}
const output = { feature: 'DUDUQ_AUDIO_HUMAN_DECISIONS_V6_1', generatedAt: new Date().toISOString(),
  authority: 'Augusto', importedDecisionSource: humanFile, items,
  accounting: { uniqueIds: new Set(items.map(row => row.audioId)).size, priorApprovedPreserved: items.filter(row => row.decision === 'APPROVED').length,
    replacementsPending: items.filter(row => row.decision === 'PENDING_HUMAN_APPROVAL').length,
    humanApprovalInferred: false, rejectedHistoryPreserved: true } };
const outputPath = path.join(root, 'docs/qa/DUDUQ_AUDIO_HUMAN_DECISIONS_V6_1.json');
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ path: outputPath, ...output.accounting }, null, 2));

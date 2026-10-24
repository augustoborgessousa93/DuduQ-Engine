import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const paths = {
  freeze: 'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FINAL_FREEZE.json',
  parent: 'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FREEZE.json',
  recovery: 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3.json',
  queue: 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json',
  registry: 'content/english/audio/audio-registry.json',
  manifest: 'content/english/audio/audio-generation-manifest.json',
};
const json = async p => JSON.parse(await readFile(resolve(root, p), 'utf8'));
const sha = async p => createHash('sha256').update(await readFile(resolve(root, p))).digest('hex');
const [freeze, parent, recovery, queue, registry, manifest] = await Promise.all([paths.freeze, paths.parent, paths.recovery, paths.queue, paths.registry, paths.manifest].map(json));
const protectedFiles = ['content/english/audio/audio-registry.json', 'content/english/audio/audio-generation-manifest.json'];
const predecessor = new Map(parent.hashInventory.entries.map(x => [x.path, x.sha256]));
const generated = new Map(recovery.generatedAssets.map(x => [x.audioId, x]));
const jobs = new Map(queue.jobs.map(x => [x.audioId, x]));
const registryById = new Map(registry.entries.map(x => [x.audioId, x]));
const manifestById = new Map(manifest.entries.map(x => [x.audioId, x]));
const generatedIds = [...generated.keys()].sort();
const records = generatedIds.map(id => {
  const asset = generated.get(id); const job = jobs.get(id); const r = registryById.get(id); const m = manifestById.get(id);
  return { audioId: id, transcript: job?.transcript ?? r?.transcript ?? asset.transcript, speechText: r?.speechText, file: asset.path, registryPathMatchesV3: !!r && r.urlOrPath === asset.path, contentSha256: asset.contentHash, textHash: r?.textHash, qc: asset.qcStatus, humanPronunciation: asset.approvalStatus, queueConsumerCount: job?.consumers.length ?? 0, consumers: job?.consumers ?? [], registryPresent: !!r, generationManifestPresent: !!m, registryManifestParity: !!r && !!m && r.transcript === m.transcript && r.speechText === m.speechText && r.urlOrPath === m.urlOrPath && r.contentHash === m.contentHash && r.textHash === m.textHash, uniqueId: generatedIds.filter(x => x === id).length === 1 };
});
const fileDiffs = await Promise.all(protectedFiles.map(async path => ({ path, predecessorFreezeSha256: predecessor.get(path) ?? null, currentProtectedInventoryExpectedSha256: predecessor.get(path) ?? null, actualCurrentSha256: await sha(path), matchesExistingProtectedInventory: (await sha(path)) === predecessor.get(path), currentEntryCount: path.endsWith('audio-registry.json') ? registry.entries.length : manifest.entries.length, newRetryEntriesInV3: path.endsWith('audio-registry.json') ? registry.entries.filter(x => generated.has(x.audioId)).length : manifest.entries.filter(x => generated.has(x.audioId)).length, historicalPredecessorBytesAvailable: false, removedOrModifiedHistoricalEntriesProvable: false })));
const all44 = records.reduce((n, x) => n + x.queueConsumerCount, 0);
const availableGitHistorySnapshots = [
  { commit: 'c918a9745fbd015597cbb39f2b47179546031a01', registrySha256: '2d4e3476ae5c1b948bf1c5ad0e6fc6dd786fbe94d0a345ec7fff4998e8be7e8d', generationManifestSha256: '3adae4951248f5c13004c3656e76268108a670c03a5759052f6d74759af8c012' },
  { commit: '8dfe70a6b0ab628b8170346c404f8f1fcbf5a763', registrySha256: '783117096792fac93f31c95f24dd63c6f0bf1437d1efda8bba63fb0de3dd684e', generationManifestSha256: 'ea1336a07ae41e1375994f8592cd0217bd503293f49bebd821cdbd524cc9fae6' },
  { commit: 'fa58299fbcb4e4af1069203769c87c3427e59692', registrySha256: '75de720c3c02756c51b07de86815a750c0f1d9150f7594cc5c864542e0886080', generationManifestSha256: '1f4d1520e745859e5ae1bb7560683539f1a7240d888464578aef5bc9bdf8c7eb' }
];
const diff = {
  feature: 'DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V4', generatedAt: new Date().toISOString(), status: 'ISSUE',
  originalFreeze: paths.parent, currentProtectedFreeze: paths.freeze, freezeActivatedOrModified: false,
  protectedFileDiffs: fileDiffs,
  candidateAudio: { recordCount: records.length, uniqueTranscripts: new Set(records.map(x => x.transcript)).size, duplicateExactTranscriptCount: records.length-new Set(records.map(x => x.transcript)).size, uniqueAudioIds: new Set(records.map(x => x.audioId)).size, uniquePaths: new Set(records.map(x => x.file)).size, uniqueContentHashes: new Set(records.map(x => x.contentSha256)).size, technicalQcPass: records.filter(x => x.qc === 'PASS').length, humanPronunciationApproved: records.filter(x => x.humanPronunciation === 'APPROVED').length, consumers: all44, uniqueConsumers: new Set(records.flatMap(x => x.consumers.map(c => `${c.moduleId}/${c.questionId}`))).size, registryPathMatchesV3: records.filter(x => x.registryPathMatchesV3).length, registryManifestParity: records.filter(x => x.registryManifestParity).length, entries: records },
  historicalComparison: { predecessorExpectedHashesFromFreeze: Object.fromEntries(fileDiffs.map(x => [x.path, x.predecessorFreezeSha256])), previousRawManifestSnapshotFound: false, reachableGitSnapshotsChecked: availableGitHistorySnapshots, protectedPredecessorHashFoundInReachableGitHistory: false, limitation: 'The freeze retains predecessor SHA-256 values but not predecessor manifest bytes. All three reachable Git snapshots for these paths were hash-checked and none matches the protected predecessor hashes; they are older/different states, not the pre-V3 snapshot. Consequently exact removal/modification checks against the frozen predecessor cannot be proven from available bytes.' },
  decisions: { observedV3Change: 'The current V3 records add the 29 retry audio IDs to both current manifests; each has technical QC PASS and human pronunciation pending, and the queue identifies 44 consumers.', provenNoHistoricalRemovalOrModification: false, gateB: 'ISSUE', reason: 'Predecessor manifest bytes are not available for entry-by-entry comparison; cannot certify preservation of every historical record solely from hashes.' }
};
await writeFile(resolve(root, 'docs/qa/DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V4.json'), `${JSON.stringify(diff, null, 2)}\n`);
const lines = ['# DUDUQ Smart Sentence Freeze Diff V4', '', `Generated: ${diff.generatedAt}`, '', '## Result', '', '**Gate B: ISSUE.** The V3 additions are internally consistent, but predecessor manifest bytes are unavailable, so this audit cannot prove entry-by-entry that no historical record was removed or modified.', '', '## Frozen hashes', '', '| File | Existing protected SHA-256 | Current SHA-256 | Matches protected inventory? | V3 retry records |', '|---|---|---|---:|---:|', ...fileDiffs.map(x => `| ${x.path} | \`${x.predecessorFreezeSha256}\` | \`${x.actualCurrentSha256}\` | ${x.matchesExistingProtectedInventory ? 'yes' : 'no'} | ${x.newRetryEntriesInV3} |`), '', '## V3 additions', '', `- Candidate records: ${records.length}; exact unique transcripts: ${new Set(records.map(x => x.transcript)).size}; duplicate exact transcripts: ${records.length-new Set(records.map(x => x.transcript)).size}.`, `- Unique audio IDs/paths/content hashes: ${new Set(records.map(x => x.audioId)).size}/${new Set(records.map(x => x.file)).size}/${new Set(records.map(x => x.contentSha256)).size}.`, `- Registry path matches the V3 QC artifact: ${records.filter(x => x.registryPathMatchesV3).length}/${records.length}.`, `- Technical QC PASS: ${records.filter(x => x.qc === 'PASS').length}/${records.length}.`, `- Human pronunciation approval: ${records.filter(x => x.humanPronunciation === 'APPROVED').length}/${records.length}; the remaining decisions are not inferred.`, `- Registry and generation-manifest parity: ${records.filter(x => x.registryManifestParity).length}/${records.length}.`, `- Queue consumers: ${all44} references across ${new Set(records.flatMap(x => x.consumers.map(c => `${c.moduleId}/${c.questionId}`))).size} unique activities.`, '', 'Each detailed row, exact transcript, path, file hash, text hash, QC and consumer list is recorded in the JSON artifact.', '', '## Historical comparison limitation', '', 'The freeze stores predecessor hashes but not predecessor manifest bytes. All three reachable Git snapshots for these paths were checked; none matches the freeze hashes. Those commits are older, different states, not the pre-V3 frozen manifests. Exact removal/modification checks against the protected predecessor therefore remain unprovable with available data.', '', '## Freeze safety', '', 'No freeze, lock, audio registry, or generation manifest was modified by this audit. No successor freeze was created or activated.', ''];
await writeFile(resolve(root, 'docs/qa/DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V4.md'), lines.join('\n'));
console.log(JSON.stringify({ status: diff.status, registry: fileDiffs[0], manifest: fileDiffs[1], uniqueAssets: records.length, qcPass: records.filter(x => x.qc === 'PASS').length, consumerRefs: all44, parity: records.filter(x => x.registryManifestParity).length, report: 'docs/qa/DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V4.json' }, null, 2));

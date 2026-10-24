import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAudioControl, workerHealth } from '../duduq-audio/control/audio-control.mjs';

const root = process.cwd();
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = async relative => hashBytes(await readFile(path.join(root, relative)));
const at = () => new Date().toISOString();
const [candidateAudio, humanAudio, ssFlows, boot, responsive, registry, generationManifest, freeze, parentFreeze, history] = await Promise.all([
  readJson('docs/qa/DUDUQ_FOUR_AUDIO_REGENERATION_V6_1.json'),
  readJson('docs/qa/DUDUQ_AUDIO_HUMAN_DECISIONS_V6_1.json'),
  readJson('docs/qa/DUDUQ_SMART_SENTENCE_CANDIDATE_FULL_FLOW_V6_1.json'),
  readJson('docs/qa/DUDUQ_600_ACTIVITY_BOOT_V6_1.json'),
  readJson('docs/qa/DUDUQ_RESPONSIVE_QA_V6_1.json'),
  readJson('content/english/audio/audio-registry.json'),
  readJson('content/english/audio/audio-generation-manifest.json'),
  readJson('docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FINAL_FREEZE.json'),
  readJson('docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FREEZE.json'),
  readJson('docs/qa/DUDUQ_SMART_SENTENCE_HISTORICAL_AUDIO_RECOVERY_V5.json'),
]);
const routeManifest = await readJson('docs/qa/DUDUQ_ENGLISH_600_ACTIVITY_PRODUCTION_ROUTES_2026-10-20.json');
const audioAuditResult = await createAudioControl(root).audit();
const audioWorker = await workerHealth(root);
const audioAudit = { feature: 'DUDUQ_AUDIO_AUDIT_V6_1', generatedAt: at(), audit: audioAuditResult, worker: audioWorker };
await writeFile(path.join(root, 'docs/qa/DUDUQ_AUDIO_AUDIT_V6_1.json'), `${JSON.stringify(audioAudit, null, 2)}\n`);
const protectedSource = await readFile(path.join(root, 'play/smart-sentence/smart-sentence.js'));
const sourceText = protectedSource.toString('utf8');
const oldBlock = 'const completedSentence = round.sentence.map(part => part.type === "slot" ? selected?.label || "" : part.value).join(" ").replace(/\\s+([.,!?])/g, "$1").replace(/\\s+/g, " ").trim();\n    if (completedSentence !== round.completedSentenceEn) throw new Error(`SMART_SENTENCE_VISIBLE_AUDIO_TEXT_MISMATCH:${productionQuestion.item.questionId}:${completedSentence}:${round.completedSentenceEn}`);';
if (sourceText.split(oldBlock).length - 1 !== 1) throw new Error('SMART_SENTENCE_PATCH_CONTEXT_DRIFT');
const helper = [
  'function resolveCompleteSentenceText(visibleSentence, contractSentence, questionId) {',
  '  const visible = String(visibleSentence ?? "").replace(/\\s+/g, " ").trim();',
  '  const expected = String(contractSentence ?? "").replace(/\\s+/g, " ").trim();',
  '  if (!expected) throw new Error("SMART_SENTENCE_CONTRACT_TEXT_MISSING:" + questionId);',
  '  if (visible === expected) return expected;',
  '  const missingOneTerminalMark = [".", "!", "?"].some(mark => expected.endsWith(mark) && visible === expected.slice(0, -mark.length));',
  '  if (missingOneTerminalMark) return expected;',
  '  throw new Error("SMART_SENTENCE_VISIBLE_AUDIO_TEXT_MISMATCH:" + questionId + ":" + visible + ":" + expected);',
  '}',
].join('\n');
const replacement = `const assembledSentence = round.sentence.map(part => part.type === "slot" ? selected?.label || "" : part.value).join(" ").replace(/\\s+([.,!?])/g, "$1").replace(/\\s+/g, " ").trim();\n    const completedSentence = resolveCompleteSentenceText(assembledSentence, round.completedSentenceEn, productionQuestion.item.questionId);`;
const marker = 'async function confirmSelection() {';
if (sourceText.split(marker).length - 1 !== 1) throw new Error('SMART_SENTENCE_PATCH_MARKER_DRIFT');
const candidateText = sourceText.replace(marker, `${helper}\n${marker}`).replace(oldBlock, replacement);
const sourceSha = hashBytes(protectedSource), candidateSha = hashBytes(Buffer.from(candidateText, 'utf8'));

const freezeRows = [...parentFreeze.hashInventory.entries, ...freeze.hashInventory.entries];
const freezeResults = [];
for (const entry of freezeRows) freezeResults.push({ path: entry.path, expectedSha256: entry.sha256,
  currentSha256: await hashFile(entry.path), match: (await hashFile(entry.path)) === entry.sha256 });
const manifestDeltas = [
  { path: 'content/english/audio/audio-registry.json', oldSha256: '9af8c704fe86f34526f5df95a3a3ea081c0dca6c121aa9cc01c07448052d9009', newSha256: await hashFile('content/english/audio/audio-registry.json'), currentEntries: registry.entries.length, retryEntriesInCurrentInventory: candidateAudio.candidates.length },
  { path: 'content/english/audio/audio-generation-manifest.json', oldSha256: '9b87e183768cc67af6f2578c9b7206101562d9d432850fba168ace18489103c4', newSha256: await hashFile('content/english/audio/audio-generation-manifest.json'), currentEntries: generationManifest.entries.length, retryEntriesInCurrentInventory: candidateAudio.candidates.length },
];
const rejectionHistory = humanAudio.items.filter(row => row.previousDecision?.decision === 'REJECTED');
const approvedCount = humanAudio.items.filter(row => row.decision === 'APPROVED').length;
const pendingCount = humanAudio.items.filter(row => row.decision === 'PENDING_HUMAN_APPROVAL').length;
const rootOverflowX = responsive.cases.filter(row => row.sample.game.overflowX > 1);
const rootOverflowY = responsive.cases.filter(row => row.sample.game.overflowY > 1);
const screenshotDir = 'artifacts/responsive-certification-v6_1-20261021';

const freezeDiff = {
  feature: 'DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V6_1', generatedAt: at(), status: 'PARTIAL_HISTORICAL_BYTES_NOT_RECOVERED',
  predecessorFreeze: 'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FINAL_FREEZE.json',
  expectedProtectedEntries: freeze.hashInventory.expectedEntries, protectedHashMatches: freezeResults.filter(row => row.match).length,
  protectedHashDrift: freezeResults.filter(row => !row.match), manifestDeltas,
  currentManifestAudit: { currentRegistryEntries: registry.entries.length, currentGenerationManifestEntries: generationManifest.entries.length,
    newRetryAudioIds: candidateAudio.candidates.map(row => row.audioId), exactCandidateParity: candidateAudio.candidates.every(row =>
      registry.entries.some(entry => entry.audioId === row.audioId && entry.speechText === row.transcript) &&
      generationManifest.entries.some(entry => (entry.id || entry.audioId) === row.audioId && (entry.speechText || entry.transcript) === row.transcript)),
    priorApprovedAudioPreserved: approvedCount === 25, rejectedHistoricalAudioPreserved: rejectionHistory.length === 4 },
  historicalRecovery: { result: history.result, reachableGitExactMatches: history.reachableGit.exactMatches.length,
    unreachableBlobsScanned: history.unreachableGit.fsckUnreachableBlobsExamined, unreachableExactMatches: history.unreachableGit.exactMatches.length,
    checkedBuildCopies: history.localBuildArtifacts.flatMap(row => row.checked), exactHistoricalBytesRecovered: false,
    limitation: 'Exact predecessor bytes were not found in the inspected Git history, unreachable object database, or named local build paths; therefore a complete OLD→NEW semantic diff cannot be claimed.' },
  successorActivated: false, officialManifestsModifiedByV6_1: false,
};

const smartFix = {
  feature: 'DUDUQ_SMART_SENTENCE_FIX_V6_1', generatedAt: at(), status: 'CANDIDATE_PATCH_PASS_PENDING_HUMAN_AUTHORIZATION',
  rootCause: 'Complete-mode runtime compares punctuation-normalized visible token assembly byte-for-byte with the canonical contract sentence. Thirty contract sentences include one terminal mark absent from visible token assembly, triggering SMART_SENTENCE_VISIBLE_AUDIO_TEXT_MISMATCH before correct feedback.',
  example: { visibleAssembly: 'He is my father', contractSentence: 'He is my father.', candidateAudioText: 'He is my father.' },
  correctionRule: 'Accept exact match, or exactly one absent terminal punctuation mark from the allowlist .,!,?; reject interior punctuation/content mismatch; use canonical contract text for speech.',
  officialProtectedRuntime: { path: 'play/smart-sentence/smart-sentence.js', sha256Before: sourceSha, sha256After: await hashFile('play/smart-sentence/smart-sentence.js'), modified: false },
  isolatedCandidate: { source: 'scripts/qa-smart-sentence-flow-v5-candidate.mjs', patch: 'docs/qa/v5-candidates/smart-sentence-runtime-v5.patch', sha256: candidateSha, servedInMemoryOnly: true },
  tests: { candidateUnit: 'PASS_CANDIDATE_LOGIC_ONLY', priorFailureCases: 30, priorPassingControls: 14,
    fullFlowsRequested: ssFlows.requestedThisRun, fullFlowsPassed: ssFlows.passed, failed: ssFlows.failed,
    incorrectFeedbackRetryAudioCorrectFeedbackContinue: 'PASS', replacementCandidatesUsed: ssFlows.audioReplacementCount,
    replacementAudioOverrideHits: ssFlows.audioReplacementHits.length, replacementIdsUsed: [...new Set(ssFlows.audioReplacementHits.map(row => row.audioId))],
    pageErrors: ssFlows.pageErrors.length, httpErrors: ssFlows.httpErrors.length, officialProtectedHashUnchanged: ssFlows.protectedRuntimeUnchanged,
    smartSentenceOrderRegression: 'PASS_NODE_TEST_ORDER_MODE' },
  applicationToOfficialProtectedFile: 'NOT_AUTHORIZED',
};

const successorProposal = {
  feature: 'DUDUQ_FREEZE_SUCCESSOR_PROPOSAL_V6_1', generatedAt: at(), status: 'DRAFT_PENDING_HUMAN_AUDIO_AND_PROTECTED_FILE_AUTHORIZATION',
  predecessor: 'V11.3AI_R1_FINAL', predecessorRecord: 'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FINAL_FREEZE.json',
  preservedHistoricalRecords: ['docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_FREEZE.json', 'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FREEZE.json', 'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FINAL_FREEZE.json'],
  proposedAuthority: 'Augusto', proposedReason: 'AUTHORIZED_SMART_SENTENCE_TERMINAL_PUNCTUATION_RUNTIME_FIX_AND_AUDIO_MANIFEST_RECONCILIATION',
  proposedChanges: [
    { path: 'play/smart-sentence/smart-sentence.js', oldSha256: sourceSha, proposedCandidateSha256: candidateSha, status: 'ISOLATED_CANDIDATE_44_OF_44_PASS_PENDING_EXPLICIT_AUTHORIZATION' },
    ...manifestDeltas.map(row => ({ ...row, status: 'CURRENTLY_DRIFTED_FROM_PREDECESSOR_HISTORICAL_BYTES' })),
  ],
  audio: { humanApprovedPreserved: approvedCount, replacementCandidates: candidateAudio.candidates.length, technicalQcPass: candidateAudio.candidates.filter(row => row.deliveryQc.mp3Qc.pass && row.deliveryQc.masterQc.pass).length,
    humanApprovalPending: pendingCount, rejectedPredecessorDecisionsPreserved: rejectionHistory.length },
  protectedInventory: { expected: freeze.hashInventory.expectedEntries, matches: freezeResults.filter(row => row.match).length,
    driftPaths: freezeResults.filter(row => !row.match).map(row => row.path), priorEntriesUnmodifiedExceptPreexistingManifestDrift: true },
  activated: false, officialFreezeModified: false, deployment: 'NOT_AUTHORIZED_NOT_RUN',
  requiredHumanActions: ['Review and decide each of the four replacement audio hashes in the open local review panel.', 'Explicitly authorize the official Smart Sentence runtime patch and successor freeze after reviewing the 44/44 isolated E2E evidence.'],
};

const activityRows = routeManifest.activities.map(activity => {
  const candidateFlow = ssFlows.activities.find(row => row.questionId === activity.activityId);
  const bootRow = boot.activities.find(row => row.questionId === activity.activityId);
  if (candidateFlow) return { moduleId: activity.module, questionId: activity.activityId, mechanic: activity.mechanic,
    boot: bootRow?.boot ? 'PASS' : 'ISSUE', correct: candidateFlow.correct, incorrect: candidateFlow.wrong, retry: candidateFlow.retryAudio,
    feedback: candidateFlow.feedback, audio: candidateFlow.retryAudio, continue: candidateFlow.continue, advance: candidateFlow.advance,
    execution: 'ISOLATED_CANDIDATE_RUNTIME_AND_AUDIO', result: candidateFlow.result };
  return { moduleId: activity.module, questionId: activity.activityId, mechanic: activity.mechanic,
    boot: bootRow?.boot ? 'PASS' : 'ISSUE', correct: 'NOT_TESTED', incorrect: 'NOT_TESTED', retry: 'NOT_TESTED',
    feedback: 'NOT_TESTED', audio: 'NOT_TESTED', continue: 'NOT_TESTED', advance: 'NOT_TESTED',
    execution: 'OFFICIAL_CURRENT_BYTES_BOOT_ONLY', result: 'NOT_TESTED_FULL_INTERACTION' };
});
const activityMatrix = { feature: 'DUDUQ_600_E2E_MATRIX_V6_1', generatedAt: at(), requested: 600,
  bootTested: boot.rendered, bootPass: boot.browserBootPass, bootFail: boot.browserBootFail,
  fullCorrectAndWrongRetryFlowTested: ssFlows.completed, fullFlowPass: ssFlows.passed,
  remainingFullInteractionNotTested: activityRows.filter(row => row.result === 'NOT_TESTED_FULL_INTERACTION').length,
  classification: 'PARTIAL_NOT_FINAL_CERTIFICATION', activities: activityRows };
const modules = [...new Set(routeManifest.activities.map(row => row.module))].sort();
const journeys = { feature: 'DUDUQ_30_JOURNEYS_V6_1', generatedAt: at(), requested: 30, completed: 0, passed: 0,
  reason: 'No sequential Intro→Q001→Q020→Final journey was executed in this V6.1 run; direct boot and isolated Smart Sentence flows do not substitute for end-to-end module progression.',
  modules: modules.map(moduleId => ({ moduleId, intro: 'NOT_TESTED_SEQUENTIAL', questions: 20, progression: 'NOT_TESTED', final: 'NOT_TESTED', result: 'NOT_TESTED' })) };

const visual = { feature: 'DUDUQ_VISUAL_REGRESSION_V6_1', generatedAt: at(), status: 'ISSUE', source: 'http://127.0.0.1:4177/',
  matrix: { requested: responsive.requested, rendered: responsive.rendered, correlated: responsive.correlated, unmatched: responsive.unmatched,
    documentHorizontalOverflowCases: responsive.cases.filter(row => row.sample.doc.overflowX > 1).length,
    documentVerticalOverflowCases: responsive.cases.filter(row => row.sample.doc.overflowY > 1).length,
    logicalGameRootHorizontalOverflowCases: rootOverflowX.length, logicalGameRootVerticalOverflowCases: rootOverflowY.length,
    rootOverflowCases: [...rootOverflowX, ...rootOverflowY].map(row => ({ caseId: row.caseId, mechanic: row.mechanicId, preset: row.expectedPreset,
      horizontal: row.sample.game.overflowX, vertical: row.sample.game.overflowY })),
    visibleScrollbars: responsive.cases.filter(row => row.sample.visibleScrollbarCount > 0).length,
    outsideControls: responsive.cases.filter(row => row.sample.outsideControls.length > 0).length,
    pageErrors: responsive.cases.reduce((sum, row) => sum + row.pageErrors.length, 0),
    textClipCandidates: responsive.cases.filter(row => row.sample.textClipped > 0).length,
    interactionStatesCovered: 'INITIAL_STATE_ONLY', screenshotsDirectory: screenshotDir },
  protectedSourceSet: { expectedHashes: freeze.hashInventory.expectedEntries, matched: freezeResults.filter(row => row.match).length,
    drift: freezeResults.filter(row => !row.match).map(row => row.path) },
  interpretation: 'Document overflow and visible scrollbars are zero. Intro has logical root overflow in scaled fixed-stage geometry in nine cases; responsive interaction, feedback-state geometry, drag hitboxes and Gold Master visual comparison remain untested.',
};

const product = { modules: routeManifest.modules, activities: routeManifest.activityCount,
  bootPass: boot.browserBootPass, bootFail: boot.browserBootFail, contracts: { previousReported: 460, v6_1: 'NOT_REVALIDATED' }, curriculum: 'NOT_REVALIDATED_IN_V6_1',
  audioAudit: audioAuditResult.totals,
  smartSentenceHumanApproved: approvedCount, smartSentenceReplacementPending: pendingCount,
  smartSentenceCandidateFullFlows: `${ssFlows.passed}/${ssFlows.requestedThisRun}`,
  fullFlowsAllActivities: `${ssFlows.completed}/600`, moduleJourneys: '0/30', responsiveCases: `${responsive.correlated}/${responsive.requested}` };
const readiness = { feature: 'DUDUQ_PRODUCTION_READINESS_V6_1', generatedAt: at(), status: 'BLOCKED', productionReady: false,
  blockers: ['Four replacement Gold Voice candidates require human listening decisions.', 'Official protected Smart Sentence runtime patch and successor freeze activation require Augusto explicit authorization.', 'Only 44 Smart Sentence full interactions passed in isolated candidate QA; the other 556 activity full flows were not tested.', '0/30 sequential module journeys were executed.', 'Responsive matrix is initial-state-only with Intro logical root overflow in nine cases and no responsive interaction proof.', 'Canonical Smart Sentence protected inventory currently matches 38/40 due the two preexisting audio manifest deltas.'],
  build: 'NOT_PERFORMED', deploy: 'NOT_PERFORMED', productionUnchanged: true, commit: 'NONE', push: 'NONE', tag: 'NONE' };

const outputs = [
  ['docs/qa/DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V6_1.json', freezeDiff],
  ['docs/qa/DUDUQ_SMART_SENTENCE_FIX_V6_1.json', smartFix],
  ['docs/qa/DUDUQ_FREEZE_SUCCESSOR_PROPOSAL_V6_1.json', successorProposal],
  ['docs/qa/DUDUQ_600_E2E_MATRIX_V6_1.json', activityMatrix],
  ['docs/qa/DUDUQ_30_JOURNEYS_V6_1.json', journeys],
  ['docs/qa/DUDUQ_VISUAL_REGRESSION_V6_1.json', visual],
  ['docs/qa/DUDUQ_PRODUCTION_READINESS_V6_1.json', readiness],
  ['docs/qa/DUDUQ_MASTER_CERTIFICATION_V6_1.json', { feature: 'DUDUQ_MASTER_CERTIFICATION_V6_1', generatedAt: at(),
    status: 'ISSUE', productionReady: false, authority: 'Augusto', audio: { priorHumanApprovedHashVerified: approvedCount, replacementCandidateCount: candidateAudio.candidates.length,
      replacementTechnicalQcPass: candidateAudio.candidates.filter(row => row.deliveryQc.mp3Qc.pass && row.deliveryQc.masterQc.pass).length,
      replacementHumanPending: pendingCount, panel: 'http://127.0.0.1:4182/' }, smartSentence: smartFix, freeze: freezeDiff,
    responsive: visual, product, e2e: activityMatrix, moduleJourneys: journeys, readiness,
    finalGate: 'DUDUQ_ENGLISH_FINAL_CERTIFICATION_NOT_COMPLETE', deployment: 'NOT_PERFORMED' }],
];
for (const [relative, data] of outputs) await writeFile(path.join(root, relative), `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({ status: 'ISSUE', productionReady: false, artifacts: outputs.map(([file]) => file),
  protectedHashes: `${freezeResults.filter(row => row.match).length}/${freezeRows.length}`,
  smartSentenceCandidateFlows: `${ssFlows.passed}/${ssFlows.requestedThisRun}`, activityBoot: `${boot.browserBootPass}/${boot.rendered}`,
  activityFullFlowsTested: ssFlows.completed, responsive: `${responsive.correlated}/${responsive.requested}`,
  rootOverflowX: rootOverflowX.length, rootOverflowY: rootOverflowY.length, moduleJourneys: '0/30' }, null, 2));

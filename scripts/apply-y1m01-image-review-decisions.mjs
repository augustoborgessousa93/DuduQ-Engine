import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(process.argv[2] || '');
if (!sourceRoot || !fs.existsSync(sourceRoot)) throw new Error('Pass the read-only Assets-DuduQ/Imagens Ilustrativa clone directory.');

const mapPath = path.join(root, 'content/english/year-1/module-01/image-resolution-map.json');
const decisionsPath = path.join(root, 'content/english/year-1/module-01/y1m01-image-review-decisions.json');
const generationManifestPath = path.join(root, 'content/english/media/image-generation-manifest.json');
const previewRoot = path.join(root, 'qa/y1m01-image-bank/assets');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const decisionsDoc = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
const decisions = new Map(decisionsDoc.decisions.map((d) => [d.requirementId, d.decision]));
const inventoryByName = new Map(map.sourceInventory.map((asset) => [asset.sourceFilename, asset]));
const byId = new Map(map.requirements.map((entry) => [entry.requirementId, entry]));
const approvedIds = [...decisions].filter(([, decision]) => decision === 'APPROVE_REUSE').map(([id]) => id);
if (approvedIds.length !== 14 || map.requirements.length !== 16) throw new Error('Expected 14 explicit approvals and 16 requirements.');

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function previewFor(asset) {
  const safeName = asset.sourceFilename.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const previewName = `${asset.sourceSHA.slice(0, 12)}-${safeName}`;
  const target = path.join(previewRoot, previewName);
  const source = path.join(sourceRoot, asset.sourcePath.replace(/^Imagens Ilustrativa[\\/]/, ''));
  if (!fs.existsSync(source) || sha256(source) !== asset.sourceSHA) throw new Error(`Source SHA mismatch/missing: ${asset.sourcePath}`);
  fs.mkdirSync(previewRoot, { recursive: true });
  if (!fs.existsSync(target)) fs.copyFileSync(source, target);
  return `/qa/y1m01-image-bank/assets/${previewName}`;
}

function candidateFrom(filename, rank, confidence, reason, compositionNotes) {
  const asset = inventoryByName.get(filename);
  if (!asset) throw new Error(`Second-pass candidate not found in inventory: ${filename}`);
  return {
    sourceFilename: asset.sourceFilename,
    sourcePath: asset.sourcePath,
    sourceSHA: asset.sourceSHA,
    sourceRepo: map.source.repository,
    sourceBranch: map.source.branch,
    sourceCommit: map.source.commit,
    extension: asset.extension,
    fileSize: asset.fileSize,
    dimensions: asset.dimensions,
    aliasesSameSHA: map.sourceInventory.filter((x) => x.sourceSHA === asset.sourceSHA && x.sourceFilename !== asset.sourceFilename).map((x) => x.sourcePath),
    qaPreviewPath: previewFor(asset),
    matchType: 'second_pass_candidate',
    candidateRank: rank,
    confidence,
    reason,
    compositionNotes,
    requiresComposition: false,
    humanDecision: 'REVIEW_REQUIRED_SECOND_PASS'
  };
}

// Keep the previous rejected art and its provenance as immutable review history; do not show it as a new candidate.
const media03 = byId.get('Y1M01-MEDIA-03');
const rejected = media03.candidateAssets.find((a) => a.sourceFilename === 'chegada_escola_manha_arriving_at_school_morning.png');
const rejectionAlreadyRecorded = (media03.decisionHistory || []).some((h) => h.decision === 'REJECT_REUSE' && h.candidate?.sourceFilename === 'chegada_escola_manha_arriving_at_school_morning.png');
if (!rejected && !rejectionAlreadyRecorded) throw new Error('Expected first-pass MEDIA-03 candidate missing; refusing to lose rejection history.');
if (rejected && !rejectionAlreadyRecorded) media03.decisionHistory = [
  ...(media03.decisionHistory || []),
  { decision: 'REJECT_REUSE', decisionSource: decisionsDoc.decisionSource, rejectedAtPass: 1, candidate: rejected }
];
media03.resolutionStatus = 'REVIEW_REQUIRED_SECOND_PASS';
media03.humanApproval = 'First-pass candidate rejected by Augusto; second-pass alternatives await human selection.';
media03.futureGenerationPlanning = 'HOLD_FOR_SECOND_PASS_REVIEW; do not generate until alternatives are reviewed.';
media03.candidateAssets = [
  candidateFrom('Relógio marcando 7-30_ ida para a escola.png', 1, 0.88,
    'Visually inspected: a child walks toward a school and waves; a prominent analog clock reads about 7:30. Strong school-arrival and morning cue, but the clock is an explicit time clue and the scene has no low sunrise light. No written answer text.',
    'Best second-pass fit; human should confirm the visible 7:30 clue and bright daylight are acceptable for the activity.'),
  candidateFrom('indo para a escola.png', 2, 0.70,
    'Visually inspected: a school-uniformed child approaches a school building; a clock is visible in the school scene. School arrival is clear, while exact morning light/time is less explicit and the child is not waving.',
    'Alternative school-arrival scene; does not rely on filename alone. Keep as a distinct candidate from the rejected first-pass image.'),
  candidateFrom('boy_crianca_chegando_child_arriving_arrival.png', 3, 0.55,
    'Visually inspected: boy wearing a backpack and waving while walking. Transparent cutout with no school background and no visible time-of-day cue.',
    'Could be combined only with an independently approved, non-rejected school/morning background; by itself it does not meet the full brief.'),
  candidateFrom('girl_crianca_chegando_child_arriving_arrival.png', 4, 0.54,
    'Visually inspected: girl wearing a backpack and waving while walking. Transparent cutout with no school background and no visible time-of-day cue.',
    'Could be combined only with an independently approved, non-rejected school/morning background; by itself it does not meet the full brief.'),
  candidateFrom('acolhida_aluno_novo_welcome_new_student.png', 5, 0.43,
    'Visually inspected: children greet a new student at an open school doorway. The setting and welcome are clear, but morning light/time is not and the focal action is group welcome rather than an unambiguous morning greeting.',
    'Lower-fit alternative for review; no text is visible, but it needs human acceptance of the missing morning cue.')
];

const selectedByRequirement = {
  'Y1M01-MEDIA-04': ['Good Afternoon.png'],
  'Y1M01-MEDIA-05': ['Bye - tchau.png'],
  'Y1M01-MEDIA-06': [],
  'Y1M01-MEDIA-15': ['Leo.png', 'chegada_escola_manha_arriving_at_school_morning.png', 'Good Afternoon.png', 'saida_da_escola_leaving_school_school_exit.png'],
  'Y1M01-MEDIA-16': ['Ana.png', 'saida_da_escola_leaving_school_school_exit.png']
};
for (const id of approvedIds) {
  const entry = byId.get(id);
  if (!entry) throw new Error(`Approved requirement missing: ${id}`);
  entry.resolutionStatus = 'HUMAN_APPROVED_REUSE';
  entry.humanApproval = 'HUMAN_APPROVED_REUSE by Augusto; decision recorded from explicit task instructions.';
  entry.futureGenerationPlanning = 'EXCLUDE_FROM_GENERATION; approved source reuse/composition only.';
  const explicitSelection = selectedByRequirement[id];
  const candidates = entry.candidateAssets || [];
  const isAlternativeSet = ['Y1M01-MEDIA-04', 'Y1M01-MEDIA-05'].includes(id);
  const selectedNames = explicitSelection || (isAlternativeSet ? [candidates[0]?.sourceFilename] : candidates.map((a) => a.sourceFilename));
  entry.selectedSourceAssets = [];
  for (const candidate of candidates) {
    const selected = selectedNames.includes(candidate.sourceFilename);
    candidate.humanAssetStatus = selected ? 'HUMAN_APPROVED_REUSE' : 'ALTERNATIVE_NOT_SELECTED';
    if (selected) entry.selectedSourceAssets.push({
      sourceRepo: candidate.sourceRepo,
      sourceBranch: candidate.sourceBranch,
      sourcePath: candidate.sourcePath,
      sourceSHA: candidate.sourceSHA,
      selectionBasis: explicitSelection
        ? 'Human approved this requirement; asset selected from the displayed multi-part proposal.'
        : 'Human approved the requirement-level proposal; the sole/main candidate is the proposed reused source.'
    });
  }
  entry.humanDecision = { decision: 'APPROVE_REUSE', decisionSource: decisionsDoc.decisionSource };
}

// MEDIA-06 is a runtime composition of the independently reviewed scene assets; its morning component remains dependent on MEDIA-03 second-pass approval.
const media06 = byId.get('Y1M01-MEDIA-06');
media06.decisionHistory = [...(media06.decisionHistory || []), {
  decision: 'NEEDS_DISCUSSION', decisionSource: decisionsDoc.decisionSource,
  resolution: 'Resolved as a runtime composition per Augusto instruction; no baked triptych illustration.'
}];
media06.resolutionStatus = 'COMPOSITE_FROM_APPROVED_ASSETS';
media06.humanApproval = 'Composition approach approved by instruction; morning asset dependency awaits MEDIA-03 second-pass selection.';
media06.futureGenerationPlanning = 'NO_NEW_ILLUSTRATION; compose three independent runtime scenes after MEDIA-03 resolves.';
media06.proposedComposition = {
  mode: 'THREE_INDEPENDENT_RUNTIME_SCENES',
  bakedIllustration: false,
  components: [
    { role: 'MORNING', requirementId: 'Y1M01-MEDIA-03', status: 'WAITING_FOR_SECOND_PASS_APPROVAL', selectedSourceAssets: 'Use the finally approved MEDIA-03 scene.' },
    { role: 'AFTERNOON', requirementId: 'Y1M01-MEDIA-04', status: 'HUMAN_APPROVED_REUSE', sourceAssets: media04Assets() },
    { role: 'FAREWELL', requirementId: 'Y1M01-MEDIA-05', status: 'HUMAN_APPROVED_REUSE', sourceAssets: media05Assets() }
  ],
  dependency: 'MEDIA-03 must resolve before the three-scene composition is release-ready.'
};
media06.candidateAssets = [];
media06.humanDecision = { decision: 'NEEDS_DISCUSSION', resolution: 'COMPOSITE_FROM_APPROVED_ASSETS', decisionSource: decisionsDoc.decisionSource };

function media04Assets() { return byId.get('Y1M01-MEDIA-04').selectedSourceAssets; }
function media05Assets() { return byId.get('Y1M01-MEDIA-05').selectedSourceAssets; }

const rejectedDecision = byId.get('Y1M01-MEDIA-03');
rejectedDecision.humanDecision = { decision: 'REJECT_REUSE', rejectedFirstPass: true, decisionSource: decisionsDoc.decisionSource };
const generationManifest = JSON.parse(fs.readFileSync(generationManifestPath, 'utf8'));
for (const requirement of generationManifest.entries) {
  const entry = byId.get(requirement.requirementId);
  if (entry) requirement.status = entry.resolutionStatus;
}

const count = (status) => map.requirements.filter((entry) => entry.resolutionStatus === status).length;
map.firstPassSummary ??= {
  bankFilesInventoried: map.summary.bankFilesInventoried,
  uniqueVisualFilesBySHA: map.summary.uniqueVisualFilesBySHA,
  aliasFiles: map.summary.aliasFiles,
  exactReuseProposals: map.summary.exactReuse,
  compositeProposals: map.summary.compositeFromExisting,
  reviewRequiredProposals: map.summary.reviewRequired,
  toGenerateProposals: map.summary.toGenerate
};
map.summary = {
  bankFilesInventoried: map.firstPassSummary.bankFilesInventoried,
  uniqueVisualFilesBySHA: map.firstPassSummary.uniqueVisualFilesBySHA,
  aliasFiles: map.firstPassSummary.aliasFiles,
  imageRequirements: map.requirements.length,
  exactReuse: 0,
  compositeFromExisting: 0,
  reviewRequired: count('REVIEW_REQUIRED_SECOND_PASS'),
  humanApprovedReuse: count('HUMAN_APPROVED_REUSE'),
  secondPassReview: count('REVIEW_REQUIRED_SECOND_PASS'),
  compositeFromApprovedAssets: count('COMPOSITE_FROM_APPROVED_ASSETS'),
  toGenerate: count('TO_GENERATE'),
  resolvedRequirements: count('HUMAN_APPROVED_REUSE') + count('COMPOSITE_FROM_APPROVED_ASSETS'),
  estimatedNewImagesNeededNow: count('TO_GENERATE'),
  generatedImages: 0,
  secondPassCandidateCount: media03.candidateAssets.length,
  approvalSource: decisionsDoc.decisionSource
};
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
fs.writeFileSync(generationManifestPath, `${JSON.stringify(generationManifest, null, 2)}\n`);
console.log(JSON.stringify(map.summary, null, 2));

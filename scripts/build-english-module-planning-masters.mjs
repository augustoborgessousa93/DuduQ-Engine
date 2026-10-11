import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (p) => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const curriculum = await readJson('content/english/master/curricular-master-v3.json');
const eligibility = await readJson('content/english/master/mechanic-curricular-eligibility-v1.json');
const questions = await readJson('content/english/year-1/module-01/questions.json');
const activities = questions.questions ?? questions.items ?? [];
const eligibleById = new Map(eligibility.modules.map((m) => [m.moduleId, m]));

const mechanics = [
  'target-shooter', 'bubble-pop', 'drag-drop-multimedia', 'drag-drop-grouping',
  'matching', 'memory-quest', 'smart-sentence-complete', 'smart-sentence-order'
];
const unresolvedCountIds = curriculum.modules.map((m) => m.id).filter((id) => id !== 'Y1M01');
const modules = curriculum.modules.map((m) => {
  const fit = eligibleById.get(m.id)?.memoryQuest ?? {};
  const mqIssue = fit.fit === 'LOW' ? 'ELIGIBILITY_CONFLICT_REQUIRES_AUGUSTO_REVIEW' : null;
  const questionCount = m.id === 'Y1M01' ? activities.length : null;
  const existingQuestions = m.id === 'Y1M01' ? activities.map((q) => ({
    activityId: q.item_id,
    currentMechanicId: q.mechanicId ?? q.mechanic ?? q.mecanica_preferida ?? null,
    learningTarget: q.learningTarget ?? q.objetivo ?? null,
    pedagogicalPhase: q.pedagogicalPhase ?? null,
    topicEn: q.topicEn ?? q.topic ?? null
  })) : [];
  return {
    moduleId: m.id,
    year: m.year,
    moduleNumber: m.moduleNumber,
    title: m.title,
    centralTheme: m.theme,
    primaryObjectives: [m.purpose],
    secondaryObjectives: [m.why],
    activeVocabulary: m.newActiveVocabulary,
    receptiveVocabulary: m.newReceptiveVocabulary,
    reviewVocabulary: m.reviewVocabulary,
    consolidatedVocabulary: m.consolidatedVocabulary,
    grammarStructureTargets: {
      productive: m.newProductiveStructures,
      receptive: m.newReceptiveStructures,
      review: m.reviewedStructures,
      consolidation: m.consolidatedStructures
    },
    skillTargets: m.skills,
    listeningTargets: m.skills?.listening,
    readingWrittenFormTargets: m.skills?.reading,
    pedagogicalProgression: m.sequence,
    expectedMastery: m.expectedMastery,
    evidence: m.evidence,
    priorKnowledge: m.prerequisites,
    spiralReferences: { review: m.retrievedContent, preparesFor: m.preparesFor },
    activityCount: {
      value: questionCount,
      authority: questionCount === null ? null : 'content/english/year-1/module-01/questions.json',
      status: questionCount === null ? 'ACTIVITY_COUNT_REQUIRES_CONFIRMATION' : 'CONFIRMED_EXISTING_PRODUCTION_COUNT'
    },
    currentActivityContracts: existingQuestions,
    activitySequence: questionCount === null ? null : existingQuestions,
    mechanicAssignments: questionCount === null ? null : existingQuestions.map((q) => q.currentMechanicId),
    memoryQuestPlan: {
      strategicRule: 'CORE_RECURRING_MECHANIC; minimum 2 per module',
      requiredCount: 2,
      confirmedCount: 0,
      positions: null,
      status: 'PLACEMENTS_REQUIRE_ACTIVITY_COUNT_AND_ACTIVITY_LEVEL_DESIGN',
      eligibilityFit: fit.fit ?? 'NOT_FOUND',
      candidateMode: fit.preferredMode ?? null,
      candidatePhase: fit.recommendedPhase ?? null,
      rationale: fit.rationale ?? null,
      risksAndPrerequisites: fit.risksAndPrerequisites ?? null,
      reviewFlag: mqIssue,
      distinctTargetSets: null,
      pairCounts: null,
      nonConsecutiveCheck: 'NOT_TESTABLE_UNTIL_POSITIONS_ARE_AUTHORIZED'
    },
    productionReadiness: questionCount === null ? ['ACTIVITY_COUNT_REQUIRES_CONFIRMATION', 'CONTENT_BLUEPRINT_READY_AT_MODULE_PROFILE_LEVEL', 'MEDIA_REQUIREMENTS_READY_AT_SLOT_SPECIFICATION_PENDING'] : ['Y1M01_RECONCILIATION_ONLY', 'EXISTING_CONTENT_AUDIT_REQUIRED', 'MQ_SUBSTITUTION_NOT_AUTHORIZED'],
    risks: [m.loadStatus, ...(mqIssue ? [mqIssue] : [])],
    mediaRequirementsSummary: 'Use semantic asset slots derived from approved curricular targets; no final art generated.',
    audioRequirementsSummary: 'Plan official EN→PT instruction audio centrally; content audio only when the activity stimulus requires it.',
    imageRequirementsSummary: 'Define image slots only for image-dependent activities; final refinement may remain pending.',
    sourceAuthority: 'content/english/master/curricular-master-v3.json',
    status: questionCount === null ? 'PARTIAL_BLUEPRINT_ACTIVITY_COUNT_UNRESOLVED' : 'EXISTING_MODULE_AUDIT_AND_RECONCILIATION_REQUIRED'
  };
});

const master = {
  schemaVersion: 'duduq-english-module-content-and-mechanics-v1',
  status: 'ISSUE_REQUIRES_ACTIVITY_COUNTS_AND_MQ_CONFLICT_RESOLUTION',
  authority: 'Curricular Master V3 plus Activity Content Standard V1 and Instruction Standard V1.2; mechanic eligibility is a fit/risk input, not curriculum authority.',
  humanAuthority: 'AUGUSTO',
  date: '2026-10-10',
  productionMechanics: mechanics,
  blockedMechanics: ['smart-sentence-unscramble'],
  strategicRules: {
    curriculumFirst: ['CURRICULUM', 'LEARNING_TARGET', 'PEDAGOGICAL_PHASE', 'STIMULUS', 'ACTIVITY', 'MECHANIC'],
    memoryQuest: { status: 'PRODUCTION_CANONICAL_LOCKED', collectionMinimum: 2, allowedModes: ['AUDIO_IMAGE', 'TEXT_IMAGE', 'AUDIO_TEXT'], nonConsecutiveByDefault: true, randomizedPresentationIsNotNewContent: true },
    introAndFinal: 'Intro is mandatory before learner activity sequence; Intro and Final are not ordinary MQ activities.',
    audio: 'Activity provides primaryInstructionEn/supportInstructionPt; central DUDUQ audio pipeline supplies official audio; no browser TTS.',
    assets: 'Every image-dependent activity must receive a semantic asset slot with mustInclude, mustNotInclude, answerLeakRisk, aspect/orientation and status before production.',
    imageRefinement: 'IMAGE_REFINEMENT_PENDING is allowed if content and answer mapping remain safe.',
    duplication: ['EXACT_CONTENT_DUPLICATE', 'MECHANIC_SKIN_DUPLICATE', 'PERMUTATION_DUPLICATE', 'NEAR_DUPLICATE_REVIEW'],
    knownBacklog: ['DDM responsive horizontal overflow at 390px/768px is PRE_EXISTING_MECHANIC_ISSUE; not caused by the question HUD.']
  },
  yearProgression: curriculum.gradeProfiles,
  curricularAuthority: 'DUDUQ English Curricular Master V3',
  unresolvedAuthorityGaps: {
    activityCountConfirmationRequired: unresolvedCountIds,
    memoryQuestFitConflict: modules.filter((m) => m.memoryQuestPlan.reviewFlag).map((m) => ({ moduleId: m.moduleId, fit: m.memoryQuestPlan.eligibilityFit, reason: m.memoryQuestPlan.rationale })),
    y1m01Substitution: 'No safe substitutions are assigned: current production already contains differentiated DDM contracts for greetings, social introductions, people/names, social exchanges and names. A one-for-one MQ replacement needs a target-level duplication/coverage review; no production file is changed.',
    y1m02SecondMq: 'AUDIO_IMAGE spoken number↔concrete quantity is source-supported. A second distinct MQ target set/mode is not authorized until activity count and numeral/text familiarity placement are specified.'
  },
  modules
};

const writeJson = async (rel, data) => {
  const dest = path.join(root, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
await writeJson('content/english/master/module-content-and-mechanics-v1.json', master);

for (const m of modules) {
  await writeJson(`content/english/planning/year-${m.year}/module-${String(m.moduleNumber).padStart(2, '0')}.json`, {
    schemaVersion: 'duduq-english-module-blueprint-v1',
    moduleId: m.moduleId,
    authorityMaster: 'content/english/master/module-content-and-mechanics-v1.json',
    ...m,
    activities: m.activitySequence === null ? [] : m.activitySequence.map((q, i) => ({
      moduleId: m.moduleId,
      activityId: q.activityId,
      sequencePosition: i + 1,
      topicEn: q.topicEn,
      pedagogicalPhase: q.pedagogicalPhase,
      learningTarget: q.learningTarget,
      mechanicId: q.currentMechanicId,
      mechanicMode: null,
      instruction: null,
      expectedStudentAction: null,
      expectedResponseType: null,
      answerContract: null,
      audioRequirements: null,
      imageRequirements: null,
      mediaRequirements: null,
      whyThisMechanic: 'Existing Y1M01 production contract; audit only, no activity content mutation.',
      priorKnowledge: null,
      spiralReference: null,
      duplicateRisk: 'Existing Y1M01 DDM differentiated content must be preserved and checked before substitutions.',
      productionStatus: 'EXISTING_CONTRACT_AUDIT_REQUIRED'
    }))
  });
}

const dist = {
  schemaVersion: 'duduq-memory-quest-30-module-distribution-v2',
  authority: 'Indexed view of module-content-and-mechanics-v1.json; not a competing authority.',
  requiredMinimumPerModule: 2,
  collectionMinimum: 60,
  confirmedActivities: 0,
  status: 'ISSUE_ACTIVITY_COUNTS_AND_LOW_FIT_MODULES_REQUIRE_RESOLUTION',
  modules: modules.map((m) => ({ moduleId: m.moduleId, title: m.title, countRequired: 2, countConfirmed: 0, positions: null, proposedModeFromEligibility: m.memoryQuestPlan.candidateMode, fit: m.memoryQuestPlan.eligibilityFit, phase: m.memoryQuestPlan.candidatePhase, rationale: m.memoryQuestPlan.rationale, status: m.memoryQuestPlan.status, risk: m.memoryQuestPlan.reviewFlag }))
};
await writeJson('content/english/master/memory-quest-30-module-distribution-v2.json', dist);

const escape = (s) => String(s ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
let md = `# DUDUQ English — Master Module Content and Mechanics V1\n\n**Status: ISSUE — production sequencing is not yet authorized.** This source-faithful planning snapshot preserves V3 curriculum and records unresolved production inputs; it deliberately does not invent module activity counts or claim 30 complete activity sequences.\n\n## Authority and guardrails\n\n- Curriculum authority: docs/master/DUDUQ_English_Master_Curricular_Pedagogico_V3.md and its machine companion. Activity and instruction contracts follow Activity Content Standard V1 and Instruction Standard V1.2.\n- Nine production mechanics: ${mechanics.join(', ')}. smart-sentence-unscramble remains BLOCKED.\n- Curriculum → learning target → phase → stimulus → activity → mechanic. Mechanics do not create curriculum.\n- Memory Quest is locked; the collection policy requires ≥2 per module (≥60 total), no consecutive use by default, and only AUDIO_IMAGE/TEXT_IMAGE/AUDIO_TEXT. This strategic minimum conflicts with LOW-fit eligibility in Y1M05, Y3M05 and Y5M04; those records are flagged for curricular resolution, not silently forced.\n- Official instruction audio is EN→PT through the central DUDUQ pipeline. No browser TTS. Image refinement may remain pending if mapping is safe. Intro/Final are outside the activity count.\n- DDM 390/768px overflow is recorded as pre-existing mechanic backlog, not a Shared HUD regression.\n\n## Collection-level production blockers\n\nV3 supplies module targets/progression for all 30 modules but no per-module activity count. The existing production source confirms Y1M01 has 20 questions. Counts for Y1M02–Y5M06 require confirmation before Q001…Qnn positions can be assigned. Therefore exact Memory Quest positions, spacing, pair sets and per-activity contracts remain pending.\n\nY1M01 has 20 existing contracts (12 Target Shooter, 3 Bubble Pop, 5 Drag Drop Multimedia). Its five differentiated DDM content concepts—greetings, social introductions, people/names, social exchanges, names—must not be collapsed into reordered duplicates. No safe MQ substitutions are assigned without a target-level coverage and duplicate review; no production file changed.\n\nY1M02 supports one clear candidate: AUDIO_IMAGE, spoken number ↔ concrete quantity, staged in batches of at most five new number names. A second distinct MQ activity/mode requires the count and written-form staging to be confirmed.\n\n## Year progression (V3)\n\n${curriculum.gradeProfiles ? JSON.stringify(curriculum.gradeProfiles, null, 2) : 'See Curricular Master V3.'}\n\n## Module-by-module blueprint status\n\n| Module | Theme | Core objective | MQ fit/mode | Count | Readiness / issue |\n|---|---|---|---|---:|---|\n`;
for (const m of modules) {
  md += `| ${m.moduleId} — ${escape(m.title)} | ${escape(m.centralTheme)} | ${escape(m.primaryObjectives[0])} | ${m.memoryQuestPlan.eligibilityFit}/${m.memoryQuestPlan.candidateMode ?? 'MODE REVIEW'} | ${m.activityCount.value ?? 'CONFIRM'} | ${m.status}${m.memoryQuestPlan.reviewFlag ? `; ${m.memoryQuestPlan.reviewFlag}` : ''} |\n`;
}
md += `\n## Activity-by-activity distribution\n\nA numbered Q001…Qnn distribution is intentionally not fabricated: 29 module counts are absent from current authority. Y1M01’s 20 production contracts are inventoried in its machine blueprint for audit, not overwritten. For every other module, the blueprint retains full V3 targets, status, skill outcomes, phases, prerequisite and spiral references; activity arrays remain empty until Augusto confirms the count. The planning validator therefore reports ISSUE rather than claiming a complete 30-module production line.\n\n## Memory Quest distribution\n\nThe indexed per-module view is content/english/master/memory-quest-30-module-distribution-v2.json. It reports required minimum 2, but zero numbered/confirmed placements. Three low-fit modules require an explicit pedagogical resolution. Do not infer pair count or target set by randomization.\n\n## Production waves (proposed; gated by count and MQ resolutions)\n\n- Wave 0: Y1M01 audit/reconciliation only (20 fixed; no production edits in this planning task).\n- Wave 1: Y1M02–Y1M06.\n- Wave 2: Y2M01–Y2M06.\n- Wave 3: Y3M01–Y3M06.\n- Wave 4: Y4M01–Y4M06.\n- Wave 5: Y5M01–Y5M06.\n\n## Machine blueprints\n\nThirty source-backed module profiles are in content/english/planning/year-1/…year-5/. Each is a blueprint shell, not a complete activity sequence where count/content-level planning authority is absent.\n`;
const mdPath = path.join(root, 'docs/master/DUDUQ_ENGLISH_MASTER_MODULE_CONTENT_AND_MECHANICS_V1.md');
await fs.mkdir(path.dirname(mdPath), { recursive: true });
await fs.writeFile(mdPath, md, 'utf8');

const mqMd = `# DUDUQ English — Memory Quest 30-Module Distribution V2\n\n**Indexed view only.** The sole planning authority is module-content-and-mechanics-v1.json.\n\nPolicy: minimum two Memory Quest activities per module, 60 across the collection; non-consecutive by default; modes AUDIO_IMAGE, TEXT_IMAGE, AUDIO_TEXT; randomization is presentation, not new content.\n\nNo Q positions are confirmed because V3 does not specify activity counts for Y1M02–Y5M06. Eligibility fit is a recommendation, not a counted assignment. LOW-fit modules are explicitly flagged.\n\n| Module | MQ min | Confirmed | Candidate mode | Fit | Phase | Disposition |\n|---|---:|---:|---|---|---|---|\n${dist.modules.map((m) => `| ${m.moduleId} ${escape(m.title)} | 2 | 0 | ${m.proposedModeFromEligibility ?? 'REVIEW'} | ${m.fit} | ${m.phase ?? 'REVIEW'} | ${m.status}${m.risk ? ` — ${m.risk}` : ''} |`).join('\n')}\n\nY1M01 remains fixed at 20 and requires human-approved one-for-one substitutions; no Q position is selected until the existing DDM semantic sets are protected. Y1M02’s first supported candidate is staged AUDIO_IMAGE spoken number↔concrete quantity; second distinct use remains pending count and written-form staging.\n`;
const mqPath = path.join(root, 'docs/curriculum/DUDUQ_ENGLISH_MEMORY_QUEST_30_MODULE_DISTRIBUTION_V2.md');
await fs.mkdir(path.dirname(mqPath), { recursive: true });
await fs.writeFile(mqPath, mqMd, 'utf8');

console.log(`Generated ${modules.length} module blueprint shells; exact production activity sequences remain blocked for ${unresolvedCountIds.length} modules.`);

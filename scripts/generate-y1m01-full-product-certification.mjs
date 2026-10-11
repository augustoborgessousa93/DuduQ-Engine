import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'content/english/year-1/module-01/questions.json';
const source = JSON.parse(await readFile(path.join(root, sourcePath), 'utf8'));
const observedQ001 = 'Y1M01-Q001';

function answerEvidence(item) {
  if (Array.isArray(item.options)) {
    const correct = item.options.filter((option) => option.correct === true);
    return correct.map((option) => ({
      id: option.optionId ?? option.answerKey ?? null,
      label: option.label ?? null,
      semanticTarget: option.semanticTarget ?? null,
    }));
  }
  return item.answerKey ?? item.answerSemantics ?? item.resposta ?? null;
}

function stimulusEvidence(item) {
  if (Array.isArray(item.audioBindings) && item.audioBindings.length) {
    return item.audioBindings.map((binding) => ({
      label: binding.label ?? null,
      audioId: binding.audioId ?? null,
      semanticTarget: binding.semanticTarget ?? null,
      targetId: binding.targetId ?? null,
      mediaId: binding.mediaId ?? null,
    }));
  }
  return {
    contentAudioId: item.contentAudioId ?? null,
    audioTranscript: item.audio_transcript ?? item.audioTranscript ?? null,
    mediaBindings: item.mediaBindings ?? [],
  };
}

function interactionEvidence(item) {
  if (item.mechanicId === 'drag-drop-multimedia') {
    return {
      type: 'audio-card-to-visual-destination',
      audioCards: item.audioBindings?.length ?? null,
      destinations: item.options?.length ?? null,
      mappings: item.audioBindings?.map(({ itemId, targetId, audioId, mediaId, semanticTarget }) => ({ itemId, targetId, audioId, mediaId, semanticTarget })) ?? [],
      runtime: 'NOT_VERIFIED',
    };
  }
  return { type: item.mechanicId, runtime: 'NOT_VERIFIED' };
}

const questions = source.items.map((item) => {
  const observed = item.item_id === observedQ001;
  return {
    questionId: item.item_id,
    topicEn: item.topicEn ?? null,
    mechanicId: item.mechanicId ?? item.mecanica_preferida ?? null,
    canonicalResolution: observed ? 'OBSERVED_ON_Q001_ONLY' : 'STATIC_REGISTRY_PASS_RUNTIME_NOT_VERIFIED',
    pedagogicalPurpose: item.learningTarget ?? item.objetivo ?? item.racional_pedagogico ?? null,
    pedagogicalPhase: item.pedagogicalPhase ?? item.pedagogicalPhaseId ?? null,
    exposureMode: item.exposureMode ?? null,
    instructionEn: item.instruction?.instructionEn ?? null,
    supportPt: item.instruction?.instructionPt ?? null,
    instructionAudioEn: item.instruction?.instructionAudioEnId ?? null,
    supportAudioPt: item.instruction?.instructionAudioPtId ?? null,
    requiredContentStimulus: stimulusEvidence(item),
    initialInteractionGate: observed ? 'OBSERVED_LOCKED_BEFORE_INSTRUCTION_SEQUENCE' : 'NOT_VERIFIED_RUNTIME',
    unlockTiming: observed ? 'INTERACTION_TARGETS_APPEARED_AFTER_INSTRUCTION_BUTTON_AND_WAIT; INDIVIDUAL EN/PT END EVENTS NOT CAPTURED' : 'NOT_VERIFIED_RUNTIME',
    interaction: interactionEvidence(item),
    correctAnswer: answerEvidence(item),
    incorrectRetryFlow: 'NOT_VERIFIED_RUNTIME',
    visualFeedback: observed ? 'ERROR_AND_CORRECT_VISUAL_FEEDBACK_OBSERVED' : 'NOT_VERIFIED_RUNTIME',
    feedbackAudio: 'NOT_VERIFIED_RUNTIME',
    feedbackGate: 'NOT_VERIFIED_RUNTIME',
    transition: 'NOT_VERIFIED_RUNTIME',
    cleanup: 'NOT_VERIFIED_RUNTIME',
    result: observed ? 'PARTIAL_MANUAL_OBSERVATION' : 'NOT_VERIFIED',
  };
});

const report = {
  schemaVersion: '1.0',
  status: 'ISSUE',
  moduleId: 'Y1M01',
  entry: 'http://127.0.0.1:4175/',
  expectedJourney: 'ROOT → INTRO → Q001–Q020 → FINAL',
  generatedAt: new Date().toISOString(),
  testExecution: {
    playwright: 'BLOCKED_BEFORE_PAGE_INTERACTION',
    blocker: 'browserType.launch failed with spawn EPERM while launching isolated Chrome; no product interaction was performed by that run.',
    browserFallback: 'Visible Chrome session used for the official root → module → Intro → Q001 path.',
    browserEvidence: [
      'Root home showed Y1M01 and the required complete-module link.',
      'The link opened the module Intro; the Iniciar jogo control was visible.',
      'Iniciar jogo opened Q001 on the Target Shooter route with topic Greetings and progress 1/20.',
      'Before instruction playback, target buttons were absent from the accessibility tree; after activating the instruction control and waiting, target buttons appeared.',
      'A wrong target produced visible incorrect feedback; retry returned to Q001. A correct Hello target produced visible correct feedback and CONTINUAR.',
      'This is one-question partial manual evidence only; individual EN/PT audio completion, feedback timing, and the remaining journey were not certified.',
    ],
  },
  staticValidation: {
    canonicalMechanics: 'PASS — 8 locked mechanic authorities validated; source integrity and legacy checks had no errors.',
    ddmSemanticDiversity: 'PASS — 5 order-independent signatures; exact=0, permutation=0, near-review=0.',
    productContract: 'PASS — 20 questions; topic/instruction/audio contract checks passed; 5 DDM 4×4 contracts.',
    ddmContract: 'PASS — Q006, Q007, Q008, Q009, Q014 each have 4 audio cards and 4 destinations.',
    build: 'PASS — official build script generated dist-pages with 409 files and ran canonical plus DDM diversity build gates.',
    runtimeCertification: 'NOT_PASS — static checks are not runtime certification.',
  },
  summary: {
    questions: 20,
    fullyRuntimeTested: 0,
    partialManualObservation: 1,
    notVerified: 19,
    canonicalRuntimeResolution: 'Q001 observed; Q002–Q020 not individually observed.',
    topicHeaderRuntime: 'Q001 observed as Greetings; Q002–Q020 not verified.',
    ddmRuntime: '0/5 runtime tested; static contracts and signatures pass.',
    q015Mode3: 'NOT_VERIFIED',
    q020ToFinal: 'NOT_VERIFIED',
    finalScreen: 'NOT_VERIFIED',
    audioOverlap: 'NOT_VERIFIED',
    feedbackFailsafe: 'NOT_VERIFIED',
  },
  questions,
  restrictions: {
    productContentChanged: 0,
    curriculumChanged: 0,
    audioRegenerated: 0,
    canonicalMechanicDesignChanged: 0,
    commit: 'NONE',
    push: 'NONE',
    tag: 'NONE',
  },
};

const jsonOutput = 'content/english/year-1/module-01/certification-v1.json';
const mdOutput = 'docs/qa/DUDUQ_Y1M01_FULL_PRODUCT_CERTIFICATION_V1.md';
const mdRows = questions.map((q) => `| ${q.questionId} | ${q.topicEn ?? 'MISSING'} | ${q.mechanicId ?? 'MISSING'} | ${q.instructionEn ?? 'MISSING'} | ${q.supportPt ?? 'MISSING'} | ${q.initialInteractionGate} | ${q.result} |`).join('\n');
const markdown = `# DUDUQ Y1M01 — Full Learner Journey Certification V1\n\n**Status: ISSUE — NOT CERTIFIED.**\n\n## Entry and evidence\n\n- Official entry: http://127.0.0.1:4175/\n- Expected path: Root → complete module → Intro → Q001–Q020 → Final.\n- Playwright was blocked before page interaction: isolated Chrome launch failed with \`spawn EPERM\`. This was an environment block, not a product failure.\n- Visible-browser fallback observed the root listing/link, Intro, Q001 topic/progress, interaction unavailable before the instruction sequence, targets visible after instruction activation/wait, an incorrect visual response with recovery, and a correct Hello response with correct visual feedback and Continue. This is partial evidence for Q001 only.\n- No question has full runtime certification in this report. Q001 is partial; Q002–Q020 are NOT VERIFIED.\n\n## Static gates\n\n- Canonical mechanic registry/source lock/legacy checks: PASS (8 authorities; zero validator errors).\n- Y1M01 product-contract validator: PASS (20 questions; canonical topic/instruction/audio fields; five DDM 4×4 contracts).\n- DDM semantic diversity: PASS (exact duplicates 0; permutation duplicates 0; near-duplicate reviews 0).\n- DDM contract: PASS (Q006/Q007/Q008/Q009/Q014 each 4 audio cards and 4 destinations).\n- Official build: PASS (409 generated files; canonical and DDM build gates passed).\n- Static validation does not substitute for runtime certification.\n\n## Per-question record\n\n| Question | Topic (EN) | Mechanic | EN instruction | PT support | Initial gate | Runtime result |\n|---|---|---|---|---|---|---|\n${mdRows}\n\n## Unverified acceptance requirements\n\nThe complete question journey, per-question audio playback and end events, required stimuli, all correct/incorrect and retry paths, feedback-audio timing/failsafe, Continue/Try Again timing, cleanup, progress Q001–Q020, Q015 Mode 3 sequence, all five DDM card audios/mappings/drags, Q020→Final, final-screen behavior, audio overlap, mobile/fullscreen, and full fetch outcomes were not certified.\n\nNo curriculum, product question content, audio, or canonical mechanic design was changed for this certification. No commit, push, or tag was created.\n\n**Next action:** run the full visible-input browser journey with an approved Playwright-capable browser environment (or human-observed checklist) and complete every required state before seeking Augusto's final acceptance.\n`;

await mkdir(path.join(root, path.dirname(jsonOutput)), { recursive: true });
await mkdir(path.join(root, path.dirname(mdOutput)), { recursive: true });
await writeFile(path.join(root, jsonOutput), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(root, mdOutput), markdown, 'utf8');
console.log(JSON.stringify({ status: report.status, jsonOutput, mdOutput, questionRows: questions.length }));

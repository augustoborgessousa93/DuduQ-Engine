import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const writeJson = (path, value) => {
  const prior = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
  const newline = prior.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(path, JSON.stringify(value, null, 2).replace(/\n/g, newline) + newline, 'utf8');
};
const getItem = (questions, id) => {
  const item = questions.items.find(row => row.item_id === `Y2M01-${id}`);
  if (!item) throw new Error(`MISSING_PRODUCTION_ITEM:${id}`);
  return item;
};
const getActivity = (plan, id) => {
  const activity = plan.activities.find(row => row.activityId === id);
  if (!activity) throw new Error(`MISSING_BLUEPRINT_ACTIVITY:${id}`);
  return activity;
};
const updatePlanActivity = (activity, options) => {
  Object.assign(activity, options.fields);
  activity.audioRequirements = {
    ...activity.audioRequirements,
    contentAudioRequired: options.audioTargets.length > 0,
    contentAudioTargets: options.audioTargets,
    instructionAudioRequired: true,
    instructionAudioStatus: options.instructionAudioStatus || 'EXISTING_APPROVED_AUDIO',
    interactionSfx: true
  };
  activity.imageRequirements = options.imageRequirements || [];
  activity.mediaRequirements = {
    ...(activity.mediaRequirements || {}),
    mechanicIndependent: true,
    status: options.mediaStatus || 'CONTENT_READY',
    slotIds: options.mediaSlots || []
  };
  activity.productionStatus = options.productionStatus;
  activity.productionNotes = options.notes;
};

const questionPath = 'content/english/year-2/module-01/questions.json';
const questionContract = readJson(questionPath);
const q004 = getItem(questionContract, 'Q004');
const q010 = getItem(questionContract, 'Q010');
const q018 = getItem(questionContract, 'Q018');
const q019 = getItem(questionContract, 'Q019');

function makeAudioRangeGrouping(item, ranges, instructionEn, instructionPt) {
  const oldItems = item.items;
  item.primaryInstructionEn = instructionEn;
  item.supportInstructionPt = instructionPt;
  item.instruction.instructionEn = instructionEn;
  item.instruction.instructionPt = instructionPt;
  // Existing recordings do not contain the range rule. Keep their IDs as
  // provenance only and block runtime certification until official audio is regenerated.
  item.instruction.instructionAudioStatus = 'BLOCKED_STALE_TEXT_PENDING_GOLD_VOICE_REGENERATION';
  item.instruction.audioGenerationBlocker = 'GOLD_VOICE_GENERATION_FAILED:spawn EPERM; WSL Wsl/Service/E_ACCESSDENIED';
  item.instruction.instructionAudioEnId = null;
  item.instruction.instructionAudioPtId = null;
  item.instruction.audioOrder = [];
  item.items = oldItems.map(row => {
    const letter = String(row.semanticTarget).toUpperCase();
    if (!/^[A-Z]$/.test(letter)) throw new Error(`INVALID_GROUPING_LETTER:${row.id}:${letter}`);
    return {
      id: row.id,
      modality: 'audio',
      semanticTarget: letter,
      audioId: `AUD-EN-LETTER-${letter}`,
      groupId: row.groupId,
      answerKey: row.groupId
    };
  });
  item.audioBindings = item.items.map(row => ({ role: 'grouping-letter-audio', audioId: row.audioId, itemId: row.id }));
  item.mediaBindings = [];
  item.semanticTargetType = 'LETTER';
  item.taskType = 'LISTEN_AND_GROUP';
  item.targetType = 'ENGLISH_LETTER_NAME_AUDIO';
  item.interactionRelation = 'AUDIO_ENGLISH_LETTER_NAME_TO_ALPHABET_RANGE';
  item.targetPresentation = {
    policy: 'ON_DEMAND_AUDIO_ONLY_NO_VISIBLE_LETTER',
    setupAudioId: null,
    targetAudioId: null,
    answerLeakPrevention: 'DRAGGABLE_CARD_HAS_NO_VISIBLE_LETTER_OR_MEDIA'
  };
  item.pedagogicalVoicePlan.semanticInstruction = { en: instructionEn, pt: instructionPt, setupAudioId: null, targetAudioId: null };
  item.pedagogicalVoicePlan.taskProfileId = 'DUDUQ_TASK_LISTEN_AND_GROUP_V1';
  item.pedagogicalVoicePlan.postSuccessReinforcement = 'LETTER_GROUP_RANGE_REINFORCEMENT_NO_TRANSLATION';
  item.productionStatus = 'PRODUCTION_BLOCKED_REQUIRED_RANGE_INSTRUCTION_AUDIO';
  item.productionBlockers = ['Regenerate EN/PT instruction audio with exact range rule using DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3'];
  item.learningTarget = `listen to English letter names and classify the heard letter into ${ranges.join(' or ')}.`;
}

makeAudioRangeGrouping(q004, ['A–C', 'D–E'], 'Listen and sort: A–C or D–E.', 'Ouça cada letra e coloque no grupo correto: A–C ou D–E.');
makeAudioRangeGrouping(q010, ['A–E', 'F–J'], 'Listen and sort: A–E or F–J.', 'Ouça cada letra e coloque no grupo correto: A–E ou F–J.');

// Replace the rejected five-letter clip with three existing canonical English
// letter-name clips. Target-shooter remains the already-frozen interaction.
q018.learningTarget = 'review: recognize a short familiar name from three clearly sequenced English letter names.';
q018.primaryInstructionEn = 'Listen and shoot the spelled name.';
q018.supportInstructionPt = 'Ouça e acerte o nome soletrado.';
q018.instruction.instructionEn = q018.primaryInstructionEn;
q018.instruction.instructionPt = q018.supportInstructionPt;
q018.instruction.instructionAudioStatus = 'BLOCKED_INSTRUCTION_AUDIO_TEXT_MISMATCH_PENDING_GOLD_VOICE_REGENERATION';
q018.instruction.audioGenerationBlocker = 'Existing instruction audio is shared with Q009 matching-name wording and does not explain short spelling recognition.';
q018.instruction.instructionAudioEnId = null;
q018.instruction.instructionAudioPtId = null;
q018.instruction.audioOrder = [];
q018.stimulus = { type: 'spoken-three-letter-name-sequence', target: 'L — E — O', audioIds: ['AUD-EN-LETTER-L', 'AUD-EN-LETTER-E', 'AUD-EN-LETTER-O'] };
const oldLeo = q018.options.find(option => option.semanticTarget?.toUpperCase() === 'LEO');
const oldMia = q018.options.find(option => option.semanticTarget?.toUpperCase() === 'MIA');
const oldAna = q018.options.find(option => option.semanticTarget?.toUpperCase() === 'ANA');
if (!oldLeo || !oldMia || !oldAna) throw new Error('Q018_NAME_MEDIA_OPTIONS_MISSING');
const nameCard = (optionId, label, assetId, role) => ({
  optionId, label, semanticTarget: label.toUpperCase(), answerKey: assetId,
  media: { assetId, role, semanticTarget: label.toUpperCase(), mustInclude: label.toUpperCase(), mustNotInclude: 'unrelated words or answer cues', answerLeakRisk: 'LOW_WITH_CONTEXT', status: 'DETERMINISTIC_REUSABLE_PEDAGOGICAL_MEDIA' }
});
q018.options = [
  nameCard('Y2M01-Q018-O1', 'Leo', oldLeo.media.assetId, 'TARGET'),
  nameCard('Y2M01-Q018-O2', 'Mia', oldMia.media.assetId, 'DISTRACTOR'),
  nameCard('Y2M01-Q018-O3', 'Ana', oldAna.media.assetId, 'DISTRACTOR'),
  nameCard('Y2M01-Q018-O4', 'Ben', 'IMG-Y1M01-NAME-QUESTION-ANSWER-001', 'DISTRACTOR')
];
q018.answerKey = oldLeo.answerKey;
q018.audioBindings = ['L', 'E', 'O'].map((letter, index) => ({
  role: 'content-stimulus', audioId: `AUD-EN-LETTER-${letter}`, sequencePosition: index + 1,
  semanticTarget: letter, expectedPlaybackCount: 1
}));
q018.mediaBindings = q018.options.map((option, index) => ({ assetId: option.media.assetId, role: index === 0 ? 'TARGET' : 'DISTRACTOR', semanticTarget: option.semanticTarget }));
q018.semanticTargetType = 'SPELLING';
q018.taskType = 'LISTEN_AND_SHOOT';
q018.targetType = 'SHORT_FAMILIAR_NAME_SPELLING';
q018.interactionRelation = 'THREE_ENGLISH_LETTER_NAMES_TO_FAMILIAR_NAME_CARD';
q018.pedagogicalVoicePlan.semanticInstruction = { en: q018.primaryInstructionEn, pt: q018.supportInstructionPt, setupAudioId: null, targetAudioId: null };
q018.pedagogicalVoicePlan.postSuccessReinforcement = 'TARGET_SHOOTER_SUCCESS_PLUS_SHORT_NAME_RECOGNITION_NO_AUDIO_REPLAY';
q018.targetPresentation = { policy: 'SPOKEN_THREE_LETTER_NAME_SEQUENCE_ONCE_NO_PORTUGUESE_ANSWER', setupAudioId: null, targetAudioId: null, pauseBetweenAudioIdsMs: 360, languageCueStatus: 'INSTRUCTION_FRAMES_TARGET; OPTIONAL_PT_LETTER_CUE_BLOCKED_BY_GOLD_VOICE_LAUNCHER' };
q018.productionStatus = 'HUMAN_LISTENING_PENDING_OFFICIAL_AUDIO_GENERATION_BLOCKED';
q018.productionBlockers = ['Human rejected former LUCAS clip retired; confirm canonical L/E/O pronunciation by listening', 'Optional shared PT-BR letter cue unavailable: WSL launcher blocked'];

const greetingAudios = [
  ['Hello!', 'AUD-Y1M01-52B269EBB3AE', 'greeting'],
  ['Good morning!', 'AUD-Y1M01-685BAF0CD887', 'greeting'],
  ['Good night.', 'AUD-Y2M01-LEX-GOOD-NIGHT', 'farewell'],
  ['See you.', 'AUD-Y2M01-LEX-SEE-YOU', 'farewell']
];
q019.items = greetingAudios.map(([phrase, audioId, groupId], index) => ({
  id: `Y2M01-Q019-I${index + 1}`, modality: 'audio', semanticTarget: phrase,
  audioId, groupId, answerKey: groupId
}));
q019.primaryInstructionEn = 'Listen: greeting or farewell?';
q019.supportInstructionPt = 'Ouça: cumprimento ou despedida?';
q019.instruction.instructionEn = q019.primaryInstructionEn;
q019.instruction.instructionPt = q019.supportInstructionPt;
q019.instruction.instructionAudioStatus = 'BLOCKED_STALE_TEXT_PENDING_GOLD_VOICE_REGENERATION';
q019.instruction.audioGenerationBlocker = 'GOLD_VOICE_GENERATION_FAILED:spawn EPERM; WSL Wsl/Service/E_ACCESSDENIED';
q019.instruction.instructionAudioEnId = null;
q019.instruction.instructionAudioPtId = null;
q019.instruction.audioOrder = [];
q019.audioBindings = q019.items.map(row => ({ role: 'grouping-phrase-audio', audioId: row.audioId, itemId: row.id }));
q019.mediaBindings = [];
q019.semanticTargetType = 'GREETING_OR_FAREWELL';
q019.taskType = 'LISTEN_AND_GROUP';
q019.targetType = 'SPOKEN_GREETING_OR_FAREWELL_PHRASE';
q019.interactionRelation = 'AUDIO_SOCIAL_FORMULA_TO_GREETING_OR_FAREWELL_GROUP';
q019.targetPresentation = { policy: 'ON_DEMAND_AUDIO_ONLY_TO_CLASSIFY_SOCIAL_FORMULA', setupAudioId: null, targetAudioId: null, answerLeakPrevention: 'NO_WRITTEN_PHRASE_ON_DRAGGABLE_CARD' };
q019.pedagogicalVoicePlan.semanticInstruction = { en: q019.primaryInstructionEn, pt: q019.supportInstructionPt, setupAudioId: null, targetAudioId: null };
q019.pedagogicalVoicePlan.taskProfileId = 'DUDUQ_TASK_LISTEN_AND_GROUP_V1';
q019.pedagogicalVoicePlan.postSuccessReinforcement = 'GROUPING_SUCCESS';
q019.productionStatus = 'PRODUCTION_BLOCKED_GROUPING_AUDIO_PRESENTATION_ADAPTER_AND_INSTRUCTION_AUDIO_QA';
q019.productionBlockers = ['Audio-grouping card role requires source/live verification', 'Verify phrase target audio bindings and new bilingual instruction audio'];

writeJson(questionPath, questionContract);

const planPath = 'content/english/planning/year-2/module-01.json';
const plan = readJson(planPath);
plan.primaryObjectives = ['Extend greetings and recognize familiar names through short, supported English letter-name sequences.'];
plan.secondaryObjectives = ['Bridge oral identity to staged letter recognition without requiring long spelling sequences.'];
plan.skillTargets.listening.outcome = 'Recognize English letter names in short, familiar-name spelling with explicit support.';
plan.listeningTargets.outcome = plan.skillTargets.listening.outcome;
plan.skillTargets.reading.outcome = 'Recognize a short familiar name card after hearing its three English letter names.';
plan.readingWrittenFormTargets.outcome = plan.skillTargets.reading.outcome;
plan.skillTargets.writing.outcome = 'Optional modeled copying; not required as evidence of listening mastery.';
plan.grammarStructureTargets.productive = ['How do you spell...? / [name] is spelled... (briefly modeled)'];
plan.pedagogicalProgression.guidedPractice = ['Listen to English letter names and group familiar letters by range'];
plan.pedagogicalProgression.comprehension = ['Recognize a short familiar name from a three-letter English sequence'];
plan.pedagogicalProgression.review = ['Y3M01/Y4M02'];
plan.expectedMastery = 'Recognize staged English letter names and identify one familiar three-letter name from a short, supported sequence; long spelling sequences are not required.';
plan.evidence = 'Correctly classify audio letter names by taught range and identify a familiar name after three clearly sequenced English letter names.';
plan.pedagogicalGuardrails = {
  earlyYearsAudioFirst: 'Prefer audio-to-visual association when it develops the same curricular skill with lower unnecessary reading demand.',
  spellingSequence: 'Avoid spelling sequences longer than three letters as a primary Year-2 recognition task unless explicitly justified and human-reviewed.',
  letterAudioCue: 'Consider a brief attention cue for isolated letter-name audio; play each English target exactly once and never allow mixed-language synthesis to alter its pronunciation.',
  grouping: 'For letter-name listening classification, draggable cards must not expose the written answer; group-range labels may remain visible.',
  ageTest: 'A Year-1/Year-2 child should understand the action from the bilingual instruction without adult explanation.'
};
for (const [id, mode] of [['Q004', 'letters A/B/C/D/E → audio-only card → groups A–C/D–E'], ['Q010', 'letters A/C/E/F/H/J → audio-only card → groups A–E/F–J'], ['Q019', 'spoken greeting/farewell phrases → greeting/farewell groups'], ['Q018', 'three English letter-name clips L/E/O → familiar Leo name card']]) {
  const activity = getActivity(plan, id);
  const isGroupingLetter = id === 'Q004' || id === 'Q010';
  const isGreetingGrouping = id === 'Q019';
  const isQ018 = id === 'Q018';
  const letterTargets = id === 'Q004' ? ['A','B','C','D','E'] : id === 'Q010' ? ['A','C','E','F','H','J'] : id === 'Q018' ? ['L','E','O'] : [];
  const spokenTargets = id === 'Q019' ? greetingAudios.map(row => row[0]) : letterTargets;
  const en = isGroupingLetter ? `Listen: ${id === 'Q004' ? 'A–C first, D–E second' : 'A–E first, F–J second'}.` : isGreetingGrouping ? 'Listen: greeting or farewell?' : isQ018 ? 'Listen and shoot the spelled name.' : activity.primaryInstructionEn;
  const pt = isGroupingLetter ? `Ouça: ${id === 'Q004' ? 'A–C no primeiro grupo; D–E no segundo' : 'A–E no primeiro grupo; F–J no segundo'}.` : isGreetingGrouping ? 'Ouça: cumprimento ou despedida?' : isQ018 ? 'Ouça e acerte o nome soletrado.' : activity.supportInstructionPt;
  updatePlanActivity(activity, {
    fields: {
      primaryInstructionEn: en, supportInstructionPt: pt,
      stimulusType: isGroupingLetter ? 'english_letter_name_audio_card_to_visible_alphabet_range' : isGreetingGrouping ? 'spoken_phrase_audio_card_to_social_function_group' : isQ018 ? 'three_sequenced_english_letter_names_to_familiar_name_card' : activity.stimulusType,
      expectedStudentAction: isGroupingLetter ? 'Listen to each English letter name and drag its audio-only card into the matching alphabet range.' : isGreetingGrouping ? 'Listen to each spoken social formula and sort it as a greeting or farewell.' : isQ018 ? 'Listen to three English letter names in sequence and select the familiar name card.' : activity.expectedStudentAction,
      expectedResponseType: isQ018 ? 'single_target_selection' : 'pointer_drag_drop_then_confirm',
      mechanicId: isQ018 ? 'target-shooter' : 'drag-drop', currentMechanicId: isQ018 ? 'target-shooter' : 'drag-drop',
      learningTarget: isQ018 ? 'review: recognize a short familiar name from three clearly sequenced English letter names.'
        : id === 'Q004' ? 'guided practice: hear English letter names A-E and group them by A-C versus D-E.'
          : id === 'Q010' ? 'comprehension: hear the taught letters A/C/E/F/H/J and classify by A-E versus F-J.'
            : isGreetingGrouping ? 'consolidation: hear familiar greeting and farewell phrases and classify their social function.' : activity.learningTarget,
      languageTargets: isQ018 ? ['familiar-name spelling with three English letter names'] : activity.languageTargets,
      answerContract: { ...activity.answerContract, sourceTarget: isQ018 ? 'Leo spelled with three English letter names' : isGreetingGrouping ? 'good night; see you; hello; good morning' : activity.answerContract.sourceTarget, correctSemanticRelation: isGroupingLetter ? 'Hear the English letter name; classify it using only the visible range labels.' : isGreetingGrouping ? 'Hear the spoken phrase; classify its social function.' : isQ018 ? 'The heard L-E-O sequence maps to the Leo name card.' : activity.answerContract.correctSemanticRelation },
      whyThisMechanic: isGroupingLetter ? 'Audio-only letter cards require listening before range classification; the visible range labels define the category without revealing each draggable target.' : isGreetingGrouping ? 'The spoken phrase is the object of classification; audio removes an unnecessary reading barrier while preserving greeting/farewell categorization.' : isQ018 ? 'Target Shooter presents a brief listen-and-identify task using three familiar letter-name inputs, a short answer, and low reading load; it reuses a frozen mechanic.' : 'Audio stimulus supports the approved task.'
    },
    audioTargets: isGroupingLetter ? letterTargets : isGreetingGrouping ? spokenTargets : isQ018 ? ['AUD-EN-LETTER-L','AUD-EN-LETTER-E','AUD-EN-LETTER-O'] : [],
  instructionAudioStatus: isGroupingLetter || isGreetingGrouping ? 'BLOCKED_STALE_TEXT_PENDING_GOLD_VOICE_REGENERATION' : isQ018 ? 'BLOCKED_INSTRUCTION_AUDIO_TEXT_MISMATCH_PENDING_GOLD_VOICE_REGENERATION' : 'EXISTING_APPROVED_AUDIO',
    imageRequirements: isQ018 ? [{ assetRole: 'familiar-name-answer-card', semanticTarget: 'Leo', mustInclude: 'LEO', mustNotInclude: 'unrelated words or answer cues', answerLeakRisk: 'LOW_WITH_CONTEXT', orientation: 'square', pedagogicalPurpose: 'recognize a familiar name after hearing its short spelling sequence', productionStatus: 'CANONICAL_REUSABLE_PEDAGOGICAL_MEDIA' }] : [],
    mediaSlots: isQ018 ? ['MEDIA-NAME-CARD-LEO','MEDIA-NAME-CARD-MIA','MEDIA-NAME-CARD-ANA'] : [],
    mediaStatus: isGroupingLetter || isGreetingGrouping ? 'AUDIO_CARDS_NO_SEMANTIC_ARTWORK' : 'CONTENT_READY',
    productionStatus: isGroupingLetter || isGreetingGrouping ? 'BLOCKED_REQUIRED_GOLD_VOICE_INSTRUCTION_AUDIO' : isQ018 ? 'HUMAN_LISTENING_PENDING_OFFICIAL_AUDIO_GENERATION_BLOCKED' : activity.productionStatus,
    notes: isGroupingLetter || isGreetingGrouping ? 'Production is deliberately blocked until revised spoken EN/PT instructions are generated using the official Gold Voice pipeline. Do not reuse stale audio that omits the actual group rule.' : isQ018 ? 'The former LUCAS clip is retired from the active contract. Canonical English L/E/O letter-name assets are sequenced once each; 360ms pause and human listening required. Optional PT cue remains blocked by WSL.' : activity.productionNotes
  });
}
for (const row of plan.activitySequence) {
  const planned = plan.activities.find(activity => activity.activityId === row.activityId);
  if (planned) Object.assign(row, planned);
}
writeJson(planPath, plan);

const contentMasterPath = 'content/english/master/module-content-and-mechanics-v1.json';
const contentMaster = readJson(contentMasterPath);
const y2Module = contentMaster.modules.find(row => row.moduleId === 'Y2M01');
if (!y2Module) throw new Error('Y2M01_MODULE_MISSING_IN_CONTENT_MASTER');
y2Module.primaryObjectives = plan.primaryObjectives;
y2Module.secondaryObjectives = plan.secondaryObjectives;
y2Module.grammarStructureTargets = plan.grammarStructureTargets;
y2Module.skillTargets = plan.skillTargets;
y2Module.listeningTargets = plan.listeningTargets;
y2Module.readingWrittenFormTargets = plan.readingWrittenFormTargets;
y2Module.pedagogicalProgression = plan.pedagogicalProgression;
y2Module.expectedMastery = plan.expectedMastery;
y2Module.evidence = plan.evidence;
y2Module.pedagogicalGuardrails = plan.pedagogicalGuardrails;
for (const rows of [y2Module.activitySequence, y2Module.activities || []]) {
  for (const row of rows) {
    const activity = plan.activities.find(entry => entry.activityId === row.activityId);
    if (activity) Object.assign(row, activity);
  }
}
writeJson(contentMasterPath, contentMaster);

const curriculumPath = 'content/english/master/curricular-master-v3.json';
const curriculum = readJson(curriculumPath);
const curricularModule = curriculum.modules.find(row => row.id === 'Y2M01');
if (!curricularModule) throw new Error('Y2M01_MODULE_MISSING_IN_CURRICULUM_MASTER');
curricularModule.purpose = 'Extend greetings and recognize familiar names through short, supported English letter-name sequences.';
curricularModule.why = 'Bridges oral identity to staged letter recognition without requiring long spelling sequences.';
curricularModule.newProductiveStructures = ['How do you spell...? / [name] is spelled... (briefly modeled)'];
curricularModule.consolidatedStructures = ['short supported familiar-name spelling'];
curricularModule.functions = ['greet', 'farewell', 'recognize a familiar name from English letter names'];
curricularModule.skills.listening.outcome = plan.skillTargets.listening.outcome;
curricularModule.skills.reading.outcome = plan.skillTargets.reading.outcome;
curricularModule.skills.writing.outcome = plan.skillTargets.writing.outcome;
curricularModule.pronunciation = 'English letter names must be intelligible, presented once per target, and separated naturally; human listening approval is required.';
curricularModule.visualAudioSupport = 'Audio-only letter cards, visible alphabet-range labels, familiar short name cards, and contextual social-formula visuals.';
curricularModule.sequence = {
  ...curricularModule.sequence,
  guidedPractice: ['Listen to English letter names and group familiar letters by range'],
  comprehension: ['Recognize a short familiar name from a three-letter English sequence']
};
curricularModule.expectedMastery = plan.expectedMastery;
curricularModule.evidence = plan.evidence;
curricularModule.pedagogicalGuardrails = plan.pedagogicalGuardrails;
curriculum.lastUpdated = '2026-10-14';
curriculum.changeLog ||= [];
curriculum.changeLog = curriculum.changeLog.filter(entry => !(entry.date === '2026-10-14' && entry.module === 'Y2M01' && entry.authority === 'AUGUSTO'));
curriculum.changeLog.push({ date: '2026-10-14', module: 'Y2M01', authority: 'AUGUSTO', change: 'Replaced long LUCAS spelling-recognition activity with a three-letter familiar-name recognition task; letter range grouping now requires listening; greeting/farewell grouping now uses spoken phrase stimuli.', rationale: 'Human early-years QA: reduce unnecessary reading, long auditory spelling, and visual answer leakage.' });
const year2Bridge = curriculum.crossYearBridges?.find(row => row.fromYear === 1 && row.toYear === 2);
if (year2Bridge) year2Bridge.newDemand = 'recognize staged English letter batches and identify a short familiar name from a brief modeled spelling sequence';
const year2Exit = curriculum.yearExitProfiles?.find(row => row.year === 2);
if (year2Exit) year2Exit.repertoire = year2Exit.repertoire.replace('spell familiar name with support', 'recognize a short familiar name from English letter names with support');
writeJson(curriculumPath, curriculum);

const markdownPath = 'docs/master/DUDUQ_English_Master_Curricular_Pedagogico_V3.md';
let markdown = fs.readFileSync(markdownPath, 'utf8');
markdown = markdown.replace('- **Purpose/why:** extend social formulas and support familiar-name spelling. **Prerequisites:** Y1M01.', '- **Purpose/why:** extend greetings and recognize familiar names through short, supported English letter-name sequences; avoid long spelling sequences as a primary Year-2 recognition task. **Prerequisites:** Y1M01.');
markdown = markdown.replace('supported spelling; not simultaneous 26-item mastery', 'staged audio-to-letter recognition; short familiar-name spelling only with support; not simultaneous 26-item mastery');
markdown = markdown.replace('| How do you spell…? / spelled… | Y2M01 | Y2M01 batches | familiar-name spelling with support | Y3M01, Y4M02 | selected familiar labels |', '| How do you spell…? / spelled… | Y2M01 | Y2M01 batches | short familiar-name spelling with support; avoid long spelling sequences as primary Year-2 recognition | Y3M01, Y4M02 | selected familiar labels |');
const marker = '#### Y2M01 — Greetings, Names and the Alphabet';
const pos = markdown.indexOf(marker);
if (pos < 0) throw new Error('Y2M01_HUMAN_MASTER_SECTION_MISSING');
const next = markdown.indexOf('\n#### ', pos + marker.length);
const sectionEnd = next < 0 ? markdown.length : next;
let y2Section = markdown.slice(pos, sectionEnd);
 y2Section = y2Section.replace('**Active:** good night, see you; ask How do you spell? and spell a familiar name with support. **Receptive sequence:** A-Z letter names introduced in batches of 4-6 per encounter; cumulative recognition. **Review:** hi/hello/good morning/good afternoon/goodbye/name exchange. **Consolidate:** selected familiar letters and one modeled spelling sequence.', '**Active:** good night, see you. **Receptive sequence:** A-Z letter names introduced in batches of 4-6 per encounter; cumulative recognition. **Review:** hi/hello/good morning/good afternoon/goodbye/name exchange. **Consolidate:** selected familiar letters and a short, supported familiar-name spelling recognition task.');
 y2Section = y2Section.replace('**Skills:** hear letter names in familiar spelling; ask/rehearse spelling; identify letters in a known name; copy/complete familiar name from model.', '**Skills:** hear and identify staged English letter names; classify heard letters by taught range; recognize a short familiar name card from a brief modeled spelling sequence. Optional copying is not listening-mastery evidence.');
 y2Section = y2Section.replace('teach greeting extensions and batches -> guided name spelling -> letter recognition -> comprehend spelled familiar name -> review Y3M01/Y4M02 -> consolidate selected letters', 'teach greeting extensions and letter batches -> listen-and-group by alphabet range -> recognize staged letters -> identify a short familiar name from a brief three-letter sequence -> review Y3M01/Y4M02');
 y2Section = y2Section.replace('recognize taught letters and follow spelling of a familiar modeled name', 'recognize taught letters and identify a familiar name from three clearly sequenced English letter names');
if (!y2Section.includes('V10.14 early-years policy')) y2Section += '\n- **V10.14 early-years policy:** use short, audio-supported letter/name recognition; do not make long five-letter spelling a primary Year-2 recognition task. For letter-range classification, the learner hears an English letter name on an audio-only draggable card and sorts it using visible range labels.\n- **Q018:** identify the familiar name Leo from the three English letter names L–E–O. This is a brief supported spelling-to-name recognition task, not sentence completion; the previous LUCAS activity is retired.\n';
markdown = markdown.replace('| Q018 | REVIEW | review: Extend greetings and support familiar-name spelling. Focus: spell familiar name. | smart-sentence-complete | CONTENT_BLUEPRINT_READY_MEDIA_PENDING |', '| Q018 | REVIEW | review: recognize a familiar name from three clearly sequenced English letter names. Focus: Leo (L–E–O). | target-shooter | HUMAN_LISTENING_PENDING_OFFICIAL_AUDIO_GENERATION_BLOCKED |');
markdown = markdown.slice(0, pos) + y2Section + markdown.slice(sectionEnd);
fs.writeFileSync(markdownPath, markdown, 'utf8');

const policy = {
  schemaVersion: 'duduq-early-years-audio-pedagogy-v1',
  humanAuthority: 'AUGUSTO',
  status: 'FACTORY_GUARDRAIL_PENDING_HUMAN_QA',
  appliesTo: ['Y1', 'Y2'],
  rules: {
    objectiveFirst: true,
    preferAudioVisualWhenEquivalent: true,
    longSpellingSequence: { defaultMaximumLetters: 3, longerRequires: ['explicit spelling objective', 'age scaffolding', 'human listening review'] },
    briefAudioCue: { considerFor: 'isolated sub-second letter-name target', cueMayChangeTargetLanguagePronunciation: false, oneTargetPerIntentionalPlay: true },
    audioGrouping: { hideWrittenTargetOnDraggableStimulus: true, visibleCategoryLabelsAllowed: true },
    notAudioEverywhere: true,
    childActionClarity: 'A Year-1/Year-2 child should understand the task from the bilingual instruction without adult explanation.',
    humanListeningRequired: true,
    approvedVoice: 'DUDUQ_GOLD_VOICE_v1',
    approvedEngine: 'CHATTERBOX_MULTILINGUAL_V3',
    browserTtsAllowed: false
  }
};
writeJson('content/english/master/early-years-audio-pedagogy-v1.json', policy);

console.log(JSON.stringify({
  updated: [questionPath, planPath, contentMasterPath, curriculumPath, markdownPath, 'content/english/master/early-years-audio-pedagogy-v1.json'],
  q004: q004.items.map(row => ({ id: row.id, audioId: row.audioId, visibleAnswer: Object.hasOwn(row, 'label') || Object.hasOwn(row, 'assetId') })),
  q010: q010.items.map(row => ({ id: row.id, audioId: row.audioId, visibleAnswer: Object.hasOwn(row, 'label') || Object.hasOwn(row, 'assetId') })),
  q018: { target: q018.answerKey, letters: q018.audioBindings.map(row => row.audioId), status: q018.productionStatus },
  q019: q019.items.map(row => ({ id: row.id, audioId: row.audioId, visibleText: Object.hasOwn(row, 'label') })),
  blockers: ['Gold Voice launcher failed with spawn EPERM; WSL reports Wsl/Service/E_ACCESSDENIED', 'New range-specific EN/PT instructions need regenerated audio', 'Human listening remains pending']
}, null, 2));

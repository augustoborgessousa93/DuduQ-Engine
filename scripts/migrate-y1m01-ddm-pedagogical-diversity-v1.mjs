import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relative = 'content/english/year-1/module-01/questions.json';
const file = path.join(root, relative);
const data = JSON.parse(await readFile(file, 'utf8'));
const specs = {
  Q006: {
    topic: 'Greetings', phase: 'GUIDED_PRACTICE', mode: 2,
    target: 'Recognize and associate four familiar greetings with the social or time-of-day scene where each is used.',
    purpose: 'First guided association of hello, time-of-day greetings, and farewell with distinct situations.',
    recycling: 'Introduces the complete greeting set; no prior DDM set is repeated.',
    entries: [
      ['hello', 'hello-scene', 'Hello!', 'AUD-Y1M01-52B269EBB3AE', 'IMG-Y1M01-GREETING-GENERIC-001', 0, 'hello greeting', 'Greeting scene'],
      ['morning', 'morning-scene', 'Good morning!', 'AUD-Y1M01-685BAF0CD887', 'IMG-Y1M01-GREETING-MORNING-001', 0, 'morning greeting', 'Morning scene'],
      ['afternoon', 'afternoon-scene', 'Good afternoon!', 'AUD-Y1M01-15C49EF914C3', 'IMG-Y1M01-GREETING-AFTERNOON-001', 0, 'afternoon greeting', 'Afternoon scene'],
      ['farewell', 'farewell-scene', 'Goodbye!', 'AUD-Y1M01-CE305BA925A9', 'IMG-Y1M01-FAREWELL-GENERIC-001', 0, 'farewell', 'Farewell scene']
    ]
  },
  Q007: {
    topic: 'Social Introductions', phase: 'GUIDED_PRACTICE', mode: 2,
    target: 'Recognize the greeting, name question, modeled name response, and farewell in a short social exchange.',
    purpose: 'Guided recognition of the sequence and communicative purpose of greeting, asking a name, answering, and saying goodbye.',
    recycling: 'Reuses the hello greeting function from Q006 in a new social sequence; the name question, Ana response, and named farewell add distinct targets and destinations.',
    entries: [
      ['hello', 'hello-social-scene', 'Hello!', 'AUD-Y1M01-52B269EBB3AE', 'IMG-Y1M01-GREETING-INFORMAL-001', 0, 'hello greeting', 'Informal greeting scene'],
      ['name-question', 'name-question-scene', "What's your name?", 'AUD-Y1M01-61B336EB3A2B', 'IMG-Y1M01-NAME-QUESTION-001', 0, 'asking a name', 'Name question scene'],
      ['ana', 'ana-name', 'My name is Ana.', 'AUD-Y1M01-61E1B8064128', 'IMG-Y1M01-NAME-TAGS-001', 0, 'Ana introduction', "ANA name badge"],
      ['ana-farewell', 'ana-leaving-school', 'Goodbye, Ana.', 'AUD-Y1M01-97345CB1900A', 'IMG-Y1M01-FAREWELL-ANA-001', 1, 'Ana farewell', 'Ana leaving-school scene']
    ]
  },
  Q008: {
    topic: 'People and Names', phase: 'RECOGNITION', mode: 2,
    target: 'Recognize the receptive words boy and girl in character-identification contexts and retrieve the modeled names Leo and Ana.',
    purpose: 'Combine receptive people-word recognition with retrieval of two familiar spoken names; the learner identifies people, not greeting times.',
    recycling: 'Reuses the modeled Ana and Leo name audios also heard in Q014, but adds two receptive boy/girl identification targets and a different people-category relation.',
    entries: [
      ['boy', 'boy-person', 'Boy.', 'AUD-Y1M01-A625059AB21E', 'IMG-Y1M01-BOY-GIRL-001', 0, 'boy', 'Boy'],
      ['girl', 'girl-person', 'Girl.', 'AUD-Y1M01-84B9C53B6AC1', 'IMG-Y1M01-BOY-GIRL-001', 1, 'girl', 'Girl'],
      ['leo', 'leo-name', 'My name is Leo.', 'AUD-Y1M01-C07D80874CE7', 'IMG-Y1M01-NAME-TAGS-001', 2, 'Leo introduction', 'LEO name badge'],
      ['ana', 'ana-name', 'My name is Ana.', 'AUD-Y1M01-61E1B8064128', 'IMG-Y1M01-NAME-TAGS-001', 0, 'Ana introduction', 'ANA name badge']
    ]
  },
  Q009: {
    topic: 'Social Exchanges', phase: 'COMPREHENSION', mode: 3,
    target: 'Interpret four short spoken social exchanges by identifying a greeting, a name exchange, a morning context, or a farewell scene.',
    purpose: 'Comprehension of short utterances and dialogue in context; the four replayable audio cards are the stimuli, not an autoplay sequence.',
    recycling: 'Recontextualizes the hello and farewell functions in spoken exchanges while adding a name dialogue and a morning self-introduction; differs from Q007 in stimulus length, target set, and comprehension demand.',
    entries: [
      ['hello-dialogue', 'hello-dialogue-scene', 'Hello! Hi!', 'AUD-Y1M01-A611610DB0F8', 'IMG-Y1M01-DIALOGUE-HELLO-HI-001', 0, 'greeting dialogue', 'Greeting dialogue scene'],
      ['mia-exchange', 'mia-introduction-scene', "What's your name? My name is Mia.", 'AUD-Y1M01-A28016380DE8', 'IMG-Y1M01-INTRODUCTION-MIA-001', 0, 'Mia name exchange', 'Mia introduction scene'],
      ['leo-morning', 'leo-morning-scene', 'Good morning, my name is Leo.', 'AUD-Y1M01-08141B242251', 'IMG-Y1M01-GREETING-MORNING-001', 0, 'Leo morning introduction', 'Morning introduction scene'],
      ['ana-farewell', 'ana-leaving-school', 'Goodbye, Ana.', 'AUD-Y1M01-97345CB1900A', 'IMG-Y1M01-FAREWELL-ANA-001', 1, 'Ana farewell', 'Ana leaving-school scene']
    ]
  },
  Q014: {
    topic: 'Names', phase: 'REVIEW', mode: 2,
    target: 'Retrieve four modeled spoken name introductions by matching each speaker to the corresponding name badge.',
    purpose: 'Review and consolidate the four fictional names through direct name-to-badge retrieval.',
    recycling: 'Reuses Ana and Leo from Q008 and extends the set to Mia and Ben; unlike Q008, all four targets are names and every destination is a name badge.',
    entries: null
  }
};

const idFor = suffix => `Y1M01-${suffix}`;
const itemsById = new Map(data.items.map(item => [item.item_id, item]));
for (const [suffix, spec] of Object.entries(specs)) {
  const id = idFor(suffix);
  const item = itemsById.get(id);
  if (!item) throw new Error(`MISSING_QUESTION:${id}`);
  if (item.contentDifferentiation?.version === 'Y1M01_DDM_PEDAGOGICAL_DIVERSITY_V1') {
    throw new Error(`ALREADY_MIGRATED_REFUSE_OVERWRITE:${id}`);
  }
  if (!item.audioBindings || item.audioBindings.length !== 4 || !item.mediaBindings || item.mediaBindings.length !== 4) {
    throw new Error(`UNEXPECTED_SOURCE_NOT_4X4:${id}`);
  }
  const oldItems = item.audioBindings.map(binding => binding.audioId).sort();
  const expectedDuplicateSource = ['Q006', 'Q007', 'Q008', 'Q009'].includes(suffix)
    ? ['AUD-Y1M01-15C49EF914C3', 'AUD-Y1M01-52B269EBB3AE', 'AUD-Y1M01-685BAF0CD887', 'AUD-Y1M01-CE305BA925A9'].sort()
    : null;
  if (expectedDuplicateSource && JSON.stringify(oldItems) !== JSON.stringify(expectedDuplicateSource)) {
    throw new Error(`SOURCE_CHANGED_REVIEW_REQUIRED:${id}`);
  }
  if (spec.entries) {
    const [oldAna, oldMia, oldLeo, oldBen] = item.audioBindings;
    const currentNameSet = new Set([oldAna?.answerKey, oldMia?.answerKey, oldLeo?.answerKey, oldBen?.answerKey]);
    if (suffix === 'Q014' && !['ana', 'mia', 'leo', 'ben'].every(name => currentNameSet.has(name))) {
      throw new Error(`Q014_SOURCE_CHANGED_REVIEW_REQUIRED:${id}`);
    }
  } else {
    // Retain Q014's existing approved name/audio/media bindings; only author its pedagogical rationale.
    spec.entries = item.audioBindings.map((audio, index) => {
      const visual = item.mediaBindings.find(destination => destination.answerKey === audio.answerKey);
      if (!visual) throw new Error(`Q014_ORPHAN_BINDING:${audio.itemId}`);
      return [audio.answerKey, audio.targetId, audio.label, audio.audioId, visual.mediaId,
        visual.assetIndex ?? audio.assetIndex ?? 0, `${audio.answerKey} introduction`, visual.label];
    });
  }
  const audioBindings = spec.entries.map(([answerKey, targetId, label, audioId, mediaId, assetIndex, semanticTarget]) => {
    const itemId = `${id}-${answerKey}-audio`;
    return { role: 'draggable_audio', itemId, targetId, label, audioId, answerKey, mediaId, assetIndex, semanticTarget };
  });
  const mediaBindings = spec.entries.map(([answerKey, targetId, , , mediaId, assetIndex, semanticTarget, label]) => ({
    role: `destination_${answerKey.replace(/[^a-z0-9]+/giu, '-')}`,
    targetId, label, mediaId, assetIndex, answerKey, semanticTarget
  }));
  const mappings = audioBindings.map(({ itemId, targetId, answerKey }) => ({ itemId, targetId, answerKey }));
  const mediaByAnswer = new Map(mediaBindings.map(entry => [entry.answerKey, entry]));
  item.audioBindings = audioBindings;
  item.mediaBindings = mediaBindings;
  item.options = audioBindings.map(audio => {
    const media = mediaByAnswer.get(audio.answerKey);
    return { optionId: audio.answerKey, answerKey: audio.answerKey, label: audio.label,
      mediaId: media.mediaId, assetIndex: media.assetIndex, audioId: audio.audioId,
      targetId: audio.targetId, itemId: audio.itemId, semanticTarget: audio.semanticTarget, correct: true };
  });
  item.dragDropContract = { ...item.dragDropContract, version: 'DUDUQ_DRAG_DROP_MULTIMEDIA_CONTENT_CONTRACT_V2',
    mode: 'multi-match', draggableCount: 4, destinationCount: 4,
    mappingAuthority: 'explicit-one-to-one', mapping: mappings };
  const answerKey = audioBindings.map(entry => entry.answerKey).join('+');
  item.answerKey = item.correctAnswerKey = item.correctAnswerContract.answerKey = answerKey;
  item.correctAnswerKeys = audioBindings.map(entry => entry.answerKey);
  item.correctAnswerContract.mappings = mappings;
  item.stimulusContract.contentAudioIds = audioBindings.map(entry => entry.audioId);
  item.contentAudioId = null;
  item.topicEn = spec.topic;
  item.learningTarget = spec.target;
  item.pedagogicalPhase = spec.phase;
  item.exposureMode = spec.mode;
  item.answerSemantics = 'four explicit one-to-one audio-to-visual semantic associations';
  item.targetDelivery = { availableBeforeResponse: true,
    evidence: spec.mode === 3 ? 'four learner-playable approved dialogue/utterance audio cards are the stimuli; no autoplay sequence' : 'four learner-playable approved audio cards',
    autoDelivered: false };
  item.stimulusContract.postInstructionAutoDelivered = false;
  item.correctAnswerContract.answerKey = answerKey;
  item.contentDifferentiation = { version: 'Y1M01_DDM_PEDAGOGICAL_DIVERSITY_V1',
    activityPurpose: spec.purpose, recyclingRationale: spec.recycling,
    audioSemanticTargets: audioBindings.map(entry => entry.semanticTarget).sort(),
    visualSemanticTargets: mediaBindings.map(entry => entry.semanticTarget).sort() };
}

data.updatedAt = new Date().toISOString();
await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'MIGRATED', questions: Object.keys(specs), version: 'Y1M01_DDM_PEDAGOGICAL_DIVERSITY_V1' }, null, 2));

import { readFile, writeFile } from 'node:fs/promises';

const path = 'content/english/year-1/module-01/questions.json';
const doc = JSON.parse(await readFile(path, 'utf8'));
const byId = new Map(doc.items.map(item => [item.item_id, item]));
const greetings = [
  { key: 'hello', label: 'Hello!', visualLabel: 'Greeting scene', audioId: 'AUD-Y1M01-52B269EBB3AE', mediaId: 'IMG-Y1M01-GREETING-GENERIC-001', targetId: 'hello-scene' },
  { key: 'morning', label: 'Good morning!', visualLabel: 'Morning scene', audioId: 'AUD-Y1M01-685BAF0CD887', mediaId: 'IMG-Y1M01-GREETING-MORNING-001', targetId: 'morning-scene' },
  { key: 'afternoon', label: 'Good afternoon!', visualLabel: 'Afternoon scene', audioId: 'AUD-Y1M01-15C49EF914C3', mediaId: 'IMG-Y1M01-GREETING-AFTERNOON-001', targetId: 'afternoon-scene' },
  { key: 'farewell', label: 'Goodbye!', visualLabel: 'Farewell scene', audioId: 'AUD-Y1M01-CE305BA925A9', mediaId: 'IMG-Y1M01-FAREWELL-GENERIC-001', targetId: 'farewell-scene' }
];
const existingNameTargets = byId.get('Y1M01-Q014').mediaBindings;
const names = [
  { key: 'ana', label: 'My name is Ana.', audioId: 'AUD-Y1M01-61E1B8064128' },
  { key: 'mia', label: 'My name is Mia.', audioId: 'AUD-Y1M01-A28016380DE8' },
  { key: 'leo', label: 'My name is Leo.', audioId: 'AUD-Y1M01-C07D80874CE7' },
  { key: 'ben', label: 'My name is Ben.', audioId: 'AUD-Y1M01-7BA4E76F0926' }
].map(item => {
  const target = existingNameTargets.find(entry => entry.answerKey === item.key);
  if (!target) throw new Error(`APPROVED_NAME_DESTINATION_MISSING:${item.key}`);
  return { ...item, visualLabel: item.key.toUpperCase(), mediaId: target.mediaId, assetIndex: target.assetIndex || 0, targetId: target.targetId };
});

function applySet(id, set, topic, phase, learningTarget) {
  const item = byId.get(id);
  if (!item) throw new Error(`QUESTION_MISSING:${id}`);
  item.topicEn = topic;
  item.learningTarget = learningTarget;
  item.pedagogicalPhase = phase;
  item.exposureMode = 2;
  item.pedagogicalContractVersion = 'DUDUQ_UNIVERSAL_PEDAGOGICAL_EXPERIENCE_V1';
  item.audio_transcript = set.map(entry => entry.label).join(' / ');
  item.audioBindings = set.map(entry => ({
    role: 'draggable_audio', itemId: `${id}-${entry.key}-audio`, targetId: entry.targetId,
    label: entry.label, audioId: entry.audioId, answerKey: entry.key, mediaId: entry.mediaId,
    ...(entry.assetIndex ? { assetIndex: entry.assetIndex } : {})
  }));
  item.mediaBindings = set.map((entry, index) => ({
    role: `destination_${entry.key}`, targetId: entry.targetId, label: entry.visualLabel,
    mediaId: entry.mediaId, ...(entry.assetIndex ? { assetIndex: entry.assetIndex } : {}), answerKey: entry.key
  }));
  item.options = set.map(entry => ({ optionId: entry.key, answerKey: entry.key, label: entry.label,
    mediaId: entry.mediaId, ...(entry.assetIndex ? { assetIndex: entry.assetIndex } : {}),
    audioId: entry.audioId, targetId: entry.targetId, itemId: `${id}-${entry.key}-audio`, correct: true }));
  item.answerKey = set.map(entry => entry.key).join('+');
  item.correctAnswerKey = item.answerKey;
  item.correctAnswerKeys = set.map(entry => entry.key);
  item.dragDropContract = {
    version: 'DUDUQ_DRAG_DROP_MULTIMEDIA_CONTENT_CONTRACT_V2', mode: 'multi-match',
    draggableCount: 4, destinationCount: 4, mappingAuthority: 'explicit-one-to-one',
    mapping: item.audioBindings.map(({ itemId, targetId, answerKey }) => ({ itemId, targetId, answerKey }))
  };
}

for (const id of ['Y1M01-Q006', 'Y1M01-Q007', 'Y1M01-Q008']) {
  applySet(id, greetings, 'Greetings', id === 'Y1M01-Q006' ? 'GUIDED_PRACTICE' : 'RETRIEVAL',
    'Associate four spoken greetings with their corresponding greeting scenes.');
}
applySet('Y1M01-Q009', greetings, 'Greetings', 'CONSOLIDATION',
  'Retrieve and consolidate four greeting-to-scene associations.');
applySet('Y1M01-Q014', names, 'Names', 'GUIDED_PRACTICE',
  'Associate four spoken self-introductions with the corresponding name badges.');

const topicById = {
  'Y1M01-Q001': 'Greetings', 'Y1M01-Q002': 'Greetings', 'Y1M01-Q003': 'Greetings',
  'Y1M01-Q004': 'Greetings', 'Y1M01-Q005': 'Greetings', 'Y1M01-Q006': 'Greetings',
  'Y1M01-Q007': 'Greetings', 'Y1M01-Q008': 'Greetings', 'Y1M01-Q009': 'Greetings',
  'Y1M01-Q010': 'Greetings', 'Y1M01-Q011': 'Names', 'Y1M01-Q012': 'Names',
  'Y1M01-Q013': 'Names', 'Y1M01-Q014': 'Names', 'Y1M01-Q015': 'Introductions',
  'Y1M01-Q016': 'People', 'Y1M01-Q017': 'People', 'Y1M01-Q018': 'Introductions',
  'Y1M01-Q019': 'Greetings', 'Y1M01-Q020': 'Greetings'
};
for (const item of doc.items) {
  item.topicEn ||= topicById[item.item_id];
  if (!item.topicEn) throw new Error(`TOPIC_MISSING:${item.item_id}`);
  item.learningTarget ||= item.objetivo;
  item.mechanic ||= item.runtimeMechanic || item.mecanica_preferida;
  item.pedagogicalPhase ||= item.item_id === 'Y1M01-Q009' || item.item_id === 'Y1M01-Q020' ? 'CONSOLIDATION'
    : ['Y1M01-Q015', 'Y1M01-Q018', 'Y1M01-Q019'].includes(item.item_id) ? 'COMPREHENSION'
      : Number(item.item_id.slice(-3)) <= 5 ? 'GUIDED_PRACTICE' : 'RECOGNITION';
  item.exposureMode ||= ['Y1M01-Q010', 'Y1M01-Q011', 'Y1M01-Q013', 'Y1M01-Q015', 'Y1M01-Q018', 'Y1M01-Q019', 'Y1M01-Q020'].includes(item.item_id) ? 3 : 2;
  item.targetDelivery ||= { availableBeforeResponse: true, evidence: item.audioBindings?.length ? 'learner-playable approved audio card(s)' : item.audio_ref ? 'approved content audio binding' : 'visible option content', autoDelivered: item.item_id === 'Y1M01-Q015' };
  item.stimulusContract ||= { contentAudioIds: [...new Set([...(item.audioBindings || []).map(binding => binding.audioId), ...(item.audio_ref ? [item.audio_ref] : [])])], postInstructionAutoDelivered: item.item_id === 'Y1M01-Q015' };
  item.correctAnswerContract ||= { answerKey: item.answerKey, mappings: (item.audioBindings || []).map(binding => ({ itemId: binding.itemId, targetId: binding.targetId, answerKey: binding.answerKey })) };
  item.distractorContract ||= { optionIds: (item.options || []).filter(option => !option.correct).map(option => option.optionId), source: 'existing approved question options' };
  item.interactionGate ||= { instructionOrder: ['EN', 'PT'], requireCompletion: true, requiredStimulusCompletion: item.item_id === 'Y1M01-Q015' };
  item.feedbackGate ||= { lockAfterAnswer: true, releaseContinueOrRetryAfterFeedbackAudio: true, failSafe: 'audio error or duration-based timeout' };
}
await writeFile(path, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'MIGRATED', moduleId: doc.moduleId, questions: doc.items.length,
  ddmFourByFour: doc.items.filter(item => item.mecanica_preferida === 'drag-drop-multimedia').map(item => item.item_id), topics: doc.items.map(item => [item.item_id, item.topicEn]) }, null, 2));

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  contracts: 'content/english/production/v11-1b/deterministic-activity-contracts.json',
  requirements: 'content/english/production/v11-1b/audio-requirements.json',
  audit: 'content/english/production/v11-2/audio-dedup-and-reuse-audit.json',
  report: 'content/english/production/v11-2b/runtime-audio-extension.json'
};
const load = async rel => JSON.parse(await readFile(path.join(root, rel), 'utf8'));
const save = async (rel, value) => {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};
const norm = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16).toUpperCase();
const [contractsDoc, requirementsDoc, audit] = await Promise.all([load(paths.contracts), load(paths.requirements), load(paths.audit)]);
const byRequirement = new Map(requirementsDoc.requirements.map(row => [row.audioConceptId, row]));
const byCanonicalKey = new Map(audit.groups.map(row => [row.canonicalKey, row]));
const additions = [];
const linked = [];
for (const contract of contractsDoc.contracts.filter(row => row.mechanicId === 'smart-sentence-complete')) {
  const spokenTarget = contract.studentStimuli.sourceSentence;
  const semanticKey = [
    norm('en-US'), norm(spokenTarget), norm('SMART_SENTENCE_COMPLETED_EN'), norm('SENTENCE'),
    norm('DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3'), norm('NATURAL_CLEAR_V2'), norm('NATIVE_ENGLISH')
  ];
  const key = JSON.stringify(semanticKey);
  const canonicalKey = `A-${hash(key)}`;
  const audioConceptId = `AUD-EN-SSC-COMPLETION-${hash(norm(spokenTarget)).slice(0, 12)}`;
  const requirement = byRequirement.get(audioConceptId) || {
    audioConceptId, language: 'en-US', spokenTarget, role: 'SMART_SENTENCE_COMPLETED_EN', semanticType: 'SENTENCE',
    voice: 'DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3', deliveryProfile: 'NATURAL_CLEAR_V2',
    pronunciationMode: 'NATIVE_ENGLISH', assetStatus: 'ASSET_PENDING', reuseCandidates: [], assetDisposition: 'NEW_AUDIO_REQUIRED'
  };
  if (!byRequirement.has(audioConceptId)) { requirementsDoc.requirements.push(requirement); byRequirement.set(audioConceptId, requirement); additions.push(audioConceptId); }
  contract.requiredAudio.completedSentence = [requirement];
  if (!byCanonicalKey.has(canonicalKey)) {
    const users = contractsDoc.contracts.filter(row => row.mechanicId === 'smart-sentence-complete' && row.studentStimuli.sourceSentence === spokenTarget).map(row => row.itemId);
    const group = { canonicalKey, semanticKey, requirementIds: [audioConceptId], usedByItems: users,
      candidates: [], disposition: 'NEW_AUDIO_REQUIRED' };
    audit.groups.push(group); byCanonicalKey.set(canonicalKey, group);
  } else {
    const group = byCanonicalKey.get(canonicalKey);
    if (!group.requirementIds.includes(audioConceptId)) group.requirementIds.push(audioConceptId);
    for (const itemId of contractsDoc.contracts.filter(row => row.mechanicId === 'smart-sentence-complete' && row.studentStimuli.sourceSentence === spokenTarget).map(row => row.itemId)) {
      if (!group.usedByItems.includes(itemId)) group.usedByItems.push(itemId);
    }
  }
  linked.push({ audioConceptId, canonicalKey, spokenTarget, itemId: contract.itemId });
}
const audioRegistry = await load('content/english/audio/audio-registry.json');
const normalizedSpeech = value => norm(value).replace(/[.!?]+$/g, '');
const missingOptionIds = new Map();
for (const contract of contractsDoc.contracts.filter(row => row.mechanicId === 'smart-sentence-complete')) {
  const refs = [];
  for (const spokenTarget of [...new Set(contract.studentStimuli.options)]) {
    const exact = audioRegistry.entries.some(row => row.status === 'APPROVED' && row.locale === 'en-US' &&
      !/instruction/i.test(row.semanticRole || '') && normalizedSpeech(row.speechText || row.transcript) === normalizedSpeech(spokenTarget));
    if (exact) continue;
    const semanticKey = [norm('en-US'), norm(spokenTarget), norm('SMART_SENTENCE_OPTION_EN'), norm('LEXICAL_TARGET'),
      norm('DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3'), norm('NATURAL_CLEAR_V2'), norm('NATIVE_ENGLISH')];
    const canonicalKey = `A-${hash(JSON.stringify(semanticKey))}`;
    const audioConceptId = `AUD-EN-SSO-${hash(normalizedSpeech(spokenTarget)).slice(0, 12)}`;
    const requirement = byRequirement.get(audioConceptId) || {
      audioConceptId, language: 'en-US', spokenTarget, role: 'SMART_SENTENCE_OPTION_EN', semanticType: 'LEXICAL_TARGET',
      voice: 'DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3', deliveryProfile: 'NATURAL_CLEAR_V2',
      pronunciationMode: 'NATIVE_ENGLISH', assetStatus: 'ASSET_PENDING', reuseCandidates: [], assetDisposition: 'NEW_AUDIO_REQUIRED'
    };
    if (!byRequirement.has(audioConceptId)) { requirementsDoc.requirements.push(requirement); byRequirement.set(audioConceptId, requirement); additions.push(audioConceptId); }
    if (!byCanonicalKey.has(canonicalKey)) {
      const users = contractsDoc.contracts.filter(row => row.mechanicId === 'smart-sentence-complete' && row.studentStimuli.options.some(value => normalizedSpeech(value) === normalizedSpeech(spokenTarget))).map(row => row.itemId);
      audit.groups.push({ canonicalKey, semanticKey, requirementIds: [audioConceptId], usedByItems: users, candidates: [], disposition: 'NEW_AUDIO_REQUIRED' });
      byCanonicalKey.set(canonicalKey, audit.groups.at(-1));
    } else {
      const group = byCanonicalKey.get(canonicalKey);
      if (!group.requirementIds.includes(audioConceptId)) group.requirementIds.push(audioConceptId);
    }
    refs.push(requirement);
    missingOptionIds.set(audioConceptId, { audioConceptId, spokenTarget, canonicalKey, itemId: contract.itemId });
  }
  if (refs.length) contract.requiredAudio.optionTargets = refs;
}
requirementsDoc.count = requirementsDoc.requirements.length;
audit.sourceRequirementCount = requirementsDoc.count;
audit.canonicalConceptCount = audit.groups.length;
audit.duplicateRequirementCount = Math.max(0, requirementsDoc.count - audit.groups.length);
contractsDoc.runtimeAudioExtension = { feature: 'DUDUQ_PHYSICAL_ASSET_FACTORY_EXECUTION_V11_2B', createdAt: new Date().toISOString(), completionSentenceAudio: linked };
contractsDoc.runtimeAudioExtension.optionAudio = [...missingOptionIds.values()];
await save(paths.contracts, contractsDoc);
await save(paths.requirements, requirementsDoc);
await save(paths.audit, audit);
await save(paths.report, { schemaVersion: 'duduq-v11-2b-runtime-audio-extension-v1', createdAt: new Date().toISOString(),
  mechanic: 'smart-sentence-complete', uniqueSentenceAudio: additions.length, linkedContracts: linked.length,
  reuse: 'PT completion prompt reuses each contract’s PT instruction audio; English completed-sentence audio is generated as a separate semantic role.', additions: linked });
console.log(JSON.stringify({ uniqueSentenceAudio: new Set(linked.map(row => row.audioConceptId)).size, contractsLinked: linked.length,
  missingOptionAudio: missingOptionIds.size, newAudioConcepts: additions.length, audioRequirementCount: requirementsDoc.count, totalCanonicalGroups: audit.canonicalConceptCount }, null, 2));

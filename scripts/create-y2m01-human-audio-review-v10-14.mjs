import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const questions = await readJson('content/english/year-2/module-01/questions.json');
const registry = await readJson('content/english/audio/audio-registry.json');
const audioById = new Map((registry.entries || []).map(entry => [entry.audioId, entry]));
const rowsByAudioId = new Map();
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Za-z0-9]/g, '').toUpperCase();

for (const question of questions.items || []) {
  const itemById = new Map((question.items || []).map(item => [item.id, item]));
  const refs = [];
  for (const binding of question.audioBindings || []) {
    if (!binding.audioId || String(binding.role || '').startsWith('instruction_')) continue;
    const item = itemById.get(binding.itemId);
    refs.push({
      audioId: binding.audioId,
      role: binding.role || 'learner-content',
      expectedTarget: binding.semanticTarget || item?.semanticTarget || question.stimulus?.target || '',
      playback: ['drag-drop', 'memory-quest', 'drag-drop-multimedia'].includes(question.mechanicId) ? 'LEARNER_TRIGGERED_ON_DEMAND' : 'POST_INSTRUCTION_SEQUENCE',
      expectedInvocationsPerIntentionalPlay: 1
    });
  }
  for (const audioId of question.stimulus?.audioIds || []) {
    if (refs.some(ref => ref.audioId === audioId)) continue;
    const letter = String(audioId).replace('AUD-EN-LETTER-', '');
    refs.push({ audioId, role: 'sequenced-letter-name-target', expectedTarget: letter, playback: 'POST_INSTRUCTION_SEQUENCE', expectedInvocationsPerIntentionalPlay: 1 });
  }
  if (question.stimulus?.audioId && !refs.some(ref => ref.audioId === question.stimulus.audioId)) refs.push({ audioId: question.stimulus.audioId, role: 'learner-stimulus', expectedTarget: question.stimulus.target || '', playback: 'CONTRACT_STIMULUS', expectedInvocationsPerIntentionalPlay: 1 });
  for (const ref of refs) {
    const entry = audioById.get(ref.audioId);
    const asset = String(entry?.urlOrPath || entry?.outputPath || '').replaceAll('\\', '/');
    const absoluteAsset = asset ? path.resolve(asset) : '';
    const transcript = String(entry?.transcript || entry?.speechText || '');
    const target = ref.expectedTarget || transcript;
    const targetMatch = !ref.expectedTarget || !transcript || normalize(ref.expectedTarget) === normalize(transcript) || normalize(transcript).includes(normalize(ref.expectedTarget));
    let present = false;
    if (absoluteAsset) try { await access(absoluteAsset); present = true; } catch {}
    const use = {
      questionId: question.item_id,
      mechanicId: question.mechanicId,
      audioRole: ref.role,
      expectedEnglish: target,
      expectedTranscript: transcript || null,
      playbackComposition: ref.playback,
      expectedInvocationsPerIntentionalPlay: ref.expectedInvocationsPerIntentionalPlay,
      sourceBindingCountInQuestion: refs.filter(candidate => candidate.audioId === ref.audioId).length,
      technicalBindingStatus: entry && present && targetMatch && entry.status === 'APPROVED' ? 'PASS' : 'ISSUE'
    };
    const current = rowsByAudioId.get(ref.audioId) || {
      audioId: ref.audioId,
      assetPath: asset || null,
      registeredTranscript: transcript || null,
      engine: entry?.engine || null,
      profile: entry?.voiceProfile || entry?.productionVoiceProfile || null,
      language: entry?.language || null,
      registeredStatus: entry?.status || 'UNREGISTERED',
      reuse: /CANONICAL_LETTERS/.test(asset) ? 'REUSED_CANONICAL' : entry?.reused === true ? 'REUSED_APPROVED_ASSET' : 'EXISTING_REGISTERED_ASSET',
      uses: []
    };
    current.uses.push(use);
    current.technicalBindingStatus = current.uses.every(row => row.technicalBindingStatus === 'PASS') ? 'PASS' : 'ISSUE';
    current.humanPronunciationStatus = 'HUMAN_LISTENING_PENDING';
    current.humanPronunciationNote = 'Registry/transcript/file QA cannot certify English pronunciation, clarity, pacing, or absence of duplicate playback.';
    current.playControl = asset ? `/${asset}` : null;
    current.portugueseMeaning = /^[A-Z]$/.test(String(target).trim()) ? 'Letter identity; not a translation.' : null;
    rowsByAudioId.set(ref.audioId, current);
  }
}

const entries = [...rowsByAudioId.values()].sort((a, b) => a.audioId.localeCompare(b.audioId));
const report = {
  feature: 'DUDUQ_EARLY_YEARS_AUDIO_PEDAGOGY_CORRECTION_V10_14',
  moduleId: 'Y2M01',
  generatedAt: new Date().toISOString(),
  scope: 'All learner-content target audio and compositions in the active Y2M01 contract; instructions listed separately as production dependencies.',
  officialVoice: 'DUDUQ_GOLD_VOICE_v1',
  officialEngine: 'CHATTERBOX_MULTILINGUAL_V3',
  humanPronunciationStatus: 'HUMAN_LISTENING_PENDING',
  duplicatePlaybackFinding: 'AUTOMATED_INVOCATION_COUNT_PENDING_LIVE_QA; contract bindings specify exactly one invocation per intentional play.',
  technicalBindingStatus: entries.every(row => row.technicalBindingStatus === 'PASS') ? 'PASS' : 'ISSUE',
  pronunciationApproval: 'NOT_MACHINE_CERTIFIABLE',
  uniqueLearnerClipCount: entries.length,
  blockedInstructionAudio: questions.items.filter(row => row.instruction?.instructionAudioStatus?.startsWith('BLOCKED')).map(row => ({
    questionId: row.item_id,
    textEn: row.primaryInstructionEn,
    textPt: row.supportInstructionPt,
    status: row.instruction.instructionAudioStatus,
    existingInstructionAudioRetired: row.instruction.instructionAudioEnId == null && row.instruction.instructionAudioPtId == null
  })),
  notes: [
    'Q018 retired the LUCAS audio and now uses exactly one registered canonical English clip each for L, E, O with 360 ms spacing; optional Portuguese framing cue was not generated.',
    'Q004/Q010 letters and Q019 phrase cards are on-demand audio-only Grouping stimuli; contract data contains answers only for scoring and does not render them on draggable cards.',
    'Human listening is required for letter-name clarity and for the formerly suspect target clips.'
  ],
  entries
};
await mkdir('docs/qa', { recursive: true });
await mkdir('qa/y2m01', { recursive: true });
await writeFile('docs/qa/DUDUQ_Y2M01_HUMAN_AUDIO_REVIEW_V10_14.json', `${JSON.stringify(report, null, 2)}\n`);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cards = entries.map(row => {
  const uses = row.uses.map(use => `${use.questionId} / ${use.mechanicId} / ${use.audioRole} / ${use.playback}`).join('<br>');
  return `<article><header><strong>${escapeHtml(row.audioId)}</strong><span>${escapeHtml(row.language || 'language unresolved')}</span></header><h2>${escapeHtml(row.registeredTranscript || 'No transcript')}</h2><p>${uses}</p><audio controls preload="none" src="${escapeHtml(row.playControl || '')}"></audio><dl><dt>Expected English</dt><dd>${escapeHtml([...new Set(row.uses.map(use => use.expectedEnglish))].join(' / '))}</dd><dt>Portuguese note</dt><dd>${escapeHtml(row.portugueseMeaning || 'Only where meaning support helps; avoid forced translation.')}</dd><dt>Binding</dt><dd>${escapeHtml(row.technicalBindingStatus)}</dd><dt>Human pronunciation</dt><dd>HUMAN_LISTENING_PENDING</dd><dt>Voice / engine</dt><dd>${escapeHtml(`${row.profile || 'unresolved'} / ${row.engine || 'unresolved'}`)}</dd><dt>Asset</dt><dd>${escapeHtml(row.assetPath || 'UNRESOLVED')}</dd></dl></article>`;
}).join('\n');
const pending = report.blockedInstructionAudio.map(row => `<li><strong>${escapeHtml(row.questionId)}</strong>: ${escapeHtml(row.textEn)} / ${escapeHtml(row.textPt)} — ${escapeHtml(row.status)}; no stale instruction clip bound.</li>`).join('');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Y2M01 V10.14 Audio Review</title><style>body{margin:0;background:#eef4f0;color:#31473d;font:16px/1.45 Nunito,system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:24px}h1{font-size:clamp(1.5rem,3vw,2.2rem)}.notice{padding:14px 18px;border-radius:12px;background:#fff1c2}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:14px;margin-top:20px}article{background:#fffdf7;border:1px solid #decfa9;border-radius:16px;padding:16px;box-shadow:0 3px 0 #b8a68e}header{display:flex;justify-content:space-between;gap:8px}h2{font-size:1.2rem;margin:10px 0 4px}article p,dd{overflow-wrap:anywhere}audio{width:100%;min-height:44px}dl{display:grid;grid-template-columns:135px 1fr;gap:4px 10px}dt{font-weight:800}dd{margin:0;font-size:.9rem}.blocked{background:#fff;padding:16px;border-radius:12px}@media(max-width:480px){main{padding:14px}dl{grid-template-columns:1fr}.clip dd{margin-bottom:8px}}</style><main><h1>Y2M01 learner-audio review — V10.14</h1><p class="notice"><strong>Pronunciation and clarity are not approved by this report.</strong> Listen for English letter-name accuracy, intelligibility, pacing, clipping, and duplicate playback. Technical validity is not human pronunciation approval.</p><p>${entries.length} unique learner-content clips · DUDUQ_GOLD_VOICE_v1 · CHATTERBOX_MULTILINGUAL_V3 · human listening pending.</p><section class="blocked"><h2>Instruction recordings blocked pending Gold Voice</h2><ul>${pending}</ul><p>Generation failure: <code>spawn EPERM</code>; WSL reports <code>Wsl/Service/E_ACCESSDENIED</code>. No alternative TTS was used.</p></section><section class="grid">${cards}</section></main></html>`;
await writeFile('qa/y2m01/human-audio-review-v10-14.html', html);
console.log(JSON.stringify({ status: report.technicalBindingStatus, uniqueLearnerClipCount: entries.length, blockedInstructionCount: report.blockedInstructionAudio.length, humanPronunciation: report.humanPronunciationStatus }, null, 2));

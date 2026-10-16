import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const save = async (file, value) => {
  const absolute = path.join(root, file);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const activityIds = [
  'Y2M01-Q002', 'Y2M01-Q004', 'Y2M01-Q005', 'Y2M01-Q006', 'Y2M01-Q010', 'Y2M01-Q011',
  'Y2M01-Q012', 'Y2M01-Q014', 'Y2M01-Q015', 'Y2M01-Q016', 'Y2M01-Q018', 'Y2M01-Q019', 'Y2M01-Q020'
];
const doc = await readJson('content/english/year-2/module-01/questions.json');
const questions = doc.items ?? doc.questions ?? [];
const questionById = new Map(questions.map(item => [item.item_id ?? item.itemId ?? item.id, item]));
const audio = await readJson('duduq-audio/manifests/AUDIO_MANIFEST.json');
const audioById = new Map(audio.items.map(item => [item.id ?? item.audioId, item]));
const registry = await readJson('content/english/audio/audio-registry.json');
const registryById = new Map(registry.entries.map(item => [item.audioId, item]));
const cueId = 'AUD-PT-LETTER-CUE-EARLY-Y2';
const spellIds = ['AUD-EN-LETTER-L', 'AUD-EN-LETTER-E', 'AUD-EN-LETTER-O'];
const semanticPt = {
  'AUD-Y2M01-LEX-GOOD-NIGHT': 'boa noite',
  'AUD-Y2M01-LEX-SEE-YOU': 'até mais',
  'AUD-Y2M01-NAME-LEO': 'nome próprio: Leo'
};
const collectTargets = question => {
  const found = new Set();
  const visit = (node, parentKey = '') => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) visit(child, parentKey); return; }
    if (typeof node.audioId === 'string' && /^(AUD-EN-LETTER-[A-Z]|AUD-Y2M01-LEX-|AUD-Y1M01-)/.test(node.audioId) && !/instruction/i.test(parentKey)) found.add(node.audioId);
    for (const [key, value] of Object.entries(node)) visit(value, key);
  };
  for (const key of ['pairs', 'items', 'targets', 'options', 'grouping']) visit(question[key], key);
  return [...found];
};
const allRows = [];
for (const questionId of activityIds) {
  const question = questionById.get(questionId);
  if (!question) continue;
  const mechanic = question.mechanicId;
  const instructionEn = question.instruction?.instructionAudioEnId;
  const instructionPt = question.instruction?.instructionAudioPtId;
  for (const [role, id, language] of [['INSTRUCTION_EN', instructionEn, 'en-US'], ['INSTRUCTION_PT', instructionPt, 'pt-BR']]) {
    if (!id) continue;
    const entry = audioById.get(id);
    allRows.push({ questionId, mechanic, audioRole: role, semanticTarget: question.learningTarget,
      expectedEnglish: language === 'en-US' ? (entry?.speechText ?? entry?.displayText ?? null) : null,
      portugueseMeaning: language === 'pt-BR' ? (entry?.speechText ?? entry?.displayText ?? null) : null,
      audioIds: [id], actualPresentation: entry?.speechText ?? entry?.displayText ?? id,
      source: 'NEW', audioPath: entry?.audioPath ?? null, masterAudioPath: entry?.masterAudioPath ?? null,
      voiceVersion: entry?.voiceVersion ?? null, engine: entry?.engine ?? null, technicalStatus: entry?.qcStatus ?? 'MISSING',
      humanPronunciationStatus: 'TECHNICAL_PASS_HUMAN_PENDING' });
  }
  const targets = questionId === 'Y2M01-Q018' ? [] : collectTargets(question);
  for (const id of targets) {
    const entry = audioById.get(id);
    if (!entry) continue;
    const letter = /^AUD-EN-LETTER-([A-Z])$/.exec(id)?.[1] ?? null;
    const isLetter = Boolean(letter);
    const audioIds = isLetter ? [cueId, id] : [id];
    const cue = isLetter ? audioById.get(cueId) : null;
    allRows.push({ questionId, mechanic, audioRole: isLetter ? 'LEARNER_LETTER_WITH_PT_FRAME' : 'LEARNER_CONTENT_TARGET',
      semanticTarget: letter ?? entry.displayText ?? entry.speechText ?? id,
      expectedEnglish: letter ? `English letter name ${letter}` : (entry.displayText ?? entry.speechText ?? id),
      portugueseMeaning: letter ? null : (semanticPt[id] ?? null), audioIds,
      actualPresentation: isLetter ? `${cue?.speechText ?? 'A letra é'} [260 ms] ${letter} (English letter name)` : (entry.displayText ?? entry.speechText ?? id),
      source: isLetter ? 'COMPOSED' : 'ORIGINAL', audioPath: audioIds.map(audioId => audioById.get(audioId)?.audioPath ?? null),
      voiceVersion: entry.voiceVersion ?? null, engine: entry.engine ?? null,
      technicalStatus: [cue, entry].every(item => item && (item.status === 'APPROVED' || item.qcStatus === 'PASS' || item.qc?.pass === true))
        ? 'TECHNICAL_PASS_HUMAN_PENDING' : 'ISSUE',
      expectedPlaybackCount: 1, humanPronunciationStatus: 'HUMAN_LISTENING_PENDING' });
  }
}
allRows.push({ questionId: 'Y2M01-Q018', mechanic: 'target-shooter', audioRole: 'LEO_SPELLING_SEQUENCE',
  semanticTarget: 'LEO', expectedEnglish: 'L — E — O', portugueseMeaning: 'nome próprio: Leo', audioIds: spellIds,
  actualPresentation: 'L, 360 ms, E, 360 ms, O', source: 'COMPOSED', audioPath: spellIds.map(id => audioById.get(id)?.audioPath ?? null),
  interLetterGapMs: 360, expectedPlaybackCount: 1,
  technicalStatus: spellIds.every(id => audioById.has(id) && audioById.get(id).status === 'APPROVED') ? 'TECHNICAL_PASS_HUMAN_PENDING' : 'ISSUE',
  humanPronunciationStatus: 'HUMAN_LISTENING_PENDING' });

const manifest = { feature: 'DUDUQ_GOLD_VOICE_RECOVERY_AND_LETTER_AUDIO_V10_14B', generatedAt: new Date().toISOString(),
  voiceVersion: 'DUDUQ_GOLD_VOICE_v1', engine: 'CHATTERBOX_MULTILINGUAL_V3', deliveryProfile: 'NATURAL_CLEAR_V2',
  humanPronunciationStatus: 'PENDING_AUGUSTO_LISTENING', expectedPlaybackInvocationsPerLearnerClick: 1,
  earlyYearsLetterModel: { cueAudioId: cueId, cueText: 'A letra é...', target: 'canonical English letter-name MP3', cueTargetGapMs: 260 },
  q018: { questionId: 'Y2M01-Q018', target: 'LEO', audioIds: spellIds, interLetterGapMs: 360, status: 'HUMAN_QA_PENDING' },
  items: allRows };
await save('docs/qa/DUDUQ_Y2M01_HUMAN_AUDIO_REVIEW_V10_14B.json', manifest);

const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const payload = JSON.stringify(allRows.map(row => ({ ...row, urls: row.audioIds.map(id => {
  const entry = audioById.get(id);
  return entry?.audioPath ? `/${entry.audioPath.replace(/^\/+/, '')}` : null;
}) }))).replace(/</g, '\\u003c');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUDUQ Y2M01 Human Audio Review — V10.14B</title>
<style>body{font:16px/1.45 system-ui,sans-serif;background:#f4f7fb;color:#17253a;margin:0;padding:24px}main{max-width:1100px;margin:auto}h1{font-size:26px}.pending{padding:12px;border:2px solid #e3a12f;border-radius:10px;background:#fff8e7}.row{background:white;border:1px solid #ccd7e5;border-radius:12px;padding:16px;margin:12px 0;display:grid;grid-template-columns:1fr auto;gap:14px}.meta{color:#52647a;font-size:13px}.play{font:inherit;font-weight:700;border:0;border-radius:999px;background:#145fbd;color:white;padding:12px 20px;min-width:120px;cursor:pointer}.play[disabled]{opacity:.55}code{overflow-wrap:anywhere}@media(max-width:640px){body{padding:12px}.row{grid-template-columns:1fr}}</style>
<main><h1>DUDUQ · Y2M01 Gold Voice Review · V10.14B</h1><p class="pending">Pronunciation review: <b>HUMAN_LISTENING_PENDING</b>. Technical QC does not certify pronunciation. Use each play button to hear the actual runtime composition.</p><button id="stop" class="play">Stop audio</button><div id="list"></div></main>
<script>const rows=${payload};const list=document.getElementById('list');let current=null,token=0;function playSequence(urls,gap){const run=++token;if(current){current.pause();current=null}let i=0;const next=()=>{if(run!==token||i>=urls.length)return;const audio=new Audio(urls[i++]);current=audio;audio.addEventListener('ended',()=>{current=null;if(i<urls.length)setTimeout(next,gap)}, {once:true});audio.addEventListener('error',()=>{current=null}, {once:true});audio.play().catch(()=>{current=null})};next()}document.getElementById('stop').onclick=()=>{token++;if(current){current.pause();current.currentTime=0;current=null}};for(const row of rows){if(!row.urls?.length||row.urls.some(url=>!url))continue;const article=document.createElement('article');article.className='row';const text=document.createElement('div');text.innerHTML='<b>'+row.questionId+' · '+row.audioRole+'</b><div>'+String(row.actualPresentation||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</div><div class="meta">'+row.mechanic+' · '+row.source+' · '+row.technicalStatus+' · HUMAN_LISTENING_PENDING</div><div class="meta">Audio ID(s): '+row.audioIds.map(x=>'<code>'+x+'</code>').join(' → ')+'</div>';const button=document.createElement('button');button.className='play';button.textContent='Play';button.onclick=()=>playSequence(row.urls,row.interLetterGapMs??260);article.append(text,button);list.append(article)}</script></html>`;
await writeFile(path.join(root, 'qa/y2m01/human-audio-review-v10-14b.html'), html, 'utf8');
console.log(JSON.stringify({ manifest: 'docs/qa/DUDUQ_Y2M01_HUMAN_AUDIO_REVIEW_V10_14B.json', panel: 'qa/y2m01/human-audio-review-v10-14b.html', rows: allRows.length }, null, 2));

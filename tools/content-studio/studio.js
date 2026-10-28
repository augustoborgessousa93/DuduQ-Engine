const $ = selector => document.querySelector(selector);
const state = { token: null, inventory: null, activity: null, year: '', moduleId: '', itemId: '', mediaId: '', roleId: '', upload: null, objectUrl: null, preview: null, alpha: 'NOT_CHECKED' };
const api = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (state.token && url !== '/api/session') headers.set('x-duduq-admin-token', state.token);
  const response = await fetch(url, { cache: 'no-store', ...options, headers });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(payload?.error || `Falha HTTP ${response.status}`);
  return payload;
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const labelRole = use => `${use.roleLabel || use.roleId}${use.answerRole && !['UNSPECIFIED', 'STIMULUS'].includes(use.answerRole) ? ` · ${use.answerRole === 'CORRECT' ? 'correta' : use.answerRole === 'DISTRACTOR' ? 'distrator' : 'papel misto'}` : ''}`;
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 2600); }
function selectedQuestion() { return state.inventory?.questions.find(q => q.moduleId === state.moduleId && q.itemId === state.itemId) || null; }
function selectedUse() { return selectedQuestion()?.references.find(ref => ref.mediaId === state.mediaId && ref.roleId === state.roleId) || selectedQuestion()?.references.find(ref => ref.mediaId === state.mediaId) || null; }
function imageUrl(ref) { return ref?.previewUrl || ''; }
function answerImage(media) { return media?.previewUrl ? `<figure><img loading="lazy" src="${escapeHtml(media.previewUrl)}" alt="${escapeHtml(media.mediaId)}"><figcaption>${escapeHtml(media.mediaId)}${media.assetSha256 ? `<br>SHA ${escapeHtml(media.assetSha256.slice(0,12))}…` : ''}</figcaption></figure>` : ''; }
function renderAnswerKey(detail) {
  const body = $('#answerKeyBody'); const badge = $('#answerKeyStatus');
  if (!detail) { badge.textContent = 'Selecione uma atividade'; badge.className = 'answer-key-status'; body.innerHTML = '<p>O gabarito oficial aparecerá aqui, separado do jogo do aluno.</p>'; return; }
  const key = detail.answerKey || {};
  badge.textContent = key.status === 'IDENTIFIED' ? 'GABARITO IDENTIFICADO' : 'GABARITO NÃO IDENTIFICADO — REVISÃO NECESSÁRIA';
  badge.className = `answer-key-status ${key.status === 'IDENTIFIED' ? 'identified' : 'unresolved'}`;
  const instruction = `<div class="answer-key-instruction"><strong>${escapeHtml(detail.instruction?.en || detail.context || 'Enunciado não disponível')}</strong><small>${escapeHtml(detail.instruction?.pt || 'Apoio em português não informado')}</small></div>`;
  if (key.status !== 'IDENTIFIED') { body.innerHTML = `${instruction}<p>Não será inferido um gabarito. Uma substituição que dependa da resposta correta fica bloqueada até revisão.</p>`; return; }
  const response = `<div class="answer-key-response">RESPOSTA / ASSOCIAÇÃO CORRETA: ${escapeHtml(key.responseText || 'consulte a estrutura abaixo')}</div>`;
  let content = '';
  if (key.kind === 'CHOICE') content = `<div class="answer-key-grid">${key.alternatives.map(option => `<article class="answer-key-choice ${option.role === 'CORRECT' ? 'correct' : ''}"><h3><span>${escapeHtml(option.label || option.answerKey || option.id)}</span><em>${option.role === 'CORRECT' ? 'CORRETA' : option.role === 'DISTRACTOR' ? 'DISTRATORA' : 'REVISAR'}</em></h3><div class="answer-key-media">${(option.media || []).map(answerImage).join('')}</div></article>`).join('')}</div>`;
  else if (key.kind === 'GROUPING' || key.kind === 'DRAG_DROP_MATCHES' || key.kind === 'MULTI_MATCH') content = `<div class="answer-key-grid">${key.associations.map(item => `<article class="answer-key-choice correct"><h3><span>${escapeHtml(item.label || item.itemLabel || item.itemId)}</span><em>CORRETO</em></h3><span class="answer-key-group">${escapeHtml(item.groupLabel || item.targetLabel || 'DESTINO NÃO IDENTIFICADO')}</span><div class="answer-key-media">${(item.media || []).map(answerImage).join('')}</div>${item.audioId ? `<small>${escapeHtml(item.audioId)}</small>` : ''}</article>`).join('')}</div>`;
  else if (key.kind === 'PAIRS' || key.kind === 'MEMORY_PAIRS') content = `<div class="answer-key-grid">${key.pairs.map(pair => `<article class="answer-key-choice correct"><h3><span>${escapeHtml(pair.leftLabel ? `${pair.leftLabel} ↔ ${pair.rightLabel}` : pair.label || pair.pairId)}</span><em>PAR CORRETO</em></h3><div class="answer-key-media">${(pair.media || []).map(answerImage).join('')}${(pair.cards || []).flatMap(card => card.media || []).map(answerImage).join('')}</div></article>`).join('')}</div>`;
  else if (key.kind === 'ORDERED_SEQUENCE') content = `<div class="answer-key-sequence">${key.sequence.map((token, index) => `<b>${index + 1}. ${escapeHtml(token)}</b>`).join('')}</div>`;
  else content = `<div class="answer-key-grid">${(key.alternatives || []).map(option => `<article class="answer-key-choice ${option.role === 'CORRECT' ? 'correct' : ''}"><h3>${escapeHtml(option.label || option.answerKey || option.id)}<em>${option.role === 'CORRECT' ? 'CORRETA' : 'DISTRATORA'}</em></h3><div class="answer-key-media">${(option.media || []).map(answerImage).join('')}</div></article>`).join('')}</div>`;
  body.innerHTML = `${instruction}${response}${content}`;
}
async function loadActivityDetail() {
  const preview = $('#activityPreview');
  if (!state.moduleId || !state.itemId) { state.activity = null; renderAnswerKey(null); preview.hidden = true; return; }
  renderAnswerKey({ answerKey: { status: 'LOADING' }, instruction: { en: 'Carregando gabarito oficial…' } });
  $('#answerKeyStatus').textContent = 'Carregando…';
  try {
    const detail = await api(`/api/media/activity?moduleId=${encodeURIComponent(state.moduleId)}&itemId=${encodeURIComponent(state.itemId)}`);
    if (detail.moduleId !== state.moduleId || detail.itemId !== state.itemId) return;
    state.activity = detail; renderAnswerKey(detail);
    preview.href = detail.previewUrl; preview.hidden = !detail.previewAvailable;
    const previewHint = $('#previewHint'); previewHint.textContent = detail.previewHint || ''; previewHint.hidden = !detail.previewHint;
  } catch (error) { $('#answerKeyStatus').textContent = 'DETALHE INDISPONÍVEL'; $('#answerKeyStatus').className = 'answer-key-status unresolved'; $('#answerKeyBody').innerHTML = `<p>${escapeHtml(error.message)}</p>`; preview.hidden = true; $('#previewHint').hidden = true; }
}
function updateImageCard() {
  const q = selectedQuestion(); const use = selectedUse();
  $('#activityCard').classList.toggle('empty-state', !q);
  if (!q) {
    $('#activityCard').innerHTML = '<span class="empty-icon">▧</span><strong>Sua atividade aparece aqui</strong><p>Escolha ano, módulo e questão para ver o contexto pedagógico.</p>';
    $('#galleryBlock').hidden = true; $('#imageSelect').innerHTML = '<option value="">Selecione uma atividade</option>'; $('#imageSelect').disabled = true; return;
  }
  $('#activityCard').innerHTML = `<div class="activity-meta">${escapeHtml(q.moduleId)} · ${escapeHtml(q.itemId)} · ${escapeHtml(q.mechanicId || 'mecânica não informada')}</div><strong>${escapeHtml(q.context || 'Atividade curricular')}</strong><div class="activity-context">Papel pedagógico: ${escapeHtml(use ? labelRole(use) : 'selecione uma imagem')}<br>Questão: ${escapeHtml(q.itemId)}</div>`;
  const refs = q.references;
  $('#imageSelect').disabled = !refs.length;
  $('#imageSelect').innerHTML = refs.length ? refs.map((ref, i) => `<option value="${escapeHtml(ref.mediaId)}|${escapeHtml(ref.roleId)}" ${ref === use ? 'selected' : ''}>${escapeHtml(ref.mediaId)} — ${escapeHtml(labelRole(ref))}</option>`).join('') : '<option value="">Esta atividade não possui imagem vinculada</option>';
  $('#galleryBlock').hidden = refs.length === 0;
  $('#galleryCount').textContent = `${refs.length} posições`;
  $('#gallery').innerHTML = refs.map(ref => `<button type="button" class="thumb-button ${ref === use ? 'selected' : ''}" data-media="${escapeHtml(ref.mediaId)}" data-role="${escapeHtml(ref.roleId)}" title="${escapeHtml(labelRole(ref))}"><img loading="lazy" src="${escapeHtml(imageUrl(ref))}" alt=""><small>${escapeHtml(ref.roleLabel || ref.mediaId)}</small></button>`).join('');
  if (!use) { $('#currentStage').innerHTML = '<div class="image-placeholder">▧</div>'; $('#currentInfo').innerHTML = '<strong>Selecione uma imagem</strong><small>Esta atividade não possui uso de imagem detectável.</small>'; $('#zoomCurrent').disabled = true; $('#replaceButton').disabled = true; return; }
  $('#currentStage').innerHTML = `<img src="${escapeHtml(imageUrl(use))}" alt="${escapeHtml(use.mediaId)}">`;
  const meta = use.imageMetadata;
  const dimensions = meta?.width && meta?.height ? `${meta.width} × ${meta.height} · proporção ${meta.aspectRatio}` : 'dimensões não disponíveis';
  $('#currentInfo').innerHTML = `<strong>${escapeHtml(use.mediaId)} · ${escapeHtml(labelRole(use))}</strong><small>${escapeHtml(dimensions)} · ${meta?.bytes ? `${(meta.bytes/1024).toFixed(1)} KB` : 'tamanho indisponível'} · alpha ${escapeHtml(meta?.alpha || 'não verificado')}<br>SHA-256 ${escapeHtml(use.assetSha256 || 'indisponível')} · ${escapeHtml(use.declaredStatus)} · integridade ${escapeHtml(use.assetIntegrity)} · ${use.usageCount || 0} uso(s)</small>`;
  $('#zoomCurrent').disabled = false; $('#replaceButton').disabled = !state.upload;
}
function setNewPreview() {
  const upload = state.upload;
  if (!upload) { $('#newStage').innerHTML = '<div class="upload-prompt"><span>＋</span><strong>Adicionar imagem</strong><small>PNG ou WebP · até 40 MB</small></div>'; $('#newInfo').innerHTML = '<strong>Nenhum arquivo selecionado</strong><small>Resolução original preservada · sem conversão</small>'; $('#newStatus').textContent = 'Aguardando arquivo'; $('#replaceButton').disabled = true; return; }
  $('#newStage').innerHTML = `<img src="${state.objectUrl}" alt="Prévia da nova imagem">`;
  $('#newInfo').innerHTML = `<strong>${escapeHtml(upload.originalName)}</strong><small>${upload.width} × ${upload.height} · ${(upload.bytes / 1024 / 1024).toFixed(2)} MB · SHA-256 ${upload.sha256.slice(0, 16)}…</small>`;
  $('#newStatus').textContent = upload.alphaChannel ? 'Canal alpha detectado' : 'Alpha não detectado';
  $('#replaceButton').disabled = !selectedUse();
}
function populateYears() { $('#yearSelect').innerHTML = '<option value="">Todos os anos</option>' + [1,2,3,4,5].map(y => `<option value="${y}">${y}º ano</option>`).join(''); }
function populateModules() {
  const modules = state.inventory.modules.filter(m => !state.year || m.year === Number(state.year));
  $('#moduleSelect').innerHTML = '<option value="">Selecione um módulo</option>' + modules.map(m => `<option value="${m.moduleId}">${escapeHtml(m.moduleId)} · ${escapeHtml(m.title)}</option>`).join('');
  $('#moduleSelect').disabled = !state.year; $('#moduleSelect').value = state.moduleId;
}
function populateQuestions() {
  const questions = state.inventory.questions.filter(q => q.moduleId === state.moduleId);
  $('#questionSelect').innerHTML = '<option value="">Selecione uma atividade</option>' + questions.map(q => `<option value="${q.itemId}">${escapeHtml(q.itemId)} · ${escapeHtml(q.context || 'Atividade curricular')}</option>`).join('');
  $('#questionSelect').disabled = !state.moduleId; $('#questionSelect').value = state.itemId;
}
async function inspectUpload(file) {
  if (!file) return;
  if (!['image/png', 'image/webp'].includes(file.type) || !/\.(png|webp)$/i.test(file.name)) { toast('Use um arquivo PNG ou WebP.'); return; }
  if (file.size > 40 * 1024 * 1024) { toast('O limite de arquivo é 40 MB.'); return; }
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = async () => {
    let alpha = false;
    try { const canvas = document.createElement('canvas'); canvas.width = Math.min(img.naturalWidth, 64); canvas.height = Math.min(img.naturalHeight, 64); const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data; for (let i=3;i<pixels.length;i+=4) if (pixels[i] < 255) { alpha = true; break; } } catch { /* alpha becomes unknown, never claim transparency */ }
    const bytes = await file.arrayBuffer(); const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    const old = state.objectUrl; state.objectUrl = objectUrl; if (old) URL.revokeObjectURL(old);
    state.alpha = alpha ? 'PIXEL_ALPHA_CONFIRMED' : 'NO_TRANSPARENT_PIXEL_SAMPLED';
    state.upload = { file, originalName: file.name, width: img.naturalWidth, height: img.naturalHeight, bytes: file.size, sha256: hash, alphaChannel: alpha };
    setNewPreview();
    const warnings = [];
    if (img.naturalWidth < 512 || img.naturalHeight < 512) warnings.push('Resolução abaixo da recomendação de 512×512 px. O arquivo não será ampliado automaticamente.');
    if (!alpha) warnings.push('Não foi detectado pixel transparente na amostra. A imagem permanece intacta; verifique o fundo visual antes de confirmar.');
    $('#assetWarnings').hidden = warnings.length === 0; $('#assetWarnings').textContent = warnings.join(' ');
    uploadToLocal(file).catch(error => { state.upload = null; setNewPreview(); toast(error.message); });
  };
  img.onerror = () => { URL.revokeObjectURL(objectUrl); toast('O navegador não conseguiu decodificar este arquivo.'); };
  img.src = objectUrl;
}
async function uploadToLocal(file) {
  const result = await api(`/api/media/image-upload?filename=${encodeURIComponent(file.name)}&alpha=${encodeURIComponent(state.alpha)}`, { method: 'POST', headers: { 'content-type': file.type }, body: file });
  state.upload.server = result.entry; $('#replaceButton').disabled = !selectedUse(); toast('Imagem validada e salva localmente, sem alteração no repositório.');
}
function setScopeVisibility() {
  const scope = document.querySelector('input[name="scope"]:checked')?.value;
  $('#roleChoice').hidden = scope !== 'QUESTION_ONLY';
  $('#aliasChoice').hidden = scope !== 'ALL_USAGES' || !state.usage?.exactShaAliases.length;
  const roles = new Set((state.usage?.uses || []).filter(u => u.answerRole === 'CORRECT').map(u => u.roleId));
  const distractors = new Set((state.usage?.uses || []).filter(u => u.answerRole === 'DISTRACTOR').map(u => u.roleId));
  const mixed = roles.size && distractors.size;
  $('#semanticChoice').hidden = scope !== 'ALL_USAGES' || !mixed;
  if (!mixed) $('#semanticConfirm').checked = false;
}
function updateRoleChecks() {
  const q = selectedQuestion(); const refs = q?.references.filter(ref => ref.mediaId === state.mediaId) || [];
  $('#roleChecks').innerHTML = refs.map((ref, i) => `<label class="role-check"><input type="checkbox" value="${escapeHtml(ref.roleId)}" ${i === 0 ? 'checked' : ''}><span>${escapeHtml(labelRole(ref))}</span></label>`).join('');
}
function affectedRows(uses) {
  return uses.map(use => `<div class="affected-row"><span>${escapeHtml(use.moduleId)}</span><span>${escapeHtml(use.itemId)}</span><span class="affected-role">${escapeHtml(use.roleLabel || use.roleId)}</span><span class="affected-answer">${escapeHtml(use.answerRole || 'não identificado')}</span><span class="affected-key ${use.answerKey?.status === 'IDENTIFIED' ? '' : 'unresolved'}">${escapeHtml(use.answerKey?.responseText || 'Gabarito não identificado — revisão necessária')}</span></div>`).join('');
}
async function openImpact() {
  const use = selectedUse(); if (!use || !state.upload?.server) return toast('Selecione uma imagem e aguarde a validação do arquivo.');
  state.usage = await api(`/api/media/image-usage?mediaId=${encodeURIComponent(state.mediaId)}`);
  $('#dialogContext').textContent = `${state.moduleId} · ${state.itemId} · ${use.mediaId} · ${labelRole(use)}`;
  $('#allCount').textContent = `${state.usage.counts.questions} questões · ${state.usage.counts.modules} módulos · ${state.usage.counts.positions} posições`;
  $('#oneCount').textContent = `Somente ${state.moduleId}/${state.itemId}`;
  $('#aliasCount').textContent = `${state.usage.counts.aliasQuestions} questões / ${state.usage.counts.aliasPositions} posições`;
  $('#impactBefore').src = imageUrl(use); $('#impactAfter').src = state.objectUrl;
  $('#includeAliases').checked = false; $('#semanticConfirm').checked = false; state.preview = null;
  updateRoleChecks(); setScopeVisibility(); renderAffectedList(); $('#impactError').hidden = true; $('#previewImpact').textContent = 'Calcular impacto →';
  $('#impactDialog').showModal();
}
function chosenUses() {
  const scope = document.querySelector('input[name="scope"]:checked')?.value;
  if (scope === 'QUESTION_ONLY') { const roleIds = [...$('#roleChecks').querySelectorAll('input:checked')].map(el => el.value); return (state.usage?.uses || []).filter(use => use.moduleId === state.moduleId && use.itemId === state.itemId && roleIds.includes(use.roleId)); }
  const selected = [...(state.usage?.uses || [])];
  if ($('#includeAliases').checked) selected.push(...(state.usage?.exactShaAliasUses || []));
  return selected;
}
function renderAffectedList() {
  const uses = chosenUses(); $('#affectedCount').textContent = `${uses.length} posições`;
  $('#affectedList').innerHTML = uses.length ? affectedRows(uses) : '<div class="history-empty">Nenhuma posição marcada. Selecione ao menos uma.</div>';
  $('#impactCounts').textContent = `${new Set(uses.map(u => `${u.moduleId}/${u.itemId}`)).size} questão(s) · ${new Set(uses.map(u => u.moduleId)).size} módulo(s) · ${uses.length} posição(ões)`;
  $('#impactFootnote').textContent = $('#includeAliases').checked ? 'Inclui referências distintas que apontam para arquivo idêntico por SHA-256.' : 'Aliases exatos ficam fora, salvo seleção explícita.';
}
async function calculateImpact() {
  const scope = document.querySelector('input[name="scope"]:checked')?.value;
  const body = { sourceMediaId: state.mediaId, scope, moduleId: state.moduleId, itemId: state.itemId,
    roleIds: [...$('#roleChecks').querySelectorAll('input:checked')].map(el => el.value),
    includeExactShaAliases: $('#includeAliases').checked,
    semanticResolution: $('#semanticConfirm').checked ? 'SAME_CONCEPT_KEEP_ANSWER_ROLES' : null,
    assetUploadId: state.upload.server.uploadId };
  try {
    const result = await api('/api/media/image-replacement/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    state.preview = result; $('#impactCounts').textContent = `${result.plan.counts.questions} questão(s) · ${result.plan.counts.modules} módulo(s) · ${result.plan.counts.positions} posição(ões)`;
    $('#affectedList').innerHTML = affectedRows(result.plan.positions);
    $('#affectedCount').textContent = `${result.plan.positions.length} posições`;
    $('#impactFootnote').textContent = result.githubStageReady ? 'Confirmação explícita necessária; o próximo passo cria um PR em rascunho.' : `Prévia calculada; GitHub ainda não está pronto para staging (${result.githubStatus}).`;
    $('#previewImpact').textContent = 'Revisar confirmação →'; $('#impactError').hidden = true;
  } catch (error) { $('#impactError').textContent = error.message; $('#impactError').hidden = false; }
}
function openConfirm() {
  if (!state.preview) return calculateImpact();
  const p = state.preview.plan; $('#confirmSummary').innerHTML = `<b>${escapeHtml(p.scope === 'ALL_USAGES' ? 'Substituição global' : 'Substituição somente nesta questão')}</b><br>${p.counts.questions} questão(s), ${p.counts.modules} módulo(s), ${p.counts.positions} posição(ões).<br>Imagem: SHA-256 ${escapeHtml(p.uploadedSha256)}<br>Arquivo original preservado. Nenhuma produção será publicada.`;
  $('#confirmText').value = ''; $('#stageButton').disabled = true; $('#stageError').hidden = true;
  $('#impactDialog').close(); $('#confirmDialog').showModal();
}
async function stage() {
  if (!state.preview || !state.upload?.server) return;
  $('#stageButton').disabled = true; $('#stageError').hidden = true;
  try {
    const result = await api('/api/media/image-replacement/stage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ previewId: state.preview.previewId, confirmed: true, confirmation: $('#confirmText').value }) });
    $('#confirmDialog').close(); toast('Revisão editorial criada. Produção permanece inalterada.'); await loadHistory(); await loadGithubStatus();
    const pr = result.revision?.github?.pullRequestUrl;
    if (pr) window.open(pr, '_blank', 'noopener,noreferrer');
  } catch (error) { $('#stageError').textContent = error.message; $('#stageError').hidden = false; $('#stageButton').disabled = $('#confirmText').value !== 'CRIAR BRANCH E PR'; }
}
async function loadHistory() {
  try { const { revisions } = await api('/api/media/replacements');
    $('#historyList').innerHTML = revisions.length ? revisions.map(r => `<article class="history-item"><strong>${escapeHtml(r.scope)} · ${escapeHtml(r.source?.mediaId)}</strong><small>GitHub: ${escapeHtml(r.github?.status || r.status || 'STATUS INDISPONÍVEL')} · ${escapeHtml(new Date(r.stagedAt || r.createdAt).toLocaleString('pt-BR'))}</small><small>QA: ${escapeHtml(r.qa?.status || 'NOT_RUN')} · Produção: ${r.production?.published ? 'PUBLICADA' : 'NÃO PUBLICADA'}</small>${r.github?.pullRequestUrl ? `<a href="${escapeHtml(r.github.pullRequestUrl)}" target="_blank" rel="noopener">Abrir PR #${escapeHtml(r.github.pullRequestNumber)} ↗</a>` : ''}<br><small>${escapeHtml(r.counts?.questions || 0)} questões / ${escapeHtml(r.asset?.sha256 || '')}</small>${r.rollbackAvailable ? `<button type="button" class="text-button rollback-button" data-revision="${escapeHtml(r.revisionId)}">Reverter / cancelar PR</button>` : ''}</article>`).join('') : '<div class="history-empty">Nenhuma revisão editorial neste computador.</div>';
  } catch { $('#historyList').innerHTML = '<div class="history-empty">Histórico local indisponível.</div>'; }
}
async function rollback(revisionId) {
  const confirmText = prompt(`Para solicitar reversão, digite: REVERTER ${revisionId}`);
  if (!confirmText) return;
  try { const result = await api(`/api/media/image-replacement/${encodeURIComponent(revisionId)}/rollback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmed: true, confirmation: confirmText }) }); toast(result.status || 'Reversão registrada.'); await loadHistory(); }
  catch (error) { toast(error.message); }
}
async function loadGithubStatus() {
  try { const s = await api('/api/media/github-status'); $('#githubStatus').textContent = s.apiStatus === 'READY' ? (s.stageReady ? 'Autenticado · pronto' : 'Autenticado · branch precisa estar limpa') : s.apiStatus; $('#githubStatus').className = `status-value ${s.stageReady ? 'safe' : 'pending'}`; $('#branchStatus').textContent = `${s.branch || '—'}${s.clean ? ' · limpa' : ' · alterações locais'}`; }
  catch { $('#githubStatus').textContent = 'Não disponível'; }
}
async function boot() {
  try {
    const session = await api('/api/session'); state.token = session.token;
    state.inventory = await api('/api/media/image-inventory');
    $('#corpusStat').textContent = `${state.inventory.moduleCount} módulos · ${state.inventory.questionCount} atividades`;
    $('#baseHash').textContent = state.inventory.v19ManifestSha256.slice(0, 16) + '…'; populateYears();
    const unique = new Set(state.inventory.questions.flatMap(q => q.references.map(r => r.mediaId))).size;
    $('#galleryCount').textContent = `${unique} imagens indexadas`;
    await Promise.all([loadHistory(), loadGithubStatus()]);
  } catch (error) { $('#corpusStat').textContent = 'Base indisponível'; $('#baseHash').textContent = error.message; toast(error.message); }
}

$('#yearSelect').addEventListener('change', event => { state.year = event.target.value; state.moduleId = ''; state.itemId = ''; state.mediaId = ''; state.roleId = ''; populateModules(); populateQuestions(); updateImageCard(); loadActivityDetail(); });
$('#moduleSelect').addEventListener('change', event => { state.moduleId = event.target.value; state.itemId = ''; state.mediaId = ''; state.roleId = ''; populateQuestions(); updateImageCard(); loadActivityDetail(); });
$('#questionSelect').addEventListener('change', event => { state.itemId = event.target.value; const q = selectedQuestion(); state.mediaId = q?.references[0]?.mediaId || ''; state.roleId = q?.references[0]?.roleId || ''; populateQuestions(); updateImageCard(); setNewPreview(); });
$('#questionSelect').addEventListener('change', () => loadActivityDetail());
  $('#imageSelect').addEventListener('change', event => { const [mediaId, roleId] = event.target.value.split('|'); state.mediaId = mediaId; state.roleId = roleId; updateImageCard(); });
$('#gallery').addEventListener('click', event => { const button = event.target.closest('[data-media]'); if (!button) return; state.mediaId = button.dataset.media; state.roleId = button.dataset.role; updateImageCard(); });
$('#fileInput').addEventListener('change', event => inspectUpload(event.target.files?.[0]));
$('#dropZone').addEventListener('dragover', event => { event.preventDefault(); $('#dropZone').classList.add('dragging'); });
$('#dropZone').addEventListener('dragleave', () => $('#dropZone').classList.remove('dragging'));
$('#dropZone').addEventListener('drop', event => { event.preventDefault(); $('#dropZone').classList.remove('dragging'); inspectUpload(event.dataTransfer.files?.[0]); });
$('#refreshButton').addEventListener('click', () => { state.inventory = null; boot(); });
$('#replaceButton').addEventListener('click', openImpact);
$('#impactDialog').addEventListener('change', event => { if (event.target.name === 'scope' || event.target.id === 'includeAliases' || event.target.id === 'semanticConfirm' || event.target.closest('#roleChecks')) { state.preview = null; setScopeVisibility(); renderAffectedList(); $('#previewImpact').textContent = 'Calcular impacto →'; } });
$('#previewImpact').addEventListener('click', () => state.preview ? openConfirm() : calculateImpact());
$('#cancelImpact').addEventListener('click', () => $('#impactDialog').close());
$('#confirmText').addEventListener('input', event => { $('#stageButton').disabled = event.target.value !== 'CRIAR BRANCH E PR'; });
$('#stageButton').addEventListener('click', stage);
$('#closeConfirm').addEventListener('click', () => $('#confirmDialog').close()); $('#cancelConfirm').addEventListener('click', () => $('#confirmDialog').close());
$('#historyList').addEventListener('click', event => { const button = event.target.closest('[data-revision]'); if (button) rollback(button.dataset.revision); });
$('#zoomCurrent').addEventListener('click', () => { const use = selectedUse(); if (!use) return; $('#zoomImage').src = imageUrl(use); $('#zoomCaption').textContent = `${use.mediaId} · ${use.assetSha256}`; $('#zoomDialog').showModal(); });
$('#closeZoom').addEventListener('click', () => $('#zoomDialog').close());
boot();

import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildEditorialOverlay, buildReplacementPlan, loadMediaReplacementIndex, storeReplacementUpload, summarizeUsage, validateReplacementAsset } from './media-replacement.mjs';
import { buildAnswerKeyView } from './answer-key-view.mjs';

const OWNER = 'augustoborgessousa93';
const REPOSITORY = 'DuduQ-Engine';
const BASE_BRANCH = 'feat/duduq-media-studio-smart-replace-20261028';
const V19_MANIFEST_SHA = 'CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E';
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const previews = new Map();
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
const idSafe = value => /^[A-Za-z0-9_-]{1,80}$/.test(String(value || ''));

function reply(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function readJson(req, limit = 1_000_000) {
  const parts = []; let size = 0;
  for await (const part of req) { size += part.length; if (size > limit) throw new Error('Corpo excede o limite de segurança.'); parts.push(part); }
  return JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
}

async function readBinary(req) {
  const parts = []; let size = 0;
  for await (const part of req) { size += part.length; if (size > MAX_UPLOAD_BYTES) throw new Error('Arquivo excede 40 MB.'); parts.push(part); }
  return Buffer.concat(parts, size);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', ...options.env }, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [], stderr = []; let bytes = 0;
    child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes <= 1_000_000) stdout.push(chunk); });
    child.stderr.on('data', chunk => { if (stderr.reduce((n, part) => n + part.length, 0) < 100_000) stderr.push(chunk); });
    if (options.input) child.stdin.end(options.input); else child.stdin.end();
    child.on('error', reject);
    child.on('close', code => {
      const out = Buffer.concat(stdout).toString('utf8');
      if (code !== 0) reject(new Error(`${command} ${args.join(' ')} falhou (${code}): ${Buffer.concat(stderr).toString('utf8').slice(0, 2000)}`));
      else resolve(out.trim());
    });
  });
}

async function githubCredential() {
  try {
    const output = await run('git', ['credential', 'fill'], { cwd: process.cwd(), input: 'protocol=https\nhost=github.com\n\n' });
    const values = Object.fromEntries(output.split(/\r?\n/).map(line => { const i = line.indexOf('='); return i > 0 ? [line.slice(0, i), line.slice(i + 1)] : ['', '']; }).filter(([key]) => key));
    return values.password ? { token: values.password, username: values.username || null } : null;
  } catch { return null; }
}

async function githubApi(token, endpoint, init = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...init,
    headers: { 'accept': 'application/vnd.github+json', 'authorization': `Bearer ${token}`, 'x-github-api-version': '2022-11-28', ...(init.headers || {}) }
  });
  const text = await response.text();
  let body; try { body = JSON.parse(text || '{}'); } catch { body = { message: text.slice(0, 1000) }; }
  if (!response.ok) throw Object.assign(new Error(`GitHub API ${response.status}: ${body.message || response.statusText}`), { statusCode: response.status, response: body });
  return body;
}

async function statusRecordPath(dataDir, revisionId) {
  return path.join(dataDir, 'media-replacements', 'revisions', `${revisionId}.json`);
}

async function readGithubStatus(root) {
  const branch = await run('git', ['branch', '--show-current'], { cwd: root }).catch(() => 'UNKNOWN');
  const head = await run('git', ['rev-parse', 'HEAD'], { cwd: root }).catch(() => null);
  const dirty = Boolean(await run('git', ['status', '--porcelain'], { cwd: root }).catch(() => 'UNAVAILABLE'));
  const onRequiredBranch = branch === BASE_BRANCH;
  const credential = await githubCredential();
  let repoPushPermission = false, account = null, apiStatus = credential ? 'TOKEN_PRESENT' : 'AUTH_REQUIRED';
  if (credential) {
    try {
      const repo = await githubApi(credential.token, `/repos/${OWNER}/${REPOSITORY}`);
      repoPushPermission = repo.permissions?.push === true;
      account = repo.full_name;
      apiStatus = repoPushPermission ? 'READY' : 'NO_PUSH_PERMISSION';
    } catch (error) { apiStatus = error.statusCode === 401 ? 'TOKEN_INVALID' : `API_${error.statusCode || 'ERROR'}`; }
  }
  return { branch, head, clean: !dirty, requiredBranch: BASE_BRANCH, onRequiredBranch, repo: account || `${OWNER}/${REPOSITORY}`, apiStatus, pushPermission: repoPushPermission, stageReady: onRequiredBranch && !dirty && repoPushPermission, productionWrites: false, cloudflareDeploy: false };
}

async function currentIndex(context) {
  if (!context.indexPromise) context.indexPromise = loadMediaReplacementIndex({ v19Root: context.v19Root, moduleIndexPath: context.moduleIndexPath });
  return context.indexPromise;
}

async function inspectPagesPreview(url) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(url, { redirect: 'manual', signal: controller.signal, cache: 'no-store' });
    return { available: response.ok, fitWrapper: response.headers.get('x-duduq-fit') === '1', httpStatus: response.status };
  } catch { return { available: false, fitWrapper: false, httpStatus: null }; }
  finally { clearTimeout(timer); }
}

async function uploadRecord(context, uploadId) {
  if (!/^upl-[a-f0-9]{64}$/.test(uploadId || '')) throw new Error('ID de upload inválido.');
  const directory = path.join(context.dataDir, 'media-replacements', 'uploads');
  const metadata = await json(path.join(directory, `${uploadId.slice(4)}.json`));
  if (metadata.uploadId !== uploadId || metadata.sha256 !== uploadId.slice(4) || !/^[a-f0-9]{64}\.(?:png|webp)$/.test(metadata.filename || '')) throw new Error('Registro de upload inconsistente.');
  const file = path.join(directory, metadata.filename); const bytes = await readFile(file);
  if (sha(bytes) !== metadata.sha256) throw new Error('SHA-256 do arquivo salvo diverge dos metadados; upload bloqueado.');
  return { metadata, file, bytes };
}

async function listHistory(dataDir) {
  const directory = path.join(dataDir, 'media-replacements', 'revisions');
  await mkdir(directory, { recursive: true });
  const records = [];
  for (const file of await readdir(directory)) if (file.endsWith('.json')) {
    try { const record = await json(path.join(directory, file)); records.push(record); } catch { /* invalid local status is not exposed */ }
  }
  return records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function saveRevisionRecord(context, revisionId, record) {
  const file = await statusRecordPath(context.dataDir, revisionId);
  await writeFile(file, JSON.stringify(record, null, 2) + '\n');
}

async function rollbackRevision(context, revisionId, original, token) {
  const prNumber = Number(original.github?.pullRequestNumber);
  if (!Number.isInteger(prNumber) || !original.github?.commitSha || !original.github?.branch) throw new Error('Revisão sem PR/commit verificável; nada foi alterado.');
  const pr = await githubApi(token, `/repos/${OWNER}/${REPOSITORY}/pulls/${prNumber}`);
  if (!pr.merged_at) {
    if (pr.state === 'open') await githubApi(token, `/repos/${OWNER}/${REPOSITORY}/pulls/${prNumber}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: 'closed' }) });
    const next = { ...original, status: 'CANCELLED', rollbackAvailable: false, statusUpdatedAt: new Date().toISOString(), rollback: { kind: 'DRAFT_PR_CLOSED', pullRequestNumber: prNumber, completedAt: new Date().toISOString() }, github: { ...original.github, status: 'PR_CLOSED' } };
    await saveRevisionRecord(context, revisionId, next);
    return { status: 'PR_CLOSED', revision: next };
  }

  const branch = `editorial/rollback-${revisionId.replace(/[^A-Za-z0-9-]/g, '-')}`;
  const worktreePath = path.join(context.dataDir, 'media-replacements', 'git-worktrees', `rollback-${revisionId}`);
  await run('git', ['fetch', 'origin', BASE_BRANCH], { cwd: context.root });
  await mkdir(path.dirname(worktreePath), { recursive: true });
  await run('git', ['worktree', 'add', '-b', branch, worktreePath, `origin/${BASE_BRANCH}`], { cwd: context.root });
  try {
    await run('git', ['-c', 'user.name=DUDUQ Media Studio', '-c', 'user.email=duduq-media-studio@users.noreply.github.com', 'revert', '--no-edit', original.github.commitSha], { cwd: worktreePath });
    const revertCommit = await run('git', ['rev-parse', 'HEAD'], { cwd: worktreePath });
    await run('git', ['push', '--set-upstream', 'origin', branch], { cwd: worktreePath });
    const body = [
      '## Compensating editorial rollback', '',
      `- Original revision: ${revisionId}`, `- Reverts commit: ${original.github.commitSha}`,
      `- Revert commit: ${revertCommit}`, '- History and immutable source asset are retained.',
      '- This draft PR does not deploy to Cloudflare or alter official links.'
    ].join('\n');
    const rollbackPr = await githubApi(token, `/repos/${OWNER}/${REPOSITORY}/pulls`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: `Editorial rollback — ${revisionId}`, head: branch, base: BASE_BRANCH, body, draft: true }) });
    const next = { ...original, status: 'ROLLBACK_PR_OPENED', rollbackAvailable: false, statusUpdatedAt: new Date().toISOString(), rollback: { kind: 'COMPENSATING_DRAFT_PR', branch, commitSha: revertCommit, pullRequestUrl: rollbackPr.html_url, pullRequestNumber: rollbackPr.number, createdAt: new Date().toISOString() } };
    await saveRevisionRecord(context, revisionId, next);
    return { status: 'ROLLBACK_PR_OPENED', revision: next };
  } finally {
    // Keep the rollback branch/worktree as recoverable audit evidence.
  }
}

async function stageOnGitHub(context, preview, upload) {
  const rootStatus = await readGithubStatus(context.root);
  if (!rootStatus.stageReady) throw Object.assign(new Error(`Staging bloqueado: ${JSON.stringify({ branch: rootStatus.branch, clean: rootStatus.clean, apiStatus: rootStatus.apiStatus, pushPermission: rootStatus.pushPermission })}`), { statusCode: 409 });
  if (rootStatus.head !== preview.expectedHead) throw Object.assign(new Error('A branch mudou depois da prévia; gere um novo plano antes de confirmar.'), { statusCode: 409 });
  const token = (await githubCredential())?.token;
  if (!token) throw Object.assign(new Error('Sessão GitHub local não encontrada pelo Git Credential Manager.'), { statusCode: 401 });
  const ref = await githubApi(token, `/repos/${OWNER}/${REPOSITORY}/git/ref/heads/${BASE_BRANCH}`);
  if (ref.object?.sha !== preview.expectedHead) throw Object.assign(new Error('A branch remota avançou após a prévia; recarregue e gere o impacto novamente.'), { statusCode: 409 });
  const revisionId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const branch = `editorial/media-${revisionId.replace(/[^A-Za-z0-9-]/g, '-')}`;
  const worktreePath = path.join(context.dataDir, 'media-replacements', 'git-worktrees', revisionId);
  const author = await run('git', ['config', '--get', 'user.name'], { cwd: context.root }).catch(() => 'DUDUQ Media Studio');
  const authorEmail = await run('git', ['config', '--get', 'user.email'], { cwd: context.root }).catch(() => 'duduq-media-studio@users.noreply.github.com');
  const assetPath = preview.plan.assetPath;
  if (!assetPath?.startsWith('content/english/assets/images/approved/') || assetPath.split('/').some(part => part === '..')) throw new Error('Caminho do asset editorial inválido.');
  const overlayPath = `content/english/editorial/media-replacements/${revisionId}.json`;
  const overlay = buildEditorialOverlay({ revisionId, plan: preview.plan, upload: upload.metadata, assetPath, author, baseBranch: BASE_BRANCH });
  await mkdir(path.dirname(worktreePath), { recursive: true });
  await run('git', ['worktree', 'add', '-b', branch, worktreePath, preview.expectedHead], { cwd: context.root });
  let commitSha = null, pullRequest = null;
  try {
    const assetFile = path.resolve(worktreePath, assetPath);
    const overlayFile = path.resolve(worktreePath, overlayPath);
    if (!assetFile.startsWith(path.resolve(worktreePath) + path.sep) || !overlayFile.startsWith(path.resolve(worktreePath) + path.sep)) throw new Error('Path traversal blocked.');
    await mkdir(path.dirname(assetFile), { recursive: true });
    await writeFile(assetFile, upload.bytes, { flag: 'wx' });
    await mkdir(path.dirname(overlayFile), { recursive: true });
    await writeFile(overlayFile, JSON.stringify(overlay, null, 2), { flag: 'wx' });
    await run('git', ['add', '--', assetPath, overlayPath], { cwd: worktreePath });
    await run('git', ['-c', `user.name=${author}`, '-c', `user.email=${authorEmail}`, 'commit', '-m', `editorial(media): ${preview.plan.scope.toLowerCase()} ${preview.plan.sourceMediaId}`], { cwd: worktreePath });
    commitSha = await run('git', ['rev-parse', 'HEAD'], { cwd: worktreePath });
    await run('git', ['push', '--set-upstream', 'origin', branch], { cwd: worktreePath });
    const title = `Editorial image replacement — ${preview.plan.sourceMediaId}`;
    const body = [
      '## Editorial media replacement (not a production deployment)', '',
      `- Scope: ${preview.plan.scope}`, `- Source mediaId: ${preview.plan.sourceMediaId}`,
      `- New SHA-256: ${upload.metadata.sha256}`, `- Affected: ${preview.plan.counts.positions} positions / ${preview.plan.counts.questions} questions / ${preview.plan.counts.modules} modules`,
      `- Overlay: \`${overlayPath}\``, `- Base V19 manifest: \`${preview.plan.v19ManifestSha256}\``,
      '', 'This PR does not deploy to Cloudflare or alter the official production links.'
    ].join('\n');
    try {
      pullRequest = await githubApi(token, `/repos/${OWNER}/${REPOSITORY}/pulls`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, head: branch, base: BASE_BRANCH, body, draft: true }) });
    } catch (error) {
      if (error.statusCode !== 422) throw error;
      const matches = await githubApi(token, `/repos/${OWNER}/${REPOSITORY}/pulls?state=open&head=${OWNER}:${encodeURIComponent(branch)}&base=${encodeURIComponent(BASE_BRANCH)}`);
      if (!Array.isArray(matches) || !matches.length) throw error;
      pullRequest = matches[0];
    }
  } finally {
    // Keep the local worktree and branch as recoverable evidence. No cleanup/delete is automatic.
  }
  const now = new Date().toISOString();
  const status = {
    ...overlay, branch, commitSha,
    github: { branch, commitSha, commitUrl: `https://github.com/${OWNER}/${REPOSITORY}/commit/${commitSha}`, pullRequestUrl: pullRequest.html_url, pullRequestNumber: pullRequest.number, status: 'PR_OPENED' },
    qa: { status: 'NOT_RUN', url: null }, production: { published: false, deploymentId: null },
    stagedAt: now, statusUpdatedAt: now, rollbackAvailable: true
  };
  const statusPath = await statusRecordPath(context.dataDir, revisionId);
  await mkdir(path.dirname(statusPath), { recursive: true });
  await writeFile(statusPath, JSON.stringify(status, null, 2), { flag: 'wx' });
  return status;
}

export function createContentStudioMediaApi(options) {
  const context = { ...options, indexPromise: null };
  return async function handleContentStudioMediaApi(req, res, url, origin, sessionToken) {
    const pathname = url.pathname;
    if (req.method === 'GET' && pathname === '/api/media/image-inventory') {
      if (req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try {
        const index = await currentIndex(context);
        const questions = index.questions.map(question => ({ ...question, references: question.references.map(use => ({
          mediaId: use.mediaId, roleId: use.roleId, roleLabel: use.roleLabel, answerRole: use.answerRole,
          assetPath: use.assetPath, assetSha256: use.assetSha256, assetIntegrity: use.assetIntegrity,
          imageMetadata: use.imageMetadata,
          declaredStatus: use.declaredStatus, previewUrl: use.assetPath ? `/qa-v19/${use.assetPath}` : null,
          usageCount: index.usesByMediaId.get(use.mediaId)?.length || 0
        })) }));
        reply(res, 200, { v19ManifestSha256: index.manifestSha256, indexRevision: index.revisionHash, moduleCount: index.modules.length, questionCount: questions.length, imageMediaIdCount: index.usesByMediaId.size, modules: index.modules, questions });
      } catch (error) { reply(res, 503, { error: error.message, status: 'V19_INDEX_UNAVAILABLE' }); }
      return true;
  }
    if (req.method === 'GET' && pathname === '/api/media/image-usage') {
      if (req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try {
        const index = await currentIndex(context); const usage = summarizeUsage(index, url.searchParams.get('mediaId'));
        const keyByQuestion = new Map(index.questions.map(question => [`${question.moduleId}/${question.itemId}`, question.answerKeySummary]));
        const decorate = use => ({ ...use, answerKey: keyByQuestion.get(`${use.moduleId}/${use.itemId}`) || { status: 'NOT_IDENTIFIED', kind: 'UNRESOLVED', responseText: null }, previewUrl: use.assetPath ? `/qa-v19/${use.assetPath}` : null });
        reply(res, 200, { ...usage, uses: usage.uses.map(decorate), exactShaAliases: usage.exactShaAliases.map(alias => ({ ...alias, uses: alias.uses.map(decorate) })), exactShaAliasUses: usage.exactShaAliasUses.map(decorate) });
      } catch (error) { reply(res, 404, { error: error.message }); }
      return true;
    }
    if (req.method === 'GET' && pathname === '/api/media/activity') {
      if (req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try {
        const moduleId = url.searchParams.get('moduleId') || '';
        const itemId = url.searchParams.get('itemId') || '';
        if (!/^Y[1-5]M0[1-6]$/.test(moduleId) || !new RegExp(`^${moduleId}-Q\\d{3}$`).test(itemId)) throw new Error('Identidade curricular inválida.');
        const index = await currentIndex(context);
        const indexed = index.questions.find(question => question.moduleId === moduleId && question.itemId === itemId);
        if (!indexed) throw new Error('Atividade não localizada no índice curricular.');
        const year = moduleId[1], module = moduleId.slice(3);
        const file = path.join(context.v19Root, `content/english/year-${year}/module-${module}/questions.json`);
        const moduleData = await json(file);
        const question = moduleData.items.find(item => item.item_id === itemId);
        if (!question) throw new Error('Atividade ausente do arquivo curricular.');
        const references = indexed.references.map(use => ({
          ...use,
          previewUrl: use.assetPath ? `/qa-v19/${use.assetPath}` : null,
          usageCount: index.usesByMediaId.get(use.mediaId)?.length || 0,
          exactShaAliases: use.assetSha256 ? (index.aliasesBySha.get(use.assetSha256) || []).filter(id => id !== use.mediaId) : []
        }));
        const answerKey = buildAnswerKeyView(question, references);
        const previewUrl = `http://127.0.0.1:${Number(process.env.DUDUQ_PAGES_PREVIEW_PORT || 8788)}/play/english/year-${year}/module-${module}/`;
        const previewRuntime = await inspectPagesPreview(previewUrl);
        const mediaById = new Map(references.map(reference => [reference.mediaId, reference]));
        const decorate = value => {
          if (Array.isArray(value)) return value.map(decorate);
          if (!value || typeof value !== 'object') return value;
          if (typeof value.mediaId === 'string') return { ...value, ...(mediaById.get(value.mediaId) || {}) };
          return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decorate(child)]));
        };
        reply(res, 200, {
          moduleId, itemId, mechanicId: question.mechanicId || question.mechanic || question.mecanica_preferida || 'UNKNOWN',
          mechanicMode: question.mechanicMode || null,
          instruction: { en: question.instruction?.instructionEn || question.primaryInstructionEn || null, pt: question.instruction?.instructionPt || question.supportInstructionPt || question.instrucao_pt || null, titleEn: question.instruction?.titleEn || question.topicEn || null },
          context: question.learningTarget || question.objetivo || question.texto_visivel || question.topicEn || null,
          answerKey: decorate(answerKey), references, gabaritoAdminOnly: true,
          previewUrl,
          previewAvailable: previewRuntime.available && previewRuntime.fitWrapper,
          previewRuntime,
          previewHint: `${previewRuntime.available && previewRuntime.fitWrapper ? 'Runtime Pages QA ativo com Fit. A prévia abre a versão atualmente servida; avance pelo fluxo curricular oficial até esta questão. Imagem em revisão só aparece após aplicar e testar seu overlay no build QA.' : 'Runtime Pages QA com Fit não detectado nesta sessão. A imagem em revisão ainda não foi incorporada a um build de preview. A navegação segue o fluxo curricular oficial; não há deep-link administrativo que pule a sessão.'}`
        });
      } catch (error) { reply(res, 404, { error: error.message }); }
      return true;
    }
    if (req.method === 'GET' && pathname === '/api/media/github-status') {
      if (req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      reply(res, 200, await readGithubStatus(context.root).catch(error => ({ apiStatus: 'ERROR', error: error.message, productionWrites: false, cloudflareDeploy: false })));
      return true;
    }
    if (req.method === 'GET' && pathname === '/api/media/replacements') {
      if (req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      reply(res, 200, { revisions: await listHistory(context.dataDir) });
      return true;
    }
    const revisionMatch = pathname.match(/^\/api\/media\/image-replacement\/([A-Za-z0-9_-]+)$/);
    if (req.method === 'GET' && revisionMatch) {
      if (req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try { reply(res, 200, await json(await statusRecordPath(context.dataDir, revisionMatch[1]))); }
      catch { reply(res, 404, { error: 'Revisão editorial ainda não foi staged neste servidor.' }); }
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/media/image-upload') {
      if (req.headers.origin !== origin || req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try {
        const bytes = await readBinary(req);
        const filename = String(url.searchParams.get('filename') || 'imagem.png').slice(0, 120);
        const validated = validateReplacementAsset(bytes, filename);
        const alpha = String(url.searchParams.get('alpha') || 'NOT_CHECKED');
        const entry = await storeReplacementUpload({ dataDir: context.dataDir, filename, buffer: bytes, alpha });
        if (entry.sha256 !== validated.sha256) throw new Error('SHA-256 mudou durante o armazenamento; arquivo rejeitado.');
        reply(res, 201, { entry });
      } catch (error) { reply(res, error.statusCode || 422, { error: error.message, status: error.statusCode === 401 ? 'AUTH_REQUIRED' : 'ROLLBACK_FAILED' }); }
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/media/image-replacement/preview') {
      if (req.headers.origin !== origin || req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try {
        const body = await readJson(req); const index = await currentIndex(context); const upload = await uploadRecord(context, body.assetUploadId);
        const plan = buildReplacementPlan(index, body, upload.metadata);
        const github = await readGithubStatus(context.root);
        const previewId = randomUUID(); const expectedHead = github.head;
        previews.set(previewId, { plan, expectedHead, expiresAt: Date.now() + 20 * 60 * 1000 });
        reply(res, 200, { previewId, expiresInSeconds: 1200, expectedHead, plan, githubStageReady: github.stageReady, githubStatus: github.apiStatus, requiresExplicitConfirmation: true, productionWrites: false });
      } catch (error) { reply(res, 422, { error: error.message }); }
      return true;
    }
    if (req.method === 'POST' && pathname === '/api/media/image-replacement/stage') {
      if (req.headers.origin !== origin || req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try {
        const body = await readJson(req);
        if (body.confirmed !== true || body.confirmation !== 'CRIAR BRANCH E PR') throw Object.assign(new Error('Ação cancelada: confirme “CRIAR BRANCH E PR” no painel.'), { statusCode: 422 });
        const preview = previews.get(body.previewId);
        if (!preview || preview.expiresAt < Date.now()) throw Object.assign(new Error('Plano expirado; gere a prévia de impacto novamente.'), { statusCode: 409 });
        const index = await currentIndex(context);
        if (index.revisionHash !== preview.plan.indexRevision || index.manifestSha256 !== V19_MANIFEST_SHA) throw Object.assign(new Error('A base curricular mudou; nenhuma alteração foi staged.'), { statusCode: 409 });
        const upload = await uploadRecord(context, preview.plan.uploadId);
        const result = await stageOnGitHub(context, preview, upload);
        previews.delete(body.previewId);
        reply(res, 201, { revision: result, status: result.github.status, cloudflare: 'NOT_DEPLOYED', productionWrites: false });
      } catch (error) { reply(res, error.statusCode || 422, { error: error.message, status: error.statusCode === 409 ? 'CONFLICT' : 'STAGING_FAILED', productionWrites: false }); }
      return true;
    }
    const rollbackMatch = pathname.match(/^\/api\/media\/image-replacement\/([A-Za-z0-9_-]+)\/rollback$/);
    if (req.method === 'POST' && rollbackMatch) {
      if (req.headers.origin !== origin || req.headers['x-duduq-admin-token'] !== sessionToken) { reply(res, 403, { error: 'Sessão administrativa inválida.' }); return true; }
      try {
        const body = await readJson(req);
        if (body.confirmed !== true || body.confirmation !== `REVERTER ${rollbackMatch[1]}`) throw new Error(`Confirme “REVERTER ${rollbackMatch[1]}” para gerar um PR compensatório.`);
        const original = await json(await statusRecordPath(context.dataDir, rollbackMatch[1]));
        if (!original.rollbackAvailable) throw new Error('Esta revisão já foi revertida ou está em estado não reversível.');
        const token = (await githubCredential())?.token;
        if (!token) throw Object.assign(new Error('Sessão GitHub local não encontrada; nenhuma reversão foi criada.'), { statusCode: 401 });
        const result = await rollbackRevision(context, rollbackMatch[1], original, token);
        reply(res, 200, result);
      } catch (error) { reply(res, 422, { error: error.message }); }
      return true;
    }
    return false;
  };
}

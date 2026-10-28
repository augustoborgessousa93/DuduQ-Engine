import { createHash, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { buildAnswerKeyView } from './answer-key-view.mjs';

export const V19_MANIFEST_SHA256 = 'CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E';
const IMAGE_REF_KEYS = new Set(['mediaid', 'assetid', 'image_ref', 'imageref', 'imageid', 'imageassetid', 'visualmediaid']);
const AUDIO_PATH = /audio|sound|voice|transcript/i;
const IMAGE_MEDIA_ID = /^(?:IMG|MEDIA|Y[1-5]M\d{2}-EMOJI)-[A-Za-z0-9_-]+$/i;
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function imageFileFor(entry) {
  const choices = [...(entry?.assets || []).map(asset => asset?.path), entry?.urlOrPath].filter(Boolean);
  return choices.find(value => !/^https?:\/\//i.test(value) && /\.(?:png|webp|jpe?g|svg)$/i.test(value)) || null;
}

function imageMetadata(buffer, relativePath) {
  const ext = path.extname(relativePath || '').toLowerCase();
  let width = null, height = null, alpha = 'UNKNOWN';
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.length >= 26) {
    width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20); alpha = [4, 6].includes(buffer[25]) ? 'ALPHA_CHANNEL' : 'NO_ALPHA_CHANNEL';
  } else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    for (let offset = 12; offset + 8 <= buffer.length;) {
      const type = buffer.toString('ascii', offset, offset + 4), length = buffer.readUInt32LE(offset + 4), start = offset + 8;
      if (start + length > buffer.length) break;
      if (type === 'VP8X' && length >= 10) { alpha = (buffer[start] & 0x10) ? 'ALPHA_CHANNEL' : 'NO_ALPHA_CHANNEL'; width = 1 + buffer[start+4] + (buffer[start+5]<<8) + (buffer[start+6]<<16); height = 1 + buffer[start+7] + (buffer[start+8]<<8) + (buffer[start+9]<<16); }
      if (type === 'ALPH') alpha = 'ALPHA_CHANNEL';
      if (type === 'VP8 ' && length >= 10 && !width) { width = buffer.readUInt16LE(start+6) & 0x3fff; height = buffer.readUInt16LE(start+8) & 0x3fff; }
      if (type === 'VP8L' && length >= 5 && !width) { const b1=buffer[start+1],b2=buffer[start+2],b3=buffer[start+3],b4=buffer[start+4]; width=1+(((b2&0x3f)<<8)|b1); height=1+(((b4&0x0f)<<10)|(b3<<2)|((b2&0xc0)>>6)); alpha=(b4&0x10)?'ALPHA_CHANNEL':'NO_ALPHA_CHANNEL'; }
      offset = start + length + (length % 2);
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    for (let offset = 2; offset + 9 < buffer.length;) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker=buffer[offset+1], length=buffer.readUInt16BE(offset+2);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) { height=buffer.readUInt16BE(offset+5); width=buffer.readUInt16BE(offset+7); break; }
      if (length < 2) break; offset += 2 + length;
    }
    alpha = 'NO_ALPHA_CHANNEL';
  } else if (ext === '.svg') {
    const source=buffer.toString('utf8',0,Math.min(buffer.length,20000)), tag=source.match(/<svg\b[^>]*>/i)?.[0]||'';
    const w=tag.match(/\bwidth=["']([\d.]+)(?:px)?["']/i)?.[1], h=tag.match(/\bheight=["']([\d.]+)(?:px)?["']/i)?.[1];
    if (w&&h) { width=Number(w); height=Number(h); }
    else { const box=tag.match(/\bviewBox=["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)["']/i); if (box) {width=Number(box[1]);height=Number(box[2]);} }
    alpha='VECTOR_ALPHA_POSSIBLE';
  }
  return { width: width||null, height: height||null, aspectRatio: width&&height?Number((width/height).toFixed(4)):null, bytes: buffer.length, alpha };
}

function safeAssetPath(root, relative) {
  const normalized = String(relative || '').replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some(part => !part || part === '.' || part === '..')) return null;
  const absolute = path.resolve(root, normalized);
  return absolute.startsWith(path.resolve(root) + path.sep) ? absolute : null;
}

function decodePointer(pointer) {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error(`JSON Pointer inválido: ${pointer}`);
  return pointer.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function getPointer(root, pointer) {
  let current = root;
  for (const part of decodePointer(pointer)) current = Array.isArray(current) ? current[Number(part)] : current?.[part];
  return current;
}

function setPointer(root, pointer, value) {
  const parts = decodePointer(pointer);
  if (!parts.length) throw new Error('Não é permitido substituir a questão inteira.');
  const key = parts.pop();
  let current = root;
  for (const part of parts) current = Array.isArray(current) ? current[Number(part)] : current?.[part];
  if (!current || typeof current !== 'object' || !own(current, key)) throw new Error(`Referência editorial não encontrada: ${pointer}`);
  current[key] = value;
}

function optionContext(object, parent, key, pointer) {
  if (parent?.optionId) return parent;
  const optionId = object.optionId || object.option_id || object.choiceId || object.targetId || object.target_id;
  const mappedRole = object.role || object.position || object.slot || object.destinationId || object.destination_id;
  if (optionId) {
    return { roleId: `option:${String(optionId)}`, roleLabel: String(object.label || object.text || object.optionText || optionId), answerRole: 'UNSPECIFIED', optionId: String(optionId) };
  }
  if (object.id && (object.label || object.text || object.semanticTarget)) return { roleId: `item:${String(object.id)}`, roleLabel: String(object.label || object.text || object.semanticTarget || object.id), answerRole: 'UNSPECIFIED', optionId: null };
  if (mappedRole) return { roleId: `position:${String(mappedRole)}`, roleLabel: String(mappedRole), answerRole: 'UNSPECIFIED', optionId: null };
  if (typeof object.role === 'string') return { roleId: `position:${object.role}`, roleLabel: object.role, answerRole: 'UNSPECIFIED', optionId: null };
  if (key === 'image_ref' || key === 'imageRef') return { roleId: 'stimulus', roleLabel: 'Imagem principal da questão', answerRole: 'STIMULUS', optionId: null };
  return parent || { roleId: `reference:${pointer}`, roleLabel: pointer, answerRole: 'UNSPECIFIED', optionId: null };
}

function scanQuestionReferences(question) {
  const found = [];
  const visit = (node, pointer = '', inherited = null, ancestry = []) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((value, index) => visit(value, `${pointer}/${index}`, inherited, ancestry));
      return;
    }
    const semantic = optionContext(node, inherited, null, pointer);
    for (const [key, value] of Object.entries(node)) {
      const nextPointer = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
      if (AUDIO_PATH.test([...ancestry, key].join('/'))) continue;
      if (typeof value === 'string' && IMAGE_REF_KEYS.has(key.toLowerCase()) && IMAGE_MEDIA_ID.test(value)) {
        const context = ['image_ref', 'imageref'].includes(key.toLowerCase())
          ? { roleId: 'stimulus', roleLabel: 'Imagem principal da questão', answerRole: 'STIMULUS', optionId: null }
          : key.toLowerCase() === 'mediaid' && semantic.roleId.startsWith('reference:')
            ? optionContext(node, inherited, key, pointer)
            : semantic;
        found.push({ mediaId: value, pointer: nextPointer, ...context });
      }
      if (value && typeof value === 'object') visit(value, nextPointer, semantic, [...ancestry, key]);
    }
  };
  visit(question);
  const grouped = new Map();
  for (const reference of found) {
    const key = `${reference.mediaId}\0${reference.roleId}`;
    const previous = grouped.get(key) || { mediaId: reference.mediaId, roleId: reference.roleId, roleLabel: reference.roleLabel, answerRole: reference.answerRole, optionId: reference.optionId, pointers: [] };
    if (!previous.pointers.includes(reference.pointer)) previous.pointers.push(reference.pointer);
    if (previous.answerRole !== reference.answerRole && ['CORRECT', 'DISTRACTOR'].includes(reference.answerRole)) previous.answerRole = 'CONFLICT';
    grouped.set(key, previous);
  }
  return [...grouped.values()];
}

export async function loadMediaReplacementIndex({ v19Root, moduleIndexPath = 'content/english/master/modules-index.json' }) {
  const manifestPath = path.join(v19Root, '.duduq-pages-manifest');
  const manifestBytes = await readFile(manifestPath);
  const manifestSha256 = sha256(manifestBytes).toUpperCase();
  if (manifestSha256 !== V19_MANIFEST_SHA256) throw new Error(`V19 base integrity failed: ${manifestSha256}`);
  const manifestLines = manifestBytes.toString('utf8').trimEnd().split(/\r?\n/);
  if (manifestLines.length !== 2670) throw new Error(`V19 manifest must contain 2670 files; found ${manifestLines.length}`);
  const [mediaRegistry, moduleCatalog] = await Promise.all([
    readJson(path.join(v19Root, 'content/english/media/media-registry.json')),
    readJson(moduleIndexPath)
  ]);
  const mediaEntries = (mediaRegistry.entries || []).filter(entry => entry.kind === 'image' || entry.mediaId);
  const entriesById = new Map(mediaEntries.filter(entry => entry.mediaId).map(entry => [entry.mediaId, entry]));
  const mediaAssets = new Map();
  const aliasesBySha = new Map();
  for (const entry of mediaEntries) {
    if (!entry.mediaId) continue;
    const relativePath = imageFileFor(entry);
    const absolute = relativePath && safeAssetPath(v19Root, relativePath);
    let asset = { relativePath, sha256: null, declaredSha256: entry.assets?.find(asset => asset.path === relativePath)?.sha256 || null, integrity: 'MISSING', metadata: null };
    if (absolute) {
      try {
        const bytes = await readFile(absolute);
        const digest = sha256(bytes);
        asset = { ...asset, sha256: digest, integrity: asset.declaredSha256 && asset.declaredSha256.toLowerCase() !== digest ? 'HASH_MISMATCH' : 'PASS', metadata: imageMetadata(bytes, relativePath) };
      } catch { /* recorded below as missing; do not infer media availability */ }
    }
    mediaAssets.set(entry.mediaId, asset);
    if (asset.sha256 && asset.integrity === 'PASS') {
      const aliases = aliasesBySha.get(asset.sha256) || [];
      aliases.push(entry.mediaId);
      aliasesBySha.set(asset.sha256, aliases);
    }
  }
  const catalogById = new Map((moduleCatalog.modules || []).map(module => [module.module_id, module]));
  const modules = [];
  const questions = [];
  const usesByMediaId = new Map();
  for (let year = 1; year <= 5; year++) {
    for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber++) {
      const moduleId = `Y${year}M${String(moduleNumber).padStart(2, '0')}`;
      const relative = `content/english/year-${year}/module-${String(moduleNumber).padStart(2, '0')}/questions.json`;
      const data = await readJson(path.join(v19Root, relative));
      if (data.moduleId !== moduleId || data.items?.length !== 20) throw new Error(`Curriculum identity/count invalid for ${moduleId}`);
      const catalog = catalogById.get(moduleId) || {};
      modules.push({ moduleId, year, moduleNumber, title: catalog.titulo || moduleId, questionCount: data.items.length, relativePath: relative });
      for (const question of data.items) {
        const rawReferences = scanQuestionReferences(question);
        const answerKeyView = buildAnswerKeyView(question, rawReferences.map(reference => ({ mediaId: reference.mediaId })));
        const semanticRoles = new Map();
        for (const choice of answerKeyView.alternatives || []) {
          for (const media of choice.media || []) semanticRoles.set(`${media.mediaId}\0${choice.id}`, choice.role);
        }
        for (const association of answerKeyView.associations || []) {
          for (const media of association.media || []) semanticRoles.set(`${media.mediaId}\0item:${association.itemId}`, 'CORRECT');
        }
        const references = rawReferences.map(reference => {
          const answerRole = semanticRoles.get(`${reference.mediaId}\0${reference.roleId.replace(/^option:/, '')}`)
            || semanticRoles.get(`${reference.mediaId}\0${reference.roleId}`)
            || reference.answerRole;
          const asset = mediaAssets.get(reference.mediaId) || { integrity: 'UNREGISTERED', relativePath: null, sha256: null };
          const entry = entriesById.get(reference.mediaId);
          const use = {
            moduleId, year, moduleNumber, itemId: question.item_id,
            context: String(question.learningTarget || question.objetivo || question.texto_visivel || question.topicEn || question.instrucao_pt || '').trim(),
            mechanicId: question.mechanicId || question.mechanic || question.mecanica_preferida || null,
            mediaId: reference.mediaId, roleId: reference.roleId, roleLabel: reference.roleLabel,
            answerRole, answerKeyStatus: answerKeyView.status, optionId: reference.optionId, pointers: reference.pointers,
            assetPath: asset.relativePath, assetSha256: asset.sha256, assetIntegrity: asset.integrity, imageMetadata: asset.metadata,
            declaredStatus: entry?.status || 'UNREGISTERED'
          };
          const uses = usesByMediaId.get(reference.mediaId) || [];
          uses.push(use);
          usesByMediaId.set(reference.mediaId, uses);
          return use;
        });
        questions.push({ moduleId, year, moduleNumber, itemId: question.item_id, context: String(question.learningTarget || question.objetivo || question.texto_visivel || question.topicEn || question.instrucao_pt || '').trim(), mechanicId: question.mechanicId || question.mechanic || question.mecanica_preferida || null, answerKeyStatus: answerKeyView.status, answerKeySummary: { status: answerKeyView.status, kind: answerKeyView.kind, responseText: answerKeyView.responseText }, references });
      }
    }
  }
  if (modules.length !== 30 || questions.length !== 600) throw new Error(`V19 inventory incomplete: ${modules.length} modules / ${questions.length} questions`);
  const revisionHash = sha256(Buffer.from(JSON.stringify({ manifestSha256, modules: modules.map(module => module.moduleId), questionIds: questions.map(question => question.itemId), mediaCount: mediaEntries.length })));
  return { v19Root, manifestSha256, revisionHash, modules, questions, entriesById, mediaAssets, aliasesBySha, usesByMediaId, registryPath: 'content/english/media/media-registry.json' };
}

async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

export function summarizeUsage(index, mediaId) {
  const asset = index.mediaAssets.get(mediaId);
  if (!asset || !index.entriesById.has(mediaId)) throw new Error(`Imagem não encontrada no catálogo V19: ${mediaId}`);
  const exactShaAliases = asset.sha256 ? (index.aliasesBySha.get(asset.sha256) || []).filter(id => id !== mediaId) : [];
  const ownUses = index.usesByMediaId.get(mediaId) || [];
  const aliasUses = exactShaAliases.flatMap(id => (index.usesByMediaId.get(id) || []).map(use => ({ ...use, aliasMediaId: id })));
  return {
    mediaId, asset, entry: index.entriesById.get(mediaId),
    uses: ownUses,
    exactShaAliases: exactShaAliases.map(id => ({ mediaId: id, asset: index.mediaAssets.get(id), entry: index.entriesById.get(id), uses: index.usesByMediaId.get(id) || [] })),
    exactShaAliasUses: aliasUses,
    counts: {
      questions: new Set(ownUses.map(use => use.itemId)).size,
      modules: new Set(ownUses.map(use => use.moduleId)).size,
      positions: ownUses.length,
      aliasQuestions: new Set(aliasUses.map(use => `${use.moduleId}/${use.itemId}`)).size,
      aliasModules: new Set(aliasUses.map(use => use.moduleId)).size,
      aliasPositions: aliasUses.length
    }
  };
}

export function buildReplacementPlan(index, input, upload) {
  const { sourceMediaId, scope, moduleId, itemId, roleIds = [], includeExactShaAliases = false, semanticResolution = null } = input;
  if (!['ALL_USAGES', 'QUESTION_ONLY'].includes(scope)) throw new Error('Selecione um escopo de substituição válido.');
  if (!upload || !/^[A-Za-z0-9_-]{8,80}$/.test(upload.uploadId || '') || !/^[a-f0-9]{64}$/.test(upload.sha256 || '')) throw new Error('Upload validado não encontrado.');
  const usage = summarizeUsage(index, sourceMediaId);
  if (upload.sha256 === usage.asset.sha256) throw new Error('O arquivo enviado é byte a byte igual à imagem atual; nenhuma substituição seria produzida.');
  const targets = scope === 'ALL_USAGES'
    ? [sourceMediaId, ...(includeExactShaAliases ? usage.exactShaAliases.map(alias => alias.mediaId) : [])]
    : [sourceMediaId];
  const selectedUses = scope === 'QUESTION_ONLY'
    ? (index.usesByMediaId.get(sourceMediaId) || []).filter(use => use.moduleId === moduleId && use.itemId === itemId && roleIds.includes(use.roleId))
    : targets.flatMap(target => index.usesByMediaId.get(target) || []);
  if (!selectedUses.length) throw new Error(scope === 'QUESTION_ONLY' ? 'Escolha uma posição de imagem desta questão.' : 'A imagem selecionada não possui usos curriculares indexados.');
  const badAssets = selectedUses.filter(use => use.assetIntegrity !== 'PASS');
  if (badAssets.length) throw new Error(`Há ${badAssets.length} uso(s) sem integridade de mídia verificável; staging bloqueado.`);
  const unresolvedAnswerKey = selectedUses.filter(use => use.answerKeyStatus !== 'IDENTIFIED' && !['stimulus', 'position:stimulus'].includes(use.roleId));
  if (unresolvedAnswerKey.length) {
    const questions = [...new Set(unresolvedAnswerKey.map(use => `${use.moduleId}/${use.itemId}`))];
    throw new Error(`Gabarito não identificado — revisão necessária antes de substituir imagem em: ${questions.join(', ')}.`);
  }
  if (scope === 'QUESTION_ONLY' && (!moduleId || !itemId || !roleIds.length)) throw new Error('Substituição individual exige módulo, questão e posições explícitas.');
  const answerRoles = [...new Set(selectedUses.map(use => use.answerRole).filter(role => ['CORRECT', 'DISTRACTOR', 'CONFLICT'].includes(role)))];
  if (scope === 'ALL_USAGES' && answerRoles.includes('CORRECT') && answerRoles.includes('DISTRACTOR') && semanticResolution !== 'SAME_CONCEPT_KEEP_ANSWER_ROLES') {
    throw new Error('A mesma imagem aparece em opções corretas e distratoras. Confirme explicitamente que a nova arte mantém o conceito e os gabaritos existentes.');
  }
  const targetQuestion = scope === 'QUESTION_ONLY' ? index.questions.find(question => question.moduleId === moduleId && question.itemId === itemId) : null;
  if (scope === 'QUESTION_ONLY' && !targetQuestion) throw new Error(`Questão não localizada: ${moduleId}/${itemId}`);
  const newMediaId = scope === 'QUESTION_ONLY' ? `IMG-EDIT-${upload.sha256.slice(0, 12).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}` : null;
  const questionPatches = scope === 'QUESTION_ONLY' ? selectedUses.flatMap(use => use.pointers.map(pointer => ({ moduleId, itemId, pointer, from: sourceMediaId, to: newMediaId, roleId: use.roleId }))) : [];
  const positions = selectedUses.map(({ moduleId: m, itemId: q, roleId, roleLabel, answerRole, mediaId, answerKeyStatus }) => {
    const question = index.questions.find(entry => entry.moduleId === m && entry.itemId === q);
    return { moduleId: m, itemId: q, roleId, roleLabel, answerRole, answerKeyStatus, answerKey: question?.answerKeySummary || { status: 'NOT_IDENTIFIED', kind: 'UNRESOLVED', responseText: null }, mediaId };
  });
  const preview = {
    scope, sourceMediaId, targetMediaIds: targets,
    sourceSha256: usage.asset.sha256, uploadedSha256: upload.sha256, uploadId: upload.uploadId,
    newMediaId, assetPath: upload.filename ? `content/english/assets/images/approved/${moduleId || usage.uses[0]?.moduleId || 'shared'}/${itemId || 'shared'}/${upload.sha256.slice(0, 12)}.${upload.ext}` : null,
    positions, questionPatches, answerRoles, semanticResolution,
    counts: { positions: positions.length, questions: new Set(positions.map(use => `${use.moduleId}/${use.itemId}`)).size, modules: new Set(positions.map(use => use.moduleId)).size },
    source: { mediaId: sourceMediaId, sha256: usage.asset.sha256, path: usage.asset.relativePath, status: usage.entry.status },
    uploaded: { sha256: upload.sha256, filename: upload.originalName, mime: upload.mime, width: upload.width, height: upload.height, bytes: upload.bytes, alpha: upload.alpha || 'NOT_CHECKED' },
    v19ManifestSha256: index.manifestSha256,
    indexRevision: index.revisionHash,
    createdAt: new Date().toISOString()
  };
  return preview;
}

export function applyReplacementOverlay({ overlay, registry, questionsByModule, assetBytes, v19ManifestSha256 }) {
  if (overlay.schemaVersion !== 1 || overlay.v19ManifestSha256 !== v19ManifestSha256) throw new Error('Overlay incompatível com a base V19 congelada.');
  if (sha256(assetBytes) !== overlay.asset.sha256) throw new Error('SHA-256 do asset editorial diverge do overlay.');
  const nextRegistry = structuredClone(registry);
  const nextQuestions = new Map([...questionsByModule].map(([moduleId, data]) => [moduleId, structuredClone(data)]));
  const changed = [];
  if (overlay.scope === 'ALL_USAGES') {
    for (const mediaId of overlay.targetMediaIds) {
      const entry = nextRegistry.entries.find(item => item.mediaId === mediaId);
      if (!entry) throw new Error(`Overlay target mediaId ausente: ${mediaId}`);
      const matchingAssets = (entry.assets || []).filter(asset => asset.sha256?.toLowerCase() === overlay.source.sha256);
      if (!matchingAssets.length) throw new Error(`O destino ${mediaId} não aponta mais para o SHA de origem.`);
      for (const asset of matchingAssets) {
        asset.path = overlay.asset.path;
        asset.sha256 = overlay.asset.sha256;
        asset.editorialRevisionId = overlay.revisionId;
      }
      if (entry.urlOrPath === overlay.source.path) entry.urlOrPath = overlay.asset.path;
      entry.editorialRevisionId = overlay.revisionId;
      entry.editorialStatus = 'STAGED_FOR_HUMAN_REVIEW';
      changed.push(`media-registry:${mediaId}`);
    }
  } else if (overlay.scope === 'QUESTION_ONLY') {
    const patchesByModule = new Map();
    for (const patch of overlay.questionPatches) {
      const key = `${patch.moduleId}\0${patch.itemId}`;
      const group = patchesByModule.get(key) || [];
      group.push(patch);
      patchesByModule.set(key, group);
    }
    for (const [key, patches] of patchesByModule) {
      const [moduleId, itemId] = key.split('\0');
      const data = nextQuestions.get(moduleId);
      const question = data?.items?.find(item => item.item_id === itemId);
      if (!question) throw new Error(`Overlay question absent: ${moduleId}/${itemId}`);
      for (const patch of patches) {
        if (getPointer(question, patch.pointer) !== patch.from) throw new Error(`Overlay source pointer diverged: ${patch.pointer}`);
        setPointer(question, patch.pointer, patch.to);
      }
      changed.push(`question:${moduleId}/${itemId}`);
    }
    if (overlay.newMediaId) {
      nextRegistry.entries.push({
        mediaId: overlay.newMediaId, status: overlay.status === 'APPROVED' ? 'APPROVED' : 'PENDING_HUMAN_REVIEW', kind: 'image', urlOrPath: overlay.asset.path,
        assets: [{ path: overlay.asset.path, sha256: overlay.asset.sha256, editorialRevisionId: overlay.revisionId }],
        altText: overlay.asset.altText || overlay.asset.originalName || 'Imagem editorial em revisão',
        editorialRevisionId: overlay.revisionId, editorialStatus: 'STAGED_FOR_HUMAN_REVIEW'
      });
      changed.push(`media-registry:${overlay.newMediaId}`);
    }
  } else throw new Error(`Overlay scope não suportado: ${overlay.scope}`);
  return { registry: nextRegistry, questionsByModule: nextQuestions, changed };
}

export function validateReplacementAsset(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 32 || buffer.length > 40 * 1024 * 1024) throw new Error('A imagem deve ter entre 32 bytes e 40 MB.');
  const extension = path.extname(filename || '').toLowerCase();
  let format = null, width = 0, height = 0, alphaChannel = false;
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.subarray(0, 8).equals(pngSignature)) {
    format = 'png';
    if (buffer.toString('ascii', 12, 16) !== 'IHDR') throw new Error('PNG sem cabeçalho IHDR válido.');
    width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20);
    const colorType = buffer[25]; alphaChannel = colorType === 4 || colorType === 6;
    let offset = 8;
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset); const type = buffer.toString('ascii', offset + 4, offset + 8);
      if (type === 'tRNS') alphaChannel = true;
      offset += 12 + length; if (type === 'IEND' || offset > buffer.length) break;
    }
  } else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    format = 'webp';
    for (let offset = 12; offset + 8 <= buffer.length;) {
      const type = buffer.toString('ascii', offset, offset + 4); const length = buffer.readUInt32LE(offset + 4); const start = offset + 8;
      if (start + length > buffer.length) break;
      if (type === 'VP8X' && length >= 10) { alphaChannel = (buffer[start] & 0x10) !== 0; width = 1 + buffer[start + 4] + (buffer[start + 5] << 8) + (buffer[start + 6] << 16); height = 1 + buffer[start + 7] + (buffer[start + 8] << 8) + (buffer[start + 9] << 16); }
      if (type === 'ALPH') alphaChannel = true;
      if (type === 'VP8 ' && length >= 10 && !width) { width = buffer.readUInt16LE(start + 6) & 0x3fff; height = buffer.readUInt16LE(start + 8) & 0x3fff; }
      if (type === 'VP8L' && length >= 5 && !width) { const b1 = buffer[start + 1], b2 = buffer[start + 2], b3 = buffer[start + 3], b4 = buffer[start + 4]; width = 1 + (((b2 & 0x3f) << 8) | b1); height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)); alphaChannel = alphaChannel || (b4 & 0x10) !== 0; }
      offset = start + length + (length % 2);
    }
  }
  if (!format || !['.png', '.webp'].includes(extension) || extension !== `.${format}`) throw new Error('Envie PNG ou WebP; a extensão precisa corresponder ao conteúdo real.');
  if (!width || !height || width > 16384 || height > 16384 || width * height > 100_000_000) throw new Error('Dimensões ausentes ou acima do limite seguro de 16.384 px / 100 MP.');
  return { format, ext: format, mime: format === 'png' ? 'image/png' : 'image/webp', width, height, bytes: buffer.length, sha256: sha256(buffer), alphaChannel, highResolutionRecommended: width >= 1024 && height >= 1024 };
}

export function buildEditorialOverlay({ revisionId, plan, upload, assetPath, author, baseBranch }) {
  const asset = {
    path: assetPath, sha256: upload.sha256, originalName: upload.originalName,
    mime: upload.mime, width: upload.width, height: upload.height, bytes: upload.bytes,
    alpha: upload.alpha || 'NOT_CHECKED', altText: upload.altText || upload.originalName || null
  };
  return {
    schemaVersion: 1, revisionId, createdAt: new Date().toISOString(), author: author || 'Git local user',
    status: 'STAGED_FOR_HUMAN_REVIEW', baseBranch, v19ManifestSha256: plan.v19ManifestSha256,
    scope: plan.scope, source: { mediaId: plan.sourceMediaId, sha256: plan.sourceSha256, path: plan.source.path, status: plan.source.status },
    targetMediaIds: plan.targetMediaIds, newMediaId: plan.newMediaId,
    asset, affectedQuestions: plan.positions.map(position => ({ moduleId: position.moduleId, itemId: position.itemId, roleId: position.roleId, roleLabel: position.roleLabel, answerRole: position.answerRole, mediaId: position.mediaId })),
    questionPatches: plan.questionPatches, beforeAfter: { beforeSha256: plan.sourceSha256, afterSha256: upload.sha256 },
    counts: plan.counts, github: { branch: null, commit: null, pullRequest: null },
    qa: { status: 'NOT_RUN', url: null }, production: { published: false, deploymentId: null }
  };
}

export async function verifyAssetOnDisk(file) {
  const info = await stat(file);
  return { bytes: info.size, sha256: sha256(await readFile(file)) };
}

export async function storeReplacementUpload({ dataDir, filename, buffer, alpha = 'NOT_CHECKED' }) {
  const validated = validateReplacementAsset(buffer, filename);
  const safeName = path.basename(String(filename || 'imagem')).replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 120) || `imagem.${validated.ext}`;
  const uploadId = `upl-${validated.sha256}`;
  const storedFilename = `${validated.sha256}.${validated.ext}`;
  const directory = path.join(dataDir, 'media-replacements', 'uploads');
  const file = path.join(directory, storedFilename);
  const metadataFile = path.join(directory, `${validated.sha256}.json`);
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(directory, { recursive: true });
  try { await writeFile(file, buffer, { flag: 'wx' }); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await readFile(file);
    if (sha256(existing) !== validated.sha256) throw new Error('Colisão no arquivo imutável de upload; conteúdo existente diverge do SHA-256 esperado.');
  }
  let record = {
    uploadId, originalName: safeName, filename: storedFilename, ext: validated.ext,
    mime: validated.mime, width: validated.width, height: validated.height, bytes: validated.bytes,
    sha256: validated.sha256, alphaChannel: validated.alphaChannel, alpha,
    highResolutionRecommended: validated.highResolutionRecommended,
    uploadedAt: new Date().toISOString(), immutable: true
  };
  try { await writeFile(metadataFile, JSON.stringify(record, null, 2), { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = JSON.parse(await readFile(metadataFile, 'utf8'));
    if (existing.uploadId !== uploadId || existing.sha256 !== validated.sha256 || existing.filename !== storedFilename) throw new Error('Metadados de upload existentes divergem do arquivo imutável.');
    record = existing;
  }
  return record;
}

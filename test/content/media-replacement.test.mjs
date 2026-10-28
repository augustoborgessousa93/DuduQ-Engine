import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadMediaReplacementIndex, summarizeUsage, buildReplacementPlan, buildEditorialOverlay, applyReplacementOverlay, validateReplacementAsset, storeReplacementUpload } from '../../scripts/lib/media-replacement.mjs';
import { buildAnswerKeyView } from '../../scripts/lib/answer-key-view.mjs';

const root = process.cwd();
const v19 = path.join(root, 'dist-pages');
const index = await loadMediaReplacementIndex({ v19Root: v19, moduleIndexPath: 'content/english/master/modules-index.json' });

async function questionFiles() {
  const map = new Map();
  for (const module of index.modules) map.set(module.moduleId, JSON.parse(await readFile(path.join(v19, module.relativePath), 'utf8')));
  return map;
}
async function registryFile() { return JSON.parse(await readFile(path.join(v19, index.registryPath), 'utf8')); }
function uploadFrom(bytes, originalName = 'qa-new-image.png') {
  const result = validateReplacementAsset(bytes, originalName);
  return { ...result, uploadId: `upl-${result.sha256}`, filename: `${result.sha256}.${result.ext}`, originalName, alpha: result.alphaChannel ? 'HEADER_ALPHA_CHANNEL' : 'NO_ALPHA_CHANNEL' };
}
function valueAt(rootValue, pointer) { return pointer.split('/').slice(1).map(x => x.replaceAll('~1','/').replaceAll('~0','~')).reduce((v, k) => Array.isArray(v) ? v[Number(k)] : v[k], rootValue); }

test('inventário determinístico cobre 30 módulos, 600 questões e referências lógicas por mediaId/assetId', () => {
  assert.equal(index.modules.length, 30); assert.equal(index.questions.length, 600);
  assert.equal(index.usesByMediaId.size, 1133);
  assert.equal(index.manifestSha256, 'CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E');
  assert.equal(index.questions.find(q => q.moduleId === 'Y1M03' && q.itemId === 'Y1M03-Q002').references.length, 1);
  assert.equal(index.questions.find(q => q.moduleId === 'Y1M03' && q.itemId === 'Y1M03-Q002').references[0].mediaId, 'IMG-Q002-BLUE');
});

test('gabarito administrativo usa answerKey oficial para Target Shooter e Grouping', async () => {
  const data = await JSON.parse(await readFile(path.join(v19, 'content/english/year-1/module-03/questions.json'), 'utf8'));
  const target = data.items.find(q => q.item_id === 'Y1M03-Q007');
  const grouping = data.items.find(q => q.item_id === 'Y1M03-Q002');
  const bubbleModule = JSON.parse(await readFile(path.join(v19, 'content/english/year-1/module-02/questions.json'), 'utf8'));
  const bubble = bubbleModule.items.find(q => q.item_id === 'Y1M02-Q002');
  const ddm = bubbleModule.items.find(q => q.item_id === 'Y1M02-Q001');
  const targetView = buildAnswerKeyView(target, index.questions.find(q => q.itemId === target.item_id).references);
  const groupingView = buildAnswerKeyView(grouping, []);
  assert.equal(targetView.status, 'IDENTIFIED');
  assert.equal(targetView.responseText, 'purple');
  assert.deepEqual(targetView.alternatives.map(option => [option.label, option.role]), [['purple','CORRECT'],['gray','DISTRACTOR'],['brown','DISTRACTOR'],['red','DISTRACTOR']]);
  assert(targetView.alternatives[0].media.some(media => media.mediaId === 'IMG-Y1M03-Q007-PURPLE'));
  assert.equal(groupingView.status, 'IDENTIFIED');
  assert.equal(groupingView.associations.length, 8);
  assert.equal(groupingView.associations.find(item => item.label === 'purple').groupLabel, 'MORE COLOR WORDS');
  const bubbleView = buildAnswerKeyView(bubble, []);
  assert.equal(bubbleView.status, 'IDENTIFIED');
  assert.equal(bubbleView.responseText, 'one');
  assert(bubbleView.alternatives[0].media.some(media => media.mediaId === 'IMG-Y1M02-Q002-ONE'));
  const ddmView = buildAnswerKeyView(ddm, []);
  assert.equal(ddmView.status, 'IDENTIFIED');
  assert.equal(ddmView.associations.length, 4);
  assert.equal(ddmView.associations[0].targetLabel, 'one');
  const twoPairBubbleModule = JSON.parse(await readFile(path.join(v19, 'content/english/year-1/module-05/questions.json'), 'utf8'));
  const bubbleWithBubbleContract = twoPairBubbleModule.items.find(q => q.item_id === 'Y1M05-Q017');
  const bubbleContractView = buildAnswerKeyView(bubbleWithBubbleContract, []);
  assert.equal(bubbleContractView.status, 'IDENTIFIED');
  assert.equal(bubbleContractView.alternatives.find(option => option.role === 'CORRECT').label, 'silence, please');
  assert(bubbleContractView.alternatives.filter(option => option.role === 'DISTRACTOR').length > 0);
});

test('as 600 atividades têm gabarito identificado apenas por answerKey/contrato explícito', async () => {
  let identified = 0;
  for (const module of index.modules) {
    const data = JSON.parse(await readFile(path.join(v19, module.relativePath), 'utf8'));
    for (const question of data.items) {
      assert.equal(buildAnswerKeyView(question).status, 'IDENTIFIED', `${module.moduleId}/${question.item_id}`);
      identified++;
    }
  }
  assert.equal(identified, 600);
});

test('substituição global muda todas as referências selecionadas e nenhuma outra', async () => {
  const mediaId = 'IMG-Y1M02-Q001-TWO';
  const source = summarizeUsage(index, mediaId);
  assert(source.counts.questions > 1 && source.counts.modules > 1, 'fixture shared must span modules');
  const newAssetPath = path.join(v19, 'content/english/assets/images/year-1/module-01/temporary/5dc27965b3cf-criancas-se-cumprimentando-children-greeting-hello.png');
  const bytes = await readFile(newAssetPath); const upload = uploadFrom(bytes);
  const input = { sourceMediaId: mediaId, scope: 'ALL_USAGES', includeExactShaAliases: false, assetUploadId: upload.uploadId };
  assert.throws(() => buildReplacementPlan(index, input, upload), /corretas e distratoras/);
  input.semanticResolution = 'SAME_CONCEPT_KEEP_ANSWER_ROLES';
  const plan = buildReplacementPlan(index, input, upload);
  assert.equal(plan.positions.length, source.counts.positions);
  const overlay = buildEditorialOverlay({ revisionId: 'qa-global', plan, upload, assetPath: `content/english/assets/images/approved/shared/${upload.sha256.slice(0,12)}.png`, baseBranch: 'qa-test' });
  overlay.asset.path = `content/english/assets/images/approved/shared/${upload.sha256.slice(0,12)}.png`;
  const registry = await registryFile(); const questionsByModule = await questionFiles();
  const registryBefore = structuredClone(registry); const questionsBefore = structuredClone(questionsByModule);
  const result = applyReplacementOverlay({ overlay, registry, questionsByModule, assetBytes: bytes, v19ManifestSha256: index.manifestSha256 });
  assert.deepEqual(result.changed, [`media-registry:${mediaId}`]);
  const nextEntry = result.registry.entries.find(entry => entry.mediaId === mediaId);
  assert(nextEntry.assets.some(asset => asset.sha256 === upload.sha256 && asset.path === overlay.asset.path));
  for (const [moduleId, data] of result.questionsByModule) {
    for (const question of data.items) {
      const isListed = source.uses.some(use => use.moduleId === moduleId && use.itemId === question.item_id);
      if (!isListed) assert.deepEqual(question, questionsBefore.get(moduleId).items.find(item => item.item_id === question.item_id));
    }
  }
  for (const entry of result.registry.entries.filter(entry => entry.mediaId !== mediaId)) assert.deepEqual(entry, registryBefore.entries.find(old => old.mediaId === entry.mediaId));
});

test('substituição individual mantém as outras 599 questões byte a byte equivalentes', async () => {
  const question = index.questions.find(q => q.moduleId === 'Y1M01' && q.itemId === 'Y1M01-Q001');
  const sourceUse = question.references.find(ref => ref.roleId === 'stimulus'); assert(sourceUse);
  const bytes = await readFile(path.join(v19, 'content/english/assets/images/year-1/module-01/temporary/17b5d6b93dc5-bye-tchau.png'));
  const upload = uploadFrom(bytes);
  const plan = buildReplacementPlan(index, { sourceMediaId: sourceUse.mediaId, scope: 'QUESTION_ONLY', moduleId: question.moduleId, itemId: question.itemId, roleIds: [sourceUse.roleId], assetUploadId: upload.uploadId }, upload);
  const overlay = buildEditorialOverlay({ revisionId: 'qa-question-only', plan, upload, assetPath: `content/english/assets/images/approved/${question.moduleId}/${question.itemId}/${upload.sha256.slice(0,12)}.png`, baseBranch: 'qa-test' });
  const registry = await registryFile(); const before = await questionFiles();
  const beforeSerialized = new Map([...before].flatMap(([moduleId, data]) => data.items.map(item => [`${moduleId}/${item.item_id}`, JSON.stringify(item)])));
  const result = applyReplacementOverlay({ overlay, registry, questionsByModule: before, assetBytes: bytes, v19ManifestSha256: index.manifestSha256 });
  assert.deepEqual(result.changed, [`question:${question.moduleId}/${question.itemId}`, `media-registry:${plan.newMediaId}`]);
  for (const [moduleId, data] of result.questionsByModule) for (const item of data.items) {
    const key = `${moduleId}/${item.item_id}`;
    if (key === `${question.moduleId}/${question.itemId}`) assert.equal(valueAt(item, plan.questionPatches[0].pointer), plan.newMediaId);
    else assert.equal(JSON.stringify(item), beforeSerialized.get(key), `untouched question changed: ${key}`);
  }
  assert.equal(result.registry.entries.find(entry => entry.mediaId === sourceUse.mediaId).urlOrPath, registry.entries.find(entry => entry.mediaId === sourceUse.mediaId).urlOrPath);
  const pendingEntry = result.registry.entries.find(entry => entry.mediaId === plan.newMediaId);
  assert(pendingEntry && pendingEntry.assets[0].sha256 === upload.sha256);
  assert.equal(pendingEntry.status, 'PENDING_HUMAN_REVIEW');
  const approved = applyReplacementOverlay({ overlay: { ...overlay, status: 'APPROVED' }, registry, questionsByModule: before, assetBytes: bytes, v19ManifestSha256: index.manifestSha256 });
  assert.equal(approved.registry.entries.find(entry => entry.mediaId === plan.newMediaId).status, 'APPROVED');
});

test('upload valida assinatura real, dimensões, hash e persistência imutável/deduplicada', async () => {
  const bytes = await readFile(path.join(v19, 'content/english/assets/images/year-1/module-01/temporary/17b5d6b93dc5-bye-tchau.png'));
  const checked = validateReplacementAsset(bytes, 'saudacao.png');
  assert.equal(checked.format, 'png'); assert(checked.width > 0 && checked.height > 0); assert.equal(checked.sha256, uploadFrom(bytes).sha256);
  assert.throws(() => validateReplacementAsset(bytes, 'saudacao.webp'), /extensão precisa corresponder/);
  assert.throws(() => validateReplacementAsset(Buffer.from('not-an-image-bytes'), 'bad.png'), /entre 32 bytes/);
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'duduq-media-studio-upload-'));
  try {
    const first = await storeReplacementUpload({ dataDir, filename: 'saudacao.png', buffer: bytes, alpha: 'QA_ONLY_CHECK' });
    const second = await storeReplacementUpload({ dataDir, filename: 'duplicada.png', buffer: bytes, alpha: 'QA_ONLY_CHECK' });
    assert.equal(first.uploadId, second.uploadId); assert.equal(first.sha256, second.sha256);
  } finally { await rm(dataDir, { recursive: true, force: true }); }
});

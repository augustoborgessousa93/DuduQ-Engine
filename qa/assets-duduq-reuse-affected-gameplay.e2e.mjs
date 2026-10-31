#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const base = (process.env.BASE_URL || 'http://127.0.0.1:4175').replace(/\/+$/, '');
const bundlePath = path.resolve(process.env.DUDUQ_MEDIA_CANDIDATE_BUNDLE || 'qa/media-candidates/assets-duduq-reuse-20261030');
const output = path.resolve(process.env.DUDUQ_MEDIA_BROWSER_OUT || 'qa/results/assets-duduq-browser/affected-gameplay');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const norm = value => String(value ?? '').trim().toLocaleLowerCase('en-US');
const manifest = JSON.parse(await readFile(path.join(bundlePath, 'batch-manifest.json'), 'utf8'));
const crosswalk = JSON.parse(await readFile('qa/results/assets-duduq-question-crosswalk.json', 'utf8'));
const moduleData = JSON.parse(await readFile('dist-pages/content/english/year-1/module-04/questions.json', 'utf8'));
const registry = JSON.parse(await readFile('dist-pages/content/english/media/media-registry.json', 'utf8'));
const registryById = new Map(registry.entries.map(entry => [entry.mediaId, entry]));
const questionById = new Map(moduleData.items.map(question => [question.item_id, question]));
const crossById = new Map(crosswalk.questions.map(question => [question.questionId, question]));
const questionIds = ['Y1M04-Q010', 'Y1M04-Q015', 'Y1M04-Q020'];
const view = { width: 390, height: 844 };
const sha = async file => hash(await readFile(file));
await mkdir(output, { recursive: true });
const report = {
  schemaVersion: 'ASSETS_DUDUQ_AFFECTED_TARGET_SHOOTER_GAMEPLAY_V1',
  status: 'RUNNING',
  candidateSourceCommit: manifest.sourceCommit,
  candidateAssets: manifest.assets.map(asset => ({ assetKey: asset.assetKey, sha256: asset.sha256 })),
  viewport: view,
  questions: [],
  productionDeployed: false
};
const reportPath = path.join(output, 'report.json');
const persist = async () => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');

function attachDiagnostics(page) {
  const pageErrors = [], requestFailures = [];
  page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
  page.on('requestfailed', request => {
    const failure = String(request.failure()?.errorText || '');
    if (!failure.includes('ERR_ABORTED')) requestFailures.push({ url: request.url(), failure });
  });
  return { pageErrors, requestFailures };
}
async function realClick(page, locator, label, events) {
  await locator.waitFor({ state: 'visible', timeout: 12000 });
  const box = await locator.boundingBox();
  assert(box && box.width > 1 && box.height > 1, 'POINTER_TARGET_NOT_VISIBLE:' + label);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const hit = await page.evaluate(({ x, y }) => {
    const node = document.elementFromPoint(x, y);
    return !!node && node.getBoundingClientRect().width > 0;
  }, { x, y });
  assert(hit, 'ELEMENT_FROM_POINT_MISSED:' + label);
  await page.mouse.move(x, y, { steps: 3 });
  await page.mouse.down();
  await page.mouse.up();
  events.push({ label, x, y, realMouse: true });
}
async function awaitFeedback(page, semantic, expected, events) {
  const readyToConfirm = await page.waitForFunction(({ semantic, expected }) => {
    const target = [...document.querySelectorAll('.target-shooter-target')]
      .find(node => [...node.querySelectorAll('img')].some(img => img.alt === semantic));
    const ribbon = document.querySelector('.feedback-ribbon');
    if (target?.dataset.gameplayState === expected && ribbon?.dataset.feedback === expected && !ribbon.hidden) return 'resolved';
    const action = document.querySelector('.feedback-action');
    const rect = action?.getBoundingClientRect();
    const style = action && getComputedStyle(action);
    return action && rect.width > 4 && rect.height > 4 && style.display !== 'none' && style.visibility !== 'hidden' &&
      document.querySelector('#game')?.dataset.duduqInteractionState === 'AWAITING_CONFIRM' &&
      /confirmar/i.test(action.textContent || '') ? 'confirm' : false;
  }, { semantic, expected }, { timeout: 15000 }).then(handle => handle.jsonValue());
  if (readyToConfirm === 'confirm') {
    await realClick(page, page.locator('.feedback-action'), 'confirm-' + expected, events);
    await page.waitForFunction(({ semantic, expected }) => {
      const target = [...document.querySelectorAll('.target-shooter-target')]
        .find(node => [...node.querySelectorAll('img')].some(img => img.alt === semantic));
      const ribbon = document.querySelector('.feedback-ribbon');
      return target?.dataset.gameplayState === expected && ribbon?.dataset.feedback === expected && !ribbon.hidden;
    }, { semantic, expected }, { timeout: 15000 });
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const questionId of questionIds) {
    const result = { questionId, pass: false, events: [], screenshots: [], errors: [] };
    report.questions.push(result);
    await persist();
    let context;
    try {
      const question = questionById.get(questionId), cross = crossById.get(questionId);
      assert(question && cross && question.mechanicId === 'target-shooter' && cross.mechanic === 'target-shooter',
        'CANONICAL_QUESTION_MECHANIC_MISMATCH:' + questionId);
      assert.equal(question.item_id, questionId);
      const correctAnswer = norm(cross.correctAnswer);
      const correct = cross.options.find(option => norm(option.answerKey) === correctAnswer);
      const wrong = cross.options.find(option => norm(option.answerKey) !== correctAnswer);
      assert(correct && wrong, 'CORRECT_OR_INCORRECT_OPTION_MISSING:' + questionId);
      const expectedSemantics = cross.options.map(option => norm(option.semanticTarget || option.answerKey)).sort();
      const candidateBindings = manifest.assets.flatMap(asset => asset.bindings.map(binding => ({
        asset, binding
      }))).filter(({ binding }) => binding.questionId === questionId);
      assert(candidateBindings.length > 0, 'NO_CANDIDATE_BINDINGS_FOR:' + questionId);
      for (const { asset, binding } of candidateBindings) {
        const option = cross.options.find(item => item.mediaId === binding.mediaId);
        const registryEntry = registryById.get(binding.mediaId);
        assert(option && registryEntry, 'CANDIDATE_OPTION_OR_REGISTRY_MISSING:' + binding.mediaId);
        assert.equal(norm(option.semanticTarget), norm(asset.semanticTarget), 'SEMANTIC_BINDING_CONFLICT:' + binding.mediaId);
        const bytes = await readFile(path.join('dist-pages', registryEntry.urlOrPath));
        assert.equal(hash(bytes), asset.sha256, 'CANDIDATE_BYTES_HASH_MISMATCH:' + binding.mediaId);
        result.candidateBindings ??= [];
        result.candidateBindings.push({ mediaId: binding.mediaId, semanticTarget: asset.semanticTarget, sha256: asset.sha256 });
      }
      context = await browser.newContext({ viewport: view });
      const page = await context.newPage();
      const diag = attachDiagnostics(page);
      const route = '/play/target-shooter/?duduqModule=Y1M04&duduqItem=' + encodeURIComponent(questionId) + '&qaSeed=20261031';
      result.route = route;
      await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('#game', { timeout: 20000 });
      const audio = page.locator('.audio-button').first();
      await realClick(page, audio, 'audio-gate-start', result.events);
      await page.waitForTimeout(700);
      await realClick(page, audio, 'audio-gate-replay', result.events);
      await page.waitForFunction(() => document.querySelector('#game')?.dataset.duduqInteractionState === 'READY', null, { timeout: 30000 });
      const identity = await page.locator('.target-shooter-target').evaluateAll((targets, expected) => {
        const norm = value => String(value || '').trim().toLocaleLowerCase('en-US');
        return targets.map(target => {
          const rect = target.getBoundingClientRect();
          const images = [...target.querySelectorAll('img')];
          const foreground = images.filter(image => expected.includes(norm(image.alt)));
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return {
            semantics: foreground.map(image => norm(image.alt)),
            visible: rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 &&
              rect.right <= innerWidth && rect.bottom <= innerHeight && getComputedStyle(target).visibility === 'visible',
            hit: hit === target || target.contains(hit),
            locked: target.classList.contains('duduq-interaction-locked'),
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }
          };
        });
      }, expectedSemantics);
      const actualSemantics = identity.flatMap(target => target.semantics).sort();
      assert.deepEqual(actualSemantics, expectedSemantics, 'CURRICULAR_OPTIONS_NOT_RENDERED:' + questionId);
      assert(identity.length === expectedSemantics.length && identity.every(target => target.visible && target.hit && !target.locked),
        'TARGETS_NOT_VISIBLE_AND_CLICKABLE:' + questionId);
      result.targetsReady = identity;
      const candidateMedia = candidateBindings.map(({ asset, binding }) => {
        const entry = registryById.get(binding.mediaId);
        return { mediaId: binding.mediaId, path: entry.urlOrPath, semanticTarget: asset.semanticTarget };
      });
      result.candidateMediaVisible = await page.locator('img').evaluateAll((images, paths) => images
        .filter(image => paths.includes(new URL(image.src).pathname.replace(/^\//, '')))
        .map(image => ({ path: new URL(image.src).pathname.replace(/^\//, ''), alt: image.alt,
          loaded: image.complete && image.naturalWidth > 0,
          visible: (() => { const r = image.getBoundingClientRect(); return r.width > 2 && r.height > 2 &&
            r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })() })), candidateMedia.map(item => item.path));
      assert(result.candidateMediaVisible.length === candidateMedia.length &&
        result.candidateMediaVisible.every(image => image.loaded && image.visible), 'CANDIDATE_IMAGE_NOT_RENDERED:' + questionId);
      const shot = async suffix => {
        const file = path.join(output, questionId.toLowerCase() + '-' + suffix + '.png');
        await page.screenshot({ path: file, fullPage: false });
        result.screenshots.push({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: await sha(file) });
      };
      await shot('ready');
      const target = semantic => page.locator('.target-shooter-target').filter({ has: page.locator('img[alt="' + semantic + '"]') });
      const wrongSemantic = norm(wrong.semanticTarget || wrong.answerKey);
      await realClick(page, target(wrongSemantic), 'select-wrong-' + wrong.answerKey, result.events);
      await page.waitForFunction(semantic => [...document.querySelectorAll('.target-shooter-target')]
        .some(node => [...node.querySelectorAll('img')].some(img => String(img.alt || '').trim().toLocaleLowerCase('en-US') === semantic) &&
          ['selected', 'incorrect'].includes(node.dataset.gameplayState)), wrongSemantic, { timeout: 10000 });
      await awaitFeedback(page, wrongSemantic, 'incorrect', result.events);
      const ribbonWrong = page.locator('.feedback-ribbon');
      await page.waitForFunction(() => { const r = document.querySelector('.feedback-ribbon');
        return r?.dataset.feedback === 'incorrect' && !r.hidden; }, null, { timeout: 15000 });
      await shot('incorrect');
      const retry = page.locator('.feedback-action');
      result.retryLabel = (await retry.innerText()).replace(/\s+/g, ' ').trim();
      assert(/tentar novamente|tentar de novo|try again|retry/i.test(result.retryLabel), 'RETRY_CONTROL_MISSING:' + questionId);
      await realClick(page, retry, 'retry', result.events);
      await page.waitForFunction(() => document.querySelector('#game')?.dataset.duduqInteractionState === 'READY' &&
        ![...document.querySelectorAll('.target-shooter-target')].some(node => node.dataset.gameplayState === 'incorrect'),
        null, { timeout: 15000 });
      await shot('retry-ready');
      const correctSemantic = norm(correct.semanticTarget || correct.answerKey);
      await realClick(page, target(correctSemantic), 'select-correct-' + correct.answerKey, result.events);
      await page.waitForFunction(semantic => [...document.querySelectorAll('.target-shooter-target')]
        .some(node => [...node.querySelectorAll('img')].some(img => String(img.alt || '').trim().toLocaleLowerCase('en-US') === semantic) &&
          ['selected', 'correct'].includes(node.dataset.gameplayState)), correctSemantic, { timeout: 10000 });
      await awaitFeedback(page, correctSemantic, 'correct', result.events);
      await page.waitForFunction(() => { const r = document.querySelector('.feedback-ribbon');
        return r?.dataset.feedback === 'correct' && !r.hidden; }, null, { timeout: 15000 });
      await shot('correct');
      result.finalFeedback = await page.locator('.feedback-ribbon').getAttribute('data-feedback');
      result.pageErrors = diag.pageErrors;
      result.requestFailures = diag.requestFailures;
      const actionLabels = new Set(result.events.map(event => event.label));
      result.pass = result.finalFeedback === 'correct' && actionLabels.has('select-wrong-' + wrong.answerKey) &&
        actionLabels.has('retry') && actionLabels.has('select-correct-' + correct.answerKey) &&
        result.events.filter(event => event.realMouse).length >= 5 && !diag.pageErrors.length && !diag.requestFailures.length;
      if (!result.pass) throw new Error('REAL_GAMEPLAY_ASSERTION_FAILED:' + questionId);
    } catch (error) {
      result.error = String(error?.stack || error);
      result.pass = false;
      result.pageErrors ??= [];
      result.requestFailures ??= [];
    } finally {
      await context?.close().catch(() => {});
      await persist();
    }
  }
  report.passes = report.questions.filter(question => question.pass).length;
  report.failures = report.questions.length - report.passes;
  report.status = report.passes === questionIds.length ? 'PASS_ALL_AFFECTED_QUESTIONS_REAL_GAMEPLAY' : 'FAIL';
  await persist();
  if (report.status !== 'PASS_ALL_AFFECTED_QUESTIONS_REAL_GAMEPLAY') process.exitCode = 1;
} finally {
  await browser.close();
}

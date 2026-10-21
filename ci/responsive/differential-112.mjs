import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baselineOrigin = process.env.BASELINE_ORIGIN || 'http://127.0.0.1:4173';
const candidateOrigin = process.env.CANDIDATE_ORIGIN || 'http://127.0.0.1:4174';
const expectedCandidateHash = 'a94b510cf4178a4ae84aba352d15ea9fe1a0ed66545a8071822f3ec49434b829';
const cases = JSON.parse(await readFile('ci/fixtures/differential-112.json', 'utf8'));
assert.equal(cases.length, 112, 'exact differential case count');
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const browserVersion = browser.version();
const rows = [];
const normalizeUrl = value => { try { const u = new URL(value); return `${u.pathname}${u.search}`; } catch { return value; } };

async function probe(origin, item) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [], httpErrors = [], requestFailures = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) httpErrors.push({ status: response.status(), url: normalizeUrl(response.url()) }); });
  page.on('requestfailed', request => requestFailures.push({ url: normalizeUrl(request.url()), error: request.failure()?.errorText || 'unknown' }));
  const started = Date.now();
  let result;
  try {
    const response = await page.goto(new URL(item.route, origin).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const sample = await page.evaluate(async () => {
      const moduleId = new URL(location.href).searchParams.get('duduqModule') || '';
      const api = moduleId === 'Y1M01' ? window.DuduQY1M01 : window.DuduQProductionQuestionBootstrap;
      let contract = null, readyError = null;
      try {
        if (!api?.ready) throw new Error('ACTIVITY_BOOTSTRAP_MISSING');
        const c = await Promise.race([api.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('BOOT_READY_TIMEOUT')), 12000))]);
        contract = { moduleId: c?.moduleId || api.moduleId, itemId: c?.item?.item_id || c?.item?.questionId || c?.item?.id,
          mechanic: c?.mechanic || c?.item?.mechanicId };
      } catch (e) { readyError = String(e?.message || e); }
      const root = document.querySelector('#game,#smart-sentence-root,#memory-quest-root');
      const rect = root?.getBoundingClientRect();
      const visibleNodes = root ? [...root.querySelectorAll('canvas,svg,img,button,[role=button],.duduq-canonical-question-hud,.smart-sentence-instruction,.question-panel,[data-target-id],[data-bubble-id],[data-item-id],[data-drop-target-id]')]
        .filter(node => { const r = node.getBoundingClientRect(), s = getComputedStyle(node); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; }).length : 0;
      return { contract, readyError, root: root?.id || root?.className || null,
        rootBounds: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
        visibleNodes, rootTextLength: (root?.innerText || '').trim().length, alert: document.querySelector('[role=alert]')?.innerText || null,
        assetErrors: [...document.querySelectorAll('img')].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.getAttribute('src')) };
    });
    const identity = sample.contract?.moduleId === item.module && sample.contract?.itemId === item.activityId && sample.contract?.mechanic === item.mechanic;
    const rendered = Boolean(sample.rootBounds?.width > 100 && sample.rootBounds?.height > 100 && sample.visibleNodes > 0);
    result = { result: identity && rendered ? 'PASS' : 'BOOT_ISSUE', httpStatus: response?.status() ?? null, identity, rendered, sample,
      consoleErrors, pageErrors, httpErrors, requestFailures, elapsedMs: Date.now() - started };
  } catch (error) {
    result = { result: 'BOOT_ISSUE', navigationError: String(error?.message || error), consoleErrors, pageErrors, httpErrors, requestFailures, elapsedMs: Date.now() - started };
  } finally { await context.close(); }
  return result;
}

function signature(value) {
  return JSON.stringify({ result: value.result, httpStatus: value.httpStatus ?? null, navigationError: value.navigationError || null,
    readyError: value.sample?.readyError || null, contract: value.sample?.contract || null, root: value.sample?.root || null,
    visibleNodes: value.sample?.visibleNodes ?? null, alert: value.sample?.alert || null,
    pageErrors: [...(value.pageErrors || [])].sort(), httpErrors: [...(value.httpErrors || [])].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
    requestFailures: [...(value.requestFailures || [])].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))) });
}
try {
  for (let index = 0; index < cases.length; index++) {
    const item = cases[index];
    const baseline = await probe(baselineOrigin, item);
    const candidate = await probe(candidateOrigin, item);
    let classification;
    if (baseline.navigationError && candidate.navigationError && /ECONNREFUSED|ERR_CONNECTION_REFUSED|net::ERR_/i.test(baseline.navigationError + candidate.navigationError)) classification = 'ENVIRONMENT_FAILURE';
    else if (baseline.result === 'PASS' && candidate.result !== 'PASS') classification = 'NEW_REGRESSION';
    else if (baseline.result !== 'PASS' && candidate.result === 'PASS') classification = 'CANDIDATE_IMPROVEMENT';
    else if (signature(baseline) === signature(candidate)) classification = 'PREEXISTING_IDENTICAL';
    else classification = 'INCONCLUSIVE';
    rows.push({ activityId: item.activityId, moduleId: item.module, mechanic: item.mechanic, route: item.route, baseline, candidate, classification });
    if ((index + 1) % 16 === 0) console.log(`DIFFERENTIAL ${index + 1}/${cases.length}`);
  }
} finally { await browser.close(); }
const names = ['PREEXISTING_IDENTICAL','NEW_REGRESSION','CANDIDATE_IMPROVEMENT','ENVIRONMENT_FAILURE','INCONCLUSIVE'];
const counts = Object.fromEntries(names.map(name => [name, rows.filter(row => row.classification === name).length]));
const status = rows.length === 112 && counts.NEW_REGRESSION === 0 && counts.ENVIRONMENT_FAILURE === 0 && counts.INCONCLUSIVE === 0 ? 'PASS' : 'ISSUE';
const report = { schema: 'DUDUQ_BASELINE_CANDIDATE_DIFFERENTIAL_CI_V1', testedAt: new Date().toISOString(), browser: 'Chromium', browserVersion,
  viewport: { width: 1366, height: 768 }, baseline: { origin: baselineOrigin, manifestSha256: 'd2155c9f546d3316774af3cea0476877fdf074a6cbebcbe04dedf7ebed7a29c6' },
  candidate: { origin: candidateOrigin, manifestSha256: expectedCandidateHash }, requested: 112, completed: rows.length, counts, rows, status };
await writeFile('differential-112-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status, completed: rows.length, counts }, null, 2));
assert.equal(status, 'PASS', 'no candidate regressions or inconclusive cases');


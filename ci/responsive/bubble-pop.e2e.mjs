import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';
const origin = process.env.DUDUQ_QA_ORIGIN || 'http://127.0.0.1:4190';
const artifactRoot = process.env.DUDUQ_EXPECTED_ROOT || 'artifacts/responsive-release-candidate-v3';
const buildManifestSha256 = process.env.DUDUQ_CANDIDATE_BUILD_HASH || null;
const outDir = process.env.DUDUQ_EVIDENCE_DIR || 'artifacts/responsive-release-candidate-v3/evidence/bubble-pop';
const reportPath = process.env.DUDUQ_REPORT_PATH || 'docs/qa/DUDUQ_BUBBLE_POP_CSS_HOTFIX_E2E_2026-10-21.json';
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
const pageErrors = [], requestErrors = [], rows = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) requestErrors.push({ status: r.status(), url: r.url() }); });
page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') requestErrors.push({ error: r.failure()?.errorText, url: r.url() }); });
let frame;
const report = { schema: 'DUDUQ_BUBBLE_POP_CSS_HOTFIX_E2E_V1', testedAt: new Date().toISOString(), origin, servedRoot: null, candidateBuildManifestSha256: buildManifestSha256, servedCssSha256: null, route: '/play/english/year-1/module-01/', activity: 'Y1M01-Q002', result: 'FAIL', pageErrors, requestErrors, sizes: [], flow: {} };

async function setSize(width, height) {
  await page.locator('#qa-container').evaluate((node, size) => { node.style.width = `${size.width}px`; node.style.height = `${size.height}px`; }, { width, height });
  await page.waitForFunction(([w, h]) => { const f = document.querySelector('iframe'); return f?.clientWidth === w && f?.clientHeight === h; }, [width, height]);
  await frame.waitForFunction(([w, h]) => { const r = document.querySelector('#game')?.getBoundingClientRect(); return r && Math.round(r.width) === w && Math.round(r.height) === h; }, [width, height]);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function feedbackGeometry(label, expectedState) {
  const data = await frame.evaluate(expected => {
    const root = document.querySelector('#game'), ribbon = document.querySelector(`.feedback-ribbon:not([hidden])[data-feedback="${expected}"]`);
    if (!root || !ribbon) return null;
    const action = ribbon.querySelector('.feedback-action'), title = ribbon.querySelector('.feedback-copy h2'), subtitle = ribbon.querySelector('.feedback-copy p');
    const box = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, left:r.left, right:r.right, top:r.top, bottom:r.bottom }; };
    const rr = box(root), fr = box(ribbon), ar = box(action), tr = box(title), sr = box(subtitle);
    const visible = el => { const c = getComputedStyle(el), r = el.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && Number(c.opacity) > 0 && r.width > 0 && r.height > 0; };
    const clipped = el => { if (!el) return false; const c=getComputedStyle(el); return ((c.overflowX==='hidden'||c.overflowX==='clip')&&el.scrollWidth>el.clientWidth+1)||((c.overflowY==='hidden'||c.overflowY==='clip')&&el.scrollHeight>el.clientHeight+1); };
    return { state:ribbon.dataset.feedback, root:rr, feedback:fr, action:ar, title:tr, subtitle:sr, text:{ title:title?.textContent.trim(), subtitle:subtitle?.textContent.trim(), action:action?.textContent.trim() }, textMetrics:{title:title?{client:[title.clientWidth,title.clientHeight],scroll:[title.scrollWidth,title.scrollHeight],overflow:getComputedStyle(title).overflow}:null,subtitle:subtitle?{client:[subtitle.clientWidth,subtitle.clientHeight],scroll:[subtitle.scrollWidth,subtitle.scrollHeight],overflow:getComputedStyle(subtitle).overflow}:null}, visible:visible(ribbon), actionVisible:visible(action), actionEnabled:Boolean(action && !action.disabled && action.getAttribute('aria-disabled') !== 'true'), margins:{ left:fr.left-rr.left, right:rr.right-fr.right }, clipping:{ title:clipped(title), subtitle:clipped(subtitle) }, scroll:[document.documentElement.scrollWidth-document.documentElement.clientWidth,document.documentElement.scrollHeight-document.documentElement.clientHeight] };
  }, expectedState);
  report.sizes.push({ label, viewport: await frame.evaluate(() => [innerWidth,innerHeight]), ...data });
  await page.screenshot({ path: `${outDir}/${label}-${expectedState}.png` });
  assert.ok(data, `${label}: ${expectedState} feedback exists`);
  assert.ok(data.visible && data.actionVisible && data.actionEnabled, `${label}: feedback/action visible and enabled`);
  assert.ok(data.text.title && data.text.subtitle && data.text.action, `${label}: canonical text present`);
  assert.ok(data.margins.left >= 12 && data.margins.right >= 12, `${label}: feedback safe side margins (actual ${JSON.stringify(data.margins)})`);
  assert.ok(data.feedback.left >= data.root.left && data.feedback.right <= data.root.right, `${label}: feedback inside game root`);
  assert.ok(data.action.left >= data.root.left && data.action.right <= data.root.right, `${label}: action hitbox inside game root`);
  assert.ok(data.title.left >= data.root.left && data.title.right <= data.root.right && data.subtitle.left >= data.root.left && data.subtitle.right <= data.root.right, `${label}: feedback copy inside game root`);
  assert.ok(!data.clipping.title && !data.clipping.subtitle, `${label}: feedback copy is not clipped`);
  assert.deepEqual(data.scroll, [0,0], `${label}: no document scroll`);
  return data;
}

async function waitBubble(correct) {
  return frame.waitForFunction(want => {
    const entities = window.DuduQBubblePopShell?.engine?.snapshot?.().entities || [];
    for (const entity of entities) {
      if (entity.correct !== want || entity.state !== 'AVAILABLE') continue;
      const node = document.querySelector(`[data-bubble-id="${CSS.escape(entity.id)}"]`); if (!node) continue;
      const r=node.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
      if(r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&document.elementFromPoint(x,y)?.closest('.bubble-pop-playable')===node) return { id:entity.id, rect:r.toJSON() };
    }
    return false;
  }, correct, { timeout:30000 }).then(h => h.jsonValue());
}

async function clickBubble(target) {
  const point = await frame.evaluate(id => { const node=document.querySelector(`[data-bubble-id="${CSS.escape(id)}"]`); if(!node)return null; const r=node.getBoundingClientRect(), x=r.left+r.width/2,y=r.top+r.height/2; return {x,y,hit:document.elementFromPoint(x,y)?.closest('.bubble-pop-playable')===node,rect:r.toJSON()}; }, target.id);
  assert.ok(point?.hit, `bubble ${target.id} is measured at a live hit point`);
  const host = await page.locator('iframe').boundingBox(); assert.ok(host);
  await page.mouse.click(host.x + point.x, host.y + point.y);
  await frame.waitForFunction(id => window.DuduQBubblePopShell.engine.snapshot().entities.some(e=>e.id===id&&e.state==='POPPED'), target.id, {timeout:12000});
  return {id:target.id, point, transition:'AVAILABLEâ†’POPPED'};
}

try {
  if (process.env.DUDUQ_REMOTE_QA === '1') {
    report.servedRoot = 'verified-by-remote-preview-css-hash';
    const cssBytes = Buffer.from(await (await fetch(`${origin}/core/duduq-live-hud.css`)).arrayBuffer());
    report.servedCssSha256 = createHash('sha256').update(cssBytes).digest('hex');
    assert.equal(report.servedCssSha256, process.env.DUDUQ_EXPECTED_CORE_CSS_SHA256, 'remote preview serves the authorized candidate CSS');
  } else {
    const expectedRoot = await realpath(path.resolve(artifactRoot));
    const serverStatus = await (await fetch(`${origin}/__duduq/status`)).json();
    report.servedRoot = await realpath(serverStatus.root);
    assert.equal(report.servedRoot, expectedRoot, 'test server is rooted at exact candidate artifact');
    const cssBytes = Buffer.from(await (await fetch(`${origin}/core/duduq-live-hud.css`)).arrayBuffer());
    report.servedCssSha256 = createHash('sha256').update(cssBytes).digest('hex');
    const diskCssHash = createHash('sha256').update(await readFile(path.join(expectedRoot,'core/duduq-live-hud.css'))).digest('hex');
    assert.equal(report.servedCssSha256, diskCssHash, 'served responsive CSS hash matches candidate artifact');
  }
  await page.goto(`${origin}/`, { waitUntil:'domcontentloaded' });
  await page.evaluate(route => { document.documentElement.style.cssText='margin:0;width:100%;height:100%;overflow:hidden'; document.body.style.cssText='margin:0;width:100%;height:100%;overflow:hidden'; document.body.innerHTML=`<main id="qa-container" style="width:900px;height:600px;margin:0 auto"><iframe title="DUDUQ release QA" style="display:block;width:100%;height:100%;border:0" src="${route}"></iframe></main>`; }, `${origin}/play/english/year-1/module-01/`);
  await page.waitForFunction(() => { try { return document.querySelector('iframe')?.contentWindow.location.pathname.includes('/play/intro-module/'); } catch { return false; } }, null, { timeout:20000 });
  frame = page.frames().find(f => f.parentFrame()===page.mainFrame()); assert.ok(frame);
  await frame.locator('[data-intro-start]').click();
  await frame.waitForFunction(() => new URL(location.href).searchParams.get('duduqItem')==='Y1M01-Q001', null, {timeout:20000});
  await frame.waitForFunction(() => document.querySelector('#game')?.dataset.duduqInteractionState==='READY' && document.querySelectorAll('.target-shooter-target:not([hidden])').length>0, null, {timeout:45000});
  const q1 = await frame.evaluate(() => window.DuduQTargetShooterStatic.content.correctTargetIds[0]);
  await frame.locator(`.target-shooter-target[data-target-id="${q1}"]`).click();
  await frame.waitForFunction(() => document.querySelector('.feedback-ribbon:not([hidden])')?.dataset.feedback==='correct', null, {timeout:20000});
  await frame.waitForFunction(() => {const b=document.querySelector('.feedback-ribbon:not([hidden]) .feedback-action');return b&&!b.disabled}, null, {timeout:45000});
  await frame.locator('.feedback-ribbon:not([hidden]) .feedback-action').click();
  await frame.waitForFunction(() => new URL(location.href).searchParams.get('duduqItem')==='Y1M01-Q002', null, {timeout:15000});
  await frame.waitForFunction(() => window.DuduQY1M01?.ready&&window.DuduQBubblePopShell?.engine?.snapshot?.().entities?.length>0, null, {timeout:20000});
  await frame.waitForFunction(() => ['READY','ACTIVE'].includes(document.querySelector('#game')?.dataset.duduqInteractionState), null, {timeout:45000});
  report.flow.session = 'official Intro â†’ Q001 correct â†’ Continue â†’ Q002';
  report.flow.boot = await frame.evaluate(async () => ({ item:(await window.DuduQY1M01.ready).item?.item_id, root:document.querySelector('#game').className, candidates:window.DuduQBubblePopShell.engine.snapshot().entities.length }));
  assert.equal(report.flow.boot.item, 'Y1M01-Q002');
  const bad = await waitBubble(false), badClick = await clickBubble(bad);
  await frame.waitForFunction(() => document.querySelector('.feedback-ribbon:not([hidden])')?.dataset.feedback==='incorrect', null, {timeout:20000});
  report.flow.wrong = badClick;
  for (const size of [[900,600],[600,600],[1366,768],[1100,700],[768,600],[600,600],[900,600]]) {
    await setSize(...size); await feedbackGeometry(`${size[0]}x${size[1]}-incorrect`, 'incorrect');
  }
  const retry = frame.locator('.feedback-ribbon:not([hidden]) .feedback-action'); await retry.click();
  await frame.waitForFunction(() => document.querySelector('.feedback-ribbon')?.hidden===true && ['READY','ACTIVE'].includes(document.querySelector('#game')?.dataset.duduqInteractionState), null, {timeout:15000});
  report.flow.retry = 'real button click; feedback hidden; interaction READY/ACTIVE';
  await setSize(600,600);
  const initialTargets = Number(await frame.evaluate(() => window.DuduQBubblePopShell.activity.targetsToFind.length));
  report.flow.correctClicks=[];
  for(let i=0;i<initialTargets;i++) report.flow.correctClicks.push(await clickBubble(await waitBubble(true)));
  await frame.waitForFunction(() => document.querySelector('.feedback-ribbon:not([hidden])')?.dataset.feedback==='correct', null, {timeout:20000});
  for (const size of [[1366,768],[1100,700],[900,600],[768,600],[600,600],[900,600]]) {
    await setSize(...size); await feedbackGeometry(`${size[0]}x${size[1]}-correct`, 'correct');
  }
  await frame.locator('.feedback-ribbon:not([hidden]) .feedback-action').click();
  await frame.waitForFunction(() => new URL(location.href).searchParams.get('duduqItem')==='Y1M01-Q003', null, {timeout:15000});
  report.flow.continue = { clicked:true, advancedTo:'Y1M01-Q003' };
  assert.deepEqual(pageErrors, []); assert.deepEqual(requestErrors, []);
  report.result='PASS';
} catch(error) {
  report.result='FAIL'; report.error=String(error?.stack||error);
  report.lastState=await frame?.evaluate(() => ({url:location.href,item:new URL(location.href).searchParams.get('duduqItem'),interaction:document.querySelector('#game')?.dataset.duduqInteractionState,feedback:document.querySelector('.feedback-ribbon:not([hidden])')?.innerText})).catch(()=>null);
} finally {
  report.completedAt=new Date().toISOString();
  await writeFile(reportPath, `${JSON.stringify(report,null,2)}\n`);
  await browser.close();
}
console.log(JSON.stringify({result:report.result,report:reportPath,error:report.error||null},null,2));


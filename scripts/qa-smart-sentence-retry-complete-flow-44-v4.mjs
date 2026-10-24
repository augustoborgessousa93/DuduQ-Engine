import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const origin = process.env.DUDUQ_QA_ORIGIN || 'http://127.0.0.1:4177';
const queue = JSON.parse(await fs.readFile(path.join(root, 'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json'), 'utf8'));
const activityByQuestion = new Map();
for (const job of queue.jobs) for (const consumer of job.consumers || []) {
  const match = consumer.moduleId.match(/^Y(\d)M(\d+)$/);
  const doc = JSON.parse(await fs.readFile(path.join(root, `content/english/year-${match[1]}/module-${match[2]}/questions.json`), 'utf8'));
  const item = doc.items.find(x => x.item_id === consumer.questionId);
  assert(item, `Question missing: ${consumer.questionId}`);
  const existing = activityByQuestion.get(item.item_id) || { moduleId: consumer.moduleId, item, audio: [] };
  existing.audio.push({ audioId: job.audioId, transcript: job.transcript }); activityByQuestion.set(item.item_id, existing);
}
const { chromium } = await import(pathToFileURL('C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = []; const httpErrors = []; const results = []; let active = '';
page.on('pageerror', e => pageErrors.push({ activity: active, message: e.message }));
page.on('response', r => { if (r.status() >= 400) httpErrors.push({ activity: active, status: r.status(), url: r.url() }); });
await page.addInitScript(() => { window.__v4AudioEvents=[]; window.addEventListener('duduq:voice-state', e => window.__v4AudioEvents.push(e.detail)); });
const clickCenter = async locator => { const b=await locator.boundingBox(); assert(b, `${active}: missing hitbox`); await page.mouse.click(b.x+b.width/2,b.y+b.height/2); };
const readFeedback = async state => page.locator(`.feedback-ribbon:not([hidden])[data-feedback="${state}"]`).evaluate(n=>({title:n.querySelector('[data-slot="feedback-title"]')?.textContent.trim()||'',subtitle:n.querySelector('[data-slot="feedback-detail"]')?.textContent.trim()||'',action:n.querySelector('[data-slot="feedback-action"]')?.textContent.trim()||'',buttonDisabled:n.querySelector('.feedback-action')?.disabled??true,buttonVisible:!!n.querySelector('.feedback-action')?.getClientRects().length}));
try {
  for (const { moduleId, item, audio } of activityByQuestion.values()) {
    active=item.item_id;
    const urlBefore=`${origin}/play/smart-sentence/?duduqModule=${moduleId}&duduqItem=${item.item_id}`;
    try {
      const response=await page.goto(urlBefore,{waitUntil:'domcontentloaded',timeout:20000}); assert.equal(response?.status(),200,'route HTTP');
      await page.waitForSelector('#game.smart-sentence--complete',{timeout:15000});
      await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',{},{timeout:12000}).catch(async()=>{const play=page.locator('.duduq-instruction-audio-control');assert.equal(await play.count(),1,'instruction audio control');await clickCenter(play);await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:20000})});
      const correct=String(item.answerKey??item.answer??'').trim().toLowerCase(); const options=item.options||[];
      const wrong=options.find(o=>String(o.answerKey??o.optionId??'').trim().toLowerCase()!==correct); assert(wrong,'wrong answer option required for retry path');
      const optionFor=entry=>page.locator('.smart-sentence-option:not([hidden])').filter({hasText:new RegExp(`^${String(entry.label).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')}).first();
      await clickCenter(optionFor(wrong)); const confirm=page.locator('.smart-sentence-confirm-action:not([hidden])');
      await page.waitForFunction(()=>{const b=document.querySelector('.smart-sentence-confirm-action:not([hidden])');return b&&!b.disabled},null,{timeout:10000}); await clickCenter(confirm);
      await page.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="incorrect"]',{timeout:12000});
      const incorrect=await readFeedback('incorrect'); assert(incorrect.title&&incorrect.subtitle&&/TENTAR NOVAMENTE|TRY AGAIN/i.test(incorrect.action),'complete incorrect feedback');
      const retry=page.locator('.feedback-ribbon:not([hidden]) .feedback-action'); await page.waitForFunction(()=>{const b=document.querySelector('.feedback-ribbon:not([hidden]) .feedback-action');return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'},null,{timeout:20000}); await clickCenter(retry);
      for(const expected of audio){await page.waitForFunction(id=>window.__v4AudioEvents.some(e=>e?.state==='playing'&&e.audioId===id),expected.audioId,{timeout:15000});await page.waitForFunction(id=>window.__v4AudioEvents.some(e=>e?.state==='ended'&&e.audioId===id),expected.audioId,{timeout:18000})}
      await page.waitForFunction(n=>{const bs=[...document.querySelectorAll('.smart-sentence-option:not([hidden])')];return bs.length===n&&bs.every(b=>!b.disabled)},options.length,{timeout:35000});
      const right=options.find(o=>String(o.answerKey??'').trim().toLowerCase()===correct); assert(right,'correct option missing');
      await clickCenter(optionFor(right)); await page.waitForFunction(()=>{const b=document.querySelector('.smart-sentence-confirm-action:not([hidden])');return b&&!b.disabled},null,{timeout:10000}); await clickCenter(confirm);
      await page.waitForSelector('.feedback-ribbon:not([hidden])[data-feedback="correct"]',{timeout:15000});
      const correctFeedback=await readFeedback('correct'); assert(correctFeedback.title&&correctFeedback.subtitle,'complete correct feedback');
      const continueButton=page.locator('.feedback-ribbon:not([hidden]) .feedback-action');
      await page.waitForFunction(()=>{const b=document.querySelector('.feedback-ribbon:not([hidden]) .feedback-action');return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&getComputedStyle(b).pointerEvents!=='none'},null,{timeout:25000});
      const before=await page.evaluate(()=>({url:location.href,text:document.querySelector('#game')?.innerText||'',title:document.querySelector('#game [data-slot="feedback-title"]')?.textContent||''}));
      await clickCenter(continueButton);
      await page.waitForFunction(prior=>location.href!==prior.url||(document.querySelector('#game')?.innerText||'')!==prior.text, before,{timeout:15000});
      const after=await page.evaluate(()=>({url:location.href,question:document.querySelector('.duduq-canonical-question-hud')?.textContent.trim()||'',text:document.querySelector('#game')?.innerText||''}));
      results.push({moduleId,questionId:item.item_id,boot:'PASS',incorrect:'PASS',incorrectTitle:incorrect.title,incorrectSubtitle:incorrect.subtitle,retry:'PASS',retryAudio:audio.map(x=>x.audioId),retryReady:'PASS',correct:'PASS',correctTitle:correctFeedback.title,correctSubtitle:correctFeedback.subtitle,continueEnabled:'PASS',continueClicked:'PASS',advance:'PASS',beforeUrl:before.url,afterUrl:after.url,nextQuestion:after.question,result:'PASS'});
    } catch(e) { results.push({moduleId,questionId:item.item_id,result:'FAIL',error:e.message,url:page.url(),diagnostic:await page.evaluate(()=>({state:document.querySelector('#game')?.dataset.duduqInteractionState,feedback:document.querySelector('.feedback-ribbon:not([hidden])')?.outerHTML.slice(0,1200),errors:window.__duduqErrors||[]})).catch(()=>null)}); }
    if(results.length%10===0) console.log(`V4_SMART_SENTENCE_FULL_FLOW ${results.length}/${activityByQuestion.size}`);
  }
} finally { await browser.close(); }
const report={feature:'DUDUQ_SMART_SENTENCE_RETRY_COMPLETE_FLOW_44_V4',testedAt:new Date().toISOString(),source:origin,requested:activityByQuestion.size,completed:results.length,passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length,errors:pageErrors,httpErrors,activities:results,status:results.length===44&&results.every(x=>x.result==='PASS')?'PASS':'ISSUE'};
const out=path.join(root,'docs/qa/DUDUQ_SMART_SENTENCE_RETRY_COMPLETE_FLOW_44_V4.json'); await fs.writeFile(out,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({status:report.status,requested:report.requested,completed:report.completed,passed:report.passed,failed:report.failed,consoleErrors:pageErrors.length,httpErrors:httpErrors.length,output:out},null,2));
if(report.status!=='PASS')process.exitCode=1;

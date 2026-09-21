import assert from "node:assert/strict";

const endpoint = "http://127.0.0.1:9223";
const target = await (await fetch(`${endpoint}/json/new`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++nextId; const timer = setTimeout(() => reject(new Error(`${method} timeout`)), 20_000); const handler = event => { const message = JSON.parse(event.data); if (message.id !== id) return; ws.removeEventListener("message", handler); clearTimeout(timer); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); }; ws.addEventListener("message", handler); ws.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { return (await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value; }
async function pause(ms = 100) { await new Promise(resolve => setTimeout(resolve, ms)); }

try {
  await call("Page.enable");
  await call("Page.navigate", { url: "http://127.0.0.1:4173/test/runtime/matching-universal-host-harness.html" });
  await pause(7_000);
  const initial = await evaluate(`(() => { const shell=document.querySelector('.duduq-matching-visual-shell'); const visual=shell?.querySelector('[data-duduq-visual-package]'); const frame=shell?.querySelector('iframe'); const doc=frame?.contentDocument; return {shell:Boolean(shell),visual:Boolean(visual),source:Boolean(visual?.shadowRoot?.querySelector('#shape-50f514fe-4a8a-804d-8008-aa3b16cea7b7')),question:visual?.shadowRoot?.querySelector('#shape-50f514fe-4a8a-804d-8008-aa3b16e25219 text')?.textContent,frame:Boolean(frame),cards:doc?.querySelectorAll('.duduq-matching-card').length||0,audio:Boolean(doc?.querySelector('.duduq-matching-audio')),fatal:Boolean(doc?.querySelector('#duduq-runtime-error')),text:doc?.body?.innerText?.slice(0,300)}; })()`);
  console.log(JSON.stringify({ initial }));
  assert.equal(initial.shell, true); assert.equal(initial.visual, true); assert.equal(initial.source, true); assert.equal(initial.question, "Question one"); assert.equal(initial.frame, true); assert.equal(initial.cards, 4); assert.equal(initial.audio, true); assert.equal(initial.fatal, false);
  const audio = await evaluate(`(async()=>{const shell=document.querySelector('.duduq-matching-visual-shell');const doc=shell.querySelector('iframe').contentDocument;let calls=0;const button=doc.querySelector('.duduq-matching-audio');button.addEventListener('click',()=>calls++,{once:true});shell.querySelector('.duduq-matching-audio-binding').click();await new Promise(r=>setTimeout(r,80));return calls})()`);
  assert.equal(audio, 1);
  const incorrect = await evaluate(`(async()=>{const doc=document.querySelector('iframe').contentDocument;const cards=[...doc.querySelectorAll('.duduq-matching-card')];const labels=cards.map(c=>c.getAttribute('aria-label'));cards[0].click();await new Promise(r=>setTimeout(r,80));cards[2].click();await new Promise(r=>setTimeout(r,80));cards[1].click();await new Promise(r=>setTimeout(r,80));cards[3].click();await new Promise(r=>setTimeout(r,80));doc.querySelector('.duduq-matching-primary').click();await new Promise(r=>setTimeout(r,120));return {feedback:doc.querySelector('.duduq-matching-action-slot')?.getAttribute('data-feedback-state'),labels}})()`);
  console.log(JSON.stringify({ incorrect }));
  assert.equal(incorrect.feedback, "retry");
  const correct = await evaluate(`(async()=>{const doc=document.querySelector('iframe').contentDocument;const cards=[...doc.querySelectorAll('.duduq-matching-card')];for(const c of cards) if(c.getAttribute('data-paired')==='true') c.click();await new Promise(r=>setTimeout(r,80));cards[0].click();await new Promise(r=>setTimeout(r,80));cards[3].click();await new Promise(r=>setTimeout(r,80));cards[1].click();await new Promise(r=>setTimeout(r,80));cards[2].click();await new Promise(r=>setTimeout(r,80));doc.querySelector('.duduq-matching-primary').click();await new Promise(r=>setTimeout(r,800));return {feedback:doc.querySelector('.duduq-matching-action-slot')?.getAttribute('data-feedback-state'),text:doc.body.innerText}})()`);
  assert.equal(correct.feedback, "success");
  assert.match(correct.text, /Question two|Avançando/);
  const lifecycle = await evaluate(`(async()=>{const api=window.__matchingE2E;api.destroy();const empty=!document.querySelector('iframe');api.start();await new Promise(r=>setTimeout(r,2000));const remounted=Boolean(document.querySelector('iframe'));const visual=document.querySelector('[data-duduq-visual-package]');const runtime=visual.__duduqScreenRuntime;const before=runtime.package.manifest.hashes.markup;try{runtime.swap({});}catch(_){}const atomic=runtime.package?.manifest?.hashes?.markup===before;return {empty,remounted,atomic}})()`);
  assert.deepEqual(lifecycle, { empty: true, remounted: true, atomic: true });
  const responsive = [];
  for (const [width, height] of [[1920,1080],[1366,768],[1280,720],[640,360],[480,320]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 640 });
    await pause(120);
    const probe = await evaluate(`(()=>{const visual=document.querySelector('[data-duduq-visual-package]');const frame=document.querySelector('iframe');const box=visual?.getBoundingClientRect();return {visual:Boolean(visual),frame:Boolean(frame),width:Math.round(box?.width||0),height:Math.round(box?.height||0),fatal:Boolean(frame?.contentDocument?.querySelector('#duduq-runtime-error'))}})()`);
    assert.equal(probe.visual, true); assert.equal(probe.frame, true); assert.equal(probe.fatal, false); assert(probe.width > 0 && probe.height > 0);
    responsive.push({ width, height, ...probe });
  }
  await call("Emulation.clearDeviceMetricsOverride");
  console.log(JSON.stringify({ status: "PASS", initial, incorrect, correct: correct.feedback, audio, lifecycle, responsive }));
} finally { ws.close(); }

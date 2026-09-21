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
  await call("Page.navigate", { url: "http://127.0.0.1:4173/test/runtime/target-shooter-universal-host-harness.html" });
  await pause(7_000);
  const initial = await evaluate(`(() => { const shell=document.querySelector('.duduq-target-shooter-visual-shell'); const visual=shell?.querySelector('[data-duduq-visual-package]'); const frame=shell?.querySelector('iframe'); const doc=frame?.contentDocument; return {shell:Boolean(shell),visual:Boolean(visual),source:Boolean(visual?.shadowRoot),frame:Boolean(frame),root:Boolean(doc?.querySelector('.duduq-ts-root')),targets:doc?.querySelectorAll('.duduq-ts-target').length||0,text:doc?.body?.innerText?.slice(0,500)||'',fatal:Boolean(doc?.querySelector('#duduq-runtime-error'))}; })()`);
  console.log(JSON.stringify({ initial }));
  assert.equal(initial.shell, true); assert.equal(initial.visual, true); assert.equal(initial.frame, true); assert.equal(initial.root, true); assert(initial.targets >= 2); assert.equal(initial.fatal, false);
  const dynamic = await evaluate(`(()=>{const doc=document.querySelector('iframe').contentDocument;return {question:/shoot the correct target/i.test(doc.body.innerText),targets:[...doc.querySelectorAll('.duduq-ts-target')].map(n=>n.innerText.trim()).filter(Boolean).length}})()`);
  assert.equal(dynamic.question, true); assert(dynamic.targets >= 2);
  const audio = await evaluate(`(()=>{const button=document.querySelector('iframe')?.contentDocument?.querySelector('.duduq-ts-audio-button'); if(!button) return false; button.click(); return true;})()`);
  assert.equal(audio, true);
  const interaction = await evaluate(`(async()=>{const frame=document.querySelector('iframe');const doc=frame.contentDocument;const targets=[...doc.querySelectorAll('.duduq-ts-target')];const wrong=targets.find(n=>/DOG/i.test(n.innerText));wrong?.click();await new Promise(r=>setTimeout(r,700));const incorrect=/não é o alvo|nao e o alvo|Quase!/i.test(doc.body.innerText);const target=[...doc.querySelectorAll('.duduq-ts-target')].find(n=>/CAT/i.test(n.innerText))||doc.querySelector('.duduq-ts-target');if(!target)return {aim:false,shoot:false,hit:false,incorrect};let clicks=0;target.addEventListener('click',()=>clicks++,{once:true});target.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,clientX:target.getBoundingClientRect().x,clientY:target.getBoundingClientRect().y}));target.click();await new Promise(r=>setTimeout(r,3500));const hit=Boolean(doc.querySelector('.duduq-ts-target[data-state="hit"],.duduq-ts-impact[data-kind="hit"]'));const session=window.DuduQ.getSession();const progressed=Boolean(session&&session.stepIndex>=1);return {aim:true,shoot:clicks>0,hit,incorrect,progressed,stepIndex:session?.stepIndex,frame:Boolean(document.querySelector('iframe')),text:document.body.innerText.slice(-500)}})()`);
  console.log(JSON.stringify({ interaction }));
  assert.equal(interaction.aim, true); assert.equal(interaction.shoot, true); assert.equal(interaction.incorrect, true); assert.equal(interaction.hit, true); assert.equal(interaction.progressed, true);
  const lifecycle = await evaluate(`(async()=>{const api=window.DuduQ;api.destroy();const empty=!document.querySelector('iframe');api.start({id:'target-remount',year:1,steps:[{id:'target-step',mechanic:'target-shooter',payload:{title:'Target Shooter',questions:[window.__TARGET_E2E__.question]}}]});await new Promise(r=>setTimeout(r,2500));const remounted=Boolean(document.querySelector('iframe'));const visual=document.querySelector('[data-duduq-visual-package]');const runtime=visual?.__duduqScreenRuntime;const before=runtime?.package?.manifest?.hashes?.markup;try{runtime.swap({});}catch(_){}const atomic=runtime?.package?.manifest?.hashes?.markup===before;return {empty,remounted,atomic}})()`);
  assert.deepEqual(lifecycle, { empty: true, remounted: true, atomic: true });
  const responsive = [];
  for (const [width, height] of [[1920,1080],[1366,768],[1280,720],[640,360],[480,320]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 640 }); await pause(120);
    const probe = await evaluate(`(()=>{const shell=document.querySelector('.duduq-target-shooter-visual-shell');const frame=document.querySelector('iframe');const doc=frame?.contentDocument;const box=shell?.getBoundingClientRect();return {shell:Boolean(shell),frame:Boolean(frame),targets:doc?.querySelectorAll('.duduq-ts-target').length||0,width:Math.round(box?.width||0),height:Math.round(box?.height||0),fatal:Boolean(doc?.querySelector('#duduq-runtime-error'))}})()`);
    assert.equal(probe.shell, true); assert.equal(probe.frame, true); assert(probe.targets >= 2); assert.equal(probe.fatal, false); responsive.push({width,height,...probe});
  }
  await call("Emulation.clearDeviceMetricsOverride");
  console.log(JSON.stringify({ status:"PASS", initial, dynamic, audio, interaction, lifecycle, responsive }));
} finally { ws.close(); }

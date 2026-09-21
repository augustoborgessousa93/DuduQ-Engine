const endpoint = "http://127.0.0.1:9223";
const target = await (await fetch(`${endpoint}/json/new`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++nextId; const fn = (event) => { const message = JSON.parse(event.data); if (message.id !== id) return; ws.removeEventListener("message", fn); message.error ? reject(message.error) : resolve(message.result); }; ws.addEventListener("message", fn); ws.send(JSON.stringify({ id, method, params })); }); }
for (const consumer of ["matching", "target-shooter"]) {
  await call("Page.navigate", { url: `http://127.0.0.1:4175/runtime/preview/?mechanic=${consumer}` });
  await new Promise((resolve) => setTimeout(resolve, 3500));
  const result = await call("Runtime.evaluate", { expression: "JSON.stringify({ready:document.documentElement.dataset.duduqVerification||null,package:document.querySelector('[data-duduq-visual-package]')?.getAttribute('data-duduq-visual-package')||null,frame:Boolean(document.querySelector('iframe')),error:document.querySelector('[data-duduq-visual-package-error]')?.getAttribute('data-duduq-visual-package-error')||null})", returnByValue: true });
  const value = JSON.parse(result.result.value);
  if (!value.ready || !value.package || value.error) { const debug = await call("Runtime.evaluate", { expression: "JSON.stringify({duduq:typeof DuduQ,reg:typeof DuduQ?.registerMechanic,matchingReg:Object.keys(window.__matchingVerification?.registration||{}),mount:typeof window.__matchingVerification?.registration?.mount,shell:Boolean(document.querySelector('.duduq-matching-visual-shell')),error:document.body.innerHTML.slice(-1000)})", returnByValue: true }); throw new Error(`${consumer} preview failed: ${JSON.stringify(value)} ${debug.result.value}`); }
  console.log(JSON.stringify({ consumer, ...value }));
}
ws.close();

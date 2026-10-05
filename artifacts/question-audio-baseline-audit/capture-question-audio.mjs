import http from "node:http";
import fs from "node:fs/promises";
import net from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const output = path.join(root, "artifacts", "question-audio-baseline-audit");
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 4176;
const cdpPort = 9226;
const urls = {
  matching: `http://127.0.0.1:${port}/test/matching/gold-master-candidate-v1/index.html`,
  "target-shooter": `http://127.0.0.1:${port}/test/target-shooter/gold-master-clean-v2/index.html`,
  "drag-drop": `http://127.0.0.1:${port}/test/drag-drop/gold-master-candidate-v1/index.html`,
};

function staticServer() {
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
    const target = path.normalize(path.join(root, pathname === "/" ? "index.html" : pathname));
    if (!target.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const ext = path.extname(target).toLowerCase();
    const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" }[ext] || "application/octet-stream";
    fs.readFile(target).then((body) => { res.writeHead(200, { "Content-Type": mime }); res.end(body); }, () => { res.writeHead(404); res.end("Not found"); });
  }).listen(port, "127.0.0.1");
}

function httpJson(url) { return new Promise((resolve, reject) => http.get(url, (r) => { let data = ""; r.on("data", (d) => data += d); r.on("end", () => resolve(JSON.parse(data))); }).on("error", reject)); }
function ws(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url); const key = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
    const socket = net.connect(Number(u.port), u.hostname); let buffer = Buffer.alloc(0); let opened = false; let seq = 0; const pending = new Map();
    socket.on("connect", () => socket.write(`GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`));
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!opened) { const split = buffer.indexOf("\r\n\r\n"); if (split < 0) return; if (!buffer.subarray(0, split).toString().includes("101")) return reject(new Error("CDP WebSocket handshake failed")); opened = true; buffer = buffer.subarray(split + 4); resolve({ send }); }
      while (buffer.length >= 2) { const len0 = buffer[1] & 127; let offset = 2; let length = len0; if (len0 === 126) { if (buffer.length < 4) return; length = buffer.readUInt16BE(2); offset = 4; } else if (len0 === 127) { if (buffer.length < 10) return; length = Number(buffer.readBigUInt64BE(2)); offset = 10; } if (buffer.length < offset + length) return; const message = JSON.parse(buffer.subarray(offset, offset + length).toString()); buffer = buffer.subarray(offset + length); if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } }
    }); socket.on("error", reject);
    function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); const body = Buffer.from(JSON.stringify({ id, method, params })); const mask = crypto.getRandomValues(new Uint8Array(4)); const header = body.length < 126 ? Buffer.from([129, 128 | body.length]) : Buffer.from([129, 254, body.length >> 8, body.length & 255]); const encoded = Buffer.alloc(body.length); for (let i = 0; i < body.length; i++) encoded[i] = body[i] ^ mask[i % 4]; socket.write(Buffer.concat([header, Buffer.from(mask), encoded])); }); }
  });
}
const inspection = `(() => {
 const props=['background','backgroundImage','backgroundColor','border','borderRadius','boxShadow','width','height','padding','transform','opacity','position','zIndex'];
 const pick=o=>Object.fromEntries(props.map(p=>[p,o[p]])); const rect=e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y,top:r.top,right:r.right,bottom:r.bottom,left:r.left}};
 const button=document.querySelector('.duduq-canonical-question-hud .audio-button') || document.querySelector('[data-component="DUDUQ_CANONICAL_AUDIO_BUTTON"]') || document.querySelector('.audio-button');
 if(!button) return {found:false, hud:[...document.querySelectorAll('[class*="question"],[data-component*="QUESTION"]')].map(e=>({tag:e.tagName,class:e.className}))};
 const relevant=[button,...button.querySelectorAll('*')].map(e=>({tag:e.tagName.toLowerCase(),class:e.getAttribute('class')||'',id:e.id||'',attributes:Object.fromEntries([...e.attributes].map(a=>[a.name,a.value])),computed:pick(getComputedStyle(e)),rect:rect(e),pseudoBefore:pick(getComputedStyle(e,'::before')),pseudoAfter:pick(getComputedStyle(e,'::after'))}));
 const rules=[]; for(const sheet of [...document.styleSheets]) { let rs; try{rs=sheet.cssRules}catch{continue} for(const rule of [...rs]) if(rule.selectorText) { let matches=false; try{matches=button.matches(rule.selectorText)}catch{} if(matches) rules.push({href:sheet.href||'inline',selector:rule.selectorText,cssText:rule.cssText,important:[...rule.style].filter(p=>rule.style.getPropertyPriority(p)==='important')}); } }
 return {found:true,selector:'.duduq-canonical-question-hud .audio-button',element:{tag:button.tagName.toLowerCase(),class:button.className,attributes:Object.fromEntries([...button.attributes].map(a=>[a.name,a.value])),computed:pick(getComputedStyle(button)),rect:rect(button),inlineStyle:button.getAttribute('style')},layers:relevant,matchedRules:rules,documentStyleTags:[...document.querySelectorAll('style')].map(s=>s.textContent),viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},scale:getComputedStyle(document.documentElement).getPropertyValue('--duduq-gold-scale')};
})()`;

await fs.mkdir(output, { recursive: true });
const server = staticServer();
const browser = spawn(chrome, [`--headless=new`, `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${path.join(output, '.chrome-profile')}`, '--window-size=1920,1080', '--force-device-scale-factor=1', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
try {
  let tabs; for(let i=0;i<50;i++){ try { tabs=await httpJson(`http://127.0.0.1:${cdpPort}/json/list`); break; } catch { await new Promise(r=>setTimeout(r,100)); } } if(!tabs) throw new Error('Chrome CDP did not start');
  const cdp = await ws(tabs.find(t=>t.type==='page').webSocketDebuggerUrl); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  for (const [name, url] of Object.entries(urls)) {
    await cdp.send('Page.navigate', { url });
    for (let attempt = 0; attempt < 16; attempt++) {
      await new Promise(r => setTimeout(r, 1000));
      const ready = await cdp.send('Runtime.evaluate', { expression: "Boolean(document.querySelector('.duduq-canonical-question-hud .audio-button') || document.querySelector('[data-component=\\\"DUDUQ_CANONICAL_AUDIO_BUTTON\\\"]'))", returnByValue: true });
      if (ready.result.value) break;
    }
    const evaluation = await cdp.send('Runtime.evaluate', { expression: inspection, returnByValue: true, awaitPromise: true });
    const data = evaluation.result.value ?? { evaluationResult: evaluation.result, exceptionDetails: evaluation.exceptionDetails ?? null };
    const full = await cdp.send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false, fromSurface:true }); await fs.writeFile(path.join(output, `${name}-full.png`), Buffer.from(full.data,'base64'));
    if(data?.found) { const r=data.element.rect; const clip={x:Math.max(0,r.x-30),y:Math.max(0,r.y-30),width:Math.min(1920, r.width+60),height:Math.min(1080,r.height+60),scale:1}; const crop=await cdp.send('Page.captureScreenshot',{format:'png',clip,fromSurface:true}); await fs.writeFile(path.join(output,`${name}-audio.png`),Buffer.from(crop.data,'base64')); }
    await fs.writeFile(path.join(output, `${name}-computed.json`), JSON.stringify({ auditedAt:new Date().toISOString(), url, ...data }, null, 2));
  }
} finally { browser.kill(); await new Promise(resolve => server.close(resolve)); }

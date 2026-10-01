import fs from "node:fs";
import path from "node:path";
import { chromium } from "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Usage: capture-shared-hud-test.mjs before|after');
const out = path.join(process.cwd(), 'artifacts', 'hud-test');
fs.mkdirSync(out, { recursive: true });
const routes = { matching: '/play/matching/', target: '/play/target-shooter/' };
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const report = {};
  for (const [name, route] of Object.entries(routes)) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4175${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.duduq-canonical-header-hud');
    report[name] = await page.evaluate(() => {
      const snap = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { rect: { x:r.x,y:r.y,width:r.width,height:r.height }, width:s.width,height:s.height,padding:s.padding,borderRadius:s.borderRadius,boxShadow:s.boxShadow,gap:s.gap,columnGap:s.columnGap,alignItems:s.alignItems }; };
      const header = document.querySelector('.duduq-canonical-header-hud'), question = document.querySelector('.duduq-canonical-question-hud');
      const hs = getComputedStyle(header), qs = getComputedStyle(question), hr = header.getBoundingClientRect(), qr = question.getBoundingClientRect();
      return { fullscreen: snap('.fullscreen-button'), audio: snap('.audio-button'), counter: snap('.hud-counter'), progress: snap('.hud-progress'), header: { paddingLeft:hs.paddingLeft,paddingRight:hs.paddingRight,columnGap:hs.columnGap,alignItems:hs.alignItems }, question: { padding:qs.padding, rowGap:qs.rowGap, alignItems:qs.alignItems }, headerQuestionGap: qr.top - hr.bottom };
    });
    await page.screenshot({ path: path.join(out, `${name}-${phase}.png`) });
    await context.close();
  }
  fs.writeFileSync(path.join(out, `${phase}.json`), JSON.stringify(report, null, 2));
  if (phase === 'after') fs.writeFileSync(path.join(out, 'hud-comparison.json'), JSON.stringify({ before: JSON.parse(fs.readFileSync(path.join(out, 'before.json'))), after: report }, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }

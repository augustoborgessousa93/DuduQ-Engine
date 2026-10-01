import fs from "node:fs";
import path from "node:path";
import { chromium } from "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const out = path.join(process.cwd(), "artifacts", "forensic");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const report = { urls: {}, checkedAt: new Date().toISOString() };
try {
  for (const [name, url] of Object.entries({ target: "http://127.0.0.1:4175/play/target-shooter/", matching: "http://127.0.0.1:4175/play/matching/", transition: "http://127.0.0.1:4175/play/transition/?next=target-shooter" })) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (name === "transition") await page.waitForTimeout(80);
    report.urls[name] = await page.evaluate(() => {
      const rect = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { x:r.x,y:r.y,width:r.width,height:r.height,background:c.background,outline:c.outline,borderRadius:c.borderRadius,filter:c.filter,transform:c.transform }; };
      return { document: location.href, stylesheets: [...document.styleSheets].map(s => s.href).filter(Boolean), scripts: [...document.scripts].map(s => s.src).filter(Boolean), iframes: document.querySelectorAll("iframe").length, preview: [...document.querySelectorAll("script[src],link[href]")].some(e => /runtime\/preview/.test(e.src || e.href)), header:rect(".duduq-canonical-header-hud"), question:rect(".duduq-canonical-question-hud"), audio:rect(".audio-button"), mascot:rect(".official-transition-mascot") };
    });
    await page.close();
  }
  const ok = report.urls.target.header?.width === 1056 && report.urls.target.question?.width === 720 && report.urls.target.audio?.width === 56 && report.urls.target.iframes === 0 && !report.urls.target.preview;
  fs.writeFileSync(path.join(out, "runtime-resource-map.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: ok ? "PASS" : "FAIL", target: report.urls.target }));
  if (!ok) process.exitCode = 1;
} finally { await browser.close(); }

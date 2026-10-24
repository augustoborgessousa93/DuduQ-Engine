import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await page.goto("http://127.0.0.1:4177/play/intro-module/?module=Y1M01", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#intro-module-root .duduq-module-intro", { state: "visible" });
console.log(JSON.stringify(await page.evaluate(() => {
  const nodes = ["#intro-module-root", ".duduq-module-intro", ".intro-stage", ".intro-content", ".intro-start", ".intro-hero", ".intro-mascot"]
    .map(selector => document.querySelector(selector)).filter(Boolean).map(node => {
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      return { selector: node.id ? `#${node.id}` : `.${[...node.classList].join(".")}`, client: [node.clientWidth, node.clientHeight], scroll: [node.scrollWidth, node.scrollHeight], offset: [node.offsetWidth, node.offsetHeight], rect: [rect.x, rect.y, rect.width, rect.height], transform: style.transform, transformOrigin: style.transformOrigin, overflow: [style.overflowX, style.overflowY] };
    });
  return { viewport: [innerWidth, innerHeight], nodes };
}), null, 2));
await browser.close();

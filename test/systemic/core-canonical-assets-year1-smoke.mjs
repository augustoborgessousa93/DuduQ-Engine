import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const PIN = "f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f";
const OUT = path.resolve("test-results/systemic/core-canonical-assets-year1");
const manifest = JSON.parse(await fs.readFile("engine/channels/core-canonical-assets-candidate-v1.json", "utf8"));
const manifestBody = JSON.stringify(manifest);
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "fullhd-1920x1080", width: 1920, height: 1080 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 }
];
const MECHANIC_SELECTOR = [
  ".duduq-bp-root", ".duduq-dd-root", ".duduq-udd-root", ".duduq-mq-root",
  ".duduq-matching-root", ".duduq-ss-root", ".duduq-fc-root", ".duduq-cf-root",
  ".duduq-ws-root", ".duduq-ts-root"
].join(",");

function assert(condition, message) { if (!condition) throw new Error(message); }
function visibleScript(src) { return String(src || ""); }

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber += 1) {
      const moduleKey = String(moduleNumber).padStart(2, "0");
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));

      await page.route("**/engine/channels/canary-v1.json?*", async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: manifestBody });
      });

      try {
        const url = `${BASE}/content/english/year-1/module-${moduleKey}/?qa=core-canonical-assets-candidate`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35_000 });
        assert(response?.ok(), `Y1 M${moduleKey} ${viewport.name}: entry HTTP ${response?.status()}.`);
        await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

        const boot = await page.evaluate((moduleKey) => {
          const module = window.DUDUQ_CONTENT?.english?.year1?.[`module${moduleKey}`];
          return {
            moduleExists: Boolean(module),
            activities: Array.isArray(module?.activities) ? module.activities.length : 0,
            manifestCore: window.DUDUQ_ENGINE_MANIFEST?.core?.release || "",
            manifestChannel: window.DUDUQ_ENGINE_MANIFEST?.channel || "",
            assetsVersion: window.DuduQAssets?.version || "",
            runtimeCommit: window.DuduQAssets?.canonicalCatalog?.runtimeCommit || "",
            runtimeSchema: window.DUDUQ_CANONICAL_ASSET_CATALOG?.schemaVersion || 0,
            runtimeAliases: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.aliases || 0,
            scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
            width: document.documentElement.scrollWidth,
            rootText: String(document.querySelector("#root")?.textContent || "").trim()
          };
        }, moduleKey);

        assert(boot.moduleExists && boot.activities > 0, `Y1 M${moduleKey} ${viewport.name}: content did not load.`);
        assert(boot.manifestCore === "1.0.11-candidate", `Y1 M${moduleKey} ${viewport.name}: Core ${boot.manifestCore}.`);
        assert(boot.manifestChannel === "core-canonical-assets-candidate-v1", `Y1 M${moduleKey} ${viewport.name}: manifest channel ${boot.manifestChannel}.`);
        assert(boot.assetsVersion === "1.7.0-canonical-catalog-candidate", `Y1 M${moduleKey} ${viewport.name}: assets API ${boot.assetsVersion}.`);
        assert(boot.runtimeCommit === PIN && boot.runtimeSchema === 2 && boot.runtimeAliases >= 236, `Y1 M${moduleKey} ${viewport.name}: canonical runtime provenance/integrity drifted.`);
        assert(boot.scripts.some((src) => visibleScript(src).includes("Assets-DuduQ@" + PIN + "/asset-catalog/runtime-index.js")), `Y1 M${moduleKey} ${viewport.name}: pinned canonical runtime script absent.`);
        assert(boot.scripts.some((src) => visibleScript(src).includes("/engine/releases/core/1.0.11-candidate/duduq-assets.js")), `Y1 M${moduleKey} ${viewport.name}: candidate assets consumer absent.`);
        assert(!/^Erro/i.test(boot.rootText), `Y1 M${moduleKey} ${viewport.name}: boot error: ${boot.rootText}`);
        assert(boot.width <= viewport.width + 6, `Y1 M${moduleKey} ${viewport.name}: Intro overflow ${boot.width}px.`);

        const start = page.locator(".duduq-intro-start-button");
        await start.waitFor({ state: "visible", timeout: 30_000 });
        await start.click();

        await page.waitForFunction((selector) => {
          function isVisible(element, view = window) {
            if (!element) return false;
            const style = view.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01 && rect.width > 4 && rect.height > 4;
          }
          const intro = window.DuduQIntro?.getInstance?.()?.element || document.querySelector(".duduq-intro");
          const transition = document.querySelector(".duduq-transition");
          const iframe = Array.from(document.querySelectorAll("iframe")).find((item) => isVisible(item));
          if ((intro && isVisible(intro)) || (transition && isVisible(transition)) || !iframe) return false;
          const doc = iframe.contentDocument;
          const view = iframe.contentWindow;
          if (!doc || !view || !iframe.srcdoc) return false;
          const root = doc.querySelector(selector);
          return Boolean(root && isVisible(root, view) && String(doc.body?.innerText || "").trim().length >= 20);
        }, MECHANIC_SELECTOR, { timeout: 40_000 });

        await page.waitForTimeout(350);
        const runtime = await page.evaluate((selector) => {
          function isVisible(element, view = window) {
            if (!element) return false;
            const style = view.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01 && rect.width > 4 && rect.height > 4;
          }
          const iframe = Array.from(document.querySelectorAll("iframe")).find((item) => isVisible(item));
          const doc = iframe?.contentDocument;
          const root = doc?.querySelector(selector);
          const images = doc ? Array.from(doc.images) : [];
          const brokenImages = images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc);
          const heading = String(doc?.querySelector(".duduq-engine-heading h1,h1")?.textContent || "").replace(/\s+/g, " ").trim();
          const instruction = String(doc?.querySelector(".duduq-ts-instruction h2,.duduq-bp-instruction,.duduq-dd-instruction,.duduq-matching-instruction,h2")?.textContent || "").replace(/\s+/g, " ").trim();
          return {
            iframeReady: Boolean(iframe && iframe.srcdoc && doc && root),
            worldFusion: Boolean(doc?.documentElement?.classList.contains("duduq-world-fusion")),
            heading,
            instruction,
            buttons: doc?.querySelectorAll("button,[role='button']").length || 0,
            images: images.length,
            brokenImages,
            innerOverflow: Math.max(0, (doc?.body?.scrollWidth || 0) - (doc?.documentElement?.clientWidth || 0)),
            outerOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            introVisible: Boolean((window.DuduQIntro?.getInstance?.()?.element || document.querySelector(".duduq-intro")) && isVisible(window.DuduQIntro?.getInstance?.()?.element || document.querySelector(".duduq-intro"))),
            transitionState: window.DuduQTransition?.getState?.() || "",
            assetsVersion: window.DuduQAssets?.version || "",
            runtimeCommit: window.DuduQAssets?.canonicalCatalog?.runtimeCommit || ""
          };
        }, MECHANIC_SELECTOR);

        assert(runtime.iframeReady && runtime.worldFusion, `Y1 M${moduleKey} ${viewport.name}: mechanic/world fusion not ready.`);
        assert(runtime.heading.length > 0 && runtime.instruction.length > 0, `Y1 M${moduleKey} ${viewport.name}: heading/instruction missing.`);
        assert(runtime.buttons >= 1, `Y1 M${moduleKey} ${viewport.name}: no interactive control.`);
        assert(runtime.brokenImages.length === 0, `Y1 M${moduleKey} ${viewport.name}: broken image ${runtime.brokenImages.join(" | ")}`);
        assert(runtime.innerOverflow <= 6 && runtime.outerOverflow <= 6, `Y1 M${moduleKey} ${viewport.name}: overflow inner=${runtime.innerOverflow} outer=${runtime.outerOverflow}.`);
        assert(!runtime.introVisible && runtime.transitionState === "idle", `Y1 M${moduleKey} ${viewport.name}: activity still covered.`);
        assert(runtime.assetsVersion === "1.7.0-canonical-catalog-candidate" && runtime.runtimeCommit === PIN, `Y1 M${moduleKey} ${viewport.name}: candidate runtime changed after reveal.`);
        assert(pageErrors.length === 0, `Y1 M${moduleKey} ${viewport.name}: pageerror ${pageErrors.join(" | ")}`);

        const screenshot = path.join(OUT, `year1-m${moduleKey}-${viewport.name}-ready.png`);
        await page.screenshot({ path: screenshot, fullPage: false });
        report.push({ status: "PASS", module: moduleKey, viewport: viewport.name, heading: runtime.heading, instruction: runtime.instruction, images: runtime.images, screenshot });
        console.log(`PASS Y1 M${moduleKey} ${viewport.name}`);
      } catch (error) {
        const screenshot = path.join(OUT, `year1-m${moduleKey}-${viewport.name}-FAIL.png`);
        await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
        report.push({ status: "FAIL", module: moduleKey, viewport: viewport.name, error: String(error?.stack || error), screenshot, pageErrors });
        throw error;
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify({ contract: "DUDUQ_CORE_CANONICAL_ASSETS_YEAR1_24", expected: 24, passed: report.filter((item) => item.status === "PASS").length, cases: report }, null, 2));
}

assert(report.length === 24 && report.every((item) => item.status === "PASS"), `Expected 24/24 candidate Year 1 cases, got ${report.filter((item) => item.status === "PASS").length}/${report.length}.`);
console.log(JSON.stringify({ contract: "DUDUQ_CORE_CANONICAL_ASSETS_YEAR1_24", status: "PASS", passed: 24, total: 24, canonicalRuntimeCommit: PIN }, null, 2));

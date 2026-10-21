import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadPlaywright() {
  try { return await import("playwright"); }
  catch { return import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href); }
}

const { chromium } = await loadPlaywright();
const origin = process.env.DUDUQ_QA_ORIGIN || "http://127.0.0.1:4177";
const candidateBuildManifestSha256 = process.env.DUDUQ_CANDIDATE_BUILD_HASH || null;
const expectedRoot = process.env.DUDUQ_EXPECTED_ROOT || "";
let servedCoreCssSha256 = null;
const caseFilter = process.argv.find(argument => argument.startsWith("--case="))?.slice(7) || "";
const output = path.resolve(process.env.DUDUQ_RESPONSIVE_OUTPUT || (caseFilter
  ? `qa/responsive-certification/cases/${caseFilter}.json`
  : "qa/responsive-certification/latest-report.json"));
const evidenceDir = path.resolve(process.env.DUDUQ_RESPONSIVE_EVIDENCE_DIR || "artifacts/responsive-certification");
const presets = [
  ["1920x1080", 1920, 1080, 1920, 1080, 0], ["1440x900", 1440, 900, 1440, 900, 0], ["1366x768", 1366, 768, 1366, 768, 0],
  ["1280x720", 1280, 720, 1280, 720, 0], ["1100x700", 1100, 700, 1100, 700, 0], ["1000x700", 1000, 700, 1000, 700, 0],
  ["1024x768", 1024, 768, 1024, 768, 0], ["sidebar260", 1366, 768, 1106, 768, 260], ["sidebar320", 1366, 768, 1046, 768, 320]
].map(([id, viewportWidth, viewportHeight, width, height, left]) => ({ id, viewportWidth, viewportHeight, width, height, left }));
const mechanics = [
  { id: "intro", name: "Intro", route: "/play/intro-module/?module=Y1M01", ready: "#intro-module-root", mechanicSelector: "#intro-module-root" },
  { id: "target-shooter", name: "Target Shooter", route: "/play/target-shooter/?duduqModule=Y2M01&duduqItem=Y2M01-Q009", ready: "#game .target-shooter-arena", mechanicSelector: "#game.target-shooter-screen .target-shooter-arena" },
  { id: "bubble-pop", name: "Bubble Pop", route: "/play/bubble-pop/?duduqModule=Y1M02&duduqItem=Y1M02-Q002", ready: "#game .bubble-pop-arena", mechanicSelector: "#game.bubble-pop-screen .bubble-pop-arena" },
  { id: "ddm", name: "Drag & Drop Multimedia", route: "/play/drag-drop-multimedia/?duduqModule=Y1M02&duduqItem=Y1M02-Q001", ready: "#game.drag-drop-multimedia-screen .duduq-canonical-question-hud", mechanicSelector: "#game.drag-drop-multimedia-screen" },
  { id: "grouping", name: "Grouping / Drag & Drop", route: "/play/drag-drop/?duduqModule=Y1M02&duduqItem=Y1M02-Q003", ready: "#game.drag-drop-screen .duduq-canonical-question-hud", mechanicSelector: "#game.drag-drop-screen" },
  { id: "matching", name: "Matching", route: "/play/matching/?duduqModule=Y1M02&duduqItem=Y1M02-Q006", ready: "#game .matching-playfield", mechanicSelector: "#game .matching-playfield" },
  { id: "smart-complete", name: "Smart Sentence Complete", route: "/play/smart-sentence/?duduqModule=Y2M01&duduqItem=Y2M01-Q008", ready: "#game.smart-sentence-screen", mechanicSelector: "#game.smart-sentence-screen.smart-sentence--complete" },
  { id: "smart-order", name: "Smart Sentence Order", route: "/play/smart-sentence/?duduqModule=Y4M06&duduqItem=Y4M06-Q019", ready: "#game.smart-sentence-screen", mechanicSelector: "#game.smart-sentence-screen.smart-sentence--order" },
  { id: "memory-quest", name: "Memory Quest", route: "/play/memory-quest/?duduqModule=Y1M02&duduqItem=Y1M02-Q004", ready: "#game.memory-quest-screen .memory-quest-card-grid", mechanicSelector: "#game.memory-quest-screen" },
  { id: "module-final", name: "Module Final", route: "/play/final-module/?moduleId=Y1M01&qa=1", ready: "#module-final-root", mechanicSelector: "#module-final-root" }
];

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];
const duplicateIds = new Set();
const ids = new Set();
try {
  if (expectedRoot) {
    const status = await (await fetch(`${origin}/__duduq/status`)).json();
    if (path.resolve(status.root).toLowerCase() !== path.resolve(expectedRoot).toLowerCase()) throw new Error(`RESPONSIVE_QA_WRONG_SERVER_ROOT:${status.root}`);
    const cssBytes = Buffer.from(await (await fetch(`${origin}/core/duduq-live-hud.css`)).arrayBuffer());
    servedCoreCssSha256 = createHash("sha256").update(cssBytes).digest("hex");
  }
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  for (const preset of presets) {
    await page.setViewportSize({ width: preset.viewportWidth, height: preset.viewportHeight });
    for (const mechanic of mechanics) {
      const caseId = `RESP-${mechanic.id}-${preset.id}`;
      if (caseFilter && caseId !== caseFilter) continue;
      if (ids.has(caseId)) duplicateIds.add(caseId);
      ids.add(caseId);
      const url = new URL(mechanic.route, origin);
      url.searchParams.set("responsiveCaseId", caseId);
      url.searchParams.set("responsiveExpectedMechanic", mechanic.id);
      const errors = [];
      const onPageError = error => errors.push(error.message);
      page.on("pageerror", onPageError);
      const responsePromise = page.waitForResponse(response => response.url().startsWith(url.href), { timeout: 30000 });
      await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}.qa-sidebar{position:absolute;inset:0 auto 0 0;width:${preset.left}px;background:#f1f4f8}.qa-game-frame{position:absolute;left:${preset.left}px;top:0;width:${preset.width}px;height:${preset.height}px;border:0;display:block}</style>${preset.left ? '<aside class="qa-sidebar" aria-label="Simulated platform sidebar"></aside>' : ''}<iframe id="responsive-game-frame" class="qa-game-frame" title="Responsive game under test" src="${url.href}"></iframe>`);
      const response = await responsePromise;
      const framePage = page.frameLocator("#responsive-game-frame");
      let ready = false;
      try {
        await framePage.locator(mechanic.ready).first().waitFor({ state: "visible", timeout: 12000 });
        ready = true;
      } catch {}
      await page.waitForTimeout(250);
      const sample = await page.locator("#responsive-game-frame").evaluate((frame, { expected, preset, caseId, readySelector, mechanicSelector }) => {
        const view = frame.contentWindow;
        const document = view.document;
        const location = view.location;
        const actual = new URL(location.href);
        // Intro and Module Final own independent hosts; prefer those over the hidden
        // legacy #game node that can remain in the shared shell at 1Ã—1.
        const root = document.querySelector("#intro-module-root") || document.querySelector("#module-final-root") || document.querySelector("#game") || document.body;
        const rootRect = root.getBoundingClientRect();
        const actualMechanic = root.id === "intro-module-root" ? "intro"
          : root.id === "module-final-root" ? "module-final"
          : document.querySelector("#game.smart-sentence-screen.smart-sentence--complete") ? "smart-complete"
          : document.querySelector("#game.smart-sentence-screen.smart-sentence--order") ? "smart-order"
          : document.querySelector("#game .bubble-pop-arena") ? "bubble-pop"
          : document.querySelector("#game.drag-drop-multimedia-screen .dnd-artboard, #game.drag-drop-multimedia-screen .dnd-multimedia-central-panel") ? "ddm"
          : document.querySelector("#game.drag-drop-screen .dnd-artboard, #game.drag-drop-screen .dnd-source-bank") ? "grouping"
          : document.querySelector("#game .matching-playfield") ? "matching"
          : document.querySelector("#game.memory-quest-screen .memory-quest-card-grid") ? "memory-quest"
          : document.querySelector("#game .target-shooter-arena") ? "target-shooter" : "unknown";
        const visible = element => {
          const rect = element.getBoundingClientRect();
          // Exclude conventional visually-hidden screen-reader labels (often 1Ã—1px
          // clipped nodes); their text ranges are not visible gameplay text.
          if (!(rect.width > 1 && rect.height > 1)) return false;
          for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
            const style = view.getComputedStyle(node);
            if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0) return false;
          }
          return true;
        };
        const within = element => {
          const r = element.getBoundingClientRect();
          return r.left >= -1 && r.top >= -1 && r.right <= view.innerWidth + 1 && r.bottom <= view.innerHeight + 1;
        };
        const activeControls = [...document.querySelectorAll("button,[role=button],input,select,[draggable=true],a,[data-item-id],[data-drop-target-id],[data-card-id],.smart-sentence-order-drag-card,.smart-sentence-option")].filter(visible);
        // Bubble Pop targets deliberately enter from and exit beyond the arena. They are
        // gameplay actors, not persistent UI controls; report them separately and require
        // at least one target to be visibly actionable instead of treating every animation
        // frame as a layout failure.
        const movingBubbleTargets = activeControls.filter(element => element.matches(".bubble-pop-playable"));
        const outsideControls = activeControls.filter(element => !element.matches(".bubble-pop-playable") && !within(element)).map(element => ({ tag: element.tagName, label: (element.innerText || element.getAttribute("aria-label") || "").trim().slice(0, 70), rect: (() => { const r = element.getBoundingClientRect(); return [r.x,r.y,r.width,r.height].map(Math.round); })() }));
        const bubbleTargetsVisible = movingBubbleTargets.filter(element => {
          const r = element.getBoundingClientRect();
          return r.right > 0 && r.bottom > 0 && r.left < view.innerWidth && r.top < view.innerHeight;
        }).length;
        const expectedPath = new URL(expected.route, location.origin);
        const routeMatch = actual.pathname === expectedPath.pathname && [...expectedPath.searchParams].every(([key, value]) => actual.searchParams.get(key) === value);
        const mechanicMatch = Boolean(document.querySelector(mechanicSelector));
        const caseMatch = actual.searchParams.get("responsiveCaseId") === caseId;
        const doc = document.documentElement;
        const docOverflowX = Math.max(0, doc.scrollWidth - doc.clientWidth);
        const docOverflowY = Math.max(0, Math.max(doc.scrollHeight, document.body.scrollHeight) - doc.clientHeight);
        const rootOverflowX = Math.max(0, root.scrollWidth - root.clientWidth);
        const rootOverflowY = Math.max(0, root.scrollHeight - root.clientHeight);
        const scrollableVisible = [...document.querySelectorAll("body, #game, #intro-module-root, #module-final-root, .game-shell, .gameplay-workspace, .feedback-ribbon, .smart-sentence-shell, .memory-quest-play-area, .memory-quest-card-grid")].filter(visible).filter(element => {
          const style = view.getComputedStyle(element);
          return ((style.overflowX === "auto" || style.overflowX === "scroll") && element.scrollWidth > element.clientWidth + 1) || ((style.overflowY === "auto" || style.overflowY === "scroll") && element.scrollHeight > element.clientHeight + 1);
        }).length;
        const visualOverflowCandidates = [...root.querySelectorAll("*")].filter(visible).map(element => {
          const rect = element.getBoundingClientRect();
          return { element: element.tagName.toLowerCase(), className: typeof element.className === "string" ? element.className.slice(0, 80) : "", label: (element.getAttribute("aria-label") || element.innerText || "").trim().slice(0, 50), rect: [rect.left, rect.top, rect.right, rect.bottom].map(Math.round) };
        }).filter(element => element.rect[2] > rootRect.right + 1 || element.rect[3] > rootRect.bottom + 1).sort((a, b) => b.rect[3] - a.rect[3]).slice(0, 12);
        return {
          actualRoute: `${actual.pathname}${actual.search}`, actualCaseId: actual.searchParams.get("responsiveCaseId"),
          routeMatch, mechanicMatch: actualMechanic === expected.id, actualMechanic, caseMatch, requestedContainer: [preset.width,preset.height], expectedViewport: [preset.width,preset.height], actualViewport: [view.innerWidth,view.innerHeight], actualContainer: [root.clientWidth,root.clientHeight], actualState: "initial",
          runtimeRoot: root.id ? `#${root.id}` : root.className, runtimeReady: Boolean(document.querySelector(readySelector)),
          doc: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, scrollHeight: doc.scrollHeight, clientHeight: doc.clientHeight, overflowX: docOverflowX, overflowY: docOverflowY },
          game: { x: rootRect.x, y: rootRect.y, width: root.clientWidth, height: root.clientHeight, scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight, overflowX: rootOverflowX, overflowY: rootOverflowY },
          visibleScrollbarCount: scrollableVisible, visibleControls: activeControls.length, outsideControls,
          visualOverflowCandidates,
          scrollExtentCandidates: [...root.querySelectorAll("*")].filter(visible).map(element => {
            const x = Math.max(0, element.scrollWidth - element.clientWidth);
            const y = Math.max(0, element.scrollHeight - element.clientHeight);
            if (x <= 1 && y <= 1) return null;
            const style = getComputedStyle(element);
            return { tag: element.tagName.toLowerCase(), className: typeof element.className === "string" ? element.className.slice(0, 100) : "", id: element.id, scroll: [element.scrollWidth, element.scrollHeight], client: [element.clientWidth, element.clientHeight], overflow: [style.overflowX, style.overflowY], rect: (() => { const r = element.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); })() };
          }).filter(Boolean).sort((a, b) => (b.scroll[0] - b.client[0] + b.scroll[1] - b.client[1]) - (a.scroll[0] - a.client[0] + a.scroll[1] - a.client[1])).slice(0, 8),
          rootAspect: rootRect.width / Math.max(1, rootRect.height),
          sourceCardCount: root.querySelectorAll(".dnd-image-card-row > .dnd-option-image-card").length,
          sourceCardWidths: [...root.querySelectorAll(".dnd-image-card-row > .dnd-option-image-card")].slice(0, 3).map(el => Math.round(el.getBoundingClientRect().width)),
          rootData: { mechanic: root.dataset.mechanic, gameCore: root.dataset.gameCore, fullscreenEnhanced: root.dataset.duduqFullscreenEnhanced, memoryResponsiveLayout: root.dataset.memoryResponsiveLayout },
          stageMetrics: (() => { const stage = root.querySelector(".target-shooter-arena,.bubble-pop-arena,.memory-quest-card-grid,.matching-playfield,.dnd-artboard,.dnd-multimedia-central-panel"); if (!stage) return null; const r = stage.getBoundingClientRect(); const s = getComputedStyle(stage); return { selector: `.${[...stage.classList].join(".")}`, rect: [r.x,r.y,r.width,r.height,r.right,r.bottom].map(Math.round), transform: s.transform, scale: s.scale, cssScale: s.getPropertyValue("--memory-card-scale").trim() }; })(),
          smartCompleteLayout: (() => { const panel = root.querySelector(".smart-sentence-panel"); const bank = root.querySelector(".smart-sentence-options"); return panel && bank ? { panel: panel.getBoundingClientRect().toJSON(), bank: bank.getBoundingClientRect().toJSON(), top: getComputedStyle(bank).top } : null; })(),
          // Measure painted text fragments against actual clipping ancestors. Scroll extents
          // alone also include line boxes, card artwork, and intentional overflow, so they
          // generated false positives in the prior matrix.
          textClipCandidates: [...root.querySelectorAll("h1,h2,h3,p,button,[role=button],.question-prompt,.hud-title")].filter(visible).flatMap(el => {
            const walker = document.createTreeWalker(el, view.NodeFilter.SHOW_TEXT);
            const textRects = [];
            while (walker.nextNode()) {
              if (!walker.currentNode.nodeValue.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(walker.currentNode);
              textRects.push(...[...range.getClientRects()]);
              range.detach?.();
            }
            if (!textRects.length) return [];
            const clippingAncestors = [];
            for (let node = el; node && node !== root.parentElement; node = node.parentElement) {
              const style = view.getComputedStyle(node);
              if (["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY)) clippingAncestors.push(node);
              if (node === root) break;
            }
            const clipEvidence = textRects.flatMap(textRect => clippingAncestors.filter(node => {
              const box = node.getBoundingClientRect();
              const scaleX = box.width / Math.max(1, node.offsetWidth), scaleY = box.height / Math.max(1, node.offsetHeight);
              const left = box.left + node.clientLeft * scaleX, top = box.top + node.clientTop * scaleY;
              const right = left + node.clientWidth * scaleX, bottom = top + node.clientHeight * scaleY;
              const style = view.getComputedStyle(node);
              const clipX = ["hidden", "clip"].includes(style.overflowX) && (textRect.left < left - 1 || textRect.right > right + 1);
              const clipY = ["hidden", "clip"].includes(style.overflowY) && (textRect.top < top - 1 || textRect.bottom > bottom + 1);
              return clipX || clipY;
            }).map(node => ({ ancestor: node.id || node.className?.toString?.().slice(0, 70) || node.tagName.toLowerCase(), textRect: [textRect.left,textRect.top,textRect.right,textRect.bottom].map(Math.round), ancestorRect: (() => { const b=node.getBoundingClientRect(); return [b.left,b.top,b.right,b.bottom].map(Math.round); })() })));
            return clipEvidence.length ? [{ tag: el.tagName.toLowerCase(), className: typeof el.className === "string" ? el.className.slice(0, 80) : "", text: (el.innerText || "").trim().slice(0, 80), clipEvidence }] : [];
          }),
          textClipped: [...root.querySelectorAll("h1,h2,h3,p,button,[role=button],.question-prompt,.hud-title")].filter(visible).reduce((count, el) => {
            const walker = document.createTreeWalker(el, view.NodeFilter.SHOW_TEXT);
            const textRects = [];
            while (walker.nextNode()) {
              if (!walker.currentNode.nodeValue.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(walker.currentNode);
              textRects.push(...[...range.getClientRects()]);
              range.detach?.();
            }
            if (!textRects.length) return count;
            for (let node = el; node && node !== root.parentElement; node = node.parentElement) {
              const style = view.getComputedStyle(node);
              if (["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY)) {
                const box = node.getBoundingClientRect(), scaleX = box.width / Math.max(1, node.offsetWidth), scaleY = box.height / Math.max(1, node.offsetHeight);
                const left = box.left + node.clientLeft * scaleX, top = box.top + node.clientTop * scaleY;
                const right = left + node.clientWidth * scaleX, bottom = top + node.clientHeight * scaleY;
                if (textRects.some(textRect => (["hidden", "clip"].includes(style.overflowX) && (textRect.left < left - 1 || textRect.right > right + 1)) || (["hidden", "clip"].includes(style.overflowY) && (textRect.top < top - 1 || textRect.bottom > bottom + 1)))) { count++; break; }
              }
              if (node === root) break;
            }
            return count;
          }, 0),
          bubbleTargetsVisible,
          movingBubbleTargetsOutside: movingBubbleTargets.filter(element => !within(element)).length
        };
      }, { expected: mechanic, preset, caseId, readySelector: mechanic.ready, mechanicSelector: mechanic.mechanicSelector });
      page.off("pageerror", onPageError);
      const correlation = response?.status() === 200 && ready && sample.routeMatch && sample.mechanicMatch && sample.caseMatch && sample.actualViewport[0] === preset.width && sample.actualViewport[1] === preset.height && sample.actualContainer[0] === preset.width && sample.actualContainer[1] === preset.height;
      results.push({ caseId, mechanic: mechanic.name, mechanicId: mechanic.id, expectedRoute: mechanic.route, expectedPreset: preset.id, expectedViewport: [preset.viewportWidth,preset.viewportHeight], expectedContainer: [preset.width,preset.height], expectedState: "initial", httpStatus: response?.status() ?? null, runtimeReady: ready, correlation, sample, pageErrors: errors });
      const captureCases = new Set(["RESP-ddm-1000x700", "RESP-ddm-1100x700", "RESP-ddm-1280x720", "RESP-ddm-sidebar320", "RESP-grouping-1366x768", "RESP-grouping-1280x720", "RESP-grouping-sidebar320", "RESP-target-shooter-1100x700", "RESP-intro-1100x700", "RESP-smart-complete-1280x720", "RESP-smart-order-1280x720", "RESP-matching-1280x720", "RESP-memory-quest-1000x700", "RESP-memory-quest-1100x700", "RESP-memory-quest-sidebar260"]);
      if (captureCases.has(caseId)) {
        await mkdir(evidenceDir, { recursive: true });
        await page.screenshot({ path: path.join(evidenceDir, `${caseId}.png`), fullPage: true });
      }
    }
  }
  await page.close();
} finally { await browser.close(); }

const report = {
  schema: "DUDUQ_RESPONSIVE_CERTIFICATION_V1",
  origin,
  candidateBuildManifestSha256,
  expectedArtifactRoot: expectedRoot || null,
  servedCoreCssSha256,
  generatedAt: new Date().toISOString(),
  requested: results.length,
  rendered: results.filter(row => row.httpStatus === 200 && row.runtimeReady).length,
  correlated: results.filter(row => row.correlation).length,
  unmatched: results.filter(row => !row.correlation).length,
  duplicateCaseIds: [...duplicateIds],
  presets: presets.map(({ id, viewportWidth, viewportHeight, width, height, left }) => ({ id, viewport: [viewportWidth, viewportHeight], container: [width, height], sidebarLeft: left })),
  mechanics: mechanics.map(({ id, name, route }) => ({ id, name, route })),
  cases: results
};
await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: report.correlated === report.requested && report.unmatched === 0 && !duplicateIds.size ? "PASS" : "ISSUE", requested: report.requested, rendered: report.rendered, correlated: report.correlated, unmatched: report.unmatched, duplicateCaseIds: report.duplicateCaseIds.length, output }, null, 2));
if (report.correlated !== report.requested || report.unmatched || duplicateIds.size) process.exitCode = 1;


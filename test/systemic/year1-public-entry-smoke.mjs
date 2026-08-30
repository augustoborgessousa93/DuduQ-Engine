import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/systemic/year1-public-entry");
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "fullhd-1920x1080", width: 1920, height: 1080 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 }
];
const MECHANIC_SELECTOR = [
  ".duduq-bp-root",
  ".duduq-dd-root",
  ".duduq-udd-root",
  ".duduq-mq-root",
  ".duduq-matching-root",
  ".duduq-ss-root",
  ".duduq-fc-root",
  ".duduq-cf-root",
  ".duduq-ws-root",
  ".duduq-ts-root"
].join(",");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

      try {
        const url = `${BASE}/content/english/year-1/module-${moduleKey}/?qa=systemic-foundation-post-reveal`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        assert(response?.ok(), `Y1 M${moduleKey}: entrypoint HTTP ${response?.status()}.`);

        await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 30_000 });
        const boot = await page.evaluate((moduleKey) => {
          const module = window.DUDUQ_CONTENT?.english?.year1?.[`module${moduleKey}`];
          const config = window.DUDUQ_GAME_CONFIG || {};
          const scripts = Array.from(document.scripts).map((script) => script.getAttribute("src") || "").filter(Boolean);
          const legacyScripts = scripts.filter((src) => {
            let pathname = "";
            try { pathname = new URL(src, location.href).pathname; } catch { pathname = String(src); }
            return /^\/(?:core|mechanics)\//.test(pathname);
          });
          return {
            moduleExists: Boolean(module),
            activities: Array.isArray(module?.activities) ? module.activities.length : 0,
            declaredMechanics: Array.isArray(module?.activities) ? module.activities.map((activity) => activity?.mechanic || "") : [],
            channel: config.channel || "",
            modulePath: config.modulePath || [],
            scripts,
            legacyScripts,
            documentWidth: document.documentElement.scrollWidth,
            rootText: String(document.querySelector("#root")?.textContent || "").trim()
          };
        }, moduleKey);

        assert(boot.moduleExists && boot.activities > 0, `Y1 M${moduleKey}: conteúdo público não carregou.`);
        assert(boot.channel === "canary-v1", `Y1 M${moduleKey}: canal inesperado ${boot.channel}.`);
        assert(boot.modulePath.join("/") === `english/year1/module${moduleKey}`, `Y1 M${moduleKey}: modulePath incorreto ${boot.modulePath.join("/")}.`);
        assert(boot.scripts.some((src) => /engine\/duduq-loader-v1\.js/.test(src)), `Y1 M${moduleKey}: Loader versionado ausente.`);
        assert(boot.legacyScripts.length === 0, `Y1 M${moduleKey}: entrypoint ainda carrega raiz legada diretamente: ${boot.legacyScripts.join(", ")}`);
        assert(!/^Erro:/i.test(boot.rootText), `Y1 M${moduleKey}: erro no boot: ${boot.rootText}`);
        assert(boot.documentWidth <= viewport.width + 6, `Y1 M${moduleKey}: overflow na Intro.`);

        await page.evaluate(() => {
          window.__DUDUQ_YEAR1_QA_EVENTS__ = [];
          [
            "duduq:transition-cover-start",
            "duduq:transition-covered",
            "duduq:transition-reveal-start",
            "duduq:transition-complete",
            "duduq:step-start"
          ].forEach((eventName) => {
            window.addEventListener(eventName, () => window.__DUDUQ_YEAR1_QA_EVENTS__.push(eventName));
          });
        });

        const start = page.locator(".duduq-intro-start-button");
        await start.waitFor({ state: "visible", timeout: 30_000 });
        await start.click();

        // A screenshot só é válida quando o Host terminou o reveal e a mecânica está realmente pintada.
        await page.waitForFunction((mechanicSelector) => {
          function visible(element, view = window) {
            if (!element) return false;
            const style = view.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01 && rect.width > 4 && rect.height > 4;
          }

          const transitionIdle = window.DuduQTransition?.getState?.() === "idle";
          const overlay = document.querySelector(".duduq-transition");
          const overlayHidden = !overlay || !visible(overlay) || Number(getComputedStyle(overlay).opacity || 0) <= 0.01;
          const intro = window.DuduQIntro?.getInstance?.()?.element || document.querySelector(".duduq-intro");
          const introHidden = !intro || !visible(intro);
          const iframe = Array.from(document.querySelectorAll("iframe")).find((frame) => visible(frame));
          if (!transitionIdle || !overlayHidden || !introHidden || !iframe) return false;

          const doc = iframe.contentDocument;
          const view = iframe.contentWindow;
          if (!doc || !view) return false;
          const bootNode = doc.getElementById("duduq-boot");
          if (bootNode && !bootNode.hidden && visible(bootNode, view)) return false;
          const mechanicRoot = doc.querySelector(mechanicSelector);
          if (!mechanicRoot || !visible(mechanicRoot, view)) return false;
          if (!doc.documentElement.classList.contains("duduq-world-fusion")) return false;
          if (String(doc.body?.innerText || "").trim().length < 20) return false;
          if (doc.querySelectorAll("button,[role='button'],input,select,textarea").length < 1) return false;
          return true;
        }, MECHANIC_SELECTOR, { timeout: 35_000 });

        await page.waitForTimeout(260);

        const runtime = await page.evaluate((mechanicSelector) => {
          function visible(element, view = window) {
            if (!element) return false;
            const style = view.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01 && rect.width > 4 && rect.height > 4;
          }

          const iframe = Array.from(document.querySelectorAll("iframe")).find((frame) => visible(frame));
          const doc = iframe?.contentDocument || null;
          const view = iframe?.contentWindow || null;
          const mechanicRoot = doc?.querySelector(mechanicSelector) || null;
          const images = doc ? Array.from(doc.images) : [];
          const brokenImages = images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc);
          const transition = document.querySelector(".duduq-transition");
          const intro = window.DuduQIntro?.getInstance?.()?.element || document.querySelector(".duduq-intro");
          const bodyWidth = doc?.body?.scrollWidth || 0;
          const clientWidth = doc?.documentElement?.clientWidth || 0;
          const bodyHeight = doc?.body?.scrollHeight || 0;
          const clientHeight = doc?.documentElement?.clientHeight || 0;
          const text = String(doc?.body?.innerText || "").replace(/\s+/g, " ").trim();
          const heading = String(doc?.querySelector(".duduq-engine-heading h1,h1")?.textContent || "").replace(/\s+/g, " ").trim();
          const instruction = String(doc?.querySelector(".duduq-ts-instruction h2,.duduq-bp-instruction,.duduq-dd-instruction,.duduq-matching-instruction,h2")?.textContent || "").replace(/\s+/g, " ").trim();
          const progressText = String(doc?.querySelector(".duduq-progress-copy strong,.duduq-engine-counter,[aria-label^='Etapa']")?.textContent || "").replace(/\s+/g, " ").trim();
          return {
            rootText: String(document.querySelector("#root")?.textContent || "").trim(),
            documentWidth: document.documentElement.scrollWidth,
            transitionState: window.DuduQTransition?.getState?.() || "",
            transitionVisible: Boolean(transition && visible(transition)),
            introVisible: Boolean(intro && visible(intro)),
            events: Array.isArray(window.__DUDUQ_YEAR1_QA_EVENTS__) ? [...window.__DUDUQ_YEAR1_QA_EVENTS__] : [],
            fullscreenApi: typeof window.DuduQFullscreen?.toggle === "function",
            iframe: iframe ? (() => {
              const rect = iframe.getBoundingClientRect();
              return { width: rect.width, height: rect.height, top: rect.top, left: rect.left, hasSrcdoc: Boolean(iframe.srcdoc), srcdocLength: String(iframe.srcdoc || "").length };
            })() : null,
            inner: doc && view && mechanicRoot ? {
              title: doc.title || "",
              mechanicClass: mechanicRoot.className || "",
              mechanicRect: (() => { const rect = mechanicRoot.getBoundingClientRect(); return { width: rect.width, height: rect.height, top: rect.top, left: rect.left }; })(),
              worldFusion: doc.documentElement.classList.contains("duduq-world-fusion"),
              worldFusionVersion: doc.documentElement.getAttribute("data-duduq-world-fusion-version") || "",
              heading,
              instruction,
              progressText,
              visibleTextLength: text.length,
              visibleTextSample: text.slice(0, 360),
              buttons: doc.querySelectorAll("button").length,
              targets: doc.querySelectorAll(".duduq-ts-target").length,
              progressTracks: doc.querySelectorAll(".duduq-progress-track").length,
              fullscreenButtons: doc.querySelectorAll(".duduq-engine-fullscreen-button").length,
              audioElements: doc.querySelectorAll("audio").length,
              audioControls: doc.querySelectorAll("[aria-label*='áudio' i],[aria-label*='audio' i],[aria-label*='ouvir' i],[aria-label*='som' i],.duduq-ts-audio-shell,.duduq-bp-audio-shell,.duduq-dd-audio-shell").length,
              images: images.length,
              brokenImages,
              bodyWidth,
              clientWidth,
              bodyHeight,
              clientHeight,
              horizontalOverflow: Math.max(0, bodyWidth - clientWidth)
            } : null
          };
        }, MECHANIC_SELECTOR);

        assert(runtime.transitionState === "idle" && !runtime.transitionVisible, `Y1 M${moduleKey}: screenshot ainda pegaria a transição.`);
        assert(!runtime.introVisible, `Y1 M${moduleKey}: Intro ainda cobre a atividade.`);
        assert(runtime.iframe?.hasSrcdoc && runtime.iframe.srcdocLength > 1000, `Y1 M${moduleKey}: runtime srcdoc não ficou ativo.`);
        assert(runtime.inner?.worldFusion, `Y1 M${moduleKey}: World Fusion não ficou pronto.`);
        assert(runtime.inner?.visibleTextLength >= 20, `Y1 M${moduleKey}: atividade visualmente vazia.`);
        assert(runtime.inner?.heading.length > 0, `Y1 M${moduleKey}: header/título não apareceu.`);
        assert(runtime.inner?.instruction.length > 0, `Y1 M${moduleKey}: enunciado não apareceu.`);
        assert(runtime.inner?.buttons >= 1, `Y1 M${moduleKey}: nenhuma interação visível.`);
        assert(runtime.inner?.targets >= 2, `Y1 M${moduleKey}: alternativas/alvos insuficientes na primeira questão.`);
        assert(runtime.inner?.progressTracks >= 1, `Y1 M${moduleKey}: progresso global não apareceu.`);
        assert(runtime.inner?.fullscreenButtons >= 1, `Y1 M${moduleKey}: controle de fullscreen não apareceu.`);
        assert(runtime.inner?.brokenImages.length === 0, `Y1 M${moduleKey}: imagem quebrada: ${runtime.inner?.brokenImages.join(" | ")}`);
        assert(runtime.inner?.horizontalOverflow <= 6, `Y1 M${moduleKey}: overflow horizontal interno de ${runtime.inner?.horizontalOverflow}px.`);
        assert(runtime.documentWidth <= viewport.width + 6, `Y1 M${moduleKey}: overflow após reveal (${runtime.documentWidth} > ${viewport.width}).`);
        assert(runtime.events.includes("duduq:transition-cover-start"), `Y1 M${moduleKey}: handoff sem cover-start.`);
        assert(runtime.events.includes("duduq:transition-covered"), `Y1 M${moduleKey}: handoff sem covered.`);
        assert(runtime.events.includes("duduq:transition-reveal-start"), `Y1 M${moduleKey}: handoff sem reveal-start.`);
        assert(runtime.events.includes("duduq:transition-complete"), `Y1 M${moduleKey}: handoff sem transition-complete.`);
        assert(pageErrors.length === 0, `Y1 M${moduleKey}: pageerror: ${pageErrors.join(" | ")}`);

        const readyScreenshot = path.join(OUT, `year1-m${moduleKey}-${viewport.name}-ready.png`);
        await page.screenshot({ path: readyScreenshot, fullPage: false });

        let fullscreen = { tested: false, entered: false, exited: false, screenshot: null };
        if (moduleNumber === 1) {
          assert(runtime.fullscreenApi, `Y1 M01 ${viewport.name}: API central de fullscreen ausente.`);
          const fullscreenButton = page.frameLocator("iframe").locator(".duduq-engine-fullscreen-button").first();
          await fullscreenButton.waitFor({ state: "visible", timeout: 10_000 });
          await fullscreenButton.click();
          await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5_000 });
          const fullscreenScreenshot = path.join(OUT, `year1-m01-${viewport.name}-fullscreen.png`);
          await page.screenshot({ path: fullscreenScreenshot, fullPage: false });
          fullscreen = { tested: true, entered: true, exited: false, screenshot: fullscreenScreenshot };
          await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
          await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5_000 });
          fullscreen.exited = true;
        }

        // Feedback visual real: qualquer alvo deve produzir hit/miss/pending ou impacto visível.
        const target = page.frameLocator("iframe").locator(".duduq-ts-target:not(:disabled)").first();
        await target.waitFor({ state: "visible", timeout: 10_000 });
        await target.click();
        await page.waitForFunction(() => {
          const doc = document.querySelector("iframe")?.contentDocument;
          if (!doc) return false;
          return Boolean(
            doc.querySelector(".duduq-ts-target[data-state='hit'],.duduq-ts-target[data-state='miss'],.duduq-ts-target[data-state='pending'],.duduq-ts-impact")
          );
        }, null, { timeout: 5_000 });
        await page.waitForTimeout(160);
        const feedbackScreenshot = path.join(OUT, `year1-m${moduleKey}-${viewport.name}-feedback.png`);
        await page.screenshot({ path: feedbackScreenshot, fullPage: false });

        report.push({
          module: moduleNumber,
          viewport: viewport.name,
          boot,
          runtime,
          fullscreen,
          screenshots: { ready: readyScreenshot, feedback: feedbackScreenshot }
        });
      } finally {
        await page.close();
      }
    }
  }

  const summary = {
    status: "PASS",
    contract: "YEAR1_PUBLIC_POST_REVEAL_VISUAL_HOMOLOGATION",
    cases: report.length,
    viewports: VIEWPORTS,
    modules: 6,
    fullscreenSentinels: report.filter((entry) => entry.fullscreen?.tested && entry.fullscreen?.entered && entry.fullscreen?.exited).length,
    report
  };
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    status: summary.status,
    contract: summary.contract,
    cases: summary.cases,
    fullscreenSentinels: summary.fullscreenSentinels
  }, null, 2));
} finally {
  await browser.close();
}

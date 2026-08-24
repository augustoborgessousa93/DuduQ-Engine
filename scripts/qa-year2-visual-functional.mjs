import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4173";
const outDir = process.env.DUDUQ_QA_ARTIFACT_DIR || "artifacts/year2-visual";
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function advanceHostStep(page, previousIndex) {
  let accepted = false;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    accepted = await page.evaluate(() => {
      try { return window.DuduQ?.next?.({ qaAdvance: true }) === true; }
      catch (_) { return false; }
    });
    if (accepted) break;
    await page.waitForTimeout(120);
  }
  check(accepted, `Host não aceitou avanço após a etapa ${previousIndex}`);
  await page.waitForFunction(
    (index) => Number(window.__DUDUQ_QA_STEP__?.stepIndex) > Number(index),
    previousIndex,
    { timeout: 12000 }
  );
}

async function installQASpeechCompletion(page) {
  return page.evaluate(() => {
    const synth = window.speechSynthesis;
    if (!synth) return false;

    const fakeSpeak = function (utterance) {
      window.setTimeout(() => {
        try { utterance?.onend?.({ type: "end", elapsedTime: 0.08 }); } catch (_) {}
      }, 80);
    };

    const candidates = [synth, Object.getPrototypeOf(synth)].filter(Boolean);
    for (const candidate of candidates) {
      try {
        Object.defineProperty(candidate, "speak", {
          value: fakeSpeak,
          configurable: true,
          writable: true
        });
        if (synth.speak === fakeSpeak) {
          window.__DUDUQ_QA_SPEECH_PATCHED__ = true;
          return true;
        }
      } catch (_) {}
    }

    try {
      synth.speak = fakeSpeak;
      if (synth.speak === fakeSpeak) {
        window.__DUDUQ_QA_SPEECH_PATCHED__ = true;
        return true;
      }
    } catch (_) {}

    return false;
  });
}

async function runM112FirstListenGate(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const url = `${base}/content/english/year-2/module-01/homolog-v22-runtime.html`;
  const beforeShot = path.join(outDir, `M01-M12-first-listen-before-${viewport.name}.png`);
  const afterShot = path.join(outDir, `M01-M12-first-listen-after-${viewport.name}.png`);
  const entry = {
    module: "M01",
    viewport: `M12-gate-${viewport.name}`,
    url,
    screenshotBefore: beforeShot,
    screenshotAfter: afterShot,
    pass: false
  };

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    check(response && response.ok(), `M01/M12/${viewport.name}: HTTP ${response?.status?.()}`);

    await page.evaluate(() => {
      window.__DUDUQ_QA_STEP__ = null;
      window.addEventListener("duduq:step-start", (event) => {
        window.__DUDUQ_QA_STEP__ = {
          stepId: String(event?.detail?.stepId || ""),
          stepIndex: Number(event?.detail?.stepIndex ?? -1),
          mechanicId: String(event?.detail?.mechanicId || "")
        };
      });
    });

    const startButton = page.getByRole("button", { name: /INICIAR MISSÃO/i });
    await startButton.waitFor({ state: "visible", timeout: 15000 });
    await startButton.click();

    await page.waitForFunction(() => Boolean(window.__DUDUQ_QA_STEP__?.stepId), undefined, { timeout: 20000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-m12-navigation" }); } catch (_) {}
      try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    });

    for (let guard = 0; guard < 18; guard += 1) {
      const current = await page.evaluate(() => window.__DUDUQ_QA_STEP__ || null);
      check(current, `M01/M12/${viewport.name}: etapa atual não disponível`);
      if (current.stepId === "en2-m1-12-drag-drop") break;
      await advanceHostStep(page, current.stepIndex);
    }

    const targetStep = await page.evaluate(() => window.__DUDUQ_QA_STEP__ || null);
    check(targetStep?.stepId === "en2-m1-12-drag-drop", `M01/M12/${viewport.name}: não chegou ao gate; etapa=${targetStep?.stepId || "?"}`);
    check(targetStep?.mechanicId === "drag-drop", `M01/M12/${viewport.name}: mecânica do gate deve ser drag-drop`);

    const overlay = page.locator("#duduq-m1-12-first-listen-overlay");
    await overlay.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-duduq-m1-12-first-listen") === "waiting",
      undefined,
      { timeout: 5000 }
    );

    const gatedIframe = page.locator("#root iframe").first();
    await gatedIframe.waitFor({ state: "attached", timeout: 10000 });
    const beforeState = await gatedIframe.evaluate((node) => ({
      visibility: getComputedStyle(node).visibility,
      opacity: getComputedStyle(node).opacity,
      ariaHidden: node.getAttribute("aria-hidden"),
      gateMarker: node.getAttribute("data-duduq-m1-12-gated-frame")
    }));
    check(beforeState.visibility === "hidden", `M01/M12/${viewport.name}: letras não ficaram ocultas antes do áudio`);
    check(beforeState.ariaHidden === "true" && beforeState.gateMarker === "true", `M01/M12/${viewport.name}: iframe não foi marcado como oculto/acessível`);

    const overlayText = await overlay.innerText();
    check(!/L\s*[–-]\s*E\s*[–-]\s*O/i.test(overlayText), `M01/M12/${viewport.name}: overlay revelou L-E-O antes da primeira escuta`);
    check(/OUÇA PRIMEIRO/i.test(overlayText), `M01/M12/${viewport.name}: instrução de primeira escuta ausente`);
    await page.screenshot({ path: beforeShot, fullPage: false });

    const patched = await installQASpeechCompletion(page);
    check(patched, `M01/M12/${viewport.name}: não foi possível controlar speechSynthesis no Chromium de QA`);

    const listenButton = page.getByRole("button", { name: /OUVIR SOLETRAÇÃO/i });
    await listenButton.click();
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-duduq-m1-12-first-listen") === "revealed",
      undefined,
      { timeout: 5000 }
    );
    await overlay.waitFor({ state: "detached", timeout: 5000 });
    await gatedIframe.waitFor({ state: "visible", timeout: 5000 });

    const afterState = await gatedIframe.evaluate((node) => ({
      visibility: getComputedStyle(node).visibility,
      opacity: getComputedStyle(node).opacity,
      ariaHidden: node.getAttribute("aria-hidden"),
      gateMarker: node.getAttribute("data-duduq-m1-12-gated-frame")
    }));
    check(afterState.visibility !== "hidden", `M01/M12/${viewport.name}: iframe não foi revelado após o áudio`);
    check(afterState.ariaHidden === null && afterState.gateMarker === null, `M01/M12/${viewport.name}: marcas de ocultação permaneceram após o áudio`);

    const frameHandle = await gatedIframe.elementHandle();
    const child = await frameHandle?.contentFrame();
    check(child, `M01/M12/${viewport.name}: iframe Drag & Drop não acessível após reveal`);
    await child.waitForFunction(() => {
      const text = (document.body?.innerText || "").trim();
      const items = document.querySelectorAll(".duduq-dd2-item");
      return /Falha ao preparar|\bErro\b/i.test(text) || items.length >= 4;
    }, undefined, { timeout: 12000 });

    const runtime = await child.evaluate(() => ({
      text: (document.body?.innerText || "").trim().slice(0, 420),
      letters: Array.from(document.querySelectorAll(".duduq-dd2-item"))
        .map((node) => (node.textContent || "").trim())
        .filter(Boolean),
      targets: document.querySelectorAll(".duduq-dd2-target").length,
      interactive: document.querySelectorAll('button,[role="button"],[draggable="true"],[tabindex],.duduq-dd2-item').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));

    check(!/Falha ao preparar|\bErro\b/i.test(runtime.text), `M01/M12/${viewport.name}: runtime exibiu erro: ${runtime.text}`);
    for (const letter of ["L", "E", "O", "A"]) {
      check(runtime.letters.includes(letter), `M01/M12/${viewport.name}: letra móvel ${letter} ausente após reveal; atual=${runtime.letters.join(",")}`);
    }
    check(runtime.targets >= 3, `M01/M12/${viewport.name}: esperadas três posições de montagem; atual=${runtime.targets}`);
    check(runtime.interactive > 0, `M01/M12/${viewport.name}: runtime revelado sem interação`);
    check(runtime.scrollWidth <= runtime.clientWidth + 18, `M01/M12/${viewport.name}: overflow horizontal após reveal (${runtime.scrollWidth}/${runtime.clientWidth})`);
    check(pageErrors.length === 0, `M01/M12/${viewport.name}: pageerror: ${pageErrors.join(" | ")}`);

    await page.screenshot({ path: afterShot, fullPage: false });
    entry.pass = true;
    entry.beforeState = beforeState;
    entry.afterState = afterState;
    entry.runtime = runtime;
    entry.consoleErrors = consoleErrors;
    console.log(`PASS M01/M12-first-listen/${viewport.name}`);
  } catch (error) {
    entry.error = String(error?.message || error);
    entry.pageErrors = pageErrors;
    entry.consoleErrors = consoleErrors;
    failures.push(entry);
    console.error(`FAIL M01/M12-first-listen/${viewport.name}: ${entry.error}`);
    await page.screenshot({ path: afterShot, fullPage: false }).catch(() => {});
  } finally {
    report.push(entry);
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
const report = [];
const failures = [];

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const url = `${base}/content/english/year-2/module-${mm}/homolog-v22-runtime.html`;
    const screenshot = path.join(outDir, `M${mm}-${viewport.name}.png`);
    const entry = { module: `M${mm}`, viewport: viewport.name, url, screenshot, pass: false };

    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      check(response && response.ok(), `M${mm}/${viewport.name}: HTTP ${response?.status?.()}`);

      const startButton = page.getByRole("button", { name: /INICIAR MISSÃO/i });
      await startButton.waitFor({ state: "visible", timeout: 15000 });
      const startBox = await startButton.boundingBox();
      check(startBox && startBox.width >= 180 && startBox.height >= 44, `M${mm}/${viewport.name}: botão inicial fora do padrão de toque`);
      await startButton.click();

      await page.waitForFunction(() => {
        const root = document.getElementById("root");
        const text = root?.textContent || "";
        return Boolean(document.querySelector("iframe")) || /Erro:/i.test(text) || /Erro ao carregar/i.test(text);
      }, undefined, { timeout: 20000 });

      const rootText = await page.locator("#root").innerText().catch(() => "");
      check(!/Erro:/i.test(rootText) && !/Erro ao carregar/i.test(rootText), `M${mm}/${viewport.name}: runtime exibiu erro: ${rootText.slice(0, 220)}`);

      await page.evaluate(() => {
        try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-after-start" }); } catch (_) {}
        try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
      });

      const iframe = page.locator("iframe").first();
      await iframe.waitFor({ state: "visible", timeout: 10000 });

      const frame = page.frames().find((candidate) => candidate !== page.mainFrame() && /engine\/releases\/mechanics\//.test(candidate.url())) || page.frames().find((candidate) => candidate !== page.mainFrame());
      check(frame, `M${mm}/${viewport.name}: frame da mecânica não localizado`);
      await frame.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});

      await frame.waitForFunction(() => {
        const text = (document.body?.innerText || "").trim();
        const interactive = document.querySelectorAll('button,[role="button"],[draggable="true"],[tabindex],input,select,.duduq-dd2-item').length;
        return /Falha ao preparar|Modo editorial|\bErro\b/i.test(text) || (!/^Preparando\b/i.test(text) && interactive > 0);
      }, undefined, { timeout: 15000 });
      await page.waitForTimeout(700);

      const frameMetrics = await frame.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const text = (body?.innerText || "").trim();
        const interactive = document.querySelectorAll('button,[role="button"],[draggable="true"],[tabindex],input,select,.duduq-dd2-item').length;
        return {
          textLength: text.length,
          textSample: text.slice(0, 260),
          interactive,
          scrollWidth: Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0),
          clientWidth: doc?.clientWidth || 0,
          scrollHeight: Math.max(doc?.scrollHeight || 0, body?.scrollHeight || 0),
          clientHeight: doc?.clientHeight || 0
        };
      });

      check(frameMetrics.textLength > 0, `M${mm}/${viewport.name}: mecânica sem conteúdo textual/semântica carregada`);
      check(!/Falha ao preparar|Modo editorial|\bErro\b/i.test(frameMetrics.textSample), `M${mm}/${viewport.name}: mecânica exibiu erro: ${frameMetrics.textSample}`);
      check(frameMetrics.interactive > 0, `M${mm}/${viewport.name}: nenhum controle interativo detectado`);

      const box = await iframe.boundingBox();
      check(box && box.width >= Math.min(300, viewport.width - 24), `M${mm}/${viewport.name}: iframe estreito demais (${box?.width || 0}px)`);
      check(box && box.height >= 220, `M${mm}/${viewport.name}: iframe baixo demais (${box?.height || 0}px)`);

      const mainMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight
      }));
      check(mainMetrics.scrollWidth <= mainMetrics.clientWidth + 12, `M${mm}/${viewport.name}: overflow horizontal no host (${mainMetrics.scrollWidth}/${mainMetrics.clientWidth})`);
      check(frameMetrics.scrollWidth <= frameMetrics.clientWidth + 18, `M${mm}/${viewport.name}: overflow horizontal na mecânica (${frameMetrics.scrollWidth}/${frameMetrics.clientWidth})`);
      check(pageErrors.length === 0, `M${mm}/${viewport.name}: pageerror: ${pageErrors.join(" | ")}`);

      entry.pass = true;
      entry.mainMetrics = mainMetrics;
      entry.frameMetrics = frameMetrics;
      entry.iframe = box;
      entry.consoleErrors = consoleErrors;
      console.log(`PASS M${mm}/${viewport.name}`);
    } catch (error) {
      entry.error = String(error?.message || error);
      entry.pageErrors = pageErrors;
      entry.consoleErrors = consoleErrors;
      failures.push(entry);
      console.error(`FAIL M${mm}/${viewport.name}: ${entry.error}`);
    } finally {
      await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
      report.push(entry);
      await page.close();
    }
  }
}

for (const viewport of viewports) {
  await runM112FirstListenGate(browser, viewport);
}

await browser.close();
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ base, cases: report }, null, 2));

if (failures.length) {
  console.error("DUDUQ YEAR2 VISUAL/FUNCTIONAL QA: FAIL");
  for (const failure of failures) console.error(`${failure.module}/${failure.viewport}: ${failure.error}`);
  process.exit(1);
}

console.log("DUDUQ YEAR2 VISUAL/FUNCTIONAL QA: PASS");
console.log(JSON.stringify({ cases: report.length, modules: 6, viewports: viewports.map((v) => v.name), dedicatedGate: "EN2-M1-12 desktop+mobile" }, null, 2));

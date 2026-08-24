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

async function patchSpeechCompletion(page) {
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
        if (synth.speak === fakeSpeak) return true;
      } catch (_) {}
    }

    try {
      synth.speak = fakeSpeak;
      return synth.speak === fakeSpeak;
    } catch (_) {
      return false;
    }
  });
}

const browser = await chromium.launch({ headless: true });
const report = [];
const failures = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const url = `${base}/content/english/year-2/module-01/homolog-v22-m1-12.html`;
  const beforeShot = path.join(outDir, `M01-M12-first-listen-before-${viewport.name}.png`);
  const afterShot = path.join(outDir, `M01-M12-first-listen-after-${viewport.name}.png`);
  const entry = { module: "M01", item: "EN2-M1-12", viewport: viewport.name, url, pass: false };

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    check(response && response.ok(), `M01-12/${viewport.name}: HTTP ${response?.status?.()}`);

    const patched = await patchSpeechCompletion(page);
    check(patched, `M01-12/${viewport.name}: speechSynthesis de QA não pôde ser controlado`);

    const startButton = page.getByRole("button", { name: /INICIAR MISSÃO/i });
    await startButton.waitFor({ state: "visible", timeout: 15000 });
    await startButton.click({ timeout: 10000 });

    await page.evaluate(() => {
      try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-m12-direct" }); } catch (_) {}
      try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
    });

    const overlay = page.locator("#duduq-m1-12-first-listen-overlay");
    await overlay.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-duduq-m1-12-first-listen") === "waiting",
      undefined,
      { timeout: 5000 }
    );

    const iframe = page.locator("#root iframe").first();
    await iframe.waitFor({ state: "attached", timeout: 10000 });
    const before = await iframe.evaluate((node) => ({
      visibility: getComputedStyle(node).visibility,
      opacity: getComputedStyle(node).opacity,
      ariaHidden: node.getAttribute("aria-hidden"),
      gated: node.getAttribute("data-duduq-m1-12-gated-frame")
    }));

    check(before.visibility === "hidden", `M01-12/${viewport.name}: iframe não ficou oculto antes do áudio`);
    check(before.ariaHidden === "true" && before.gated === "true", `M01-12/${viewport.name}: marca acessível de ocultação ausente`);

    const overlayText = await overlay.innerText();
    check(/OUÇA PRIMEIRO/i.test(overlayText), `M01-12/${viewport.name}: orientação de primeira escuta ausente`);
    check(!/L\s*[–-]\s*E\s*[–-]\s*O/i.test(overlayText), `M01-12/${viewport.name}: L-E-O apareceu antes da escuta`);
    await page.screenshot({ path: beforeShot, fullPage: false, timeout: 10000 });

    const listenButton = page.getByRole("button", { name: /OUVIR SOLETRAÇÃO/i });
    await listenButton.click({ timeout: 10000 });

    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-duduq-m1-12-first-listen") === "revealed",
      undefined,
      { timeout: 5000 }
    );
    await overlay.waitFor({ state: "detached", timeout: 5000 });
    await iframe.waitFor({ state: "visible", timeout: 5000 });

    const frameHandle = await iframe.elementHandle();
    const frame = await frameHandle?.contentFrame();
    check(frame, `M01-12/${viewport.name}: iframe Drag & Drop não acessível após reveal`);

    await frame.waitForFunction(() => {
      const text = (document.body?.innerText || "").trim();
      const items = document.querySelectorAll('.duduq-dd2-item,.duduq-dd-item,[draggable="true"]');
      return /Falha ao preparar|\bErro\b/i.test(text) || items.length >= 4;
    }, undefined, { timeout: 15000 });
    await page.waitForTimeout(1050);

    const runtime = await frame.evaluate(() => {
      const bodyText = (document.body?.innerText || "").trim();
      const itemNodes = Array.from(document.querySelectorAll('.duduq-dd2-item,.duduq-dd-item,[draggable="true"]'));
      const letterEntries = itemNodes
        .map((node) => ({ node, value: (node.textContent || "").trim().toUpperCase() }))
        .filter((entry) => /^[A-Z]$/.test(entry.value));
      const letters = letterEntries.map((entry) => entry.value);
      const spellSlots = Array.from(document.querySelectorAll('.duduq-dd2-target[data-kind="spell-slot"]'));
      const doc = document.documentElement;
      const body = document.body;
      const allLetterRects = letterEntries.map(({ node, value }) => {
        const rect = node.getBoundingClientRect();
        return { value, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      });
      const slotRects = spellSlots.map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      });
      return {
        text: bodyText.slice(0, 500),
        letters: Array.from(new Set(letters)),
        spellSlots: spellSlots.length,
        targetContainers: document.querySelectorAll('.duduq-dd2-target,.duduq-dd-target').length,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollY: Math.max(window.scrollY || 0, doc.scrollTop || 0, body?.scrollTop || 0),
        innerHeight: window.innerHeight,
        letterRects: allLetterRects,
        slotRects
      };
    });

    check(!/Falha ao preparar|\bErro\b/i.test(runtime.text), `M01-12/${viewport.name}: runtime exibiu erro: ${runtime.text}`);
    for (const letter of ["L", "E", "O", "A"]) {
      check(runtime.letters.includes(letter), `M01-12/${viewport.name}: letra ${letter} ausente; atual=${runtime.letters.join(",")}`);
    }
    check(runtime.spellSlots === 3, `M01-12/${viewport.name}: esperados três destinos posicionais compactos; atual=${runtime.spellSlots}`);
    check(runtime.targetContainers === 3, `M01-12/${viewport.name}: esperados três destinos; atual=${runtime.targetContainers}`);
    check(runtime.scrollWidth <= runtime.clientWidth + 18, `M01-12/${viewport.name}: overflow horizontal (${runtime.scrollWidth}/${runtime.clientWidth})`);

    if (viewport.name === "mobile") {
      check(runtime.scrollY <= 2, `M01-12/mobile: Drag & Drop foi revelado com topo interno deslocado (${runtime.scrollY}px)`);
      const hostScrollY = await page.evaluate(() => Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, document.body?.scrollTop || 0));
      check(hostScrollY <= 2, `M01-12/mobile: host foi revelado deslocado verticalmente (${hostScrollY}px)`);
      check(runtime.slotRects.every((rect) => rect.width <= 100 && rect.height <= 110), `M01-12/mobile: destinos continuam grandes demais: ${JSON.stringify(runtime.slotRects)}`);
      check(runtime.letterRects.length >= 4, `M01-12/mobile: cartões de letras insuficientes`);
      const visibleLetterCount = runtime.letterRects.filter((rect) => rect.top >= -2 && rect.bottom <= runtime.innerHeight + 2).length;
      check(visibleLetterCount >= 4, `M01-12/mobile: as quatro letras não aparecem juntas no primeiro viewport (${visibleLetterCount}/4)`);
      entry.hostScrollY = hostScrollY;
    }

    check(pageErrors.length === 0, `M01-12/${viewport.name}: pageerror: ${pageErrors.join(" | ")}`);

    await page.screenshot({ path: afterShot, fullPage: false, timeout: 10000 });
    entry.pass = true;
    entry.before = before;
    entry.runtime = runtime;
    entry.consoleErrors = consoleErrors;
    console.log(`PASS M01-12-first-listen/${viewport.name}`);
  } catch (error) {
    entry.error = String(error?.message || error);
    entry.pageErrors = pageErrors;
    entry.consoleErrors = consoleErrors;
    failures.push(entry);
    console.error(`FAIL M01-12-first-listen/${viewport.name}: ${entry.error}`);
    await page.screenshot({ path: afterShot, fullPage: false, timeout: 10000 }).catch(() => {});
  } finally {
    report.push(entry);
    await page.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(outDir, "report-m1-12.json"), JSON.stringify({ base, cases: report }, null, 2));

if (failures.length) {
  console.error("DUDUQ M01-12 FIRST LISTEN QA: FAIL");
  for (const failure of failures) console.error(`${failure.viewport}: ${failure.error}`);
  process.exit(1);
}

console.log("DUDUQ M01-12 FIRST LISTEN QA: PASS");
console.log(JSON.stringify({ cases: report.length, item: "EN2-M1-12", viewports: viewports.map((v) => v.name) }, null, 2));

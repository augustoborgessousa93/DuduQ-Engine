import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const PUBLIC_URL = process.env.PUBLIC_URL || "https://duduq-engine.pages.dev/content/english/year-2/module-03/";
const RESULTS = process.env.RESULTS_DIR || "test-results/r143-visual-baseline";
const scenarios = [
  { name: "desktop-1366x768", width: 1366, height: 768, mobile: false },
  { name: "notebook-1280x650", width: 1280, height: 650, mobile: false },
  { name: "tablet-1024x768", width: 1024, height: 768, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true }
];

fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForPublicR143(page) {
  await page.waitForFunction(
    () => window.DUDUQ_ENGINE_MANIFEST?.revision === 143 && window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release === "2.0.22",
    null,
    { timeout: 35_000 }
  );

  const state = await page.evaluate(() => ({
    revision: window.DUDUQ_ENGINE_MANIFEST?.revision,
    dragDropRelease: window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,
    publicEntry: window.DUDUQ_PUBLIC_ENTRY || null
  }));

  assert(state.revision === 143, `Baseline deve usar Canary R143; encontrado ${state.revision}.`);
  assert(state.dragDropRelease === "2.0.22", `Baseline deve usar Drag & Drop 2.0.22; encontrado ${state.dragDropRelease}.`);
  assert(!state.publicEntry?.interactionPilot, "Baseline R143 não pode ativar interactionPilot.");
  assert(!state.publicEntry?.dragDropCandidate, "Baseline R143 não pode declarar dragDropCandidate.");
}

async function enterGame(page) {
  const introStart = page.locator(".duduq-intro-start-button");
  try {
    await introStart.waitFor({ state: "visible", timeout: 12_000 });
    await introStart.click();
  } catch (_) {
    // Warm/public sessions may already be inside the game.
  }

  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"),
    null,
    { timeout: 15_000 }
  ).catch(() => {});

  const iframe = page.locator('iframe[title^="DuduQ"]').first();
  await iframe.waitFor({ state: "visible", timeout: 35_000 });
  await page.waitForTimeout(700);
  return iframe;
}

async function snapshotScenario(browser, scenario) {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    isMobile: scenario.mobile,
    hasTouch: scenario.mobile
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") browserErrors.push(msg.text());
  });

  await page.goto(PUBLIC_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await waitForPublicR143(page);
  const iframe = await enterGame(page);

  const metrics = await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const header = document.querySelector(".duduq-progress-header, .duduq-game-header, header");
    const stage = document.querySelector(".duduq-progress-stage, [data-duduq-progress-stage]");
    const frame = document.querySelector('iframe[title^="DuduQ"]');
    const body = document.body;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      header: rect(header),
      iframe: rect(frame),
      stageText: stage?.textContent?.trim() || null,
      bodyTextHead: body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 900) || ""
    };
  });

  const inner = await iframe.evaluate((element) => {
    const doc = element.contentDocument;
    if (!doc) return { accessible: false };
    const rect = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const visibleButtons = Array.from(doc.querySelectorAll("button")).filter((button) => {
      const style = doc.defaultView.getComputedStyle(button);
      const r = button.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && r.width > 0 && r.height > 0;
    });
    const mainCard = doc.querySelector(".duduq-dd2-target, .duduq-matching-card, .duduq-bubble-card, .duduq-target-shooter-stage, main");
    const confirm = Array.from(doc.querySelectorAll("button")).find((button) => /confirmar/i.test(button.textContent || ""));
    return {
      accessible: true,
      title: doc.title,
      bodyClass: doc.body?.className || "",
      mainCard: rect(mainCard),
      confirm: rect(confirm),
      visibleButtonCount: visibleButtons.length,
      visibleButtons: visibleButtons.slice(0, 12).map((button) => ({
        text: (button.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        ariaLabel: button.getAttribute("aria-label"),
        disabled: button.disabled,
        rect: rect(button)
      })),
      bodyTextHead: doc.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 1400) || ""
    };
  });

  assert(metrics.horizontalOverflow <= 4, `${scenario.name}: overflow horizontal do host = ${metrics.horizontalOverflow}px.`);
  assert(metrics.iframe && metrics.iframe.width > 200 && metrics.iframe.height > 180, `${scenario.name}: iframe principal não está dimensionado corretamente.`);
  assert(inner.accessible === true, `${scenario.name}: iframe público não ficou acessível para baseline.`);
  assert(inner.visibleButtonCount >= 1, `${scenario.name}: nenhuma ação visível encontrada no runtime.`);
  assert(!inner.bodyTextHead.includes("SINGLE_TARGET_CHOICE"), `${scenario.name}: marcador de homologação apareceu na interface pública.`);

  const fatal = browserErrors.filter((message) => /error|erro|failed|falha/i.test(message));
  assert(fatal.length === 0, `${scenario.name}: erros de browser: ${fatal.join(" | ")}`);

  const result = {
    baseline: "R143 / drag-drop 2.0.22 / previous approved public visual",
    publicUrl: PUBLIC_URL,
    scenario,
    capturedAt: new Date().toISOString(),
    metrics,
    inner
  };

  fs.writeFileSync(`${RESULTS}/${scenario.name}.json`, JSON.stringify(result, null, 2));
  await page.screenshot({ path: `${RESULTS}/${scenario.name}.png`, fullPage: true });
  console.log(`PASS — ${scenario.name}: R143 visual baseline captured`);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  for (const scenario of scenarios) await snapshotScenario(browser, scenario);
  fs.writeFileSync(`${RESULTS}/BASELINE.txt`, [
    "DuduQ visual baseline",
    "Canary: R143",
    "Drag & Drop: 2.0.22",
    "M03 public entry: previous approved version, no SINGLE_TARGET_CHOICE opt-in",
    `Public source: ${PUBLIC_URL}`,
    "Captured viewports: 1366x768, 1280x650, 1024x768, 390x844"
  ].join("\n") + "\n");
  console.log("PASS — approved R143 baseline package complete");
} finally {
  await browser.close();
}

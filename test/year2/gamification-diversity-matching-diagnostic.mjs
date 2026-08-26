import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/year2-gamification-diversity-rc1");
await fs.mkdir(OUT, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const messages = [];
let failure = null;

await page.route("**/engine/duduq-player-v1.js*", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/javascript", body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;" });
});
page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

const report = { id: "EN2-M1-02", messages };
try {
  await page.goto(`${BASE_URL}/content/english/year-2/module-01/index.html?qa=matching-diagnostic`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal;
    return Boolean(built?.gamificationDiversityAudit && window.DuduQ?.hasMechanic?.("matching"));
  }, null, { timeout: 30_000 });

  report.probe = await page.evaluate(() => {
    const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
    const activity = built.activities.find((entry) => entry.questions?.some((q) => q.id === "EN2-M1-02"));
    const q = JSON.parse(JSON.stringify(activity.questions.find((entry) => entry.id === "EN2-M1-02")));
    q.metadata.matching.behavior.shuffleLeft = false;
    q.metadata.matching.behavior.shuffleRight = false;
    const pair = q.metadata.matching.pairs[0];
    const correctIndex = q.metadata.matching.rightItems.findIndex((entry) => entry.id === pair.rightId);
    window.DuduQIntro?.hide?.({ immediate: true });
    window.DuduQTransition?.hideImmediate?.();
    window.DuduQ.destroy();
    window.DuduQ.start({
      id: "qa-matching-diagnostic",
      title: "QA Matching distractor",
      year: 2,
      subject: built.subject,
      module: 1,
      container: "#root",
      steps: [{
        id: "qa-EN2-M1-02",
        mechanic: "matching",
        payload: { id: "qa-payload", title: "GREETINGS", subject: built.subject, year: 2, module: 1, questions: [q] }
      }]
    });
    return {
      correctIndex,
      pair,
      rightItems: q.metadata.matching.rightItems,
      allowUnpairedDistractors: q.metadata.matching.behavior.allowUnpairedDistractors
    };
  });

  assert(report.probe.allowUnpairedDistractors === true, "EN2-M1-02: flag allowUnpairedDistractors ausente.");
  assert(report.probe.correctIndex >= 0, "EN2-M1-02: par correto não foi localizado nos metadados.");

  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "EN2-M1-02: iframe Matching inacessível.");
  await frame.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 20_000 });

  async function snapshot(label) {
    const data = frame.isDetached() ? { label, detached: true } : await frame.evaluate((name) => ({
      label: name,
      detached: false,
      live: document.querySelector(".duduq-matching-live")?.textContent || "",
      actionState: document.querySelector(".duduq-matching-action-slot")?.getAttribute("data-feedback-state") || null,
      confirmDisabled: document.querySelector(".duduq-matching-primary")?.disabled ?? null,
      cards: Array.from(document.querySelectorAll(".duduq-matching-card")).map((card, index) => ({
        index,
        aria: card.getAttribute("aria-label"),
        selected: card.getAttribute("data-selected"),
        paired: card.getAttribute("data-paired"),
        feedback: card.getAttribute("data-feedback"),
        locked: card.getAttribute("data-locked"),
        imgAlt: card.querySelector("img")?.getAttribute("alt") || null
      })),
      body: String(document.body?.innerText || "").slice(0, 1400)
    }), label);
    report.snapshots ??= [];
    report.snapshots.push(data);
    return data;
  }

  await snapshot("initial");
  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const right = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
  const confirm = frame.locator(".duduq-matching-primary");

  const correctAlt = report.probe.rightItems[report.probe.correctIndex]?.alt;
  assert(correctAlt, "EN2-M1-02: alternativa correta não possui alt visual.");
  const renderedRightAlts = await right.evaluateAll((cards) => cards.map((card) => card.querySelector("img")?.getAttribute("alt") || null));
  const correctDomIndex = renderedRightAlts.findIndex((alt) => alt === correctAlt);
  const wrongDomIndex = renderedRightAlts.findIndex((_, index) => index !== correctDomIndex);
  assert(correctDomIndex >= 0, `EN2-M1-02: resposta correta não encontrada no DOM: ${JSON.stringify(renderedRightAlts)}`);
  assert(wrongDomIndex >= 0, "EN2-M1-02: distrator visual não encontrado.");
  report.renderedRightAlts = renderedRightAlts;
  report.correctDomIndex = correctDomIndex;
  report.wrongDomIndex = wrongDomIndex;
  report.wrongAlt = renderedRightAlts[wrongDomIndex];

  await left.first().click();
  await snapshot("after-left-click");
  await right.nth(wrongDomIndex).click();
  await snapshot("after-wrong-right-click");
  await page.screenshot({ path: path.join(OUT, "EN2-M1-02-before-wrong-confirm.png"), fullPage: true });

  report.confirmDisabledBeforeWrongSubmit = await confirm.isDisabled();
  assert(report.confirmDisabledBeforeWrongSubmit === false, "EN2-M1-02: CONFIRMAR não habilitou após formar o par errado.");
  await confirm.click();

  for (const [label, delay] of [["after-submit-0",0],["after-submit-80",80],["after-submit-250",170],["after-submit-700",450],["after-submit-1300",600]]) {
    if (delay) await page.waitForTimeout(delay);
    await snapshot(label);
  }

  report.hostSession = await page.evaluate(() => window.DuduQ?.getSession?.() || null);
  report.retryEvidence = (report.snapshots || []).some((sample) => {
    const text = `${sample.live || ""} ${sample.body || ""}`;
    return sample.actionState === "retry" || sample.cards?.some((card) => card.feedback === "retry") || /0\s+de\s+1|tente\s+criar|tente\s+novamente|ouça\s+novamente/i.test(text);
  });
  assert(report.hostSession?.completed !== true, "EN2-M1-02: um distrator foi aceito como resposta correta.");
  assert(report.retryEvidence === true, "EN2-M1-02: erro real não produziu estado observável de segunda tentativa.");
  await page.screenshot({ path: path.join(OUT, "EN2-M1-02-after-wrong-confirm.png"), fullPage: true });
} catch (error) {
  failure = error;
  report.error = error?.stack || error?.message || String(error);
} finally {
  await fs.writeFile(path.join(OUT, "EN2-M1-02-matching-diagnostic.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (failure) throw failure;

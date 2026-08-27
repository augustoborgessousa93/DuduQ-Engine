import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-01/index.html?qa=word-slash-quarantine-rc3`;
const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/word-slash-quarantine-rc3");
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(20_000);

    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("**/engine/duduq-player-v1.js*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript; charset=utf-8",
        body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;"
      });
    });

    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForFunction(() => Boolean(
      window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal && window.DuduQ
    ), null, { timeout: 20_000 });

    const model = await page.evaluate(() => {
      const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
      const activity = (built.activities || []).find((entry) =>
        (entry.questions || []).some((question) => question.id === "EN2-M1-08")
      );
      if (!activity) throw new Error("EN2-M1-08 activity not found.");
      const question = (activity.questions || []).find((entry) => entry.id === "EN2-M1-08");
      const labels = (question.alternatives || []).map((alternative) => String(alternative.text || ""));
      const correctId = String(question.answer?.value || "");
      const correct = (question.alternatives || []).find((alternative) => alternative.id === correctId);
      return {
        mechanic: question.delivery?.mechanic || activity.mechanic,
        sourceAnswer: String(question.metadata?.sourceAnswerV23 || ""),
        audioText: String(question.audio?.text || question.media?.audio?.text || ""),
        labels,
        correctId,
        correctText: String(correct?.text || ""),
        fallback: question.metadata?.mechanicsRegressionFallback || null,
        quarantine: question.metadata?.wordSlashRuntimeQuarantine || null,
        targetShooter: question.metadata?.targetShooter || null,
        routerAudit: built.mechanicsRegressionRouterCompatibilityAudit || null
      };
    });

    assert(model.mechanic === "target-shooter", `${viewport.name}: EN2-M1-08 must be quarantined to target-shooter.`);
    assert(model.fallback?.from === "word-slash" && model.fallback?.to === "target-shooter", `${viewport.name}: reversible Word Slash fallback metadata missing.`);
    assert(model.quarantine?.runtime === "1.0.17", `${viewport.name}: frozen Word Slash runtime version missing from quarantine audit.`);
    assert(model.quarantine?.sourceAnswerPreserved === true, `${viewport.name}: quarantine did not certify source-answer preservation.`);
    assert(model.sourceAnswer && model.correctText === model.sourceAnswer, `${viewport.name}: source answer changed during quarantine.`);
    assert(model.audioText === model.sourceAnswer, `${viewport.name}: listening stimulus changed during quarantine.`);
    assert(model.labels.length >= 2 && model.labels.includes(model.sourceAnswer), `${viewport.name}: target alternatives do not preserve the source set.`);
    assert(model.targetShooter?.mode === "audio-to-word", `${viewport.name}: fallback Target Shooter must remain listening-to-word recognition.`);
    assert(model.routerAudit?.wordSlashRuntimeBlocked === true, `${viewport.name}: module quarantine audit missing.`);

    await page.evaluate(() => {
      try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-word-slash-quarantine-rc3" }); } catch (_) {}
      try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
      try { window.DuduQ?.destroy?.(); } catch (_) {}
      document.documentElement.removeAttribute("data-duduq-initial-speech-gate");

      const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
      const activity = (built.activities || []).find((entry) =>
        (entry.questions || []).some((question) => question.id === "EN2-M1-08")
      );
      const question = JSON.parse(JSON.stringify(
        (activity.questions || []).find((entry) => entry.id === "EN2-M1-08")
      ));
      const mechanic = question.delivery?.mechanic || activity.mechanic;

      window.DuduQ.start({
        id: "qa-word-slash-quarantine-EN2-M1-08",
        title: "QA EN2-M1-08 quarantine",
        year: built.year,
        subject: built.subject,
        module: built.module,
        container: "#root",
        steps: [{
          id: "qa-EN2-M1-08",
          mechanic,
          payload: {
            id: "qa-EN2-M1-08-payload",
            title: activity.title || "EN2-M1-08",
            subject: built.subject,
            year: built.year,
            module: built.module,
            questions: [question]
          },
          options: { contentVersion: built.version, skill: activity.skill || null }
        }]
      });
    });

    const iframe = page.locator("#root iframe").first();
    await iframe.waitFor({ state: "attached", timeout: 12_000 });
    const frame = await (await iframe.elementHandle()).contentFrame();
    assert(frame, `${viewport.name}: target-shooter iframe inaccessible.`);

    await frame.waitForFunction(() => Boolean(document.querySelector(".duduq-ts-root")), null, { timeout: 12_000 });
    await frame.waitForFunction(() => Array.from(document.querySelectorAll(".duduq-ts-target")).some((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 20 && rect.height > 20 && style.display !== "none" && style.visibility !== "hidden";
    }), null, { timeout: 12_000 });

    const runtime = await frame.evaluate(() => {
      const targets = Array.from(document.querySelectorAll(".duduq-ts-target"));
      return {
        root: Boolean(document.querySelector(".duduq-ts-root")),
        runtimeError: String(document.querySelector("#duduq-runtime-error")?.textContent || "").trim(),
        visibleTargets: targets.filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 20 && rect.height > 20 && style.display !== "none" && style.visibility !== "hidden";
        }).length,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
      };
    });

    assert(runtime.root, `${viewport.name}: Target Shooter root not rendered.`);
    assert(!runtime.runtimeError, `${viewport.name}: Target Shooter runtime error: ${runtime.runtimeError}`);
    assert(runtime.visibleTargets > 0, `${viewport.name}: quarantine fallback rendered no visible targets.`);
    assert(runtime.scrollWidth <= runtime.viewportWidth + 6, `${viewport.name}: horizontal overflow after Word Slash quarantine.`);
    assert(pageErrors.length === 0, `${viewport.name}: page errors: ${pageErrors.join(" | ")}`);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `EN2-M1-08-target-shooter-${viewport.name}.png`),
      fullPage: false,
      timeout: 8_000
    });

    report.push({ viewport: viewport.name, model, runtime });
    await page.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(
  path.join(OUTPUT_DIR, "report.json"),
  JSON.stringify({ status: "PASS", contract: "WORD_SLASH_1_0_17_RUNTIME_QUARANTINE", report }, null, 2)
);

console.log(JSON.stringify({
  status: "PASS",
  contract: "WORD_SLASH_1_0_17_RUNTIME_QUARANTINE",
  viewports: report.map((entry) => ({ viewport: entry.viewport, mechanic: entry.model.mechanic, visibleTargets: entry.runtime.visibleTargets }))
}, null, 2));

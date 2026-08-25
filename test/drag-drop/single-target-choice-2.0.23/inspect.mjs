import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const messages = [];
page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  await page.waitForTimeout(4_000);

  const top = await page.evaluate(() => {
    const module = window.DUDUQ_CONTENT?.english?.year2?.module03v23multimodal;
    const activity = module?.activities?.[0];
    const question = activity?.questions?.[0];
    return {
      manifestDragDrop: window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"] || null,
      mechanics: window.DuduQ?.listMechanics?.() || [],
      moduleId: module?.id || null,
      activity: activity ? { id: activity.id, mechanic: activity.mechanic, title: activity.title } : null,
      question: question ? {
        id: question.id,
        delivery: question.delivery || null,
        answer: question.answer || null,
        target: question.metadata?.targets?.[0] || null,
        singleTargetChoice: question.metadata?.singleTargetChoice,
        interactionMode: question.metadata?.interactionAdaptation?.mode,
        confirmOnAnySelection: question.metadata?.confirmOnAnySelection,
        tapToPlace: question.metadata?.tapToPlace,
        replacePreviousChoice: question.metadata?.replacePreviousChoice
      } : null
    };
  });

  const frames = page.frames();
  const mechanicFrame = frames.find((frame) => frame !== page.mainFrame() && frame.url() === "about:srcdoc");
  let runtime = null;
  if (mechanicFrame) {
    runtime = await mechanicFrame.evaluate(() => {
      const target = document.querySelector(".duduq-dd-target");
      const configEl = document.querySelector("#targetShooterConfig");
      let config = null;
      try { config = configEl ? JSON.parse(configEl.textContent || "null") : null; } catch (error) { config = { parseError: String(error) }; }
      return {
        title: document.title,
        targetAttributes: target ? Object.fromEntries(Array.from(target.attributes).map((attr) => [attr.name, attr.value])) : null,
        targetClass: target?.className || null,
        configStage: config?.stages?.[0] ? {
          id: config.stages[0].id,
          strategy: config.stages[0].strategy,
          mode: config.stages[0].mode,
          behavior: config.stages[0].behavior,
          targets: config.stages[0].targets,
          items: config.stages[0].items
        } : null
      };
    });
  }

  console.log("=== SINGLE_TARGET_CHOICE TOP ===");
  console.log(JSON.stringify(top, null, 2));
  console.log("=== SINGLE_TARGET_CHOICE RUNTIME ===");
  console.log(JSON.stringify(runtime, null, 2));
  console.log("=== BROWSER MESSAGES ===");
  console.log(messages.join("\n"));
} finally {
  await browser.close();
}

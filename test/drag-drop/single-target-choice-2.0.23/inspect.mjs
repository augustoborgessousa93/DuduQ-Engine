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
  await page.waitForFunction(
    () => window.DuduQDD23SingleTargetRuntimePatch?.ready === true,
    null,
    { timeout: 20_000 }
  );

  const beforeStart = await page.evaluate(() => {
    const module = window.DUDUQ_CONTENT?.english?.year2?.module03v23multimodal;
    const activity = module?.activities?.[0];
    const question = activity?.questions?.[0];
    return {
      runtimePatch: window.DuduQDD23SingleTargetRuntimePatch || null,
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

  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  await page.waitForTimeout(4_000);

  const frames = page.frames();
  const mechanicFrame = frames.find((frame) => frame !== page.mainFrame() && frame.url() === "about:srcdoc");
  let runtime = null;
  if (mechanicFrame) {
    runtime = await mechanicFrame.evaluate(() => {
      const target = document.querySelector(".duduq-dd2-target");
      const capacity = document.querySelector(".duduq-dd2-capacity");
      const bank = document.querySelector(".duduq-dd2-bank");
      const confirm = document.querySelector(".duduq-dd2-confirm");
      return {
        title: document.title,
        targetAttributes: target ? Object.fromEntries(Array.from(target.attributes).map((attr) => [attr.name, attr.value])) : null,
        targetClass: target?.className || null,
        capacityDisplay: capacity ? getComputedStyle(capacity).display : null,
        bankClass: bank?.className || null,
        confirmDisabled: confirm?.disabled ?? null,
        bodyText: document.body?.innerText?.slice(0, 1200) || ""
      };
    });
  }

  console.log("=== SINGLE_TARGET_CHOICE BEFORE START ===");
  console.log(JSON.stringify(beforeStart, null, 2));
  console.log("=== SINGLE_TARGET_CHOICE ACTIVE DD2 RUNTIME ===");
  console.log(JSON.stringify(runtime, null, 2));
  console.log("=== BROWSER MESSAGES ===");
  console.log(messages.join("\n"));

  if (!beforeStart.runtimePatch?.ready) throw new Error("DD2 runtime patch não ficou pronto antes do início.");
  if (runtime?.targetAttributes?.["data-single-target-choice"] !== "true") {
    throw new Error("Runtime DD2 ativo não recebeu data-single-target-choice=true.");
  }
  if (runtime.capacityDisplay !== "none") throw new Error("Badge de capacidade permanece visível no runtime DD2 ativo.");
} finally {
  await browser.close();
}

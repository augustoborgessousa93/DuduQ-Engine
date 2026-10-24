import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL("C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const origin = process.env.DUDUQ_QA_ORIGIN || "http://127.0.0.1:4177";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const failures = [];
page.on("response", response => { if (response.status() >= 400) failures.push({ status: response.status(), url: response.url() }); });
page.on("pageerror", error => failures.push({ error: error.message }));
const itemId = "Y3M05-Q006";
try {
  await page.goto(`${origin}/play/drag-drop/?duduqModule=Y3M05&duduqItem=${itemId}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.DuduQProductionQuestionBootstrap?.ready), null, { timeout: 10000 });
  const context = await page.evaluate(() => window.DuduQProductionQuestionBootstrap.ready);
  assert.equal(context.item.item_id, itemId);
  assert.equal(context.grouping.items.length, 4);
  assert(context.grouping.items.every(item => item.modality === "text"));
  const visibleItems = await page.locator(".dnd-image-card-row > .dnd-option-image-card").evaluateAll(cards => cards.map(card => ({
    id: card.dataset.itemId,
    text: card.querySelector(".dnd-option-image-card__semantic-text")?.textContent.trim(),
    box: card.getBoundingClientRect().toJSON(),
    imageSrc: card.querySelector(".dnd-option-image-card__artwork")?.getAttribute("src") || null
  })));
  assert.equal(visibleItems.length, 4);
  assert(visibleItems.every(item => item.text && item.box.width > 0 && item.box.height > 0 && !String(item.imageSrc).includes("undefined")));
  await page.waitForFunction(() => document.querySelector(".duduq-canonical-question-hud")?.dataset.duduqInteractionState === "READY" || document.querySelector("#game")?.dataset.duduqInteractionState === "READY", null, { timeout: 35000 });
  const wrongGroup = context.grouping.items.find(item => item.groupId !== context.grouping.items[0].groupId)?.groupId;
  assert(wrongGroup);
  const drag = async (id, groupId) => {
    const source = page.locator(`.dnd-image-card-row > .dnd-option-image-card[data-item-id="${id}"]`);
    const target = page.locator(`[data-drop-zone-content="${groupId}"]`);
    const a = await source.boundingBox(), b = await target.boundingBox();
    assert(a && b);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
  };
  for (const [index, item] of context.grouping.items.entries()) await drag(item.id, index === 0 ? wrongGroup : item.groupId);
  const confirm = page.locator(".dnd-confirm-action");
  await confirm.waitFor({ state: "visible", timeout: 10000 });
  await confirm.click();
  const feedback = page.locator(".feedback-ribbon:not([hidden])");
  await feedback.waitFor({ state: "visible", timeout: 15000 });
  const wrong = await feedback.evaluate(node => ({ state: node.dataset.feedback, title: node.querySelector("[data-slot='feedback-title']")?.textContent.trim(), subtitle: node.querySelector("[data-slot='feedback-detail']")?.textContent.trim(), action: node.querySelector(".feedback-action")?.textContent.trim() }));
  assert.equal(wrong.state, "incorrect");
  assert(wrong.title && wrong.subtitle && wrong.action);
  const action = feedback.locator(".feedback-action");
  await page.waitForFunction(() => { const button = document.querySelector(".feedback-ribbon:not([hidden]) .feedback-action"); return button && !button.disabled && button.getAttribute("aria-disabled") !== "true"; }, null, { timeout: 30000 });
  await action.click();
  const retryItem = context.grouping.items[0];
  await page.waitForFunction(() => document.querySelectorAll(".dnd-image-card-row > .dnd-option-image-card").length === 1 && document.querySelector(".feedback-ribbon")?.hidden, null, { timeout: 10000 });
  await page.waitForTimeout(1000);
  await drag(retryItem.id, retryItem.groupId);
  await page.waitForFunction(() => !document.querySelector(".dnd-confirm-action-motion")?.hidden, null, { timeout: 5000 }).catch(async error => {
    const state = await page.evaluate(() => ({ game: window.DuduQDragDropGame?.getState(), rows: document.querySelectorAll(".dnd-image-card-row > .dnd-option-image-card").length, placed: [...document.querySelectorAll("[data-drop-zone-content]")].map(zone => ({ id: zone.dataset.dropZoneContent, count: zone.children.length })), rootState: document.querySelector("#game")?.dataset.duduqInteractionState }));
    throw new Error(`GROUPING_RETRY_DID_NOT_ENABLE_CONFIRM:${JSON.stringify(state)}:${error.message}`);
  });
  await confirm.click();
  await feedback.waitFor({ state: "visible", timeout: 15000 });
  const correct = await feedback.evaluate(node => ({ state: node.dataset.feedback, title: node.querySelector("[data-slot='feedback-title']")?.textContent.trim(), subtitle: node.querySelector("[data-slot='feedback-detail']")?.textContent.trim(), action: node.querySelector(".feedback-action")?.textContent.trim() }));
  assert.equal(correct.state, "correct");
  assert(correct.title && correct.subtitle && correct.action);
  await page.waitForFunction(() => { const button = document.querySelector(".feedback-ribbon:not([hidden]) .feedback-action"); return button && !button.disabled && button.getAttribute("aria-disabled") !== "true"; }, null, { timeout: 30000 });
  await feedback.locator(".feedback-action").click();
  await page.waitForFunction(expected => new URL(location.href).searchParams.get("duduqItem") === expected, "Y3M05-Q007", { timeout: 15000 });
  assert.equal(failures.filter(item => item.status === 404 && item.url.includes("/play/drag-drop/undefined")).length, 0);
  console.log(JSON.stringify({ status: "PASS", itemId, visibleTextCards: visibleItems.length, wrongFeedback: wrong, retry: "PASS", correctFeedback: correct, continueAdvance: "PASS", request404: failures.filter(item => item.status >= 400), runtimeErrors: failures.filter(item => item.error) }, null, 2));
} finally { await browser.close(); }

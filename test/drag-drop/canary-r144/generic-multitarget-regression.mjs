import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/test/drag-drop/index.html`;
function assert(condition, message) { if (!condition) throw new Error(message); }

async function waitFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe DD2 genérico não apareceu.");
}

async function waitEnabled(locator, timeout = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isEnabled().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Item Drag & Drop genérico permaneceu desabilitado.");
}

async function drag(page, source, target) {
  await waitEnabled(source);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, "Bounding box indisponível no smoke multi-target.");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.65, { steps: 16 });
  await page.mouse.up();
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release === "2.0.23", null, { timeout: 20_000 });
  const frame = await waitFrame(page);
  const targets = frame.locator(".duduq-dd2-target");
  await targets.first().waitFor({ state: "visible", timeout: 35_000 });

  assert(await targets.count() === 3, `Multi-target deveria renderizar 3 destinos; encontrado ${await targets.count()}.`);
  assert(await frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').count() === 0, "SINGLE_TARGET_CHOICE vazou para cenário multi-target.");
  assert(await frame.locator(".duduq-dd2-bank .duduq-dd2-item").count() === 3, "Banco multi-target deveria conter 3 itens.");

  const confirm = frame.locator(".duduq-dd2-confirm");
  await confirm.waitFor({ state: "visible", timeout: 5_000 });
  assert(await confirm.isDisabled(), "Multi-target deveria iniciar com CONFIRMAR desabilitado.");

  const pairs = [
    ["audio-1", "scene-selfintro"],
    ["audio-2", "scene-goodbye"],
    ["audio-3", "scene-afternoon"]
  ];

  for (let index = 0; index < pairs.length; index += 1) {
    const [itemId, targetId] = pairs[index];
    const source = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();
    const target = frame.locator(`.duduq-dd2-target[data-dd2-target-id="${targetId}"]`).first();
    await source.waitFor({ state: "visible", timeout: 6_000 });
    await target.waitFor({ state: "visible", timeout: 6_000 });
    await drag(page, source, target);
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).waitFor({ state: "visible", timeout: 3_000 });
    if (index < pairs.length - 1) assert(await confirm.isDisabled(), `CONFIRMAR habilitou cedo demais após ${index + 1}/3 associações.`);
  }

  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou após completar as 3 associações.");
  await confirm.click();
  await frame.locator('.duduq-engine-feedback[data-state="success"] .duduq-engine-feedback-card').waitFor({ state: "visible", timeout: 3_000 });

  const fatal = errors.filter((message) => /error|erro|failed|falha/i.test(message));
  assert(fatal.length === 0, `Erros de browser no multi-target R144: ${fatal.join(" | ")}`);
  console.log("PASS — Canary R144 generic multi-target: 3 destinos + drag real + confirm + success; sem vazamento SINGLE_TARGET_CHOICE");
  await context.close();
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/test/drag-drop/single-target-choice-2.0.24/generic-multitarget-homolog.html`;
const RESULTS = "test-results/single-target-choice-2.0.24";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) { if (!condition) throw new Error(message); }

async function waitFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe multi-target 2.0.24 não apareceu.");
}

async function waitEnabled(locator, timeout = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isEnabled().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Item multi-target permaneceu desabilitado.");
}

async function waitFinalInteractive(page, locator, timeout = 12_000) {
  const started = Date.now();
  let stableSince = null;
  while (Date.now() - started < timeout) {
    const gate = await page.evaluate(() => document.documentElement.getAttribute("data-duduq-initial-speech-gate"));
    const enabled = await locator.isEnabled().catch(() => false);
    if (gate === null && enabled) {
      if (stableSince === null) stableSince = Date.now();
      if (Date.now() - stableSince >= 400) return;
    } else {
      stableSince = null;
    }
    await page.waitForTimeout(50);
  }
  throw new Error("Multi-target não atingiu estado interativo final estável.");
}

function bankItemByLabel(frame, label) {
  return frame.locator(`.duduq-dd2-bank .duduq-dd2-item[aria-label^="${label}."]`).first();
}
function targetItemByLabel(target, label) {
  return target.locator(`.duduq-dd2-item[aria-label^="${label}."]`).first();
}

async function drag(page, source, target) {
  await waitEnabled(source);
  const zone = target.locator(".duduq-dd2-zone").first();
  await zone.waitFor({ state: "visible", timeout: 5_000 });
  const sourceBox = await source.boundingBox();
  const zoneBox = await zone.boundingBox();
  assert(sourceBox && zoneBox, "Bounding box indisponível no multi-target 2.0.24.");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(zoneBox.x + zoneBox.width / 2, zoneBox.y + zoneBox.height / 2, { steps: 18 });
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
  await page.waitForFunction(() => window.DuduQDD24R143VisualRuntimePatch?.ready === true, null, { timeout: 20_000 });
  await page.waitForFunction(() => window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release === "2.0.24", null, { timeout: 20_000 });

  const frame = await waitFrame(page);
  const targets = frame.locator(".duduq-dd2-target");
  await targets.first().waitFor({ state: "visible", timeout: 35_000 });

  assert(await targets.count() === 3, `Multi-target deveria renderizar 3 destinos; encontrado ${await targets.count()}.`);
  assert(await frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').count() === 0, "SINGLE_TARGET_CHOICE vazou para multi-target.");
  assert(await frame.locator(".duduq-dd2-bank .duduq-dd2-item").count() === 3, "Banco multi-target deveria conter 3 itens.");

  // The new R143 visual CSS is present in the iframe, but every selector is gated
  // by a single-target DOM marker. Generic dimensions must therefore remain base-owned.
  assert(await frame.locator("#duduq-dd24-r143-single-target-style").count() === 1, "Style 2.0.24 não foi injetado.");
  const firstTargetStyle = await targets.first().evaluate((node) => ({
    singleTarget: node.getAttribute("data-single-target-choice"),
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height
  }));
  assert(firstTargetStyle.singleTarget === null, "Marcador single-target apareceu em destino genérico.");

  const confirm = frame.locator(".duduq-dd2-confirm");
  assert(await confirm.count() === 0, "Multi-target divergiu do baseline: CONFIRMAR apareceu antes das associações.");

  const pairs = [
    ["1", "scene-selfintro"],
    ["2", "scene-goodbye"],
    ["3", "scene-afternoon"]
  ];
  const firstSource = bankItemByLabel(frame, "1");
  await firstSource.waitFor({ state: "visible", timeout: 6_000 });
  await waitFinalInteractive(page, firstSource);

  for (let index = 0; index < pairs.length; index += 1) {
    const [label, targetId] = pairs[index];
    const source = bankItemByLabel(frame, label);
    const target = frame.locator(`.duduq-dd2-target[data-dd2-target-id="${targetId}"]`).first();
    await source.waitFor({ state: "visible", timeout: 6_000 });
    await target.waitFor({ state: "visible", timeout: 6_000 });
    await drag(page, source, target);
    await targetItemByLabel(target, label).waitFor({ state: "visible", timeout: 3_000 });
    if (index < pairs.length - 1) {
      assert(await confirm.count() === 0, `CONFIRMAR apareceu cedo demais após ${index + 1}/3 associações.`);
    }
  }

  await confirm.waitFor({ state: "visible", timeout: 5_000 });
  assert(!(await confirm.isDisabled()), "CONFIRMAR não habilitou após 3 associações.");
  await confirm.click();
  await frame.locator('.duduq-engine-feedback[data-state="success"] .duduq-engine-feedback-card').waitFor({ state: "visible", timeout: 3_000 });

  const fatal = errors.filter((message) => /error|erro|failed|falha/i.test(message));
  assert(fatal.length === 0, `Erros multi-target 2.0.24: ${fatal.join(" | ")}`);
  await page.screenshot({ path: `${RESULTS}/generic-multitarget-2.0.24-success.png`, fullPage: false });
  console.log(`PASS — DD 2.0.24 generic multi-target parity; base target ${Math.round(firstTargetStyle.width)}x${Math.round(firstTargetStyle.height)}, sem vazamento SINGLE_TARGET_CHOICE/R143 visual`);
  await context.close();
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;

async function openM03(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => window.DuduQDD23SingleTargetRuntimePatch?.ready === true, null, { timeout: 20_000 });
  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}
  const mechanicFrame = await waitForMechanicFrame(page);
  await mechanicFrame.locator('.duduq-dd2-target[data-single-target-choice="true"]').waitFor({ state: "visible", timeout: 35_000 });
  return { context, page, frame: mechanicFrame };
}

async function waitForMechanicFrame(page) {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item !== page.mainFrame() && item.url() === "about:srcdoc");
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("iframe about:srcdoc do Drag & Drop não apareceu.");
}

function choice(frame, letter) {
  return frame.locator(".duduq-dd2-bank .duduq-dd2-item").filter({ hasText: `🔊 ${letter}` }).first();
}

async function snapshot(frame) {
  return frame.evaluate(() => {
    const target = document.querySelector('.duduq-dd2-target[data-single-target-choice="true"]');
    const confirm = document.querySelector(".duduq-dd2-confirm");
    const bank = Array.from(document.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item")).map((el) => ({
      text: el.innerText,
      aria: el.getAttribute("aria-label"),
      placed: el.getAttribute("data-placed")
    }));
    const placed = Array.from(target?.querySelectorAll(".duduq-dd2-item") || []).map((el) => ({
      text: el.innerText,
      aria: el.getAttribute("aria-label"),
      placed: el.getAttribute("data-placed"),
      wrong: el.getAttribute("data-wrong")
    }));
    return {
      targetFilled: target?.getAttribute("data-filled") || null,
      targetActive: target?.getAttribute("data-active") || null,
      targetWrong: target?.getAttribute("data-wrong") || null,
      confirmDisabled: confirm?.disabled ?? null,
      bank,
      placed,
      debugEvents: window.__DUDUQ_DD23_DRAG_EVENTS__ || []
    };
  });
}

const browser = await chromium.launch({ headless: true });
try {
  // 1) Diagnóstico do gesto real de mouse/pointer usado pelo E2E.
  {
    const { context, page, frame } = await openM03(browser);
    await frame.evaluate(() => {
      window.__DUDUQ_DD23_DRAG_EVENTS__ = [];
      const kinds = ["pointerdown", "pointermove", "pointerup", "pointercancel", "mousedown", "mousemove", "mouseup", "click"];
      for (const type of kinds) {
        document.addEventListener(type, (event) => {
          const target = event.target instanceof Element ? event.target : null;
          const item = target?.closest?.(".duduq-dd2-item") || null;
          const drop = target?.closest?.("[data-dd2-target-id]") || null;
          window.__DUDUQ_DD23_DRAG_EVENTS__.push({
            type,
            pointerId: event.pointerId ?? null,
            pointerType: event.pointerType ?? null,
            button: event.button ?? null,
            buttons: event.buttons ?? null,
            clientX: Math.round(event.clientX ?? 0),
            clientY: Math.round(event.clientY ?? 0),
            targetClass: target?.className || target?.tagName || null,
            itemText: item?.innerText || null,
            dropId: drop?.getAttribute?.("data-dd2-target-id") || null
          });
        }, true);
      }
    });

    const itemA = choice(frame, "A");
    const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]');
    const sourceBox = await itemA.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) throw new Error("Não foi possível medir A/target no diagnóstico de drag.");

    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height * 0.72;
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 18 });
    await page.mouse.up();
    await page.waitForTimeout(350);

    const state = await snapshot(frame);
    const localHit = await frame.evaluate(({ x, y }) => {
      const iframe = window.frameElement;
      void iframe;
      const element = document.elementFromPoint(x, y);
      return {
        tag: element?.tagName || null,
        className: element?.className || null,
        dropId: element?.closest?.("[data-dd2-target-id]")?.getAttribute("data-dd2-target-id") || null
      };
    }, {
      // Playwright bounding boxes are main-frame coordinates. Subtract the iframe offset for frame-local elementFromPoint diagnostics.
      x: endX - (await page.locator('iframe[title="DuduQ — Drag & Drop"]').boundingBox()).x,
      y: endY - (await page.locator('iframe[title="DuduQ — Drag & Drop"]').boundingBox()).y
    });

    console.log("=== DD2 DRAG DIAGNOSTIC ===");
    console.log(JSON.stringify({ sourceBox, targetBox, endX, endY, localHit, state }, null, 2));
    await context.close();
  }

  // 2) Controle positivo: toque/clique precisa colocar a alternativa usando o mesmo place().
  {
    const { context, frame } = await openM03(browser);
    await choice(frame, "A").click();
    await frame.waitForTimeout(250);
    const state = await snapshot(frame);
    console.log("=== DD2 TAP CONTROL ===");
    console.log(JSON.stringify(state, null, 2));
    if (state.targetFilled !== "true" || state.placed.length !== 1 || state.confirmDisabled !== false) {
      throw new Error("Controle por toque falhou: o problema não está restrito ao gesto de arraste.");
    }
    await context.close();
  }
} finally {
  await browser.close();
}

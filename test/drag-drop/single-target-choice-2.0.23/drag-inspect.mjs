import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;
const POINTER_VERSION = "2.0.23-native-pointer-b";

function itemIdForLetter(letter) {
  return `opt-${letter.toUpperCase().charCodeAt(0) - 64}`;
}

async function waitForFinalInteractive(page, frame, locator, timeout = 10_000) {
  const startedAt = Date.now();
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"),
    null,
    { timeout }
  );
  let stableSince = null;
  while (Date.now() - startedAt < timeout) {
    const enabled = await locator.isEnabled().catch(() => false);
    const arenaDisabled = await frame.evaluate(
      () => document.querySelector(".duduq-dd2-arena")?.getAttribute("data-disabled") === "true"
    ).catch(() => true);
    if (enabled && !arenaDisabled) {
      if (stableSince === null) stableSince = Date.now();
      if (Date.now() - stableSince >= 350) return Date.now() - startedAt;
    } else {
      stableSince = null;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`DD2 não atingiu estado interativo final em ${timeout}ms.`);
}

async function openM03(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(
    () => window.DuduQDD23SingleTargetRuntimePatch?.ready === true,
    null,
    { timeout: 20_000 }
  );
  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}
  const mechanicFrame = await waitForMechanicFrame(page);
  await mechanicFrame.locator('.duduq-dd2-target[data-single-target-choice="true"]').waitFor({ state: "visible", timeout: 35_000 });
  await mechanicFrame.waitForFunction(
    (version) => window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__?.version === version && window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__?.attached === true,
    POINTER_VERSION,
    { timeout: 10_000 }
  );

  const firstChoice = mechanicFrame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await firstChoice.waitFor({ state: "visible", timeout: 5_000 });
  const interactiveWaitMs = await waitForFinalInteractive(page, mechanicFrame, firstChoice);

  const pointerRuntime = await mechanicFrame.evaluate(() => window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__ || null);
  if (!pointerRuntime?.attached) {
    throw new Error("Runtime DD2 renderizado não anexou o owner nativo de pointer.");
  }
  if (pointerRuntime.version !== POINTER_VERSION) {
    throw new Error(`Runtime DD2 contém pointer owner inesperado: ${pointerRuntime.version}; esperado ${POINTER_VERSION}.`);
  }

  return { context, page, frame: mechanicFrame, pointerRuntime, interactiveWaitMs };
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
  return frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${itemIdForLetter(letter)}"]`).first();
}

async function snapshot(frame) {
  return frame.evaluate(() => {
    const target = document.querySelector('.duduq-dd2-target[data-single-target-choice="true"]');
    const confirm = document.querySelector(".duduq-dd2-confirm");
    const bank = Array.from(document.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item")).map((el) => ({
      text: el.innerText,
      itemId: el.getAttribute("data-dd2-item-id"),
      aria: el.getAttribute("aria-label"),
      placed: el.getAttribute("data-placed"),
      disabled: el.disabled
    }));
    const placed = Array.from(target?.querySelectorAll(".duduq-dd2-item") || []).map((el) => ({
      text: el.innerText,
      itemId: el.getAttribute("data-dd2-item-id"),
      aria: el.getAttribute("aria-label"),
      placed: el.getAttribute("data-placed"),
      wrong: el.getAttribute("data-wrong")
    }));
    return {
      targetFilled: target?.getAttribute("data-filled") || null,
      targetActive: target?.getAttribute("data-active") || null,
      targetWrong: target?.getAttribute("data-wrong") || null,
      arenaDisabled: document.querySelector(".duduq-dd2-arena")?.getAttribute("data-disabled") || null,
      confirmDisabled: confirm?.disabled ?? null,
      bank,
      placed,
      pointerRuntime: window.__DUDUQ_DD23_NATIVE_POINTER_RUNTIME__ || null,
      debugEvents: window.__DUDUQ_DD23_DRAG_EVENTS__ || []
    };
  });
}

function explainPointerFailure(state) {
  const diag = state.pointerRuntime;
  if (!diag?.attached) return "owner nativo de pointer não está anexado ao documento do iframe";
  if (state.arenaDisabled === "true") return "host ainda marcava a arena como disabled no início do gesto";
  if ((diag.pointerDown || 0) < 1) return "pointerdown DOM chegou, mas o listener nativo gated não iniciou o gesto";
  if ((diag.moves || 0) < 1) return "pointerdown iniciou, mas o owner nativo não recebeu movimento";
  if ((diag.pointerUps || 0) < 1) return "owner nativo recebeu movimento, mas não recebeu pointerup";
  if (!diag.targetResolved) return `pointerup executou, mas elementFromPoint não resolveu destino; hit=${diag.lastHitClass || "null"}`;
  if ((diag.placeCalls || 0) < 1) return `destino ${diag.targetResolved} foi resolvido, mas place() não foi chamado`;
  return `place() foi chamado ${diag.placeCalls}x para ${diag.lastItemId} -> ${diag.targetResolved}, porém o target permaneceu ${state.targetFilled}; afterPlaceFilled=${diag.afterPlaceFilled}`;
}

const browser = await chromium.launch({ headless: true });
try {
  // 1) Diagnóstico do gesto real de mouse/pointer usado pelo E2E.
  {
    const { context, page, frame, pointerRuntime, interactiveWaitMs } = await openM03(browser);
    console.log("=== DD2 NATIVE POINTER OWNER ===");
    console.log(JSON.stringify({ interactiveWaitMs, ...pointerRuntime }, null, 2));

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
            itemId: item?.getAttribute?.("data-dd2-item-id") || null,
            dropId: drop?.getAttribute?.("data-dd2-target-id") || null
          });
        }, true);
      }
    });

    const itemA = choice(frame, "A");
    const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]');

    await itemA.hover({ timeout: 8_000 });
    const sourceBox = await itemA.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) throw new Error("Não foi possível medir A/target no diagnóstico de drag.");

    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height * 0.72;
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 18 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const state = await snapshot(frame);
    const iframeBox = await page.locator('iframe[title="DuduQ — Drag & Drop"]').boundingBox();
    if (!iframeBox) throw new Error("Iframe não possui bounding box no diagnóstico.");
    const localHit = await frame.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return {
        tag: element?.tagName || null,
        className: element?.className || null,
        dropId: element?.closest?.("[data-dd2-target-id]")?.getAttribute("data-dd2-target-id") || null
      };
    }, { x: endX - iframeBox.x, y: endY - iframeBox.y });

    console.log("=== DD2 DRAG DIAGNOSTIC ===");
    console.log(JSON.stringify({ sourceBox, targetBox, endX, endY, localHit, state }, null, 2));
    if (state.debugEvents.length === 0) {
      throw new Error("Nenhum pointer/mouse event chegou ao iframe após hover actionável.");
    }
    if (state.targetFilled !== "true") {
      throw new Error(`Pointer drag não concluiu placement: ${explainPointerFailure(state)}.`);
    }
    if (state.pointerRuntime?.placeCalls < 1 || state.pointerRuntime?.targetResolved !== "stimulus-target") {
      throw new Error("Drag terminou preenchido, mas o caminho single-owner nativo até place() não foi comprovado.");
    }
    if ((state.debugEvents || []).some((event) => event.type === "click") && state.pointerRuntime?.placeCalls < 1) {
      throw new Error("Drag foi preenchido por click/tap residual, não pelo owner nativo de pointer.");
    }
    await context.close();
  }

  // 2) Controle positivo: toque/clique continua colocando alternativa pelo mesmo place() canônico.
  {
    const { context, frame } = await openM03(browser);
    const itemA = choice(frame, "A");
    await itemA.click();
    await frame.waitForTimeout(250);
    const state = await snapshot(frame);
    console.log("=== DD2 TAP CONTROL ===");
    console.log(JSON.stringify(state, null, 2));
    if (state.targetFilled !== "true" || state.placed.length !== 1 || state.confirmDisabled !== false) {
      throw new Error("Controle por toque falhou: drag e tap não convergem para o comportamento single-target esperado.");
    }
    await context.close();
  }
} finally {
  await browser.close();
}

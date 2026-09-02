import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE}/test/drag-drop/visual-refinement-2.0.25-r1/index.html`;

const viewports = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function itemSelector(id) {
  return `.duduq-dd2-item[data-dd2-item-id="${id}"]`;
}

function zoneSelector(id) {
  return `.duduq-dd2-target[data-dd2-target-id="${id}"] .duduq-dd2-zone`;
}

async function waitMounted(page) {
  await page.waitForFunction(() => {
    const mechanic = window.dd225vrMechanic?.();
    const frame = document.querySelector("#mount iframe");
    const doc = frame?.contentDocument;
    return Boolean(
      mechanic?.version === "2.0.25" &&
      window.DD225VisualRefinementR1?.version === "2.0.25-visual-r1" &&
      doc?.querySelector('.duduq-dd2-root[data-dd225-visual-r1="true"]') &&
      doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item").length === 4
    );
  }, null, { timeout: 20_000 });
}

async function place(frame, itemId, targetId) {
  const item = frame.locator(itemSelector(itemId)).first();
  const zone = frame.locator(zoneSelector(targetId)).first();
  await item.dragTo(zone, { force: true });
  await frame.locator(`${zoneSelector(targetId)} ${itemSelector(itemId)}`).first().waitFor({ state: "visible", timeout: 3_000 });
}

async function state(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("#mount iframe");
    const doc = frame?.contentDocument;
    if (!doc) return null;
    const bank = doc.querySelector(".duduq-dd2-bank");
    const confirm = doc.querySelector(".duduq-dd2-confirm");
    const targets = [...doc.querySelectorAll(".duduq-dd2-target")];
    const zones = [...doc.querySelectorAll(".duduq-dd2-zone")];
    const placedImages = [...doc.querySelectorAll('.duduq-dd2-zone .duduq-dd2-item[data-has-media="true"][data-placed="true"] .duduq-dd2-item-media')];
    const removeButtons = [...doc.querySelectorAll(".duduq-dd225-vr-remove")];
    const visibleBank = bank ? getComputedStyle(bank).display !== "none" && bank.getBoundingClientRect().height > 1 : false;
    const root = doc.querySelector(".duduq-dd2-root");
    return {
      version: window.dd225vrMechanic?.()?.version || "",
      visualVersion: window.DD225VisualRefinementR1?.version || "",
      bankEmpty: bank?.getAttribute("data-empty") || "",
      bankVisible: visibleBank,
      bankHeight: bank?.getBoundingClientRect().height || 0,
      bankItemIds: [...doc.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id]")].map((node) => node.getAttribute("data-dd2-item-id")),
      confirmCount: confirm ? 1 : 0,
      confirmBottom: confirm?.getBoundingClientRect().bottom || 0,
      clientHeight: doc.documentElement.clientHeight,
      targetWidths: targets.map((node) => node.getBoundingClientRect().width),
      zoneFlexWrap: zones.map((node) => getComputedStyle(node).flexWrap),
      placedImageWidths: placedImages.map((node) => node.getBoundingClientRect().width),
      placedImageHeights: placedImages.map((node) => node.getBoundingClientRect().height),
      objectFits: placedImages.map((node) => getComputedStyle(node).objectFit),
      removeCount: removeButtons.length,
      overflowX: Math.max(0, doc.body.scrollWidth - doc.documentElement.clientWidth),
      rootOverflowX: root ? getComputedStyle(root).overflowX : "",
      feedback: doc.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "idle",
      results: window.__DD225VR_RESULTS__.slice(),
      completionCount: window.__DD225VR_COMPLETIONS__.length,
      errors: window.__DD225VR_ERRORS__.slice()
    };
  });
}

async function waitResult(page, correct, previousCount) {
  await page.waitForFunction(({ correct, previousCount }) => {
    const results = window.__DD225VR_RESULTS__ || [];
    return results.length > previousCount && results.at(-1)?.isCorrect === correct;
  }, { correct, previousCount }, { timeout: 6_000 });
}

async function remount(page, suffix) {
  await page.evaluate((suffix) => window.dd225vrMount(window.dd225vrPayload(`dd225-visual-${suffix}`)), suffix);
  await waitMounted(page);
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const pageErrors = [];
  const critical404 = [];

  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error?.message || error)));
  page.on("response", (response) => {
    if (response.status() !== 404) return;
    const url = response.url();
    if (url.includes("/engine/") || url.includes("/test/drag-drop/visual-refinement-2.0.25-r1/") || url.includes("Assets-DuduQ")) {
      critical404.push(url);
    }
  });

  try {
    const response = await page.goto(`${URL}?viewport=${viewport.name}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert(response?.ok(), `${viewport.name}: harness HTTP ${response?.status()}.`);
    await waitMounted(page);
    const frame = page.frameLocator("#mount iframe");

    const initial = await state(page);
    assert(initial.version === "2.0.25", `${viewport.name}: versão oficial divergente (${initial.version}).`);
    assert(initial.visualVersion === "2.0.25-visual-r1", `${viewport.name}: patch visual isolado não carregou.`);
    assert(initial.bankVisible, `${viewport.name}: banco deve aparecer enquanto há itens.`);
    assert(initial.bankItemIds.length === 4, `${viewport.name}: banco inicial deveria ter 4 itens.`);
    assert(initial.confirmCount === 0, `${viewport.name}: CONFIRMAR apareceu antes de todos os itens estarem posicionados.`);

    await place(frame, "ana", "greetings");
    await place(frame, "afternoon", "greetings");
    await place(frame, "bye", "farewells");
    await place(frame, "bye-2", "farewells");

    await page.waitForFunction(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      const bank = doc?.querySelector(".duduq-dd2-bank");
      return bank?.getAttribute("data-empty") === "true" && getComputedStyle(bank).display === "none" && Boolean(doc?.querySelector(".duduq-dd2-confirm"));
    }, null, { timeout: 4_000 });

    const completeLayout = await state(page);
    assert(!completeLayout.bankVisible && completeLayout.bankHeight === 0, `${viewport.name}: banco vazio ainda ocupa espaço.`);
    assert(completeLayout.confirmCount === 1, `${viewport.name}: CONFIRMAR não apareceu com todos os itens posicionados.`);
    assert(completeLayout.removeCount === 4, `${viewport.name}: × discreto não apareceu nos 4 itens posicionados.`);
    assert(completeLayout.zoneFlexWrap.every((value) => value === "nowrap"), `${viewport.name}: itens posicionados não permaneceram em linha horizontal.`);
    assert(completeLayout.targetWidths.every((value) => value >= 250), `${viewport.name}: destinos não aproveitaram a largura disponível (${completeLayout.targetWidths.join(",")}).`);
    assert(completeLayout.objectFits.length === 4 && completeLayout.objectFits.every((value) => value === "contain"), `${viewport.name}: object-fit contain não foi preservado.`);
    assert(completeLayout.placedImageWidths.every((value) => value >= 55), `${viewport.name}: imagens posicionadas ficaram pequenas demais (${completeLayout.placedImageWidths.join(",")}).`);
    assert(completeLayout.confirmBottom <= completeLayout.clientHeight + 3, `${viewport.name}: CONFIRMAR saiu da área visível (${completeLayout.confirmBottom}/${completeLayout.clientHeight}).`);
    assert(completeLayout.overflowX <= 4, `${viewport.name}: overflow horizontal ${completeLayout.overflowX}px.`);

    const removeAfternoon = frame.locator('.duduq-dd2-item-shell:has(.duduq-dd2-item[data-dd2-item-id="afternoon"]) .duduq-dd225-vr-remove').first();
    await removeAfternoon.click({ force: true });
    await page.waitForFunction(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      return Boolean(
        doc?.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="afternoon"]') &&
        !doc?.querySelector(".duduq-dd2-confirm") &&
        getComputedStyle(doc.querySelector(".duduq-dd2-bank")).display !== "none"
      );
    }, null, { timeout: 4_000 });

    const afterRemove = await state(page);
    assert(afterRemove.bankVisible, `${viewport.name}: banco não reapareceu após ×.`);
    assert(afterRemove.bankItemIds.includes("afternoon"), `${viewport.name}: × não devolveu o item ao banco.`);
    assert(afterRemove.confirmCount === 0, `${viewport.name}: CONFIRMAR permaneceu visível após remover item.`);

    await place(frame, "afternoon", "greetings");
    await frame.locator(".duduq-dd2-confirm").first().waitFor({ state: "visible", timeout: 3_000 });

    /* Retry/success regression: fresh mount, two swapped items, explicit Confirm. */
    await remount(page, `${viewport.name}-retry`);
    const retryFrame = page.frameLocator("#mount iframe");
    await place(retryFrame, "ana", "greetings");
    await place(retryFrame, "bye", "farewells");
    await place(retryFrame, "afternoon", "farewells");
    await place(retryFrame, "bye-2", "greetings");
    await retryFrame.locator(".duduq-dd2-confirm").first().click({ force: true });
    await waitResult(page, false, 0);
    await page.waitForFunction(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      const bankIds = [...(doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id]") || [])].map((node) => node.getAttribute("data-dd2-item-id"));
      return bankIds.includes("afternoon") && bankIds.includes("bye-2") && !doc?.querySelector(".duduq-dd2-confirm");
    }, null, { timeout: 4_000 });

    const retryState = await state(page);
    assert(retryState.bankVisible, `${viewport.name}: retry não reabriu o banco.`);
    assert(retryState.confirmCount === 0, `${viewport.name}: CONFIRMAR deveria sumir durante estado incompleto pós-retry.`);

    await place(retryFrame, "afternoon", "greetings");
    await place(retryFrame, "bye-2", "farewells");
    await retryFrame.locator(".duduq-dd2-confirm").first().click({ force: true });
    await waitResult(page, true, 1);
    await page.waitForFunction(() => (window.__DD225VR_COMPLETIONS__ || []).length === 1, null, { timeout: 6_000 });

    const finalState = await state(page);
    assert(finalState.results.length === 2 && finalState.results[0].isCorrect === false && finalState.results[1].isCorrect === true, `${viewport.name}: retry/success divergiu da lógica 2.0.25.`);
    assert(finalState.completionCount === 1, `${viewport.name}: success não concluiu o exemplo.`);
    assert(finalState.overflowX <= 4, `${viewport.name}: overflow após retry/success ${finalState.overflowX}px.`);
    assert(pageErrors.length === 0, `${viewport.name}: pageError: ${pageErrors.join(" | ")}`);
    assert(critical404.length === 0, `${viewport.name}: critical404: ${critical404.join(" | ")}`);

    console.log(`PASS ${viewport.name} wider-targets + empty-bank-hide + conditional-confirm + remove-x + retry/success`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) await runViewport(browser, viewport);
  console.log("PASS — Drag & Drop 2.0.25 Visual Refinement R1 isolated example");
} finally {
  await browser.close();
}

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

function isExampleMediaUrl(url) {
  const decoded = decodeURIComponent(url);
  return decoded.endsWith("/pet-cat-gato.png") ||
    decoded.endsWith("/pet-dog-cachorro.png") ||
    decoded.endsWith("/school-object-pencil-lapis.png") ||
    decoded.endsWith("/school-object-backpack-mochila.png");
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await item.dragTo(zone, { force: true });
    try {
      await frame.locator(`${zoneSelector(targetId)} ${itemSelector(itemId)}`).first().waitFor({ state: "visible", timeout: 1_500 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }
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
    const allItemImages = [...doc.querySelectorAll(".duduq-dd2-item-media")];
    const removeButtons = [...doc.querySelectorAll(".duduq-dd225-vr-remove")];
    const visibleBank = bank ? getComputedStyle(bank).display !== "none" && bank.getBoundingClientRect().height > 1 : false;
    const root = doc.querySelector(".duduq-dd2-root");
    const htmlOverflowX = Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth);
    const bodyOverflowX = Math.max(0, doc.body.scrollWidth - doc.body.clientWidth);
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
      brokenItemImages: allItemImages.filter((img) => !img.complete || img.naturalWidth < 1 || img.naturalHeight < 1).map((img) => img.currentSrc || img.src),
      removeCount: removeButtons.length,
      htmlOverflowX,
      bodyOverflowX,
      overflowX: Math.max(htmlOverflowX, bodyOverflowX),
      rootOverflowX: root ? getComputedStyle(root).overflowX : "",
      feedback: doc.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "idle",
      results: window.__DD225VR_RESULTS__.slice(),
      completionCount: window.__DD225VR_COMPLETIONS__.length,
      errors: window.__DD225VR_ERRORS__.slice()
    };
  });
}

async function sampleSuccessOverflow(page, durationMs = 1250, intervalMs = 25) {
  const started = Date.now();
  let maxHtml = 0;
  let maxBody = 0;
  let feedbackSeen = false;
  let feedbackReadable = true;
  let diagnostic = null;

  while (Date.now() - started <= durationMs) {
    const sample = await page.evaluate(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      if (!doc) return null;
      const htmlOverflow = Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth);
      const bodyOverflow = Math.max(0, doc.body.scrollWidth - doc.body.clientWidth);
      const feedback = doc.querySelector('.duduq-engine-feedback[data-state="success"]');
      const card = feedback?.querySelector(".duduq-engine-feedback-card");
      const copy = feedback?.querySelector(".duduq-engine-feedback-copy");
      const cardRect = card?.getBoundingClientRect();
      const copyRect = copy?.getBoundingClientRect();
      const bodyClient = doc.body.clientWidth;
      const offenders = [...doc.querySelectorAll("*")]
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            tag: node.tagName,
            cls: typeof node.className === "string" ? node.className.slice(0, 140) : "",
            left: Math.round(rect.left * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
            position: style.position,
            overflowX: style.overflowX,
            transform: style.transform === "none" ? "none" : style.transform.slice(0, 100)
          };
        })
        .filter((entry) => entry.width > 0 && (entry.right > bodyClient + 0.5 || entry.left < -0.5))
        .sort((a, b) => Math.max(b.right - bodyClient, -b.left) - Math.max(a.right - bodyClient, -a.left))
        .slice(0, 10);
      return {
        htmlOverflow,
        bodyOverflow,
        htmlScrollWidth: doc.documentElement.scrollWidth,
        htmlClientWidth: doc.documentElement.clientWidth,
        bodyScrollWidth: doc.body.scrollWidth,
        bodyClientWidth: bodyClient,
        feedbackSeen: Boolean(feedback),
        feedbackReadable: !feedback || Boolean(
          cardRect &&
          copyRect &&
          cardRect.left >= -0.5 &&
          cardRect.right <= doc.documentElement.clientWidth + 0.5 &&
          copyRect.width > 0 &&
          copyRect.height > 0
        ),
        offenders
      };
    });
    if (sample) {
      maxHtml = Math.max(maxHtml, sample.htmlOverflow);
      if (sample.bodyOverflow > maxBody) diagnostic = sample;
      maxBody = Math.max(maxBody, sample.bodyOverflow);
      feedbackSeen = feedbackSeen || sample.feedbackSeen;
      feedbackReadable = feedbackReadable && sample.feedbackReadable;
    }
    await page.waitForTimeout(intervalMs);
  }

  const after = await page.evaluate(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    if (!doc) return { htmlOverflow: 999, bodyOverflow: 999 };
    return {
      htmlOverflow: Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth),
      bodyOverflow: Math.max(0, doc.body.scrollWidth - doc.body.clientWidth)
    };
  });

  return {
    maxHtml,
    maxBody,
    afterHtml: after.htmlOverflow,
    afterBody: after.bodyOverflow,
    feedbackSeen,
    feedbackReadable,
    diagnostic
  };
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
    if (url.includes("/engine/") || url.includes("/test/drag-drop/visual-refinement-2.0.25-r1/") || isExampleMediaUrl(url)) {
      critical404.push(url);
    }
  });

  try {
    const response = await page.goto(`${URL}?viewport=${viewport.name}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert(response?.ok(), `${viewport.name}: harness HTTP ${response?.status()}.`);
    await waitMounted(page);
    const frame = page.frameLocator("#mount iframe");

    await page.waitForFunction(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      const images = [...(doc?.querySelectorAll(".duduq-dd2-item-media") || [])];
      return images.length === 4 && images.every((img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    }, null, { timeout: 20_000 });

    const initial = await state(page);
    assert(initial.version === "2.0.25", `${viewport.name}: versão oficial divergente (${initial.version}).`);
    assert(initial.visualVersion === "2.0.25-visual-r1", `${viewport.name}: patch visual isolado não carregou.`);
    assert(initial.bankVisible, `${viewport.name}: banco deve aparecer enquanto há itens.`);
    assert(initial.bankItemIds.length === 4, `${viewport.name}: banco inicial deveria ter 4 itens.`);
    assert(initial.confirmCount === 0, `${viewport.name}: CONFIRMAR apareceu antes de todos os itens estarem posicionados.`);
    assert(initial.brokenItemImages.length === 0, `${viewport.name}: mídia do exemplo não carregou: ${initial.brokenItemImages.join(" | ")}`);

    await place(frame, "cat", "pets");
    await place(frame, "dog", "pets");
    await place(frame, "pencil", "school");
    await place(frame, "backpack", "school");

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
    assert(completeLayout.brokenItemImages.length === 0, `${viewport.name}: imagem quebrou após posicionamento.`);
    assert(completeLayout.confirmBottom <= completeLayout.clientHeight + 3, `${viewport.name}: CONFIRMAR saiu da área visível (${completeLayout.confirmBottom}/${completeLayout.clientHeight}).`);
    assert(completeLayout.htmlOverflowX === 0 && completeLayout.bodyOverflowX === 0, `${viewport.name}: overflow antes do feedback html=${completeLayout.htmlOverflowX}px body=${completeLayout.bodyOverflowX}px.`);

    const removeDog = frame.locator('.duduq-dd2-item-shell:has(.duduq-dd2-item[data-dd2-item-id="dog"]) .duduq-dd225-vr-remove').first();
    await removeDog.click({ force: true });
    await page.waitForFunction(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      return Boolean(
        doc?.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="dog"]') &&
        !doc?.querySelector(".duduq-dd2-confirm") &&
        getComputedStyle(doc.querySelector(".duduq-dd2-bank")).display !== "none"
      );
    }, null, { timeout: 4_000 });

    const afterRemove = await state(page);
    assert(afterRemove.bankVisible, `${viewport.name}: banco não reapareceu após ×.`);
    assert(afterRemove.bankItemIds.includes("dog"), `${viewport.name}: × não devolveu o item ao banco.`);
    assert(afterRemove.confirmCount === 0, `${viewport.name}: CONFIRMAR permaneceu visível após remover item.`);

    await place(frame, "dog", "pets");
    await frame.locator(".duduq-dd2-confirm").first().waitFor({ state: "visible", timeout: 3_000 });

    /* Retry/success regression: fresh mount, two correct and two swapped. */
    await remount(page, `${viewport.name}-retry`);
    const retryFrame = page.frameLocator("#mount iframe");
    await place(retryFrame, "cat", "pets");
    await place(retryFrame, "pencil", "school");
    await place(retryFrame, "dog", "school");
    await place(retryFrame, "backpack", "pets");
    await retryFrame.locator(".duduq-dd2-confirm").first().click({ force: true });
    await waitResult(page, false, 0);
    await page.waitForFunction(() => {
      const doc = document.querySelector("#mount iframe")?.contentDocument;
      const bankIds = [...(doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id]") || [])].map((node) => node.getAttribute("data-dd2-item-id"));
      return bankIds.includes("dog") && bankIds.includes("backpack") && !doc?.querySelector(".duduq-dd2-confirm");
    }, null, { timeout: 5_000 });

    const retryState = await state(page);
    assert(retryState.bankVisible, `${viewport.name}: retry não reabriu o banco.`);
    assert(retryState.confirmCount === 0, `${viewport.name}: CONFIRMAR deveria sumir durante estado incompleto pós-retry.`);

    await place(retryFrame, "dog", "pets");
    await place(retryFrame, "backpack", "school");
    await retryFrame.locator(".duduq-dd2-confirm").first().click({ force: true });
    await waitResult(page, true, 1);

    const successOverflow = await sampleSuccessOverflow(page);
    await page.waitForFunction(() => (window.__DD225VR_COMPLETIONS__ || []).length === 1, null, { timeout: 6_000 });

    const finalState = await state(page);
    assert(successOverflow.maxHtml === 0, `${viewport.name}: documentElement gerou ${successOverflow.maxHtml}px durante SUCCESS.`);
    assert(successOverflow.maxBody === 0, `${viewport.name}: body gerou ${successOverflow.maxBody}px durante SUCCESS. DIAG=${JSON.stringify(successOverflow.diagnostic)}`);
    assert(successOverflow.afterHtml === 0 && successOverflow.afterBody === 0, `${viewport.name}: overflow após animação html=${successOverflow.afterHtml}px body=${successOverflow.afterBody}px.`);
    assert(successOverflow.feedbackReadable, `${viewport.name}: feedback SUCCESS saiu da largura útil.`);
    assert(finalState.results.length === 2 && finalState.results[0].isCorrect === false && finalState.results[1].isCorrect === true, `${viewport.name}: retry/success divergiu da lógica 2.0.25.`);
    assert(finalState.completionCount === 1, `${viewport.name}: success não concluiu o exemplo.`);
    assert(finalState.htmlOverflowX === 0 && finalState.bodyOverflowX === 0, `${viewport.name}: overflow final html=${finalState.htmlOverflowX}px body=${finalState.bodyOverflowX}px.`);
    assert(pageErrors.length === 0, `${viewport.name}: pageError: ${pageErrors.join(" | ")}`);
    assert(critical404.length === 0, `${viewport.name}: critical404 do escopo: ${critical404.join(" | ")}`);

    console.log(`PASS ${viewport.name} overflow=0px wider-targets + empty-bank-hide + conditional-confirm + remove-x + media + retry/success`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) await runViewport(browser, viewport);
  console.log("PASS — Drag & Drop 2.0.25 Visual Refinement R1 isolated example — 3/3 — overflow=0px");
} finally {
  await browser.close();
}
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE}/test/drag-drop/candidate-2.0.26/index.html`;
const viewports = [
  { name:"desktop-1366x768", width:1366, height:768 },
  { name:"tablet-768x1024", width:768, height:1024 },
  { name:"mobile-390x844", width:390, height:844 }
];

function assert(ok, message) { if (!ok) throw new Error(message); }
function item(id) { return `.duduq-dd2-item[data-dd2-item-id="${id}"]`; }
function zone(id) { return `.duduq-dd2-target[data-dd2-target-id="${id}"] .duduq-dd2-zone`; }

async function waitMounted(page) {
  await page.waitForFunction(() => {
    const frame = document.querySelector("#mount iframe");
    const doc = frame?.contentDocument;
    return window.__DD226_MECHANIC_VERSION__ === "2.0.26" &&
      doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id]").length === 4;
  }, null, { timeout:20_000 });
}

async function place(frame, itemId, targetId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await frame.locator(item(itemId)).first().dragTo(frame.locator(zone(targetId)).first(), { force:true });
    try {
      await frame.locator(`${zone(targetId)} ${item(itemId)}`).first().waitFor({ state:"visible", timeout:1400 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 90));
    }
  }
}

async function metrics(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("#mount iframe");
    const doc = frame?.contentDocument;
    if (!doc) return null;
    const rects = (selector) => [...doc.querySelectorAll(selector)].map(node => {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      return { width:r.width, height:r.height, top:r.top, right:r.right, bottom:r.bottom, left:r.left, className:node.className || "", display:s.display };
    });
    const bank = doc.querySelector(".duduq-dd2-bank[data-dd2-bank]");
    const confirm = doc.querySelector(".duduq-dd2-confirm");
    const targets = rects('.duduq-dd2-target');
    const maxTargetBottom = targets.reduce((max, entry) => Math.max(max, entry.bottom), 0);
    return {
      bankCards: rects('.duduq-dd2-bank .duduq-dd2-item[data-has-media="true"]'),
      placedCards: rects('.duduq-dd2-zone .duduq-dd2-item[data-has-media="true"]'),
      placedMedia: rects('.duduq-dd2-zone .duduq-dd2-item-media'),
      targets,
      zones: rects('.duduq-dd2-zone'),
      removeButtons: rects('.duduq-dd226-remove'),
      bankDisplay: bank ? getComputedStyle(bank).display : "none",
      bankHeight: bank?.getBoundingClientRect().height || 0,
      confirm: Boolean(confirm),
      confirmTop: confirm?.getBoundingClientRect().top || 0,
      confirmBottom: confirm?.getBoundingClientRect().bottom || 0,
      confirmGap: confirm ? confirm.getBoundingClientRect().top - maxTargetBottom : 0,
      overflow: Math.max(
        0,
        doc.documentElement.scrollWidth - doc.documentElement.clientWidth,
        doc.body.scrollWidth - doc.body.clientWidth
      ),
      clientHeight: doc.documentElement.clientHeight
    };
  });
}

const avg = (values) => values.reduce((a,b) => a+b,0) / Math.max(1, values.length);
const browser = await chromium.launch({ headless:true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport:{ width:viewport.width, height:viewport.height } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error?.message || error)));
    const response = await page.goto(`${URL}?v=${viewport.name}&r=complete-review-r6`, { waitUntil:"domcontentloaded", timeout:30_000 });
    assert(response?.ok(), `${viewport.name}: HTTP ${response?.status()}`);
    await waitMounted(page);
    const frame = page.frameLocator("#mount iframe");

    const initial = await metrics(page);
    assert(initial.bankCards.length === 4, `${viewport.name}: banco inicial != 4`);
    assert(initial.overflow === 0, `${viewport.name}: overflow inicial ${initial.overflow}px`);

    await place(frame, "cat", "pets");
    await place(frame, "dog", "pets");
    const partial = await metrics(page);
    assert(partial.bankCards.length === 2, `${viewport.name}: banco parcial != 2`);
    assert(partial.placedCards.length === 2, `${viewport.name}: posicionados parciais != 2`);
    assert(partial.removeButtons.length === 2, `${viewport.name}: × parcial ${partial.removeButtons.length}/2`);

    const initialW = avg(initial.bankCards.map(card => card.width));
    const partialBankW = avg(partial.bankCards.map(card => card.width));
    const partialPlacedW = avg(partial.placedCards.map(card => card.width));
    const partialPlacedH = avg(partial.placedCards.map(card => card.height));
    const partialMediaH = avg(partial.placedMedia.map(media => media.height));
    const partialTargetH = avg(partial.targets.map(target => target.height));
    assert(Math.abs(initialW - partialBankW) <= 12, `${viewport.name}: banco mudou demais ${initialW.toFixed(1)} -> ${partialBankW.toFixed(1)}`);
    assert(Math.abs(partialBankW - partialPlacedW) <= 20, `${viewport.name}: banco/posicionado desproporcional ${partialBankW.toFixed(1)} vs ${partialPlacedW.toFixed(1)}`);
    assert(partial.overflow === 0, `${viewport.name}: overflow parcial ${partial.overflow}px`);

    await place(frame, "pencil", "school");
    await place(frame, "backpack", "school");
    await frame.locator(".duduq-dd2-confirm").waitFor({ state:"visible", timeout:2500 });
    await frame.locator(".duduq-dd226-remove").first().waitFor({ state:"visible", timeout:2500 });
    await page.waitForTimeout(120);
    const complete = await metrics(page);

    const completePlacedW = avg(complete.placedCards.map(card => card.width));
    const completePlacedH = avg(complete.placedCards.map(card => card.height));
    const completeMediaH = avg(complete.placedMedia.map(media => media.height));
    const completeTargetH = avg(complete.targets.map(target => target.height));
    assert(complete.bankDisplay === "none" || complete.bankHeight <= 1, `${viewport.name}: banco vazio ainda ocupa ${complete.bankHeight}px`);
    assert(complete.confirm, `${viewport.name}: CONFIRMAR não apareceu`);
    assert(complete.removeButtons.length === 4, `${viewport.name}: × completo ${complete.removeButtons.length}/4`);
    assert(completePlacedW >= partialPlacedW + 4, `${viewport.name}: cards não cresceram no completo ${partialPlacedW.toFixed(1)} -> ${completePlacedW.toFixed(1)}`);
    assert(completePlacedH >= partialPlacedH + 4, `${viewport.name}: altura dos cards não cresceu ${partialPlacedH.toFixed(1)} -> ${completePlacedH.toFixed(1)}`);
    assert(completeMediaH >= partialMediaH + 4, `${viewport.name}: imagens não cresceram ${partialMediaH.toFixed(1)} -> ${completeMediaH.toFixed(1)}`);
    assert(completeTargetH >= partialTargetH + 4, `${viewport.name}: destinos não cresceram ${partialTargetH.toFixed(1)} -> ${completeTargetH.toFixed(1)}`);
    assert(complete.confirmGap >= 8, `${viewport.name}: CONFIRMAR muito próximo dos destinos (${complete.confirmGap.toFixed(1)}px)`);
    assert(complete.confirmBottom <= complete.clientHeight + 2, `${viewport.name}: CONFIRMAR fora da viewport`);
    assert(complete.overflow === 0, `${viewport.name}: overflow completo ${complete.overflow}px`);

    const removeCat = frame.locator(`${zone("pets")} .duduq-dd2-item-shell:has(${item("cat")}) .duduq-dd226-remove`).first();
    await removeCat.click({ force:true });
    await frame.locator(`.duduq-dd2-bank ${item("cat")}`).first().waitFor({ state:"visible", timeout:2500 });
    await frame.locator(".duduq-dd2-confirm").waitFor({ state:"detached", timeout:2500 });
    const removed = await metrics(page);
    assert(removed.bankCards.length === 1, `${viewport.name}: × não devolveu item ao banco`);
    assert(!removed.confirm, `${viewport.name}: CONFIRMAR permaneceu após remoção`);
    assert(removed.removeButtons.length === 3, `${viewport.name}: × restantes ${removed.removeButtons.length}/3`);
    assert(removed.overflow === 0, `${viewport.name}: overflow após × ${removed.overflow}px`);

    await place(frame, "cat", "pets");
    await frame.locator(".duduq-dd2-confirm").waitFor({ state:"visible", timeout:2500 });
    await page.waitForTimeout(100);
    const restored = await metrics(page);
    assert(restored.bankDisplay === "none" || restored.bankHeight <= 1, `${viewport.name}: banco não ocultou após reposicionar`);
    assert(restored.confirm, `${viewport.name}: CONFIRMAR não reapareceu`);
    assert(restored.removeButtons.length === 4, `${viewport.name}: × não restaurados 4/4`);
    assert(restored.overflow === 0, `${viewport.name}: overflow restaurado ${restored.overflow}px`);
    assert(errors.length === 0, `${viewport.name}: pageerror ${errors.join(" | ")}`);

    console.log(`PASS ${viewport.name} bank=${initialW.toFixed(1)}px partialPlaced=${partialPlacedW.toFixed(1)}x${partialPlacedH.toFixed(1)} completePlaced=${completePlacedW.toFixed(1)}x${completePlacedH.toFixed(1)} media=${partialMediaH.toFixed(1)}->${completeMediaH.toFixed(1)} target=${partialTargetH.toFixed(1)}->${completeTargetH.toFixed(1)} confirmGap=${complete.confirmGap.toFixed(1)} remove=PASS overflow=0`);
    await context.close();
  }
  console.log("PASS — Drag & Drop 2.0.26 complete-review candidate — 3/3");
} finally {
  await browser.close();
}

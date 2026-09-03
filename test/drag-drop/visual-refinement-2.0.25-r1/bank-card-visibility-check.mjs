import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE}/test/drag-drop/visual-refinement-2.0.25-r1/index.html`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function place(frame, itemId, targetId) {
  const itemSelector = `.duduq-dd2-item[data-dd2-item-id="${itemId}"]`;
  const zoneSelector = `.duduq-dd2-target[data-dd2-target-id="${targetId}"] .duduq-dd2-zone`;
  const placedSelector = `.duduq-dd2-target[data-dd2-target-id="${targetId}"] ${itemSelector}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const item = frame.locator(itemSelector).first();
    const zone = frame.locator(zoneSelector).first();
    await item.dragTo(zone, { force: true });
    try {
      await frame.locator(placedSelector).first().waitFor({ state: "visible", timeout: 1500 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }
}

async function placedGeometry(page) {
  return page.evaluate(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    if (!doc) return [];
    return [...doc.querySelectorAll('.duduq-dd2-zone .duduq-dd2-item[data-placed="true"]')].map((item) => {
      const label = item.querySelector("span:not(.duduq-dd2-audio-mark)");
      const shell = item.closest(".duduq-dd2-item-shell");
      const zone = item.closest(".duduq-dd2-zone");
      const itemRect = item.getBoundingClientRect();
      const shellRect = shell?.getBoundingClientRect();
      const zoneRect = zone?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      return {
        id: item.getAttribute("data-dd2-item-id"),
        itemTop: itemRect.top,
        itemBottom: itemRect.bottom,
        itemHeight: itemRect.height,
        shellTop: shellRect?.top ?? 0,
        shellBottom: shellRect?.bottom ?? 0,
        zoneTop: zoneRect?.top ?? 0,
        zoneBottom: zoneRect?.bottom ?? 0,
        labelTop: labelRect?.top ?? 0,
        labelBottom: labelRect?.bottom ?? 0,
        labelHeight: labelRect?.height ?? 0,
        itemOverflowY: getComputedStyle(item).overflowY,
        zoneOverflowY: zone ? getComputedStyle(zone).overflowY : ""
      };
    });
  });
}

function assertPlacedVisible(entries, phase) {
  assert(entries.length > 0, `${phase}: nenhum item posicionado encontrado`);
  for (const entry of entries) {
    assert(entry.labelHeight >= 15, `${phase}/${entry.id}: rótulo sem altura útil (${entry.labelHeight}px)`);
    assert(entry.labelTop >= entry.itemTop - 0.5, `${phase}/${entry.id}: rótulo subiu para fora do card`);
    assert(entry.labelBottom <= entry.itemBottom + 0.5, `${phase}/${entry.id}: rótulo passou do card labelBottom=${entry.labelBottom} itemBottom=${entry.itemBottom}`);
    assert(entry.itemTop >= entry.zoneTop - 0.5, `${phase}/${entry.id}: card subiu para fora do destino`);
    assert(entry.itemBottom <= entry.zoneBottom + 0.5, `${phase}/${entry.id}: card passou do destino itemBottom=${entry.itemBottom} zoneBottom=${entry.zoneBottom}`);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 648 } });
const page = await context.newPage();

try {
  const response = await page.goto(`${URL}?check=bank-card-short-desktop`, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert(response?.ok(), `harness HTTP ${response?.status()}`);
  await page.waitForFunction(() => {
    const frame = document.querySelector("#mount iframe");
    const doc = frame?.contentDocument;
    return Boolean(
      window.dd225vrMechanic?.()?.version === "2.0.25" &&
      window.DD225VisualRefinementR1?.version === "2.0.25-visual-r1" &&
      doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item").length === 4
    );
  }, null, { timeout: 20000 });

  const frame = page.frameLocator("#mount iframe");
  await place(frame, "cat", "pets");

  const emptyTarget = await page.evaluate(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    const zone = doc?.querySelector('.duduq-dd2-target[data-dd2-target-id="school"] .duduq-dd2-zone');
    const target = zone?.closest(".duduq-dd2-target");
    const zoneRect = zone?.getBoundingClientRect();
    const targetRect = target?.getBoundingClientRect();
    return zoneRect && targetRect ? {
      zoneHeight: zoneRect.height,
      targetHeight: targetRect.height
    } : null;
  });

  assert(emptyTarget, "destino escolar indisponível");
  assert(emptyTarget.zoneHeight <= 96, `destino vazio alto demais: ${emptyTarget.zoneHeight}px`);
  assert(emptyTarget.targetHeight <= 158, `card de destino alto demais: ${emptyTarget.targetHeight}px`);

  await place(frame, "pencil", "school");
  await place(frame, "backpack", "school");

  const partialPlaced = await placedGeometry(page);
  assert(partialPlaced.length === 3, `estado parcial deveria ter 3 itens posicionados, recebeu ${partialPlaced.length}`);
  assertPlacedVisible(partialPlaced, "PARTIAL");

  const result = await page.evaluate(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    if (!doc) return null;
    const item = doc.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="dog"]');
    const label = item?.querySelector("span:not(.duduq-dd2-audio-mark)");
    const bank = item?.closest(".duduq-dd2-bank");
    const arena = item?.closest(".duduq-dd2-arena");
    const rect = item?.getBoundingClientRect();
    const labelRect = label?.getBoundingClientRect();
    const bankRect = bank?.getBoundingClientRect();
    const arenaRect = arena?.getBoundingClientRect();
    const clippingAncestors = [];
    let node = item?.parentElement || null;
    while (node && node !== doc.documentElement) {
      const style = getComputedStyle(node);
      const overflowY = style.overflowY;
      if (["hidden", "clip", "scroll", "auto"].includes(overflowY)) {
        const r = node.getBoundingClientRect();
        clippingAncestors.push({
          selector: node.className || node.tagName,
          top: Math.round(r.top * 10) / 10,
          bottom: Math.round(r.bottom * 10) / 10,
          overflowY
        });
      }
      node = node.parentElement;
    }
    const clippedBy = clippingAncestors.filter((ancestor) => rect && (rect.bottom > ancestor.bottom + 0.5 || rect.top < ancestor.top - 0.5));
    const htmlOverflow = Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth);
    const bodyOverflow = Math.max(0, doc.body.scrollWidth - doc.body.clientWidth);
    return {
      rect: rect && { top: rect.top, bottom: rect.bottom, height: rect.height },
      labelRect: labelRect && { top: labelRect.top, bottom: labelRect.bottom, height: labelRect.height },
      bankRect: bankRect && { top: bankRect.top, bottom: bankRect.bottom, height: bankRect.height },
      arenaRect: arenaRect && { top: arenaRect.top, bottom: arenaRect.bottom, height: arenaRect.height },
      clippedBy,
      viewportHeight: doc.documentElement.clientHeight,
      htmlOverflow,
      bodyOverflow,
      bankVisible: bank ? getComputedStyle(bank).display !== "none" : false
    };
  });

  assert(result, "estado do iframe indisponível");
  assert(result.bankVisible, "banco deveria continuar visível com DOG restante");
  assert(result.rect && result.rect.bottom <= result.viewportHeight + 0.5, `DOG ultrapassa viewport: bottom=${result.rect?.bottom} viewport=${result.viewportHeight}`);
  assert(result.labelRect && result.labelRect.bottom <= result.viewportHeight + 0.5, `rótulo DOG cortado: bottom=${result.labelRect?.bottom} viewport=${result.viewportHeight}`);
  assert(result.arenaRect && result.rect.bottom <= result.arenaRect.bottom - 3, `DOG saiu do painel principal: itemBottom=${result.rect?.bottom} arenaBottom=${result.arenaRect?.bottom}`);
  assert(result.arenaRect && result.bankRect.bottom <= result.arenaRect.bottom + 0.5, `banco saiu do painel principal: bankBottom=${result.bankRect?.bottom} arenaBottom=${result.arenaRect?.bottom}`);
  assert(result.clippedBy.length === 0, `DOG cortado por ancestral: ${JSON.stringify(result.clippedBy)}`);
  assert(result.htmlOverflow === 0 && result.bodyOverflow === 0, `overflow horizontal html=${result.htmlOverflow} body=${result.bodyOverflow}`);

  await place(frame, "dog", "pets");
  await frame.locator(".duduq-dd2-confirm").first().waitFor({ state: "visible", timeout: 3000 });
  const allPlaced = await placedGeometry(page);
  assert(allPlaced.length === 4, `estado completo deveria ter 4 itens posicionados, recebeu ${allPlaced.length}`);
  assertPlacedVisible(allPlaced, "COMPLETE");

  const confirmGeometry = await page.evaluate(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    if (!doc) return null;
    const confirm = doc.querySelector(".duduq-dd2-confirm");
    const targets = [...doc.querySelectorAll(".duduq-dd2-target")];
    const confirmRect = confirm?.getBoundingClientRect();
    const targetBottom = Math.max(...targets.map((target) => target.getBoundingClientRect().bottom));
    return confirmRect ? {
      confirmTop: confirmRect.top,
      confirmBottom: confirmRect.bottom,
      targetBottom,
      gap: confirmRect.top - targetBottom,
      viewportHeight: doc.documentElement.clientHeight
    } : null;
  });

  assert(confirmGeometry, "geometria do CONFIRMAR indisponível");
  assert(confirmGeometry.gap >= 14, `CONFIRMAR muito próximo dos destinos: gap=${confirmGeometry.gap}px`);
  assert(confirmGeometry.confirmBottom <= confirmGeometry.viewportHeight + 0.5, `CONFIRMAR saiu da viewport: bottom=${confirmGeometry.confirmBottom}px viewport=${confirmGeometry.viewportHeight}px`);

  console.log(`SHORT_TARGET_PASS zone=${emptyTarget.zoneHeight.toFixed(1)}px target=${emptyTarget.targetHeight.toFixed(1)}px`);
  console.log(`PLACED_LABELS_PASS partial=3 complete=4 minLabelHeight=${Math.min(...allPlaced.map((entry) => entry.labelHeight)).toFixed(1)}px`);
  console.log(`CONFIRM_SEPARATION_PASS gap=${confirmGeometry.gap.toFixed(1)}px confirmTop=${confirmGeometry.confirmTop.toFixed(1)}px targetBottom=${confirmGeometry.targetBottom.toFixed(1)}px`);
  console.log(`BANK_CARD_VISIBILITY_PASS viewport=1366x648 itemBottom=${result.rect.bottom.toFixed(1)} labelBottom=${result.labelRect.bottom.toFixed(1)} viewport=${result.viewportHeight}`);
  console.log(`PANEL_CONTAINMENT_PASS itemBottom=${result.rect.bottom.toFixed(1)} bankBottom=${result.bankRect.bottom.toFixed(1)} arenaBottom=${result.arenaRect.bottom.toFixed(1)}`);
  console.log(`BANK_RECT top=${result.bankRect?.top?.toFixed?.(1)} bottom=${result.bankRect?.bottom?.toFixed?.(1)} height=${result.bankRect?.height?.toFixed?.(1)}`);
  console.log("CLIPPED_BY=0");
} finally {
  await browser.close();
}

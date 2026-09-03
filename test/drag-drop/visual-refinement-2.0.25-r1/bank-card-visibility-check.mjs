import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE}/test/drag-drop/visual-refinement-2.0.25-r1/index.html`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function place(frame, itemId, targetId) {
  const item = frame.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();
  const zone = frame.locator(`.duduq-dd2-target[data-dd2-target-id="${targetId}"] .duduq-dd2-zone`).first();
  await item.dragTo(zone, { force: true });
  await frame.locator(`.duduq-dd2-target[data-dd2-target-id="${targetId}"] .duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first().waitFor({ state: "visible", timeout: 3000 });
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
  await place(frame, "pencil", "school");
  await place(frame, "backpack", "school");

  const result = await page.evaluate(() => {
    const doc = document.querySelector("#mount iframe")?.contentDocument;
    if (!doc) return null;
    const item = doc.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="dog"]');
    const label = item?.querySelector("span:not(.duduq-dd2-audio-mark)");
    const bank = item?.closest(".duduq-dd2-bank");
    const rect = item?.getBoundingClientRect();
    const labelRect = label?.getBoundingClientRect();
    const bankRect = bank?.getBoundingClientRect();
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
  assert(result.clippedBy.length === 0, `DOG cortado por ancestral: ${JSON.stringify(result.clippedBy)}`);
  assert(result.htmlOverflow === 0 && result.bodyOverflow === 0, `overflow horizontal html=${result.htmlOverflow} body=${result.bodyOverflow}`);

  console.log(`BANK_CARD_VISIBILITY_PASS viewport=1366x648 itemBottom=${result.rect.bottom.toFixed(1)} labelBottom=${result.labelRect.bottom.toFixed(1)} viewport=${result.viewportHeight}`);
  console.log(`BANK_RECT top=${result.bankRect?.top?.toFixed?.(1)} bottom=${result.bankRect?.bottom?.toFixed?.(1)} height=${result.bankRect?.height?.toFixed?.(1)}`);
  console.log("CLIPPED_BY=0");
} finally {
  await browser.close();
}

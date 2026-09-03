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
      await frame.locator(`${zone(targetId)} ${item(itemId)}`).first().waitFor({ state:"visible", timeout:1200 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 80));
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
      return { width:r.width, height:r.height, top:r.top, bottom:r.bottom, className:node.className || "", display:s.display, flex:s.flex, alignSelf:s.alignSelf };
    });
    const one = (selector) => {
      const node = doc.querySelector(selector);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      return { selector, width:r.width, height:r.height, top:r.top, bottom:r.bottom, display:s.display, minHeight:s.minHeight, heightCss:s.height, paddingTop:s.paddingTop, paddingBottom:s.paddingBottom, gap:s.gap, alignContent:s.alignContent, justifyContent:s.justifyContent };
    };
    const bank = doc.querySelector(".duduq-dd2-bank[data-dd2-bank]");
    const confirm = doc.querySelector(".duduq-dd2-confirm");
    const lastContent = [...doc.querySelectorAll('.duduq-dd2-targets,.duduq-dd2-bank,.duduq-dd2-actions')]
      .filter(node => getComputedStyle(node).display !== 'none')
      .map(node => node.getBoundingClientRect().bottom)
      .reduce((a,b) => Math.max(a,b), 0);
    return {
      bankCards: rects('.duduq-dd2-bank .duduq-dd2-item[data-has-media="true"]'),
      bankShells: rects('.duduq-dd2-bank-items .duduq-dd2-item-shell'),
      bankChildren: rects('.duduq-dd2-bank-items > *'),
      placedCards: rects('.duduq-dd2-zone .duduq-dd2-item[data-has-media="true"]'),
      targets: rects('.duduq-dd2-target'),
      zones: rects('.duduq-dd2-zone'),
      bankDisplay: bank ? getComputedStyle(bank).display : "none",
      bankHeight: bank?.getBoundingClientRect().height || 0,
      confirm: Boolean(confirm),
      overflow: Math.max(
        0,
        doc.documentElement.scrollWidth - doc.documentElement.clientWidth,
        doc.body.scrollWidth - doc.body.clientWidth
      ),
      clientHeight: doc.documentElement.clientHeight,
      bodyHeight: doc.body.getBoundingClientRect().height,
      iframeHeight: frame?.getBoundingClientRect().height || 0,
      confirmBottom: confirm?.getBoundingClientRect().bottom || 0,
      root: one('.duduq-dd2-root'),
      surface: one('.duduq-dd2-surface'),
      arena: one('.duduq-dd2-arena'),
      targetsBox: one('.duduq-dd2-targets'),
      bankBox: one('.duduq-dd2-bank'),
      actionsBox: one('.duduq-dd2-actions'),
      lastContent,
      unusedBelowContent: Math.max(0, doc.documentElement.clientHeight - lastContent)
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
    const response = await page.goto(`${URL}?v=${viewport.name}`, { waitUntil:"domcontentloaded", timeout:30_000 });
    assert(response?.ok(), `${viewport.name}: HTTP ${response?.status()}`);
    await waitMounted(page);
    const frame = page.frameLocator("#mount iframe");

    const initial = await metrics(page);
    assert(initial.bankCards.length === 4, `${viewport.name}: banco inicial != 4`);
    assert(initial.overflow === 0, `${viewport.name}: overflow inicial ${initial.overflow}px`);

    await place(frame, "cat", "pets");
    const partialOne = await metrics(page);
    console.log(`SHELL ${viewport.name} initialCards=${JSON.stringify(initial.bankCards)} initialShells=${JSON.stringify(initial.bankShells)} partialCards=${JSON.stringify(partialOne.bankCards)} partialShells=${JSON.stringify(partialOne.bankShells)} bankChildren=${JSON.stringify(partialOne.bankChildren)}`);

    await place(frame, "dog", "pets");
    const partial = await metrics(page);
    assert(partial.bankCards.length === 2, `${viewport.name}: banco parcial != 2`);
    assert(partial.placedCards.length === 2, `${viewport.name}: posicionados parciais != 2`);

    const initialW = avg(initial.bankCards.map(card => card.width));
    const partialBankW = avg(partial.bankCards.map(card => card.width));
    const placedW = avg(partial.placedCards.map(card => card.width));
    assert(Math.abs(initialW - partialBankW) <= 12, `${viewport.name}: banco mudou demais ${initialW.toFixed(1)} -> ${partialBankW.toFixed(1)}`);
    assert(Math.abs(partialBankW - placedW) <= 18, `${viewport.name}: banco/posicionado desproporcional ${partialBankW.toFixed(1)} vs ${placedW.toFixed(1)}`);
    assert(partial.overflow === 0, `${viewport.name}: overflow parcial ${partial.overflow}px`);

    await place(frame, "pencil", "school");
    await place(frame, "backpack", "school");
    await page.waitForTimeout(150);
    const complete = await metrics(page);
    assert(complete.bankDisplay === "none" || complete.bankHeight <= 1, `${viewport.name}: banco vazio ainda ocupa ${complete.bankHeight}px`);
    assert(complete.confirm, `${viewport.name}: CONFIRMAR não apareceu`);
    assert(complete.confirmBottom <= complete.clientHeight + 2, `${viewport.name}: CONFIRMAR fora da viewport`);
    assert(complete.overflow === 0, `${viewport.name}: overflow final ${complete.overflow}px`);
    assert(errors.length === 0, `${viewport.name}: pageerror ${errors.join(" | ")}`);

    console.log(`PASS ${viewport.name} initial=${initialW.toFixed(1)}px partial=${partialBankW.toFixed(1)}px placed=${placedW.toFixed(1)}px overflow=0`);
    await context.close();
  }
  console.log("PASS — Drag & Drop 2.0.26 balanced card candidate — 3/3");
} finally {
  await browser.close();
}

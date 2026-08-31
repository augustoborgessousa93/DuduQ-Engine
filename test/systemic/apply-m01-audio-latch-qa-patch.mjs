import fs from "node:fs";

const path = "test/systemic/year1-m01-official-homologation.mjs";
const text = fs.readFileSync(path, "utf8");

const oldBlock = `      const ddFrame = page.frameLocator("iframe");
      for (const id of ["A", "B", "C"]) {
        const item = ddFrame.locator(\`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="\${id}"]\`).first();
        await item.click({ force: true });
        await page.waitForFunction((itemId) => {
          const doc = document.querySelector("iframe")?.contentDocument;
          return Boolean(doc?.querySelector(\`.duduq-dd2-item[data-dd2-item-id="\${itemId}"][data-audio-playing="true"]\`));
        }, id, { timeout: 1_500 });
        await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 6_000 });
      }
`;

const newBlock = `      const ddFrame = page.frameLocator("iframe");
      for (const id of ["A", "B", "C"]) {
        const item = ddFrame.locator(\`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="\${id}"]\`).first();
        await item.waitFor({ state: "visible", timeout: 5_000 });
        await page.waitForFunction((itemId) => {
          const doc = document.querySelector("iframe")?.contentDocument;
          const card = doc?.querySelector(\`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="\${itemId}"]\`);
          return Boolean(card && !card.disabled && card.getAttribute("data-has-audio") === "true");
        }, id, { timeout: 5_000 });
        await page.evaluate((itemId) => {
          const doc = document.querySelector("iframe")?.contentDocument;
          const card = doc?.querySelector(\`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="\${itemId}"]\`);
          if (!card) throw new Error(\`QA audio card \${itemId} ausente antes do observer.\`);
          window.__DUDUQ_QA_AUDIO_LATCHES__ ||= {};
          const previous = window.__DUDUQ_QA_AUDIO_LATCHES__[itemId];
          previous?.observer?.disconnect?.();
          const latch = {
            seenPlaying: card.getAttribute("data-audio-playing") === "true",
            observer: null
          };
          const observer = new MutationObserver(() => {
            if (card.getAttribute("data-audio-playing") === "true") latch.seenPlaying = true;
          });
          observer.observe(card, { attributes: true, attributeFilter: ["data-audio-playing"] });
          latch.observer = observer;
          window.__DUDUQ_QA_AUDIO_LATCHES__[itemId] = latch;
        }, id);
        await item.click({ force: true });
        await page.waitForFunction((itemId) => Boolean(window.__DUDUQ_QA_AUDIO_LATCHES__?.[itemId]?.seenPlaying), id, { timeout: 1_500 });
        await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 6_000 });
        await page.evaluate((itemId) => {
          const latch = window.__DUDUQ_QA_AUDIO_LATCHES__?.[itemId];
          latch?.observer?.disconnect?.();
          if (window.__DUDUQ_QA_AUDIO_LATCHES__) delete window.__DUDUQ_QA_AUDIO_LATCHES__[itemId];
        }, id);
      }
`;

const occurrences = text.split(oldBlock).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected exactly one transient audio polling block, found ${occurrences}.`);
}

const updated = text.replace(oldBlock, newBlock);
fs.writeFileSync(path, updated, "utf8");
console.log("Applied pre-click MutationObserver + persistent audio latch QA patch.");

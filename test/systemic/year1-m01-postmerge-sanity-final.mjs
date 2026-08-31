import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const MERGE_SHA = "bc8eadb945484cbdc4c7a539eb1b65fda7b35c87";
const pageErrors = [];
const critical404 = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFeedback(page, state, timeout = 5_000) {
  await page.waitForFunction((expected) => {
    const doc = document.querySelector("iframe")?.contentDocument;
    return doc?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === expected;
  }, state, { timeout });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (url.includes("/engine/") || url.includes("/content/english/year-1/module-01/") || url.includes("asset-catalog/runtime-index.js")) critical404.push(url);
});

try {
  const response = await page.goto(`${BASE}/content/english/year-1/module-01/?sanity=postmerge-r146`, {
    waitUntil: "domcontentloaded",
    timeout: 35_000
  });
  assert(response?.ok(), `M01 public entry HTTP ${response?.status()}`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

  const boot = await page.evaluate(() => {
    const manifest = window.DUDUQ_ENGINE_MANIFEST || {};
    const moduleDefinition = window.DUDUQ_CONTENT?.english?.year1?.module01;
    const questions = (moduleDefinition?.activities || []).flatMap((activity) => activity?.questions || []);
    return {
      revision: manifest.revision,
      core: manifest.core?.release,
      ts: manifest.mechanics?.["target-shooter"]?.release,
      dd: manifest.mechanics?.["drag-drop"]?.release,
      ids: questions.map((q) => q.id),
      ddModes: questions.filter((q) => q.delivery?.mechanic === "drag-drop").map((q) => q.payload?.mode),
      requiredMechanics: window.DUDUQ_GAME_CONFIG?.requiredMechanics || []
    };
  });
  assert(boot.revision === 146, `Canary ${boot.revision}, esperado R146.`);
  assert(boot.core === "1.0.11", `Core ${boot.core}.`);
  assert(boot.ts === "1.0.21", `Target Shooter ${boot.ts}.`);
  assert(boot.dd === "2.0.24", `Drag & Drop ${boot.dd}.`);
  assert(boot.ids.length === 12 && boot.ids[0] === "EN1-M1-01" && boot.ids[11] === "EN1-M1-12", "IDs oficiais do M01 não estão íntegros.");
  assert(boot.ddModes.length > 0 && boot.ddModes.every((mode) => mode === "single-choice"), "DD não está em single-choice.");
  assert(boot.requiredMechanics.join(",") === "target-shooter,drag-drop", "requiredMechanics divergente.");

  const intro = page.locator(".duduq-intro-start-button");
  await intro.waitFor({ state: "visible", timeout: 30_000 });
  await intro.click();

  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const s = window.DuduQ?.getSession?.();
    return Boolean(s?.stepIndex === 0 && !s.transitioning && window.DuduQTransition?.getState?.() === "idle" && doc?.querySelectorAll(".duduq-ts-target").length === 3);
  }, null, { timeout: 35_000 });
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const target = doc?.querySelector('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]');
    const controls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) => /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || "")));
    const busy = controls.some((button) => Boolean(button.disabled) || /reprodução|playing/i.test(String(button.getAttribute("aria-label") || "")));
    return Boolean(target && !target.disabled && controls.length >= 1 && !busy);
  }, null, { timeout: 8_000 });

  const tsFrame = page.frameLocator("iframe");
  await tsFrame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]').first().click({ force: true });
  await waitFeedback(page, "retry", 2_500);
  const tsRetry = await page.evaluate(() => window.DuduQ?.getSession?.());
  assert(tsRetry?.stepIndex === 0 && !tsRetry.completed, "TS distrator não preservou Q01.");

  await tsFrame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first().click({ force: true });
  await page.waitForFunction(() => {
    const s = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    return Boolean(s?.stepIndex === 1 && !s.transitioning && window.DuduQTransition?.getState?.() === "idle" && doc?.querySelector(".duduq-dd2-root") && doc.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item").length === 3);
  }, null, { timeout: 15_000 });

  const ddMount = await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const target = doc?.querySelector('.duduq-dd2-target[data-dd2-target-id]');
    const cards = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    return {
      singleChoice: target?.getAttribute("data-single-choice"),
      cards: cards.map((card) => ({ id: card.getAttribute("data-dd2-item-id"), hasAudio: card.getAttribute("data-has-audio"), disabled: card.disabled }))
    };
  });
  assert(ddMount.singleChoice === "true", "Runtime DD não montou contrato single-choice.");
  assert(ddMount.cards.length === 3 && ddMount.cards.every((card) => card.hasAudio === "true" && !card.disabled), "Cards auditivos DD não estão prontos.");

  await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const card = doc?.querySelector('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]');
    if (!card) throw new Error("Card A ausente no sanity.");
    const latch = { seen: card.getAttribute("data-audio-playing") === "true", observer: null };
    const observer = new MutationObserver(() => {
      if (card.getAttribute("data-audio-playing") === "true") latch.seen = true;
    });
    observer.observe(card, { attributes: true, attributeFilter: ["data-audio-playing"] });
    latch.observer = observer;
    window.__DUDUQ_SANITY_AUDIO_LATCH__ = latch;
  });

  const ddFrame = page.frameLocator("iframe");
  await ddFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first().click({ force: true });
  await page.waitForFunction(() => window.__DUDUQ_SANITY_AUDIO_LATCH__?.seen === true, null, { timeout: 1_500 });
  await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 6_000 });
  await page.evaluate(() => {
    window.__DUDUQ_SANITY_AUDIO_LATCH__?.observer?.disconnect?.();
    delete window.__DUDUQ_SANITY_AUDIO_LATCH__;
  });

  const zone = ddFrame.locator(".duduq-dd2-zone").first();
  await zone.click({ force: true });
  await waitFeedback(page, "retry", 3_000);
  const ddRetry = await page.evaluate(() => window.DuduQ?.getSession?.());
  assert(ddRetry?.stepIndex === 1 && !ddRetry.completed, "DD distrator avançou Host.");
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const cards = [...(doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item") || [])];
    return cards.length === 3 && cards.every((card) => !card.disabled) && !doc?.querySelector(".duduq-dd2-zone .duduq-dd2-item");
  }, null, { timeout: 3_500 });

  await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    window.__DUDUQ_SANITY_Q02_TARGET_SRC__ = doc?.querySelector('.duduq-dd2-target[data-dd2-target-id] img')?.currentSrc || "";
  });
  assert(await page.evaluate(() => Boolean(window.__DUDUQ_SANITY_Q02_TARGET_SRC__)), "Contexto visual Q02 ausente antes da transição para Q03.");

  await ddFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="C"]').first().click({ force: true });
  await zone.click({ force: true });
  await waitFeedback(page, "success", 5_000);

  await page.waitForFunction(() => {
    const s = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    const previousSrc = window.__DUDUQ_SANITY_Q02_TARGET_SRC__ || "";
    const nextSrc = doc?.querySelector('.duduq-dd2-target[data-dd2-target-id] img')?.currentSrc || "";
    const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    return Boolean(s?.stepIndex === 1 && !s.transitioning && previousSrc && nextSrc && nextSrc !== previousSrc && items.length === 3 && items.every((item) => !item.disabled));
  }, null, { timeout: 12_000 });
  const q03Frame = page.frameLocator("iframe");
  await q03Frame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first().click({ force: true });
  await q03Frame.locator(".duduq-dd2-zone").first().click({ force: true });
  await waitFeedback(page, "success", 5_000);

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const iframe = document.querySelector("iframe");
    const mountedView = Boolean(iframe && (iframe.srcdoc || iframe.getAttribute("src")));
    return Boolean(
      session &&
      session.stepIndex === 2 &&
      session.transitioning === false &&
      session.completed === false &&
      mountedView &&
      window.DuduQTransition?.getState?.() === "idle"
    );
  }, null, { timeout: 12_000 });

  const afterRealInteractions = await page.evaluate(() => window.DuduQ?.getSession?.());
  assert((afterRealInteractions?.progress?.percent ?? 0) > 0, "Progress não avançou após interações reais.");

  let session = afterRealInteractions;
  while (!session.completed) {
    const previous = session.stepIndex;

    await page.waitForFunction((expectedStep) => {
      const current = window.DuduQ?.getSession?.();
      if (!current || current.completed || current.transitioning || current.stepIndex !== expectedStep) return false;
      const iframe = document.querySelector("iframe");
      const mountedView = Boolean(iframe && (iframe.srcdoc || iframe.getAttribute("src")));
      return mountedView && window.DuduQTransition?.getState?.() === "idle";
    }, previous, { timeout: 12_000 });

    const beforeNext = await page.evaluate(() => {
      const current = window.DuduQ?.getSession?.();
      const iframe = document.querySelector("iframe");
      return {
        stepIndex: current?.stepIndex,
        transitioning: current?.transitioning,
        completed: current?.completed,
        totalSteps: current?.totalSteps,
        progress: current?.progress?.percent,
        transition: window.DuduQTransition?.getState?.(),
        iframeExists: Boolean(iframe),
        mountedView: Boolean(iframe && (iframe.srcdoc || iframe.getAttribute("src"))),
        iframeSrc: iframe?.getAttribute("src") || "",
        hasSrcdoc: Boolean(iframe?.srcdoc)
      };
    });

    const accepted = await page.evaluate((stepIndex) => window.DuduQ.next({ sanity: "postmerge-r146", stepIndex }), previous);
    if (accepted !== true) {
      const rejectedState = await page.evaluate(() => {
        const current = window.DuduQ?.getSession?.();
        const iframe = document.querySelector("iframe");
        return {
          stepIndex: current?.stepIndex,
          transitioning: current?.transitioning,
          completed: current?.completed,
          totalSteps: current?.totalSteps,
          progress: current?.progress?.percent,
          transition: window.DuduQTransition?.getState?.(),
          iframeExists: Boolean(iframe),
          mountedView: Boolean(iframe && (iframe.srcdoc || iframe.getAttribute("src"))),
          iframeSrc: iframe?.getAttribute("src") || "",
          hasSrcdoc: Boolean(iframe?.srcdoc)
        };
      });
      console.error("SANITY_NEXT_REJECTED", JSON.stringify({ previous, accepted, beforeNext, rejectedState }));
    }
    assert(accepted === true, `Host recusou sanity progression no step ${previous}.`);

    await page.waitForFunction(({ previous, total }) => {
      const current = window.DuduQ?.getSession?.();
      if (!current || current.transitioning) return false;
      if (current.completed) return current.progress?.percent === 100;
      if (!(current.stepIndex > previous && current.stepIndex < total)) return false;
      const iframe = document.querySelector("iframe");
      const mountedView = Boolean(iframe && (iframe.srcdoc || iframe.getAttribute("src")));
      return mountedView && window.DuduQTransition?.getState?.() === "idle";
    }, { previous, total: session.totalSteps }, { timeout: 12_000 });

    session = await page.evaluate(() => window.DuduQ?.getSession?.());
  }

  assert(session.progress?.percent === 100, `Progress final ${session.progress?.percent}.`);
  const completion = await page.evaluate(() => String(document.body?.innerText || "").replace(/\s+/g, " "));
  assert(/Missão concluída/i.test(completion), "Completion ausente.");
  assert(pageErrors.length === 0, `JS blocker/pageerror: ${pageErrors.join(" | ")}`);
  assert(critical404.length === 0, `404 crítico: ${critical404.join(" | ")}`);

  console.log("M01_POSTMERGE_SANITY_PASS", JSON.stringify({
    mergeSha: MERGE_SHA,
    publicEntry: true,
    canary: 146,
    core: "1.0.11",
    targetShooter: "1.0.21",
    dragDrop: "2.0.24",
    intro: true,
    targetShooterMounted: true,
    targetShooterRetry: true,
    targetShooterSuccess: true,
    dragDropSingleChoiceMounted: true,
    alternativeAudio: true,
    dragDropRetry: true,
    dragDropSuccess: true,
    progress: 100,
    completion: true,
    pageErrors,
    critical404
  }));
} finally {
  await page.close();
  await browser.close();
}

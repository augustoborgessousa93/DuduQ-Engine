import { chromium } from "playwright";

const LIVE_BASE = process.env.LIVE_BASE || "https://duduq-engine.pages.dev";
const YEARS = [1, 3, 5];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function installTtsStub(page) {
  await page.addInitScript(() => {
    const synth = {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => [],
      cancel() { this.speaking = false; this.pending = false; },
      pause() { this.paused = true; },
      resume() { this.paused = false; },
      speak(utterance) {
        this.speaking = true;
        this.pending = false;
        try { utterance?.onstart?.({ type: "start" }); } catch {}
        queueMicrotask(() => {
          this.speaking = false;
          try { utterance?.onend?.({ type: "end" }); } catch {}
        });
      }
    };
    try {
      Object.defineProperty(globalThis, "speechSynthesis", { value: synth, configurable: true });
    } catch {
      globalThis.speechSynthesis = synth;
    }
  });
}

function dragContract(question) {
  const payload = question?.payload || {};
  let pairs = [];
  if (Array.isArray(payload.items) && payload.items.some((item) => item?.targetId)) {
    pairs = payload.items
      .filter((item) => item?.required !== false && item?.targetId)
      .map((item) => [String(item.id), String(item.targetId)]);
  } else if (question?.answer?.type === "pairs") {
    pairs = (question.answer.value || [])
      .map((value) => [String(value?.source || value?.itemId || ""), String(value?.target || value?.targetId || "")])
      .filter(([source, target]) => source && target);
  }

  const correctSources = new Set(pairs.map(([source]) => source));
  const items = payload.items || question?.alternatives || [];
  const targets = payload.targets || question?.metadata?.targets || [];
  const distractor = items.find((item) => !correctSources.has(String(item?.id || "")));
  if (distractor && pairs[0]) return { pairs, wrong: [String(distractor.id), pairs[0][1]] };
  if (pairs[0] && targets.length > 1) {
    const alternateTarget = targets.find((target) => String(target?.id || "") !== pairs[0][1]);
    if (alternateTarget) return { pairs, wrong: [pairs[0][0], String(alternateTarget.id)] };
  }
  return { pairs, wrong: null };
}

async function waitForR148(page, url) {
  const deadline = Date.now() + 360000;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const response = await page.goto(`${url}?live=${Date.now()}`, {
        waitUntil: "domcontentloaded",
        timeout: 35000
      });
      if (response?.ok()) {
        await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35000 });
        last = await page.evaluate(() => ({
          revision: window.DUDUQ_ENGINE_MANIFEST?.revision,
          core: window.DUDUQ_ENGINE_MANIFEST?.core?.release,
          dragDropManifest: window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,
          dragDropRegistered: window.DuduQ?.getMechanic?.("drag-drop")?.version
        }));
        if (
          last.revision === 148 &&
          last.core === "1.0.12" &&
          last.dragDropManifest === "2.0.25" &&
          last.dragDropRegistered === "2.0.25"
        ) return last;
      }
    } catch (error) {
      last = { error: String(error?.message || error) };
    }
    await page.waitForTimeout(15000);
  }
  throw new Error(`live stale ${JSON.stringify(last)}`);
}

async function realDragDropQuestions(page, year) {
  return page.evaluate((targetYear) => {
    const seen = new Set();
    function walk(value) {
      if (!value || typeof value !== "object" || seen.has(value)) return null;
      seen.add(value);
      if (Array.isArray(value.activities) && Number(value.year) === targetYear && Number(value.module) === 1) return value;
      for (const child of Object.values(value)) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    }
    const module = walk(window.DUDUQ_CONTENT || {});
    const questions = [];
    for (const activity of module?.activities || []) {
      for (const question of activity.questions || []) {
        const mechanic = String(activity.mechanic || question?.delivery?.mechanic || question?.renderer || "")
          .toLowerCase().replace(/_/g, "-");
        if (mechanic === "drag-drop") questions.push(question);
      }
    }
    return questions;
  }, year);
}

async function destroyMounted(page) {
  await page.evaluate(() => {
    try { window.__R148_LIVE_DESTROY__?.(); } catch {}
    document.querySelector("#r148-live-host")?.remove();
  });
}

async function mountQuestion(page, question, year) {
  await page.evaluate(({ question, year }) => {
    window.__R148_LIVE_RESULTS__ = [];
    window.__R148_LIVE_COMPLETE__ = [];
    if (!window.__R148_LIVE_LISTENER__) {
      window.addEventListener("message", (event) => {
        if (event.data?.type === "DUDUQ_DRAG_DROP_RESULT") {
          window.__R148_LIVE_RESULTS__.push(event.data.payload);
        }
      });
      window.__R148_LIVE_LISTENER__ = true;
    }

    document.querySelector("#r148-live-host")?.remove();
    const host = document.body.appendChild(document.createElement("div"));
    host.id = "r148-live-host";
    host.style.cssText = "position:fixed;inset:0;z-index:999999;background:#fff";

    const mechanic = window.DuduQ?.getMechanic?.("drag-drop");
    let input = question;
    if (!mechanic?.validate?.(input) && question?.payload) {
      input = {
        id: question.id,
        title: "DD",
        instruction: question.instruction || question.statement || "",
        payload: question.payload
      };
    }
    if (!mechanic?.validate?.(input)) throw new Error("validate");
    window.__R148_LIVE_DESTROY__ = mechanic.mount({
      container: host,
      payload: input,
      context: { subject: "english", year, module: 1, stepId: question.id, stepIndex: 0, totalSteps: 1 },
      onComplete: (result) => window.__R148_LIVE_COMPLETE__.push(result)
    });
  }, { question, year });

  await page.locator("#r148-live-host iframe").waitFor({ state: "attached", timeout: 12000 });
  const handle = await page.locator("#r148-live-host iframe").elementHandle();
  const frame = await handle.contentFrame();
  await frame.locator(".duduq-dd2-root").waitFor({ state: "visible", timeout: 12000 });
  return frame;
}

async function verifyBehavior(page, question, year) {
  const contract = dragContract(question);
  assert(contract.pairs.length && contract.wrong, `Y${year}: contrato Drag & Drop insuficiente`);

  let frame = await mountQuestion(page, question, year);
  let place = async (source, target) => {
    await frame.locator(`[data-dd2-item-id="${source}"]`).first().click({ force: true });
    await frame.locator(`[data-dd2-target-id="${target}"] .duduq-dd2-zone`).first().click({ force: true });
  };

  await place(...contract.wrong);
  assert(await page.evaluate(() => window.__R148_LIVE_RESULTS__.length) === 0, `Y${year}: drop avaliou antes de confirmar`);

  let confirm = frame.locator(".duduq-dd2-confirm");
  let retry = "N/A_INCOMPLETE_PLACEMENT";
  if (await confirm.count() && await confirm.isVisible()) {
    await confirm.click({ force: true });
    await page.waitForFunction(() => window.__R148_LIVE_RESULTS__.length === 1, null, { timeout: 7000 });
    assert((await page.evaluate(() => window.__R148_LIVE_RESULTS__[0]))?.isCorrect === false, `Y${year}: retry inválido`);
    retry = "PASS";
  } else {
    await destroyMounted(page);
    frame = await mountQuestion(page, question, year);
    place = async (source, target) => {
      await frame.locator(`[data-dd2-item-id="${source}"]`).first().click({ force: true });
      await frame.locator(`[data-dd2-target-id="${target}"] .duduq-dd2-zone`).first().click({ force: true });
    };
    confirm = frame.locator(".duduq-dd2-confirm");
  }

  for (const pair of contract.pairs) await place(...pair);
  await confirm.waitFor({ state: "visible", timeout: 5000 });
  const before = await page.evaluate(() => window.__R148_LIVE_RESULTS__.length);
  await confirm.click({ force: true });
  await page.waitForFunction((count) => window.__R148_LIVE_RESULTS__.length > count, before, { timeout: 7000 });
  assert((await page.evaluate(() => window.__R148_LIVE_RESULTS__.at(-1)))?.isCorrect === true, `Y${year}: success inválido`);
  await page.waitForFunction(() => window.__R148_LIVE_COMPLETE__.length > 0, null, { timeout: 7000 });
  await destroyMounted(page);
  return { question: question.id, retry, confirm: "PASS", success: "PASS" };
}

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (const year of YEARS) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const pageErrors = [];
    const critical404 = [];
    await installTtsStub(page);
    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => {
      if (response.status() !== 404) return;
      const url = response.url();
      if (url.includes("/engine/") || url.includes(`/content/english/year-${year}/`)) critical404.push(url);
    });

    try {
      const url = `${LIVE_BASE}/content/english/year-${year}/module-01/`;
      const boot = await waitForR148(page, url);
      console.log(`LIVE BOOT Y${year}`, JSON.stringify(boot));
      const questions = await realDragDropQuestions(page, year);
      const question = questions.find((candidate) => {
        const contract = dragContract(candidate);
        return contract.pairs.length && contract.wrong;
      });
      assert(question, `Y${year}: consumidor Drag & Drop real não encontrado`);
      const behavior = await verifyBehavior(page, question, year);

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35000 });
      const start = page.locator(".duduq-intro-start-button");
      await start.waitFor({ state: "visible", timeout: 30000 });
      await start.click({ force: true });
      await page.waitForFunction(() => {
        const session = window.DuduQ?.getSession?.();
        return Boolean(session && !session.transitioning && window.DuduQTransition?.getState?.() === "idle");
      }, null, { timeout: 35000 });
      const before = await page.evaluate(() => window.DuduQ.getSession());
      const accepted = await page.evaluate(() => window.DuduQ.next({ qa: "live" }));
      assert(accepted !== false, `Y${year}: progressão rejeitada`);
      await page.waitForFunction((index) => {
        const session = window.DuduQ?.getSession?.();
        return Boolean(session && !session.transitioning && (session.completed || session.stepIndex !== index) && window.DuduQTransition?.getState?.() === "idle");
      }, before.stepIndex, { timeout: 12000 });

      assert(!pageErrors.length, `Y${year}: pageError ${pageErrors.join(" | ")}`);
      assert(!critical404.length, `Y${year}: critical404 ${critical404.join(" | ")}`);
      report.push({ year, boot, behavior, progression: "PASS" });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ status: "LIVE_PASS", report }, null, 2));

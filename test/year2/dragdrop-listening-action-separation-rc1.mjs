import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-dragdrop-listening-action-separation-rc1");
const MODULE_KEY = "module01v23multimodal";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function bootModule(page) {
  await page.goto(`${BASE_URL}/content/english/year-2/module-01/index.html?qa=dd-listening-action-separation-rc1`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });

  await page.waitForFunction(() => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal;
    return Boolean(built?.module === 1 && built?.activities?.length && window.DuduQ && window.DuduQIntro);
  }, null, { timeout: 30_000 });

  const started = await page.evaluate(() => window.DuduQ?.getSession?.()?.module === 1);
  if (!started) {
    const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
    await start.waitFor({ state: "visible", timeout: 20_000 });
    await start.click();
  }

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === 1 && session.totalSteps > 0 && !session.transitioning);
  }, null, { timeout: 25_000 });
}

async function currentFrame(page) {
  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "Iframe Drag & Drop não ficou acessível.");
  return frame;
}

async function waitStep(page, index) {
  await page.waitForFunction((expected) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session && !session.transitioning && session.stepIndex === expected);
  }, index, { timeout: 12_000 });
  await page.waitForTimeout(100);
}

async function advance(page) {
  const state = await page.evaluate(() => {
    const session = window.DuduQ?.getSession?.();
    return { index: session?.stepIndex ?? -1, total: session?.totalSteps ?? 0 };
  });
  assert(state.index >= 0 && state.index < state.total, `Etapa inválida: ${state.index}/${state.total}.`);
  await page.evaluate(() => window.DuduQ.next({ qaSkip: true }));
  if (state.index + 1 >= state.total) return false;
  await waitStep(page, state.index + 1);
  return true;
}

async function activeInfo(page) {
  return page.evaluate((moduleKey) => {
    const built = window.DUDUQ_CONTENT.english.year2[moduleKey];
    const session = window.DuduQ.getSession();
    const activity = built.activities[session.stepIndex] || null;
    const question = activity?.questions?.find((entry) => entry?.metadata?.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES") || null;
    return {
      stepIndex: session.stepIndex,
      totalSteps: session.totalSteps,
      activityId: activity?.id || null,
      questionId: question?.id || null,
      correctSource: question?.answer?.value?.[0]?.source || null,
      optionPresentation: question?.metadata?.optionPresentation || null,
      centralVisualAsset: question?.metadata?.listeningAssociation?.centralVisualAsset || null
    };
  }, MODULE_KEY);
}

async function findListeningStep(page) {
  const total = await page.evaluate(() => window.DuduQ.getSession().totalSteps);
  for (let index = 0; index < total; index += 1) {
    const info = await activeInfo(page);
    const frame = await currentFrame(page);
    const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
    if (info.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES" && await target.isVisible().catch(() => false)) {
      assert(info.questionId && info.correctSource, "Listening association encontrado sem ID/gabarito estrutural.");
      return { frame, target, info };
    }
    if (!(await advance(page))) break;
  }
  throw new Error("Nenhum Drag & Drop listening association foi encontrado no M01.");
}

async function assertCentralImage(target, label) {
  const image = target.locator("img").first();
  await image.waitFor({ state: "visible", timeout: 8_000 });
  const loaded = await image.evaluate((node) => {
    if (node.complete) return node.naturalWidth > 0 && node.naturalHeight > 0;
    return new Promise((resolve) => {
      const finish = () => resolve(Boolean(node.complete && node.naturalWidth > 0 && node.naturalHeight > 0));
      node.addEventListener("load", finish, { once: true });
      node.addEventListener("error", () => resolve(false), { once: true });
      window.setTimeout(finish, 5_000);
    });
  });
  assert(loaded, `${label}: imagem central não carregou.`);
  const state = await image.evaluate((node) => ({
    src: node.currentSrc || node.src || "",
    complete: Boolean(node.complete),
    naturalWidth: Number(node.naturalWidth || 0),
    naturalHeight: Number(node.naturalHeight || 0),
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height
  }));
  assert(state.complete && state.naturalWidth > 0 && state.naturalHeight > 0, `${label}: imagem central não carregou.`);
  assert(state.width > 24 && state.height > 24, `${label}: imagem central sem presença visual útil.`);
  return state;
}

async function assertSeparatedControls(frame, target, label) {
  const cards = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
  const audioButtons = frame.locator(".duduq-dd2-bank .duduq-dd2-item-audio");
  const cardCount = await cards.count();
  const audioCount = await audioButtons.count();

  assert(cardCount >= 2 && cardCount <= 4, `${label}: quantidade inesperada de cards (${cardCount}).`);
  assert(audioCount === cardCount, `${label}: controles de áudio separados incompletos (${audioCount}/${cardCount}).`);
  assert((await frame.locator(".duduq-dd2-item .duduq-dd2-item-audio").count()) === 0, `${label}: botão de áudio ficou aninhado dentro do botão de resposta.`);

  const cardState = await cards.evaluateAll((nodes) => nodes.map((node) => ({
    id: node.getAttribute("data-dd2-item-id"),
    aria: node.getAttribute("aria-label") || "",
    audioStandard: node.classList.contains("duduq-audio-standard")
  })));
  const audioState = await audioButtons.evaluateAll((nodes) => nodes.map((node) => ({
    id: node.getAttribute("data-dd2-audio-item-id"),
    aria: node.getAttribute("aria-label") || "",
    disabled: Boolean(node.disabled),
    playing: node.getAttribute("data-playing") === "true"
  })));

  for (const card of cardState) {
    assert(!/(ouvir|áudio|audio|escut|som)/i.test(card.aria), `${label}/${card.id}: card de resposta ainda se anuncia como controle de áudio (${card.aria}).`);
    assert(card.audioStandard === false, `${label}/${card.id}: card de resposta foi classificado como botão de áudio.`);
  }
  for (const control of audioState) {
    assert(/^(Ouvir|Parar)/i.test(control.aria), `${label}/${control.id}: controle auditivo sem nome acessível (${control.aria}).`);
    assert(!control.disabled, `${label}/${control.id}: controle auditivo iniciou desabilitado.`);
  }

  const confirm = frame.locator(".duduq-dd2-confirm");
  await confirm.waitFor({ state: "visible", timeout: 8_000 });
  assert(await confirm.isDisabled(), `${label}: CONFIRMAR deveria iniciar desabilitado.`);
  assert((await target.locator(".duduq-dd2-item").count()) === 0, `${label}: destino iniciou preenchido.`);

  await audioButtons.nth(0).click();
  await frame.waitForTimeout(100);
  assert((await target.locator(".duduq-dd2-item").count()) === 0, `${label}: ouvir a primeira alternativa moveu um card.`);
  assert(await confirm.isDisabled(), `${label}: ouvir a primeira alternativa habilitou CONFIRMAR.`);
  assert(!(await audioButtons.nth(1).isDisabled()), `${label}: segunda alternativa ficou bloqueada durante o primeiro áudio.`);

  const firstWasPlaying = await audioButtons.nth(0).getAttribute("data-playing") === "true";
  await audioButtons.nth(1).click();
  await frame.waitForTimeout(100);
  const playingAfterSwitch = await audioButtons.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-playing") === "true"));
  assert(playingAfterSwitch.filter(Boolean).length <= 1, `${label}: mais de um áudio permaneceu ativo.`);
  if (firstWasPlaying && playingAfterSwitch.some(Boolean)) {
    assert(playingAfterSwitch[0] === false, `${label}: primeiro áudio não foi interrompido ao acionar o segundo.`);
  }
  assert((await target.locator(".duduq-dd2-item").count()) === 0, `${label}: trocar áudio moveu um card.`);
  assert(await confirm.isDisabled(), `${label}: trocar áudio habilitou CONFIRMAR.`);

  if (await audioButtons.nth(1).getAttribute("data-playing") === "true") {
    await audioButtons.nth(1).click();
    await frame.waitForTimeout(80);
  }

  return { cardCount, audioCount, cardState, audioState, firstWasPlaying, playingAfterSwitch };
}

async function installAudioTrace(frame) {
  await frame.evaluate(() => {
    if (window.__DUDUQ_QA_AUDIO_TRACE_INSTALLED__) {
      window.__DUDUQ_QA_AUDIO_TRACE__.length = 0;
      return;
    }

    window.__DUDUQ_QA_AUDIO_TRACE__ = [];
    window.__DUDUQ_QA_AUDIO_TRACE_INSTALLED__ = true;
    const push = (entry) => {
      window.__DUDUQ_QA_AUDIO_TRACE__.push({
        at: Math.round(performance.now()),
        ...entry
      });
    };
    const mediaState = (media) => ({
      src: media?.currentSrc || media?.src || "",
      paused: Boolean(media?.paused),
      ended: Boolean(media?.ended),
      readyState: Number(media?.readyState ?? -1),
      currentTime: Number(media?.currentTime || 0)
    });

    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      push({
        kind: "media.play-call",
        userActivation: navigator.userActivation ? {
          isActive: navigator.userActivation.isActive,
          hasBeenActive: navigator.userActivation.hasBeenActive
        } : null,
        ...mediaState(this)
      });
      let result;
      try {
        result = originalPlay.apply(this, args);
      } catch (error) {
        push({ kind: "media.play-throw", name: error?.name || "Error", message: error?.message || String(error), ...mediaState(this) });
        throw error;
      }
      if (result?.then) {
        result.then(() => {
          push({ kind: "media.play-resolve", ...mediaState(this) });
        }).catch((error) => {
          push({ kind: "media.play-reject", name: error?.name || "Error", message: error?.message || String(error), ...mediaState(this) });
        });
      }
      return result;
    };

    ["play", "playing", "pause", "ended", "error", "canplay"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (event.target instanceof HTMLMediaElement) {
          push({ kind: `media.event.${type}`, ...mediaState(event.target) });
        }
      }, true);
    });

    if (window.speechSynthesis && typeof window.speechSynthesis.speak === "function") {
      const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = function (utterance) {
        push({
          kind: "speech.speak-call",
          text: String(utterance?.text || ""),
          lang: String(utterance?.lang || ""),
          userActivation: navigator.userActivation ? {
            isActive: navigator.userActivation.isActive,
            hasBeenActive: navigator.userActivation.hasBeenActive
          } : null
        });
        return originalSpeak(utterance);
      };
    }
  });
}

async function clearAudioTrace(frame) {
  await frame.evaluate(() => {
    if (Array.isArray(window.__DUDUQ_QA_AUDIO_TRACE__)) window.__DUDUQ_QA_AUDIO_TRACE__.length = 0;
  });
}

async function dragCard(page, source, target, label) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(sourceBox && targetBox, `${label}: não foi possível medir origem/destino para o arraste.`);

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + Math.min(targetBox.height * 0.72, targetBox.height - 16);

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 10, sy + 6, { steps: 3 });
  await page.mouse.move(tx, ty, { steps: 14 });
  await page.mouse.up();
}

async function placeChoice(page, source, target, itemId, mode, label) {
  if (mode === "desktop") {
    await dragCard(page, source, target, `${label}/${itemId}`);
  } else {
    await source.tap();
  }
  await target.locator(`.duduq-dd2-item[data-dd2-item-id="${itemId}"]`).waitFor({ state: "visible", timeout: 5_000 });
}

async function assertPlacedAutoplay(target, itemId, label) {
  const replay = target.locator(`.duduq-dd2-placed-replay[data-dd2-placed-replay-item-id="${itemId}"]`).first();
  await replay.waitFor({ state: "visible", timeout: 5_000 });
  const result = await target.evaluate(async (node, id) => {
    const selector = `.duduq-dd2-placed-replay[data-dd2-placed-replay-item-id="${CSS.escape(id)}"]`;
    const deadline = performance.now() + 1600;
    while (performance.now() < deadline) {
      const control = node.querySelector(selector);
      if (control?.getAttribute("data-dd2-replay-playing") === "true") {
        return { observed: true, trace: (window.__DUDUQ_QA_AUDIO_TRACE__ || []).slice(-30) };
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const control = node.querySelector(selector);
    return {
      observed: false,
      replayPlaying: control?.getAttribute("data-dd2-replay-playing") || null,
      replayAria: control?.getAttribute("aria-label") || null,
      trace: (window.__DUDUQ_QA_AUDIO_TRACE__ || []).slice(-30)
    };
  }, itemId);
  if (!result.observed) {
    console.log(`[placement-autoplay-trace] ${label}/${itemId} ${JSON.stringify(result, null, 2)}`);
  }
  assert(result.observed, `${label}/${itemId}: áudio da alternativa não iniciou automaticamente ao entrar na lacuna. trace=${JSON.stringify(result.trace)}`);
  return result.observed;
}

async function runScenario(browser, mode, viewport) {
  const context = await browser.newContext({
    viewport,
    isMobile: mode === "mobile",
    hasTouch: mode === "mobile"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await bootModule(page);
    const { frame, target, info } = await findListeningStep(page);
    const bridge = await page.evaluate(() => ({
      version: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__?.version || null,
      captured: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_CAPTURED__ === true,
      separated: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__?.separatedAudioAndAnswerActions === true,
      audioSwitch: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__?.alternativeAudioSwitchEnabled === true,
      tapFallback: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__?.tapToPlaceFallbackPreserved === true,
      placementAutoplay: window.__DUDUQ_YEAR2_DD_PLACEMENT_AUTOPLAY_BRIDGE__ || null,
      release: window.DuduQ?.getMechanic?.("drag-drop")?.version || null
    }));

    assert(bridge.captured && bridge.separated && bridge.audioSwitch && bridge.tapFallback, `${mode}: bridge de separação não está ativo: ${JSON.stringify(bridge)}`);
    assert(bridge.placementAutoplay?.selectedChoicePlacementAutoPlaysAudioOnce === true, `${mode}: bridge de autoplay de placement não está ativo: ${JSON.stringify(bridge)}`);
    assert(bridge.placementAutoplay?.usesNativeSelectedReplay === true, `${mode}: autoplay não reutiliza o replay nativo selecionado.`);
    assert(bridge.placementAutoplay?.usesNativeForceRestartTriggerForTap === true, `${mode}: autoplay por toque não usa o gatilho nativo de force restart.`);
    assert(bridge.placementAutoplay?.avoidsDoublePlayWhenNativeDropAlreadyPlaying === true, `${mode}: autoplay não declara proteção contra áudio duplicado no drop.`);
    assert(bridge.placementAutoplay?.autoplaySources === "drop-native+tap-force-restart", `${mode}: fontes de autoplay inesperadas: ${bridge.placementAutoplay?.autoplaySources}`);
    assert(bridge.release === "2.0.22", `${mode}: release Drag & Drop mudou para ${bridge.release}.`);

    const centralBefore = await assertCentralImage(target, `${mode}/${info.questionId}`);
    const controls = await assertSeparatedControls(frame, target, `${mode}/${info.questionId}`);
    await installAudioTrace(frame);

    const cards = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
    const ids = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-dd2-item-id")).filter(Boolean));
    assert(ids.includes(info.correctSource), `${mode}/${info.questionId}: gabarito não está entre os cards.`);
    const wrongId = ids.find((id) => id !== info.correctSource);
    assert(wrongId, `${mode}/${info.questionId}: distrator não encontrado.`);

    let confirm = frame.locator(".duduq-dd2-confirm");
    const wrong = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).first();
    await clearAudioTrace(frame);
    await placeChoice(page, wrong, target, wrongId, mode, `${mode}/${info.questionId}`);
    const wrongAutoplay = await assertPlacedAutoplay(target, wrongId, `${mode}/${info.questionId}`);
    assert(!(await confirm.isDisabled()), `${mode}/${info.questionId}: CONFIRMAR não habilitou após responder.`);

    await confirm.click();
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"][data-wrong="true"]`).waitFor({ state: "visible", timeout: 2_500 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${mode}-${info.questionId}-wrong.png`), fullPage: false });
    await frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "visible", timeout: 4_000 });

    const correct = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${info.correctSource}"]`).first();
    await clearAudioTrace(frame);
    await placeChoice(page, correct, target, info.correctSource, mode, `${mode}/${info.questionId}`);
    const correctAutoplay = await assertPlacedAutoplay(target, info.correctSource, `${mode}/${info.questionId}`);
    const centralAfter = await assertCentralImage(target, `${mode}/${info.questionId} após resposta`);
    assert(centralAfter.src === centralBefore.src, `${mode}/${info.questionId}: imagem central mudou após o drop.`);

    confirm = frame.locator(".duduq-dd2-confirm");
    assert(!(await confirm.isDisabled()), `${mode}/${info.questionId}: CONFIRMAR não habilitou na tentativa correta.`);
    await confirm.click();
    await frame.locator('.duduq-engine-feedback[data-state="success"]').first().waitFor({ state: "visible", timeout: 4_000 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${mode}-${info.questionId}-success.png`), fullPage: false });

    assert(pageErrors.length === 0, `${mode}: erros de página: ${pageErrors.join(" | ")}`);
    return {
      mode,
      questionId: info.questionId,
      correctId: info.correctSource,
      wrongId,
      placementMode: mode === "desktop" ? "pointer-drag" : "touch-tap-fallback",
      wrongAutoplay,
      correctAutoplay,
      bridge,
      controls,
      centralBefore,
      centralAfter
    };
  } finally {
    await context.close();
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await runScenario(browser, "desktop", { width: 1366, height: 768 });
  const mobile = await runScenario(browser, "mobile", { width: 390, height: 844 });
  const report = {
    status: "PASS",
    contract: "YEAR2_DD_LISTENING_AUDIO_ACTION_SEPARATION_RC1",
    desktop,
    mobile
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
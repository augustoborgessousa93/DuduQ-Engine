import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("test-results/year2-multimodal-consistency-rc1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function key(module) {
  return `module${String(module).padStart(2, "0")}v23multimodal`;
}
function url(module) {
  const mm = String(module).padStart(2, "0");
  return `${BASE_URL}/content/english/year-2/module-${mm}/index.html?qa=listening-association-rc1`;
}

async function bootModule(page, module) {
  await page.goto(url(module), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(({ moduleKey, moduleNumber }) => {
    const built = window.DUDUQ_CONTENT?.english?.year2?.[moduleKey];
    return Boolean(built?.module === moduleNumber && built?.activities?.length && window.DuduQ && window.DuduQIntro);
  }, { moduleKey: key(module), moduleNumber: module }, { timeout: 30_000 });

  const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
  const started = await page.evaluate((moduleNumber) => window.DuduQ?.getSession?.()?.module === moduleNumber, module);
  if (!started) {
    await start.waitFor({ state: "visible", timeout: 20_000 });
    await start.click();
  }
  await page.waitForFunction((moduleNumber) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session?.module === moduleNumber && session.totalSteps > 0 && !session.transitioning);
  }, module, { timeout: 25_000 });
  await page.waitForTimeout(100);
}

async function currentFrame(page) {
  const iframe = page.locator("#root iframe").first();
  await iframe.waitFor({ state: "attached", timeout: 15_000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  assert(frame, "Iframe da mecânica não ficou acessível.");
  return { iframe, frame };
}

async function waitStep(page, expectedIndex) {
  await page.waitForFunction((index) => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session && !session.transitioning && session.stepIndex === index);
  }, expectedIndex, { timeout: 12_000 });
  await page.waitForTimeout(100);
}

async function advance(page) {
  const before = await page.evaluate(() => window.DuduQ?.getSession?.()?.stepIndex ?? -1);
  const total = await page.evaluate(() => window.DuduQ?.getSession?.()?.totalSteps ?? 0);
  assert(before >= 0 && before < total, `Etapa inválida antes do avanço: ${before}/${total}.`);
  await page.evaluate(() => window.DuduQ.next({ qaSkip: true }));
  if (before + 1 >= total) return false;
  await waitStep(page, before + 1);
  return true;
}

async function activeActivityInfo(page, module) {
  return page.evaluate(({ moduleKey }) => {
    const built = window.DUDUQ_CONTENT.english.year2[moduleKey];
    const session = window.DuduQ.getSession();
    const activity = built.activities[session.stepIndex] || null;
    const single = activity?.questions?.find((question) => question?.metadata?.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES") || null;
    return {
      stepIndex: session.stepIndex,
      totalSteps: session.totalSteps,
      activityId: activity?.id || null,
      activityMechanic: activity?.mechanic || null,
      correctSource: single?.answer?.value?.[0]?.source || null,
      questionId: single?.id || null,
      optionPresentation: single?.metadata?.optionPresentation || null,
      pedagogicalModality: single?.metadata?.pedagogicalModality || null,
      sourceAlternatives: single?.metadata?.sourceAlternativesV23 || [],
      centralVisualAsset: single?.metadata?.listeningAssociation?.centralVisualAsset || null,
      primaryAudioReady: single?.metadata?.listeningAssociation?.primaryAudioReady === true,
      alternativeAudioModel: (single?.alternatives || []).map((alternative) => ({
        id: alternative?.id || null,
        text: alternative?.text || null,
        audio: alternative?.audio || null,
        spokenText: alternative?.spokenText || null,
        speechLocale: alternative?.speechLocale || null,
        audioDescription: alternative?.audioDescription || null,
        metadataAudioAlias: alternative?.metadata?.audioCompatibilityAliasesReady === true
      }))
    };
  }, { moduleKey: key(module) });
}

async function findListeningTarget(page, module) {
  const total = await page.evaluate(() => window.DuduQ.getSession().totalSteps);
  for (let attempt = 0; attempt < total; attempt += 1) {
    const info = await activeActivityInfo(page, module);
    const { frame } = await currentFrame(page);
    const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
    if (info.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES" && await target.isVisible().catch(() => false)) {
      assert(info.correctSource, `M${module}: listening association ativo sem gabarito estrutural em ${info.activityId}.`);
      return { frame, target, info };
    }
    if (!(await advance(page))) break;
  }
  throw new Error(`M${module}: nenhum Drag & Drop listening association ativo foi encontrado.`);
}

async function assertCentralImage(target, label) {
  const images = target.locator("img");
  const count = await images.count();
  assert(count >= 1, `${label}: card central sem imagem.`);
  const state = await images.first().evaluate((image) => ({
    src: image.currentSrc || image.src || "",
    complete: Boolean(image.complete),
    naturalWidth: Number(image.naturalWidth || 0),
    naturalHeight: Number(image.naturalHeight || 0),
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height
  }));
  assert(state.complete && state.naturalWidth > 0 && state.naturalHeight > 0, `${label}: imagem central não carregou.`);
  assert(state.width > 24 && state.height > 24, `${label}: imagem central carregou sem presença visual útil.`);
  return state;
}

async function assertStableVisibleImageSet(frame, selector, label) {
  try {
    await frame.waitForFunction((cssSelector) => {
      const nodes = Array.from(document.querySelectorAll(cssSelector));
      const visible = nodes.filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const opacity = Number.parseFloat(style.opacity || "1");
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number.isFinite(opacity) &&
          opacity > 0.01
        );
      });
      if (!visible.length) return false;
      const sources = visible.map((node) => node.currentSrc || node.src || "");
      const loaded = visible.every((node) => Boolean(node.complete && Number(node.naturalWidth || 0) > 0 && Number(node.naturalHeight || 0) > 0));
      return loaded && sources.every(Boolean) && new Set(sources).size === sources.length;
    }, selector, { timeout: 3_500 });
  } catch (_) {
    // Detailed assertion below reports the settled DOM state instead of masking the failure.
  }

  const state = await frame.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const opacity = Number.parseFloat(style.opacity || "1");
    return {
      complete: Boolean(node.complete),
      naturalWidth: Number(node.naturalWidth || 0),
      naturalHeight: Number(node.naturalHeight || 0),
      src: node.currentSrc || node.src || "",
      visible: (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.isFinite(opacity) &&
        opacity > 0.01
      ),
      width: rect.width,
      height: rect.height,
      opacity: style.opacity
    };
  }));

  const visible = state.filter((item) => item.visible);
  assert(visible.length > 0, `${label}: nenhuma imagem visível após estabilização. STATE=${JSON.stringify(state)}`);
  assert(
    visible.every((item) => item.complete && item.naturalWidth > 0 && item.naturalHeight > 0 && item.src),
    `${label}: imagem quebrada após estabilização. STATE=${JSON.stringify(visible)}`
  );
  assert(
    new Set(visible.map((item) => item.src)).size === visible.length,
    `${label}: imagem repetida após estabilização. STATE=${JSON.stringify(visible)}`
  );
  return visible;
}

async function runtimeAudioDebug(frame, info) {
  return frame.evaluate((parentInfo) => {
    let parsed = null;
    let parseError = null;
    const raw = document.querySelector('#targetShooterConfig')?.textContent || '';
    try { parsed = raw ? JSON.parse(raw) : null; } catch (error) { parseError = error?.message || String(error); }
    const stages = Array.isArray(parsed?.stages) ? parsed.stages : [];
    const stage = stages.find((entry) => entry?.id === parentInfo.questionId) || stages[0] || null;
    return {
      questionId: parentInfo.questionId,
      parentAlternativeAudioModel: parentInfo.alternativeAudioModel,
      configKeys: parsed ? Object.keys(parsed) : [],
      stage: stage ? {
        id: stage.id,
        strategy: stage.strategy,
        items: (stage.items || []).map((item) => ({
          id: item.id,
          label: item.label,
          audioAssetKey: item.audioAssetKey || null,
          spokenText: item.spokenText || null,
          speechLocale: item.speechLocale || null,
          audioDescription: item.audioDescription || null,
          imageAssetKey: item.imageAssetKey || null,
          required: item.required,
          targetId: item.targetId || null
        })),
        targets: (stage.targets || []).map((target) => ({ id: target.id, imageAssetKey: target.imageAssetKey || null, alt: target.alt || null }))
      } : null,
      parseError,
      bankItems: Array.from(document.querySelectorAll('.duduq-dd2-bank .duduq-dd2-item')).map((node) => ({
        id: node.getAttribute('data-dd2-item-id'),
        text: String(node.innerText || '').trim(),
        html: node.parentElement?.outerHTML?.slice(0, 1600) || node.outerHTML.slice(0, 1600),
        buttons: Array.from((node.parentElement || node).querySelectorAll('button')).map((button) => ({
          className: button.className,
          ariaLabel: button.getAttribute('aria-label'),
          disabled: button.disabled,
          dataPlaying: button.getAttribute('data-playing')
        }))
      }))
    };
  }, info);
}

async function assertAudioAlternativeContract(frame, info, label) {
  const bankItems = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
  const count = await bankItems.count();
  assert(count >= 2 && count <= 4, `${label}: esperado 2–4 alternativas, encontrado ${count}.`);
  assert((await bankItems.locator("img").count()) === 0, `${label}: alternativas continuam imagem-primárias.`);

  const audioButtons = frame.locator(".duduq-dd2-bank .duduq-dd2-item-audio");
  const audioCount = await audioButtons.count();
  if (audioCount !== count) {
    const debug = await runtimeAudioDebug(frame, info);
    throw new Error(`${label}: nem toda alternativa possui controle de áudio (${audioCount}/${count}). RUNTIME_AUDIO_DEBUG=${JSON.stringify(debug)}`);
  }

  try {
    await frame.waitForFunction((expectedCount) => {
      const buttons = Array.from(document.querySelectorAll('.duduq-dd2-bank .duduq-dd2-item-audio'));
      return buttons.length === expectedCount && buttons.every((button) => (
        button.disabled === false && button.getAttribute('aria-disabled') !== 'true'
      ));
    }, count, { timeout: 2_500 });
  } catch (_) {
    const debug = await runtimeAudioDebug(frame, info);
    throw new Error(`${label}: controles de áudio não estabilizaram habilitados. RUNTIME_AUDIO_DEBUG=${JSON.stringify(debug)}`);
  }

  const visibleText = await bankItems.evaluateAll((nodes) => nodes.map((node) => String(node.innerText || "").trim().replace(/\s+/g, " ")));
  const sourceWords = (info.sourceAlternatives || []).map((value) => String(value).trim()).filter(Boolean);
  for (const source of sourceWords) {
    assert(!visibleText.some((text) => text === source || text.includes(source)), `${label}: resposta escrita ficou visível antes da resolução: ${source}`);
  }

  for (let index = 0; index < count; index += 1) {
    const aria = String(await audioButtons.nth(index).getAttribute("aria-label") || "");
    assert(/^(Ouvir|Parar)/i.test(aria), `${label}: controle ${index + 1} sem rótulo auditivo acessível: ${aria}`);
    assert(!(await audioButtons.nth(index).isDisabled()), `${label}: áudio da alternativa ${index + 1} iniciou desabilitado.`);
  }

  await audioButtons.nth(0).click();
  await frame.waitForTimeout(80);
  assert(!(await audioButtons.nth(1).isDisabled()), `${label}: outro áudio ficou bloqueado enquanto uma opção tocava.`);
  const firstWasPlaying = await audioButtons.nth(0).getAttribute("data-playing") === "true";
  await audioButtons.nth(1).click();
  await frame.waitForTimeout(80);
  const playingStates = await audioButtons.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-playing") === "true"));
  assert(playingStates.filter(Boolean).length <= 1, `${label}: mais de um áudio ficou marcado como ativo simultaneamente.`);
  if (firstWasPlaying && playingStates.some(Boolean)) {
    assert(playingStates[0] === false, `${label}: o primeiro áudio não foi interrompido ao acionar o segundo.`);
  }

  return { count, audioCount, visibleText, firstWasPlaying, playingStates };
}

async function exerciseListeningAssociation(browser, viewport, name) {
  const context = await browser.newContext({ viewport, isMobile: name === "mobile", hasTouch: name === "mobile" });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await bootModule(page, 1);
    const { frame, target, info } = await findListeningTarget(page, 1);

    const bridge = await page.evaluate(() => ({
      declared: Boolean(window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__),
      captured: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_CAPTURED__ === true,
      audioSwitch: window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__?.alternativeAudioSwitchEnabled === true,
      mechanicVersion: window.DuduQ?.getMechanic?.("drag-drop")?.version || null
    }));
    assert(bridge.declared && bridge.captured, `${name}: ponte DD2 não foi capturada corretamente.`);
    assert(bridge.audioSwitch, `${name}: troca entre áudios não está declarada.`);
    assert(bridge.mechanicVersion === "2.0.22", `${name}: hotfix alterou release ativo (${bridge.mechanicVersion}).`);
    assert(info.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES", `${name}/${info.questionId}: apresentação final incorreta.`);
    assert(info.pedagogicalModality === "LISTENING_IMAGE_AUDIO_ASSOCIATION", `${name}/${info.questionId}: modalidade final incorreta.`);
    assert(info.primaryAudioReady, `${name}/${info.questionId}: áudio principal não está pronto.`);

    const centralImage = await assertCentralImage(target, `${name}/${info.questionId}`);
    const audioContract = await assertAudioAlternativeContract(frame, info, `${name}/${info.questionId}`);

    const bankItems = frame.locator(".duduq-dd2-bank .duduq-dd2-item");
    const ids = await bankItems.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-dd2-item-id")).filter(Boolean));
    assert(ids.includes(info.correctSource), `${name}/${info.questionId}: alternativa correta não está na bolsa.`);
    const wrongId = ids.find((id) => id !== info.correctSource);
    assert(wrongId, `${name}/${info.questionId}: alternativa errada não encontrada.`);

    let confirm = frame.locator(".duduq-dd2-confirm");
    await confirm.waitFor({ state: "visible", timeout: 8_000 });
    assert(await confirm.isDisabled(), `${name}/${info.questionId}: CONFIRMAR deveria iniciar desabilitado.`);

    const wrong = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).first();
    await wrong.click({ position: { x: 20, y: 20 } });
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "visible", timeout: 4_000 });
    assert(!(await confirm.isDisabled()), `${name}/${info.questionId}: CONFIRMAR não habilitou com resposta errada.`);

    await confirm.click();
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${wrongId}"][data-wrong="true"]`).waitFor({ state: "visible", timeout: 2_500 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-${info.questionId}-listening-wrong.png`), fullPage: false });

    await frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${wrongId}"]`).waitFor({ state: "visible", timeout: 3_500 });
    await frame.waitForFunction((id) => !document.querySelector(`.duduq-dd2-target .duduq-dd2-item[data-dd2-item-id="${id}"]`), wrongId, { timeout: 3_500 });

    const correct = frame.locator(`.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="${info.correctSource}"]`).first();
    await correct.click({ position: { x: 20, y: 20 } });
    await target.locator(`.duduq-dd2-item[data-dd2-item-id="${info.correctSource}"]`).waitFor({ state: "visible", timeout: 4_000 });
    await assertCentralImage(target, `${name}/${info.questionId} após drop`);
    confirm = frame.locator(".duduq-dd2-confirm");
    await confirm.waitFor({ state: "visible", timeout: 4_000 });
    assert(!(await confirm.isDisabled()), `${name}/${info.questionId}: CONFIRMAR não reapareceu na nova tentativa.`);
    await confirm.click();
    await frame.locator('.duduq-engine-feedback[data-state="success"]').first().waitFor({ state: "visible", timeout: 4_000 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}-${info.questionId}-listening-correct.png`), fullPage: false });

    assert(errors.length === 0, `${name}: erros de página: ${errors.join(" | ")}`);
    return { name, questionId: info.questionId, wrongId, correctId: info.correctSource, bridge, centralImage, audioContract };
  } finally {
    await context.close();
  }
}

async function visualSmokeAllModules(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const report = [];
  try {
    for (let module = 1; module <= 6; module += 1) {
      const page = await context.newPage();
      page.setDefaultTimeout(18_000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let listeningSteps = 0;
      try {
        await bootModule(page, module);
        const total = await page.evaluate(() => window.DuduQ.getSession().totalSteps);
        for (let step = 0; step < total; step += 1) {
          const info = await activeActivityInfo(page, module);
          const { frame } = await currentFrame(page);

          if (info.optionPresentation === "LISTENING_ASSOCIATION_AUDIO_CHOICES") {
            listeningSteps += 1;
            const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]').first();
            await target.waitFor({ state: "visible", timeout: 8_000 });
            await assertCentralImage(target, `M${module}/step${step}`);
            await assertAudioAlternativeContract(frame, info, `M${module}/step${step}`);
          }

          const bubbleImages = frame.locator(".duduq-bp-media");
          if (await bubbleImages.count()) {
            await assertStableVisibleImageSet(frame, ".duduq-bp-media", `M${module}/step${step}: Bubble Pop`);
          }

          const targetImages = frame.locator(".duduq-ts-target img");
          if (await targetImages.count()) {
            await assertStableVisibleImageSet(frame, ".duduq-ts-target img", `M${module}/step${step}: Target Shooter`);
          }

          if (step + 1 < total) await advance(page);
        }
        assert(errors.length === 0, `M${module}: erros de página: ${errors.join(" | ")}`);
        report.push({ module, totalSteps: total, listeningSteps });
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
  return report;
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await exerciseListeningAssociation(browser, { width: 1366, height: 768 }, "desktop");
  const mobile = await exerciseListeningAssociation(browser, { width: 390, height: 844 }, "mobile");
  const modules = await visualSmokeAllModules(browser);
  const report = {
    status: "PASS",
    contract: "YEAR2_LISTENING_IMAGE_AUDIO_ASSOCIATION_AND_CONFIRM_ANY",
    desktop,
    mobile,
    modules
  };
  await fs.writeFile(path.join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const URL = `${BASE_URL}/content/english/year-2/module-03/index.html`;
const RESULTS = "test-results/single-target-choice-2.0.23";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function boot(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(
    () => window.DuduQDD23SingleTargetRuntimePatch?.ready === true && window.DuduQYear2M03SingleTargetVisualPolish?.ready === true,
    null,
    { timeout: 20_000 }
  );
  const start = page.locator(".duduq-intro-start-button");
  try {
    await start.waitFor({ state: "visible", timeout: 12_000 });
    await start.click();
  } catch (_) {}

  const frame = page.frameLocator('iframe[title="DuduQ — Drag & Drop"]');
  const target = frame.locator('.duduq-dd2-target[data-single-target-choice="true"]');
  await target.waitFor({ state: "visible", timeout: 35_000 });
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-duduq-initial-speech-gate"),
    null,
    { timeout: 10_000 }
  );
  const choiceA = frame.locator('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="opt-1"]').first();
  await choiceA.waitFor({ state: "visible", timeout: 5_000 });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await choiceA.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(50);
  }
  assert(await choiceA.isEnabled(), "Alternativa A não ficou habilitada após o gate inicial.");
  await page.waitForTimeout(350);
  return { frame, target, choiceA };
}

async function visibleRect(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const area = Math.max(1, rect.width * rect.height);
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      visibleWidth,
      visibleHeight,
      visibleRatio: (visibleWidth * visibleHeight) / area,
      display: style.display,
      visibility: style.visibility,
      opacity: Number(style.opacity)
    };
  });
}

async function hostVisibleIframeRect(iframe) {
  return iframe.evaluate((element) => {
    const iframeRect = element.getBoundingClientRect();
    let visibleLeft = Math.max(0, iframeRect.left);
    let visibleTop = Math.max(0, iframeRect.top);
    let visibleRight = Math.min(window.innerWidth, iframeRect.right);
    let visibleBottom = Math.min(window.innerHeight, iframeRect.bottom);
    const clippingAncestors = [];

    let node = element.parentElement;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const clipsX = /(hidden|clip|auto|scroll)/.test(`${style.overflowX} ${style.overflow}`);
      const clipsY = /(hidden|clip|auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
      if (clipsX || clipsY) {
        const rect = node.getBoundingClientRect();
        if (clipsX) {
          visibleLeft = Math.max(visibleLeft, rect.left);
          visibleRight = Math.min(visibleRight, rect.right);
        }
        if (clipsY) {
          visibleTop = Math.max(visibleTop, rect.top);
          visibleBottom = Math.min(visibleBottom, rect.bottom);
        }
        clippingAncestors.push({
          tag: node.tagName,
          className: node.className || null,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          top: rect.top,
          bottom: rect.bottom
        });
      }
      node = node.parentElement;
    }

    return {
      iframeTop: iframeRect.top,
      iframeBottom: iframeRect.bottom,
      iframeHeight: iframeRect.height,
      visibleLeft,
      visibleTop,
      visibleRight,
      visibleBottom,
      visibleHeight: Math.max(0, visibleBottom - visibleTop),
      clippingAncestors
    };
  });
}

async function scenario(browser, name, viewport, minimumChoiceWidth, expectedShortHost) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const { frame, target, choiceA } = await boot(page);
  const bank = frame.locator(".duduq-dd2-bank");
  const confirm = frame.locator(".duduq-dd2-confirm");
  const iframe = page.locator('iframe[title="DuduQ — Drag & Drop"]');

  assert(await frame.locator("#duduq-m03-single-target-choice-visual-polish").count() === 1, `${name}: CSS de homologação não foi injetado no iframe.`);
  const shortHostMode = await frame.locator("html").getAttribute("data-duduq-host-short-viewport");
  assert(shortHostMode === (expectedShortHost ? "true" : "false"), `${name}: modo de viewport host incorreto (${shortHostMode}).`);

  const targetBox = await target.boundingBox();
  const bankBox = await bank.boundingBox();
  const choiceBox = await choiceA.boundingBox();
  const image = target.locator(".duduq-dd2-target-head img").first();
  await image.waitFor({ state: "visible", timeout: 5_000 });
  const imageBox = await image.boundingBox();
  const zone = target.locator(".duduq-dd2-zone");
  const zoneBox = await zone.boundingBox();

  assert(targetBox && bankBox && choiceBox && imageBox && zoneBox, `${name}: elementos principais não são mensuráveis.`);
  assert(targetBox.x < bankBox.x, `${name}: target e alternativas deixaram de ficar lado a lado.`);
  assert(choiceBox.width >= minimumChoiceWidth, `${name}: alternativa continua estreita (${Math.round(choiceBox.width)}px).`);
  assert(choiceBox.height >= 58, `${name}: alternativa continua baixa (${Math.round(choiceBox.height)}px).`);
  assert(imageBox.width >= 125 && imageBox.height >= 95, `${name}: imagem principal continua pequena (${Math.round(imageBox.width)}x${Math.round(imageBox.height)}).`);
  assert(zoneBox.height <= 135, `${name}: área SOLTE AQUI ainda ocupa espaço excessivo (${Math.round(zoneBox.height)}px).`);

  const label = (await choiceA.innerText()).trim();
  assert(!/🔊/.test(label), `${name}: rótulo ainda duplica o glyph de áudio (${label}).`);

  await choiceA.click();
  await target.locator('.duduq-dd2-item[data-dd2-item-id="opt-1"]').waitFor({ state: "visible", timeout: 3_000 });
  assert(!(await confirm.isDisabled()), `${name}: CONFIRMAR não habilitou após seleção.`);

  const confirmVisible = await visibleRect(confirm);
  const hostIframe = await hostVisibleIframeRect(iframe);
  assert(confirmVisible.display !== "none" && confirmVisible.visibility !== "hidden" && confirmVisible.opacity > 0, `${name}: CONFIRMAR existe, mas não está visualmente renderizado.`);

  // Frame-local visibility is necessary but not sufficient: the host can clip a taller iframe.
  assert(
    confirmVisible.bottom <= confirmVisible.viewportHeight - 2 && confirmVisible.visibleRatio >= 0.98,
    `${name}: CONFIRMAR está recortado dentro do próprio iframe (${Math.round(confirmVisible.bottom)}/${Math.round(confirmVisible.viewportHeight)}, ${(confirmVisible.visibleRatio * 100).toFixed(1)}%).`
  );

  const confirmPageTop = hostIframe.iframeTop + confirmVisible.top;
  const confirmPageBottom = hostIframe.iframeTop + confirmVisible.bottom;
  assert(
    confirmPageBottom <= hostIframe.visibleBottom - 2,
    `${name}: CONFIRMAR passa no iframe, mas é cortado pelo host (${Math.round(confirmPageBottom)} > ${Math.round(hostIframe.visibleBottom - 2)}). Ancestors=${JSON.stringify(hostIframe.clippingAncestors)}`
  );
  assert(
    confirmPageTop >= hostIframe.visibleTop - 2,
    `${name}: topo do CONFIRMAR ficou acima da área visível do host (${Math.round(confirmPageTop)} < ${Math.round(hostIframe.visibleTop)}).`
  );

  await page.screenshot({ path: `${RESULTS}/${name}-selected.png`, fullPage: false });
  console.log(
    `PASS — ${name}: shortHost=${shortHostMode}, choice=${Math.round(choiceBox.width)}x${Math.round(choiceBox.height)}, ` +
    `image=${Math.round(imageBox.width)}x${Math.round(imageBox.height)}, zone=${Math.round(zoneBox.height)}, ` +
    `confirmLocal=${Math.round(confirmVisible.top)}-${Math.round(confirmVisible.bottom)}/${Math.round(confirmVisible.viewportHeight)}, ` +
    `confirmPage=${Math.round(confirmPageTop)}-${Math.round(confirmPageBottom)}, hostVisibleBottom=${Math.round(hostIframe.visibleBottom)}`
  );
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await scenario(browser, "notebook-1280x650", { width: 1280, height: 650 }, 210, true);
  await scenario(browser, "tablet-1024x768", { width: 1024, height: 768 }, 185, false);
  console.log("PASS — visual breakpoints notebook + tablet with host clipping guard");
} finally {
  await browser.close();
}

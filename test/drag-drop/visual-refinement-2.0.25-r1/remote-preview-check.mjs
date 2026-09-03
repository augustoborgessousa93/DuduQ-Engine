import { chromium } from "playwright";

const sha = String(process.env.GITHUB_SHA || "").trim();
if (!/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error(`GITHUB_SHA inválido: ${sha || "<vazio>"}`);
}

const url = `https://rawcdn.githack.com/augustoborgessousa93/DuduQ-Engine/${sha}/test/drag-drop/visual-refinement-2.0.25-r1/index.html`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(String(error?.stack || error)));

try {
  let response = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (response && response.status() === 200) break;
      lastError = new Error(`HTTP ${response?.status() ?? "sem resposta"}`);
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(5000);
  }
  if (!response || response.status() !== 200) {
    throw lastError || new Error("Preview remoto não respondeu HTTP 200.");
  }

  await page.waitForFunction(() => {
    const visual = window.DD225VisualRefinementR1?.version;
    const mechanic = window.dd225vrMechanic?.()?.version;
    const iframe = document.querySelector("#mount iframe");
    return visual === "2.0.25-visual-r1" && mechanic === "2.0.25" && Boolean(iframe);
  }, null, { timeout: 30000 });

  const title = await page.title();
  if (!title.includes("Drag & Drop 2.0.25 Visual R1")) {
    throw new Error(`Título inesperado: ${title}`);
  }

  const frame = page.locator("#mount iframe").contentFrame();
  await frame.locator(".duduq-dd2-root").waitFor({ state: "visible", timeout: 15000 });

  if (pageErrors.length) {
    throw new Error(`pageerror: ${pageErrors.join(" | ")}`);
  }

  console.log(`REMOTE_PREVIEW_PASS ${url}`);
  console.log(`TITLE=${title}`);
  console.log("VISUAL_VERSION=2.0.25-visual-r1");
  console.log("MECHANIC_VERSION=2.0.25");
} finally {
  await browser.close();
}

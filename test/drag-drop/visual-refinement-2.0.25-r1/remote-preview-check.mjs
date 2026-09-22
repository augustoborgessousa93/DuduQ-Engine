import { chromium } from "playwright";

const url = "https://refine-drag-drop-2-0-25-visu.duduq-engine.pages.dev/test/drag-drop/visual-refinement-2.0.25-r1/index.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
const failedRequests = [];
page.on("pageerror", error => pageErrors.push(String(error?.message || error)));
page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "failed"}`));

try {
  let response = null;
  let lastError = null;

  // Cloudflare branch previews are deployed asynchronously after the push.
  // Retry the stable branch-preview URL until this exact prototype is live.
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (response && response.status() === 200) {
        try {
          await page.waitForFunction(() => {
            const visual = window.DD225VisualRefinementR1?.version;
            const mechanic = window.dd225vrMechanic?.()?.version;
            const iframe = document.querySelector("#mount iframe");
            return visual === "2.0.25-visual-r1" && mechanic === "2.0.25" && Boolean(iframe);
          }, null, { timeout: 12000 });
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
        }
      } else {
        lastError = new Error(`HTTP ${response?.status() ?? "sem resposta"}`);
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < 12) await page.waitForTimeout(10000);
  }

  if (lastError || !response || response.status() !== 200) {
    throw new Error(`Preview Cloudflare não ficou pronto: ${lastError?.message || "sem HTTP 200"}`);
  }

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
  console.log(`HTTP_STATUS=${response.status()}`);
  console.log(`TITLE=${title}`);
  console.log("VISUAL_VERSION=2.0.25-visual-r1");
  console.log("MECHANIC_VERSION=2.0.25");
  console.log(`REQUEST_FAILURES=${failedRequests.length}`);
  console.log(`LINK_REAL=${url}`);
} finally {
  await browser.close();
}

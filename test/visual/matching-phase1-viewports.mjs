import { chromium } from "file:///C:/Users/augus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4173/DUDUQ_MATCHING.html";
const outputDir = new URL("../../artifacts/matching-phase2/after/", import.meta.url);
const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "640x360", width: 640, height: 360 },
  { name: "480x320", width: 480, height: 320 }
];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
});
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45_000 });
    await page.locator(".duduq-matching-card").first().waitFor({ state: "visible", timeout: 30_000 });

    const leftCards = page.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
    const rightCards = page.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card');
    const pairCount = Math.min(await leftCards.count(), await rightCards.count());
    for (let index = 0; index < pairCount; index += 1) {
      await leftCards.nth(index).click();
      await rightCards.nth(index).click();
    }
    await page.locator(".duduq-matching-line-group").first().waitFor({ state: "attached" });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const board = document.querySelector(".duduq-matching-board");
      const shell = document.querySelector(".duduq-engine-shell");
      const cta = document.querySelector(".duduq-matching-primary");
      const cards = [...document.querySelectorAll(".duduq-matching-card")];
      const boardBounds = board?.getBoundingClientRect();
      const cardBounds = cards.map((card) => card.getBoundingClientRect());
      const path = document.querySelector(".duduq-matching-line-group .duduq-matching-line");
      const selectedPorts = [...document.querySelectorAll('.duduq-matching-card[data-paired="true"] .duduq-matching-port')];
      const boardRect = board?.getBoundingClientRect();
      const portCenters = selectedPorts.map((port) => {
        const rect = port.getBoundingClientRect();
        return { x: rect.left - boardRect.left + rect.width / 2, y: rect.top - boardRect.top + rect.height / 2 };
      });
      let endpointError = null;
      const paths = [...document.querySelectorAll(".duduq-matching-line-group .duduq-matching-line")];
      if (paths.length && portCenters.length) {
        const endpointErrors = paths.flatMap((currentPath) => {
          const start = currentPath.getPointAtLength(0);
          const end = currentPath.getPointAtLength(currentPath.getTotalLength());
          const nearest = (point) => Math.min(...portCenters.map((port) => Math.hypot(point.x - port.x, point.y - port.y)));
          return [nearest(start), nearest(end)];
        });
        endpointError = Math.max(...endpointErrors);
      }
      const controls = [...document.querySelectorAll("button")].filter((button) => {
        const style = getComputedStyle(button);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      const touchMinimum = Math.min(...controls.map((button) => {
        const rect = button.getBoundingClientRect();
        return Math.min(rect.width, rect.height);
      }));
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        clientHeight: doc.clientHeight,
        scrollHeight: doc.scrollHeight,
        interfaceHeight: shell?.getBoundingClientRect().height ?? null,
        ctaBottom: cta?.getBoundingClientRect().bottom ?? null,
        ctaVisibleWithoutScroll: Boolean(cta && cta.getBoundingClientRect().top >= 0 && cta.getBoundingClientRect().bottom <= innerHeight),
        ctaEnabledAfterAllPairs: Boolean(cta && !cta.disabled),
        boardHeight: boardBounds?.height ?? null,
        gameplayFullyVisible: Boolean(boardBounds && cardBounds.every((rect) => rect.top >= boardBounds.top - 1 && rect.bottom <= boardBounds.bottom + 1)),
        endpointError,
        touchMinimum,
        boardColumns: board ? getComputedStyle(board).gridTemplateColumns : null,
        rootTransform: getComputedStyle(document.querySelector(".duduq-engine-root")).transform
      };
    });

    if (!metrics.gameplayFullyVisible) console.error("LAYOUT_DEBUG", viewport.name, JSON.stringify(metrics));
    assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${viewport.name}: overflow horizontal`);
    assert(metrics.scrollHeight <= metrics.clientHeight + 1, `${viewport.name}: rolagem vertical ainda necessária (${metrics.scrollHeight}px)`);
    assert(metrics.ctaVisibleWithoutScroll, `${viewport.name}: CTA fora da dobra (${metrics.ctaBottom}px)`);
    assert(metrics.ctaEnabledAfterAllPairs, `${viewport.name}: CTA não habilitou após completar os pares`);
    assert(metrics.gameplayFullyVisible, `${viewport.name}: cards recortados no board de ${metrics.boardHeight}px`);
    assert(metrics.endpointError !== null && metrics.endpointError <= 3, `${viewport.name}: linha desconectada (${metrics.endpointError}px)`);
    assert(metrics.touchMinimum >= 43.5, `${viewport.name}: touch target abaixo de 44px (${metrics.touchMinimum}px)`);
    assert(metrics.rootTransform === "none", `${viewport.name}: escala global detectada`);
    assert(pageErrors.length === 0, `${viewport.name}: ${pageErrors.join("; ")}`);

    await page.screenshot({ path: fileURLToPath(new URL(`${viewport.name}.png`, outputDir)), fullPage: true });
    await page.locator(".duduq-matching-primary").click();
    await page.waitForFunction(() => document.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") !== "idle", null, { timeout: 5_000 });
    results.push({ viewport: viewport.name, ...metrics, status: "PASS" });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ status: "PASS", results }, null, 2));

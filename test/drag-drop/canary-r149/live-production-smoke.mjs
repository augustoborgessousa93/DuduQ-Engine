import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "https://duduq-engine.pages.dev";
const modules = [
  { label: "Y1-M01", path: "/content/english/year-1/module-01/" },
  { label: "Y3-M01", path: "/content/english/year-3/module-01/" },
  { label: "Y5-M01", path: "/content/english/year-5/module-01/" }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForR149() {
  let last = null;
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const response = await fetch(`${BASE}/engine/channels/canary-v1.json?qa=r149-live-${Date.now()}-${attempt}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" }
    });
    if (response.ok) {
      const manifest = await response.json();
      last = manifest;
      if (manifest?.revision === 149 && manifest?.mechanics?.["drag-drop"]?.release === "2.0.26") {
        assert(manifest?.core?.release === "1.0.12", `Core inesperado: ${manifest?.core?.release}`);
        assert(manifest?.mechanics?.["drag-drop"]?.adapter === "/engine/releases/mechanics/drag-drop/2.0.26/drag-drop.js", `Adapter DD inesperado: ${manifest?.mechanics?.["drag-drop"]?.adapter}`);
        return manifest;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`Manifest público não chegou à R149/DD 2.0.26. Último estado: ${JSON.stringify(last)}`);
}

const manifest = await waitForR149();
console.log(`PASS public-manifest revision=${manifest.revision} core=${manifest.core.release} dd=${manifest.mechanics["drag-drop"].release}`);

const browser = await chromium.launch({ headless: true });
try {
  for (const entry of modules) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const pageErrors = [];
    const critical404 = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => {
      if (response.status() !== 404) return;
      const url = response.url();
      if (url.includes("/engine/") || url.includes(entry.path) || url.includes("asset-catalog/runtime-index.js")) critical404.push(url);
    });

    const response = await page.goto(`${BASE}${entry.path}?qa=r149-live-${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000
    });
    assert(response?.ok(), `${entry.label}: HTTP ${response?.status()}`);
    await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 45_000 });

    const boot = await page.evaluate(() => ({
      revision: window.DUDUQ_ENGINE_MANIFEST?.revision,
      core: window.DUDUQ_ENGINE_MANIFEST?.core?.release,
      ddManifest: window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,
      ddRegistry: window.DuduQ?.getMechanic?.("drag-drop")?.version || null,
      playerApi: typeof window.DuduQ?.getSession === "function",
      loaderPresent: [...document.scripts].some((script) => String(script.src).includes("/engine/duduq-loader-v1.js")),
      rootText: document.querySelector("#root")?.textContent || ""
    }));

    assert(boot.revision === 149, `${entry.label}: Canary ${boot.revision}`);
    assert(boot.core === "1.0.12", `${entry.label}: Core ${boot.core}`);
    assert(boot.ddManifest === "2.0.26", `${entry.label}: manifest DD ${boot.ddManifest}`);
    assert(boot.ddRegistry === "2.0.26", `${entry.label}: registry DD ${boot.ddRegistry}`);
    assert(boot.playerApi, `${entry.label}: Player API ausente`);
    assert(boot.loaderPresent, `${entry.label}: Loader ausente`);
    assert(pageErrors.length === 0, `${entry.label}: pageerror ${pageErrors.join(" | ")}`);
    assert(critical404.length === 0, `${entry.label}: critical404 ${critical404.join(" | ")}`);

    console.log(`PASS ${entry.label} canary=${boot.revision} core=${boot.core} ddManifest=${boot.ddManifest} ddRegistry=${boot.ddRegistry} loader=PASS player=PASS 404=0 pageError=0`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log("PASS — Canary R149 live production smoke — public manifest + Y1/Y3/Y5");

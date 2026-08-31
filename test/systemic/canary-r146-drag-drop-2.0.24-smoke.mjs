import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/systemic/canary-r146-drag-drop-2.0.24");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const critical404 = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (url.includes("/engine/") || url.includes("/content/english/year-1/")) critical404.push(url);
});

try {
  // O M01 público ainda não declara Drag & Drop antes do PR #77. Para testar
  // exclusivamente a promoção Canary, usamos o harness universal já existente,
  // que solicita explicitamente drag-drop + target-shooter pelo Loader.
  const response = await page.goto(`${BASE}/test/systemic/year1-loader-compat.html?module=2&qa=canary-r146-dd224`, {
    waitUntil: "domcontentloaded",
    timeout: 35_000
  });
  assert(response?.ok(), `Loader harness HTTP ${response?.status()}.`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

  const boot = await page.evaluate(() => {
    const manifest = window.DUDUQ_ENGINE_MANIFEST || {};
    const scripts = Array.from(document.scripts).map((script) => script.src).filter(Boolean);
    return {
      revision: manifest.revision,
      core: manifest.core?.release || "",
      dragDrop: manifest.mechanics?.["drag-drop"] || null,
      targetShooter: manifest.mechanics?.["target-shooter"] || null,
      channel: manifest.channel || "",
      scripts,
      registered: window.DuduQ?.listMechanics?.() || [],
      required: [...(window.DUDUQ_GAME_CONFIG?.requiredMechanics || [])]
    };
  });

  assert(boot.revision === 146, `Manifest revision ${boot.revision}.`);
  assert(boot.core === "1.0.11", `Core ${boot.core}.`);
  assert(boot.channel === "canary-v1", `Channel ${boot.channel}.`);
  assert(boot.dragDrop?.release === "2.0.24", `Drag Drop ${boot.dragDrop?.release}.`);
  assert(boot.dragDrop?.adapter?.includes("/drag-drop/2.0.24/drag-drop.js"), "Adapter Drag Drop 2.0.24 ausente do manifest.");
  assert(boot.targetShooter?.release === "1.0.21", `Target Shooter drift ${boot.targetShooter?.release}.`);
  assert(boot.scripts.some((src) => src.includes("/engine/duduq-loader-v1.js")), "Loader universal ausente.");
  assert(boot.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-host.js")), "Host Core 1.0.11 ausente.");
  assert(boot.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-router.js")), "Router Core 1.0.11 ausente.");
  assert(boot.scripts.some((src) => src.includes("/engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js")), "Loader não carregou Drag Drop 2.0.24.");
  assert(boot.required.includes("drag-drop"), "Harness Canary não solicitou Drag Drop.");
  assert(boot.required.every((id) => boot.registered.some((entry) => entry.id === id)), `Mecânica requerida não registrada: ${boot.required.join(",")}.`);
  const registeredDragDrop = boot.registered.find((entry) => entry.id === "drag-drop");
  assert(registeredDragDrop?.version === "2.0.24", `Drag Drop registrado como ${registeredDragDrop?.version}.`);

  await page.waitForTimeout(400);
  assert(pageErrors.length === 0, `JS blocker: ${pageErrors.join(" | ")}`);
  assert(critical404.length === 0, `404 crítico: ${critical404.join(" | ")}`);

  await page.screenshot({ path: path.join(OUT, "loader-r146-dd224.png"), fullPage: false });
  const report = {
    contract: "DUDUQ_CANARY_R146_DRAG_DROP_2_0_24_SANITY",
    status: "PASS",
    revision: boot.revision,
    core: boot.core,
    dragDrop: boot.dragDrop?.release,
    registeredDragDrop: registeredDragDrop?.version,
    loader: "PASS",
    registration: "PASS",
    jsBlockers: 0,
    critical404: 0
  };
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page.close();
  await browser.close();
}

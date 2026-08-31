import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const PIN = "f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f";
const OUT = path.resolve("test-results/systemic/canary-core-1.0.11-promotion");
const EXPECTED_REVISION = 146;
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 }
];
const ASSET_SENTINELS = ["3", "red", "hello", "dog", "boy", "school bag", "letra a ei"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cases = [];

try {
  for (const viewport of VIEWPORTS) {
    for (let moduleNumber = 1; moduleNumber <= 6; moduleNumber += 1) {
      const moduleKey = String(moduleNumber).padStart(2, "0");
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      const critical404 = [];
      page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
      page.on("response", (response) => {
        if (response.status() !== 404) return;
        const url = response.url();
        if (url.includes("/engine/") || url.includes("/content/english/year-1/") || url.includes("asset-catalog/runtime-index.js")) {
          critical404.push(url);
        }
      });

      try {
        const url = `${BASE}/content/english/year-1/module-${moduleKey}/?qa=canary-r${EXPECTED_REVISION}-core-1.0.11`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35_000 });
        assert(response?.ok(), `M${moduleKey} ${viewport.name}: entry HTTP ${response?.status()}.`);
        await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

        const boot = await page.evaluate((sentinels) => {
          const manifest = window.DUDUQ_ENGINE_MANIFEST || {};
          const scripts = Array.from(document.scripts).map((script) => script.src).filter(Boolean);
          const resolved = Object.fromEntries(sentinels.map((query) => [query, window.DuduQAssets?.resolveImageDetails(query) || null]));
          return {
            revision: manifest.revision,
            channel: manifest.channel,
            core: manifest.core?.release || "",
            runtimeCommit: window.DuduQAssets?.canonicalCatalog?.runtimeCommit || "",
            runtimeSchema: window.DUDUQ_CANONICAL_ASSET_CATALOG?.schemaVersion || 0,
            runtimeImages: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.images || 0,
            runtimeAliases: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.aliases || 0,
            runtimeUnresolved: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.unresolvedCollisions || 0,
            runtimeWarnings: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.warnings || 0,
            runtimeErrors: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.errors || 0,
            resolved,
            unknown: window.DuduQAssets?.resolveImageDetails("definitely unknown official asset") || null,
            correctSound: window.DuduQAssets?.getSound?.("correct") || "",
            scripts,
            requiredMechanics: Array.isArray(window.DUDUQ_GAME_CONFIG?.requiredMechanics) ? [...window.DUDUQ_GAME_CONFIG.requiredMechanics] : [],
            mechanics: window.DuduQ?.listMechanics?.().map((item) => item.id) || []
          };
        }, ASSET_SENTINELS);

        assert(boot.revision === EXPECTED_REVISION, `M${moduleKey} ${viewport.name}: Canary revision ${boot.revision}.`);
        assert(boot.channel === "canary-v1", `M${moduleKey} ${viewport.name}: channel ${boot.channel}.`);
        assert(boot.core === "1.0.11", `M${moduleKey} ${viewport.name}: Core ${boot.core}.`);
        assert(boot.runtimeCommit === PIN, `M${moduleKey} ${viewport.name}: canonical runtime commit drifted.`);
        assert(boot.runtimeSchema === 2 && boot.runtimeImages === 237 && boot.runtimeAliases >= 236, `M${moduleKey} ${viewport.name}: canonical catalog counters drifted.`);
        assert(boot.runtimeUnresolved === 0 && boot.runtimeWarnings === 0 && boot.runtimeErrors === 0, `M${moduleKey} ${viewport.name}: canonical catalog integrity is not clean.`);
        assert(boot.scripts.some((src) => src.includes(`Assets-DuduQ@${PIN}/asset-catalog/runtime-index.js`)), `M${moduleKey} ${viewport.name}: pinned canonical runtime not loaded.`);
        assert(boot.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-assets.js")), `M${moduleKey} ${viewport.name}: published Core assets consumer not loaded.`);
        assert(boot.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-host.js")), `M${moduleKey} ${viewport.name}: published Host not loaded.`);
        assert(boot.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-router.js")), `M${moduleKey} ${viewport.name}: published Router not loaded.`);
        assert(boot.requiredMechanics.length > 0, `M${moduleKey} ${viewport.name}: module declared no required mechanics.`);
        assert(boot.requiredMechanics.every((mechanicId) => boot.mechanics.includes(mechanicId)), `M${moduleKey} ${viewport.name}: required mechanic missing. Required=${boot.requiredMechanics.join(",")} Registered=${boot.mechanics.join(",")}`);
        assert(String(boot.correctSound).endsWith("/Efeitos%20sonoros/correct.mp3"), `M${moduleKey} ${viewport.name}: sound API regressed.`);

        for (const query of ASSET_SENTINELS) {
          const item = boot.resolved[query];
          assert(item?.url && item?.file, `M${moduleKey} ${viewport.name}: asset sentinel '${query}' unresolved.`);
          assert(item.catalogRuntimeCommit === PIN, `M${moduleKey} ${viewport.name}: asset '${query}' lost canonical provenance.`);
          assert(item.strategy === "canonical-alias" || item.strategy === "canonical-key", `M${moduleKey} ${viewport.name}: asset '${query}' used unexpected strategy ${item.strategy}.`);
        }
        assert(boot.unknown === null, `M${moduleKey} ${viewport.name}: unknown asset should remain missing instead of masking with a generic fallback.`);

        const start = page.locator(".duduq-intro-start-button");
        await start.waitFor({ state: "visible", timeout: 30_000 });
        await start.click();
        await page.waitForFunction(() => {
          const session = window.DuduQ?.getSession?.();
          const iframe = document.querySelector("iframe");
          const mountedView = Boolean(iframe && (iframe.srcdoc || iframe.getAttribute("src")));
          return Boolean(session && !session.transitioning && mountedView && window.DuduQTransition?.getState?.() === "idle");
        }, null, { timeout: 35_000 });

        const initial = await page.evaluate(() => window.DuduQ.getSession());
        assert(initial.totalSteps > 0 && initial.stepIndex === 0 && initial.progress?.percent === 0, `M${moduleKey} ${viewport.name}: initial progress invalid.`);

        const progress = [initial.progress?.percent ?? 0];
        for (let step = 0; step < initial.totalSteps; step += 1) {
          const accepted = await page.evaluate(({ stepIndex, revision }) => window.DuduQ.next({ qa: `canary-r${revision}`, stepIndex }), { stepIndex: step, revision: EXPECTED_REVISION });
          assert(accepted === true, `M${moduleKey} ${viewport.name}: Host rejected progression at step ${step + 1}.`);

          await page.waitForFunction(({ expected, total }) => {
            const session = window.DuduQ?.getSession?.();
            if (!session || session.transitioning) return false;
            if (expected >= total) return session.completed === true && session.progress?.percent === 100;
            const iframe = document.querySelector("iframe");
            const mountedView = Boolean(iframe && (iframe.srcdoc || iframe.getAttribute("src")));
            return session.stepIndex === expected && session.completed === false && mountedView && window.DuduQTransition?.getState?.() === "idle";
          }, { expected: step + 1, total: initial.totalSteps }, { timeout: 12_000 });

          const snapshot = await page.evaluate(() => window.DuduQ.getSession());
          progress.push(snapshot.progress?.percent ?? -1);
        }

        const finalState = await page.evaluate(() => ({
          session: window.DuduQ.getSession(),
          text: String(document.body?.innerText || "").replace(/\s+/g, " ").trim()
        }));
        assert(finalState.session.completed === true, `M${moduleKey} ${viewport.name}: module did not complete.`);
        assert(finalState.session.progress?.percent === 100, `M${moduleKey} ${viewport.name}: final progress is not 100%.`);
        assert(finalState.session.results?.length === initial.totalSteps, `M${moduleKey} ${viewport.name}: results count ${finalState.session.results?.length}/${initial.totalSteps}.`);
        assert(/Missão concluída/i.test(finalState.text), `M${moduleKey} ${viewport.name}: completion UI did not appear.`);
        assert(progress.every((value, index) => index === 0 || value >= progress[index - 1]), `M${moduleKey} ${viewport.name}: progress regressed ${progress.join(" -> ")}.`);
        assert(pageErrors.length === 0, `M${moduleKey} ${viewport.name}: pageerror ${pageErrors.join(" | ")}`);
        assert(critical404.length === 0, `M${moduleKey} ${viewport.name}: critical 404 ${critical404.join(" | ")}`);

        cases.push({ module: moduleKey, viewport: viewport.name, requiredMechanics: boot.requiredMechanics, totalSteps: initial.totalSteps, progress, assetStrategies: Object.fromEntries(Object.entries(boot.resolved).map(([key, value]) => [key, value?.strategy || "missing"])), status: "PASS" });
        console.log(`PASS M${moduleKey} ${viewport.name}`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  contract: "DUDUQ_CANARY_R146_CORE_1_0_11_PROMOTION",
  status: cases.length === 12 ? "PASS" : "FAIL",
  core: "1.0.11",
  rollbackCore: "1.0.9",
  revision: EXPECTED_REVISION,
  canonicalRuntimeCommit: PIN,
  cases
};
await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
assert(cases.length === 12, `Expected 12 Canary promotion cases, got ${cases.length}.`);
console.log(JSON.stringify({ contract: report.contract, status: report.status, cases: cases.length, core: report.core, revision: report.revision }, null, 2));

import { chromium } from "playwright";

const base = process.env.DUDUQ_QA_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const entry = { module: `M${mm}`, url: `${base}/content/english/year-2/module-${mm}/`, pass: false };
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  try {
    const response = await page.goto(entry.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!response?.ok()) throw new Error(`HTTP ${response?.status?.()}`);

    const meta = await page.evaluate(() => ({
      entry: window.DUDUQ_PUBLIC_ENTRY || null,
      config: window.DUDUQ_GAME_CONFIG || null,
      scripts: Array.from(document.scripts).map((script) => script.src || "")
    }));

    if (!meta.entry || meta.entry.year !== 2 || meta.entry.module !== module) throw new Error("DUDUQ_PUBLIC_ENTRY divergente");
    if (meta.entry.visualPolicy !== "EXISTING_ASSET_PLUS_PROVISIONAL") throw new Error("política visual pública divergente");
    if (!meta.config?.modulePath?.includes(`module${mm}v22homolog`)) throw new Error("modulePath público divergente");
    if (!meta.scripts.some((src) => src.includes("year2-v22-homolog-editorial-assets.js"))) throw new Error("patch de assets existentes ausente");

    const start = page.getByRole("button", { name: /INICIAR MISSÃO/i });
    await start.waitFor({ state: "visible", timeout: 20000 });
    await start.click({ timeout: 10000 });

    await page.waitForFunction(() => {
      const text = document.getElementById("root")?.textContent || "";
      return Boolean(document.querySelector("iframe")) || /Erro ao carregar|Erro:/i.test(text);
    }, undefined, { timeout: 20000 });

    const rootText = await page.locator("#root").innerText().catch(() => "");
    if (/Erro ao carregar|Erro:/i.test(rootText)) throw new Error(`runtime público exibiu erro: ${rootText.slice(0, 180)}`);
    if (!await page.locator("iframe").count()) throw new Error("iframe da mecânica não foi criado");
    if (pageErrors.length) throw new Error(`pageerror: ${pageErrors.join(" | ")}`);

    entry.pass = true;
    results.push(entry);
    console.log(`PASS public M${mm}`);
  } catch (error) {
    entry.error = String(error?.message || error);
    entry.pageErrors = pageErrors;
    failures.push(entry);
    results.push(entry);
    console.error(`FAIL public M${mm}: ${entry.error}`);
  } finally {
    await page.close();
  }
}

await browser.close();

if (failures.length) {
  console.error("DUDUQ YEAR2 PUBLIC LINKS QA: FAIL");
  process.exit(1);
}

console.log("DUDUQ YEAR2 PUBLIC LINKS QA: PASS");
console.log(JSON.stringify({ modules: 6, paths: results.map((r) => r.url) }, null, 2));

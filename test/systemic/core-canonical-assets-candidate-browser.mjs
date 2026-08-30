import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const PIN = "f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f";
const RUNTIME = `https://cdn.jsdelivr.net/gh/augustoborgessousa93/Assets-DuduQ@${PIN}/asset-catalog/runtime-index.js`;
function assert(condition, message) { if (!condition) throw new Error(message); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error?.message || error)));
try {
  await page.setContent("<!doctype html><html><head></head><body><main id='root'>candidate</main></body></html>");
  await page.addScriptTag({ url: RUNTIME });
  await page.addScriptTag({ url: `${BASE}/engine/releases/core/1.0.11-candidate/duduq-assets.js` });
  const result = await page.evaluate(() => {
    const queries = ["3","three","tres","number 3","red","tchau","bye tchau","dog","cachorro","hello","school bag"];
    const numberTopic = window.DuduQAssets?.inferActivityTopic(
      { title: "OUÇA E ESCOLHA", questions: [{ statement: "Choose number three", alternatives: [{ text: "3" }, { text: "4" }] }] },
      { title: "English" }
    );
    const colorTopic = window.DuduQAssets?.inferActivityTopic(
      { title: "LISTEN AND CHOOSE", questions: [{ statement: "Choose red", alternatives: [{ text: "red" }, { text: "blue" }] }] },
      { title: "English" }
    );
    return {
      runtime: {
        schema: window.DUDUQ_CANONICAL_ASSET_CATALOG?.schemaVersion,
        images: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.images,
        aliases: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.aliases,
        unresolved: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.unresolvedCollisions,
        warnings: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.warnings,
        errors: window.DUDUQ_CANONICAL_ASSET_CATALOG?.stats?.errors
      },
      apiVersion: window.DuduQAssets?.version,
      provenance: window.DuduQAssets?.canonicalCatalog,
      resolved: Object.fromEntries(queries.map((query) => [query, window.DuduQAssets?.resolveImageDetails(query)])),
      unknown: window.DuduQAssets?.resolveImage("definitely unknown asset"),
      legacyHello: window.DuduQAssets?.rewriteUrl("https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png"),
      correctSound: window.DuduQAssets?.getSound("correct"),
      contentGreeting: window.DuduQAssets?.getContent("english", 1, 1, "greeting"),
      numberTopic,
      colorTopic
    };
  });

  assert(result.runtime.schema === 2, `Runtime schema ${result.runtime.schema}.`);
  assert(result.runtime.images === 237, `Runtime images ${result.runtime.images}.`);
  assert(result.runtime.aliases >= 236, `Runtime aliases ${result.runtime.aliases}.`);
  assert(result.runtime.unresolved === 0 && result.runtime.warnings === 0 && result.runtime.errors === 0, "Runtime integrity counters are not clean.");
  assert(result.apiVersion === "1.7.0-canonical-catalog-candidate", `Unexpected assets API ${result.apiVersion}.`);
  assert(result.provenance?.runtimeCommit === PIN, "Runtime provenance commit mismatch.");

  const expected = {
    "3": "number-03-three-tres.png", "three": "number-03-three-tres.png", "tres": "number-03-three-tres.png", "number 3": "number-03-three-tres.png",
    red: "color-red-vermelho.png", tchau: "greeting-goodbye-tchau.png", "bye tchau": "greeting-goodbye-tchau.png",
    dog: "pet-dog-cachorro.png", cachorro: "pet-dog-cachorro.png", hello: "greeting-hello-oi.png", "school bag": "school-object-backpack-mochila.png"
  };
  for (const [query, file] of Object.entries(expected)) {
    assert(result.resolved[query]?.file === file, `${query} resolved to ${result.resolved[query]?.file || "null"}, expected ${file}.`);
    assert(result.resolved[query]?.catalogRuntimeCommit === PIN, `${query} lost provenance.`);
  }
  assert(result.unknown === null, "Unknown semantic query should remain unresolved instead of using a generic image.");
  assert(String(result.legacyHello).endsWith("greeting-hello-oi.png"), `Legacy Hello rewrite regressed: ${result.legacyHello}`);
  assert(String(result.correctSound).endsWith("/Efeitos%20sonoros/correct.mp3"), "Non-image Core sound API regressed.");
  assert(String(result.contentGreeting).endsWith("/Imagens%20Ilustrativa/Hello.png"), `getContent API regressed: ${result.contentGreeting}`);
  assert(result.numberTopic === "NUMBERS", `Topic inference expected NUMBERS, got ${result.numberTopic}.`);
  assert(result.colorTopic === "COLORS", `Topic inference expected COLORS, got ${result.colorTopic}.`);
  assert(errors.length === 0, `Browser pageerror: ${errors.join(" | ")}`);

  console.log(JSON.stringify({ contract: "DUDUQ_CORE_CANONICAL_ASSETS_BROWSER", status: "PASS", ...result }, null, 2));
} finally {
  await browser.close();
}

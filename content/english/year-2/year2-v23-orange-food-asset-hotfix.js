/* DUDUQ English Year 2 — contextual ORANGE asset hotfix
   Scope: Module/content output only. Keeps mechanics, answers, IDs and COLORS semantics intact.
   FOOD + exact source token "orange" must resolve to the fruit asset, never the orange-color asset.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Orange FOOD Hotfix] Factory v2.3 indisponível.");
  }
  if (factory.__orangeFoodAssetHotfixApplied) return;

  const VERSION = "2.3.4-orange-food-asset-rc1";
  const ASSET_BASE = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/";
  const FRUIT_FILE = "Orange Fruit -laranja fruta.png";
  const FRUIT_URL = ASSET_BASE + encodeURIComponent(FRUIT_FILE);
  const originalBuild = factory.buildModule.bind(factory);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function safeDecode(value) {
    try { return decodeURIComponent(String(value)); }
    catch (_) { return String(value); }
  }

  function sourceContainsOrange(question) {
    const labels = Array.isArray(question?.metadata?.sourceAlternativesV23)
      ? question.metadata.sourceAlternativesV23
      : [];
    const answer = question?.metadata?.sourceAnswerV23;
    return [...labels, answer].some((value) => normalize(value) === "orange");
  }

  function isFoodQuestion(question) {
    return normalize(question?.metadata?.topic) === "food";
  }

  function isOrangeImageUrl(value) {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
    if (value === FRUIT_URL) return false;

    const decoded = safeDecode(value).toLowerCase();
    if (!decoded.includes("/imagens ilustrativa/")) return false;

    const file = decoded.split("/").pop() || "";
    return file === "color-orange-laranja.png" ||
      file === "color orange-cor laranja.png" ||
      file === "cor laranja - orange color.png" ||
      file === "orange  -laranja fruta.png" ||
      file === "orange -laranja fruta.png";
  }

  function replaceOrangeUrls(value, seen) {
    if (typeof value === "string") {
      return isOrangeImageUrl(value)
        ? { value: FRUIT_URL, replacements: 1 }
        : { value, replacements: 0 };
    }
    if (!value || typeof value !== "object") return { value, replacements: 0 };
    if (seen.has(value)) return { value, replacements: 0 };
    seen.add(value);

    let replacements = 0;
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const result = replaceOrangeUrls(value[index], seen);
        value[index] = result.value;
        replacements += result.replacements;
      }
      return { value, replacements };
    }

    for (const key of Object.keys(value)) {
      const result = replaceOrangeUrls(value[key], seen);
      value[key] = result.value;
      replacements += result.replacements;
    }
    return { value, replacements };
  }

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function buildModule(config) {
    const built = clone(originalBuild(config));
    const audit = [];

    for (const question of allQuestions(built)) {
      if (!isFoodQuestion(question) || !sourceContainsOrange(question)) continue;

      const { replacements } = replaceOrangeUrls(question, new WeakSet());
      if (replacements > 0) {
        question.metadata = question.metadata || {};
        question.metadata.orangeFoodAssetHotfix = {
          version: VERSION,
          replacements,
          canonicalAsset: FRUIT_FILE,
          scope: "FOOD_ONLY"
        };
        audit.push({ id: question.id, replacements });
      }
    }

    built.orangeFoodAssetHotfix = {
      version: VERSION,
      canonicalAsset: FRUIT_FILE,
      canonicalUrl: FRUIT_URL,
      patchedQuestions: audit,
      colorsSemanticsTouched: false
    };
    return Object.freeze(built);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule,
    __orangeFoodAssetHotfixApplied: true,
    orangeFoodAssetHotfixVersion: VERSION,
    orangeFoodAssetUrl: FRUIT_URL
  });
})();

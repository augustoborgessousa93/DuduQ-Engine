/* DUDUQ Matching 1.0.24 — homologation-only right-distractor candidate
   Composes immutable Matching 1.0.23 and relaxes only one validator rule when
   behavior.allowRightDistractors === true: right-side alternatives may remain
   unpaired distractors. Left-side items, declared correct pairs, 1x1 degree
   constraints, interaction, scoring and runtime behavior stay inherited.
*/
(function () {
  "use strict";

  const VERSION = "1.0.24";
  const BASE_ADAPTER_URL = "/engine/releases/mechanics/matching/1.0.23/matching.js";
  const BASE_RUNTIME_PATH = "/engine/releases/mechanics/matching/1.0.23/DUDUQ_MATCHING.html";
  const DIAGNOSTIC = "DuduQMatching124RightDistractors";

  if (window[DIAGNOSTIC]?.ready === true) return;

  function fail(message) {
    throw new Error("[DuduQ Matching 1.0.24] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada (" + count + "): " + from.slice(0, 120));
    }
    return source.split(from).join(to);
  }

  function loadTextSync(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url + (url.includes("?") ? "&" : "?") + "duduqMatching124=" + Date.now(), false);
    try {
      xhr.send(null);
    } catch (error) {
      fail("falha ao carregar base: " + (error?.message || String(error)));
    }
    if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
      fail("falha HTTP " + xhr.status + " ao carregar " + url);
    }
    return xhr.responseText;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function duduqMatching124Fetch(input, init) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    const response = await nativeFetch(input, init);
    if (!url.includes(BASE_RUNTIME_PATH)) return response;

    const html = await response.text();
    const patched = replaceRequired(
      html,
      `    rightIds.forEach((id) => {\n      if (!rightDegrees.get(id)) {\n        issues.push({ path: \`rightItems:\${id}\`, code: "UNPAIRED_RIGHT_ITEM", message: "Todo item da direita deve participar de ao menos uma conexão correta.", severity: "error" });\n      }\n    });`,
      `    if (question.behavior?.allowRightDistractors !== true) {\n      rightIds.forEach((id) => {\n        if (!rightDegrees.get(id)) {\n          issues.push({ path: \`rightItems:\${id}\`, code: "UNPAIRED_RIGHT_ITEM", message: "Todo item da direita deve participar de ao menos uma conexão correta.", severity: "error" });\n        }\n      });\n    }`
    );

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(patched, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };

  let adapter = loadTextSync(BASE_ADAPTER_URL);
  adapter = replaceRequired(adapter, 'const VERSION = "1.0.23";', 'const VERSION = "1.0.24";');

  try {
    (0, eval)(adapter);
  } catch (error) {
    fail("falha ao inicializar adapter base: " + (error?.message || String(error)));
  }

  window[DIAGNOSTIC] = Object.freeze({
    ready: true,
    version: VERSION,
    baseAdapter: "1.0.23",
    baseRuntime: "1.2.0",
    behaviorFlag: "allowRightDistractors",
    scope: "homologation-only"
  });
})();

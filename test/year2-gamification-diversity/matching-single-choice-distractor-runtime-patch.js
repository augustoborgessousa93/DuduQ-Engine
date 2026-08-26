/* DUDUQ Matching — homologation-only single-choice distractor runtime patch
   Scope: only the HTML fetched from Matching 1.0.23 in this homolog harness.
   It does NOT edit Canary or immutable release files.
*/
(function(){
  "use strict";

  if(window.__DUDUQ_MATCHING_SINGLE_CHOICE_FETCH_PATCH__) return;

  const VERSION = "1.0.0-homolog-a";
  const nativeFetch = window.fetch.bind(window);
  const targetPattern = /\/engine\/releases\/mechanics\/matching\/1\.0\.23\/DUDUQ_MATCHING\.html(?:\?|$)/;
  const validatorPattern = /rightIds\.forEach\(\(id\) => \{\s*if \(!rightDegrees\.get\(id\)\) \{\s*issues\.push\(\{ path: `rightItems:\$\{id\}`, code: \"UNPAIRED_RIGHT_ITEM\", message: \"Todo item da direita deve participar de ao menos uma conexão correta\.\", severity: \"error\" \}\);\s*\}\s*\}\);/;

  const diagnostic = {
    version: VERSION,
    installed: true,
    fetchesSeen: 0,
    runtimeResponsesPatched: 0,
    lastUrl: null,
    lastValidatorMatch: false
  };

  Object.defineProperty(window, "__DUDUQ_MATCHING_SINGLE_CHOICE_FETCH_PATCH__", {
    value: diagnostic,
    configurable: true
  });

  window.fetch = async function(...args){
    const request = args[0];
    const url = typeof request === "string" ? request : String(request?.url || "");
    diagnostic.fetchesSeen += 1;

    const response = await nativeFetch(...args);
    if(!targetPattern.test(url)) return response;

    diagnostic.lastUrl = url;
    const html = await response.text();
    const matched = validatorPattern.test(html);
    diagnostic.lastValidatorMatch = matched;

    if(!matched){
      console.error("[DuduQ Matching Homolog Patch] Validador UNPAIRED_RIGHT_ITEM não localizado; runtime mantido sem alteração.");
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });
    }

    let patched = html.replace(validatorPattern, function(original){
      return [
        "if (question.behavior?.allowDistractors !== true) {",
        original,
        "}"
      ].join("\n");
    });

    const runtimeDiagnostic = `<script id="duduq-matching-single-choice-distractor-homolog-marker">window.__DUDUQ_MATCHING_SINGLE_CHOICE_DISTRACTOR_RUNTIME__=Object.freeze({version:${JSON.stringify(VERSION)},allowDistractors:true,scope:"homolog-only"});<\/script>`;
    patched = patched.replace("</body>", runtimeDiagnostic + "</body>");

    diagnostic.runtimeResponsesPatched += 1;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(patched, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
})();

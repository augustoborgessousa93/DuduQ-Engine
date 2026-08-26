/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.24
   SINGLE TARGET CHOICE — R143 VISUAL HOMOLOGATION

   Isolated candidate. It composes the validated 2.0.23 behavior
   while the companion runtime patch restores the approved R143
   visual hierarchy. Canary/public production remains untouched.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.24";
  const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.24 homolog] " + message);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "?dd224Base=2.0.23", false);
  try {
    xhr.send(null);
  } catch (error) {
    fail("não foi possível carregar a base 2.0.23: " + (error && error.message ? error.message : String(error)));
  }

  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.23.");
  }

  /* 2.0.23 already contains the validated SINGLE_TARGET_CHOICE behavior.
     2.0.24 changes candidate identity only here; presentation changes live in
     dd2-single-target-runtime-patch.js so behavior and layout remain separable. */
  let source = xhr.responseText;
  source = source.split("2.0.23").join(VERSION);
  source = source.split("dd223").join("dd224");
  source = source.split("DD23").join("DD24");

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar candidato composto: " + (error && error.message ? error.message : String(error)));
  }

  console.info("[DuduQ] Drag & Drop 2.0.24 R143-visual homolog registrado:", VERSION);
})();

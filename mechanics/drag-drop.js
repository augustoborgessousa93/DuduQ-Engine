/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP
   EMERGENCY ROLLBACK SHIM

   Restaura o adapter estável 2.0.18 para os módulos que carregam
   /mechanics/drag-drop.js diretamente. A release 2.0.21 permanece
   preservada para correção/homologação posterior.
   ========================================================= */
(function () {
  "use strict";

  const STABLE_ADAPTER_URL = "/engine/releases/mechanics/drag-drop/2.0.18/drag-drop.js";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop rollback] " + message);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", STABLE_ADAPTER_URL + "?rollback=139", false);
  try {
    xhr.send(null);
  } catch (error) {
    fail("não foi possível carregar o adapter estável 2.0.18: " + (error && error.message ? error.message : String(error)));
  }

  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar o adapter estável 2.0.18.");
  }

  try {
    (0, eval)(xhr.responseText);
  } catch (error) {
    fail("falha ao registrar o adapter estável 2.0.18: " + (error && error.message ? error.message : String(error)));
  }
})();

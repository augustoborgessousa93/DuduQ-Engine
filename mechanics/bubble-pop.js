/* =========================================================
   DUDUQ MECHANIC — BUBBLE POP
   Adaptador central da mecânica Bubble Pop.
   Versão 1.0.0
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error(
      "[DuduQ Bubble Pop] duduq-host.js precisa ser carregado antes."
    );
    return;
  }

  const MECHANIC_ID = "bubble-pop";
  const VERSION = "1.0.0";

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) {
      return String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "");
    }

    /*
     * Quando o Engine e o HTML estão no mesmo repositório/site,
     * esta URL relativa encontra o HTML original.
     */
    return "..";
  }

  function validate(payload) {
    if (payload == null) {
      return false;
    }

    if (Array.isArray(payload)) {
      return payload.length > 0;
    }

    if (typeof payload === "object") {
      return true;
    }

    return false;
  }

  function mount({
    container,
    payload,
    options = {},
    context,
    onComplete
  }) {
    if (!container) {
      throw new Error(
        "[DuduQ Bubble Pop] Container não informado."
      );
    }

    container.innerHTML = "";

    const wrapper = document.createElement("div");

    wrapper.className = "duduq-mechanic-frame";

    wrapper.style.width = "100%";
    wrapper.style.minHeight = "100vh";
    wrapper.style.position = "relative";

    const iframe = document.createElement("iframe");

    iframe.title = "DuduQ — Bubble Pop";

    iframe.setAttribute(
      "allow",
      "autoplay; fullscreen"
    );

    iframe.setAttribute(
      "allowfullscreen",
      ""
    );

    iframe.style.width = "100%";
    iframe.style.height = "100vh";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "transparent";

    const engineBase = getEngineBase();

    const params = new URLSearchParams();

    if (context && context.year) {
      params.set(
        "ano",
        String(context.year)
      );
    }

    if (context && context.moduleId) {
      params.set(
        "module",
        String(context.moduleId)
      );
    }

    iframe.src =
      engineBase +
      "/DUDUQ_BUBBLE_POP.html?" +
      params.toString();

    function sendContent() {
      if (!iframe.contentWindow) {
        return;
      }

      iframe.contentWindow.postMessage(
        {
          type: "DUDUQ_LOAD_CONTENT",

          mechanic: MECHANIC_ID,

          version: VERSION,

          payload,

          options,

          context
        },
        "*"
      );
    }

    function handleMessage(event) {
      if (
        event.source !==
        iframe.contentWindow
      ) {
        return;
      }

      const data = event.data;

      if (
        !data ||
        typeof data !== "object"
      ) {
        return;
      }

      if (
        data.type ===
        "DUDUQ_MECHANIC_READY"
      ) {
        sendContent();
      }

      if (
        data.type ===
        "DUDUQ_MECHANIC_COMPLETE"
      ) {
        if (
          typeof onComplete ===
          "function"
        ) {
          onComplete(
            data.result || null
          );
        }
      }
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    iframe.addEventListener(
      "load",
      function () {
        /*
         * Enviamos também no load.
         * Depois o HTML Bubble Pop terá um listener próprio.
         */
        window.setTimeout(
          sendContent,
          100
        );
      }
    );

    wrapper.appendChild(
      iframe
    );

    container.appendChild(
      wrapper
    );

    return function destroy() {
      window.removeEventListener(
        "message",
        handleMessage
      );

      iframe.remove();

      wrapper.remove();
    };
  }

  window.DuduQ.registerMechanic({
    id: MECHANIC_ID,

    version: VERSION,

    validate,

    mount,

    metadata: {
      name: "Bubble Pop",

      category:
        "reconhecimento-rapido",

      active: true
    }
  });

  console.info(
    "[DuduQ] Bubble Pop registrado:",
    VERSION
  );
})();

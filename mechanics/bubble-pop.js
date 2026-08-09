/* =========================================================
   DUDUQ MECHANIC — BUBBLE POP
   Adaptador central da mecânica Bubble Pop.
   Versão 1.0.1
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
  const VERSION = "1.0.1";

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) {
      return String(
        window.DUDUQ_ENGINE_BASE
      ).replace(/\/$/, "");
    }

    /*
     * index.html e DUDUQ_BUBBLE_POP.html
     * ficam na raiz do DuduQ-Engine.
     */
    return ".";
  }

  function validate(payload) {
    if (payload == null) {
      return false;
    }

    if (Array.isArray(payload)) {
      return payload.length > 0;
    }

    return typeof payload === "object";
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

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "duduq-mechanic-frame";

    wrapper.style.width = "100%";
    wrapper.style.minHeight = "100vh";
    wrapper.style.position = "relative";

    const iframe =
      document.createElement("iframe");

    iframe.title =
      "DuduQ — Bubble Pop";

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
    iframe.style.background =
      "transparent";

    const engineBase =
      getEngineBase();

    const params =
      new URLSearchParams();

    if (
      context &&
      context.year
    ) {
      params.set(
        "ano",
        String(context.year)
      );
    }

    if (
      context &&
      context.moduleId
    ) {
      params.set(
        "module",
        String(context.moduleId)
      );
    }

    const query =
      params.toString();

    iframe.src =
      engineBase +
      "/DUDUQ_BUBBLE_POP.html" +
      (query ? "?" + query : "");

    function sendContent() {
      if (
        !iframe.contentWindow
      ) {
        return;
      }

      iframe.contentWindow.postMessage(
        {
          type:
            "DUDUQ_LOAD_CONTENT",

          mechanic:
            MECHANIC_ID,

          version:
            VERSION,

          payload,

          options,

          context
        },
        "*"
      );
    }

    function handleMessage(
      event
    ) {
      if (
        event.source !==
        iframe.contentWindow
      ) {
        return;
      }

      const data =
        event.data;

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

      if (
        data.type ===
        "DUDUQ_MECHANIC_ERROR"
      ) {
        console.error(
          "[DuduQ Bubble Pop] Erro recebido da mecânica:",
          data
        );
      }
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    iframe.addEventListener(
      "load",
      function () {
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
    id:
      MECHANIC_ID,

    version:
      VERSION,

    validate,

    mount,

    metadata: {
      name:
        "Bubble Pop",

      category:
        "reconhecimento-rapido",

      active:
        true
    }
  });

  console.info(
    "[DuduQ] Bubble Pop registrado:",
    VERSION
  );
})();

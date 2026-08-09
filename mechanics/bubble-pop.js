/* =========================================================
   DUDUQ MECHANIC — BUBBLE POP
   Adaptador central da mecânica Bubble Pop.
   Versão 1.0.2
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
  const VERSION = "1.0.2";

  /* =======================================================
     CAMINHO DO ENGINE
     ======================================================= */

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

  /* =======================================================
     SERIALIZAÇÃO SEGURA
     ======================================================= */

  function makeSerializable(value) {
    if (value == null) {
      return value;
    }

    try {
      if (
        typeof structuredClone ===
        "function"
      ) {
        return structuredClone(value);
      }
    } catch (_) {}

    try {
      return JSON.parse(
        JSON.stringify(value)
      );
    } catch (_) {
      return null;
    }
  }

  function createSafeContext(
    context = {}
  ) {
    /*
     * NÃO enviamos:
     *
     * context.assets
     * context.sound
     *
     * porque esses objetos possuem funções
     * que não podem atravessar postMessage.
     */

    return {
      engineVersion:
        context.engineVersion ??
        null,

      moduleId:
        context.moduleId ??
        null,

      year:
        context.year ??
        null,

      subject:
        context.subject ??
        null,

      module:
        context.module ??
        null,

      stepId:
        context.stepId ??
        null,

      stepIndex:
        context.stepIndex ??
        null,

      totalSteps:
        context.totalSteps ??
        null
    };
  }

  /* =======================================================
     VALIDAÇÃO
     ======================================================= */

  function validate(payload) {
    if (payload == null) {
      return false;
    }

    if (Array.isArray(payload)) {
      return payload.length > 0;
    }

    return (
      typeof payload ===
      "object"
    );
  }

  /* =======================================================
     MONTAGEM DA MECÂNICA
     ======================================================= */

  function mount({
    container,
    payload,
    options = {},
    context = {},
    onComplete
  }) {
    if (!container) {
      throw new Error(
        "[DuduQ Bubble Pop] Container não informado."
      );
    }

    container.innerHTML = "";

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "duduq-mechanic-frame";

    wrapper.style.width =
      "100%";

    wrapper.style.minHeight =
      "100vh";

    wrapper.style.position =
      "relative";

    /* =====================================================
       IFRAME
       ===================================================== */

    const iframe =
      document.createElement(
        "iframe"
      );

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

    iframe.style.width =
      "100%";

    iframe.style.height =
      "100vh";

    iframe.style.border =
      "0";

    iframe.style.display =
      "block";

    iframe.style.background =
      "transparent";

    /* =====================================================
       URL DA MECÂNICA
       ===================================================== */

    const engineBase =
      getEngineBase();

    const params =
      new URLSearchParams();

    if (context.year) {
      params.set(
        "ano",
        String(context.year)
      );
    }

    if (context.moduleId) {
      params.set(
        "module",
        String(
          context.moduleId
        )
      );
    }

    const query =
      params.toString();

    iframe.src =
      engineBase +
      "/DUDUQ_BUBBLE_POP.html" +
      (
        query
          ? "?" + query
          : ""
      );

    /* =====================================================
       PACOTE ENVIADO AO BUBBLE POP
       ===================================================== */

    const messagePayload =
      makeSerializable(payload);

    const messageOptions =
      makeSerializable(options) ||
      {};

    const messageContext =
      createSafeContext(
        context
      );

    function sendContent() {
      if (
        !iframe.contentWindow
      ) {
        return;
      }

      try {
        iframe.contentWindow.postMessage(
          {
            type:
              "DUDUQ_LOAD_CONTENT",

            mechanic:
              MECHANIC_ID,

            version:
              VERSION,

            payload:
              messagePayload,

            options:
              messageOptions,

            context:
              messageContext
          },
          "*"
        );

        console.info(
          "[DuduQ Bubble Pop] Conteúdo enviado para a mecânica."
        );
      } catch (error) {
        console.error(
          "[DuduQ Bubble Pop] Falha ao enviar conteúdo:",
          error
        );
      }
    }

    /* =====================================================
       MENSAGENS RECEBIDAS DA MECÂNICA
       ===================================================== */

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
        typeof data !==
          "object"
      ) {
        return;
      }

      /* ---------------------------------------------------
         MECÂNICA PRONTA
         --------------------------------------------------- */

      if (
        data.type ===
        "DUDUQ_MECHANIC_READY"
      ) {
        console.info(
          "[DuduQ Bubble Pop] Mecânica pronta."
        );

        sendContent();

        return;
      }

      /* ---------------------------------------------------
         MECÂNICA CONCLUÍDA
         --------------------------------------------------- */

      if (
        data.type ===
        "DUDUQ_MECHANIC_COMPLETE"
      ) {
        console.info(
          "[DuduQ Bubble Pop] Mecânica concluída.",
          data.result
        );

        if (
          typeof onComplete ===
          "function"
        ) {
          onComplete(
            data.result ||
            null
          );
        }

        return;
      }

      /* ---------------------------------------------------
         ERRO DA MECÂNICA
         --------------------------------------------------- */

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

    /* =====================================================
       FALLBACK DE ENVIO
       ===================================================== */

    iframe.addEventListener(
      "load",
      function () {
        /*
         * O envio principal acontece quando
         * recebemos DUDUQ_MECHANIC_READY.
         *
         * Este envio adicional serve apenas
         * como fallback.
         */
        window.setTimeout(
          sendContent,
          250
        );
      }
    );

    /* =====================================================
       INSERÇÃO
       ===================================================== */

    wrapper.appendChild(
      iframe
    );

    container.appendChild(
      wrapper
    );

    /* =====================================================
       DESTRUIÇÃO
       ===================================================== */

    return function destroy() {
      window.removeEventListener(
        "message",
        handleMessage
      );

      iframe.remove();

      wrapper.remove();
    };
  }

  /* =======================================================
     REGISTRO NO DUDUQ HOST
     ======================================================= */

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

/* =========================================================
   DUDUQ CORE — PROGRESS UI
   Sincronizador visual do progresso global entre mecânicas.
   Versão 1.0.0
   ========================================================= */

(function () {
  "use strict";

  if (
    window.DuduQProgressUI?.version ===
    "1.0.0"
  ) {
    return;
  }

  const VERSION =
    "1.0.0";

  const STYLE_ID =
    "duduq-global-progress-ui-style";

  const GLOBAL_ATTRIBUTE =
    "data-duduq-global-progress";

  let currentProgress =
    null;

  let rootObserver =
    null;

  const frameBindings =
    new Map();

  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );
  }

  function asNumber(
    value,
    fallback = 0
  ) {
    const number =
      Number(value);

    return Number.isFinite(
      number
    )
      ? number
      : fallback;
  }

  function asString(
    value,
    fallback = ""
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    const text =
      String(value).trim();

    return (
      text ||
      fallback
    );
  }

  function safeSetText(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    const text =
      String(value);

    if (
      element.textContent !==
      text
    ) {
      element.textContent =
        text;
    }
  }

  function safeSetAttribute(
    element,
    name,
    value
  ) {
    if (!element) {
      return;
    }

    const text =
      String(value);

    if (
      element.getAttribute(
        name
      ) !== text
    ) {
      element.setAttribute(
        name,
        text
      );
    }
  }

  /* =======================================================
     NORMALIZAÇÃO DO PROGRESSO
     ======================================================= */

  function normalizeProgress(
    input
  ) {
    if (
      !isObject(input)
    ) {
      return null;
    }

    const totalSteps =
      Math.max(
        1,
        Math.round(
          asNumber(
            input.totalSteps,
            1
          )
        )
      );

    let currentStep =
      Math.round(
        asNumber(
          input.currentStep,
          asNumber(
            input.currentStepIndex,
            0
          ) + 1
        )
      );

    currentStep =
      clamp(
        currentStep,
        1,
        totalSteps
      );

    const currentStepIndex =
      currentStep -
      1;

    const completed =
      input.completed ===
      true;

    let completedSteps =
      Math.round(
        asNumber(
          input.completedSteps,
          completed
            ? totalSteps
            : currentStepIndex
        )
      );

    completedSteps =
      clamp(
        completedSteps,
        0,
        totalSteps
      );

    if (completed) {
      completedSteps =
        totalSteps;
    }

    let fraction =
      asNumber(
        input.fraction,
        totalSteps > 0
          ? completedSteps /
            totalSteps
          : 0
      );

    fraction =
      clamp(
        fraction,
        0,
        1
      );

    if (completed) {
      fraction =
        1;
    }

    const percent =
      Math.round(
        fraction *
        100
      );

    const label =
      completed
        ? asString(
            input.label,
            `${totalSteps} de ${totalSteps} etapas concluídas`
          )
        : `Etapa ${currentStep} de ${totalSteps}`;

    return Object.freeze({
      source:
        "duduq-host",

      scope:
        "module",

      moduleId:
        input.moduleId ??
        null,

      currentStepIndex,

      currentStep,

      totalSteps,

      completedSteps,

      remainingSteps:
        Math.max(
          0,
          totalSteps -
            completedSteps
        ),

      fraction,

      percent,

      completed,

      label
    });
  }

  /* =======================================================
     CSS INJETADO NAS MECÂNICAS
     ======================================================= */

  function ensureFrameStyles(
    doc
  ) {
    if (
      !doc ||
      !doc.head
    ) {
      return;
    }

    if (
      doc.getElementById(
        STYLE_ID
      )
    ) {
      return;
    }

    const style =
      doc.createElement(
        "style"
      );

    style.id =
      STYLE_ID;

    style.textContent =
      `
/* =========================================================
   DUDUQ GLOBAL PROGRESS UI
   Inserido pelo core/duduq-progress-ui.js
   ========================================================= */

.duduq-engine-header.duduq-global-progress-header {
  position: relative !important;
}

/*
 * O progresso do módulo ocupa a coluna central.
 * O título continua à esquerda e os controles à direita.
 */
@media (min-width: 1120px) {

  .duduq-engine-header.duduq-global-progress-header {
    grid-template-columns:
      minmax(0, 1fr)
      minmax(430px, 580px)
      minmax(0, 1fr)
      !important;
  }

  .duduq-engine-header
    > .duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"] {
    grid-column: 2 !important;
    grid-row: 1 !important;

    width: 100% !important;
    max-width: 580px !important;

    min-width: 0 !important;

    align-self: center !important;
    justify-self: stretch !important;

    margin: 0 !important;
  }
}


/* =========================================================
   BARRA GLOBAL
   ========================================================= */

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"] {
  box-sizing: border-box !important;

  width: 100% !important;
  max-width: 580px !important;

  min-width: 0 !important;
  min-height: 48px !important;

  display: grid !important;

  grid-template-columns:
    minmax(0, 1fr)
    auto
    !important;

  grid-template-rows:
    auto
    !important;

  align-items: center !important;

  gap: 12px !important;

  padding:
    6px
    8px
    !important;

  overflow: visible !important;

  border: 0 !important;

  border-radius:
    18px
    !important;

  background:
    transparent
    !important;

  box-shadow:
    none
    !important;
}


/* Remove decorações antigas conflitantes. */

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]::before {
  display:
    none
    !important;
}


/* =========================================================
   TEXTO DA ETAPA
   ========================================================= */

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-copy {

  grid-column:
    2
    !important;

  grid-row:
    1
    !important;

  display:
    flex
    !important;

  align-items:
    center
    !important;

  justify-content:
    flex-end
    !important;

  min-width:
    max-content
    !important;

  margin:
    0
    !important;

  padding:
    0
    !important;
}


.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-copy
  span {

  display:
    none
    !important;
}


.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-copy
  strong {

  display:
    block
    !important;

  margin:
    0
    !important;

  color:
    #1d2b53
    !important;

  font-family:
    Fredoka,
    Nunito,
    ui-rounded,
    system-ui,
    sans-serif
    !important;

  font-size:
    clamp(
      13px,
      1.55vw,
      18px
    )
    !important;

  font-weight:
    800
    !important;

  line-height:
    1
    !important;

  letter-spacing:
    0
    !important;

  white-space:
    nowrap
    !important;
}


/* =========================================================
   TRILHO
   ========================================================= */

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-track {

  position:
    relative
    !important;

  grid-column:
    1
    !important;

  grid-row:
    1
    !important;

  width:
    auto
    !important;

  min-width:
    0
    !important;

  height:
    16px
    !important;

  min-height:
    16px
    !important;

  margin:
    0
    10px
    0
    0
    !important;

  overflow:
    hidden
    !important;

  border:
    0
    !important;

  border-radius:
    999px
    !important;

  background:
    linear-gradient(
      180deg,
      #e6eef6
      0%,
      #dce6f0
      100%
    )
    !important;

  box-shadow:
    inset
    0
    1px
    0
    rgba(
      255,
      255,
      255,
      .95
    ),

    inset
    0
    -1px
    4px
    rgba(
      84,
      114,
      146,
      .15
    )
    !important;
}


/* Remove marcadores locais da mecânica. */

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-track::after,

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-marker,

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-marker::after {

  display:
    none
    !important;
}


/* =========================================================
   PREENCHIMENTO
   ========================================================= */

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-fill {

  position:
    absolute
    !important;

  inset:
    0
    !important;

  width:
    100%
    !important;

  height:
    100%
    !important;

  border-radius:
    inherit
    !important;

  transform:
    scaleX(
      var(
        --duduq-global-progress,
        0
      )
    )
    !important;

  transform-origin:
    left
    center
    !important;

  background:
    linear-gradient(
      180deg,
      #43b3ff
      0%,
      #1592ff
      100%
    )
    !important;

  box-shadow:
    inset
    0
    2px
    0
    rgba(
      255,
      255,
      255,
      .35
    ),

    0
    1px
    2px
    rgba(
      10,
      108,
      214,
      .16
    )
    !important;

  transition:
    transform
    520ms
    cubic-bezier(
      .2,
      .8,
      .2,
      1
    )
    !important;
}


/* Reflexo discreto. */

.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-fill::before {

  content:
    ""
    !important;

  position:
    absolute
    !important;

  left:
    2px
    !important;

  right:
    2px
    !important;

  top:
    1px
    !important;

  height:
    40%
    !important;

  display:
    block
    !important;

  border-radius:
    999px
    !important;

  background:
    rgba(
      255,
      255,
      255,
      .28
    )
    !important;
}


.duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
  .duduq-progress-fill::after {

  content:
    ""
    !important;

  position:
    absolute
    !important;

  inset:
    0
    !important;

  display:
    block
    !important;

  border-radius:
    inherit
    !important;

  background:
    linear-gradient(
      115deg,
      transparent
      18%,
      rgba(
        255,
        255,
        255,
        .08
      )
      32%,
      rgba(
        255,
        255,
        255,
        .40
      )
      46%,
      rgba(
        255,
        255,
        255,
        .12
      )
      58%,
      transparent
      72%
    )
    !important;

  background-size:
    180%
    100%
    !important;

  animation:
    duduqGlobalProgressShine
    3.4s
    linear
    infinite
    !important;

  pointer-events:
    none
    !important;
}


@keyframes duduqGlobalProgressShine {

  0% {
    background-position:
      140%
      0;
  }

  100% {
    background-position:
      -40%
      0;
  }
}


/* =========================================================
   CONTADOR COMPACTO
   Caso alguma mecânica use esse formato.
   ========================================================= */

.duduq-engine-counter[${GLOBAL_ATTRIBUTE}="true"] {
  font-variant-numeric:
    tabular-nums;

  white-space:
    nowrap;
}


/* =========================================================
   RESPONSIVO
   ========================================================= */

@media (max-width: 1119px) {

  .duduq-engine-header
    > .duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"] {

    grid-column:
      1 / -1
      !important;

    grid-row:
      auto
      !important;

    justify-self:
      stretch
      !important;

    width:
      100%
      !important;

    max-width:
      none
      !important;
  }
}


@media (max-width: 720px) {

  .duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"] {
    min-height:
      42px
      !important;

    gap:
      8px
      !important;

    padding:
      4px
      2px
      !important;
  }

  .duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
    .duduq-progress-track {

    height:
      14px
      !important;

    min-height:
      14px
      !important;

    margin-right:
      4px
      !important;
  }

  .duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
    .duduq-progress-copy
    strong {

    font-size:
      13px
      !important;
  }
}


/* =========================================================
   ACESSIBILIDADE
   ========================================================= */

@media (
  prefers-reduced-motion:
  reduce
) {

  .duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
    .duduq-progress-fill {

    transition:
      none
      !important;
  }

  .duduq-progress-trail[${GLOBAL_ATTRIBUTE}="true"]
    .duduq-progress-fill::after {

    animation:
      none
      !important;

    display:
      none
      !important;
  }
}
`;

    doc.head.appendChild(
      style
    );
  }

  /* =======================================================
     CRIAÇÃO DA BARRA
     Usada somente quando a mecânica não renderiza uma.
     ======================================================= */

  function createProgressTrail(
    doc
  ) {
    const trail =
      doc.createElement(
        "div"
      );

    trail.className =
      [
        "duduq-progress-trail",
        "duduq-global-progress-trail"
      ].join(" ");

    trail.setAttribute(
      GLOBAL_ATTRIBUTE,
      "true"
    );

    trail.setAttribute(
      "role",
      "progressbar"
    );

    const track =
      doc.createElement(
        "div"
      );

    track.className =
      "duduq-progress-track";

    track.setAttribute(
      "aria-hidden",
      "true"
    );

    const fill =
      doc.createElement(
        "span"
      );

    fill.className =
      "duduq-progress-fill";

    track.appendChild(
      fill
    );

    const copy =
      doc.createElement(
        "div"
      );

    copy.className =
      "duduq-progress-copy";

    const caption =
      doc.createElement(
        "span"
      );

    caption.textContent =
      "Progresso";

    const strong =
      doc.createElement(
        "strong"
      );

    strong.textContent =
      "Etapa 1 de 1";

    copy.appendChild(
      caption
    );

    copy.appendChild(
      strong
    );

    trail.appendChild(
      track
    );

    trail.appendChild(
      copy
    );

    return trail;
  }

  /* =======================================================
     LOCALIZAÇÃO / CRIAÇÃO DO PROGRESSO
     ======================================================= */

  function resolveProgressTrail(
    doc
  ) {
    if (!doc) {
      return null;
    }

    let trail =
      doc.querySelector(
        ".duduq-progress-trail"
      );

    if (trail) {
      return trail;
    }

    const header =
      doc.querySelector(
        ".duduq-engine-header"
      );

    if (!header) {
      return null;
    }

    trail =
      createProgressTrail(
        doc
      );

    const toolbar =
      header.querySelector(
        ".duduq-engine-toolbar"
      );

    if (toolbar) {
      header.insertBefore(
        trail,
        toolbar
      );
    } else {
      header.appendChild(
        trail
      );
    }

    return trail;
  }

  /* =======================================================
     APLICAÇÃO VISUAL
     ======================================================= */

  function applyProgressToDocument(
    doc,
    rawProgress
  ) {
    const progress =
      normalizeProgress(
        rawProgress
      );

    if (
      !doc ||
      !progress
    ) {
      return false;
    }

    ensureFrameStyles(
      doc
    );

    const header =
      doc.querySelector(
        ".duduq-engine-header"
      );

    if (!header) {
      return false;
    }

    header.classList.add(
      "duduq-global-progress-header"
    );

    header.setAttribute(
      GLOBAL_ATTRIBUTE,
      "true"
    );

    const trail =
      resolveProgressTrail(
        doc
      );

    if (!trail) {
      return false;
    }

    trail.setAttribute(
      GLOBAL_ATTRIBUTE,
      "true"
    );

    trail.style.setProperty(
      "--duduq-global-progress",
      String(
        progress.fraction
      )
    );

    /*
     * Compatibilidade com a variável que
     * o runtime atual já utiliza.
     */
    trail.style.setProperty(
      "--lesson-progress",
      String(
        progress.fraction
      )
    );

    safeSetAttribute(
      trail,
      "aria-valuemin",
      0
    );

    safeSetAttribute(
      trail,
      "aria-valuemax",
      progress.totalSteps
    );

    safeSetAttribute(
      trail,
      "aria-valuenow",
      progress.completedSteps
    );

    safeSetAttribute(
      trail,
      "aria-valuetext",
      progress.completed
        ? progress.label
        : (
            `${progress.label}. ` +
            `${progress.completedSteps} de ${progress.totalSteps} etapas concluídas.`
          )
    );

    trail.dataset.duduqCurrentStep =
      String(
        progress.currentStep
      );

    trail.dataset.duduqTotalSteps =
      String(
        progress.totalSteps
      );

    trail.dataset.duduqCompletedSteps =
      String(
        progress.completedSteps
      );

    trail.dataset.duduqPercent =
      String(
        progress.percent
      );

    trail.dataset.duduqComplete =
      progress.completed
        ? "true"
        : "false";

    const copy =
      trail.querySelector(
        ".duduq-progress-copy"
      );

    let strong =
      copy?.querySelector(
        "strong"
      );

    if (
      copy &&
      !strong
    ) {
      strong =
        doc.createElement(
          "strong"
        );

      copy.appendChild(
        strong
      );
    }

    safeSetText(
      strong,
      progress.label
    );

    /* =====================================================
       CONTADOR COMPACTO
       ===================================================== */

    const counters =
      doc.querySelectorAll(
        ".duduq-engine-counter"
      );

    counters.forEach(
      (counter) => {
        counter.setAttribute(
          GLOBAL_ATTRIBUTE,
          "true"
        );

        safeSetText(
          counter,
          `${progress.currentStep} / ${progress.totalSteps}`
        );

        safeSetAttribute(
          counter,
          "aria-label",
          progress.label
        );
      }
    );

    return true;
  }

  /* =======================================================
     ENVIO DO CONTRATO TAMBÉM POR POSTMESSAGE
     Futuras mecânicas poderão consumir nativamente.
     ======================================================= */

  function sendProgressMessage(
    iframe,
    progress
  ) {
    if (
      !iframe?.contentWindow ||
      !progress
    ) {
      return;
    }

    try {
      iframe
        .contentWindow
        .postMessage(
          {
            type:
              "DUDUQ_GLOBAL_PROGRESS",

            source:
              "duduq-progress-ui",

            version:
              VERSION,

            progress
          },
          "*"
        );
    } catch (_) {}
  }

  /* =======================================================
     SINCRONIZAÇÃO DO IFRAME
     ======================================================= */

  function syncFrame(
    iframe,
    progress =
      currentProgress
  ) {
    if (
      !(iframe instanceof HTMLIFrameElement) ||
      !progress
    ) {
      return false;
    }

    const normalized =
      normalizeProgress(
        progress
      );

    if (!normalized) {
      return false;
    }

    sendProgressMessage(
      iframe,
      normalized
    );

    try {
      const doc =
        iframe.contentDocument;

      if (
        !doc ||
        !doc.documentElement
      ) {
        return false;
      }

      return applyProgressToDocument(
        doc,
        normalized
      );
    } catch (error) {
      /*
       * Mantemos silêncio para iframes externos.
       * As mecânicas do DuduQ são same-origin.
       */
      return false;
    }
  }

  /* =======================================================
     OBSERVADOR INTERNO DO IFRAME
     React pode redesenhar o cabeçalho; sincronizamos novamente.
     ======================================================= */

  function attachFrameObserver(
    iframe
  ) {
    if (
      !(iframe instanceof HTMLIFrameElement)
    ) {
      return;
    }

    const previous =
      frameBindings.get(
        iframe
      );

    if (previous) {
      return;
    }

    const binding = {
      observer:
        null,

      loadHandler:
        null,

      scheduled:
        false
    };

    function scheduleSync() {
      if (
        binding.scheduled
      ) {
        return;
      }

      binding.scheduled =
        true;

      window.requestAnimationFrame(
        function () {
          binding.scheduled =
            false;

          syncFrame(
            iframe
          );
        }
      );
    }

    function connectDocumentObserver() {
      try {
        const doc =
          iframe.contentDocument;

        if (
          !doc ||
          !doc.documentElement
        ) {
          return;
        }

        if (
          binding.observer
        ) {
          binding.observer
            .disconnect();
        }

        binding.observer =
          new MutationObserver(
            scheduleSync
          );

        binding.observer.observe(
          doc.documentElement,
          {
            childList:
              true,

            subtree:
              true,

            characterData:
              true
          }
        );

        /*
         * React precisa de um pequeno instante
         * para montar o cabeçalho.
         */
        scheduleSync();

        window.setTimeout(
          scheduleSync,
          80
        );

        window.setTimeout(
          scheduleSync,
          250
        );

        window.setTimeout(
          scheduleSync,
          650
        );
      } catch (_) {}
    }

    binding.loadHandler =
      function () {
        connectDocumentObserver();

        sendProgressMessage(
          iframe,
          currentProgress
        );
      };

    iframe.addEventListener(
      "load",
      binding.loadHandler
    );

    frameBindings.set(
      iframe,
      binding
    );

    /*
     * Caso o iframe já esteja carregado.
     */
    connectDocumentObserver();
  }

  /* =======================================================
     REMOÇÃO DO BINDING
     ======================================================= */

  function detachFrame(
    iframe
  ) {
    const binding =
      frameBindings.get(
        iframe
      );

    if (!binding) {
      return;
    }

    try {
      binding.observer
        ?.disconnect();
    } catch (_) {}

    try {
      iframe.removeEventListener(
        "load",
        binding.loadHandler
      );
    } catch (_) {}

    frameBindings.delete(
      iframe
    );
  }

  /* =======================================================
     DESCOBERTA DE IFRAMES
     ======================================================= */

  function discoverFrames(
    root =
      document
  ) {
    if (!root) {
      return;
    }

    if (
      root instanceof
      HTMLIFrameElement
    ) {
      attachFrameObserver(
        root
      );

      syncFrame(
        root
      );

      return;
    }

    const frames =
      root.querySelectorAll
        ? root.querySelectorAll(
            "iframe"
          )
        : [];

    frames.forEach(
      (iframe) => {
        attachFrameObserver(
          iframe
        );

        syncFrame(
          iframe
        );
      }
    );
  }

  /* =======================================================
     SINCRONIZAÇÃO GLOBAL
     ======================================================= */

  function sync() {
    discoverFrames(
      document
    );

    frameBindings.forEach(
      (_, iframe) => {
        if (
          !document.documentElement.contains(
            iframe
          )
        ) {
          detachFrame(
            iframe
          );

          return;
        }

        syncFrame(
          iframe
        );
      }
    );

    return currentProgress;
  }

  /* =======================================================
     DEFINIR PROGRESSO ATUAL
     ======================================================= */

  function setProgress(
    progress
  ) {
    const normalized =
      normalizeProgress(
        progress
      );

    if (!normalized) {
      return null;
    }

    currentProgress =
      normalized;

    sync();

    return currentProgress;
  }

  function getProgress() {
    return currentProgress;
  }

  /* =======================================================
     EVENTOS DO HOST
     ======================================================= */

  function handleHostProgressEvent(
    event
  ) {
    const progress =
      event?.detail
        ?.progress;

    if (!progress) {
      return;
    }

    setProgress(
      progress
    );
  }

  function connectHostEvents() {
    [
      "duduq:module-start",
      "duduq:step-start",
      "duduq:step-complete",
      "duduq:module-restart",
      "duduq:module-complete"
    ].forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleHostProgressEvent
        );
      }
    );
  }

  function disconnectHostEvents() {
    [
      "duduq:module-start",
      "duduq:step-start",
      "duduq:step-complete",
      "duduq:module-restart",
      "duduq:module-complete"
    ].forEach(
      (eventName) => {
        window.removeEventListener(
          eventName,
          handleHostProgressEvent
        );
      }
    );
  }

  /* =======================================================
     OBSERVADOR DO DOCUMENTO PAI
     Detecta a troca Bubble Pop → Drag & Drop → etc.
     ======================================================= */

  function connectRootObserver() {
    if (
      rootObserver ||
      !document.documentElement
    ) {
      return;
    }

    rootObserver =
      new MutationObserver(
        function (
          mutations
        ) {
          let needsDiscovery =
            false;

          mutations.forEach(
            (mutation) => {
              mutation
                .addedNodes
                .forEach(
                  (node) => {
                    if (
                      node instanceof
                      HTMLIFrameElement
                    ) {
                      needsDiscovery =
                        true;

                      return;
                    }

                    if (
                      node instanceof
                      Element &&
                      node.querySelector(
                        "iframe"
                      )
                    ) {
                      needsDiscovery =
                        true;
                    }
                  }
                );
            }
          );

          if (
            needsDiscovery
          ) {
            window.requestAnimationFrame(
              sync
            );
          }
        }
      );

    rootObserver.observe(
      document.documentElement,
      {
        childList:
          true,

        subtree:
          true
      }
    );
  }

  /* =======================================================
     RECUPERAÇÃO DE SESSÃO EXISTENTE
     ======================================================= */

  function recoverHostProgress() {
    try {
      const progress =
        window.DuduQ
          ?.getProgress
          ?.();

      if (progress) {
        setProgress(
          progress
        );

        return;
      }
    } catch (_) {}

    sync();
  }

  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  function init() {
    connectHostEvents();

    connectRootObserver();

    discoverFrames(
      document
    );

    recoverHostProgress();

    window.setTimeout(
      recoverHostProgress,
      100
    );

    window.setTimeout(
      recoverHostProgress,
      500
    );

    console.info(
      "[DuduQ] Progress UI carregado:",
      VERSION
    );
  }

  /* =======================================================
     DESTRUIR
     ======================================================= */

  function destroy() {
    disconnectHostEvents();

    try {
      rootObserver
        ?.disconnect();
    } catch (_) {}

    rootObserver =
      null;

    Array.from(
      frameBindings.keys()
    ).forEach(
      detachFrame
    );

    currentProgress =
      null;
  }

  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.DuduQProgressUI =
    Object.freeze({
      version:
        VERSION,

      init,

      setProgress,

      getProgress,

      sync,

      bindFrame:
        function (
          iframe,
          progress
        ) {
          attachFrameObserver(
            iframe
          );

          if (progress) {
            setProgress(
              progress
            );
          }

          return syncFrame(
            iframe,
            progress ||
            currentProgress
          );
        },

      destroy
    });

  /* =======================================================
     START
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:
          true
      }
    );
  } else {
    init();
  }

})();

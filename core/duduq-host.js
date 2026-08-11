/* =========================================================
   DUDUQ CORE — HOST
   Orquestrador central das mecânicas e módulos DuduQ.
   Versão 1.5.4
 
   NOVIDADES 1.5.2
   - mantém tela cheia no documento principal entre mecânicas
   - conclusão usa uma única transição, sem espera ou entrada duplicada
   - atualiza a integração visual para World Fusion 1.1

   NOVIDADES 1.5.1
   - sincroniza o Host com a ponte visual opaca do Transition 1.5
   - reduz a duração percebida da troca e da conclusão
   - a camada de transição protege todo o destroy/mount
   - transition-swoosh toca somente entre mecânicas
   - silencia o win interno durante trocas intermediárias
   - win final toca somente depois da transição de conclusão
   - mantém o Host como fonte oficial do progresso
   ========================================================= */
 
(function () {
  "use strict";

  const HOST_SCRIPT_URL =
    document.currentScript?.src ||
    new URL("./duduq-host.js", window.location.href).href;
 
  const VERSION = "1.5.4";
 
  if (
    window.DuduQ &&
    window.DuduQ.version === VERSION
  ) {
    return;
  }
 
  const mechanics = new Map();
 
  let activeSession = null;

  /* =======================================================
     TELA CHEIA CENTRALIZADA

     O documento principal é o proprietário da tela cheia.
     Assim, destruir o iframe durante uma troca de mecânica
     não encerra o modo solicitado pelo estudante.
     ======================================================= */

  function isFullscreenActive() {
    return Boolean(document.fullscreenElement);
  }

  function broadcastFullscreenState() {
    const message = {
      type: "DUDUQ_FULLSCREEN_STATE",
      active: isFullscreenActive(),
      engineVersion: VERSION
    };

    document.querySelectorAll("iframe").forEach(
      function (iframe) {
        try {
          iframe.contentWindow?.postMessage(message, "*");
        } catch (_) {}
      }
    );
  }

  async function toggleFullscreen() {
    try {
      if (isFullscreenActive()) {
        await document.exitFullscreen?.();
      } else {
        await document.documentElement.requestFullscreen?.({
          navigationUI: "hide"
        });
      }
    } catch (error) {
      console.warn(
        "[DuduQ Host] Não foi possível alternar a tela cheia.",
        error
      );
    }

    broadcastFullscreenState();
    return isFullscreenActive();
  }

  window.DuduQFullscreen = Object.freeze({
    version: "1.0.0",
    toggle: toggleFullscreen,
    isActive: isFullscreenActive
  });

  document.addEventListener(
    "fullscreenchange",
    broadcastFullscreenState
  );

  window.addEventListener(
    "message",
    function (event) {
      const data = event.data;

      if (!data || typeof data !== "object") {
        return;
      }

      const sourceBelongsToMountedFrame = Array.from(
        document.querySelectorAll("iframe")
      ).some(
        function (iframe) {
          return iframe.contentWindow === event.source;
        }
      );

      if (!sourceBelongsToMountedFrame) {
        return;
      }

      if (data.type === "DUDUQ_FULLSCREEN_QUERY") {
        broadcastFullscreenState();
        return;
      }

      if (data.type === "DUDUQ_FULLSCREEN_TOGGLE") {
        toggleFullscreen();
      }
    }
  );
 
  const TRANSITION_OPTIONS = Object.freeze({
    coverDurationMs: 220,
    revealDurationMs: 260,
    paintFrames: 2,
    bridgeHoldMs: 0,
    soundEnabled: false
  });
 
  const VIEW_READY_TIMEOUT_MS = 520;
  const POST_LOAD_SETTLE_MS = 40;


  /* =======================================================
     WORLD FUSION

     Qualquer página que carregue o Host recebe a camada
     visual compartilhada, mesmo sem usar o index de teste.
     ======================================================= */

  function ensureWorldFusion() {
    const coreBase = new URL("./", HOST_SCRIPT_URL);

    if (!document.getElementById("duduq-world-fusion-core-style")) {
      const link = document.createElement("link");
      link.id = "duduq-world-fusion-core-style";
      link.rel = "stylesheet";
      link.href = new URL("duduq-world-fusion.css?v=123", coreBase).href;
      (document.head || document.documentElement).appendChild(link);
    }

    if (
      !window.DuduQWorldFusion &&
      !document.getElementById("duduq-world-fusion-core-script")
    ) {
      const script = document.createElement("script");
      script.id = "duduq-world-fusion-core-script";
      script.src = new URL("duduq-world-fusion.js?v=122", coreBase).href;
      script.async = true;
      (document.head || document.documentElement).appendChild(script);
    }
  }

  ensureWorldFusion();

  let completionMascotSource = "";
  let completionMascotReadyPromise = null;

  function resolveCompletionMascotSource() {
    return (
      window.DuduQAssets?.assets?.mascots?.complete ||
      window.DUDUQ_ASSETS?.mascots?.complete ||
      ""
    );
  }

  function primeCompletionMascot() {
    const source = resolveCompletionMascotSource();

    if (!source) {
      return Promise.resolve(false);
    }

    if (
      source === completionMascotSource &&
      completionMascotReadyPromise
    ) {
      return completionMascotReadyPromise;
    }

    completionMascotSource = source;
    completionMascotReadyPromise = new Promise(
      function (resolve) {
        const image = new Image();
        let settled = false;

        function finish(result) {
          if (settled) return;
          settled = true;
          resolve(result);
        }

        image.decoding = "async";
        image.fetchPriority = "high";
        image.onload = function () {
          if (typeof image.decode === "function") {
            image.decode().then(
              function () { finish(true); },
              function () { finish(true); }
            );
            return;
          }
          finish(true);
        };
        image.onerror = function () { finish(false); };
        image.src = source;

        if (image.complete && image.naturalWidth > 0) {
          image.onload();
        }
      }
    );

    return completionMascotReadyPromise;
  }

  primeCompletionMascot();
  window.addEventListener("duduq:assets-ready", primeCompletionMascot);
 
 
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
 
 
  function asString(value, fallback = "") {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }
 
    const text = String(value).trim();
 
    return text || fallback;
  }
 
 
  function clamp(value, minimum, maximum) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );
  }
 
 
  function resolveContainer(value) {
    if (value instanceof Element) {
      return value;
    }
 
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      const element = document.querySelector(value);
 
      if (element) {
        return element;
      }
    }
 
    const root = document.getElementById("root");
 
    if (root) {
      return root;
    }
 
    throw new Error(
      "[DuduQ Host] Container da atividade não encontrado."
    );
  }
 
 
  function clearContainer(container) {
    if (!container) {
      return;
    }
 
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
 
 
  function createElement(tag, styles = {}) {
    const element = document.createElement(tag);
 
    Object.assign(
      element.style,
      styles
    );
 
    return element;
  }
 
 
  function normalizeMechanicId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  }
 
 
  function dispatch(name, detail = {}) {
    try {
      window.dispatchEvent(
        new CustomEvent(
          name,
          { detail }
        )
      );
    } catch (_) {}
  }
 
 
  function applyYearBackground(year) {
    try {
      window.DuduQAssets
        ?.setYear
        ?.(year);
    } catch (_) {}
  }
 
 
  function hideCompletion() {
    try {
      window.DuduQCompletion
        ?.hide
        ?.();
    } catch (_) {}
  }
 
 
  function destroyMountedMechanic(session) {
    if (
      !session ||
      typeof session.destroyCurrent !== "function"
    ) {
      return;
    }
 
    const destroy = session.destroyCurrent;
 
    session.destroyCurrent = null;
 
    try {
      destroy();
    } catch (error) {
      console.warn(
        "[DuduQ Host] Erro durante destroy() da mecânica:",
        error
      );
    }
  }
 
 
  function nextFrame() {
    return new Promise(
      function (resolve) {
        window.requestAnimationFrame(resolve);
      }
    );
  }
 
 
  async function waitPaintFrames(count = 2) {
    const total = clamp(
      Math.round(Number(count) || 2),
      1,
      6
    );
 
    for (
      let index = 0;
      index < total;
      index += 1
    ) {
      await nextFrame();
    }
  }
 
 
  function getTransition() {
    const transition = window.DuduQTransition;
 
    if (
      transition &&
      typeof transition.swap === "function"
    ) {
      return transition;
    }
 
    return null;
  }

 
  /* =======================================================
     SILÊNCIO DE VITÓRIA ENTRE MECÂNICAS
 
     A comemoração "win" pertence somente à conclusão real
     do módulo. Algumas mecânicas legadas possuem um canal
     sonoro próprio dentro do iframe; por isso o Host corta
     o win tanto no Core quanto no runtime montado.
     ======================================================= */
 
  function silenceIntermediateVictory(session) {
    try {
      window.DuduQSound
        ?.stop
        ?.("win");
    } catch (_) {}
 
    const iframe = session
      ?.container
      ?.querySelector
      ? session.container.querySelector("iframe")
      : null;
 
    if (!iframe) {
      return true;
    }
 
    try {
      iframe.contentWindow
        ?.DuduQSound
        ?.stop
        ?.("win");
    } catch (_) {}
 
    try {
      const audios = iframe.contentDocument
        ?.querySelectorAll
        ?.("audio");
 
      if (audios) {
        audios.forEach(function (audio) {
          const src = String(
            audio.currentSrc ||
            audio.src ||
            ""
          ).toLowerCase();
 
          const isWin =
            src.includes("you%20win") ||
            src.includes("you win") ||
            src.includes("you_win") ||
            /(^|\/)win(?:[-_.]|$)/.test(src);
 
          if (!isWin) {
            return;
          }
 
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (_) {}
        });
      }
    } catch (_) {}
 
    return true;
  }
 
 
  /* =======================================================
     PRONTIDÃO DA NOVA TELA
 
     As mecânicas atuais usam iframe. O Host aguarda:
     1. DUDUQ_MECHANIC_READY do iframe, OU
     2. load do iframe + pequena estabilização, OU
     3. timeout de segurança.
 
     Para telas sem iframe, aguardamos frames de pintura.
     ======================================================= */
 
  async function waitForMountedView(
    session,
    options = {}
  ) {
    if (
      !session ||
      session !== activeSession
    ) {
      return false;
    }
 
    await waitPaintFrames(
      options.paintFrames || 1
    );
 
    if (
      session !== activeSession
    ) {
      return false;
    }
 
    const iframe = session.container
      ?.querySelector
      ? session.container.querySelector("iframe")
      : null;
 
    if (!iframe) {
      return true;
    }
 
    /*
     * Atalho seguro: se o iframe real já terminou de carregar
     * antes de registrarmos os listeners, não esperamos o
     * timeout. Evitamos apenas o about:blank inicial.
     */
    try {
      const declaredSrc = String(
        iframe.getAttribute("src") ||
        ""
      ).trim();
 
      const readyState =
        iframe.contentDocument
          ?.readyState ||
        "";
 
      if (
        declaredSrc &&
        !/^about:blank(?:$|[?#])/i.test(declaredSrc) &&
        (
          readyState === "interactive" ||
          readyState === "complete"
        )
      ) {
        await waitPaintFrames(1);
        return true;
      }
    } catch (_) {}
 
    return new Promise(
      function (resolve) {
        let settled = false;
        let timeoutId = null;
        let postLoadTimer = null;
 
        function cleanup() {
          try {
            window.removeEventListener(
              "message",
              handleMessage
            );
          } catch (_) {}
 
          try {
            iframe.removeEventListener(
              "load",
              handleLoad
            );
          } catch (_) {}
 
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
          }
 
          if (postLoadTimer !== null) {
            window.clearTimeout(postLoadTimer);
          }
        }
 
        function finish() {
          if (settled) {
            return;
          }
 
          settled = true;
          cleanup();
          resolve(true);
        }
 
        function handleMessage(event) {
          if (
            event.source !== iframe.contentWindow
          ) {
            return;
          }
 
          const data = event.data;
 
          if (
            data &&
            typeof data === "object" &&
            data.type === "DUDUQ_MECHANIC_READY"
          ) {
            window.requestAnimationFrame(finish);
          }
        }
 
        function handleLoad() {
          /*
           * Apenas um respiro curtíssimo para o primeiro paint.
           * A troca não deve parecer uma tela de loading.
           */
          postLoadTimer = window.setTimeout(
            finish,
            POST_LOAD_SETTLE_MS
          );
        }
 
        window.addEventListener(
          "message",
          handleMessage
        );
 
        iframe.addEventListener(
          "load",
          handleLoad,
          { once: true }
        );
 
        timeoutId = window.setTimeout(
          finish,
          clamp(
            Number(options.timeoutMs) || VIEW_READY_TIMEOUT_MS,
            180,
            900
          )
        );
      }
    );
  }
 
  function runTransitionSwap(
    session,
    callback,
    options = {}
  ) {
    if (
      !session ||
      session !== activeSession ||
      typeof callback !== "function"
    ) {
      return Promise.resolve(false);
    }
 
    const transition = getTransition();
 
    session.transitioning = true;
 
    const finishTransitionState = function () {
      if (
        session === activeSession
      ) {
        session.transitioning = false;
      }
    };
 
    if (!transition) {
      let result;
 
      try {
        result = callback();
      } catch (error) {
        finishTransitionState();
        return Promise.reject(error);
      }
 
      return Promise
        .resolve(result)
        .finally(finishTransitionState);
    }
 
    return transition
      .swap(
        callback,
        {
          ...TRANSITION_OPTIONS,
          ...options
        }
      )
      .finally(finishTransitionState);
  }
 
 
  /* =======================================================
     REGISTRO DE MECÂNICAS
     ======================================================= */
 
  function registerMechanic(definition) {
    if (!isObject(definition)) {
      throw new Error(
        "[DuduQ Host] A definição da mecânica precisa ser um objeto."
      );
    }
 
    const id = normalizeMechanicId(definition.id);
 
    if (!id) {
      throw new Error(
        "[DuduQ Host] A mecânica precisa possuir um id."
      );
    }
 
    if (
      typeof definition.mount !== "function"
    ) {
      throw new Error(
        `[DuduQ Host] A mecânica "${id}" precisa fornecer uma função mount().`
      );
    }
 
    const mechanic = Object.freeze({
      id,
 
      version: String(
        definition.version || "1.0.0"
      ),
 
      mount: definition.mount,
 
      validate:
        typeof definition.validate === "function"
          ? definition.validate
          : null,
 
      metadata:
        isObject(definition.metadata)
          ? Object.freeze({
              ...definition.metadata
            })
          : Object.freeze({})
    });
 
    mechanics.set(id, mechanic);
 
    return mechanic;
  }
 
 
  function unregisterMechanic(id) {
    return mechanics.delete(
      normalizeMechanicId(id)
    );
  }
 
 
  function getMechanic(id) {
    return (
      mechanics.get(
        normalizeMechanicId(id)
      ) || null
    );
  }
 
 
  function hasMechanic(id) {
    return mechanics.has(
      normalizeMechanicId(id)
    );
  }
 
 
  function listMechanics() {
    return Array
      .from(mechanics.values())
      .map(
        function (mechanic) {
          return {
            id: mechanic.id,
            version: mechanic.version,
            metadata: mechanic.metadata
          };
        }
      );
  }
 
 
  /* =======================================================
     NORMALIZAÇÃO DO MÓDULO
     ======================================================= */
 
  function normalizeStep(step, index) {
    if (!isObject(step)) {
      throw new Error(
        `[DuduQ Host] A etapa ${index + 1} precisa ser um objeto.`
      );
    }
 
    const mechanic = normalizeMechanicId(
      step.mechanic ||
      step.mechanicId ||
      step.type
    );
 
    if (!mechanic) {
      throw new Error(
        `[DuduQ Host] A etapa ${index + 1} não possui uma mecânica.`
      );
    }
 
    return {
      ...step,
 
      id: asString(
        step.id,
        `step-${index + 1}`
      ),
 
      mechanic,
 
      payload:
        step.payload !== undefined
          ? step.payload
          : step.content !== undefined
            ? step.content
            : {},
 
      options:
        isObject(step.options)
          ? { ...step.options }
          : {}
    };
  }
 
 
  function normalizeModule(input) {
    if (!isObject(input)) {
      throw new Error(
        "[DuduQ Host] O módulo precisa ser um objeto."
      );
    }
 
    const steps = Array.isArray(input.steps)
      ? input.steps.map(normalizeStep)
      : [];
 
    if (steps.length === 0) {
      throw new Error(
        "[DuduQ Host] O módulo precisa possuir pelo menos uma etapa."
      );
    }
 
    return {
      ...input,
 
      id: asString(
        input.id,
        `module-${Date.now()}`
      ),
 
      year:
        input.year ??
        input.grade ??
        null,
 
      subject: asString(
        input.subject,
        ""
      ),
 
      module:
        input.module ??
        input.unit ??
        null,
 
      title: asString(
        input.title,
        ""
      ),
 
      steps,
 
      container:
        input.container ??
        "#root"
    };
  }
 
 
  /* =======================================================
     PROGRESSO GLOBAL
     O HOST É A FONTE OFICIAL DO PROGRESSO.
     ======================================================= */
 
  function buildProgress(
    session,
    options = {}
  ) {
    if (!session) {
      return null;
    }
 
    const totalSteps = session.module.steps.length;
 
    const completed =
      options.completed === true ||
      session.completed === true;
 
    let currentStepIndex = Number.isFinite(
      options.currentStepIndex
    )
      ? options.currentStepIndex
      : session.stepIndex;
 
    if (totalSteps > 0) {
      currentStepIndex = clamp(
        currentStepIndex,
        0,
        totalSteps - 1
      );
    } else {
      currentStepIndex = 0;
    }
 
    let completedSteps;
 
    if (completed) {
      completedSteps = totalSteps;
    } else if (
      Number.isFinite(options.completedSteps)
    ) {
      completedSteps = clamp(
        Math.round(options.completedSteps),
        0,
        totalSteps
      );
    } else {
      completedSteps = clamp(
        currentStepIndex,
        0,
        totalSteps
      );
    }
 
    const fraction = totalSteps > 0
      ? clamp(
          completedSteps / totalSteps,
          0,
          1
        )
      : 0;
 
    const percent = Math.round(
      fraction * 100
    );
 
    const currentStep = totalSteps > 0
      ? currentStepIndex + 1
      : 0;
 
    const remainingSteps = Math.max(
      0,
      totalSteps - completedSteps
    );
 
    return Object.freeze({
      source: "duduq-host",
      scope: "module",
      moduleId: session.module.id,
      currentStepIndex,
      currentStep,
      totalSteps,
      completedSteps,
      remainingSteps,
      fraction,
      percent,
      completed,
 
      label: completed
        ? `${completedSteps} de ${totalSteps} etapas concluídas`
        : `Etapa ${currentStep} de ${totalSteps}`
    });
  }
 
 
  function getProgress() {
    if (!activeSession) {
      return null;
    }
 
    return buildProgress(
      activeSession,
      {
        completed:
          activeSession.completed === true
      }
    );
  }
 
 
  function buildStepContext(session, step) {
    const progress = buildProgress(session);
 
    return {
      engineVersion: VERSION,
      moduleId: session.module.id,
      year: session.module.year,
      subject: session.module.subject,
      module: session.module.module,
      stepId: step.id,
      stepIndex: session.stepIndex,
      totalSteps: session.module.steps.length,
 
      progress,
 
      /* Alias temporário durante a migração das mecânicas. */
      globalProgress: progress,
 
      assets:
        window.DuduQAssets ||
        window.DUDUQ_ASSETS ||
        null,
 
      sound:
        window.DuduQSound ||
        null
    };
  }
 
 
  /* =======================================================
     ERROS DE EXECUÇÃO
     ======================================================= */
 
  function renderRuntimeError(
    session,
    message,
    error = null
  ) {
    destroyMountedMechanic(session);
    hideCompletion();
    clearContainer(session.container);
 
    const box = createElement(
      "div",
      {
        width: "min(720px, 92vw)",
        margin: "48px auto",
        boxSizing: "border-box",
        padding: "28px",
        borderRadius: "24px",
        background: "rgba(255,255,255,0.96)",
        color: "#17375e",
        fontFamily: "system-ui, sans-serif",
        boxShadow: "0 18px 44px rgba(25,61,96,0.18)",
        textAlign: "center"
      }
    );
 
    const title = createElement(
      "h2",
      {
        margin: "0 0 10px",
        color: "#0567c9",
        fontSize: "28px"
      }
    );
 
    title.textContent =
      "Não foi possível abrir esta etapa";
 
    const text = createElement(
      "p",
      {
        margin: "0",
        fontSize: "17px",
        lineHeight: "1.45"
      }
    );
 
    text.textContent = message;
 
    box.appendChild(title);
    box.appendChild(text);
 
    session.container.appendChild(box);
 
    console.error(
      "[DuduQ Host]",
      message,
      error || ""
    );
 
    dispatch(
      "duduq:error",
      {
        engineVersion: VERSION,
        moduleId: session.module.id,
        stepIndex: session.stepIndex,
        message,
        error
      }
    );
  }
 
 
  /* =======================================================
     EXECUÇÃO DAS ETAPAS
     ======================================================= */
 
  function renderCurrentStep(session) {
    if (
      !session ||
      session !== activeSession
    ) {
      return false;
    }
 
    if (
      session.stepIndex >=
      session.module.steps.length
    ) {
      finishModule(session);
      return true;
    }
 
    hideCompletion();
 
    /*
     * Este destroy continua aqui por segurança.
     * Durante uma troca normal ele ocorre somente quando
     * DuduQTransition já cobriu a tela.
     */
    destroyMountedMechanic(session);
    clearContainer(session.container);
 
    const step = session.module.steps[
      session.stepIndex
    ];
 
    const mechanic = getMechanic(
      step.mechanic
    );
 
    session.stepCompleted = false;
 
    if (!mechanic) {
      renderRuntimeError(
        session,
        `A mecânica "${step.mechanic}" não está registrada.`
      );
 
      return false;
    }
 
    if (mechanic.validate) {
      let valid = false;
 
      try {
        valid = mechanic.validate(
          step.payload,
          step.options
        ) !== false;
      } catch (error) {
        renderRuntimeError(
          session,
          `A validação da mecânica "${step.mechanic}" apresentou um erro.`,
          error
        );
 
        return false;
      }
 
      if (!valid) {
        renderRuntimeError(
          session,
          `O conteúdo da etapa "${step.id}" não é compatível com a mecânica "${step.mechanic}".`
        );
 
        return false;
      }
    }
 
    const context = buildStepContext(
      session,
      step
    );
 
    dispatch(
      "duduq:step-start",
      {
        engineVersion: VERSION,
        moduleId: session.module.id,
        stepId: step.id,
        stepIndex: session.stepIndex,
        mechanicId: mechanic.id,
        progress: context.progress
      }
    );
 
    try {
      const destroy = mechanic.mount({
        container: session.container,
        payload: step.payload,
        options: step.options,
        context,
 
        onComplete(result) {
          completeCurrentStep(
            session,
            result
          );
        }
      });
 
      session.destroyCurrent =
        typeof destroy === "function"
          ? destroy
          : null;
 
      return true;
    } catch (error) {
      renderRuntimeError(
        session,
        `Não foi possível iniciar a mecânica "${step.mechanic}".`,
        error
      );
 
      return false;
    }
  }
 
 
  function completeCurrentStep(
    session,
    result = null
  ) {
    if (
      !session ||
      session !== activeSession ||
      session.completed
    ) {
      return false;
    }
 
    if (
      session.stepCompleted ||
      session.transitioning
    ) {
      return false;
    }
 
    const step = session.module.steps[
      session.stepIndex
    ];
 
    if (!step) {
      return false;
    }
 
    const hasNextMechanic =
      session.stepIndex + 1 <
      session.module.steps.length;
 
    const isFinalStep =
      !hasNextMechanic;
 
    /*
     * Travamos a conclusão imediatamente para impedir
     * duplo clique / dupla mensagem do iframe.
     */
    session.stepCompleted = true;
 
    /*
     * Entre mecânicas não existe som de vitória.
     * Se um runtime interno iniciou o win, cortamos agora,
     * antes do slide começar.
     */
    if (hasNextMechanic) {
      silenceIntermediateVictory(session);
    }
 
    session.results.push({
      stepId: step.id,
      mechanicId: step.mechanic,
      stepIndex: session.stepIndex,
      result: result ?? null
    });
 
    const completedSteps = clamp(
      session.stepIndex + 1,
      0,
      session.module.steps.length
    );
 
    const progressAfterStep = buildProgress(
      session,
      { completedSteps }
    );
 
    dispatch(
      "duduq:step-complete",
      {
        engineVersion: VERSION,
        moduleId: session.module.id,
        stepId: step.id,
        stepIndex: session.stepIndex,
        mechanicId: step.mechanic,
        result: result ?? null,
        progress: progressAfterStep
      }
    );
 
    /* =====================================================
       TROCA PROTEGIDA
 
       Mecânica -> mecânica:
       - slide contínuo
       - transition-swoosh
       - sem win
 
       Mecânica final -> conclusão:
       - slide visual sem swoosh
       - win somente depois que a conclusão apareceu
       ===================================================== */
 
    runTransitionSwap(
      session,
      async function () {
        if (
          session !== activeSession
        ) {
          return false;
        }
 
        if (isFinalStep) {
          await primeCompletionMascot();
        }

        destroyMountedMechanic(session);
 
        session.stepIndex += 1;
        session.stepCompleted = false;
 
        if (
          session.stepIndex >=
          session.module.steps.length
        ) {
          finishModule(
            session,
            { playSound: false }
          );
 
          return true;
        }
 
        renderCurrentStep(session);
 
        await waitForMountedView(
          session,
          {
            paintFrames: 1,
            timeoutMs: VIEW_READY_TIMEOUT_MS
          }
        );
 
        return true;
      },
      {
        coverDurationMs: isFinalStep
          ? 170
          : TRANSITION_OPTIONS.coverDurationMs,
        revealDurationMs: isFinalStep
          ? 210
          : TRANSITION_OPTIONS.revealDurationMs,
        paintFrames: isFinalStep
          ? 1
          : TRANSITION_OPTIONS.paintFrames,
        bridgeHoldMs: 0,
        soundEnabled: hasNextMechanic,
        soundName: "transition-swoosh",
        soundVolume: 0.42,
        soundMinGapMs: 260
      }
    )
      .then(
        function () {
          if (
            isFinalStep &&
            session === activeSession &&
            session.completed
          ) {
            playCompletionSound();
          }
        }
      )
      .catch(
        function (error) {
          console.error(
            "[DuduQ Host] Falha na transição entre etapas:",
            error
          );
 
          if (
            session === activeSession &&
            !session.completed
          ) {
            session.transitioning = false;
          }
 
          /*
           * Se a tela final já foi criada mas a animação falhou,
           * ainda preservamos a comemoração final.
           */
          if (
            isFinalStep &&
            session === activeSession &&
            session.completed
          ) {
            playCompletionSound();
          }
        }
      );
 
    return true;
  }
 
  function next(result = null) {
    if (!activeSession) {
      return false;
    }
 
    return completeCurrentStep(
      activeSession,
      result
    );
  }
 
 
  /* =======================================================
     CONCLUSÃO PREMIUM CENTRALIZADA
     ======================================================= */
 
  function buildCompletionMessage(module) {
    const subject = asString(
      module.subject,
      "atividade"
    );
 
    if (
      module.module !== null &&
      module.module !== undefined &&
      String(module.module).trim() !== ""
    ) {
      return (
        `Módulo ${module.module} de ${subject} concluído com sucesso.`
      );
    }
 
    if (module.title) {
      return (
        `${module.title} concluído com sucesso.`
      );
    }
 
    return `${subject} concluído com sucesso.`;
  }
 
 
  function playCompletionSound() {
    try {
      window.DuduQSound
        ?.play
        ?.(
          "win",
          {
            volume: 0.64,
            minGapMs: 1800
          }
        );
    } catch (_) {}
  }
 
 
  /* =======================================================
     FALLBACK DE CONCLUSÃO
     ======================================================= */
 
  function renderCompletionFallback(
    session,
    progress
  ) {
    clearContainer(session.container);
 
    const wrap = createElement(
      "section",
      {
        width: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "grid",
        placeItems: "center",
        padding: "28px"
      }
    );
 
    const card = createElement(
      "div",
      {
        width: "min(680px, 92vw)",
        boxSizing: "border-box",
        padding: "40px 32px",
        borderRadius: "30px",
        background: "rgba(255,255,255,0.97)",
        border: "2px solid rgba(193,213,232,0.92)",
        boxShadow: "0 22px 52px rgba(26,67,105,0.20)",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        color: "#17375e"
      }
    );
 
    const mascotSrc = window
      .DUDUQ_ASSETS
      ?.mascots
      ?.complete;
 
    if (mascotSrc) {
      const mascot = document.createElement("img");
 
      mascot.src = mascotSrc;
      mascot.alt =
        "DuduQ celebrando a conclusão.";
 
      Object.assign(
        mascot.style,
        {
          width: "160px",
          height: "160px",
          objectFit: "contain",
          display: "block",
          margin: "0 auto 8px"
        }
      );
 
      card.appendChild(mascot);
    }
 
    const title = createElement(
      "h1",
      {
        margin: "0 0 12px",
        color: "#0567c9",
        fontSize: "44px",
        lineHeight: "1.05"
      }
    );
 
    title.textContent =
      "Missão concluída!";
 
    const message = createElement(
      "p",
      {
        margin: "0 0 18px",
        color: "#52677e",
        fontSize: "19px",
        fontWeight: "700",
        lineHeight: "1.4"
      }
    );
 
    message.textContent = buildCompletionMessage(
      session.module
    );
 
    const badge = createElement(
      "div",
      {
        display: "inline-block",
        margin: "0 0 20px",
        padding: "11px 18px",
        borderRadius: "999px",
        background: "#eaf5ff",
        color: "#07539e",
        fontWeight: "800"
      }
    );
 
    badge.textContent = progress.label;
 
    const button = createElement(
      "button",
      {
        display: "block",
        minWidth: "230px",
        minHeight: "56px",
        margin: "0 auto",
        padding: "12px 26px",
        borderRadius: "18px",
        border: "2px solid #00458f",
        background: "#0870d2",
        color: "#ffffff",
        fontSize: "16px",
        fontWeight: "900",
        cursor: "pointer"
      }
    );
 
    button.type = "button";
    button.textContent = "JOGAR NOVAMENTE";
 
    button.addEventListener(
      "click",
      restart
    );
 
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(badge);
    card.appendChild(button);
    wrap.appendChild(card);
 
    session.container.appendChild(wrap);
  }
 
 
  /* =======================================================
     FINALIZAÇÃO DO MÓDULO
 
     Normalmente chamada já sob a camada de transição.
     ======================================================= */
 
  function finishModule(
    session,
    options = {}
  ) {
    if (
      !session ||
      session !== activeSession ||
      session.completed
    ) {
      return false;
    }
 
    destroyMountedMechanic(session);
 
    session.completed = true;
    session.stepCompleted = false;
 
    const progress = buildProgress(
      session,
      { completed: true }
    );
 
    clearContainer(session.container);
 
    const completionOptions = {
      container: session.container,
      title: "Missão concluída!",
      message: buildCompletionMessage(
        session.module
      ),
      progress,
 
      mascotSrc:
        resolveCompletionMascotSource() ||
        null,
 
      mascotAlt:
        "DuduQ celebrando a conclusão.",
 
      confetti: true,
      starCount: 20,
      showAchievement: true,
 
      primaryAction: {
        label: "JOGAR NOVAMENTE",
        ariaLabel:
          "Jogar o módulo novamente",
        onClick: restart
      }
    };
 
    if (
      window.DuduQCompletion
        ?.show
    ) {
      try {
        window.DuduQCompletion.show(
          completionOptions
        );
      } catch (error) {
        console.error(
          "[DuduQ Host] Falha ao abrir DuduQCompletion. Usando fallback.",
          error
        );
 
        renderCompletionFallback(
          session,
          progress
        );
      }
    } else {
      renderCompletionFallback(
        session,
        progress
      );
    }
 
    if (options.playSound !== false) {
      playCompletionSound();
    }
 
    dispatch(
      "duduq:module-complete",
      {
        engineVersion: VERSION,
        moduleId: session.module.id,
        year: session.module.year,
        subject: session.module.subject,
        module: session.module.module,
        results: session.results.slice(),
        progress
      }
    );
 
    return true;
  }
 
 
  /* =======================================================
     INÍCIO
     ======================================================= */
 
  function start(input) {
    destroy();
 
    const module = normalizeModule(input);
    const container = resolveContainer(
      module.container
    );
 
    applyYearBackground(module.year);
    hideCompletion();
    clearContainer(container);
 
    const session = {
      module,
      container,
      stepIndex: 0,
      stepCompleted: false,
      completed: false,
      transitioning: false,
      results: [],
      destroyCurrent: null,
      startedAt: Date.now()
    };
 
    activeSession = session;
 
    const progress = buildProgress(session);
 
    dispatch(
      "duduq:module-start",
      {
        engineVersion: VERSION,
        moduleId: module.id,
        year: module.year,
        subject: module.subject,
        module: module.module,
        totalSteps: module.steps.length,
        progress
      }
    );
 
    renderCurrentStep(session);
 
    return getSession();
  }
 
 
  /* =======================================================
     REINICIAR
     Conclusão -> primeira mecânica também usa transição.
     ======================================================= */
 
  function restart() {
    if (!activeSession) {
      return false;
    }
 
    const session = activeSession;
 
    if (session.transitioning) {
      return false;
    }
 
    runTransitionSwap(
      session,
      async function () {
        if (
          session !== activeSession
        ) {
          return false;
        }
 
        destroyMountedMechanic(session);
        hideCompletion();
 
        session.stepIndex = 0;
        session.stepCompleted = false;
        session.completed = false;
        session.results = [];
        session.startedAt = Date.now();
 
        applyYearBackground(
          session.module.year
        );
 
        clearContainer(
          session.container
        );
 
        const progress = buildProgress(session);
 
        dispatch(
          "duduq:module-restart",
          {
            engineVersion: VERSION,
            moduleId: session.module.id,
            year: session.module.year,
            subject: session.module.subject,
            module: session.module.module,
            progress
          }
        );
 
        renderCurrentStep(session);
 
        await waitForMountedView(
          session,
          {
            paintFrames: 1,
            timeoutMs: VIEW_READY_TIMEOUT_MS
          }
        );
 
        return true;
      },
      {
        soundEnabled: false
      }
    ).catch(
      function (error) {
        console.error(
          "[DuduQ Host] Falha ao reiniciar com transição:",
          error
        );
      }
    );
 
    return true;
  }
 
 
  /* =======================================================
     DESTRUIR
     ======================================================= */
 
  function destroy() {
    try {
      window.DuduQTransition
        ?.hideImmediate
        ?.();
    } catch (_) {}
 
    if (!activeSession) {
      hideCompletion();
      return false;
    }
 
    const session = activeSession;
 
    destroyMountedMechanic(session);
    hideCompletion();
 
    activeSession = null;
 
    return true;
  }
 
 
  /* =======================================================
     SESSÃO PÚBLICA
     ======================================================= */
 
  function getSession() {
    if (!activeSession) {
      return null;
    }
 
    return {
      engineVersion: VERSION,
      moduleId: activeSession.module.id,
      year: activeSession.module.year,
      subject: activeSession.module.subject,
      module: activeSession.module.module,
      stepIndex: activeSession.stepIndex,
      totalSteps: activeSession.module.steps.length,
      completed: activeSession.completed,
      transitioning: activeSession.transitioning === true,
      results: activeSession.results.slice(),
      progress: getProgress()
    };
  }
 
 
  /* =======================================================
     API PÚBLICA
     ======================================================= */
 
  window.DuduQ = Object.freeze({
    version: VERSION,
 
    registerMechanic,
    unregisterMechanic,
    getMechanic,
    hasMechanic,
    listMechanics,
 
    start,
    next,
    restart,
    destroy,
 
    getSession,
    getProgress
  });
 
 
  dispatch(
    "duduq:host-ready",
    {
      version: VERSION
    }
  );
 
 
  console.info(
    "[DuduQ] Host carregado:",
    VERSION
  );
})();

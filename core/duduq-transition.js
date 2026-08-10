/* =========================================================
   DUDUQ CORE — TRANSITION
   Orquestrador universal de transições entre telas
   e mecânicas DuduQ.
 
   Versão 1.2.0
 
   CONCEITO
   - movimento horizontal contínuo
   - sincronização pelo transitionend real do CSS
   - sem pausa artificial entre cover e reveal
   - som opcional e centralizado via DuduQSound
   - sem mensagem
   - sem tela de loading
   - proteção contra flashes durante destroy/mount
   ========================================================= */
 
(function () {
  "use strict";
 
  const VERSION = "1.2.0";
 
  if (
    window.DuduQTransition &&
    window.DuduQTransition.version === VERSION
  ) {
    return;
  }
 
  /* =======================================================
     CONFIGURAÇÃO
     ======================================================= */
 
  const DEFAULTS = Object.freeze({
    coverDurationMs: 340,
    revealDurationMs: 360,
    paintFrames: 1,
    fallbackExtraMs: 140,
 
    /*
     * O som fica desligado por padrão no Core.
     * O Host decide quando ele deve tocar.
     * Assim podemos usar o swoosh entre mecânicas e
     * silenciá-lo em conclusão/restart quando necessário.
     */
    soundEnabled: false,
    soundName: "transition-swoosh",
    soundVolume: 0.42,
    soundMinGapMs: 260
  });
 
  /* =======================================================
     ESTADO
     ======================================================= */
 
  let root = null;
  let state = "idle";
  let operationId = 0;
  let activeSwapPromise = null;
 
  /* =======================================================
     UTILITÁRIOS
     ======================================================= */
 
  function clamp(value, minimum, maximum) {
    return Math.min(
      maximum,
      Math.max(minimum, value)
    );
  }
 
  function safeNumber(value, fallback) {
    const number = Number(value);
 
    return Number.isFinite(number)
      ? number
      : fallback;
  }
 
  function safeText(value, fallback) {
    const text = String(
      value === null || value === undefined
        ? ""
        : value
    ).trim();
 
    return text || fallback;
  }
 
  function isReducedMotion() {
    try {
      return (
        window
          .matchMedia(
            "(prefers-reduced-motion: reduce)"
          )
          .matches === true
      );
    } catch (_) {
      return false;
    }
  }
 
  function dispatch(name, detail = {}) {
    try {
      window.dispatchEvent(
        new CustomEvent(name, {
          detail: {
            version: VERSION,
            state,
            ...detail
          }
        })
      );
    } catch (_) {}
  }
 
  function nextFrame() {
    return new Promise(function (resolve) {
      window.requestAnimationFrame(resolve);
    });
  }
 
  async function nextPaint(frameCount = 1) {
    const count = clamp(
      Math.round(
        safeNumber(frameCount, 1)
      ),
      1,
      4
    );
 
    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      await nextFrame();
    }
  }
 
  function normalizeOptions(options = {}) {
    const reduced = isReducedMotion();
 
    return {
      coverDurationMs:
        reduced
          ? 100
          : clamp(
              safeNumber(
                options.coverDurationMs,
                DEFAULTS.coverDurationMs
              ),
              180,
              900
            ),
 
      revealDurationMs:
        reduced
          ? 100
          : clamp(
              safeNumber(
                options.revealDurationMs,
                DEFAULTS.revealDurationMs
              ),
              180,
              900
            ),
 
      paintFrames:
        clamp(
          Math.round(
            safeNumber(
              options.paintFrames,
              DEFAULTS.paintFrames
            )
          ),
          1,
          3
        ),
 
      fallbackExtraMs:
        DEFAULTS.fallbackExtraMs,
 
      soundEnabled:
        options.soundEnabled === true,
 
      soundName:
        safeText(
          options.soundName,
          DEFAULTS.soundName
        ),
 
      soundVolume:
        clamp(
          safeNumber(
            options.soundVolume,
            DEFAULTS.soundVolume
          ),
          0,
          1
        ),
 
      soundMinGapMs:
        Math.max(
          0,
          safeNumber(
            options.soundMinGapMs,
            DEFAULTS.soundMinGapMs
          )
        )
    };
  }
 
  /* =======================================================
     SOM DA TRANSIÇÃO
 
     Não cria Audio próprio.
     Usa exclusivamente DuduQSound para manter volumes,
     canais e política de autoplay centralizados.
 
     Nunca bloqueia a animação.
     ======================================================= */
 
  function playTransitionSound(config) {
    if (
      !config ||
      config.soundEnabled !== true
    ) {
      return false;
    }
 
    try {
      if (
        !window.DuduQSound ||
        typeof window.DuduQSound.play !== "function"
      ) {
        return false;
      }
 
      window.DuduQSound.play(
        config.soundName,
        {
          volume: config.soundVolume,
          minGapMs: config.soundMinGapMs
        }
      );
 
      dispatch(
        "duduq:transition-sound",
        {
          name: config.soundName
        }
      );
 
      return true;
    } catch (_) {
      return false;
    }
  }
 
  /* =======================================================
     DOM
     ======================================================= */
 
  function ensureRoot() {
    if (
      root &&
      root.isConnected
    ) {
      return root;
    }
 
    root = document.createElement("div");
    root.className = "duduq-transition";
    root.setAttribute("aria-hidden", "true");
 
    /* Compatibilidade estrutural com versões anteriores. */
    const stage = document.createElement("div");
    stage.className = "duduq-transition-stage";
 
    const glow = document.createElement("div");
    glow.className = "duduq-transition-glow";
 
    stage.appendChild(glow);
    root.appendChild(stage);
 
    (
      document.body ||
      document.documentElement
    ).appendChild(root);
 
    return root;
  }
 
  function lockPage() {
    try {
      document.documentElement.classList.add(
        "duduq-transition-lock"
      );
 
      document.body?.classList.add(
        "duduq-transition-lock"
      );
    } catch (_) {}
  }
 
  function unlockPage() {
    try {
      document.documentElement.classList.remove(
        "duduq-transition-lock"
      );
 
      document.body?.classList.remove(
        "duduq-transition-lock"
      );
    } catch (_) {}
  }
 
  function clearClasses() {
    if (!root) return;
 
    root.classList.remove(
      "is-covering",
      "is-covered",
      "is-revealing"
    );
  }
 
  /* =======================================================
     SINCRONIZAÇÃO COM O CSS
     ======================================================= */
 
  function waitForTransformTransition(
    expectedDurationMs
  ) {
    ensureRoot();
 
    return new Promise(function (resolve) {
      let finished = false;
 
      const fallbackMs = Math.max(
        120,
        safeNumber(
          expectedDurationMs,
          360
        ) + DEFAULTS.fallbackExtraMs
      );
 
      let timeoutId = null;
 
      function cleanup() {
        if (root) {
          try {
            root.removeEventListener(
              "transitionend",
              handleTransitionEnd
            );
          } catch (_) {}
        }
 
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
 
      function finish() {
        if (finished) return;
 
        finished = true;
        cleanup();
        resolve(true);
      }
 
      function handleTransitionEnd(event) {
        if (event.target !== root) return;
 
        if (
          event.propertyName !==
          "transform"
        ) {
          return;
        }
 
        /*
         * O painel principal é ::before.
         * Alguns navegadores podem deixar pseudoElement vazio.
         */
        if (
          event.pseudoElement &&
          event.pseudoElement !== "::before"
        ) {
          return;
        }
 
        finish();
      }
 
      root.addEventListener(
        "transitionend",
        handleTransitionEnd
      );
 
      timeoutId = window.setTimeout(
        finish,
        fallbackMs
      );
    });
  }
 
  /* =======================================================
     PREPARAÇÃO
     ======================================================= */
 
  async function prepare() {
    ensureRoot();
    clearClasses();
 
    /* Força o estado inicial antes de iniciar o slide. */
    root.getBoundingClientRect();
 
    await nextFrame();
 
    return true;
  }
 
  /* =======================================================
     COVER
 
     O som, quando habilitado pelo Host, começa no mesmo
     instante em que o painel recebe is-covering.
     Não existe await para áudio.
     ======================================================= */
 
  async function cover(options = {}) {
    const config = normalizeOptions(options);
    const currentOperation = ++operationId;
 
    ensureRoot();
    lockPage();
 
    state = "preparing";
 
    await prepare();
 
    if (
      currentOperation !== operationId
    ) {
      return false;
    }
 
    state = "covering";
 
    dispatch(
      "duduq:transition-cover-start"
    );
 
    /*
     * Som e movimento começam juntos.
     * A falha de áudio nunca atrasa o slide.
     */
    playTransitionSound(config);
 
    root.classList.add(
      "is-covering"
    );
 
    await waitForTransformTransition(
      config.coverDurationMs
    );
 
    if (
      currentOperation !== operationId
    ) {
      return false;
    }
 
    root.classList.remove(
      "is-covering"
    );
 
    root.classList.add(
      "is-covered"
    );
 
    state = "covered";
 
    dispatch(
      "duduq:transition-covered"
    );
 
    return true;
  }
 
  /* =======================================================
     REVEAL
     ======================================================= */
 
  async function reveal(options = {}) {
    const config = normalizeOptions(options);
    const currentOperation = operationId;
 
    ensureRoot();
 
    await nextPaint(
      config.paintFrames
    );
 
    if (
      currentOperation !== operationId
    ) {
      return false;
    }
 
    /*
     * Não existe coveredHold.
     * O slide continua assim que a próxima tela recebeu
     * os frames mínimos solicitados pelo Host.
     */
    root.classList.remove(
      "is-covering",
      "is-covered"
    );
 
    root.classList.add(
      "is-revealing"
    );
 
    state = "revealing";
 
    dispatch(
      "duduq:transition-reveal-start"
    );
 
    await waitForTransformTransition(
      config.revealDurationMs
    );
 
    if (
      currentOperation !== operationId
    ) {
      return false;
    }
 
    clearClasses();
    unlockPage();
 
    state = "idle";
 
    dispatch(
      "duduq:transition-complete"
    );
 
    return true;
  }
 
  /* =======================================================
     SWAP
     ======================================================= */
 
  function swap(callback, options = {}) {
    if (
      typeof callback !== "function"
    ) {
      return Promise.reject(
        new Error(
          "[DuduQ Transition] swap() precisa receber uma função."
        )
      );
    }
 
    if (activeSwapPromise) {
      return activeSwapPromise;
    }
 
    activeSwapPromise = (
      async function () {
        try {
          const covered = await cover(
            options
          );
 
          if (!covered) {
            return false;
          }
 
          dispatch(
            "duduq:transition-swap"
          );
 
          /*
           * Destroy + mount acontecem somente com
           * a viewport protegida.
           */
          const result = await callback();
 
          await reveal(options);
 
          return result;
        } catch (error) {
          console.error(
            "[DuduQ Transition] Erro durante troca:",
            error
          );
 
          hideImmediate();
 
          throw error;
        } finally {
          activeSwapPromise = null;
        }
      }
    )();
 
    return activeSwapPromise;
  }
 
  /* =======================================================
     RESET IMEDIATO
     ======================================================= */
 
  function hideImmediate() {
    operationId += 1;
 
    if (root) {
      clearClasses();
    }
 
    unlockPage();
    state = "idle";
 
    dispatch(
      "duduq:transition-reset"
    );
 
    return true;
  }
 
  /* =======================================================
     DESTROY
     ======================================================= */
 
  function destroy() {
    operationId += 1;
    activeSwapPromise = null;
 
    unlockPage();
 
    if (
      root &&
      root.parentNode
    ) {
      root.parentNode.removeChild(root);
    }
 
    root = null;
    state = "idle";
 
    return true;
  }
 
  /* =======================================================
     STATUS
     ======================================================= */
 
  function getState() {
    return state;
  }
 
  function isActive() {
    return state !== "idle";
  }
 
  function isCovered() {
    return state === "covered";
  }
 
  /* =======================================================
     API PÚBLICA
     ======================================================= */
 
  window.DuduQTransition = Object.freeze({
    version: VERSION,
    cover,
    reveal,
    swap,
    hideImmediate,
    destroy,
    getState,
    isActive,
    isCovered,
    ensureRoot
  });
 
  /* =======================================================
     READY
     ======================================================= */
 
  dispatch(
    "duduq:transition-ready",
    {
      ready: true
    }
  );
 
})();

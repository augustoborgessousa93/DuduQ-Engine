/* =========================================================
   DUDUQ CORE — TRANSITION
   Orquestrador universal de transições entre telas
   e mecânicas DuduQ.

   Versão 1.3.0

   CONCEITO
   - Fade / Dissolve real do conteúdo da mecânica
   - a mecânica atual desaparece antes do destroy/mount
   - a próxima mecânica permanece invisível até estar pronta
   - nenhuma tela branca entre iframes
   - backdrop suave preserva o universo visual do ano
   - som opcional centralizado via DuduQSound
   - sem mensagem
   - sem tela de loading
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.3.0";

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

    targetSelector: "#root",
    targetBlurPx: 3,

    visualReadyTimeoutMs: 1300,
    visualReadyPollMs: 45,

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

  let activeTarget = null;
  let activeTargetStyle = null;

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

  function now() {
    try {
      if (
        window.performance &&
        typeof window.performance.now === "function"
      ) {
        return window.performance.now();
      }
    } catch (_) {}

    return Date.now();
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(
        resolve,
        Math.max(0, safeNumber(ms, 0))
      );
    });
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
          ? 90
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
          ? 90
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

      target:
        options.target ||
        options.container ||
        null,

      targetSelector:
        safeText(
          options.targetSelector,
          DEFAULTS.targetSelector
        ),

      targetBlurPx:
        reduced
          ? 0
          : clamp(
              safeNumber(
                options.targetBlurPx,
                DEFAULTS.targetBlurPx
              ),
              0,
              8
            ),

      visualReadyTimeoutMs:
        clamp(
          safeNumber(
            options.visualReadyTimeoutMs,
            DEFAULTS.visualReadyTimeoutMs
          ),
          300,
          3000
        ),

      visualReadyPollMs:
        clamp(
          safeNumber(
            options.visualReadyPollMs,
            DEFAULTS.visualReadyPollMs
          ),
          20,
          120
        ),

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
     DOM DA CAMADA DE TRANSIÇÃO
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
     ALVO VISUAL

     O Fade/Dissolve acontece no conteúdo real (#root),
     não em uma placa branca por cima da viewport.
     ======================================================= */

  function resolveTarget(config) {
    const candidate = config?.target;

    if (candidate instanceof Element) {
      return candidate;
    }

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      try {
        const found = document.querySelector(
          candidate.trim()
        );

        if (found) return found;
      } catch (_) {}
    }

    if (
      config?.targetSelector
    ) {
      try {
        const found = document.querySelector(
          config.targetSelector
        );

        if (found) return found;
      } catch (_) {}
    }

    return (
      document.getElementById("root") ||
      null
    );
  }

  function rememberTargetStyle(target) {
    if (!target) return null;

    return {
      opacity: target.style.opacity,
      filter: target.style.filter,
      transition: target.style.transition,
      willChange: target.style.willChange,
      pointerEvents: target.style.pointerEvents
    };
  }

  function restoreTargetStyle() {
    if (
      !activeTarget ||
      !activeTargetStyle
    ) {
      activeTarget = null;
      activeTargetStyle = null;
      return;
    }

    try {
      activeTarget.style.opacity =
        activeTargetStyle.opacity;

      activeTarget.style.filter =
        activeTargetStyle.filter;

      activeTarget.style.transition =
        activeTargetStyle.transition;

      activeTarget.style.willChange =
        activeTargetStyle.willChange;

      activeTarget.style.pointerEvents =
        activeTargetStyle.pointerEvents;
    } catch (_) {}

    activeTarget = null;
    activeTargetStyle = null;
  }

  function setTargetCovered(target, blurPx) {
    if (!target) return;

    try {
      target.style.transition = "none";
      target.style.opacity = "0";
      target.style.filter =
        blurPx > 0
          ? `blur(${blurPx}px)`
          : "none";
      target.style.willChange =
        "opacity, filter";
      target.style.pointerEvents = "none";
    } catch (_) {}
  }

  function animateTarget(
    target,
    direction,
    config
  ) {
    if (!target) {
      return Promise.resolve(true);
    }

    const isCover =
      direction === "cover";

    const duration =
      isCover
        ? config.coverDurationMs
        : config.revealDurationMs;

    const easing =
      isCover
        ? "cubic-bezier(.22,.72,.22,1)"
        : "cubic-bezier(.20,.02,.18,1)";

    const blur =
      Math.max(
        0,
        config.targetBlurPx
      );

    const fromOpacity =
      isCover ? 1 : 0;

    const toOpacity =
      isCover ? 0 : 1;

    const fromFilter =
      isCover
        ? "blur(0px)"
        : blur > 0
          ? `blur(${blur}px)`
          : "none";

    const toFilter =
      isCover
        ? blur > 0
          ? `blur(${blur}px)`
          : "none"
        : "blur(0px)";

    try {
      target.style.willChange =
        "opacity, filter";

      target.style.pointerEvents =
        "none";
    } catch (_) {}

    if (
      typeof target.animate === "function"
    ) {
      try {
        const animation = target.animate(
          [
            {
              opacity: fromOpacity,
              filter: fromFilter
            },
            {
              opacity: toOpacity,
              filter: toFilter
            }
          ],
          {
            duration,
            easing,
            fill: "forwards"
          }
        );

        return Promise.resolve(
          animation.finished
        )
          .catch(function () {
            return true;
          })
          .then(function () {
            try {
              target.style.opacity =
                String(toOpacity);

              target.style.filter =
                toFilter;

              animation.cancel();
            } catch (_) {}

            return true;
          });
      } catch (_) {}
    }

    return new Promise(function (resolve) {
      try {
        target.style.transition =
          `opacity ${duration}ms ${easing}, ` +
          `filter ${duration}ms ${easing}`;

        target.style.opacity =
          String(fromOpacity);

        target.style.filter =
          fromFilter;

        target.getBoundingClientRect();

        window.requestAnimationFrame(function () {
          try {
            target.style.opacity =
              String(toOpacity);

            target.style.filter =
              toFilter;
          } catch (_) {}
        });
      } catch (_) {}

      window.setTimeout(
        function () {
          resolve(true);
        },
        duration + 60
      );
    });
  }

  /* =======================================================
     SINCRONIZAÇÃO DA CAMADA CSS
     ======================================================= */

  function waitForRootTransition(
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
          event.propertyName !== "transform" &&
          event.propertyName !== "opacity"
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
     PRONTIDÃO VISUAL DO NOVO IFRAME

     Mesmo que o HTML do iframe já tenha terminado de
     carregar, alguns runtimes ainda exibem #duduq-boot.

     O reveal só começa quando esse boot deixou de estar
     visível, evitando o clarão branco entre mecânicas.
     ======================================================= */

  function isIframeVisuallyReady(iframe) {
    if (!iframe) return true;

    try {
      const declaredSrc = String(
        iframe.getAttribute("src") ||
        ""
      ).trim();

      if (
        !declaredSrc ||
        /^about:blank(?:$|[?#])/i.test(
          declaredSrc
        )
      ) {
        return false;
      }

      const doc = iframe.contentDocument;

      if (!doc) {
        return false;
      }

      if (
        doc.readyState !== "interactive" &&
        doc.readyState !== "complete"
      ) {
        return false;
      }

      const boot =
        doc.getElementById("duduq-boot");

      if (boot) {
        const bootStyle =
          iframe.contentWindow
            ?.getComputedStyle
            ?.(boot);

        const bootVisible =
          boot.hidden !== true &&
          bootStyle?.display !== "none" &&
          bootStyle?.visibility !== "hidden" &&
          Number(bootStyle?.opacity ?? 1) > 0.01;

        if (bootVisible) {
          return false;
        }
      }

      const runtimeRoot =
        doc.getElementById("root");

      if (
        runtimeRoot &&
        runtimeRoot.childElementCount > 0
      ) {
        return true;
      }

      if (
        boot &&
        boot.hidden === true
      ) {
        return true;
      }

      return Boolean(
        doc.body &&
        doc.body.children.length > 0
      );
    } catch (_) {
      /*
       * Em um iframe cross-origin não podemos inspecionar o
       * DOM. Nesse caso não bloqueamos a transição.
       */
      return true;
    }
  }

  async function waitForVisualReady(
    target,
    config
  ) {
    if (!target) {
      await nextPaint(1);
      return true;
    }

    const iframe =
      target.querySelector
        ? target.querySelector("iframe")
        : null;

    if (!iframe) {
      await nextPaint(
        config.paintFrames
      );
      return true;
    }

    const deadline =
      now() +
      config.visualReadyTimeoutMs;

    while (
      now() < deadline
    ) {
      if (
        isIframeVisuallyReady(iframe)
      ) {
        await nextPaint(1);
        return true;
      }

      await wait(
        config.visualReadyPollMs
      );
    }

    /*
     * Timeout de segurança: nunca travamos o módulo.
     * O conteúdo continua invisível até este ponto.
     */
    await nextPaint(1);
    return true;
  }

  /* =======================================================
     PREPARAÇÃO
     ======================================================= */

  async function prepare(config) {
    ensureRoot();
    clearClasses();

    const target =
      resolveTarget(config);

    if (
      activeTarget &&
      activeTarget !== target
    ) {
      restoreTargetStyle();
    }

    if (
      target &&
      activeTarget !== target
    ) {
      activeTarget = target;
      activeTargetStyle =
        rememberTargetStyle(target);
    }

    root.getBoundingClientRect();

    await nextFrame();

    return true;
  }

  /* =======================================================
     COVER — FADE OUT REAL
     ======================================================= */

  async function cover(options = {}) {
    const config = normalizeOptions(options);
    const currentOperation = ++operationId;

    ensureRoot();
    lockPage();

    state = "preparing";

    await prepare(config);

    if (
      currentOperation !== operationId
    ) {
      return false;
    }

    state = "covering";

    dispatch(
      "duduq:transition-cover-start"
    );

    playTransitionSound(config);

    root.classList.add(
      "is-covering"
    );

    await Promise.all([
      waitForRootTransition(
        config.coverDurationMs
      ),
      animateTarget(
        activeTarget,
        "cover",
        config
      )
    ]);

    if (
      currentOperation !== operationId
    ) {
      return false;
    }

    setTargetCovered(
      activeTarget,
      config.targetBlurPx
    );

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
     REVEAL — FADE IN REAL
     ======================================================= */

  async function reveal(options = {}) {
    const config = normalizeOptions(options);
    const currentOperation = operationId;

    ensureRoot();

    /*
     * A nova tela continua opacity:0 enquanto o runtime
     * termina o primeiro paint e esconde o boot interno.
     */
    await waitForVisualReady(
      activeTarget,
      config
    );

    await nextPaint(
      config.paintFrames
    );

    if (
      currentOperation !== operationId
    ) {
      return false;
    }

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

    await Promise.all([
      waitForRootTransition(
        config.revealDurationMs
      ),
      animateTarget(
        activeTarget,
        "reveal",
        config
      )
    ]);

    if (
      currentOperation !== operationId
    ) {
      return false;
    }

    clearClasses();
    restoreTargetStyle();
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
           * Destroy + mount acontecem somente depois que
           * o conteúdo anterior chegou a opacity:0.
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

    restoreTargetStyle();
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

    restoreTargetStyle();
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


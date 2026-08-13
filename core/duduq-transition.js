/* =========================================================
   DUDUQ CORE — TRANSITION
   Ponte visual opaca entre telas e mecânicas.
   Versão 1.6.5
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.6.5";
  if (window.DuduQTransition?.version === VERSION) return;

  const DEFAULTS = Object.freeze({
    coverDurationMs: 145,
    revealDurationMs: 170,
    paintFrames: 1,
    stablePaintFrames: 1,
    bridgeHoldMs: 0,
    revealHoldFraction: 0,
    visualReadyTimeoutMs: 900,
    visualReadyPollMs: 28,
    targetSelector: "#root",
    soundEnabled: false,
    soundName: "transition-swoosh",
    soundVolume: 0.42,
    soundMinGapMs: 260
  });

  let overlay = null;
  let state = "idle";
  let operationId = 0;
  let activeSwapPromise = null;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function text(value, fallback) {
    const parsed = String(value ?? "").trim();
    return parsed || fallback;
  }

  function reducedMotion() {
    try {
      return window
        .matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
    } catch (_) {
      return false;
    }
  }

  function normalize(options = {}) {
    const reduced = reducedMotion();

    return {
      coverDurationMs: reduced
        ? 80
        : clamp(
            number(
              options.coverDurationMs,
              DEFAULTS.coverDurationMs
            ),
            140,
            700
          ),

      revealDurationMs: reduced
        ? 80
        : clamp(
            number(
              options.revealDurationMs,
              DEFAULTS.revealDurationMs
            ),
            160,
            700
          ),

      paintFrames: clamp(
        Math.round(
          number(
            options.paintFrames,
            DEFAULTS.paintFrames
          )
        ),
        1,
        4
      ),

      stablePaintFrames: clamp(
        Math.round(
          number(
            options.stablePaintFrames,
            DEFAULTS.stablePaintFrames
          )
        ),
        1,
        4
      ),

      bridgeHoldMs: reduced
        ? 0
        : clamp(
            number(
              options.bridgeHoldMs,

              DEFAULTS.bridgeHoldMs
            ),
            0,
            120
          ),

      revealHoldFraction: reduced
        ? 0
        : clamp(
            number(
              options.revealHoldFraction,
              DEFAULTS.revealHoldFraction
            ),
            0,
            .35
          ),

      visualReadyTimeoutMs: clamp(
        number(
          options.visualReadyTimeoutMs,
          DEFAULTS.visualReadyTimeoutMs
        ),
        300,
        3000
      ),

      visualReadyPollMs: clamp(
        number(
          options.visualReadyPollMs,
          DEFAULTS.visualReadyPollMs
        ),
        20,
        120
      ),

      target:
        options.target ||
        options.container ||
        null,

      targetSelector: text(
        options.targetSelector,
        DEFAULTS.targetSelector
      ),

      soundEnabled:
        options.soundEnabled === true,

      soundName: text(
        options.soundName,
        DEFAULTS.soundName
      ),

      soundVolume: clamp(
        number(
          options.soundVolume,
          DEFAULTS.soundVolume
        ),
        0,
        1
      ),

      soundMinGapMs: Math.max(
        0,
        number(
          options.soundMinGapMs,
          DEFAULTS.soundMinGapMs
        )
      )
    };
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

  function wait(ms) {
    return new Promise(
      (resolve) =>
        window.setTimeout(
          resolve,
          Math.max(0, ms)
        )
    );
  }

  function nextFrame() {
    return new Promise(
      (resolve) =>
        window.requestAnimationFrame(resolve)
    );
  }

  async function nextPaint(frames = 1) {
    for (
      let index = 0;
      index < frames;
      index += 1
    ) {
      await nextFrame();

    }
  }

  function resolveTarget(config) {
    if (config.target instanceof Element) {
      return config.target;
    }

    if (
      typeof config.target === "string" &&
      config.target.trim()
    ) {
      try {
        const found =
          document.querySelector(
            config.target.trim()
          );

        if (found) {
          return found;
        }
      } catch (_) {}
    }

    try {
      return (
        document.querySelector(
          config.targetSelector
        ) ||
        document.getElementById("root")
      );
    } catch (_) {
      return document.getElementById("root");
    }
  }

  function ensureRoot() {
    if (overlay?.isConnected) {
      return overlay;
    }

    overlay =
      document.createElement("div");

    overlay.className =
      "duduq-transition";

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );

    overlay.innerHTML =
      '<div class="duduq-transition-stage" aria-hidden="true"></div>';

    (
      document.body ||
      document.documentElement
    ).appendChild(overlay);

    syncWorldBridge();

    return overlay;
  }

  function lockPage() {
    document.documentElement
      .classList
      .add("duduq-transition-lock");

    document.body
      ?.classList
      .add("duduq-transition-lock");
  }

  function unlockPage() {
    document.documentElement
      .classList
      .remove("duduq-transition-lock");

    document.body
      ?.classList
      .remove("duduq-transition-lock");
  }

  function syncWorldBridge() {
    const node = ensureRoot();

    let image = "";
    let position = "center top";
    let size = "cover";

    try {
      image =
        document.documentElement.style
          .getPropertyValue("--duduq-world-image")
          .trim() ||
        document.body?.style.backgroundImage ||
        window
          .getComputedStyle(document.body)
          .backgroundImage ||
        "";

      const computed =
        window.getComputedStyle(
          document.body
        );

      position =
        computed.backgroundPosition ||

        position;

      size =
        computed.backgroundSize ||
        size;
    } catch (_) {}

    if (
      image &&
      image !== "none"
    ) {
      node.style.setProperty(
        "--duduq-transition-world-image",
        image
      );
    }

    node.style.setProperty(
      "--duduq-transition-world-position",
      position
    );

    node.style.setProperty(
      "--duduq-transition-world-size",
      size
    );
  }

  function primeWorldBridge() {
    syncWorldBridge();

    let source = "";

    try {
      source =
        overlay
          ?.style
          .getPropertyValue(
            "--duduq-transition-world-image"
          )
          .match(
            /url\((['"]?)(.*?)\1\)/i
          )?.[2] ||
        "";
    } catch (_) {}

    if (!source) {
      return;
    }

    const image = new Image();
    image.decoding = "async";
    image.src = source;
    image.decode?.().catch(() => {});
  }

  function playTransitionSound(config) {
    if (
      !config.soundEnabled ||
      typeof window.DuduQSound?.play !==
        "function"
    ) {
      return;
    }

    try {
      window.DuduQSound.play(
        config.soundName,
        {
          volume:
            config.soundVolume,

          minGapMs:
            config.soundMinGapMs
        }
      );
    } catch (_) {}
  }

  function setOverlayState(
    nextState
  ) {
    const node = ensureRoot();

    node.classList.remove(
      "is-covering",
      "is-covered",
      "is-revealing"
    );

    if (nextState) {
      node.classList.add(nextState);
    }
  }

  async function animateOverlay(
    from,
    to,
    duration,
    direction,
    holdFraction = 0
  ) {
    const node = ensureRoot();

    node.style.opacity =
      String(from);

    node.style.transform =
      "translateZ(0)";

    const safeHold =
      direction === "reveal"
        ? clamp(holdFraction, 0, .35)
        : 0;

    if (
      typeof node.animate ===
      "function"
    ) {
      try {
        const keyframes =
          safeHold > 0
            ? [
                { opacity: from, offset: 0 },
                { opacity: from, offset: safeHold },
                { opacity: to, offset: 1 }
              ]
            : [
                { opacity: from, offset: 0 },
                { opacity: to, offset: 1 }
              ];

        const animation =
          node.animate(
            keyframes,
            {
              duration,
              easing:
                direction === "cover"
                  ? "cubic-bezier(.22,.72,.22,1)"
                  : "cubic-bezier(.18,.22,.18,1)",
              fill: "forwards"
            }
          );

        await animation
          .finished
          .catch(() => true);

        node.style.opacity =
          String(to);

        animation.cancel();
        return;
      } catch (_) {}
    }

    /* Fallback para navegadores sem Web Animations API.
       Mantém o véu opaco durante a fração inicial do reveal
       e só depois inicia a dissolução. */
    if (safeHold > 0) {
      const holdMs =
        Math.round(duration * safeHold);

      await wait(holdMs);

      const fadeMs =
        Math.max(1, duration - holdMs);

      node.style.transition =
        `opacity ${fadeMs}ms cubic-bezier(.18,.22,.18,1)`;

      node.getBoundingClientRect();
      node.style.opacity = String(to);

      await wait(fadeMs + 40);
      node.style.transition = "";
      return;
    }

    node.style.transition =
      `opacity ${duration}ms ${
        direction === "cover"
          ? "cubic-bezier(.22,.72,.22,1)"
          : "cubic-bezier(.18,.22,.18,1)"
      }`;

    node.getBoundingClientRect();

    node.style.opacity =
      String(to);

    await wait(duration + 40);

    node.style.transition = "";
  }


  const DUDUQ_MECHANIC_SELECTOR = [
    ".duduq-bp-root",
    ".duduq-dd-root",
    ".duduq-udd-root",
    ".duduq-mq-root",
    ".duduq-matching-root",
    ".duduq-fc-root",
    ".duduq-cf-root",
    ".duduq-ws-root",
    ".duduq-ts-root"
  ].join(", ");

  function isWorldFusionReady(
    frameDocument
  ) {
    if (!frameDocument?.documentElement) {
      return false;
    }

    /*
     * A ponte só exige World Fusion quando o iframe já
     * contém uma mecânica DuduQ. Isso evita transformar

     * a checagem em uma dependência genérica para qualquer iframe.
     */
    const mechanicRoot =
      frameDocument.querySelector(
        DUDUQ_MECHANIC_SELECTOR
      );

    if (!mechanicRoot) {
      return true;
    }

    const html =
      frameDocument.documentElement;

    const styleLink =
      frameDocument.getElementById(
        "duduq-world-fusion-style"
      );

    if (
      !html.classList.contains(
        "duduq-world-fusion"
      ) ||
      !html.getAttribute(
        "data-duduq-world-fusion-version"
      ) ||
      !styleLink ||
      !styleLink.sheet
    ) {
      return false;
    }

    /*
     * link.sheet confirma o carregamento do arquivo.
     * O token calculado confirma que o CSS já entrou no
     * cascade antes de revelar o iframe.
     */
    try {
      const fusionToken =
        frameDocument.defaultView
          ?.getComputedStyle(html)
          .getPropertyValue(
            "--duduq-glass-pearl"
          )
          .trim();

      return Boolean(fusionToken);
    } catch (_) {
      return false;
    }
  }

  function isIframeVisuallyReady(
    iframe
  ) {
    if (!iframe) {
      return true;
    }

    try {
      const source =
        String(
          iframe.getAttribute("src") ||
          ""
        ).trim();

      if (
        !source ||
        /^about:blank(?:$|[?#])/i
          .test(source)
      ) {
        return false;
      }

      const frameDocument =
        iframe.contentDocument;

      if (!frameDocument) {
        return false;
      }

      if (
        ![
          "interactive",
          "complete"
        ].includes(
          frameDocument.readyState
        )
      ) {
        return false;
      }

      const boot =
        frameDocument
          .getElementById(
            "duduq-boot"
          );

      if (boot) {
        const style =
          iframe.contentWindow
            ?.getComputedStyle
            ?.(boot);

        const visible =
          !boot.hidden &&
          style?.display !== "none" &&
          style?.visibility !==
            "hidden" &&
          Number(

            style?.opacity ?? 1
          ) > 0.01;

        if (visible) {
          return false;
        }
      }

      if (
        !isWorldFusionReady(
          frameDocument
        )
      ) {
        return false;
      }

      const runtimeRoot =
        frameDocument
          .getElementById("root");

      return Boolean(
        (
          runtimeRoot &&
          runtimeRoot
            .childElementCount > 0
        ) ||
        (
          boot &&
          boot.hidden
        ) ||
        frameDocument.body
          ?.children.length
      );
    } catch (_) {
      return true;
    }
  }

  async function waitForVisualReady(
    target,
    config
  ) {
    if (!target) {
      await nextPaint(
        config.paintFrames
      );
      return true;
    }

    const iframe =
      target.querySelector
        ?.("iframe");

    if (!iframe) {
      await nextPaint(
        config.paintFrames
      );
      return true;
    }

    const deadline =
      performance.now() +
      config.visualReadyTimeoutMs;

    while (
      performance.now() <
      deadline
    ) {
      if (
        isIframeVisuallyReady(
          iframe
        )
      ) {
        await nextPaint(
          config.stablePaintFrames
        );
        return true;
      }

      await wait(
        config.visualReadyPollMs
      );
    }

    /* Em hardware mais lento, o iframe pode terminar o DOM antes
       de a folha World Fusion entrar no primeiro paint. Como o
       objetivo é justamente nunca expor o background cru, damos
       uma pequena janela de graça SOMENTE se o iframe já for uma
       mecânica DuduQ e ainda estiver sem a camada visual pronta. */
    try {
      const frameDocument =
        iframe.contentDocument;

      const isDuduQFrame =
        Boolean(
          frameDocument?.querySelector(
            DUDUQ_MECHANIC_SELECTOR
          )
        );

      if (
        isDuduQFrame &&
        !isWorldFusionReady(
          frameDocument
        )
      ) {
        const graceDeadline =
          performance.now() + 500;

        while (

          performance.now() <
          graceDeadline
        ) {
          if (
            isIframeVisuallyReady(
              iframe
            )
          ) {
            await nextPaint(
              config.stablePaintFrames
            );
            return true;
          }

          await wait(
            config.visualReadyPollMs
          );
        }
      }
    } catch (_) {}

    await nextPaint(
      config.stablePaintFrames
    );

    return true;
  }

  /* =======================================================
     COBERTURA IMEDIATA

     Usada pelo Host no instante em que uma etapa termina.
     A camada fica opaca no MESMO task do callback da mecânica,
     antes que o navegador tenha oportunidade de pintar uma
     eventual tela final interna do runtime.

     A próxima missão é montada por baixo da ponte e continua
     usando o reveal visual normal.
     ======================================================= */

  function coverImmediate(
    options = {}
  ) {
    const config =
      normalize(options);

    operationId += 1;

    ensureRoot();
    syncWorldBridge();
    lockPage();

    state = "covered";

    setOverlayState(
      "is-covered"
    );

    overlay.style.visibility =
      "visible";

    overlay.style.pointerEvents =
      "auto";

    overlay.style.opacity =
      "1";

    playTransitionSound(config);

    dispatch(
      "duduq:transition-covered",
      {
        immediate: true
      }
    );

    return true;
  }


  async function cover(
    options = {}
  ) {
    const config =
      normalize(options);

    const currentOperation =
      ++operationId;

    ensureRoot();
    syncWorldBridge();
    lockPage();

    state = "preparing";

    setOverlayState(
      "is-covering"
    );

    overlay.style.visibility =
      "visible";

    overlay.style.pointerEvents =
      "auto";

    await nextFrame();

    if (
      currentOperation !==
      operationId

    ) {
      return false;
    }

    state = "covering";

    dispatch(
      "duduq:transition-cover-start"
    );

    playTransitionSound(config);

    await animateOverlay(
      0,
      1,
      config.coverDurationMs,
      "cover"
    );

    if (
      currentOperation !==
      operationId
    ) {
      return false;
    }

    setOverlayState(
      "is-covered"
    );

    overlay.style.opacity = "1";
    state = "covered";

    dispatch(
      "duduq:transition-covered"
    );

    return true;
  }

  async function reveal(
    options = {}
  ) {
    const config =
      normalize(options);

    const currentOperation =
      operationId;

    const target =
      resolveTarget(config);

    await waitForVisualReady(
      target,
      config
    );

    if (
      config.bridgeHoldMs > 0
    ) {
      await wait(
        config.bridgeHoldMs
      );
    }

    if (
      currentOperation !==
      operationId
    ) {
      return false;
    }

    state = "revealing";

    setOverlayState(
      "is-revealing"
    );

    dispatch(
      "duduq:transition-reveal-start"
    );

    await animateOverlay(
      1,
      0,
      config.revealDurationMs,
      "reveal",
      config.revealHoldFraction
    );

    if (
      currentOperation !==
      operationId
    ) {
      return false;
    }

    setOverlayState("");

    overlay.style.visibility =
      "hidden";

    overlay.style.pointerEvents =
      "none";

    overlay.style.opacity = "0";

    unlockPage();

    state = "idle";


    dispatch(
      "duduq:transition-complete"
    );

    return true;
  }

  function swap(
    callback,
    options = {}
  ) {
    if (
      typeof callback !==
      "function"
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

    activeSwapPromise =
      (async function () {
        try {
          const alreadyCovered =
            options.precovered === true &&
            state === "covered";

          const covered =
            alreadyCovered
              ? true
              : await cover(options);

          if (!covered) {
            return false;
          }

          dispatch(
            "duduq:transition-swap"
          );

          const result =
            await callback();

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
      })();

    return activeSwapPromise;
  }

  function hideImmediate() {
    operationId += 1;

    if (overlay) {
      setOverlayState("");

      overlay.style.visibility =
        "hidden";

      overlay.style.pointerEvents =
        "none";

      overlay.style.opacity = "0";
    }

    unlockPage();

    state = "idle";

    dispatch(
      "duduq:transition-reset"
    );

    return true;
  }

  function destroy() {
    operationId += 1;
    activeSwapPromise = null;

    unlockPage();

    overlay?.remove();
    overlay = null;
    state = "idle";

    return true;
  }

  window.DuduQTransition =
    Object.freeze({

      version: VERSION,

      cover,
      coverImmediate,
      reveal,
      swap,
      hideImmediate,
      destroy,

      getState:
        () => state,

      isActive:
        () =>
          state !== "idle",

      isCovered:
        () =>
          state === "covered",

      ensureRoot,
      primeWorldBridge
    });

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      primeWorldBridge,
      { once: true }
    );
  } else {
    primeWorldBridge();
  }

  window.addEventListener(
    "duduq:assets-ready",
    primeWorldBridge
  );

  dispatch(
    "duduq:transition-ready",
    { ready: true }
  );
})();

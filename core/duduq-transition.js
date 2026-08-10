/* =========================================================
   DUDUQ CORE — TRANSITION
   Orquestrador universal de transições entre telas
   e mecânicas DuduQ.

   Versão 1.0.0

   Responsabilidades:
   - cobrir completamente a tela atual
   - impedir flashes durante destroy/mount
   - aguardar a nova tela estabilizar
   - revelar a próxima tela suavemente
   - centralizar transições para todo o ecossistema
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.0.0";

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

    coverDurationMs:
      500,

    revealDurationMs:
      700,

    coveredHoldMs:
      120,

    paintFrames:
      2

  });


  /* =======================================================
     ESTADO
     ======================================================= */

  let root =
    null;

  let stage =
    null;

  let glow =
    null;

  let state =
    "idle";

  let operationId =
    0;

  let activeSwapPromise =
    null;


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

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


  function wait(
    milliseconds
  ) {

    return new Promise(
      function (resolve) {

        window.setTimeout(
          resolve,
          Math.max(
            0,
            Number(
              milliseconds
            ) || 0
          )
        );

      }
    );

  }


  function isReducedMotion() {

    try {

      return window
        .matchMedia(
          "(prefers-reduced-motion: reduce)"
        )
        .matches === true;

    } catch (_) {

      return false;

    }

  }


  function dispatch(
    name,
    detail = {}
  ) {

    try {

      window.dispatchEvent(
        new CustomEvent(
          name,
          {
            detail: {
              version:
                VERSION,

              state,

              ...detail
            }
          }
        )
      );

    } catch (_) {}

  }


  function nextFrame() {

    return new Promise(
      function (resolve) {

        window.requestAnimationFrame(
          function () {

            resolve();

          }
        );

      }
    );

  }


  async function nextPaint(
    frameCount = DEFAULTS.paintFrames
  ) {

    const count =
      clamp(
        Math.round(
          Number(
            frameCount
          ) ||
          DEFAULTS.paintFrames
        ),
        1,
        6
      );

    for (
      let index = 0;
      index < count;
      index += 1
    ) {

      await nextFrame();

    }

  }


  function normalizeOptions(
    options = {}
  ) {

    const reducedMotion =
      isReducedMotion();

    return {

      coverDurationMs:
        reducedMotion
          ? 120
          : clamp(
              Number(
                options.coverDurationMs
              ) ||
              DEFAULTS.coverDurationMs,
              120,
              1800
            ),

      revealDurationMs:
        reducedMotion
          ? 120
          : clamp(
              Number(
                options.revealDurationMs
              ) ||
              DEFAULTS.revealDurationMs,
              120,
              2200
            ),

      coveredHoldMs:
        reducedMotion
          ? 30
          : clamp(
              Number(
                options.coveredHoldMs
              ) ??
              DEFAULTS.coveredHoldMs,
              0,
              1200
            ),

      paintFrames:
        clamp(
          Number(
            options.paintFrames
          ) ||
          DEFAULTS.paintFrames,
          1,
          6
        )

    };

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


    root =
      document.createElement(
        "div"
      );

    root.className =
      "duduq-transition";

    root.setAttribute(
      "aria-hidden",
      "true"
    );


    stage =
      document.createElement(
        "div"
      );

    stage.className =
      "duduq-transition-stage";


    glow =
      document.createElement(
        "div"
      );

    glow.className =
      "duduq-transition-glow";


    stage.appendChild(
      glow
    );

    root.appendChild(
      stage
    );


    (
      document.body ||
      document.documentElement
    ).appendChild(
      root
    );


    return root;

  }


  function lockPage() {

    try {

      document
        .documentElement
        .classList
        .add(
          "duduq-transition-lock"
        );

      document
        .body
        ?.classList
        .add(
          "duduq-transition-lock"
        );

    } catch (_) {}

  }


  function unlockPage() {

    try {

      document
        .documentElement
        .classList
        .remove(
          "duduq-transition-lock"
        );

      document
        .body
        ?.classList
        .remove(
          "duduq-transition-lock"
        );

    } catch (_) {}

  }


  function clearClasses() {

    if (!root) {
      return;
    }

    root.classList.remove(
      "is-covering",
      "is-covered",
      "is-revealing"
    );

  }


  /* =======================================================
     COVER

     Primeiro cobrimos totalmente a tela.
     A mecânica antiga NÃO deve ser destruída antes
     desta Promise terminar.
     ======================================================= */

  async function cover(
    options = {}
  ) {

    const config =
      normalizeOptions(
        options
      );

    const currentOperation =
      ++operationId;


    ensureRoot();

    lockPage();

    clearClasses();


    state =
      "covering";


    dispatch(
      "duduq:transition-cover-start"
    );


    /*
     * Garante que o browser processe o estado invisível
     * antes de iniciar a animação.
     */

    root.getBoundingClientRect();


    await nextFrame();


    if (
      currentOperation !==
      operationId
    ) {

      return false;

    }


    root.classList.add(
      "is-covering"
    );


    await wait(
      config.coverDurationMs
    );


    if (
      currentOperation !==
      operationId
    ) {

      return false;

    }


    root.classList.remove(
      "is-covering"
    );

    root.classList.add(
      "is-covered"
    );


    state =
      "covered";


    dispatch(
      "duduq:transition-covered"
    );


    return true;

  }


  /* =======================================================
     REVEAL

     Só deve ser executado quando a nova mecânica
     já estiver montada por baixo da camada.
     ======================================================= */

  async function reveal(
    options = {}
  ) {

    const config =
      normalizeOptions(
        options
      );

    const currentOperation =
      operationId;


    ensureRoot();


    /*
     * A nova tela precisa receber pelo menos alguns
     * frames de pintura antes de aparecer.
     */

    await nextPaint(
      config.paintFrames
    );


    if (
      currentOperation !==
      operationId
    ) {

      return false;

    }


    if (
      config.coveredHoldMs >
      0
    ) {

      await wait(
        config.coveredHoldMs
      );

    }


    if (
      currentOperation !==
      operationId
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


    state =
      "revealing";


    dispatch(
      "duduq:transition-reveal-start"
    );


    await wait(
      config.revealDurationMs
    );


    if (
      currentOperation !==
      operationId
    ) {

      return false;

    }


    clearClasses();

    unlockPage();


    state =
      "idle";


    dispatch(
      "duduq:transition-complete"
    );


    return true;

  }


  /* =======================================================
     SWAP

     Fluxo oficial:

     1. cobre a mecânica atual
     2. executa destroy/mount escondido
     3. aguarda pintura da nova mecânica
     4. revela suavemente

     callback pode ser síncrono ou async.
     ======================================================= */

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


    /*
     * Evita duas trocas simultâneas.
     */

    if (
      activeSwapPromise
    ) {

      return activeSwapPromise;

    }


    activeSwapPromise =
      (
        async function () {

          try {

            await cover(
              options
            );


            dispatch(
              "duduq:transition-swap"
            );


            const result =
              await callback();


            await reveal(
              options
            );


            return result;

          } catch (error) {

            /*
             * Nunca podemos deixar a aplicação
             * permanentemente coberta em caso de erro.
             */

            console.error(
              "[DuduQ Transition] Erro durante troca:",
              error
            );


            try {

              await reveal({
                ...options,

                coveredHoldMs:
                  0,

                paintFrames:
                  1
              });

            } catch (_) {

              hideImmediate();

            }


            throw error;

          } finally {

            activeSwapPromise =
              null;

          }

        }
      )();


    return activeSwapPromise;

  }


  /* =======================================================
     HIDE IMMEDIATE

     Segurança para recuperação de erro.
     ======================================================= */

  function hideImmediate() {

    operationId +=
      1;


    if (
      root
    ) {

      clearClasses();

    }


    unlockPage();


    state =
      "idle";


    dispatch(
      "duduq:transition-reset"
    );


    return true;

  }


  /* =======================================================
     DESTROY
     ======================================================= */

  function destroy() {

    operationId +=
      1;

    activeSwapPromise =
      null;


    unlockPage();


    if (
      root &&
      root.parentNode
    ) {

      root.parentNode.removeChild(
        root
      );

    }


    root =
      null;

    stage =
      null;

    glow =
      null;

    state =
      "idle";


    return true;

  }


  /* =======================================================
     STATUS
     ======================================================= */

  function getState() {

    return state;

  }


  function isActive() {

    return (
      state !==
      "idle"
    );

  }


  function isCovered() {

    return (
      state ===
      "covered"
    );

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.DuduQTransition =
    Object.freeze({

      version:
        VERSION,

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
      ready:
        true
    }
  );

})();

/* =========================================================
   DUDUQ CORE — TRANSITION
   Orquestrador universal de transições entre telas
   e mecânicas DuduQ.

   Versão 1.1.0

   CONCEITO
   - movimento horizontal contínuo
   - sincronização pelo transitionend real do CSS
   - sem pausa artificial entre cover e reveal
   - sem som
   - sem mensagem
   - sem tela de loading
   - proteção contra flashes durante destroy/mount
   ========================================================= */

(function () {
  "use strict";

  const VERSION =
    "1.1.0";


  if (
    window.DuduQTransition &&
    window.DuduQTransition.version === VERSION
  ) {
    return;
  }


  /* =======================================================
     CONFIGURAÇÃO

     Os tempos abaixo servem principalmente como fallback.

     O fluxo normal é sincronizado pelo transitionend
     disparado pelo próprio CSS.
     ======================================================= */

  const DEFAULTS =
    Object.freeze({

      coverDurationMs:
        340,

      revealDurationMs:
        360,

      paintFrames:
        1,

      fallbackExtraMs:
        140

    });


  /* =======================================================
     ESTADO
     ======================================================= */

  let root =
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


  function safeNumber(
    value,
    fallback
  ) {

    const number =
      Number(value);

    return Number.isFinite(
      number
    )
      ? number
      : fallback;

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
          resolve
        );

      }
    );

  }


  async function nextPaint(
    frameCount = 1
  ) {

    const count =
      clamp(
        Math.round(
          safeNumber(
            frameCount,
            1
          )
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


  function normalizeOptions(
    options = {}
  ) {

    const reduced =
      isReducedMotion();


    return {

      /*
       * Esses tempos são apenas fallback.
       * A duração visual real vem do CSS.
       */

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

      /*
       * Não existe mais coveredHoldMs.
       *
       * A versão anterior criava uma parada visual
       * entre a entrada e a saída.
       */

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
        DEFAULTS
          .fallbackExtraMs

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


    /*
     * Mantemos a estrutura anterior apenas por
     * compatibilidade.

     * O CSS 1.1.0 esconde esses elementos.
     */

    const stage =
      document.createElement(
        "div"
      );


    stage.className =
      "duduq-transition-stage";


    const glow =
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
     ESPERA PELO MOVIMENTO REAL DO CSS

     Em vez de adivinhar o tempo com setTimeout,
     esperamos o transitionend do painel.

     Existe timeout somente como segurança.
     ======================================================= */

  function waitForTransformTransition(
    expectedDurationMs
  ) {

    ensureRoot();


    return new Promise(
      function (resolve) {

        let finished =
          false;


        const fallbackMs =
          Math.max(
            120,
            safeNumber(
              expectedDurationMs,
              360
            ) +
            DEFAULTS.fallbackExtraMs
          );


        let timeoutId =
          null;


        function cleanup() {

          if (!root) {
            return;
          }


          try {

            root.removeEventListener(
              "transitionend",
              handleTransitionEnd
            );

          } catch (_) {}


          if (
            timeoutId !==
            null
          ) {

            window.clearTimeout(
              timeoutId
            );

            timeoutId =
              null;

          }

        }


        function finish() {

          if (finished) {
            return;
          }


          finished =
            true;


          cleanup();


          resolve(
            true
          );

        }


        function handleTransitionEnd(
          event
        ) {

          if (
            event.target !==
            root
          ) {

            return;

          }


          if (
            event.propertyName !==
            "transform"
          ) {

            return;

          }


          /*
           * O painel principal é ::before.
           *
           * Alguns navegadores não informam pseudoElement,
           * então aceitamos também valor vazio.
           */

          if (
            event.pseudoElement &&
            event.pseudoElement !==
              "::before"
          ) {

            return;

          }


          finish();

        }


        root.addEventListener(
          "transitionend",
          handleTransitionEnd
        );


        timeoutId =
          window.setTimeout(
            finish,
            fallbackMs
          );

      }
    );

  }


  /* =======================================================
     PREPARAÇÃO

     Recoloca o painel invisível fora da tela à direita.
     ======================================================= */

  async function prepare() {

    ensureRoot();


    clearClasses();


    /*
     * Força o navegador a aplicar o estado inicial.
     */

    root.getBoundingClientRect();


    await nextFrame();


    return true;

  }


  /* =======================================================
     COVER

     O painel desliza da direita até cobrir toda a viewport.

     Somente depois disso o callback pode destruir
     a mecânica anterior.
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


    state =
      "preparing";


    await prepare();


    if (
      currentOperation !==
      operationId
    ) {

      return false;

    }


    state =
      "covering";


    dispatch(
      "duduq:transition-cover-start"
    );


    root.classList.add(
      "is-covering"
    );


    await waitForTransformTransition(
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

     A próxima tela já está por baixo.

     Não há pausa de loading.

     Recebemos apenas um frame de pintura para evitar
     composição incompleta e o painel continua saindo
     imediatamente para a esquerda.
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


    await nextPaint(
      config.paintFrames
    );


    if (
      currentOperation !==
      operationId
    ) {

      return false;

    }


    /*
     * IMPORTANTE:
     *
     * Não existe coveredHold.
     * O movimento continua imediatamente.
     */

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


    await waitForTransformTransition(
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

     FLUXO OFICIAL

     tela A
       ↓
     slide entra
       ↓
     tela fica protegida
       ↓
     callback troca A por B
       ↓
     1 frame de pintura
       ↓
     slide continua para esquerda
       ↓
     tela B

     Não existe animação de volta.
     Não existe pausa intermediária.
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
     * Impede duas transições concorrentes.
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

            const covered =
              await cover(
                options
              );


            if (!covered) {

              return false;

            }


            dispatch(
              "duduq:transition-swap"
            );


            /*
             * Destroy + mount acontecem somente agora,
             * com a viewport protegida.
             */

            const result =
              await callback();


            await reveal(
              options
            );


            return result;

          } catch (error) {

            console.error(
              "[DuduQ Transition] Erro durante troca:",
              error
            );


            /*
             * Nunca deixamos a aplicação escondida
             * por causa de uma exceção.
             */

            hideImmediate();


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
     RESET IMEDIATO
     ======================================================= */

  function hideImmediate() {

    operationId +=
      1;


    if (root) {

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

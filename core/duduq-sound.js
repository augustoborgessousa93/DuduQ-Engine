/* =========================================================
   DUDUQ CORE — SOUND
   Sistema sonoro central do ecossistema DuduQ.

   Versão 1.1.0

   Novidades:
   - suporte a loop
   - fade in / fade out
   - volumes centralizados
   - áudio da intro controlado por eventos
   - preparação para som da transição entre mecânicas
   - proteção contra autoplay bloqueado
   ========================================================= */

(function () {
  "use strict";

  const VERSION =
    "1.1.0";


  if (
    window.DuduQSound &&
    window.DuduQSound.version === VERSION
  ) {
    return;
  }


  /* =======================================================
     DEPENDÊNCIA
     ======================================================= */

  if (
    !window.DUDUQ_ASSETS ||
    !window.DUDUQ_ASSETS.sounds
  ) {

    console.error(
      "[DuduQ Sound] duduq-assets.js precisa ser carregado antes de duduq-sound.js."
    );

    return;
  }


  const SOURCES =
    window.DUDUQ_ASSETS.sounds;


  /* =======================================================
     VOLUMES PADRÃO
     ======================================================= */

  const DEFAULT_VOLUME =
    Object.freeze({

      click:
        0.22,

      pop:
        0.30,

      "bubble-pop":
        0.46,

      ding:
        0.40,

      correct:
        0.56,

      error:
        0.48,

      win:
        0.64,


      /* Intro — logo da empresa */
      "intro-company-swoosh":
        0.58,


      /* Intro — música EduQ Play */
      "intro-mission-music":
        0.24,


      /* Transição entre mecânicas */
      "transition-swoosh":
        0.42

    });


  /* =======================================================
     INTERVALO MÍNIMO ENTRE REPETIÇÕES
     ======================================================= */

  const DEFAULT_GAP =
    Object.freeze({

      click:
        55,

      pop:
        70,

      "bubble-pop":
        110,

      ding:
        100,

      correct:
        1200,

      error:
        520,

      win:
        1800,

      "intro-company-swoosh":
        2400,

      "intro-mission-music":
        500,

      "transition-swoosh":
        260

    });


  /* =======================================================
     ESTADO
     ======================================================= */

  const channels =
    new Map();


  const lastPlay =
    new Map();


  const fadeFrames =
    new Map();


  let gestureUnlocked =
    false;


  let introMissionActive =
    false;


  /* =======================================================
     CRIAÇÃO DOS CANAIS
     ======================================================= */

  Object.entries(
    SOURCES
  ).forEach(
    function ([name, src]) {

      try {

        const audio =
          new Audio(src);


        audio.preload =
          "auto";


        audio.volume =
          DEFAULT_VOLUME[name] ??
          0.5;


        audio.loop =
          false;


        channels.set(
          name,
          audio
        );

      } catch (_) {}

    }
  );


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


  function getChannel(
    name
  ) {

    return (
      channels.get(name) ||
      null
    );

  }


  function getDefaultVolume(
    name
  ) {

    return (
      DEFAULT_VOLUME[name] ??
      0.5
    );

  }


  function cancelFade(
    name
  ) {

    const frame =
      fadeFrames.get(name);


    if (
      frame !== undefined
    ) {

      try {

        window.cancelAnimationFrame(
          frame
        );

      } catch (_) {}


      fadeFrames.delete(
        name
      );

    }

  }


  /* =======================================================
     STOP
     ======================================================= */

  function stop(
    name
  ) {

    const audio =
      getChannel(name);


    if (!audio) {
      return false;
    }


    cancelFade(name);


    try {

      audio.pause();

      audio.currentTime =
        0;

      audio.loop =
        false;


      return true;

    } catch (_) {

      return false;

    }

  }


  function stopAll() {

    channels.forEach(
      function (_, name) {

        stop(name);

      }
    );


    return true;

  }


  /* =======================================================
     FADE
     ======================================================= */

  function fadeTo(
    name,
    targetVolume,
    durationMs = 400
  ) {

    const audio =
      getChannel(name);


    if (!audio) {

      return Promise.resolve(
        false
      );

    }


    cancelFade(name);


    const startVolume =
      clamp(
        Number(audio.volume) || 0,
        0,
        1
      );


    const endVolume =
      clamp(
        Number(targetVolume) || 0,
        0,
        1
      );


    const duration =
      Math.max(
        0,
        Number(durationMs) || 0
      );


    if (
      duration === 0 ||
      Math.abs(
        startVolume -
        endVolume
      ) < 0.001
    ) {

      audio.volume =
        endVolume;


      return Promise.resolve(
        true
      );

    }


    return new Promise(
      function (resolve) {

        const startTime =
          (
            window.performance &&
            typeof performance.now === "function"
          )
            ? performance.now()
            : Date.now();


        function tick(
          timestamp
        ) {

          const currentTime =
            Number(timestamp) ||
            Date.now();


          const elapsed =
            currentTime -
            startTime;


          const progress =
            clamp(
              elapsed /
              duration,
              0,
              1
            );


          /*
           * Ease suave.
           */

          const eased =
            1 -
            Math.pow(
              1 - progress,
              3
            );


          audio.volume =
            clamp(
              startVolume +
              (
                endVolume -
                startVolume
              ) *
              eased,
              0,
              1
            );


          if (
            progress >= 1
          ) {

            fadeFrames.delete(
              name
            );


            audio.volume =
              endVolume;


            resolve(
              true
            );


            return;

          }


          const frame =
            window.requestAnimationFrame(
              tick
            );


          fadeFrames.set(
            name,
            frame
          );

        }


        const frame =
          window.requestAnimationFrame(
            tick
          );


        fadeFrames.set(
          name,
          frame
        );

      }
    );

  }


  function fadeOut(
    name,
    durationMs = 400
  ) {

    const audio =
      getChannel(name);


    if (!audio) {

      return Promise.resolve(
        false
      );

    }


    if (
      audio.paused
    ) {

      stop(name);


      return Promise.resolve(
        true
      );

    }


    return fadeTo(
      name,
      0,
      durationMs
    ).then(
      function () {

        stop(name);


        /*
         * Devolvemos o volume padrão para
         * a próxima execução.
         */

        audio.volume =
          getDefaultVolume(
            name
          );


        return true;

      }
    );

  }


  /* =======================================================
     AUTOPLAY / DESBLOQUEIO
     ======================================================= */

  function emitBlocked(
    name,
    error
  ) {

    try {

      window.dispatchEvent(
        new CustomEvent(
          "duduq:sound-blocked",
          {
            detail: {
              version:
                VERSION,

              name:
                name,

              error:
                error || null
            }
          }
        )
      );

    } catch (_) {}

  }


  function unlockAllFromGesture() {

    if (
      gestureUnlocked
    ) {

      return;

    }


    gestureUnlocked =
      true;


    channels.forEach(
      function (audio) {

        /*
         * Se algum navegador já permitiu um áudio
         * automaticamente, não interrompemos esse canal.
         */

        if (
          !audio.paused
        ) {

          return;

        }


        const oldMuted =
          audio.muted;


        const oldVolume =
          audio.volume;


        const oldLoop =
          audio.loop;


        const oldCurrentTime =
          audio.currentTime;


        try {

          audio.muted =
            true;

          audio.loop =
            false;

          audio.currentTime =
            0;


          const result =
            audio.play();


          const finish =
            function () {

              try {

                audio.pause();

                audio.currentTime =
                  oldCurrentTime || 0;

              } catch (_) {}


              audio.muted =
                oldMuted;


              audio.volume =
                oldVolume;


              audio.loop =
                oldLoop;

            };


          if (
            result &&
            typeof result.then ===
              "function"
          ) {

            result
              .then(
                function () {

                  window.setTimeout(
                    finish,
                    0
                  );

                }
              )
              .catch(
                function () {

                  finish();

                }
              );

          } else {

            finish();

          }

        } catch (_) {

          audio.muted =
            oldMuted;


          audio.volume =
            oldVolume;


          audio.loop =
            oldLoop;

        }

      }
    );


    document.removeEventListener(
      "pointerdown",
      unlockAllFromGesture,
      true
    );


    document.removeEventListener(
      "keydown",
      unlockAllFromGesture,
      true
    );

  }


  document.addEventListener(
    "pointerdown",
    unlockAllFromGesture,
    true
  );


  document.addEventListener(
    "keydown",
    unlockAllFromGesture,
    true
  );


  /* =======================================================
     START
     ======================================================= */

  function start(
    name,
    options = {}
  ) {

    const audio =
      getChannel(name);


    if (!audio) {

      return null;

    }


    cancelFade(name);


    const now =
      (
        window.performance &&
        typeof performance.now === "function"
      )
        ? performance.now()
        : Date.now();


    const minGapMs =
      Number.isFinite(
        options.minGapMs
      )
        ? options.minGapMs
        : (
            DEFAULT_GAP[name] ||
            0
          );


    const previous =
      lastPlay.get(name) ||
      -Infinity;


    if (
      now -
      previous <
      minGapMs
    ) {

      return null;

    }


    lastPlay.set(
      name,
      now
    );


    const desiredVolume =
      clamp(
        Number.isFinite(
          options.volume
        )
          ? options.volume
          : getDefaultVolume(name),
        0,
        1
      );


    try {

      audio.pause();


      audio.currentTime =
        0;


      audio.muted =
        false;


      audio.loop =
        options.loop === true;


      audio.playbackRate =
        Number.isFinite(
          options.playbackRate
        )
          ? options.playbackRate
          : 1;


      const fadeInMs =
        Math.max(
          0,
          Number(
            options.fadeInMs
          ) || 0
        );


      audio.volume =
        fadeInMs > 0
          ? 0
          : desiredVolume;


      const promise =
        audio.play();


      if (
        promise &&
        typeof promise.then ===
          "function"
      ) {

        promise
          .then(
            function () {

              if (
                fadeInMs > 0
              ) {

                fadeTo(
                  name,
                  desiredVolume,
                  fadeInMs
                );

              }

            }
          )
          .catch(
            function (error) {

              /*
               * Não reproduzimos o som atrasado depois.
               *
               * Swoosh fora do momento correto é pior
               * que ausência de áudio.
               */

              emitBlocked(
                name,
                error
              );

            }
          );

      } else if (
        fadeInMs > 0
      ) {

        fadeTo(
          name,
          desiredVolume,
          fadeInMs
        );

      }

    } catch (error) {

      emitBlocked(
        name,
        error
      );

    }


    return audio;

  }


  /* =======================================================
     PLAY
     ======================================================= */

  function play(
    name,
    options = {}
  ) {

    const aliases =
      {

        "you win":
          "win",

        "you-win":
          "win",

        bubblePop:
          "bubble-pop"

      };


    const normalized =
      aliases[name] ||
      name;


    const delayMs =
      Math.max(
        0,
        Number(
          options.delayMs
        ) || 0
      );


    if (
      delayMs > 0
    ) {

      window.setTimeout(
        function () {

          start(
            normalized,
            options
          );

        },
        delayMs
      );


      return null;

    }


    return start(
      normalized,
      options
    );

  }


  /* =======================================================
     LOOP
     ======================================================= */

  function playLoop(
    name,
    options = {}
  ) {

    return play(
      name,
      {
        ...options,
        loop:
          true
      }
    );

  }


  /* =======================================================
     STATUS
     ======================================================= */

  function isPlaying(
    name
  ) {

    const audio =
      getChannel(name);


    if (!audio) {

      return false;

    }


    return (
      !audio.paused &&
      !audio.ended
    );

  }


  /* =======================================================
     CONTROLE SONORO DA INTRO

     O Intro já emite eventos de fase.
     Assim não precisamos alterar sua lógica visual estável.
     ======================================================= */

  function playCompanyIntroSound() {

    play(
      "intro-company-swoosh",
      {
        volume:
          0.58,

        minGapMs:
          2400
      }
    );

  }


  function startMissionMusic() {

    if (
      introMissionActive
    ) {

      return;

    }


    introMissionActive =
      true;


    playLoop(
      "intro-mission-music",
      {
        volume:
          0.24,

        fadeInMs:
          650,

        minGapMs:
          500
      }
    );

  }


  function stopMissionMusic(
    immediate = false
  ) {

    introMissionActive =
      false;


    if (
      immediate
    ) {

      stop(
        "intro-mission-music"
      );


      return;

    }


    fadeOut(
      "intro-mission-music",
      520
    );

  }


  document.addEventListener(
    "duduq:intro-phase",
    function (event) {

      const phase =
        event &&
        event.detail
          ? event.detail.phase
          : "";


      if (
        phase ===
        "branding"
      ) {

        stopMissionMusic(
          true
        );


        playCompanyIntroSound();


        return;

      }


      if (
        phase ===
        "mission"
      ) {

        startMissionMusic();

      }

    }
  );


  document.addEventListener(
    "duduq:intro-start",
    function () {

      /*
       * Ao apertar INICIAR MISSÃO,
       * a música sai de forma suave.
       */

      stopMissionMusic(
        false
      );

    }
  );


  document.addEventListener(
    "duduq:intro-hidden",
    function () {

      /*
       * Segurança caso a Intro seja fechada
       * por qualquer outro motivo.
       */

      stopMissionMusic(
        true
      );

    }
  );


  /* =======================================================
     CONTROLES DE RESTART
     ======================================================= */

  function isRestartControl(
    button
  ) {

    const text =
      `
        ${button.id || ""}
        ${button.className || ""}
        ${
          button.getAttribute?.(
            "aria-label"
          ) || ""
        }
        ${button.textContent || ""}
      `.toLowerCase();


    return (
      /restart|recome|reinici|jogar novamente|play again/
        .test(text)
    );

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.DuduQSound =
    Object.freeze({

      version:
        VERSION,

      play:
        play,

      playLoop:
        playLoop,

      stop:
        stop,

      stopAll:
        stopAll,

      fadeTo:
        fadeTo,

      fadeOut:
        fadeOut,

      isPlaying:
        isPlaying,

      sources:
        Object.freeze({
          ...SOURCES
        })

    });


  /* =======================================================
     CLIQUE GLOBAL
     ======================================================= */

  document.addEventListener(
    "click",
    function (event) {

      const target =
        event.target instanceof Element
          ? event.target
          : null;


      const button =
        target
          ?.closest
          ?.(
            "button, [role='button']"
          );


      if (!button) {

        return;

      }


      if (
        button.disabled ||
        button.getAttribute(
          "aria-disabled"
        ) === "true" ||
        button.dataset.duduqSound ===
          "none"
      ) {

        return;

      }


      if (
        isRestartControl(
          button
        )
      ) {

        stop(
          "win"
        );

      }


      /*
       * Mecânicas que possuem
       * efeitos próprios de interação.
       */

      if (
        button.matches(
          ".duduq-bp-bubble," +
          " .duduq-ts-target," +
          " .duduq-mq-card," +
          " .duduq-ws-object"
        )
      ) {

        return;

      }


      play(
        "click",
        {
          volume:
            0.22,

          minGapMs:
            55
        }
      );

    },
    true
  );


  /* =======================================================
     READY
     ======================================================= */

  try {

    window.dispatchEvent(
      new CustomEvent(
        "duduq:sound-ready",
        {
          detail: {
            version:
              VERSION
          }
        }
      )
    );

  } catch (_) {}


  console.info(
    "[DuduQ Sound] v" +
    VERSION +
    " — sistema sonoro central carregado."
  );

})();

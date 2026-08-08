/* =========================================================
   DUDUQ CORE — SOUND
   Sistema sonoro central do ecossistema DuduQ.
   Versão 1.0.0
   ========================================================= */

(function () {
  "use strict";

  if (
    window.DuduQSound &&
    window.DuduQSound.version === "1.0.0"
  ) {
    return;
  }

  if (
    !window.DUDUQ_ASSETS ||
    !window.DUDUQ_ASSETS.sounds
  ) {
    console.error(
      "[DuduQ Sound] duduq-assets.js precisa ser carregado antes de duduq-sound.js."
    );
    return;
  }

  const SOURCES = window.DUDUQ_ASSETS.sounds;

  const DEFAULT_VOLUME = Object.freeze({
    click: 0.22,
    pop: 0.30,
    "bubble-pop": 0.46,
    ding: 0.40,
    correct: 0.56,
    error: 0.48,
    win: 0.64
  });

  const DEFAULT_GAP = Object.freeze({
    click: 55,
    pop: 70,
    "bubble-pop": 110,
    ding: 100,
    correct: 1200,
    error: 520,
    win: 1800
  });

  const channels = new Map();
  const lastPlay = new Map();

  let gestureUnlocked = false;

  Object.entries(SOURCES).forEach(
    ([name, src]) => {
      try {
        const audio = new Audio(src);

        audio.preload = "auto";

        audio.volume =
          DEFAULT_VOLUME[name] || 0.5;

        channels.set(name, audio);
      } catch (_) {}
    }
  );

  function stop(name) {
    const audio = channels.get(name);

    if (!audio) {
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (_) {}
  }

  function stopAll() {
    channels.forEach(
      (_, name) => stop(name)
    );
  }

  function unlockAllFromGesture() {
    if (gestureUnlocked) {
      return;
    }

    gestureUnlocked = true;

    channels.forEach((audio) => {
      const oldMuted = audio.muted;
      const oldVolume = audio.volume;

      try {
        audio.muted = true;
        audio.currentTime = 0;

        const result = audio.play();

        const finish = () => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (_) {}

          audio.muted = oldMuted;
          audio.volume = oldVolume;
        };

        if (
          result &&
          typeof result.then === "function"
        ) {
          result
            .then(() =>
              window.setTimeout(finish, 0)
            )
            .catch(() => finish());
        } else {
          finish();
        }
      } catch (_) {
        audio.muted = oldMuted;
        audio.volume = oldVolume;
      }
    });

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

  function start(
    name,
    options = {}
  ) {
    const audio = channels.get(name);

    if (!audio) {
      return null;
    }

    const now =
      window.performance &&
      performance.now
        ? performance.now()
        : Date.now();

    const minGapMs =
      Number.isFinite(options.minGapMs)
        ? options.minGapMs
        : DEFAULT_GAP[name] || 0;

    const previous =
      lastPlay.get(name) || -Infinity;

    if (
      now - previous <
      minGapMs
    ) {
      return null;
    }

    lastPlay.set(name, now);

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;

      audio.volume = Math.max(
        0,
        Math.min(
          1,
          Number.isFinite(options.volume)
            ? options.volume
            : DEFAULT_VOLUME[name] || 0.5
        )
      );

      audio.playbackRate =
        Number.isFinite(options.playbackRate)
          ? options.playbackRate
          : 1;

      const promise = audio.play();

      if (
        promise &&
        typeof promise.catch === "function"
      ) {
        promise.catch(() => {});
      }
    } catch (_) {}

    return audio;
  }

  function play(
    name,
    options = {}
  ) {
    const aliases = {
      "you win": "win",
      "you-win": "win",
      bubblePop: "bubble-pop"
    };

    const normalized =
      aliases[name] || name;

    const delayMs =
      Number(options.delayMs) || 0;

    if (delayMs > 0) {
      window.setTimeout(
        () =>
          start(
            normalized,
            options
          ),
        delayMs
      );

      return null;
    }

    return start(
      normalized,
      options
    );
  }

  function isRestartControl(button) {
    const text = `
      ${button.id || ""}
      ${button.className || ""}
      ${button.getAttribute?.("aria-label") || ""}
      ${button.textContent || ""}
    `.toLowerCase();

    return /restart|recome|reinici|jogar novamente|play again/.test(
      text
    );
  }

  window.DuduQSound = Object.freeze({
    version: "1.0.0",
    play,
    stop,
    stopAll,
    sources: Object.freeze({
      ...SOURCES
    })
  });

  document.addEventListener(
    "click",
    function (event) {
      const target =
        event.target instanceof Element
          ? event.target
          : null;

      const button =
        target?.closest?.(
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
        isRestartControl(button)
      ) {
        stop("win");
      }

      /*
       * Essas mecânicas possuem
       * efeitos próprios de interação.
       * Evitamos duplicar o clique.
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

      play("click", {
        volume: 0.22,
        minGapMs: 55
      });
    },
    true
  );
})();

(() => {
  "use strict";

  const defaults = Object.freeze({
    moduleLabel: "MÓDULO 1",
    gradeLabel: "1º ANO",
    subjectLabel: "LÍNGUA INGLESA",
    startLabel: "INICIAR JOGO",
    nextUrl: "/play/matching/"
  });

  const safeText = (value, fallback) => String(value || fallback).trim().slice(0, 48);
  const resolveInternalNextUrl = (value, fallback = defaults.nextUrl) => {
    const candidate = String(value || "").trim();
    return candidate.startsWith("/play/") ? candidate : fallback;
  };

  function createModuleOutlineDots(className = "duduq-module-card-v2__dot") {
    const segments = [
      [[0,21.072265625],[0,9.44140625],[6.75390625,0],[15.07421875,0]], [[15.07421875,0],[185.923828125,0]],
      [[185.923828125,0],[194.244140625,0],[201,9.44140625],[201,21.072265625]], [[201,21.072265625],[201,50.92578125]],
      [[201,50.92578125],[201,62.556640625],[194.244140625,72],[185.923828125,72]], [[185.923828125,72],[15.07421875,72]],
      [[15.07421875,72],[6.75390625,72],[0,62.556640625],[0,50.92578125]], [[0,50.92578125],[0,21.072265625]]
    ];
    const points = [];
    for (const s of segments) {
      const cubic = s.length === 4;
      const steps = cubic ? 384 : Math.max(2, Math.ceil(Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) * 2));
      for (let i = points.length ? 1 : 0; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        points.push(cubic
          ? [u ** 3 * s[0][0] + 3 * u ** 2 * t * s[1][0] + 3 * u * t ** 2 * s[2][0] + t ** 3 * s[3][0], u ** 3 * s[0][1] + 3 * u ** 2 * t * s[1][1] + 3 * u * t ** 2 * s[2][1] + t ** 3 * s[3][1]]
          : [s[0][0] + (s[1][0] - s[0][0]) * t, s[0][1] + (s[1][1] - s[0][1]) * t]);
      }
    }
    const distances = [0];
    for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const dots = [];
    for (let d = 0; d < distances.at(-1); d += 5.888889) {
      let i = 1;
      while (i < distances.length - 1 && distances[i] < d) i++;
      const p = points[i - 1], q = points[i], length = distances[i] - distances[i - 1], f = length ? (d - distances[i - 1]) / length : 0;
      const dx = (q[0] - p[0]) / (length || 1), dy = (q[1] - p[1]) / (length || 1);
      const x = p[0] + (q[0] - p[0]) * f - dy * .4444445, y = p[1] + (q[1] - p[1]) * f + dx * .4444445;
      dots.push(`<i class="${className}" style="left:${x / 201 * 100}%;top:${y / 72 * 100}%"></i>`);
    }
    return dots.join("");
  }

  function createIntroScreen(options = {}) {
    const copy = {
      moduleLabel: safeText(options.moduleLabel, defaults.moduleLabel),
      gradeLabel: safeText(options.gradeLabel, defaults.gradeLabel),
      subjectLabel: safeText(options.subjectLabel, defaults.subjectLabel),
      startLabel: safeText(options.startLabel, defaults.startLabel),
      nextUrl: resolveInternalNextUrl(options.nextUrl)
    };
    const root = options.container instanceof Element
      ? options.container
      : document.querySelector(options.container || "#intro-module-root");
    if (!root) throw new Error("DuduQModuleIntroScreen requires a valid container.");

    root.innerHTML = `
      <section class="duduq-module-intro" aria-labelledby="intro-title">
        <span class="duduq-intro-footer-blur" aria-hidden="true"></span>
        <div class="duduq-intro-mascot-motion" aria-hidden="true">
          <img class="duduq-intro-mascot" src="../../core/assets/intro/mascote-duduq-intro.png" alt="">
        </div>

        <section class="intro-content">
          <p class="intro-eyebrow">UMA NOVA AVENTURA DE APRENDIZAGEM</p>
          <h1 id="intro-title">VAMOS COMEÇAR?</h1>
          <p class="intro-support">Descubra, jogue e aprenda com o DuduQ.</p>

          <dl class="intro-info" aria-label="Informações do módulo">
            <div class="duduq-year-card-v2">
              <svg class="duduq-year-card-v2__surface" viewBox="0 0 205 132" aria-hidden="true"><defs><filter id="year-depth" x="-0.1" y="-0.21" width="1.19" height="1.63"><feOffset dx="0" dy="5"/><feFlood flood-color="#349FDF" flood-opacity="1"/><feComposite in2="SourceAlpha" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="year-inner"><path d="M20 36.072265625C20 24.44140625 25.544921875 15 32.375 15L172.625 15C179.455078125 15 185 24.44140625 185 36.072265625L185 65.92578125C185 77.556640625 179.455078125 87 172.625 87L32.375 87C25.544921875 87 20 77.556640625 20 65.92578125Z"/></clipPath></defs><path d="M20 36.072265625C20 24.44140625 25.544921875 15 32.375 15L172.625 15C179.455078125 15 185 24.44140625 185 36.072265625L185 65.92578125C185 77.556640625 179.455078125 87 172.625 87L32.375 87C25.544921875 87 20 77.556640625 20 65.92578125Z" fill="#FFFDF7" filter="url(#year-depth)"/><path d="M20 36.072265625C20 24.44140625 25.544921875 15 32.375 15L172.625 15C179.455078125 15 185 24.44140625 185 36.072265625L185 65.92578125C185 77.556640625 179.455078125 87 172.625 87L32.375 87C25.544921875 87 20 77.556640625 20 65.92578125Z" fill="none" stroke="#349FDF" stroke-width="1.777778" stroke-dasharray="0 5.888889" stroke-linecap="round" clip-path="url(#year-inner)"/></svg>
              <dt class="duduq-year-card-v2__label">ANO / SÉRIE</dt>
              <dd class="duduq-year-card-v2__value" data-intro-grade>${copy.gradeLabel}</dd>
              <img class="duduq-year-card-v2__icon" src="../../core/assets/intro/icon-ano-serie.png" alt="" aria-hidden="true">
            </div>
            <div class="duduq-module-card-v2">
              <span class="duduq-module-card-v2__visual" aria-hidden="true"><span class="duduq-module-card-v2__vector"><span class="duduq-module-card-v2__depth"></span><span class="duduq-module-card-v2__surface"></span><span class="duduq-module-card-v2__outline" data-module-outline></span></span></span>
              <dt class="duduq-module-card-v2__label">MÓDULO</dt><dd class="duduq-module-card-v2__value" data-intro-module>${copy.moduleLabel}</dd>
              <img class="duduq-module-card-v2__icon" src="../../core/assets/intro/icon-modulo.png" alt="" aria-hidden="true">
            </div>
            <div class="duduq-subject-card">
              <span class="duduq-subject-card__vector" aria-hidden="true"><span class="duduq-subject-card__depth"></span><span class="duduq-subject-card__surface"></span><span class="duduq-subject-card__outline" data-subject-outline></span></span>
              <dt class="duduq-subject-card__label">DISCIPLINA</dt><dd class="duduq-subject-card__value" data-intro-subject>${copy.subjectLabel}</dd>
              <img class="duduq-subject-card__icon" src="../../core/assets/intro/icon-disciplina.png" alt="" aria-hidden="true">
            </div>
          </dl>

          <div class="duduq-start-button-motion">
            <button class="intro-start duduq-start-button" type="button" data-intro-start aria-describedby="intro-start-hint" aria-label="Iniciar jogo">
              <span class="intro-start__motion">
                <span class="intro-start__outer-shadow" aria-hidden="true"></span>
                <span class="intro-start__depth" aria-hidden="true"></span>
                <span class="intro-start__surface" aria-hidden="true"></span>
                <span class="intro-start__highlight" aria-hidden="true"></span>
                <span class="intro-start__play" aria-hidden="true"><span class="intro-start__play-shape"></span></span>
                <span class="intro-start__label" data-intro-start-label>${copy.startLabel}</span>
              </span>
            </button>
          </div>
          <p id="intro-start-hint" class="intro-start-hint">TOQUE PARA COMEÇAR</p>
        </section>
      </section>`;

    const stage = root.querySelector(".duduq-module-intro");
    let soundApi = window.DuduqSound || null;
    let musicStarted = false;
    let musicStarting = null;
    let introLeaving = false;
    const soundApiPromise = soundApi
      ? Promise.resolve(soundApi)
      : import("../../core/audio/duduq-sound-system.js").then(module => {
        soundApi = module.DuduqSound;
        return soundApi;
      });
    const removeMusicFallback = () => {
      window.removeEventListener("pointerdown", startFromGesture, true);
      window.removeEventListener("click", startFromGesture, true);
      window.removeEventListener("keydown", startFromGesture, true);
    };
    const startIntroMusic = () => {
      if (musicStarted || introLeaving) return Promise.resolve(musicStarted);
      if (musicStarting) return musicStarting;
      musicStarting = soundApiPromise.then(async sound => {
        if (introLeaving) return false;
        const started = await sound.play("introMusic", { fadeInMs: 650 });
        musicStarted = started;
        if (started) removeMusicFallback();
        return started;
      }).catch(() => false).finally(() => { musicStarting = null; });
      return musicStarting;
    };
    function startFromGesture(event) {
      if (event?.target?.closest?.("[data-intro-start]")) return;
      void startIntroMusic();
    }
    const stopIntroMusic = () => {
      introLeaving = true;
      removeMusicFallback();
      soundApi?.stop("introMusic");
    };
    window.addEventListener("pointerdown", startFromGesture, true);
    window.addEventListener("click", startFromGesture, true);
    window.addEventListener("keydown", startFromGesture, true);
    window.addEventListener("pagehide", stopIntroMusic, { once: true });
    void startIntroMusic();
    let resizeFrame = 0;
    const updateStageScale = () => {
      resizeFrame = 0;
      const scaleX = window.innerWidth / 1366;
      const scaleY = window.innerHeight / 768;
      stage.style.setProperty("--intro-scale", String(Math.max(scaleX, scaleY)));
    };
    const requestStageScaleUpdate = () => {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(updateStageScale);
    };
    updateStageScale();
    window.addEventListener("resize", requestStageScaleUpdate, { passive: true });
    window.addEventListener("orientationchange", requestStageScaleUpdate, { passive: true });
    document.addEventListener("fullscreenchange", requestStageScaleUpdate);

    const yearSurface = root.querySelector(".duduq-year-card-v2__surface");
    const yearWhitePath = yearSurface?.querySelector('path[fill="#FFFDF7"]');
    if (yearWhitePath) {
      const yearDepthPath = yearWhitePath.cloneNode(true);
      yearDepthPath.setAttribute("fill", "#349FDF");
      yearDepthPath.setAttribute("transform", "translate(0 5)");
      yearDepthPath.removeAttribute("filter");
      yearSurface.insertBefore(yearDepthPath, yearWhitePath);
      yearWhitePath.removeAttribute("filter");
    }
    root.querySelector("[data-module-outline]").innerHTML = createModuleOutlineDots();
    root.querySelector("[data-subject-outline]").innerHTML = createModuleOutlineDots("duduq-subject-card__dot");
    const start = root.querySelector("[data-intro-start]");
    const startMotion = root.querySelector(".duduq-start-button-motion");
    let isStarting = false;
    start.addEventListener("click", (event) => {
      if (isStarting) return;
      isStarting = true;
      start.disabled = true;
      introLeaving = true;
      removeMusicFallback();
      if (soundApi) {
        soundApi.play("uiClick");
        const fadeAfterPendingStart = musicStarting
          ? musicStarting.then(() => soundApi.fadeOut("introMusic", 300))
          : soundApi.fadeOut("introMusic", 300);
        void fadeAfterPendingStart;
        soundApi.play("transition");
      } else {
        void soundApiPromise.then(sound => {
          sound.play("uiClick");
          void sound.fadeOut("introMusic", 300);
          sound.play("transition");
        }).catch(() => {});
      }
      const detail = { ...copy, sourceEvent: event };
      root.dispatchEvent(new CustomEvent("duduq:intro-module-start", { bubbles: true, detail }));
      if (typeof options.onStart === "function") options.onStart(detail);
      const transition = window.DuduQPageTransition;
      if (transition?.navigate) {
        transition.navigate(copy.nextUrl, { trigger: startMotion, exitTarget: stage });
      } else {
        window.location.href = copy.nextUrl;
      }
    });
    return {
      update(next = {}) {
        Object.assign(copy, {
          moduleLabel: safeText(next.moduleLabel, copy.moduleLabel),
          gradeLabel: safeText(next.gradeLabel, copy.gradeLabel),
          subjectLabel: safeText(next.subjectLabel, copy.subjectLabel),
          startLabel: safeText(next.startLabel, copy.startLabel),
          nextUrl: resolveInternalNextUrl(next.nextUrl, copy.nextUrl)
        });
        root.querySelector("[data-intro-module]").textContent = copy.moduleLabel;
        root.querySelector("[data-intro-grade]").textContent = copy.gradeLabel;
        root.querySelector("[data-intro-subject]").textContent = copy.subjectLabel;
        root.querySelector("[data-intro-start-label]").textContent = copy.startLabel;
      },
      destroy() {
        stopIntroMusic();
        window.removeEventListener("pagehide", stopIntroMusic);
        cancelAnimationFrame(resizeFrame);
        window.removeEventListener("resize", requestStageScaleUpdate);
        window.removeEventListener("orientationchange", requestStageScaleUpdate);
        document.removeEventListener("fullscreenchange", requestStageScaleUpdate);
        root.replaceChildren();
      }
    };
  }

  window.DuduQModuleIntroScreen = Object.freeze({ create: createIntroScreen });
  const params = new URLSearchParams(window.location.search);
  createIntroScreen({
    moduleLabel: params.get("module") || defaults.moduleLabel,
    gradeLabel: params.get("grade") || defaults.gradeLabel,
    subjectLabel: params.get("subject") || defaults.subjectLabel,
    startLabel: params.get("startLabel") || defaults.startLabel,
    nextUrl: resolveInternalNextUrl(params.get("next"), defaults.nextUrl),
    onStart: () => document.documentElement.setAttribute("data-intro-started", "true")
  });
})();

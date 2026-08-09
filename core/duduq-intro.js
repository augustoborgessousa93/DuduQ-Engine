/* =========================================================
   DUDUQ CORE — INTRO CINEMATOGRÁFICA
   Launch Screen universal premium AAA+
   Versão 1.1.0

   Sequência:
   1. BRANDING  — empresa grande, reveal gradual
   2. SWITCHING — transição cinematográfica / TV light collapse
   3. MISSION   — coleção + ano + disciplina + módulo + loading
   4. READY     — CTA "INICIAR MISSÃO"

   API pública preservada:
   show, hide, destroy, setProgress, markReady,
   getInstance, isActive
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.1.0";

  if (window.DuduQIntro && window.DuduQIntro.version === VERSION) {
    return;
  }

  const DEFAULT_COMPANY_LOGO =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/LOGO%20DA%20EMPRESA_COLORIDO.png";

  const DEFAULTS = Object.freeze({
    companyKicker: "UMA CRIAÇÃO DE",
    companyLogo: DEFAULT_COMPANY_LOGO,
    companyAlt: "Logo da empresa",
    companyName: "",

    collectionLogo: "",
    collectionAlt: "Logo da coleção",
    collectionName: "DuduQ",

    year: "",
    subject: "",
    module: "",

    loadingLabel: "PREPARANDO SUA MISSÃO",
    readyLabel: "MISSÃO PRONTA",
    startLabel: "INICIAR MISSÃO",
    hint: "Tudo pronto para começar!",

    minDurationMs: 1850,
    brandingDurationMs: 1800,
    switchingDurationMs: 620,
    missionMinDurationMs: 1000,
    exitDurationMs: 470,

    autoReady: true,
    sparkCount: 14,

    companyWidth: 620,
    collectionWidth: 590,

    container: null,
    readyPromise: null,

    onPhase: null,
    onReady: null,
    onStart: null,
    onClose: null
  });

  let activeInstance = null;
  let instanceCounter = 0;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function safeText(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim();
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }
    return element;
  }

  function resolveContainer(value) {
    if (value instanceof Element) return value;

    if (typeof value === "string" && value.trim()) {
      const found = document.querySelector(value);
      if (found) return found;
    }

    return document.body || document.documentElement;
  }

  function now() {
    if (window.performance && typeof window.performance.now === "function") {
      return window.performance.now();
    }
    return Date.now();
  }

  function prefersReducedMotion() {
    try {
      return Boolean(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (_) {
      return false;
    }
  }

  function formatYear(value) {
    const raw = safeText(value);
    if (!raw) return "";

    const numericMatch = raw.match(/^\s*(\d+)\s*$/);
    if (numericMatch) return numericMatch[1] + "º ANO";

    return raw.toUpperCase();
  }

  function formatModule(value) {
    const raw = safeText(value);
    if (!raw) return "";

    const numericMatch = raw.match(/^\s*(\d+)\s*$/);
    if (numericMatch) return "MÓDULO " + numericMatch[1];

    return raw.toUpperCase();
  }

  function formatSubject(value) {
    const raw = safeText(value);
    return raw ? raw.toUpperCase() : "";
  }

  function preloadImage(src) {
    return new Promise(function (resolve) {
      if (!src) {
        resolve({ ok: false, src: "" });
        return;
      }

      let finished = false;

      function finish(ok) {
        if (finished) return;
        finished = true;
        resolve({ ok: Boolean(ok), src: src });
      }

      try {
        const image = new Image();
        image.onload = function () { finish(true); };
        image.onerror = function () { finish(false); };
        image.src = src;

        if (image.complete) {
          window.setTimeout(function () {
            finish(image.naturalWidth > 0);
          }, 0);
        }

        window.setTimeout(function () {
          finish(image.complete && image.naturalWidth > 0);
        }, 4500);
      } catch (_) {
        finish(false);
      }
    });
  }

  function emit(name, detail) {
    try {
      document.dispatchEvent(
        new CustomEvent(name, { detail: detail || {} })
      );
    } catch (_) {}
  }

  function createSpark(index) {
    const spark = createElement("span", "duduq-intro-spark", "★");
    const colors = ["#ffc928", "#42a7f5", "#ffe67a", "#73caff"];
    const side = index % 2 === 0 ? "left" : "right";
    const horizontal = 3 + Math.random() * 22;
    const vertical = 7 + Math.random() * 80;
    const size = 10 + Math.random() * 17;
    const delay = 300 + Math.random() * 1600;
    const duration = 3800 + Math.random() * 2100;

    spark.style[side] = horizontal + "%";
    spark.style.top = vertical + "%";
    spark.style.setProperty("--duduq-intro-spark-size", size.toFixed(1) + "px");
    spark.style.setProperty("--duduq-intro-spark-delay", delay.toFixed(0) + "ms");
    spark.style.setProperty("--duduq-intro-spark-duration", duration.toFixed(0) + "ms");
    spark.style.setProperty("--duduq-intro-spark-color", colors[index % colors.length]);

    return spark;
  }

  function buildAtmosphere(root, options) {
    const atmosphere = createElement("div", "duduq-intro-atmosphere");
    atmosphere.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 3; index += 1) {
      atmosphere.appendChild(createElement("span", "duduq-intro-orb"));
    }

    const sparkCount = clamp(Number(options.sparkCount) || 0, 0, 28);

    for (let index = 0; index < sparkCount; index += 1) {
      atmosphere.appendChild(createSpark(index));
    }

    root.appendChild(atmosphere);
    return atmosphere;
  }

  function buildCompany(stage, options) {
    const wrapper = createElement("div", "duduq-intro-company");

    if (options.companyKicker) {
      wrapper.appendChild(
        createElement("p", "duduq-intro-kicker", options.companyKicker)
      );
    }

    if (options.companyLogo) {
      const logo = createElement("img", "duduq-intro-company-logo");
      logo.src = options.companyLogo;
      logo.alt = options.companyAlt || options.companyName || "Logo da empresa";
      logo.decoding = "async";
      logo.draggable = false;

      logo.addEventListener(
        "error",
        function () {
          logo.remove();
          if (options.companyName) {
            wrapper.appendChild(
              createElement("strong", "duduq-intro-company-name", options.companyName)
            );
          }
        },
        { once: true }
      );

      wrapper.appendChild(logo);
    } else if (options.companyName) {
      wrapper.appendChild(
        createElement("strong", "duduq-intro-company-name", options.companyName)
      );
    }

    stage.appendChild(wrapper);
    return wrapper;
  }

  function buildCollection(stage, options) {
    const wrapper = createElement("div", "duduq-intro-collection");
    const fallbackName = createElement(
      "h1",
      "duduq-intro-collection-name",
      options.collectionName || "DuduQ"
    );

    let logo = null;

    if (options.collectionLogo) {
      logo = createElement("img", "duduq-intro-collection-logo");
      logo.src = options.collectionLogo;
      logo.alt = options.collectionAlt || options.collectionName || "Logo da coleção";
      logo.decoding = "async";
      logo.draggable = false;
      fallbackName.hidden = true;

      logo.addEventListener(
        "error",
        function () {
          logo.remove();
          fallbackName.hidden = false;
        },
        { once: true }
      );

      wrapper.appendChild(logo);
    }

    wrapper.appendChild(fallbackName);
    wrapper.appendChild(createElement("span", "duduq-intro-collection-shine"));
    stage.appendChild(wrapper);

    return {
      wrapper: wrapper,
      logo: logo,
      fallbackName: fallbackName
    };
  }

  function createMetaChip(text, primary) {
    return createElement(
      "span",
      "duduq-intro-meta-chip" +
        (primary ? " duduq-intro-meta-chip--primary" : ""),
      text
    );
  }

  function buildMeta(stage, options) {
    const wrapper = createElement("div", "duduq-intro-meta");
    const year = formatYear(options.year);
    const subject = formatSubject(options.subject);
    const module = formatModule(options.module);

    if (year) wrapper.appendChild(createMetaChip(year, true));
    if (subject) wrapper.appendChild(createMetaChip(subject, false));
    if (module) wrapper.appendChild(createMetaChip(module, false));

    if (!year && !subject && !module) {
      wrapper.style.display = "none";
    }

    stage.appendChild(wrapper);
    return wrapper;
  }

  function buildLoading(stage, options) {
    const wrapper = createElement("div", "duduq-intro-loading");
    const head = createElement("div", "duduq-intro-loading-head");
    const label = createElement("p", "duduq-intro-loading-label", options.loadingLabel);
    const percent = createElement("span", "duduq-intro-loading-percent", "0%");

    head.appendChild(label);
    head.appendChild(percent);

    const track = createElement("div", "duduq-intro-loading-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", options.loadingLabel);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", "0");

    const fill = createElement("div", "duduq-intro-loading-fill");
    track.appendChild(fill);
    wrapper.appendChild(head);
    wrapper.appendChild(track);
    stage.appendChild(wrapper);

    return { wrapper, label, percent, track, fill };
  }

  function buildActions(stage, options) {
    const wrapper = createElement("div", "duduq-intro-actions");
    const button = createElement("button", "duduq-intro-start-button");
    button.type = "button";
    button.setAttribute("aria-label", options.startLabel);

    const icon = createElement("span", "duduq-intro-start-icon", "▶");
    icon.setAttribute("aria-hidden", "true");

    const label = createElement("span", "", options.startLabel);
    button.appendChild(icon);
    button.appendChild(label);
    wrapper.appendChild(button);

    let hint = null;

    if (options.hint) {
      hint = createElement("p", "duduq-intro-hint", options.hint);
      wrapper.appendChild(hint);
    }

    stage.appendChild(wrapper);
    return { wrapper, button, label, icon, hint };
  }

  function render(options) {
    /*
     * is-branding já nasce no DOM para impedir flash
     * da segunda cena antes do JS iniciar a timeline.
     */
    const root = createElement("section", "duduq-intro is-branding");

    root.id = "duduq-intro-" + (++instanceCounter);
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Abertura da missão");
    root.setAttribute("data-duduq-intro-phase", "branding");

    root.style.setProperty(
      "--duduq-intro-company-width",
      Number(options.companyWidth) + "px"
    );

    root.style.setProperty(
      "--duduq-intro-collection-width",
      Number(options.collectionWidth) + "px"
    );

    const atmosphere = buildAtmosphere(root, options);
    const stage = createElement("div", "duduq-intro-stage");
    const company = buildCompany(stage, options);
    const collection = buildCollection(stage, options);
    const meta = buildMeta(stage, options);
    const loading = buildLoading(stage, options);
    const actions = buildActions(stage, options);

    root.appendChild(stage);

    return { root, atmosphere, stage, company, collection, meta, loading, actions };
  }

  function setInstanceProgress(instance, value) {
    if (!instance || instance.destroyed) return;

    const normalized = clamp(Number(value) || 0, 0, 100);
    instance.progress = normalized;

    const visualValue = normalized.toFixed(1) + "%";

    instance.refs.loading.fill.style.setProperty(
      "--duduq-intro-progress",
      visualValue
    );
    instance.refs.loading.fill.style.width = visualValue;
    instance.refs.loading.percent.textContent = Math.round(normalized) + "%";
    instance.refs.loading.track.setAttribute(
      "aria-valuenow",
      String(Math.round(normalized))
    );
  }

  function stopFakeProgress(instance) {
    if (instance && instance.progressTimer) {
      window.clearInterval(instance.progressTimer);
      instance.progressTimer = null;
    }
  }

  function startFakeProgress(instance) {
    if (!instance || instance.destroyed || instance.progressStarted) return;

    instance.progressStarted = true;
    const startTime = now();

    setInstanceProgress(instance, Math.max(instance.progress, 4));

    instance.progressTimer = window.setInterval(function () {
      if (instance.destroyed || instance.ready) {
        stopFakeProgress(instance);
        return;
      }

      const elapsed = now() - startTime;
      let target;

      if (elapsed < 260) target = 28;
      else if (elapsed < 620) target = 53;
      else if (elapsed < 980) target = 72;
      else if (elapsed < 1450) target = 84;
      else target = 92;

      const difference = target - instance.progress;
      let increment = Math.max(0.30, difference * 0.14);
      increment += Math.random() * 0.45;

      setInstanceProgress(
        instance,
        Math.min(target, instance.progress + increment)
      );
    }, 92);
  }

  function setPhase(instance, phase) {
    if (!instance || instance.destroyed) return false;

    const allowed = ["branding", "switching", "mission"];
    if (!allowed.includes(phase)) return false;

    const root = instance.refs.root;

    root.classList.remove("is-branding", "is-switching", "is-mission");
    root.classList.add("is-" + phase);
    root.setAttribute("data-duduq-intro-phase", phase);

    instance.phase = phase;

    const detail = {
      id: instance.id,
      version: VERSION,
      phase: phase,
      options: instance.options
    };

    emit("duduq:intro-phase", detail);

    if (typeof instance.options.onPhase === "function") {
      try {
        instance.options.onPhase(detail);
      } catch (error) {
        console.error("[DuduQ Intro] Erro em onPhase:", error);
      }
    }

    return true;
  }

  function finishSequence(instance, resolve) {
    instance.sequenceResolve = null;
    resolve();
  }

  function runCinematicSequence(instance) {
    return new Promise(function (resolve) {
      instance.sequenceResolve = resolve;

      if (instance.destroyed) {
        finishSequence(instance, resolve);
        return;
      }

      /* Acessibilidade: não força a sequência completa. */
      if (prefersReducedMotion()) {
        setPhase(instance, "mission");
        instance.missionStartedAt = now();
        startFakeProgress(instance);
        finishSequence(instance, resolve);
        return;
      }

      setPhase(instance, "branding");

      const brandingTimer = window.setTimeout(function () {
        if (instance.destroyed) {
          finishSequence(instance, resolve);
          return;
        }

        setPhase(instance, "switching");

        const switchingTimer = window.setTimeout(function () {
          if (instance.destroyed) {
            finishSequence(instance, resolve);
            return;
          }

          setPhase(instance, "mission");
          instance.missionStartedAt = now();
          startFakeProgress(instance);
          finishSequence(instance, resolve);
        }, instance.options.switchingDurationMs);

        instance.phaseTimers.push(switchingTimer);
      }, instance.options.brandingDurationMs);

      instance.phaseTimers.push(brandingTimer);
    });
  }

  function markInstanceReady(instance) {
    if (!instance || instance.destroyed || instance.ready) return false;

    /* O CTA só nasce no terceiro ato. */
    if (instance.phase !== "mission") {
      instance.pendingReady = true;
      return true;
    }

    instance.pendingReady = false;
    instance.ready = true;

    stopFakeProgress(instance);
    setInstanceProgress(instance, 100);

    instance.refs.loading.label.textContent = instance.options.readyLabel;
    instance.refs.loading.track.setAttribute("aria-label", instance.options.readyLabel);

    instance.readyTimer = window.setTimeout(function () {
      if (instance.destroyed) return;

      instance.refs.root.classList.add("is-ready");

      emit("duduq:intro-ready", {
        id: instance.id,
        version: VERSION,
        phase: instance.phase,
        options: instance.options
      });

      if (typeof instance.options.onReady === "function") {
        try {
          instance.options.onReady({
            id: instance.id,
            intro: window.DuduQIntro
          });
        } catch (error) {
          console.error("[DuduQ Intro] Erro em onReady:", error);
        }
      }
    }, 310);

    return true;
  }

  function restoreBody(instance) {
    if (!instance || !document.body) return;
    document.body.style.overflow = instance.previousBodyOverflow;
  }

  function clearTimers(instance) {
    if (!instance) return;

    stopFakeProgress(instance);

    if (instance.readyTimer) {
      window.clearTimeout(instance.readyTimer);
      instance.readyTimer = null;
    }

    if (instance.exitTimer) {
      window.clearTimeout(instance.exitTimer);
      instance.exitTimer = null;
    }

    if (instance.phaseTimers) {
      instance.phaseTimers.forEach(function (timerId) {
        window.clearTimeout(timerId);
      });
      instance.phaseTimers.length = 0;
    }

    if (instance.sequenceResolve) {
      const finish = instance.sequenceResolve;
      instance.sequenceResolve = null;
      finish();
    }
  }

  function finalizeInstance(instance, reason) {
    if (!instance || instance.destroyed) return;

    instance.destroyed = true;
    clearTimers(instance);
    restoreBody(instance);

    if (instance.refs.root && instance.refs.root.parentNode) {
      instance.refs.root.parentNode.removeChild(instance.refs.root);
    }

    const result = {
      id: instance.id,
      reason: reason || "closed",
      version: VERSION
    };

    if (typeof instance.options.onClose === "function") {
      try {
        instance.options.onClose(result);
      } catch (error) {
        console.error("[DuduQ Intro] Erro em onClose:", error);
      }
    }

    emit("duduq:intro-hidden", result);

    if (typeof instance.resolve === "function") {
      instance.resolve(result);
      instance.resolve = null;
    }

    if (activeInstance === instance) {
      activeInstance = null;
    }
  }

  function startMission(instance) {
    if (
      !instance ||
      instance.destroyed ||
      !instance.ready ||
      instance.leaving ||
      instance.phase !== "mission"
    ) {
      return;
    }

    instance.leaving = true;
    instance.refs.actions.button.disabled = true;
    instance.refs.root.classList.add("is-leaving");

    emit("duduq:intro-start", {
      id: instance.id,
      version: VERSION,
      options: instance.options
    });

    /*
     * O Host nasce por baixo da intro durante o fade cinematográfico.
     */
    if (typeof instance.options.onStart === "function") {
      try {
        instance.options.onStart({
          id: instance.id,
          intro: window.DuduQIntro
        });
      } catch (error) {
        console.error("[DuduQ Intro] Erro em onStart:", error);
      }
    }

    instance.exitTimer = window.setTimeout(function () {
      finalizeInstance(instance, "start");
    }, Math.max(350, Number(instance.options.exitDurationMs) || 470));
  }

  function prepareReadiness(instance, sequencePromise) {
    const options = instance.options;

    /* Compatibilidade: tempo mínimo global desde o show(). */
    const overallMinimumGate = wait(options.minDurationMs);

    const imageGates = [];
    if (options.companyLogo) imageGates.push(preloadImage(options.companyLogo));
    if (options.collectionLogo) imageGates.push(preloadImage(options.collectionLogo));

    const assetsGate = Promise.all(imageGates);

    let externalGate = Promise.resolve();

    if (options.readyPromise && typeof options.readyPromise.then === "function") {
      externalGate = Promise.resolve(options.readyPromise).catch(function (error) {
        console.warn("[DuduQ Intro] readyPromise rejeitada:", error);
        return null;
      });
    }

    /*
     * Mesmo que tudo carregue instantaneamente, a coleção precisa
     * respirar na tela antes de liberar o botão.
     */
    const missionGate = Promise.resolve(sequencePromise).then(function () {
      if (instance.destroyed) return null;

      return wait(
        prefersReducedMotion()
          ? 250
          : options.missionMinDurationMs
      );
    });

    Promise.all([
      overallMinimumGate,
      missionGate,
      assetsGate,
      externalGate
    ]).then(function () {
      if (instance.destroyed) return;

      if (options.autoReady !== false || options.readyPromise) {
        markInstanceReady(instance);
      }
    });
  }

  function show(options = {}) {
    if (activeInstance) {
      finalizeInstance(activeInstance, "replaced");
    }

    const merged = Object.assign({}, DEFAULTS, options || {});

    merged.companyLogo = safeText(merged.companyLogo);
    merged.collectionLogo = safeText(merged.collectionLogo);
    merged.collectionName = safeText(merged.collectionName) || "DuduQ";
    merged.companyKicker = safeText(merged.companyKicker);
    merged.loadingLabel = safeText(merged.loadingLabel) || "PREPARANDO SUA MISSÃO";
    merged.readyLabel = safeText(merged.readyLabel) || "MISSÃO PRONTA";
    merged.startLabel = safeText(merged.startLabel) || "INICIAR MISSÃO";

    merged.minDurationMs = clamp(Number(merged.minDurationMs) || 1850, 600, 10000);
    merged.brandingDurationMs = clamp(Number(merged.brandingDurationMs) || 1800, 700, 5000);
    merged.switchingDurationMs = clamp(Number(merged.switchingDurationMs) || 620, 250, 1800);
    merged.missionMinDurationMs = clamp(Number(merged.missionMinDurationMs) || 1000, 350, 5000);
    merged.exitDurationMs = clamp(Number(merged.exitDurationMs) || 470, 250, 1500);
    merged.sparkCount = clamp(Number(merged.sparkCount) || 14, 0, 28);

    /*
     * A antiga integração passa companyWidth: 220.
     * A versão cinematográfica força presença de hero real.
     */
    merged.companyWidth = clamp(Number(merged.companyWidth) || 620, 560, 820);
    merged.collectionWidth = clamp(Number(merged.collectionWidth) || 590, 280, 900);

    const container = resolveContainer(merged.container);
    const refs = render(merged);

    const instance = {
      id: refs.root.id,
      options: merged,
      refs: refs,
      container: container,

      phase: "branding",
      missionStartedAt: null,

      progress: 0,
      progressStarted: false,

      ready: false,
      pendingReady: false,
      leaving: false,
      destroyed: false,

      progressTimer: null,
      readyTimer: null,
      exitTimer: null,
      phaseTimers: [],
      sequenceResolve: null,

      resolve: null,

      previousBodyOverflow:
        document.body ? document.body.style.overflow : ""
    };

    activeInstance = instance;

    if (document.body) {
      document.body.style.overflow = "hidden";
    }

    container.appendChild(refs.root);

    refs.actions.button.addEventListener("click", function () {
      startMission(instance);
    });

    setInstanceProgress(instance, 0);

    const sequencePromise = runCinematicSequence(instance);
    prepareReadiness(instance, sequencePromise);

    emit("duduq:intro-shown", {
      id: instance.id,
      version: VERSION,
      phase: instance.phase,
      options: merged
    });

    return new Promise(function (resolve) {
      instance.resolve = resolve;
    });
  }

  function setProgress(value) {
    if (!activeInstance || activeInstance.destroyed) return false;

    const maximum = activeInstance.ready ? 100 : 96;

    setInstanceProgress(
      activeInstance,
      clamp(Number(value) || 0, 0, maximum)
    );

    return true;
  }

  function markReady() {
    if (!activeInstance) return false;
    return markInstanceReady(activeInstance);
  }

  function hide(options = {}) {
    if (!activeInstance) return false;

    const instance = activeInstance;
    const immediate = options && options.immediate === true;
    const reason = safeText(options.reason) || "hidden";

    if (immediate) {
      finalizeInstance(instance, reason);
      return true;
    }

    if (instance.leaving) return true;

    instance.leaving = true;
    instance.refs.root.classList.add("is-leaving");

    instance.exitTimer = window.setTimeout(function () {
      finalizeInstance(instance, reason);
    }, instance.options.exitDurationMs);

    return true;
  }

  function getInstance() {
    if (!activeInstance) return null;

    return Object.freeze({
      id: activeInstance.id,
      version: VERSION,
      phase: activeInstance.phase,
      progress: activeInstance.progress,
      ready: activeInstance.ready,
      leaving: activeInstance.leaving,
      options: activeInstance.options,
      element: activeInstance.refs.root
    });
  }

  function isActive() {
    return Boolean(activeInstance && !activeInstance.destroyed);
  }

  window.DuduQIntro = Object.freeze({
    version: VERSION,
    show: show,
    hide: hide,
    destroy: hide,
    setProgress: setProgress,
    markReady: markReady,
    getInstance: getInstance,
    isActive: isActive
  });

  console.info(
    "[DuduQ Intro] v" + VERSION + " cinematográfico carregado."
  );
})();

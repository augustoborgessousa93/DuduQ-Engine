/* =========================================================
   DUDUQ CORE — TRANSITION
   Ponte visual opaca entre telas e mecânicas.
   Versão 1.5.0
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.5.0";
  if (window.DuduQTransition?.version === VERSION) return;

  const DEFAULTS = Object.freeze({
    coverDurationMs: 220,
    revealDurationMs: 260,
    paintFrames: 2,
    bridgeHoldMs: 0,
    visualReadyTimeoutMs: 1600,
    visualReadyPollMs: 40,
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
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  function normalize(options = {}) {
    const reduced = reducedMotion();
    return {
      coverDurationMs: reduced
        ? 80
        : clamp(number(options.coverDurationMs, DEFAULTS.coverDurationMs), 140, 700),
      revealDurationMs: reduced
        ? 80
        : clamp(number(options.revealDurationMs, DEFAULTS.revealDurationMs), 160, 700),
      paintFrames: clamp(Math.round(number(options.paintFrames, DEFAULTS.paintFrames)), 1, 4),
      bridgeHoldMs: reduced
        ? 0
        : clamp(number(options.bridgeHoldMs, DEFAULTS.bridgeHoldMs), 0, 120),
      visualReadyTimeoutMs: clamp(
        number(options.visualReadyTimeoutMs, DEFAULTS.visualReadyTimeoutMs),
        300,
        3000
      ),
      visualReadyPollMs: clamp(
        number(options.visualReadyPollMs, DEFAULTS.visualReadyPollMs),
        20,
        120
      ),
      target: options.target || options.container || null,
      targetSelector: text(options.targetSelector, DEFAULTS.targetSelector),
      soundEnabled: options.soundEnabled === true,
      soundName: text(options.soundName, DEFAULTS.soundName),
      soundVolume: clamp(number(options.soundVolume, DEFAULTS.soundVolume), 0, 1),
      soundMinGapMs: Math.max(
        0,
        number(options.soundMinGapMs, DEFAULTS.soundMinGapMs)
      )
    };
  }

  function dispatch(name, detail = {}) {
    try {
      window.dispatchEvent(
        new CustomEvent(name, {
          detail: { version: VERSION, state, ...detail }
        })
      );
    } catch (_) {}
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
  }

  function nextFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  async function nextPaint(frames = 1) {
    for (let index = 0; index < frames; index += 1) {
      await nextFrame();
    }
  }

  function resolveTarget(config) {
    if (config.target instanceof Element) return config.target;

    if (typeof config.target === "string" && config.target.trim()) {
      try {
        const found = document.querySelector(config.target.trim());
        if (found) return found;
      } catch (_) {}
    }

    try {
      return document.querySelector(config.targetSelector) || document.getElementById("root");
    } catch (_) {
      return document.getElementById("root");
    }
  }

  function ensureRoot() {
    if (overlay?.isConnected) return overlay;

    overlay = document.createElement("div");
    overlay.className = "duduq-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="duduq-transition-stage" aria-hidden="true"></div>';

    (document.body || document.documentElement).appendChild(overlay);
    syncWorldBridge();
    return overlay;
  }

  function lockPage() {
    document.documentElement.classList.add("duduq-transition-lock");
    document.body?.classList.add("duduq-transition-lock");
  }

  function unlockPage() {
    document.documentElement.classList.remove("duduq-transition-lock");
    document.body?.classList.remove("duduq-transition-lock");
  }

  function syncWorldBridge() {
    const node = ensureRoot();
    let image = "";
    let position = "center top";
    let size = "cover";

    try {
      image =
        document.documentElement.style.getPropertyValue("--duduq-world-image").trim() ||
        document.body?.style.backgroundImage ||
        window.getComputedStyle(document.body).backgroundImage ||
        "";

      const computed = window.getComputedStyle(document.body);
      position = computed.backgroundPosition || position;
      size = computed.backgroundSize || size;
    } catch (_) {}

    if (image && image !== "none") {
      node.style.setProperty("--duduq-transition-world-image", image);
    }

    node.style.setProperty("--duduq-transition-world-position", position);
    node.style.setProperty("--duduq-transition-world-size", size);
  }

  function primeWorldBridge() {
    syncWorldBridge();

    let source = "";
    try {
      source = overlay
        ?.style.getPropertyValue("--duduq-transition-world-image")
        .match(/url\((['"]?)(.*?)\1\)/i)?.[2] || "";
    } catch (_) {}

    if (!source) return;

    const image = new Image();
    image.decoding = "async";
    image.src = source;
    image.decode?.().catch(() => {});
  }

  function playTransitionSound(config) {
    if (!config.soundEnabled || typeof window.DuduQSound?.play !== "function") return;

    try {
      window.DuduQSound.play(config.soundName, {
        volume: config.soundVolume,
        minGapMs: config.soundMinGapMs
      });
    } catch (_) {}
  }

  function setOverlayState(nextState) {
    const node = ensureRoot();
    node.classList.remove("is-covering", "is-covered", "is-revealing");
    if (nextState) node.classList.add(nextState);
  }

  async function animateOverlay(from, to, duration, direction) {
    const node = ensureRoot();
    const fromScale = direction === "cover" ? 1.01 : 1.035;
    const toScale = direction === "cover" ? 1.035 : 1.01;

    node.style.opacity = String(from);
    node.style.transform = `translateZ(0) scale(${fromScale})`;

    if (typeof node.animate === "function") {
      try {
        const animation = node.animate(
          [
            { opacity: from, transform: `translateZ(0) scale(${fromScale})` },
            { opacity: to, transform: `translateZ(0) scale(${toScale})` }
          ],
          {
            duration,
            easing:
              direction === "cover"
                ? "cubic-bezier(.22,.72,.22,1)"
                : "cubic-bezier(.20,.02,.18,1)",
            fill: "forwards"
          }
        );

        await animation.finished.catch(() => true);
        node.style.opacity = String(to);
        node.style.transform = `translateZ(0) scale(${toScale})`;
        animation.cancel();
        return;
      } catch (_) {}
    }

    node.style.transition =
      `opacity ${duration}ms ease, transform ${duration}ms ease`;
    node.getBoundingClientRect();
    node.style.opacity = String(to);
    node.style.transform = `translateZ(0) scale(${toScale})`;
    await wait(duration + 40);
    node.style.transition = "";
  }

  function isIframeVisuallyReady(iframe) {
    if (!iframe) return true;

    try {
      const source = String(iframe.getAttribute("src") || "").trim();
      if (!source || /^about:blank(?:$|[?#])/i.test(source)) return false;

      const frameDocument = iframe.contentDocument;
      if (!frameDocument) return false;
      if (!["interactive", "complete"].includes(frameDocument.readyState)) return false;

      const boot = frameDocument.getElementById("duduq-boot");
      if (boot) {
        const style = iframe.contentWindow?.getComputedStyle?.(boot);
        const visible =
          !boot.hidden &&
          style?.display !== "none" &&
          style?.visibility !== "hidden" &&
          Number(style?.opacity ?? 1) > 0.01;

        if (visible) return false;
      }

      const runtimeRoot = frameDocument.getElementById("root");
      return Boolean(
        (runtimeRoot && runtimeRoot.childElementCount > 0) ||
        (boot && boot.hidden) ||
        frameDocument.body?.children.length
      );
    } catch (_) {
      return true;
    }
  }

  async function waitForVisualReady(target, config) {
    if (!target) {
      await nextPaint(config.paintFrames);
      return true;
    }

    const iframe = target.querySelector?.("iframe");
    if (!iframe) {
      await nextPaint(config.paintFrames);
      return true;
    }

    const deadline = performance.now() + config.visualReadyTimeoutMs;
    while (performance.now() < deadline) {
      if (isIframeVisuallyReady(iframe)) {
        await nextPaint(config.paintFrames);
        return true;
      }
      await wait(config.visualReadyPollMs);
    }

    await nextPaint(1);
    return true;
  }

  async function cover(options = {}) {
    const config = normalize(options);
    const currentOperation = ++operationId;

    ensureRoot();
    syncWorldBridge();
    lockPage();
    state = "preparing";
    setOverlayState("is-covering");
    overlay.style.visibility = "visible";
    overlay.style.pointerEvents = "auto";

    await nextFrame();
    if (currentOperation !== operationId) return false;

    state = "covering";
    dispatch("duduq:transition-cover-start");
    playTransitionSound(config);
    await animateOverlay(0, 1, config.coverDurationMs, "cover");

    if (currentOperation !== operationId) return false;

    setOverlayState("is-covered");
    overlay.style.opacity = "1";
    state = "covered";
    dispatch("duduq:transition-covered");
    return true;
  }

  async function reveal(options = {}) {
    const config = normalize(options);
    const currentOperation = operationId;
    const target = resolveTarget(config);

    await waitForVisualReady(target, config);
    if (config.bridgeHoldMs > 0) await wait(config.bridgeHoldMs);
    if (currentOperation !== operationId) return false;

    state = "revealing";
    setOverlayState("is-revealing");
    dispatch("duduq:transition-reveal-start");
    await animateOverlay(1, 0, config.revealDurationMs, "reveal");

    if (currentOperation !== operationId) return false;

    setOverlayState("");
    overlay.style.visibility = "hidden";
    overlay.style.pointerEvents = "none";
    overlay.style.opacity = "0";
    unlockPage();
    state = "idle";
    dispatch("duduq:transition-complete");
    return true;
  }

  function swap(callback, options = {}) {
    if (typeof callback !== "function") {
      return Promise.reject(
        new Error("[DuduQ Transition] swap() precisa receber uma função.")
      );
    }

    if (activeSwapPromise) return activeSwapPromise;

    activeSwapPromise = (async function () {
      try {
        const covered = await cover(options);
        if (!covered) return false;

        dispatch("duduq:transition-swap");
        const result = await callback();
        await reveal(options);
        return result;
      } catch (error) {
        console.error("[DuduQ Transition] Erro durante troca:", error);
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
      overlay.style.visibility = "hidden";
      overlay.style.pointerEvents = "none";
      overlay.style.opacity = "0";
    }
    unlockPage();
    state = "idle";
    dispatch("duduq:transition-reset");
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

  window.DuduQTransition = Object.freeze({
    version: VERSION,
    cover,
    reveal,
    swap,
    hideImmediate,
    destroy,
    getState: () => state,
    isActive: () => state !== "idle",
    isCovered: () => state === "covered",
    ensureRoot,
    primeWorldBridge
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", primeWorldBridge, { once: true });
  } else {
    primeWorldBridge();
  }

  window.addEventListener("duduq:assets-ready", primeWorldBridge);
  dispatch("duduq:transition-ready", { ready: true });
})();


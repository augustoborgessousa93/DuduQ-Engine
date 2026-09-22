(function (global) {
  "use strict";

  const PACKAGE_NAME = "matching-master";
  const PACKAGE_BASE = "/design-system/runtime/screens";
  const SOURCES = Object.freeze({
    question: "50f514fe-4a8a-804d-8008-aa3b16e25219",
    instruction: "50f514fe-4a8a-804d-8008-aa3b16fc5826",
    audio: "50f514fe-4a8a-804d-8008-aa3b16cea7b7",
    words: [
      "50f514fe-4a8a-804d-8008-aa3b1db7746c",
      "50f514fe-4a8a-804d-8008-aa3b1d452e60",
      "50f514fe-4a8a-804d-8008-aa3b1ccee288",
      "50f514fe-4a8a-804d-8008-aa3b1c62f1ee"
    ]
  });

  function setText(node, value) {
    const text = node?.querySelector?.("text") || node;
    if (text && value != null) text.textContent = String(value);
  }

  function mount({ container, payload }) {
    if (!global.DuduQScreenRuntime || !global.DuduQVisualPackages) return null;
    const shell = document.createElement("div");
    shell.className = "duduq-matching-visual-shell";
    Object.assign(shell.style, { position: "relative", width: "100%", height: "100%", minHeight: "0", overflow: "hidden" });
    const goldenOnly = new URLSearchParams(global.location.search).get("mode") === "golden-test";
    const visualHost = goldenOnly ? document.createElement("div") : null;
    // Live Penpot visuals are the authored paint layer.  The Gold Master
    // remains underneath as the behavior/input owner; pointer-events:none on
    // the visual layer lets native input fall through to it.
    if (visualHost) Object.assign(visualHost.style, { position: "absolute", inset: "0", zIndex: "1", pointerEvents: "auto" });
    const gameplayHost = document.createElement("div");
    // The proven mechanic owns behavior; it must not obscure Penpot visuals.
    Object.assign(gameplayHost.style, { position: "absolute", inset: "0", zIndex: "0", opacity: "1", pointerEvents: "auto" });
    if (visualHost) shell.append(visualHost);
    shell.append(gameplayHost);
    container.appendChild(shell);

    const runtime = visualHost ? new global.DuduQScreenRuntime(visualHost) : null;
    if (visualHost) visualHost.__duduqScreenRuntime = runtime;
    let detachAudio = null;
    let observer = null;
    let frame = null;
    let geometryLoadHandler = null;
    let disposed = false;
    let audioProxy = null;

    const question = (payload?.questions || payload?.items || [payload])[0] || {};
    const matching = question.metadata?.matching || {};
    (goldenOnly ? global.DuduQVisualPackages.loadVisualPackage(PACKAGE_BASE, PACKAGE_NAME) : Promise.resolve(null))
      .then((pkg) => {
        if (disposed) return;
        if (!pkg) return;
        runtime.mount(pkg);
        setText(runtime.lookup(SOURCES.question), question.statement || question.prompt || "");
        setText(runtime.lookup(SOURCES.instruction), question.instruction || "");
        (matching.leftItems || []).slice(0, SOURCES.words.length).forEach((item, index) => {
          setText(runtime.lookup(SOURCES.words[index]), item.label || item.spokenText || item.alt || "");
        });
        detachAudio = runtime.bind(SOURCES.audio, "click", () => {
          frame?.contentDocument?.querySelector(".audio-button, .duduq-matching-audio")?.click();
        });
        const source = runtime.lookup(SOURCES.audio);
        if (source) {
          audioProxy = document.createElement("button");
          audioProxy.type = "button";
          audioProxy.className = "duduq-matching-audio-binding";
          audioProxy.setAttribute("data-source-id", SOURCES.audio);
          audioProxy.setAttribute("aria-label", "Ouvir a pergunta");
          Object.assign(audioProxy.style, { position: "absolute", zIndex: "2", border: "0", background: "transparent", cursor: "pointer" });
          const placeAudioProxy = () => {
            const sourceBox = source.getBoundingClientRect();
            const shellBox = shell.getBoundingClientRect();
            Object.assign(audioProxy.style, { left: `${sourceBox.left - shellBox.left}px`, top: `${sourceBox.top - shellBox.top}px`, width: `${sourceBox.width}px`, height: `${sourceBox.height}px` });
          };
          audioProxy.addEventListener("click", () => frame?.contentDocument?.querySelector(".audio-button, .duduq-matching-audio")?.click());
          shell.appendChild(audioProxy);
          placeAudioProxy();
          global.addEventListener("resize", placeAudioProxy, { passive: true });
          audioProxy.__duduqDispose = () => global.removeEventListener("resize", placeAudioProxy);
        }
        visualHost.setAttribute("data-duduq-visual-package", pkg.manifest.screenId);
      })
      .catch((error) => {
        gameplayHost.style.opacity = "1";
        shell.setAttribute("data-duduq-visual-package-error", error.message);
      });

    return {
      gameplayHost,
      setFrame(nextFrame) {
        if (geometryLoadHandler && frame) frame.removeEventListener("load", geometryLoadHandler);
        frame = nextFrame;
        if (!frame) return;
        const applyGeometry = () => global.DuduQRuntimeGeometry?.apply({ frame, mechanic: "Matching", screenId: "50f514fe-4a8a-804d-8008-aa3b1478e03a" });
        geometryLoadHandler = applyGeometry;
        frame.addEventListener("load", geometryLoadHandler);
        if (frame.contentDocument?.body) applyGeometry();
        if (!frame.contentDocument?.body) return;
        observer?.disconnect();
        observer = new MutationObserver(() => {
          const liveQuestion = frame.contentDocument.querySelector(".duduq-matching-instruction")?.textContent?.trim();
          if (liveQuestion) setText(runtime.lookup(SOURCES.question), liveQuestion);
        });
        observer.observe(frame.contentDocument.body, { subtree: true, childList: true, characterData: true });
      },
      dispose() {
        disposed = true;
        if (geometryLoadHandler && frame) frame.removeEventListener("load", geometryLoadHandler);
        observer?.disconnect();
        detachAudio?.();
        audioProxy?.__duduqDispose?.();
        audioProxy?.remove();
        runtime?.dispose();
        shell.remove();
      },
      runtime
    };
  }

  global.DuduQMatchingVisualBridge = Object.freeze({ mount });
})(window);

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
    const visualHost = document.createElement("div");
    Object.assign(visualHost.style, { position: "absolute", inset: "0", zIndex: "0" });
    const gameplayHost = document.createElement("div");
    Object.assign(gameplayHost.style, { position: "absolute", inset: "0", zIndex: "1", opacity: "0", pointerEvents: "none" });
    shell.append(visualHost, gameplayHost);
    container.appendChild(shell);

    const runtime = new global.DuduQScreenRuntime(visualHost);
    visualHost.__duduqScreenRuntime = runtime;
    let detachAudio = null;
    let observer = null;
    let frame = null;
    let visibleInteraction = null;
    let disposed = false;
    let audioProxy = null;

    const question = (payload?.questions || payload?.items || [payload])[0] || {};
    const matching = question.metadata?.matching || {};
    global.DuduQVisualPackages.loadVisualPackage(PACKAGE_BASE, PACKAGE_NAME)
      .then((pkg) => {
        if (disposed) return;
        runtime.mount(pkg);
        if (frame) visibleInteraction = runtime.bindVisibleGameplay({ frame, mode: "matching" });
        setText(runtime.lookup(SOURCES.question), question.statement || question.prompt || "");
        setText(runtime.lookup(SOURCES.instruction), question.instruction || "");
        (matching.leftItems || []).slice(0, SOURCES.words.length).forEach((item, index) => {
          setText(runtime.lookup(SOURCES.words[index]), item.label || item.spokenText || item.alt || "");
        });
        detachAudio = runtime.bind(SOURCES.audio, "click", () => {
          frame?.contentDocument?.querySelector(".duduq-matching-audio")?.click();
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
          audioProxy.addEventListener("click", () => frame?.contentDocument?.querySelector(".duduq-matching-audio")?.click());
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
        frame = nextFrame;
        visibleInteraction?.dispose?.();
        visibleInteraction = runtime.bindVisibleGameplay({ frame, mode: "matching" });
        if (!frame?.contentDocument) return;
        observer?.disconnect();
        observer = new MutationObserver(() => {
          const liveQuestion = frame.contentDocument.querySelector(".duduq-matching-instruction")?.textContent?.trim();
          if (liveQuestion) setText(runtime.lookup(SOURCES.question), liveQuestion);
        });
        observer.observe(frame.contentDocument.body, { subtree: true, childList: true, characterData: true });
      },
      dispose() {
        disposed = true;
        observer?.disconnect();
        visibleInteraction?.dispose?.();
        detachAudio?.();
        audioProxy?.__duduqDispose?.();
        audioProxy?.remove();
        runtime.dispose();
        shell.remove();
      },
      runtime
    };
  }

  global.DuduQMatchingVisualBridge = Object.freeze({ mount });
})(window);

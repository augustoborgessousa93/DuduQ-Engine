(function (global) {
  "use strict";

  const PACKAGE_NAME = "target-shooter-master";
  const PACKAGE_BASE = "/design-system/runtime/screens";

  function mount({ container }) {
    if (!global.DuduQScreenRuntime || !global.DuduQVisualPackages) return null;
    const shell = document.createElement("div");
    shell.className = "duduq-target-shooter-visual-shell";
    Object.assign(shell.style, { position: "relative", width: "100%", height: "100%", minHeight: "0", overflow: "hidden" });
    const visualHost = document.createElement("div");
    Object.assign(visualHost.style, { position: "absolute", inset: "0", zIndex: "0", pointerEvents: "none" });
    const gameplayHost = document.createElement("div");
    Object.assign(gameplayHost.style, { position: "absolute", inset: "0", zIndex: "1", pointerEvents: "auto" });
    shell.append(visualHost, gameplayHost);
    container.appendChild(shell);
    const runtime = new global.DuduQScreenRuntime(visualHost);
    visualHost.__duduqScreenRuntime = runtime;
    let disposed = false;
    global.DuduQVisualPackages.loadVisualPackage(PACKAGE_BASE, PACKAGE_NAME)
      .then((pkg) => {
        if (disposed) return;
        runtime.mount(pkg);
        visualHost.setAttribute("data-duduq-visual-package", pkg.manifest.screenId);
      })
      .catch((error) => {
        if (!disposed) shell.setAttribute("data-duduq-visual-package-error", error.message);
      });
    return {
      gameplayHost,
      setFrame(frame) { if (frame) frame.setAttribute("data-duduq-visual-runtime", "target-shooter"); },
      dispose() { disposed = true; runtime.dispose(); shell.remove(); },
      runtime
    };
  }

  global.DuduQTargetShooterVisualBridge = Object.freeze({ mount });
})(window);

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
    Object.assign(visualHost.style, { position: "absolute", inset: "0", zIndex: "1", pointerEvents: "none" });
    const gameplayHost = document.createElement("div");
    // The legacy mechanic remains the behavior/input owner, but its visual shell
    // must never compete with the Penpot package mounted below it.
    // A real iframe is deliberately kept visible and receives the user's
    // native pointer events.  Do not emulate clicks from the package SVG.
    const goldenOnly = new URLSearchParams(global.location.search).get("mode") === "golden-test";
    Object.assign(gameplayHost.style, { position: "absolute", inset: "0", zIndex: "0", opacity: goldenOnly ? "0" : "1", pointerEvents: goldenOnly ? "none" : "auto" });
    shell.append(visualHost, gameplayHost);
    container.appendChild(shell);
    const runtime = new global.DuduQScreenRuntime(visualHost);
    visualHost.__duduqScreenRuntime = runtime;
    let disposed = false;
    let frame = null;
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
      setFrame(nextFrame) {
        if (!nextFrame) return;
        frame = nextFrame;
        frame.setAttribute("data-duduq-visual-runtime", "target-shooter");
        frame.style.setProperty("visibility", "visible", "important");
      },
      dispose() { disposed = true; runtime.dispose(); shell.remove(); },
      runtime
    };
  }

  global.DuduQTargetShooterVisualBridge = Object.freeze({ mount });
})(window);

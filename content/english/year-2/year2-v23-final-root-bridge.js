/* DUDUQ English Year 2 — final-root compatibility bridge
   The upstream v2.3 factory freezes only the module root. Final Year-2 hotfix
   layers need to append audit metadata while preserving the same nested content.
   This bridge creates one shallow Year-2-only root copy; IDs, questions, answers,
   activities and pedagogical data are not rewritten.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Final Root Bridge] Factory v2.3 indisponível.");
  }
  if (factory.__finalRootBridgeApplied) return;

  const VERSION = "1.0.0-year2-final-root-copy";
  const originalBuild = factory.buildModule.bind(factory);

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      const module = originalBuild(config);
      if (!module || typeof module !== "object") return module;
      return {
        ...module,
        audit: { ...(module.audit || {}) }
      };
    },
    __finalRootBridgeApplied: true,
    finalRootBridgeVersion: VERSION
  });
})();

/* DUDUQ Year 2 v2.2 — homologation-only semantic vector finalization
   Numerals and geometric shapes are deterministic semantic graphics, not illustrative artwork.
   This patch marks only those exact IDs as production-eligible vectors; emojis/people/toys/body remain previews.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V22Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 Semantic Vectors] Factory indisponível.");
    return;
  }
  if (factory.__semanticVectorsPatchApplied) return;

  const FINAL_VECTOR_IDS = new Set([
    "EN2-M2-01", "EN2-M2-02", "EN2-M2-03", "EN2-M2-04", "EN2-M2-05", "EN2-M2-06", "EN2-M2-14",
    "EN2-M4-06", "EN2-M4-07", "EN2-M4-08", "EN2-M4-09", "EN2-M4-10", "EN2-M4-12", "EN2-M4-13", "EN2-M4-15"
  ]);

  const originalBuild = factory.buildModule.bind(factory);

  function questions(module) {
    return (module && module.activities || []).flatMap(function (activity) {
      return activity && activity.questions || [];
    });
  }

  function buildModule(config) {
    const module = originalBuild(config);
    for (const question of questions(module)) {
      if (!FINAL_VECTOR_IDS.has(question.id)) continue;
      question.metadata = question.metadata || {};
      question.metadata.finalAssetRequired = false;
      question.metadata.visualStatus = "final-semantic-vector";
      question.metadata.assetAudit = "deterministic-semantic-vector-no-editorial-illustration-required";
    }
    return module;
  }

  window.DuduQYear2V22Factory = Object.freeze({
    ...factory,
    buildModule,
    __semanticVectorsPatchApplied: true,
    semanticVectorsPatchVersion: "1.0.0-homolog",
    finalSemanticVectorIds: Object.freeze(Array.from(FINAL_VECTOR_IDS))
  });
})();

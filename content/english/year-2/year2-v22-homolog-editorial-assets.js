/* DUDUQ Year 2 v2.2 — homologation-only exact editorial asset wiring
   Uses only semantically exact files already present in Assets-DuduQ.
   Composite/count/color-specific concepts remain preview until an exact asset is available.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V22Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 Editorial Assets] Factory indisponível.");
    return;
  }
  if (factory.__editorialAssetsPatchApplied) return;

  const originalBuild = factory.buildModule.bind(factory);

  function raw(file, alt) {
    return { kind: "raw", file, alt };
  }

  const SINGLE_VISUALS = Object.freeze({
    "EN2-M3-03": raw("Train - trem.png", "Trem"),
    "EN2-M3-04": raw("Plane - avião.png", "Avião"),
    "EN2-M6-01": raw("Apple - maçã.png", "Apple"),
    "EN2-M6-02": raw("Banana.png", "Banana"),
    "EN2-M6-03": raw("Orange  -laranja fruta.png", "Orange"),
    "EN2-M6-04": raw("Grapes - uvas.png", "Grapes"),
    "EN2-M6-05": raw("Papaya - mamão.png", "Papaya"),
    "EN2-M6-06": raw("Melon - melão.png", "Melon")
  });

  const OPTION_VISUALS = Object.freeze({
    "EN2-M6-11": [
      raw("Apple - maçã.png", "apple"),
      raw("Banana.png", "banana"),
      raw("Carrot - cenoura.png", "carrot"),
      raw("Grapes - uvas.png", "grape")
    ],
    "EN2-M6-12": [
      raw("Pear - pera.png", "pear"),
      raw("Orange  -laranja fruta.png", "orange"),
      raw("Tomato - tomate.png", "tomato"),
      raw("Banana.png", "banana")
    ]
  });

  function cloneConfig(config) {
    const next = { ...config, plan: { ...(config?.plan || {}) } };
    for (const [id, entry] of Object.entries(next.plan)) next.plan[id] = { ...entry };
    return next;
  }

  function patchPlan(config) {
    const next = cloneConfig(config);
    for (const [id, visual] of Object.entries(SINGLE_VISUALS)) {
      if (!next.plan[id]) continue;
      next.plan[id].visual = { ...visual };
      next.plan[id].assetAudit = "exact-existing-repository-asset";
    }
    for (const [id, visuals] of Object.entries(OPTION_VISUALS)) {
      if (!next.plan[id]) continue;
      next.plan[id].optionVisuals = visuals.map((visual) => ({ ...visual }));
      next.plan[id].assetAudit = "exact-existing-repository-assets";
    }
    return next;
  }

  function buildModule(config) {
    return originalBuild(patchPlan(config));
  }

  window.DuduQYear2V22Factory = Object.freeze({
    ...factory,
    buildModule,
    __editorialAssetsPatchApplied: true,
    editorialAssetsPatchVersion: "1.0.0-homolog",
    exactEditorialAssetItems: Object.freeze([
      ...Object.keys(SINGLE_VISUALS),
      ...Object.keys(OPTION_VISUALS)
    ])
  });
})();

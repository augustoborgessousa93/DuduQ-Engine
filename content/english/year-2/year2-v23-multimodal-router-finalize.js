/* DUDUQ English Year 2 — final multimodal Router guard
   Runs after year2-v23-multimodal-consistency-hotfix.js.
   Keeps smart visuals consistent while respecting each mechanic's Router contract.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Multimodal Router Finalize] Factory indisponível.");
  }
  if (factory.__multimodalRouterFinalizeApplied) return;

  const VERSION = "1.0.0-multimodal-router-finalize";
  const originalBuild = factory.buildModule.bind(factory);
  const resolveVisual = typeof factory.resolveYear2VisualConsistent === "function"
    ? factory.resolveYear2VisualConsistent.bind(factory)
    : null;

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }

  function questions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function labels(question) {
    const source = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(source) && source.length) return source.map(String);
    return (question?.alternatives || []).map((alternative) =>
      String(alternative?.metadata?.sourceWrittenLabel ?? alternative?.audio?.text ?? alternative?.text ?? "")
    );
  }

  function distinctSources(values, sourceLabels) {
    const used = new Set();
    return values.map((source, index) => {
      let next = String(source || "");
      if (!next) return "";
      if (!used.has(next)) {
        used.add(next);
        return next;
      }
      if (resolveVisual) {
        const variant = resolveVisual(sourceLabels[index], { forceSemanticVariant: true });
        if (variant?.src && !used.has(String(variant.src))) next = String(variant.src);
      }
      if (!used.has(next)) used.add(next);
      return next;
    });
  }

  function finalizeBubble(question, audit) {
    if (question?.delivery?.mechanic !== "bubble-pop") return;
    const sourceLabels = labels(question);
    const alternatives = question.alternatives || [];
    const current = alternatives.map((alternative) => String(alternative?.metadata?.imageAssetKey || ""));
    const resolved = distinctSources(current, sourceLabels);

    alternatives.forEach((alternative, index) => {
      alternative.metadata = {
        ...(alternative.metadata || {}),
        imageAssetKey: resolved[index] || alternative?.metadata?.imageAssetKey,
        multimodalRouterSafe: true
      };
      alternative.image = {
        ...(alternative.image || {}),
        enabled: false,
        src: null,
        alt: alternative?.image?.alt || sourceLabels[index] || ""
      };
      if (alternative.audio) {
        alternative.audio = { ...alternative.audio, enabled: false, src: null, text: "" };
      }
    });
    question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
    question.metadata.multimodalRouterFinalize = {
      version: VERSION,
      mechanic: "bubble-pop",
      imageAssetKeyPreserved: true,
      directOptionImageDisabled: true,
      uniqueAssetSources: new Set(resolved.filter(Boolean)).size === resolved.filter(Boolean).length
    };
    audit.bubble += 1;
  }

  function finalizeTarget(question, audit) {
    if (question?.delivery?.mechanic !== "target-shooter") return;
    const config = question?.metadata?.targetShooter;
    if (!Array.isArray(config?.items) || config.items.length < 2) return;
    const sourceLabels = labels(question);
    if (sourceLabels.length !== config.items.length) return;
    const current = config.items.map((item) => String(item?.image || item?.imageSrc || item?.imageUrl || ""));
    if (!current.every(Boolean)) return;
    const resolved = distinctSources(current, sourceLabels);
    config.items = config.items.map((item, index) => ({
      ...item,
      label: "",
      image: resolved[index],
      imageSrc: resolved[index],
      imageUrl: resolved[index],
      display: "image"
    }));
    question.metadata.multimodalRouterFinalize = {
      version: VERSION,
      mechanic: "target-shooter",
      complete: resolved.every(Boolean),
      uniqueAssetSources: new Set(resolved).size === resolved.length
    };
    audit.target += 1;
  }

  function finalizeMatching(question, audit) {
    if (question?.delivery?.mechanic !== "matching") return;
    const matching = question?.metadata?.matching;
    if (!matching?.assets || !Array.isArray(matching.leftItems) || !Array.isArray(matching.rightItems)) return;
    const spoken = matching.leftItems.map((item) => String(item?.spokenText || item?.label || ""));
    const keys = matching.rightItems.map((item) => String(item?.imageAssetKey || ""));
    const current = keys.map((key) => String(matching.assets[key] || ""));
    if (!current.every(Boolean) || current.length !== spoken.length) return;
    const resolved = distinctSources(current, spoken);
    matching.rightItems.forEach((item, index) => {
      const key = String(item.imageAssetKey || `final-asset-${index + 1}`);
      matching.assets[key] = resolved[index];
    });
    question.metadata.multimodalRouterFinalize = {
      version: VERSION,
      mechanic: "matching",
      complete: resolved.every(Boolean),
      uniqueAssetSources: new Set(resolved).size === resolved.length,
      labels: spoken.map(normalize)
    };
    audit.matching += 1;
  }

  function postProcess(module) {
    const audit = { version: VERSION, bubble: 0, target: 0, matching: 0 };
    for (const question of questions(module)) {
      finalizeBubble(question, audit);
      finalizeTarget(question, audit);
      finalizeMatching(question, audit);
    }
    module.audit = { ...(module.audit || {}), multimodalRouterFinalize: audit };
    return module;
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __multimodalRouterFinalizeApplied: true,
    multimodalRouterFinalizeVersion: VERSION
  });
})();

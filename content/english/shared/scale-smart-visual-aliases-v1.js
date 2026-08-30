/* DUDUQ English — shared smart visual aliases for scale-v1 v1.0.0
   Cross-year content-side alias bridge.
   It does not patch mechanic releases, scoring or runtime layout.

   The bridge attaches as soon as the shared Smart Visual Resolver finishes
   loading, which happens before the dynamic module content is published.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQScaleSmartVisualAliases?.version === VERSION) return;

  const ALIASES = Object.freeze({
    "children greeting": "friends"
  });

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function install() {
    const base = window.DuduQSmartVisual;
    if (!base?.resolve) return false;
    if (base.scaleAliasBridgeVersion === VERSION) return true;

    const wrapped = {
      ...base,
      scaleAliasBridgeVersion: VERSION,
      resolve(query, options) {
        const normalized = normalize(query);
        const alias = ALIASES[normalized] || query;
        const result = base.resolve(alias, options);
        if (!result || alias === query) return result;
        return {
          ...result,
          requested: query,
          aliasOf: alias,
          visualKey: `scale-alias:${normalized}->${result.visualKey || normalize(alias)}`
        };
      }
    };

    window.DuduQSmartVisual = Object.freeze(wrapped);
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(function (records) {
      for (const record of records) {
        for (const node of record.addedNodes || []) {
          if (!(node instanceof HTMLScriptElement)) continue;
          if (node.id !== "duduq-shared-smart-visual-resolver-v1") continue;
          node.addEventListener("load", function () {
            install();
            observer.disconnect();
          }, { once: true });
        }
      }
    });
    observer.observe(document.head || document.documentElement, { childList: true, subtree: true });
  }

  window.DuduQScaleSmartVisualAliases = Object.freeze({
    version: VERSION,
    aliases: ALIASES,
    install
  });
})();

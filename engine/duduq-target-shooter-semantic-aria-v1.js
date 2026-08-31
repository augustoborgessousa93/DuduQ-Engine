/* =========================================================
   DUDUQ TARGET SHOOTER — SEMANTIC ARIA BRIDGE v1.0.0

   Purpose:
   - keep the visual anti-repeat/shuffle behavior intact;
   - bind each rendered target's accessible identity to the stable
     editorial option id (A/B/C), not to its transient screen slot;
   - improve deterministic QA and screen-reader traceability without
     exposing the correct answer or changing scoring/physics.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.0";
  const FLAG = "__DUDUQ_TS_SEMANTIC_ARIA_V1__";
  const observers = new WeakMap();

  if (window[FLAG]) return;
  window[FLAG] = VERSION;

  function isTargetShooterFrame(iframe) {
    return /target\s*shooter/i.test(String(iframe?.title || ""));
  }

  function moduleDefinition() {
    const path = Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)
      ? window.DUDUQ_GAME_CONFIG.modulePath
      : [];
    return path.reduce(function (current, key) {
      return current?.[key];
    }, window.DUDUQ_CONTENT) || null;
  }

  function currentQuestion() {
    const module = moduleDefinition();
    const questions = Array.isArray(module?.activities)
      ? module.activities.flatMap(function (activity) {
          return Array.isArray(activity?.questions) ? activity.questions : [];
        })
      : [];
    const stepIndex = Number(window.DuduQ?.getSession?.()?.stepIndex ?? 0);
    return questions[stepIndex] || null;
  }

  function absoluteUrl(value, base) {
    if (!value) return "";
    try { return new URL(String(value), base).href; } catch (_) { return String(value); }
  }

  function sync(iframe) {
    if (!isTargetShooterFrame(iframe)) return;

    try {
      const doc = iframe.contentDocument;
      if (!doc?.documentElement) return;

      const question = currentQuestion();
      const items = Array.isArray(question?.metadata?.targetShooter?.items)
        ? question.metadata.targetShooter.items
        : [];
      if (!items.length) return;

      const byAlt = new Map();
      const byUrl = new Map();
      for (const item of items) {
        const id = String(item?.id || "").trim();
        if (!id) continue;
        const alt = String(item?.alt || "").trim();
        if (alt) byAlt.set(alt, id);
        for (const candidate of [item?.image, item?.imageUrl]) {
          const resolved = absoluteUrl(candidate, iframe.src || window.location.href);
          if (resolved) byUrl.set(resolved, id);
        }
      }

      doc.querySelectorAll(".duduq-ts-target").forEach(function (target) {
        const img = target.querySelector("img");
        const alt = String(img?.getAttribute("alt") || "").trim();
        const src = absoluteUrl(img?.currentSrc || img?.getAttribute("src"), iframe.src || window.location.href);
        const id = byAlt.get(alt) || byUrl.get(src) || "";
        if (!id) return;

        target.setAttribute("data-duduq-option-id", id);
        target.setAttribute("aria-label", `Lançar estrela no alvo ${id}`);
      });
    } catch (_) {
      /* Same-origin DuduQ runtimes are expected; fail closed otherwise. */
    }
  }

  function watch(iframe) {
    if (!iframe || !isTargetShooterFrame(iframe)) return;

    const attach = function () {
      sync(iframe);
      try {
        const doc = iframe.contentDocument;
        if (!doc?.documentElement || observers.has(iframe)) return;
        const observer = new MutationObserver(function () { sync(iframe); });
        observer.observe(doc.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["src", "alt", "class"]
        });
        observers.set(iframe, observer);
      } catch (_) {}
    };

    iframe.addEventListener("load", attach);
    attach();
  }

  function scan(root) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll("iframe").forEach(watch);
  }

  const root = document.getElementById("root") || document.body || document.documentElement;
  scan(root);

  const parentObserver = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes || []) {
        if (node?.tagName === "IFRAME") watch(node);
        scan(node);
      }
    }
  });

  parentObserver.observe(root, { childList: true, subtree: true });
})();

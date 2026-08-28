/* DUDUQ English Year 2 — tactile 3D button presentation
   Year-2 presentation layer only. No mechanic release, scoring or content changes.

   Visual contract:
   - normal: 6px solid lower shadow;
   - hover: translate down 3px + 3px lower shadow;
   - active: translate down 6px + shadow fully collapsed;
   - 120ms tactile transition;
   - shadow tone is derived from the rendered button color so existing mechanic
     palettes remain intact;
   - controls whose mechanics already own CSS transforms keep those transforms and
     receive the tactile offset through the independent `translate` property;
   - option-audio keeps its first-use sound-wave cue through a pseudo-element halo.
*/
(function () {
  "use strict";

  const VERSION = "1.0.1-year2-tactile-buttons-3d-observer-safe";
  const STYLE_ID = "duduq-year2-tactile-buttons-3d";
  const MARK = "data-duduq-tactile-3d";
  const PRESERVE = "data-duduq-tactile-preserve-transform";
  const WIRED = "__DUDUQ_YEAR2_TACTILE_BUTTONS_3D_WIRED__";

  if (window.__DUDUQ_YEAR2_TACTILE_BUTTONS_3D__) return;

  const CSS = `
    [${MARK}="true"] {
      --duduq-tactile-depth: 6px;
      --duduq-tactile-shadow: #0d5f9f;
      position: relative;
      box-shadow: 0 var(--duduq-tactile-depth) 0 var(--duduq-tactile-shadow) !important;
      transition:
        transform .12s cubic-bezier(.2,.72,.28,1),
        translate .12s cubic-bezier(.2,.72,.28,1),
        box-shadow .12s ease,
        filter .12s ease !important;
      -webkit-tap-highlight-color: transparent;
    }

    [${MARK}="true"]:not([${PRESERVE}="true"]) {
      transform: translateY(0) !important;
    }

    [${MARK}="true"][${PRESERVE}="true"] {
      translate: 0 0 !important;
    }

    [${MARK}="true"]:not(:disabled):not([aria-disabled="true"]):hover {
      box-shadow: 0 3px 0 var(--duduq-tactile-shadow) !important;
      filter: brightness(1.025);
    }

    [${MARK}="true"]:not([${PRESERVE}="true"]):not(:disabled):not([aria-disabled="true"]):hover {
      transform: translateY(3px) !important;
    }

    [${MARK}="true"][${PRESERVE}="true"]:not(:disabled):not([aria-disabled="true"]):hover {
      translate: 0 3px !important;
    }

    [${MARK}="true"]:not(:disabled):not([aria-disabled="true"]):active {
      box-shadow: 0 0 0 transparent !important;
      filter: brightness(.985);
    }

    [${MARK}="true"]:not([${PRESERVE}="true"]):not(:disabled):not([aria-disabled="true"]):active {
      transform: translateY(6px) !important;
    }

    [${MARK}="true"][${PRESERVE}="true"]:not(:disabled):not([aria-disabled="true"]):active {
      translate: 0 6px !important;
    }

    [${MARK}="true"]:focus-visible {
      outline: 3px solid rgba(55,153,230,.42) !important;
      outline-offset: 4px !important;
    }

    [${MARK}="true"]:disabled,
    [${MARK}="true"][aria-disabled="true"] {
      cursor: default !important;
      filter: saturate(.7) opacity(.72);
      box-shadow: 0 4px 0 color-mix(in srgb, var(--duduq-tactile-shadow) 72%, #b9c6d2 28%) !important;
    }

    /* The listening cue must not animate the button geometry or its tactile shadow. */
    .duduq-dd2-root:not([data-audio-hint-dismissed="true"])
      .duduq-dd2-item-audio[${MARK}="true"]:not([data-playing="true"])::after {
      content: "";
      position: absolute;
      inset: -3px;
      border: 2px solid rgba(30,123,224,.28);
      border-radius: inherit;
      pointer-events: none;
      animation: duduqYear2TactileAudioHalo 1.8s ease-out infinite;
    }

    @keyframes duduqYear2TactileAudioHalo {
      0% { transform: scale(.88); opacity: .58; }
      70%, 100% { transform: scale(1.38); opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      [${MARK}="true"] {
        transition: none !important;
      }
      .duduq-dd2-item-audio[${MARK}="true"]::after {
        animation: none !important;
        display: none !important;
      }
    }
  `;

  function parseColor(value) {
    const text = String(value || "").trim();
    const match = text.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i);
    if (!match) return null;
    return {
      r: Math.max(0, Math.min(255, Number(match[1]))),
      g: Math.max(0, Math.min(255, Number(match[2]))),
      b: Math.max(0, Math.min(255, Number(match[3]))),
      a: match[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(match[4])))
    };
  }

  function firstRenderedColor(style) {
    let color = parseColor(style.backgroundColor);
    if (color && color.a > .08) return color;

    const gradientMatch = String(style.backgroundImage || "").match(/rgba?\([^)]*\)/i);
    color = gradientMatch ? parseColor(gradientMatch[0]) : null;
    if (color && color.a > .08) return color;

    color = parseColor(style.borderTopColor);
    if (color && color.a > .08) return color;

    return parseColor(style.color) || { r: 28, g: 124, b: 196, a: 1 };
  }

  function shadowFrom(color) {
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    const nearWhite = min > 218;
    const nearGray = max - min < 18;

    if (nearWhite || (nearGray && max > 205)) {
      return "rgb(176 198 216)";
    }

    const factor = .68;
    const floor = 12;
    const r = Math.max(floor, Math.round(color.r * factor));
    const g = Math.max(floor, Math.round(color.g * factor));
    const b = Math.max(floor, Math.round(color.b * factor));
    return `rgb(${r} ${g} ${b})`;
  }

  function shouldPreserveTransform(node, style) {
    if (style.transform && style.transform !== "none") return true;
    return Boolean(node.matches(
      ".duduq-dd2-item, .duduq-bp-bubble, .duduq-ts-target, .duduq-mq-card, .duduq-matching-card, [draggable='true'], [data-dd2-item-id], [data-preserve-transform], [data-animated]"
    ));
  }

  function markControl(node) {
    if (!(node instanceof Element)) return;
    if (node.hasAttribute("data-duduq-no-tactile-3d")) return;

    const style = getComputedStyle(node);
    const color = firstRenderedColor(style);
    const nextShadow = shadowFrom(color);
    const currentShadow = node.style.getPropertyValue("--duduq-tactile-shadow").trim();
    if (currentShadow !== nextShadow) {
      node.style.setProperty("--duduq-tactile-shadow", nextShadow);
    }

    if (node.getAttribute(MARK) !== "true") node.setAttribute(MARK, "true");

    const preserve = shouldPreserveTransform(node, style);
    if (preserve && node.getAttribute(PRESERVE) !== "true") node.setAttribute(PRESERVE, "true");
    if (!preserve && node.hasAttribute(PRESERVE)) node.removeAttribute(PRESERVE);
  }

  function markDocument(doc) {
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll("button, [role='button'].duduq-dd2-placed-replay").forEach(markControl);
  }

  function ensureStyle(doc) {
    if (!doc?.head || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    doc.head.appendChild(style);
  }

  function wireDocument(doc) {
    if (!doc?.documentElement) return;
    ensureStyle(doc);
    markDocument(doc);
    if (doc[WIRED]) return;

    const observer = new MutationObserver(function (records) {
      let needsScan = false;
      for (const record of records) {
        if (record.type === "childList" && record.addedNodes.length) {
          needsScan = true;
          break;
        }
        if (record.type === "attributes") {
          const target = record.target;
          if (target instanceof Element && target.matches("button, [role='button'].duduq-dd2-placed-replay")) {
            markControl(target);
          }
        }
      }
      if (needsScan) markDocument(doc);
    });

    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "disabled", "aria-disabled", "data-playing"]
    });

    try {
      Object.defineProperty(doc, WIRED, { value: observer, configurable: true });
    } catch (_) {
      doc[WIRED] = observer;
    }
  }

  function wireFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try { wireDocument(frame.contentDocument); } catch (_) {}
    if (frame.hasAttribute("data-duduq-tactile-3d-wired")) return;
    frame.setAttribute("data-duduq-tactile-3d-wired", "true");
    frame.addEventListener("load", function () {
      try { wireDocument(frame.contentDocument); } catch (_) {}
    });
  }

  function apply() {
    wireDocument(document);
    document.querySelectorAll("#root iframe").forEach(wireFrame);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      apply();
    });
  }

  const outerObserver = new MutationObserver(schedule);
  outerObserver.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("duduq:engine-ready", schedule);
  window.addEventListener("duduq:step-start", schedule);
  window.addEventListener("resize", schedule, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  window.__DUDUQ_YEAR2_TACTILE_BUTTONS_3D__ = Object.freeze({
    version: VERSION,
    scope: "english-year-2",
    normalDepthPx: 6,
    hoverOffsetPx: 3,
    hoverDepthPx: 3,
    activeOffsetPx: 6,
    activeDepthPx: 0,
    transitionMs: 120,
    preservesExistingMechanicTransforms: true,
    observerWritesAreIdempotent: true,
    derivesShadowFromRenderedButtonColor: true,
    optionAudioHaloPreserved: true,
    releaseModified: false,
    canaryModified: false
  });
})();

/* DUDUQ English Year 2 — Bubble Pop smart renderer bridge
   Scope: Year 2 public pages only.
   Keeps Bubble Pop 1.0.31 immutable while allowing an official Assets-DuduQ
   absolute URL already carried in bubble.imageAssetKey to render through the
   runtime's existing .duduq-bp-media visual contract.

   Visual-safety contract:
   - dynamic bubbles keep moving, but visible trajectory points stay inside a
     size-aware safe area so the complete bubble remains legible;
   - Year-2 selector specificity intentionally outranks the immutable runtime's
     later duduq-bp-edge-trajectory-108 rule without changing that release;
   - the global Bubble Pop release and Canary manifest remain untouched.
*/
(function () {
  "use strict";

  const VERSION = "1.0.4-year2-official-smart-media-safe-trajectory-precedence";
  const OFFICIAL_ASSET = /^https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\//i;
  const GENERATED_IMAGE = /^data:image\//i;
  const SYNTHETIC_DISTRACTOR = /__duduq_distractor_\d+$/i;
  const SAFE_TRAJECTORY_STYLE_ID = "duduq-year2-bubble-safe-trajectory";

  if (window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_BRIDGE__) return;

  function acceptedSource(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    return OFFICIAL_ASSET.test(source) || GENERATED_IMAGE.test(source) ? source : "";
  }

  function questionList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.catalog)) return payload.catalog;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.entries)) return payload.entries;
    return [payload];
  }

  function removeSyntheticDuplicateVisuals(payload) {
    const questions = questionList(payload);
    let removed = 0;

    for (const question of questions) {
      if (!question || !Array.isArray(question.bubbles) || question.bubbles.length < 2) continue;

      const canonicalVisuals = new Set(
        question.bubbles
          .filter((bubble) => !SYNTHETIC_DISTRACTOR.test(String(bubble?.id || "")))
          .map((bubble) => acceptedSource(bubble?.imageAssetKey))
          .filter(Boolean)
      );

      if (!canonicalVisuals.size) continue;

      const filtered = question.bubbles.filter((bubble) => {
        const id = String(bubble?.id || "");
        if (!SYNTHETIC_DISTRACTOR.test(id)) return true;
        const source = acceptedSource(bubble?.imageAssetKey);
        if (!source || !canonicalVisuals.has(source)) return true;
        removed += 1;
        return false;
      });

      if (filtered.length >= 2 && filtered.length !== question.bubbles.length) {
        question.bubbles = filtered;
      }
    }

    return removed;
  }

  function installSafeTrajectoryStyle(runtimeWindow) {
    const doc = runtimeWindow?.document;
    if (!doc?.head) return false;
    if (doc.getElementById(SAFE_TRAJECTORY_STYLE_ID)) return true;

    const style = doc.createElement("style");
    style.id = SAFE_TRAJECTORY_STYLE_ID;
    style.dataset.duduqYear2BubbleSafeTrajectory = VERSION;
    style.textContent = `
      html body #root .duduq-engine-stage .duduq-bp-root
        .duduq-bp-bubble-shell--dynamic,
      html body #root .duduq-engine-stage .duduq-bp-root[data-paused="false"]
        .duduq-bp-bubble-shell--dynamic:not([data-popped="true"]) {
        --y2-bp-safe-edge: 76px;
        left: clamp(var(--y2-bp-safe-edge), var(--bp-x0, 50%), calc(100% - var(--y2-bp-safe-edge))) !important;
        top: clamp(var(--y2-bp-safe-edge), var(--bp-y0, 82%), calc(100% - var(--y2-bp-safe-edge))) !important;
        animation-name: duduq-year2-bp-stream-safe !important;
      }

      @keyframes duduq-year2-bp-stream-safe {
        0% {
          opacity: 0;
          left: clamp(var(--y2-bp-safe-edge), var(--bp-x0, 50%), calc(100% - var(--y2-bp-safe-edge)));
          top: clamp(var(--y2-bp-safe-edge), var(--bp-y0, 82%), calc(100% - var(--y2-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(.90) rotate(var(--bp-tilt-neg, -2deg));
        }
        6% { opacity: 1; }
        32% {
          opacity: 1;
          left: clamp(var(--y2-bp-safe-edge), var(--bp-x1, 36%), calc(100% - var(--y2-bp-safe-edge)));
          top: clamp(var(--y2-bp-safe-edge), var(--bp-y1, 60%), calc(100% - var(--y2-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(.98) rotate(var(--bp-tilt, 2deg));
        }
        66% {
          opacity: 1;
          left: clamp(var(--y2-bp-safe-edge), var(--bp-x2, 64%), calc(100% - var(--y2-bp-safe-edge)));
          top: clamp(var(--y2-bp-safe-edge), var(--bp-y2, 38%), calc(100% - var(--y2-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(1.02) rotate(var(--bp-tilt-neg, -2deg));
        }
        94% { opacity: 1; }
        100% {
          opacity: 0;
          left: clamp(var(--y2-bp-safe-edge), var(--bp-x3, 50%), calc(100% - var(--y2-bp-safe-edge)));
          top: clamp(var(--y2-bp-safe-edge), var(--bp-y3, 14%), calc(100% - var(--y2-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(.94) rotate(var(--bp-tilt, 2deg));
        }
      }

      @media (max-width: 720px) {
        html body #root .duduq-engine-stage .duduq-bp-root
          .duduq-bp-bubble-shell--dynamic,
        html body #root .duduq-engine-stage .duduq-bp-root[data-paused="false"]
          .duduq-bp-bubble-shell--dynamic:not([data-popped="true"]) {
          --y2-bp-safe-edge: 72px;
        }
      }

      @media (max-width: 430px) {
        html body #root .duduq-engine-stage .duduq-bp-root
          .duduq-bp-bubble-shell--dynamic,
        html body #root .duduq-engine-stage .duduq-bp-root[data-paused="false"]
          .duduq-bp-bubble-shell--dynamic:not([data-popped="true"]) {
          --y2-bp-safe-edge: 68px;
        }
      }
    `;
    doc.head.appendChild(style);
    return true;
  }

  function installMessageDedupe(runtimeWindow) {
    if (!runtimeWindow || runtimeWindow.__DUDUQ_YEAR2_BUBBLE_MESSAGE_DEDUPE__) return;

    try {
      const originalPostMessage = runtimeWindow.postMessage.bind(runtimeWindow);
      runtimeWindow.postMessage = function year2BubblePostMessage(message, targetOrigin, transfer) {
        if (
          message &&
          typeof message === "object" &&
          message.type === "DUDUQ_LOAD_CONTENT" &&
          message.mechanic === "bubble-pop" &&
          message.payload
        ) {
          const removed = removeSyntheticDuplicateVisuals(message.payload);
          if (removed > 0) {
            runtimeWindow.__DUDUQ_YEAR2_BUBBLE_SYNTHETIC_DUPLICATES_REMOVED__ =
              (runtimeWindow.__DUDUQ_YEAR2_BUBBLE_SYNTHETIC_DUPLICATES_REMOVED__ || 0) + removed;
          }
        }

        if (arguments.length >= 3) {
          return originalPostMessage(message, targetOrigin, transfer);
        }
        return originalPostMessage(message, targetOrigin);
      };

      runtimeWindow.__DUDUQ_YEAR2_BUBBLE_MESSAGE_DEDUPE__ = Object.freeze({
        version: VERSION,
        syntheticOnly: true,
        sourceAnswersPreserved: true
      });
    } catch (error) {
      console.warn("[DuduQ Year2 Bubble Smart Renderer] Não foi possível instalar o dedupe da mensagem.", error);
    }
  }

  function patchBubbleFrame(frame) {
    if (!frame || frame.tagName !== "IFRAME") return false;

    try {
      const runtimeWindow = frame.contentWindow;
      installSafeTrajectoryStyle(runtimeWindow);

      const React = runtimeWindow?.React;
      if (!React || typeof React.createElement !== "function") return false;

      installMessageDedupe(runtimeWindow);

      if (runtimeWindow.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_PATCH__) return true;

      const originalCreateElement = React.createElement;

      function year2BubbleCreateElement(type, props, ...children) {
        const componentName = typeof type === "function" ? String(type.name || "") : "";
        const bubble = props?.bubble;
        const source = componentName === "BubblePopMedia"
          ? acceptedSource(bubble?.imageAssetKey)
          : "";

        if (source) {
          return originalCreateElement.call(
            React,
            "img",
            {
              src: source,
              alt: String(bubble?.alt || bubble?.label || ""),
              className: "duduq-bp-media",
              draggable: false,
              "data-duduq-year2-smart-media": "official"
            }
          );
        }

        return originalCreateElement.call(React, type, props, ...children);
      }

      React.createElement = year2BubbleCreateElement;
      runtimeWindow.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_PATCH__ = Object.freeze({
        version: VERSION,
        releaseModified: false,
        canaryModified: false,
        officialAssetsOnly: true,
        syntheticVisualDedupe: true,
        safeTrajectory: true,
        runtimeTrajectoryOverriddenYear2Only: true
      });
      return true;
    } catch (error) {
      console.warn("[DuduQ Year2 Bubble Smart Renderer] Não foi possível instalar a ponte no iframe.", error);
      return false;
    }
  }

  document.addEventListener(
    "load",
    function year2BubbleFrameLoadCapture(event) {
      const frame = event.target;
      if (!frame || frame.tagName !== "IFRAME") return;
      const src = String(frame.getAttribute("src") || frame.src || "");
      if (!/\/DUDUQ_BUBBLE_POP\.html(?:\?|$)/i.test(src)) return;

      // Capture phase runs before the adapter's target load handler posts
      // DUDUQ_LOAD_CONTENT, so media rendering, trajectory safety and synthetic
      // visual dedupe are installed before the first external Bubble Pop render.
      patchBubbleFrame(frame);
    },
    true
  );

  window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_BRIDGE__ = Object.freeze({
    version: VERSION,
    releaseModified: false,
    canaryModified: false,
    scope: "english-year-2",
    syntheticVisualDedupe: true,
    safeTrajectory: true,
    runtimeTrajectoryOverriddenYear2Only: true
  });
})();

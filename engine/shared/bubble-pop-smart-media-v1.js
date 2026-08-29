/* =========================================================
   DUDUQ SHARED — BUBBLE POP SMART MEDIA v1.0.0

   Structural cross-year behavior:
   - renders official Assets-DuduQ URLs already carried by bubble.imageAssetKey;
   - accepts deterministic data:image fallbacks already resolved upstream;
   - removes only synthetic distractors that duplicate an existing visual;
   - does not alter answers, scoring, timing, pedagogy or mechanic releases;
   - leaves trajectory/safe-area ownership to bubble-pop-runtime-safety-v1.js.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.0";
  const RUNTIME_RE = /\/DUDUQ_BUBBLE_POP\.html(?:\?|$)/i;
  const OFFICIAL_ASSET = /^https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\//i;
  const GENERATED_IMAGE = /^data:image\//i;
  const SYNTHETIC_DISTRACTOR = /__duduq_distractor_\d+$/i;

  if (window.__DUDUQ_SHARED_BUBBLE_SMART_MEDIA__) return;

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

  function installMessageDedupe(runtimeWindow) {
    if (!runtimeWindow || runtimeWindow.__DUDUQ_SHARED_BUBBLE_MESSAGE_DEDUPE__) return;

    try {
      const originalPostMessage = runtimeWindow.postMessage.bind(runtimeWindow);
      runtimeWindow.postMessage = function sharedBubblePostMessage(message, targetOrigin, transfer) {
        if (
          message && typeof message === "object" &&
          message.type === "DUDUQ_LOAD_CONTENT" &&
          message.mechanic === "bubble-pop" &&
          message.payload
        ) {
          const removed = removeSyntheticDuplicateVisuals(message.payload);
          if (removed > 0) {
            runtimeWindow.__DUDUQ_SHARED_BUBBLE_SYNTHETIC_DUPLICATES_REMOVED__ =
              (runtimeWindow.__DUDUQ_SHARED_BUBBLE_SYNTHETIC_DUPLICATES_REMOVED__ || 0) + removed;
          }
        }

        if (arguments.length >= 3) return originalPostMessage(message, targetOrigin, transfer);
        return originalPostMessage(message, targetOrigin);
      };

      runtimeWindow.__DUDUQ_SHARED_BUBBLE_MESSAGE_DEDUPE__ = Object.freeze({
        version: VERSION,
        syntheticOnly: true,
        sourceAnswersPreserved: true
      });
    } catch (error) {
      console.warn("[DuduQ Shared Bubble Smart Media] Falha ao instalar dedupe da mensagem.", error);
    }
  }

  function patchBubbleFrame(frame) {
    if (!frame || frame.tagName !== "IFRAME") return false;

    try {
      const runtimeWindow = frame.contentWindow;
      const React = runtimeWindow?.React;
      if (!React || typeof React.createElement !== "function") return false;

      installMessageDedupe(runtimeWindow);
      if (runtimeWindow.__DUDUQ_SHARED_BUBBLE_SMART_MEDIA_PATCH__) return true;

      const originalCreateElement = React.createElement;
      function sharedBubbleCreateElement(type, props, ...children) {
        const componentName = typeof type === "function" ? String(type.name || "") : "";
        const bubble = props?.bubble;
        const source = componentName === "BubblePopMedia" ? acceptedSource(bubble?.imageAssetKey) : "";

        if (source) {
          return originalCreateElement.call(React, "img", {
            src: source,
            alt: String(bubble?.alt || bubble?.label || ""),
            className: "duduq-bp-media",
            draggable: false,
            "data-duduq-shared-smart-media": "official"
          });
        }

        return originalCreateElement.call(React, type, props, ...children);
      }

      React.createElement = sharedBubbleCreateElement;
      runtimeWindow.__DUDUQ_SHARED_BUBBLE_SMART_MEDIA_PATCH__ = Object.freeze({
        version: VERSION,
        scope: "all-years",
        officialAssets: true,
        generatedImages: true,
        syntheticVisualDedupe: true,
        releaseModified: false
      });
      return true;
    } catch (error) {
      console.warn("[DuduQ Shared Bubble Smart Media] Falha ao instalar ponte no iframe.", error);
      return false;
    }
  }

  function maybePatch(frame) {
    if (!frame || frame.tagName !== "IFRAME") return;
    const src = String(frame.getAttribute("src") || frame.src || "");
    if (!RUNTIME_RE.test(src)) return;
    patchBubbleFrame(frame);
  }

  document.addEventListener("load", function sharedBubbleFrameLoadCapture(event) {
    maybePatch(event.target);
  }, true);

  document.querySelectorAll("iframe").forEach(maybePatch);

  window.__DUDUQ_SHARED_BUBBLE_SMART_MEDIA__ = Object.freeze({
    version: VERSION,
    scope: "all-years",
    mechanic: "bubble-pop",
    officialAssets: true,
    generatedImages: true,
    syntheticVisualDedupe: true,
    safeTrajectoryOwnedElsewhere: true,
    releaseModified: false
  });
})();

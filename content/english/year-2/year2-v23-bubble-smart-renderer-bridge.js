/* DUDUQ English Year 2 — Bubble Pop smart renderer bridge
   Scope: Year 2 public pages only.
   Keeps Bubble Pop 1.0.31 immutable while allowing an official Assets-DuduQ
   absolute URL already carried in bubble.imageAssetKey to render through the
   runtime's existing .duduq-bp-media visual contract.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-year2-official-smart-media";
  const OFFICIAL_ASSET = /^https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\//i;
  const GENERATED_IMAGE = /^data:image\//i;

  if (window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_BRIDGE__) return;

  function acceptedSource(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    return OFFICIAL_ASSET.test(source) || GENERATED_IMAGE.test(source) ? source : "";
  }

  function patchBubbleFrame(frame) {
    if (!frame || frame.tagName !== "IFRAME") return false;

    try {
      const runtimeWindow = frame.contentWindow;
      const React = runtimeWindow?.React;
      if (!React || typeof React.createElement !== "function") return false;
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
        officialAssetsOnly: true
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
      // DUDUQ_LOAD_CONTENT, so BubblePopMedia is patched before first render.
      patchBubbleFrame(frame);
    },
    true
  );

  window.__DUDUQ_YEAR2_BUBBLE_SMART_RENDERER_BRIDGE__ = Object.freeze({
    version: VERSION,
    releaseModified: false,
    canaryModified: false,
    scope: "english-year-2"
  });
})();

/* =========================================================
   DUDUQ SHARED — BUBBLE POP RUNTIME SAFETY v1.0.0

   Structural cross-year behavior:
   - keeps every visible dynamic bubble inside the playable arena;
   - preserves Bubble Pop release timing, duration, pause and feedback logic;
   - does not alter content, answers, assets or pedagogical rules;
   - works as a channel-level compatibility layer while releases remain immutable.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.0";
  const STYLE_ID = "duduq-shared-bubble-safe-trajectory-v1";
  const RUNTIME_RE = /\/DUDUQ_BUBBLE_POP\.html(?:\?|$)/i;

  if (window.__DUDUQ_SHARED_BUBBLE_RUNTIME_SAFETY__) return;

  function install(runtimeWindow) {
    const doc = runtimeWindow?.document;
    if (!doc?.head) return false;
    if (doc.getElementById(STYLE_ID)) return true;

    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.dataset.duduqSharedBubbleSafety = VERSION;
    style.textContent = `
      html body #root .duduq-engine-stage .duduq-bp-root
        .duduq-bp-bubble-shell--dynamic,
      html body #root .duduq-engine-stage .duduq-bp-root[data-paused="false"]
        .duduq-bp-bubble-shell--dynamic:not([data-popped="true"]) {
        --duduq-bp-safe-edge: 84px;
        left: clamp(var(--duduq-bp-safe-edge), var(--bp-x0, 50%), calc(100% - var(--duduq-bp-safe-edge))) !important;
        top: clamp(var(--duduq-bp-safe-edge), var(--bp-y0, 82%), calc(100% - var(--duduq-bp-safe-edge))) !important;
        animation-name: duduq-shared-bp-stream-safe !important;
      }

      @keyframes duduq-shared-bp-stream-safe {
        0% {
          opacity: 0;
          left: clamp(var(--duduq-bp-safe-edge), var(--bp-x0, 50%), calc(100% - var(--duduq-bp-safe-edge)));
          top: clamp(var(--duduq-bp-safe-edge), var(--bp-y0, 82%), calc(100% - var(--duduq-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(.90) rotate(var(--bp-tilt-neg, -2deg));
        }
        6% { opacity: 1; }
        32% {
          opacity: 1;
          left: clamp(var(--duduq-bp-safe-edge), var(--bp-x1, 36%), calc(100% - var(--duduq-bp-safe-edge)));
          top: clamp(var(--duduq-bp-safe-edge), var(--bp-y1, 60%), calc(100% - var(--duduq-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(.98) rotate(var(--bp-tilt, 2deg));
        }
        66% {
          opacity: 1;
          left: clamp(var(--duduq-bp-safe-edge), var(--bp-x2, 64%), calc(100% - var(--duduq-bp-safe-edge)));
          top: clamp(var(--duduq-bp-safe-edge), var(--bp-y2, 38%), calc(100% - var(--duduq-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(1.02) rotate(var(--bp-tilt-neg, -2deg));
        }
        94% { opacity: 1; }
        100% {
          opacity: 0;
          left: clamp(var(--duduq-bp-safe-edge), var(--bp-x3, 50%), calc(100% - var(--duduq-bp-safe-edge)));
          top: clamp(var(--duduq-bp-safe-edge), var(--bp-y3, 14%), calc(100% - var(--duduq-bp-safe-edge)));
          transform: translate(-50%, -50%) scale(.94) rotate(var(--bp-tilt, 2deg));
        }
      }

      @media (max-width: 720px) {
        html body #root .duduq-engine-stage .duduq-bp-root
          .duduq-bp-bubble-shell--dynamic,
        html body #root .duduq-engine-stage .duduq-bp-root[data-paused="false"]
          .duduq-bp-bubble-shell--dynamic:not([data-popped="true"]) {
          --duduq-bp-safe-edge: 78px;
        }
      }

      @media (max-width: 430px) {
        html body #root .duduq-engine-stage .duduq-bp-root
          .duduq-bp-bubble-shell--dynamic,
        html body #root .duduq-engine-stage .duduq-bp-root[data-paused="false"]
          .duduq-bp-bubble-shell--dynamic:not([data-popped="true"]) {
          --duduq-bp-safe-edge: 76px;
        }
      }
    `;

    doc.head.appendChild(style);
    runtimeWindow.__DUDUQ_SHARED_BUBBLE_RUNTIME_SAFETY_ACTIVE__ = Object.freeze({
      version: VERSION,
      safeTrajectory: true,
      releaseModified: false
    });
    return true;
  }

  document.addEventListener(
    "load",
    function sharedBubbleRuntimeLoad(event) {
      const frame = event.target;
      if (!frame || frame.tagName !== "IFRAME") return;
      const src = String(frame.getAttribute("src") || frame.src || "");
      if (!RUNTIME_RE.test(src)) return;

      try {
        install(frame.contentWindow);
      } catch (error) {
        console.warn("[DuduQ Shared Bubble Safety] Falha ao instalar zona segura.", error);
      }
    },
    true
  );

  window.__DUDUQ_SHARED_BUBBLE_RUNTIME_SAFETY__ = Object.freeze({
    version: VERSION,
    scope: "all-years",
    mechanic: "bubble-pop",
    safeTrajectory: true,
    releaseModified: false
  });
})();

/* DUDUQ Year2 v2.2 — homologation-only responsive bridge */
(function () {
  "use strict";

  const MARKER = "data-duduq-year2-homolog-mobile-frame";
  const WIRED = "data-duduq-year2-homolog-frame-wired";
  const STYLE_ID = "duduq-year2-homolog-compact-dragdrop";
  const MOBILE_QUERY = "(max-width: 640px)";
  /* O mínimo anterior de 520px eliminou o iframe padrão de 150px, mas ainda comprimia o chrome da mecânica. */
  const MOBILE_HEIGHT = "max(680px, 100dvh)";

  const COMPACT_DRAGDROP_CSS = `
    .duduq-dd2-targets:has(.duduq-dd2-target[data-kind="response"]) {
      grid-template-columns: minmax(0, min(100%, 420px)) !important;
      justify-content: center !important;
    }
    .duduq-dd2-target[data-kind="response"] {
      width: min(100%, 420px) !important;
      min-height: 0 !important;
      padding: 14px 12px 10px !important;
      gap: 8px !important;
      border-radius: 20px !important;
    }
    .duduq-dd2-target[data-kind="response"] .duduq-dd2-target-head {
      min-height: 30px !important;
      padding: 0 8px !important;
      gap: 6px !important;
    }
    .duduq-dd2-target[data-kind="response"] .duduq-dd2-zone {
      min-height: 58px !important;
      padding: 6px 8px !important;
      border-radius: 16px !important;
    }
    .duduq-dd2-target[data-kind="response"] .duduq-dd2-empty {
      margin: 0 !important;
      font-size: 12px !important;
    }
    @media (max-width: 640px) {
      .duduq-dd2-root:has(.duduq-dd2-target[data-kind="response"]) .duduq-dd2-arena {
        gap: 10px !important;
      }
      .duduq-dd2-targets:has(.duduq-dd2-target[data-kind="response"]) {
        grid-template-columns: minmax(0, min(100%, 320px)) !important;
      }
      .duduq-dd2-target[data-kind="response"] {
        width: min(100%, 320px) !important;
        padding: 10px 9px 8px !important;
        border-radius: 18px !important;
      }
      .duduq-dd2-target[data-kind="response"] .duduq-dd2-target-head {
        min-height: 26px !important;
      }
      .duduq-dd2-target[data-kind="response"] .duduq-dd2-zone {
        min-height: 52px !important;
        padding: 5px 7px !important;
      }
      .duduq-dd2-root:has(.duduq-dd2-target[data-kind="list"]) .duduq-dd2-arena {
        gap: 8px !important;
      }
      .duduq-dd2-target[data-kind="list"] {
        padding-top: 14px !important;
      }
    }
  `;

  function isMobile() {
    try {
      return window.matchMedia(MOBILE_QUERY).matches;
    } catch (_) {
      return window.innerWidth <= 640;
    }
  }

  function injectFrameStyle(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.head || doc.getElementById(STYLE_ID)) return;
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = COMPACT_DRAGDROP_CSS;
      doc.head.appendChild(style);
    } catch (_) {}
  }

  function resetHostViewport() {
    if (!isMobile()) return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (_) {
      try { window.scrollTo(0, 0); } catch (_) {}
    }
  }

  function resetFrameViewport(frame) {
    if (!isMobile() || !(frame instanceof HTMLIFrameElement)) return;
    try {
      const child = frame.contentWindow;
      const doc = frame.contentDocument;
      child?.scrollTo?.(0, 0);
      if (doc?.documentElement) doc.documentElement.scrollTop = 0;
      if (doc?.body) doc.body.scrollTop = 0;
    } catch (_) {}
  }

  function stabilizeFrameTop(frame) {
    if (!isMobile() || !(frame instanceof HTMLIFrameElement)) return;
    const reset = () => resetFrameViewport(frame);
    reset();
    window.requestAnimationFrame(reset);
    for (const delay of [60, 180, 420, 900]) window.setTimeout(reset, delay);
  }

  function stabilizeAllFrameTops() {
    if (!isMobile()) return;
    document.querySelectorAll("#root iframe").forEach(stabilizeFrameTop);
  }

  function wireFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement) || frame.hasAttribute(WIRED)) return;
    frame.setAttribute(WIRED, "true");
    frame.addEventListener("load", function () {
      injectFrameStyle(frame);
      stabilizeFrameTop(frame);
    });
  }

  function applyFrame(frame, mobile) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    wireFrame(frame);
    injectFrameStyle(frame);

    if (mobile) {
      frame.setAttribute(MARKER, "true");
      frame.style.setProperty("display", "block", "important");
      frame.style.setProperty("width", "100%", "important");
      frame.style.setProperty("max-width", "100%", "important");
      frame.style.setProperty("height", MOBILE_HEIGHT, "important");
      frame.style.setProperty("min-height", "680px", "important");
      frame.style.setProperty("border", "0", "important");
      stabilizeFrameTop(frame);
      return;
    }

    if (frame.hasAttribute(MARKER)) {
      frame.removeAttribute(MARKER);
      for (const property of ["display", "width", "max-width", "height", "min-height", "border"]) {
        frame.style.removeProperty(property);
      }
    }
  }

  function stabilizeViewportTop() {
    if (!isMobile()) return;
    resetHostViewport();
    stabilizeAllFrameTops();
    window.requestAnimationFrame(() => {
      resetHostViewport();
      stabilizeAllFrameTops();
    });
    for (const delay of [60, 180, 420, 900]) {
      window.setTimeout(() => {
        resetHostViewport();
        stabilizeAllFrameTops();
      }, delay);
    }
  }

  function apply() {
    const mobile = isMobile();
    document.querySelectorAll("#root iframe").forEach((frame) => applyFrame(frame, mobile));
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("duduq:engine-ready", function () {
    schedule();
    stabilizeViewportTop();
  });
  window.addEventListener("duduq:step-start", function () {
    schedule();
    stabilizeViewportTop();
  });
  window.addEventListener("duduq:m1-12-first-listen-revealed", function () {
    schedule();
    stabilizeViewportTop();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      schedule();
      stabilizeViewportTop();
    }, { once: true });
  } else {
    schedule();
    stabilizeViewportTop();
  }
})();

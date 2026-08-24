/* DUDUQ Year2 v2.2 — homologation-only responsive bridge */
(function () {
  "use strict";

  const MARKER = "data-duduq-year2-homolog-mobile-frame";
  const WIRED = "data-duduq-year2-homolog-frame-wired";
  const MOBILE_QUERY = "(max-width: 640px)";
  /* O mínimo anterior de 520px eliminou o iframe padrão de 150px, mas ainda comprimia o chrome da mecânica. */
  const MOBILE_HEIGHT = "max(680px, 100dvh)";

  function isMobile() {
    try {
      return window.matchMedia(MOBILE_QUERY).matches;
    } catch (_) {
      return window.innerWidth <= 640;
    }
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
      stabilizeFrameTop(frame);
    });
  }

  function applyFrame(frame, mobile) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    wireFrame(frame);

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

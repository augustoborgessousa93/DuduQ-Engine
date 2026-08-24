/* DUDUQ Year2 v2.2 — homologation-only responsive bridge */
(function () {
  "use strict";

  const MARKER = "data-duduq-year2-homolog-mobile-frame";
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

  function applyFrame(frame, mobile) {
    if (!(frame instanceof HTMLIFrameElement)) return;

    if (mobile) {
      frame.setAttribute(MARKER, "true");
      frame.style.setProperty("display", "block", "important");
      frame.style.setProperty("width", "100%", "important");
      frame.style.setProperty("max-width", "100%", "important");
      frame.style.setProperty("height", MOBILE_HEIGHT, "important");
      frame.style.setProperty("min-height", "680px", "important");
      frame.style.setProperty("border", "0", "important");
      return;
    }

    if (frame.hasAttribute(MARKER)) {
      frame.removeAttribute(MARKER);
      for (const property of ["display", "width", "max-width", "height", "min-height", "border"]) {
        frame.style.removeProperty(property);
      }
    }
  }

  function resetViewport() {
    if (!isMobile()) return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (_) {
      try { window.scrollTo(0, 0); } catch (_) {}
    }
  }

  function stabilizeViewportTop() {
    if (!isMobile()) return;
    resetViewport();
    window.requestAnimationFrame(resetViewport);
    window.setTimeout(resetViewport, 60);
    window.setTimeout(resetViewport, 180);
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
  window.addEventListener("duduq:engine-ready", schedule);
  window.addEventListener("duduq:step-start", function () {
    schedule();
    stabilizeViewportTop();
  });
  window.addEventListener("duduq:m1-12-first-listen-revealed", function () {
    schedule();
    stabilizeViewportTop();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();

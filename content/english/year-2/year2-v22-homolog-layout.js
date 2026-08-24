/* DUDUQ Year2 v2.2 — homologation-only responsive bridge */
(function () {
  "use strict";

  const MARKER = "data-duduq-year2-homolog-mobile-frame";
  const MOBILE_QUERY = "(max-width: 640px)";
  const MOBILE_HEIGHT = "clamp(520px, 68dvh, 620px)";

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
      frame.style.setProperty("min-height", "520px", "important");
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();

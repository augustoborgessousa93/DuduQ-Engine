/* DUDUQ English Year 2 — gamified rounded typography
   Year-2 presentation layer only. Offline-safe: no remote font import.
   Nunito is preferred whenever available; rounded/system fallbacks keep the
   interface usable without network access.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-year2-gamified-rounded-typography";
  const STYLE_ID = "duduq-year2-gamified-typography";
  const WIRED = "data-duduq-year2-gamified-typography-wired";

  if (window.__DUDUQ_YEAR2_GAMIFIED_TYPOGRAPHY__) return;

  const CSS = `
    :root {
      --duduq-font-rounded: "Nunito", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    html,
    body,
    #root,
    #root * {
      font-family: var(--duduq-font-rounded) !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    /* Titles: rounded, strong and game-like. */
    #root h1,
    #root h2,
    #root h3,
    #root [class*="title"],
    #root [class*="heading"] {
      font-weight: 800 !important;
    }

    #root h1,
    #root .duduq-engine-title,
    #root [class*="hero-title"] {
      font-weight: 900 !important;
    }

    /* Short educational instructions benefit from a bold, highly legible weight. */
    #root .duduq-engine-instruction,
    #root .duduq-dd2-instruction,
    #root [class*="instruction"],
    #root [class*="prompt"],
    #root [class*="question"] {
      font-weight: 700 !important;
    }

    /* Long copy stays lighter when explicitly marked as body/description. */
    #root p,
    #root [class*="description"],
    #root [class*="body-copy"] {
      font-weight: 400;
    }

    /* Primary CTAs: tactile, emphatic and consistent across mechanics. */
    #root button,
    #root [role="button"] {
      font-weight: 800;
    }

    #root button.duduq-matching-primary,
    #root button.duduq-dd2-confirm,
    #root button[class*="primary"],
    #root button[class*="confirm"],
    #root button[class*="continue"],
    #root button[class*="start"],
    #root button[class*="play"] {
      font-weight: 900 !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
    }

    /* Small icon-only controls must not inherit uppercase/letter spacing. */
    #root .duduq-dd2-item-audio,
    #root .duduq-dd2-placed-replay,
    #root .duduq-dd2-placed-clear,
    #root button[aria-label]:empty,
    #root button:has(svg):not(:has(span:not([aria-hidden="true"]))) {
      letter-spacing: 0 !important;
      text-transform: none !important;
    }

    @media (max-width: 640px) {
      #root button.duduq-matching-primary,
      #root button.duduq-dd2-confirm,
      #root button[class*="primary"],
      #root button[class*="confirm"] {
        letter-spacing: .8px !important;
      }
    }
  `;

  function inject(doc) {
    if (!doc?.head || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    doc.head.appendChild(style);
  }

  function wireFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try { inject(frame.contentDocument); } catch (_) {}
    if (frame.hasAttribute(WIRED)) return;
    frame.setAttribute(WIRED, "true");
    frame.addEventListener("load", function () {
      try { inject(frame.contentDocument); } catch (_) {}
    });
  }

  function apply() {
    inject(document);
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

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("duduq:engine-ready", schedule);
  window.addEventListener("duduq:step-start", schedule);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  window.__DUDUQ_YEAR2_GAMIFIED_TYPOGRAPHY__ = Object.freeze({
    version: VERSION,
    scope: "english-year-2",
    preferredFamily: "Nunito",
    offlineSafe: true,
    remoteFontImport: false,
    ctaWeight: 900,
    titleWeight: "800-900",
    instructionWeight: 700,
    longBodyWeight: 400,
    antialiasing: true,
    releaseModified: false,
    canaryModified: false
  });
})();
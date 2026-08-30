/* =========================================================
   DUDUQ SHARED — INTRO RESPONSIVE LAYOUT v1.0.1

   Cross-year structural behavior:
   - gives EduQ Play stronger visual presence on large desktop/fullscreen;
   - prevents the 390px mobile override from shrinking the collection logo too far;
   - preserves the proven 1366x768 notebook composition;
   - explicitly overrides only responsive geometry from immutable Core 1.0.9;
   - does not alter Intro timing, assets, labels, pedagogy or Core release files;
   - loaded only by the experimental scale channel for safe rollback.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.1";
  const STYLE_ID = "duduq-shared-intro-layout-v1";

  if (window.__DUDUQ_SHARED_INTRO_LAYOUT__) return;

  function install() {
    if (!document?.head) return false;
    if (document.getElementById(STYLE_ID)) return true;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.dataset.duduqSharedIntroLayout = VERSION;
    style.textContent = `
      /*
       * This layer intentionally overrides geometry from immutable Core 1.0.9.
       * !important is restricted to those geometry properties so the shared
       * compatibility layer cannot accidentally take ownership of animation,
       * color, timing, accessibility or interaction behavior.
       */
      @media (min-width: 1600px) and (min-height: 900px) {
        html body .duduq-intro.is-mission .duduq-intro-collection {
          width: min(1180px, 90vw) !important;
          min-height: clamp(510px, 52vh, 610px) !important;
          margin-bottom: clamp(24px, 2.6vh, 32px) !important;
        }

        html body .duduq-intro.is-mission .duduq-intro-collection-logo {
          height: clamp(510px, 52vh, 610px) !important;
          max-width: 78vw !important;
        }

        html body .duduq-intro.is-mission .duduq-intro-meta {
          margin-bottom: clamp(26px, 2.8vh, 34px) !important;
        }

        html body .duduq-intro.is-mission .duduq-intro-meta-chip {
          min-height: 42px !important;
          padding: 8px 18px !important;
          font-size: clamp(14px, .9vw, 17px) !important;
        }

        html body .duduq-intro.is-mission .duduq-intro-loading {
          width: min(760px, 74vw) !important;
        }

        html body .duduq-intro.is-mission .duduq-intro-actions {
          width: min(540px, 78vw) !important;
          min-height: 100px !important;
          margin-top: clamp(34px, 3.5vh, 40px) !important;
        }

        html body .duduq-intro.is-mission .duduq-intro-start-button {
          min-height: 72px !important;
          font-size: clamp(20px, 1.1vw, 23px) !important;
        }
      }

      /*
       * Core 1.0.9 forces 215px at <=390px. Modern portrait phones have enough
       * room for a larger mark; short screens are still protected by clamp().
       */
      @media (max-width: 560px) {
        html body .duduq-intro.is-mission .duduq-intro-collection {
          min-height: clamp(275px, 38vh, 310px) !important;
        }

        html body .duduq-intro.is-mission .duduq-intro-collection-logo {
          height: clamp(235px, 34vh, 290px) !important;
          max-width: 94vw !important;
        }
      }

      @media (max-width: 390px) {
        html body .duduq-intro.is-mission .duduq-intro-collection-logo {
          height: clamp(235px, 34vh, 290px) !important;
        }
      }
    `;

    document.head.appendChild(style);
    return true;
  }

  const installed = install();

  window.__DUDUQ_SHARED_INTRO_LAYOUT__ = Object.freeze({
    version: VERSION,
    scope: "all-years",
    component: "intro",
    largeScreenScale: true,
    mobileBrandPresence: true,
    notebookBaselinePreserved: true,
    explicitCoreGeometryOverride: true,
    releaseModified: false,
    installed
  });
})();

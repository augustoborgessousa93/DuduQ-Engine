/* =========================================================
   DUDUQ SHARED — INTRO RESPONSIVE LAYOUT v1.0.0

   Cross-year structural behavior:
   - gives EduQ Play stronger visual presence on large desktop/fullscreen;
   - prevents the 390px mobile override from shrinking the collection logo too far;
   - preserves the proven 1366x768 notebook composition;
   - does not alter Intro timing, assets, labels, pedagogy or Core release files;
   - loaded only by the experimental scale channel for safe rollback.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.0";
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
       * Large fullscreen displays had enough vertical room, but Core 1.0.9
       * capped the collection logo at 445px. Grow the mission block instead
       * of scaling the whole stage, so text remains crisp and no viewport
       * clipping is introduced.
       */
      @media (min-width: 1600px) and (min-height: 900px) {
        .duduq-intro.is-mission .duduq-intro-collection {
          width: min(1180px, 90vw);
          min-height: clamp(510px, 52vh, 610px);
          margin-bottom: clamp(24px, 2.6vh, 32px);
        }

        .duduq-intro.is-mission .duduq-intro-collection-logo {
          height: clamp(510px, 52vh, 610px);
          max-width: 78vw;
        }

        .duduq-intro.is-mission .duduq-intro-meta {
          margin-bottom: clamp(26px, 2.8vh, 34px);
        }

        .duduq-intro.is-mission .duduq-intro-meta-chip {
          min-height: 42px;
          padding: 8px 18px;
          font-size: clamp(14px, .9vw, 17px);
        }

        .duduq-intro.is-mission .duduq-intro-loading {
          width: min(760px, 74vw);
        }

        .duduq-intro.is-mission .duduq-intro-actions {
          width: min(540px, 78vw);
          min-height: 100px;
          margin-top: clamp(34px, 3.5vh, 40px);
        }

        .duduq-intro.is-mission .duduq-intro-start-button {
          min-height: 72px;
          font-size: clamp(20px, 1.1vw, 23px);
        }
      }

      /*
       * Core 1.0.9 forces 215px at <=390px. On modern portrait phones the
       * mission block has enough room for a substantially larger brand mark.
       * The clamp still protects short-height devices.
       */
      @media (max-width: 560px) {
        .duduq-intro.is-mission .duduq-intro-collection {
          min-height: clamp(275px, 38vh, 310px);
        }

        .duduq-intro.is-mission .duduq-intro-collection-logo {
          height: clamp(235px, 34vh, 290px);
          max-width: 94vw;
        }
      }

      @media (max-width: 390px) {
        .duduq-intro.is-mission .duduq-intro-collection-logo {
          height: clamp(235px, 34vh, 290px);
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
    releaseModified: false,
    installed
  });
})();

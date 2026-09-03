/* =========================================================
   DUDUQ — DRAG & DROP 2.0.25 VISUAL REFINEMENT R1
   ISOLATED EXAMPLE ONLY — DOES NOT MODIFY THE OFFICIAL RELEASE

   Scope:
   - internal card layout only;
   - wider destinations and larger placed media;
   - item bank disappears completely when empty;
   - CONFIRM remains owned by the official 2.0.25 readiness logic;
   - discrete × returns a positioned item through the existing drag-to-bank path;
   - no scoring/retry/success/core/player changes.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.25-visual-r1";
  const STYLE_ID = "duduq-dd225-visual-r1";
  const REMOVE_CLASS = "duduq-dd225-vr-remove";
  const PATCHED_ATTR = "data-dd225-visual-r1";
  const BURST_PAD = 108;
  const BURST_MARGIN = 4;
  let pointerSerial = 9100;

  const CSS = `
/* === DUDUQ DD 2.0.25 — VISUAL CARD R1 / ISOLATED === */
.duduq-dd2-root[${PATCHED_ATTR}="true"] {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-arena {
  width: min(1180px, 100%) !important;
  max-width: 100% !important;
  min-width: 0 !important;
  gap: clamp(8px, 1.2vh, 14px) !important;
  padding: clamp(3px, .55vw, 7px) clamp(5px, .9vw, 11px) clamp(7px, 1.1vh, 12px) !important;
  overflow-x: clip !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-targets {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)) !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  gap: clamp(8px, 1vw, 14px) !important;
  overflow-x: clip !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-target {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  min-height: clamp(152px, 21vh, 206px) !important;
  padding: clamp(25px, 3.4vh, 33px) clamp(7px, .9vw, 11px) clamp(7px, 1vh, 11px) !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-target-head {
  min-width: 0 !important;
  min-height: clamp(58px, 8.5vh, 82px) !important;
  padding: 3px 6px !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  min-height: clamp(92px, 13vh, 126px) !important;
  display: flex !important;
  flex-flow: row nowrap !important;
  align-items: center !important;
  align-content: center !important;
  justify-content: center !important;
  gap: clamp(6px, .8vw, 10px) !important;
  padding: clamp(5px, .7vw, 8px) !important;
  overflow: hidden !important;
}

/* Positioned items stay side by side and share the target width. */
.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item-shell {
  position: relative !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: clamp(118px, 15vw, 178px) !important;
  flex: 1 1 0 !important;
  overflow: visible !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item[data-has-media="true"][data-placed="true"] {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  min-height: clamp(96px, 13vh, 136px) !important;
  padding: clamp(5px, .6vw, 7px) !important;
  gap: 4px !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item[data-has-media="true"][data-placed="true"] .duduq-dd2-item-media,
.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item-media {
  width: min(92%, 132px) !important;
  max-width: 92% !important;
  height: clamp(72px, 10.5vh, 108px) !important;
  max-height: 108px !important;
  object-fit: contain !important;
  object-position: center !important;
  flex: 0 0 auto !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item > span:not(.duduq-dd2-audio-mark) {
  max-width: 100% !important;
  font-size: clamp(11px, 1.05vw, 14px) !important;
  line-height: 1.08 !important;
  overflow-wrap: anywhere !important;
}

/* Empty bank consumes absolutely no vertical space. */
.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-bank[data-empty="true"]:not([data-vr-return-proxy="true"]) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
  overflow: hidden !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-bank[data-empty="false"] {
  min-height: 70px !important;
  padding: 7px 8px 10px !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-bank-items {
  gap: clamp(8px, 1vw, 14px) !important;
}

/* Confirm is still rendered only by the official ready state; this only compacts its slot. */
.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-actions {
  min-height: 0 !important;
  margin-top: 0 !important;
  padding-top: clamp(5px, .8vh, 8px) !important;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-confirm {
  min-height: 50px !important;
}

/* Decorative success burst cannot create horizontal scroll in the compact activity viewport. */
.duduq-engine-feedback {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}

.duduq-engine-feedback-card {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: clip;
}

.duduq-engine-feedback-copy {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

/* Small removal affordance, outside the media footprint. */
.duduq-dd2-root[${PATCHED_ATTR}="true"] .${REMOVE_CLASS} {
  position: absolute;
  top: -5px;
  right: -5px;
  z-index: 12;
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0 0 2px;
  border: 1px solid rgba(72, 89, 108, .28);
  border-radius: 999px;
  background: rgba(255,255,255,.96);
  color: #52606d;
  box-shadow: 0 2px 6px rgba(31,65,99,.14);
  font: 800 16px/1 system-ui, sans-serif;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .${REMOVE_CLASS}:hover {
  background: #f7fafc;
  color: #24384d;
}

.duduq-dd2-root[${PATCHED_ATTR}="true"] .${REMOVE_CLASS}:focus-visible {
  outline: 3px solid #111827;
  outline-offset: 2px;
}

/* Invisible hit target used only while the × routes the item through the native bank return path. */
.duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-bank[data-vr-return-proxy="true"] {
  display: flex !important;
  position: fixed !important;
  left: 3px !important;
  bottom: 3px !important;
  z-index: 2147483000 !important;
  width: 74px !important;
  height: 74px !important;
  min-width: 74px !important;
  min-height: 74px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  opacity: 0 !important;
  pointer-events: auto !important;
}

@media (max-width: 820px) {
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-arena {
    gap: 9px !important;
    padding-inline: 6px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-targets {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-target {
    min-height: 148px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone {
    min-height: 90px !important;
    gap: 6px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item-shell {
    max-width: 150px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item-media {
    height: 82px !important;
    max-height: 82px !important;
  }
}

@media (max-width: 520px) {
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-arena {
    gap: 7px !important;
    padding: 2px 4px 8px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-targets {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 7px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-target {
    min-height: 136px !important;
    padding: 23px 6px 6px !important;
    border-radius: 16px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-target-head {
    min-height: 48px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone {
    min-height: 82px !important;
    padding: 4px !important;
    gap: 5px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item-shell {
    max-width: 138px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item[data-has-media="true"][data-placed="true"] {
    min-height: 82px !important;
    padding: 4px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item-media {
    width: min(90%, 96px) !important;
    max-width: 90% !important;
    height: 62px !important;
    max-height: 62px !important;
  }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .${REMOVE_CLASS} {
    width: 21px;
    height: 21px;
    top: -4px;
    right: -4px;
    font-size: 15px;
  }
  .duduq-engine-feedback-card {
    grid-template-columns: 54px minmax(0, 1fr) !important;
    gap: 8px 10px !important;
    padding-inline: 10px !important;
  }
  .duduq-mascot[data-size="feedback"] {
    width: 50px !important;
    height: 50px !important;
  }

  /*
     The mascot burst is absolutely positioned around the mascot. Its original
     large negative inset made the burst element itself wider than the mobile
     viewport. Keep the box inside the available viewport and preserve the
     particle origin at the mascot center through variables set by sync().
  */
  .duduq-star-burst[data-origin="mascot"] {
    inset:
      var(--dd225-vr-burst-top, 0px)
      var(--dd225-vr-burst-right, 0px)
      var(--dd225-vr-burst-bottom, 0px)
      var(--dd225-vr-burst-left, 0px) !important;
    width: auto !important;
    height: auto !important;
    overflow: clip !important;
    contain: paint !important;
    pointer-events: none !important;
  }
  .duduq-star-burst[data-origin="mascot"] .duduq-star-particle {
    left: var(--dd225-vr-burst-origin-x, 50%) !important;
    top: var(--dd225-vr-burst-origin-y, 50%) !important;
  }
}

@media (max-height: 720px) and (min-width: 700px) {
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-arena { gap: 7px !important; }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-target { min-height: 132px !important; padding-top: 23px !important; }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-target-head { min-height: 44px !important; }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone { min-height: 78px !important; }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item[data-has-media="true"][data-placed="true"] { min-height: 80px !important; }
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .duduq-dd2-zone .duduq-dd2-item-media { height: 62px !important; max-height: 62px !important; }
}

@media (prefers-reduced-motion: reduce) {
  .duduq-dd2-root[${PATCHED_ATTR}="true"] .${REMOVE_CLASS} { transition: none !important; }
}
`;

  function dispatchPointer(target, type, coords, pointerId) {
    const event = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: coords.x,
      clientY: coords.y
    });
    target.dispatchEvent(event);
  }

  function returnThroughNativeBank(doc, itemButton) {
    const bank = doc.querySelector(".duduq-dd2-bank[data-dd2-bank]");
    if (!bank || !itemButton || itemButton.disabled) return false;

    bank.setAttribute("data-vr-return-proxy", "true");
    const itemRect = itemButton.getBoundingClientRect();
    const bankRect = bank.getBoundingClientRect();
    const start = { x: itemRect.left + itemRect.width / 2, y: itemRect.top + itemRect.height / 2 };
    const end = { x: bankRect.left + bankRect.width / 2, y: bankRect.top + bankRect.height / 2 };
    const pointerId = ++pointerSerial;

    const ownSetPointerCapture = Object.prototype.hasOwnProperty.call(itemButton, "setPointerCapture");
    const previousSetPointerCapture = itemButton.setPointerCapture;
    try {
      itemButton.setPointerCapture = function () {};
      dispatchPointer(itemButton, "pointerdown", start, pointerId);
      dispatchPointer(itemButton, "pointermove", end, pointerId);
      dispatchPointer(itemButton, "pointerup", end, pointerId);
    } finally {
      if (ownSetPointerCapture) itemButton.setPointerCapture = previousSetPointerCapture;
      else {
        try { delete itemButton.setPointerCapture; } catch (_) { itemButton.setPointerCapture = previousSetPointerCapture; }
      }
      bank.removeAttribute("data-vr-return-proxy");
    }
    return true;
  }

  function syncMascotBurstContainment(doc) {
    const viewportWidth = doc.documentElement.clientWidth;
    const viewportHeight = doc.documentElement.clientHeight;
    if (viewportWidth > 520 || !viewportWidth || !viewportHeight) return;

    doc.querySelectorAll('.duduq-star-burst[data-origin="mascot"]').forEach(function (burst) {
      const mascot = burst.closest(".duduq-mascot");
      if (!mascot) return;
      const rect = mascot.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const leftPad = Math.min(BURST_PAD, Math.max(0, rect.left - BURST_MARGIN));
      const rightPad = Math.min(BURST_PAD, Math.max(0, viewportWidth - rect.right - BURST_MARGIN));
      const topPad = Math.min(BURST_PAD, Math.max(0, rect.top - BURST_MARGIN));
      const bottomPad = Math.min(BURST_PAD, Math.max(0, viewportHeight - rect.bottom - BURST_MARGIN));

      burst.style.setProperty("--dd225-vr-burst-left", `${-leftPad}px`);
      burst.style.setProperty("--dd225-vr-burst-right", `${-rightPad}px`);
      burst.style.setProperty("--dd225-vr-burst-top", `${-topPad}px`);
      burst.style.setProperty("--dd225-vr-burst-bottom", `${-bottomPad}px`);
      burst.style.setProperty("--dd225-vr-burst-origin-x", `${leftPad + rect.width / 2}px`);
      burst.style.setProperty("--dd225-vr-burst-origin-y", `${topPad + rect.height / 2}px`);
    });
  }

  function feedbackIdle(doc) {
    const feedback = doc.querySelector(".duduq-engine-feedback");
    return !feedback || !feedback.getAttribute("data-state") || feedback.getAttribute("data-state") === "idle";
  }

  function sync(doc) {
    const root = doc.querySelector(".duduq-dd2-root");
    if (!root) return false;
    root.setAttribute(PATCHED_ATTR, "true");

    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      doc.head.appendChild(style);
    }

    syncMascotBurstContainment(doc);

    const idle = feedbackIdle(doc);
    const placedShells = doc.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item-shell");
    placedShells.forEach(function (shell) {
      const item = shell.querySelector(".duduq-dd2-item[data-placed=\"true\"]");
      let remove = shell.querySelector("." + REMOVE_CLASS);
      const removable = Boolean(item && !item.disabled && idle);

      if (!removable) {
        if (remove) remove.remove();
        return;
      }
      if (remove) return;

      remove = doc.createElement("button");
      remove.type = "button";
      remove.className = REMOVE_CLASS;
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remover item e devolver para Itens");
      remove.setAttribute("title", "Devolver para Itens");
      remove.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        event.stopPropagation();
      });
      remove.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        returnThroughNativeBank(doc, item);
        window.setTimeout(function () { sync(doc); }, 0);
      });
      shell.appendChild(remove);
    });

    doc.querySelectorAll("." + REMOVE_CLASS).forEach(function (remove) {
      if (!remove.closest(".duduq-dd2-zone .duduq-dd2-item-shell")) remove.remove();
    });
    return true;
  }

  function installFrame(frame) {
    if (!frame) return;
    function install() {
      let doc;
      try { doc = frame.contentDocument; } catch (_) { return; }
      if (!doc || !doc.documentElement) return;
      if (doc.__DD225_VISUAL_R1_OBSERVER__) {
        sync(doc);
        return;
      }
      const observer = new MutationObserver(function () { sync(doc); });
      observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-empty", "data-state", "data-placed", "disabled"] });
      try { Object.defineProperty(doc, "__DD225_VISUAL_R1_OBSERVER__", { value: observer, configurable: true }); }
      catch (_) { doc.__DD225_VISUAL_R1_OBSERVER__ = observer; }
      sync(doc);
    }
    frame.addEventListener("load", function () { window.setTimeout(install, 0); }, { passive: true });
    window.setTimeout(install, 0);
    window.setTimeout(install, 60);
    window.setTimeout(install, 240);
  }

  function watchMount(mount) {
    if (!mount) return;
    const attach = function () {
      mount.querySelectorAll("iframe").forEach(installFrame);
    };
    attach();
    if (mount.__DD225_VISUAL_R1_MOUNT_OBSERVER__) return;
    const observer = new MutationObserver(attach);
    observer.observe(mount, { childList: true, subtree: true });
    try { Object.defineProperty(mount, "__DD225_VISUAL_R1_MOUNT_OBSERVER__", { value: observer, configurable: true }); }
    catch (_) { mount.__DD225_VISUAL_R1_MOUNT_OBSERVER__ = observer; }
  }

  window.DD225VisualRefinementR1 = Object.freeze({
    version: VERSION,
    watchMount,
    syncDocument: sync
  });
})();

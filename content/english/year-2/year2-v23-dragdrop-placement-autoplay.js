/* DUDUQ English Year 2 — Drag & Drop selected-placement autoplay bridge
   Year-2-only parent-page bridge. Keeps Canary R143 and Drag & Drop 2.0.22 immutable.

   Contract:
   - when a single-target listening choice enters the drop-zone, its sound is heard once;
   - native pointer drop already starts the item audio in DD2 2.0.22, so this layer does
     not click replay when that audio is already active;
   - tap/click placement has no native autoplay, so this layer invokes the already
     homologated selected-choice replay control exactly once;
   - while the automatic instruction audio is playing, option-audio controls stay
     available so the learner can listen/switch alternatives without placing an answer;
   - answer cards keep the Host disabled state during the automatic instruction audio;
   - X removal and wrong-answer return do not autoplay;
   - reselecting after the target becomes empty may autoplay again;
   - no scoring, answer mapping, release source or Canary source is modified.
*/
(function () {
  "use strict";

  const VERSION = "1.1.0-year2-dd-placement-autoplay-option-audio-unlock";
  const FRAME_WIRED = "data-duduq-year2-placement-autoplay-wired";
  const INNER_OBSERVER = "__DUDUQ_YEAR2_PLACEMENT_AUTOPLAY_OBSERVER__";
  const ROOT_LAST = "__DUDUQ_YEAR2_PLACEMENT_AUTOPLAY_LAST__";
  const ROOT_TIMER = "__DUDUQ_YEAR2_PLACEMENT_AUTOPLAY_TIMER__";
  const INSTRUCTION_UNLOCK = "data-duduq-year2-instruction-audio-unlocked";

  if (window.__DUDUQ_YEAR2_DD_PLACEMENT_AUTOPLAY_BRIDGE__) return;

  function escapeAttr(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function clearPending(root) {
    const timer = root && root[ROOT_TIMER];
    if (timer) {
      window.clearTimeout(timer);
      root[ROOT_TIMER] = null;
    }
  }

  function syncOptionAudioDuringInstruction(root) {
    if (!root?.querySelector) return;
    const target = root.querySelector('.duduq-dd2-target[data-single-target-choice="true"]');
    if (!target) return;

    const instructionButton = root.querySelector(
      '.duduq-dd2-instruction .duduq-ts-audio-button[data-playing="true"]'
    );
    const arena = root.querySelector('.duduq-dd2-arena');
    const instructionPlaying = Boolean(instructionButton);
    const mechanicDisabled = arena?.getAttribute('data-disabled') === 'true';

    root.querySelectorAll('.duduq-dd2-item-audio').forEach(function (button) {
      const wasUnlocked = button.getAttribute(INSTRUCTION_UNLOCK) === 'true';

      if (instructionPlaying && mechanicDisabled) {
        if (button.disabled) button.disabled = false;
        if (!wasUnlocked) button.setAttribute(INSTRUCTION_UNLOCK, 'true');
        return;
      }

      if (wasUnlocked) {
        button.removeAttribute(INSTRUCTION_UNLOCK);
        // If the Host is still disabled after instruction playback stopped, the
        // reason is no longer the instruction-only lock (pause/transition/etc.).
        if (mechanicDisabled) button.disabled = true;
      }
    });
  }

  function syncRoot(root) {
    if (!root?.querySelector) return;

    syncOptionAudioDuringInstruction(root);

    const target = root.querySelector('.duduq-dd2-target[data-single-target-choice="true"]');
    if (!target) return;

    const placed = target.querySelector('.duduq-dd2-item[data-placed="true"][data-dd2-item-id]');
    if (!placed) {
      clearPending(root);
      root[ROOT_LAST] = null;
      return;
    }

    const itemId = placed.getAttribute("data-dd2-item-id");
    if (!itemId || root[ROOT_LAST] === itemId || root[ROOT_TIMER]) return;

    root[ROOT_TIMER] = window.setTimeout(function () {
      root[ROOT_TIMER] = null;

      const safeId = escapeAttr(itemId);
      const stillPlaced = target.querySelector(
        `.duduq-dd2-item[data-placed="true"][data-dd2-item-id="${safeId}"]`
      );
      if (!stillPlaced) return;

      const replay = target.querySelector(
        `.duduq-dd2-placed-replay[data-dd2-placed-replay-item-id="${safeId}"]`
      );
      // During retry/transition the selected replay is intentionally absent.
      if (!replay) return;

      // Mark before invoking replay so the observer triggered by audio-state changes
      // cannot enqueue a second playback for the same placement.
      root[ROOT_LAST] = itemId;

      // Pointer drop in DD2 2.0.22 already calls playValueAudio(..., true).
      // Only tap/click placement needs the replay fallback.
      if (replay.getAttribute("data-dd2-replay-playing") !== "true") {
        replay.click();
      }
    }, 120);
  }

  function syncDocument(doc) {
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll(".duduq-dd2-root").forEach(syncRoot);
  }

  function wireDocument(doc) {
    if (!doc?.documentElement) return;
    syncDocument(doc);
    if (doc[INNER_OBSERVER]) return;

    const observer = new MutationObserver(function () {
      syncDocument(doc);
    });
    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-placed",
        "data-dd2-replay-playing",
        "data-wrong",
        "data-playing",
        "data-disabled",
        "disabled"
      ]
    });

    try {
      Object.defineProperty(doc, INNER_OBSERVER, { value: observer, configurable: true });
    } catch (_) {
      doc[INNER_OBSERVER] = observer;
    }
  }

  function inject(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try {
      wireDocument(frame.contentDocument);
    } catch (_) {}
  }

  function wireFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    inject(frame);
    if (frame.hasAttribute(FRAME_WIRED)) return;
    frame.setAttribute(FRAME_WIRED, "true");
    frame.addEventListener("load", function () {
      inject(frame);
    });
  }

  function apply() {
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

  window.__DUDUQ_YEAR2_DD_PLACEMENT_AUTOPLAY_BRIDGE__ = Object.freeze({
    version: VERSION,
    scope: "english-year-2",
    targetRelease: "2.0.22",
    releaseModified: false,
    canaryModified: false,
    usesNativeSelectedReplay: true,
    selectedChoicePlacementAutoPlaysAudioOnce: true,
    autoplaySources: "drop-native+tap-replay-fallback",
    avoidsDoublePlayWhenNativeDropAlreadyPlaying: true,
    optionAudioAvailableDuringInstructionPlayback: true,
    instructionPlaybackStillLocksAnswerPlacement: true,
    removalDoesNotAutoplay: true,
    retryReturnDoesNotAutoplay: true
  });
})();
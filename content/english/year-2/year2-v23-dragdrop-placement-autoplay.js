/* DUDUQ English Year 2 — Drag & Drop selected-placement autoplay coordinator
   Year-2-only parent-page bridge. Keeps Canary R143 and Drag & Drop 2.0.22 immutable.

   Contract:
   - when a single-target listening choice enters the drop-zone, its sound is heard once;
   - native pointer drop already starts the item audio in DD2 2.0.22;
   - tap/click placement starts the item audio synchronously inside the Year-2 confirm-any
     bridge so browser user activation is preserved;
   - this coordinator never performs a delayed synthetic replay, avoiding duplicate TTS;
   - while automatic instruction audio is playing, option-audio controls stay available
     so the learner can listen/switch alternatives without placing an answer;
   - answer cards keep the Host disabled state during the automatic instruction audio;
   - X removal and wrong-answer return do not autoplay;
   - reselecting after the target becomes empty may autoplay again through the native path;
   - no scoring, answer mapping, release source or Canary source is modified.
*/
(function () {
  "use strict";

  const VERSION = "1.3.0-year2-dd-placement-autoplay-native-gesture";
  const FRAME_WIRED = "data-duduq-year2-placement-autoplay-wired";
  const INNER_OBSERVER = "__DUDUQ_YEAR2_PLACEMENT_AUTOPLAY_OBSERVER__";
  const INSTRUCTION_UNLOCK = "data-duduq-year2-instruction-audio-unlocked";

  if (window.__DUDUQ_YEAR2_DD_PLACEMENT_AUTOPLAY_BRIDGE__) return;

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
    usesNativeForceRestartTriggerForTap: false,
    selectedChoicePlacementAutoPlaysAudioOnce: true,
    autoplaySources: "drop-native+tap-native-gesture",
    avoidsDoublePlayWhenNativeDropAlreadyPlaying: true,
    avoidsDelayedSyntheticReplay: true,
    optionAudioAvailableDuringInstructionPlayback: true,
    instructionPlaybackStillLocksAnswerPlacement: true,
    removalDoesNotAutoplay: true,
    retryReturnDoesNotAutoplay: true
  });
})();
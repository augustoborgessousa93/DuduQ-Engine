import { QuestionPanel } from "./index.js";
import { DuduQCanonicalAudioButton } from "./duduq-canonical-audio-button.js";

/** The only runtime constructor for a DuduQ activity question/instruction HUD. */
export function DuduQCanonicalQuestionHUD({ root, eyebrow = "", question = "", audio = "", onAudio, audioDisabled = false, instructionTextEn = "", instructionTextPt = "", instructionAudioEnId = "", instructionAudioPtId = "", postInstructionStimulusAudioIds = [], postInstructionStimulusAudioEnIds = [], postInstructionStimulusAudioPtIds = [], instructionPlaybackSequence = [], audioAriaLabel = "Play instruction in English, then Portuguese" } = {}) {
  const panel = root || document.createElement("section");
  panel.__duduqInstructionAudioCleanup?.();
  if (!root) panel.innerHTML = `<div class="question-copy"><p class="question-label"></p><h2 class="question-prompt"></h2></div>`;
  panel.classList.add("duduq-canonical-question-hud", "question-panel");
  const prompt = panel.querySelector(".question-prompt");
  prompt.id = `duduq-question-${Math.random().toString(36).slice(2)}`;
  panel.setAttribute("aria-labelledby", prompt.id);
  panel.dataset.component = "DUDUQ_CANONICAL_QUESTION_HUD";
  QuestionPanel(panel);
  let visualShadow = panel.querySelector(":scope > .duduq-question-panel-shadow");
  if (!visualShadow) {
    visualShadow = document.createElement("div");
    visualShadow.className = "duduq-question-panel-shadow";
    visualShadow.setAttribute("aria-hidden", "true");
    panel.prepend(visualShadow);
  }
  const inheritedInstruction = window.DuduQInstructionAudioConfig || {};
  const textEn = String(instructionTextEn || inheritedInstruction.instructionTextEn || "").trim();
  const textPt = String(instructionTextPt || inheritedInstruction.instructionTextPt || "").trim();
  const audioEnId = String(instructionAudioEnId || inheritedInstruction.instructionAudioEnId || "").trim();
  const audioPtId = String(instructionAudioPtId || inheritedInstruction.instructionAudioPtId || "").trim();
  const playbackSequence = Array.isArray(instructionPlaybackSequence)
    ? instructionPlaybackSequence.map(step => ({ audioId: String(step?.audioId || "").trim(), locale: step?.locale === "pt-BR" ? "pt-BR" : "en-US" })).filter(step => step.audioId)
    : [];
    const requiredStimulusAudioIds = playbackSequence.length ? [] : Array.isArray(postInstructionStimulusAudioIds) && postInstructionStimulusAudioIds.length
      ? postInstructionStimulusAudioIds.map(id => String(id || "").trim()).filter(Boolean)
      : Array.isArray(inheritedInstruction.postInstructionStimulusAudioIds)
        ? inheritedInstruction.postInstructionStimulusAudioIds.map(id => String(id || "").trim()).filter(Boolean)
      : [];
    const stimulusPauseAfterMs = Math.max(0, Math.min(1200, Number(inheritedInstruction.postInstructionStimulusPauseAfterMs) || 0));
    const stimulusEnAudioIds = playbackSequence.length
      ? playbackSequence.filter(step => step.locale === "en-US").map(step => step.audioId)
      : (postInstructionStimulusAudioEnIds.length ? postInstructionStimulusAudioEnIds : inheritedInstruction.postInstructionStimulusAudioEnIds || []).map(id => String(id || "").trim()).filter(Boolean);
    const stimulusPtAudioIds = playbackSequence.length
      ? playbackSequence.filter(step => step.locale === "pt-BR").map(step => step.audioId)
      : (postInstructionStimulusAudioPtIds.length ? postInstructionStimulusAudioPtIds : inheritedInstruction.postInstructionStimulusAudioPtIds || []).map(id => String(id || "").trim()).filter(Boolean);
  const instructionAudioPending = String(inheritedInstruction.instructionAudioStatus || "").startsWith("BLOCKED");
  const hasBilingualContract = !instructionAudioPending && Boolean(textEn || textPt || audioEnId || audioPtId);
  const bilingual = Boolean(textEn && textPt && audioEnId && audioPtId);
  if (hasBilingualContract && !bilingual) throw new Error("DUDUQ_BILINGUAL_INSTRUCTION_CONTRACT_INCOMPLETE");
  panel.querySelector(".question-label").textContent = bilingual ? textPt : eyebrow;
  prompt.textContent = bilingual ? textEn : question;

  if (bilingual) {
    const contentAudio = window.DuduQContentAudio || window.parent?.DuduQContentAudio;
    panel.classList.add("duduq-question-hud--bilingual");
    panel.dataset.instructionAudioState = "idle";
    panel.dataset.instructionAudioEnId = audioEnId;
    panel.dataset.instructionAudioPtId = audioPtId;
    panel.querySelector(".audio-button")?.remove();
    panel.querySelector(".duduq-instruction-audio-controls")?.remove();
    panel.querySelector(".duduq-instruction-playing-flag")?.remove();

    const gameRoot = panel.closest(".game-screen") || document.querySelector("#game.game-screen") || panel.parentElement || document.body;
    const flagPt = document.createElement("span");
    flagPt.className = "duduq-instruction-playing-flag duduq-instruction-playing-flag--pt";
    flagPt.dataset.language = "pt";
    flagPt.dataset.penpotBoardId = "513c58a1-4e7b-80d9-8008-c2279318b240";
    flagPt.dataset.penpotMediaId = "91396aad-60c8-808b-8008-c17eb60bfd53";
    flagPt.hidden = true;
    flagPt.setAttribute("aria-hidden", "true");
    flagPt.innerHTML = `<img class="duduq-instruction-flag-art duduq-instruction-flag-br" src="/assets/ui/language-flags/brazil.png" alt="" draggable="false">`;
    const flagEn = document.createElement("span");
    flagEn.className = "duduq-instruction-playing-flag duduq-instruction-playing-flag--en";
    flagEn.dataset.language = "en";
    flagEn.dataset.penpotBoardId = "6dd12e1a-6b16-80cd-8008-c18096ace1c7";
    flagEn.dataset.penpotMediaId = "91396aad-60c8-808b-8008-c17f4ed7c347";
    flagEn.hidden = true;
    flagEn.setAttribute("aria-hidden", "true");
    flagEn.innerHTML = `<img class="duduq-instruction-flag-art duduq-instruction-flag-us" src="/assets/ui/language-flags/united-states.png" alt="" draggable="false">`;
    // The instruction indicator tracks the live question card and the
    // available page/container space; it remains visible throughout EN/PT.
    document.body.append(flagPt, flagEn);

    const controls = document.createElement("div");
    controls.className = "duduq-instruction-audio-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Instrução em inglês e português");
    let activeRequest = 0;
    let pauseTimer = null;
    let requiredAudioTimer = null;
    let audioButton;
    let activeQuestionCleanup = null;
    let resizeObserver = null;
    let gestureRetryCleanup = null;
    const promptKey = JSON.stringify([inheritedInstruction.itemId || "", textEn, textPt, audioEnId, audioPtId, requiredStimulusAudioIds, stimulusEnAudioIds, stimulusPtAudioIds, playbackSequence]);
    const positionFlags = () => {
      if (!panel.isConnected || !gameRoot.isConnected) return;
      const panelRect = panel.getBoundingClientRect();
      if (!panelRect.width || !panelRect.height) return;
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      const rootRect = gameRoot.getBoundingClientRect();
      const containerRect = {
        left: Math.max(0, rootRect.left), right: Math.min(viewportWidth, rootRect.right),
        top: Math.max(0, rootRect.top), bottom: Math.min(viewportHeight, rootRect.bottom)
      };
      const bounds = {
        left: Math.max(0, containerRect.left),
        right: Math.min(viewportWidth, containerRect.right),
        top: Math.max(0, containerRect.top),
        bottom: Math.min(viewportHeight, containerRect.bottom)
      };
      // CSS preserves the responsive token as a calc()/clamp() expression;
      // parseFloat would silently turn that expression into the desktop
      // fallback (1). Resolve the same canonical formula against #game's
      // measured container dimensions for the separately positioned flags.
      const uiScale = Math.max(.3, Math.min(1, rootRect.width / 1080, rootRect.height / 720));
      const gap = Math.max(8, Math.round(20 * uiScale));
      const edge = Math.max(6, Math.round(16 * uiScale));
      const availableRight = Math.max(0, bounds.right - panelRect.right - edge);
      const size = Math.max(24, Math.min(90, Math.round(90 * uiScale)));
      const inset = Math.round(size * .1);
      const imageHeight = size;
      const header = gameRoot.querySelector(".duduq-canonical-header-hud, [data-component=\"DUDUQ_CANONICAL_HEADER_HUD\"]");
      const audioControl = panel.querySelector(".duduq-instruction-audio-controls, .audio-button");
      const headerRect = header?.getBoundingClientRect();
      const audioRect = audioControl?.getBoundingClientRect();
      const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
      const makeCandidate = (left, imageTop) => ({
        left,
        top: imageTop - inset,
        image: { left, right: left + size, top: imageTop, bottom: imageTop + imageHeight }
      });
      const rightLeft = panelRect.right + gap;
      const preferredImageTop = Math.max(
        panelRect.top + (panelRect.height - imageHeight) / 2,
        headerRect?.bottom ? headerRect.bottom + gap : bounds.top + edge
      );
      let candidate = null;
      if (availableRight >= size + gap && rightLeft + size <= bounds.right) {
        const imageTop = clamp(preferredImageTop, bounds.top + edge, bounds.bottom - imageHeight - edge);
        const rightCandidate = makeCandidate(rightLeft, imageTop);
        if (!intersects(rightCandidate.image, headerRect) && !intersects(rightCandidate.image, audioRect)) candidate = rightCandidate;
      }

      // In compact embeds, retain the visible language indicator and place it
      // immediately below the instruction card rather than hiding it or
      // allowing it to collide with the header/audio control.
      if (!candidate) {
        const left = clamp(panelRect.right - size, bounds.left + edge, bounds.right - size - edge);
        let imageTop = Math.max(panelRect.bottom + gap, audioRect?.bottom ? audioRect.bottom + gap : 0);
        imageTop = clamp(imageTop, bounds.top + edge, bounds.bottom - imageHeight - edge);
        let below = makeCandidate(left, imageTop);
        if (intersects(below.image, headerRect) || intersects(below.image, audioRect)) {
          imageTop = clamp((headerRect?.top ?? panelRect.top) - gap - imageHeight, bounds.top + edge, bounds.bottom - imageHeight - edge);
          below = makeCandidate(left, imageTop);
        }
        candidate = below;
      }
      for (const flag of [flagPt, flagEn]) {
        flag.style.setProperty("position", "fixed", "important");
        flag.style.left = `${candidate.left}px`;
        flag.style.top = `${candidate.top}px`;
        flag.style.width = `${size}px`;
        flag.style.height = `${size * 1.2}px`;
        flag.style.setProperty("--duduq-instruction-flag-size", `${size}px`);
        flag.style.setProperty("--duduq-instruction-flag-inset", `${inset}px`);
      }
    };
    const scheduleFlagPosition = () => window.requestAnimationFrame(positionFlags);
    const clearGestureRetry = () => {
      gestureRetryCleanup?.();
      gestureRetryCleanup = null;
    };
    const installGestureRetry = () => {
      clearGestureRetry();
      const resumeOnGesture = event => {
        if (event.target instanceof Element && event.target.closest(".audio-button")) {
          // The canonical control handles its own activation below. Remove
          // this one-shot recovery hook so the next gameplay gesture cannot
          // unexpectedly replay instructions after READY.
          clearGestureRetry();
          return;
        }
        clearGestureRetry();
        if (audioButton?.isConnected && panel.dataset.questionAudioPrompt === promptKey) {
          panel.dataset.questionAudioAutoplayState = "playing-after-gesture";
          audioButton.playAudio().catch(() => {});
        }
      };
      window.addEventListener("pointerdown", resumeOnGesture, true);
      window.addEventListener("keydown", resumeOnGesture, true);
      gestureRetryCleanup = () => {
        window.removeEventListener("pointerdown", resumeOnGesture, true);
        window.removeEventListener("keydown", resumeOnGesture, true);
      };
    };
    const setState = (state) => {
      panel.dataset.instructionAudioState = state;
      panel.dataset.activeInstructionLanguage = state === "playing_en" ? "en" : state === "playing_pt" ? "pt" : "";
      const languageIsPlaying = state === "playing_en" || state === "playing_pt";
      // Compute the safe placement before revealing either indicator. This
      // avoids a one-frame overlap while the next animation frame is queued.
      if (languageIsPlaying) positionFlags();
      flagPt.hidden = state !== "playing_pt";
      flagEn.hidden = state !== "playing_en";
      if (!languageIsPlaying && state !== "ready" && state !== "locked") scheduleFlagPosition();
      if (audioButton) {
        const activelyPlaying = ["playing_en", "playing_pt", "playing_stimulus"].includes(state);
        audioButton.setAudioState?.(activelyPlaying ? "playing" : "idle");
        audioButton.setAttribute("aria-busy", String(activelyPlaying));
      }
    };
    const onPedagogicalLanguageState = event => {
      const language = event.detail?.language;
      if (event.detail?.active) setState(language === "pt-BR" ? "playing_pt" : "playing_en");
      else setState("ready");
    };
    window.addEventListener("duduq:pedagogical-audio-language", onPedagogicalLanguageState);
    let gateState = "LOCKED";
    let lastUnlockedEvidenceCount = 0;
    const gateSelector = 'button:not(.audio-button):not(.fullscreen-button), [role="button"], [draggable="true"], [data-interactive], .bubble-pop-playable, .dnd-multimedia-image-option, .dnd-multimedia-question-group, .dnd-multimedia-audio-item, .target-shooter-target, .target';
    const savedGate = new Map();
    const setGateState = state => {
      const previousState = gateState;
      gateState = state;
      gameRoot.dataset.duduqInteractionState = state;
      panel.dataset.duduqInteractionState = state;
      for (const element of gameRoot.querySelectorAll(gateSelector)) {
        if (panel.contains(element) || element.matches(".fullscreen-button")) continue;
        if (!savedGate.has(element)) savedGate.set(element, { inert: element.inert, aria: element.getAttribute("aria-disabled"), locked: element.classList.contains("duduq-interaction-locked") });
        const locked = state !== "READY" && state !== "AWAITING_CONTINUE" && state !== "AWAITING_RETRY";
        if (element.matches(".feedback-ribbon .feedback-action") && (state === "AWAITING_CONTINUE" || state === "AWAITING_RETRY")) {
          element.inert = false;
          element.setAttribute("aria-disabled", "false");
          element.classList.remove("duduq-interaction-locked");
          continue;
        }
        element.inert = locked;
        element.setAttribute("aria-disabled", String(locked));
        element.classList.toggle("duduq-interaction-locked", locked);
      }
      if (state !== "READY") lastUnlockedEvidenceCount = 0;
      if (state === "READY") {
        const eligible = [...gameRoot.querySelectorAll(gateSelector)].filter(element =>
          !panel.contains(element) && !element.matches(".fullscreen-button")
        );
        const unlocked = eligible.filter(element => !element.inert && element.getAttribute("aria-disabled") !== "true");
        if (previousState !== "READY") window.dispatchEvent(new CustomEvent("duduq:required-audio-stage", { detail: {
          stage: "READY", state: "complete", interactionUnlocked: unlocked.length > 0, unlockedElementCount: unlocked.length,
          questionId: inheritedInstruction.itemId || ""
        } }));
        if (unlocked.length > lastUnlockedEvidenceCount) {
          lastUnlockedEvidenceCount = unlocked.length;
          window.dispatchEvent(new CustomEvent("duduq:required-audio-stage", { detail: {
            stage: "INTERACTION_UNLOCKED", state: "complete", interactionUnlocked: true, unlockedElementCount: unlocked.length,
            questionId: inheritedInstruction.itemId || ""
          } }));
        }
      }
    };
    const gateMutationObserver = new MutationObserver(() => setGateState(gateState));
    gateMutationObserver.observe(gameRoot, { childList: true, subtree: true });
    const blockGameplayInput = event => {
      if (gateState === "READY" || event.target.closest?.(".fullscreen-button") || ((gateState === "AWAITING_CONTINUE" || gateState === "AWAITING_RETRY") && event.target.closest?.(".feedback-ribbon .feedback-action")) || panel.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const gatedEvents = ["pointerdown", "pointerup", "click", "keydown", "keyup", "touchstart", "dragstart", "dragover", "drop"];
    gatedEvents.forEach(type => gameRoot.addEventListener(type, blockGameplayInput, true));
    let observedFeedback = null;
    let feedbackTimer = null;
    let feedbackToken = 0;
    const releaseFeedback = (feedback, token) => {
      if (token !== feedbackToken || !feedback?.isConnected || feedback.hidden) return;
      if (feedbackTimer !== null) window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
      feedback.__duduqFeedbackCleanup?.();
      const nextState = feedback.dataset.feedback === "correct" ? "AWAITING_CONTINUE" : "AWAITING_RETRY";
      const action = feedback.querySelector(".feedback-action");
      if (action) { action.hidden = false; action.disabled = false; action.setAttribute("aria-disabled", "false"); }
      setGateState(nextState);
      feedback.dataset.duduqFeedbackGate = "RELEASED";
    };
    const beginFeedbackGate = feedback => {
      if (!feedback || feedback.hidden || !feedback.dataset.feedback || feedback === observedFeedback) return;
      observedFeedback = feedback;
      const token = ++feedbackToken;
      const expectedKind = feedback.dataset.feedback === "correct" ? "correct" : "error";
      // Both Drag & Drop variants opt into immediate feedback. Other mechanics
      // retain their original required-audio gate and event-driven unlock.
      if (/^\\/play\\/drag-drop(?:-multimedia)?\\//.test(window.location.pathname)) {
        releaseFeedback(feedback, token);
        return;
      }
      const action = feedback.querySelector(".feedback-action");
      if (action) { action.hidden = true; action.disabled = true; action.setAttribute("aria-disabled", "true"); }
      feedback.dataset.duduqFeedbackGate = "WAITING_FOR_AUDIO";
      setGateState("FEEDBACK_PLAYING");
      // Lost-event watchdog only; successful playback replaces this with a
      // deadline derived from the actual media duration below.
      feedbackTimer = window.setTimeout(() => releaseFeedback(feedback, token), 15000);
      const finish = event => {
        const detail = event.detail || {};
        if (detail.kind !== expectedKind || token !== feedbackToken) return;
        if (detail.state === "loading" || detail.state === "playing") {
          if (feedbackTimer !== null) window.clearTimeout(feedbackTimer);
          const duration = Number(detail.duration) > 0 ? Number(detail.duration) * 1000 : 0;
          feedbackTimer = window.setTimeout(() => releaseFeedback(feedback, token), Math.max(3000, Math.min(15000, duration + 1500)));
        } else if (["ended", "error", "stopped"].includes(detail.state)) releaseFeedback(feedback, token);
      };
      window.addEventListener("duduq:feedback-audio-state", finish);
      feedback.__duduqFeedbackCleanup = () => window.removeEventListener("duduq:feedback-audio-state", finish);
      const activeVoice = window.DuduqSound?.getVoiceStatus?.();
      if (activeVoice?.kind === expectedKind && ["loading", "playing"].includes(activeVoice.state)) finish({ detail: activeVoice });
      const recentPedagogicalFeedback = window.__DUDUQ_LAST_FEEDBACK_AUDIO__;
      if (recentPedagogicalFeedback?.kind === expectedKind && recentPedagogicalFeedback.state === "ended" && Date.now() - recentPedagogicalFeedback.timestamp < 2000) {
        releaseFeedback(feedback, token);
      }
    };
    const feedbackObserver = new MutationObserver(() => {
      const activeFeedback = [...gameRoot.querySelectorAll(".feedback-ribbon")].find(feedback => !feedback.hidden && feedback.dataset.feedback);
      if (activeFeedback) beginFeedbackGate(activeFeedback);
      else if (observedFeedback) {
        observedFeedback.__duduqFeedbackCleanup?.();
        observedFeedback = null;
        feedbackToken += 1;
        if (feedbackTimer !== null) window.clearTimeout(feedbackTimer);
        feedbackTimer = null;
        setGateState("READY");
      }
    });
    feedbackObserver.observe(gameRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "data-feedback"] });
    setGateState("LOCKED");
    const playSequence = async () => {
      if (audioDisabled || !contentAudio?.playVoice || (!playbackSequence.length && (!audioEnId || !audioPtId))) return false;
      const request = ++activeRequest;
      const onQuestionChange = () => { if (request === activeRequest) stopSequence(); };
      activeQuestionCleanup = onQuestionChange;
      window.addEventListener("duduq:questionchange", onQuestionChange);
      const onPlaybackState = event => {
        if (request !== activeRequest || event.detail?.state !== "playing") return;
        const audioId = event.detail.audioId;
        if (playbackSequence.length) {
          const activeStep = playbackSequence.find(step => step.audioId === audioId);
          if (activeStep) setState(activeStep.locale === "pt-BR" ? "playing_pt" : "playing_en");
        }
        else if (audioId === audioPtId || stimulusPtAudioIds.includes(audioId)) setState("playing_pt");
        else if (audioId === audioEnId || stimulusEnAudioIds.includes(audioId)) setState("playing_en");
        else if (requiredStimulusAudioIds.includes(audioId)) setState("playing_stimulus");
      };
      window.addEventListener("duduq:voice-state", onPlaybackState);
      if (pauseTimer !== null) window.clearTimeout(pauseTimer);
      pauseTimer = null;
      contentAudio.stopVoice?.();
      let sequenceCompleted = false;
      const stageForStimulus = audioId => stimulusPtAudioIds.includes(audioId) ? "TARGET_SETUP_PT" :
        stimulusEnAudioIds.includes(audioId) ? "TARGET_EN" : "TARGET_STIMULUS";
      const playRequiredAudio = async (audioId, stage, loadingState) => {
        if (!audioId) {
          window.dispatchEvent(new CustomEvent("duduq:required-audio-stage", { detail: {
            stage, state: "error", error: "MISSING_AUDIO_ID", questionId: inheritedInstruction.itemId || ""
          } }));
          panel.dataset.questionAudioErrorStage = stage;
          return null;
        }
        setState(loadingState);
        window.dispatchEvent(new CustomEvent("duduq:required-audio-stage", { detail: {
          stage, state: "started", audioId, questionId: inheritedInstruction.itemId || ""
        } }));
        let result;
        try {
          result = await Promise.race([
            Promise.resolve().then(() => contentAudio.playVoice(audioId)),
            new Promise(resolve => { requiredAudioTimer = window.setTimeout(() => resolve({ status: "TIMEOUT" }), 15000); })
          ]);
        } catch (error) {
          result = { status: "PLAYBACK_ERROR", error: error?.message || String(error) };
        } finally {
          if (requiredAudioTimer !== null) window.clearTimeout(requiredAudioTimer);
          requiredAudioTimer = null;
        }
        if (request !== activeRequest) return null;
        if (result?.status !== "READY" || result?.playback?.status !== "ended") {
          if (result?.status === "TIMEOUT") contentAudio.stopVoice?.();
          panel.dataset.questionAudioErrorStage = stage;
          panel.dataset.questionAudioError = result?.status || "UNKNOWN_AUDIO_RESULT";
          setState("audio_error");
          setGateState("AUDIO_RECOVERABLE");
          audioButton.setAudioState?.("idle");
          audioButton.setAttribute("aria-label", `Retry required audio: ${stage} (${result?.error || result?.status || "UNKNOWN_AUDIO_RESULT"})`);
          window.dispatchEvent(new CustomEvent("duduq:required-audio-stage", { detail: {
            stage, state: "error", audioId, error: result?.error || result?.status || "UNKNOWN_AUDIO_RESULT",
            questionId: inheritedInstruction.itemId || "", recoverable: true
          } }));
          return null;
        }
        delete panel.dataset.questionAudioErrorStage;
        delete panel.dataset.questionAudioError;
        window.dispatchEvent(new CustomEvent("duduq:required-audio-stage", { detail: {
          stage, state: "complete", audioId, questionId: inheritedInstruction.itemId || ""
        } }));
        return result;
      };
      try {
        setGateState("LOCKED");
        delete panel.dataset.questionAudioErrorStage;
        delete panel.dataset.questionAudioError;
        audioButton.setAttribute("aria-label", audioAriaLabel);
        if (playbackSequence.length) {
          for (const [index, step] of playbackSequence.entries()) {
            const stage = index === 0 ? "INSTRUCTION_EN" : index === 1 ? "INSTRUCTION_PT" : "TARGET_STIMULUS";
            const playback = await playRequiredAudio(step.audioId, stage, step.locale === "pt-BR" ? "loading_pt" : "loading_en");
            if (request !== activeRequest || !playback) return false;
            if (index < playbackSequence.length - 1) {
              await new Promise(resolve => { pauseTimer = window.setTimeout(() => { pauseTimer = null; resolve(); }, 240); });
              if (request !== activeRequest) return false;
            }
          }
          sequenceCompleted = request === activeRequest;
          return sequenceCompleted;
        }
        // Keep both flags hidden until the shared audio owner emits the real
        // media `playing` event for the canonical English asset.
        const english = await playRequiredAudio(audioEnId, "INSTRUCTION_EN", "loading_en");
        if (request !== activeRequest || !english) return false;
        // EN has ended; keep both flags hidden during the handoff pause. The
        // Brazil flag appears only when the Portuguese media really starts.
        setState("loading_pt");
        await new Promise(resolve => { pauseTimer = window.setTimeout(() => { pauseTimer = null; resolve(); }, 240); });
        if (request !== activeRequest) return false;
        const portuguese = await playRequiredAudio(audioPtId, "INSTRUCTION_PT", "loading_pt");
        if (request !== activeRequest || !portuguese) return false;
        if (!requiredStimulusAudioIds.length) { sequenceCompleted = true; return true; }
        setState("playing_stimulus");
        audioButton.setAudioState?.("playing");
        audioButton.setAttribute("aria-busy", "true");
        await new Promise(resolve => { pauseTimer = window.setTimeout(() => { pauseTimer = null; resolve(); }, 320); });
        if (request !== activeRequest) return false;
        let stimulusIndex = 0;
        for (const stimulusAudioId of requiredStimulusAudioIds) {
          const stage = stageForStimulus(stimulusAudioId);
          const stimulusState = stimulusPtAudioIds.includes(stimulusAudioId) ? "loading_pt" : stimulusEnAudioIds.includes(stimulusAudioId) ? "loading_en" : "playing_stimulus";
          const stimulus = await playRequiredAudio(stimulusAudioId, stage, stimulusState);
          if (request !== activeRequest || !stimulus) return false;
          if (stimulusPauseAfterMs && stimulusIndex < requiredStimulusAudioIds.length - 1) {
            await new Promise(resolve => { pauseTimer = window.setTimeout(() => { pauseTimer = null; resolve(); }, stimulusPauseAfterMs); });
            if (request !== activeRequest) return false;
          }
          stimulusIndex += 1;
        }
        sequenceCompleted = request === activeRequest;
        return sequenceCompleted;
      } finally {
        if (request === activeRequest) {
          const recoverableAudioError = !sequenceCompleted && Boolean(panel.dataset.questionAudioErrorStage);
          setState(sequenceCompleted ? "ready" : recoverableAudioError ? "audio_error" : "locked");
          setGateState(sequenceCompleted ? "READY" : recoverableAudioError ? "AUDIO_RECOVERABLE" : "LOCKED");
          if (sequenceCompleted) {
            panel.dataset.questionAudioAutoplayState = "played";
            audioButton.setAttribute("aria-label", audioAriaLabel);
          }
          if (recoverableAudioError) {
            panel.dataset.questionAudioAutoplayState = "audio-error-retry-available";
          }
        }
        window.removeEventListener("duduq:questionchange", onQuestionChange);
        window.removeEventListener("duduq:voice-state", onPlaybackState);
        if (activeQuestionCleanup === onQuestionChange) activeQuestionCleanup = null;
      }
    };
    const stopSequence = () => {
      activeRequest += 1;
      clearGestureRetry();
      if (pauseTimer !== null) window.clearTimeout(pauseTimer);
      pauseTimer = null;
      if (requiredAudioTimer !== null) window.clearTimeout(requiredAudioTimer);
      requiredAudioTimer = null;
      contentAudio?.stopVoice?.();
      audioButton?.stopAudio?.();
      setState("locked");
      setGateState("LOCKED");
      if (activeQuestionCleanup) window.removeEventListener("duduq:questionchange", activeQuestionCleanup);
      activeQuestionCleanup = null;
    };
    audioButton = DuduQCanonicalAudioButton({ onPlay: playSequence, disabled: audioDisabled,
      onRestart: stopSequence, ariaLabel: audioAriaLabel, restartOnClick: true, appearance: "instruction" });
    controls.append(audioButton);
    panel.append(controls);
    scheduleFlagPosition();
    window.addEventListener("resize", scheduleFlagPosition, { passive: true });
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(scheduleFlagPosition);
      resizeObserver.observe(panel);
      resizeObserver.observe(gameRoot);
    }
    panel.__duduqInstructionAudioCleanup = () => {
      stopSequence();
      clearGestureRetry();
      gatedEvents.forEach(type => gameRoot.removeEventListener(type, blockGameplayInput, true));
      for (const [element, prior] of savedGate) {
        element.inert = prior.inert;
        if (prior.aria === null) element.removeAttribute("aria-disabled"); else element.setAttribute("aria-disabled", prior.aria);
        element.classList.toggle("duduq-interaction-locked", prior.locked);
      }
      feedbackObserver.disconnect();
      gateMutationObserver.disconnect();
      observedFeedback?.__duduqFeedbackCleanup?.();
      if (feedbackTimer !== null) window.clearTimeout(feedbackTimer);
      delete gameRoot.dataset.duduqInteractionState;
      delete panel.dataset.duduqInteractionState;
      window.removeEventListener("resize", scheduleFlagPosition);
      window.removeEventListener("duduq:pedagogical-audio-language", onPedagogicalLanguageState);
      resizeObserver?.disconnect();
      flagPt.remove(); flagEn.remove();
    };
    setState("locked");
    panel.dataset.questionAudioPrompt = promptKey;
    if (!audioDisabled && panel.dataset.questionAudioAutoPlayed !== promptKey) {
      panel.dataset.questionAudioAutoPlayed = promptKey;
      panel.dataset.questionAudioAutoplayState = "waiting-for-mount";
      const waitForPaint = count => new Promise(resolve => {
        const next = () => count-- > 0 ? window.requestAnimationFrame(next) : resolve();
        next();
      });
      const autoPlayWhenReady = async () => {
        const startedAt = performance.now();
        while (!panel.isConnected || !audioButton.isConnected || !panel.getBoundingClientRect().width || !panel.getBoundingClientRect().height) {
          if (panel.dataset.questionAudioPrompt !== promptKey || performance.now() - startedAt > 5000) return false;
          await waitForPaint(1);
        }
        if (document.visibilityState !== "visible") return false;
        await waitForPaint(2);
        if (panel.dataset.questionAudioPrompt !== promptKey || !audioButton.isConnected) return false;
        positionFlags();
        panel.dataset.questionAudioAutoplayState = "playing";
        return audioButton.playAudio();
      };
      autoPlayWhenReady().then(played => {
        if (panel.dataset.questionAudioPrompt !== promptKey) return;
        if (played) panel.dataset.questionAudioAutoplayState = "played";
        else if (panel.dataset.questionAudioErrorStage) panel.dataset.questionAudioAutoplayState = "audio-error-retry-available";
        else {
          panel.dataset.questionAudioAutoplayState = "blocked";
          installGestureRetry();
        }
      }).catch(error => {
        if (panel.dataset.questionAudioErrorStage) {
          panel.dataset.questionAudioAutoplayState = "audio-error-retry-available";
          return;
        }
        panel.dataset.questionAudioAutoplayState = "blocked";
        if (error?.name !== "NotAllowedError") console.error("[DUDUQ QUESTION AUTOPLAY]", error);
        installGestureRetry();
      });
    }
    return panel;
  }
  if (instructionAudioPending) {
    panel.classList.remove("duduq-question-hud--bilingual");
    panel.querySelector(".duduq-instruction-audio-controls")?.remove();
    panel.querySelector(".audio-button")?.remove();
    panel.querySelector(".question-label").textContent = textPt || eyebrow;
    prompt.textContent = textEn || question;
    panel.dataset.instructionAudioState = "pending-official-recording";
    const pendingButton = DuduQCanonicalAudioButton({
      ariaLabel: "Instrução em áudio aguardando gravação oficial",
      disabled: true,
      appearance: "instruction"
    });
    pendingButton.dataset.audioPending = "true";
    panel.append(pendingButton);
    if (requiredStimulusAudioIds.length && panel.dataset.postInstructionStimulusAudioState !== "started") {
      panel.dataset.postInstructionStimulusAudioState = "started";
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (!panel.isConnected) return;
        const owner = window.DuduQContentAudio;
        if (owner?.playVoiceSequence) {
          panel.dataset.postInstructionStimulusAudioState = "playing";
          owner.playVoiceSequence(requiredStimulusAudioIds, { pauseAfterFirstMs: stimulusPauseAfterMs })
            .then(result => { panel.dataset.postInstructionStimulusAudioState = result.status === "ENDED" ? "ended" : result.status || "error"; })
            .catch(() => { panel.dataset.postInstructionStimulusAudioState = "error"; });
        }
      }));
    }
    return panel;
  }
  panel.classList.remove("duduq-question-hud--bilingual");
  panel.querySelector(".duduq-instruction-audio-controls")?.remove();
  delete panel.dataset.instructionAudioState;
  delete panel.dataset.activeInstructionLanguage;
  const spokenPrompt = String(audio || question || "").trim();
  const play = typeof onAudio === "function" ? onAudio : spokenPrompt ? () => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(spokenPrompt);
      utterance.lang = "en-US";
      utterance.onend = () => resolve(true);
      utterance.onerror = event => {
        if (["canceled", "interrupted"].includes(event.error)) resolve(false);
        else {
          const error = new Error(`Question speech failed: ${event.error || "unknown"}`);
          error.name = event.error === "not-allowed" ? "NotAllowedError" : "SpeechSynthesisError";
          reject(error);
        }
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  } : undefined;
  const autoPlayKey = JSON.stringify([String(eyebrow || "").trim(), String(question || "").trim(), spokenPrompt]);
  const priorButton = panel.querySelector(".audio-button");
  const samePrompt = panel.dataset.questionAudioPrompt === autoPlayKey;
  if (priorButton && !samePrompt && priorButton.dataset.audioState === "playing" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  let audioButton = priorButton;
  if (audioButton && samePrompt) {
    audioButton.setPlayHandler?.(play);
    audioButton.disabled = Boolean(audioDisabled);
  } else {
    audioButton?.remove();
    audioButton = DuduQCanonicalAudioButton({ onPlay: play, disabled: audioDisabled, appearance: "instruction" });
    panel.append(audioButton);
    panel.dataset.questionAudioPrompt = autoPlayKey;
  }

  if (play && !audioDisabled && autoPlayKey && panel.dataset.questionAudioAutoPlayed !== autoPlayKey) {
    panel.dataset.questionAudioAutoPlayed = autoPlayKey;
    panel.dataset.questionAudioAutoplayState = "waiting-for-mount";
    const waitForFrames = count => new Promise(resolve => {
      const next = () => count-- > 0 ? window.requestAnimationFrame(next) : resolve();
      next();
    });
    const waitForHUDReady = async () => {
      while (!audioButton.isConnected || !panel.isConnected || panel.getBoundingClientRect().width === 0 || panel.getBoundingClientRect().height === 0) {
        if (panel.dataset.questionAudioPrompt !== autoPlayKey) return false;
        if (!panel.__duduqQuestionAudioMountWaitStartedAt) panel.__duduqQuestionAudioMountWaitStartedAt = performance.now();
        if (performance.now() - panel.__duduqQuestionAudioMountWaitStartedAt > 5000) return false;
        await waitForFrames(1);
      }
      delete panel.__duduqQuestionAudioMountWaitStartedAt;
      if (document.visibilityState === "hidden") {
        panel.dataset.questionAudioAutoplayState = "waiting-for-visible";
        await new Promise(resolve => document.addEventListener("visibilitychange", resolve, { once: true }));
      }
      panel.dataset.questionAudioAutoplayState = "waiting-for-paint";
      await waitForFrames(2);
      return panel.dataset.questionAudioPrompt === autoPlayKey && audioButton.isConnected;
    };
    waitForHUDReady().then(ready => {
      if (!ready) {
        if (panel.dataset.questionAudioAutoPlayed === autoPlayKey) delete panel.dataset.questionAudioAutoPlayed;
        return false;
      }
      panel.dataset.questionAudioAutoplayState = "playing";
      return audioButton.playAudio();
    }).then(played => {
      if (played) {
        panel.dataset.questionAudioAutoplayState = "played";
        return;
      }
      panel.dataset.questionAudioAutoplayState = "blocked";
      installGestureRetry();
    }).catch(error => {
      panel.dataset.questionAudioAutoplayState = "blocked";
      if (error?.name !== "NotAllowedError") console.error("[DUDUQ QUESTION AUDIO]", error);
      installGestureRetry();
    });
    function installGestureRetry() {
      const resumeOnGesture = () => {
        window.removeEventListener("pointerdown", resumeOnGesture, true);
        window.removeEventListener("keydown", resumeOnGesture, true);
        if (audioButton.isConnected) audioButton.playAudio().catch(() => {});
      };
      window.addEventListener("pointerdown", resumeOnGesture, { once: true, capture: true });
      window.addEventListener("keydown", resumeOnGesture, { once: true, capture: true });
    }
  }
  return panel;
}

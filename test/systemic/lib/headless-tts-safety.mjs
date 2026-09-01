export async function installHeadlessTtsSafety(page) {
  await page.addInitScript(() => {
    if (globalThis.navigator?.webdriver !== true || globalThis.__DUDUQ_QA_TTS_BRIDGE_INSTALLED__) return;

    function ensureState(target) {
      let state = target.__DUDUQ_QA_TTS_SAFETY_STATE__;
      if (!state) {
        state = {
          calls: 0,
          cancels: 0,
          lastText: "",
          lastLang: "",
          nativeSuppressed: true,
          fakeObjectInstalled: false,
          patchedBeforeMechanicReady: false,
        };
        try {
          Object.defineProperty(target, "__DUDUQ_QA_TTS_SAFETY_STATE__", {
            value: state,
            configurable: true,
          });
        } catch {
          try { target.__DUDUQ_QA_TTS_SAFETY_STATE__ = state; } catch {}
        }
      }
      return state;
    }

    function createSafeSynth(target, state) {
      const voices = [];
      const safe = {
        get speaking() { return false; },
        get pending() { return false; },
        get paused() { return false; },
        speak(utterance) {
          state.calls += 1;
          state.lastText = String(utterance?.text || "");
          state.lastLang = String(utterance?.lang || "");
          try { utterance?.onstart?.({ type: "start", utterance }); } catch {}
          const finish = () => {
            try { utterance?.onend?.({ type: "end", utterance }); } catch {}
          };
          try { (target.queueMicrotask || queueMicrotask)(finish); }
          catch { Promise.resolve().then(finish); }
        },
        cancel() { state.cancels += 1; },
        pause() {},
        resume() {},
        getVoices() { return voices.slice(); },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return true; },
        onvoiceschanged: null,
      };
      return safe;
    }

    function patchSpeechWindow(target) {
      try {
        if (!target) return false;
        const state = ensureState(target);
        const safeSynth = createSafeSynth(target, state);

        try {
          Object.defineProperty(target, "speechSynthesis", {
            configurable: true,
            enumerable: true,
            get() { return safeSynth; },
          });
          state.fakeObjectInstalled = target.speechSynthesis === safeSynth;
        } catch {}

        if (!state.fakeObjectInstalled) {
          let synth = null;
          try { synth = target.speechSynthesis; } catch {}
          if (!synth) return false;
          try {
            Object.defineProperty(synth, "speak", { configurable: true, writable: true, value: safeSynth.speak.bind(safeSynth) });
            Object.defineProperty(synth, "cancel", { configurable: true, writable: true, value: safeSynth.cancel.bind(safeSynth) });
            Object.defineProperty(synth, "getVoices", { configurable: true, writable: true, value: safeSynth.getVoices.bind(safeSynth) });
          } catch {
            try { synth.speak = safeSynth.speak.bind(safeSynth); } catch {}
            try { synth.cancel = safeSynth.cancel.bind(safeSynth); } catch {}
          }
          try {
            const proto = Object.getPrototypeOf(synth);
            if (proto) {
              Object.defineProperty(proto, "speak", { configurable: true, writable: true, value: safeSynth.speak.bind(safeSynth) });
              Object.defineProperty(proto, "cancel", { configurable: true, writable: true, value: safeSynth.cancel.bind(safeSynth) });
            }
          } catch {}
        }

        return state.fakeObjectInstalled || !!target.speechSynthesis;
      } catch {
        return false;
      }
    }

    patchSpeechWindow(globalThis);

    globalThis.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "duduq:mechanic:ready") return;
      const patched = patchSpeechWindow(event.source);
      try {
        const state = event.source?.__DUDUQ_QA_TTS_SAFETY_STATE__;
        if (state) state.patchedBeforeMechanicReady = patched;
      } catch {}
    }, true);

    const watchFrame = (iframe) => {
      if (!iframe || iframe.dataset?.duduqQaTtsWatch === "1") return;
      try { iframe.dataset.duduqQaTtsWatch = "1"; } catch {}
      try { patchSpeechWindow(iframe.contentWindow); } catch {}
      try {
        iframe.addEventListener("load", () => {
          try { patchSpeechWindow(iframe.contentWindow); } catch {}
        }, true);
      } catch {}
    };

    try {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.tagName === "IFRAME") watchFrame(node);
            node.querySelectorAll?.("iframe")?.forEach(watchFrame);
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.querySelectorAll("iframe").forEach(watchFrame);
    } catch {}

    Object.defineProperty(globalThis, "__DUDUQ_QA_TTS_BRIDGE_INSTALLED__", {
      value: true,
      configurable: true,
    });
  });
}

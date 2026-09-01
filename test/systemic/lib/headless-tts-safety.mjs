export async function installHeadlessTtsSafety(page) {
  await page.addInitScript(() => {
    if (globalThis.navigator?.webdriver !== true || globalThis.__DUDUQ_QA_TTS_BRIDGE_INSTALLED__) return;

    function patchSpeechWindow(target) {
      try {
        if (!target) return false;
        const synth = target.speechSynthesis;
        if (!synth) return false;

        let state = target.__DUDUQ_QA_TTS_SAFETY_STATE__;
        if (!state) {
          state = {
            calls: 0,
            cancels: 0,
            lastText: "",
            lastLang: "",
            nativeSuppressed: true,
            patchedBeforeMechanicReady: false,
          };
          Object.defineProperty(target, "__DUDUQ_QA_TTS_SAFETY_STATE__", {
            value: state,
            configurable: true,
          });
        }

        const safeSpeak = function (utterance) {
          state.calls += 1;
          state.lastText = String(utterance?.text || "");
          state.lastLang = String(utterance?.lang || "");
          try {
            utterance?.onstart?.({ type: "start", utterance });
          } catch {}
          const finish = () => {
            try {
              utterance?.onend?.({ type: "end", utterance });
            } catch {}
          };
          try {
            (target.queueMicrotask || queueMicrotask)(finish);
          } catch {
            Promise.resolve().then(finish);
          }
        };

        const safeCancel = function () {
          state.cancels += 1;
        };

        try {
          Object.defineProperty(synth, "speak", {
            configurable: true,
            writable: true,
            value: safeSpeak,
          });
        } catch {
          try { synth.speak = safeSpeak; } catch {}
        }
        try {
          Object.defineProperty(synth, "cancel", {
            configurable: true,
            writable: true,
            value: safeCancel,
          });
        } catch {
          try { synth.cancel = safeCancel; } catch {}
        }

        try {
          if (synth.speak !== safeSpeak || synth.cancel !== safeCancel) {
            const proto = Object.getPrototypeOf(synth);
            if (proto) {
              Object.defineProperty(proto, "speak", { configurable: true, writable: true, value: safeSpeak });
              Object.defineProperty(proto, "cancel", { configurable: true, writable: true, value: safeCancel });
            }
          }
        } catch {}

        return synth.speak === safeSpeak;
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

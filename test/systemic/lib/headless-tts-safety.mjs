export async function installHeadlessTtsSafety(page) {
  await page.addInitScript(() => {
    if (globalThis.navigator?.webdriver !== true) return;
    const proto = globalThis.SpeechSynthesis?.prototype;
    if (!proto?.speak || globalThis.__DUDUQ_QA_TTS_SAFETY_INSTALLED__) return;

    const state = { calls: 0, lastText: "", lastLang: "", nativeSuppressed: true };
    Object.defineProperty(globalThis, "__DUDUQ_QA_TTS_SAFETY_STATE__", {
      value: state,
      configurable: true,
    });
    Object.defineProperty(proto, "speak", {
      configurable: true,
      writable: true,
      value(utterance) {
        state.calls += 1;
        state.lastText = String(utterance?.text || "");
        state.lastLang = String(utterance?.lang || "");
        try {
          utterance?.dispatchEvent?.(new Event("start"));
          queueMicrotask(() => utterance?.dispatchEvent?.(new Event("end")));
        } catch {}
      },
    });
    Object.defineProperty(globalThis, "__DUDUQ_QA_TTS_SAFETY_INSTALLED__", {
      value: true,
      configurable: true,
    });
  });
}

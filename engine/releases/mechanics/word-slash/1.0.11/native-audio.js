/* DUDUQ WORD SLASH 1.0.11 — native data-playing observer */
(() => {
  "use strict";
  if (window.__DUDUQ_WORD_SLASH_NATIVE_AUDIO_111__) return;
  window.__DUDUQ_WORD_SLASH_NATIVE_AUDIO_111__ = true;

  const sync = (root = document) => {
    root.querySelectorAll?.('.duduq-ws-audio[data-playing]').forEach((node) => {
      const playing = node.getAttribute('data-playing') === 'true';
      node.setAttribute('data-duduq-native-audio', playing ? 'playing' : 'idle');
      if (playing) node.setAttribute('aria-busy', 'true');
      else node.removeAttribute('aria-busy');
    });
  };

  const observer = new MutationObserver((records) => {
    let shouldSync = false;
    for (const record of records) {
      if (record.type === 'childList') shouldSync = true;
      if (record.type === 'attributes' && record.attributeName === 'data-playing') shouldSync = true;
      if (shouldSync) break;
    }
    if (shouldSync) sync(document);
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-playing']
  });

  sync(document);
})();
